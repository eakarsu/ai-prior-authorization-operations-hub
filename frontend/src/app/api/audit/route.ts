import { NextRequest, NextResponse } from 'next/server';
import { getAuditEntries } from '@/lib/auditStore';
import { requireSession } from '@/lib/requestAuth';

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  return NextResponse.json(await getAuditEntries());
}
