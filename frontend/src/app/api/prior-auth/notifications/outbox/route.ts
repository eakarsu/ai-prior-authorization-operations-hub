import { NextRequest, NextResponse } from 'next/server';
import { appendAccessLog, getProductionReadiness, queueNotification } from '@/lib/productionReadiness';
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
  await appendAccessLog(session, 'notification-outbox', 'view_outbox', requestMeta(request));
  return NextResponse.json((await getProductionReadiness()).notificationOutbox);
}

export async function POST(request: NextRequest) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => null);
  if (!body?.channel || !body?.recipient || !body?.template || !body?.caseNumber) {
    return NextResponse.json({ error: 'channel, recipient, template, and caseNumber are required' }, { status: 400 });
  }
  const record = await queueNotification({
    channel: body.channel,
    recipient: body.recipient,
    template: body.template,
    caseNumber: body.caseNumber,
    nextAttemptAt: body.nextAttemptAt || new Date().toLocaleString(),
    lastError: body.lastError,
  });
  await appendAccessLog(session, 'notification-outbox', 'queue_notification', requestMeta(request));
  return NextResponse.json(record);
}
