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

const adminCookie = await login('admin@ai-agent-ops.local', 'admin123');
const managerCookie = await login('manager@ai-agent-ops.local', 'manager123');
const analystCookie = await login('analyst@ai-agent-ops.local', 'analyst123');

await expectJson('/api/dashboard', adminCookie);
await expectJson('/api/entities/agents', analystCookie);
await expectJson('/api/documents', analystCookie);
await expectJson('/api/source-tables', adminCookie);
await expectStatus('/api/documents/upload', analystCookie, 405);

const records = await expectJson('/api/entities/agents', managerCookie);
const rowId = records.rows[0].id;

const approveResponse = await fetch(`${baseUrl}/api/entities/agents/approve`, {
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

const forbiddenApprove = await fetch(`${baseUrl}/api/entities/agents/approve`, {
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

console.log('AI Agent Ops Suite smoke passed');
