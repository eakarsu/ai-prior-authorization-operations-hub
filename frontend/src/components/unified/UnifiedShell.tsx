'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { featureNav, primaryNav } from '@/lib/unifiedApp';
import { useAuth } from '@/components/providers/AuthProvider';

type UnifiedShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
};

export default function UnifiedShell({ children, title, subtitle, eyebrow }: UnifiedShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const production = process.env.NODE_ENV === 'production';
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">AI</div>
          <div>
            <div className="pill">Prior Auth</div>
            <h1>Prior Auth Ops</h1>
          </div>
        </div>
        <nav className="nav-section">
          {(production ? [] : primaryNav).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} className={active ? 'nav-link active' : 'nav-link'} href={item.href}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {production ? <nav className="nav-section"><Link className="nav-link active" href="/prior-auth"><span>Governed Cases</span></Link></nav> : null}
        {!production ? <>
        <div className="nav-heading">Features</div>
        <nav className="nav-section scroll">
          {featureNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} className={active ? 'nav-link active' : 'nav-link'} href={item.href}>
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        </> : null}
      </aside>
      <main className="content-shell">
        <header className="topbar">
          <div>
            {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="session-pill">{user?.email || 'Session'}<span>{user?.role || 'Prior Auth Session Active'}</span></div>
        </header>
        {children}
      </main>
    </div>
  );
}
