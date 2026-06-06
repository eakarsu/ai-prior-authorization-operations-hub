import PriorAuthWorkspace from '@/components/unified/PriorAuthWorkspace';
import UnifiedShell from '@/components/unified/UnifiedShell';

export default function PriorAuthCommandCenterPage() {
  return (
    <UnifiedShell
      eyebrow="Command Center"
      title="Prior Authorization Case Command Center"
      subtitle="Canonical authorization cases, lifecycle timeline, payer rule fit, evidence gaps, packet readiness, submissions, appeals, SLA automation, analytics, and compliance controls."
    >
      <PriorAuthWorkspace focus="case-command-center" />
    </UnifiedShell>
  );
}
