import { notFound } from 'next/navigation';
import PriorAuthWorkspace from '@/components/unified/PriorAuthWorkspace';
import UnifiedShell from '@/components/unified/UnifiedShell';
import { priorAuthFeatureMap } from '@/lib/priorAuthNavigation';

export default async function PriorAuthFeatureDashboardPage({ params }: { params: Promise<{ feature: string }> }) {
  const { feature: featureSlug } = await params;
  const feature = priorAuthFeatureMap[featureSlug];
  if (!feature) {
    notFound();
  }

  return (
    <UnifiedShell eyebrow="Prior Auth Feature" title={feature.title} subtitle={feature.summary}>
      <PriorAuthWorkspace focus={feature.slug} featureSlug={feature.slug} />
    </UnifiedShell>
  );
}
