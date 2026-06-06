import { NextRequest, NextResponse } from 'next/server';
import { appendAccessLog, dispatchNotificationOutbox } from '@/lib/productionReadiness';
import { requireDocumentManager } from '@/lib/requestAuth';

function requestMeta(request: NextRequest) {
  return {
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'local',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

export async function POST(request: NextRequest) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  const outbox = await dispatchNotificationOutbox();
  await appendAccessLog(session, 'notification-outbox', 'dispatch_notifications', requestMeta(request));
  return NextResponse.json({ ok: true, outbox });
}
