'use client';

import Link from 'next/link';
import { type MouseEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  redactMemberId,
  type ComplianceControl,
  type EvidenceStatus,
  type PriorAuthCase,
  type PriorAuthEvidence,
  type PriorAuthHistory,
  type PriorAuthStatus,
  type PriorAuthWorkspacePayload,
  type SubmissionChannel,
} from '@/lib/priorAuth';
import { rolePermissions } from '@/lib/auth';
import { priorAuthFeatureMap, type PriorAuthFeature, type PriorAuthSubFeature } from '@/lib/priorAuthNavigation';

const STATUSES: PriorAuthStatus[] = [
  'Intake',
  'Rule Match',
  'Evidence Review',
  'Packet Ready',
  'Submitted',
  'Payer Review',
  'Approved',
  'Denied',
  'Appeal Draft',
  'Appeal Submitted',
];

const EVIDENCE_STATUSES: EvidenceStatus[] = ['Satisfied', 'Missing', 'Needs review', 'Waived'];

type Props = {
  focus?: string;
  featureSlug?: string;
  subfeatureSlug?: string;
};

type ModalKind = 'case' | 'evidence' | 'history' | 'integration' | 'compliance';
type ModalMode = 'view' | 'edit' | 'new';
type RowModal = {
  mode: ModalMode;
  kind: ModalKind;
  title: string;
  data: unknown;
  caseId?: string;
  rowId?: string;
};
type ViewOptions = Partial<Pick<RowModal, 'kind' | 'caseId' | 'rowId'>>;
type SubfeatureRow = {
  id: string;
  title: string;
  data: unknown;
  options?: ViewOptions;
  cells: ReactNode[];
};
type SubfeatureTable = {
  columns: string[];
  rows: SubfeatureRow[];
  newKind: ModalKind | 'analytics';
};

function statusRank(status: PriorAuthStatus, timeline: PriorAuthStatus[]) {
  const index = timeline.indexOf(status);
  if (status === 'Denied') return timeline.indexOf('Denied');
  return index < 0 ? 0 : index;
}

function percentage(value: number) {
  return String(Math.round(value)) + '%';
}

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function humanizeKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isSimpleValue(value: unknown) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function renderScalar(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') return <span className="detail-empty">Not set</span>;
  if (typeof value === 'boolean') return <span className="status-chip">{value ? 'Yes' : 'No'}</span>;
  return String(value);
}

function DetailValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    if (!value.length) return <span className="detail-empty">None</span>;
    if (value.every(isSimpleValue)) {
      return (
        <div className="detail-chip-list">
          {value.map((item, index) => <span key={String(item) + index}>{renderScalar(item)}</span>)}
        </div>
      );
    }
    return (
      <div className="detail-nested-list">
        {value.map((item, index) => (
          <div className="detail-nested-item" key={index}>
            <div className="detail-nested-title">Item {index + 1}</div>
            <DetailValue value={item} />
          </div>
        ))}
      </div>
    );
  }

  if (isRecord(value)) {
    return (
      <div className="detail-object-grid">
        {Object.entries(value).map(([key, item]) => (
          <div className="detail-field" key={key}>
            <span>{humanizeKey(key)}</span>
            <div><DetailValue value={item} /></div>
          </div>
        ))}
      </div>
    );
  }

  return <>{renderScalar(value)}</>;
}

function DetailFields({ data }: { data: unknown }) {
  const entries = isRecord(data) ? Object.entries(data) : [['Value', data] as [string, unknown]];
  return (
    <div className="detail-field-grid">
      {entries.map(([key, value]) => (
        <section className="detail-field" key={key}>
          <span>{humanizeKey(key)}</span>
          <div><DetailValue value={value} /></div>
        </section>
      ))}
    </div>
  );
}

function newHistory(actor: string, event: string, note: string): PriorAuthHistory {
  return {
    id: 'hist-' + Date.now(),
    at: new Date().toLocaleString(),
    actor,
    event,
    note,
  };
}

function buildBlankCase(existingCount: number): PriorAuthCase {
  const sequence = 2000 + existingCount + 1;
  return {
    id: 'pa-new-' + Date.now(),
    caseNumber: 'PA-2026-' + sequence,
    patient: { id: 'pat-new-' + sequence, name: 'New Patient', dateOfBirth: '1980-01-01', memberId: 'NEW-' + sequence },
    provider: { name: 'New Provider', npi: '0000000000', specialty: 'Specialty', facility: 'Facility' },
    payer: { name: 'UnitedHealthcare', plan: 'Choice Plus', policyId: 'uhc-mri-spine-2026', portal: 'UHC Provider Portal' },
    service: {
      name: 'New prior authorization request',
      type: 'Imaging',
      urgency: 'Standard',
      cptCodes: ['00000'],
      hcpcsCodes: [],
      icd10Codes: ['Z00.00'],
      placeOfService: 'Outpatient',
      requestedDate: new Date().toISOString().slice(0, 10),
      targetDecisionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
    status: 'Intake',
    assignedTo: 'Intake Lead',
    documents: [],
    evidence: [],
    history: [newHistory('System', 'Case created', 'New case entry drafted from table action.')],
  };
}

function buildBlankEvidence(): PriorAuthEvidence {
  return {
    id: 'ev-' + Date.now(),
    label: 'New evidence item',
    category: 'Clinical',
    status: 'Needs review',
    source: 'Manual entry',
    required: true,
  };
}

function buildBlankIntegration(index: number): SubmissionChannel {
  return {
    id: 'custom-integration-' + Date.now(),
    name: 'New submission connector',
    type: 'Payer portal',
    status: 'Stubbed',
    lastSync: 'Not connected',
    nextAction: 'Configure connector workflow ' + String(index + 1) + '.',
  };
}

function buildBlankCompliance(index: number): ComplianceControl {
  return {
    id: 'custom-compliance-' + Date.now(),
    label: 'New compliance control',
    status: 'Needs setup',
    detail: 'Document control owner, validation evidence, and environment scope ' + String(index + 1) + '.',
  };
}

export default function PriorAuthWorkspace({ focus = 'all', featureSlug, subfeatureSlug }: Props) {
  const { user } = useAuth();
  const permissions = rolePermissions[user?.role || 'analyst'];
  const canManage = permissions.canManageDocuments;
  const [payload, setPayload] = useState<PriorAuthWorkspacePayload | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [caseStatus, setCaseStatus] = useState('All');
  const [modal, setModal] = useState<RowModal | null>(null);
  const [modalJson, setModalJson] = useState('');
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetch('/api/prior-auth/cases', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: PriorAuthWorkspacePayload | null) => {
        if (!active) return;
        if (!data) {
          setStatus('error');
          return;
        }
        setPayload(data);
        setSelectedId((current) => current || data.cases[0]?.id || '');
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const selected = useMemo(() => payload?.cases.find((item) => item.id === selectedId) || payload?.cases[0] || null, [payload, selectedId]);
  const derived = selected && payload ? payload.derived[selected.id] : null;
  const filteredCases = useMemo(() => {
    if (!payload) return [];
    return payload.cases.filter((item) => {
      const text = [
        item.caseNumber,
        item.patient.name,
        item.provider.name,
        item.payer.name,
        item.service.name,
        item.service.cptCodes.join(' '),
        item.service.hcpcsCodes.join(' '),
        item.service.icd10Codes.join(' '),
      ].join(' ').toLowerCase();
      return (caseStatus === 'All' || item.status === caseStatus) && (!query || text.includes(query.toLowerCase()));
    });
  }, [caseStatus, payload, query]);
  const ruleRows = useMemo(() => {
    if (!payload) return [];
    return payload.cases.map((item) => ({ authCase: item, derived: payload.derived[item.id] }));
  }, [payload]);
  const evidenceRows = useMemo(() => {
    if (!payload) return [];
    return payload.cases.flatMap((item) =>
      item.evidence.map((evidence) => ({ authCase: item, evidence, derived: payload.derived[item.id] })),
    );
  }, [payload]);
  const packetRows = ruleRows;
  const timelineRows = useMemo(() => {
    if (!payload) return [];
    return payload.cases.flatMap((item) =>
      payload.timelineSteps.map((step, index) => {
        const rank = statusRank(item.status, payload.timelineSteps);
        const complete = index <= rank && item.status !== 'Denied';
        const active = item.status === step || (item.status === 'Denied' && step === 'Denied');
        return {
          authCase: item,
          step,
          position: index + 1,
          state: active ? 'Current' : complete ? 'Complete' : 'Pending',
        };
      }),
    );
  }, [payload]);
  const submissionRows = useMemo(() => {
    if (!payload) return [];
    const channels: SubmissionChannel[] = payload.integrations.length
      ? payload.integrations
      : [{
          id: 'no-integration-configured',
          name: 'No connector configured',
          type: 'Email',
          status: 'Stubbed',
          lastSync: 'Not connected',
          nextAction: 'Add a submission connector.',
        }];
    return payload.cases.map((item, index) => ({
      authCase: item,
      channel: channels[index % channels.length],
      derived: payload.derived[item.id],
    }));
  }, [payload]);
  const appealRows = ruleRows;
  const slaRows = ruleRows;
  const missingEvidenceRows = evidenceRows.filter(({ evidence }) => evidence.status === 'Missing' || evidence.status === 'Needs review');
  const historyRows = useMemo(() => {
    if (!payload) return [];
    return payload.cases.flatMap((item) => item.history.map((history) => ({ authCase: item, history })));
  }, [payload]);

  async function persistCase(nextCase: PriorAuthCase) {
    if (!payload || !canManage) return;
    setStatus('saving');
    const response = await fetch('/api/prior-auth/cases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case: nextCase }),
    });
    if (!response.ok) {
      setStatus('error');
      return;
    }
    const nextPayload = (await response.json()) as PriorAuthWorkspacePayload;
    setPayload(nextPayload);
    setSelectedId(nextCase.id);
    setStatus('ready');
  }

  async function persistCases(nextCases: PriorAuthCase[], nextSelectedId?: string) {
    if (!payload || !canManage) return;
    setStatus('saving');
    const response = await fetch('/api/prior-auth/cases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cases: nextCases }),
    });
    if (!response.ok) {
      setStatus('error');
      return;
    }
    const nextPayload = (await response.json()) as PriorAuthWorkspacePayload;
    setPayload(nextPayload);
    setSelectedId(nextSelectedId || nextPayload.cases[0]?.id || '');
    setStatus('ready');
  }

  function withHistory(authCase: PriorAuthCase, event: string, note: string): PriorAuthCase {
    return {
      ...authCase,
      history: [
        {
          id: 'hist-' + Date.now(),
          at: new Date().toLocaleString(),
          actor: user ? (user.firstName + ' ' + user.lastName).trim() || user.email : 'System',
          event,
          note,
        },
        ...authCase.history,
      ],
    };
  }

  function actorName() {
    return user ? (user.firstName + ' ' + user.lastName).trim() || user.email : 'System';
  }

  function openModal(nextModal: RowModal) {
    setModal(nextModal);
    setModalJson(pretty(nextModal.data));
    setModalError('');
  }

  function viewRow(title: string, data: unknown, options: ViewOptions = {}) {
    openModal({ mode: 'view', kind: options.kind || 'case', title, data, caseId: options.caseId, rowId: options.rowId });
  }

  function openRowDetails(event: MouseEvent<HTMLTableRowElement>, title: string, data: unknown, options: ViewOptions = {}) {
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, .table-actions')) return;
    viewRow(title, data, options);
  }

  function contextCanEdit(options: ViewOptions) {
    if (!payload || !canManage || !options.kind) return false;
    if (options.kind === 'case') return Boolean(options.caseId && payload.cases.some((item) => item.id === options.caseId));
    if (options.kind === 'evidence') return Boolean(options.caseId && options.rowId && payload.cases.some((item) => item.id === options.caseId && item.evidence.some((row) => row.id === options.rowId)));
    if (options.kind === 'history') return Boolean(options.caseId && options.rowId && payload.cases.some((item) => item.id === options.caseId && item.history.some((row) => row.id === options.rowId)));
    if (options.kind === 'integration') return Boolean(options.rowId && payload.integrations.some((item) => item.id === options.rowId));
    if (options.kind === 'compliance') return Boolean(options.rowId && payload.compliance.some((item) => item.id === options.rowId));
    return false;
  }

  function modalCanEdit() {
    if (!modal || modal.mode !== 'view') return false;
    return contextCanEdit({ kind: modal.kind, caseId: modal.caseId, rowId: modal.rowId });
  }

  function editContextEntry(title: string, options: ViewOptions) {
    if (!payload || !options.kind) return;
    if (options.kind === 'case' && options.caseId) {
      const authCase = payload.cases.find((item) => item.id === options.caseId);
      if (authCase) editCase(authCase, title);
    }
    if (options.kind === 'evidence' && options.caseId && options.rowId) {
      const authCase = payload.cases.find((item) => item.id === options.caseId);
      const evidence = authCase?.evidence.find((item) => item.id === options.rowId);
      if (authCase && evidence) editEvidence(authCase.id, evidence);
    }
    if (options.kind === 'history' && options.caseId && options.rowId) {
      const authCase = payload.cases.find((item) => item.id === options.caseId);
      const history = authCase?.history.find((item) => item.id === options.rowId);
      if (authCase && history) editHistory(authCase.id, history);
    }
    if (options.kind === 'integration' && options.rowId) {
      const channel = payload.integrations.find((item) => item.id === options.rowId);
      if (channel) editIntegration(channel);
    }
    if (options.kind === 'compliance' && options.rowId) {
      const control = payload.compliance.find((item) => item.id === options.rowId);
      if (control) editCompliance(control);
    }
  }

  function editModalEntry() {
    if (!modal) return;
    editContextEntry(modal.title, { kind: modal.kind, caseId: modal.caseId, rowId: modal.rowId });
  }

  async function deleteContextEntry(options: ViewOptions) {
    if (!canManage || !options.kind) return;
    if (options.kind === 'case' && options.caseId) await deleteCase(options.caseId);
    if (options.kind === 'evidence' && options.caseId && options.rowId) await deleteEvidence(options.caseId, options.rowId);
    if (options.kind === 'history' && options.caseId && options.rowId) await deleteHistory(options.caseId, options.rowId);
    if (options.kind === 'integration' && options.rowId) deleteIntegration(options.rowId);
    if (options.kind === 'compliance' && options.rowId) deleteCompliance(options.rowId);
  }

  async function deleteModalEntry() {
    if (!modal) return;
    await deleteContextEntry({ kind: modal.kind, caseId: modal.caseId, rowId: modal.rowId });
    setModal(null);
  }

  function editCase(authCase: PriorAuthCase, title = 'Edit Case') {
    openModal({ mode: 'edit', kind: 'case', title: title + ': ' + authCase.caseNumber, data: authCase, caseId: authCase.id });
  }

  function newCase(title = 'New Case') {
    const draft = buildBlankCase(payload?.cases.length || 0);
    openModal({ mode: 'new', kind: 'case', title, data: draft });
  }

  function editEvidence(caseId: string, evidence: PriorAuthEvidence) {
    openModal({ mode: 'edit', kind: 'evidence', title: 'Edit Evidence: ' + evidence.label, data: evidence, caseId, rowId: evidence.id });
  }

  function newEvidence(caseId = selected?.id || '') {
    openModal({ mode: 'new', kind: 'evidence', title: 'New Evidence', data: buildBlankEvidence(), caseId });
  }

  function editHistory(caseId: string, history: PriorAuthHistory) {
    openModal({ mode: 'edit', kind: 'history', title: 'Edit History: ' + history.event, data: history, caseId, rowId: history.id });
  }

  function newHistoryEntry(caseId = selected?.id || '') {
    openModal({ mode: 'new', kind: 'history', title: 'New History Entry', data: newHistory(actorName(), 'Manual update', 'Document the operational update.'), caseId });
  }

  function editIntegration(channel: SubmissionChannel) {
    openModal({ mode: 'edit', kind: 'integration', title: 'Edit Integration: ' + channel.name, data: channel, rowId: channel.id });
  }

  function newIntegration() {
    openModal({ mode: 'new', kind: 'integration', title: 'New Integration', data: buildBlankIntegration(payload?.integrations.length || 0) });
  }

  function editCompliance(control: ComplianceControl) {
    openModal({ mode: 'edit', kind: 'compliance', title: 'Edit Compliance: ' + control.label, data: control, rowId: control.id });
  }

  function newCompliance() {
    openModal({ mode: 'new', kind: 'compliance', title: 'New Compliance Control', data: buildBlankCompliance(payload?.compliance.length || 0) });
  }

  async function deleteCase(caseId: string) {
    if (!payload || !canManage) return;
    const nextCases = payload.cases.filter((item) => item.id !== caseId);
    await persistCases(nextCases, selectedId === caseId ? nextCases[0]?.id : selectedId);
  }

  async function deleteEvidence(caseId: string, evidenceId: string) {
    if (!payload || !canManage) return;
    const authCase = payload.cases.find((item) => item.id === caseId);
    if (!authCase) return;
    await persistCase(
      withHistory(
        { ...authCase, evidence: authCase.evidence.filter((item) => item.id !== evidenceId) },
        'Evidence deleted',
        'Evidence row removed from case.',
      ),
    );
  }

  async function deleteHistory(caseId: string, historyId: string) {
    if (!payload || !canManage) return;
    const authCase = payload.cases.find((item) => item.id === caseId);
    if (!authCase) return;
    await persistCase({ ...authCase, history: authCase.history.filter((item) => item.id !== historyId) });
  }

  function deleteIntegration(channelId: string) {
    if (!payload || !canManage) return;
    setPayload({ ...payload, integrations: payload.integrations.filter((item) => item.id !== channelId) });
  }

  function deleteCompliance(controlId: string) {
    if (!payload || !canManage) return;
    setPayload({ ...payload, compliance: payload.compliance.filter((item) => item.id !== controlId) });
  }

  async function saveModal() {
    if (!modal || modal.mode === 'view') return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(modalJson);
    } catch {
      setModalError('JSON is invalid.');
      return;
    }
    if (!payload) return;

    if (modal.kind === 'case') {
      const nextCase = parsed as PriorAuthCase;
      if (modal.mode === 'new') {
        await persistCases([nextCase, ...payload.cases], nextCase.id);
      } else {
        await persistCase(withHistory(nextCase, 'Case edited', 'Case fields updated from table action.'));
      }
    }

    if (modal.kind === 'evidence' && modal.caseId) {
      const nextEvidence = parsed as PriorAuthEvidence;
      const authCase = payload.cases.find((item) => item.id === modal.caseId);
      if (!authCase) return;
      const exists = authCase.evidence.some((item) => item.id === nextEvidence.id);
      await persistCase(
        withHistory(
          {
            ...authCase,
            evidence: exists
              ? authCase.evidence.map((item) => (item.id === nextEvidence.id ? nextEvidence : item))
              : [nextEvidence, ...authCase.evidence],
          },
          modal.mode === 'new' ? 'Evidence added' : 'Evidence edited',
          nextEvidence.label + ' updated from table action.',
        ),
      );
    }

    if (modal.kind === 'history' && modal.caseId) {
      const nextHistory = parsed as PriorAuthHistory;
      const authCase = payload.cases.find((item) => item.id === modal.caseId);
      if (!authCase) return;
      const exists = authCase.history.some((item) => item.id === nextHistory.id);
      await persistCase({
        ...authCase,
        history: exists
          ? authCase.history.map((item) => (item.id === nextHistory.id ? nextHistory : item))
          : [nextHistory, ...authCase.history],
      });
    }

    if (modal.kind === 'integration') {
      const nextIntegration = parsed as SubmissionChannel;
      const exists = payload.integrations.some((item) => item.id === nextIntegration.id);
      setPayload({
        ...payload,
        integrations: exists
          ? payload.integrations.map((item) => (item.id === nextIntegration.id ? nextIntegration : item))
          : [nextIntegration, ...payload.integrations],
      });
    }

    if (modal.kind === 'compliance') {
      const nextControl = parsed as ComplianceControl;
      const exists = payload.compliance.some((item) => item.id === nextControl.id);
      setPayload({
        ...payload,
        compliance: exists
          ? payload.compliance.map((item) => (item.id === nextControl.id ? nextControl : item))
          : [nextControl, ...payload.compliance],
      });
    }

    setModal(null);
    setModalError('');
  }

  function editableModalData() {
    try {
      return JSON.parse(modalJson) as unknown;
    } catch {
      return null;
    }
  }

  function updateModalField(path: Array<string | number>, nextValue: unknown) {
    let draft: unknown;
    try {
      draft = JSON.parse(modalJson);
    } catch {
      return;
    }
    let target = draft as Record<string, unknown> | unknown[];
    path.slice(0, -1).forEach((part) => {
      target = (target as Record<string, unknown> | unknown[])[part as never] as Record<string, unknown> | unknown[];
    });
    const finalKey = path[path.length - 1];
    (target as Record<string, unknown> | unknown[])[finalKey as never] = nextValue as never;
    setModalJson(pretty(draft));
    setModalError('');
  }

  function EditableFields({ data, path = [] }: { data: unknown; path?: Array<string | number> }) {
    if (Array.isArray(data)) {
      if (!data.length || data.every(isSimpleValue)) {
        const original = data;
        return (
          <label className="edit-field">
            <span>{path.length ? humanizeKey(String(path[path.length - 1])) : 'Values'}</span>
            <input
              value={original.map((item) => String(item ?? '')).join(', ')}
              onChange={(event) => {
                const parts = event.target.value.split(',').map((item) => item.trim()).filter(Boolean);
                const nextValues = original.every((item) => typeof item === 'number')
                  ? parts.map((item) => Number(item))
                  : parts;
                updateModalField(path, nextValues);
              }}
              disabled={!canManage}
            />
          </label>
        );
      }
      return (
        <div className="edit-nested-list">
          {data.map((item, index) => (
            <div className="edit-nested-item" key={index}>
              <div className="detail-nested-title">Item {index + 1}</div>
              <EditableFields data={item} path={[...path, index]} />
            </div>
          ))}
        </div>
      );
    }

    if (isRecord(data)) {
      return (
        <div className="structured-editor-grid">
          {Object.entries(data).map(([key, value]) => (
            <EditableFields key={key} data={value} path={[...path, key]} />
          ))}
        </div>
      );
    }

    const label = path.length ? humanizeKey(String(path[path.length - 1])) : 'Value';
    if (typeof data === 'boolean') {
      return (
        <label className="edit-field">
          <span>{label}</span>
          <select value={data ? 'true' : 'false'} onChange={(event) => updateModalField(path, event.target.value === 'true')} disabled={!canManage}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
      );
    }
    if (typeof data === 'number') {
      return (
        <label className="edit-field">
          <span>{label}</span>
          <input type="number" value={data} onChange={(event) => updateModalField(path, Number(event.target.value))} disabled={!canManage} />
        </label>
      );
    }
    const textValue = data === null || data === undefined ? '' : String(data);
    const multiline = textValue.length > 80 || ['note', 'detail', 'nextAction', 'letterDraft', 'coverLetterDraft'].some((key) => label.toLowerCase().includes(key.toLowerCase()));
    return (
      <label className="edit-field">
        <span>{label}</span>
        {multiline ? (
          <textarea value={textValue} onChange={(event) => updateModalField(path, event.target.value)} rows={3} disabled={!canManage} />
        ) : (
          <input value={textValue} onChange={(event) => updateModalField(path, event.target.value)} disabled={!canManage} />
        )}
      </label>
    );
  }

  function contextActionButtons(row: SubfeatureRow) {
    const options = row.options || {};
    const editable = contextCanEdit(options);
    return (
      <div className="table-actions">
        <button className="button subtle" type="button" onClick={() => viewRow(row.title, row.data, options)}>View</button>
        <button className="button subtle" type="button" onClick={() => editContextEntry(row.title, options)} disabled={!editable}>Edit</button>
        <button className="button subtle danger" type="button" onClick={() => deleteContextEntry(options)} disabled={!editable}>Delete</button>
      </div>
    );
  }

  function newEntryForKind(kind: SubfeatureTable['newKind']) {
    if (kind === 'case') newCase('New Authorization Case');
    if (kind === 'evidence') newEvidence();
    if (kind === 'history') newHistoryEntry();
    if (kind === 'integration') newIntegration();
    if (kind === 'compliance') newCompliance();
    if (kind === 'analytics') newCase('New Analytics Case');
  }

  function rowForCase(authCase: PriorAuthCase, title: string, data: unknown, cells: ReactNode[]): SubfeatureRow {
    return { id: title + authCase.id, title: title + ': ' + authCase.caseNumber, data, options: { kind: 'case', caseId: authCase.id }, cells };
  }

  function buildSubfeatureTable(subfeature: PriorAuthSubFeature): SubfeatureTable {
    const payloadRef = payload;
    if (!payloadRef) {
      return { columns: ['Item'], rows: [], newKind: 'case' };
    }
    const caseRows = payloadRef.cases;
    const ruleTable = (columns: string[], mapper: (authCase: PriorAuthCase) => ReactNode[]) => ({
      columns,
      rows: caseRows.map((authCase) => rowForCase(authCase, subfeature.title, { case: authCase, rule: payloadRef.derived[authCase.id].rule }, mapper(authCase))),
      newKind: 'case' as const,
    });
    const packetTable = (columns: string[], mapper: (authCase: PriorAuthCase) => ReactNode[]) => ({
      columns,
      rows: caseRows.map((authCase) => rowForCase(authCase, subfeature.title, { case: authCase, packet: payloadRef.derived[authCase.id].packet }, mapper(authCase))),
      newKind: 'case' as const,
    });
    const appealTable = (columns: string[], mapper: (authCase: PriorAuthCase) => ReactNode[]) => ({
      columns,
      rows: caseRows.map((authCase) => rowForCase(authCase, subfeature.title, { case: authCase, appeal: payloadRef.derived[authCase.id].appeal }, mapper(authCase))),
      newKind: 'case' as const,
    });
    const slaTable = (columns: string[], mapper: (authCase: PriorAuthCase) => ReactNode[]) => ({
      columns,
      rows: caseRows.map((authCase) => rowForCase(authCase, subfeature.title, { case: authCase, sla: payloadRef.derived[authCase.id].sla }, mapper(authCase))),
      newKind: 'case' as const,
    });
    const evidenceSource = subfeature.slug === 'missing-evidence'
      ? missingEvidenceRows
      : subfeature.slug === 'clinical-notes'
        ? evidenceRows.filter(({ evidence }) => /note|clinical|diagnosis/i.test(evidence.label + ' ' + evidence.category))
        : subfeature.slug === 'labs-imaging'
          ? evidenceRows.filter(({ evidence }) => /lab|imaging|x-ray|mri|ct|result/i.test(evidence.label + ' ' + evidence.category))
          : subfeature.slug === 'medication-therapy-history'
            ? evidenceRows.filter(({ evidence }) => /medication|therapy|conservative|prior/i.test(evidence.label + ' ' + evidence.category))
            : evidenceRows;

    if (subfeature.slug === 'case-queue') {
      return {
        columns: ['Case', 'Patient', 'Payer', 'Service', 'Status', 'Owner'],
        rows: caseRows.map((authCase) => rowForCase(authCase, subfeature.title, authCase, [
          authCase.caseNumber,
          authCase.patient.name,
          authCase.payer.name,
          authCase.service.name,
          <span className="status-chip" key="status">{authCase.status}</span>,
          authCase.assignedTo,
        ])),
        newKind: 'case',
      };
    }
    if (subfeature.slug === 'patient-provider') {
      return {
        columns: ['Case', 'Patient', 'Member', 'Provider', 'Specialty', 'Facility'],
        rows: caseRows.map((authCase) => rowForCase(authCase, subfeature.title, { patient: authCase.patient, provider: authCase.provider }, [
          authCase.caseNumber,
          authCase.patient.name,
          redactMemberId(authCase.patient.memberId),
          authCase.provider.name,
          authCase.provider.specialty,
          authCase.provider.facility,
        ])),
        newKind: 'case',
      };
    }
    if (subfeature.slug === 'payer-plan') {
      return {
        columns: ['Case', 'Payer', 'Plan', 'Policy', 'Portal', 'Status'],
        rows: caseRows.map((authCase) => rowForCase(authCase, subfeature.title, { payer: authCase.payer }, [
          authCase.caseNumber,
          authCase.payer.name,
          authCase.payer.plan,
          authCase.payer.policyId,
          authCase.payer.portal,
          authCase.status,
        ])),
        newKind: 'case',
      };
    }
    if (subfeature.slug === 'codes-service') {
      return {
        columns: ['Case', 'Service', 'Type', 'Urgency', 'Procedure Codes', 'ICD-10'],
        rows: caseRows.map((authCase) => rowForCase(authCase, subfeature.title, { service: authCase.service }, [
          authCase.caseNumber,
          authCase.service.name,
          authCase.service.type,
          authCase.service.urgency,
          [...authCase.service.cptCodes, ...authCase.service.hcpcsCodes].join(', ') || 'None',
          authCase.service.icd10Codes.join(', '),
        ])),
        newKind: 'case',
      };
    }
    if (subfeature.slug === 'documents') {
      return {
        columns: ['Case', 'Document', 'Type', 'Status'],
        rows: caseRows.flatMap((authCase) => authCase.documents.map((document) => rowForCase(authCase, subfeature.title, { caseNumber: authCase.caseNumber, document }, [
          authCase.caseNumber,
          document.name,
          document.type,
          <span className="status-chip" key="status">{document.status}</span>,
        ]))),
        newKind: 'case',
      };
    }
    if (subfeature.slug === 'case-history' || subfeature.slug === 'status-changes') {
      return {
        columns: ['Case', 'At', 'Actor', 'Event', 'Note'],
        rows: historyRows.map(({ authCase, history }) => ({
          id: authCase.id + history.id,
          title: subfeature.title + ': ' + history.event,
          data: { caseNumber: authCase.caseNumber, history },
          options: { kind: 'history', caseId: authCase.id, rowId: history.id },
          cells: [authCase.caseNumber, history.at, history.actor, history.event, history.note],
        })),
        newKind: 'history',
      };
    }
    if (['lifecycle-progress', 'stage-activity'].includes(subfeature.slug)) {
      return {
        columns: ['Case', 'Step', 'Stage', 'State', 'Current Status'],
        rows: timelineRows.map((row) => rowForCase(row.authCase, subfeature.title, row, [
          row.authCase.caseNumber,
          row.position,
          row.step,
          <span className="status-chip" key="state">{row.state}</span>,
          row.authCase.status,
        ])),
        newKind: 'case',
      };
    }
    if (subfeature.slug === 'next-actions') {
      return slaTable(['Case', 'Status', 'Due Date', 'Escalation', 'Next Action'], (authCase) => {
        const sla = payloadRef.derived[authCase.id].sla;
        return [authCase.caseNumber, authCase.status, sla.dueDate, sla.escalationLevel, sla.triggers[0] || 'Continue payer follow-up.'];
      });
    }
    if (['policy-matching', 'rule-confidence'].includes(subfeature.slug)) {
      return ruleTable(['Case', 'Payer', 'Policy', 'Fit', 'Confidence', 'Missing Evidence'], (authCase) => {
        const rule = payloadRef.derived[authCase.id].rule;
        return [authCase.caseNumber, authCase.payer.name, rule.policy.id, <span className="status-chip" key="fit">{rule.fit}</span>, rule.confidence + '%', rule.missingEvidence.join(', ') || 'None'];
      });
    }
    if (subfeature.slug === 'required-criteria') {
      return ruleTable(['Case', 'Policy', 'Matched Criteria', 'Required Evidence', 'Missing'], (authCase) => {
        const rule = payloadRef.derived[authCase.id].rule;
        return [authCase.caseNumber, rule.policy.id, rule.matchedCriteria.join(', ') || 'None', rule.policy.requiredEvidence.join(', '), rule.missingEvidence.join(', ') || 'None'];
      });
    }
    if (subfeature.slug === 'prior-therapy-checks') {
      return ruleTable(['Case', 'Policy', 'Required Prior Therapy', 'Gaps', 'Fit'], (authCase) => {
        const rule = payloadRef.derived[authCase.id].rule;
        return [authCase.caseNumber, rule.policy.id, rule.policy.priorTherapyRequired.join(', ') || 'None', rule.priorTherapyGaps.join(', ') || 'None', rule.fit];
      });
    }
    if (subfeature.slug === 'contraindications') {
      return ruleTable(['Case', 'Policy', 'Contraindications', 'Flags', 'Fit'], (authCase) => {
        const rule = payloadRef.derived[authCase.id].rule;
        return [authCase.caseNumber, rule.policy.id, rule.policy.contraindications.join(', ') || 'None', rule.contraindicationFlags.join(', ') || 'None', rule.fit];
      });
    }
    if (['missing-evidence', 'evidence-checklist', 'clinical-notes', 'labs-imaging', 'medication-therapy-history'].includes(subfeature.slug)) {
      return {
        columns: ['Case', 'Evidence', 'Category', 'Source', 'Required', 'Status'],
        rows: evidenceSource.map(({ authCase, evidence }) => ({
          id: authCase.id + evidence.id,
          title: subfeature.title + ': ' + evidence.label,
          data: { caseNumber: authCase.caseNumber, evidence },
          options: { kind: 'evidence', caseId: authCase.id, rowId: evidence.id },
          cells: [authCase.caseNumber, evidence.label, evidence.category, evidence.source, evidence.required ? 'Yes' : 'No', <span className="status-chip" key="status">{evidence.status}</span>],
        })),
        newKind: 'evidence',
      };
    }
    if (subfeature.slug === 'packet-readiness' || subfeature.slug === 'submission-bundle') {
      return packetTable(['Case', 'Service', 'Readiness', 'Status', 'Attached Docs', 'Failed Checks'], (authCase) => {
        const packet = payloadRef.derived[authCase.id].packet;
        return [authCase.caseNumber, authCase.service.name, packet.readiness + '%', <span className="status-chip" key="status">{packet.status}</span>, packet.attachedDocuments.length, packet.validationChecks.filter((check) => !check.passed).map((check) => check.label).join(', ') || 'None'];
      });
    }
    if (subfeature.slug === 'cover-letter') {
      return packetTable(['Case', 'Service', 'Readiness', 'Cover Letter Draft'], (authCase) => {
        const packet = payloadRef.derived[authCase.id].packet;
        return [authCase.caseNumber, authCase.service.name, packet.readiness + '%', packet.coverLetterDraft];
      });
    }
    if (subfeature.slug === 'attached-evidence') {
      return packetTable(['Case', 'Attached Documents', 'Required Forms', 'Readiness'], (authCase) => {
        const packet = payloadRef.derived[authCase.id].packet;
        return [authCase.caseNumber, packet.attachedDocuments.map((item) => item.name).join(', ') || 'None', packet.requiredForms.map((item) => item.name + ': ' + item.status).join(', '), packet.readiness + '%'];
      });
    }
    if (subfeature.slug === 'form-validation') {
      return packetTable(['Case', 'Validation Checks', 'Failed Checks', 'Status'], (authCase) => {
        const packet = payloadRef.derived[authCase.id].packet;
        return [authCase.caseNumber, packet.validationChecks.map((item) => item.label).join(', '), packet.validationChecks.filter((item) => !item.passed).map((item) => item.label).join(', ') || 'None', packet.status];
      });
    }
    if (subfeature.slug === 'submission-queue') {
      return {
        columns: ['Case', 'Submission Status', 'Connector', 'Type', 'Connector Status', 'Next Action'],
        rows: submissionRows.map(({ authCase, channel }) => ({
          id: authCase.id + channel.id,
          title: subfeature.title + ': ' + authCase.caseNumber,
          data: { case: authCase, channel },
          options: { kind: 'integration', rowId: channel.id },
          cells: [authCase.caseNumber, authCase.status, channel.name, channel.type, <span className="status-chip" key="status">{channel.status}</span>, channel.nextAction],
        })),
        newKind: 'integration',
      };
    }
    if (['connector-status', 'status-polling', 'fax-email-sftp', 'ehr-fhir'].includes(subfeature.slug)) {
      const channels = subfeature.slug === 'fax-email-sftp'
        ? payloadRef.integrations.filter((item) => ['Fax', 'Email', 'SFTP'].includes(item.type))
        : subfeature.slug === 'ehr-fhir'
          ? payloadRef.integrations.filter((item) => item.type === 'EHR/FHIR')
          : payloadRef.integrations;
      return {
        columns: ['Connector', 'Type', 'Status', 'Last Sync', 'Next Action'],
        rows: channels.map((channel) => ({
          id: channel.id,
          title: subfeature.title + ': ' + channel.name,
          data: channel,
          options: { kind: 'integration', rowId: channel.id },
          cells: [channel.name, channel.type, <span className="status-chip" key="status">{channel.status}</span>, channel.lastSync, channel.nextAction],
        })),
        newKind: 'integration',
      };
    }
    if (['denials', 'appeal-deadlines', 'appeal-drafts', 'reviewer-assignment', 'resubmissions'].includes(subfeature.slug)) {
      return appealTable(['Case', 'Needed', 'Denial Class', 'Deadline', 'Reviewer', 'Resubmission'], (authCase) => {
        const appeal = payloadRef.derived[authCase.id].appeal;
        return [authCase.caseNumber, appeal.needed ? 'Yes' : 'No', appeal.denialClass, appeal.appealDueDate, appeal.reviewer, appeal.resubmissionStatus];
      });
    }
    if (['sla-queue', 'overdue-cases', 'urgent-cases', 'escalations', 'notification-triggers'].includes(subfeature.slug)) {
      const scopedCases = subfeature.slug === 'overdue-cases'
        ? caseRows.filter((authCase) => payloadRef.derived[authCase.id].sla.overdue)
        : subfeature.slug === 'urgent-cases'
          ? caseRows.filter((authCase) => authCase.service.urgency === 'Urgent')
          : caseRows;
      return {
        columns: ['Case', 'Urgency', 'Due Date', 'Days Remaining', 'Overdue', 'Escalation', 'Triggers'],
        rows: scopedCases.map((authCase) => {
          const sla = payloadRef.derived[authCase.id].sla;
          return rowForCase(authCase, subfeature.title, { case: authCase, sla }, [authCase.caseNumber, authCase.service.urgency, sla.dueDate, sla.daysRemaining, sla.overdue ? 'Yes' : 'No', sla.escalationLevel, sla.triggers.join(', ') || 'None']);
        }),
        newKind: 'case',
      };
    }
    if (subfeature.slug === 'approval-denial-rates') {
      const rows = [
        { label: 'Approval Rate', value: percentage(payloadRef.analytics.approvalRate), note: 'Approved cases / total cases' },
        { label: 'Denial Rate', value: percentage(payloadRef.analytics.denialRate), note: 'Denied and appeal cases / total cases' },
        { label: 'Appeal Success Rate', value: percentage(payloadRef.analytics.appealSuccessRate), note: 'Appeals resolved successfully' },
        { label: 'Leakage Risk', value: String(payloadRef.analytics.leakageRisk), note: 'Overdue or at-risk cases' },
      ];
      return {
        columns: ['Metric', 'Value', 'Note'],
        rows: rows.map((row) => ({ id: row.label, title: row.label, data: row, cells: [row.label, row.value, row.note] })),
        newKind: 'analytics',
      };
    }
    if (subfeature.slug === 'payer-trends') {
      return {
        columns: ['Payer', 'Total', 'Approved', 'Denied'],
        rows: payloadRef.analytics.byPayer.map((row) => ({ id: row.payer, title: 'Payer Trend: ' + row.payer, data: row, cells: [row.payer, row.total, row.approved, row.denied] })),
        newKind: 'analytics',
      };
    }
    if (subfeature.slug === 'procedure-trends') {
      return {
        columns: ['Procedure', 'Total', 'Missing Evidence'],
        rows: payloadRef.analytics.byProcedure.map((row) => ({ id: row.procedure, title: 'Procedure Trend: ' + row.procedure, data: row, cells: [row.procedure, row.total, row.missingEvidence] })),
        newKind: 'analytics',
      };
    }
    if (subfeature.slug === 'turnaround-time') {
      return slaTable(['Case', 'Requested', 'Due Date', 'Days Remaining', 'Average Turnaround'], (authCase) => {
        const sla = payloadRef.derived[authCase.id].sla;
        return [authCase.caseNumber, authCase.service.requestedDate, sla.dueDate, sla.daysRemaining, payloadRef.analytics.averageTurnaroundDays + ' days'];
      });
    }
    if (subfeature.slug === 'evidence-gap-trends') {
      return {
        columns: ['Evidence Gap', 'Count'],
        rows: payloadRef.analytics.topMissingEvidence.map((row) => ({ id: row.label, title: 'Evidence Gap Trend: ' + row.label, data: row, cells: [row.label, row.count] })),
        newKind: 'analytics',
      };
    }
    if (['audit-logs', 'access-controls', 'phi-redaction', 'sessions', 'environment-config'].includes(subfeature.slug)) {
      return {
        columns: ['Control', 'Status', 'Detail'],
        rows: payloadRef.compliance.map((control) => ({
          id: control.id,
          title: subfeature.title + ': ' + control.label,
          data: control,
          options: { kind: 'compliance', rowId: control.id },
          cells: [control.label, <span className="status-chip" key="status">{control.status}</span>, control.detail],
        })),
        newKind: 'compliance',
      };
    }
    return {
      columns: ['Case', 'Status', 'Owner', 'Next Action'],
      rows: caseRows.map((authCase) => rowForCase(authCase, subfeature.title, authCase, [authCase.caseNumber, authCase.status, authCase.assignedTo, 'Review case details.'])),
      newKind: 'case',
    };
  }

  function withSeededMinimumRows(feature: PriorAuthFeature, subfeature: PriorAuthSubFeature, table: SubfeatureTable): SubfeatureTable {
    const payloadRef = payload;
    if (!payloadRef || table.rows.length >= 15) return table;
    const key = `${feature.slug}/${subfeature.slug}`;
    const existingIds = new Set(table.rows.map((row) => row.id));
    const seedRows = (payloadRef.subfeatureRows[key] || [])
      .filter((row) => !existingIds.has(row.id))
      .slice(0, 15 - table.rows.length)
      .map((row): SubfeatureRow => ({
        id: row.id,
        title: `${row.subfeatureTitle}: ${row.title}`,
        data: row,
        cells: table.columns.map((column, index) => {
          const label = column.toLowerCase();
          if (index === 0 || label.includes('case') || label.includes('metric') || label.includes('control') || label.includes('connector') || label.includes('payer') || label.includes('procedure')) return row.title;
          if (label.includes('status') || label.includes('state') || label.includes('fit') || label.includes('overdue')) return <span className="status-chip" key="status">{row.status}</span>;
          if (label.includes('owner') || label.includes('reviewer') || label.includes('actor')) return row.owner;
          if (label.includes('action') || label.includes('trigger') || label.includes('note')) return row.nextAction;
          if (label.includes('type') || label.includes('category') || label.includes('stage')) return row.recordType;
          if (label.includes('value') || label.includes('total') || label.includes('count') || label.includes('readiness') || label.includes('confidence') || label.includes('days')) return row.sequence;
          return row.summary;
        }),
      }));
    return { ...table, rows: [...table.rows, ...seedRows] };
  }

  function featureMetricRows(feature: PriorAuthFeature) {
    const payloadRef = payload;
    if (!payloadRef) return [];
    const overdue = payloadRef.cases.filter((authCase) => payloadRef.derived[authCase.id].sla.overdue).length;
    const missing = missingEvidenceRows.length;
    return [
      { metric: 'Total Cases', value: payloadRef.cases.length, note: 'Seeded prior authorization cases' },
      { metric: 'Approval Rate', value: percentage(payloadRef.analytics.approvalRate), note: 'Calculated from live case data' },
      { metric: feature.shortTitle + ' Sub-features', value: feature.subfeatures.length, note: 'Focused tables available' },
      { metric: 'Open Risk', value: overdue + missing, note: 'Overdue cases plus evidence gaps' },
    ];
  }

  function renderSubfeatureNav(feature: PriorAuthFeature, activeSubfeature?: PriorAuthSubFeature) {
    return (
      <nav className="subfeature-nav" aria-label={feature.title + ' subfeatures'}>
        <Link className={!activeSubfeature ? 'active' : ''} href={feature.href}>Dashboard</Link>
        {feature.subfeatures.map((item) => (
          <Link key={item.slug} className={activeSubfeature?.slug === item.slug ? 'active' : ''} href={`${feature.href}/${item.slug}`}>{item.title}</Link>
        ))}
      </nav>
    );
  }

  function renderFeatureDashboard(feature: PriorAuthFeature) {
    const metricRows = featureMetricRows(feature);
    return (
      <div className="stack prior-auth-workspace">
        <div className="section-head">
          <div>
            <div className="pill">Feature Dashboard</div>
            <h3>{feature.title}</h3>
            <div className="muted">{feature.summary}</div>
          </div>
          <Link className="button subtle" href="/prior-auth">Command center</Link>
        </div>
        {renderSubfeatureNav(feature)}
        <div className="dashboard-card-grid">
          {metricRows.map((row) => (
            <button className="dashboard-card metric" type="button" key={row.metric} onClick={() => viewRow(row.metric, row)}>
              <span>{row.metric}</span>
              <strong>{row.value}</strong>
              <em>{row.note}</em>
            </button>
          ))}
        </div>
        <div className="table-section">
          <div className="section-head compact">
            <h3>Sub-features</h3>
            <span className="pill">Click a card to open its table</span>
          </div>
          <div className="subfeature-card-grid">
            {feature.subfeatures.map((item) => {
              const table = withSeededMinimumRows(feature, item, buildSubfeatureTable(item));
              return (
                <Link className="subfeature-card" key={item.slug} href={`${feature.href}/${item.slug}`}>
                  <span>{item.title}</span>
                  <strong>{table.rows.length}</strong>
                  <em>{item.summary}</em>
                  <b>Open table</b>
                </Link>
              );
            })}
          </div>
        </div>
        <ModalLayer />
      </div>
    );
  }

  function renderSubfeatureTable(feature: PriorAuthFeature, subfeature: PriorAuthSubFeature) {
    const table = withSeededMinimumRows(feature, subfeature, buildSubfeatureTable(subfeature));
    return (
      <div className="stack prior-auth-workspace">
        <div className="section-head">
          <div>
            <div className="pill">{feature.title}</div>
            <h3>{subfeature.title}</h3>
            <div className="muted">{subfeature.summary}</div>
          </div>
          <div className="inline-links">
            <Link className="button subtle" href={feature.href}>Feature dashboard</Link>
            <button className="button primary" type="button" onClick={() => newEntryForKind(table.newKind)} disabled={!canManage}>New entry</button>
          </div>
        </div>
        {renderSubfeatureNav(feature, subfeature)}
        <div className="table-section">
          <div className="section-head compact">
            <h3>{subfeature.title} Table</h3>
            <span className="pill">{table.rows.length} rows</span>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead>
                <tr>{table.columns.map((column) => <th key={column}>{column}</th>)}<th>Actions</th></tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.id} className="interactive-row" onClick={(event) => openRowDetails(event, row.title, row.data, row.options)}>
                    {row.cells.map((cell, index) => <td key={index}>{cell}</td>)}
                    <td>{contextActionButtons(row)}</td>
                  </tr>
                ))}
                {!table.rows.length ? (
                  <tr><td colSpan={table.columns.length + 1}>No rows match this sub-feature yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <ModalLayer />
      </div>
    );
  }

  function ModalLayer() {
    return modal ? (
      <div className="record-modal-backdrop" role="presentation" onClick={() => setModal(null)}>
        <div className="record-modal wide-modal" role="dialog" aria-modal="true" aria-label={modal.title} onClick={(event) => event.stopPropagation()}>
          <div className="record-modal-header">
            <div>
              <span className="eyebrow">{modal.mode === 'new' ? 'New Entry' : modal.mode === 'edit' ? 'Edit Entry' : 'Entry Details'}</span>
              <h2>{modal.title}</h2>
              <p>{modal.mode === 'view' ? 'Review the selected row with grouped fields and operational context.' : 'Edit the row payload, then save.'}</p>
            </div>
            {modal.mode === 'view' && modalCanEdit() ? (
              <div className="modal-action-group">
                <button className="button subtle" type="button" onClick={editModalEntry} disabled={!canManage}>Edit</button>
                <button className="button subtle danger" type="button" onClick={deleteModalEntry} disabled={!canManage}>Delete</button>
              </div>
            ) : null}
          </div>
          {modal.mode === 'view' ? (
            <DetailFields data={modal.data} />
          ) : (
            <div className="structured-editor">
              {editableModalData() === null ? (
                <label className="record-form-field span-2">
                  <span>Row payload</span>
                  <textarea className="json-editor" value={modalJson} onChange={(event) => setModalJson(event.target.value)} rows={18} />
                </label>
              ) : (
                <EditableFields data={editableModalData()} />
              )}
            </div>
          )}
          {modalError ? <div className="error-text">{modalError}</div> : null}
          <div className="record-modal-actions">
            <button className="button secondary" type="button" onClick={() => setModal(null)}>Close</button>
            {modal.mode !== 'view' ? <button className="button primary" type="button" onClick={saveModal} disabled={!canManage}>Save entry</button> : null}
          </div>
        </div>
      </div>
    ) : null;
  }

  function CaseActions({ authCase, title = 'Case' }: { authCase: PriorAuthCase; title?: string }) {
    return (
      <div className="table-actions">
        <button className="button subtle" type="button" onClick={() => viewRow(title + ': ' + authCase.caseNumber, authCase, { kind: 'case', caseId: authCase.id })}>View</button>
        <button className="button subtle" type="button" onClick={() => editCase(authCase, title)} disabled={!canManage}>Edit</button>
        <button className="button subtle danger" type="button" onClick={() => deleteCase(authCase.id)} disabled={!canManage}>Delete</button>
      </div>
    );
  }

  async function updateCaseStatus(statusValue: PriorAuthStatus) {
    if (!selected) return;
    const next = withHistory({ ...selected, status: statusValue }, 'Status updated', 'Case moved to ' + statusValue + '.');
    await persistCase(next);
  }

  async function updateCaseEvidence(caseId: string, evidenceId: string, evidenceStatus: EvidenceStatus) {
    if (!payload) return;
    const authCase = payload.cases.find((item) => item.id === caseId);
    if (!authCase) return;
    const target = authCase.evidence.find((item) => item.id === evidenceId);
    const next = withHistory(
      {
        ...authCase,
        evidence: authCase.evidence.map((item) => (item.id === evidenceId ? { ...item, status: evidenceStatus } : item)),
      },
      'Evidence updated',
      (target?.label || 'Evidence item') + ' marked ' + evidenceStatus + '.',
    );
    await persistCase(next);
  }

  async function resetCases() {
    if (!canManage) return;
    setStatus('saving');
    const response = await fetch('/api/prior-auth/cases', { method: 'DELETE' });
    if (!response.ok) {
      setStatus('error');
      return;
    }
    const nextPayload = (await response.json()) as PriorAuthWorkspacePayload;
    setPayload(nextPayload);
    setSelectedId(nextPayload.cases[0]?.id || '');
    setStatus('ready');
  }

  if (!payload || !selected || !derived) {
    return (
      <div className="table-section">
        <div className="section-head">
          <h3>Prior Authorization Workspace</h3>
          <span className="save-indicator">{status === 'error' ? 'Unavailable' : 'Loading...'}</span>
        </div>
        <div className="muted">Loading case model, rule engine, evidence checks, packet builder, integrations, appeals, SLA, analytics, and compliance controls.</div>
      </div>
    );
  }

  const activeFeature = featureSlug ? priorAuthFeatureMap[featureSlug] : null;
  const activeSubfeature = activeFeature && subfeatureSlug
    ? activeFeature.subfeatures.find((item) => item.slug === subfeatureSlug)
    : undefined;

  if (activeFeature && activeSubfeature) {
    return renderSubfeatureTable(activeFeature, activeSubfeature);
  }

  if (activeFeature) {
    return renderFeatureDashboard(activeFeature);
  }

  return (
    <div className="stack prior-auth-workspace">
      <div className="section-head">
        <div>
          <div className="pill">Prior Authorization Command Center</div>
          <h3>Case lifecycle, automation, and controls</h3>
          <div className="muted">Focus: {focus.replace(/-/g, ' ')} · {payload.cases.length} seeded Postgres cases · {canManage ? 'Edit mode' : 'Read-only mode'}</div>
        </div>
        <div className="inline-links">
          <span className="save-indicator">{status === 'saving' ? 'Saving...' : status === 'error' ? 'Save error' : 'Saved'}</span>
          <button className="button subtle" type="button" onClick={resetCases} disabled={!canManage}>Reset 15 cases</button>
        </div>
      </div>

      <nav className="prior-auth-section-nav" aria-label="Prior authorization workspace sections">
        {[
          ['Metrics', '#pa-metrics'],
          ['Cases', '#pa-cases'],
          ['Timeline', '#pa-timeline'],
          ['Rules', '#pa-rules'],
          ['Evidence', '#pa-evidence'],
          ['Packets', '#pa-packets'],
          ['Submissions', '#pa-submissions'],
          ['Appeals', '#pa-appeals'],
          ['SLA', '#pa-sla'],
          ['Analytics', '#pa-analytics'],
          ['Compliance', '#pa-compliance'],
          ['History', '#pa-history'],
        ].map(([label, href]) => (
          <a key={href} href={href}>{label}</a>
        ))}
      </nav>

      <div id="pa-metrics" className="table-section">
        <div className="section-head compact">
          <h3>Prior Authorization Metrics</h3>
          <button className="button primary" type="button" onClick={() => newCase('New Case From Metrics')} disabled={!canManage}>New entry</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Metric</th><th>Value</th><th>Note</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {[
                { metric: 'Total Cases', value: payload.analytics.totalCases, note: 'Seeded into Postgres' },
                { metric: 'Approval Rate', value: percentage(payload.analytics.approvalRate), note: 'From case statuses' },
                { metric: 'Denial Rate', value: percentage(payload.analytics.denialRate), note: 'Denied and appeal cases' },
                { metric: 'Leakage Risk', value: payload.analytics.leakageRisk, note: 'Overdue or at-risk cases' },
              ].map((row) => (
                <tr key={row.metric} className="interactive-row" onClick={(event) => openRowDetails(event, row.metric, row)}>
                  <td>{row.metric}</td>
                  <td><strong>{row.value}</strong></td>
                  <td>{row.note}</td>
                  <td>
                    <div className="table-actions">
                      <button className="button subtle" type="button" onClick={() => viewRow(row.metric, row)}>View</button>
                      <button className="button subtle" type="button" disabled>Edit</button>
                      <button className="button subtle danger" type="button" disabled>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="prior-auth-section-stack">
        <div id="pa-cases" className="table-section">
          <div className="section-head">
            <h3>Authorization Case Queue</h3>
            <div className="inline-links">
              <span className="pill">{filteredCases.length} shown</span>
              <button className="button primary" type="button" onClick={() => newCase('New Authorization Case')} disabled={!canManage}>New entry</button>
            </div>
          </div>
          <div className="prior-auth-filters">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient, payer, code, procedure" />
            <select value={caseStatus} onChange={(event) => setCaseStatus(event.target.value)}>
              <option value="All">All statuses</option>
              {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead>
                <tr><th>Case</th><th>Patient</th><th>Payer</th><th>Service</th><th>Status</th><th>Rule Fit</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredCases.map((item) => {
                  const itemDerived = payload.derived[item.id];
                  return (
                    <tr
                      key={item.id}
                      className={(item.id === selected.id ? 'selected-row ' : '') + 'interactive-row'}
                      onClick={(event) => openRowDetails(event, 'Authorization Case: ' + item.caseNumber, item, { kind: 'case', caseId: item.id })}
                    >
                      <td><button className="table-link-button" type="button" onClick={() => setSelectedId(item.id)}>{item.caseNumber}</button></td>
                      <td>{item.patient.name}<div className="muted">{redactMemberId(item.patient.memberId)}</div></td>
                      <td>{item.payer.name}<div className="muted">{item.payer.plan}</div></td>
                      <td>{item.service.name}<div className="muted">{item.service.icd10Codes.join(', ')}</div></td>
                      <td><span className="status-chip">{item.status}</span></td>
                      <td>{itemDerived.rule.confidence}% · {itemDerived.rule.fit}</td>
                      <td><CaseActions authCase={item} title="Authorization Case" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div id="pa-timeline" className="table-section stack">
          <div className="section-head">
            <div>
              <h3>{selected.caseNumber}</h3>
              <div className="muted">{selected.patient.name} · DOB {selected.patient.dateOfBirth} · Member {redactMemberId(selected.patient.memberId)}</div>
            </div>
            <div className="inline-links">
              <span className={'status-chip ' + selected.status.toLowerCase().replace(/\s+/g, '-')}>{selected.status}</span>
              <button className="button primary" type="button" onClick={() => newCase('New Case Detail')} disabled={!canManage}>New entry</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <tbody>
                <tr className="interactive-row" onClick={(event) => openRowDetails(event, 'Provider: ' + selected.caseNumber, { provider: selected.provider }, { kind: 'case', caseId: selected.id })}><th>Provider</th><td>{selected.provider.name}</td><td>{selected.provider.specialty} · NPI {selected.provider.npi}</td><td><CaseActions authCase={selected} title="Case Details" /></td></tr>
                <tr className="interactive-row" onClick={(event) => openRowDetails(event, 'Payer: ' + selected.caseNumber, { payer: selected.payer }, { kind: 'case', caseId: selected.id })}><th>Payer</th><td>{selected.payer.name}</td><td>{selected.payer.plan} · {selected.payer.portal}</td><td><CaseActions authCase={selected} title="Case Details" /></td></tr>
                <tr className="interactive-row" onClick={(event) => openRowDetails(event, 'Service: ' + selected.caseNumber, { service: selected.service }, { kind: 'case', caseId: selected.id })}><th>Service</th><td>{selected.service.name}</td><td>{selected.service.type} · {selected.service.urgency}</td><td><CaseActions authCase={selected} title="Case Details" /></td></tr>
                <tr className="interactive-row" onClick={(event) => openRowDetails(event, 'Codes: ' + selected.caseNumber, { cptCodes: selected.service.cptCodes, hcpcsCodes: selected.service.hcpcsCodes, icd10Codes: selected.service.icd10Codes }, { kind: 'case', caseId: selected.id })}><th>Codes</th><td>{[...selected.service.cptCodes, ...selected.service.hcpcsCodes].join(', ') || 'No procedure code'}</td><td>ICD-10 {selected.service.icd10Codes.join(', ')}</td><td><CaseActions authCase={selected} title="Case Details" /></td></tr>
              </tbody>
            </table>
          </div>
          <label className="prior-auth-status-editor">
            <span>Status</span>
            <select value={selected.status} onChange={(event) => updateCaseStatus(event.target.value as PriorAuthStatus)} disabled={!canManage}>
              {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className="table-wrap">
            <div className="section-head compact">
              <h3>Case Timeline</h3>
              <button className="button primary" type="button" onClick={() => newCase('New Timeline Case')} disabled={!canManage}>New entry</button>
            </div>
            <table className="data-table compact-table">
              <thead><tr><th>Case</th><th>Step</th><th>Stage</th><th>State</th><th>Actions</th></tr></thead>
              <tbody>
                {timelineRows.map((row) => (
                  <tr
                    key={row.authCase.id + row.step}
                    className={(row.authCase.id === selected.id && row.state === 'Current' ? 'selected-row ' : '') + 'interactive-row'}
                    onClick={(event) => openRowDetails(event, 'Timeline: ' + row.authCase.caseNumber + ' / ' + row.step, row, { kind: 'case', caseId: row.authCase.id })}
                  >
                    <td>{row.authCase.caseNumber}</td>
                    <td>{row.position}</td>
                    <td>{row.step}</td>
                    <td>{row.state}</td>
                    <td><CaseActions authCase={row.authCase} title="Timeline Case" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="prior-auth-section-stack">
        <div id="pa-rules" className="table-section stack">
          <div className="section-head compact">
            <h3>Payer Rule Engine</h3>
            <div className="inline-links">
              <span className="pill">{ruleRows.length} rows</span>
              <button className="button primary" type="button" onClick={() => newCase('New Rule Engine Case')} disabled={!canManage}>New entry</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead><tr><th>Case</th><th>Payer</th><th>Policy</th><th>Fit</th><th>Confidence</th><th>Missing Evidence</th><th>Actions</th></tr></thead>
              <tbody>
                {ruleRows.map(({ authCase, derived }) => (
                  <tr key={authCase.id} className="interactive-row" onClick={(event) => openRowDetails(event, 'Payer Rule Engine: ' + authCase.caseNumber, { case: authCase, rule: derived.rule }, { kind: 'case', caseId: authCase.id })}>
                    <td>{authCase.caseNumber}</td>
                    <td>{authCase.payer.name}</td>
                    <td>{derived.rule.policy.id}</td>
                    <td><span className="status-chip">{derived.rule.fit}</span></td>
                    <td>{derived.rule.confidence}%</td>
                    <td>{derived.rule.missingEvidence.join(', ') || 'None'}</td>
                    <td><CaseActions authCase={authCase} title="Payer Rule Engine" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div id="pa-evidence" className="table-section stack">
          <div className="section-head compact">
            <h3>Evidence Gap Detection</h3>
            <div className="inline-links">
              <span className="pill">{evidenceRows.length} rows</span>
              <button className="button primary" type="button" onClick={() => newEvidence()} disabled={!canManage}>New entry</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead><tr><th>Case</th><th>Evidence</th><th>Category</th><th>Source</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {evidenceRows.map(({ authCase, evidence }) => (
                  <tr key={authCase.id + evidence.id} className="interactive-row" onClick={(event) => openRowDetails(event, 'Evidence: ' + evidence.label, { caseNumber: authCase.caseNumber, evidence }, { kind: 'evidence', caseId: authCase.id, rowId: evidence.id })}>
                    <td>{authCase.caseNumber}</td>
                    <td><strong>{evidence.label}</strong></td>
                    <td>{evidence.category}</td>
                    <td>{evidence.source}</td>
                    <td>
                      <select value={evidence.status} onChange={(event) => updateCaseEvidence(authCase.id, evidence.id, event.target.value as EvidenceStatus)} disabled={!canManage}>
                        {EVIDENCE_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="button subtle" type="button" onClick={() => viewRow('Evidence: ' + evidence.label, { caseNumber: authCase.caseNumber, evidence }, { kind: 'evidence', caseId: authCase.id, rowId: evidence.id })}>View</button>
                        <button className="button subtle" type="button" onClick={() => editEvidence(authCase.id, evidence)} disabled={!canManage}>Edit</button>
                        <button className="button subtle danger" type="button" onClick={() => deleteEvidence(authCase.id, evidence.id)} disabled={!canManage}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div id="pa-packets" className="table-section stack">
          <div className="section-head compact">
            <h3>Packet Builder</h3>
            <div className="inline-links">
              <span className="pill">{packetRows.length} rows</span>
              <button className="button primary" type="button" onClick={() => newCase('New Packet Case')} disabled={!canManage}>New entry</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead><tr><th>Case</th><th>Service</th><th>Readiness</th><th>Status</th><th>Attached Docs</th><th>Failed Checks</th><th>Actions</th></tr></thead>
              <tbody>
                {packetRows.map(({ authCase, derived }) => (
                  <tr key={authCase.id} className="interactive-row" onClick={(event) => openRowDetails(event, 'Packet Builder: ' + authCase.caseNumber, { case: authCase, packet: derived.packet }, { kind: 'case', caseId: authCase.id })}>
                    <td>{authCase.caseNumber}</td>
                    <td>{authCase.service.name}</td>
                    <td>{derived.packet.readiness}%</td>
                    <td><span className="status-chip">{derived.packet.status}</span></td>
                    <td>{derived.packet.attachedDocuments.length}</td>
                    <td>{derived.packet.validationChecks.filter((check) => !check.passed).map((check) => check.label).join(', ') || 'None'}</td>
                    <td><CaseActions authCase={authCase} title="Packet Builder" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="prior-auth-note">
            <summary>Cover letter draft</summary>
            <p>{derived.packet.coverLetterDraft}</p>
          </details>
        </div>
      </div>

      <div className="prior-auth-section-stack">
        <div id="pa-submissions" className="table-section stack">
          <div className="section-head compact">
            <h3>Submission + Integrations</h3>
            <div className="inline-links">
              <span className="pill">{submissionRows.length} rows</span>
              <button className="button primary" type="button" onClick={newIntegration} disabled={!canManage}>New entry</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead><tr><th>Case</th><th>Submission Status</th><th>Connector</th><th>Type</th><th>Connector Status</th><th>Next Action</th><th>Actions</th></tr></thead>
              <tbody>
                {submissionRows.map(({ authCase, channel }) => (
                  <tr key={authCase.id + channel.id} className="interactive-row" onClick={(event) => openRowDetails(event, 'Submission: ' + authCase.caseNumber, { case: authCase, channel }, { kind: 'integration', rowId: channel.id })}>
                    <td>{authCase.caseNumber}</td>
                    <td>{authCase.status}</td>
                    <td><strong>{channel.name}</strong></td>
                    <td>{channel.type}</td>
                    <td><span className="status-chip">{channel.status}</span></td>
                    <td>{channel.nextAction}</td>
                    <td>
                      <div className="table-actions">
                        <button className="button subtle" type="button" onClick={() => viewRow('Submission: ' + authCase.caseNumber, { case: authCase, channel }, { kind: 'integration', rowId: channel.id })}>View</button>
                        <button className="button subtle" type="button" onClick={() => editIntegration(channel)} disabled={!canManage}>Edit</button>
                        <button className="button subtle danger" type="button" onClick={() => deleteIntegration(channel.id)} disabled={!canManage}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div id="pa-appeals" className="table-section stack">
          <div className="section-head compact">
            <h3>Appeals Workspace</h3>
            <div className="inline-links">
              <span className="pill">{appealRows.length} rows</span>
              <button className="button primary" type="button" onClick={() => newCase('New Appeal Case')} disabled={!canManage}>New entry</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead><tr><th>Case</th><th>Needed</th><th>Denial Class</th><th>Deadline</th><th>Reviewer</th><th>Resubmission</th><th>Actions</th></tr></thead>
              <tbody>
                {appealRows.map(({ authCase, derived }) => (
                  <tr key={authCase.id} className="interactive-row" onClick={(event) => openRowDetails(event, 'Appeals Workspace: ' + authCase.caseNumber, { case: authCase, appeal: derived.appeal }, { kind: 'case', caseId: authCase.id })}>
                    <td>{authCase.caseNumber}</td>
                    <td>{derived.appeal.needed ? 'Yes' : 'No'}</td>
                    <td>{derived.appeal.denialClass}</td>
                    <td>{derived.appeal.appealDueDate}</td>
                    <td>{derived.appeal.reviewer}</td>
                    <td>{derived.appeal.resubmissionStatus}</td>
                    <td><CaseActions authCase={authCase} title="Appeals Workspace" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="prior-auth-note">
            <summary>Appeal letter draft</summary>
            <p>{derived.appeal.letterDraft}</p>
          </details>
        </div>
      </div>

      <div className="prior-auth-section-stack">
        <div id="pa-sla" className="table-section stack">
          <div className="section-head compact">
            <h3>SLA Automation</h3>
            <div className="inline-links">
              <span className="pill">{slaRows.length} rows</span>
              <button className="button primary" type="button" onClick={() => newCase('New SLA Case')} disabled={!canManage}>New entry</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead><tr><th>Case</th><th>Due Date</th><th>Days Remaining</th><th>Overdue</th><th>Escalation</th><th>Triggers</th><th>Actions</th></tr></thead>
              <tbody>
                {slaRows.map(({ authCase, derived }) => (
                  <tr key={authCase.id} className="interactive-row" onClick={(event) => openRowDetails(event, 'SLA Automation: ' + authCase.caseNumber, { case: authCase, sla: derived.sla }, { kind: 'case', caseId: authCase.id })}>
                    <td>{authCase.caseNumber}</td>
                    <td>{derived.sla.dueDate}</td>
                    <td>{derived.sla.daysRemaining}</td>
                    <td>{derived.sla.overdue ? 'Yes' : 'No'}</td>
                    <td>{derived.sla.escalationLevel}</td>
                    <td>{(derived.sla.triggers.length ? derived.sla.triggers : ['No active escalation trigger.']).join(' · ')}</td>
                    <td><CaseActions authCase={authCase} title="SLA Automation" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div id="pa-analytics" className="table-section stack">
          <div className="section-head compact">
            <h3>Analytics From Case Data</h3>
            <div className="inline-links">
              <span className="pill">{payload.analytics.byProcedure.length} rows</span>
              <button className="button primary" type="button" onClick={() => newCase('New Analytics Case')} disabled={!canManage}>New entry</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead><tr><th>Procedure</th><th>Total</th><th>Missing Evidence</th><th>Actions</th></tr></thead>
              <tbody>
                {payload.analytics.byProcedure.map((item) => (
                  <tr key={item.procedure} className="interactive-row" onClick={(event) => openRowDetails(event, 'Analytics: ' + item.procedure, item)}>
                    <td>{item.procedure}</td>
                    <td>{item.total}</td>
                    <td>{item.missingEvidence}</td>
                    <td>
                      <div className="table-actions">
                        <button className="button subtle" type="button" onClick={() => viewRow('Analytics: ' + item.procedure, item)}>View</button>
                        <button className="button subtle" type="button" disabled>Edit</button>
                        <button className="button subtle danger" type="button" disabled>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div id="pa-compliance" className="table-section stack">
          <div className="section-head compact">
            <h3>Compliance/Security</h3>
            <div className="inline-links">
              <span className="pill">{payload.compliance.length} rows</span>
              <button className="button primary" type="button" onClick={newCompliance} disabled={!canManage}>New entry</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead><tr><th>Control</th><th>Status</th><th>Detail</th><th>Actions</th></tr></thead>
              <tbody>
                {payload.compliance.map((control) => (
                  <tr key={control.id} className="interactive-row" onClick={(event) => openRowDetails(event, 'Compliance: ' + control.label, control, { kind: 'compliance', rowId: control.id })}>
                    <td><strong>{control.label}</strong></td>
                    <td><span className="status-chip">{control.status}</span></td>
                    <td>{control.detail}</td>
                    <td>
                      <div className="table-actions">
                        <button className="button subtle" type="button" onClick={() => viewRow('Compliance: ' + control.label, control, { kind: 'compliance', rowId: control.id })}>View</button>
                        <button className="button subtle" type="button" onClick={() => editCompliance(control)} disabled={!canManage}>Edit</button>
                        <button className="button subtle danger" type="button" onClick={() => deleteCompliance(control.id)} disabled={!canManage}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="prior-auth-section-stack">
        <div className="table-section">
          <div className="section-head compact">
            <h3>Top Missing Evidence</h3>
            <div className="inline-links">
              <span className="pill">{missingEvidenceRows.length} rows</span>
              <button className="button primary" type="button" onClick={() => newEvidence()} disabled={!canManage}>New entry</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead><tr><th>Case</th><th>Evidence</th><th>Category</th><th>Status</th><th>Source</th><th>Actions</th></tr></thead>
              <tbody>
                {(missingEvidenceRows.length ? missingEvidenceRows : evidenceRows.slice(0, 15)).map(({ authCase, evidence }) => (
                  <tr key={'missing-' + authCase.id + evidence.id} className="interactive-row" onClick={(event) => openRowDetails(event, 'Missing Evidence: ' + evidence.label, { caseNumber: authCase.caseNumber, evidence }, { kind: 'evidence', caseId: authCase.id, rowId: evidence.id })}>
                    <td>{authCase.caseNumber}</td>
                    <td>{evidence.label}</td>
                    <td>{evidence.category}</td>
                    <td><span className="status-chip">{evidence.status}</span></td>
                    <td>{evidence.source}</td>
                    <td>
                      <div className="table-actions">
                        <button className="button subtle" type="button" onClick={() => viewRow('Missing Evidence: ' + evidence.label, { caseNumber: authCase.caseNumber, evidence }, { kind: 'evidence', caseId: authCase.id, rowId: evidence.id })}>View</button>
                        <button className="button subtle" type="button" onClick={() => editEvidence(authCase.id, evidence)} disabled={!canManage}>Edit</button>
                        <button className="button subtle danger" type="button" onClick={() => deleteEvidence(authCase.id, evidence.id)} disabled={!canManage}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div id="pa-history" className="table-section">
          <div className="section-head compact">
            <h3>Case History</h3>
            <div className="inline-links">
              <span className="pill">{historyRows.length} rows</span>
              <button className="button primary" type="button" onClick={() => newHistoryEntry()} disabled={!canManage}>New entry</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead><tr><th>Case</th><th>At</th><th>Actor</th><th>Event</th><th>Note</th><th>Actions</th></tr></thead>
              <tbody>
                {historyRows.map(({ authCase, history }) => (
                  <tr key={authCase.id + history.id} className="interactive-row" onClick={(event) => openRowDetails(event, 'History: ' + history.event, { caseNumber: authCase.caseNumber, history }, { kind: 'history', caseId: authCase.id, rowId: history.id })}>
                    <td>{authCase.caseNumber}</td>
                    <td>{history.at}</td>
                    <td>{history.actor}</td>
                    <td>{history.event}</td>
                    <td>{history.note}</td>
                    <td>
                      <div className="table-actions">
                        <button className="button subtle" type="button" onClick={() => viewRow('History: ' + history.event, { caseNumber: authCase.caseNumber, history }, { kind: 'history', caseId: authCase.id, rowId: history.id })}>View</button>
                        <button className="button subtle" type="button" onClick={() => editHistory(authCase.id, history)} disabled={!canManage}>Edit</button>
                        <button className="button subtle danger" type="button" onClick={() => deleteHistory(authCase.id, history.id)} disabled={!canManage}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal ? (
        <div className="record-modal-backdrop" role="presentation" onClick={() => setModal(null)}>
          <div className="record-modal wide-modal" role="dialog" aria-modal="true" aria-label={modal.title} onClick={(event) => event.stopPropagation()}>
            <div className="record-modal-header">
              <div>
                <span className="eyebrow">{modal.mode === 'new' ? 'New Entry' : modal.mode === 'edit' ? 'Edit Entry' : 'Entry Details'}</span>
                <h2>{modal.title}</h2>
                <p>{modal.mode === 'view' ? 'Review the selected row with grouped fields and operational context.' : 'Edit the row payload, then save.'}</p>
              </div>
              {modal.mode === 'view' && modalCanEdit() ? (
                <div className="modal-action-group">
                  <button className="button subtle" type="button" onClick={editModalEntry} disabled={!canManage}>Edit</button>
                  <button className="button subtle danger" type="button" onClick={deleteModalEntry} disabled={!canManage}>Delete</button>
                </div>
              ) : null}
            </div>
            {modal.mode === 'view' ? (
              <DetailFields data={modal.data} />
            ) : (
              <div className="structured-editor">
                {editableModalData() === null ? (
                  <label className="record-form-field span-2">
                    <span>Row payload</span>
                    <textarea className="json-editor" value={modalJson} onChange={(event) => setModalJson(event.target.value)} rows={18} />
                  </label>
                ) : (
                  <EditableFields data={editableModalData()} />
                )}
              </div>
            )}
            {modalError ? <div className="error-text">{modalError}</div> : null}
            <div className="record-modal-actions">
              <button className="button secondary" type="button" onClick={() => setModal(null)}>Close</button>
              {modal.mode !== 'view' ? <button className="button primary" type="button" onClick={saveModal} disabled={!canManage}>Save entry</button> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
