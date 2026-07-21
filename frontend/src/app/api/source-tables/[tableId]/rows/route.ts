import { NextRequest, NextResponse } from 'next/server';
import { addSourceTableRow, deleteSourceTableRow, listSourceTableRows, updateSourceTableRow } from '@/lib/sourceTableRowsStore';
import { requireSession } from '@/lib/requestAuth';

type RouteContext = {
  params: Promise<{
    tableId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  const { tableId } = await context.params;
  const rows = await listSourceTableRows(decodeURIComponent(tableId));
  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => ({}));
  const { tableId } = await context.params;
  const row = await addSourceTableRow(decodeURIComponent(tableId), body.values || {});
  return NextResponse.json({ row, rows: await listSourceTableRows(decodeURIComponent(tableId)) });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => ({}));
  const { tableId } = await context.params;
  const row = await updateSourceTableRow(decodeURIComponent(tableId), body.rowId || '', body.values || {});
  if (!row) return NextResponse.json({ error: 'Row not found' }, { status: 404 });
  return NextResponse.json({ row, rows: await listSourceTableRows(decodeURIComponent(tableId)) });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => ({}));
  const { tableId } = await context.params;
  const ok = await deleteSourceTableRow(decodeURIComponent(tableId), body.rowId || '');
  if (!ok) return NextResponse.json({ error: 'Row not found' }, { status: 404 });
  return NextResponse.json({ ok: true, rows: await listSourceTableRows(decodeURIComponent(tableId)) });
}
