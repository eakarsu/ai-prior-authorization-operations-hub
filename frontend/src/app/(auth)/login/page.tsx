'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { demoUser, demoUsers } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { ready, user, login } = useAuth();
  const [email, setEmail] = useState(demoUser.email);
  const [password, setPassword] = useState(demoUser.password);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && user) {
      router.replace('/dashboard');
    }
  }, [ready, router, user]);

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const ok = await login(email, password);
    setSubmitting(false);
    if (!ok) {
      setError('Use the seeded AI Agent Ops demo credentials.');
      return;
    }
    router.push('/dashboard');
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="pill">Agent Ops</div>
        <h1 style={{ marginBottom: 8 }}>AI Agent Ops login</h1>
        <div className="muted">
          One login for ai agent ops features, source tables, documents, notifications, audit, approvals, and AI operations.
        </div>

        <form onSubmit={onSubmit}>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {error ? <div style={{ color: '#b91c1c', marginTop: 14 }}>{error}</div> : null}

        <div className="hint">
          Seeded suite users:
          {demoUsers.map((user) => (
            <div key={user.email} style={{ marginTop: 8 }}>
              <strong>{user.role}</strong>: {user.email} / {user.password}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
