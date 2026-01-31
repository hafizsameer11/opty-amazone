import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Protected routes that require authentication
  const protectedRoutes = ['/cart', '/checkout', '/account', '/orders'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  // Check if user has auth token
  const token = request.cookies.get('auth_token')?.value || 
               request.headers.get('authorization')?.replace('Bearer ', '');
  
  // For protected routes, we'll check authentication on the client side
  // This middleware just allows the request through
  // The actual auth check happens in the page component
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/cart/:path*',
    '/checkout/:path*',
    '/account/:path*',
    '/orders/:path*',
  ],
};
