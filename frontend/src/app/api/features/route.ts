import { NextResponse } from 'next/server';
import { featureCatalog, featureFamilies } from '@/lib/unifiedApp';
import { sourceCustomFeatureCatalog, sourceCustomFeatureFamilies } from '@/lib/sourceCustomFeatures';

export async function GET() {
  return NextResponse.json({ featureCatalog: [...featureCatalog, ...sourceCustomFeatureCatalog], featureFamilies: [...featureFamilies, ...sourceCustomFeatureFamilies] });
}
