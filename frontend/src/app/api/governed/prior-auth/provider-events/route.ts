import { NextRequest, NextResponse } from 'next/server';
import { getGovernedPostgres } from '@/lib/postgres';
import { correlationId, errorResponse, governance } from '@/lib/governedPriorAuth';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, any> | null;
  const signature = request.headers.get('x-provider-signature') || '';
  const secret = process.env.PAYER_WEBHOOK_SECRET || '';
  if (!body || body.provider !== 'payer_api' || !governance.verify(secret, body, signature)) return NextResponse.json({ error: 'Invalid provider signature' }, { status: 401 });
  const expectedFields = ['caseId', 'eventAt', 'eventId', 'provider', 'receipt', 'tenantId', 'type'];
  if (Object.keys(body).sort().join('|') !== expectedFields.join('|')) return NextResponse.json({ error: 'Invalid provider event fields' }, { status: 400 });
  const correlation = correlationId(request.headers);
  const client = await getGovernedPostgres().connect();
  try {
    const eventId = String(body.eventId || '');
    const tenantId = String(body.tenantId || '');
    const caseId = String(body.caseId || '');
    const eventAt = new Date(body.eventAt);
    const receipt = String(body.receipt || '');
    if (!eventId || !tenantId || !caseId || !Number.isFinite(eventAt.getTime()) || eventAt.getTime() > Date.now() + 300000 || !['accepted', 'approved', 'denied', 'error'].includes(body.type) || !/^[A-Za-z0-9._:-]{1,200}$/.test(receipt)) throw new Error('invalid provider event');
    const payloadDigest = governance.digest(body);
    await client.query('BEGIN');
    const inserted = await client.query('INSERT INTO prior_auth_provider_events(provider,event_id,tenant_id,case_id,event_at,payload_digest) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(provider,event_id) DO NOTHING RETURNING event_id', ['payer_api', eventId, tenantId, caseId, eventAt.toISOString(), payloadDigest]);
    if (!inserted.rowCount) {
      const existing = await client.query('SELECT payload_digest,outcome FROM prior_auth_provider_events WHERE provider=$1 AND event_id=$2', ['payer_api', eventId]);
      if (existing.rows[0]?.payload_digest !== payloadDigest) throw new Error('provider event replay conflict');
      await client.query('COMMIT');
      return NextResponse.json({ status: 'duplicate', outcome: existing.rows[0].outcome });
    }
    const caseResult = await client.query('SELECT * FROM governed_prior_auth_cases WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [caseId, tenantId]);
    const authCase = caseResult.rows[0];
    if (!authCase) throw new Error('case not found');
    if (authCase.last_provider_event_at && eventAt.getTime() <= new Date(authCase.last_provider_event_at).getTime()) throw new Error('provider event is stale');
    const next = governance.providerTransition(authCase.status, body.type);
    governance.transition(authCase.status, next, { id: 'payer-api', role: 'provider' }, authCase.owner_id);
    await client.query('UPDATE governed_prior_auth_cases SET status=$1,version=version+1,payer_receipt=$2,last_provider_event_at=$3,updated_at=NOW() WHERE id=$4 AND tenant_id=$5', [next, receipt, eventAt.toISOString(), caseId, tenantId]);
    await client.query("UPDATE prior_auth_provider_outbox SET status='delivered',provider_receipt=$1,lease_until=NULL,updated_at=NOW() WHERE case_id=$2 AND tenant_id=$3 AND provider='payer_api' AND status<>'delivered'", [receipt, caseId, tenantId]);
    await client.query('INSERT INTO prior_auth_workflow_events(tenant_id,case_id,event_type,from_status,to_status,actor_id,actor_role,reason,correlation_id,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [tenantId, caseId, 'provider_event', authCase.status, next, 'payer-api', 'provider', body.type, correlation, JSON.stringify({ eventId, receipt, payloadDigest })]);
    await client.query('UPDATE prior_auth_provider_events SET processed_at=NOW(),outcome=$1 WHERE provider=$2 AND event_id=$3', [next, 'payer_api', eventId]);
    await client.query('COMMIT');
    return NextResponse.json({ status: 'processed', caseStatus: next });
  } catch (error) { await client.query('ROLLBACK'); const failure = errorResponse(error); return NextResponse.json({ error: failure.message }, { status: failure.status }); } finally { client.release(); }
}
