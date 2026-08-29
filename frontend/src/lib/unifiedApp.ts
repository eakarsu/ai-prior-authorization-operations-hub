import {
  Activity,
  BarChart3,
  Bell,
  Blocks,
  Bot,
  BriefcaseBusiness,
  CalendarCheck,
  ClipboardList,
  Database,
  FileText,
  Files,
  LayoutDashboard,
  ListChecks,
  PackageCheck,
  Plug,
  ShieldCheck,
  UserRound,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { priorAuthFeatureMap, priorAuthFeatures } from '@/lib/priorAuthNavigation';

export type NavItem = { label: string; href: string; icon: LucideIcon };
export type FeatureDefinition = { title: string; href: string; category: string; summary: string; bullets: string[] };
export type PageDefinition = {
  title: string;
  eyebrow: string;
  subtitle: string;
  category: string;
  summary: string;
  bullets: string[];
  metrics: Array<{ label: string; value: string; note: string }>;
};
export type FeatureContext = {
  sourceOwners: string[];
  operatingQueues: string[];
  outputs: string[];
  relatedRoutes: Array<{ label: string; href: string }>;
};

const suiteSourceOwners = ["Payer rules","Clinical notes","Medical policies","Appeal packets"];

const features = [
  {
    slug: "auth-intake",
    title: "Authorization Intake",
    href: "/auth-intake",
    category: "Intake",
    icon: Bot,
    summary: "Patient, provider, payer, service request, diagnosis, and submission status.",
    bullets: ["Authorization Intake queue","AI assisted review","Audit-ready output"],
    metrics: [
      { label: "Authorization Intake", value: "24", note: 'Active records' },
      { label: 'Exceptions', value: "2", note: 'Need review' },
      { label: 'Due Soon', value: "4", note: 'Next 14 days' },
    ],
  },
  {
    slug: "payer-rule-matching",
    title: "Payer Rule Matching",
    href: "/payer-rule-matching",
    category: "Rules",
    icon: Workflow,
    summary: "Medical policy criteria, covered indications, documentation requirements, and rule fit.",
    bullets: ["Payer Rule Matching queue","AI assisted review","Audit-ready output"],
    metrics: [
      { label: "Payer Rule Matching", value: "33", note: 'Active records' },
      { label: 'Exceptions', value: "3", note: 'Need review' },
      { label: 'Due Soon', value: "5", note: 'Next 14 days' },
    ],
  },
  {
    slug: "evidence-checklist",
    title: "Evidence Checklist",
    href: "/evidence-checklist",
    category: "Evidence",
    icon: Users,
    summary: "Clinical notes, imaging, labs, prior therapy, contraindications, and missing proof.",
    bullets: ["Evidence Checklist queue","AI assisted review","Audit-ready output"],
    metrics: [
      { label: "Evidence Checklist", value: "42", note: 'Active records' },
      { label: 'Exceptions', value: "4", note: 'Need review' },
      { label: 'Due Soon', value: "6", note: 'Next 14 days' },
    ],
  },
  {
    slug: "packet-generation",
    title: "Packet Generation",
    href: "/packet-generation",
    category: "Submission",
    icon: CalendarCheck,
    summary: "Cover letters, forms, evidence bundle, coding details, and submission readiness.",
    bullets: ["Packet Generation queue","AI assisted review","Audit-ready output"],
    metrics: [
      { label: "Packet Generation", value: "51", note: 'Active records' },
      { label: 'Exceptions', value: "5", note: 'Need review' },
      { label: 'Due Soon', value: "7", note: 'Next 14 days' },
    ],
  },
  {
    slug: "denial-prevention",
    title: "Denial Prevention",
    href: "/denial-prevention",
    category: "Risk",
    icon: ClipboardList,
    summary: "Likely denial reasons, weak evidence, payer history, and prevention actions.",
    bullets: ["Denial Prevention queue","AI assisted review","Audit-ready output"],
    metrics: [
      { label: "Denial Prevention", value: "60", note: 'Active records' },
      { label: 'Exceptions', value: "6", note: 'Need review' },
      { label: 'Due Soon', value: "8", note: 'Next 14 days' },
    ],
  },
  {
    slug: "appeal-routing",
    title: "Appeal Routing",
    href: "/appeal-routing",
    category: "Appeals",
    icon: FileText,
    summary: "Denied requests, appeal deadlines, reviewer owner, letter draft, and escalation status.",
    bullets: ["Appeal Routing queue","AI assisted review","Audit-ready output"],
    metrics: [
      { label: "Appeal Routing", value: "69", note: 'Active records' },
      { label: 'Exceptions', value: "2", note: 'Need review' },
      { label: 'Due Soon', value: "9", note: 'Next 14 days' },
    ],
  },
  {
    slug: "peer-review-prep",
    title: "Peer Review Prep",
    href: "/peer-review-prep",
    category: "Clinical Review",
    icon: BarChart3,
    summary: "Peer-to-peer talking points, clinical rationale, policy gaps, and supporting facts.",
    bullets: ["Peer Review Prep queue","AI assisted review","Audit-ready output"],
    metrics: [
      { label: "Peer Review Prep", value: "78", note: 'Active records' },
      { label: 'Exceptions', value: "3", note: 'Need review' },
      { label: 'Due Soon', value: "4", note: 'Next 14 days' },
    ],
  },
  {
    slug: "sla-tracking",
    title: "SLA Tracking",
    href: "/sla-tracking",
    category: "Operations",
    icon: PackageCheck,
    summary: "Payer response timers, urgent flags, backlog, overdue work, and team capacity.",
    bullets: ["SLA Tracking queue","AI assisted review","Audit-ready output"],
    metrics: [
      { label: "SLA Tracking", value: "87", note: 'Active records' },
      { label: 'Exceptions', value: "4", note: 'Need review' },
      { label: 'Due Soon', value: "5", note: 'Next 14 days' },
    ],
  },
  {
    slug: "authorization-analytics",
    title: "Authorization Analytics",
    href: "/authorization-analytics",
    category: "Reporting",
    icon: ShieldCheck,
    summary: "Approval rates, denial trends, payer performance, turnaround, and leakage.",
    bullets: ["Authorization Analytics queue","AI assisted review","Audit-ready output"],
    metrics: [
      { label: "Authorization Analytics", value: "96", note: 'Active records' },
      { label: 'Exceptions', value: "5", note: 'Need review' },
      { label: 'Due Soon', value: "6", note: 'Next 14 days' },
    ],
  },
  {
    slug: "patient-updates",
    title: "Patient Updates",
    href: "/patient-updates",
    category: "Communications",
    icon: Activity,
    summary: "Patient-facing status, next steps, delay reasons, and communication log.",
    bullets: ["Patient Updates queue","AI assisted review","Audit-ready output"],
    metrics: [
      { label: "Patient Updates", value: "105", note: 'Active records' },
      { label: 'Exceptions', value: "6", note: 'Need review' },
      { label: 'Due Soon', value: "7", note: 'Next 14 days' },
    ],
  },
  {
    slug: "documents",
    title: "Documents",
    href: "/documents",
    category: "Core Platform",
    icon: Files,
    summary: "Prior Authorization Operations documents, evidence, attachments, and exports.",
    bullets: ["Documents","Controls","Audit trail"],
    metrics: [
      { label: "Documents", value: "48", note: 'Tracked' },
      { label: 'Open', value: "7", note: 'Needs review' },
      { label: 'Updated', value: "21", note: 'This week' },
    ],
  },
  {
    slug: "notifications",
    title: "Notifications",
    href: "/notifications",
    category: "Core Platform",
    icon: Bell,
    summary: "Prior Authorization Operations alerts, reminders, exceptions, and approvals.",
    bullets: ["Notifications","Controls","Audit trail"],
    metrics: [
      { label: "Notifications", value: "65", note: 'Tracked' },
      { label: 'Open', value: "10", note: 'Needs review' },
      { label: 'Updated', value: "29", note: 'This week' },
    ],
  },
  {
    slug: "integrations",
    title: "Integrations",
    href: "/integrations",
    category: "Core Platform",
    icon: Plug,
    summary: "Prior Authorization Operations connector health, sync status, and integration warnings.",
    bullets: ["Integrations","Controls","Audit trail"],
    metrics: [
      { label: "Integrations", value: "82", note: 'Tracked' },
      { label: 'Open', value: "13", note: 'Needs review' },
      { label: 'Updated', value: "37", note: 'This week' },
    ],
  },
  {
    slug: "profiles",
    title: "Profiles",
    href: "/profiles",
    category: "Core Platform",
    icon: UserRound,
    summary: "Prior Authorization Operations users, roles, teams, permissions, and ownership settings.",
    bullets: ["Profiles","Controls","Audit trail"],
    metrics: [
      { label: "Profiles", value: "99", note: 'Tracked' },
      { label: 'Open', value: "16", note: 'Needs review' },
      { label: 'Updated', value: "45", note: 'This week' },
    ],
  },
] as const;

const aiFeatures = [
  {
    slug: 'ai-assistant',
    title: 'AI Assistant',
    href: '/features/ai-assistant',
    category: 'Intelligence Layer',
    icon: Bot,
    summary: "Prior Authorization Operations assistant for triage, drafting, analysis, recommendations, and operational review.",
    bullets: ['Triage support', 'Drafting', 'Review guidance'],
    metrics: [
      { label: 'Sessions', value: '128', note: 'Last 24 hours' },
      { label: 'Drafts', value: '204', note: 'Generated' },
      { label: 'Escalations', value: '14', note: 'Expert review' },
    ],
  },
  {
    slug: 'ai-tools',
    title: 'AI Tools',
    href: '/features/ai-tools',
    category: 'Intelligence Layer',
    icon: Activity,
    summary: "Prior Authorization Operations AI tools for scoring, generation, extraction, classification, exception review, and reporting.",
    bullets: ['Scoring', 'Classification', 'Exception review'],
    metrics: [
      { label: 'Runs', value: '318', note: 'Last 24 hours' },
      { label: 'Signals', value: '88', note: 'New alerts' },
      { label: 'Accepted', value: '117', note: 'Reviewer accepted' },
    ],
  },
] as const;

const supplementalFeatures = [
  {
    slug: 'benefit-verification',
    title: 'Benefit Verification',
    href: '/benefit-verification',
    category: 'Verification',
    icon: ShieldCheck,
    summary: 'Eligibility, deductible, out-of-pocket, plan limits, referral requirements, and payer benefit snapshots before authorization work starts.',
    bullets: ['Eligibility check', 'Benefit snapshot', 'Referral requirements'],
    metrics: [{ label: 'Verified', value: '218', note: 'This week' }, { label: 'Needs Follow-up', value: '31', note: 'Coverage gaps' }, { label: 'Clean', value: '86%', note: 'Ready for PA' }],
  },
  {
    slug: 'medical-necessity-review',
    title: 'Medical Necessity Review',
    href: '/medical-necessity-review',
    category: 'Clinical Review',
    icon: ClipboardList,
    summary: 'Medical necessity criteria, guideline fit, diagnosis support, conservative therapy, and clinician attestation readiness.',
    bullets: ['Guideline fit', 'Diagnosis support', 'Clinician attestation'],
    metrics: [{ label: 'Reviews', value: '174', note: 'Open' }, { label: 'Weak Support', value: '22', note: 'Need evidence' }, { label: 'Ready', value: '81%', note: 'Criteria met' }],
  },
  {
    slug: 'peer-to-peer-scheduling',
    title: 'Peer-to-Peer Scheduling',
    href: '/peer-to-peer-scheduling',
    category: 'Clinical Review',
    icon: CalendarCheck,
    summary: 'Payer peer-review windows, clinician availability, talking points, contact attempts, and outcome capture.',
    bullets: ['Review windows', 'Clinician availability', 'Outcome capture'],
    metrics: [{ label: 'Calls', value: '42', note: 'Scheduled' }, { label: 'At Risk', value: '9', note: 'Window closing' }, { label: 'Overturned', value: '64%', note: 'After call' }],
  },
  {
    slug: 'status-polling',
    title: 'Status Polling',
    href: '/status-polling',
    category: 'Integrations',
    icon: Plug,
    summary: 'Payer portal, clearinghouse, fax, email, and manual follow-up polling with stale-status escalation.',
    bullets: ['Portal polling', 'Stale statuses', 'Manual fallback'],
    metrics: [{ label: 'Polls', value: '612', note: 'Today' }, { label: 'Stale', value: '27', note: 'Escalate' }, { label: 'Updated', value: '148', note: 'Since morning' }],
  },
  {
    slug: 'payer-portal-workbench',
    title: 'Payer Portal Workbench',
    href: '/payer-portal-workbench',
    category: 'Integrations',
    icon: Workflow,
    summary: 'Portal-specific submission checklists, credential ownership, document upload tracking, screenshots, and manual fallback queues.',
    bullets: ['Portal checklist', 'Credential owner', 'Upload tracking'],
    metrics: [{ label: 'Portals', value: '18', note: 'Tracked' }, { label: 'Credential Gaps', value: '5', note: 'Blocked' }, { label: 'Manual Tasks', value: '39', note: 'Queued' }],
  },
  {
    slug: 'specialty-drug-pa',
    title: 'Specialty Drug PA',
    href: '/specialty-drug-pa',
    category: 'Service Lines',
    icon: BriefcaseBusiness,
    summary: 'Medication-specific prior authorization, formulary rules, step therapy, quantity limits, labs, and pharmacy benefit routing.',
    bullets: ['Formulary rules', 'Step therapy', 'Pharmacy routing'],
    metrics: [{ label: 'Drug PAs', value: '96', note: 'Active' }, { label: 'Step Therapy', value: '28', note: 'Required' }, { label: 'Approved', value: '73%', note: '30 days' }],
  },
  {
    slug: 'imaging-pa',
    title: 'Imaging PA',
    href: '/imaging-pa',
    category: 'Service Lines',
    icon: FileText,
    summary: 'Imaging authorization support for modality, body part, contrast, diagnosis, conservative therapy, and site-of-care rules.',
    bullets: ['Modality rules', 'Conservative therapy', 'Site of care'],
    metrics: [{ label: 'Imaging', value: '122', note: 'Open' }, { label: 'Missing Notes', value: '18', note: 'Need proof' }, { label: 'Turnaround', value: '1.8d', note: 'Median' }],
  },
  {
    slug: 'dme-home-health-pa',
    title: 'DME / Home Health PA',
    href: '/dme-home-health-pa',
    category: 'Service Lines',
    icon: Users,
    summary: 'Durable medical equipment and home-health authorization with supplier, order, documentation, and renewal tracking.',
    bullets: ['Supplier routing', 'Order support', 'Renewal tracking'],
    metrics: [{ label: 'Cases', value: '74', note: 'Active' }, { label: 'Supplier Holds', value: '11', note: 'Need action' }, { label: 'Renewals', value: '23', note: 'Next 30 days' }],
  },
  {
    slug: 'retro-authorization',
    title: 'Retro Authorization',
    href: '/retro-authorization',
    category: 'Risk',
    icon: Activity,
    summary: 'Retroactive authorization requests, timely filing windows, medical record proof, denial exposure, and escalation routing.',
    bullets: ['Timely filing', 'Record proof', 'Denial exposure'],
    metrics: [{ label: 'Retro Cases', value: '38', note: 'Open' }, { label: 'Deadline Risk', value: '12', note: 'Urgent' }, { label: 'Recovered', value: '$184K', note: 'Quarter' }],
  },
  {
    slug: 'financial-clearance',
    title: 'Financial Clearance',
    href: '/financial-clearance',
    category: 'Revenue Cycle',
    icon: BarChart3,
    summary: 'Authorization clearance before service, estimate readiness, approval dependency, cancellation risk, and revenue leakage prevention.',
    bullets: ['Service clearance', 'Cancellation risk', 'Revenue leakage'],
    metrics: [{ label: 'Clearance', value: '89%', note: 'Before service' }, { label: 'At Risk', value: '34', note: 'Scheduled soon' }, { label: 'Leakage', value: '$312K', note: 'Prevented' }],
  },
  {
    slug: 'production-gap-workspace',
    title: 'Production Gap Workspace',
    href: '/production-gap-workspace',
    category: 'Operations',
    icon: PackageCheck,
    summary: 'Implementation-ready backlog for live payer/EHR connectors, SSO/MFA, PHI-safe exports, monitoring, regression tests, and launch controls.',
    bullets: ['Connector backlog', 'Security readiness', 'Launch controls'],
    metrics: [{ label: 'Gaps', value: '18', note: 'Tracked' }, { label: 'Blocked', value: '6', note: 'Need credentials' }, { label: 'Ready', value: '82%', note: 'Pilot launch' }],
  },
] as const;

const productionPlatformFeatures = [
  {
    slug: 'enterprise-identity-access',
    title: 'Enterprise Identity & Access',
    href: '/enterprise-identity-access',
    category: 'Production Platform',
    icon: UserRound,
    summary: 'SSO, MFA, role mapping, break-glass access, access certification, and PHI-safe user provisioning for prior authorization operations.',
    bullets: ['SSO/MFA readiness', 'Role mapping', 'Access certification'],
    metrics: [{ label: 'Checks', value: '48', note: 'Tracked' }, { label: 'Open Risks', value: '7', note: 'Need owner' }, { label: 'Ready', value: '84%', note: 'Production readiness' }],
  },
  {
    slug: 'connector-operations-center',
    title: 'Connector Operations Center',
    href: '/connector-operations-center',
    category: 'Production Platform',
    icon: Plug,
    summary: 'Live EHR, payer portal, clearinghouse, fax, and document connector ownership with credential status and retry queues.',
    bullets: ['EHR connectors', 'Payer credentials', 'Retry queues'],
    metrics: [{ label: 'Checks', value: '48', note: 'Tracked' }, { label: 'Open Risks', value: '7', note: 'Need owner' }, { label: 'Ready', value: '84%', note: 'Production readiness' }],
  },
  {
    slug: 'audit-export-center',
    title: 'Audit Export Center',
    href: '/audit-export-center',
    category: 'Production Platform',
    icon: ShieldCheck,
    summary: 'HIPAA-ready audit export workspace for PHI access, packet decisions, payer submissions, approvals, and evidence bundles.',
    bullets: ['PHI access export', 'Evidence bundles', 'Decision history'],
    metrics: [{ label: 'Checks', value: '48', note: 'Tracked' }, { label: 'Open Risks', value: '7', note: 'Need owner' }, { label: 'Ready', value: '84%', note: 'Production readiness' }],
  },
  {
    slug: 'notification-delivery-ledger',
    title: 'Notification Delivery Ledger',
    href: '/notification-delivery-ledger',
    category: 'Production Platform',
    icon: Bell,
    summary: 'Delivery ledger for patient, provider, payer, SMS, email, fax, webhook, retry, and escalation notifications.',
    bullets: ['Delivery ledger', 'Failed retries', 'Escalation rules'],
    metrics: [{ label: 'Checks', value: '48', note: 'Tracked' }, { label: 'Open Risks', value: '7', note: 'Need owner' }, { label: 'Ready', value: '84%', note: 'Production readiness' }],
  },
  {
    slug: 'observability-runbooks',
    title: 'Observability & Runbooks',
    href: '/observability-runbooks',
    category: 'Production Platform',
    icon: Activity,
    summary: 'Operational health, job latency, integration failures, incident runbooks, support ownership, and on-call handoff.',
    bullets: ['Health checks', 'Incident runbooks', 'On-call ownership'],
    metrics: [{ label: 'Checks', value: '48', note: 'Tracked' }, { label: 'Open Risks', value: '7', note: 'Need owner' }, { label: 'Ready', value: '84%', note: 'Production readiness' }],
  },
  {
    slug: 'release-test-harness',
    title: 'Release Test Harness',
    href: '/release-test-harness',
    category: 'Production Platform',
    icon: PackageCheck,
    summary: 'Browser regression, API smoke tests, seeded data checks, accessibility checks, and go-live release gates.',
    bullets: ['Regression tests', 'Smoke checks', 'Release gates'],
    metrics: [{ label: 'Checks', value: '48', note: 'Tracked' }, { label: 'Open Risks', value: '7', note: 'Need owner' }, { label: 'Ready', value: '84%', note: 'Production readiness' }],
  },
  {
    slug: 'payer-api-certification-lab',
    title: 'Payer API Certification Lab',
    href: '/payer-api-certification-lab',
    category: 'Integration',
    icon: Plug,
    summary: 'Certify payer FHIR prior-authorization contracts with schema versions, consent, idempotency, deadlines, failure receipts, replay protection, and outcome reconciliation.',
    bullets: ['FHIR contract certification', 'Failure and replay testing', 'Approval and outcome reconciliation'],
    metrics: [{ label: 'Payer Contracts', value: '15', note: 'In certification' }, { label: 'Passing', value: '11', note: 'All critical cases' }, { label: 'Blocked', value: '4', note: 'Need payer action' }],
  },
] as const;

const allFeatures = [...features, ...supplementalFeatures, ...productionPlatformFeatures, ...aiFeatures];
const legacyPriorAuthFeatureSlugs = new Set([
  'auth-intake',
  'payer-rule-matching',
  'evidence-checklist',
  'packet-generation',
  'denial-prevention',
  'appeal-routing',
  'peer-review-prep',
  'sla-tracking',
  'authorization-analytics',
  'patient-updates',
]);
const visibleLegacyFeatures = allFeatures.filter((feature) => !legacyPriorAuthFeatureSlugs.has(feature.slug));
const priorAuthIconBySlug: Record<string, LucideIcon> = {
  'case-model': ListChecks,
  'case-timeline': Workflow,
  'payer-rule-engine': ShieldCheck,
  'evidence-gap-detection': ClipboardList,
  'packet-builder': Files,
  'submissions-integrations': Plug,
  'appeals-workspace': FileText,
  'sla-automation': CalendarCheck,
  analytics: BarChart3,
  'compliance-security': ShieldCheck,
};

export const primaryNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'All Features', href: '/features', icon: Blocks },
  { label: 'Production Readiness', href: '/production-readiness', icon: ShieldCheck },
  { label: 'Documents', href: '/documents', icon: Files },
  { label: 'Source Tables', href: '/source-tables', icon: Database },
  { label: 'Profiles', href: '/profiles', icon: UserRound },
];

export const priorAuthCapabilityNav: NavItem[] = [
  ...priorAuthFeatures.map((feature) => ({
    label: feature.shortTitle,
    href: priorAuthFeatureMap[feature.slug].href,
    icon: priorAuthIconBySlug[feature.slug] || ListChecks,
  })),
];

export const featureNav: NavItem[] = [
  ...priorAuthCapabilityNav,
  ...visibleLegacyFeatures.map((feature) => ({ label: feature.title, href: feature.href, icon: feature.icon })),
];
export const featureCatalog: FeatureDefinition[] = [
  ...priorAuthFeatures.map((feature) => ({
    title: feature.title,
    href: feature.href,
    category: 'Prior Authorization',
    summary: feature.summary,
    bullets: feature.subfeatures.slice(0, 3).map((item) => item.title),
  })),
  ...visibleLegacyFeatures.map((feature) => ({ title: feature.title, href: feature.href, category: feature.category, summary: feature.summary, bullets: [...feature.bullets] })),
];

export const featureFamilies = [
  { name: 'Production Platform Controls', features: ['Enterprise Identity & Access', 'Connector Operations Center', 'Audit Export Center', 'Notification Delivery Ledger', 'Observability & Runbooks', 'Release Test Harness', 'Payer API Certification Lab'] },
  {
    "name": "Prior Authorization",
    "features": priorAuthFeatures.map((feature) => feature.title)
  },
  {
    name: 'Production PA Operations',
    features: ['Benefit Verification', 'Medical Necessity Review', 'Peer-to-Peer Scheduling', 'Status Polling', 'Payer Portal Workbench', 'Production Gap Workspace'],
  },
  {
    name: 'Service Line Authorization',
    features: ['Specialty Drug PA', 'Imaging PA', 'DME / Home Health PA', 'Retro Authorization', 'Financial Clearance'],
  },
  {
    "name": "Core Platform",
    "features": [
      "Documents",
      "Notifications",
      "Integrations",
      "Profiles"
    ]
  },
  {
    "name": "Intelligence Layer",
    "features": [
      "AI Assistant",
      "AI Tools"
    ]
  }
];

function toPage(feature: (typeof allFeatures)[number]): PageDefinition {
  return {
    title: feature.title,
    eyebrow: feature.category,
    subtitle: feature.summary,
    category: feature.category,
    summary: feature.title + ' is implemented as a dedicated Prior Authorization Operations workflow with records, AI assistance, approvals, audit, and reporting.',
    bullets: [...feature.bullets],
    metrics: [...feature.metrics],
  };
}

export const pageRegistry: Record<string, PageDefinition> = Object.fromEntries([...features, ...supplementalFeatures, ...productionPlatformFeatures].map((feature) => [feature.slug, toPage(feature)]));
export const aiFeatureRegistry: Record<string, PageDefinition> = Object.fromEntries(aiFeatures.map((feature) => [feature.slug, toPage(feature)]));
export const featureContexts: Record<string, FeatureContext> = Object.fromEntries(
  allFeatures.map((feature) => [
    feature.title,
    {
      sourceOwners: suiteSourceOwners,
      operatingQueues: [feature.title + ' records', feature.title + ' approvals', feature.title + ' exceptions'],
      outputs: [feature.title + ' dashboard', feature.title + ' export', feature.title + ' audit trail'],
      relatedRoutes: [{ label: 'Dashboard', href: '/dashboard' }, { label: 'All Features', href: '/features' }, { label: 'AI Tools', href: '/features/ai-tools' }],
    },
  ]),
);
