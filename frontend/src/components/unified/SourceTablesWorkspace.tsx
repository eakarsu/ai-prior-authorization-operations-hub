'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { sourceDataTables, type SourceDataTable } from '@/lib/sourceDataTables';

type SourceTableRow = {
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
  const selected = meaningful.length ? meaningful.slice(0, 8) : ['record', 'source_project', 'source_file', 'status'];
  return selected;
}

function buildPreviewRows(table: SourceDataTable): SourceTableRow[] {
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

function emptyDraft(columns: string[]) {
  return Object.fromEntries(columns.map((column) => [column, '']));
}

function inputTypeForColumn(columnName: string) {
  const column = columnName.toLowerCase();
  if (column.includes('date') || column.endsWith('_at') || column.endsWith('at')) return 'date';
  if (column.includes('email')) return 'email';
  if (column.includes('phone')) return 'tel';
  return 'text';
}

export default function SourceTablesWorkspace() {
  const [tables, setTables] = useState<SourceDataTable[]>(sourceDataTables);
  const [query, setQuery] = useState('');
  const [project, setProject] = useState('All');
  const [framework, setFramework] = useState('All');
  const [selectedId, setSelectedId] = useState(sourceDataTables[0]?.id ?? '');
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [rowsByTable, setRowsByTable] = useState<Record<string, SourceTableRow[]>>({});
  const [rowStatus, setRowStatus] = useState<'idle' | 'loading' | 'saving' | 'fallback'>('idle');
  const [editingId, setEditingId] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [detailRow, setDetailRow] = useState<SourceTableRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/source-tables', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { tables?: SourceDataTable[] } | null) => {
        if (cancelled) return;
        if (payload?.tables?.length) {
          setTables(payload.tables);
          setSelectedId((current) => current || payload.tables?.[0]?.id || '');
          setStatus('ready');
        } else {
          setStatus('fallback');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('fallback');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const projects = useMemo(() => ['All', ...Array.from(new Set(tables.map((table) => table.sourceProject))).sort()], [tables]);
  const frameworks = useMemo(() => ['All', ...Array.from(new Set(tables.map((table) => table.framework))).sort()], [tables]);

  const filtered = tables.filter((table) => {
    const text = [
      table.sourceProject,
      table.name,
      table.displayName,
      table.framework,
      table.sourceFile,
    ].join(' ').toLowerCase();
    return (
      (project === 'All' || table.sourceProject === project) &&
      (framework === 'All' || table.framework === framework) &&
      (!query || text.includes(query.toLowerCase()))
    );
  });

  const selected = tables.find((table) => table.id === selectedId) || filtered[0] || tables[0];
  const selectedColumns = selected ? previewColumns(selected) : [];
  const fallbackRows = selected ? buildPreviewRows(selected) : [];
  const previewRows = selected ? (rowsByTable[selected.id] || fallbackRows) : [];

  useEffect(() => {
    if (!selected?.id) return;
    let cancelled = false;
    setRowStatus('loading');
    setAdding(false);
    setEditingId('');
    fetch('/api/source-tables/' + encodeURIComponent(selected.id) + '/rows', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { rows?: SourceTableRow[] } | null) => {
        if (cancelled) return;
        if (payload?.rows?.length) {
          setRowsByTable((current) => ({ ...current, [selected.id]: payload.rows || [] }));
          setRowStatus('idle');
        } else {
          setRowsByTable((current) => ({ ...current, [selected.id]: fallbackRows }));
          setRowStatus('fallback');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setRowsByTable((current) => ({ ...current, [selected.id]: fallbackRows }));
        setRowStatus('fallback');
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  function startAdd() {
    setAdding(true);
    setEditingId('');
    setDetailRow(null);
    setDraft(emptyDraft(selectedColumns));
  }

  function startEdit(row: SourceTableRow) {
    setAdding(false);
    setEditingId(row.id);
    setDetailRow(null);
    setDraft({ ...row.values });
  }

  function updateDraft(column: string, value: string) {
    setDraft((current) => ({ ...current, [column]: value }));
  }

  async function persistRows(method: 'POST' | 'PUT' | 'DELETE', body: Record<string, unknown>) {
    if (!selected) return;
    setRowStatus('saving');
    const response = await fetch('/api/source-tables/' + encodeURIComponent(selected.id) + '/rows', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Row update failed');
    const payload = await response.json();
    if (payload.rows) {
      setRowsByTable((current) => ({ ...current, [selected.id]: payload.rows }));
    }
    setRowStatus('idle');
  }

  async function saveNewRow() {
    if (!selected) return;
    try {
      await persistRows('POST', { values: draft });
      setAdding(false);
      setDraft({});
    } catch {
      const row: SourceTableRow = {
        id: selected.id + '-local-' + Date.now().toString(36),
        tableId: selected.id,
        values: draft,
        sortOrder: previewRows.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setRowsByTable((current) => ({ ...current, [selected.id]: [...previewRows, row] }));
      setAdding(false);
      setDraft({});
      setRowStatus('fallback');
    }
  }

  async function saveEditedRow(rowId: string) {
    if (!selected) return;
    try {
      await persistRows('PUT', { rowId, values: draft });
      setEditingId('');
      setDraft({});
    } catch {
      setRowsByTable((current) => ({
        ...current,
        [selected.id]: previewRows.map((row) => (row.id === rowId ? { ...row, values: draft, updatedAt: new Date().toISOString() } : row)),
      }));
      setEditingId('');
      setDraft({});
      setRowStatus('fallback');
    }
  }

  async function deleteRow(rowId: string) {
    if (!selected) return;
    try {
      await persistRows('DELETE', { rowId });
      setDetailRow((current) => (current?.id === rowId ? null : current));
    } catch {
      setRowsByTable((current) => ({ ...current, [selected.id]: previewRows.filter((row) => row.id !== rowId) }));
      setDetailRow((current) => (current?.id === rowId ? null : current));
      setRowStatus('fallback');
    }
  }

  return (
    <div className="stack source-tables-workspace">
      <div className="grid columns-3">
        <div className="card metric-card">
          <span>Source Tables</span>
          <strong>{tables.length}</strong>
          <em>Original donor tables detected</em>
        </div>
        <div className="card metric-card">
          <span>Projects</span>
          <strong>{projects.length - 1}</strong>
          <em>Donor apps represented</em>
        </div>
        <div className="card metric-card">
          <span>Frameworks</span>
          <strong>{frameworks.length - 1}</strong>
          <em>Schema formats detected</em>
        </div>
      </div>

      <div className="card source-table-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search table, source project, framework, or source file" />
        <select value={project} onChange={(event) => setProject(event.target.value)}>
          {projects.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={framework} onChange={(event) => setFramework(event.target.value)}>
          {frameworks.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <div className="muted source-table-status">
          <span>{filtered.length} matching tables</span>
          <span>{status === 'ready' ? 'Seeded Postgres registry' : status === 'loading' ? 'Loading seeded registry' : 'Static registry fallback'}</span>
        </div>
      </div>

      {filtered.length ? (
        <>
          <div className="card source-table-inventory">
            <div className="table-wrap">
              <table className="data-table source-table-index">
                <thead>
                  <tr>
                    <th>Table</th>
                    <th>Source Project</th>
                    <th>Schema Type</th>
                    <th>Source File</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((table) => (
                    <tr
                      key={table.id}
                      className={selected?.id === table.id ? 'selected-row' : ''}
                      onClick={() => setSelectedId(table.id)}
                    >
                      <td>
                        <button className="source-table-link" type="button" onClick={() => setSelectedId(table.id)}>
                          <span>{table.displayName}</span>
                          <em>{table.name}</em>
                        </button>
                      </td>
                      <td>{table.sourceProject}</td>
                      <td><span className="pill">{table.framework}</span></td>
                      <td><span className="source-file-path">{table.sourceFile}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selected ? (
            <div className="card source-table-content">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Table Content</span>
                  <h2>{selected.displayName}</h2>
                  <p>{selected.sourceProject} / {selected.name}</p>
                </div>
                <div className="source-row-actions">
                  <span className="pill">{previewRows.length} rows</span>
                  <span className="pill">{rowStatus === 'saving' ? 'Saving' : rowStatus === 'loading' ? 'Loading rows' : rowStatus === 'fallback' ? 'Local fallback' : 'Editable Postgres rows'}</span>
                  <button className="button primary" type="button" onClick={startAdd}>Add Row</button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table source-content-table">
                  <thead>
                    <tr>
                      {selectedColumns.map((column) => <th key={column}>{humanizeName(column)}</th>)}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adding ? (
                      <tr className="editing-row">
                        {selectedColumns.map((column) => (
                          <td key={column}>
                            <input
                              type={inputTypeForColumn(column)}
                              value={draft[column] || ''}
                              onChange={(event) => updateDraft(column, event.target.value)}
                              placeholder={humanizeName(column)}
                            />
                          </td>
                        ))}
                        <td>
                          <div className="row-command-bar">
                            <button className="button primary" type="button" onClick={saveNewRow}>Save</button>
                            <button className="button secondary" type="button" onClick={() => { setAdding(false); setDraft({}); }}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    {previewRows.map((row) => (
                      <tr key={row.id} className="clickable-content-row" onClick={() => setDetailRow(row)}>
                        {selectedColumns.map((column) => (
                          <td key={column}>
                            {editingId === row.id ? (
                              <input
                                type={inputTypeForColumn(column)}
                                value={draft[column] || ''}
                                onChange={(event) => updateDraft(column, event.target.value)}
                                placeholder={humanizeName(column)}
                              />
                            ) : (
                              row.values[column] || ''
                            )}
                          </td>
                        ))}
                        <td>
                          {editingId === row.id ? (
                            <div className="row-command-bar" onClick={(event) => event.stopPropagation()}>
                              <button className="button primary" type="button" onClick={() => saveEditedRow(row.id)}>Save</button>
                              <button className="button secondary" type="button" onClick={() => { setEditingId(''); setDraft({}); }}>Cancel</button>
                            </div>
                          ) : (
                            <div className="row-command-bar" onClick={(event) => event.stopPropagation()}>
                              <button className="button secondary" type="button" onClick={() => setDetailRow(row)}>Open</button>
                              <button className="button secondary" type="button" onClick={() => startEdit(row)}>Edit</button>
                              <button className="button danger" type="button" onClick={() => deleteRow(row.id)}>Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {detailRow && selected ? (
            <div className="source-row-modal-backdrop" role="presentation" onClick={() => setDetailRow(null)}>
              <div className="source-row-modal" role="dialog" aria-modal="true" aria-label={selected.displayName + ' row details'} onClick={(event) => event.stopPropagation()}>
                <button className="source-row-modal-close" type="button" aria-label="Close row details" onClick={() => setDetailRow(null)}>
                  <Check size={18} aria-hidden="true" />
                </button>
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Row Details</span>
                    <h2>{selected.displayName}</h2>
                    <p>{detailRow.id}</p>
                  </div>
                </div>
                <div className="source-row-detail-grid">
                  {selectedColumns.map((column) => (
                    <div className="source-row-detail-field" key={column}>
                      <span>{humanizeName(column)}</span>
                      <strong>{detailRow.values[column] || '-'}</strong>
                    </div>
                  ))}
                </div>
                <div className="row-command-bar modal-actions">
                  <button className="button primary" type="button" onClick={() => startEdit(detailRow)}>Edit Row</button>
                  <button className="button danger" type="button" onClick={() => deleteRow(detailRow.id)}>Delete Row</button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="card empty-state">
          <h3>No source tables found</h3>
          <p>Adjust filters or add donor schema files to the source audit.</p>
        </div>
      )}
    </div>
  );
}
