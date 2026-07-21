import { NextRequest, NextResponse } from 'next/server';
import { appendAccessLog, getProductionReadiness, saveAuthControls, type AuthControl } from '@/lib/productionReadiness';
import { requireDocumentManager, requireSession } from '@/lib/requestAuth';

function requestMeta(request: NextRequest) {
  return {
    ipAddress: request.headers.get('x-forwarded-for') || 'local',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  await appendAccessLog(session, 'auth-controls', 'view_auth_controls', requestMeta(request));
  return NextResponse.json((await getProductionReadiness()).authControls);
}

export async function PUT(request: NextRequest) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  const body = (await request.json().catch(() => null)) as AuthControl[] | null;
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Auth control array is required' }, { status: 400 });
  }
  await saveAuthControls(body);
  await appendAccessLog(session, 'auth-controls', 'update_auth_controls', requestMeta(request));
  return NextResponse.json({ ok: true, authControls: body });
}
