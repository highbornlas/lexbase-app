-- Candidate: deploy with the lifecycle hooks; no historical records are rewritten.
CREATE OR REPLACE FUNCTION public.kayit_durum_islemi(
  p_buro_id uuid, p_tablo text, p_id text, p_islem text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_data jsonb;
  v_yeni jsonb;
  v_rows integer;
  v_tur text;
  v_has_finance boolean;
  v_link_table text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.uyelikler u
    WHERE u.auth_id = auth.uid() AND u.buro_id = p_buro_id AND u.durum = 'aktif') THEN
    RAISE EXCEPTION 'Aktif buro uyeligi gerekli' USING ERRCODE = '42501';
  END IF;
  IF p_tablo IS NULL OR p_tablo NOT IN ('davalar','icra','arabuluculuk','ihtarnameler','danismanlik','muvekkillar')
    OR p_islem IS NULL OR p_islem NOT IN ('arsivle','arsivden_cikar','sil','geri_yukle','kalici_sil')
    OR coalesce(p_id,'') = '' OR length(p_id) > 200 THEN
    RAISE EXCEPTION 'Gecersiz durum islemi' USING ERRCODE = '22023';
  END IF;
  EXECUTE format('SELECT data FROM public.%I WHERE id=$1 AND buro_id=$2 FOR UPDATE',p_tablo)
    INTO v_data USING p_id,p_buro_id;
  IF v_data IS NULL THEN RAISE EXCEPTION 'Kayit bulunamadi' USING ERRCODE = 'P0002'; END IF;

  IF p_islem = 'kalici_sil' THEN
    IF coalesce(v_data->>'_silindi','') = '' THEN
      RAISE EXCEPTION 'Yalniz cop kutusundaki kayit silinebilir' USING ERRCODE = '23514';
    END IF;
    IF p_tablo = 'muvekkillar' THEN
      SELECT EXISTS(SELECT 1 FROM public.avans_hareketleri WHERE buro_id=p_buro_id AND data->>'muvId'=p_id)
        OR EXISTS(SELECT 1 FROM public.davalar WHERE buro_id=p_buro_id AND (data->>'muvId'=p_id OR data->>'_eskiMuvId'=p_id))
        OR EXISTS(SELECT 1 FROM public.icra WHERE buro_id=p_buro_id AND (data->>'muvId'=p_id OR data->>'_eskiMuvId'=p_id))
        OR EXISTS(SELECT 1 FROM public.arabuluculuk WHERE buro_id=p_buro_id AND (data->>'muvId'=p_id OR data->>'_eskiMuvId'=p_id))
        OR EXISTS(SELECT 1 FROM public.ihtarnameler WHERE buro_id=p_buro_id AND (data->>'muvId'=p_id OR data->>'_eskiMuvId'=p_id))
        OR EXISTS(SELECT 1 FROM public.danismanlik WHERE buro_id=p_buro_id AND (data->>'muvId'=p_id OR data->>'_eskiMuvId'=p_id))
        INTO v_has_finance;
    ELSE
      v_tur := CASE p_tablo WHEN 'davalar' THEN 'Dava' WHEN 'icra' THEN 'İcra'
        WHEN 'arabuluculuk' THEN 'Arabuluculuk' WHEN 'ihtarnameler' THEN 'İhtarname' WHEN 'danismanlik' THEN 'Danışmanlık' END;
      -- Keep deleted movements too: they are part of the financial audit history.
      SELECT EXISTS(SELECT 1 FROM public.avans_hareketleri WHERE buro_id=p_buro_id
        AND data->>'dosyaId'=p_id AND data->>'dosyaTur'=v_tur)
        INTO v_has_finance;
    END IF;
    v_has_finance := v_has_finance
      OR EXISTS(SELECT 1 FROM jsonb_each(v_data) e WHERE e.key IN
        ('harcamalar','tahsilatlar','toplanti','anlasma','odemePlani')
        AND e.value NOT IN ('null'::jsonb,'[]'::jsonb,'{}'::jsonb))
      OR EXISTS(SELECT 1 FROM jsonb_each(v_data) e WHERE e.key IN
        ('ucret','aylikUcret','tahsilEdildi','noterMasrafi','alinanAvans','avans','alacak','vekaletUcreti','toplamUcret')
        AND coalesce(e.value #>> '{}','') NOT IN ('','0','0.0','0.00','null'));
    IF v_has_finance THEN
      RAISE EXCEPTION 'Finans veya dosya baglantisi bulunan kayit kalici silinemez; arsivleyin' USING ERRCODE = '23514';
    END IF;
    EXECUTE format('DELETE FROM public.%I WHERE id=$1 AND buro_id=$2',p_tablo) USING p_id,p_buro_id;
  ELSE
    v_yeni := CASE p_islem
      WHEN 'arsivle' THEN CASE WHEN coalesce(v_data->>'_arsivlendi','') <> '' THEN v_data
        ELSE v_data || jsonb_build_object('_arsivlendi',clock_timestamp()::text) END
      WHEN 'arsivden_cikar' THEN v_data - '_arsivlendi'
      WHEN 'sil' THEN CASE WHEN coalesce(v_data->>'_silindi','') <> '' THEN v_data
        ELSE v_data || jsonb_build_object('_silindi',clock_timestamp()::text) END
      WHEN 'geri_yukle' THEN v_data - '_silindi' END;
    EXECUTE format('UPDATE public.%I SET data=$1 WHERE id=$2 AND buro_id=$3',p_tablo)
      USING v_yeni,p_id,p_buro_id;
  END IF;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'Durum islemi uygulanamadi' USING ERRCODE = '42501'; END IF;
  IF p_tablo = 'muvekkillar' AND p_islem = 'geri_yukle' THEN
    -- Restore only explicit legacy links; never override a newly assigned client.
    FOREACH v_link_table IN ARRAY ARRAY['davalar','icra','arabuluculuk','ihtarnameler','danismanlik'] LOOP
      EXECUTE format('UPDATE public.%I SET data=(data - ''_eskiMuvId'') || jsonb_build_object(''muvId'',$1)
        WHERE buro_id=$2 AND data->>''_eskiMuvId''=$1 AND coalesce(data->>''muvId'','''')=''''',v_link_table)
        USING p_id,p_buro_id;
    END LOOP;
  END IF;
  RETURN jsonb_build_object('id',p_id,'islem',p_islem);
END;
$function$;
REVOKE ALL ON FUNCTION public.kayit_durum_islemi(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kayit_durum_islemi(uuid,text,text,text) TO authenticated;
