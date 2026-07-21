import { NextRequest, NextResponse } from 'next/server';
import { aiFeatureRegistry, pageRegistry } from '@/lib/unifiedApp';
import { sourceCustomPageRegistry } from '@/lib/sourceCustomFeatures';

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = aiFeatureRegistry[slug] ?? pageRegistry[slug] ?? sourceCustomPageRegistry[slug];
  if (!page) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(page);
}
