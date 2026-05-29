'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { rolePermissions } from '@/lib/auth';
import type { EntityRecord, FeatureEntitySet } from '@/lib/featureEntities';

type Props = {
  slug: string;
  seed: FeatureEntitySet | null;
};

function cloneSet(set: FeatureEntitySet): FeatureEntitySet {
  return {
    title: set.title,
    columns: [...set.columns],
    rows: set.rows.map((row) => ({ ...row })),
  };
}

const STATUS_OPTIONS = ['Draft', 'Open', 'Queued', 'Review', 'Ready', 'In review', 'Approval pending', 'Urgent', 'Completed', 'Exception', 'Campaign active'];
const emptyRecordForm = { name: '', status: 'Open', owner: '', amount: '', dueDate: '' };

export default function EntityWorkspace({ slug, seed }: Props) {
  const { user } = useAuth();
  const permissions = rolePermissions[user?.role || 'analyst'];
  const canApprove = permissions.canApprove;
  const canManage = permissions.canManageDocuments;
  const seedSet = useMemo(() => (seed ? cloneSet(seed) : null), [seed]);
  const [dataset, setDataset] = useState<FeatureEntitySet | null>(seedSet);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyRecordForm);
  const [showAddModal, setShowAddModal] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!seedSet) return;
      const response = await fetch(`/api/entities/${slug}`, { cache: 'no-store' });
      if (!response.ok) {
        if (active) setDataset(seedSet);
        return;
      }
      const payload = (await response.json()) as FeatureEntitySet;
      if (active) setDataset(payload);
    }
    void load();
    return () => {
      active = false;
    };
  }, [seedSet, slug]);

  useEffect(() => {
    if (!dataset) return;
    if (!canManage) {
      setSaving(false);
      return;
    }
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaving(true);
    saveTimeout.current = setTimeout(async () => {
      const response = await fetch(`/api/entities/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataset),
      });
      if (!response.ok) {
        setError('Unable to save changes for this role.');
      } else {
        setError('');
      }
      setSaving(false);
    }, 350);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [canManage, dataset, slug]);

  if (!dataset) return null;

  const filtered = dataset.rows.filter((row) =>
    !query ||
    row.name.toLowerCase().includes(query.toLowerCase()) ||
    row.owner.toLowerCase().includes(query.toLowerCase()) ||
    (row.status ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  const updateRow = (id: string, field: keyof EntityRecord, value: string) => {
    if (!canManage) return;
    setDataset((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
          }
        : current,
    );
  };

  const removeRow = (id: string) => {
    if (!canManage) return;
    setDataset((current) =>
      current
        ? {
            ...current,
            rows: current.rows.filter((row) => row.id !== id),
          }
        : current,
    );
  };

  const addRow = () => {
    if (!canManage) return;
    if (!form.name.trim()) return;
    const row: EntityRecord = {
      id: `entity-${Date.now()}`,
      name: form.name.trim(),
      status: form.status || 'Open',
      owner: form.owner.trim() || 'Unassigned',
      amount: form.amount.trim() || '$0',
      dueDate: form.dueDate.trim() || '',
    };
    setDataset((current) => (current ? { ...current, rows: [row, ...current.rows] } : current));
    setForm(emptyRecordForm);
    setShowAddModal(false);
  };

  const reset = async () => {
    const response = await fetch(`/api/entities/${slug}`, { method: 'DELETE' });
    if (!response.ok) return;
    const payload = (await response.json()) as FeatureEntitySet;
    setDataset(payload);
  };

  const applyApproval = async (id: string, approved: boolean) => {
    if (!canApprove) return;
    const response = await fetch(`/api/entities/${slug}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowId: id, approved }),
    });
    if (!response.ok) {
      setError('Approval action failed.');
      return;
    }
    const payload = (await response.json()) as { row: EntityRecord };
    setDataset((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) => (row.id === id ? payload.row : row)),
          }
        : current,
    );
    setError('');
  };

  return (
    <div className="card">
      <h3>{dataset.title}</h3>
      <div className="toolbar-row">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search records" />
        <span className="save-indicator">{saving ? 'Saving...' : 'Saved'}</span>
        <div className="muted">{canManage ? 'Edit mode' : 'Read-only mode'}</div>
        <button className="button subtle" type="button" onClick={reset} disabled={!canManage}>Reset records</button>
        <button
          className="button primary"
          type="button"
          onClick={() => {
            setForm(emptyRecordForm);
            setShowAddModal(true);
          }}
          disabled={!canManage}
        >
          Add record
        </button>
      </div>
      {error ? <div style={{ color: '#b91c1c', marginTop: 8 }}>{error}</div> : null}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td><input value={row.name} onChange={(e) => updateRow(row.id, 'name', e.target.value)} disabled={!canManage} /></td>
                <td>
                  <select value={row.status} onChange={(e) => updateRow(row.id, 'status', e.target.value)} disabled={!canManage}>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
                <td><input value={row.owner} onChange={(e) => updateRow(row.id, 'owner', e.target.value)} disabled={!canManage} /></td>
                <td><input value={row.amount ?? ''} onChange={(e) => updateRow(row.id, 'amount', e.target.value)} disabled={!canManage} /></td>
                <td><input type="date" value={row.dueDate ?? ''} onChange={(e) => updateRow(row.id, 'dueDate', e.target.value)} disabled={!canManage} /></td>
                <td>
                  <div className="inline-links">
                    <button className="button subtle" type="button" onClick={() => applyApproval(row.id, true)} disabled={!canApprove}>Approve</button>
                    <button className="button subtle" type="button" onClick={() => applyApproval(row.id, false)} disabled={!canApprove}>Reject</button>
                    <button className="button subtle" type="button" onClick={() => removeRow(row.id)} disabled={!canManage}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal ? (
        <div className="record-modal-backdrop" role="presentation" onClick={() => setShowAddModal(false)}>
          <div className="record-modal" role="dialog" aria-modal="true" aria-label={'Add ' + dataset.title + ' record'} onClick={(event) => event.stopPropagation()}>
            <button className="record-modal-close" type="button" aria-label="Close add record dialog" onClick={() => setShowAddModal(false)}>
              <X size={18} aria-hidden="true" />
            </button>
            <div className="record-modal-header">
              <div>
                <span className="eyebrow">Add Record</span>
                <h2>{dataset.title}</h2>
                <p>Create a complete record with status, owner, amount, and due date.</p>
              </div>
            </div>
            <div className="record-form-grid">
              <label className="record-form-field span-2">
                <span>Name</span>
                <input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Record name" autoFocus />
              </label>
              <label className="record-form-field">
                <span>Status</span>
                <select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="record-form-field">
                <span>Owner</span>
                <input value={form.owner} onChange={(e) => setForm((s) => ({ ...s, owner: e.target.value }))} placeholder="Owner" />
              </label>
              <label className="record-form-field">
                <span>Amount</span>
                <input value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} placeholder="Amount" />
              </label>
              <label className="record-form-field">
                <span>Due Date</span>
                <input type="date" value={form.dueDate} onChange={(e) => setForm((s) => ({ ...s, dueDate: e.target.value }))} />
              </label>
            </div>
            <div className="record-modal-actions">
              <button className="button secondary" type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="button primary" type="button" onClick={addRow} disabled={!form.name.trim()}>Save record</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
