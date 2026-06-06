import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, validateDemoCredentials } from '@/lib/auth';
import { encodeSession } from '@/lib/authSession';
import { appendAccessLog } from '@/lib/productionReadiness';

function requestMeta(request: NextRequest) {
  return {
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'local',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email ?? '';
  const password = body?.password ?? '';
  const mfaRequired = process.env.REQUIRE_MFA === 'true';
  const expectedMfaCode = process.env.MFA_BYPASS_CODE || '';

  const user = validateDemoCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  if (mfaRequired && (!body?.mfaCode || body.mfaCode !== expectedMfaCode)) {
    await appendAccessLog(user, 'auth', 'mfa_required_or_failed', { ...requestMeta(request), outcome: 'Denied' });
    return NextResponse.json({ error: 'MFA required', mfaRequired: true }, { status: 428 });
  }

  const response = NextResponse.json({ user });
  response.cookies.set(AUTH_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  await appendAccessLog(user, 'auth', mfaRequired ? 'login_with_mfa' : 'login', requestMeta(request));
  return response;
}
