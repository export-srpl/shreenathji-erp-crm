import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DASHBOARD_PATH = '/sales/dashboard';

// Public paths that should always be reachable without an active session.
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/request-password-reset',
  '/api/auth/reset-password',
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
  // Check if session cookie exists and has a value (actual validation happens in API routes via getAuthContext)
  // The cookie value is the session token, not a hardcoded 'valid' string
  const isLoggedIn = !!sessionCookie?.value && sessionCookie.value.length > 0;

  // Allow static assets, login/reset pages, and auth APIs
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

