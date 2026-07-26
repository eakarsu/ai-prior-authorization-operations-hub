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
