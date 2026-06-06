import { NextRequest, NextResponse } from 'next/server';
import { buildAnalytics } from '@/lib/priorAuth';
import { getPriorAuthCases } from '@/lib/priorAuthStore';
import { requireSession } from '@/lib/requestAuth';

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  return NextResponse.json(buildAnalytics(await getPriorAuthCases()));
}
