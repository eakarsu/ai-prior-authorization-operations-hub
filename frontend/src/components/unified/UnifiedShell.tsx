'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  ClipboardPlus,
  Command,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

type UnifiedShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
};

type SidebarLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

const workspaceNav: SidebarLink[] = [
  { label: 'Operations Overview', href: '/prior-auth?view=overview', icon: LayoutDashboard },
  { label: 'Authorization Intake', href: '/prior-auth?view=intake', icon: ClipboardPlus },
  { label: 'Case Queue', href: '/prior-auth?view=case-queue', icon: ListChecks },
  { label: 'Case Command Center', href: '/prior-auth?view=case-command', icon: Command },
  { label: 'Outcome Analytics', href: '/prior-auth?view=learning', icon: BarChart3 },
];

function viewFromHref(href: string) {
  return new URL(href, 'http://localhost').searchParams.get('view');
}

export default function UnifiedShell({ children, title, subtitle, eyebrow }: UnifiedShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeView = searchParams.get('view') || 'overview';

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [sidebarOpen]);

  const isActive = (item: SidebarLink) => {
    const view = viewFromHref(item.href);
    if (view) return pathname === '/prior-auth' && activeView === view;
    return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');
  };

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  const renderLinks = (items: SidebarLink[]) => items.map((item) => {
    const Icon = item.icon;
    const active = isActive(item);
    return (
      <Link
        key={item.href}
        className={active ? 'nav-link active' : 'nav-link'}
        href={item.href}
        aria-current={active ? 'page' : undefined}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{item.label}</span>
      </Link>
    );
  });

  return (
    <div className="app-shell">
      <button
        type="button"
        className={sidebarOpen ? 'sidebar-overlay visible' : 'sidebar-overlay'}
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={sidebarOpen ? 'sidebar app-sidebar open' : 'sidebar app-sidebar'} aria-label="Application navigation">
        <div className="sidebar-header">
          <Link className="brand-block" href="/prior-auth?view=overview" aria-label="Prior Auth Operations home">
            <div className="brand-mark">PA</div>
            <div>
              <div className="brand-kicker">Clinical operations</div>
              <h1>Prior Auth Hub</h1>
            </div>
          </Link>
          <button type="button" className="sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="sidebar-nav-scroll">
          <div className="nav-heading">Authorization operations</div>
          <nav className="nav-section" aria-label="Authorization workspace">
            {renderLinks(workspaceNav)}
          </nav>
        </div>

        <div className="sidebar-account">
          <div className="account-avatar" aria-hidden="true">{user?.email?.slice(0, 1).toUpperCase() || 'U'}</div>
          <div className="account-details">
            <strong>{user?.email || 'Secure session'}</strong>
            <span>{user?.role ? `${user.role} access` : 'Authenticated'}</span>
          </div>
          <button type="button" className="sidebar-logout" onClick={signOut} aria-label="Sign out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main className="content-shell">
        <header className="topbar">
          <button type="button" className="sidebar-toggle" aria-label="Open navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>
            <Menu size={21} aria-hidden="true" />
          </button>
          <div className="topbar-copy">
            {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="secure-session"><ShieldCheck size={17} aria-hidden="true" /><span>Governed session</span></div>
        </header>
        {children}
      </main>
    </div>
  );
}
