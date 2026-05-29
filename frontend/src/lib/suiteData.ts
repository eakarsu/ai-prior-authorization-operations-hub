export type Metric = { label: string; value: string; note: string };
export const sourceSystems = [
  {
    "name": "Payer rules",
    "ownership": "Payer rules contributes operating evidence, workflows, control signals, and reporting inputs to Prior Authorization Operations.",
    "coverage": [
      "Authorization Intake",
      "Payer Rule Matching",
      "AI tools",
      "Audit evidence"
    ]
  },
  {
    "name": "Clinical notes",
    "ownership": "Clinical notes contributes operating evidence, workflows, control signals, and reporting inputs to Prior Authorization Operations.",
    "coverage": [
      "Payer Rule Matching",
      "Evidence Checklist",
      "AI tools",
      "Audit evidence"
    ]
  },
  {
    "name": "Medical policies",
    "ownership": "Medical policies contributes operating evidence, workflows, control signals, and reporting inputs to Prior Authorization Operations.",
    "coverage": [
      "Evidence Checklist",
      "Packet Generation",
      "AI tools",
      "Audit evidence"
    ]
  },
  {
    "name": "Appeal packets",
    "ownership": "Appeal packets contributes operating evidence, workflows, control signals, and reporting inputs to Prior Authorization Operations.",
    "coverage": [
      "Packet Generation",
      "Denial Prevention",
      "AI tools",
      "Audit evidence"
    ]
  }
];

export const dashboardMetrics: Metric[] = [
  { label: 'Workflow Areas', value: '10', note: 'Dedicated modules' },
  { label: 'Evidence Sources', value: '4', note: 'Mapped sources' },
  { label: 'AI Tools', value: '13', note: 'Suite copilots' },
  { label: 'Open Work', value: '64', note: 'Across workflows' },
];

export const healthMetrics: Metric[] = [
  { label: 'Connector Health', value: '96%', note: 'Pilot baseline' },
  { label: 'Audit Coverage', value: '100%', note: 'All workflows logged' },
  { label: 'Review Queue', value: '22', note: 'Needs owner action' },
  { label: 'Automation Runs', value: '342', note: 'Last 24 hours' },
];

export const dashboardModules = [
  "Authorization Intake operating view",
  "Payer Rule Matching operating view",
  "Evidence Checklist operating view",
  "Packet Generation operating view",
  "Denial Prevention operating view",
  "Appeal Routing operating view",
  "Peer Review Prep operating view",
  "SLA Tracking operating view"
];
export const workflowHighlights = [
  "Authorization Intake workflow with records, AI assist, approvals, audit, and reporting",
  "Payer Rule Matching workflow with records, AI assist, approvals, audit, and reporting",
  "Evidence Checklist workflow with records, AI assist, approvals, audit, and reporting",
  "Packet Generation workflow with records, AI assist, approvals, audit, and reporting",
  "Denial Prevention workflow with records, AI assist, approvals, audit, and reporting",
  "Appeal Routing workflow with records, AI assist, approvals, audit, and reporting"
];
