import GovernedPriorAuthWorkspace from '@/components/unified/GovernedPriorAuthWorkspace';
import UnifiedShell from '@/components/unified/UnifiedShell';

export const dynamic = 'force-dynamic';
export default function PriorAuthCommandCenterPage() {
  return <UnifiedShell eyebrow="Medicare Advantage Operations" title="Post-Acute Prior Authorization & Appeals Learning OS" subtitle="Turn governed authorization work, human decisions, payer outcomes, and recovery results into a private operating advantage."><GovernedPriorAuthWorkspace /></UnifiedShell>;
}
