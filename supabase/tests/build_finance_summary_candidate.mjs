import { readFileSync } from 'node:fs';

const diagnostics = readFileSync(new URL('./finance_calculation_diagnostics.sql', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../migrations/20261014092345_finance_summary_calculation_fixes.sql', import.meta.url), 'utf8');
const assertions = readFileSync(new URL('./finance_summary_regression.sql', import.meta.url), 'utf8');
const delimiter = '-- Access grants are unchanged;';
if (!diagnostics.includes('WITH summaries AS') || !migration.includes(delimiter)) {
  throw new Error('Test source layout changed; refusing an unsafe candidate test');
}
let candidate = migration.split(delimiter)[0];
const schemaAnchor = "target_schema name := 'public';";
if (candidate.split(schemaAnchor).length !== 2) throw new Error('Expected one target-schema anchor');
candidate = candidate.replace(schemaAnchor,
  'target_schema name := (SELECT nspname FROM pg_namespace WHERE oid = pg_my_temp_schema());');
const clones = `
CREATE TEMP TABLE uyelikler (auth_id uuid, buro_id uuid, durum text) ON COMMIT DROP;
INSERT INTO pg_temp.uyelikler VALUES ('00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000001', 'aktif');
DO $clones$
DECLARE original_name text; definition text;
BEGIN
  FOREACH original_name IN ARRAY ARRAY['finans_dosya_ozet', 'finans_muvekkil_ozet'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO STRICT definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = original_name;
    definition := replace(definition, 'FUNCTION public.' || original_name || '(',
      'FUNCTION pg_temp.' || original_name || '(');
    definition := replace(definition, 'public.uyelikler', 'pg_temp.uyelikler');
    definition := replace(definition, 'SET search_path TO ''public'', ''pg_temp''',
      'SET search_path TO ''pg_temp'', ''public''');
    IF position('FUNCTION pg_temp.' IN definition) = 0
      OR position('SET search_path TO ''pg_temp'', ''public''' IN definition) = 0 THEN
      RAISE EXCEPTION 'Unsafe clone definition for %', original_name;
    END IF;
    EXECUTE definition;
  END LOOP;
END;
$clones$;
`;
const safety = `
DO $safety$
DECLARE definition text; denied boolean;
BEGIN
  SELECT pg_get_functiondef('pg_temp.finans_dosya_ozet(uuid,text,text)'::regprocedure) INTO definition;
  EXECUTE replace(definition, 'lexbase-finance-summary-v1', 'simulated-source-drift');
  denied := false;
  BEGIN
    EXECUTE $candidate$${candidate}$candidate$;
  EXCEPTION WHEN raise_exception THEN
    IF position('Unexpected source drift' IN SQLERRM) = 0 THEN RAISE; END IF;
    denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Source drift was not rejected'; END IF;
  EXECUTE definition;
  EXECUTE replace(definition, 'lexbase-finance-access-guard', 'simulated-missing-guard');
  denied := false;
  BEGIN
    EXECUTE $candidate$${candidate}$candidate$;
  EXCEPTION WHEN raise_exception THEN
    IF position('Missing bureau guard' IN SQLERRM) = 0 THEN RAISE; END IF;
    denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Missing guard was not rejected'; END IF;
  EXECUTE definition;
END;
$safety$;
`;
// Run twice to verify idempotence without replacing any production function.
process.stdout.write(diagnostics.split('WITH summaries AS')[0] + clones + candidate + candidate + safety + assertions);
