import { priorAuthFeatures } from '@/lib/priorAuthNavigation';

export type PriorAuthStatus =
  | 'Intake'
  | 'Rule Match'
  | 'Evidence Review'
  | 'Packet Ready'
  | 'Submitted'
  | 'Payer Review'
  | 'Approved'
  | 'Denied'
  | 'Appeal Draft'
  | 'Appeal Submitted';

export type EvidenceStatus = 'Satisfied' | 'Missing' | 'Needs review' | 'Waived';

export type PriorAuthDocument = {
  id: string;
  name: string;
  type: string;
  status: 'Draft' | 'Attached' | 'Accepted' | 'Rejected';
};

export type PriorAuthEvidence = {
  id: string;
  label: string;
  category: string;
  status: EvidenceStatus;
  source: string;
  required: boolean;
};

export type PriorAuthHistory = {
  id: string;
  at: string;
  actor: string;
  event: string;
  note: string;
};

export type PriorAuthCase = {
  id: string;
  caseNumber: string;
  patient: {
    id: string;
    name: string;
    dateOfBirth: string;
    memberId: string;
  };
  provider: {
    name: string;
    npi: string;
    specialty: string;
    facility: string;
  };
  payer: {
    name: string;
    plan: string;
    policyId: string;
    portal: string;
  };
  service: {
    name: string;
    type: string;
    urgency: 'Standard' | 'Urgent';
    cptCodes: string[];
    hcpcsCodes: string[];
    icd10Codes: string[];
    placeOfService: string;
    requestedDate: string;
    targetDecisionDate: string;
  };
  status: PriorAuthStatus;
  assignedTo: string;
  submittedAt?: string;
  payerResponseAt?: string;
  denialReason?: string;
  deniedAt?: string;
  appealDueDate?: string;
  documents: PriorAuthDocument[];
  evidence: PriorAuthEvidence[];
  history: PriorAuthHistory[];
};

export type PayerPolicy = {
  id: string;
  payer: string;
  plan: string;
  serviceType: string;
  procedureKeywords: string[];
  coveredIndications: string[];
  requiredEvidence: string[];
  contraindications: string[];
  priorTherapyRequired: string[];
  standardTurnaroundDays: number;
  urgentTurnaroundHours: number;
  appealWindowDays: number;
};

export type RuleAssessment = {
  policy: PayerPolicy;
  matchedCriteria: string[];
  missingEvidence: string[];
  contraindicationFlags: string[];
  priorTherapyGaps: string[];
  confidence: number;
  fit: 'Strong' | 'Needs evidence' | 'At risk';
};

export type EvidenceGap = {
  label: string;
  category: string;
  severity: 'High' | 'Medium' | 'Low';
  nextAction: string;
};

export type PacketAssessment = {
  readiness: number;
  status: 'Ready' | 'Needs evidence' | 'Needs review';
  coverLetterDraft: string;
  attachedDocuments: PriorAuthDocument[];
  requiredForms: Array<{ name: string; status: string }>;
  validationChecks: Array<{ label: string; passed: boolean }>;
};

export type SubmissionChannel = {
  id: string;
  name: string;
  type: 'EHR/FHIR' | 'Payer portal' | 'Clearinghouse' | 'Fax' | 'Email' | 'SFTP';
  status: 'Ready' | 'Stubbed' | 'Needs credentials' | 'Connected';
  lastSync: string;
  nextAction: string;
};

export type AppealAssessment = {
  needed: boolean;
  denialClass: string;
  appealDueDate: string;
  reviewer: string;
  letterDraft: string;
  resubmissionStatus: string;
};

export type SlaAssessment = {
  dueDate: string;
  daysRemaining: number;
  overdue: boolean;
  escalationLevel: 'None' | 'Team lead' | 'Manager' | 'Urgent clinical';
  triggers: string[];
};

export type AnalyticsSnapshot = {
  totalCases: number;
  approvalRate: number;
  denialRate: number;
  averageTurnaroundDays: number;
  appealSuccessRate: number;
  leakageRisk: number;
  byPayer: Array<{ payer: string; total: number; approved: number; denied: number }>;
  byProcedure: Array<{ procedure: string; total: number; missingEvidence: number }>;
  topMissingEvidence: Array<{ label: string; count: number }>;
};

export type ComplianceControl = {
  id: string;
  label: string;
  status: 'Active' | 'Needs setup';
  detail: string;
};

export type PriorAuthSubFeatureSeedRow = {
  id: string;
  featureSlug: string;
  featureTitle: string;
  subfeatureSlug: string;
  subfeatureTitle: string;
  sequence: number;
  title: string;
  recordType: string;
  status: string;
  owner: string;
  summary: string;
  nextAction: string;
};

export type PriorAuthCaseDerived = {
  rule: RuleAssessment;
  evidenceGaps: EvidenceGap[];
  packet: PacketAssessment;
  submissionChannels: SubmissionChannel[];
  appeal: AppealAssessment;
  sla: SlaAssessment;
};

export type PriorAuthWorkspacePayload = {
  cases: PriorAuthCase[];
  derived: Record<string, PriorAuthCaseDerived>;
  analytics: AnalyticsSnapshot;
  integrations: SubmissionChannel[];
  compliance: ComplianceControl[];
  subfeatureRows: Record<string, PriorAuthSubFeatureSeedRow[]>;
  timelineSteps: PriorAuthStatus[];
};

export const priorAuthTimelineSteps: PriorAuthStatus[] = [
  'Intake',
  'Rule Match',
  'Evidence Review',
  'Packet Ready',
  'Submitted',
  'Payer Review',
  'Approved',
  'Denied',
  'Appeal Draft',
  'Appeal Submitted',
];

export const payerPolicies: PayerPolicy[] = [
  {
    id: 'uhc-mri-spine-2026',
    payer: 'UnitedHealthcare',
    plan: 'Choice Plus',
    serviceType: 'Imaging',
    procedureKeywords: ['MRI', 'spine', 'lumbar'],
    coveredIndications: ['M54.16', 'M48.06', 'neurologic deficit', 'failed conservative therapy'],
    requiredEvidence: ['Clinical notes', 'Imaging order', 'Six weeks conservative therapy', 'Neurologic exam'],
    contraindications: ['Implanted incompatible device', 'Recent duplicate imaging'],
    priorTherapyRequired: ['Physical therapy', 'NSAID trial'],
    standardTurnaroundDays: 5,
    urgentTurnaroundHours: 24,
    appealWindowDays: 30,
  },
  {
    id: 'aetna-biologic-rheum-2026',
    payer: 'Aetna',
    plan: 'Commercial PPO',
    serviceType: 'Medication',
    procedureKeywords: ['Adalimumab', 'biologic', 'rheumatology'],
    coveredIndications: ['M06.9', 'moderate disease activity', 'DMARD failure'],
    requiredEvidence: ['Clinical notes', 'Lab results', 'Prior therapy history', 'Medication list'],
    contraindications: ['Active infection', 'Untreated latent TB'],
    priorTherapyRequired: ['Methotrexate trial', 'TB screening'],
    standardTurnaroundDays: 7,
    urgentTurnaroundHours: 48,
    appealWindowDays: 60,
  },
  {
    id: 'bcbs-dme-cpap-2026',
    payer: 'BlueCross BlueShield',
    plan: 'Blue Select',
    serviceType: 'DME',
    procedureKeywords: ['CPAP', 'sleep apnea', 'DME'],
    coveredIndications: ['G47.33', 'AHI above threshold', 'documented symptoms'],
    requiredEvidence: ['Sleep study', 'Clinical notes', 'Prescription', 'Device settings'],
    contraindications: ['Incomplete diagnostic study'],
    priorTherapyRequired: ['Mask fitting documentation'],
    standardTurnaroundDays: 4,
    urgentTurnaroundHours: 24,
    appealWindowDays: 45,
  },
];

export const integrationChannels: SubmissionChannel[] = [
  { id: 'fhir-ehr', name: 'EHR FHIR case import', type: 'EHR/FHIR', status: 'Stubbed', lastSync: '2026-06-06 08:00', nextAction: 'Map patient, coverage, service request, and document references.' },
  { id: 'payer-portal', name: 'Payer portal submission', type: 'Payer portal', status: 'Needs credentials', lastSync: 'Not connected', nextAction: 'Store portal credentials in environment secrets and enable polling.' },
  { id: 'clearinghouse', name: '278 clearinghouse gateway', type: 'Clearinghouse', status: 'Stubbed', lastSync: '2026-06-06 07:30', nextAction: 'Configure trading partner IDs and X12 validation.' },
  { id: 'fax', name: 'Clinical fax fallback', type: 'Fax', status: 'Ready', lastSync: '2026-06-06 09:15', nextAction: 'Route only exception packets that cannot use portal or clearinghouse.' },
  { id: 'secure-email', name: 'Secure payer email', type: 'Email', status: 'Ready', lastSync: '2026-06-06 09:45', nextAction: 'Use encrypted templates for payer-specific exceptions.' },
  { id: 'sftp', name: 'Batch SFTP drop', type: 'SFTP', status: 'Stubbed', lastSync: '2026-06-05 18:00', nextAction: 'Add payer folder mapping and acknowledgement parser.' },
];

export const complianceControls: ComplianceControl[] = [
  { id: 'signed-session', label: 'Signed session cookies', status: 'Active', detail: 'Sessions are HMAC signed with AUTH_SECRET when configured, with legacy demo fallback for local pilots.' },
  { id: 'role-access', label: 'Role-based access', status: 'Active', detail: 'Managers and admins can edit case state; only approvers can approve or reject records.' },
  { id: 'phi-audit', label: 'PHI-safe audit logging', status: 'Active', detail: 'Prior-auth audit events avoid patient names, member IDs, and diagnosis text.' },
  { id: 'access-log', label: 'Case workspace access log', status: 'Active', detail: 'Case list reads and writes append non-PHI audit events with user role and action.' },
  { id: 'env-auth', label: 'Environment user configuration', status: 'Active', detail: 'Set PRIOR_AUTH_USERS_JSON to replace seeded local demo credentials.' },
  { id: 'secret-config', label: 'Environment-specific secrets', status: 'Needs setup', detail: 'Set AUTH_SECRET, DATABASE_URL, OPENAI_API_KEY, and connector credentials per environment.' },
  { id: 'least-privilege', label: 'Least privilege roles', status: 'Active', detail: 'Analyst, manager, and admin capabilities are separated for read, edit, and approval actions.' },
  { id: 'cookie-http-only', label: 'HTTP-only session cookie', status: 'Active', detail: 'Session state is not exposed to browser JavaScript.' },
  { id: 'same-site-cookie', label: 'SameSite session policy', status: 'Active', detail: 'Session cookies use SameSite lax behavior for local and pilot workflows.' },
  { id: 'secure-cookie-prod', label: 'Secure production cookies', status: 'Active', detail: 'Production sessions set the secure flag when NODE_ENV is production.' },
  { id: 'member-redaction', label: 'Member ID redaction', status: 'Active', detail: 'Member identifiers are masked in visible case queue summaries.' },
  { id: 'connector-secrets', label: 'Connector secret isolation', status: 'Needs setup', detail: 'Payer portal, clearinghouse, SFTP, fax, and AI credentials should be supplied only through environment secrets.' },
  { id: 'audit-minimization', label: 'Audit data minimization', status: 'Active', detail: 'Audit entries describe operational actions without storing clinical note text.' },
  { id: 'database-url-config', label: 'Database URL configuration', status: 'Active', detail: 'DATABASE_URL can point each environment to an isolated Postgres database.' },
  { id: 'ai-provider-config', label: 'AI provider configuration', status: 'Needs setup', detail: 'OPENAI_API_KEY, OPENAI_BASE_URL, and OPENAI_MODEL configure the AI provider without code changes.' },
];

export const seedPriorAuthCases: PriorAuthCase[] = [
  {
    id: 'pa-1001',
    caseNumber: 'PA-2026-1001',
    patient: { id: 'pat-11', name: 'Maya Chen', dateOfBirth: '1977-04-12', memberId: 'UHC-8834412' },
    provider: { name: 'Northside Orthopedics', npi: '1285639402', specialty: 'Orthopedics', facility: 'Northside Clinic' },
    payer: { name: 'UnitedHealthcare', plan: 'Choice Plus', policyId: 'uhc-mri-spine-2026', portal: 'UHC Provider Portal' },
    service: {
      name: 'Lumbar spine MRI without contrast',
      type: 'Imaging',
      urgency: 'Standard',
      cptCodes: ['72148'],
      hcpcsCodes: [],
      icd10Codes: ['M54.16'],
      placeOfService: 'Outpatient hospital',
      requestedDate: '2026-06-01',
      targetDecisionDate: '2026-06-07',
    },
    status: 'Evidence Review',
    assignedTo: 'Evidence Lead',
    documents: [
      { id: 'doc-pa-1001-1', name: 'Orthopedic clinical note', type: 'Clinical notes', status: 'Attached' },
      { id: 'doc-pa-1001-2', name: 'MRI order', type: 'Imaging order', status: 'Attached' },
    ],
    evidence: [
      { id: 'ev-1001-1', label: 'Clinical notes', category: 'Clinical', status: 'Satisfied', source: 'EHR', required: true },
      { id: 'ev-1001-2', label: 'Imaging order', category: 'Order', status: 'Satisfied', source: 'EHR', required: true },
      { id: 'ev-1001-3', label: 'Six weeks conservative therapy', category: 'Prior therapy', status: 'Missing', source: 'Clinical notes', required: true },
      { id: 'ev-1001-4', label: 'Neurologic exam', category: 'Clinical', status: 'Needs review', source: 'Clinical notes', required: true },
    ],
    history: [
      { id: 'hist-1001-1', at: '2026-06-01 09:05', actor: 'Intake Lead', event: 'Case created', note: 'Request imported from scheduling workqueue.' },
      { id: 'hist-1001-2', at: '2026-06-02 11:20', actor: 'Rules Lead', event: 'Policy matched', note: 'UHC lumbar MRI criteria selected.' },
    ],
  },
  {
    id: 'pa-1002',
    caseNumber: 'PA-2026-1002',
    patient: { id: 'pat-12', name: 'Owen Rivera', dateOfBirth: '1968-10-02', memberId: 'AET-7740391' },
    provider: { name: 'Rheumatology Associates', npi: '1447382190', specialty: 'Rheumatology', facility: 'Downtown Specialty Center' },
    payer: { name: 'Aetna', plan: 'Commercial PPO', policyId: 'aetna-biologic-rheum-2026', portal: 'Availity' },
    service: {
      name: 'Adalimumab starter authorization',
      type: 'Medication',
      urgency: 'Urgent',
      cptCodes: [],
      hcpcsCodes: ['J0135'],
      icd10Codes: ['M06.9'],
      placeOfService: 'Specialty pharmacy',
      requestedDate: '2026-06-03',
      targetDecisionDate: '2026-06-05',
    },
    status: 'Submitted',
    assignedTo: 'Submission Lead',
    submittedAt: '2026-06-04',
    documents: [
      { id: 'doc-pa-1002-1', name: 'Rheumatology progress note', type: 'Clinical notes', status: 'Attached' },
      { id: 'doc-pa-1002-2', name: 'Methotrexate trial summary', type: 'Prior therapy history', status: 'Accepted' },
      { id: 'doc-pa-1002-3', name: 'CBC/CMP labs', type: 'Lab results', status: 'Attached' },
    ],
    evidence: [
      { id: 'ev-1002-1', label: 'Clinical notes', category: 'Clinical', status: 'Satisfied', source: 'EHR', required: true },
      { id: 'ev-1002-2', label: 'Lab results', category: 'Labs', status: 'Satisfied', source: 'Lab interface', required: true },
      { id: 'ev-1002-3', label: 'Prior therapy history', category: 'Prior therapy', status: 'Satisfied', source: 'EHR', required: true },
      { id: 'ev-1002-4', label: 'Medication list', category: 'Medication', status: 'Needs review', source: 'EHR', required: true },
    ],
    history: [
      { id: 'hist-1002-1', at: '2026-06-03 14:10', actor: 'Intake Lead', event: 'Case created', note: 'Urgent medication authorization opened.' },
      { id: 'hist-1002-2', at: '2026-06-04 10:30', actor: 'Submission Lead', event: 'Submitted to payer', note: 'Packet sent through portal stub.' },
    ],
  },
  {
    id: 'pa-1003',
    caseNumber: 'PA-2026-1003',
    patient: { id: 'pat-13', name: 'Lena Brooks', dateOfBirth: '1984-01-24', memberId: 'BCBS-1129033' },
    provider: { name: 'Sleep Health Partners', npi: '1871529355', specialty: 'Pulmonology', facility: 'Sleep Health Lab' },
    payer: { name: 'BlueCross BlueShield', plan: 'Blue Select', policyId: 'bcbs-dme-cpap-2026', portal: 'BCBS Provider Central' },
    service: {
      name: 'CPAP device and supplies',
      type: 'DME',
      urgency: 'Standard',
      cptCodes: [],
      hcpcsCodes: ['E0601', 'A7030'],
      icd10Codes: ['G47.33'],
      placeOfService: 'Home',
      requestedDate: '2026-05-29',
      targetDecisionDate: '2026-06-03',
    },
    status: 'Denied',
    assignedTo: 'Appeals Lead',
    submittedAt: '2026-05-30',
    payerResponseAt: '2026-06-02',
    deniedAt: '2026-06-02',
    denialReason: 'Sleep study did not include signed interpretation and device settings.',
    appealDueDate: '2026-07-17',
    documents: [
      { id: 'doc-pa-1003-1', name: 'Sleep study report', type: 'Sleep study', status: 'Rejected' },
      { id: 'doc-pa-1003-2', name: 'CPAP prescription', type: 'Prescription', status: 'Attached' },
    ],
    evidence: [
      { id: 'ev-1003-1', label: 'Sleep study', category: 'Diagnostic', status: 'Needs review', source: 'Sleep lab', required: true },
      { id: 'ev-1003-2', label: 'Clinical notes', category: 'Clinical', status: 'Satisfied', source: 'EHR', required: true },
      { id: 'ev-1003-3', label: 'Prescription', category: 'Order', status: 'Satisfied', source: 'EHR', required: true },
      { id: 'ev-1003-4', label: 'Device settings', category: 'DME', status: 'Missing', source: 'DME vendor', required: true },
    ],
    history: [
      { id: 'hist-1003-1', at: '2026-05-29 08:45', actor: 'Intake Lead', event: 'Case created', note: 'DME authorization opened.' },
      { id: 'hist-1003-2', at: '2026-06-02 16:20', actor: 'Payer', event: 'Denied', note: 'Missing signed interpretation and device settings.' },
    ],
  },
  ...buildSupplementalSeedCases(),
];

export function buildPriorAuthSubFeatureSeedRows(cases: PriorAuthCase[] = seedPriorAuthCases): PriorAuthSubFeatureSeedRow[] {
  return priorAuthFeatures.flatMap((feature) =>
    feature.subfeatures.flatMap((subfeature) =>
      Array.from({ length: 15 }, (_, index) => {
        const authCase = cases[index % Math.max(cases.length, 1)];
        const sequence = index + 1;
        const caseNumber = authCase?.caseNumber || 'PA-2026-SEED';
        return {
          id: `pa-subfeature-${feature.slug}-${subfeature.slug}-${String(sequence).padStart(2, '0')}`,
          featureSlug: feature.slug,
          featureTitle: feature.title,
          subfeatureSlug: subfeature.slug,
          subfeatureTitle: subfeature.title,
          sequence,
          title: `${subfeature.title} record ${String(sequence).padStart(2, '0')}`,
          recordType: subfeature.title,
          status: sequence % 5 === 0 ? 'Needs review' : sequence % 3 === 0 ? 'In progress' : 'Ready',
          owner: ['Intake Lead', 'Rules Lead', 'Evidence Lead', 'Submission Lead', 'Appeals Lead'][index % 5],
          summary: `${subfeature.summary} Seeded from ${caseNumber} for Postgres-backed sub-feature coverage.`,
          nextAction: sequence % 4 === 0 ? 'Escalate owner review.' : sequence % 2 === 0 ? 'Validate source data.' : 'Continue operational follow-up.',
        };
      }),
    ),
  );
}

export const seedPriorAuthSubFeatureRows = buildPriorAuthSubFeatureSeedRows(seedPriorAuthCases);

function buildSupplementalSeedCases(): PriorAuthCase[] {
  const names = [
    ['Noah Patel', 'pat-14', 'UHC-1190431', 'UnitedHealthcare', 'Choice Plus', 'uhc-mri-spine-2026', 'Lumbar spine MRI with contrast', 'Imaging', '72149', '', 'M48.06', 'Payer Review', '2026-06-02', '2026-06-08'],
    ['Grace Kim', 'pat-15', 'AET-2201947', 'Aetna', 'Commercial PPO', 'aetna-biologic-rheum-2026', 'Adalimumab continuation request', 'Medication', '', 'J0135', 'M06.9', 'Approved', '2026-05-28', '2026-06-04'],
    ['Elias Martin', 'pat-16', 'BCBS-3302850', 'BlueCross BlueShield', 'Blue Select', 'bcbs-dme-cpap-2026', 'CPAP humidifier and supplies', 'DME', '', 'A7035', 'G47.33', 'Packet Ready', '2026-06-04', '2026-06-09'],
    ['Sofia Nguyen', 'pat-17', 'UHC-4403759', 'UnitedHealthcare', 'Choice Plus', 'uhc-mri-spine-2026', 'Cervical spine MRI', 'Imaging', '72141', '', 'M54.12', 'Rule Match', '2026-06-05', '2026-06-10'],
    ['Henry Adams', 'pat-18', 'AET-5504662', 'Aetna', 'Commercial PPO', 'aetna-biologic-rheum-2026', 'Biologic therapy prior authorization', 'Medication', '', 'J0135', 'M05.79', 'Evidence Review', '2026-06-01', '2026-06-07'],
    ['Ava Johnson', 'pat-19', 'BCBS-6605571', 'BlueCross BlueShield', 'Blue Select', 'bcbs-dme-cpap-2026', 'Auto-CPAP device', 'DME', '', 'E0601', 'G47.33', 'Submitted', '2026-06-03', '2026-06-07'],
    ['Mateo Garcia', 'pat-20', 'UHC-7706484', 'UnitedHealthcare', 'Choice Plus', 'uhc-mri-spine-2026', 'Lumbar MRI repeat request', 'Imaging', '72148', '', 'M54.16', 'Denied', '2026-05-25', '2026-05-31'],
    ['Mia Thompson', 'pat-21', 'AET-8807393', 'Aetna', 'Commercial PPO', 'aetna-biologic-rheum-2026', 'Rheumatology medication escalation', 'Medication', '', 'J1602', 'M06.9', 'Appeal Draft', '2026-05-22', '2026-05-29'],
    ['Lucas Brown', 'pat-22', 'BCBS-9908206', 'BlueCross BlueShield', 'Blue Select', 'bcbs-dme-cpap-2026', 'CPAP replacement request', 'DME', '', 'E0601', 'G47.33', 'Appeal Submitted', '2026-05-20', '2026-05-26'],
    ['Amelia Davis', 'pat-23', 'UHC-1019115', 'UnitedHealthcare', 'Choice Plus', 'uhc-mri-spine-2026', 'Urgent lumbar MRI', 'Imaging', '72148', '', 'M54.16', 'Intake', '2026-06-06', '2026-06-07'],
    ['Jack Wilson', 'pat-24', 'AET-2120028', 'Aetna', 'Commercial PPO', 'aetna-biologic-rheum-2026', 'Specialty pharmacy biologic renewal', 'Medication', '', 'J0135', 'M06.9', 'Payer Review', '2026-06-02', '2026-06-06'],
    ['Nora Miller', 'pat-25', 'BCBS-3230937', 'BlueCross BlueShield', 'Blue Select', 'bcbs-dme-cpap-2026', 'Sleep apnea DME authorization', 'DME', '', 'A7030', 'G47.33', 'Approved', '2026-05-30', '2026-06-03'],
  ] as const;

  return names.map((item, index) => {
    const [patientName, patientId, memberId, payerName, plan, policyId, serviceName, serviceType, cpt, hcpcs, icd, status, requestedDate, targetDecisionDate] = item;
    const idNumber = 1004 + index;
    const denied = status === 'Denied' || status === 'Appeal Draft' || status === 'Appeal Submitted';
    const medication = serviceType === 'Medication';
    const dme = serviceType === 'DME';
    const imaging = serviceType === 'Imaging';
    const evidence: PriorAuthEvidence[] = [
      { id: `ev-${idNumber}-1`, label: dme ? 'Sleep study' : 'Clinical notes', category: dme ? 'Diagnostic' : 'Clinical', status: index % 4 === 0 ? 'Needs review' : 'Satisfied', source: dme ? 'Sleep lab' : 'EHR', required: true },
      { id: `ev-${idNumber}-2`, label: medication ? 'Lab results' : imaging ? 'Imaging order' : 'Prescription', category: medication ? 'Labs' : 'Order', status: 'Satisfied', source: medication ? 'Lab interface' : 'EHR', required: true },
      { id: `ev-${idNumber}-3`, label: medication ? 'Prior therapy history' : imaging ? 'Six weeks conservative therapy' : 'Device settings', category: medication || imaging ? 'Prior therapy' : 'DME', status: index % 3 === 0 ? 'Missing' : 'Satisfied', source: medication ? 'EHR' : imaging ? 'Clinical notes' : 'DME vendor', required: true },
      { id: `ev-${idNumber}-4`, label: medication ? 'Medication list' : imaging ? 'Neurologic exam' : 'Clinical notes', category: 'Clinical', status: index % 5 === 0 ? 'Needs review' : 'Satisfied', source: 'EHR', required: true },
    ];
    return {
      id: `pa-${idNumber}`,
      caseNumber: `PA-2026-${idNumber}`,
      patient: { id: patientId, name: patientName, dateOfBirth: `19${70 + (index % 20)}-${String((index % 12) + 1).padStart(2, '0')}-15`, memberId },
      provider: {
        name: medication ? 'Rheumatology Associates' : dme ? 'Sleep Health Partners' : 'Northside Orthopedics',
        npi: String(1200000000 + idNumber),
        specialty: medication ? 'Rheumatology' : dme ? 'Pulmonology' : 'Orthopedics',
        facility: medication ? 'Downtown Specialty Center' : dme ? 'Sleep Health Lab' : 'Northside Clinic',
      },
      payer: { name: payerName, plan, policyId, portal: payerName === 'Aetna' ? 'Availity' : payerName === 'UnitedHealthcare' ? 'UHC Provider Portal' : 'BCBS Provider Central' },
      service: {
        name: serviceName,
        type: serviceType,
        urgency: index % 5 === 0 ? 'Urgent' : 'Standard',
        cptCodes: cpt ? [cpt] : [],
        hcpcsCodes: hcpcs ? [hcpcs] : [],
        icd10Codes: [icd],
        placeOfService: medication ? 'Specialty pharmacy' : dme ? 'Home' : 'Outpatient hospital',
        requestedDate,
        targetDecisionDate,
      },
      status: status as PriorAuthStatus,
      assignedTo: denied ? 'Appeals Lead' : status === 'Submitted' ? 'Submission Lead' : status === 'Evidence Review' ? 'Evidence Lead' : 'Operations Lead',
      submittedAt: ['Submitted', 'Payer Review', 'Approved', 'Denied', 'Appeal Draft', 'Appeal Submitted'].includes(status) ? requestedDate : undefined,
      payerResponseAt: ['Approved', 'Denied', 'Appeal Draft', 'Appeal Submitted'].includes(status) ? targetDecisionDate : undefined,
      deniedAt: denied ? targetDecisionDate : undefined,
      denialReason: denied ? 'Payer requested additional documentation supporting medical necessity.' : undefined,
      appealDueDate: denied ? addDays(targetDecisionDate, payerName === 'Aetna' ? 60 : payerName === 'BlueCross BlueShield' ? 45 : 30) : undefined,
      documents: [
        { id: `doc-pa-${idNumber}-1`, name: serviceName + ' clinical packet', type: 'Clinical notes', status: index % 4 === 0 ? 'Draft' : 'Attached' },
        { id: `doc-pa-${idNumber}-2`, name: serviceName + ' order form', type: 'Order', status: denied ? 'Rejected' : 'Attached' },
      ],
      evidence,
      history: [
        { id: `hist-${idNumber}-1`, at: requestedDate + ' 09:00', actor: 'Intake Lead', event: 'Case created', note: 'Authorization request opened from operational queue.' },
        { id: `hist-${idNumber}-2`, at: requestedDate + ' 13:30', actor: 'Rules Lead', event: 'Policy reviewed', note: 'Payer criteria and evidence requirements evaluated.' },
      ],
    };
  });
}

function findPolicy(authCase: PriorAuthCase) {
  return (
    payerPolicies.find((policy) => policy.id === authCase.payer.policyId) ||
    payerPolicies.find((policy) => policy.payer === authCase.payer.name && policy.serviceType === authCase.service.type) ||
    payerPolicies[0]
  );
}

function daysBetween(target: string) {
  const today = new Date();
  const targetDate = new Date(target + 'T12:00:00');
  const diff = targetDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function addDays(date: string, days: number) {
  const value = new Date(date + 'T12:00:00');
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export function redactMemberId(memberId: string) {
  return memberId.length <= 4 ? '****' : '****' + memberId.slice(-4);
}

export function assessRules(authCase: PriorAuthCase): RuleAssessment {
  const policy = findPolicy(authCase);
  const caseText = [
    authCase.service.name,
    authCase.service.type,
    ...authCase.service.icd10Codes,
    ...authCase.evidence.map((item) => item.label + ' ' + item.status),
  ].join(' ').toLowerCase();
  const matchedCriteria = policy.coveredIndications.filter((item) => caseText.includes(item.toLowerCase()));
  const missingEvidence = policy.requiredEvidence.filter(
    (required) => !authCase.evidence.some((item) => item.label === required && ['Satisfied', 'Waived'].includes(item.status)),
  );
  const contraindicationFlags = policy.contraindications.filter((item) => caseText.includes(item.toLowerCase()));
  const priorTherapyGaps = policy.priorTherapyRequired.filter(
    (required) => !authCase.evidence.some((item) => item.label.toLowerCase().includes(required.toLowerCase()) && item.status === 'Satisfied'),
  );
  const totalSignals = policy.coveredIndications.length + policy.requiredEvidence.length + policy.priorTherapyRequired.length;
  const positiveSignals = matchedCriteria.length + (policy.requiredEvidence.length - missingEvidence.length) + (policy.priorTherapyRequired.length - priorTherapyGaps.length);
  const confidence = Math.max(5, Math.min(99, Math.round((positiveSignals / Math.max(totalSignals, 1)) * 100) - contraindicationFlags.length * 15));
  const fit = contraindicationFlags.length || confidence < 55 ? 'At risk' : missingEvidence.length || priorTherapyGaps.length ? 'Needs evidence' : 'Strong';
  return { policy, matchedCriteria, missingEvidence, contraindicationFlags, priorTherapyGaps, confidence, fit };
}

export function detectEvidenceGaps(authCase: PriorAuthCase, rule = assessRules(authCase)): EvidenceGap[] {
  const directGaps = authCase.evidence
    .filter((item) => item.required && ['Missing', 'Needs review'].includes(item.status))
    .map((item): EvidenceGap => ({
      label: item.label,
      category: item.category,
      severity: item.status === 'Missing' ? 'High' : 'Medium',
      nextAction: 'Collect or validate ' + item.label + ' from ' + item.source + '.',
    }));
  const policyGaps = rule.missingEvidence
    .filter((label) => !directGaps.some((gap) => gap.label === label))
    .map((label): EvidenceGap => ({
      label,
      category: 'Policy requirement',
      severity: 'High',
      nextAction: 'Attach payer-required evidence before submission.',
    }));
  return [...directGaps, ...policyGaps];
}

export function buildPacket(authCase: PriorAuthCase, rule = assessRules(authCase), evidenceGaps = detectEvidenceGaps(authCase, rule)): PacketAssessment {
  const attachedDocuments = authCase.documents.filter((doc) => ['Attached', 'Accepted'].includes(doc.status));
  const validationChecks = [
    { label: 'Patient, provider, payer, and plan populated', passed: Boolean(authCase.patient.memberId && authCase.provider.npi && authCase.payer.plan) },
    { label: 'Codes present', passed: Boolean(authCase.service.cptCodes.length || authCase.service.hcpcsCodes.length) && authCase.service.icd10Codes.length > 0 },
    { label: 'Required evidence satisfied', passed: evidenceGaps.length === 0 },
    { label: 'Payer policy matched', passed: rule.policy.id === authCase.payer.policyId },
    { label: 'At least one document attached', passed: attachedDocuments.length > 0 },
  ];
  const readiness = Math.round((validationChecks.filter((item) => item.passed).length / validationChecks.length) * 100);
  const status = readiness >= 90 ? 'Ready' : evidenceGaps.length ? 'Needs evidence' : 'Needs review';
  return {
    readiness,
    status,
    attachedDocuments,
    requiredForms: [
      { name: authCase.payer.name + ' prior authorization request form', status: readiness >= 80 ? 'Prepared' : 'Draft' },
      { name: 'Clinical evidence bundle', status: evidenceGaps.length ? 'Incomplete' : 'Prepared' },
      { name: 'Coding and medical necessity summary', status: rule.fit === 'At risk' ? 'Needs review' : 'Prepared' },
    ],
    validationChecks,
    coverLetterDraft:
      'Request authorization for ' +
      authCase.service.name +
      ' under ' +
      authCase.payer.plan +
      '. Medical necessity is supported by diagnosis codes ' +
      authCase.service.icd10Codes.join(', ') +
      ', matched policy ' +
      rule.policy.id +
      ', and the attached evidence bundle.',
  };
}

export function buildAppeal(authCase: PriorAuthCase): AppealAssessment {
  const policy = findPolicy(authCase);
  const denied = authCase.status === 'Denied' || authCase.status === 'Appeal Draft' || authCase.status === 'Appeal Submitted';
  const baseDate = authCase.deniedAt || authCase.payerResponseAt || authCase.service.targetDecisionDate;
  const appealDueDate = authCase.appealDueDate || addDays(baseDate, policy.appealWindowDays);
  const reason = authCase.denialReason || 'No denial reason recorded.';
  const denialClass = /missing|incomplete|document|study|setting|note/i.test(reason)
    ? 'Missing documentation'
    : /medical necessity|criteria|not covered/i.test(reason)
      ? 'Medical necessity'
      : denied
        ? 'Administrative'
        : 'Not denied';
  return {
    needed: denied,
    denialClass,
    appealDueDate,
    reviewer: denied ? authCase.assignedTo || 'Appeals Lead' : 'Not assigned',
    resubmissionStatus: authCase.status === 'Appeal Submitted' ? 'Submitted' : denied ? 'Draft needed' : 'Not applicable',
    letterDraft: denied
      ? 'Appeal ' + authCase.caseNumber + ' for ' + authCase.service.name + '. Denial class: ' + denialClass + '. Address payer reason: ' + reason
      : 'No appeal letter is needed unless a denial is received.',
  };
}

export function assessSla(authCase: PriorAuthCase): SlaAssessment {
  const dueDate = authCase.status === 'Denied' || authCase.status === 'Appeal Draft' ? buildAppeal(authCase).appealDueDate : authCase.service.targetDecisionDate;
  const daysRemaining = daysBetween(dueDate);
  const overdue = daysRemaining < 0 && !['Approved', 'Appeal Submitted'].includes(authCase.status);
  const triggers: string[] = [];
  if (authCase.service.urgency === 'Urgent') triggers.push('Urgent request requires accelerated review.');
  if (daysRemaining <= 1 && !overdue) triggers.push('Due within 24 hours.');
  if (overdue) triggers.push('SLA is overdue.');
  if (authCase.status === 'Denied') triggers.push('Appeal deadline is active.');
  const escalationLevel = overdue ? 'Manager' : authCase.service.urgency === 'Urgent' ? 'Urgent clinical' : daysRemaining <= 1 ? 'Team lead' : 'None';
  return { dueDate, daysRemaining, overdue, escalationLevel, triggers };
}

export function buildDerived(authCase: PriorAuthCase): PriorAuthCaseDerived {
  const rule = assessRules(authCase);
  const evidenceGaps = detectEvidenceGaps(authCase, rule);
  return {
    rule,
    evidenceGaps,
    packet: buildPacket(authCase, rule, evidenceGaps),
    submissionChannels: integrationChannels,
    appeal: buildAppeal(authCase),
    sla: assessSla(authCase),
  };
}

export function buildAnalytics(cases: PriorAuthCase[]): AnalyticsSnapshot {
  const approved = cases.filter((item) => item.status === 'Approved').length;
  const denied = cases.filter((item) => item.status === 'Denied' || item.status === 'Appeal Draft' || item.status === 'Appeal Submitted').length;
  const withResponses = cases.filter((item) => item.submittedAt && (item.payerResponseAt || item.status === 'Approved' || item.status === 'Denied'));
  const averageTurnaroundDays = withResponses.length
    ? Math.round(
        withResponses.reduce((sum, item) => {
          const end = new Date((item.payerResponseAt || item.service.targetDecisionDate) + 'T12:00:00').getTime();
          const start = new Date((item.submittedAt || item.service.requestedDate) + 'T12:00:00').getTime();
          return sum + Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        }, 0) / withResponses.length,
      )
    : 0;
  const payerNames = Array.from(new Set(cases.map((item) => item.payer.name))).sort();
  const byPayer = payerNames.map((payer) => {
    const payerCases = cases.filter((item) => item.payer.name === payer);
    return {
      payer,
      total: payerCases.length,
      approved: payerCases.filter((item) => item.status === 'Approved').length,
      denied: payerCases.filter((item) => item.status === 'Denied' || item.status === 'Appeal Draft' || item.status === 'Appeal Submitted').length,
    };
  });
  const byProcedure = cases.map((item) => ({
    procedure: item.service.name,
    total: 1,
    missingEvidence: detectEvidenceGaps(item).length,
  }));
  const missingCounts = new Map<string, number>();
  for (const item of cases) {
    for (const gap of detectEvidenceGaps(item)) {
      missingCounts.set(gap.label, (missingCounts.get(gap.label) || 0) + 1);
    }
  }
  const topMissingEvidence = Array.from(missingCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    totalCases: cases.length,
    approvalRate: cases.length ? Math.round((approved / cases.length) * 100) : 0,
    denialRate: cases.length ? Math.round((denied / cases.length) * 100) : 0,
    averageTurnaroundDays,
    appealSuccessRate: 0,
    leakageRisk: cases.reduce((sum, item) => sum + (buildDerived(item).sla.overdue || buildDerived(item).rule.fit === 'At risk' ? 1 : 0), 0),
    byPayer,
    byProcedure,
    topMissingEvidence,
  };
}

export function buildWorkspacePayload(cases: PriorAuthCase[], subfeatureRows: PriorAuthSubFeatureSeedRow[] = seedPriorAuthSubFeatureRows): PriorAuthWorkspacePayload {
  return {
    cases,
    derived: Object.fromEntries(cases.map((item) => [item.id, buildDerived(item)])),
    analytics: buildAnalytics(cases),
    integrations: integrationChannels,
    compliance: complianceControls,
    subfeatureRows: subfeatureRows.reduce<Record<string, PriorAuthSubFeatureSeedRow[]>>((groups, row) => {
      const key = `${row.featureSlug}/${row.subfeatureSlug}`;
      groups[key] = [...(groups[key] || []), row];
      return groups;
    }, {}),
    timelineSteps: priorAuthTimelineSteps,
  };
}

export function scrubAuditText(value: string) {
  return value
    .replace(/[A-Z]{2,5}-\d{4,}/g, '[member-id]')
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[person]');
}
