import { NextRequest, NextResponse } from 'next/server';
import { appendAccessLog, getProductionReadiness, savePacketArtifact, writePacketArtifact } from '@/lib/productionReadiness';
import { getPriorAuthCases } from '@/lib/priorAuthStore';
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
  await appendAccessLog(session, 'packet-artifacts', 'view_packet_artifacts', requestMeta(request));
  return NextResponse.json((await getProductionReadiness()).packetArtifacts);
}

export async function POST(request: NextRequest) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => null);
  const cases = await getPriorAuthCases();
  const authCase = cases.find((item) => item.id === body?.caseId || item.caseNumber === body?.caseNumber);
  if (!authCase) {
    return NextResponse.json({ error: 'caseId or caseNumber is required' }, { status: 400 });
  }
  const artifact = await savePacketArtifact(await writePacketArtifact(authCase, body?.packetType || 'Initial submission'));
  await appendAccessLog(session, `packet:${artifact.id}`, 'generate_packet_pdf', requestMeta(request));
  return NextResponse.json(artifact);
}
