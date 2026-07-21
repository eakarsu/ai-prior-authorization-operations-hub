'use strict';

const crypto = require('crypto');

const states = Object.freeze({
  intake: ['evidence_review', 'cancelled'],
  evidence_review: ['clinical_review', 'needs_information', 'cancelled'],
  needs_information: ['evidence_review', 'cancelled'],
  clinical_review: ['submission_ready', 'needs_information', 'denied_internal'],
  submission_ready: ['submission_queued'],
  submission_queued: ['submitted', 'payer_error'],
  submitted: ['approved', 'denied', 'payer_error'],
  payer_error: ['submission_queued', 'cancelled'],
  denied: ['appeal_review', 'closed'],
  appeal_review: ['appeal_ready', 'closed'],
  appeal_ready: ['appeal_queued'],
  appeal_queued: ['appealed', 'payer_error'],
  appealed: ['approved', 'denied', 'payer_error'],
  approved: ['closed'],
  denied_internal: [], cancelled: [], closed: [],
});
const grants = Object.freeze({
  analyst: new Set(['intake:evidence_review', 'needs_information:evidence_review', 'submission_ready:submission_queued', 'payer_error:submission_queued', 'denied:appeal_review', 'appeal_ready:appeal_queued']),
  clinician: new Set(['evidence_review:clinical_review', 'clinical_review:submission_ready', 'clinical_review:needs_information', 'clinical_review:denied_internal', 'appeal_review:appeal_ready']),
  manager: new Set(['evidence_review:needs_information', 'intake:cancelled', 'evidence_review:cancelled', 'needs_information:cancelled', 'payer_error:cancelled', 'approved:closed', 'denied:closed', 'appeal_review:closed']),
  admin: new Set(['*']),
  provider: new Set(['submission_queued:submitted', 'submission_queued:payer_error', 'submitted:approved', 'submitted:denied', 'submitted:payer_error', 'appeal_queued:appealed', 'appeal_queued:payer_error', 'appealed:approved', 'appealed:denied', 'appealed:payer_error']),
});
const providerOperations = Object.freeze({
  payer_api: Object.freeze({ submit_authorization: ['caseRef', 'payerRef', 'procedureCode', 'diagnosisCode', 'evidenceDigests'], submit_appeal: ['caseRef', 'payerRef', 'denialReceipt', 'evidenceDigests'], poll_status: ['caseRef', 'payerReceipt'] }),
  fhir: Object.freeze({ fetch_evidence: ['caseRef', 'subjectRef', 'resourceTypes'] }),
  document_store: Object.freeze({ create_packet: ['caseRef', 'packetKind', 'evidenceDigests'] }),
  messaging: Object.freeze({ send_case_update: ['caseRef', 'recipientRef', 'template'] }),
});

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const digest = (value) => crypto.createHash('sha256').update(canonical(value)).digest('hex');
const clean = (value, name, max = 256) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${name} required`);
  return value.trim();
};
const array = (value, name, max = 100) => {
  if (!Array.isArray(value) || value.length > max) throw new Error(`${name} must be an array with at most ${max} items`);
  return value;
};
function noCredentials(value) { if (/password|secret|token|api.?key|authorization/i.test(canonical(value))) throw new Error('credentials forbidden'); }

function intake(input) {
  noCredentials(input);
  const memberRef = clean(input?.memberRef, 'memberRef');
  const payerRef = clean(input?.payerRef, 'payerRef');
  const procedureCode = clean(input?.procedureCode, 'procedureCode', 16).toUpperCase();
  const diagnosisCode = clean(input?.diagnosisCode, 'diagnosisCode', 16).toUpperCase();
  const requestedBy = clean(input?.requestedBy, 'requestedBy');
  if (!/^[A-Z0-9]{4,7}$/.test(procedureCode)) throw new Error('procedureCode format invalid');
  if (!/^[A-TV-Z][0-9][0-9AB](?:\.?[A-Z0-9]{0,4})?$/.test(diagnosisCode)) throw new Error('diagnosisCode format invalid');
  if (!['standard', 'urgent'].includes(input?.urgency)) throw new Error('urgency must be standard or urgent');
  const dueAt = new Date(input?.dueAt);
  if (!Number.isFinite(dueAt.getTime())) throw new Error('dueAt required');
  const acceptanceCriteria = array(input?.acceptanceCriteria, 'acceptanceCriteria', 30).map((criterion) => ({
    code: clean(criterion?.code, 'criterion code', 80),
    description: clean(criterion?.description, 'criterion description', 500),
    required: criterion?.required !== false,
  }));
  if (!acceptanceCriteria.length || !acceptanceCriteria.some((criterion) => criterion.required)) throw new Error('at least one required acceptance criterion is required');
  return { memberRef, payerRef, procedureCode, diagnosisCode, requestedBy, urgency: input.urgency, dueAt: dueAt.toISOString(), acceptanceCriteria };
}

function transition(from, to, actor, ownerId) {
  if (!states[from]?.includes(to)) throw new Error(`invalid transition ${from} -> ${to}`);
  const allowed = grants[actor?.role];
  if (!allowed || (!allowed.has('*') && !allowed.has(`${from}:${to}`))) throw new Error('role cannot perform transition');
  if (['submission_ready', 'appeal_ready'].includes(to) && String(actor.id) === String(ownerId)) throw new Error('independent clinical reviewer required');
  return true;
}

function validateEvidence(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new Error('evidence required');
  const normalized = [];
  const invalidEvidenceIds = [];
  for (const raw of items) {
    try {
      const evidence = {
        id: clean(raw?.id, 'evidence id'),
        evidenceType: clean(raw?.evidenceType, 'evidence type', 80),
        evidenceCode: clean(raw?.evidenceCode, 'evidence code', 80),
        uri: clean(raw?.uri, 'evidence URI', 1000),
        sourceSystem: clean(raw?.sourceSystem, 'source system', 80),
        version: clean(raw?.version, 'source version', 80),
        effectiveAt: new Date(raw?.effectiveAt).toISOString(),
        contentDigest: clean(raw?.contentDigest, 'content digest', 64).toLowerCase(),
      };
      if (!['fhir', 'document_store'].includes(evidence.sourceSystem) || !/^(https:|urn:)/.test(evidence.uri) || !/^[a-f0-9]{64}$/.test(evidence.contentDigest)) throw new Error('invalid evidence contract');
      normalized.push(evidence);
    } catch { invalidEvidenceIds.push(String(raw?.id || 'unknown')); }
  }
  return { valid: invalidEvidenceIds.length === 0, invalidEvidenceIds, evidence: normalized };
}

function validatePolicy(input) {
  noCredentials(input);
  const rules = array(input?.rules, 'policy rules', 100).map((rule) => ({
    code: clean(rule?.code, 'rule code', 80),
    description: clean(rule?.description, 'rule description', 500),
    required: rule?.required !== false,
  }));
  if (!rules.length) throw new Error('policy rules required');
  const effectiveAt = new Date(input?.effectiveAt);
  if (!Number.isFinite(effectiveAt.getTime())) throw new Error('policy effectiveAt required');
  const sourceUri = clean(input?.sourceUri, 'policy source URI', 1000);
  if (!/^(https:|urn:)/.test(sourceUri)) throw new Error('policy source URI must use HTTPS or URN');
  return { payerRef: clean(input?.payerRef, 'payerRef'), procedureCode: clean(input?.procedureCode, 'procedureCode', 16).toUpperCase(), version: clean(input?.version, 'policy version', 80), sourceUri, effectiveAt: effectiveAt.toISOString(), rules };
}

function coverageDecision(input) {
  const evidence = array(input?.evidence, 'evidence');
  const policy = validatePolicy(input?.policy);
  const criteria = array(input?.acceptanceCriteria, 'acceptance criteria', 30);
  const availableCodes = new Set(evidence.map((item) => item.evidenceCode));
  const missing = [];
  for (const rule of policy.rules) if (rule.required && !availableCodes.has(rule.code)) missing.push(rule.code);
  for (const criterion of criteria) if (criterion.required && !availableCodes.has(criterion.code)) missing.push(criterion.code);
  const confidence = Number(input?.confidence);
  const minimumConfidence = Number(input?.minimumConfidence);
  const uncertain = !Number.isFinite(confidence) || !Number.isFinite(minimumConfidence) || confidence < minimumConfidence;
  return { releaseable: false, status: missing.length || uncertain ? 'needs_information' : 'clinical_review_required', missing: [...new Set(missing)], uncertain, requiresHuman: true, policyVersion: policy.version };
}

function providerJob(provider, operation, payload, key) {
  const schema = providerOperations[provider]?.[operation];
  if (!schema) throw new Error('unsupported provider operation');
  clean(key, 'idempotency key');
  noCredentials(payload);
  const supplied = Object.keys(payload || {}).sort();
  const expected = [...schema].sort();
  if (canonical(supplied) !== canonical(expected)) throw new Error(`payload fields must be exactly: ${expected.join(', ')}`);
  for (const field of expected) if (payload[field] === undefined || payload[field] === null || payload[field] === '') throw new Error(`provider payload ${field} required`);
  if (['submit_authorization', 'submit_appeal', 'create_packet'].includes(operation) && (!Array.isArray(payload.evidenceDigests) || payload.evidenceDigests.some((item) => !/^[a-f0-9]{64}$/.test(item)))) throw new Error('evidence digests invalid');
  return { provider, operation, payload, idempotencyKey: key, payloadDigest: digest(payload), status: 'pending', attempts: 0 };
}

function retry(attempts, retryable, max = 5) {
  const next = attempts + 1;
  return !retryable || next >= max ? { status: 'dead_letter', attempts: next } : { status: 'retry', attempts: next, delaySeconds: Math.min(900, 2 ** next + (next * 3)) };
}
function sign(secret, event) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('secret too short');
  return crypto.createHmac('sha256', secret).update(canonical(event)).digest('hex');
}
function verify(secret, event, signature) {
  if (typeof secret !== 'string' || secret.length < 32 || !/^[a-f0-9]{64}$/i.test(signature || '')) return false;
  const expected = Buffer.from(sign(secret, event), 'hex');
  const supplied = Buffer.from(signature, 'hex');
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}
function providerTransition(status, eventType) {
  const map = {
    'submission_queued:accepted': 'submitted', 'submission_queued:error': 'payer_error',
    'submitted:approved': 'approved', 'submitted:denied': 'denied', 'submitted:error': 'payer_error',
    'appeal_queued:accepted': 'appealed', 'appeal_queued:error': 'payer_error',
    'appealed:approved': 'approved', 'appealed:denied': 'denied', 'appealed:error': 'payer_error',
  };
  const next = map[`${status}:${eventType}`];
  if (!next) throw new Error('provider event is invalid for current status');
  return next;
}

function keyFromHex(hex) { const key = Buffer.from(String(hex || ''), 'hex'); if (key.length !== 32) throw new Error('data encryption key must be 32-byte hex'); return key; }
function encrypt(value, keyHex, keyVersion, aad) {
  if (!keyVersion) throw new Error('key version required');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFromHex(keyHex), iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { algorithm: 'aes-256-gcm', keyVersion, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
}
function decrypt(envelope, keyHex, aad) {
  if (envelope?.algorithm !== 'aes-256-gcm') throw new Error('unsupported encryption algorithm');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFromHex(keyHex), Buffer.from(envelope.iv, 'base64'));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
}

module.exports = { states, providerOperations, canonical, digest, intake, transition, validateEvidence, validatePolicy, coverageDecision, providerJob, retry, sign, verify, providerTransition, encrypt, decrypt };
