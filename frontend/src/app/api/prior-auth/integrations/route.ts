import { NextRequest, NextResponse } from 'next/server';
import { appendAccessLog, getProductionReadiness, saveIntegrations, type ProductionIntegration } from '@/lib/productionReadiness';
import { requireDocumentManager, requireSession } from '@/lib/requestAuth';

function requestMeta(request: NextRequest) {
  return {
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'local',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  await appendAccessLog(session, 'integrations', 'view_connectors', requestMeta(request));
  return NextResponse.json((await getProductionReadiness()).integrations);
}

export async function PUT(request: NextRequest) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  const body = (await request.json().catch(() => null)) as ProductionIntegration[] | null;
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Integration array is required' }, { status: 400 });
  }
  await saveIntegrations(body);
  await appendAccessLog(session, 'integrations', 'update_connectors', requestMeta(request));
  return NextResponse.json({ ok: true, integrations: body });
}
