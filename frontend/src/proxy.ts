import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';

const productionApi = ['/api/auth/login', '/api/auth/logout', '/api/auth/me', '/api/auth/demo-credentials', '/api/governed/', '/api/ai-tools/run'];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const production = process.env.NODE_ENV === 'production';
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE)?.value);
  if (production && pathname.startsWith('/api/') && !productionApi.some((path) => pathname === path || (path.endsWith('/') && pathname.startsWith(path)))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (production && !pathname.startsWith('/api/') && !['/', '/login', '/prior-auth'].some((path) => pathname === path || (path === '/prior-auth' && pathname.startsWith('/prior-auth/')))) return NextResponse.redirect(new URL(hasSession ? '/prior-auth' : '/login', request.url));
  if ((pathname === '/login' || pathname === '/') && hasSession) return NextResponse.redirect(new URL('/prior-auth', request.url));
  if (pathname.startsWith('/prior-auth') && !hasSession) return NextResponse.redirect(new URL('/login', request.url));
  const response = NextResponse.next();
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('referrer-policy', 'no-referrer');
  response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('cache-control', 'no-store');
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
