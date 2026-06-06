export type PriorAuthSubFeature = {
  slug: string;
  title: string;
  summary: string;
};

export type PriorAuthFeature = {
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  href: string;
  subfeatures: PriorAuthSubFeature[];
};

export const priorAuthFeatures: PriorAuthFeature[] = [
  {
    slug: 'case-model',
    title: 'Case Model',
    shortTitle: 'Case Model',
    summary: 'Canonical prior authorization case data across patient, provider, payer, service, documents, and history.',
    href: '/prior-auth/case-model',
    subfeatures: [
      { slug: 'case-queue', title: 'Case Queue', summary: 'Operational queue for all authorization cases.' },
      { slug: 'patient-provider', title: 'Patient & Provider', summary: 'Patient identity, redacted member data, provider, specialty, and facility.' },
      { slug: 'payer-plan', title: 'Payer & Plan', summary: 'Payer, plan, policy, portal, and routing metadata.' },
      { slug: 'codes-service', title: 'Codes & Service', summary: 'CPT, HCPCS, ICD-10, place of service, urgency, and due dates.' },
      { slug: 'documents', title: 'Documents', summary: 'Clinical documents and packet attachments.' },
      { slug: 'case-history', title: 'Case History', summary: 'Audit-ready case events and operational notes.' },
    ],
  },
  {
    slug: 'case-timeline',
    title: 'Case Timeline',
    shortTitle: 'Timeline',
    summary: 'End-to-end movement from intake through payer response, denial, approval, and appeal.',
    href: '/prior-auth/case-timeline',
    subfeatures: [
      { slug: 'lifecycle-progress', title: 'Lifecycle Progress', summary: 'Current lifecycle stage for every authorization.' },
      { slug: 'stage-activity', title: 'Stage Activity', summary: 'Stage-by-stage progress across the authorization pipeline.' },
      { slug: 'status-changes', title: 'Status Changes', summary: 'Recent case status changes and history.' },
      { slug: 'next-actions', title: 'Next Actions', summary: 'Pending operational actions by case and stage.' },
    ],
  },
  {
    slug: 'payer-rule-engine',
    title: 'Payer Rule Engine',
    shortTitle: 'Rule Engine',
    summary: 'Structured policy matching, required evidence, contraindications, prior therapy checks, and confidence scoring.',
    href: '/prior-auth/payer-rule-engine',
    subfeatures: [
      { slug: 'policy-matching', title: 'Policy Matching', summary: 'Payer policy match and rule-fit summary.' },
      { slug: 'required-criteria', title: 'Required Criteria', summary: 'Policy-required criteria and evidence requirements.' },
      { slug: 'prior-therapy-checks', title: 'Prior Therapy Checks', summary: 'Conservative therapy and medication history checks.' },
      { slug: 'contraindications', title: 'Contraindications', summary: 'Contraindication and exclusion checks.' },
      { slug: 'rule-confidence', title: 'Rule Confidence', summary: 'Confidence scores and weak-match flags.' },
    ],
  },
  {
    slug: 'evidence-gap-detection',
    title: 'Evidence Gap Detection',
    shortTitle: 'Evidence Gaps',
    summary: 'Procedure and payer-specific evidence completeness across notes, imaging, labs, diagnosis proof, and therapy history.',
    href: '/prior-auth/evidence-gap-detection',
    subfeatures: [
      { slug: 'missing-evidence', title: 'Missing Evidence', summary: 'Missing and needs-review evidence rows.' },
      { slug: 'evidence-checklist', title: 'Evidence Checklist', summary: 'Complete evidence checklist by case.' },
      { slug: 'clinical-notes', title: 'Clinical Notes', summary: 'Clinical notes and diagnosis proof requirements.' },
      { slug: 'labs-imaging', title: 'Labs & Imaging', summary: 'Labs, imaging, and supporting results.' },
      { slug: 'medication-therapy-history', title: 'Medication / Therapy History', summary: 'Prior medication and conservative therapy evidence.' },
    ],
  },
  {
    slug: 'packet-builder',
    title: 'Packet Builder',
    shortTitle: 'Packet Builder',
    summary: 'Cover letters, evidence attachments, form validation, bundle readiness, and submission packets.',
    href: '/prior-auth/packet-builder',
    subfeatures: [
      { slug: 'packet-readiness', title: 'Packet Readiness', summary: 'Readiness score and failed packet checks.' },
      { slug: 'cover-letter', title: 'Cover Letter', summary: 'Generated cover letter draft by case.' },
      { slug: 'attached-evidence', title: 'Attached Evidence', summary: 'Evidence and documents attached to the packet.' },
      { slug: 'form-validation', title: 'Form Validation', summary: 'Packet validation checks and failed requirements.' },
      { slug: 'submission-bundle', title: 'Submission Bundle', summary: 'Bundle content and submission readiness.' },
    ],
  },
  {
    slug: 'submissions-integrations',
    title: 'Submissions + Integrations',
    shortTitle: 'Submissions',
    summary: 'Connector stubs for payer portals, EHR/FHIR, clearinghouses, fax, email, SFTP, and status polling.',
    href: '/prior-auth/submissions-integrations',
    subfeatures: [
      { slug: 'submission-queue', title: 'Submission Queue', summary: 'Submission status by authorization case.' },
      { slug: 'connector-status', title: 'Connector Status', summary: 'Connector health, type, sync, and next action.' },
      { slug: 'status-polling', title: 'Status Polling', summary: 'Polling readiness and last sync by connector.' },
      { slug: 'fax-email-sftp', title: 'Fax / Email / SFTP', summary: 'Non-portal delivery channel controls.' },
      { slug: 'ehr-fhir', title: 'EHR / FHIR', summary: 'EHR and FHIR integration readiness.' },
    ],
  },
  {
    slug: 'appeals-workspace',
    title: 'Appeals Workspace',
    shortTitle: 'Appeals',
    summary: 'Denial classification, appeal deadline, letter draft, reviewer assignment, and resubmission tracking.',
    href: '/prior-auth/appeals-workspace',
    subfeatures: [
      { slug: 'denials', title: 'Denials', summary: 'Denied cases and denial classifications.' },
      { slug: 'appeal-deadlines', title: 'Appeal Deadlines', summary: 'Appeal due dates and urgency.' },
      { slug: 'appeal-drafts', title: 'Appeal Drafts', summary: 'Draft appeal letters by case.' },
      { slug: 'reviewer-assignment', title: 'Reviewer Assignment', summary: 'Assigned reviewer and appeal owner.' },
      { slug: 'resubmissions', title: 'Resubmissions', summary: 'Resubmission status and next action.' },
    ],
  },
  {
    slug: 'sla-automation',
    title: 'SLA Automation',
    shortTitle: 'SLA Automation',
    summary: 'Countdown timers, urgent cases, overdue queues, escalation rules, and notification triggers.',
    href: '/prior-auth/sla-automation',
    subfeatures: [
      { slug: 'sla-queue', title: 'SLA Queue', summary: 'Due dates and countdowns for all cases.' },
      { slug: 'overdue-cases', title: 'Overdue Cases', summary: 'Overdue cases requiring escalation.' },
      { slug: 'urgent-cases', title: 'Urgent Cases', summary: 'Urgent authorizations and expedited timers.' },
      { slug: 'escalations', title: 'Escalations', summary: 'Escalation level and routing rules.' },
      { slug: 'notification-triggers', title: 'Notification Triggers', summary: 'Active triggers for teams and queues.' },
    ],
  },
  {
    slug: 'analytics',
    title: 'Analytics',
    shortTitle: 'Case Analytics',
    summary: 'Approval, denial, payer, procedure, turnaround, appeal success, leakage, and evidence-gap trends.',
    href: '/prior-auth/analytics',
    subfeatures: [
      { slug: 'approval-denial-rates', title: 'Approval / Denial Rates', summary: 'Approval, denial, and appeal volume.' },
      { slug: 'payer-trends', title: 'Payer Trends', summary: 'Denial and approval trends by payer.' },
      { slug: 'procedure-trends', title: 'Procedure Trends', summary: 'Procedure volume and missing evidence.' },
      { slug: 'turnaround-time', title: 'Turnaround Time', summary: 'Decision timing and SLA leakage.' },
      { slug: 'evidence-gap-trends', title: 'Evidence Gap Trends', summary: 'Top missing evidence drivers.' },
    ],
  },
  {
    slug: 'compliance-security',
    title: 'Compliance / Security',
    shortTitle: 'Compliance',
    summary: 'PHI-safe audit logs, permissions, access logging, redaction, session security, and environment config.',
    href: '/prior-auth/compliance-security',
    subfeatures: [
      { slug: 'audit-logs', title: 'Audit Logs', summary: 'Audit events and PHI-safe operational history.' },
      { slug: 'access-controls', title: 'Access Controls', summary: 'User and team permission controls.' },
      { slug: 'phi-redaction', title: 'PHI Redaction', summary: 'Redaction and data minimization controls.' },
      { slug: 'sessions', title: 'Sessions', summary: 'Session and authentication controls.' },
      { slug: 'environment-config', title: 'Environment Config', summary: 'Environment-specific security configuration.' },
    ],
  },
];

export const priorAuthFeatureMap = Object.fromEntries(priorAuthFeatures.map((feature) => [feature.slug, feature])) as Record<string, PriorAuthFeature>;
