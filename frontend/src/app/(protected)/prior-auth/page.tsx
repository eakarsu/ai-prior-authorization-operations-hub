import GovernedPriorAuthWorkspace from '@/components/unified/GovernedPriorAuthWorkspace';
import UnifiedShell from '@/components/unified/UnifiedShell';

export const dynamic = 'force-dynamic';
export default function PriorAuthCommandCenterPage() {
  return <UnifiedShell eyebrow="Governed Workflow" title="Prior Authorization Case Operations" subtitle="Persistent evidence, independent clinical review, durable payer submission, signed responses, appeals, and audit history."><GovernedPriorAuthWorkspace /></UnifiedShell>;
}
