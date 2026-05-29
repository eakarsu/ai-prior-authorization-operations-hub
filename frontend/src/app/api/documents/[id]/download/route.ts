import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getDocuments } from '@/lib/documentStore';
import { requireSession } from '@/lib/requestAuth';
import { DATA_DIR } from '@/lib/storePaths';

const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = requireSession(request);
  if (session instanceof NextResponse) return session;
  const docs = await getDocuments();
  const doc = docs.find((item) => item.id === params.id);
  if (!doc?.storagePath) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, doc.storagePath);
  const file = await fs.readFile(filePath);
  return new NextResponse(file, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${doc.fileName || doc.name}"`,
    },
  });
}
