import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicSupabaseConfig } from '../supabase/buildConfig.ts';

const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_example' };
test('production bundle requires both public Supabase settings', () => {
  assert.throws(() => assertPublicSupabaseConfig({}), /Production build requires/);
  assert.throws(() => assertPublicSupabaseConfig({ ...env, NEXT_PUBLIC_SUPABASE_ANON_KEY: '' }), /Production build requires/);
  assert.doesNotThrow(() => assertPublicSupabaseConfig(env));
});
test('production bundle rejects private keys without printing their value', () => {
  const secret = 'sb_secret_not_for_the_browser';
  assert.throws(() => assertPublicSupabaseConfig({ ...env, NEXT_PUBLIC_SUPABASE_ANON_KEY: secret }), error => !error.message.includes(secret));
  for (const role of ['anon', 'service_role']) {
    const key = `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
    if (role === 'anon') assert.doesNotThrow(() => assertPublicSupabaseConfig({ ...env, NEXT_PUBLIC_SUPABASE_ANON_KEY: key }));
    else assert.throws(() => assertPublicSupabaseConfig({ ...env, NEXT_PUBLIC_SUPABASE_ANON_KEY: key }), /never a secret/);
  }
  assert.throws(() => assertPublicSupabaseConfig({ ...env, NEXT_PUBLIC_SUPABASE_URL: 'http://remote.example' }), /Invalid public/);
});
