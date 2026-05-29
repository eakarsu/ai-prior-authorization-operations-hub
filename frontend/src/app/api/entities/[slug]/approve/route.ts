import { NextRequest, NextResponse } from 'next/server';
import { appendAuditEntry } from '@/lib/auditStore';
import { getEntitySet, saveEntitySet } from '@/lib/entityStore';
import { requireApprover } from '@/lib/requestAuth';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireApprover(request);
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const rowId = body?.rowId as string | undefined;
  const approved = Boolean(body?.approved);
  if (!rowId) {
    return NextResponse.json({ error: 'rowId is required' }, { status: 400 });
  }

  const set = await getEntitySet(params.slug);
  if (!set) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const row = set.rows.find((item) => item.id === rowId);
  if (!row) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 });
  }

  row.status = approved ? 'Approved' : 'Rejected';
  await saveEntitySet(params.slug, set);
  await appendAuditEntry(params.slug, `${approved ? 'Approved' : 'Rejected'} record: ${row.name}`);
  return NextResponse.json({ ok: true, row });
}
