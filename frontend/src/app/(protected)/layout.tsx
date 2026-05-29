import RequireAuth from '@/components/unified/RequireAuth';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
