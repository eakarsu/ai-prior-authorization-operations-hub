import { NextRequest, NextResponse } from 'next/server';
import { aiFeatureRegistry, pageRegistry } from '@/lib/unifiedApp';
import { sourceCustomPageRegistry } from '@/lib/sourceCustomFeatures';

export async function GET(_: NextRequest, { params }: { params: { slug: string } }) {
  const page = aiFeatureRegistry[params.slug] ?? pageRegistry[params.slug] ?? sourceCustomPageRegistry[params.slug];
  if (!page) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(page);
}
