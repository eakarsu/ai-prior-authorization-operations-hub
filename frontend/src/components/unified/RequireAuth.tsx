'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, user } = useAuth();

  useEffect(() => {
    if (ready && !user) {
      router.replace('/login');
    }
  }, [ready, router, user]);

  if (!ready || !user) {
    return <div className="auth-wrap"><div className="card">Loading AI Agent Ops suite...</div></div>;
  }

  return <>{children}</>;
}
