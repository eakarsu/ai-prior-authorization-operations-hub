'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
import type { FeatureSurface, FeatureSurfaceRow } from '@/lib/featureSurfaces';

type Props = {
  pageTitle: string;
  surface: FeatureSurface;
  setSurface: Dispatch<SetStateAction<FeatureSurface>>;
  onActivity: (message: string) => void;
};

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const APPROVALS = ['Not required', 'Pending', 'Approved', 'Rejected'];

function csvCell(value: unknown) {
  return '"' + String(value ?? '').replaceAll('"', '""') + '"';
}

export default function DecisionEnhancements({ pageTitle, surface, setSurface, onActivity }: Props) {
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('All');
  const [confidence, setConfidence] = useState(72);
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (row: FeatureSurfaceRow) => row.status !== 'Completed' && row.due < today;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return surface.workItems.filter((row) => {
      const text = [row.item, row.owner, row.nextStep, row.evidenceSource].join(' ').toLowerCase();
      return (!normalized || text.includes(normalized)) && (priority === 'All' || row.priority === priority);
    });
  }, [priority, query, surface.workItems]);

  const metrics = useMemo(() => {
    const open = surface.workItems.filter((row) => row.status !== 'Completed').length;
    const urgent = surface.workItems.filter((row) => ['Critical', 'High'].includes(row.priority) && row.status !== 'Completed').length;
    const overdue = surface.workItems.filter(isOverdue).length;
    const evidence = surface.workItems.length
      ? Math.round(surface.workItems.filter((row) => row.evidenceVerified).length / surface.workItems.length * 100)
      : 0;
    const pending = surface.workItems.filter((row) => row.approval === 'Pending').length;
    const impact = Math.round(surface.workItems.reduce((sum, row) => sum + Number(row.impact || 0), 0) * confidence / 100);
    const invalid = surface.workItems.filter((row) => !row.owner?.trim() || !row.due || !row.evidenceSource?.trim()).length;
    return { open, urgent, overdue, evidence, pending, impact, invalid };
  }, [confidence, surface.workItems]);

  function updateRow(id: string, changes: Partial<FeatureSurfaceRow>, message: string) {
    setSurface((current) => ({
      ...current,
      workItems: current.workItems.map((row) => row.id === id ? { ...row, ...changes } : row),
    }));
    onActivity(message);
  }

  function exportCsv() {
    const fields: Array<keyof FeatureSurfaceRow> = ['id', 'item', 'owner', 'priority', 'status', 'due', 'approval', 'evidenceSource', 'evidenceVerified', 'escalated', 'impact', 'nextStep'];
    const csv = [fields.join(','), ...surface.workItems.map((row) => fields.map((field) => csvCell(row[field])).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-decision-work.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const alerts = surface.workItems.filter((row) => isOverdue(row) || row.escalated || row.priority === 'Critical');

  return (
    <div className="stack">
      <div className="grid columns-3">
        {[
          ['Open work', metrics.open, 'Items requiring action'],
          ['High-risk queue', metrics.urgent, 'Critical and high priority'],
          ['Overdue SLAs', metrics.overdue, 'Exceptions requiring escalation'],
          ['Evidence coverage', metrics.evidence + '%', 'Source evidence verified'],
          ['Pending approvals', metrics.pending, 'Human decisions required'],
          ['Scenario impact', metrics.impact, 'Value units at ' + confidence + '% confidence'],
        ].map(([label, value, note]) => (
          <div className="card" key={label}>
            <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, margin: '6px 0' }}>{value}</div>
            <div className="muted" style={{ fontSize: 12 }}>{note}</div>
          </div>
        ))}
      </div>

      <div className="grid columns-2">
        <div className="card">
          <h3>Scenario Simulation</h3>
          <label>
            Planning confidence: {confidence}%
            <input type="range" min="10" max="100" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} style={{ width: '100%', marginTop: 10 }} />
          </label>
          <p className="muted">Forecasts support planning only. They never bypass approval, policy, or domain review.</p>
        </div>
        <div className="card">
          <h3>SLA and Validation Alerts</h3>
          <strong>{alerts.length} active exception{alerts.length === 1 ? '' : 's'}</strong>
          <p className="muted">{metrics.invalid} item{metrics.invalid === 1 ? '' : 's'} missing owner, deadline, or evidence source.</p>
          <div>{alerts.slice(0, 3).map((row) => <div key={row.id}>{row.item}</div>)}</div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search decisions, owners, sources, or next steps" />
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="All">All priorities</option>
            {PRIORITIES.map((value) => <option key={value}>{value}</option>)}
          </select>
          <button className="button subtle" type="button" onClick={exportCsv}>Export CSV</button>
          <button className="button subtle" type="button" onClick={() => window.print()}>Print / PDF</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Work item</th><th>Priority</th><th>SLA</th><th>Approval</th><th>Evidence lineage</th><th>Controls</th></tr></thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.item}</strong><div className="muted">{row.owner}</div></td>
                  <td><select value={row.priority || 'Medium'} onChange={(event) => updateRow(row.id, { priority: event.target.value as FeatureSurfaceRow['priority'] }, 'Priority updated for ' + row.item)}>{PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select></td>
                  <td><input type="date" value={row.due || ''} onChange={(event) => updateRow(row.id, { due: event.target.value }, 'SLA updated for ' + row.item)} /><div className="muted">{isOverdue(row) ? 'Overdue' : 'Within SLA'}</div></td>
                  <td><select value={row.approval || 'Pending'} onChange={(event) => updateRow(row.id, { approval: event.target.value as FeatureSurfaceRow['approval'] }, 'Approval updated for ' + row.item)}>{APPROVALS.map((value) => <option key={value}>{value}</option>)}</select></td>
                  <td><input value={row.evidenceSource || ''} onChange={(event) => updateRow(row.id, { evidenceSource: event.target.value }, 'Evidence source updated for ' + row.item)} /></td>
                  <td>
                    <label className="check-row"><input type="checkbox" checked={row.evidenceVerified} onChange={(event) => updateRow(row.id, { evidenceVerified: event.target.checked }, 'Evidence verification updated for ' + row.item)} /> Evidence</label>
                    <label className="check-row"><input type="checkbox" checked={row.escalated} onChange={(event) => updateRow(row.id, { escalated: event.target.checked }, 'Escalation updated for ' + row.item)} /> Escalate</label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
