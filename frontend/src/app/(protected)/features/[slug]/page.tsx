import { notFound } from 'next/navigation';
import FeaturePage from '@/components/unified/FeaturePage';
import { aiFeatureRegistry } from '@/lib/unifiedApp';
import { sourceCustomPageRegistry } from '@/lib/sourceCustomFeatures';

export default function AiFeaturePage({ params }: { params: { slug: string } }) {
  const page = aiFeatureRegistry[params.slug] ?? sourceCustomPageRegistry[params.slug];
  if (!page) {
    notFound();
  }

  return <FeaturePage slug={params.slug} page={page} />;
}
