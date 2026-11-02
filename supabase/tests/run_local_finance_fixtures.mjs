import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const runtime = process.argv[2];
if (!runtime) throw new Error('Pass the absolute path to a separately installed PGlite dist/index.js');
const { PGlite } = await import(pathToFileURL(runtime).href);
const db = new PGlite();
try {
  // Synthetic JWT identity only. No credentials or production data are used.
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid
    $$;
    GRANT USAGE ON SCHEMA auth TO authenticated,anon;`);
  for (const builder of ['build_client_cash_candidate.mjs','build_lifecycle_candidate.mjs']) {
    const result = spawnSync(process.execPath,[fileURLToPath(new URL(builder,import.meta.url))],{encoding:'utf8'});
    if (result.status !== 0) throw new Error(result.stderr || 'Fixture builder failed');
    const responses = await db.exec(result.stdout);
    const scenarios = responses.flatMap(response => response.rows || []).filter(row => row.scenario);
    if (!scenarios.length) throw new Error('No fixture assertions returned');
    console.log(JSON.stringify({builder,passed:scenarios.length,scenarios:scenarios.map(row=>row.scenario)}));
  }
} finally { await db.close(); }
