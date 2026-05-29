import { NextRequest, NextResponse } from 'next/server';
import { aiTools, getAITool } from '@/lib/aiTools';
import { appendAuditEntry } from '@/lib/auditStore';
import { requireSession } from '@/lib/requestAuth';

async function callConfiguredAI(system: string, prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const response = await fetch(baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error('AI provider returned ' + response.status);
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content as string | undefined;
}

function localResponse(toolTitle: string, prompt: string, signals: string[]) {
  const trimmedPrompt = prompt.trim();
  return [
    toolTitle + ' response',
    '',
    'Summary: ' + trimmedPrompt.slice(0, 260) + (trimmedPrompt.length > 260 ? '...' : ''),
    '',
    'Recommended next actions:',
    ...signals.slice(0, 4).map((signal, index) => String(index + 1) + '. Review ' + signal + ' and assign an owner.'),
    String(Math.min(signals.length + 1, 5)) + '. Update the audit trail after the review is accepted.',
  ].join('\n');
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
  const system = 'You are ' + tool.title + '. Stay inside this suite workflow. Return concise operational guidance with risks, next actions, and audit notes.';

  let response: string;
  let provider = 'local-pilot';
  try {
    const aiResponse = await callConfiguredAI(system, input);
    response = aiResponse || localResponse(tool.title, input, tool.signals);
    provider = aiResponse ? 'configured-ai' : provider;
  } catch {
    response = localResponse(tool.title, input, tool.signals);
    provider = 'local-fallback';
  }

  await appendAuditEntry('AI Tools', ((session.firstName + ' ' + session.lastName).trim() || session.email) + ' ran ' + tool.title);

  return NextResponse.json({
    tool,
    input,
    response,
    provider,
    createdAt: new Date().toISOString(),
  });
}
