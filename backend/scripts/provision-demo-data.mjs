import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const governance = require('../../governance/priorAuthorization.cjs');

if (process.env.NODE_ENV === 'production') throw new Error('Demo data provisioning is disabled in production');
if (process.env.ALLOW_DEMO_SEED !== 'true' || !/^yes$/i.test(process.env.CONFIRM_DEMO_SEED || '')) {
  console.log('Demo data provisioning is disabled.');
  process.exit(0);
}

const tenantId = String(process.env.TENANT_ID || process.env.GOVERNANCE_TENANT_ID || '').trim();
const activeKeyVersion = String(process.env.PRIOR_AUTH_ACTIVE_KEY_VERSION || '').trim();
const dataKeys = JSON.parse(process.env.PRIOR_AUTH_DATA_KEYS_JSON || '{}');
const dataKey = dataKeys[activeKeyVersion];
if (!process.env.DATABASE_URL || !tenantId || !activeKeyVersion || !/^[0-9a-f]{64}$/i.test(dataKey || '')) {
  throw new Error('Local database, tenant, and prior authorization encryption key are required');
}

function stableUuid(label) {
  const value = crypto.createHash('sha256').update(`${tenantId}:${label}`).digest('hex');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-4${value.slice(13, 16)}-a${value.slice(17, 20)}-${value.slice(20, 32)}`;
}

const scenarios = [
  ['Northstar Health', '70553', 'G43.109', 'MRI brain with contrast', 'urgent', 'clinical_review'],
  ['Evergreen Health Plan', '27447', 'M17.11', 'Total knee arthroplasty', 'standard', 'evidence_review'],
  ['Summit Commercial', '72148', 'M54.16', 'Lumbar spine MRI', 'standard', 'needs_information'],
  ['Northstar Health', 'J1745', 'K50.90', 'Infliximab infusion', 'urgent', 'submission_ready'],
  ['Horizon Community', '95811', 'G47.33', 'Sleep study titration', 'standard', 'submitted'],
  ['Evergreen Health Plan', '64483', 'M54.17', 'Epidural steroid injection', 'standard', 'denied'],
  ['Summit Commercial', 'E0601', 'G47.33', 'CPAP device authorization', 'standard', 'approved'],
  ['Northstar Health', '97110', 'M25.561', 'Physical therapy course', 'standard', 'intake'],
  ['Horizon Community', '78815', 'C34.90', 'PET/CT oncology staging', 'urgent', 'payer_error'],
  ['Evergreen Health Plan', '29881', 'S83.241A', 'Knee arthroscopy', 'standard', 'appeal_review'],
  ['Summit Commercial', 'J3490', 'L40.50', 'Specialty medication', 'urgent', 'appeal_ready'],
  ['Horizon Community', '37225', 'I70.211', 'Peripheral revascularization', 'urgent', 'submission_queued'],
  ['Northstar Health', '22551', 'M50.122', 'Cervical fusion', 'standard', 'appeal_queued'],
  ['Evergreen Health Plan', '33208', 'I44.2', 'Dual chamber pacemaker', 'urgent', 'appealed'],
  ['Summit Commercial', '43239', 'K21.9', 'Upper GI endoscopy', 'standard', 'closed'],
];

const postAcuteScenarios = [
  { serviceLine: 'skilled_nursing', payerRef: 'Northstar Medicare Advantage', procedureCode: '99305', diagnosisCode: 'S72.001D', facilityRef: 'Harborview SNF', units: 14, description: 'Post-hip-fracture skilled nursing stay', urgency: 'urgent', status: 'clinical_review', risk: 16800, delay: 18, outcome: null },
  { serviceLine: 'inpatient_rehab', payerRef: 'Evergreen Medicare Advantage', procedureCode: '99223', diagnosisCode: 'I63.512', facilityRef: 'Lakeside Rehabilitation Hospital', units: 12, description: 'Stroke inpatient rehabilitation admission', urgency: 'urgent', status: 'appeal_review', risk: 29400, delay: 36, outcome: 'upheld', denial: 'medical_necessity' },
  { serviceLine: 'home_health', payerRef: 'Horizon Medicare Advantage', procedureCode: 'G0299', diagnosisCode: 'I50.32', facilityRef: 'Community Home Health', units: 9, description: 'Skilled nursing home-health visits', urgency: 'standard', status: 'approved', risk: 5400, delay: 6, outcome: 'approved_initial' },
  { serviceLine: 'long_term_acute_care', payerRef: 'Summit Medicare Advantage', procedureCode: '99223', diagnosisCode: 'J96.21', facilityRef: 'Summit LTACH', units: 20, description: 'Respiratory failure LTACH transfer', urgency: 'urgent', status: 'submission_ready', risk: 46000, delay: 12, outcome: null },
  { serviceLine: 'skilled_nursing', payerRef: 'Evergreen Medicare Advantage', procedureCode: '99305', diagnosisCode: 'M97.01XD', facilityRef: 'Maple Grove SNF', units: 10, description: 'Periprosthetic fracture rehabilitation', urgency: 'standard', status: 'approved', risk: 11800, delay: 24, outcome: 'approved_appeal', denial: 'insufficient_documentation' },
  { serviceLine: 'inpatient_rehab', payerRef: 'Northstar Medicare Advantage', procedureCode: '97110', diagnosisCode: 'G81.94', facilityRef: 'Northstar Rehab Institute', units: 15, description: 'Hemiplegia intensive rehabilitation course', urgency: 'urgent', status: 'denied', risk: 33750, delay: 42, outcome: 'upheld', denial: 'level_of_care' },
  { serviceLine: 'home_health', payerRef: 'Summit Medicare Advantage', procedureCode: 'G0151', diagnosisCode: 'Z96.641', facilityRef: 'Better Steps Home Care', units: 8, description: 'Home physical therapy after arthroplasty', urgency: 'standard', status: 'closed', risk: 3600, delay: 8, outcome: 'partially_approved', denial: 'visit_frequency' },
  { serviceLine: 'skilled_nursing', payerRef: 'Horizon Medicare Advantage', procedureCode: '99305', diagnosisCode: 'L89.154', facilityRef: 'Willow Creek SNF', units: 21, description: 'Stage four pressure injury skilled care', urgency: 'urgent', status: 'appeal_ready', risk: 27800, delay: 54, outcome: 'upheld', denial: 'clinical_criteria' },
  { serviceLine: 'home_health', payerRef: 'Northstar Medicare Advantage', procedureCode: 'G0152', diagnosisCode: 'G20.A1', facilityRef: 'Northstar Home Services', units: 6, description: 'Occupational therapy for Parkinson disease', urgency: 'standard', status: 'approved', risk: 2950, delay: 4, outcome: 'approved_initial' },
  { serviceLine: 'inpatient_rehab', payerRef: 'Horizon Medicare Advantage', procedureCode: '99223', diagnosisCode: 'S14.109A', facilityRef: 'Regional Spinal Rehabilitation', units: 18, description: 'Spinal cord injury intensive rehabilitation', urgency: 'urgent', status: 'appealed', risk: 52200, delay: 60, outcome: 'approved_appeal', denial: 'medical_necessity' },
  { serviceLine: 'long_term_acute_care', payerRef: 'Evergreen Medicare Advantage', procedureCode: '99223', diagnosisCode: 'A41.9', facilityRef: 'Evergreen Specialty Hospital', units: 16, description: 'Complex sepsis recovery and ventilator weaning', urgency: 'urgent', status: 'needs_information', risk: 38800, delay: 28, outcome: null },
  { serviceLine: 'skilled_nursing', payerRef: 'Summit Medicare Advantage', procedureCode: '99305', diagnosisCode: 'I69.354', facilityRef: 'Riverside SNF', units: 14, description: 'Post-stroke skilled nursing rehabilitation', urgency: 'standard', status: 'closed', risk: 15400, delay: 30, outcome: 'withdrawn', denial: 'member_transition' },
  { serviceLine: 'home_health', payerRef: 'Evergreen Medicare Advantage', procedureCode: 'G0299', diagnosisCode: 'E11.621', facilityRef: 'Evergreen Home Health', units: 12, description: 'Diabetic wound skilled nursing visits', urgency: 'urgent', status: 'approved', risk: 7200, delay: 10, outcome: 'approved_appeal', denial: 'insufficient_documentation' },
  { serviceLine: 'inpatient_rehab', payerRef: 'Summit Medicare Advantage', procedureCode: '97110', diagnosisCode: 'S06.9X9A', facilityRef: 'Summit Neuro Rehab', units: 17, description: 'Traumatic brain injury rehabilitation', urgency: 'urgent', status: 'clinical_review', risk: 41400, delay: 16, outcome: null },
  { serviceLine: 'skilled_nursing', payerRef: 'Northstar Medicare Advantage', procedureCode: '99305', diagnosisCode: 'J18.9', facilityRef: 'Bayview Skilled Nursing', units: 7, description: 'Pneumonia recovery with skilled monitoring', urgency: 'standard', status: 'approved', risk: 7700, delay: 5, outcome: 'approved_initial' },
  { serviceLine: 'home_health', payerRef: 'Horizon Medicare Advantage', procedureCode: 'G0151', diagnosisCode: 'M62.81', facilityRef: 'Horizon At Home', units: 10, description: 'Home therapy for generalized weakness', urgency: 'standard', status: 'denied', risk: 4300, delay: 22, outcome: 'partially_approved', denial: 'visit_frequency' },
  { serviceLine: 'long_term_acute_care', payerRef: 'Northstar Medicare Advantage', procedureCode: '99223', diagnosisCode: 'J95.821', facilityRef: 'Northstar LTACH', units: 24, description: 'Post-procedure respiratory failure LTACH stay', urgency: 'urgent', status: 'payer_error', risk: 57600, delay: 40, outcome: null },
  { serviceLine: 'inpatient_rehab', payerRef: 'Evergreen Medicare Advantage', procedureCode: '97110', diagnosisCode: 'M21.372', facilityRef: 'Pinecrest Rehabilitation', units: 9, description: 'Neurologic gait and foot-drop rehabilitation', urgency: 'standard', status: 'approved', risk: 18400, delay: 14, outcome: 'approved_appeal', denial: 'level_of_care' },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const identity = await client.query(
    `SELECT id FROM prior_auth_identities
     WHERE tenant_id=$1 AND role='admin' AND disabled_at IS NULL
     ORDER BY created_at LIMIT 1`,
    [tenantId],
  );
  const ownerId = identity.rows[0]?.id;
  if (!ownerId) throw new Error('Provision the local administrator before demo records');

  for (const [index, scenario] of scenarios.entries()) {
    const [payerRef, procedureCode, diagnosisCode, description, urgency, status] = scenario;
    const criterionCode = `DOC-${String(index + 1).padStart(2, '0')}`;
    const policyVersion = `2026.${String((index % 4) + 1).padStart(2, '0')}`;
    const policyId = stableUuid(`policy-${index + 1}`);
    await client.query(
      `INSERT INTO prior_auth_policy_rules(id,tenant_id,payer_ref,procedure_code,version,source_uri,effective_at,rules,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT(tenant_id,payer_ref,procedure_code,version) DO NOTHING`,
      [policyId, tenantId, payerRef, procedureCode, policyVersion, `urn:synthetic:payer-policy:${index + 1}`, new Date(Date.UTC(2026, index % 6, 1)), JSON.stringify([{ code: criterionCode, description: `Clinical documentation supporting ${description.toLowerCase()}`, required: true }]), ownerId],
    );

    const caseId = stableUuid(`case-${index + 1}`);
    const memberRef = `SYNTH-MEMBER-${String(index + 1).padStart(4, '0')}`;
    const dueAt = new Date(Date.UTC(2026, 7, 1 + index, urgency === 'urgent' ? 16 : 21));
    const acceptanceCriteria = [{ code: criterionCode, description: `Verify ${description.toLowerCase()} documentation and payer criteria`, required: true }];
    const payload = { memberRef, payerRef, procedureCode, diagnosisCode, requestedBy: `Synthetic Provider Group ${String.fromCharCode(65 + (index % 5))}`, urgency, dueAt: dueAt.toISOString(), acceptanceCriteria };
    const encrypted = governance.encrypt(payload, dataKey, activeKeyVersion, `tenant:${tenantId}:prior-auth-case:${caseId}`);
    const requestDigest = governance.digest(payload);
    const memberToken = governance.digest({ tenantId, memberRef }).slice(0, 16);
    const payerReceipt = ['submitted', 'denied', 'approved', 'appeal_review', 'appeal_ready', 'appeal_queued', 'appealed', 'closed'].includes(status) ? `SYNTH-PAYER-${1000 + index}` : null;
    await client.query(
      `INSERT INTO governed_prior_auth_cases(id,tenant_id,member_ref_token,payer_ref,procedure_code,diagnosis_code,requested_by,owner_id,status,version,urgency,due_at,acceptance_criteria,payload_encrypted,encryption_key_version,idempotency_key,request_digest,policy_version,payer_receipt)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       ON CONFLICT(tenant_id,idempotency_key) DO NOTHING`,
      [caseId, tenantId, memberToken, payerRef, procedureCode, diagnosisCode, payload.requestedBy, ownerId, status, Math.max(1, index + 1), urgency, dueAt, JSON.stringify(acceptanceCriteria), JSON.stringify(encrypted), activeKeyVersion, `synthetic-prior-auth-${index + 1}`, requestDigest, index > 1 ? policyVersion : null, payerReceipt],
    );

    const evidenceId = stableUuid(`evidence-${index + 1}`);
    const evidenceUri = `urn:synthetic:fhir:DocumentReference:${1000 + index}`;
    const evidenceDigest = governance.digest({ evidenceUri, criterionCode });
    const encryptedSource = governance.encrypt({ uri: evidenceUri }, dataKey, activeKeyVersion, `tenant:${tenantId}:prior-auth-evidence:${evidenceId}`);
    await client.query(
      `INSERT INTO prior_auth_evidence(id,tenant_id,case_id,evidence_type,evidence_code,source_system,source_version,effective_at,content_digest,source_encrypted,encryption_key_version,created_by)
       VALUES($1,$2,$3,'clinical_document',$4,'fhir','R4',$5,$6,$7,$8,$9)
       ON CONFLICT(case_id,source_system,content_digest) DO NOTHING`,
      [evidenceId, tenantId, caseId, criterionCode, new Date(Date.UTC(2026, 6, 10 + index)), evidenceDigest, JSON.stringify(encryptedSource), activeKeyVersion, ownerId],
    );

    const existingEvent = await client.query(
      `SELECT 1 FROM prior_auth_workflow_events WHERE tenant_id=$1 AND case_id=$2 AND event_type='synthetic_demo_created'`,
      [tenantId, caseId],
    );
    if (!existingEvent.rowCount) {
      await client.query(
        `INSERT INTO prior_auth_workflow_events(tenant_id,case_id,event_type,from_status,to_status,actor_id,actor_role,reason,correlation_id,details)
         VALUES($1,$2,'synthetic_demo_created',NULL,$3,$4,'admin','Synthetic local demo case provisioned',$5,$6)`,
        [tenantId, caseId, status, ownerId, `synthetic-${index + 1}`, JSON.stringify({ criterionCode, policyVersion })],
      );
    }
  }

  for (const [index, scenario] of postAcuteScenarios.entries()) {
    const sequence = index + 1;
    const caseId = stableUuid(`post-acute-case-${sequence}`);
    const criterionCodes = [`PAC-FUNCTION-${String(sequence).padStart(2, '0')}`, `PAC-CAREPLAN-${String(sequence).padStart(2, '0')}`];
    const policyVersion = `PAC-2026.${String((index % 4) + 1).padStart(2, '0')}`;
    await client.query(
      `INSERT INTO prior_auth_policy_rules(id,tenant_id,payer_ref,procedure_code,version,source_uri,effective_at,rules,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(tenant_id,payer_ref,procedure_code,version) DO NOTHING`,
      [stableUuid(`post-acute-policy-${sequence}`), tenantId, scenario.payerRef, scenario.procedureCode, policyVersion,
        `urn:synthetic:post-acute-policy:${sequence}`, new Date(Date.UTC(2026, 0, 1)),
        JSON.stringify([
          { code: criterionCodes[0], description: `Current functional status and skilled need for ${scenario.description.toLowerCase()}`, required: true },
          { code: criterionCodes[1], description: 'Interdisciplinary care plan, goals, and anticipated duration', required: true },
        ]), ownerId],
    );
    const dueAt = new Date(Date.now() + (scenario.urgency === 'urgent' ? (6 + index) * 3600000 : (48 + index * 3) * 3600000));
    const appealDueAt = scenario.denial ? new Date(Date.now() + (48 + index * 4) * 3600000) : null;
    const memberRef = `SYNTH-PAC-${String(sequence).padStart(4, '0')}`;
    const acceptanceCriteria = criterionCodes.map((code, criterionIndex) => ({ code, description: criterionIndex === 0 ? 'Validate current functional status and skilled need' : 'Validate plan of care, goals, and anticipated duration', required: true }));
    const payload = { memberRef, payerRef: scenario.payerRef, procedureCode: scenario.procedureCode, diagnosisCode: scenario.diagnosisCode,
      requestedBy: `${scenario.facilityRef} Transition Team`, urgency: scenario.urgency, dueAt: dueAt.toISOString(), acceptanceCriteria,
      serviceLine: scenario.serviceLine, facilityRef: scenario.facilityRef, requestedUnits: scenario.units,
      estimatedRevenueAtRisk: scenario.risk, careDelayHours: scenario.delay };
    const encrypted = governance.encrypt(payload, dataKey, activeKeyVersion, `tenant:${tenantId}:prior-auth-case:${caseId}`);
    const authorizedUnits = scenario.outcome === 'partially_approved' ? Math.max(1, Math.floor(scenario.units * 0.6)) : scenario.outcome?.startsWith('approved') ? scenario.units : scenario.outcome === 'upheld' ? 0 : null;
    const recovered = scenario.outcome === 'approved_appeal' ? scenario.risk : scenario.outcome === 'partially_approved' ? Math.round(scenario.risk * 0.6) : scenario.outcome === 'approved_initial' ? scenario.risk : 0;
    await client.query(
      `INSERT INTO governed_prior_auth_cases(
        id,tenant_id,member_ref_token,payer_ref,procedure_code,diagnosis_code,requested_by,owner_id,status,version,urgency,due_at,
        acceptance_criteria,payload_encrypted,encryption_key_version,idempotency_key,request_digest,policy_version,payer_receipt,
        service_line,facility_ref,requested_units,authorized_units,denial_category,appeal_outcome,decision_at,appeal_due_at,
        estimated_revenue_at_risk,recovered_revenue,care_delay_hours
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
      ON CONFLICT(tenant_id,idempotency_key) DO NOTHING`,
      [caseId, tenantId, governance.digest({ tenantId, memberRef }).slice(0, 16), scenario.payerRef, scenario.procedureCode,
        scenario.diagnosisCode, payload.requestedBy, ownerId, scenario.status, sequence + 1, scenario.urgency, dueAt,
        JSON.stringify(acceptanceCriteria), JSON.stringify(encrypted), activeKeyVersion, `synthetic-post-acute-${sequence}`,
        governance.digest(payload), policyVersion, scenario.denial ? `SYNTH-PAC-DENIAL-${1000 + sequence}` : null,
        scenario.serviceLine, scenario.facilityRef, scenario.units, authorizedUnits, scenario.denial || null, scenario.outcome || null,
        scenario.outcome ? new Date(Date.now() - (24 + index * 5) * 3600000) : null, appealDueAt, scenario.risk, recovered, scenario.delay],
    );

    for (const [evidenceIndex, criterionCode] of criterionCodes.entries()) {
      const evidenceId = stableUuid(`post-acute-evidence-${sequence}-${evidenceIndex + 1}`);
      const evidenceUri = `urn:synthetic:fhir:DocumentReference:PAC-${sequence}-${evidenceIndex + 1}`;
      const evidenceDigest = governance.digest({ evidenceUri, criterionCode });
      const encryptedSource = governance.encrypt({ uri: evidenceUri }, dataKey, activeKeyVersion, `tenant:${tenantId}:prior-auth-evidence:${evidenceId}`);
      await client.query(
        `INSERT INTO prior_auth_evidence(id,tenant_id,case_id,evidence_type,evidence_code,source_system,source_version,effective_at,content_digest,source_encrypted,encryption_key_version,created_by)
         VALUES($1,$2,$3,$4,$5,'fhir','R4',$6,$7,$8,$9,$10) ON CONFLICT(case_id,source_system,content_digest) DO NOTHING`,
        [evidenceId, tenantId, caseId, evidenceIndex === 0 ? 'functional_assessment' : 'interdisciplinary_care_plan', criterionCode,
          new Date(Date.now() - (12 + index) * 3600000), evidenceDigest, JSON.stringify(encryptedSource), activeKeyVersion, ownerId],
      );
    }

    if (scenario.outcome) {
      const decidedAt = new Date(Date.now() - (24 + index * 5) * 3600000);
      await client.query(
        `INSERT INTO prior_auth_case_outcomes(
          id,tenant_id,case_id,outcome,decision_stage,denial_category,evidence_codes,requested_units,authorized_units,
          turnaround_hours,care_delay_hours,revenue_at_risk,recovered_revenue,rationale,human_verified_by,decided_at
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT(id) DO NOTHING`,
        [stableUuid(`post-acute-outcome-${sequence}`), tenantId, caseId, scenario.outcome,
          scenario.outcome === 'approved_appeal' ? 'first_level_appeal' : scenario.outcome === 'upheld' ? 'peer_to_peer' : 'initial',
          scenario.denial || null, JSON.stringify(criterionCodes), scenario.units, authorizedUnits ?? 0,
          18 + index * 3.5, scenario.delay, scenario.risk, recovered,
          `Human-verified synthetic outcome for ${scenario.description.toLowerCase()}; retained for local learning-loop demonstration.`, ownerId, decidedAt],
      );
    }
    const existingEvent = await client.query(
      `SELECT 1 FROM prior_auth_workflow_events WHERE tenant_id=$1 AND case_id=$2 AND event_type='post_acute_demo_created'`,
      [tenantId, caseId],
    );
    if (!existingEvent.rowCount) await client.query(
      `INSERT INTO prior_auth_workflow_events(tenant_id,case_id,event_type,from_status,to_status,actor_id,actor_role,reason,correlation_id,details)
       VALUES($1,$2,'post_acute_demo_created',NULL,$3,$4,'admin','Synthetic post-acute learning case provisioned',$5,$6)`,
      [tenantId, caseId, scenario.status, ownerId, `synthetic-pac-${sequence}`, JSON.stringify({ serviceLine: scenario.serviceLine, facilityRef: scenario.facilityRef, policyVersion })],
    );
  }
  await client.query('COMMIT');
  const total = await client.query('SELECT COUNT(*)::int AS count FROM governed_prior_auth_cases WHERE tenant_id=$1', [tenantId]);
  console.log(`Prior authorization demo data ready: ${total.rows[0].count} cases.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
