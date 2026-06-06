import crypto from 'crypto';
import { type SessionUser } from '@/lib/auth';

function sessionSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'local-prior-auth-demo-secret';
}

function sign(payload: string) {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function encodeSession(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');
  return payload + '.' + sign(payload);
}

export function decodeSession(value?: string | null): SessionUser | null {
  if (!value) return null;
  try {
    const [payload, signature] = value.split('.');
    if (!payload) return null;
    if (signature && sign(payload) !== signature) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionUser;
    if (!parsed?.email || !parsed?.role) return null;
    if (!['admin', 'manager', 'analyst'].includes(parsed.role)) return null;
    return parsed;
  } catch {
    return null;
  }
}
