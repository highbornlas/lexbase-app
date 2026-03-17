'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

// ── Efor (Zaman) Kaydı ──────────────────────────────────────
export interface EforKaydi {
  id: string;
  tarih: string;
  sure: number;       // dakika cinsinden
  aciklama: string;
  avukat?: string;
  kategori?: string;  // 'Sözleşme İnceleme' | 'Toplantı' | 'Yazışma' | 'Araştırma' | 'Diğer'
}

// ── Danışmanlık Tip Tanımı ──────────────────────────────────
export interface Danismanlik {
  id: string;
  tur?: string;
  muvId?: string;
  konu?: string;
  durum?: string;
  tarih?: string;
  teslimTarih?: string;
  ucret?: number;
  tahsilEdildi?: number;
  aciklama?: string;
  evraklar?: Record<string, unknown>[];
  notlar?: Array<{ id: string; tarih: string; icerik: string }>;
  // Sürekli Danışmanlık
  sozlesmeModeli?: 'tek_seferlik' | 'sureklii';  // tek seferlik / sürekli retainer
  aylikUcret?: number;
  sozlesmeBaslangic?: string;
  sozlesmeBitis?: string;
  taksitDongusu?: 'aylik' | '3aylik' | '6aylik' | 'yillik';
  // Efor / Timesheet
  eforlar?: EforKaydi[];
  toplamEforDk?: number;      // hesaplanan toplam dakika
  // Vergi / SMM
  kdvOrani?: number;
  stopajOrani?: number;
  makbuzKesildi?: boolean;
  makbuzNo?: string;
  makbuzTarih?: string;
  // No
  no?: string;
  // Arşiv & Soft delete
  _arsivlendi?: string;
  _silindi?: string;
  [key: string]: unknown;
}

// ── Danışmanlık Durumları ───────────────────────────────────
export const DANISMANLIK_DURUMLARI = [
  'Taslak',
  'Devam Ediyor',
  'İncelemede',
  'Müvekkil Onayında',
  'Revize Bekliyor',
  'Gönderildi',
  'Tamamlandı',
  'İptal',
] as const;

export const DANISMANLIK_TURLERI = [
  'Hukuki Mütalaa',
  'Sözleşme İnceleme',
  'Sözleşme Hazırlama',
  'Due Diligence',
  'Şirket Danışmanlık',
  'İş Hukuku Danışmanlık',
  'Vergi Danışmanlık',
  'Sürekli Hukuki Danışmanlık',
  'Fikri Mülkiyet Danışmanlık',
  'Gayrimenkul Danışmanlık',
  'Diğer',
] as const;

export const EFOR_KATEGORILERI = [
  'Sözleşme İnceleme',
  'Toplantı',
  'Yazışma / E-posta',
  'Araştırma',
  'Mütalaa Hazırlama',
  'Mahkeme / Duruşma',
  'Telefon Görüşmesi',
  'Belge Hazırlama',
  'Diğer',
] as const;

// ── Tüm Danışmanlıklar (aktif) ─────────────────────────────
export function useDanismanliklar() {
  const buroId = useBuroId();

  return useQuery<Danismanlik[]>({
    queryKey: ['danismanlik', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('danismanlik')
        .select('id, data')
        .eq('buro_id', buroId);
      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }) as Danismanlik)
        .filter((d) => !d._silindi && !d._arsivlendi);
    },
    enabled: !!buroId,
  });
}

// ── Tek Danışmanlık (detay sayfası) ─────────────────────────
export function useDanismanlik(id: string | null) {
  const buroId = useBuroId();

  return useQuery<Danismanlik | null>({
    queryKey: ['danismanlik-detay', id, buroId],
    queryFn: async () => {
      if (!buroId || !id) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('danismanlik')
        .select('id, data')
        .eq('buro_id', buroId)
        .eq('id', id)
        .single();
      if (error) throw error;
      if (!data) return null;
      const kayit = { id: data.id, ...(data.data as object) } as Danismanlik;
      if (kayit._silindi) return null;
      return kayit;
    },
    enabled: !!buroId && !!id,
  });
}

// ── Kaydet (upsert) ────────────────────────────────────────
export function useDanismanlikKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Danismanlik) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('danismanlik').upsert({ id, buro_id: buroId, data });
      if (error) throw error;
    },
    onMutate: async (yeni) => {
      await queryClient.cancelQueries({ queryKey: ['danismanlik', buroId] });
      const onceki = queryClient.getQueryData<Danismanlik[]>(['danismanlik', buroId]);
      queryClient.setQueryData<Danismanlik[]>(['danismanlik', buroId], (eski) => {
        if (!eski) return [yeni];
        const idx = eski.findIndex((d) => d.id === yeni.id);
        if (idx >= 0) { const klon = [...eski]; klon[idx] = yeni; return klon; }
        return [...eski, yeni];
      });
      return { onceki };
    },
    onError: (_err, _yeni, ctx) => {
      if (ctx?.onceki) queryClient.setQueryData(['danismanlik', buroId], ctx.onceki);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['danismanlik'] });
    },
  });
}

// ── Sil (soft delete) ──────────────────────────────────────
export function useDanismanlikSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Danismanlik) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { data: mevcut } = await supabase.from('danismanlik').select('data').eq('id', kayit.id).single();
      const mevcutData = (mevcut?.data as object) || {};
      const { error } = await supabase.from('danismanlik').upsert({
        id: kayit.id, buro_id: buroId,
        data: { ...mevcutData, _silindi: new Date().toISOString() },
      });
      if (error) throw error;
    },
    onMutate: async (kayit) => {
      await queryClient.cancelQueries({ queryKey: ['danismanlik', buroId] });
      const onceki = queryClient.getQueryData<Danismanlik[]>(['danismanlik', buroId]);
      queryClient.setQueryData<Danismanlik[]>(['danismanlik', buroId], (eski) =>
        (eski || []).filter((d) => d.id !== kayit.id)
      );
      return { onceki };
    },
    onError: (_err, _yeni, ctx) => {
      if (ctx?.onceki) queryClient.setQueryData(['danismanlik', buroId], ctx.onceki);
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['danismanlik'] }); },
  });
}

// ── Arşivle ────────────────────────────────────────────────
export function useDanismanlikArsivle() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Danismanlik) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { data: mevcut } = await supabase.from('danismanlik').select('data').eq('id', kayit.id).single();
      const mevcutData = (mevcut?.data as object) || {};
      const { error } = await supabase.from('danismanlik').upsert({
        id: kayit.id, buro_id: buroId,
        data: { ...mevcutData, _arsivlendi: new Date().toISOString() },
      });
      if (error) throw error;
    },
    onMutate: async (kayit) => {
      await queryClient.cancelQueries({ queryKey: ['danismanlik', buroId] });
      const onceki = queryClient.getQueryData<Danismanlik[]>(['danismanlik', buroId]);
      queryClient.setQueryData<Danismanlik[]>(['danismanlik', buroId], (eski) =>
        (eski || []).filter((d) => d.id !== kayit.id)
      );
      return { onceki };
    },
    onError: (_err, _yeni, ctx) => {
      if (ctx?.onceki) queryClient.setQueryData(['danismanlik', buroId], ctx.onceki);
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['danismanlik'] }); },
  });
}
