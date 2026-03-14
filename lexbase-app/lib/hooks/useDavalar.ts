'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

// ── Dava Tip Tanımı (UYAP Uyumlu) ──────────────────────────
export interface Dava {
  id: string;
  sira?: number;
  kayitNo?: number;
  no?: string;
  konu?: string;
  davaTuru?: string;
  muvId?: string;
  // Mahkeme bilgileri
  il?: string;
  adliye?: string;
  mtur?: string; // mahkeme türü
  mno?: string; // mahkeme numarası
  mahkeme?: string; // computed: mtur + mno
  esasYil?: string;
  esasNo?: string;
  kararYil?: string;
  kararNo?: string;
  hakim?: string;
  // Durum
  asama?: string; // 'İlk Derece' | 'İstinaf' | 'Temyiz (Yargıtay)' | vb.
  durum?: string; // 'Aktif' | 'Beklemede' | 'Kapalı'
  durumTag?: string;
  durumAciklama?: string;
  derdest?: boolean;
  taraf?: string; // davacı / davalı
  // Tarihler
  tarih?: string;
  durusma?: string;
  durusmaSaati?: string;
  ktarih?: string; // karar tarihi
  kesin?: string;
  // Kapanış
  kapanisSebebi?: string;
  kapanisTarih?: string;
  // İlişkiler
  karsiId?: string;
  karsi?: string;
  karsavId?: string;
  karsav?: string;
  icrano?: string;
  iliskiliIcraId?: string;
  // Finansal
  deger?: number;
  // Süreler
  sureler?: Array<{ id: string; tip: string; baslangic: string; gun: number }>;
  // Alt veriler
  evraklar?: Record<string, unknown>[];
  notlar?: Record<string, unknown>[];
  harcamalar?: Array<{ id: string; kat?: string; acik?: string; tarih?: string; tutar: number }>;
  tahsilatlar?: Array<{ id: string; tur: string; tutar: number; tarih?: string; acik?: string }>;
  anlasma?: Record<string, unknown>;
  not?: string;
  // Soft delete
  _silindi?: string;
  [key: string]: unknown;
}

// ── Tüm Davalar (soft delete filtreli) ──────────────────────
export function useDavalar() {
  const buroId = useBuroId();

  return useQuery<Dava[]>({
    queryKey: ['davalar', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('davalar')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }) as Dava)
        .filter((d) => !d._silindi);
    },
    enabled: !!buroId,
  });
}

// ── Tek Dava (detay sayfası) ─────────────────────────────────
export function useDava(id: string | null) {
  const buroId = useBuroId();

  return useQuery<Dava | null>({
    queryKey: ['dava', id, buroId],
    queryFn: async () => {
      if (!buroId || !id) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('davalar')
        .select('id, data')
        .eq('buro_id', buroId)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;
      return { id: data.id, ...(data.data as object) } as Dava;
    },
    enabled: !!buroId && !!id,
  });
}

// ── Kaydet (upsert) — optimistic update ─────────────────────
export function useDavaKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Dava) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('davalar').upsert({
        id,
        buro_id: buroId,
        data,
      });
      if (error) throw error;
    },
    onMutate: async (yeniDava) => {
      await queryClient.cancelQueries({ queryKey: ['davalar', buroId] });
      const onceki = queryClient.getQueryData<Dava[]>(['davalar', buroId]);

      queryClient.setQueryData<Dava[]>(['davalar', buroId], (eski) => {
        if (!eski) return [yeniDava];
        const idx = eski.findIndex((d) => d.id === yeniDava.id);
        if (idx >= 0) {
          const klon = [...eski];
          klon[idx] = yeniDava;
          return klon;
        }
        return [...eski, yeniDava];
      });

      return { onceki };
    },
    onError: (_err, _yeni, ctx) => {
      if (ctx?.onceki) {
        queryClient.setQueryData(['davalar', buroId], ctx.onceki);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['davalar'] });
      queryClient.invalidateQueries({ queryKey: ['dava'] });
    },
  });
}

// ── Soft Delete ─────────────────────────────────────────────
export function useDavaSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();

      // Mevcut veriyi al
      const { data: mevcut } = await supabase
        .from('davalar')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();

      if (!mevcut) throw new Error('Dava bulunamadı');

      // _silindi flag ekle
      const { error } = await supabase.from('davalar').update({
        data: { ...(mevcut.data as object), _silindi: new Date().toISOString() },
      }).eq('id', id).eq('buro_id', buroId);

      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['davalar'] });
    },
  });
}

// ── Kalıcı Sil ──────────────────────────────────────────────
export function useDavaKaliciSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase
        .from('davalar')
        .delete()
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['davalar'] });
    },
  });
}

// ── Geri Yükle ──────────────────────────────────────────────
export function useDavaGeriYukle() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();

      const { data: mevcut } = await supabase
        .from('davalar')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();

      if (!mevcut) throw new Error('Dava bulunamadı');

      const data = { ...(mevcut.data as Record<string, unknown>) };
      delete data._silindi;

      const { error } = await supabase.from('davalar').update({ data })
        .eq('id', id).eq('buro_id', buroId);

      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['davalar'] });
    },
  });
}
