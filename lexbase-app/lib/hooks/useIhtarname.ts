'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { masraflariKoruyarakDosyaKaydet } from '@/lib/data/financeCashTransaction';
import { raporKaydiGorunurMu } from '@/lib/finans/gelirKurallari';
import { useBuroId } from './useBuro';

export interface Ihtarname {
  id: string;
  no?: string;
  muvId?: string;
  konu?: string;
  tur?: string; // İhtar, İhbarname, Fesih İhtarı, Ödeme İhtarı, Tahliye İhtarı
  yon?: string; // 'giden' | 'gelen'
  durum?: string; // Taslak, Hazırlandı, Gönderildi, Tebliğ Edildi, Cevap Geldi, Sonuçlandı
  gonderen?: string;
  alici?: string;
  aliciAdres?: string;
  noterAd?: string;
  noterNo?: string;
  tarih?: string;
  gonderimTarih?: string;
  // Tebliğ & Süre Takibi
  tebligDurum?: string; // Gönderilmedi, PTT'de Bekliyor, Tebliğ Edildi, İade Döndü
  tebligTarih?: string;
  cevapSuresi?: number; // gün cinsinden
  sureSonu?: string; // hesaplanmış son tarih
  // PTT Barkod
  pttBarkod?: string;
  pttSonSorgu?: string; // son sorgulama tarihi
  pttSonuc?: string; // son sorgulama sonucu
  //
  cevapTarih?: string;
  ucret?: number;
  tahsilEdildi?: number;
  noterMasrafi?: number;
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
  icerik?: string;
  cevapOzet?: string;
  // İlişkili dosya
  iliskiliDosyaTip?: 'dava' | 'icra' | '';
  iliskiliDosyaId?: string;
  evraklar?: Record<string, unknown>[];
  notlar?: Record<string, unknown>[];
  // Soft delete / Arşiv
  _silindi?: string;
  _arsivlendi?: string;
  [key: string]: unknown;
}

export function useIhtarnameler(includeArchived = false) {
  const buroId = useBuroId();

  return useQuery<Ihtarname[]>({
    queryKey: includeArchived ? ['ihtarnameler', buroId, 'finans'] : ['ihtarnameler', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ihtarnameler')
        .select('id, data')
        .eq('buro_id', buroId);
      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }) as Ihtarname)
        .filter((i) => raporKaydiGorunurMu(i, includeArchived));
    },
    enabled: !!buroId,
  });
}

/* Tek İhtarname (detay) */
export function useIhtarname(id: string | null) {
  const buroId = useBuroId();

  return useQuery<Ihtarname | null>({
    queryKey: ['ihtarname-detay', id, buroId],
    queryFn: async () => {
      if (!buroId || !id) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ihtarnameler')
        .select('id, data')
        .eq('buro_id', buroId)
        .eq('id', id)
        .single();
      if (error) throw error;
      if (!data) return null;
      const kayit = { id: data.id, ...(data.data as object) } as Ihtarname;
      if (kayit._silindi) return null;
      return kayit;
    },
    enabled: !!buroId && !!id,
  });
}

/* Arşivlenmiş ihtarnameler */
export function useArsivIhtarnameler() {
  const buroId = useBuroId();
  return useQuery<Ihtarname[]>({
    queryKey: ['ihtarnameler-arsiv', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase.from('ihtarnameler')
        .select('id, data').eq('buro_id', buroId);
      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }) as Ihtarname)
        .filter((i) => !!i._arsivlendi && !i._silindi);
    },
    enabled: !!buroId,
  });
}

export function useIhtarnameKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Ihtarname) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      await masraflariKoruyarakDosyaKaydet(supabase, buroId, 'İhtarname', { ...kayit });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ihtarnameler'] });
      queryClient.invalidateQueries({ queryKey: ['ihtarnameler-arsiv'] });
      queryClient.invalidateQueries({ queryKey: ['ihtarname-detay'] });
      queryClient.invalidateQueries({ queryKey: ['finans'] });
    },
  });
}

/* Soft delete — _silindi timestamp */
export function useIhtarnameSil() {
  const kaydet = useIhtarnameKaydet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ihtarname: Ihtarname) => {
      await kaydet.mutateAsync({ ...ihtarname, _silindi: new Date().toISOString() });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}

/* Geri Yükle — _silindi flag'i kaldır */
export function useIhtarnameGeriYukle() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();

      const { data: mevcut } = await supabase
        .from('ihtarnameler')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();

      if (!mevcut) throw new Error('İhtarname bulunamadı');

      const data = { ...(mevcut.data as Record<string, unknown>) };
      delete data._silindi;

      const { error } = await supabase.from('ihtarnameler').update({ data })
        .eq('id', id).eq('buro_id', buroId);

      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ihtarnameler'] });
      queryClient.invalidateQueries({ queryKey: ['ihtarnameler-arsiv'] });
      queryClient.invalidateQueries({ queryKey: ['ihtarname-detay'] });
      queryClient.invalidateQueries({ queryKey: ['finans'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}

/* Hard delete — Supabase'den tamamen sil */
export function useIhtarnameHardSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase.from('ihtarnameler').delete().eq('id', id).eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ihtarnameler'] });
      queryClient.invalidateQueries({ queryKey: ['ihtarnameler-arsiv'] });
      queryClient.invalidateQueries({ queryKey: ['ihtarname-detay'] });
      queryClient.invalidateQueries({ queryKey: ['finans'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}

/* Arşivle */
export function useIhtarnameArsivle() {
  const kaydet = useIhtarnameKaydet();

  return useMutation({
    mutationFn: async (ihtarname: Ihtarname) => {
      await kaydet.mutateAsync({ ...ihtarname, _arsivlendi: new Date().toISOString() });
    },
  });
}

/* Arşivden çıkar */
export function useIhtarnameArsivdenCikar() {
  const kaydet = useIhtarnameKaydet();

  return useMutation({
    mutationFn: async (ihtarname: Ihtarname) => {
      const { _arsivlendi, ...rest } = ihtarname;
      void _arsivlendi;
      await kaydet.mutateAsync({ ...rest, _arsivlendi: undefined });
    },
  });
}
