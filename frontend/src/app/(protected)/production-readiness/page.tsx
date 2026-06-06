import ProductionReadinessWorkspace from '@/components/unified/ProductionReadinessWorkspace';
import UnifiedShell from '@/components/unified/UnifiedShell';

export default function ProductionReadinessPage() {
  return (
    <UnifiedShell
      eyebrow="Production"
      title="Production Readiness"
      subtitle="Integration connectors, enterprise auth controls, packet artifacts, notification delivery outbox, access logs, and deployment checklist."
    >
      <ProductionReadinessWorkspace />
    </UnifiedShell>
  );
}
