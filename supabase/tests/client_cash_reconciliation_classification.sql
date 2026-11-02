-- Read-only classification, without private descriptions, names or automatic matching.
WITH files AS (
 SELECT 'Dava' AS tur,id,buro_id,data FROM public.davalar
 UNION ALL SELECT 'İcra',id,buro_id,data FROM public.icra
 UNION ALL SELECT 'Arabuluculuk',id,buro_id,data FROM public.arabuluculuk
 UNION ALL SELECT 'İhtarname',id,buro_id,data FROM public.ihtarnameler
), expenses AS (
 SELECT f.tur,f.id AS dosya_id,f.buro_id,f.data->>'muvId' AS muv_id,h AS expense,
   CASE WHEN coalesce(h->>'tutar','') ~ '^[0-9]+([.][0-9]+)?$' THEN (h->>'tutar')::numeric END AS amount
 FROM files f CROSS JOIN LATERAL jsonb_array_elements(
   CASE WHEN jsonb_typeof(f.data->'harcamalar')='array' THEN f.data->'harcamalar' ELSE '[]'::jsonb END) h
 WHERE coalesce(f.data->>'_silindi','')='' AND coalesce(h->>'_silindi','')=''
   AND coalesce(h->>'masrafSahibi','muvekkil') <> 'buro'
), cash AS (
 SELECT id,buro_id,data,
   CASE WHEN coalesce(data->>'tutar','') ~ '^[0-9]+([.][0-9]+)?$' THEN (data->>'tutar')::numeric END AS amount
 FROM public.avans_hareketleri WHERE data->>'tip'='masraf' AND coalesce(data->>'_silindi','')=''
), unmatched AS (
 SELECT e.*, (SELECT count(*) FROM cash c WHERE c.buro_id=e.buro_id AND c.data->>'dosyaId'=e.dosya_id
   AND c.data->>'dosyaTur'=e.tur AND c.data->>'muvId'=e.muv_id AND c.amount=e.amount
   AND c.data->>'tarih'=e.expense->>'tarih') AS candidate_count
 FROM expenses e WHERE NOT EXISTS(SELECT 1 FROM cash c WHERE c.buro_id=e.buro_id AND c.id=e.expense->>'id')
), grouped AS (
 SELECT tur,count(*) AS unmatched_expenses,
   count(*) FILTER(WHERE coalesce(expense->>'id','')='') AS missing_expense_ids,
   count(*) FILTER(WHERE candidate_count=0) AS no_context_candidate,
   count(*) FILTER(WHERE candidate_count=1) AS single_context_candidate_unconfirmed,
   count(*) FILTER(WHERE candidate_count>1) AS ambiguous_context_candidates,
   count(*) FILTER(WHERE amount IS NULL OR amount<=0) AS invalid_amount,
   count(*) FILTER(WHERE coalesce(expense->>'tarih','')='') AS missing_date,
   count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM public.muvekkillar m WHERE m.id=unmatched.muv_id AND m.buro_id=unmatched.buro_id)) AS missing_client
 FROM unmatched GROUP BY tur
)
SELECT jsonb_build_object('expense_groups',coalesce((SELECT jsonb_agg(to_jsonb(g)) FROM grouped g),'[]'::jsonb),
 'orphan_cash',coalesce((SELECT jsonb_agg(jsonb_build_object('case_state',state,'records',records)) FROM (
   SELECT CASE WHEN f.id IS NULL THEN 'missing_case' WHEN coalesce(f.data->>'_silindi','')<>'' THEN 'deleted_case'
     ELSE 'case_present_expense_missing' END AS state,count(*) AS records
   FROM cash c LEFT JOIN files f ON f.buro_id=c.buro_id AND f.id=c.data->>'dosyaId' AND f.tur=c.data->>'dosyaTur'
   WHERE coalesce(c.data->>'dosyaId','')<>'' AND NOT EXISTS(SELECT 1 FROM expenses e
     WHERE e.buro_id=c.buro_id AND e.expense->>'id'=c.id AND e.dosya_id=c.data->>'dosyaId' AND e.tur=c.data->>'dosyaTur')
   GROUP BY 1) states),'[]'::jsonb)) AS reconciliation;
