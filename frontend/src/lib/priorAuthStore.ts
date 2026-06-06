import { appendAuditEntry } from '@/lib/auditStore';
import {
  buildWorkspacePayload,
  scrubAuditText,
  seedPriorAuthCases,
  seedPriorAuthSubFeatureRows,
  type PriorAuthCase,
  type PriorAuthSubFeatureSeedRow,
  type PriorAuthWorkspacePayload,
} from '@/lib/priorAuth';
import { ensureListSeed, listPgPayloads, replacePgPayloads, upsertPgPayload } from '@/lib/postgres';

async function ensureStore() {
  await ensureListSeed('prior_auth_cases', seedPriorAuthCases, 'prior-auth-cases.json');
  await ensureListSeed('prior_auth_subfeature_rows', seedPriorAuthSubFeatureRows, 'prior-auth-subfeature-rows.json');
}

export async function getPriorAuthCases(): Promise<PriorAuthCase[]> {
  await ensureStore();
  const cases = await listPgPayloads<PriorAuthCase>('prior_auth_cases');
  return cases.sort((a, b) => a.caseNumber.localeCompare(b.caseNumber));
}

export async function getPriorAuthWorkspace(): Promise<PriorAuthWorkspacePayload> {
  const cases = await getPriorAuthCases();
  const subfeatureRows = await listPgPayloads<PriorAuthSubFeatureSeedRow>('prior_auth_subfeature_rows');
  return buildWorkspacePayload(cases, subfeatureRows);
}

export async function savePriorAuthCases(cases: PriorAuthCase[], actor = 'System') {
  await ensureStore();
  await replacePgPayloads('prior_auth_cases', cases);
  await appendAuditEntry('Prior Authorization', scrubAuditText(actor + ' updated prior authorization case set'));
}

export async function upsertPriorAuthCase(authCase: PriorAuthCase, actor = 'System') {
  await ensureStore();
  await upsertPgPayload('prior_auth_cases', authCase);
  await appendAuditEntry('Prior Authorization', scrubAuditText(actor + ' saved case ' + authCase.caseNumber));
}

export async function resetPriorAuthCases() {
  await ensureStore();
  await replacePgPayloads('prior_auth_cases', seedPriorAuthCases);
  await replacePgPayloads('prior_auth_subfeature_rows', seedPriorAuthSubFeatureRows);
  await appendAuditEntry('Prior Authorization', 'Prior authorization cases reset to defaults');
  return buildWorkspacePayload(seedPriorAuthCases, seedPriorAuthSubFeatureRows);
}
