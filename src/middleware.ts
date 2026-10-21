import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, images, and Next.js internal files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') // Static files with extensions
  ) {
    return NextResponse.next();
  }

  // Allow auth routes, login page, and large streaming restore endpoint
  // (api/restore has its own internal admin auth check and streams up to 20+ GB without middleware body buffering)
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/api/restore'
  ) {
    return NextResponse.next();
  }

  // Check for auth_session cookie
  const sessionCookie = request.cookies.get('auth_session')?.value;

  if (!sessionCookie) {
    // If API request, respond with 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    // Otherwise redirect browser to /login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/restore (multi-gigabyte streaming restore endpoint to avoid middleware body clone limits)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/restore).*)',
  ],
};
