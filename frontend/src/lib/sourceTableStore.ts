import { ensureListSeed, listPgPayloads, replacePgPayloads } from '@/lib/postgres';
import { sourceDataTables, type SourceDataTable } from '@/lib/sourceDataTables';

async function ensureStore() {
  await ensureListSeed('source_data_tables', sourceDataTables, 'source-data-tables.json');
}

export async function listSourceDataTables(): Promise<SourceDataTable[]> {
  await ensureStore();
  const rows = await listPgPayloads<SourceDataTable>('source_data_tables');
  return rows.length ? rows : sourceDataTables;
}

export async function reseedSourceDataTables() {
  await replacePgPayloads('source_data_tables', sourceDataTables);
  return sourceDataTables;
}
