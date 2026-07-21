import crypto from 'crypto';
import { type SessionUser } from '@/lib/auth';

type SessionClaims = SessionUser & { iat: number; exp: number; jti: string; issuer: string; audience: string };

function configuration() {
  const secret = process.env.AUTH_SECRET;
  const issuer = process.env.AUTH_ISSUER;
  const audience = process.env.AUTH_AUDIENCE;
  if (!secret || secret.length < 32 || !issuer || !audience) throw new Error('session authentication is not configured');
  return { secret, issuer, audience };
}
function sign(payload: string, secret: string) { return crypto.createHmac('sha256', secret).update(payload).digest('base64url'); }

export function encodeSession(user: SessionUser, now = Date.now()) {
  const config = configuration();
  const claims: SessionClaims = { ...user, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 30 * 60, jti: crypto.randomUUID(), issuer: config.issuer, audience: config.audience };
  const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  return `${payload}.${sign(payload, config.secret)}`;
}

export function decodeSession(value?: string | null, now = Date.now()): SessionUser | null {
  if (!value) return null;
  try {
    const config = configuration();
    const [payload, signature, extra] = value.split('.');
    if (!payload || !signature || extra) return null;
    const expected = Buffer.from(sign(payload, config.secret));
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionClaims;
    if (!claims.id || !claims.tenantId || !claims.email || !claims.jti || !['admin', 'manager', 'analyst', 'clinician'].includes(claims.role)) return null;
    if (claims.issuer !== config.issuer || claims.audience !== config.audience || claims.exp <= Math.floor(now / 1000) || claims.iat > Math.floor(now / 1000) + 5) return null;
    const { iat: _iat, exp: _exp, jti: _jti, issuer: _issuer, audience: _audience, ...user } = claims;
    return user;
  } catch { return null; }
}
