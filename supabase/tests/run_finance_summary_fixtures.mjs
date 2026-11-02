import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const runtime = process.argv[2];
if (!runtime) throw new Error('Pass the separately installed PGlite dist/index.js path');
const { PGlite } = await import(pathToFileURL(runtime).href);
const db = new PGlite();
try {
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claims',true),'')::jsonb
    $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.sub',true),''),
        current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid
    $$;
    CREATE TABLE public.uyelikler(auth_id uuid,buro_id uuid,durum text);
    GRANT USAGE ON SCHEMA auth TO authenticated,anon;`);
  await db.exec(await readFile(new URL('../rollback/finance_summary_calculation_fixes_prechange.sql', import.meta.url), 'utf8'));
  const built = spawnSync(process.execPath, [fileURLToPath(new URL('./build_finance_summary_candidate.mjs', import.meta.url))], { encoding: 'utf8' });
  if (built.status !== 0) throw new Error(built.stderr || 'Fixture builder failed');
  const results = await db.exec(built.stdout);
  const scenarios = results.flatMap(result => result.rows || []).filter(row => row.scenario);
  if (!scenarios.length) throw new Error('No summary assertions returned');
  console.log(JSON.stringify({ passed: scenarios.length, scenarios }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
