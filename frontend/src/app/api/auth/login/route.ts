import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, type SessionUser } from '@/lib/auth';
import { encodeSession } from '@/lib/authSession';
import { getGovernedPostgres } from '@/lib/postgres';

const attempts = new Map<string, number[]>();
function limited(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  recent.push(now); attempts.set(key, recent);
  return recent.length > 8;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const tenantId = String(body?.tenantId || body?.tenant || body?.tenantSlug || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const remote = request.headers.get('x-forwarded-for')?.split(',')[0] || 'local';
    if (!tenantId || !email || !password) return NextResponse.json({ error: 'tenantId, email, and password are required' }, { status: 400 });
    if (limited(`${remote}|${tenantId}|${email}`)) return NextResponse.json({ error: 'Too many login attempts' }, { status: 429 });
    const db = getGovernedPostgres();
    const result = await db.query('SELECT id,tenant_id,email,password_hash,first_name,last_name,role FROM prior_auth_identities WHERE tenant_id=$1 AND lower(email)=$2 AND disabled_at IS NULL', [tenantId, email]);
    const identity = result.rows[0];
    if (!identity || !(await bcrypt.compare(password, identity.password_hash))) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    const user: SessionUser = { id: identity.id, tenantId: identity.tenant_id, email: identity.email, firstName: identity.first_name, lastName: identity.last_name, role: identity.role };
    const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();
    await db.query('INSERT INTO prior_auth_access_events(tenant_id,actor_id,actor_role,action,outcome,correlation_id,details) VALUES($1,$2,$3,$4,$5,$6,$7)', [tenantId, user.id, user.role, 'login', 'allowed', correlationId, JSON.stringify({})]);
    attempts.delete(`${remote}|${tenantId}|${email}`);
    const response = NextResponse.json({ user });
    response.cookies.set(AUTH_COOKIE, encodeSession(user), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 30 * 60 });
    return response;
  } catch (error) {
    console.error('login failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Authentication unavailable' }, { status: 503 });
  }
}
