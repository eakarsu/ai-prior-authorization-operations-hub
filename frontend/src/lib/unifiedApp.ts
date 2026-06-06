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

const allFeatures = [...features, ...aiFeatures];
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
  {
    "name": "Prior Authorization",
    "features": priorAuthFeatures.map((feature) => feature.title)
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

export const pageRegistry: Record<string, PageDefinition> = Object.fromEntries(features.map((feature) => [feature.slug, toPage(feature)]));
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
