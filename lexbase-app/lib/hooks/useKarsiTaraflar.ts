'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

/* ══════════════════════════════════════════════════════════════
   Karşı Taraflar Hook — CRUD + Optimistic Update
   Tablo: karsi_taraflar (id, buro_id, data jsonb)
   ══════════════════════════════════════════════════════════════ */

export interface KarsiTaraf {
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
  faks?: string;
  web?: string;
  mail?: string;
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
  aciklama?: string;
  // Etiketler
  etiketler?: unknown[];
  [key: string]: unknown;
}

// ── Tüm Karşı Taraflar ─────────────────────────────────────
export function useKarsiTaraflar() {
  const buroId = useBuroId();

  return useQuery<KarsiTaraf[]>({
    queryKey: ['karsi-taraflar', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('karsi_taraflar')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) {
        if (error.code === '42P01') return []; // tablo yoksa
        throw error;
      }
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }))
        .filter((m) => !(m as Record<string, unknown>)._silindi) as KarsiTaraf[];
    },
    enabled: !!buroId,
  });
}

// ── Tek Karşı Taraf (detay) ─────────────────────────────────
export function useKarsiTaraf(id: string | null) {
  const buroId = useBuroId();

  return useQuery<KarsiTaraf | null>({
    queryKey: ['karsi-taraf', id, buroId],
    queryFn: async () => {
      if (!buroId || !id) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('karsi_taraflar')
        .select('id, data')
        .eq('buro_id', buroId)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;
      return { id: data.id, ...(data.data as object) } as KarsiTaraf;
    },
    enabled: !!buroId && !!id,
  });
}

// ── Kaydet (upsert) ─────────────────────────────────────────
export function useKarsiTarafKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: KarsiTaraf) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('karsi_taraflar').upsert({
        id,
        buro_id: buroId,
        data,
      });
      if (error) throw error;
    },
    onMutate: async (yeniKayit) => {
      await queryClient.cancelQueries({ queryKey: ['karsi-taraflar'] });
      const onceki = queryClient.getQueryData<KarsiTaraf[]>(['karsi-taraflar', buroId]);
      queryClient.setQueryData<KarsiTaraf[]>(['karsi-taraflar', buroId], (eski = []) => {
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
        queryClient.setQueryData(['karsi-taraflar', buroId], context.onceki);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['karsi-taraflar'] });
      queryClient.invalidateQueries({ queryKey: ['karsi-taraf'] });
    },
  });
}

// ── Soft Delete ──────────────────────────────────────────────
export function useKarsiTarafSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { data: existing } = await supabase
        .from('karsi_taraflar')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();
      if (!existing) throw new Error('Kayıt bulunamadı');
      const { error } = await supabase
        .from('karsi_taraflar')
        .update({ data: { ...(existing.data as object), _silindi: new Date().toISOString() } })
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['karsi-taraflar'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}

export function useKarsiTarafKaliciSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase
        .from('karsi_taraflar')
        .delete()
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['karsi-taraflar'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}

export function useKarsiTarafGeriYukle() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { data: existing } = await supabase
        .from('karsi_taraflar')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();
      if (!existing) throw new Error('Kayıt bulunamadı');
      const { _silindi, ...temizData } = existing.data as Record<string, unknown>;
      void _silindi;
      const { error } = await supabase
        .from('karsi_taraflar')
        .update({ data: temizData })
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['karsi-taraflar'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}
