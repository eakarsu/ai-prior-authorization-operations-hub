import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getGovernedPostgres } from '@/lib/postgres';
import { governance } from '@/lib/governedPriorAuth';
import { deliver, ProviderDeliveryError } from '@/lib/priorAuthProviderAdapter';

function authorized(request: NextRequest) {
  const expected = process.env.PROVIDER_WORKER_SECRET || '';
  const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (expected.length < 32 || supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getGovernedPostgres();
  const client = await db.connect();
  let job: Record<string, any> | undefined;
  try {
    await client.query('BEGIN');
    const result = await client.query("SELECT * FROM prior_auth_provider_outbox WHERE ((status IN ('pending','retry') AND available_at<=NOW()) OR (status='leased' AND lease_until<NOW())) ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1");
    job = result.rows[0];
    if (!job) { await client.query('COMMIT'); return NextResponse.json({ status: 'idle' }); }
    await client.query("UPDATE prior_auth_provider_outbox SET status='leased',lease_until=NOW()+INTERVAL '60 seconds',updated_at=NOW() WHERE id=$1", [job.id]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); return NextResponse.json({ error: error instanceof Error ? error.message : 'claim failed' }, { status: 500 }); } finally { client.release(); }

  try {
    const result = await deliver(job as any);
    await db.query("UPDATE prior_auth_provider_outbox SET status='delivered',provider_receipt=$1,lease_until=NULL,updated_at=NOW() WHERE id=$2 AND status='leased'", [result.receipt, job.id]);
    return NextResponse.json({ id: job.id, status: 'delivered', receipt: result.receipt });
  } catch (error) {
    const decision = governance.retry(Number(job.attempts), error instanceof ProviderDeliveryError ? error.retryable : true);
    await db.query("UPDATE prior_auth_provider_outbox SET status=$1,attempts=$2,available_at=NOW()+($3*INTERVAL '1 second'),lease_until=NULL,last_error=$4,updated_at=NOW() WHERE id=$5 AND status='leased'", [decision.status, decision.attempts, decision.delaySeconds || 0, error instanceof Error ? error.message.slice(0, 500) : 'delivery failed', job.id]);
    return NextResponse.json({ id: job.id, status: decision.status }, { status: decision.status === 'dead_letter' ? 502 : 202 });
  }
}
