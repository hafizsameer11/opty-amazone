import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Admin app auth is Bearer-token based (localStorage + axios); see AuthContext and api-client.
 * Route protection is handled client-side in AdminLayout + API 401 redirect — do not gate here
 * with cookies (token is not available to Edge middleware).
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
