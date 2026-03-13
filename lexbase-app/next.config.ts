import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cloudflare Pages uyumluluğu için
  // @cloudflare/next-on-pages ile edge runtime
  // output: 'export', // Capacitor için static export (Faz 6'da aktif edilecek)
};

export default nextConfig;
