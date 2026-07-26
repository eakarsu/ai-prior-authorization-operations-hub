import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const prefixes = ['PROVISION_ADMIN', 'BOOTSTRAP_ADMIN', 'SEED_ADMIN', 'SEED_USER', 'DEMO', 'ADMIN', 'DEFAULT'] as const;

export async function GET() {
  if (process.env.ENABLE_DEMO_CREDENTIAL_AUTOFILL !== 'true') {
    return NextResponse.json({ error: 'Demo credential autofill is disabled' }, { status: 404 });
  }

  const prefix = prefixes.find((candidate) => process.env[`${candidate}_EMAIL`] && process.env[`${candidate}_PASSWORD`]);
  const tenantId = process.env.DEMO_TENANT
    || process.env.BOOTSTRAP_TENANT_SLUG
    || process.env.GOVERNANCE_TENANT_ID
    || process.env.TENANT_ID
    || '';
  const email = prefix ? process.env[`${prefix}_EMAIL`] || '' : '';
  const password = prefix ? process.env[`${prefix}_PASSWORD`] || '' : '';
  if (!tenantId || !email || !password) {
    return NextResponse.json({ error: 'Demo credentials are not configured' }, { status: 404 });
  }

  return NextResponse.json({ tenantId, email, password }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
