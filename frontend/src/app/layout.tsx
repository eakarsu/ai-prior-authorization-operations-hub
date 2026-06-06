import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';

export const metadata = {
  title: 'AI Prior Authorization Operations Hub',
  description: 'Prior authorization operations hub with case lifecycle, payer rules, evidence, packets, appeals, SLA, analytics, documents, and AI tools.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
