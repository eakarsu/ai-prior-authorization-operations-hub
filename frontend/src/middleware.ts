import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';

const protectedPaths = [
  '/dashboard',
  '/prior-auth',
  '/features',
  '/production-readiness',
  '/documents',
  '/profiles',
  '/auth-intake',
  '/payer-rule-matching',
  '/evidence-checklist',
  '/packet-generation',
  '/denial-prevention',
  '/appeal-routing',
  '/peer-review-prep',
  '/sla-tracking',
  '/authorization-analytics',
  '/patient-updates',
  '/source-tables',
  '/integrations',
  '/notifications',
  '/features/ai-assistant',
  '/features/ai-tools',
];

function isProtected(pathname: string) {
  return protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  if ((pathname === '/login' || pathname === '/') && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isProtected(pathname) && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/dashboard/:path*', '/prior-auth/:path*', '/features/:path*', '/production-readiness/:path*', '/documents/:path*', '/profiles/:path*', '/auth-intake/:path*', '/payer-rule-matching/:path*', '/evidence-checklist/:path*', '/packet-generation/:path*', '/denial-prevention/:path*', '/appeal-routing/:path*', '/peer-review-prep/:path*', '/sla-tracking/:path*', '/authorization-analytics/:path*', '/patient-updates/:path*', '/source-tables/:path*', '/integrations/:path*', '/notifications/:path*'],
};
