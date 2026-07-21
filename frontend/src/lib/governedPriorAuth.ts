import crypto from 'crypto';
import type { PoolClient } from 'pg';
import type { SessionUser } from '@/lib/auth';

type Governance = {
  digest(value: unknown): string;
  intake(value: unknown): Record<string, any>;
  transition(from: string, to: string, actor: { id: string; role: string }, ownerId: string): boolean;
  validateEvidence(items: unknown[]): { valid: boolean; invalidEvidenceIds: string[]; evidence: Array<Record<string, any>> };
  validatePolicy(value: unknown): Record<string, any>;
  coverageDecision(value: unknown): { missing: string[]; uncertain: boolean; policyVersion: string };
  providerJob(provider: string, operation: string, payload: unknown, key: string): Record<string, any>;
  retry(attempts: number, retryable: boolean): { status: string; attempts: number; delaySeconds?: number };
  verify(secret: string, event: unknown, signature: string): boolean;
  providerTransition(status: string, eventType: string): string;
  encrypt(value: unknown, key: string, version: string, aad: string): Record<string, string>;
  decrypt(envelope: unknown, key: string, aad: string): Record<string, any>;
};

export const governance = require('../../../governance/priorAuthorization.cjs') as Governance;

export function encryption(version?: string) {
  let keys: Record<string, string>;
  try { keys = JSON.parse(process.env.PRIOR_AUTH_DATA_KEYS_JSON || '{}'); } catch { throw new Error('prior authorization encryption is not configured'); }
  const keyVersion = version || process.env.PRIOR_AUTH_ACTIVE_KEY_VERSION;
  const key = keyVersion ? keys[keyVersion] : undefined;
  if (!keyVersion || !key || !/^[a-f0-9]{64}$/i.test(key)) throw new Error('prior authorization encryption is not configured');
  return { version: keyVersion, key };
}

export function correlationId(headers: Headers) {
  const supplied = headers.get('x-correlation-id') || '';
  return /^[A-Za-z0-9_-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
}

export async function workflowEvent(client: PoolClient, user: Pick<SessionUser, 'id' | 'tenantId' | 'role'>, caseId: string, correlation: string, event: { type: string; from?: string | null; to?: string | null; reason?: string | null; details?: unknown }) {
  await client.query('INSERT INTO prior_auth_workflow_events(tenant_id,case_id,event_type,from_status,to_status,actor_id,actor_role,reason,correlation_id,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [user.tenantId, caseId, event.type, event.from || null, event.to || null, user.id, user.role, event.reason || null, correlation, JSON.stringify(event.details || {})]);
}

export async function accessEvent(client: { query: PoolClient['query'] }, user: Pick<SessionUser, 'id' | 'tenantId' | 'role'>, correlation: string, action: string, outcome: string, caseId?: string | null, details: unknown = {}) {
  await client.query('INSERT INTO prior_auth_access_events(tenant_id,case_id,actor_id,actor_role,action,outcome,correlation_id,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [user.tenantId, caseId || null, user.id, user.role, action, outcome, correlation, JSON.stringify(details)]);
}

export function presentCase(row: Record<string, any>, includePayload = false) {
  let payload: Record<string, any> | undefined;
  if (includePayload) {
    const key = encryption(row.encryption_key_version);
    payload = governance.decrypt(row.payload_encrypted, key.key, `tenant:${row.tenant_id}:prior-auth-case:${row.id}`);
  }
  return {
    id: row.id, memberRefToken: row.member_ref_token, payerRef: row.payer_ref, procedureCode: row.procedure_code,
    diagnosisCode: row.diagnosis_code, requestedBy: row.requested_by, ownerId: row.owner_id,
    clinicalReviewerId: row.clinical_reviewer_id, status: row.status, version: row.version,
    urgency: row.urgency, dueAt: row.due_at, acceptanceCriteria: row.acceptance_criteria,
    policyVersion: row.policy_version, payerReceipt: row.payer_receipt, createdAt: row.created_at,
    updatedAt: row.updated_at, ...(payload ? { payload } : {}),
  };
}

export async function activePolicy(client: PoolClient, tenantId: string, payerRef: string, procedureCode: string) {
  const result = await client.query('SELECT * FROM prior_auth_policy_rules WHERE tenant_id=$1 AND payer_ref=$2 AND procedure_code=$3 AND effective_at<=NOW() ORDER BY effective_at DESC,created_at DESC LIMIT 1', [tenantId, payerRef, procedureCode]);
  if (!result.rows[0]) throw new Error('active versioned payer policy is required');
  const row = result.rows[0];
  return { payerRef: row.payer_ref, procedureCode: row.procedure_code, version: row.version, sourceUri: row.source_uri, effectiveAt: row.effective_at, rules: row.rules };
}

export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'request failed';
  const status = /not found/i.test(message) ? 404 : /conflict|current status|active versioned|missing evidence|criteria/i.test(message) ? 409 : /role|forbidden|independent/i.test(message) ? 403 : /required|invalid|must|forbidden|unsupported|format/i.test(message) ? 400 : 500;
  if (status === 500) console.error('governed prior authorization error', message);
  return { status, message: status === 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : message };
}
