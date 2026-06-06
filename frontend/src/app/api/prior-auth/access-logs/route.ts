import { NextRequest, NextResponse } from 'next/server';
import { appendAccessLog, getProductionReadiness } from '@/lib/productionReadiness';
import { requireSession } from '@/lib/requestAuth';

function requestMeta(request: NextRequest) {
  return {
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'local',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  await appendAccessLog(session, 'access-logs', 'view_access_logs', requestMeta(request));
  return NextResponse.json((await getProductionReadiness()).accessLogs);
}
