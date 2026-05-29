import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, canApprove, canManageDocuments, decodeSession, type SessionUser } from '@/lib/auth';

export function getRequestUser(request: NextRequest): SessionUser | null {
  return decodeSession(request.cookies.get(AUTH_COOKIE)?.value);
}

export function requireSession(request: NextRequest): SessionUser | NextResponse {
  const user = getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}

export function requireDocumentManager(request: NextRequest): SessionUser | NextResponse {
  const user = getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!canManageDocuments(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return user;
}

export function requireApprover(request: NextRequest): SessionUser | NextResponse {
  const user = getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!canApprove(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return user;
}
