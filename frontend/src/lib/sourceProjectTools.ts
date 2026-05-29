export const sourceProjectTools = [
  {
    "id": "auth-intake-copilot",
    "title": "Authorization Intake Copilot",
    "category": "Intake",
    "description": "Patient, provider, payer, service request, diagnosis, and submission status.",
    "defaultPrompt": "Analyze Authorization Intake for Prior Authorization Operations. Return summary, risks, missing evidence, next actions, and owner follow-up.",
    "inputLabel": "Authorization Intake context",
    "outputLabel": "Authorization Intake AI response",
    "signals": [
      "Authorization Intake",
      "Intake",
      "Prior Authorization Operations"
    ]
  },
  {
    "id": "payer-rule-matching-copilot",
    "title": "Payer Rule Matching Copilot",
    "category": "Rules",
    "description": "Medical policy criteria, covered indications, documentation requirements, and rule fit.",
    "defaultPrompt": "Analyze Payer Rule Matching for Prior Authorization Operations. Return summary, risks, missing evidence, next actions, and owner follow-up.",
    "inputLabel": "Payer Rule Matching context",
    "outputLabel": "Payer Rule Matching AI response",
    "signals": [
      "Payer Rule Matching",
      "Rules",
      "Prior Authorization Operations"
    ]
  },
  {
    "id": "evidence-checklist-copilot",
    "title": "Evidence Checklist Copilot",
    "category": "Evidence",
    "description": "Clinical notes, imaging, labs, prior therapy, contraindications, and missing proof.",
    "defaultPrompt": "Analyze Evidence Checklist for Prior Authorization Operations. Return summary, risks, missing evidence, next actions, and owner follow-up.",
    "inputLabel": "Evidence Checklist context",
    "outputLabel": "Evidence Checklist AI response",
    "signals": [
      "Evidence Checklist",
      "Evidence",
      "Prior Authorization Operations"
    ]
  },
  {
    "id": "packet-generation-copilot",
    "title": "Packet Generation Copilot",
    "category": "Submission",
    "description": "Cover letters, forms, evidence bundle, coding details, and submission readiness.",
    "defaultPrompt": "Analyze Packet Generation for Prior Authorization Operations. Return summary, risks, missing evidence, next actions, and owner follow-up.",
    "inputLabel": "Packet Generation context",
    "outputLabel": "Packet Generation AI response",
    "signals": [
      "Packet Generation",
      "Submission",
      "Prior Authorization Operations"
    ]
  },
  {
    "id": "denial-prevention-copilot",
    "title": "Denial Prevention Copilot",
    "category": "Risk",
    "description": "Likely denial reasons, weak evidence, payer history, and prevention actions.",
    "defaultPrompt": "Analyze Denial Prevention for Prior Authorization Operations. Return summary, risks, missing evidence, next actions, and owner follow-up.",
    "inputLabel": "Denial Prevention context",
    "outputLabel": "Denial Prevention AI response",
    "signals": [
      "Denial Prevention",
      "Risk",
      "Prior Authorization Operations"
    ]
  },
  {
    "id": "appeal-routing-copilot",
    "title": "Appeal Routing Copilot",
    "category": "Appeals",
    "description": "Denied requests, appeal deadlines, reviewer owner, letter draft, and escalation status.",
    "defaultPrompt": "Analyze Appeal Routing for Prior Authorization Operations. Return summary, risks, missing evidence, next actions, and owner follow-up.",
    "inputLabel": "Appeal Routing context",
    "outputLabel": "Appeal Routing AI response",
    "signals": [
      "Appeal Routing",
      "Appeals",
      "Prior Authorization Operations"
    ]
  },
  {
    "id": "peer-review-prep-copilot",
    "title": "Peer Review Prep Copilot",
    "category": "Clinical Review",
    "description": "Peer-to-peer talking points, clinical rationale, policy gaps, and supporting facts.",
    "defaultPrompt": "Analyze Peer Review Prep for Prior Authorization Operations. Return summary, risks, missing evidence, next actions, and owner follow-up.",
    "inputLabel": "Peer Review Prep context",
    "outputLabel": "Peer Review Prep AI response",
    "signals": [
      "Peer Review Prep",
      "Clinical Review",
      "Prior Authorization Operations"
    ]
  },
  {
    "id": "sla-tracking-copilot",
    "title": "SLA Tracking Copilot",
    "category": "Operations",
    "description": "Payer response timers, urgent flags, backlog, overdue work, and team capacity.",
    "defaultPrompt": "Analyze SLA Tracking for Prior Authorization Operations. Return summary, risks, missing evidence, next actions, and owner follow-up.",
    "inputLabel": "SLA Tracking context",
    "outputLabel": "SLA Tracking AI response",
    "signals": [
      "SLA Tracking",
      "Operations",
      "Prior Authorization Operations"
    ]
  },
  {
    "id": "authorization-analytics-copilot",
    "title": "Authorization Analytics Copilot",
    "category": "Reporting",
    "description": "Approval rates, denial trends, payer performance, turnaround, and leakage.",
    "defaultPrompt": "Analyze Authorization Analytics for Prior Authorization Operations. Return summary, risks, missing evidence, next actions, and owner follow-up.",
    "inputLabel": "Authorization Analytics context",
    "outputLabel": "Authorization Analytics AI response",
    "signals": [
      "Authorization Analytics",
      "Reporting",
      "Prior Authorization Operations"
    ]
  },
  {
    "id": "patient-updates-copilot",
    "title": "Patient Updates Copilot",
    "category": "Communications",
    "description": "Patient-facing status, next steps, delay reasons, and communication log.",
    "defaultPrompt": "Analyze Patient Updates for Prior Authorization Operations. Return summary, risks, missing evidence, next actions, and owner follow-up.",
    "inputLabel": "Patient Updates context",
    "outputLabel": "Patient Updates AI response",
    "signals": [
      "Patient Updates",
      "Communications",
      "Prior Authorization Operations"
    ]
  }
];
