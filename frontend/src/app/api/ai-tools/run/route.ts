import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { aiTools, getAITool } from '@/lib/aiTools';
import { appendAuditEntry } from '@/lib/auditStore';
import { requireSession } from '@/lib/requestAuth';
import { getGovernedPostgres } from '@/lib/postgres';

async function callOpenRouter(system: string, prompt: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.OPENROUTER_BASE_URL;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !baseUrl || !model) throw new Error('OpenRouter is not configured');
  const response = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], temperature: 0.2 }),
  });
  if (!response.ok) throw new Error('OpenRouter returned ' + response.status);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('OpenRouter returned empty content');
  return { content, model };
}

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  return NextResponse.json({ tools: aiTools });
}

export async function POST(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  const body = await request.json().catch(() => null) as { toolId?: string; input?: string } | null;
  const tool = getAITool(body?.toolId || 'suite-assistant');
  const input = body?.input?.trim() || tool.defaultPrompt;
  const result = await callOpenRouter(
    'You are ' + tool.title + '. Return concise operational guidance with risks, next actions, and audit notes.',
    input,
  );
  const persistedId = crypto.randomUUID();
  await getGovernedPostgres().query(
    `INSERT INTO prior_auth_runtime_ai_results(id,tenant_id,actor_id,tool_id,prompt,content,provider,model)
     VALUES($1,$2,$3,$4,$5,$6,'openrouter',$7)`,
    [persistedId, session.tenantId, session.id, tool.id, input, result.content, result.model],
  );
  await appendAuditEntry('AI Tools', ((session.firstName + ' ' + session.lastName).trim() || session.email) + ' ran ' + tool.title);
  return NextResponse.json({ tool, input, response: result.content, content: result.content, provider: 'openrouter', model: result.model, persistedId, createdAt: new Date().toISOString() });
}
