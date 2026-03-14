'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
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
  icerik?: string;
  cevapOzet?: string;
  evraklar?: Record<string, unknown>[];
  notlar?: Record<string, unknown>[];
  // Soft delete / Arşiv
  _silindi?: string;
  _arsivlendi?: string;
  [key: string]: unknown;
}

export function useIhtarnameler() {
  const buroId = useBuroId();

  return useQuery<Ihtarname[]>({
    queryKey: ['ihtarnameler', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ihtarnameler')
        .select('id, data')
        .eq('buro_id', buroId);
      if (error) throw error;
      return (data || []).map((r) => ({ id: r.id, ...(r.data as object) })) as Ihtarname[];
    },
    enabled: !!buroId,
  });
}

/* Arşivlenmiş ihtarnameler */
export function useArsivIhtarnameler() {
  const { data: tumu } = useIhtarnameler();
  return { data: tumu?.filter((i) => i._arsivlendi && !i._silindi) ?? [] };
}

export function useIhtarnameKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Ihtarname) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('ihtarnameler').upsert({ id, buro_id: buroId, data });
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ihtarnameler'] });
    },
  });
}

/* Soft delete — _silindi timestamp */
export function useIhtarnameSil() {
  const kaydet = useIhtarnameKaydet();

  return useMutation({
    mutationFn: async (ihtarname: Ihtarname) => {
      await kaydet.mutateAsync({ ...ihtarname, _silindi: new Date().toISOString() });
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
