import { NextRequest, NextResponse } from 'next/server';
import { appendAuditEntry } from '@/lib/auditStore';
import { getDocuments, saveDocuments } from '@/lib/documentStore';
import { requireDocumentManager, requireSession } from '@/lib/requestAuth';

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  return NextResponse.json(await getDocuments());
}

export async function PUT(request: NextRequest) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  await saveDocuments(body);
  await appendAuditEntry('Documents', 'Documents workspace updated');
  return NextResponse.json({ ok: true });
}
