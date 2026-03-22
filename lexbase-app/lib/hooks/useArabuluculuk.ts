'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

// ── Oturum Kaydı ─────────────────────────────────────────────
export interface OturumKaydi {
  id: string;
  tarih: string;
  saat?: string;
  sure?: number;       // dakika
  yer?: string;
  ozet?: string;
  sonuc?: string;      // 'Devam' | 'Ertelendi' | 'Anlaşma' | 'Anlaşamama'
  katilimcilar?: string;
}

// ── Yasal Süre Haritası (hafta) ──────────────────────────────
export const YASAL_SURE_HAFTA: Record<string, number> = {
  'Ticari': 8,
  'İş': 4,
  'Tüketici': 4,
  'Aile': 4,
  'Kira': 4,
  'Ortaklık': 8,
};

// ── Arabuluculuk Tip Tanımı ──────────────────────────────────
export interface Arabuluculuk {
  id: string;
  no?: string;
  muvId?: string;
  konu?: string;
  tur?: string;
  durum?: string;
  arabulucu?: string;
  basvuruTarih?: string;
  ilkOturumTarih?: string;
  sonOturumTarih?: string;
  sonucTarih?: string;
  // Karşı taraf — rehber entegrasyonu
  karsiTaraf?: string;
  karsiTarafId?: string;
  karsiTarafVekil?: string;
  // Finansal
  talep?: number;
  anlasmaUcret?: number;
  ucret?: number;
  tahsilEdildi?: number;
  // Vergi / SMM
  kdvOrani?: number;
  stopajOrani?: number;
  makbuzKesildi?: boolean;
  makbuzNo?: string;
  makbuzTarih?: string;
  // Taksitli ödeme planı
  odemePlani?: {
    aktif: boolean;
    toplamTutar: number;
    taksitSayisi: number;
    baslangicTarihi: string;
    taksitler: Array<{
      id: string; no: number; vadeTarihi: string; tutar: number;
      odpiYapildiMi: boolean; odemeTarihi?: string;
    }>;
  };
  oturumSayisi?: number;
  aciklama?: string;
  evraklar?: Record<string, unknown>[];
  notlar?: Array<{ id: string; tarih: string; icerik: string }>;
  // Oturumlar
  oturumlar?: OturumKaydi[];
  // Yasal süre
  yasalSureBitis?: string;       // hesaplanan yasal bitiş
  sureUzatmaHafta?: number;      // uzatma haftası (0/2/4)
  // İlişkili dosya
  iliskiliDosyaTip?: 'dava' | 'icra';
  iliskiliDosyaId?: string;
  // Son tutanak (anlaşamama)
  sonTutanakNo?: string;
  // Takvim etkinlik ID (otomatik oluşturulan)
  takvimEtkinlikId?: string;
  // Arşiv & Soft delete
  _arsivlendi?: string;
  _silindi?: string;
  [key: string]: unknown;
}

// ── Durumlar ────────────────────────────────────────────────
export const ARABULUCULUK_DURUMLARI = [
  'Başvuru',
  'Arabulucu Atandı',
  'Görüşme',
  'Anlaşma',
  'Anlaşamama',
  'İptal',
] as const;

export const ARABULUCULUK_TURLERI = [
  'Ticari',
  'İş',
  'Tüketici',
  'Aile',
  'Kira',
  'Ortaklık',
] as const;

// ── Yasal süre hesaplama ────────────────────────────────────
export function hesaplaYasalSureBitis(
  tur: string | undefined,
  ilkOturumTarih: string | undefined,
  sureUzatmaHafta: number = 0
): string | null {
  if (!tur || !ilkOturumTarih) return null;
  const hafta = YASAL_SURE_HAFTA[tur];
  if (!hafta) return null;
  const baslangic = new Date(ilkOturumTarih);
  if (isNaN(baslangic.getTime())) return null;
  const toplamHafta = hafta + sureUzatmaHafta;
  baslangic.setDate(baslangic.getDate() + toplamHafta * 7);
  return baslangic.toISOString().split('T')[0];
}

// ── Tüm Arabuluculuklar (aktif) ─────────────────────────────
export function useArabuluculuklar() {
  const buroId = useBuroId();

  return useQuery<Arabuluculuk[]>({
    queryKey: ['arabuluculuk', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('arabuluculuk')
        .select('id, data')
        .eq('buro_id', buroId);
      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }) as Arabuluculuk)
        .filter((a) => !a._silindi && !a._arsivlendi);
    },
    enabled: !!buroId,
  });
}

// ── Tek Arabuluculuk (detay) ────────────────────────────────
export function useArabuluculuk(id: string | null) {
  const buroId = useBuroId();

  return useQuery<Arabuluculuk | null>({
    queryKey: ['arabuluculuk-detay', id, buroId],
    queryFn: async () => {
      if (!buroId || !id) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('arabuluculuk')
        .select('id, data')
        .eq('buro_id', buroId)
        .eq('id', id)
        .single();
      if (error) throw error;
      if (!data) return null;
      const kayit = { id: data.id, ...(data.data as object) } as Arabuluculuk;
      if (kayit._silindi) return null;
      return kayit;
    },
    enabled: !!buroId && !!id,
  });
}

// ── Kaydet (upsert) ────────────────────────────────────────
export function useArabuluculukKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Arabuluculuk) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('arabuluculuk').upsert({ id, buro_id: buroId, data });
      if (error) throw error;
    },
    onMutate: async (yeni) => {
      await queryClient.cancelQueries({ queryKey: ['arabuluculuk', buroId] });
      const onceki = queryClient.getQueryData<Arabuluculuk[]>(['arabuluculuk', buroId]);
      queryClient.setQueryData<Arabuluculuk[]>(['arabuluculuk', buroId], (eski) => {
        if (!eski) return [yeni];
        const idx = eski.findIndex((a) => a.id === yeni.id);
        if (idx >= 0) { const klon = [...eski]; klon[idx] = yeni; return klon; }
        return [...eski, yeni];
      });
      return { onceki };
    },
    onError: (_err, _yeni, ctx) => {
      if (ctx?.onceki) queryClient.setQueryData(['arabuluculuk', buroId], ctx.onceki);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['arabuluculuk'] });
    },
  });
}

// ── Sil (soft delete) ──────────────────────────────────────
export function useArabuluculukSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Arabuluculuk) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { data: mevcut } = await supabase.from('arabuluculuk').select('data').eq('id', kayit.id).single();
      const mevcutData = (mevcut?.data as object) || {};
      const { error } = await supabase.from('arabuluculuk').upsert({
        id: kayit.id, buro_id: buroId,
        data: { ...mevcutData, _silindi: new Date().toISOString() },
      });
      if (error) throw error;
    },
    onMutate: async (kayit) => {
      await queryClient.cancelQueries({ queryKey: ['arabuluculuk', buroId] });
      const onceki = queryClient.getQueryData<Arabuluculuk[]>(['arabuluculuk', buroId]);
      queryClient.setQueryData<Arabuluculuk[]>(['arabuluculuk', buroId], (eski) =>
        (eski || []).filter((a) => a.id !== kayit.id)
      );
      return { onceki };
    },
    onError: (_err, _yeni, ctx) => {
      if (ctx?.onceki) queryClient.setQueryData(['arabuluculuk', buroId], ctx.onceki);
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['arabuluculuk'] }); },
  });
}

// ── Arşivle ────────────────────────────────────────────────
export function useArabuluculukArsivle() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Arabuluculuk) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { data: mevcut } = await supabase.from('arabuluculuk').select('data').eq('id', kayit.id).single();
      const mevcutData = (mevcut?.data as object) || {};
      const { error } = await supabase.from('arabuluculuk').upsert({
        id: kayit.id, buro_id: buroId,
        data: { ...mevcutData, _arsivlendi: new Date().toISOString() },
      });
      if (error) throw error;
    },
    onMutate: async (kayit) => {
      await queryClient.cancelQueries({ queryKey: ['arabuluculuk', buroId] });
      const onceki = queryClient.getQueryData<Arabuluculuk[]>(['arabuluculuk', buroId]);
      queryClient.setQueryData<Arabuluculuk[]>(['arabuluculuk', buroId], (eski) =>
        (eski || []).filter((a) => a.id !== kayit.id)
      );
      return { onceki };
    },
    onError: (_err, _yeni, ctx) => {
      if (ctx?.onceki) queryClient.setQueryData(['arabuluculuk', buroId], ctx.onceki);
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['arabuluculuk'] }); },
  });
}

// ── Kalıcı Sil ──────────────────────────────────────────────
export function useArabuluculukKaliciSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase
        .from('arabuluculuk')
        .delete()
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['arabuluculuk'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}

// ── Geri Yükle ──────────────────────────────────────────────
export function useArabuluculukGeriYukle() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { data: mevcut } = await supabase
        .from('arabuluculuk')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();
      if (!mevcut) throw new Error('Arabuluculuk bulunamadı');
      const data = { ...(mevcut.data as Record<string, unknown>) };
      delete data._silindi;
      const { error } = await supabase.from('arabuluculuk').update({ data })
        .eq('id', id).eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['arabuluculuk'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}
