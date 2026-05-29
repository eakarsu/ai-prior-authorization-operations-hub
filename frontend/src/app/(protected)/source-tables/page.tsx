import SourceTablesWorkspace from '@/components/unified/SourceTablesWorkspace';
import UnifiedShell from '@/components/unified/UnifiedShell';
import { sourceDataTables } from '@/lib/sourceDataTables';

export default function SourceTablesPage() {
  const projects = new Set(sourceDataTables.map((table) => table.sourceProject));

  return (
    <UnifiedShell
      eyebrow="Source Schema"
      title="Source Tables"
      subtitle={sourceDataTables.length + ' original donor tables mapped from ' + projects.size + ' source projects into this suite.'}
    >
      <SourceTablesWorkspace />
    </UnifiedShell>
  );
}
