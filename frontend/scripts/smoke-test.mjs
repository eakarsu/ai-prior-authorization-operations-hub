const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5207';

async function login(email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Login failed for ${email}`);
  const cookie = response.headers.get('set-cookie');
  if (!cookie) throw new Error(`No session cookie for ${email}`);
  return cookie.split(';')[0];
}

async function expectStatus(path, cookie, status) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { cookie },
  });
  if (response.status !== status) {
    throw new Error(`${path} returned ${response.status}, expected ${status}`);
  }
  return response;
}

async function expectJson(path, cookie, status = 200) {
  const response = await expectStatus(path, cookie, status);
  return response.json();
}

const adminCookie = await login('admin@prior-auth.local', 'admin123');
const managerCookie = await login('manager@prior-auth.local', 'manager123');
const analystCookie = await login('analyst@prior-auth.local', 'analyst123');

await expectJson('/api/dashboard', adminCookie);
await expectJson('/api/entities/auth-intake', analystCookie);
await expectJson('/api/documents', analystCookie);
await expectJson('/api/source-tables', adminCookie);
const priorAuth = await expectJson('/api/prior-auth/cases', adminCookie);
if (!priorAuth.cases || priorAuth.cases.length < 15) {
  throw new Error(`Expected at least 15 prior authorization cases, received ${priorAuth.cases?.length || 0}`);
}
const subfeatureCounts = Object.values(priorAuth.subfeatureRows || {}).map((rows) => rows.length);
if (!subfeatureCounts.length || Math.min(...subfeatureCounts) < 15) {
  throw new Error('Expected every prior authorization sub-feature to have at least 15 seeded rows');
}
const readiness = await expectJson('/api/prior-auth/production-readiness', adminCookie);
for (const key of ['integrations', 'notificationOutbox', 'packetArtifacts', 'accessLogs', 'authControls', 'deploymentChecklist']) {
  if (!readiness[key]?.length) {
    throw new Error(`Production readiness response is missing ${key}`);
  }
}
await expectStatus('/api/documents/upload', analystCookie, 405);

const records = await expectJson('/api/entities/auth-intake', managerCookie);
const rowId = records.rows[0].id;

const approveResponse = await fetch(`${baseUrl}/api/entities/auth-intake/approve`, {
  method: 'POST',
  headers: {
    cookie: managerCookie,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ rowId, approved: true }),
});
if (!approveResponse.ok) {
  throw new Error(`Manager approval failed with ${approveResponse.status}`);
}

const forbiddenApprove = await fetch(`${baseUrl}/api/entities/auth-intake/approve`, {
  method: 'POST',
  headers: {
    cookie: analystCookie,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ rowId, approved: false }),
});
if (forbiddenApprove.status !== 403) {
  throw new Error(`Analyst approval returned ${forbiddenApprove.status}, expected 403`);
}

console.log('Prior Authorization Operations Hub smoke passed');
