import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { correlationId, errorResponse, workflowEvent } from '@/lib/governedPriorAuth';
import { postAcuteLearning } from '@/lib/postAcuteLearning';
import { getGovernedPostgres } from '@/lib/postgres';
import { requireSession } from '@/lib/requestAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = requireSession(request); if (user instanceof NextResponse) return user;
  const caseId = request.nextUrl.searchParams.get('caseId');
  if (!caseId) return NextResponse.json({ error: 'caseId required' }, { status: 400 });
  const result = await getGovernedPostgres().query(
    `SELECT id,outcome,decision_stage,denial_category,evidence_codes,requested_units,authorized_units,
      turnaround_hours,care_delay_hours,revenue_at_risk,recovered_revenue,rationale,human_verified_by,decided_at,created_at
     FROM prior_auth_case_outcomes WHERE tenant_id=$1 AND case_id=$2 ORDER BY decided_at DESC`,
    [user.tenantId, caseId],
  );
  return NextResponse.json({ outcomes: result.rows });
}

export async function POST(request: NextRequest) {
  const user = requireSession(request); if (user instanceof NextResponse) return user;
  if (!['clinician', 'manager', 'admin'].includes(user.role)) return NextResponse.json({ error: 'clinical reviewer or manager role required' }, { status: 403 });
  const correlation = correlationId(request.headers);
  const client = await getGovernedPostgres().connect();
  try {
    const body = await request.json();
    const caseId = String(body?.caseId || '');
    if (!caseId) throw new Error('caseId required');
    const outcome = postAcuteLearning.validateOutcome(body);
    await client.query('BEGIN');
    const authCase = await client.query('SELECT * FROM governed_prior_auth_cases WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [caseId, user.tenantId]);
    if (!authCase.rows[0]) throw new Error('case not found');
    const id = crypto.randomUUID();
    await client.query(
      `INSERT INTO prior_auth_case_outcomes(
        id,tenant_id,case_id,outcome,decision_stage,denial_category,evidence_codes,requested_units,authorized_units,
        turnaround_hours,care_delay_hours,revenue_at_risk,recovered_revenue,rationale,human_verified_by,decided_at
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [id, user.tenantId, caseId, outcome.outcome, outcome.decisionStage, outcome.denialCategory, JSON.stringify(outcome.evidenceCodes),
        outcome.requestedUnits, outcome.authorizedUnits, outcome.turnaroundHours, outcome.careDelayHours,
        outcome.revenueAtRisk, outcome.recoveredRevenue, outcome.rationale, user.id, outcome.decidedAt],
    );
    await client.query(
      `UPDATE governed_prior_auth_cases SET authorized_units=$1,denial_category=$2,appeal_outcome=$3,decision_at=$4,
        estimated_revenue_at_risk=$5,recovered_revenue=$6,care_delay_hours=$7,version=version+1,updated_at=NOW()
       WHERE id=$8 AND tenant_id=$9`,
      [outcome.authorizedUnits, outcome.denialCategory, outcome.outcome, outcome.decidedAt, outcome.revenueAtRisk,
        outcome.recoveredRevenue, outcome.careDelayHours, caseId, user.tenantId],
    );
    await workflowEvent(client, user, caseId, correlation, { type: 'human_outcome_recorded', from: authCase.rows[0].status, to: authCase.rows[0].status, reason: outcome.rationale, details: { outcomeId: id, outcome: outcome.outcome, decisionStage: outcome.decisionStage } });
    await client.query('COMMIT');
    return NextResponse.json({ id, outcome }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    const failure = errorResponse(error); return NextResponse.json({ error: failure.message }, { status: failure.status });
  } finally { client.release(); }
}
