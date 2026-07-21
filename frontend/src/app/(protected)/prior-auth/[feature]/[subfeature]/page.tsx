import { notFound } from 'next/navigation';
import PriorAuthWorkspace from '@/components/unified/PriorAuthWorkspace';
import UnifiedShell from '@/components/unified/UnifiedShell';
import { priorAuthFeatureMap } from '@/lib/priorAuthNavigation';

export default async function PriorAuthSubFeatureTablePage({ params }: { params: Promise<{ feature: string; subfeature: string }> }) {
  const resolved = await params;
  const feature = priorAuthFeatureMap[resolved.feature];
  const subfeature = feature?.subfeatures.find((item) => item.slug === resolved.subfeature);
  if (!feature || !subfeature) {
    notFound();
  }

  return (
    <UnifiedShell eyebrow={feature.title} title={subfeature.title} subtitle={subfeature.summary}>
      <PriorAuthWorkspace focus={`${feature.slug}-${subfeature.slug}`} featureSlug={feature.slug} subfeatureSlug={subfeature.slug} />
    </UnifiedShell>
  );
}
