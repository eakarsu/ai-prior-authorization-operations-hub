'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import AIWorkbench from '@/components/unified/AIWorkbench';
import DocumentsWorkspace from '@/components/unified/DocumentsWorkspace';
import EntityWorkspace from '@/components/unified/EntityWorkspace';
import MetricCard from '@/components/unified/MetricCard';
import UnifiedShell from '@/components/unified/UnifiedShell';
import { featureContexts, type PageDefinition } from '@/lib/unifiedApp';
import { sourceCustomFeatureContexts, sourceCustomFeatureEntitiesBySlug, sourceCustomFeatureSurfaceBySlug } from '@/lib/sourceCustomFeatures';
import { featureSurfaceBySlug, type FeatureSurface } from '@/lib/featureSurfaces';
import { featureEntitiesBySlug } from '@/lib/featureEntities';

const STATUS_OPTIONS = ['Draft', 'Open', 'Queued', 'Review', 'Ready', 'In progress', 'Needs attention', 'Exception', 'Completed'];

const emptyFeatureSurface: FeatureSurface = {
  workItems: [],
  quickActions: [],
  controlChecks: [],
  activityLog: [],
};

const emptyWorkItem = { item: '', status: 'Open', owner: '', nextStep: '' };

type FeaturePageProps = {
  slug: string;
  page: PageDefinition;
};

function cloneSurface(surface: FeatureSurface): FeatureSurface {
  return {
    workItems: surface.workItems.map((item) => ({ ...item })),
    quickActions: [...surface.quickActions],
    controlChecks: surface.controlChecks.map((item) => ({ ...item })),
    activityLog: surface.activityLog.map((item) => ({ ...item })),
  };
}

export default function FeaturePage({ slug, page }: FeaturePageProps) {
  const context = featureContexts[page.title] ?? sourceCustomFeatureContexts[page.title];
  const seedSurface = useMemo(() => cloneSurface(featureSurfaceBySlug[slug] ?? sourceCustomFeatureSurfaceBySlug[slug] ?? emptyFeatureSurface), [slug]);
  const entitySeed = featureEntitiesBySlug[slug] ?? sourceCustomFeatureEntitiesBySlug[slug] ?? null;
  const [surface, setSurface] = useState<FeatureSurface>(seedSurface);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState(emptyWorkItem);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const showAIWorkbench = slug === 'ai-tools' || slug === 'ai-assistant' || page.category.toLowerCase().includes('ai');
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSurface() {
      try {
        const response = await fetch(`/api/feature-state/${slug}`, { cache: 'no-store' });
        if (!response.ok) {
          if (active) {
            setSurface(seedSurface);
            setReady(true);
          }
          return;
        }

        const payload = (await response.json()) as FeatureSurface;
        if (active) {
          setSurface(payload);
          setReady(true);
        }
      } catch {
        if (active) {
          setSurface(seedSurface);
          setReady(true);
        }
      }
    }

    void loadSurface();
    return () => {
      active = false;
    };
  }, [seedSurface, slug]);

  useEffect(() => {
    if (!ready) return;

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    setSaving(true);
    saveTimeout.current = setTimeout(async () => {
      await fetch(`/api/feature-state/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(surface),
      });
      setSaving(false);
    }, 350);

    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [ready, slug, surface]);

  const filteredItems = surface.workItems.filter((row) => {
    const matchesQuery =
      !query ||
      row.item.toLowerCase().includes(query.toLowerCase()) ||
      row.owner.toLowerCase().includes(query.toLowerCase()) ||
      row.nextStep.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'All' || row.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const pushActivity = (message: string) => {
    setSurface((current) => ({
      ...current,
      activityLog: [
        {
          id: `log-${Date.now()}`,
          message,
          at: new Date().toLocaleString(),
        },
        ...current.activityLog,
      ],
    }));
  };

  const updateRow = (id: string, field: 'status' | 'owner' | 'nextStep', value: string) => {
    setSurface((current) => ({
      ...current,
      workItems: current.workItems.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    }));
    if (field === 'status') {
      const target = surface.workItems.find((row) => row.id === id);
      if (target) {
        pushActivity(`Updated ${target.item} status to ${value}`);
      }
    }
  };

  const toggleCheck = (id: string) => {
    let label = '';
    setSurface((current) => ({
      ...current,
      controlChecks: current.controlChecks.map((check) => {
        if (check.id !== id) return check;
        label = check.label;
        return { ...check, done: !check.done };
      }),
    }));
    if (label) {
      pushActivity(`Control check updated: ${label}`);
    }
  };

  const addWorkItem = () => {
    if (!newItem.item.trim()) return;
    const row = {
      id: `item-${Date.now()}`,
      item: newItem.item.trim(),
      owner: newItem.owner.trim() || 'Unassigned',
      nextStep: newItem.nextStep.trim() || 'Review and assign next action',
      status: newItem.status || 'Open',
    };
    setSurface((current) => ({
      ...current,
      workItems: [row, ...current.workItems],
    }));
    pushActivity(`Added work item: ${row.item}`);
    setNewItem(emptyWorkItem);
    setShowAddItemModal(false);
  };

  const removeWorkItem = (id: string) => {
    const target = surface.workItems.find((row) => row.id === id);
    setSurface((current) => ({
      ...current,
      workItems: current.workItems.filter((row) => row.id !== id),
    }));
    if (target) {
      pushActivity(`Removed work item: ${target.item}`);
    }
  };

  const runQuickAction = (action: string) => {
    pushActivity(`Quick action executed: ${action}`);
  };

  const resetSurface = async () => {
    const response = await fetch(`/api/feature-state/${slug}`, { method: 'DELETE' });
    if (!response.ok) return;
    const payload = (await response.json()) as FeatureSurface;
    setSurface(payload);
    pushActivity('Feature surface reset to suite defaults');
  };

  return (
    <UnifiedShell title={page.title} subtitle={page.subtitle} eyebrow={page.eyebrow}>
      <div className="grid columns-3">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} note={metric.note} />
        ))}
      </div>

      <div style={{ height: 16 }} />

      <div className="grid columns-2">
        <div className="card stack">
          <div className="pill">{page.category}</div>
          <h3>Feature Role</h3>
          <div className="muted">{page.summary}</div>
        </div>

        <div className="card">
          <h3>Core Workloads</h3>
          <ul className="feature-list">
            {page.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      </div>

      {context ? (
        <>
          <div style={{ height: 16 }} />

          <div className="grid columns-2">
            <div className="card">
              <h3>Source Ownership</h3>
              <ul className="feature-list">
                {context.sourceOwners.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h3>Operating Queues</h3>
              <ul className="feature-list">
                {context.operatingQueues.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ height: 16 }} />

          <div className="grid columns-2">
            <div className="card">
              <h3>Primary Outputs</h3>
              <ul className="feature-list">
                {context.outputs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="card stack">
              <h3>Related Operations</h3>
              <div className="inline-links">
                {context.relatedRoutes.map((item) => (
                  <Link key={item.href} href={item.href} className="tag-link">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {showAIWorkbench ? (
        <>
          <div style={{ height: 16 }} />
          <AIWorkbench mode={slug === 'ai-assistant' ? 'assistant' : 'tools'} />
        </>
      ) : null}

      {surface ? (
        <>
          <div style={{ height: 16 }} />

          <div className="card">
            <h3>Active Work Items</h3>
            <div className="toolbar-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items, owner, or next step"
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button className="button subtle" type="button" onClick={resetSurface}>Reset feature</button>
              <span className="save-indicator">{saving ? 'Saving...' : ready ? 'Saved' : 'Loading...'}</span>
              <button
                className="button primary"
                type="button"
                onClick={() => {
                  setNewItem(emptyWorkItem);
                  setShowAddItemModal(true);
                }}
              >
                Add item
              </button>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Next Step</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((row) => (
                    <tr key={row.item}>
                      <td>{row.item}</td>
                      <td>
                        <select value={row.status} onChange={(e) => updateRow(row.id, 'status', e.target.value)}>
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input value={row.owner} onChange={(e) => updateRow(row.id, 'owner', e.target.value)} />
                      </td>
                      <td>
                        <div className="row-action-grid">
                          <input value={row.nextStep} onChange={(e) => updateRow(row.id, 'nextStep', e.target.value)} />
                          <button className="button subtle" type="button" onClick={() => removeWorkItem(row.id)}>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {showAddItemModal ? (
              <div className="record-modal-backdrop" role="presentation" onClick={() => setShowAddItemModal(false)}>
                <div className="record-modal" role="dialog" aria-modal="true" aria-label="Add work item" onClick={(event) => event.stopPropagation()}>
                  <button className="record-modal-close" type="button" aria-label="Close add work item dialog" onClick={() => setShowAddItemModal(false)}>
                    <X size={18} aria-hidden="true" />
                  </button>
                  <div className="record-modal-header">
                    <div>
                      <span className="eyebrow">Add Work Item</span>
                      <h2>{page.title}</h2>
                      <p>Create a work item with status, owner, and next step before it enters the active queue.</p>
                    </div>
                  </div>
                  <div className="record-form-grid">
                    <label className="record-form-field span-2">
                      <span>Item</span>
                      <input
                        value={newItem.item}
                        onChange={(e) => setNewItem((current) => ({ ...current, item: e.target.value }))}
                        placeholder="New work item"
                        autoFocus
                      />
                    </label>
                    <label className="record-form-field">
                      <span>Status</span>
                      <select value={newItem.status} onChange={(e) => setNewItem((current) => ({ ...current, status: e.target.value }))}>
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    <label className="record-form-field">
                      <span>Owner</span>
                      <input
                        value={newItem.owner}
                        onChange={(e) => setNewItem((current) => ({ ...current, owner: e.target.value }))}
                        placeholder="Owner"
                      />
                    </label>
                    <label className="record-form-field span-2">
                      <span>Next Step</span>
                      <input
                        value={newItem.nextStep}
                        onChange={(e) => setNewItem((current) => ({ ...current, nextStep: e.target.value }))}
                        placeholder="Next step"
                      />
                    </label>
                  </div>
                  <div className="record-modal-actions">
                    <button className="button secondary" type="button" onClick={() => setShowAddItemModal(false)}>Cancel</button>
                    <button className="button primary" onClick={addWorkItem} type="button" disabled={!newItem.item.trim()}>Save item</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ height: 16 }} />

          <div className="grid columns-2">
            <div className="card">
              <h3>Quick Actions</h3>
              <div className="inline-links">
                {surface.quickActions.map((item) => (
                  <button key={item} className="tag-link" type="button" onClick={() => runQuickAction(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h3>Control Checks</h3>
              <ul className="feature-list">
                {surface.controlChecks.map((item) => (
                  <li key={item.id}>
                    <label className="check-row">
                      <input type="checkbox" checked={item.done} onChange={() => toggleCheck(item.id)} />
                      <span>{item.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ height: 16 }} />

          <div className="card">
            <h3>Recent Activity</h3>
            <div className="activity-log">
              {surface.activityLog.map((item) => (
                <div key={item.id} className="activity-row">
                  <div className="muted" style={{ fontSize: 12 }}>{item.at}</div>
                  <div>{item.message}</div>
                </div>
              ))}
            </div>
          </div>

          {entitySeed ? (
            <>
              <div style={{ height: 16 }} />
              <EntityWorkspace slug={slug} seed={entitySeed} />
            </>
          ) : null}

          {slug === 'documents' ? (
            <>
              <div style={{ height: 16 }} />
              <DocumentsWorkspace />
            </>
          ) : null}
        </>
      ) : null}
    </UnifiedShell>
  );
}
