'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const learning = require('./postAcuteLearning.cjs');

test('validates a human-verified post-acute outcome', () => {
  const value = learning.validateOutcome({
    outcome: 'approved_appeal', decisionStage: 'first_level_appeal', denialCategory: 'insufficient_documentation',
    evidenceCodes: ['PAC-FUNCTION', 'PAC-CAREPLAN', 'PAC-FUNCTION'], requestedUnits: 14, authorizedUnits: 14,
    turnaroundHours: 53.5, careDelayHours: 22, revenueAtRisk: 16800, recoveredRevenue: 16800,
    rationale: 'The human reviewer confirmed the appeal supplied the missing functional assessment.',
    decidedAt: '2026-08-01T14:00:00.000Z',
  });
  assert.equal(value.outcome, 'approved_appeal');
  assert.deepEqual(value.evidenceCodes, ['PAC-FUNCTION', 'PAC-CAREPLAN']);
  assert.equal(value.recoveredRevenue, 16800);
});

test('rejects impossible units and unsupported outcomes', () => {
  const base = { outcome: 'approved_initial', decisionStage: 'initial', evidenceCodes: [], requestedUnits: 5, authorizedUnits: 6, turnaroundHours: 2, careDelayHours: 0, revenueAtRisk: 0, recoveredRevenue: 0, rationale: 'Human reviewer documented the payer response and final result.', decidedAt: '2026-08-01T14:00:00.000Z' };
  assert.throws(() => learning.validateOutcome(base), /cannot exceed/);
  assert.throws(() => learning.validateOutcome({ ...base, authorizedUnits: 5, outcome: 'auto_approved' }), /outcome invalid/);
});

test('calculates evidence completeness and deadline risk deterministically', () => {
  const result = learning.readiness({
    dueAt: new Date(Date.now() + 10 * 3600000).toISOString(),
    acceptanceCriteria: [{ code: 'A', required: true }, { code: 'B', required: true }, { code: 'C', required: false }],
  }, [{ evidence_code: 'A' }]);
  assert.equal(result.requiredCount, 2);
  assert.equal(result.presentCount, 1);
  assert.equal(result.completeness, 50);
  assert.deepEqual(result.missingCodes, ['B']);
  assert.equal(result.deadlineRisk, 'high');
});

test('restricts AI review actions to explicit decision-support workflows', () => {
  assert.equal(learning.validateReviewType('appeal_draft'), 'appeal_draft');
  assert.throws(() => learning.validateReviewType('automatic_denial'), /reviewType invalid/);
});
