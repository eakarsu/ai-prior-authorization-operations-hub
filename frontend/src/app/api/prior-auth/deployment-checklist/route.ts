import { NextRequest, NextResponse } from 'next/server';
import { appendAccessLog, getProductionReadiness, saveDeploymentChecklist, type DeploymentChecklistItem } from '@/lib/productionReadiness';
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
  await appendAccessLog(session, 'deployment-checklist', 'view_deployment_checklist', requestMeta(request));
  return NextResponse.json((await getProductionReadiness()).deploymentChecklist);
}

export async function PUT(request: NextRequest) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  const body = (await request.json().catch(() => null)) as DeploymentChecklistItem[] | null;
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Deployment checklist array is required' }, { status: 400 });
  }
  await saveDeploymentChecklist(body);
  await appendAccessLog(session, 'deployment-checklist', 'update_deployment_checklist', requestMeta(request));
  return NextResponse.json({ ok: true, deploymentChecklist: body });
}
