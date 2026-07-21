import { NextRequest, NextResponse } from 'next/server';
import { appendAccessLog, readPacketArtifact } from '@/lib/productionReadiness';
import { requireSession } from '@/lib/requestAuth';

function requestMeta(request: NextRequest) {
  return {
    ipAddress: request.headers.get('x-forwarded-for') || 'local',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  const result = await readPacketArtifact(id);
  if (!result) {
    return NextResponse.json({ error: 'Packet artifact not found' }, { status: 404 });
  }
  await appendAccessLog(session, `packet:${id}`, 'download_packet_pdf', requestMeta(request));
  return new NextResponse(result.bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.artifact.fileName}"`,
    },
  });
}
