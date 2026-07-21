import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getGovernedPostgres } from '@/lib/postgres';
import { requireSession } from '@/lib/requestAuth';
import { correlationId, encryption, errorResponse, governance, workflowEvent } from '@/lib/governedPriorAuth';

export async function POST(request: NextRequest) {
  const user = requireSession(request); if (user instanceof NextResponse) return user;
  if (!['analyst', 'clinician', 'admin'].includes(user.role)) return NextResponse.json({ error: 'role cannot add evidence' }, { status: 403 });
  const correlation = correlationId(request.headers);
  const client = await getGovernedPostgres().connect();
  try {
    const body = await request.json();
    const caseId = String(body?.caseId || '');
    const validation = governance.validateEvidence([{ ...body?.evidence, id: body?.evidence?.id || crypto.randomUUID() }]);
    if (!validation.valid) throw new Error(`invalid evidence: ${validation.invalidEvidenceIds.join(', ')}`);
    const evidence = validation.evidence[0];
    const key = encryption();
    const encrypted = governance.encrypt({ uri: evidence.uri }, key.key, key.version, `tenant:${user.tenantId}:prior-auth-evidence:${evidence.id}`);
    await client.query('BEGIN');
    const caseResult = await client.query('SELECT status FROM governed_prior_auth_cases WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [caseId, user.tenantId]);
    if (!caseResult.rows[0]) throw new Error('case not found');
    if (!['evidence_review', 'needs_information', 'clinical_review'].includes(caseResult.rows[0].status)) throw new Error('evidence cannot be changed in current status');
    await client.query('INSERT INTO prior_auth_evidence(id,tenant_id,case_id,evidence_type,evidence_code,source_system,source_version,effective_at,content_digest,source_encrypted,encryption_key_version,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [evidence.id, user.tenantId, caseId, evidence.evidenceType, evidence.evidenceCode, evidence.sourceSystem, evidence.version, evidence.effectiveAt, evidence.contentDigest, JSON.stringify(encrypted), key.version, user.id]);
    await workflowEvent(client, user, caseId, correlation, { type: 'evidence_added', from: caseResult.rows[0].status, to: caseResult.rows[0].status, details: { evidenceId: evidence.id, evidenceCode: evidence.evidenceCode, contentDigest: evidence.contentDigest, sourceSystem: evidence.sourceSystem } });
    await client.query('COMMIT');
    return NextResponse.json({ id: evidence.id, evidenceCode: evidence.evidenceCode }, { status: 201 });
  } catch (error) { await client.query('ROLLBACK'); const failure = errorResponse(error); return NextResponse.json({ error: failure.message }, { status: failure.status }); } finally { client.release(); }
}
