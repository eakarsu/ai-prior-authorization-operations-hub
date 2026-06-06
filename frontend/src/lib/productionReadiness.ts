import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { ensureListSeed, listPgPayloads, replacePgPayloads, upsertPgPayload } from '@/lib/postgres';
import { getPriorAuthCases } from '@/lib/priorAuthStore';
import { DATA_DIR } from '@/lib/storePaths';
import { type PriorAuthCase } from '@/lib/priorAuth';
import { type SessionUser } from '@/lib/auth';

const PACKET_DIR = path.join(DATA_DIR, 'generated-packets');

export type ProductionIntegration = {
  id: string;
  name: string;
  category: 'EHR/FHIR' | 'Payer portal' | 'Clearinghouse' | 'Fax' | 'Email' | 'SFTP';
  mode: 'Stub' | 'Sandbox' | 'Production';
  status: 'Ready' | 'Needs credentials' | 'Connected' | 'Disabled';
  authMethod: 'OAuth2' | 'API key' | 'Portal credentials' | 'Certificate' | 'SMTP' | 'SFTP key';
  endpointEnvVar: string;
  credentialEnvVars: string[];
  polling: boolean;
  lastHealthCheck: string;
  nextAction: string;
};

export type NotificationOutboxItem = {
  id: string;
  channel: 'Email' | 'SMS' | 'In-app' | 'Webhook';
  recipient: string;
  template: string;
  caseNumber: string;
  status: 'Queued' | 'Sent' | 'Failed';
  attempts: number;
  createdAt: string;
  nextAttemptAt: string;
  lastError?: string;
};

export type PacketArtifact = {
  id: string;
  caseNumber: string;
  patientSafeLabel: string;
  packetType: 'Initial submission' | 'Appeal' | 'Peer review' | 'Evidence bundle';
  format: 'PDF' | 'HTML';
  status: 'Generated' | 'Ready for review' | 'Sent';
  fileName: string;
  storagePath: string;
  generatedAt: string;
  checksum: string;
  summary: string;
};

export type AccessLogEntry = {
  id: string;
  at: string;
  actor: string;
  role: string;
  resource: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  outcome: 'Allowed' | 'Denied';
  phiSafe: boolean;
};

export type AuthControl = {
  id: string;
  label: string;
  type: 'SSO' | 'MFA' | 'Session' | 'Password' | 'Provisioning';
  status: 'Configured' | 'Needs setup' | 'Ready for IdP';
  required: boolean;
  provider: string;
  configEnvVars: string[];
  detail: string;
};

export type DeploymentChecklistItem = {
  id: string;
  area: 'Security' | 'Database' | 'Integrations' | 'Observability' | 'Compliance' | 'Release';
  item: string;
  environment: 'Local' | 'Staging' | 'Production';
  status: 'Done' | 'Needs setup' | 'Blocked';
  owner: string;
  evidence: string;
};

export type ProductionReadinessSnapshot = {
  integrations: ProductionIntegration[];
  notificationOutbox: NotificationOutboxItem[];
  packetArtifacts: PacketArtifact[];
  accessLogs: AccessLogEntry[];
  authControls: AuthControl[];
  deploymentChecklist: DeploymentChecklistItem[];
};

const seedIntegrations: ProductionIntegration[] = [
  { id: 'int-fhir-case-import', name: 'FHIR Case Import', category: 'EHR/FHIR', mode: 'Sandbox', status: 'Needs credentials', authMethod: 'OAuth2', endpointEnvVar: 'FHIR_BASE_URL', credentialEnvVars: ['FHIR_CLIENT_ID', 'FHIR_CLIENT_SECRET'], polling: true, lastHealthCheck: 'Pending', nextAction: 'Connect sandbox SMART/FHIR client.' },
  { id: 'int-payer-portal-uhc', name: 'UHC Provider Portal', category: 'Payer portal', mode: 'Stub', status: 'Needs credentials', authMethod: 'Portal credentials', endpointEnvVar: 'UHC_PORTAL_URL', credentialEnvVars: ['UHC_PORTAL_USERNAME', 'UHC_PORTAL_PASSWORD'], polling: true, lastHealthCheck: 'Pending', nextAction: 'Store credentials in production secret manager.' },
  { id: 'int-payer-portal-aetna', name: 'Availity Payer Portal', category: 'Payer portal', mode: 'Stub', status: 'Needs credentials', authMethod: 'Portal credentials', endpointEnvVar: 'AVAILITY_PORTAL_URL', credentialEnvVars: ['AVAILITY_USERNAME', 'AVAILITY_PASSWORD'], polling: true, lastHealthCheck: 'Pending', nextAction: 'Complete MFA-safe portal delegation workflow.' },
  { id: 'int-clearinghouse-278', name: 'X12 278 Clearinghouse', category: 'Clearinghouse', mode: 'Sandbox', status: 'Ready', authMethod: 'Certificate', endpointEnvVar: 'CLEARINGHOUSE_278_URL', credentialEnvVars: ['CLEARINGHOUSE_CERT', 'CLEARINGHOUSE_TRADING_PARTNER_ID'], polling: true, lastHealthCheck: '2026-06-06 08:00', nextAction: 'Validate payer-specific companion guides.' },
  { id: 'int-fax-clinical', name: 'Clinical Fax Delivery', category: 'Fax', mode: 'Sandbox', status: 'Ready', authMethod: 'API key', endpointEnvVar: 'FAX_API_URL', credentialEnvVars: ['FAX_API_KEY'], polling: false, lastHealthCheck: '2026-06-06 08:10', nextAction: 'Enable cover sheet redaction validation.' },
  { id: 'int-secure-email', name: 'Secure Payer Email', category: 'Email', mode: 'Sandbox', status: 'Ready', authMethod: 'SMTP', endpointEnvVar: 'SMTP_HOST', credentialEnvVars: ['SMTP_USERNAME', 'SMTP_PASSWORD'], polling: false, lastHealthCheck: '2026-06-06 08:20', nextAction: 'Configure DKIM/SPF and encryption policy.' },
  { id: 'int-sftp-batch', name: 'Batch SFTP Drop', category: 'SFTP', mode: 'Stub', status: 'Needs credentials', authMethod: 'SFTP key', endpointEnvVar: 'SFTP_HOST', credentialEnvVars: ['SFTP_PRIVATE_KEY', 'SFTP_USERNAME'], polling: true, lastHealthCheck: 'Pending', nextAction: 'Provision payer folders and acknowledgement parser.' },
];

const seedAuthControls: AuthControl[] = [
  { id: 'auth-sso-saml', label: 'SAML SSO provider', type: 'SSO', status: 'Ready for IdP', required: true, provider: 'SAML 2.0 / OIDC bridge', configEnvVars: ['SSO_ENTITY_ID', 'SSO_SSO_URL', 'SSO_CERT'], detail: 'Enterprise identity provider metadata can replace local credential login.' },
  { id: 'auth-oidc', label: 'OIDC client registration', type: 'SSO', status: 'Ready for IdP', required: true, provider: 'OIDC', configEnvVars: ['OIDC_ISSUER', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET'], detail: 'OIDC hooks are documented for enterprise SSO implementation.' },
  { id: 'auth-mfa-policy', label: 'MFA enforcement policy', type: 'MFA', status: 'Needs setup', required: true, provider: 'IdP enforced', configEnvVars: ['REQUIRE_MFA'], detail: 'Production should enforce MFA at the identity provider before session issuance.' },
  { id: 'auth-session-timeout', label: 'Session timeout', type: 'Session', status: 'Configured', required: true, provider: 'Application cookie', configEnvVars: ['AUTH_SECRET'], detail: 'Signed HTTP-only session cookies expire after eight hours.' },
  { id: 'auth-user-provisioning', label: 'User provisioning source', type: 'Provisioning', status: 'Ready for IdP', required: true, provider: 'SCIM/manual JSON bridge', configEnvVars: ['PRIOR_AUTH_USERS_JSON', 'SCIM_TOKEN'], detail: 'Local users can be replaced by IdP/SCIM managed users.' },
];

const seedChecklist: DeploymentChecklistItem[] = [
  { id: 'deploy-auth-secret', area: 'Security', item: 'Set AUTH_SECRET per environment', environment: 'Production', status: 'Needs setup', owner: 'Platform', evidence: 'Secret exists in production secret manager.' },
  { id: 'deploy-db-url', area: 'Database', item: 'Provision isolated Postgres DATABASE_URL', environment: 'Production', status: 'Needs setup', owner: 'Platform', evidence: 'DATABASE_URL points to production database.' },
  { id: 'deploy-backups', area: 'Database', item: 'Enable database backups and restore test', environment: 'Production', status: 'Needs setup', owner: 'DBA', evidence: 'Backup policy and restore runbook attached.' },
  { id: 'deploy-sso', area: 'Security', item: 'Connect SSO/MFA identity provider', environment: 'Production', status: 'Needs setup', owner: 'Security', evidence: 'SSO metadata and MFA policy approved.' },
  { id: 'deploy-phi-logging', area: 'Compliance', item: 'Verify PHI-safe audit logging', environment: 'Production', status: 'Done', owner: 'Compliance', evidence: 'Audit text scrubber avoids names and member identifiers.' },
  { id: 'deploy-connectors', area: 'Integrations', item: 'Move connectors from sandbox to production', environment: 'Production', status: 'Blocked', owner: 'Integrations', evidence: 'Requires payer/EHR credentials.' },
  { id: 'deploy-observability', area: 'Observability', item: 'Configure error and access log export', environment: 'Production', status: 'Needs setup', owner: 'Platform', evidence: 'Logs stream to SIEM/monitoring sink.' },
  { id: 'deploy-release', area: 'Release', item: 'Run build, smoke, and UI regression checks', environment: 'Production', status: 'Done', owner: 'Release', evidence: 'npm run build, npm run smoke, npm run ui:regression.' },
];

function now() {
  return new Date().toLocaleString();
}

function seedOutbox(cases: PriorAuthCase[]): NotificationOutboxItem[] {
  return cases.slice(0, 15).map((authCase, index) => ({
    id: `outbox-${authCase.id}`,
    channel: index % 3 === 0 ? 'Email' : index % 3 === 1 ? 'In-app' : 'Webhook',
    recipient: index % 2 === 0 ? 'payer-ops@example.local' : 'care-team@example.local',
    template: authCase.status === 'Denied' ? 'appeal-deadline' : authCase.service.urgency === 'Urgent' ? 'urgent-sla' : 'status-update',
    caseNumber: authCase.caseNumber,
    status: index % 5 === 0 ? 'Failed' : index % 4 === 0 ? 'Sent' : 'Queued',
    attempts: index % 5 === 0 ? 2 : index % 4 === 0 ? 1 : 0,
    createdAt: authCase.service.requestedDate + ' 09:00',
    nextAttemptAt: authCase.service.targetDecisionDate + ' 08:00',
    lastError: index % 5 === 0 ? 'Delivery provider credentials not configured.' : undefined,
  }));
}

function packetChecksum(content: string) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function simplePdf(content: string) {
  const escaped = content.replace(/[()\\]/g, '\\$&').split('\n').slice(0, 18);
  const text = escaped.map((line, index) => `72 ${740 - index * 22} Td (${line}) Tj`).join('\n');
  const stream = `BT /F1 11 Tf 0 0 Td ${text} ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object + '\n';
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

async function ensureStore() {
  const cases = await getPriorAuthCases();
  await ensureListSeed('prior_auth_integrations', seedIntegrations, 'prior-auth-integrations.json');
  await ensureListSeed('prior_auth_notification_outbox', seedOutbox(cases), 'prior-auth-notification-outbox.json');
  await ensureListSeed('prior_auth_packet_artifacts', await seedPacketArtifacts(cases), 'prior-auth-packet-artifacts.json');
  await ensureListSeed('prior_auth_access_logs', seedAccessLogs(cases), 'prior-auth-access-logs.json');
  await ensureListSeed('prior_auth_auth_controls', seedAuthControls, 'prior-auth-auth-controls.json');
  await ensureListSeed('prior_auth_deployment_checklist', seedChecklist, 'prior-auth-deployment-checklist.json');
}

function seedAccessLogs(cases: PriorAuthCase[]): AccessLogEntry[] {
  return cases.slice(0, 15).map((authCase, index) => ({
    id: `access-${authCase.id}`,
    at: authCase.service.requestedDate + ' 10:00',
    actor: ['admin@prior-auth.local', 'manager@prior-auth.local', 'analyst@prior-auth.local'][index % 3],
    role: ['admin', 'manager', 'analyst'][index % 3],
    resource: `case:${authCase.caseNumber}`,
    action: index % 4 === 0 ? 'export_packet' : index % 3 === 0 ? 'edit_case' : 'view_case',
    ipAddress: '127.0.0.1',
    userAgent: 'local-smoke',
    outcome: 'Allowed',
    phiSafe: true,
  }));
}

async function seedPacketArtifacts(cases: PriorAuthCase[]): Promise<PacketArtifact[]> {
  await fs.mkdir(PACKET_DIR, { recursive: true });
  const targetCases = cases.slice(0, 15);
  return Promise.all(targetCases.map((authCase, index) => writePacketArtifact(authCase, index % 3 === 0 ? 'Appeal' : 'Initial submission')));
}

export async function writePacketArtifact(authCase: PriorAuthCase, packetType: PacketArtifact['packetType'] = 'Initial submission'): Promise<PacketArtifact> {
  await fs.mkdir(PACKET_DIR, { recursive: true });
  const content = [
    'Prior Authorization Packet',
    `Case: ${authCase.caseNumber}`,
    `Patient: ${authCase.patient.name}`,
    `Payer: ${authCase.payer.name} / ${authCase.payer.plan}`,
    `Service: ${authCase.service.name}`,
    `Codes: ${[...authCase.service.cptCodes, ...authCase.service.hcpcsCodes, ...authCase.service.icd10Codes].join(', ')}`,
    `Documents: ${authCase.documents.map((item) => item.name).join(', ') || 'None'}`,
    `Evidence: ${authCase.evidence.map((item) => `${item.label} (${item.status})`).join(', ') || 'None'}`,
  ].join('\n');
  const pdf = simplePdf(content);
  const fileName = `${authCase.caseNumber}-${packetType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
  const storagePath = fileName;
  await fs.writeFile(path.join(PACKET_DIR, storagePath), pdf);
  return {
    id: `packet-${authCase.id}-${packetType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    caseNumber: authCase.caseNumber,
    patientSafeLabel: authCase.caseNumber,
    packetType,
    format: 'PDF',
    status: 'Generated',
    fileName,
    storagePath,
    generatedAt: now(),
    checksum: packetChecksum(content),
    summary: `Generated ${packetType.toLowerCase()} packet for ${authCase.caseNumber}.`,
  };
}

export async function getProductionReadiness(): Promise<ProductionReadinessSnapshot> {
  await ensureStore();
  return {
    integrations: await listPgPayloads<ProductionIntegration>('prior_auth_integrations'),
    notificationOutbox: await listPgPayloads<NotificationOutboxItem>('prior_auth_notification_outbox'),
    packetArtifacts: await listPgPayloads<PacketArtifact>('prior_auth_packet_artifacts'),
    accessLogs: await listPgPayloads<AccessLogEntry>('prior_auth_access_logs'),
    authControls: await listPgPayloads<AuthControl>('prior_auth_auth_controls'),
    deploymentChecklist: await listPgPayloads<DeploymentChecklistItem>('prior_auth_deployment_checklist'),
  };
}

export async function saveIntegrations(items: ProductionIntegration[]) {
  await ensureStore();
  await replacePgPayloads('prior_auth_integrations', items);
}

export async function queueNotification(item: Omit<NotificationOutboxItem, 'id' | 'createdAt' | 'attempts' | 'status'>) {
  await ensureStore();
  const record: NotificationOutboxItem = {
    ...item,
    id: `outbox-${Date.now()}`,
    status: 'Queued',
    attempts: 0,
    createdAt: now(),
  };
  await upsertPgPayload('prior_auth_notification_outbox', record);
  return record;
}

export async function dispatchNotificationOutbox() {
  await ensureStore();
  const items = await listPgPayloads<NotificationOutboxItem>('prior_auth_notification_outbox');
  const dispatched = items.map((item) => {
    if (item.status !== 'Queued') return item;
    const canDeliver = item.channel === 'In-app' || process.env.NOTIFICATION_PROVIDER_CONFIGURED === 'true';
    return {
      ...item,
      status: canDeliver ? 'Sent' as const : 'Failed' as const,
      attempts: item.attempts + 1,
      lastError: canDeliver ? undefined : 'Notification provider is not configured for external delivery.',
    };
  });
  await replacePgPayloads('prior_auth_notification_outbox', dispatched);
  return dispatched;
}

export async function savePacketArtifact(item: PacketArtifact) {
  await ensureStore();
  await upsertPgPayload('prior_auth_packet_artifacts', item);
  return item;
}

export async function appendAccessLog(user: SessionUser, resource: string, action: string, requestMeta: { ipAddress: string; userAgent: string; outcome?: AccessLogEntry['outcome'] }) {
  await ensureStore();
  const entry: AccessLogEntry = {
    id: `access-${Date.now()}`,
    at: now(),
    actor: user.email,
    role: user.role,
    resource,
    action,
    ipAddress: requestMeta.ipAddress,
    userAgent: requestMeta.userAgent,
    outcome: requestMeta.outcome || 'Allowed',
    phiSafe: true,
  };
  await upsertPgPayload('prior_auth_access_logs', entry);
  return entry;
}

export async function saveAuthControls(items: AuthControl[]) {
  await ensureStore();
  await replacePgPayloads('prior_auth_auth_controls', items);
}

export async function saveDeploymentChecklist(items: DeploymentChecklistItem[]) {
  await ensureStore();
  await replacePgPayloads('prior_auth_deployment_checklist', items);
}

export async function readPacketArtifact(id: string) {
  await ensureStore();
  const artifacts = await listPgPayloads<PacketArtifact>('prior_auth_packet_artifacts');
  const artifact = artifacts.find((item) => item.id === id);
  if (!artifact) return null;
  const bytes = await fs.readFile(path.join(PACKET_DIR, artifact.storagePath));
  return { artifact, bytes };
}
