import { notFound } from 'next/navigation';
import FeaturePage from '@/components/unified/FeaturePage';
import { aiFeatureRegistry } from '@/lib/unifiedApp';
import { sourceCustomPageRegistry } from '@/lib/sourceCustomFeatures';

export default async function AiFeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = aiFeatureRegistry[slug] ?? sourceCustomPageRegistry[slug];
  if (!page) {
    notFound();
  }

  return <FeaturePage slug={slug} page={page} />;
}
