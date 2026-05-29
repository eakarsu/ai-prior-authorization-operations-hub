export type EntityRecord = { id: string; name: string; status: string; owner: string; amount?: string; dueDate?: string; priority?: string };
export type FeatureEntitySet = { title: string; columns: string[]; rows: EntityRecord[] };
const COLUMNS = ['Name', 'Status', 'Owner', 'Amount', 'Due Date', 'Priority'];
const entitySeeds = [
  [
    "auth-intake",
    "Authorization Intake Records",
    "Authorization Intake priority queue",
    "Open",
    "Authorization Intake exception list",
    "Intake Lead",
    "$0"
  ],
  [
    "payer-rule-matching",
    "Payer Rule Matching Records",
    "Payer Rule Matching priority queue",
    "Review",
    "Payer Rule Matching exception list",
    "Rules Lead",
    "$0"
  ],
  [
    "evidence-checklist",
    "Evidence Checklist Records",
    "Evidence Checklist priority queue",
    "Action needed",
    "Evidence Checklist exception list",
    "Evidence Lead",
    "$0"
  ],
  [
    "packet-generation",
    "Packet Generation Records",
    "Packet Generation priority queue",
    "Open",
    "Packet Generation exception list",
    "Submission Lead",
    "$0"
  ],
  [
    "denial-prevention",
    "Denial Prevention Records",
    "Denial Prevention priority queue",
    "Review",
    "Denial Prevention exception list",
    "Risk Lead",
    "$0"
  ],
  [
    "appeal-routing",
    "Appeal Routing Records",
    "Appeal Routing priority queue",
    "Action needed",
    "Appeal Routing exception list",
    "Appeals Lead",
    "$0"
  ],
  [
    "peer-review-prep",
    "Peer Review Prep Records",
    "Peer Review Prep priority queue",
    "Open",
    "Peer Review Prep exception list",
    "Clinical Review Lead",
    "$0"
  ],
  [
    "sla-tracking",
    "SLA Tracking Records",
    "SLA Tracking priority queue",
    "Review",
    "SLA Tracking exception list",
    "Operations Lead",
    "$0"
  ],
  [
    "authorization-analytics",
    "Authorization Analytics Records",
    "Authorization Analytics priority queue",
    "Action needed",
    "Authorization Analytics exception list",
    "Reporting Lead",
    "$0"
  ],
  [
    "patient-updates",
    "Patient Updates Records",
    "Patient Updates priority queue",
    "Open",
    "Patient Updates exception list",
    "Communications Lead",
    "$0"
  ],
  [
    "documents",
    "Documents Records",
    "Documents priority queue",
    "Review",
    "Documents exception list",
    "Core Platform Lead",
    "$0"
  ],
  [
    "notifications",
    "Notifications Records",
    "Notifications priority queue",
    "Action needed",
    "Notifications exception list",
    "Core Platform Lead",
    "$0"
  ],
  [
    "integrations",
    "Integrations Records",
    "Integrations priority queue",
    "Open",
    "Integrations exception list",
    "Core Platform Lead",
    "$0"
  ],
  [
    "profiles",
    "Profiles Records",
    "Profiles priority queue",
    "Review",
    "Profiles exception list",
    "Core Platform Lead",
    "$0"
  ],
  [
    "ai-assistant",
    "AI Assistant Records",
    "AI Assistant priority queue",
    "Action needed",
    "AI Assistant exception list",
    "Intelligence Layer Lead",
    "$0"
  ],
  [
    "ai-tools",
    "AI Tools Records",
    "AI Tools priority queue",
    "Open",
    "AI Tools exception list",
    "Intelligence Layer Lead",
    "$0"
  ]
] as const;

function buildSet(slug: string, title: string, firstName: string, firstStatus: string, secondName: string, owner: string, amount: string): FeatureEntitySet {
  return {
    title,
    columns: COLUMNS,
    rows: [
      { id: `${slug}-1`, name: firstName, status: firstStatus, owner, amount, dueDate: '2026-06-03', priority: 'High' },
      { id: `${slug}-2`, name: secondName, status: 'Review', owner: 'Operations', amount, dueDate: '2026-06-06', priority: 'Medium' },
      { id: `${slug}-3`, name: `${title.replace(' Records', '')} audit queue`, status: 'Queued', owner: 'Team Lead', amount: '$0', dueDate: '2026-06-10', priority: 'Medium' },
    ],
  };
}

export const featureEntitiesBySlug: Record<string, FeatureEntitySet> = Object.fromEntries(entitySeeds.map(([slug, title, firstName, firstStatus, secondName, owner, amount]) => [slug, buildSet(slug, title, firstName, firstStatus, secondName, owner, amount)]));
