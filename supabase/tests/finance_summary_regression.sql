CREATE TEMP TABLE finance_results (scenario text PRIMARY KEY, observed numeric, expected numeric) ON COMMIT DROP;

WITH s AS (
  SELECT
    pg_temp.finans_dosya_ozet('00000000-0000-0000-0000-000000000001','dava','audit-case') AS d,
    pg_temp.finans_muvekkil_ozet('00000000-0000-0000-0000-000000000001','audit-client') AS m
)
INSERT INTO pg_temp.finance_results
SELECT 'office_income', (d->>'buroGelir')::numeric, 2800 FROM s UNION ALL
SELECT 'explicit_agreement_total', (d->'anlasma'->>'anlasilanToplam')::numeric, 5000 FROM s UNION ALL
SELECT 'client_fee_collection', (m->'alacak'->>'tahsilEdilen')::numeric, 2000 FROM s UNION ALL
SELECT 'client_fee_remaining', (m->'alacak'->>'kalan')::numeric, 3000 FROM s UNION ALL
SELECT 'statutory_fee_separate', (m->'tahsilatlar'->>'icraVekalet')::numeric, 300 FROM s UNION ALL
SELECT 'contract_fee_separate', (m->'vekaletUcreti'->'akdi'->>'tahsilEdilen')::numeric, 2000 FROM s UNION ALL
SELECT 'gross_collection_compatibility', (m->'tahsilatlar'->>'toplam')::numeric, 12800 FROM s;

INSERT INTO pg_temp.davalar VALUES
('archived','00000000-0000-0000-0000-000000000001','{"muvId":"history","_arsivlendi":"2026-10-14","ucret":300,"tahsilatlar":[{"tur":"akdi_vekalet","tutar":100}]}'),
('deleted','00000000-0000-0000-0000-000000000001','{"muvId":"history","_silindi":"2026-10-14","ucret":9000,"tahsilatlar":[{"tur":"akdi_vekalet","tutar":9000}]}'),
('legacy','00000000-0000-0000-0000-000000000001','{"muvId":"legacy","ucret":1000,"tahsilEdildi":200,"tahsil":500}'),
('percentage','00000000-0000-0000-0000-000000000001','{"muvId":"percentage","alacak":100000,"anlasma":{"tur":"tahsilat","yuzde":10}}'),
('mixed','00000000-0000-0000-0000-000000000001','{"muvId":"mixed","alacak":100000,"anlasma":{"tur":"karma","karmaP":2000,"karmaYuzde":10}}'),
('false-flag','00000000-0000-0000-0000-000000000001','{"muvId":"false-flag","_silindi":false,"ucret":100}');

INSERT INTO pg_temp.davalar VALUES
('fractional-legacy','00000000-0000-0000-0000-000000000001','{"muvId":"fractional-legacy","ucret":100.234}'),
('typeless-agreement','00000000-0000-0000-0000-000000000001','{"muvId":"typeless-agreement","anlasma":{"ucret":500}}');
INSERT INTO pg_temp.finance_results VALUES
('legacy_agreement_rounding', (pg_temp.finans_muvekkil_ozet('00000000-0000-0000-0000-000000000001','fractional-legacy')->'alacak'->>'anlasilanToplam')::numeric,100.23),
('typeless_detail_agreement', (pg_temp.finans_dosya_ozet('00000000-0000-0000-0000-000000000001','dava','typeless-agreement')->'anlasma'->>'anlasilanToplam')::numeric,500),
('typeless_client_agreement', (pg_temp.finans_muvekkil_ozet('00000000-0000-0000-0000-000000000001','typeless-agreement')->'alacak'->>'anlasilanToplam')::numeric,500);

INSERT INTO pg_temp.finance_results VALUES
('archive_retains_fee', (pg_temp.finans_muvekkil_ozet('00000000-0000-0000-0000-000000000001','history')->'alacak'->>'tahsilEdilen')::numeric,100),
('deleted_excluded_from_agreement', (pg_temp.finans_muvekkil_ozet('00000000-0000-0000-0000-000000000001','history')->'alacak'->>'anlasilanToplam')::numeric,300),
('deleted_detail_absent', CASE WHEN pg_temp.finans_dosya_ozet('00000000-0000-0000-0000-000000000001','dava','deleted') IS NULL THEN 1 ELSE 0 END,1),
('false_deletion_flag_visible', (pg_temp.finans_dosya_ozet('00000000-0000-0000-0000-000000000001','dava','false-flag')->'anlasma'->>'anlasilanToplam')::numeric,100),
('legacy_detail_fee', (pg_temp.finans_dosya_ozet('00000000-0000-0000-0000-000000000001','dava','legacy')->>'buroGelir')::numeric,200),
('legacy_client_fee', (pg_temp.finans_muvekkil_ozet('00000000-0000-0000-0000-000000000001','legacy')->'alacak'->>'tahsilEdilen')::numeric,200),
('percentage_detail', (pg_temp.finans_dosya_ozet('00000000-0000-0000-0000-000000000001','dava','percentage')->'anlasma'->>'anlasilanToplam')::numeric,10000),
('mixed_detail', (pg_temp.finans_dosya_ozet('00000000-0000-0000-0000-000000000001','dava','mixed')->'anlasma'->>'anlasilanToplam')::numeric,12000);

INSERT INTO pg_temp.danismanlik VALUES
('service','00000000-0000-0000-0000-000000000001','{"muvId":"services","aylikUcret":1500,"tahsilEdildi":9000,"tahsilatlar":[{"tur":"akdi_vekalet","tutar":300},{"tutar":100},{"tur":"tahsilat","tutar":10000},{"tur":"aktarim","tutar":8000}]}');
INSERT INTO pg_temp.arabuluculuk VALUES
('service','00000000-0000-0000-0000-000000000001','{"muvId":"services","ucret":1000,"tahsilEdildi":9000,"tahsilatlar":[{"tur":"akdi_vekalet","tutar":200}]}'),
('deleted-service','00000000-0000-0000-0000-000000000001','{"muvId":"services","_silindi":true,"ucret":50000,"tahsilEdildi":50000}');
INSERT INTO pg_temp.ihtarnameler VALUES
('service','00000000-0000-0000-0000-000000000001','{"muvId":"services","_arsivlendi":true,"ucret":500,"tahsilEdildi":100}');
WITH s AS (SELECT pg_temp.finans_muvekkil_ozet('00000000-0000-0000-0000-000000000001','services') AS m)
INSERT INTO pg_temp.finance_results
SELECT 'service_arrays_replace_flat', (m->'danismanlik'->>'gelir')::numeric,400 FROM s UNION ALL
SELECT 'service_monthly_agreement', (m->'danismanlik'->>'anlasilan')::numeric,1500 FROM s UNION ALL
SELECT 'service_deleted_excluded', (m->'arabuluculuk'->>'gelir')::numeric,200 FROM s UNION ALL
SELECT 'service_archive_retains_legacy', (m->'ihtarname'->>'gelir')::numeric,100 FROM s UNION ALL
SELECT 'service_fee_collection', (m->'alacak'->>'tahsilEdilen')::numeric,700 FROM s UNION ALL
SELECT 'service_fee_remaining', (m->'alacak'->>'kalan')::numeric,2300 FROM s;

DO $access_tests$
DECLARE fn text; denied boolean; passed integer := 0;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  FOREACH fn IN ARRAY ARRAY['finans_dosya_ozet','finans_muvekkil_ozet'] LOOP
    denied := false;
    BEGIN
      IF fn = 'finans_dosya_ozet' THEN
        PERFORM pg_temp.finans_dosya_ozet('00000000-0000-0000-0000-000000000001','dava','audit-case');
      ELSE
        PERFORM pg_temp.finans_muvekkil_ozet('00000000-0000-0000-0000-000000000001','audit-client');
      END IF;
    EXCEPTION WHEN insufficient_privilege THEN denied := true;
    END;
    IF denied THEN passed := passed + 1; END IF;
  END LOOP;
  INSERT INTO pg_temp.finance_results VALUES ('anonymous_body_denial',passed,2);
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000099', true);
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000099"}', true);
  INSERT INTO pg_temp.finance_results VALUES ('active_member_income',
    (pg_temp.finans_dosya_ozet('00000000-0000-0000-0000-000000000001','dava','audit-case')->>'buroGelir')::numeric,2800);
  passed := 0;
  FOREACH fn IN ARRAY ARRAY['finans_dosya_ozet','finans_muvekkil_ozet'] LOOP
    denied := false;
    BEGIN
      IF fn = 'finans_dosya_ozet' THEN
        PERFORM pg_temp.finans_dosya_ozet('00000000-0000-0000-0000-000000000002','dava','audit-case');
      ELSE
        PERFORM pg_temp.finans_muvekkil_ozet('00000000-0000-0000-0000-000000000002','audit-client');
      END IF;
    EXCEPTION WHEN insufficient_privilege THEN denied := true;
    END;
    IF denied THEN passed := passed + 1; END IF;
  END LOOP;
  INSERT INTO pg_temp.finance_results VALUES ('foreign_bureau_denial',passed,2);
END;
$access_tests$;

DO $assertions$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_temp.finance_results WHERE observed IS DISTINCT FROM expected) THEN
    RAISE EXCEPTION 'Candidate finance regression failed: %',
      (SELECT jsonb_agg(to_jsonb(r)) FROM pg_temp.finance_results r WHERE observed IS DISTINCT FROM expected);
  END IF;
END;
$assertions$;
SELECT scenario, observed, expected, observed = expected AS passed FROM pg_temp.finance_results ORDER BY scenario;
ROLLBACK;
