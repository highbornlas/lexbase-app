import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { karZararHesapla } from '../../lexbase-app/lib/finans/raporHesaplari.ts';

const runtime = process.argv[2];
if (!runtime) throw new Error('Pass the separately installed PGlite dist/index.js path');
const { PGlite } = await import(pathToFileURL(runtime).href);
const db = new PGlite();
const bureau='10000000-0000-0000-0000-000000000001';
const outsider='20000000-0000-0000-0000-000000000002';
const member='20000000-0000-0000-0000-000000000001';
const october='2026-10-15';
const otherMonth='2026-09-15';
const fee=(tutar,tarih=october,tur='akdi_vekalet',extra={})=>({tutar,tarih,tur,...extra});
const data={
  davalar:[{tahsilatlar:[fee(750),fee(120,october,'icra_vekalet'),fee(5000,october,'tahsilat'),fee(100,october,'akdi_vekalet',{_silindi:true})],
    harcamalar:[{tutar:1500,tarih:october},{tutar:200,tarih:october,masrafSahibi:'buro'},{tutar:900,tarih:october,masrafSahibi:'buro',_silindi:true}]},
    {_arsivlendi:true,tahsilatlar:[fee(200,otherMonth)]},
    {_silindi:true,tahsilatlar:[fee(99000)],harcamalar:[{tutar:9000,tarih:october,masrafSahibi:'buro'}]},
    {tahsilEdildi:123,tahsilTarih:'2025-10-15'},
    {tahsilatlar:[fee(20,'2026-02-30'),fee(30,'')]}],
  icralar:[{tahsilatlar:[fee(50,october,'hakediş'),fee(999,october,'aktarim'),fee(400,october,'iade')]}],
  danismanliklar:[{tarih:'2025-01-01',tahsilEdildi:9000,tahsilatlar:[fee(300),{tutar:100,tarih:otherMonth}]}],
  arabuluculuklar:[{tarih:october,tahsilEdildi:250,toplanti:[{tutar:90000}]}],
  ihtarnameler:[{tarih:october,tahsilEdildi:80,noterMasrafi:120},
    {tahsilatlar:[fee(40,october,'akdi_vekalet',{_silindi:true})]}],
  giderler:[{tarih:october,tutar:1000,netTutar:800,kategori:'Kira'},
    {tarih:otherMonth,tutar:50,kategori:'Teknoloji'},
    {tarih:october,tutar:500,netTutar:0,kategori:'Bedelsiz'},
    {_silindi:true,tarih:october,tutar:99000,kategori:'Kira'}],
};
const migration=await readFile(new URL('../migrations/20261015180004_profit_loss_cash_basis_parity.sql',import.meta.url),'utf8');
const baseline=JSON.parse(await readFile(new URL('./profit_loss_baseline.json',import.meta.url),'utf8'));
let passed=0;
async function report(year,month){return (await db.query('SELECT public.finans_buro_kar_zarar($1,$2,$3) AS value',[bureau,year??null,month??null])).rows[0].value;}
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated;
    CREATE TABLE public.uyelikler(auth_id uuid,buro_id uuid,durum text);
    INSERT INTO public.uyelikler VALUES('${member}','${bureau}','aktif');
    SELECT set_config('request.jwt.claims','{"role":"service_role"}',false);`);
  for(const table of ['davalar','icra','danismanlik','arabuluculuk','ihtarnameler','buro_giderleri'])
    await db.exec(`CREATE TABLE public.${table}(id text,buro_id uuid,data jsonb);`);
  await db.exec(baseline.definition);
  for(const [key,table] of Object.entries({davalar:'davalar',icralar:'icra',danismanliklar:'danismanlik',arabuluculuklar:'arabuluculuk',ihtarnameler:'ihtarnameler',giderler:'buro_giderleri'}))
    for(const [index,record] of data[key].entries()) await db.query(`INSERT INTO public.${table} VALUES($1,$2,$3)`,[String(index),bureau,record]);
  await db.exec(migration);
  await db.exec(migration);
  passed+=2;
  for(const [year,month] of [[undefined,undefined],[2026,undefined],[2026,10],[2026,9],[2025,10],[2026,2],[2026,13],[undefined,10],[0,undefined]]){
    assert.deepEqual(await report(year,month),karZararHesapla(data,year,month),`UI/SQL parity for ${year}/${month}`);
    passed++;
  }
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"${member}"}',false);`);
  assert.equal((await report(2026,10)).gelirler.toplam,karZararHesapla(data,2026,10).gelirler.toplam); passed++;
  await db.exec(`SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"${outsider}"}',false);`);
  await assert.rejects(()=>report(2026,10),error=>error.code==='42501'); passed++;
  await db.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(()=>report(2026,10),error=>error.code==='42501'); passed++;
  await db.exec('RESET ROLE');
  assert.equal((await db.query("SELECT has_function_privilege('authenticated','lexbase_security.finance_amount(jsonb)','EXECUTE') AS allowed")).rows[0].allowed,false); passed++;
  await db.exec(`CREATE OR REPLACE FUNCTION public.finans_buro_kar_zarar(p_buro_id uuid,p_yil integer DEFAULT NULL,p_ay integer DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;`);
  await assert.rejects(()=>db.exec(migration),error=>error.message.includes('Unreviewed profit/loss')); passed++;
  console.log(JSON.stringify({passed,period_parity_scenarios:9,office_income_excludes_client_money:true}));
} catch(error){console.error(error.message);process.exitCode=1;}
finally {await db.close();}
