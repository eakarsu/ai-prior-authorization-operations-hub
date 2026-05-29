import { NextRequest, NextResponse } from 'next/server';
import { listSourceDataTables, reseedSourceDataTables } from '@/lib/sourceTableStore';
import { requireSession } from '@/lib/requestAuth';

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  const tables = await listSourceDataTables();
  return NextResponse.json({ tables });
}

export async function POST(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  const tables = await reseedSourceDataTables();
  return NextResponse.json({ ok: true, tables });
}
