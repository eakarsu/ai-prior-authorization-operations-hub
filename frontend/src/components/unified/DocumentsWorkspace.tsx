'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { DocumentRecord } from '@/lib/documentStore';
import { useAuth } from '@/components/providers/AuthProvider';
import { rolePermissions } from '@/lib/auth';

export default function DocumentsWorkspace() {
  const { user } = useAuth();
  const canManage = rolePermissions[user?.role || 'analyst'].canManageDocuments;
  const [items, setItems] = useState<DocumentRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', type: '', owner: '' });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    void fetch('/api/documents', { cache: 'no-store' })
      .then((response) => response.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (!items.length) return;
    if (!canManage) {
      setSaving(false);
      return;
    }
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaving(true);
    saveTimeout.current = setTimeout(async () => {
      const response = await fetch('/api/documents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      });
      if (!response.ok) {
        setError('Unable to save document changes for this role.');
      } else {
        setError('');
      }
      setSaving(false);
    }, 350);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [canManage, items]);

  const addDocument = () => {
    if (!canManage) return;
    if (!form.name.trim()) return;
    setItems((current) => [
      {
        id: `doc-${Date.now()}`,
        name: form.name.trim(),
        type: form.type.trim() || 'Healthcare Document',
        owner: form.owner.trim() || 'Unassigned',
        status: 'Draft',
        updatedAt: new Date().toLocaleString(),
      },
      ...current,
    ]);
    setForm({ name: '', type: '', owner: '' });
  };

  const updateItem = (id: string, field: keyof DocumentRecord, value: string) => {
    if (!canManage) return;
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value, updatedAt: new Date().toLocaleString() } : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    if (!canManage) return;
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const uploadDocument = async () => {
    if (!selectedFile || !canManage) return;
    const payload = new FormData();
    payload.append('file', selectedFile);
    payload.append('owner', form.owner || user?.firstName || 'Unassigned');
    payload.append('type', form.type || 'Healthcare Document');
    setUploading(true);
    const response = await fetch('/api/documents/upload', { method: 'POST', body: payload });
    setUploading(false);
    if (!response.ok) {
      setError('Upload failed for this role.');
      return;
    }
    const record = (await response.json()) as DocumentRecord;
    setItems((current) => [record, ...current]);
    setSelectedFile(null);
    setError('');
  };

  return (
    <div className="card">
      <div className="section-head">
        <h3>Documents Workspace</h3>
        <span className="save-indicator">{saving ? 'Saving...' : 'Saved'}</span>
      </div>
      <div className="muted" style={{ marginBottom: 12 }}>{canManage ? 'Edit mode' : 'Read-only mode'}</div>
      {error ? <div style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div> : null}
      <div className="work-item-form">
        <input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Document name" disabled={!canManage} />
        <input value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))} placeholder="Document type" disabled={!canManage} />
        <input value={form.owner} onChange={(e) => setForm((s) => ({ ...s, owner: e.target.value }))} placeholder="Owner" disabled={!canManage} />
        <button className="button primary" type="button" onClick={addDocument} disabled={!canManage}>Add document</button>
      </div>
      <div className="work-item-form">
        <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} disabled={!canManage} />
        <div className="muted">{selectedFile ? selectedFile.name : 'No file selected'}</div>
        <div />
        <button className="button" type="button" onClick={uploadDocument} disabled={!selectedFile || !canManage}>
          {uploading ? 'Uploading...' : 'Upload file'}
        </button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Updated</th>
              <th>File</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><input value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} disabled={!canManage} /></td>
                <td><input value={item.type} onChange={(e) => updateItem(item.id, 'type', e.target.value)} disabled={!canManage} /></td>
                <td><input value={item.owner} onChange={(e) => updateItem(item.id, 'owner', e.target.value)} disabled={!canManage} /></td>
                <td><input value={item.status} onChange={(e) => updateItem(item.id, 'status', e.target.value)} disabled={!canManage} /></td>
                <td>{item.updatedAt}</td>
                <td>
                  {item.storagePath ? (
                    <Link className="button subtle" href={`/api/documents/${item.id}/download`}>
                      Download
                    </Link>
                  ) : (
                    <span className="muted">No file</span>
                  )}
                </td>
                <td><button className="button subtle" type="button" onClick={() => removeItem(item.id)} disabled={!canManage}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
