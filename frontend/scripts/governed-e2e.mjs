import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import bcrypt from 'bcrypt';
import pg from 'pg';

if (!process.env.TEST_DATABASE_URL) { console.log('governed e2e skipped: TEST_DATABASE_URL is not set'); process.exit(0); }
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const require = createRequire(import.meta.url);
const governance = require('../../governance/priorAuthorization.cjs');
const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
await pool.query('TRUNCATE prior_auth_provider_events,prior_auth_provider_outbox,prior_auth_access_events,prior_auth_workflow_events,prior_auth_evidence,governed_prior_auth_cases,prior_auth_policy_rules,prior_auth_identities RESTART IDENTITY CASCADE');
const passwordHash = await bcrypt.hash('correct horse battery staple', 4);
for (const identity of [
  ['admin', 'tenant-a', 'admin@example.test', 'Admin', 'User', 'admin'],
  ['analyst', 'tenant-a', 'analyst@example.test', 'Case', 'Analyst', 'analyst'],
  ['clinician', 'tenant-a', 'clinician@example.test', 'Clinical', 'Reviewer', 'clinician'],
  ['manager', 'tenant-a', 'manager@example.test', 'Ops', 'Manager', 'manager'],
  ['other', 'tenant-b', 'other@example.test', 'Other', 'Tenant', 'analyst'],
]) await pool.query('INSERT INTO prior_auth_identities(id,tenant_id,email,password_hash,first_name,last_name,role) VALUES($1,$2,$3,$4,$5,$6,$7)', [...identity.slice(0, 3), passwordHash, ...identity.slice(3)]);

const port = Number(process.env.TEST_API_PORT || 0) || await new Promise((resolve) => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const address = server.address(); server.close(() => resolve(address.port)); }); });
const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], { cwd: new URL('..', import.meta.url), env: { ...process.env, NODE_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = ''; app.stdout.on('data', (chunk) => { logs += chunk; }); app.stderr.on('data', (chunk) => { logs += chunk; });
const base = `http://127.0.0.1:${port}`;
for (let attempt = 0; attempt < 80; attempt++) { try { const response = await fetch(`${base}/login`); if (response.ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 100)); if (attempt === 79) throw new Error(`Next server did not start: ${logs}`); }

async function request(path, { cookie, method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, { method, redirect: 'manual', headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const json = await response.json().catch(() => ({})); return { status: response.status, body: json, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function login(email, tenantId = 'tenant-a') { const result = await request('/api/auth/login', { method: 'POST', body: { tenantId, email, password: 'correct horse battery staple' } }); assert.equal(result.status, 200, JSON.stringify(result.body)); return result.cookie; }

try {
  const admin = await login('admin@example.test'), analyst = await login('analyst@example.test'), clinician = await login('clinician@example.test'), other = await login('other@example.test', 'tenant-b');
  const policy = await request('/api/governed/prior-auth', { cookie: admin, method: 'PUT', body: { payerRef: 'payer1', procedureCode: '70553', version: '2026.07', sourceUri: 'https://payer.example/policy/70553', effectiveAt: '2026-07-01T00:00:00Z', rules: [{ code: 'MRI_NOTE', description: 'Recent clinical note', required: true }] } }); assert.equal(policy.status, 201, JSON.stringify(policy.body));
  const input = { memberRef: 'member-sensitive-1', payerRef: 'payer1', procedureCode: '70553', diagnosisCode: 'G43.0', requestedBy: 'npi-123', urgency: 'standard', dueAt: '2026-07-25T00:00:00Z', acceptanceCriteria: [{ code: 'MRI_NOTE', description: 'Recent clinical note', required: true }] };
  const created = await request('/api/governed/prior-auth', { cookie: analyst, method: 'POST', headers: { 'idempotency-key': 'e2e-intake-1' }, body: input }); assert.equal(created.status, 201, JSON.stringify(created.body)); const caseId = created.body.case.id;
  const idempotent = await request('/api/governed/prior-auth', { cookie: analyst, method: 'POST', headers: { 'idempotency-key': 'e2e-intake-1' }, body: input }); assert.equal(idempotent.status, 200);
  const conflict = await request('/api/governed/prior-auth', { cookie: analyst, method: 'POST', headers: { 'idempotency-key': 'e2e-intake-1' }, body: { ...input, memberRef: 'other' } }); assert.equal(conflict.status, 409);
  const forbiddenCreate = await request('/api/governed/prior-auth', { cookie: clinician, method: 'POST', headers: { 'idempotency-key': 'forbidden' }, body: input }); assert.equal(forbiddenCreate.status, 403);
  let version = created.body.case.version;
  const move = async (cookie, toStatus, attestation = false) => { const result = await request('/api/governed/prior-auth', { cookie, method: 'PATCH', body: { caseId, expectedVersion: version, toStatus, reason: 'Reviewed complete case workflow evidence.', attestation } }); if (result.body.case) version = result.body.case.version; return result; };
  assert.equal((await move(analyst, 'evidence_review')).status, 200);
  const attached = await request('/api/governed/prior-auth/evidence', { cookie: analyst, method: 'POST', body: { caseId, evidence: { evidenceType: 'clinical_note', evidenceCode: 'MRI_NOTE', uri: 'https://ehr.example/fhir/DocumentReference/e1', sourceSystem: 'fhir', version: 'R4', effectiveAt: '2026-07-18T00:00:00Z', contentDigest: 'ab'.repeat(32) } } }); assert.equal(attached.status, 201, JSON.stringify(attached.body));
  assert.equal((await move(clinician, 'clinical_review')).status, 200);
  const wrongRole = await move(analyst, 'submission_ready', true); assert.equal(wrongRole.status, 403);
  assert.equal((await move(clinician, 'submission_ready', true)).status, 200);
  assert.equal((await move(analyst, 'submission_queued')).status, 200);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM prior_auth_provider_outbox WHERE case_id=$1 AND status='pending'", [caseId])).rows[0].count, 1);
  const unauthorizedDispatch = await request('/api/governed/prior-auth/outbox/dispatch', { method: 'POST', body: {} }); assert.equal(unauthorizedDispatch.status, 401);
  const failedDispatch = await request('/api/governed/prior-auth/outbox/dispatch', { method: 'POST', headers: { authorization: `Bearer ${process.env.PROVIDER_WORKER_SECRET}` }, body: {} }); assert.equal(failedDispatch.body.status, 'dead_letter');
  const event = { provider: 'payer_api', eventId: 'evt-accepted', tenantId: 'tenant-a', caseId, eventAt: '2026-07-19T12:00:00Z', type: 'accepted', receipt: 'payer-receipt-1' };
  const accepted = await request('/api/governed/prior-auth/provider-events', { method: 'POST', headers: { 'x-provider-signature': governance.sign(process.env.PAYER_WEBHOOK_SECRET, event) }, body: event }); assert.equal(accepted.body.caseStatus, 'submitted', JSON.stringify(accepted.body));
  const duplicate = await request('/api/governed/prior-auth/provider-events', { method: 'POST', headers: { 'x-provider-signature': governance.sign(process.env.PAYER_WEBHOOK_SECRET, event) }, body: event }); assert.equal(duplicate.body.status, 'duplicate');
  const approvedEvent = { ...event, eventId: 'evt-approved', eventAt: '2026-07-19T12:01:00Z', type: 'approved', receipt: 'payer-decision-1' };
  const approved = await request('/api/governed/prior-auth/provider-events', { method: 'POST', headers: { 'x-provider-signature': governance.sign(process.env.PAYER_WEBHOOK_SECRET, approvedEvent) }, body: approvedEvent }); assert.equal(approved.body.caseStatus, 'approved', JSON.stringify(approved.body));
  const isolated = await request('/api/governed/prior-auth', { cookie: other }); assert.deepEqual(isolated.body.cases, []);
  const detail = await request(`/api/governed/prior-auth?id=${caseId}`, { cookie: analyst }); assert.equal(detail.body.case.payload.memberRef, 'member-sensitive-1'); assert.equal(detail.body.events.length >= 7, true);
  await assert.rejects(pool.query("UPDATE prior_auth_workflow_events SET reason='tampered' WHERE case_id=$1", [caseId]), /append-only/);
  const legacy = await request('/api/prior-auth/cases', { cookie: analyst }); assert.equal(legacy.status, 404);
  console.log('governed prior authorization e2e passed');
} finally {
  app.kill('SIGTERM');
  await new Promise((resolve) => { app.once('exit', resolve); setTimeout(resolve, 3000); });
  await pool.end();
}
