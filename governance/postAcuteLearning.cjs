'use strict';

const OUTCOMES = new Set(['approved_initial', 'approved_appeal', 'partially_approved', 'upheld', 'withdrawn']);
const STAGES = new Set(['initial', 'peer_to_peer', 'first_level_appeal', 'second_level_appeal', 'external_review']);
const REVIEW_TYPES = new Set(['evidence_gap', 'appeal_draft', 'peer_review_brief']);

function text(value, name, max = 2000, minimum = 1) {
  if (typeof value !== 'string' || value.trim().length < minimum || value.trim().length > max) throw new Error(`${name} required`);
  return value.trim();
}

function integer(value, name, minimum = 0) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < minimum) throw new Error(`${name} must be an integer of at least ${minimum}`);
  return normalized;
}

function money(value, name) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 9999999999) throw new Error(`${name} must be a non-negative amount`);
  return Math.round(normalized * 100) / 100;
}

function validateOutcome(input) {
  const outcome = text(input?.outcome, 'outcome', 40);
  const decisionStage = text(input?.decisionStage, 'decisionStage', 40);
  if (!OUTCOMES.has(outcome)) throw new Error('outcome invalid');
  if (!STAGES.has(decisionStage)) throw new Error('decisionStage invalid');
  const decidedAt = new Date(input?.decidedAt);
  if (!Number.isFinite(decidedAt.getTime())) throw new Error('decidedAt required');
  const evidenceCodes = Array.isArray(input?.evidenceCodes)
    ? [...new Set(input.evidenceCodes.map((item) => text(item, 'evidence code', 80)))].slice(0, 100)
    : [];
  const requestedUnits = integer(input?.requestedUnits, 'requestedUnits', 1);
  const authorizedUnits = integer(input?.authorizedUnits, 'authorizedUnits', 0);
  if (authorizedUnits > requestedUnits) throw new Error('authorizedUnits cannot exceed requestedUnits');
  return {
    outcome, decisionStage, evidenceCodes, requestedUnits, authorizedUnits,
    denialCategory: input?.denialCategory ? text(input.denialCategory, 'denialCategory', 100) : null,
    turnaroundHours: money(input?.turnaroundHours, 'turnaroundHours'),
    careDelayHours: integer(input?.careDelayHours ?? 0, 'careDelayHours', 0),
    revenueAtRisk: money(input?.revenueAtRisk ?? 0, 'revenueAtRisk'),
    recoveredRevenue: money(input?.recoveredRevenue ?? 0, 'recoveredRevenue'),
    rationale: text(input?.rationale, 'rationale', 4000, 12),
    decidedAt: decidedAt.toISOString(),
  };
}

function validateReviewType(value) {
  const reviewType = text(value, 'reviewType', 40);
  if (!REVIEW_TYPES.has(reviewType)) throw new Error('reviewType invalid');
  return reviewType;
}

function readiness(caseRecord, evidence) {
  const required = (caseRecord.acceptanceCriteria || []).filter((criterion) => criterion.required !== false);
  const available = new Set((evidence || []).map((item) => item.evidence_code || item.evidenceCode));
  const missing = required.filter((criterion) => !available.has(criterion.code));
  const dueAt = new Date(caseRecord.dueAt || caseRecord.due_at).getTime();
  const hoursRemaining = Number.isFinite(dueAt) ? Math.round((dueAt - Date.now()) / 360000) / 10 : null;
  return {
    requiredCount: required.length,
    presentCount: required.length - missing.length,
    completeness: required.length ? Math.round(100 * (required.length - missing.length) / required.length) : 100,
    missingCodes: missing.map((criterion) => criterion.code),
    hoursRemaining,
    deadlineRisk: hoursRemaining !== null && hoursRemaining < 24 ? 'high' : hoursRemaining !== null && hoursRemaining < 72 ? 'moderate' : 'low',
  };
}

module.exports = { OUTCOMES, STAGES, REVIEW_TYPES, validateOutcome, validateReviewType, readiness };
