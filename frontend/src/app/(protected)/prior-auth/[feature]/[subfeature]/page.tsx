import { notFound } from 'next/navigation';
import PriorAuthWorkspace from '@/components/unified/PriorAuthWorkspace';
import UnifiedShell from '@/components/unified/UnifiedShell';
import { priorAuthFeatureMap } from '@/lib/priorAuthNavigation';

export default function PriorAuthSubFeatureTablePage({ params }: { params: { feature: string; subfeature: string } }) {
  const feature = priorAuthFeatureMap[params.feature];
  const subfeature = feature?.subfeatures.find((item) => item.slug === params.subfeature);
  if (!feature || !subfeature) {
    notFound();
  }

  return (
    <UnifiedShell eyebrow={feature.title} title={subfeature.title} subtitle={subfeature.summary}>
      <PriorAuthWorkspace focus={`${feature.slug}-${subfeature.slug}`} featureSlug={feature.slug} subfeatureSlug={subfeature.slug} />
    </UnifiedShell>
  );
}
