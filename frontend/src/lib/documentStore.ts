import { ensureListSeed, listPgPayloads, replacePgPayloads } from '@/lib/postgres';
export type DocumentRecord = { id: string; name: string; type: string; owner: string; status: string; updatedAt: string; fileName?: string; storagePath?: string; sizeBytes?: number };
const seed: DocumentRecord[] = [
  { id: 'doc-1', name: 'Lumbar MRI Evidence Packet', type: 'Clinical Evidence', owner: 'Evidence Lead', status: 'In review', updatedAt: '2026-06-06 10:00' },
  { id: 'doc-2', name: 'Biologic Therapy Prior Therapy Bundle', type: 'Prior Therapy', owner: 'Submission Lead', status: 'Approval pending', updatedAt: '2026-06-06 11:20' },
  { id: 'doc-3', name: 'CPAP Appeal Packet', type: 'Appeal Packet', owner: 'Appeals Lead', status: 'Ready', updatedAt: '2026-06-06 09:35' },
];
async function ensureStore() { await ensureListSeed('documents', seed, 'documents.json') }
export async function getDocuments(): Promise<DocumentRecord[]> { await ensureStore(); return listPgPayloads<DocumentRecord>('documents') }
export async function saveDocuments(items: DocumentRecord[]) { await ensureStore(); await replacePgPayloads('documents', items) }
