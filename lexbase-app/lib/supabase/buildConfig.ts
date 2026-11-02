export function assertPublicSupabaseConfig(env: Record<string, string | undefined>): void {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Production build requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
    throw new Error('Invalid public Supabase URL.');
  }
  if (key.startsWith('sb_publishable_')) return;
  try {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.role === 'anon') return;
  } catch { /* Never include credentials in build errors. */ }
  throw new Error('The browser bundle requires a public anon or publishable key, never a secret/service-role key.');
}
