import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { accessEvent, correlationId, errorResponse, governance, workflowEvent } from '@/lib/governedPriorAuth';
import { normalizeAIReview, postAcuteLearning } from '@/lib/postAcuteLearning';
import { getGovernedPostgres } from '@/lib/postgres';
import { requireSession } from '@/lib/requestAuth';

export const dynamic = 'force-dynamic';

function parseModelJson(content: string) {
  const stripped = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(stripped); } catch {
    const start = stripped.indexOf('{'); const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(stripped.slice(start, end + 1));
    throw new Error('AI provider returned an invalid structured response');
  }
}

async function callOpenRouter(reviewType: string, context: Record<string, unknown>) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.OPENROUTER_BASE_URL;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !baseUrl || !model) throw Object.assign(new Error('OpenRouter is not configured'), { serviceUnavailable: true });
  const response = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST', signal: AbortSignal.timeout(45000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': process.env.CLIENT_URL || 'http://127.0.0.1' },
    body: JSON.stringify({
      model, temperature: 0.1,
      messages: [
        { role: 'system', content: `You are a Medicare Advantage post-acute prior authorization decision-support analyst. Perform a ${reviewType.replace(/_/g, ' ')}. Never invent clinical evidence, payer rules, citations, or approvals. Distinguish facts from recommendations. Do not make a final coverage decision. Return only valid JSON with: headline, executiveSummary, riskLevel (low|moderate|high|critical), confidence (0-100), metrics [{label,value}], evidenceGaps [{criterion,status,rationale}], recommendations [{action,owner,priority}], rationale, limitations [string].` },
        { role: 'user', content: JSON.stringify(context) },
      ],
    }),
  });
  if (!response.ok) throw Object.assign(new Error(`OpenRouter returned ${response.status}`), { serviceUnavailable: response.status >= 500 || response.status === 429 });
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('OpenRouter returned an empty response');
  return { model, output: normalizeAIReview(parseModelJson(content)) };
}

export async function GET(request: NextRequest) {
  const user = requireSession(request); if (user instanceof NextResponse) return user;
  const caseId = request.nextUrl.searchParams.get('caseId');
  if (!caseId) return NextResponse.json({ error: 'caseId required' }, { status: 400 });
  const result = await getGovernedPostgres().query(
    `SELECT id,review_type,provider,model,structured_output,status,created_by,reviewed_by,reviewed_at,review_note,created_at
     FROM prior_auth_ai_reviews WHERE tenant_id=$1 AND case_id=$2 ORDER BY created_at DESC LIMIT 30`,
    [user.tenantId, caseId],
  );
  return NextResponse.json({ reviews: result.rows });
}

export async function POST(request: NextRequest) {
  const user = requireSession(request); if (user instanceof NextResponse) return user;
  if (!['analyst', 'clinician', 'manager', 'admin'].includes(user.role)) return NextResponse.json({ error: 'review role required' }, { status: 403 });
  const correlation = correlationId(request.headers);
  try {
    const body = await request.json();
    const caseId = String(body?.caseId || '');
    const reviewType = postAcuteLearning.validateReviewType(body?.reviewType);
    if (!caseId) throw new Error('caseId required');
    const db = getGovernedPostgres();
    const [caseResult, evidenceResult, outcomeResult] = await Promise.all([
      db.query('SELECT * FROM governed_prior_auth_cases WHERE id=$1 AND tenant_id=$2', [caseId, user.tenantId]),
      db.query('SELECT evidence_code,evidence_type,source_system,source_version,effective_at FROM prior_auth_evidence WHERE case_id=$1 AND tenant_id=$2 ORDER BY created_at', [caseId, user.tenantId]),
      db.query('SELECT outcome,decision_stage,denial_category,evidence_codes,requested_units,authorized_units,turnaround_hours,care_delay_hours FROM prior_auth_case_outcomes WHERE case_id=$1 AND tenant_id=$2 ORDER BY decided_at DESC LIMIT 5', [caseId, user.tenantId]),
    ]);
    const authCase = caseResult.rows[0];
    if (!authCase) throw new Error('case not found');
    const context = {
      reviewType,
      case: { payerRef: authCase.payer_ref, procedureCode: authCase.procedure_code, diagnosisCode: authCase.diagnosis_code, status: authCase.status, urgency: authCase.urgency, dueAt: authCase.due_at, serviceLine: authCase.service_line, requestedUnits: authCase.requested_units, denialCategory: authCase.denial_category, appealDueAt: authCase.appeal_due_at, acceptanceCriteria: authCase.acceptance_criteria },
      evidence: evidenceResult.rows,
      verifiedPriorOutcomes: outcomeResult.rows,
      instruction: 'Use only this de-identified structured context. A human reviewer retains all decision authority.',
    };
    const inputDigest = governance.digest(context);
    const result = await callOpenRouter(reviewType, context);
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO prior_auth_ai_reviews(id,tenant_id,case_id,review_type,input_digest,provider,model,structured_output,created_by)
       VALUES($1,$2,$3,$4,$5,'openrouter',$6,$7,$8)`,
      [id, user.tenantId, caseId, reviewType, inputDigest, result.model, JSON.stringify(result.output), user.id],
    );
    await accessEvent(db, user, correlation, 'ai_review_drafted', 'allowed', caseId, { reviewId: id, reviewType, inputDigest, model: result.model });
    return NextResponse.json({ review: { id, reviewType, provider: 'openrouter', model: result.model, status: 'draft', structuredOutput: result.output, createdAt: new Date().toISOString() } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError' ? 'AI review timed out; no decision was recorded' : error instanceof Error ? error.message : 'request failed';
    const status = (error as any)?.serviceUnavailable || /timed out/i.test(message) ? 503 : errorResponse(error).status;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  const user = requireSession(request); if (user instanceof NextResponse) return user;
  if (!['clinician', 'manager', 'admin'].includes(user.role)) return NextResponse.json({ error: 'clinical reviewer or manager role required' }, { status: 403 });
  const correlation = correlationId(request.headers);
  const client = await getGovernedPostgres().connect();
  try {
    const body = await request.json();
    const reviewId = String(body?.reviewId || '');
    const status = String(body?.status || '');
    const note = String(body?.note || '').trim();
    if (!reviewId || !['accepted', 'rejected'].includes(status) || note.length < 8 || note.length > 2000) throw new Error('reviewId, accepted/rejected status, and review note are required');
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE prior_auth_ai_reviews SET status=$1,reviewed_by=$2,reviewed_at=NOW(),review_note=$3
       WHERE id=$4 AND tenant_id=$5 AND status='draft' RETURNING case_id,review_type`,
      [status, user.id, note, reviewId, user.tenantId],
    );
    if (!updated.rows[0]) throw new Error('AI review not found or already reviewed');
    await workflowEvent(client, user, updated.rows[0].case_id, correlation, { type: `ai_review_${status}`, reason: note, details: { reviewId, reviewType: updated.rows[0].review_type } });
    await client.query('COMMIT');
    return NextResponse.json({ id: reviewId, status, reviewedBy: user.id });
  } catch (error) {
    await client.query('ROLLBACK'); const failure = errorResponse(error); return NextResponse.json({ error: failure.message }, { status: failure.status });
  } finally { client.release(); }
}
