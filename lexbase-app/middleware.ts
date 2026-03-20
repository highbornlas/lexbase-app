import { type NextRequest, NextResponse } from 'next/server';

// Cloudflare Workers free plan CPU limiti nedeniyle
// auth kontrolü client-side AuthGuard ile yapılır.
// Middleware sadece auth callback için session token refresh yapar
// ve tüm response'lara security header ekler.
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers (next.config.ts headers() ile birlikte çalışır)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  // CSP — Cloudflare Workers inline script uyumsuzluğu nedeniyle
  // unsafe-inline gerekiyor; nonce tabanlı CSP Cloudflare edge'de desteklenmiyor.
  // Yine de script-src'yi sınırlandırıyoruz.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob: ${supabaseUrl}`,
      `connect-src 'self' ${supabaseUrl} https://*.supabase.co wss://*.supabase.co`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  return response;
}

export const config = {
  matcher: [
    // Tüm app rotalarına uygula (statik dosyalar hariç)
    '/((?!_next/static|_next/image|favicon.ico|icons/).*)',
  ],
};
