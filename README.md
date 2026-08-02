# Medicare Advantage Post-Acute Prior Authorization & Appeals Learning OS

Full-stack React/Next.js and PostgreSQL operating system for governed post-acute authorization, appeals, and outcome learning. The product supports skilled nursing, inpatient rehabilitation, home health, and long-term acute-care workflows while retaining human clinical decision authority.

## Domain workflows

- Structured post-acute intake with service line, facility, diagnosis/procedure codes, requested units, urgency, evidence criteria, care delay, and revenue exposure.
- Tenant-scoped queue and case command center with evidence readiness, versioned payer policies, deadlines, independent clinical review, durable payer submission, and immutable audit events.
- Human-verified outcome capture for initial approvals, partial approvals, upheld denials, appeals, authorized units, turnaround, care delay, revenue at risk, and recovered revenue.
- Private learning loop grouped by payer, service line, procedure, and denial category, including approval, overturn, turnaround, recovery, and delay signals.
- OpenRouter-powered evidence-gap, appeal-strategy, and peer-to-peer drafts rendered as structured decision briefs instead of raw JSON.
- Explicit human acceptance/rejection of AI drafts. AI output never changes coverage state or releases a submission automatically.
- Encrypted case payloads, provenance-checked evidence, role-based transitions, append-only workflow/outcome history, and idempotent payer outbox operations.
- Eighteen meaningful synthetic post-acute cases, two evidence records per case, and verified outcome history for local evaluation.

## Local Run

```bash
cd ai-prior-authorization-operations-hub
./start.sh
```

`start.sh` validates configuration, applies approved SQL migrations, provisions the configured local administrator, loads synthetic data when enabled, starts the Next.js API, and starts the UI proxy. Use the **Auto Fill Demo Credentials** control on the login screen when local autofill is enabled; credentials remain environment-configured and are not stored in this README.

## Verification

```bash
./start.sh check
POST_ACUTE_BASE_URL=http://127.0.0.1:<ui-port> npm --prefix frontend run test:post-acute
POST_ACUTE_BASE_URL=http://127.0.0.1:<ui-port> VERIFY_OPENROUTER=true npm --prefix frontend run test:post-acute
```

The optional OpenRouter check performs one real evidence-gap review and verifies that the provider response is normalized into the professional decision-brief contract.
