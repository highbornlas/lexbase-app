import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const runtime = process.argv[2];
if (!runtime) throw new Error('Pass the separately installed PGlite dist/index.js path');
const {PGlite} = await import(pathToFileURL(runtime).href);
const db = new PGlite();
const baseline = JSON.parse(await readFile(new URL('legacy_expense_triggers_baseline.json',import.meta.url),'utf8'));
const migration = await readFile(new URL('../migrations/20261015164303_legacy_expense_projection_ownership.sql',import.meta.url),'utf8');
const cashMigration = await readFile(new URL('../migrations/20261014102055_client_cash_expense_atomicity.sql',import.meta.url),'utf8');
const bureau='10000000-0000-0000-0000-000000000001';
const actor='20000000-0000-0000-0000-000000000001';
const expense={id:'expense',tutar:1500,tarih:'2026-10-15',kat:'Posta',acik:'',masrafSahibi:'muvekkil'};
const passed=[];
async function check(name,sql,expected){
  const {rows}=await db.query(sql);
  assert.equal(Object.values(rows[0])[0],expected,name);
  passed.push(name);
}
async function setData(table,data){
  await db.query(`UPDATE public.${table} SET data=$1 WHERE id='fixture'`,[data]);
}
async function cash(action,payload,expected=null){
  await db.query(`SELECT public.finans_kasa_islemi($1,$2,$3,'dosya','İcra','fixture',$4)`,
    [bureau,action,payload,expected]);
}
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT '${actor}'::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE TABLE public.uyelikler(auth_id uuid,buro_id uuid,durum text);
    INSERT INTO public.uyelikler VALUES('${actor}','${bureau}','aktif');
    CREATE TABLE public.muvekkillar(id text PRIMARY KEY,buro_id uuid,data jsonb);
    INSERT INTO public.muvekkillar VALUES('client','${bureau}','{}');
    CREATE TABLE public.icra(id text PRIMARY KEY,buro_id uuid,data jsonb);
    CREATE TABLE public.davalar(LIKE public.icra INCLUDING ALL);
    CREATE TABLE public.ihtarnameler(LIKE public.icra INCLUDING ALL);
    CREATE TABLE public.arabuluculuk(LIKE public.icra INCLUDING ALL);
    CREATE TABLE public.avanslar(LIKE public.icra INCLUDING ALL);
    CREATE TABLE public.avans_hareketleri(LIKE public.icra INCLUDING ALL);
    ALTER TABLE public.avans_hareketleri ADD CONSTRAINT forced_cash_failure
      CHECK(data->>'aciklama' IS DISTINCT FROM 'FAIL');
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;`);
  for (const fn of baseline.functions) await db.exec(fn.definition);
  await db.exec(`CREATE TRIGGER trg_icra_harcama AFTER INSERT OR UPDATE ON public.icra
    FOR EACH ROW EXECUTE FUNCTION public.auto_icra_harcama_sync();
    CREATE TRIGGER trg_ihtar_masraf AFTER INSERT OR UPDATE ON public.ihtarnameler
    FOR EACH ROW EXECUTE FUNCTION public.auto_ihtar_masraf();
    INSERT INTO public.icra VALUES('fixture','${bureau}','{"muvId":"client","no":"CODEX TEST"}');
    INSERT INTO public.ihtarnameler VALUES('fixture','${bureau}','{"muvId":"client"}');`);
  await setData('icra',{muvId:'client',harcamalar:[{...expense,masrafSahibi:'buro'}]});
  await check('baseline wrongly projects office cost into client advances',"SELECT count(*)::int FROM public.avanslar WHERE data->>'_icraId'='fixture'",1);
  await setData('ihtarnameler',{muvId:'client',masrafTutar:200,masrafYansit:true});
  await setData('ihtarnameler',{muvId:'client',masrafTutar:0,masrafYansit:false});
  await check('baseline retains cancelled notice cost',"SELECT count(*)::int FROM public.avanslar WHERE data->>'_ihtarId'='fixture'",1);
  await db.exec(migration);
  await db.exec(migration);
  passed.push('exact captured sources accepted and candidate is idempotent');
  await check('applying migration does not rewrite historical projections','SELECT count(*)::int FROM public.avanslar',2);
  await db.exec(cashMigration);
  await setData('icra',{muvId:'client',harcamalar:[]});
  await db.exec('SET ROLE authenticated');
  await cash('kaydet',expense);
  await check('atomic client cost writes exactly one cash row with real projection trigger',"SELECT count(*)::int FROM public.avans_hareketleri WHERE id='expense' AND (data->>'tutar')::numeric=1500",1);
  await check('legacy projection remains a single client cost, not a second cash movement',"SELECT count(*)::int FROM public.avanslar WHERE data->>'_icraId'='fixture' AND (data->>'tutar')::numeric=1500",1);
  const office={...expense,masrafSahibi:'buro'};
  await cash('kaydet',office,expense);
  await check('office ownership removes the client legacy projection',"SELECT count(*)::int FROM public.avanslar WHERE data->>'_icraId'='fixture'",0);
  await check('office ownership tombstones the original client cash ID',"SELECT data ? '_silindi' FROM public.avans_hareketleri WHERE id='expense'",true);
  await cash('kaydet',expense,office);
  await check('returning cost to client revives one cash ID',"SELECT count(*)::int FROM public.avans_hareketleri WHERE id='expense' AND NOT data ? '_silindi'",1);
  await check('returning cost to client regenerates one legacy projection',"SELECT count(*)::int FROM public.avanslar WHERE data->>'_icraId'='fixture'",1);
  try {
    await cash('kaydet',{...expense,id:'failure',acik:'FAIL'});
    assert.fail('forced cash constraint accepted');
  } catch(error) { assert.equal(error.code,'23514'); }
  await check('cash failure rolls back trigger-side projection changes',"SELECT count(*)::int FROM public.avanslar WHERE data->>'_icraId'='fixture'",1);
  await check('cash failure rolls back original expense array',"SELECT jsonb_array_length(data->'harcamalar') FROM public.icra WHERE id='fixture'",1);
  await cash('sil',expense,expense);
  await check('atomic deletion removes projection together with expense',"SELECT count(*)::int FROM public.avanslar WHERE data->>'_icraId'='fixture'",0);
  await setData('ihtarnameler',{muvId:'client',masrafTutar:250,masrafYansit:true});
  await db.exec(`UPDATE public.avanslar SET data=data || '{"durum":"Odendi"}' WHERE data->>'_ihtarId'='fixture'`);
  const before=await db.query("SELECT id FROM public.avanslar WHERE data->>'_ihtarId'='fixture'");
  await setData('ihtarnameler',{muvId:'client',masrafTutar:250,masrafYansit:true,konu:'Unrelated edit'});
  const after=await db.query("SELECT id FROM public.avanslar WHERE data->>'_ihtarId'='fixture'");
  assert.equal(after.rows[0].id,before.rows[0].id);
  passed.push('unrelated notice update preserves projection ID');
  await check('unrelated notice update preserves payment status',"SELECT data->>'durum' FROM public.avanslar WHERE data->>'_ihtarId'='fixture'",'Odendi');
  await setData('ihtarnameler',{muvId:'client',masrafTutar:250,masrafYansit:false});
  await check('disabling client reimbursement removes cancelled notice projection',"SELECT count(*)::int FROM public.avanslar WHERE data->>'_ihtarId'='fixture'",0);
  await setData('ihtarnameler',{muvId:'client',masrafTutar:300,masrafYansit:true});
  await setData('ihtarnameler',{muvId:'client',masrafTutar:0,masrafYansit:true});
  await check('zero notice cost clears prior projection',"SELECT count(*)::int FROM public.avanslar WHERE data->>'_ihtarId'='fixture'",0);
  await db.exec(`INSERT INTO public.avanslar VALUES('manual','${bureau}','{"tur":"Masraf","tutar":123}')`);
  await setData('icra',{muvId:'client',harcamalar:[expense]});
  await setData('icra',{muvId:'',harcamalar:[expense]});
  await check('unlinked enforcement case cannot project debt to missing client',"SELECT count(*)::int FROM public.avanslar WHERE data->>'_icraId'='fixture'",0);
  await check('unlinked manual advance remains untouched',"SELECT count(*)::int FROM public.avanslar WHERE id='manual'",1);
  await db.exec('RESET ROLE');
  await check('legacy trigger has fixed empty search path',"SELECT proconfig=ARRAY['search_path=\"\"'] FROM pg_proc WHERE oid='public.auto_icra_harcama_sync()'::regprocedure",true);
  await db.exec("CREATE OR REPLACE FUNCTION public.auto_ihtar_masraf() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$");
  try { await db.exec(migration); assert.fail('source drift accepted'); }
  catch(error) { assert.equal(error.code,'P0001'); passed.push('unreviewed trigger source drift rejected'); }
  console.log(JSON.stringify({passed:passed.length,scenarios:passed},null,2));
} finally { await db.close(); }
