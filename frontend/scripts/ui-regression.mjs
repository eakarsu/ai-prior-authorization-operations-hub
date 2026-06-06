const baseUrl = process.env.SMOKE_BASE_URL || process.env.UI_BASE_URL || 'http://127.0.0.1:3000';

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@prior-auth.local', password: 'admin123' }),
  });
  if (!response.ok) throw new Error(`Login failed with ${response.status}`);
  const cookie = response.headers.get('set-cookie');
  if (!cookie) throw new Error('Login did not return a session cookie');
  return cookie.split(';')[0];
}

async function expectOk(path, cookie) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { cookie } });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response;
}

const cookie = await login();

const routes = [
  '/dashboard',
  '/features',
  '/prior-auth/case-model',
  '/prior-auth/case-model/case-queue',
  '/prior-auth/payer-rule-engine/policy-matching',
  '/prior-auth/evidence-gap-detection/missing-evidence',
  '/production-readiness',
];

for (const route of routes) {
  await expectOk(route, cookie);
}

const readiness = await (await expectOk('/api/prior-auth/production-readiness', cookie)).json();
if (!readiness.integrations?.length) throw new Error('No integration readiness rows returned');
if (!readiness.notificationOutbox?.length) throw new Error('No notification outbox rows returned');
if (!readiness.packetArtifacts?.length) throw new Error('No packet artifacts returned');
if (!readiness.accessLogs?.length) throw new Error('No access logs returned');
if (!readiness.authControls?.length) throw new Error('No auth controls returned');
if (!readiness.deploymentChecklist?.length) throw new Error('No deployment checklist returned');

const enterpriseConfig = await (await expectOk('/api/auth/enterprise-config', cookie)).json();
if (!enterpriseConfig.authControls?.length) throw new Error('No enterprise auth controls returned');

const packetResponse = await fetch(`${baseUrl}/api/prior-auth/packets`, {
  method: 'POST',
  headers: { cookie, 'Content-Type': 'application/json' },
  body: JSON.stringify({ caseNumber: 'PA-2026-1001', packetType: 'Initial submission' }),
});
if (!packetResponse.ok) throw new Error(`Packet generation returned ${packetResponse.status}`);
const packet = await packetResponse.json();
const packetDownload = await fetch(`${baseUrl}/api/prior-auth/packets/${packet.id}/download`, { headers: { cookie } });
if (!packetDownload.ok || !packetDownload.headers.get('content-type')?.includes('application/pdf')) {
  throw new Error('Generated packet did not download as a PDF');
}

const dispatchResponse = await fetch(`${baseUrl}/api/prior-auth/notifications/outbox/dispatch`, {
  method: 'POST',
  headers: { cookie, 'Content-Type': 'application/json' },
  body: '{}',
});
if (!dispatchResponse.ok) throw new Error(`Notification dispatch returned ${dispatchResponse.status}`);

const cases = await (await expectOk('/api/prior-auth/cases', cookie)).json();
const subfeatureCounts = Object.values(cases.subfeatureRows || {}).map((rows) => rows.length);
if (!subfeatureCounts.length || Math.min(...subfeatureCounts) < 15) {
  throw new Error('Every sub-feature must expose at least 15 seeded rows');
}

console.log('Prior Authorization UI regression passed');
