import { createClient } from '@/lib/supabase/client';

/**
 * Bildirim gonderme yardimci fonksiyonu.
 * bildirim_olustur RPC'sini kullanarak bildirimler tablosuna kayit ekler.
 *
 * Kullanim alanlari:
 * - Gorev atandiginda -> atanan kisiye bildirim
 * - Onay talebi olusturuldugunda -> yoneticiye bildirim
 * - Durusma yaklastiginda -> ilgili avukata bildirim
 */
export async function bildirimGonder(params: {
  buroId: string;
  hedefAuthId: string;
  baslik: string;
  mesaj: string;
  tur?: 'bilgi' | 'uyari' | 'kritik' | 'hatirlatma';
  link?: string;
  ilgiliId?: string;
  ilgiliTur?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('bildirim_olustur', {
    p_buro_id: params.buroId,
    p_hedef_auth_id: params.hedefAuthId,
    p_baslik: params.baslik,
    p_mesaj: params.mesaj,
    p_tur: params.tur || 'bilgi',
    p_link: params.link || null,
    p_ilgili_id: params.ilgiliId || null,
    p_ilgili_tur: params.ilgiliTur || null,
  });
  if (error) console.warn('[Bildirim] Gonderilemedi:', error.message);
  return data;
}

/**
 * Gorev atama bildirimi gonder
 */
export async function gorevAtamaBildirimi(params: {
  buroId: string;
  atananAuthId: string;
  gorevBaslik: string;
  gorevId?: string;
}) {
  return bildirimGonder({
    buroId: params.buroId,
    hedefAuthId: params.atananAuthId,
    baslik: 'Yeni gorev atandi',
    mesaj: params.gorevBaslik,
    tur: 'bilgi',
    link: '/gorevler',
    ilgiliId: params.gorevId,
    ilgiliTur: 'gorev',
  });
}

/**
 * Onay talebi bildirimi gonder
 */
export async function onayTalebiBildirimi(params: {
  buroId: string;
  yoneticiAuthId: string;
  talepBaslik: string;
  link?: string;
}) {
  return bildirimGonder({
    buroId: params.buroId,
    hedefAuthId: params.yoneticiAuthId,
    baslik: 'Yeni onay talebi',
    mesaj: params.talepBaslik,
    tur: 'uyari',
    link: params.link || '/ayarlar',
  });
}

/**
 * Durusma hatirlatma bildirimi gonder
 */
export async function durusmaHatirlatmaBildirimi(params: {
  buroId: string;
  hedefAuthId: string;
  durusmaBilgi: string;
  link?: string;
  ilgiliId?: string;
}) {
  return bildirimGonder({
    buroId: params.buroId,
    hedefAuthId: params.hedefAuthId,
    baslik: 'Durusma yaklashiyor',
    mesaj: params.durusmaBilgi,
    tur: 'hatirlatma',
    link: params.link || '/takvim',
    ilgiliId: params.ilgiliId,
    ilgiliTur: 'dava',
  });
}
