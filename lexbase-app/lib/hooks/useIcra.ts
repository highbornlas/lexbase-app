'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

// ── İcra Tip Tanımı (UYAP Uyumlu) ──────────────────────────
export interface Icra {
  id: string;
  sira?: number;
  kayitNo?: number;
  no?: string;
  muvId?: string;
  borclu?: string;
  btc?: string; // borçlu TC
  // Daire bilgileri
  il?: string;
  adliye?: string;
  daire?: string;
  yargiBirimi?: string; // İCRA DAİRESİ | İCRA HUKUK MAHKEMESİ | İCRA CEZA MAHKEMESİ | SATIŞ MEMURLUĞU
  esas?: string; // eski tek alan (geriye uyumlu)
  esasYil?: string;
  esasNo?: string;
  // Tip & durum
  tur?: string; // İcra türü
  durum?: string; // 'Aktif' | 'Takipte' | 'Haciz Aşaması' | 'Satış Aşaması' | 'Kapandı'
  durumAciklama?: string;
  // Kapanış
  kapanisSebebi?: string;
  kapanisTarih?: string;
  // Finansal
  alacak?: number;
  tahsil?: number;
  faiz?: number;
  atur?: string; // alacak türü
  // Tarihler
  tarih?: string; // takip tarihi
  otarih?: string; // ödeme emri tarihi
  tebligTarihi?: string; // tebliğ tarihi (süre hesaplaması için)
  itarih?: string; // itiraz son tarihi (hesaplanmış)
  itirazSonTarih?: string;
  // Taraflar
  muvRol?: string; // 'alacakli' | 'borclu'
  karsiIds?: string[];
  karsiAdlar?: string[];
  karsiId?: string;
  karsi?: string;
  karsavId?: string;
  karsav?: string;
  // Çoklu taraf desteği
  muvekkilTaraflar?: Array<{ id: string; ad: string; vekiller?: Array<{ id: string; ad: string }> }>;
  karsiTaraflar?: Array<{ id: string; ad: string; vekiller?: Array<{ id: string; ad: string }> }>;
  vekiller?: Array<{ id: string; ad: string }>;
  borclular?: Array<{ id: string; ad: string; vekiller?: Array<{ id: string; ad: string }> }>;
  // İlişkiler
  davno?: string; // ilişkili dava numarası
  iliskiliDavaId?: string;
  dayanak?: string;
  // Süreler
  sureler?: Array<{ id: string; tip: string; baslangic: string; gun: number }>;
  // Tebligatlar (PTT Barkod Takibi)
  tebligatlar?: Array<{
    id: string;
    tur?: string; // Ödeme Emri, İcra Emri, Haciz İhbarnamesi, Satış İlanı, Diğer
    alici?: string;
    tarih?: string; // gönderim tarihi
    pttBarkod?: string;
    tebligDurum?: string; // Gönderilmedi, PTT'de Bekliyor, Tebliğ Edildi, İade Döndü
    tebligTarih?: string;
    pttSonSorgu?: string;
    pttSonuc?: string;
    not?: string;
  }>;
  // Alacak kalemleri
  alacakKalemleri?: {
    asilAlacak?: number;
    islemisiFaiz?: number;
    davaMasrafi?: number;
    vekaletUcreti?: number;
    icraHarci?: number;
    digerMasraflar?: number;
  };
  // Haciz kayıtları
  hacizler?: Array<{
    id: string;
    tarih: string;
    tur: 'banka' | 'maas' | 'tasinir' | 'tasinmaz' | 'arac' | 'diger';
    aciklama: string;
    kurum?: string;
    tutar?: number;
    durum: 'talep_edildi' | 'uygulandi' | 'kaldirildi' | 'sonucsuz';
  }>;
  // Ödeme planı
  odemePlani?: {
    aktif: boolean;
    toplamTutar: number;
    taksitSayisi: number;
    baslangicTarihi: string;
    taksitler: Array<{
      id: string;
      no: number;
      vadeTarihi: string;
      tutar: number;
      odpiYapildiMi: boolean;
      odemeTarihi?: string;
    }>;
  };
  // Borçlu detay bilgileri
  borcluDetay?: {
    tcVkn?: string;
    adres?: string;
    isveren?: string;
    isverenAdres?: string;
    bankaHesaplari?: string[];
    aracPlakalari?: string[];
    tasinmazlar?: string[];
  };
  // Alt veriler
  evraklar?: Record<string, unknown>[];
  notlar?: Record<string, unknown>[];
  harcamalar?: Array<{ id: string; kat?: string; acik?: string; tarih?: string; tutar: number }>;
  tahsilatlar?: Array<{ id: string; tur: string; tutar: number; tarih?: string; acik?: string; kdvOrani?: number; stopajOrani?: number; makbuzKesildi?: boolean; makbuzNo?: string; makbuzTarih?: string }>;
  anlasma?: Record<string, unknown>;
  not?: string;
  // Arşiv & Soft delete
  _arsivlendi?: string;
  _silindi?: string;
  [key: string]: unknown;
}

// ── Tüm İcra Dosyaları (soft delete filtreli) ──────────────
export function useIcralar() {
  const buroId = useBuroId();

  return useQuery<Icra[]>({
    queryKey: ['icra', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('icra')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }) as Icra)
        .filter((i) => !i._silindi && !i._arsivlendi);
    },
    enabled: !!buroId,
  });
}

// ── Arşivlenmiş İcra Dosyaları ───────────────────────────────
export function useArsivIcralar() {
  const buroId = useBuroId();

  return useQuery<Icra[]>({
    queryKey: ['icra-arsiv', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('icra')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }) as Icra)
        .filter((i) => i._arsivlendi && !i._silindi);
    },
    enabled: !!buroId,
  });
}

// ── Tek İcra (detay sayfası) ─────────────────────────────────
export function useIcra(id: string | null) {
  const buroId = useBuroId();

  return useQuery<Icra | null>({
    queryKey: ['icra-detay', id, buroId],
    queryFn: async () => {
      if (!buroId || !id) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('icra')
        .select('id, data')
        .eq('buro_id', buroId)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;
      const kayit = { id: data.id, ...(data.data as object) } as Icra;
      if (kayit._silindi) return null;
      return kayit;
    },
    enabled: !!buroId && !!id,
  });
}

// ── Kaydet (upsert) — optimistic update ─────────────────────
export function useIcraKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Icra) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('icra').upsert({
        id,
        buro_id: buroId,
        data,
      });
      if (error) throw error;
    },
    onMutate: async (yeniIcra) => {
      await queryClient.cancelQueries({ queryKey: ['icra', buroId] });
      const onceki = queryClient.getQueryData<Icra[]>(['icra', buroId]);

      queryClient.setQueryData<Icra[]>(['icra', buroId], (eski) => {
        if (!eski) return [yeniIcra];
        const idx = eski.findIndex((i) => i.id === yeniIcra.id);
        if (idx >= 0) {
          const klon = [...eski];
          klon[idx] = yeniIcra;
          return klon;
        }
        return [...eski, yeniIcra];
      });

      return { onceki };
    },
    onError: (_err, _yeni, ctx) => {
      if (ctx?.onceki) {
        queryClient.setQueryData(['icra', buroId], ctx.onceki);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['icra'] });
      queryClient.invalidateQueries({ queryKey: ['icra-detay'] });
    },
  });
}

// ── Soft Delete ─────────────────────────────────────────────
export function useIcraSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();

      const { data: mevcut } = await supabase
        .from('icra')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();

      if (!mevcut) throw new Error('İcra dosyası bulunamadı');

      const { error } = await supabase.from('icra').update({
        data: { ...(mevcut.data as object), _silindi: new Date().toISOString() },
      }).eq('id', id).eq('buro_id', buroId);

      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['icra'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}

// ── Kalıcı Sil ──────────────────────────────────────────────
export function useIcraKaliciSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase
        .from('icra')
        .delete()
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['icra'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}

// ── Geri Yükle ──────────────────────────────────────────────
export function useIcraGeriYukle() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();

      const { data: mevcut } = await supabase
        .from('icra')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();

      if (!mevcut) throw new Error('İcra dosyası bulunamadı');

      const data = { ...(mevcut.data as Record<string, unknown>) };
      delete data._silindi;

      const { error } = await supabase.from('icra').update({ data })
        .eq('id', id).eq('buro_id', buroId);

      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['icra'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}

// ── Arşive Kaldır ────────────────────────────────────────────
export function useIcraArsivle() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();

      const { data: mevcut } = await supabase
        .from('icra')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();

      if (!mevcut) throw new Error('İcra dosyası bulunamadı');

      const { error } = await supabase.from('icra').update({
        data: { ...(mevcut.data as object), _arsivlendi: new Date().toISOString() },
      }).eq('id', id).eq('buro_id', buroId);

      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['icra'] });
      queryClient.invalidateQueries({ queryKey: ['icra-arsiv'] });
    },
  });
}

// ── Arşivden Çıkar ───────────────────────────────────────────
export function useIcraArsivdenCikar() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();

      const { data: mevcut } = await supabase
        .from('icra')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();

      if (!mevcut) throw new Error('İcra dosyası bulunamadı');

      const data = { ...(mevcut.data as Record<string, unknown>) };
      delete data._arsivlendi;

      const { error } = await supabase.from('icra').update({ data })
        .eq('id', id).eq('buro_id', buroId);

      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['icra'] });
      queryClient.invalidateQueries({ queryKey: ['icra-arsiv'] });
    },
  });
}
