import { notFound } from 'next/navigation';
import FeaturePage from '@/components/unified/FeaturePage';
import { pageRegistry } from '@/lib/unifiedApp';

export default function SuitePage({ params }: { params: { slug: string } }) {
  const page = pageRegistry[params.slug];
  if (!page) {
    notFound();
  }

  return <FeaturePage slug={params.slug} page={page} />;
}
