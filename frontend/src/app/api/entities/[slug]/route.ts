import { NextRequest, NextResponse } from 'next/server';
import { getEntitySet, resetEntitySet, saveEntitySet } from '@/lib/entityStore';
import { requireDocumentManager, requireSession } from '@/lib/requestAuth';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  const set = await getEntitySet(params.slug);
  if (!set) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(set);
}

export async function PUT(request: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  await saveEntitySet(params.slug, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireDocumentManager(_);
  if (session instanceof NextResponse) return session;
  const reset = await resetEntitySet(params.slug);
  if (!reset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(reset);
}
