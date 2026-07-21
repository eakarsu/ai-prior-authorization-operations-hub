import { NextResponse } from 'next/server';
import { getGovernedPostgres } from '@/lib/postgres';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const result = await getGovernedPostgres().query("SELECT to_regclass('public.governed_prior_auth_cases') AS cases,to_regclass('public.prior_auth_provider_outbox') AS outbox");
    if (!result.rows[0]?.cases || !result.rows[0]?.outbox) return NextResponse.json({ status: 'not_ready', reason: 'migration missing' }, { status: 503 });
    return NextResponse.json({ status: 'ready' });
  } catch { return NextResponse.json({ status: 'not_ready' }, { status: 503 }); }
}
