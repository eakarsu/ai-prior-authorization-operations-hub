import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getGovernedPostgres } from '@/lib/postgres';
import { requireSession } from '@/lib/requestAuth';
import { accessEvent, activePolicy, correlationId, encryption, errorResponse, governance, presentCase, workflowEvent } from '@/lib/governedPriorAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = requireSession(request); if (user instanceof NextResponse) return user;
  const correlation = correlationId(request.headers);
  try {
    const db = getGovernedPostgres();
    const caseId = request.nextUrl.searchParams.get('id');
    if (caseId) {
      const result = await db.query('SELECT * FROM governed_prior_auth_cases WHERE id=$1 AND tenant_id=$2', [caseId, user.tenantId]);
      if (!result.rows[0]) return NextResponse.json({ error: 'case not found' }, { status: 404 });
      const [evidence, events] = await Promise.all([
        db.query('SELECT id,evidence_type,evidence_code,source_system,source_version,effective_at,content_digest,created_by,created_at FROM prior_auth_evidence WHERE tenant_id=$1 AND case_id=$2 ORDER BY created_at', [user.tenantId, caseId]),
        db.query('SELECT event_type,from_status,to_status,actor_id,actor_role,reason,details,occurred_at FROM prior_auth_workflow_events WHERE tenant_id=$1 AND case_id=$2 ORDER BY occurred_at', [user.tenantId, caseId]),
      ]);
      await accessEvent(db, user, correlation, 'case_detail_read', 'allowed', caseId);
      return NextResponse.json({ case: presentCase(result.rows[0], true), evidence: evidence.rows, events: events.rows });
    }
    const postAcuteOnly = request.nextUrl.searchParams.get('scope') === 'post-acute';
    const result = await db.query(
      `SELECT * FROM governed_prior_auth_cases WHERE tenant_id=$1${postAcuteOnly ? ' AND service_line IS NOT NULL' : ''} ORDER BY due_at,status,updated_at DESC LIMIT 250`,
      [user.tenantId],
    );
    await accessEvent(db, user, correlation, 'case_queue_read', 'allowed', null, { count: result.rowCount });
    return NextResponse.json({ cases: result.rows.map((row) => presentCase(row)), scope: postAcuteOnly ? 'post-acute' : 'all' });
  } catch (error) { const failure = errorResponse(error); return NextResponse.json({ error: failure.message }, { status: failure.status }); }
}

export async function POST(request: NextRequest) {
  const user = requireSession(request); if (user instanceof NextResponse) return user;
  if (!['analyst', 'admin'].includes(user.role)) return NextResponse.json({ error: 'analyst role required' }, { status: 403 });
  const correlation = correlationId(request.headers);
  const client = await getGovernedPostgres().connect();
  try {
    const input = governance.intake(await request.json());
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey || idempotencyKey.length > 200) throw new Error('Idempotency-Key required');
    const requestDigest = governance.digest(input);
    const id = crypto.randomUUID();
    const key = encryption();
    const encrypted = governance.encrypt(input, key.key, key.version, `tenant:${user.tenantId}:prior-auth-case:${id}`);
    const memberToken = governance.digest({ tenantId: user.tenantId, memberRef: input.memberRef }).slice(0, 16);
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO governed_prior_auth_cases(
        id,tenant_id,member_ref_token,payer_ref,procedure_code,diagnosis_code,requested_by,owner_id,
        urgency,due_at,acceptance_criteria,payload_encrypted,encryption_key_version,idempotency_key,request_digest,
        service_line,facility_ref,requested_units,estimated_revenue_at_risk,care_delay_hours
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      ON CONFLICT(tenant_id,idempotency_key) DO NOTHING RETURNING *`,
      [id, user.tenantId, memberToken, input.payerRef, input.procedureCode, input.diagnosisCode, input.requestedBy, user.id,
        input.urgency, input.dueAt, JSON.stringify(input.acceptanceCriteria), JSON.stringify(encrypted), key.version, idempotencyKey, requestDigest,
        input.serviceLine, input.facilityRef, input.requestedUnits, input.estimatedRevenueAtRisk, input.careDelayHours],
    );
    if (!inserted.rowCount) {
      const existing = await client.query('SELECT * FROM governed_prior_auth_cases WHERE tenant_id=$1 AND idempotency_key=$2', [user.tenantId, idempotencyKey]);
      if (existing.rows[0]?.request_digest !== requestDigest) throw Object.assign(new Error('Idempotency conflict'), { conflict: true });
      await client.query('COMMIT');
      return NextResponse.json({ case: presentCase(existing.rows[0]) });
    }
    await workflowEvent(client, user, id, correlation, { type: 'created', to: 'intake', details: { requestDigest } });
    await client.query('COMMIT');
    return NextResponse.json({ case: presentCase(inserted.rows[0]) }, { status: 201 });
  } catch (error) { await client.query('ROLLBACK'); const failure = errorResponse(error); return NextResponse.json({ error: failure.message }, { status: failure.status }); } finally { client.release(); }
}

export async function PUT(request: NextRequest) {
  const user = requireSession(request); if (user instanceof NextResponse) return user;
  if (user.role !== 'admin') return NextResponse.json({ error: 'admin role required' }, { status: 403 });
  const correlation = correlationId(request.headers);
  const client = await getGovernedPostgres().connect();
  try {
    const policy = governance.validatePolicy(await request.json());
    const id = crypto.randomUUID();
    await client.query('BEGIN');
    await client.query('INSERT INTO prior_auth_policy_rules(id,tenant_id,payer_ref,procedure_code,version,source_uri,effective_at,rules,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id, user.tenantId, policy.payerRef, policy.procedureCode, policy.version, policy.sourceUri, policy.effectiveAt, JSON.stringify(policy.rules), user.id]);
    await accessEvent(client, user, correlation, 'payer_policy_version_created', 'allowed', null, { id, payerRef: policy.payerRef, procedureCode: policy.procedureCode, version: policy.version });
    await client.query('COMMIT');
    return NextResponse.json({ id, version: policy.version }, { status: 201 });
  } catch (error) { await client.query('ROLLBACK'); const failure = errorResponse(error); return NextResponse.json({ error: failure.message }, { status: failure.status }); } finally { client.release(); }
}

export async function PATCH(request: NextRequest) {
  const user = requireSession(request); if (user instanceof NextResponse) return user;
  const correlation = correlationId(request.headers);
  const client = await getGovernedPostgres().connect();
  try {
    const body = await request.json();
    const caseId = String(body?.caseId || '');
    const toStatus = String(body?.toStatus || '');
    const expectedVersion = Number(body?.expectedVersion);
    const reason = String(body?.reason || '').trim();
    if (!caseId || !toStatus || !Number.isInteger(expectedVersion) || reason.length < 8 || reason.length > 2000) throw new Error('caseId, expectedVersion, transition, and rationale are required');
    await client.query('BEGIN');
    const result = await client.query('SELECT * FROM governed_prior_auth_cases WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [caseId, user.tenantId]);
    const authCase = result.rows[0];
    if (!authCase) throw new Error('case not found');
    if (authCase.version !== expectedVersion) throw new Error('version conflict');
    governance.transition(authCase.status, toStatus, user, authCase.owner_id);
    let policyVersion = authCase.policy_version;
    let clinicalReviewer = authCase.clinical_reviewer_id;
    let outbox: Record<string, any> | null = null;
    if (toStatus === 'submission_ready' || toStatus === 'appeal_ready') {
      if (body.attestation !== true) throw new Error('clinical review attestation required');
      const evidenceResult = await client.query('SELECT evidence_code,content_digest FROM prior_auth_evidence WHERE tenant_id=$1 AND case_id=$2', [user.tenantId, caseId]);
      if (!evidenceResult.rowCount) throw new Error('missing evidence');
      const policy = await activePolicy(client, user.tenantId, authCase.payer_ref, authCase.procedure_code);
      const decision = governance.coverageDecision({ evidence: evidenceResult.rows.map((row) => ({ evidenceCode: row.evidence_code })), policy, acceptanceCriteria: authCase.acceptance_criteria, confidence: 1, minimumConfidence: 1 });
      if (decision.missing.length || decision.uncertain) throw new Error(`missing evidence criteria: ${decision.missing.join(', ')}`);
      policyVersion = decision.policyVersion;
      clinicalReviewer = user.id;
    }
    if (toStatus === 'submission_queued' || toStatus === 'appeal_queued') {
      const evidenceResult = await client.query('SELECT content_digest FROM prior_auth_evidence WHERE tenant_id=$1 AND case_id=$2 ORDER BY content_digest', [user.tenantId, caseId]);
      const operation = toStatus === 'submission_queued' ? 'submit_authorization' : 'submit_appeal';
      const payload = operation === 'submit_authorization'
        ? { caseRef: caseId, payerRef: authCase.payer_ref, procedureCode: authCase.procedure_code, diagnosisCode: authCase.diagnosis_code, evidenceDigests: evidenceResult.rows.map((row) => row.content_digest) }
        : { caseRef: caseId, payerRef: authCase.payer_ref, denialReceipt: authCase.payer_receipt, evidenceDigests: evidenceResult.rows.map((row) => row.content_digest) };
      outbox = governance.providerJob('payer_api', operation, payload, `${caseId}:v${authCase.version + 1}:${operation}`);
      await client.query('INSERT INTO prior_auth_provider_outbox(tenant_id,case_id,provider,operation,idempotency_key,payload_digest,payload) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(provider,idempotency_key) DO NOTHING', [user.tenantId, caseId, outbox.provider, outbox.operation, outbox.idempotencyKey, outbox.payloadDigest, JSON.stringify(outbox.payload)]);
    }
    const updated = await client.query('UPDATE governed_prior_auth_cases SET status=$1,version=version+1,clinical_reviewer_id=$2,policy_version=$3,updated_at=NOW() WHERE id=$4 AND tenant_id=$5 RETURNING *', [toStatus, clinicalReviewer, policyVersion, caseId, user.tenantId]);
    await workflowEvent(client, user, caseId, correlation, { type: 'transitioned', from: authCase.status, to: toStatus, reason, details: { policyVersion, outboxDigest: outbox?.payloadDigest, attestation: body.attestation === true } });
    await client.query('COMMIT');
    return NextResponse.json({ case: presentCase(updated.rows[0]) });
  } catch (error) { await client.query('ROLLBACK'); const failure = errorResponse(error); return NextResponse.json({ error: failure.message }, { status: failure.status }); } finally { client.release(); }
}
