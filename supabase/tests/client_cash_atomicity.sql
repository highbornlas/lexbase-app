-- Run via build_client_cash_candidate.mjs, never directly against application tables.
BEGIN;
CREATE TEMP TABLE uyelikler(auth_id uuid, buro_id uuid, durum text);
CREATE TEMP TABLE muvekkillar(id text PRIMARY KEY, buro_id uuid, data jsonb);
CREATE TEMP TABLE davalar(id text PRIMARY KEY, buro_id uuid, data jsonb);
CREATE TEMP TABLE icra(LIKE davalar INCLUDING ALL);
CREATE TEMP TABLE arabuluculuk(LIKE davalar INCLUDING ALL);
CREATE TEMP TABLE ihtarnameler(LIKE davalar INCLUDING ALL);
CREATE TEMP TABLE danismanlik(LIKE davalar INCLUDING ALL);
CREATE TEMP TABLE avans_hareketleri(id text PRIMARY KEY, buro_id uuid, data jsonb,
  CONSTRAINT forced_ledger_failure CHECK (coalesce(data->>'aciklama', '') <> 'FAIL'));
CREATE TEMP TABLE results(scenario text PRIMARY KEY);
INSERT INTO uyelikler VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','aktif');
INSERT INTO muvekkillar VALUES ('client','00000000-0000-0000-0000-000000000010','{}'),
  ('other','00000000-0000-0000-0000-000000000020','{}');
INSERT INTO davalar VALUES ('case','00000000-0000-0000-0000-000000000010','{"muvId":"client","no":"fixture","unrelated":"preserve"}');
INSERT INTO icra SELECT * FROM davalar;
INSERT INTO arabuluculuk SELECT * FROM davalar;
INSERT INTO ihtarnameler SELECT * FROM davalar;
INSERT INTO avans_hareketleri VALUES ('collision','00000000-0000-0000-0000-000000000020','{"muvId":"other"}');
ALTER TABLE davalar ENABLE ROW LEVEL SECURITY;
ALTER TABLE avans_hareketleri ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_case_access ON davalar TO authenticated
  USING (buro_id = '00000000-0000-0000-0000-000000000010')
  WITH CHECK (buro_id = '00000000-0000-0000-0000-000000000010');
CREATE POLICY fixture_cash_access ON avans_hareketleri TO authenticated
  USING (buro_id = '00000000-0000-0000-0000-000000000010')
  WITH CHECK (buro_id = '00000000-0000-0000-0000-000000000010');
DO $grant$ BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated, anon', pg_my_temp_schema()::regnamespace::text);
END; $grant$;
GRANT SELECT, INSERT, UPDATE, DELETE ON uyelikler, muvekkillar, davalar, icra, arabuluculuk, ihtarnameler, danismanlik, avans_hareketleri, results TO authenticated;
-- CANDIDATE HERE
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
  b uuid := '00000000-0000-0000-0000-000000000010';
  e jsonb := '{"id":"expense","kat":"Posta","acik":"fixture","tarih":"2026-10-14","tutar":1500,"masrafSahibi":"muvekkil"}';
  before_case jsonb;
  cash jsonb;
  edited jsonb;
  t text;
BEGIN
  PERFORM pg_temp.finans_kasa_islemi(b,'kaydet',e,'dosya','Dava','case');
  ASSERT (SELECT data->'harcamalar'->0 = e FROM pg_temp.davalar WHERE id='case');
  ASSERT (SELECT (data->>'tutar')::numeric = 1500 FROM pg_temp.avans_hareketleri WHERE id='expense');
  ASSERT (SELECT data->>'unrelated' = 'preserve' FROM pg_temp.davalar WHERE id='case');
  INSERT INTO pg_temp.results VALUES ('case create mirrors cash and preserves unrelated fields');

  edited := e || '{"tutar":1600}'::jsonb;
  PERFORM pg_temp.finans_kasa_islemi(b,'kaydet',edited,'dosya','Dava','case',e);
  ASSERT (SELECT (data->>'tutar')::numeric = 1600 FROM pg_temp.avans_hareketleri WHERE id='expense');
  INSERT INTO pg_temp.results VALUES ('case edit updates both sources');
  PERFORM pg_temp.finans_dosya_kaydet(b,'Dava','case','{"muvId":"client","unrelated":"edited","harcamalar":[]}');
  ASSERT (SELECT data->'harcamalar'->0 = edited FROM pg_temp.davalar WHERE id='case');
  ASSERT (SELECT data->>'unrelated' = 'edited' FROM pg_temp.davalar WHERE id='case');
  INSERT INTO pg_temp.results VALUES ('general case save cannot erase current expenses');
  BEGIN
    PERFORM pg_temp.finans_dosya_kaydet(b,'Dava','case','{"muvId":"other"}');
    RAISE EXCEPTION 'expense client reassigned';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  INSERT INTO pg_temp.results VALUES ('expense client cannot be reassigned silently');
  BEGIN
    PERFORM pg_temp.finans_kasa_islemi(b,'kaydet',e,'dosya','Dava','case',e);
    RAISE EXCEPTION 'stale update accepted';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  INSERT INTO pg_temp.results VALUES ('stale expense snapshot is rejected');

  e := edited;
  edited := e || '{"masrafSahibi":"buro"}'::jsonb;
  PERFORM pg_temp.finans_kasa_islemi(b,'kaydet',edited,'dosya','Dava','case',e);
  ASSERT (SELECT data ? '_silindi' FROM pg_temp.avans_hareketleri WHERE id='expense');
  INSERT INTO pg_temp.results VALUES ('office-owned cost leaves client cash');
  PERFORM pg_temp.finans_kasa_islemi(b,'kaydet',e,'dosya','Dava','case',edited);
  ASSERT (SELECT NOT data ? '_silindi' FROM pg_temp.avans_hareketleri WHERE id='expense');
  INSERT INTO pg_temp.results VALUES ('ownership change back revives the same ledger ID');
  PERFORM pg_temp.finans_kasa_islemi(b,'sil',e,'dosya','Dava','case',e);
  ASSERT (SELECT jsonb_array_length(data->'harcamalar') = 0 FROM pg_temp.davalar WHERE id='case');
  ASSERT (SELECT data ? '_silindi' FROM pg_temp.avans_hareketleri WHERE id='expense');
  INSERT INTO pg_temp.results VALUES ('case delete removes expense and tombstones ledger');

  cash := '{"id":"cash-expense","muvId":"client","tip":"masraf","tarih":"2026-10-14","tutar":500,"dosyaTur":"Dava","dosyaId":"case","kategori":"Posta","aciklama":"cash"}';
  PERFORM pg_temp.finans_kasa_islemi(b,'kaydet',cash);
  ASSERT (SELECT data->'harcamalar'->0->>'id' = 'cash-expense' FROM pg_temp.davalar WHERE id='case');
  INSERT INTO pg_temp.results VALUES ('cash expense creates linked case expense');
  PERFORM pg_temp.finans_kasa_islemi(b,'kaydet',cash);
  ASSERT (SELECT jsonb_array_length(data->'harcamalar') = 1 FROM pg_temp.davalar WHERE id='case');
  INSERT INTO pg_temp.results VALUES ('original cash payload retry remains idempotent');
  SELECT data || jsonb_build_object('id',id) INTO cash FROM pg_temp.avans_hareketleri WHERE id='cash-expense';
  PERFORM pg_temp.finans_kasa_islemi(b,'kaydet',cash);
  ASSERT (SELECT jsonb_array_length(data->'harcamalar') = 1 FROM pg_temp.davalar WHERE id='case');
  INSERT INTO pg_temp.results VALUES ('identical cash retry does not double count');
  PERFORM pg_temp.finans_kasa_islemi(b,'sil',cash,'kasa',NULL,NULL,cash);
  ASSERT (SELECT jsonb_array_length(data->'harcamalar') = 0 FROM pg_temp.davalar WHERE id='case');
  INSERT INTO pg_temp.results VALUES ('cash delete removes linked case expense');

  SELECT data INTO before_case FROM pg_temp.davalar WHERE id='case';
  BEGIN
    PERFORM pg_temp.finans_kasa_islemi(b,'kaydet',e || '{"id":"failure","acik":"FAIL"}'::jsonb,'dosya','Dava','case');
    RAISE EXCEPTION 'forced failure accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  ASSERT (SELECT data = before_case FROM pg_temp.davalar WHERE id='case');
  ASSERT NOT EXISTS(SELECT 1 FROM pg_temp.avans_hareketleri WHERE id='failure');
  INSERT INTO pg_temp.results VALUES ('ledger failure rolls back case update');

  BEGIN
    PERFORM pg_temp.finans_kasa_islemi(b,'kaydet',e || '{"id":"collision"}'::jsonb,'dosya','Dava','case');
    RAISE EXCEPTION 'cross-office ID accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  ASSERT (SELECT data = before_case FROM pg_temp.davalar WHERE id='case');
  INSERT INTO pg_temp.results VALUES ('cross-office collision rolls back without reassignment');

  BEGIN
    PERFORM pg_temp.finans_kasa_islemi('00000000-0000-0000-0000-000000000020','kaydet',e,'dosya','Dava','case');
    RAISE EXCEPTION 'non-member accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO pg_temp.results VALUES ('non-member denied');
  FOREACH t IN ARRAY ARRAY['İcra','Arabuluculuk','İhtarname'] LOOP
    PERFORM pg_temp.finans_kasa_islemi(b,'kaydet',e || jsonb_build_object('id',t),'dosya',t,'case');
    ASSERT EXISTS(SELECT 1 FROM pg_temp.avans_hareketleri WHERE id=t AND data->>'dosyaTur'=t);
  END LOOP;
  INSERT INTO pg_temp.results VALUES ('all supported case types synchronized');

  PERFORM pg_temp.finans_kasa_islemi(b,'kaydet','{"id":"advance","muvId":"client","tip":"alim","tutar":1000,"tarih":"2026-10-14"}');
  PERFORM pg_temp.finans_kasa_islemi(b,'kaydet','{"id":"refund","muvId":"client","tip":"iade","tutar":100,"tarih":"2026-10-14"}');
  INSERT INTO pg_temp.results VALUES ('standalone advance and refund supported');
  BEGIN
    PERFORM pg_temp.finans_kasa_islemi(b,'kaydet','{"id":"wrong-client","muvId":"other","tip":"masraf","tutar":100,"tarih":"2026-10-14","dosyaId":"case","dosyaTur":"Dava"}');
    RAISE EXCEPTION 'wrong client accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  INSERT INTO pg_temp.results VALUES ('case/client mismatch rejected');
  PERFORM pg_temp.finans_dosya_kaydet(b,'Dava','new-case','{"muvId":"client","no":"new"}');
  ASSERT EXISTS(SELECT 1 FROM pg_temp.davalar WHERE id='new-case');
  BEGIN
    PERFORM pg_temp.finans_dosya_kaydet(b,'Dava','bulk-case',jsonb_build_object('muvId','client','harcamalar',jsonb_build_array(e)));
    RAISE EXCEPTION 'unsynchronized bulk costs accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  INSERT INTO pg_temp.results VALUES ('new case supported but bulk expenses require atomic path');
  BEGIN
    PERFORM pg_temp.finans_kasa_islemi(b,'kaydet',e || '{"id":"invalid","tutar":-1}'::jsonb,'dosya','Dava','case');
    RAISE EXCEPTION 'negative amount accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM pg_temp.finans_kasa_islemi(b,'kaydet',e || '{"id":"invalid","tarih":"2026-02-30"}'::jsonb,'dosya','Dava','case');
    RAISE EXCEPTION 'invalid date accepted';
  EXCEPTION WHEN datetime_field_overflow THEN NULL; END;
  INSERT INTO pg_temp.results VALUES ('invalid amounts and dates rejected');
  SELECT data INTO before_case FROM pg_temp.davalar WHERE id='case';
  PERFORM pg_temp.kayit_durum_islemi(b,'davalar','case','arsivle');
  ASSERT (SELECT data - '_arsivlendi' = before_case FROM pg_temp.davalar WHERE id='case');
  SELECT data INTO edited FROM pg_temp.davalar WHERE id='case';
  PERFORM pg_temp.kayit_durum_islemi(b,'davalar','case','arsivle');
  ASSERT (SELECT data = edited FROM pg_temp.davalar WHERE id='case');
  INSERT INTO pg_temp.results VALUES ('archive preserves current finances and repeated timestamp');
  PERFORM pg_temp.kayit_durum_islemi(b,'davalar','case','arsivden_cikar');
  ASSERT (SELECT data = before_case FROM pg_temp.davalar WHERE id='case');
  PERFORM pg_temp.kayit_durum_islemi(b,'davalar','case','sil');
  ASSERT (SELECT data - '_silindi' = before_case FROM pg_temp.davalar WHERE id='case');
  PERFORM pg_temp.kayit_durum_islemi(b,'davalar','case','geri_yukle');
  ASSERT (SELECT data = before_case FROM pg_temp.davalar WHERE id='case');
  INSERT INTO pg_temp.results VALUES ('restore removes only requested flag and retains latest expenses');
  PERFORM pg_temp.kayit_durum_islemi(b,'davalar','case','sil');
  BEGIN
    PERFORM pg_temp.kayit_durum_islemi(b,'davalar','case','kalici_sil');
    RAISE EXCEPTION 'financial history deleted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  ASSERT EXISTS(SELECT 1 FROM pg_temp.davalar WHERE id='case');
  INSERT INTO pg_temp.results VALUES ('cash-linked case history cannot be permanently deleted');
  BEGIN
    PERFORM pg_temp.kayit_durum_islemi(b,'muvekkillar','client','sil');
    PERFORM pg_temp.kayit_durum_islemi(b,'muvekkillar','client','kalici_sil');
    RAISE EXCEPTION 'linked client deleted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO pg_temp.results VALUES ('client with case or cash history cannot be permanently deleted');
  PERFORM pg_temp.kayit_durum_islemi(b,'davalar','new-case','sil');
  PERFORM pg_temp.kayit_durum_islemi(b,'davalar','new-case','kalici_sil');
  ASSERT NOT EXISTS(SELECT 1 FROM pg_temp.davalar WHERE id='new-case');
  INSERT INTO pg_temp.results VALUES ('nonfinancial trash record can be explicitly deleted');
  BEGIN
    PERFORM pg_temp.kayit_durum_islemi(b,'icra','case','kalici_sil');
    RAISE EXCEPTION 'active record deleted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO pg_temp.results VALUES ('active records cannot be permanently deleted');
  INSERT INTO pg_temp.danismanlik VALUES('service',b,'{"tahsilEdildi":100,"tahsilatlar":[{"tutar":100}],"odemePlani":{"toplamTutar":200}}');
  PERFORM pg_temp.kayit_durum_islemi(b,'danismanlik','service','sil');
  BEGIN
    PERFORM pg_temp.kayit_durum_islemi(b,'danismanlik','service','kalici_sil');
    RAISE EXCEPTION 'service fees deleted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  PERFORM pg_temp.kayit_durum_islemi(b,'danismanlik','service','geri_yukle');
  ASSERT (SELECT data->>'tahsilEdildi'='100' AND data ? 'odemePlani' FROM pg_temp.danismanlik WHERE id='service');
  INSERT INTO pg_temp.results VALUES ('service fees and payment plan survive lifecycle changes');
  BEGIN
    PERFORM pg_temp.kayit_durum_islemi(b,'davalar','missing','sil');
    RAISE EXCEPTION 'missing record recreated';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  BEGIN
    PERFORM pg_temp.kayit_durum_islemi('00000000-0000-0000-0000-000000000020','davalar','case','sil');
    RAISE EXCEPTION 'cross-office lifecycle accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO pg_temp.results VALUES ('missing and cross-office lifecycle requests fail closed');
END;
$test$;
RESET ROLE;
DO $test$
BEGIN
  ASSERT NOT has_function_privilege('anon','pg_temp.finans_kasa_islemi(uuid,text,jsonb,text,text,text,jsonb)','EXECUTE');
  ASSERT NOT (SELECT prosecdef FROM pg_proc WHERE oid='pg_temp.finans_kasa_islemi(uuid,text,jsonb,text,text,text,jsonb)'::regprocedure);
  ASSERT NOT has_function_privilege('anon','pg_temp.finans_dosya_kaydet(uuid,text,text,jsonb)','EXECUTE');
  ASSERT NOT (SELECT prosecdef FROM pg_proc WHERE oid='pg_temp.finans_dosya_kaydet(uuid,text,text,jsonb)'::regprocedure);
  ASSERT NOT has_function_privilege('anon','pg_temp.kayit_durum_islemi(uuid,text,text,text)','EXECUTE');
  ASSERT NOT (SELECT prosecdef FROM pg_proc WHERE oid='pg_temp.kayit_durum_islemi(uuid,text,text,text)'::regprocedure);
  INSERT INTO pg_temp.results VALUES ('anonymous denied and invoker security preserved');
END;
$test$;
SELECT scenario FROM results ORDER BY scenario;
ROLLBACK;
