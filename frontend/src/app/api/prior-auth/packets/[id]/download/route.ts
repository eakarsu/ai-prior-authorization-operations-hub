import { NextRequest, NextResponse } from 'next/server';
import { appendAccessLog, readPacketArtifact } from '@/lib/productionReadiness';
import { requireSession } from '@/lib/requestAuth';

function requestMeta(request: NextRequest) {
  return {
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'local',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  const result = await readPacketArtifact(params.id);
  if (!result) {
    return NextResponse.json({ error: 'Packet artifact not found' }, { status: 404 });
  }
  await appendAccessLog(session, `packet:${params.id}`, 'download_packet_pdf', requestMeta(request));
  return new NextResponse(result.bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.artifact.fileName}"`,
    },
  });
}
