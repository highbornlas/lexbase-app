import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const runtime=process.argv[2];
if(!runtime) throw new Error('Pass the separately installed PGlite dist/index.js path');
const {PGlite}=await import(pathToFileURL(runtime).href);
const db=new PGlite();
const passed=[];
const office='10000000-0000-0000-0000-000000000001';
const otherOffice='10000000-0000-0000-0000-000000000002';
const member='20000000-0000-0000-0000-000000000001';
const manager='20000000-0000-0000-0000-000000000002';
const otherManager='20000000-0000-0000-0000-000000000003';
const outsider='20000000-0000-0000-0000-000000000004';
const inactive='20000000-0000-0000-0000-000000000005';
const id='30000000-0000-0000-0000-000000000001';
const failId='30000000-0000-0000-0000-000000000002';
const payload={modul:'finans',islem_tipi:'masraf_ekle',hedef_tablo:'davalar',veri:{tutar:500}};
const security=await readFile(new URL('../migrations/20261014140314_membership_service_policy_scope.sql',import.meta.url),'utf8');
const candidate=await readFile(new URL('../migrations/20261014141003_atomic_approval_request_notifications.sql',import.meta.url),'utf8');
function literal(value){return `'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`;}
function rpc(request=id,data=payload,buro=office){return `SELECT public.onay_talebi_olustur('${buro}','${request}',${literal(data)}) AS result`;}
async function identity(role,uid=''){
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${uid}',false); SET ROLE ${role}`);
}
async function equal(name,sql,expected){
  const {rows}=await db.query(sql);
  if(Object.values(rows[0])[0]!==expected) throw new Error(name);
  passed.push(name);
}
async function rejected(name,sql,code){
  try{await db.exec(sql);}catch(error){if(error.code!==code)throw error;passed.push(name);return;}
  throw new Error(`${name}: unexpectedly succeeded`);
}
try{
  // Minimal production-shaped tables and policies; synthetic identities only.
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    CREATE TABLE public.uyelikler(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),auth_id uuid NOT NULL,
      buro_id uuid NOT NULL,rol text NOT NULL,durum text NOT NULL,created_at timestamptz DEFAULT now());
    CREATE FUNCTION public.get_user_buro_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
      SELECT buro_id FROM uyelikler WHERE auth_id=auth.uid() AND durum='aktif' ORDER BY created_at LIMIT 1 $$;
    CREATE FUNCTION public.get_managed_buro_ids() RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
      SELECT buro_id FROM uyelikler WHERE auth_id=auth.uid() AND durum='aktif' AND rol IN('sahip','yonetici') $$;
    ALTER TABLE public.uyelikler ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON public.uyelikler TO anon,authenticated,service_role;
    CREATE POLICY service_role_full_access ON public.uyelikler FOR ALL USING(true) WITH CHECK(true);
    CREATE POLICY kullanici_kendi_uyelikleri ON public.uyelikler FOR SELECT USING(auth.uid()=auth_id);
    CREATE POLICY buro_yonetici_uyelik_yonetimi ON public.uyelikler FOR ALL USING(buro_id IN(SELECT get_managed_buro_ids()));
    INSERT INTO public.uyelikler(auth_id,buro_id,rol,durum) VALUES
      ('${member}','${office}','avukat','aktif'),('${manager}','${office}','yonetici','aktif'),
      ('${manager}','${office}','yonetici','aktif'),('${otherManager}','${otherOffice}','sahip','aktif'),
      ('${inactive}','${office}','yonetici','pasif');
    CREATE TABLE public.onay_kuyrugu(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),buro_id uuid NOT NULL,
      talep_eden_auth_id uuid NOT NULL,talep_tarihi timestamptz DEFAULT now(),modul text NOT NULL,
      islem_tipi text NOT NULL,hedef_tablo text NOT NULL,hedef_kayit_id uuid,veri jsonb NOT NULL DEFAULT '{}',
      aciklama text,ekler text[] DEFAULT '{}',durum text NOT NULL DEFAULT 'beklemede',
      onaylayan_auth_id uuid,onay_tarihi timestamptz,red_nedeni text,tutar numeric,created_at timestamptz DEFAULT now());
    ALTER TABLE public.onay_kuyrugu ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT,UPDATE ON public.onay_kuyrugu TO authenticated;
    CREATE POLICY onay_select ON public.onay_kuyrugu FOR SELECT USING(buro_id=public.get_user_buro_id());
    CREATE POLICY onay_insert ON public.onay_kuyrugu FOR INSERT WITH CHECK(buro_id=public.get_user_buro_id());
    CREATE POLICY onay_update ON public.onay_kuyrugu FOR UPDATE USING(buro_id=public.get_user_buro_id());
    CREATE TABLE public.bildirimler(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,buro_id uuid NOT NULL,
      tip text NOT NULL DEFAULT 'sistem',baslik text NOT NULL,mesaj text,link text,okundu boolean DEFAULT false,
      olusturma timestamptz DEFAULT now(),hedef_auth_id uuid,ilgili_id text,ilgili_tur text);
    ALTER TABLE public.bildirimler ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT ON public.bildirimler TO authenticated;
    CREATE POLICY fixture_personal_read ON public.bildirimler FOR SELECT USING(hedef_auth_id=auth.uid());`);
  await rejected('notification migration requires corrected membership policy',candidate,'P0001');
  await db.exec(security);
  await db.exec('ALTER TABLE public.uyelikler DISABLE ROW LEVEL SECURITY');
  await rejected('notification migration rejects disabled membership RLS',candidate,'P0001');
  await db.exec('ALTER TABLE public.uyelikler ENABLE ROW LEVEL SECURITY');
  await db.exec(candidate);
  await db.exec(candidate);
  passed.push('notification migration is idempotent');
  await identity('anon');
  await rejected('anonymous request RPC denied',rpc(),'42501');
  await identity('authenticated',outsider);
  await rejected('nonmember request denied',rpc(),'42501');
  await identity('authenticated',inactive);
  await rejected('inactive membership denied',rpc(),'42501');
  await identity('authenticated',member);
  await equal('ordinary member cannot read manager membership',`SELECT count(*)::int FROM public.uyelikler WHERE rol IN('sahip','yonetici')`,0);
  const first=(await db.query(rpc())).rows[0].result;
  if(first.id!==id||first.bildirim_sayisi!==1)throw new Error('Notification result mismatch');
  passed.push('request delivers exactly once to same-bureau active manager');
  await equal('delivery works with stricter fixture recipient-only notification reads',`SELECT count(*)::int FROM public.bildirimler`,0);
  await rejected('fixture denies direct notification writes while private delivery works',`INSERT INTO public.bildirimler(buro_id,hedef_auth_id,baslik) VALUES('${office}','${manager}','spoofed')`,'42501');
  await rejected('request cannot be created in foreign bureau',rpc(failId,payload,otherOffice),'42501');
  await rejected('client cannot spoof requester',rpc(failId,{...payload,talep_eden_auth_id:manager}),'22023');
  await rejected('client cannot submit preapproved status',rpc(failId,{...payload,durum:'onaylandi'}),'22023');
  await rejected('invalid monetary amount denied',rpc(failId,{...payload,tutar:1.001}),'22023');
  await rejected('invalid module denied',rpc(failId,{...payload,modul:'admin'}),'22023');
  await rejected('nonobject request data denied',rpc(failId,{...payload,veri:[]}),'22023');
  const retry=(await db.query(rpc())).rows[0].result;
  if(retry.bildirim_sayisi!==0)throw new Error('Retry duplicated notifications');
  passed.push('stable request retry does not duplicate notification');
  await equal('stable request retry does not duplicate queue row','SELECT count(*)::int FROM public.onay_kuyrugu',1);
  await rejected('same request id cannot replace payload',rpc(id,{...payload,veri:{tutar:600}}),'40001');
  await identity('authenticated',manager);
  await equal('manager receives linked persisted notification',`SELECT count(*)::int FROM public.bildirimler WHERE ilgili_id='${id}' AND ilgili_tur='onay_talebi'`,1);
  await rejected('private delivery cannot use another requester identity',`SELECT lexbase_private.onay_talebi_bildir('${id}')`,'42501');
  const own=(await db.query(rpc(failId))).rows[0].result;
  if(own.bildirim_sayisi!==0)throw new Error('Manager notified self');
  passed.push('requester excluded from manager recipients');
  await identity('service_role');
  // Read totals as table owner because service_role is intentionally not a fixture table grantee.
  await db.exec('RESET ROLE');
  await equal('inactive or foreign managers were not notified','SELECT count(*)::int FROM public.bildirimler',1);
  await db.exec(`UPDATE public.onay_kuyrugu SET durum='onaylandi' WHERE id='${id}'`);
  await identity('authenticated',member);
  const done=(await db.query(rpc())).rows[0].result;
  if(done.bildirim_sayisi!==0)throw new Error('Processed request notified again');
  passed.push('processed request retry does not reopen request');
  await db.exec('RESET ROLE');
  await db.exec(`CREATE FUNCTION public.fixture_delivery_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated delivery failure'; END $$;
    CREATE TRIGGER fixture_delivery_failure BEFORE INSERT ON public.bildirimler
    FOR EACH ROW EXECUTE FUNCTION public.fixture_delivery_failure();`);
  await identity('authenticated',member);
  const rollbackId='30000000-0000-0000-0000-000000000003';
  await rejected('notification failure rolls back whole RPC',rpc(rollbackId),'P0001');
  await equal('failed delivery leaves no request',`SELECT count(*)::int FROM public.onay_kuyrugu WHERE id='${rollbackId}'`,0);
  await db.exec('RESET ROLE; DROP TRIGGER fixture_delivery_failure ON public.bildirimler');
  await identity('authenticated',member);
  await db.exec(rpc(rollbackId));
  passed.push('retry after failed delivery saves successfully');
  await db.exec('RESET ROLE');
  await equal('public RPC preserves caller RLS',`SELECT NOT prosecdef FROM pg_proc WHERE oid='public.onay_talebi_olustur(uuid,uuid,jsonb)'::regprocedure`,true);
  await equal('private delivery has empty search path',`SELECT proconfig=ARRAY['search_path=""'] FROM pg_proc WHERE oid='lexbase_private.onay_talebi_bildir(uuid)'::regprocedure`,true);
  await equal('anonymous cannot execute private delivery',`SELECT has_function_privilege('anon','lexbase_private.onay_talebi_bildir(uuid)','EXECUTE')`,false);
  await identity('authenticated',otherManager);
  await rejected('foreign request id collision cannot replace existing row',rpc(id,payload,otherOffice),'23505');
  await db.exec('RESET ROLE');
  await equal('foreign collision leaves original request bureau intact',`SELECT buro_id::text FROM public.onay_kuyrugu WHERE id='${id}'`,office);
  await db.exec(`UPDATE public.uyelikler SET durum='pasif' WHERE auth_id='${member}'`);
  await identity('authenticated',member);
  await rejected('revoked membership cannot call privileged delivery',`SELECT lexbase_private.onay_talebi_bildir('${id}')`,'42501');
  console.log(JSON.stringify({passed:passed.length,scenarios:passed},null,2));
}finally{await db.close();}
