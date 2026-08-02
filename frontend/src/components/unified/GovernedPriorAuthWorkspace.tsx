'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

type AcceptanceCriterion = { code: string; description: string; required: boolean };
type Case = {
  id: string; memberRefToken: string; payerRef: string; procedureCode: string; diagnosisCode: string;
  status: string; version: number; urgency: string; dueAt: string; ownerId: string; clinicalReviewerId?: string;
  policyVersion?: string; payerReceipt?: string; acceptanceCriteria: AcceptanceCriterion[]; serviceLine?: string;
  facilityRef?: string; requestedUnits?: number; authorizedUnits?: number; denialCategory?: string; appealOutcome?: string;
  appealDueAt?: string; estimatedRevenueAtRisk: number; recoveredRevenue: number; careDelayHours: number;
};
type Detail = { case: Case & { payload: Record<string, unknown> }; evidence: Array<Record<string, any>>; events: Array<Record<string, any>> };
type ReviewOutput = {
  headline: string; executiveSummary: string; riskLevel: string; confidence: number;
  metrics: Array<{ label: string; value: string }>;
  evidenceGaps: Array<{ criterion: string; status: string; rationale: string }>;
  recommendations: Array<{ action: string; owner: string; priority: string }>;
  rationale: string; limitations: string[];
};
type Review = { id: string; reviewType?: string; review_type?: string; provider: string; model: string; status: string; structuredOutput?: ReviewOutput; structured_output?: ReviewOutput; createdAt?: string; created_at?: string; review_note?: string };
type LearningResponse = {
  metrics: { total_cases: number; open_cases: number; urgent_cases: number; deadline_risk: number; revenue_at_risk: number; recovered_revenue: number; average_care_delay_hours: number };
  learning: Array<Record<string, any>>; deadlines: Array<Record<string, any>>;
};

const transitions: Record<string, string[]> = {
  intake: ['evidence_review'], evidence_review: ['clinical_review', 'needs_information'], needs_information: ['evidence_review'],
  clinical_review: ['submission_ready', 'needs_information', 'denied_internal'], submission_ready: ['submission_queued'],
  payer_error: ['submission_queued'], denied: ['appeal_review', 'closed'], appeal_review: ['appeal_ready', 'closed'],
  appeal_ready: ['appeal_queued'], approved: ['closed'],
};
const serviceLabels: Record<string, string> = { skilled_nursing: 'Skilled Nursing', inpatient_rehab: 'Inpatient Rehabilitation', home_health: 'Home Health', long_term_acute_care: 'Long-Term Acute Care', other: 'Other Post-Acute' };
const tabs = ['Overview', 'Intake', 'Case Queue', 'Case Command Center', 'Learning Loop'] as const;
const tabByView: Record<string, (typeof tabs)[number]> = { overview: 'Overview', intake: 'Intake', 'case-queue': 'Case Queue', 'case-command': 'Case Command Center', learning: 'Learning Loop' };
const viewByTab: Record<(typeof tabs)[number], string> = { Overview: 'overview', Intake: 'intake', 'Case Queue': 'case-queue', 'Case Command Center': 'case-command', 'Learning Loop': 'learning' };
const initialIntake = { memberRef: '', payerRef: '', procedureCode: '', diagnosisCode: '', requestedBy: '', urgency: 'standard', criterionCode: '', criterionDescription: '', serviceLine: 'skilled_nursing', facilityRef: '', requestedUnits: '', estimatedRevenueAtRisk: '', careDelayHours: '0' };
const initialOutcome = { outcome: 'approved_initial', decisionStage: 'initial', denialCategory: '', requestedUnits: '', authorizedUnits: '', turnaroundHours: '', careDelayHours: '', revenueAtRisk: '', recoveredRevenue: '', rationale: '', decidedAt: '' };

async function jsonRequest(path: string, options?: RequestInit) {
  const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options?.headers || {}) }, cache: 'no-store' });
  const body = await response.json().catch(() => ({ error: `Request failed with HTTP ${response.status}` }));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}
const money = (value: unknown) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
const dateTime = (value: unknown) => value ? new Date(String(value)).toLocaleString() : 'Not recorded';
const titleCase = (value: unknown) => String(value || 'not recorded').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function GovernedPriorAuthWorkspace() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Overview');
  const [cases, setCases] = useState<Case[]>([]);
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [learning, setLearning] = useState<LearningResponse | null>(null);
  const [outcomes, setOutcomes] = useState<Array<Record<string, any>>>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeReview, setActiveReview] = useState<Review | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('Reviewed source evidence and documented the operational decision.');
  const [reviewNote, setReviewNote] = useState('Validated against the source record; human judgment remains controlling.');
  const [form, setForm] = useState(initialIntake);
  const [outcome, setOutcome] = useState(initialOutcome);
  const [evidence, setEvidence] = useState({ evidenceCode: '', evidenceType: 'functional_assessment', uri: '', sourceSystem: 'fhir', version: 'R4', effectiveAt: '', contentDigest: '' });

  useEffect(() => {
    setActiveTab(tabByView[searchParams.get('view') || 'overview'] || 'Overview');
  }, [searchParams]);

  const selectTab = useCallback((tab: (typeof tabs)[number]) => {
    setActiveTab(tab);
    router.replace(`/prior-auth?view=${viewByTab[tab]}`, { scroll: false });
  }, [router]);

  const load = useCallback(async () => {
    const [queue, signals] = await Promise.all([jsonRequest('/api/governed/prior-auth?scope=post-acute'), jsonRequest('/api/governed/prior-auth/learning')]);
    setCases(queue.cases); setLearning(signals); setSelected((current) => current || queue.cases[0]?.id || '');
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    if (!id) { setDetail(null); setOutcomes([]); setReviews([]); return; }
    const [caseDetail, outcomeData, reviewData] = await Promise.all([
      jsonRequest(`/api/governed/prior-auth?id=${encodeURIComponent(id)}`),
      jsonRequest(`/api/governed/prior-auth/outcomes?caseId=${encodeURIComponent(id)}`),
      jsonRequest(`/api/governed/prior-auth/ai-review?caseId=${encodeURIComponent(id)}`),
    ]);
    setDetail(caseDetail); setOutcomes(outcomeData.outcomes); setReviews(reviewData.reviews);
    setActiveReview((current) => current && (reviewData.reviews as Review[]).some((item) => item.id === current.id) ? current : reviewData.reviews[0] || null);
    setOutcome((current) => ({ ...current, requestedUnits: String(caseDetail.case.requestedUnits || ''), authorizedUnits: String(caseDetail.case.authorizedUnits ?? ''), careDelayHours: String(caseDetail.case.careDelayHours || 0), revenueAtRisk: String(caseDetail.case.estimatedRevenueAtRisk || ''), recoveredRevenue: String(caseDetail.case.recoveredRevenue || '') }));
  }, []);
  useEffect(() => { load().catch((requestError) => setError(requestError.message)); }, [load]);
  useEffect(() => { loadDetail(selected).catch((requestError) => setError(requestError.message)); }, [loadDetail, selected]);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); await load(); if (selected) await loadDetail(selected); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Request failed'); }
    finally { setBusy(false); }
  }

  const applyScenario = (kind: 'snf' | 'irf' | 'home') => {
    const examples = {
      snf: { memberRef: 'DEMO-SNF-2048', payerRef: 'Northstar Medicare Advantage', procedureCode: '99305', diagnosisCode: 'S72.001D', requestedBy: 'Harborview Transition Team', urgency: 'urgent', criterionCode: 'PAC-FUNCTION-SNF', criterionDescription: 'Current functional status and daily skilled nursing or therapy need', serviceLine: 'skilled_nursing', facilityRef: 'Harborview Skilled Nursing', requestedUnits: '14', estimatedRevenueAtRisk: '16800', careDelayHours: '12' },
      irf: { memberRef: 'DEMO-IRF-3184', payerRef: 'Evergreen Medicare Advantage', procedureCode: '99223', diagnosisCode: 'I63.512', requestedBy: 'Lakeside Rehabilitation Hospital', urgency: 'urgent', criterionCode: 'PAC-IRF-INTENSITY', criterionDescription: 'Ability to participate in intensive interdisciplinary rehabilitation', serviceLine: 'inpatient_rehab', facilityRef: 'Lakeside Rehabilitation Hospital', requestedUnits: '12', estimatedRevenueAtRisk: '29400', careDelayHours: '24' },
      home: { memberRef: 'DEMO-HH-7412', payerRef: 'Horizon Medicare Advantage', procedureCode: 'G0299', diagnosisCode: 'I50.32', requestedBy: 'Community Home Health', urgency: 'standard', criterionCode: 'PAC-HOMEBOUND', criterionDescription: 'Homebound status and documented intermittent skilled need', serviceLine: 'home_health', facilityRef: 'Community Home Health', requestedUnits: '9', estimatedRevenueAtRisk: '5400', careDelayHours: '0' },
    };
    setForm(examples[kind]); setNotice(`${serviceLabels[examples[kind].serviceLine]} example loaded. Review before submission.`);
  };
  const createCase = () => run(async () => {
    const result = await jsonRequest('/api/governed/prior-auth', { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ ...form, requestedUnits: Number(form.requestedUnits), estimatedRevenueAtRisk: Number(form.estimatedRevenueAtRisk), careDelayHours: Number(form.careDelayHours), dueAt: new Date(Date.now() + (form.urgency === 'urgent' ? 24 : 120) * 3600000).toISOString(), acceptanceCriteria: [{ code: form.criterionCode, description: form.criterionDescription, required: true }] }) });
    setSelected(result.case.id); selectTab('Case Command Center');
  }, 'Post-acute case persisted and intake event audited.');
  const addEvidence = () => run(() => jsonRequest('/api/governed/prior-auth/evidence', { method: 'POST', body: JSON.stringify({ caseId: selected, evidence: { ...evidence, effectiveAt: new Date(evidence.effectiveAt).toISOString() } }) }), 'Evidence provenance encrypted and attached.');
  const transition = (toStatus: string) => run(() => jsonRequest('/api/governed/prior-auth', { method: 'PATCH', body: JSON.stringify({ caseId: detail?.case.id, expectedVersion: detail?.case.version, toStatus, reason, attestation: ['submission_ready', 'appeal_ready'].includes(toStatus) }) }), `Case moved to ${titleCase(toStatus)}.`);
  const recordOutcome = () => run(() => jsonRequest('/api/governed/prior-auth/outcomes', { method: 'POST', body: JSON.stringify({ caseId: selected, ...outcome, requestedUnits: Number(outcome.requestedUnits), authorizedUnits: Number(outcome.authorizedUnits), turnaroundHours: Number(outcome.turnaroundHours), careDelayHours: Number(outcome.careDelayHours), revenueAtRisk: Number(outcome.revenueAtRisk), recoveredRevenue: Number(outcome.recoveredRevenue), evidenceCodes: detail?.evidence.map((item) => item.evidence_code) || [], decidedAt: new Date(outcome.decidedAt).toISOString() }) }), 'Human-verified outcome recorded in the immutable learning history.');
  const runAIReview = (reviewType: string) => run(async () => {
    const result = await jsonRequest('/api/governed/prior-auth/ai-review', { method: 'POST', body: JSON.stringify({ caseId: selected, reviewType }) });
    setActiveReview(result.review);
  }, `${titleCase(reviewType)} draft generated. It has not changed the case decision.`);
  const decideReview = (status: 'accepted' | 'rejected') => run(() => jsonRequest('/api/governed/prior-auth/ai-review', { method: 'PATCH', body: JSON.stringify({ reviewId: activeReview?.id, status, note: reviewNote }) }), `AI draft ${status}; the human review event was audited.`);

  const availableTransitions = useMemo(() => transitions[detail?.case.status || ''] || [], [detail?.case.status]);
  const evidenceReadiness = useMemo(() => {
    const required = detail?.case.acceptanceCriteria || []; const present = new Set(detail?.evidence.map((item) => item.evidence_code) || []);
    const missing = required.filter((criterion) => criterion.required !== false && !present.has(criterion.code));
    return { missing, percentage: required.length ? Math.round(100 * (required.length - missing.length) / required.length) : 100 };
  }, [detail]);
  const selectedOutput = activeReview?.structuredOutput || activeReview?.structured_output;

  return <div className="stack post-acute-workspace">
    {error ? <div className="feedback-banner error"><strong>Action could not be completed</strong><span>{error}</span></div> : null}
    {notice ? <div className="feedback-banner success"><strong>Recorded</strong><span>{notice}</span></div> : null}

    {activeTab === 'Overview' ? <>
      <div className="prior-auth-metrics six">
        <div className="metric-card"><span>Post-acute cases</span><strong>{learning?.metrics.total_cases || cases.length}</strong><small>Tenant-scoped operating history</small></div>
        <div className="metric-card urgent"><span>Urgent open</span><strong>{learning?.metrics.urgent_cases || 0}</strong><small>Requires prioritized review</small></div>
        <div className="metric-card attention"><span>Deadline risk</span><strong>{learning?.metrics.deadline_risk || 0}</strong><small>Due in the next 24 hours</small></div>
        <div className="metric-card revenue"><span>Revenue at risk</span><strong>{money(learning?.metrics.revenue_at_risk)}</strong><small>Across authorization cases</small></div>
        <div className="metric-card complete"><span>Recovered</span><strong>{money(learning?.metrics.recovered_revenue)}</strong><small>Human-verified outcomes</small></div>
        <div className="metric-card"><span>Average care delay</span><strong>{Math.round(learning?.metrics.average_care_delay_hours || 0)}h</strong><small>Cases with measured delay</small></div>
      </div>
      <div className="grid columns-2">
        <section className="card stack"><div className="section-head"><div><div className="eyebrow">Operating focus</div><h3>Next deadlines</h3></div><button className="button subtle" onClick={() => selectTab('Case Queue')}>Open queue</button></div>
          <div className="deadline-list">{learning?.deadlines.slice(0, 6).map((item) => <button key={item.id} onClick={() => { setSelected(item.id); selectTab('Case Command Center'); }}><span><strong>{serviceLabels[item.service_line] || 'Prior Authorization'}</strong><small>{item.payer_ref} · {item.member_ref_token}</small></span><span><strong>{dateTime(item.appeal_due_at || item.due_at)}</strong><small>{money(item.estimated_revenue_at_risk)} at risk</small></span></button>)}</div>
        </section>
        <section className="card stack"><div className="eyebrow">Private learning loop</div><h3>What compounds with every case</h3><p className="muted">Human-verified outcomes create payer, service-line, denial, turnaround, and recovery signals. AI drafts use only de-identified operational context and never change coverage status automatically.</p><div className="learning-principles"><span>Source evidence</span><span>Human decision</span><span>Outcome signal</span><span>Better next review</span></div><button className="button primary" onClick={() => selectTab('Learning Loop')}>View outcome intelligence</button></section>
      </div>
    </> : null}

    {activeTab === 'Intake' ? <section className="card stack"><div className="section-head"><div><div className="eyebrow">Structured intake</div><h3>New post-acute authorization</h3><p className="muted">Capture the service, requested level of care, required evidence, timing, and financial exposure.</p></div></div>
      <div className="scenario-buttons"><button onClick={() => applyScenario('snf')}>Fill skilled nursing case</button><button onClick={() => applyScenario('irf')}>Fill inpatient rehab case</button><button onClick={() => applyScenario('home')}>Fill home-health case</button><button onClick={() => setForm(initialIntake)}>Clear</button></div>
      <div className="form-grid">
        <label>Member reference<input value={form.memberRef} onChange={(e) => setForm({ ...form, memberRef: e.target.value })} /></label>
        <label>Payer or plan<input value={form.payerRef} onChange={(e) => setForm({ ...form, payerRef: e.target.value })} /></label>
        <label>Post-acute service<select value={form.serviceLine} onChange={(e) => setForm({ ...form, serviceLine: e.target.value })}>{Object.entries(serviceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Facility or agency<input value={form.facilityRef} onChange={(e) => setForm({ ...form, facilityRef: e.target.value })} /></label>
        <label>CPT / HCPCS<input value={form.procedureCode} onChange={(e) => setForm({ ...form, procedureCode: e.target.value })} /></label>
        <label>ICD-10<input value={form.diagnosisCode} onChange={(e) => setForm({ ...form, diagnosisCode: e.target.value })} /></label>
        <label>Requested days or visits<input type="number" min="1" value={form.requestedUnits} onChange={(e) => setForm({ ...form, requestedUnits: e.target.value })} /></label>
        <label>Urgency<select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}><option value="standard">Standard</option><option value="urgent">Urgent</option></select></label>
        <label>Requesting team<input value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} /></label>
        <label>Revenue at risk<input type="number" min="0" value={form.estimatedRevenueAtRisk} onChange={(e) => setForm({ ...form, estimatedRevenueAtRisk: e.target.value })} /></label>
        <label>Current delay (hours)<input type="number" min="0" value={form.careDelayHours} onChange={(e) => setForm({ ...form, careDelayHours: e.target.value })} /></label>
        <label>Required evidence code<input value={form.criterionCode} onChange={(e) => setForm({ ...form, criterionCode: e.target.value })} /></label>
        <label className="wide">Coverage criterion<textarea rows={3} value={form.criterionDescription} onChange={(e) => setForm({ ...form, criterionDescription: e.target.value })} /></label>
      </div><button className="button primary action-button" disabled={busy || !['analyst', 'admin'].includes(user?.role || '')} onClick={createCase}>Create governed case</button>
    </section> : null}

    {activeTab === 'Case Queue' ? <section className="card"><div className="section-head"><div><div className="eyebrow">Authorization inventory</div><h3>Post-acute case queue</h3></div><span className="status-chip">{cases.length} cases</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Member token</th><th>Service / facility</th><th>Payer</th><th>Status</th><th>Deadline</th><th>Exposure</th></tr></thead><tbody>{cases.map((item) => <tr className="interactive-row" key={item.id} onClick={() => { setSelected(item.id); selectTab('Case Command Center'); }}><td>{item.memberRefToken}</td><td><strong>{serviceLabels[item.serviceLine || ''] || 'General authorization'}</strong><br /><span className="muted">{item.facilityRef || `${item.procedureCode} · ${item.diagnosisCode}`}</span></td><td>{item.payerRef}</td><td><span className={`status-chip ${item.urgency === 'urgent' ? 'warning' : ''}`}>{titleCase(item.status)}</span></td><td>{dateTime(item.appealDueAt || item.dueAt)}</td><td>{money(item.estimatedRevenueAtRisk)}</td></tr>)}</tbody></table></div></section> : null}

    {activeTab === 'Case Command Center' ? <>{detail ? <>
      <section className="case-hero"><div><div className="eyebrow">{serviceLabels[detail.case.serviceLine || ''] || 'Prior Authorization'}</div><h3>{detail.case.facilityRef || detail.case.payerRef}</h3><p>{detail.case.payerRef} · {detail.case.procedureCode} / {detail.case.diagnosisCode} · member {detail.case.memberRefToken}</p></div><div className="case-hero-status"><span className="status-chip">{titleCase(detail.case.status)}</span><strong>{money(detail.case.estimatedRevenueAtRisk)}</strong><small>revenue at risk</small></div></section>
      <div className="case-command-grid"><section className="card stack"><div className="section-head"><h3>Decision control</h3><span className="status-chip">Version {detail.case.version}</span></div><div className="detail-field-grid"><div className="detail-field"><span>Requested units</span><div>{detail.case.requestedUnits || 'Not recorded'}</div></div><div className="detail-field"><span>Authorized units</span><div>{detail.case.authorizedUnits ?? 'Pending'}</div></div><div className="detail-field"><span>Due</span><div>{dateTime(detail.case.dueAt)}</div></div><div className="detail-field"><span>Appeal due</span><div>{dateTime(detail.case.appealDueAt)}</div></div><div className="detail-field"><span>Policy</span><div>{detail.case.policyVersion || 'Not reviewed'}</div></div><div className="detail-field"><span>Denial category</span><div>{titleCase(detail.case.denialCategory)}</div></div></div><label>Decision rationale<textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label><div className="button-row">{availableTransitions.map((next) => <button key={next} className="button primary" disabled={busy} onClick={() => transition(next)}>{titleCase(next)}</button>)}</div></section>
      <section className="card stack"><div className="section-head"><h3>Evidence readiness</h3><strong className="readiness-score">{evidenceReadiness.percentage}%</strong></div><div className="progress-track"><span style={{ width: `${evidenceReadiness.percentage}%` }} /></div>{evidenceReadiness.missing.length ? <ul className="feature-list">{evidenceReadiness.missing.map((item) => <li key={item.code}><strong>{item.code}</strong><br />{item.description}</li>)}</ul> : <div className="positive-callout">All configured acceptance criteria have matching evidence codes. Clinical validation is still required.</div>}<div className="evidence-list">{detail.evidence.map((item) => <div key={item.id}><strong>{item.evidence_code}</strong><span>{titleCase(item.evidence_type)} · {item.source_system} {item.source_version}</span></div>)}</div></section></div>

      <section className="card stack ai-review-panel"><div className="section-head"><div><div className="eyebrow">Human-in-the-loop AI</div><h3>Post-acute review workbench</h3><p className="muted">Draft analysis from de-identified codes and evidence metadata. The model cannot approve, deny, or transition a case.</p></div><span className="status-chip">OpenRouter</span></div><div className="ai-action-grid"><button disabled={busy} onClick={() => runAIReview('evidence_gap')}><strong>Analyze evidence gaps</strong><span>Compare criteria with available evidence</span></button><button disabled={busy} onClick={() => runAIReview('appeal_draft')}><strong>Draft appeal strategy</strong><span>Organize disputed criteria and next actions</span></button><button disabled={busy} onClick={() => runAIReview('peer_review_brief')}><strong>Build peer-to-peer brief</strong><span>Prepare a concise clinician discussion guide</span></button></div>
        {busy ? <div className="ai-loading"><span />Generating a governed decision-support draft…</div> : null}
        {selectedOutput ? <div className="decision-brief"><div className="decision-brief-head"><div><span className={`risk-badge ${selectedOutput.riskLevel}`}>{titleCase(selectedOutput.riskLevel)} risk</span><h3>{selectedOutput.headline}</h3><p>{selectedOutput.executiveSummary}</p></div><div className="confidence-ring"><strong>{selectedOutput.confidence}%</strong><span>confidence</span></div></div>
          {selectedOutput.metrics.length ? <div className="brief-metrics">{selectedOutput.metrics.map((item, index) => <div key={`${item.label}-${index}`}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div> : null}
          <div className="brief-columns"><div><h4>Evidence findings</h4>{selectedOutput.evidenceGaps.length ? selectedOutput.evidenceGaps.map((item, index) => <article key={`${item.criterion}-${index}`}><div><strong>{item.criterion}</strong><span>{titleCase(item.status)}</span></div><p>{item.rationale}</p></article>) : <p className="muted">No evidence gaps were identified in the returned draft.</p>}</div><div><h4>Recommended actions</h4>{selectedOutput.recommendations.map((item, index) => <article key={`${item.action}-${index}`}><div><strong>{item.action}</strong><span>{titleCase(item.priority)}</span></div><p>Owner: {item.owner}</p></article>)}</div></div>
          <div className="brief-rationale"><h4>Analysis rationale</h4><p>{selectedOutput.rationale}</p><h4>Limitations</h4><ul>{selectedOutput.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
          <div className="review-decision"><label>Human review note<textarea rows={2} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} /></label><div className="button-row"><button className="button primary" disabled={busy || activeReview?.status !== 'draft'} onClick={() => decideReview('accepted')}>Accept as decision support</button><button className="button subtle" disabled={busy || activeReview?.status !== 'draft'} onClick={() => decideReview('rejected')}>Reject draft</button></div><small>Accepting a draft does not approve coverage or move the case.</small></div>
        </div> : <div className="ai-empty"><strong>No AI draft selected</strong><span>Choose one of the three purpose-built reviews above. Results will render as a professional decision brief, not raw JSON.</span></div>}
      </section>

      <div className="grid columns-2"><section className="card stack"><h3>Attach validated evidence</h3><div className="scenario-buttons"><button onClick={() => setEvidence({ evidenceCode: detail.case.acceptanceCriteria[0]?.code || 'PAC-FUNCTION', evidenceType: 'functional_assessment', uri: `urn:synthetic:fhir:DocumentReference:${detail.case.id}:function`, sourceSystem: 'fhir', version: 'R4', effectiveAt: new Date().toISOString().slice(0, 16), contentDigest: 'a'.repeat(64) })}>Fill functional assessment</button><button onClick={() => setEvidence({ evidenceCode: detail.case.acceptanceCriteria[1]?.code || 'PAC-CAREPLAN', evidenceType: 'interdisciplinary_care_plan', uri: `urn:synthetic:fhir:CarePlan:${detail.case.id}`, sourceSystem: 'fhir', version: 'R4', effectiveAt: new Date().toISOString().slice(0, 16), contentDigest: 'b'.repeat(64) })}>Fill care plan</button></div><div className="form-grid compact"><label>Evidence code<input value={evidence.evidenceCode} onChange={(e) => setEvidence({ ...evidence, evidenceCode: e.target.value })} /></label><label>Evidence type<input value={evidence.evidenceType} onChange={(e) => setEvidence({ ...evidence, evidenceType: e.target.value })} /></label><label className="wide">HTTPS or URN source<input value={evidence.uri} onChange={(e) => setEvidence({ ...evidence, uri: e.target.value })} /></label><label>Effective at<input type="datetime-local" value={evidence.effectiveAt} onChange={(e) => setEvidence({ ...evidence, effectiveAt: e.target.value })} /></label><label>SHA-256 digest<input value={evidence.contentDigest} onChange={(e) => setEvidence({ ...evidence, contentDigest: e.target.value })} /></label></div><button className="button primary" disabled={busy} onClick={addEvidence}>Attach governed evidence</button></section>
      <section className="card stack"><h3>Record human-verified outcome</h3><div className="scenario-buttons"><button onClick={() => setOutcome({ ...outcome, outcome: 'approved_initial', decisionStage: 'initial', authorizedUnits: outcome.requestedUnits, turnaroundHours: '18', recoveredRevenue: outcome.revenueAtRisk, rationale: 'Payer approved the requested post-acute service after human clinical review.', decidedAt: new Date().toISOString().slice(0, 16) })}>Fill approval</button><button onClick={() => setOutcome({ ...outcome, outcome: 'approved_appeal', decisionStage: 'first_level_appeal', authorizedUnits: outcome.requestedUnits, turnaroundHours: '62', recoveredRevenue: outcome.revenueAtRisk, denialCategory: 'insufficient_documentation', rationale: 'Initial denial overturned after the appeal supplied the missing functional and care-plan evidence.', decidedAt: new Date().toISOString().slice(0, 16) })}>Fill overturned appeal</button><button onClick={() => setOutcome({ ...outcome, outcome: 'upheld', decisionStage: 'peer_to_peer', authorizedUnits: '0', turnaroundHours: '34', recoveredRevenue: '0', denialCategory: 'level_of_care', rationale: 'Denial upheld after peer review; the source record did not substantiate the requested level of care.', decidedAt: new Date().toISOString().slice(0, 16) })}>Fill upheld denial</button></div><div className="form-grid compact"><label>Outcome<select value={outcome.outcome} onChange={(e) => setOutcome({ ...outcome, outcome: e.target.value })}><option value="approved_initial">Approved initially</option><option value="approved_appeal">Approved on appeal</option><option value="partially_approved">Partially approved</option><option value="upheld">Denial upheld</option><option value="withdrawn">Withdrawn</option></select></label><label>Decision stage<select value={outcome.decisionStage} onChange={(e) => setOutcome({ ...outcome, decisionStage: e.target.value })}><option value="initial">Initial</option><option value="peer_to_peer">Peer to peer</option><option value="first_level_appeal">First-level appeal</option><option value="second_level_appeal">Second-level appeal</option><option value="external_review">External review</option></select></label><label>Requested units<input type="number" value={outcome.requestedUnits} onChange={(e) => setOutcome({ ...outcome, requestedUnits: e.target.value })} /></label><label>Authorized units<input type="number" value={outcome.authorizedUnits} onChange={(e) => setOutcome({ ...outcome, authorizedUnits: e.target.value })} /></label><label>Turnaround hours<input type="number" value={outcome.turnaroundHours} onChange={(e) => setOutcome({ ...outcome, turnaroundHours: e.target.value })} /></label><label>Denial category<input value={outcome.denialCategory} onChange={(e) => setOutcome({ ...outcome, denialCategory: e.target.value })} /></label><label>Revenue at risk<input type="number" value={outcome.revenueAtRisk} onChange={(e) => setOutcome({ ...outcome, revenueAtRisk: e.target.value })} /></label><label>Recovered revenue<input type="number" value={outcome.recoveredRevenue} onChange={(e) => setOutcome({ ...outcome, recoveredRevenue: e.target.value })} /></label><label>Decision time<input type="datetime-local" value={outcome.decidedAt} onChange={(e) => setOutcome({ ...outcome, decidedAt: e.target.value })} /></label><label className="wide">Human rationale<textarea rows={3} value={outcome.rationale} onChange={(e) => setOutcome({ ...outcome, rationale: e.target.value })} /></label></div><button className="button primary" disabled={busy || !['clinician', 'manager', 'admin'].includes(user?.role || '')} onClick={recordOutcome}>Record verified outcome</button></section></div>
      <section className="card"><div className="section-head"><h3>Immutable case history</h3><span className="status-chip">{detail.events.length} events</span></div><div className="timeline-list">{detail.events.slice().reverse().map((item, index) => <div key={`${item.occurred_at}-${index}`}><span /><div><strong>{titleCase(item.event_type)}</strong><p>{item.reason || `${titleCase(item.from_status)} → ${titleCase(item.to_status)}`}</p><small>{titleCase(item.actor_role)} · {dateTime(item.occurred_at)}</small></div></div>)}</div></section>
    </> : <section className="card queue-empty"><strong>Select a case from the queue</strong><span>The command center combines evidence, AI decision support, workflow control, outcomes, and audit history.</span><button className="button primary" onClick={() => selectTab('Case Queue')}>Open case queue</button></section>}</> : null}

    {activeTab === 'Learning Loop' ? <section className="card stack"><div className="section-head"><div><div className="eyebrow">Proprietary operating intelligence</div><h3>Payer and service-line outcome learning</h3><p className="muted">Every row derives from a human-verified decision—not model speculation.</p></div><span className="status-chip">{learning?.learning.length || 0} signals</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Payer / service</th><th>Denial category</th><th>Decisions</th><th>Approval</th><th>Appeal overturn</th><th>Turnaround</th><th>Recovered</th></tr></thead><tbody>{learning?.learning.map((item, index) => <tr key={`${item.payer_ref}-${item.procedure_code}-${item.denial_category}-${index}`}><td><strong>{item.payer_ref}</strong><br /><span className="muted">{serviceLabels[item.service_line]} · {item.procedure_code}</span></td><td>{titleCase(item.denial_category)}</td><td>{item.decision_count}</td><td>{item.approval_rate ?? 0}%</td><td>{item.overturn_rate ?? 0}%</td><td>{Number(item.average_turnaround_hours || 0).toFixed(1)}h</td><td>{money(item.recovered_revenue)}</td></tr>)}{!learning?.learning.length ? <tr><td colSpan={7}><div className="queue-empty"><strong>No verified outcomes yet</strong><span>Record a human decision in the Case Command Center to start the learning loop.</span></div></td></tr> : null}</tbody></table></div></section> : null}
  </div>;
}
