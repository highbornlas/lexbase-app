'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

// ── Müvekkil Tip Tanımı ──────────────────────────────────────
export interface Muvekkil {
  id: string;
  sira?: number;
  kayitNo?: number;
  tip?: 'gercek' | 'tuzel';
  ad: string;
  soyad?: string;
  // Gerçek kişi
  tc?: string;
  yabanciKimlikNo?: string;
  dogum?: string;
  dogumYeri?: string;
  uyruk?: string;
  pasaport?: string;
  meslek?: string;
  // Tüzel kişi
  unvan?: string;
  sirketTur?: string;
  vergiNo?: string;
  vergiDairesi?: string;
  mersis?: string;
  ticaretSicil?: string;
  yetkiliAd?: string;
  yetkiliUnvan?: string;
  yetkiliTc?: string;
  yetkiliTel?: string;
  // İletişim
  tel?: string;
  mail?: string;
  faks?: string;
  web?: string;
  uets?: string;
  adres?: Record<string, string>; // eski (backward compat)
  adresler?: Array<Record<string, string>>;
  // Finans
  bankalar?: Array<{
    banka?: string;
    sube?: string;
    iban?: string;
    hesapNo?: string;
    hesapAd?: string;
  }>;
  // Notlar
  not?: string;
  // Etiketler
  etiketler?: unknown[];
  // İlişkiler
  iliskiler?: Array<{
    id: string;
    hedefId: string;
    tur: string;
    acik?: string;
  }>;
  [key: string]: unknown;
}

// ── Tüm Müvekkiller ──────────────────────────────────────────
export function useMuvekkillar() {
  const buroId = useBuroId();

  return useQuery<Muvekkil[]>({
    queryKey: ['muvekkillar', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('muvekkillar')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }))
        .filter((m) => !(m as Record<string, unknown>)._silindi) as Muvekkil[];
    },
    enabled: !!buroId,
  });
}

// ── Tek Müvekkil (detay sayfası) ──────────────────────────────
export function useMuvekkil(id: string | null) {
  const buroId = useBuroId();

  return useQuery<Muvekkil | null>({
    queryKey: ['muvekkil', id, buroId],
    queryFn: async () => {
      if (!buroId || !id) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('muvekkillar')
        .select('id, data')
        .eq('buro_id', buroId)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;
      return { id: data.id, ...(data.data as object) } as Muvekkil;
    },
    enabled: !!buroId && !!id,
  });
}

// ── Yardımcı: JSONB data içinden muvId ve _silindi filtreleme ──
// Supabase JSONB operatörü: data->>'muvId' ile server-side filtreleme
// Bu sayede tüm tabloyu çekip client-side filtreleme yapmıyoruz (N+1 sorunu çözümü)
async function fetchMuvDosyalar(
  supabase: ReturnType<typeof createClient>,
  tablo: string,
  buroId: string,
  muvId: string,
) {
  // data->>muvId ile server-side filtreleme
  // Çoklu müvekkil desteği: muvekkilTaraflar JSONB dizisinde de muvId olabilir
  // Ancak temel filtreyi DB'de yapıp muvekkilTaraflar kontrolünü client-side'da yapıyoruz
  const { data, error } = await supabase
    .from(tablo)
    .select('id, data')
    .eq('buro_id', buroId)
    .or(`data->>muvId.eq.${muvId},data->muvekkilTaraflar.cs.[{"id":"${muvId}"}]`);

  if (error) throw error;

  return (data || [])
    .map((r) => ({ id: r.id, ...(r.data as object) }))
    .filter((d: Record<string, unknown>) => !d._silindi);
}

// ── Müvekkile bağlı davalar ───────────────────────────────────
export function useMuvDavalar(muvId: string | null) {
  const buroId = useBuroId();

  return useQuery({
    queryKey: ['davalar', 'muv', muvId, buroId],
    queryFn: async () => {
      if (!buroId || !muvId) return [];
      const supabase = createClient();
      return fetchMuvDosyalar(supabase, 'davalar', buroId, muvId);
    },
    enabled: !!buroId && !!muvId,
  });
}

// ── Müvekkile bağlı icra dosyaları ────────────────────────────
export function useMuvIcralar(muvId: string | null) {
  const buroId = useBuroId();

  return useQuery({
    queryKey: ['icra', 'muv', muvId, buroId],
    queryFn: async () => {
      if (!buroId || !muvId) return [];
      const supabase = createClient();
      return fetchMuvDosyalar(supabase, 'icra', buroId, muvId);
    },
    enabled: !!buroId && !!muvId,
  });
}

// ── Müvekkile bağlı arabuluculuk dosyaları ────────────────────
export function useMuvArabuluculuklar(muvId: string | null) {
  const buroId = useBuroId();

  return useQuery({
    queryKey: ['arabuluculuk', 'muv', muvId, buroId],
    queryFn: async () => {
      if (!buroId || !muvId) return [];
      const supabase = createClient();
      return fetchMuvDosyalar(supabase, 'arabuluculuk', buroId, muvId);
    },
    enabled: !!buroId && !!muvId,
  });
}

// ── Müvekkile bağlı ihtarnameler ──────────────────────────────
export function useMuvIhtarnameler(muvId: string | null) {
  const buroId = useBuroId();

  return useQuery({
    queryKey: ['ihtarnameler', 'muv', muvId, buroId],
    queryFn: async () => {
      if (!buroId || !muvId) return [];
      const supabase = createClient();
      return fetchMuvDosyalar(supabase, 'ihtarnameler', buroId, muvId);
    },
    enabled: !!buroId && !!muvId,
  });
}

// ── Kaydet (upsert) ───────────────────────────────────────────
export function useMuvekkilKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Muvekkil) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('muvekkillar').upsert({
        id,
        buro_id: buroId,
        data,
      });
      if (error) throw error;
    },
    onMutate: async (yeniKayit) => {
      await queryClient.cancelQueries({ queryKey: ['muvekkillar'] });
      const onceki = queryClient.getQueryData<Muvekkil[]>(['muvekkillar', buroId]);
      queryClient.setQueryData<Muvekkil[]>(['muvekkillar', buroId], (eski = []) => {
        const idx = eski.findIndex((m) => m.id === yeniKayit.id);
        if (idx >= 0) {
          const yeni = [...eski];
          yeni[idx] = yeniKayit;
          return yeni;
        }
        return [...eski, yeniKayit];
      });
      return { onceki };
    },
    onError: (_err, _kayit, context) => {
      if (context?.onceki) {
        queryClient.setQueryData(['muvekkillar', buroId], context.onceki);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['muvekkillar'] });
      queryClient.invalidateQueries({ queryKey: ['muvekkil'] });
    },
  });
}

// ── Cascade Helper — Müvekkil bağlantısını kes (dosyayı silme!) ──
const ILISKILI_TABLOLAR = ['davalar', 'icra', 'arabuluculuk', 'danismanlik', 'ihtarnameler'] as const;

/** Müvekkil soft-delete: dosyalardaki muvId bağlantısını temizle */
async function cascadeUnlinkMuvekkil(supabase: ReturnType<typeof createClient>, buroId: string, muvId: string) {
  for (const tablo of ILISKILI_TABLOLAR) {
    // Server-side filtreleme: sadece bu müvekkile ait kayıtları çek
    const { data: kayitlar } = await supabase
      .from(tablo)
      .select('id, data')
      .eq('buro_id', buroId)
      .or(`data->>muvId.eq.${muvId}`);
    if (!kayitlar) continue;
    for (const k of kayitlar) {
      const d = k.data as Record<string, unknown>;
      if (d.muvId === muvId) {
        await supabase.from(tablo).update({
          data: { ...d, muvId: '', _eskiMuvId: muvId },
        }).eq('id', k.id).eq('buro_id', buroId);
      }
    }
  }
}

/** Müvekkil kalıcı sil: dosyalardaki muvId bağlantısını temizle (dosya silinmez) */
async function cascadeUnlinkHard(supabase: ReturnType<typeof createClient>, buroId: string, muvId: string) {
  for (const tablo of ILISKILI_TABLOLAR) {
    const { data: kayitlar } = await supabase
      .from(tablo)
      .select('id, data')
      .eq('buro_id', buroId)
      .or(`data->>muvId.eq.${muvId},data->>_eskiMuvId.eq.${muvId}`);
    if (!kayitlar) continue;
    for (const k of kayitlar) {
      const d = k.data as Record<string, unknown>;
      if (d.muvId === muvId || d._eskiMuvId === muvId) {
        const { _eskiMuvId, ...temiz } = d;
        void _eskiMuvId;
        await supabase.from(tablo).update({
          data: { ...temiz, muvId: '' },
        }).eq('id', k.id).eq('buro_id', buroId);
      }
    }
  }
}

/** Müvekkil geri yükle: _eskiMuvId varsa bağlantıyı geri kur */
async function cascadeRelinkMuvekkil(supabase: ReturnType<typeof createClient>, buroId: string, muvId: string) {
  for (const tablo of ILISKILI_TABLOLAR) {
    const { data: kayitlar } = await supabase
      .from(tablo)
      .select('id, data')
      .eq('buro_id', buroId)
      .or(`data->>_eskiMuvId.eq.${muvId}`);
    if (!kayitlar) continue;
    for (const k of kayitlar) {
      const d = k.data as Record<string, unknown>;
      if (d._eskiMuvId === muvId) {
        const { _eskiMuvId, ...temiz } = d;
        void _eskiMuvId;
        await supabase.from(tablo).update({
          data: { ...temiz, muvId },
        }).eq('id', k.id).eq('buro_id', buroId);
      }
    }
  }
}

const CASCADE_INVALIDATE_KEYS = ['davalar', 'icra', 'arabuluculuk', 'danismanlik', 'ihtarnameler', 'belgeler'];

// ── Soft Delete (çöp kutusuna taşı) ──────────────────────────
export function useMuvekkilSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { data: existing } = await supabase
        .from('muvekkillar')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();
      if (!existing) throw new Error('Kayıt bulunamadı');
      const { error } = await supabase
        .from('muvekkillar')
        .update({ data: { ...(existing.data as object), _silindi: new Date().toISOString() } })
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
      // Cascade: İlişkili dosyalardaki müvekkil bağlantısını kes
      await cascadeUnlinkMuvekkil(supabase, buroId, id);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['muvekkillar'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
      CASCADE_INVALIDATE_KEYS.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    },
  });
}

// ── Kalıcı Sil (gerçekten sil) ───────────────────────────────
export function useMuvekkilKaliciSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      // Cascade: İlişkili dosyalardaki müvekkil bağlantısını kalıcı temizle
      await cascadeUnlinkHard(supabase, buroId, id);
      const { error } = await supabase
        .from('muvekkillar')
        .delete()
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['muvekkillar'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
      CASCADE_INVALIDATE_KEYS.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    },
  });
}

// ── Geri Yükle (soft delete'i kaldır) ────────────────────────
export function useMuvekkilGeriYukle() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { data: existing } = await supabase
        .from('muvekkillar')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();
      if (!existing) throw new Error('Kayıt bulunamadı');
      const { _silindi, ...temizData } = existing.data as Record<string, unknown>;
      void _silindi;
      const { error } = await supabase
        .from('muvekkillar')
        .update({ data: temizData })
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
      // Cascade: İlişkili dosyalardaki müvekkil bağlantısını geri kur
      await cascadeRelinkMuvekkil(supabase, buroId, id);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['muvekkillar'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
      CASCADE_INVALIDATE_KEYS.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    },
  });
}
