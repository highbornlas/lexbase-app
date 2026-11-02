-- Read-only counts. No guessing links by matching date/amount and no automatic backfill.
WITH files AS (
  SELECT 'Dava' AS tur,id,buro_id,data FROM public.davalar
  UNION ALL SELECT 'İcra',id,buro_id,data FROM public.icra
  UNION ALL SELECT 'Arabuluculuk',id,buro_id,data FROM public.arabuluculuk
  UNION ALL SELECT 'İhtarname',id,buro_id,data FROM public.ihtarnameler
), expenses AS (
  SELECT f.tur,f.id AS dosya_id,f.buro_id,f.data->>'muvId' AS muv_id,h AS expense
  FROM files f CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(f.data->'harcamalar')='array' THEN f.data->'harcamalar' ELSE '[]'::jsonb END) h
  WHERE coalesce(f.data->>'_silindi','')='' AND coalesce(h->>'_silindi','')=''
), cash AS (
  SELECT id,buro_id,data FROM public.avans_hareketleri
  WHERE data->>'tip'='masraf' AND coalesce(data->>'_silindi','')=''
)
SELECT 'client_expense_without_cash_id' AS issue,count(*) AS records FROM expenses e
WHERE coalesce(e.expense->>'masrafSahibi','muvekkil') <> 'buro' AND NOT EXISTS (
  SELECT 1 FROM cash c WHERE c.id=e.expense->>'id' AND c.buro_id=e.buro_id)
UNION ALL
SELECT 'linked_cash_without_expense_id',count(*) FROM cash c
WHERE coalesce(c.data->>'dosyaId','') <> '' AND NOT EXISTS (
  SELECT 1 FROM expenses e WHERE e.expense->>'id'=c.id AND e.buro_id=c.buro_id
    AND e.dosya_id=c.data->>'dosyaId' AND e.tur=c.data->>'dosyaTur')
UNION ALL
SELECT 'linked_expense_cash_mismatch',count(*) FROM expenses e JOIN cash c
  ON c.id=e.expense->>'id' AND c.buro_id=e.buro_id
WHERE e.muv_id IS DISTINCT FROM c.data->>'muvId' OR e.dosya_id IS DISTINCT FROM c.data->>'dosyaId'
  OR e.tur IS DISTINCT FROM c.data->>'dosyaTur' OR e.expense->>'masrafSahibi'='buro'
  OR e.expense->>'tarih' IS DISTINCT FROM c.data->>'tarih'
  OR (CASE WHEN coalesce(e.expense->>'tutar','') ~ '^[0-9]+([.][0-9]+)?$' THEN (e.expense->>'tutar')::numeric END)
    IS DISTINCT FROM (CASE WHEN coalesce(c.data->>'tutar','') ~ '^[0-9]+([.][0-9]+)?$' THEN (c.data->>'tutar')::numeric END)
UNION ALL
SELECT 'duplicate_expense_id_groups',count(*) FROM (
  SELECT buro_id,expense->>'id' FROM expenses WHERE coalesce(expense->>'id','') <> ''
  GROUP BY buro_id,expense->>'id' HAVING count(*) > 1) duplicates;
