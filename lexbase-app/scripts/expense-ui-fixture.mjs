import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { hesaplaKasaOzet } from '../lib/finans/avansKurallari.ts';
import { dosyaMasrafOzeti,dosyaParaOzeti } from '../lib/utils/finans.ts';

const runtime=process.argv[2];
if(!runtime)throw new Error('Pass the absolute path to a separately installed PGlite dist/index.js');
const {PGlite}=await import(pathToFileURL(runtime).href);
const db=new PGlite();
const root=fileURLToPath(new URL('../',import.meta.url));
const b='00000000-0000-0000-0000-000000000010';
await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO authenticated,anon;
 CREATE TABLE public.uyelikler(auth_id uuid,buro_id uuid,durum text);
 CREATE TABLE public.davalar(id text PRIMARY KEY,buro_id uuid,data jsonb);
 CREATE TABLE public.icra(LIKE public.davalar INCLUDING ALL); CREATE TABLE public.arabuluculuk(LIKE public.davalar INCLUDING ALL);
 CREATE TABLE public.ihtarnameler(LIKE public.davalar INCLUDING ALL); CREATE TABLE public.danismanlik(LIKE public.davalar INCLUDING ALL);
 CREATE TABLE public.muvekkillar(LIKE public.davalar INCLUDING ALL); CREATE TABLE public.avans_hareketleri(LIKE public.davalar INCLUDING ALL);
 GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
 INSERT INTO public.uyelikler VALUES('00000000-0000-0000-0000-000000000001','${b}','aktif');
 INSERT INTO public.muvekkillar VALUES('fixture-client','${b}','{}');
 INSERT INTO public.davalar VALUES('fixture','${b}','{"muvId":"fixture-client","harcamalar":[],"tahsilatlar":[{"tur":"akdi_vekalet","tutar":3000,"tarih":"2026-10-14"}]}');
 INSERT INTO public.avans_hareketleri VALUES('fixture-advance','${b}','{"muvId":"fixture-client","tip":"alim","tutar":1000,"tarih":"2026-10-14"}');
 ALTER TABLE public.davalar ENABLE ROW LEVEL SECURITY; ALTER TABLE public.avans_hareketleri ENABLE ROW LEVEL SECURITY;
 CREATE POLICY fixture_case_access ON public.davalar TO authenticated USING(buro_id='${b}') WITH CHECK(buro_id='${b}');
 CREATE POLICY fixture_cash_access ON public.avans_hareketleri TO authenticated USING(buro_id='${b}') WITH CHECK(buro_id='${b}');
 CREATE FUNCTION public.fixture_failure() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
   IF current_setting('lexbase.fixture_fail',true)='yes' THEN RAISE EXCEPTION 'Synthetic ledger failure' USING ERRCODE='XX000'; END IF;
   RETURN NEW; END;$$;
 CREATE TRIGGER fixture_failure BEFORE INSERT OR UPDATE ON public.avans_hareketleri FOR EACH ROW EXECUTE FUNCTION public.fixture_failure();`);
for(const file of ['20261014102055_client_cash_expense_atomicity.sql','20261014124659_atomic_record_lifecycle.sql'])
  await db.exec(readFileSync(resolve(root,'../supabase/migrations',file),'utf8'));
const bundle=await build({entryPoints:[resolve(root,'tests/ui/expenseFixtureEntry.tsx')],bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',
  define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'isolated-fixtures',setup(build){
    build.onResolve({filter:/useBuro$/},()=>({path:resolve(root,'tests/ui/fixtureBuro.ts')}));
    build.onResolve({filter:/^@\/lib\/supabase\/client$/},()=>({path:resolve(root,'tests/ui/fixtureClient.ts')}));
    build.onResolve({filter:/^@\//},args=>({path:resolve(root,args.path.slice(2)+'.ts')}));
  }}]});
let failNext=false,rpcCount=0;
let queue=Promise.resolve();
const withDb=task=>{const result=queue.then(task);queue=result.catch(()=>{});return result;};
const css='body{margin:0;background:#111318;color:#eee;font:16px Georgia}main{max-width:1000px;margin:auto;padding:30px}section,fieldset{margin:20px 0;padding:18px;border:1px solid #555;border-radius:10px}button,input,select{font:inherit;padding:9px;margin:4px;background:#252932;color:#eee;border:1px solid #666;border-radius:6px}button:disabled{opacity:.4}label{display:block;margin:10px 0}input,select{display:block}p[role=alert]{color:#ff8585}h1{color:#d1af62}.flex{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.space-y-4>*{margin-bottom:16px}';
const server=createServer(async(req,res)=>{
  const json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
  try{
    if(req.url==='/'&&req.method==='GET'){res.setHeader('Content-Type','text/html');res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><title>LexBase isolated finance fixture</title><style>${css}</style><div id="root"></div><script src="/bundle.js"></script>`);return;}
    if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
    if(req.url==='/fail-next'&&req.method==='POST'){failNext=true;json({armed:true});return;}
    if(req.url==='/state'){json(await withDb(async()=>{
      const record=(await db.query("SELECT data FROM public.davalar WHERE id='fixture'")).rows[0]?.data||{};
      const cash=(await db.query('SELECT data FROM public.avans_hareketleri')).rows.map(row=>row.data);
      const balance=hesaplaKasaOzet(cash);
      return {record,cashBalance:balance.bakiye,expenseDue:balance.masrafAlacagi,officeNet:dosyaParaOzeti(record).buroGelir-dosyaMasrafOzeti(record).buro,rpcCount,failureArmed:failNext};
    }));return;}
    if(req.url==='/rpc'&&req.method==='POST'){
      let text='';for await(const chunk of req){text+=chunk;if(text.length>100000)throw new Error('Fixture payload too large');}
      const {name,args:a}=JSON.parse(text);rpcCount++;
      const failure=failNext;failNext=false;
      await new Promise(resolve=>setTimeout(resolve,900));
      try{
        const data=await withDb(()=>db.transaction(async tx=>{
          await tx.exec(`SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);`);
          if(failure)await tx.query("SELECT set_config('lexbase.fixture_fail','yes',true)");
          let result;
          if(name==='finans_kasa_islemi')result=await tx.query('SELECT public.finans_kasa_islemi($1,$2,$3,$4,$5,$6,$7) AS value',[a.p_buro_id,a.p_islem,a.p_hareket,a.p_kaynak,a.p_dosya_tur,a.p_dosya_id,a.p_beklenen]);
          else if(name==='kayit_durum_islemi')result=await tx.query('SELECT public.kayit_durum_islemi($1,$2,$3,$4) AS value',[a.p_buro_id,a.p_tablo,a.p_id,a.p_islem]);
          else throw new Error('Unsupported fixture RPC');
          return result.rows[0].value;
        }));json({data,error:null});
      }catch(error){json({data:null,error:{code:error.code||'XX000',message:'Synthetic fixture request rejected'}});}
      return;
    }
    res.statusCode=404;res.end('Not found');
  }catch{res.statusCode=500;json({error:'Fixture unavailable'});}
});
server.listen(3917,'127.0.0.1',()=>console.log('Isolated fixture: http://127.0.0.1:3917 (synthetic data only)'));
process.on('SIGINT',()=>server.close(async()=>{await db.close();process.exit(0);}));
