import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DASHBOARD_PATH = '/sales/dashboard';

const PUBLIC_PATH_PREFIXES = [
  '/api/auth/login',
  '/_next',
  '/favicon.ico',
  '/public',
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get('app_session');
  const isLoggedIn = !!sessionCookie?.value;

  // Allow static assets and auth API
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Root: decide between dashboard and login based on session
  if (pathname === '/' || pathname === '') {
    const url = new URL(req.url);
    if (isLoggedIn) {
      url.pathname = DASHBOARD_PATH;
      url.search = '';
      return NextResponse.redirect(url);
    }
    url.pathname = '/login';
    url.searchParams.set('redirectTo', DASHBOARD_PATH);
    return NextResponse.redirect(url);
  }

  // Login page: if already logged in, send to dashboard
  if (pathname === '/login') {
    if (isLoggedIn) {
      const url = new URL(req.url);
      url.pathname = DASHBOARD_PATH;
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Only gate access to application pages, not other API routes (besides auth)
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // For all other app pages, require login
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};


