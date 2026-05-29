import { NextRequest, NextResponse } from 'next/server';
import { getNotifications, saveNotifications } from '@/lib/notificationStore';
import { requireSession } from '@/lib/requestAuth';

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  return NextResponse.json(await getNotifications());
}

export async function PUT(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  await saveNotifications(body);
  return NextResponse.json({ ok: true });
}
