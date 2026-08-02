import assert from 'node:assert/strict';

const baseUrl = process.env.POST_ACUTE_BASE_URL || 'http://127.0.0.1:30771';

async function json(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual', ...options });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

const loginPage = await fetch(`${baseUrl}/login`);
assert.equal(loginPage.status, 200, 'login page should render');
const demo = await json('/api/auth/demo-credentials');
assert.equal(demo.response.status, 200, 'demo credential endpoint should be available locally');
assert.ok(demo.body.tenantId && demo.body.email && demo.body.password, 'demo credential contract should be complete');

const login = await json('/api/auth/login', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ tenantId: demo.body.tenantId, email: demo.body.email, password: demo.body.password }),
});
assert.equal(login.response.status, 200, JSON.stringify(login.body));
const cookie = login.response.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie, 'login should establish a session cookie');
const headers = { cookie };

const page = await fetch(`${baseUrl}/prior-auth`, { headers });
assert.equal(page.status, 200, 'protected post-acute page should render');
const pageText = await page.text();
assert.match(pageText, /Post-Acute Prior Authorization/);

const queue = await json('/api/governed/prior-auth', { headers });
assert.equal(queue.response.status, 200, JSON.stringify(queue.body));
assert.ok(queue.body.cases.length >= 18, 'governed queue should contain meaningful seeded cases');
const postAcute = queue.body.cases.filter((item) => item.serviceLine);
assert.ok(postAcute.length >= 18, `expected at least 18 post-acute cases, received ${postAcute.length}`);
const scopedQueue = await json('/api/governed/prior-auth?scope=post-acute', { headers });
assert.equal(scopedQueue.response.status, 200, JSON.stringify(scopedQueue.body));
assert.equal(scopedQueue.body.cases.length, postAcute.length, 'post-acute workspace scope should exclude legacy authorization cases');
assert.ok(scopedQueue.body.cases.every((item) => item.serviceLine), 'every scoped queue item should have a post-acute service line');

const learning = await json('/api/governed/prior-auth/learning', { headers });
assert.equal(learning.response.status, 200, JSON.stringify(learning.body));
assert.ok(learning.body.learning.length >= 8, 'learning loop should expose payer and service-line outcome signals');
assert.ok(Number(learning.body.metrics.revenue_at_risk) > 0, 'revenue exposure should be calculated');
assert.ok(Number(learning.body.metrics.recovered_revenue) > 0, 'recovered revenue should be calculated');

const selected = postAcute.find((item) => item.acceptanceCriteria?.length) || postAcute[0];
const detail = await json(`/api/governed/prior-auth?id=${selected.id}`, { headers });
assert.equal(detail.response.status, 200, JSON.stringify(detail.body));
assert.ok(detail.body.evidence.length >= 1, 'post-acute case should include evidence');
assert.ok(detail.body.events.length >= 1, 'post-acute case should include immutable history');

const outcomes = await json(`/api/governed/prior-auth/outcomes?caseId=${selected.id}`, { headers });
assert.equal(outcomes.response.status, 200, JSON.stringify(outcomes.body));
const reviews = await json(`/api/governed/prior-auth/ai-review?caseId=${selected.id}`, { headers });
assert.equal(reviews.response.status, 200, JSON.stringify(reviews.body));

if (process.env.VERIFY_OPENROUTER === 'true') {
  const ai = await json('/api/governed/prior-auth/ai-review', {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ caseId: selected.id, reviewType: 'evidence_gap' }),
  });
  assert.equal(ai.response.status, 201, JSON.stringify(ai.body));
  assert.ok(ai.body.review.structuredOutput?.headline, 'AI result should be normalized into a decision brief');
  assert.ok(Array.isArray(ai.body.review.structuredOutput?.recommendations), 'AI result should include structured recommendations');
}

console.log(`Post-acute live check passed: ${postAcute.length} cases, ${learning.body.learning.length} learning signals${process.env.VERIFY_OPENROUTER === 'true' ? ', OpenRouter verified' : ''}.`);
