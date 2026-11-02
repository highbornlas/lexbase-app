-- Candidate only: cash-basis office income, not client-held money or case value.
CREATE SCHEMA IF NOT EXISTS lexbase_security;
REVOKE ALL ON SCHEMA lexbase_security FROM PUBLIC;

CREATE OR REPLACE FUNCTION lexbase_security.finance_amount(value jsonb)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=''
AS $fn$
DECLARE result numeric;
BEGIN
  IF value IS NULL OR jsonb_typeof(value) NOT IN ('number','string') THEN RETURN 0; END IF;
  BEGIN result := (value #>> '{}')::numeric;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN 0;
  END;
  IF result::text IN ('NaN','Infinity','-Infinity') THEN RETURN 0; END IF;
  RETURN coalesce(result,0);
END;
$fn$;

CREATE OR REPLACE FUNCTION lexbase_security.finance_in_period(value text, year_value integer, month_value integer)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=''
AS $fn$
DECLARE parsed date;
BEGIN
  IF year_value IS NULL AND month_value IS NULL THEN RETURN true; END IF;
  IF year_value IS NULL OR year_value NOT BETWEEN 1 AND 9999
    OR (month_value IS NOT NULL AND month_value NOT BETWEEN 1 AND 12)
    OR value IS NULL OR value !~ '^\d{4}-\d{2}-\d{2}$' THEN RETURN false; END IF;
  BEGIN parsed := value::date;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN false;
  END;
  RETURN to_char(parsed,'YYYY-MM-DD')=value AND extract(year FROM parsed)=year_value
    AND (month_value IS NULL OR extract(month FROM parsed)=month_value);
END;
$fn$;
REVOKE ALL ON FUNCTION lexbase_security.finance_amount(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION lexbase_security.finance_in_period(text,integer,integer) FROM PUBLIC,anon,authenticated,service_role;

DO $migration$
DECLARE
  current_body text;
  body text := $body$
DECLARE
  rec record; movement jsonb; expense jsonb; movements jsonb;
  amount numeric; category text; movement_date text;
  contractual numeric := 0; other_fee numeric := 0; consulting numeric := 0;
  mediation numeric := 0; notice numeric := 0; office_cost numeric := 0;
  client_cost numeric := 0; overhead numeric := 0; income numeric; costs numeric; net numeric;
  categories jsonb := '{}'::jsonb;
BEGIN
  -- lexbase-profit-loss-cash-basis-v1
  IF coalesce(auth.jwt()->>'role','') <> 'service_role' AND (
    auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.uyelikler
      WHERE auth_id=auth.uid() AND buro_id=p_buro_id AND durum='aktif')) THEN
    RAISE EXCEPTION 'Bu buronun finans verilerine erisim yetkiniz yok' USING ERRCODE='42501';
  END IF;
  FOR rec IN
    SELECT data,0 AS kind FROM public.davalar WHERE buro_id=p_buro_id
    UNION ALL SELECT data,1 FROM public.icra WHERE buro_id=p_buro_id
    UNION ALL SELECT data,2 FROM public.danismanlik WHERE buro_id=p_buro_id
    UNION ALL SELECT data,3 FROM public.arabuluculuk WHERE buro_id=p_buro_id
    UNION ALL SELECT data,4 FROM public.ihtarnameler WHERE buro_id=p_buro_id
  LOOP
    IF coalesce(rec.data->'_silindi','null'::jsonb) NOT IN ('null'::jsonb,'false'::jsonb,'0'::jsonb,'""'::jsonb) THEN CONTINUE; END IF;
    movements := CASE WHEN jsonb_typeof(rec.data->'tahsilatlar')='array' THEN rec.data->'tahsilatlar' ELSE '[]'::jsonb END;
    IF jsonb_array_length(movements)=0 THEN
      movement_date := CASE WHEN rec.kind<2 THEN
        coalesce(nullif(rec.data->>'tahsilTarih',''),nullif(rec.data->>'tahsilatTarihi',''),'') ELSE
        coalesce(nullif(rec.data->>'sonucTarih',''),nullif(rec.data->>'tarih',''),nullif(rec.data->>'basvuruTarih',''),'') END;
      movements := jsonb_build_array(jsonb_build_object('tur','akdi_vekalet','tutar',rec.data->'tahsilEdildi','tarih',movement_date));
    END IF;
    FOR movement IN SELECT value FROM jsonb_array_elements(movements) LOOP
      IF jsonb_typeof(movement)<>'object' OR coalesce(movement->'_silindi','null'::jsonb)
        NOT IN ('null'::jsonb,'false'::jsonb,'0'::jsonb,'""'::jsonb) THEN CONTINUE; END IF;
      IF NOT (coalesce(movement->>'tur','') IN ('akdi_vekalet','hakediş','icra_vekalet')
        OR (rec.kind>=2 AND coalesce(movement->>'tur','')='')) THEN CONTINUE; END IF;
      IF NOT lexbase_security.finance_in_period(movement->>'tarih',p_yil,p_ay) THEN CONTINUE; END IF;
      amount := lexbase_security.finance_amount(movement->'tutar');
      CASE rec.kind
        WHEN 2 THEN consulting := consulting+amount;
        WHEN 3 THEN mediation := mediation+amount;
        WHEN 4 THEN notice := notice+amount;
        ELSE IF movement->>'tur'='akdi_vekalet' THEN contractual := contractual+amount;
          ELSE other_fee := other_fee+amount; END IF;
      END CASE;
    END LOOP;
    FOR expense IN SELECT value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(rec.data->'harcamalar')='array' THEN rec.data->'harcamalar' ELSE '[]'::jsonb END) LOOP
      IF coalesce(expense->'_silindi','null'::jsonb) NOT IN ('null'::jsonb,'false'::jsonb,'0'::jsonb,'""'::jsonb)
        OR NOT lexbase_security.finance_in_period(expense->>'tarih',p_yil,p_ay) THEN CONTINUE; END IF;
      amount := lexbase_security.finance_amount(expense->'tutar');
      IF expense->>'masrafSahibi'='buro' THEN office_cost := office_cost+amount;
      ELSE client_cost := client_cost+amount; END IF;
    END LOOP;
    IF rec.kind=4 AND lexbase_security.finance_in_period(rec.data->>'tarih',p_yil,p_ay) THEN
      client_cost := client_cost+lexbase_security.finance_amount(rec.data->'noterMasrafi');
    END IF;
  END LOOP;
  FOR rec IN SELECT data FROM public.buro_giderleri WHERE buro_id=p_buro_id LOOP
    IF coalesce(rec.data->'_silindi','null'::jsonb) NOT IN ('null'::jsonb,'false'::jsonb,'0'::jsonb,'""'::jsonb)
      OR NOT lexbase_security.finance_in_period(rec.data->>'tarih',p_yil,p_ay) THEN CONTINUE; END IF;
    amount := lexbase_security.finance_amount(CASE WHEN coalesce(rec.data->'netTutar','null'::jsonb) IN ('null'::jsonb,'""'::jsonb)
      THEN rec.data->'tutar' ELSE rec.data->'netTutar' END);
    category := coalesce(nullif(rec.data->>'kategori',''),'Diğer');
    categories := jsonb_set(categories,ARRAY[category],to_jsonb(round(coalesce((categories->>category)::numeric,0)+amount,2)));
    overhead := overhead+amount;
  END LOOP;
  contractual:=round(contractual,2); other_fee:=round(other_fee,2); consulting:=round(consulting,2);
  mediation:=round(mediation,2); notice:=round(notice,2);
  income := contractual+other_fee+consulting+mediation+notice;
  costs := round(overhead+office_cost,2); net := round(income-costs,2);
  RETURN jsonb_build_object('gelirler',jsonb_build_object('akdiVekaletUcreti',contractual,
    'karsiVekaletHakedis',other_fee,'danismanlikGeliri',consulting,'arabuluculukGeliri',mediation,
    'ihtarnameGeliri',notice,'digerGelir',0,'toplam',income),
    'giderler',jsonb_build_object('buroGiderleri',categories,'buroGiderToplam',round(overhead,2),
      'dosyaMasraflari',round(office_cost,2),'toplam',costs),
    'muvekkilMasraflari',round(client_cost,2),'net',net,
    'karZararOrani',CASE WHEN income>0 THEN round(net/income*100,2) ELSE 0 END);
END;
$body$;
BEGIN
  SELECT prosrc INTO current_body FROM pg_catalog.pg_proc WHERE oid=to_regprocedure('public.finans_buro_kar_zarar(uuid,integer,integer)');
  IF current_body IS NULL OR md5(current_body) NOT IN ('b7a64af6d52a3414b713119c8237e1c3',md5(body)) THEN
    RAISE EXCEPTION 'Unreviewed profit/loss function source';
  END IF;
  EXECUTE format('CREATE OR REPLACE FUNCTION public.finans_buro_kar_zarar(p_buro_id uuid,p_yil integer DEFAULT NULL,p_ay integer DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=%L AS %L','',body);
END;
$migration$;
REVOKE ALL ON FUNCTION public.finans_buro_kar_zarar(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finans_buro_kar_zarar(uuid,integer,integer) TO authenticated,service_role;
