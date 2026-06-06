import { notFound } from 'next/navigation';
import PriorAuthWorkspace from '@/components/unified/PriorAuthWorkspace';
import UnifiedShell from '@/components/unified/UnifiedShell';
import { priorAuthFeatureMap } from '@/lib/priorAuthNavigation';

export default function PriorAuthFeatureDashboardPage({ params }: { params: { feature: string } }) {
  const feature = priorAuthFeatureMap[params.feature];
  if (!feature) {
    notFound();
  }

  return (
    <UnifiedShell eyebrow="Prior Auth Feature" title={feature.title} subtitle={feature.summary}>
      <PriorAuthWorkspace focus={feature.slug} featureSlug={feature.slug} />
    </UnifiedShell>
  );
}
