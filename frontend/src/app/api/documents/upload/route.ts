import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { appendAuditEntry } from '@/lib/auditStore';
import { getDocuments, saveDocuments } from '@/lib/documentStore';
import { requireDocumentManager } from '@/lib/requestAuth';
import { DATA_DIR } from '@/lib/storePaths';

const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

export async function POST(request: NextRequest) {
  const session = requireDocumentManager(request);
  if (session instanceof NextResponse) return session;
  const form = await request.formData();
  const file = form.get('file');
  const owner = String(form.get('owner') || 'Unassigned');
  const type = String(form.get('type') || 'Healthcare Document');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const target = path.join(UPLOAD_DIR, safeName);
  await fs.writeFile(target, buffer);

  const docs = await getDocuments();
  const record = {
    id: `doc-${Date.now()}`,
    name: file.name,
    type,
    owner,
    status: 'Uploaded',
    updatedAt: new Date().toLocaleString(),
    fileName: file.name,
    storagePath: safeName,
    sizeBytes: buffer.byteLength,
  };
  docs.unshift(record);
  await saveDocuments(docs);
  await appendAuditEntry('Documents', `Uploaded file: ${file.name}`);

  return NextResponse.json(record);
}
