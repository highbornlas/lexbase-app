-- Read-only with respect to persistent data: fixtures and cloned functions
-- live in pg_temp. Always run the complete script including ROLLBACK.
BEGIN;
SET LOCAL statement_timeout = '15s';
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

CREATE TEMP TABLE davalar (id text, buro_id uuid, data jsonb) ON COMMIT DROP;
CREATE TEMP TABLE icra (LIKE pg_temp.davalar) ON COMMIT DROP;
CREATE TEMP TABLE danismanlik (LIKE pg_temp.davalar) ON COMMIT DROP;
CREATE TEMP TABLE arabuluculuk (LIKE pg_temp.davalar) ON COMMIT DROP;
CREATE TEMP TABLE ihtarnameler (LIKE pg_temp.davalar) ON COMMIT DROP;
CREATE TEMP TABLE avans_hareketleri (LIKE pg_temp.davalar) ON COMMIT DROP;
CREATE TEMP TABLE avanslar (LIKE pg_temp.davalar) ON COMMIT DROP;

DO $audit$
DECLARE
  original_name text;
  definition text;
BEGIN
  FOREACH original_name IN ARRAY ARRAY['finans_dosya_ozet', 'finans_muvekkil_ozet'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO STRICT definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = original_name;
    IF position('lexbase-finance-access-guard' IN definition) = 0 THEN
      RAISE EXCEPTION 'Expected guarded production definition for %', original_name;
    END IF;
    definition := replace(definition, 'FUNCTION public.' || original_name || '(',
      'FUNCTION pg_temp.audit_' || original_name || '(');
    definition := replace(definition, 'SET search_path TO ''public'', ''pg_temp''',
      'SET search_path TO ''pg_temp'', ''public''');
    IF position('FUNCTION pg_temp.audit_' IN definition) = 0
       OR position('SET search_path TO ''pg_temp'', ''public''' IN definition) = 0 THEN
      RAISE EXCEPTION 'Clone isolation failed for %', original_name;
    END IF;
    EXECUTE definition;
  END LOOP;
END;
$audit$;

INSERT INTO pg_temp.davalar VALUES (
  'audit-case', '00000000-0000-0000-0000-000000000001',
  '{"id":"audit-case","muvId":"audit-client","anlasma":{"tur":"pesin","ucret":3000,"toplam":5000},
    "tahsilatlar":[{"tur":"tahsilat","tutar":10000},{"tur":"akdi_vekalet","tutar":2000},
      {"tur":"hakediş","tutar":500},{"tur":"icra_vekalet","tutar":300},
      {"tur":"aktarim","tutar":8000},{"tur":"iade","tutar":200}]}'::jsonb
);

WITH summaries AS (
  SELECT
    pg_temp.audit_finans_dosya_ozet('00000000-0000-0000-0000-000000000001', 'dava', 'audit-case') AS dosya,
    pg_temp.audit_finans_muvekkil_ozet('00000000-0000-0000-0000-000000000001', 'audit-client') AS muvekkil
), comparisons AS (
  SELECT 'office_income_includes_statutory_fee' AS scenario,
    (dosya->>'buroGelir')::numeric AS observed, 2800::numeric AS expected FROM summaries
  UNION ALL
  SELECT 'agreement_explicit_total_precedence',
    (dosya->'anlasma'->>'anlasilanToplam')::numeric, 5000::numeric FROM summaries
  UNION ALL
  SELECT 'client_due_excludes_client_owned_money',
    (muvekkil->'alacak'->>'tahsilEdilen')::numeric, 2000::numeric FROM summaries
)
SELECT scenario, observed, expected, observed = expected AS matches FROM comparisons;

ROLLBACK;
