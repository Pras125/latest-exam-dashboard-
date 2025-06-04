import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow access to test pages without authentication
  if (request.nextUrl.pathname.startsWith("/test/")) {
    return NextResponse.next();
  }

  // For all other routes, continue with normal authentication
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Match all paths except static files and api routes
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
}; 