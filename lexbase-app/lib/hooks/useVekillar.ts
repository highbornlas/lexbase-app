'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

/* ══════════════════════════════════════════════════════════════
   Vekillar (Avukatlar) Hook — CRUD + Optimistic Update
   Tablo: vekillar (id, buro_id, data jsonb)
   ══════════════════════════════════════════════════════════════ */

export interface Vekil {
  id: string;
  sira?: number;
  kayitNo?: number;
  ad: string;
  soyad?: string;
  baro?: string;
  baroSicil?: string;
  tbbSicil?: string;
  // İletişim
  tel?: string;
  mail?: string;
  uets?: string;
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

// ── Tüm Vekillar ───────────────────────────────────────────
export function useVekillar() {
  const buroId = useBuroId();

  return useQuery<Vekil[]>({
    queryKey: ['vekillar', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('vekillar')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }))
        .filter((m) => !(m as Record<string, unknown>)._silindi) as Vekil[];
    },
    enabled: !!buroId,
  });
}

// ── Tek Vekil (detay) ───────────────────────────────────────
export function useVekil(id: string | null) {
  const buroId = useBuroId();

  return useQuery<Vekil | null>({
    queryKey: ['vekil', id, buroId],
    queryFn: async () => {
      if (!buroId || !id) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('vekillar')
        .select('id, data')
        .eq('buro_id', buroId)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;
      return { id: data.id, ...(data.data as object) } as Vekil;
    },
    enabled: !!buroId && !!id,
  });
}

// ── Kaydet (upsert) ─────────────────────────────────────────
export function useVekilKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Vekil) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('vekillar').upsert({
        id,
        buro_id: buroId,
        data,
      });
      if (error) throw error;
    },
    onMutate: async (yeniKayit) => {
      await queryClient.cancelQueries({ queryKey: ['vekillar'] });
      const onceki = queryClient.getQueryData<Vekil[]>(['vekillar', buroId]);
      queryClient.setQueryData<Vekil[]>(['vekillar', buroId], (eski = []) => {
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
        queryClient.setQueryData(['vekillar', buroId], context.onceki);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vekillar'] });
      queryClient.invalidateQueries({ queryKey: ['vekil'] });
    },
  });
}

// ── Soft Delete ──────────────────────────────────────────────
export function useVekilSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { data: existing } = await supabase
        .from('vekillar')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();
      if (!existing) throw new Error('Kayıt bulunamadı');
      const { error } = await supabase
        .from('vekillar')
        .update({ data: { ...(existing.data as object), _silindi: new Date().toISOString() } })
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vekillar'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}

export function useVekilKaliciSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase
        .from('vekillar')
        .delete()
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vekillar'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}

export function useVekilGeriYukle() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { data: existing } = await supabase
        .from('vekillar')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();
      if (!existing) throw new Error('Kayıt bulunamadı');
      const { _silindi, ...temizData } = existing.data as Record<string, unknown>;
      void _silindi;
      const { error } = await supabase
        .from('vekillar')
        .update({ data: temizData })
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vekillar'] });
      queryClient.invalidateQueries({ queryKey: ['cop-kutusu'] });
    },
  });
}
