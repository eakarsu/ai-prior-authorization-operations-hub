'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { featureNav, primaryNav } from '@/lib/unifiedApp';

type UnifiedShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
};

export default function UnifiedShell({ children, title, subtitle, eyebrow }: UnifiedShellProps) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">AI</div>
          <div>
            <div className="pill">Agent Ops</div>
            <h1>AI Agent Ops</h1>
          </div>
        </div>
        <nav className="nav-section">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} className={active ? 'nav-link active' : 'nav-link'} href={item.href}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="nav-heading">Features</div>
        <nav className="nav-section scroll">
          {featureNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} className={active ? 'nav-link active' : 'nav-link'} href={item.href}>
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="content-shell">
        <header className="topbar">
          <div>
            {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="session-pill">admin@ai-agent-ops.local<span>Agent Ops Session Active</span></div>
        </header>
        {children}
      </main>
    </div>
  );
}
