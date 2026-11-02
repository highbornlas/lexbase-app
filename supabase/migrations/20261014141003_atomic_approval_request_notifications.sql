-- Deploy after membership_service_policy_scope; no broader membership SELECT.
DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public'
    AND tablename='uyelikler' AND policyname='service_role_full_access'
    AND roles=ARRAY['service_role']::name[] AND cmd='ALL' AND qual='true'
    AND with_check='true') THEN
    RAISE EXCEPTION 'Apply and verify membership service policy correction first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='uyelikler' AND c.relrowsecurity) THEN
    RAISE EXCEPTION 'Membership RLS must remain enabled';
  END IF;
END;
$guard$;

CREATE SCHEMA IF NOT EXISTS lexbase_private;
REVOKE ALL ON SCHEMA lexbase_private FROM PUBLIC, anon;
REVOKE CREATE ON SCHEMA lexbase_private FROM authenticated;
GRANT USAGE ON SCHEMA lexbase_private TO authenticated;

-- Deliberately privileged only for fixed notification delivery. The requester
-- must own the persisted request and still be an active member of its bureau.
CREATE OR REPLACE FUNCTION lexbase_private.onay_talebi_bildir(p_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  talep public.onay_kuyrugu%ROWTYPE;
  actor uuid := auth.uid();
  inserted integer;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO talep FROM public.onay_kuyrugu WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR talep.talep_eden_auth_id IS DISTINCT FROM actor
    OR NOT EXISTS (SELECT 1 FROM public.uyelikler u WHERE u.auth_id=actor
      AND u.buro_id=talep.buro_id AND u.durum='aktif') THEN
    RAISE EXCEPTION 'Approval request delivery denied' USING ERRCODE='42501';
  END IF;
  IF talep.durum <> 'beklemede' THEN RETURN 0; END IF;
  INSERT INTO public.bildirimler(id,buro_id,hedef_auth_id,tip,baslik,mesaj,link,okundu,ilgili_id,ilgili_tur)
  SELECT 'onay-talebi:' || talep.id::text || ':' || u.auth_id::text,
    talep.buro_id,u.auth_id,'sistem','Yeni onay talebi',
    coalesce(nullif(talep.aciklama,''),talep.islem_tipi || ' islemi onayinizi bekliyor'),
    '/onaylar',false,talep.id::text,'onay_talebi'
  FROM public.uyelikler u WHERE u.buro_id=talep.buro_id AND u.durum='aktif'
    AND u.rol IN ('sahip','yonetici') AND u.auth_id<>actor
  ON CONFLICT(id) DO NOTHING;
  GET DIAGNOSTICS inserted=ROW_COUNT;
  RETURN inserted;
END;
$function$;
REVOKE ALL ON FUNCTION lexbase_private.onay_talebi_bildir(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION lexbase_private.onay_talebi_bildir(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.onay_talebi_olustur(p_buro_id uuid,p_id uuid,p_talep jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $function$
DECLARE
  actor uuid := auth.uid();
  incoming public.onay_kuyrugu%ROWTYPE;
  saved public.onay_kuyrugu%ROWTYPE;
  notifications integer;
BEGIN
  IF actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.uyelikler u
    WHERE u.auth_id=actor AND u.buro_id=p_buro_id AND u.durum='aktif') THEN
    RAISE EXCEPTION 'Active bureau membership required' USING ERRCODE='42501';
  END IF;
  IF p_id IS NULL OR jsonb_typeof(p_talep) IS DISTINCT FROM 'object'
    OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_talep) k WHERE k NOT IN
      ('modul','islem_tipi','hedef_tablo','hedef_kayit_id','veri','aciklama','ekler','tutar')) THEN
    RAISE EXCEPTION 'Invalid approval payload' USING ERRCODE='22023';
  END IF;
  SELECT * INTO incoming FROM jsonb_populate_record(NULL::public.onay_kuyrugu,p_talep);
  incoming.veri := coalesce(incoming.veri,'{}'::jsonb);
  incoming.ekler := coalesce(incoming.ekler,ARRAY[]::text[]);
  IF incoming.modul IS NULL OR incoming.modul NOT IN ('finans','dava','belge','personel')
    OR coalesce(incoming.islem_tipi,'') !~ '^[a-z_]{1,64}$'
    OR coalesce(incoming.hedef_tablo,'') !~ '^[a-z_]{1,64}$'
    OR jsonb_typeof(incoming.veri)<>'object'
    OR (incoming.tutar IS NOT NULL AND (incoming.tutar<0 OR incoming.tutar>=1e12
      OR incoming.tutar<>round(incoming.tutar,2))) THEN
    RAISE EXCEPTION 'Invalid approval fields' USING ERRCODE='22023';
  END IF;
  -- Same stable request id serializes retries; no dynamic target-table writes.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('onay-talebi:' || p_id::text,0));
  SELECT * INTO saved FROM public.onay_kuyrugu WHERE id=p_id FOR UPDATE;
  IF FOUND THEN
    IF saved.buro_id IS DISTINCT FROM p_buro_id OR saved.talep_eden_auth_id IS DISTINCT FROM actor THEN
      RAISE EXCEPTION 'Approval identity collision' USING ERRCODE='42501';
    END IF;
    IF ROW(saved.modul,saved.islem_tipi,saved.hedef_tablo,saved.hedef_kayit_id,
      saved.veri,saved.aciklama,saved.ekler,saved.tutar) IS DISTINCT FROM
      ROW(incoming.modul,incoming.islem_tipi,incoming.hedef_tablo,incoming.hedef_kayit_id,
      incoming.veri,incoming.aciklama,incoming.ekler,incoming.tutar) THEN
      RAISE EXCEPTION 'Request id already contains different data' USING ERRCODE='40001';
    END IF;
  ELSE
    INSERT INTO public.onay_kuyrugu(id,buro_id,talep_eden_auth_id,modul,islem_tipi,
      hedef_tablo,hedef_kayit_id,veri,aciklama,ekler,tutar,durum)
    VALUES(p_id,p_buro_id,actor,incoming.modul,incoming.islem_tipi,incoming.hedef_tablo,
      incoming.hedef_kayit_id,incoming.veri,incoming.aciklama,incoming.ekler,incoming.tutar,'beklemede');
  END IF;
  notifications := lexbase_private.onay_talebi_bildir(p_id);
  RETURN jsonb_build_object('id',p_id,'bildirim_sayisi',notifications);
END;
$function$;
REVOKE ALL ON FUNCTION public.onay_talebi_olustur(uuid,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.onay_talebi_olustur(uuid,uuid,jsonb) TO authenticated;
