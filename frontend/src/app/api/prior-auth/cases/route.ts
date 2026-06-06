import { NextRequest, NextResponse } from 'next/server';
import { appendAuditEntry } from '@/lib/auditStore';
import { scrubAuditText, type PriorAuthCase } from '@/lib/priorAuth';
import { getPriorAuthWorkspace, resetPriorAuthCases, savePriorAuthCases, upsertPriorAuthCase } from '@/lib/priorAuthStore';
import { appendAccessLog } from '@/lib/productionReadiness';
import { requireDocumentManager, requireSession } from '@/lib/requestAuth';

function actorName(session: { email: string; firstName: string; lastName: string; role: string }) {
  return ((session.firstName + ' ' + session.lastName).trim() || session.email) + ' (' + session.role + ')';
}

function requestMeta(request: NextRequest) {
  return {
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'local',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  await appendAuditEntry('Prior Authorization Access', scrubAuditText(actorName(session) + ' opened case workspace'));
  await appendAccessLog(session, 'prior-auth-cases', 'view_cases', requestMeta(request));
  return NextResponse.json(await getPriorAuthWorkspace());
}

export async function POST(request: NextRequest) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  const body = (await request.json().catch(() => null)) as Partial<PriorAuthCase> | null;
  if (!body?.caseNumber || !body?.patient || !body?.provider || !body?.payer || !body?.service) {
    return NextResponse.json({ error: 'caseNumber, patient, provider, payer, and service are required' }, { status: 400 });
  }
  const authCase: PriorAuthCase = {
    id: body.id || 'pa-' + Date.now(),
    caseNumber: body.caseNumber,
    patient: body.patient,
    provider: body.provider,
    payer: body.payer,
    service: body.service,
    status: body.status || 'Intake',
    assignedTo: body.assignedTo || 'Intake Lead',
    submittedAt: body.submittedAt,
    payerResponseAt: body.payerResponseAt,
    denialReason: body.denialReason,
    deniedAt: body.deniedAt,
    appealDueDate: body.appealDueDate,
    documents: body.documents || [],
    evidence: body.evidence || [],
    history: [
      {
        id: 'hist-' + Date.now(),
        at: new Date().toLocaleString(),
        actor: actorName(session),
        event: 'Case created',
        note: 'Case created from prior authorization workspace.',
      },
      ...(body.history || []),
    ],
  };
  await upsertPriorAuthCase(authCase, actorName(session));
  await appendAccessLog(session, `case:${authCase.caseNumber}`, 'create_case', requestMeta(request));
  return NextResponse.json(await getPriorAuthWorkspace());
}

export async function PUT(request: NextRequest) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  const body = (await request.json().catch(() => null)) as { cases?: PriorAuthCase[]; case?: PriorAuthCase } | PriorAuthCase[] | null;
  if (Array.isArray(body)) {
    await savePriorAuthCases(body, actorName(session));
    await appendAccessLog(session, 'prior-auth-cases', 'replace_case_set', requestMeta(request));
    return NextResponse.json(await getPriorAuthWorkspace());
  }
  if (body?.cases) {
    await savePriorAuthCases(body.cases, actorName(session));
    await appendAccessLog(session, 'prior-auth-cases', 'replace_case_set', requestMeta(request));
    return NextResponse.json(await getPriorAuthWorkspace());
  }
  if (body?.case) {
    await upsertPriorAuthCase(body.case, actorName(session));
    await appendAccessLog(session, `case:${body.case.caseNumber}`, 'upsert_case', requestMeta(request));
    return NextResponse.json(await getPriorAuthWorkspace());
  }
  return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  await appendAccessLog(session, 'prior-auth-cases', 'reset_cases', requestMeta(request));
  return NextResponse.json(await resetPriorAuthCases());
}
