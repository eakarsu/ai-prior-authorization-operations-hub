'use client';

import { useEffect, useState } from 'react';
import type {
  AccessLogEntry,
  AuthControl,
  DeploymentChecklistItem,
  NotificationOutboxItem,
  PacketArtifact,
  ProductionIntegration,
  ProductionReadinessSnapshot,
} from '@/lib/productionReadiness';

function statusClass(status: string) {
  return 'status-chip ' + status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function ReadinessTable({
  title,
  count,
  columns,
  rows,
}: {
  title: string;
  count: number;
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <div className="table-section">
      <div className="section-head compact">
        <h3>{title}</h3>
        <span className="pill">{count} rows</span>
      </div>
      <div className="table-wrap">
        <table className="data-table compact-table">
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProductionReadinessWorkspace() {
  const [snapshot, setSnapshot] = useState<ProductionReadinessSnapshot | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');

  async function load() {
    setStatus('loading');
    const response = await fetch('/api/prior-auth/production-readiness', { cache: 'no-store' });
    if (!response.ok) {
      setStatus('error');
      return;
    }
    setSnapshot(await response.json());
    setStatus('ready');
  }

  useEffect(() => {
    void load();
  }, []);

  async function generatePacket() {
    setStatus('saving');
    const response = await fetch('/api/prior-auth/packets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseNumber: 'PA-2026-1001', packetType: 'Initial submission' }),
    });
    if (!response.ok) {
      setStatus('error');
      return;
    }
    await load();
  }

  async function dispatchNotifications() {
    setStatus('saving');
    const response = await fetch('/api/prior-auth/notifications/outbox/dispatch', { method: 'POST' });
    if (!response.ok) {
      setStatus('error');
      return;
    }
    await load();
  }

  if (!snapshot) {
    return (
      <div className="table-section">
        <div className="section-head">
          <h3>Production Readiness</h3>
          <span className="save-indicator">{status === 'error' ? 'Unavailable' : 'Loading...'}</span>
        </div>
      </div>
    );
  }

  const failedOutbox = snapshot.notificationOutbox.filter((item) => item.status === 'Failed').length;
  const blockers = snapshot.deploymentChecklist.filter((item) => item.status !== 'Done').length;
  const missingCredentials = snapshot.integrations.filter((item) => item.status === 'Needs credentials').length;
  const authGaps = snapshot.authControls.filter((item) => item.status !== 'Configured').length;

  return (
    <div className="stack prior-auth-workspace">
      <div className="section-head">
        <div>
          <div className="pill">Production Hardening</div>
          <h3>Readiness controls, integrations, packets, notifications, and audit</h3>
          <div className="muted">Status: {status === 'saving' ? 'Updating' : status === 'error' ? 'Error' : 'Ready'}</div>
        </div>
        <div className="inline-links">
          <button className="button subtle" type="button" onClick={dispatchNotifications}>Dispatch outbox</button>
          <button className="button primary" type="button" onClick={generatePacket}>Generate packet</button>
        </div>
      </div>

      <div className="dashboard-card-grid">
        <div className="dashboard-card"><span>Connectors</span><strong>{snapshot.integrations.length}</strong><em>{missingCredentials} need credentials</em></div>
        <div className="dashboard-card"><span>Outbox</span><strong>{snapshot.notificationOutbox.length}</strong><em>{failedOutbox} failed deliveries</em></div>
        <div className="dashboard-card"><span>Packets</span><strong>{snapshot.packetArtifacts.length}</strong><em>PDF artifacts generated</em></div>
        <div className="dashboard-card"><span>Checklist</span><strong>{snapshot.deploymentChecklist.length}</strong><em>{blockers} open production items</em></div>
        <div className="dashboard-card"><span>Auth Controls</span><strong>{snapshot.authControls.length}</strong><em>{authGaps} require IdP setup</em></div>
        <div className="dashboard-card"><span>Access Logs</span><strong>{snapshot.accessLogs.length}</strong><em>PHI-safe events</em></div>
      </div>

      <ReadinessTable
        title="Integration Connectors"
        count={snapshot.integrations.length}
        columns={['Connector', 'Category', 'Mode', 'Status', 'Auth', 'Next Action']}
        rows={snapshot.integrations.map((item: ProductionIntegration) => [
          item.name,
          item.category,
          item.mode,
          <span className={statusClass(item.status)} key="status">{item.status}</span>,
          item.authMethod,
          item.nextAction,
        ])}
      />

      <ReadinessTable
        title="Packet Artifacts"
        count={snapshot.packetArtifacts.length}
        columns={['Case', 'Type', 'Format', 'Status', 'Checksum', 'Download']}
        rows={snapshot.packetArtifacts.map((item: PacketArtifact) => [
          item.caseNumber,
          item.packetType,
          item.format,
          <span className={statusClass(item.status)} key="status">{item.status}</span>,
          item.checksum.slice(0, 12),
          <a className="button subtle" key="download" href={`/api/prior-auth/packets/${item.id}/download`}>Download</a>,
        ])}
      />

      <ReadinessTable
        title="Notification Outbox"
        count={snapshot.notificationOutbox.length}
        columns={['Case', 'Channel', 'Recipient', 'Template', 'Status', 'Attempts']}
        rows={snapshot.notificationOutbox.map((item: NotificationOutboxItem) => [
          item.caseNumber,
          item.channel,
          item.recipient,
          item.template,
          <span className={statusClass(item.status)} key="status">{item.status}</span>,
          item.attempts,
        ])}
      />

      <ReadinessTable
        title="Enterprise Auth Controls"
        count={snapshot.authControls.length}
        columns={['Control', 'Type', 'Provider', 'Required', 'Status', 'Config']}
        rows={snapshot.authControls.map((item: AuthControl) => [
          item.label,
          item.type,
          item.provider,
          item.required ? 'Yes' : 'No',
          <span className={statusClass(item.status)} key="status">{item.status}</span>,
          item.configEnvVars.join(', '),
        ])}
      />

      <ReadinessTable
        title="PHI-Safe Access Logs"
        count={snapshot.accessLogs.length}
        columns={['At', 'Actor', 'Role', 'Resource', 'Action', 'Outcome']}
        rows={snapshot.accessLogs.slice(0, 30).map((item: AccessLogEntry) => [
          item.at,
          item.actor,
          item.role,
          item.resource,
          item.action,
          <span className={statusClass(item.outcome)} key="status">{item.outcome}</span>,
        ])}
      />

      <ReadinessTable
        title="Deployment Checklist"
        count={snapshot.deploymentChecklist.length}
        columns={['Area', 'Item', 'Environment', 'Owner', 'Status', 'Evidence']}
        rows={snapshot.deploymentChecklist.map((item: DeploymentChecklistItem) => [
          item.area,
          item.item,
          item.environment,
          item.owner,
          <span className={statusClass(item.status)} key="status">{item.status}</span>,
          item.evidence,
        ])}
      />
    </div>
  );
}
