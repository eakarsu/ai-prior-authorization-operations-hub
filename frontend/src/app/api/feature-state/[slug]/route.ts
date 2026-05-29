import { NextRequest, NextResponse } from 'next/server';
import { getFeatureState, resetFeatureState, saveFeatureState } from '@/lib/featureStateStore';
import { requireDocumentManager, requireSession } from '@/lib/requestAuth';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  const surface = await getFeatureState(params.slug);
  if (!surface) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(surface);
}

export async function PUT(request: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  await saveFeatureState(params.slug, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  const reset = await resetFeatureState(params.slug);
  if (!reset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(reset);
}
