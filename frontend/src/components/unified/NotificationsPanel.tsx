'use client';

import { useEffect, useState } from 'react';
import type { NotificationItem } from '@/lib/notificationStore';

export default function NotificationsPanel() {
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    void fetch('/api/notifications', { cache: 'no-store' })
      .then((response) => response.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const toggleRead = async (id: string) => {
    const next = items.map((item) => (item.id === id ? { ...item, read: !item.read } : item));
    setItems(next);
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
  };

  const unread = items.filter((item) => !item.read).length;

  return (
    <div className="card">
      <div className="section-head">
        <h3>Notifications</h3>
        <span className="pill">{unread} unread</span>
      </div>
      <div className="stack">
        {items.map((item) => (
          <div key={item.id} className="activity-row">
            <div className="section-head">
              <strong>{item.title}</strong>
              <button className="button subtle" type="button" onClick={() => toggleRead(item.id)}>
                {item.read ? 'Mark unread' : 'Mark read'}
              </button>
            </div>
            <div className="muted">{item.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
