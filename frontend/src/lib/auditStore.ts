import { ensureListSeed, listPgPayloads, upsertPgPayload } from '@/lib/postgres';
export type AuditEntry = { id: string; at: string; area: string; action: string };
const seedAudit: AuditEntry[] = [
  { id: 'audit-seed-1', at: '2026-06-06 08:15', area: 'Authorization Intake', action: 'Intake queue created with PHI-safe audit logging' },
  { id: 'audit-seed-2', at: '2026-06-06 09:10', area: 'Evidence Checklist', action: 'Evidence review assigned without patient identifiers' },
  { id: 'audit-seed-3', at: '2026-06-06 11:40', area: 'SLA Tracking', action: 'Urgent authorization escalation evaluated' },
];
async function ensureStore() { await ensureListSeed('audit_log', seedAudit, 'audit-log.json') }
export async function getAuditEntries(): Promise<AuditEntry[]> { await ensureStore(); return listPgPayloads<AuditEntry>('audit_log') }
export async function appendAuditEntry(area: string, action: string) { await ensureStore(); await upsertPgPayload('audit_log', { id: `audit-${Date.now()}`, at: new Date().toLocaleString(), area, action }) }
