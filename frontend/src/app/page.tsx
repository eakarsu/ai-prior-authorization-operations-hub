'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export default function RootPage() {
  const router = useRouter();
  const { ready, user } = useAuth();

  useEffect(() => {
    if (!ready) return;
    router.replace(user ? '/prior-auth' : '/login');
  }, [ready, router, user]);

  return <div className="auth-wrap"><div className="card">Opening Prior Authorization Operations Hub...</div></div>;
}
