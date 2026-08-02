import { NextRequest, NextResponse } from 'next/server';
import { accessEvent, correlationId, errorResponse } from '@/lib/governedPriorAuth';
import { getGovernedPostgres } from '@/lib/postgres';
import { requireSession } from '@/lib/requestAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = requireSession(request); if (user instanceof NextResponse) return user;
  const correlation = correlationId(request.headers);
  try {
    const db = getGovernedPostgres();
    const [metrics, learning, deadlines] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int AS total_cases,
          COUNT(*) FILTER (WHERE status NOT IN ('approved','closed','cancelled'))::int AS open_cases,
          COUNT(*) FILTER (WHERE urgency='urgent' AND status NOT IN ('approved','closed','cancelled'))::int AS urgent_cases,
          COUNT(*) FILTER (WHERE due_at < NOW() + INTERVAL '24 hours' AND status NOT IN ('approved','closed','cancelled'))::int AS deadline_risk,
          COALESCE(SUM(estimated_revenue_at_risk),0)::float8 AS revenue_at_risk,
          COALESCE(SUM(recovered_revenue),0)::float8 AS recovered_revenue,
          COALESCE(AVG(care_delay_hours) FILTER (WHERE care_delay_hours > 0),0)::float8 AS average_care_delay_hours
         FROM governed_prior_auth_cases WHERE tenant_id=$1 AND service_line IS NOT NULL`, [user.tenantId]),
      db.query(
        `SELECT payer_ref,procedure_code,service_line,denial_category,decision_count,approval_count,appeal_count,
          overturned_count,approval_rate,overturn_rate,average_turnaround_hours,revenue_at_risk,recovered_revenue,average_care_delay_hours
         FROM prior_auth_outcome_learning_summary WHERE tenant_id=$1
         ORDER BY decision_count DESC,recovered_revenue DESC LIMIT 100`, [user.tenantId]),
      db.query(
        `SELECT id,member_ref_token,payer_ref,service_line,status,due_at,appeal_due_at,estimated_revenue_at_risk
         FROM governed_prior_auth_cases WHERE tenant_id=$1 AND service_line IS NOT NULL AND status NOT IN ('approved','closed','cancelled')
         ORDER BY LEAST(due_at,COALESCE(appeal_due_at,due_at)) LIMIT 12`, [user.tenantId]),
    ]);
    await accessEvent(db, user, correlation, 'post_acute_learning_read', 'allowed', null, { signalCount: learning.rowCount });
    return NextResponse.json({ metrics: metrics.rows[0], learning: learning.rows, deadlines: deadlines.rows });
  } catch (error) { const failure = errorResponse(error); return NextResponse.json({ error: failure.message }, { status: failure.status }); }
}
