import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Allow access to test pages without any restrictions
  if (path.startsWith('/test/')) {
    // Ensure we're not redirecting test pages
    return NextResponse.next();
  }

  // For all other pages, continue with normal flow
  return NextResponse.next();
}

// Update the matcher to be more specific about test pages
export const config = {
  matcher: [
    // Match test pages
    '/test/:path*',
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 