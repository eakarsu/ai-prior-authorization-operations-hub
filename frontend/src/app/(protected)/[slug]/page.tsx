import { notFound } from 'next/navigation';
import FeaturePage from '@/components/unified/FeaturePage';
import PriorAuthWorkspace from '@/components/unified/PriorAuthWorkspace';
import UnifiedShell from '@/components/unified/UnifiedShell';
import { priorAuthFeatureMap } from '@/lib/priorAuthNavigation';
import { pageRegistry } from '@/lib/unifiedApp';

const priorAuthDashboardFeatures: Record<string, string> = {
  'auth-intake': 'case-model',
  'payer-rule-matching': 'payer-rule-engine',
  'evidence-checklist': 'evidence-gap-detection',
  'packet-generation': 'packet-builder',
  'denial-prevention': 'payer-rule-engine',
  'appeal-routing': 'appeals-workspace',
  'peer-review-prep': 'appeals-workspace',
  'sla-tracking': 'sla-automation',
  'authorization-analytics': 'analytics',
  'patient-updates': 'case-timeline',
};

export default async function SuitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const priorAuthFeatureSlug = priorAuthDashboardFeatures[slug];
  if (priorAuthFeatureSlug) {
    const feature = priorAuthFeatureMap[priorAuthFeatureSlug];
    return (
      <UnifiedShell eyebrow="Prior Auth Feature" title={feature.title} subtitle={feature.summary}>
        <PriorAuthWorkspace focus={feature.slug} featureSlug={feature.slug} />
      </UnifiedShell>
    );
  }

  const page = pageRegistry[slug];
  if (!page) {
    notFound();
  }

  return <FeaturePage slug={slug} page={page} />;
}
