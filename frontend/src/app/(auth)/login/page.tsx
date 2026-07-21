'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { ready, user, login } = useAuth();
  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (ready && user) router.replace('/prior-auth'); }, [ready, router, user]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError('');
    const ok = await login(tenantId, email, password);
    setSubmitting(false);
    if (!ok) { setError('Credentials were not accepted or identity service is unavailable.'); return; }
    router.push('/prior-auth');
  };

  return <div className="auth-wrap"><div className="auth-card">
    <div className="pill">Governed Prior Authorization</div>
    <h1 style={{ marginBottom: 8 }}>Sign in</h1>
    <p className="muted">Use a provisioned tenant identity. Case actions are role-bound, version checked, and audited.</p>
    <form onSubmit={onSubmit}>
      <label>Organization<input required autoComplete="organization" value={tenantId} onChange={(event) => setTenantId(event.target.value)} /></label>
      <label>Email<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button className="button primary" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
    </form>
    {error ? <div style={{ color: '#b91c1c', marginTop: 14 }}>{error}</div> : null}
  </div></div>;
}
