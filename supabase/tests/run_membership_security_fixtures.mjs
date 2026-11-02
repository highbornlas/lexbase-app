import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const runtime = process.argv[2];
if (!runtime) throw new Error('Pass the separately installed PGlite dist/index.js path');
const { PGlite } = await import(pathToFileURL(runtime).href);
const migration = await readFile(new URL('../migrations/20261014140314_membership_service_policy_scope.sql', import.meta.url), 'utf8');
const db = new PGlite();
const passed = [];
const a = '10000000-0000-0000-0000-000000000001';
const b = '10000000-0000-0000-0000-000000000002';
const member = '20000000-0000-0000-0000-000000000001';
const manager = '20000000-0000-0000-0000-000000000002';
const outsider = '20000000-0000-0000-0000-000000000003';

async function identity(role, uid = '') {
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${uid}',false); SET ROLE ${role};`);
}
async function equals(name, sql, expected) {
  const result = await db.query(sql);
  if (Object.values(result.rows[0])[0] !== expected) throw new Error(name);
  passed.push(name);
}
async function denied(name, sql) {
  try { await db.exec(sql); } catch (error) {
    if (error.code !== '42501') throw error;
    passed.push(name);
    return;
  }
  throw new Error(`${name}: unexpectedly allowed`);
}

try {
  // Isolated database only. No production credentials, rows or network calls.
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    CREATE TABLE public.uyelikler(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      auth_id uuid NOT NULL, buro_id uuid NOT NULL, rol text NOT NULL,
      durum text NOT NULL, created_at timestamptz DEFAULT now());
    ALTER TABLE public.uyelikler ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON public.uyelikler TO anon,authenticated,service_role;
    CREATE FUNCTION public.get_managed_buro_ids() RETURNS SETOF uuid
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
      SELECT buro_id FROM uyelikler WHERE auth_id=auth.uid()
        AND rol IN ('sahip','yonetici') AND durum='aktif' $$;
    CREATE FUNCTION public.user_has_buro_access(target_buro_id uuid) RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
      SELECT EXISTS(SELECT 1 FROM uyelikler WHERE auth_id=auth.uid()
        AND buro_id=target_buro_id AND durum='aktif') $$;
    CREATE POLICY kullanici_kendi_uyelikleri ON public.uyelikler FOR SELECT USING(auth.uid()=auth_id);
    CREATE POLICY buro_yonetici_uyelik_yonetimi ON public.uyelikler FOR ALL
      USING(buro_id IN (SELECT get_managed_buro_ids()));
    CREATE POLICY service_role_full_access ON public.uyelikler FOR ALL USING(true) WITH CHECK(true);
    CREATE POLICY uyelikler_admin_select ON public.uyelikler FOR SELECT USING(false);
    INSERT INTO public.uyelikler(auth_id,buro_id,rol,durum) VALUES
      ('${member}','${a}','avukat','aktif'),('${manager}','${a}','sahip','aktif');`);

  await identity('anon');
  await equals('baseline anonymous membership disclosure reproduced', 'SELECT count(*)::int FROM public.uyelikler', 2);
  await identity('authenticated', outsider);
  await db.exec(`INSERT INTO public.uyelikler(auth_id,buro_id,rol,durum) VALUES('${outsider}','${b}','sahip','aktif')`);
  await equals('baseline forged membership grants bureau access', `SELECT public.user_has_buro_access('${b}')`, true);
  await identity('service_role');
  await db.exec(`DELETE FROM public.uyelikler WHERE auth_id='${outsider}'`);
  await db.exec('RESET ROLE');
  await db.exec(migration);
  await db.exec(migration);
  passed.push('migration applies twice without changing legitimate policies');

  await identity('anon');
  await denied('anonymous membership read denied', 'SELECT * FROM public.uyelikler');
  await denied('anonymous membership insert denied', `INSERT INTO public.uyelikler(auth_id,buro_id,rol,durum) VALUES('${outsider}','${b}','sahip','aktif')`);
  await identity('authenticated', outsider);
  await equals('outsider sees no memberships', 'SELECT count(*)::int FROM public.uyelikler', 0);
  await denied('outsider cannot forge active membership', `INSERT INTO public.uyelikler(auth_id,buro_id,rol,durum) VALUES('${outsider}','${b}','sahip','aktif')`);
  await equals('outsider has no bureau access', `SELECT public.user_has_buro_access('${b}')`, false);
  await identity('authenticated', member);
  await equals('member reads own membership', 'SELECT count(*)::int FROM public.uyelikler', 1);
  await equals('member retains legitimate finance access', `SELECT public.user_has_buro_access('${a}')`, true);
  await equals('member cannot promote self', `WITH changed AS (UPDATE public.uyelikler SET rol='sahip' WHERE auth_id='${member}' RETURNING 1) SELECT count(*)::int FROM changed`, 0);
  await equals('member cannot delete own membership', `WITH changed AS (DELETE FROM public.uyelikler WHERE auth_id='${member}' RETURNING 1) SELECT count(*)::int FROM changed`, 0);
  await denied('member cannot truncate membership table', 'TRUNCATE public.uyelikler');
  await identity('authenticated', manager);
  await equals('manager reads own bureau team', 'SELECT count(*)::int FROM public.uyelikler', 2);
  await db.exec(`INSERT INTO public.uyelikler(auth_id,buro_id,rol,durum) VALUES('${outsider}','${a}','avukat','aktif')`);
  passed.push('manager can add legitimate team member');
  await denied('manager cannot insert into another bureau', `INSERT INTO public.uyelikler(auth_id,buro_id,rol,durum) VALUES('${outsider}','${b}','sahip','aktif')`);
  await denied('manager cannot move membership into another bureau', `UPDATE public.uyelikler SET buro_id='${b}' WHERE auth_id='${outsider}'`);
  await db.exec(`UPDATE public.uyelikler SET durum='pasif' WHERE auth_id='${outsider}'`);
  passed.push('manager can deactivate team member');
  await identity('authenticated', outsider);
  await equals('inactive member loses finance access', `SELECT public.user_has_buro_access('${a}')`, false);
  await identity('service_role');
  await db.exec(`INSERT INTO public.uyelikler(auth_id,buro_id,rol,durum) VALUES('${outsider}','${b}','avukat','aktif')`);
  passed.push('server invitation can create membership');
  await db.exec('RESET ROLE; ALTER POLICY service_role_full_access ON public.uyelikler USING(false)');
  try { await db.exec(migration); throw new Error('Drift accepted'); }
  catch (error) { if (error.code !== 'P0001') throw error; passed.push('migration rejects changed policy'); }
  await db.exec('ALTER POLICY service_role_full_access ON public.uyelikler USING(true); ALTER TABLE public.uyelikler DISABLE ROW LEVEL SECURITY');
  try { await db.exec(migration); throw new Error('Disabled RLS accepted'); }
  catch (error) { if (error.code !== 'P0001') throw error; passed.push('migration rejects disabled RLS'); }
  await db.exec('ALTER TABLE public.uyelikler ENABLE ROW LEVEL SECURITY; DROP POLICY service_role_full_access ON public.uyelikler');
  try { await db.exec(migration); throw new Error('Missing policy accepted'); }
  catch (error) { if (error.code !== 'P0001') throw error; passed.push('migration rejects missing policy'); }
  console.log(JSON.stringify({passed:passed.length,scenarios:passed},null,2));
} finally { await db.close(); }
