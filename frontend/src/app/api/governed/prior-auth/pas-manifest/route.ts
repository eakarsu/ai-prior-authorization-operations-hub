import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/requestAuth';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildPasSubmissionManifest } = require('../../../../../../../governance/fhirInterop.cjs');

export async function POST(request: NextRequest) {
  const user = requireSession(request);
  if (user instanceof NextResponse) return user;
  if (!['analyst', 'clinician', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'role cannot prepare a PAS manifest' }, { status: 403 });
  }
  try {
    return NextResponse.json(buildPasSubmissionManifest(await request.json()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'invalid PAS bundle' }, { status: 422 });
  }
}
