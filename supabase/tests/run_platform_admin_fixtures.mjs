import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const runtime=process.argv[2];
if(!runtime)throw new Error('Pass the separately installed PGlite dist/index.js path');
const {PGlite}=await import(pathToFileURL(runtime).href);
const db=new PGlite();
const migration=await readFile(new URL('../migrations/20261014143113_platform_admin_access_hardening.sql',import.meta.url),'utf8');
const member='20000000-0000-0000-0000-000000000001';
const superAdmin='20000000-0000-0000-0000-000000000002';
const admin='20000000-0000-0000-0000-000000000003';
const outsider='20000000-0000-0000-0000-000000000004';
const anonymousTarget='20000000-0000-0000-0000-000000000005';
const newAdmin='20000000-0000-0000-0000-000000000006';
const passed=[];
async function identity(role,uid=''){
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${uid}',false); SET ROLE ${role}`);
}
async function equal(name,sql,expected){
  const {rows}=await db.query(sql);
  if(Object.values(rows[0])[0]!==expected)throw new Error(name);
  passed.push(name);
}
async function rejected(name,sql,code){
  try{await db.exec(sql);}catch(error){if(error.code!==code)throw error;passed.push(name);return;}
  throw new Error(`${name}: unexpectedly succeeded`);
}
function bootstrap(id){return `SELECT public.admin_bootstrap('${id}','fixture@example.invalid','Fixture')`;}
function insertAdmin(id,level='admin'){
  return `INSERT INTO public.platform_adminler(auth_id,ad,email,yetki_seviye) VALUES('${id}','Fixture','fixture@example.invalid','${level}')`;
}
try{
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    CREATE TABLE public.platform_adminler(auth_id uuid PRIMARY KEY,ad text NOT NULL,email text NOT NULL,
      yetki_seviye text NOT NULL DEFAULT 'admin',created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now());
    ALTER TABLE public.platform_adminler ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON public.platform_adminler TO anon,authenticated,service_role;
    INSERT INTO public.platform_adminler(auth_id,ad,email,yetki_seviye) VALUES
      ('${superAdmin}','Fixture owner','owner@example.invalid','super'),
      ('${admin}','Fixture admin','admin@example.invalid','admin');
    CREATE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
      AS $$ SELECT auth.uid() IS NOT NULL; $$;
    CREATE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
      SELECT EXISTS(SELECT 1 FROM platform_adminler WHERE auth_id=auth.uid() AND yetki_seviye='super') $$;
    CREATE FUNCTION public.admin_bootstrap(p_auth_id uuid,p_email text,p_ad text) RETURNS void
      LANGUAGE plpgsql SECURITY DEFINER AS $$
      BEGIN
        IF EXISTS(SELECT 1 FROM platform_adminler WHERE auth_id=p_auth_id) THEN RETURN; END IF;
        IF p_auth_id!=auth.uid() THEN RAISE EXCEPTION 'Self only'; END IF;
        INSERT INTO platform_adminler(auth_id,email,ad,yetki_seviye)
        VALUES(p_auth_id,p_email,p_ad,CASE WHEN (SELECT count(*) FROM platform_adminler)=0 THEN 'super' ELSE 'admin' END);
      END $$;
    CREATE POLICY platform_adminler_select ON public.platform_adminler FOR SELECT
      USING(auth_id=auth.uid() OR EXISTS(SELECT 1 FROM public.platform_adminler WHERE auth_id=auth.uid()));
    CREATE POLICY platform_adminler_insert ON public.platform_adminler FOR INSERT
      WITH CHECK(auth_id=auth.uid() OR EXISTS(SELECT 1 FROM public.platform_adminler WHERE auth_id=auth.uid() AND yetki_seviye='super'));
    CREATE POLICY platform_adminler_update ON public.platform_adminler FOR UPDATE
      USING(EXISTS(SELECT 1 FROM public.platform_adminler WHERE auth_id=auth.uid() AND yetki_seviye='super'));
    CREATE POLICY platform_adminler_delete ON public.platform_adminler FOR DELETE
      USING(EXISTS(SELECT 1 FROM public.platform_adminler WHERE auth_id=auth.uid() AND yetki_seviye='super') AND auth_id<>auth.uid());
    CREATE TABLE public.fixture_cases(id text PRIMARY KEY,buro_id uuid NOT NULL);
    INSERT INTO public.fixture_cases VALUES('own','10000000-0000-0000-0000-000000000001'),
      ('foreign','10000000-0000-0000-0000-000000000002');
    ALTER TABLE public.fixture_cases ENABLE ROW LEVEL SECURITY;
    GRANT SELECT ON public.fixture_cases TO anon,authenticated;
    CREATE POLICY fixture_cases_admin_read ON public.fixture_cases FOR SELECT USING(public.is_platform_admin());`);
  await identity('authenticated',member);
  await equal('baseline ordinary user incorrectly recognized as platform admin','SELECT public.is_platform_admin()',true);
  await equal('baseline admin predicate exposes cross-bureau fixture rows','SELECT count(*)::int FROM public.fixture_cases',2);
  await rejected('baseline self-referential admin table policy recurses','SELECT * FROM public.platform_adminler','42P17');
  await identity('authenticated',outsider);
  await db.exec(bootstrap(outsider));
  await db.exec('RESET ROLE');
  await equal('baseline authenticated bootstrap self-provisions admin',`SELECT count(*)::int FROM public.platform_adminler WHERE auth_id='${outsider}'`,1);
  await db.exec(`DELETE FROM public.platform_adminler WHERE auth_id='${outsider}'`);
  await identity('anon');
  await db.exec(bootstrap(anonymousTarget));
  await db.exec('RESET ROLE');
  await equal('baseline null auth.uid bypasses bootstrap self check',`SELECT count(*)::int FROM public.platform_adminler WHERE auth_id='${anonymousTarget}'`,1);
  await db.exec(`DELETE FROM public.platform_adminler WHERE auth_id='${anonymousTarget}'`);
  await db.exec(migration);
  await db.exec(migration);
  passed.push('admin hardening migration applies twice');
  await equal('existing administrator records preserved','SELECT count(*)::int FROM public.platform_adminler',2);
  await identity('anon');
  await equal('anonymous platform admin predicate safely returns false','SELECT public.is_platform_admin()',false);
  await equal('anonymous admin-read policy returns no case rows','SELECT count(*)::int FROM public.fixture_cases',0);
  await rejected('anonymous bootstrap execution denied',bootstrap(anonymousTarget),'42501');
  await rejected('anonymous admin table access denied','SELECT * FROM public.platform_adminler','42501');
  await identity('authenticated',member);
  await equal('ordinary member is not platform admin','SELECT public.is_platform_admin()',false);
  await equal('ordinary member is not super admin','SELECT public.is_super_admin()',false);
  await equal('ordinary member cannot use admin policy to read cases','SELECT count(*)::int FROM public.fixture_cases',0);
  await db.exec(`RESET ROLE; CREATE POLICY fixture_cases_member_read ON public.fixture_cases FOR SELECT
    USING(auth.uid()='${member}'::uuid AND buro_id='10000000-0000-0000-0000-000000000001'::uuid)`);
  await identity('authenticated',member);
  await equal('separate tenant policy still admits legitimate own-bureau row','SELECT count(*)::int FROM public.fixture_cases',1);
  await equal('ordinary member sees no admin registry rows','SELECT count(*)::int FROM public.platform_adminler',0);
  await rejected('ordinary member bootstrap denied',bootstrap(member),'42501');
  await rejected('ordinary member cannot insert self as super admin',insertAdmin(member,'super'),'42501');
  await rejected('ordinary member cannot truncate admin table','TRUNCATE public.platform_adminler','42501');
  await identity('authenticated',admin);
  await equal('existing admin retains platform access','SELECT public.is_platform_admin()',true);
  await equal('existing admin is not super','SELECT public.is_super_admin()',false);
  await equal('existing admin registry select works without recursion','SELECT count(*)::int FROM public.platform_adminler',2);
  await db.exec(bootstrap(admin));
  passed.push('existing admin bootstrap acknowledgement remains compatible');
  await rejected('admin cannot provision another admin',insertAdmin(newAdmin),'42501');
  await equal('admin cannot promote own role',`WITH changed AS(UPDATE public.platform_adminler SET yetki_seviye='super' WHERE auth_id='${admin}' RETURNING 1) SELECT count(*)::int FROM changed`,0);
  await identity('authenticated',superAdmin);
  await equal('super administrator predicate remains true','SELECT public.is_super_admin()',true);
  await equal('super admin can read through existing admin case policy','SELECT count(*)::int FROM public.fixture_cases',2);
  await db.exec(insertAdmin(newAdmin));
  passed.push('super admin can explicitly provision another administrator');
  await db.exec(`UPDATE public.platform_adminler SET ad='Renamed fixture' WHERE auth_id='${newAdmin}'`);
  await equal('super admin can update administrator',`SELECT ad FROM public.platform_adminler WHERE auth_id='${newAdmin}'`,'Renamed fixture');
  await equal('super admin cannot delete own identity',`WITH changed AS(DELETE FROM public.platform_adminler WHERE auth_id='${superAdmin}' RETURNING 1) SELECT count(*)::int FROM changed`,0);
  await db.exec(`DELETE FROM public.platform_adminler WHERE auth_id='${newAdmin}'`);
  await equal('super admin can remove other administrator',`SELECT count(*)::int FROM public.platform_adminler WHERE auth_id='${newAdmin}'`,0);
  await rejected('bootstrap cannot acknowledge somebody else',bootstrap(admin),'42501');
  await identity('service_role');
  await db.exec(insertAdmin(newAdmin));
  passed.push('trusted server provisioning retains table access');
  await db.exec('RESET ROLE');
  await equal('public admin helper is invoker',`SELECT NOT prosecdef FROM pg_proc WHERE oid='public.is_platform_admin()'::regprocedure`,true);
  await equal('private lookup has fixed empty search path',`SELECT proconfig=ARRAY['search_path=""'] FROM pg_proc WHERE oid='lexbase_security.platform_admin_mi()'::regprocedure`,true);
  await db.exec('ALTER TABLE public.platform_adminler DISABLE ROW LEVEL SECURITY');
  await rejected('migration rejects disabled admin RLS',migration,'P0001');
  await db.exec(`ALTER TABLE public.platform_adminler ENABLE ROW LEVEL SECURITY;
    CREATE POLICY unexpected_admin_policy ON public.platform_adminler FOR SELECT USING(true)`);
  await rejected('migration rejects unexpected admin policy inventory',migration,'P0001');
  await db.exec(`DROP POLICY unexpected_admin_policy ON public.platform_adminler;
    CREATE OR REPLACE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$`);
  await rejected('migration rejects unreviewed predicate source',migration,'P0001');
  console.log(JSON.stringify({passed:passed.length,scenarios:passed},null,2));
}finally{await db.close();}
