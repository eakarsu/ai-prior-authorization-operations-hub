'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const priorAuth = require('./priorAuthorization.cjs');

const intake = { memberRef: 'm1', payerRef: 'payer1', procedureCode: '70553', diagnosisCode: 'G43.0', requestedBy: 'clinic1', urgency: 'standard', dueAt: '2026-07-25T00:00:00Z', acceptanceCriteria: [{ code: 'MRI_NOTE', description: 'Recent clinical note', required: true }] };
const policy = { payerRef: 'payer1', procedureCode: '70553', version: '2026.07', sourceUri: 'https://payer.example/policy/70553', effectiveAt: '2026-07-01T00:00:00Z', rules: [{ code: 'MRI_NOTE', description: 'Recent clinical note required', required: true }] };
const evidence = { id: 'e1', evidenceType: 'clinical_note', evidenceCode: 'MRI_NOTE', uri: 'https://ehr.example/fhir/DocumentReference/e1', sourceSystem: 'fhir', version: 'R4', effectiveAt: '2026-07-18T00:00:00Z', contentDigest: 'ab'.repeat(32) };

test('validates typed durable intake and acceptance criteria', () => {
  const result = priorAuth.intake(intake);
  assert.equal(result.procedureCode, '70553');
  assert.equal(result.acceptanceCriteria[0].required, true);
  assert.throws(() => priorAuth.intake({ ...intake, diagnosisCode: 'not icd' }), /format/);
});
test('rejects missing fields, unbounded criteria, and credential leakage', () => {
  assert.throws(() => priorAuth.intake({ ...intake, payerRef: '' }), /payerRef/);
  assert.throws(() => priorAuth.intake({ ...intake, apiToken: 'x' }), /credentials/);
  assert.throws(() => priorAuth.intake({ ...intake, acceptanceCriteria: [] }), /required acceptance/);
});
test('enforces lifecycle and human/provider role boundaries', () => {
  assert.equal(priorAuth.transition('intake', 'evidence_review', { id: 'a', role: 'analyst' }, 'a'), true);
  assert.throws(() => priorAuth.transition('submission_queued', 'submitted', { id: 'm', role: 'manager' }, 'a'), /role/);
  assert.equal(priorAuth.transition('submission_queued', 'submitted', { id: 'payer', role: 'provider' }, 'a'), true);
  assert.throws(() => priorAuth.transition('closed', 'intake', { id: 'x', role: 'admin' }, 'a'), /invalid/);
});
test('requires independent clinician review', () => assert.throws(() => priorAuth.transition('clinical_review', 'submission_ready', { id: 'c1', role: 'clinician' }, 'c1'), /independent/));
test('validates evidence URI, source, dates and SHA-256 provenance', () => {
  const result = priorAuth.validateEvidence([evidence]);
  assert.equal(result.valid, true);
  assert.equal(result.evidence[0].sourceSystem, 'fhir');
  assert.deepEqual(priorAuth.validateEvidence([{ ...evidence, contentDigest: 'abc' }]).invalidEvidenceIds, ['e1']);
});
test('evaluates policy and intake criteria without auto-release', () => {
  const complete = priorAuth.coverageDecision({ evidence: [evidence], policy, acceptanceCriteria: intake.acceptanceCriteria, confidence: 1, minimumConfidence: 1 });
  assert.equal(complete.releaseable, false);
  assert.deepEqual(complete.missing, []);
  const missing = priorAuth.coverageDecision({ evidence: [], policy, acceptanceCriteria: intake.acceptanceCriteria, confidence: 1, minimumConfidence: 1 });
  assert.deepEqual(missing.missing, ['MRI_NOTE']);
});
test('validates exact typed provider operations without credentials', () => {
  const payload = { caseRef: 'c1', payerRef: 'payer1', procedureCode: '70553', diagnosisCode: 'G43.0', evidenceDigests: ['ab'.repeat(32)] };
  assert.equal(priorAuth.providerJob('payer_api', 'submit_authorization', payload, 'c1:v1').status, 'pending');
  assert.throws(() => priorAuth.providerJob('payer_api', 'submit_authorization', { ...payload, token: 'x' }, 'c1:v2'), /credentials/);
  assert.throws(() => priorAuth.providerJob('payer_api', 'unknown', payload, 'c1:v3'), /unsupported/);
});
test('authenticates callbacks, maps ordered provider events, and bounds retries', () => {
  const secret = 'x'.repeat(32), event = { eventId: 'evt1' }, signature = priorAuth.sign(secret, event);
  assert.equal(priorAuth.verify(secret, event, signature), true);
  assert.equal(priorAuth.verify(secret, { eventId: 'evt2' }, signature), false);
  assert.equal(priorAuth.providerTransition('submitted', 'approved'), 'approved');
  assert.throws(() => priorAuth.providerTransition('intake', 'approved'), /invalid/);
  assert.equal(priorAuth.retry(4, true).status, 'dead_letter');
});
test('encrypts PHI with authenticated tenant and case context', () => {
  const key = '11'.repeat(32), envelope = priorAuth.encrypt({ memberRef: 'm1' }, key, 'v1', 'tenant:t1:case:c1');
  assert.deepEqual(priorAuth.decrypt(envelope, key, 'tenant:t1:case:c1'), { memberRef: 'm1' });
  assert.throws(() => priorAuth.decrypt(envelope, key, 'tenant:t2:case:c1'));
});
test('migration is additive, tenant-scoped, encrypted and append-only', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../frontend/migrations/001_governed_prior_auth.sql'), 'utf8');
  for (const term of ['prior_auth_identities', 'tenant_id', 'payload_encrypted', 'prior_auth_policy_rules', 'immutable_prior_auth_event', 'idempotency_key', 'provider_receipt', 'lease_until', 'prior_auth_access_events']) assert.match(sql, new RegExp(term));
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE/i);
});
test('launcher is explicit and non-destructive', () => {
  const script = fs.readFileSync(path.join(__dirname, '../start.sh'), 'utf8');
  assert.match(script, /check\|migrate\|start/);
  assert.doesNotMatch(script, /kill -9|npm install|seed|createdb/);
});
