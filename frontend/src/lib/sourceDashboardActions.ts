export type SourceDashboardAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  sourceProjects: string[];
  examples: string[];
  count: number;
};

export const sourceDashboardActions: SourceDashboardAction[] = [
  {
    "id": "auth-intake",
    "label": "Authorization Intake",
    "description": "Authorization Intake action group for Prior Authorization Operations.",
    "href": "/auth-intake",
    "sourceProjects": [
      "Payer rules",
      "Clinical notes"
    ],
    "examples": [
      "Open Authorization Intake",
      "Review Intake",
      "Run Authorization Intake AI check"
    ],
    "count": 3
  },
  {
    "id": "payer-rule-matching",
    "label": "Payer Rule Matching",
    "description": "Payer Rule Matching action group for Prior Authorization Operations.",
    "href": "/payer-rule-matching",
    "sourceProjects": [
      "Clinical notes",
      "Medical policies"
    ],
    "examples": [
      "Open Payer Rule Matching",
      "Review Rules",
      "Run Payer Rule Matching AI check"
    ],
    "count": 3
  },
  {
    "id": "evidence-checklist",
    "label": "Evidence Checklist",
    "description": "Evidence Checklist action group for Prior Authorization Operations.",
    "href": "/evidence-checklist",
    "sourceProjects": [
      "Medical policies",
      "Appeal packets"
    ],
    "examples": [
      "Open Evidence Checklist",
      "Review Evidence",
      "Run Evidence Checklist AI check"
    ],
    "count": 3
  },
  {
    "id": "packet-generation",
    "label": "Packet Generation",
    "description": "Packet Generation action group for Prior Authorization Operations.",
    "href": "/packet-generation",
    "sourceProjects": [
      "Appeal packets"
    ],
    "examples": [
      "Open Packet Generation",
      "Review Submission",
      "Run Packet Generation AI check"
    ],
    "count": 3
  },
  {
    "id": "denial-prevention",
    "label": "Denial Prevention",
    "description": "Denial Prevention action group for Prior Authorization Operations.",
    "href": "/denial-prevention",
    "sourceProjects": [
      "Payer rules",
      "Clinical notes"
    ],
    "examples": [
      "Open Denial Prevention",
      "Review Risk",
      "Run Denial Prevention AI check"
    ],
    "count": 3
  },
  {
    "id": "appeal-routing",
    "label": "Appeal Routing",
    "description": "Appeal Routing action group for Prior Authorization Operations.",
    "href": "/appeal-routing",
    "sourceProjects": [
      "Clinical notes",
      "Medical policies"
    ],
    "examples": [
      "Open Appeal Routing",
      "Review Appeals",
      "Run Appeal Routing AI check"
    ],
    "count": 3
  },
  {
    "id": "peer-review-prep",
    "label": "Peer Review Prep",
    "description": "Peer Review Prep action group for Prior Authorization Operations.",
    "href": "/peer-review-prep",
    "sourceProjects": [
      "Medical policies",
      "Appeal packets"
    ],
    "examples": [
      "Open Peer Review Prep",
      "Review Clinical Review",
      "Run Peer Review Prep AI check"
    ],
    "count": 3
  },
  {
    "id": "sla-tracking",
    "label": "SLA Tracking",
    "description": "SLA Tracking action group for Prior Authorization Operations.",
    "href": "/sla-tracking",
    "sourceProjects": [
      "Appeal packets"
    ],
    "examples": [
      "Open SLA Tracking",
      "Review Operations",
      "Run SLA Tracking AI check"
    ],
    "count": 3
  },
  {
    "id": "authorization-analytics",
    "label": "Authorization Analytics",
    "description": "Authorization Analytics action group for Prior Authorization Operations.",
    "href": "/authorization-analytics",
    "sourceProjects": [
      "Payer rules",
      "Clinical notes"
    ],
    "examples": [
      "Open Authorization Analytics",
      "Review Reporting",
      "Run Authorization Analytics AI check"
    ],
    "count": 3
  },
  {
    "id": "patient-updates",
    "label": "Patient Updates",
    "description": "Patient Updates action group for Prior Authorization Operations.",
    "href": "/patient-updates",
    "sourceProjects": [
      "Clinical notes",
      "Medical policies"
    ],
    "examples": [
      "Open Patient Updates",
      "Review Communications",
      "Run Patient Updates AI check"
    ],
    "count": 3
  }
];
