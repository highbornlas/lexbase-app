import { type NextRequest, NextResponse } from 'next/server';

// Cloudflare Workers free plan CPU limiti nedeniyle
// auth kontrolü client-side AuthGuard ile yapılır.
// Middleware sadece auth callback için session token refresh yapar.
export async function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/auth/callback'],
};
