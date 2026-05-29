import { ensurePostgres } from '@/lib/postgres';
import { sourceDataTables, type SourceDataTable } from '@/lib/sourceDataTables';

export type SourceTableRow = {
  id: string;
  tableId: string;
  values: Record<string, string>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

function humanizeName(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function formatCell(tableName: string, columnName: string, rowIndex: number) {
  const table = tableName.toLowerCase();
  const column = columnName.toLowerCase();
  if (column === 'id' || column.endsWith('_id')) return String(rowIndex + 1001);
  if (column.includes('email')) return 'pilot' + rowIndex + '@example.com';
  if (column.includes('phone')) return '(555) 010-' + String(rowIndex).padStart(4, '0');
  if (column.includes('amount') || column.includes('price') || column.includes('cost') || column.includes('total')) return '$' + (125 + rowIndex * 37).toLocaleString();
  if (column.includes('date') || column.includes('_at')) return '2026-05-' + String(10 + rowIndex).padStart(2, '0');
  if (column.includes('status')) return ['Active', 'Pending', 'Completed', 'Review'][rowIndex % 4];
  if (column.includes('quantity') || column.includes('count') || column.includes('age')) return String(2 + rowIndex);
  if (column.includes('name')) return humanizeName(table.replace(/s$/, '')) + ' ' + String(rowIndex + 1);
  if (column.includes('species')) return ['Canine', 'Feline', 'Equine', 'Avian'][rowIndex % 4];
  if (column.includes('breed')) return ['Retriever', 'Domestic Shorthair', 'Quarter Horse', 'Parakeet'][rowIndex % 4];
  if (column.includes('notes') || column.includes('description') || column.includes('history')) return 'Operational note ' + String(rowIndex + 1);
  return humanizeName(columnName) + ' ' + String(rowIndex + 1);
}

function previewColumns(table: SourceDataTable) {
  const meaningful = table.columns
    .map((column) => column.name)
    .filter((name) => !['created_at', 'updated_at', 'deleted_at', 'createdAt', 'updatedAt'].includes(name));
  return meaningful.length ? meaningful.slice(0, 8) : ['record', 'source_project', 'source_file', 'status'];
}

function seedRows(table: SourceDataTable): SourceTableRow[] {
  const columns = previewColumns(table);
  const now = new Date().toISOString();
  return Array.from({ length: 20 }, (_, rowIndex) => {
    const values: Record<string, string> = {};
    for (const column of columns) {
      if (column === 'record') values[column] = table.displayName + ' ' + String(rowIndex + 1);
      else if (column === 'source_project') values[column] = table.sourceProject;
      else if (column === 'source_file') values[column] = table.sourceFile;
      else values[column] = formatCell(table.name, column, rowIndex);
    }
    return {
      id: table.id + '-row-' + String(rowIndex + 1).padStart(2, '0'),
      tableId: table.id,
      values,
      sortOrder: rowIndex + 1,
      createdAt: now,
      updatedAt: now,
    };
  });
}

let rowsTableReady = false;
let rowsTablePromise: Promise<Awaited<ReturnType<typeof ensurePostgres>>> | null = null;

async function ensureRowsTable() {
  if (rowsTableReady) return ensurePostgres();
  if (rowsTablePromise) return rowsTablePromise;
  rowsTablePromise = (async () => {
  const current = await ensurePostgres();
  await current.query(
    'CREATE TABLE IF NOT EXISTS source_table_rows (' +
      'id TEXT PRIMARY KEY,' +
      'table_id TEXT NOT NULL,' +
      'payload JSONB NOT NULL,' +
      'updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()' +
    ');',
  );
  rowsTableReady = true;
  return current;
  })();
  return rowsTablePromise;
}

async function ensureRowsSeed(tableId: string) {
  const current = await ensureRowsTable();
  const { rows } = await current.query<{ count: string }>('SELECT COUNT(*)::text as count FROM source_table_rows WHERE table_id = $1', [tableId]);
  if (Number(rows[0]?.count || 0) > 0) return;
  const table = sourceDataTables.find((item) => item.id === tableId);
  if (!table) return;
  for (const row of seedRows(table)) {
    await current.query(
      'INSERT INTO source_table_rows (id, table_id, payload, updated_at) VALUES ($1, $2, $3::jsonb, NOW()) ON CONFLICT (id) DO NOTHING',
      [row.id, row.tableId, JSON.stringify(row)],
    );
  }
}

export async function listSourceTableRows(tableId: string): Promise<SourceTableRow[]> {
  await ensureRowsSeed(tableId);
  const current = await ensureRowsTable();
  const { rows } = await current.query<{ payload: SourceTableRow }>(
    "SELECT payload FROM source_table_rows WHERE table_id = $1 ORDER BY COALESCE((payload->>'sortOrder')::int, 999999), updated_at DESC",
    [tableId],
  );
  return rows.map((row) => row.payload);
}

export async function addSourceTableRow(tableId: string, values: Record<string, string>) {
  const currentRows = await listSourceTableRows(tableId);
  const now = new Date().toISOString();
  const row: SourceTableRow = {
    id: tableId + '-row-' + Date.now().toString(36),
    tableId,
    values,
    sortOrder: currentRows.length + 1,
    createdAt: now,
    updatedAt: now,
  };
  const current = await ensureRowsTable();
  await current.query(
    'INSERT INTO source_table_rows (id, table_id, payload, updated_at) VALUES ($1, $2, $3::jsonb, NOW())',
    [row.id, tableId, JSON.stringify(row)],
  );
  return row;
}

export async function updateSourceTableRow(tableId: string, rowId: string, values: Record<string, string>) {
  const current = await ensureRowsTable();
  const existing = await current.query<{ payload: SourceTableRow }>('SELECT payload FROM source_table_rows WHERE id = $1 AND table_id = $2', [rowId, tableId]);
  const previous = existing.rows[0]?.payload;
  if (!previous) return null;
  const row: SourceTableRow = { ...previous, values, updatedAt: new Date().toISOString() };
  await current.query(
    'UPDATE source_table_rows SET payload = $1::jsonb, updated_at = NOW() WHERE id = $2 AND table_id = $3',
    [JSON.stringify(row), rowId, tableId],
  );
  return row;
}

export async function deleteSourceTableRow(tableId: string, rowId: string) {
  const current = await ensureRowsTable();
  const deleted = await current.query('DELETE FROM source_table_rows WHERE id = $1 AND table_id = $2', [rowId, tableId]);
  return Boolean(deleted.rowCount);
}
