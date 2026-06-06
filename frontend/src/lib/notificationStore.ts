import { ensureListSeed, listPgPayloads, replacePgPayloads } from '@/lib/postgres';
export type NotificationItem = { id: string; title: string; detail: string; read: boolean };
const seed: NotificationItem[] = [
  { id: 'note-1', title: 'Evidence gap alert', detail: 'A lumbar MRI authorization is missing conservative therapy documentation.', read: false },
  { id: 'note-2', title: 'Appeal deadline due', detail: 'A CPAP denial appeal requires reviewer action before the deadline.', read: false },
  { id: 'note-3', title: 'Payer response updated', detail: 'A submitted biologic therapy request moved to payer review.', read: true },
];
async function ensureStore() { await ensureListSeed('notifications', seed, 'notifications.json') }
export async function getNotifications(): Promise<NotificationItem[]> { await ensureStore(); return listPgPayloads<NotificationItem>('notifications') }
export async function saveNotifications(items: NotificationItem[]) { await ensureStore(); await replacePgPayloads('notifications', items) }
