import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';
import { decodeSession } from '@/lib/authSession';
import { getGovernedPostgres } from '@/lib/postgres';

export async function GET(request: NextRequest) {
  const user = decodeSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  try {
    const result = await getGovernedPostgres().query('SELECT id FROM prior_auth_identities WHERE id=$1 AND tenant_id=$2 AND disabled_at IS NULL', [user.id, user.tenantId]);
    if (!result.rows[0]) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user });
  } catch { return NextResponse.json({ user: null }, { status: 503 }); }
}
