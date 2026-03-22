'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Faiz Oranları Hook — Supabase'den faiz oran veritabanı
   Tablo: faiz_oranlari (id, tur, baslangic, oran, kaynak, notlar)
   ══════════════════════════════════════════════════════════════ */

export interface FaizOraniKayit {
  id: number;
  tur: string;           // 'yasal', 'ticari', 'reeskont_avans' vb.
  baslangic: string;     // YYYY-MM-DD
  oran: number;          // Yıllık oran %
  kaynak: string;        // 'sistem' | 'manuel' | 'tcmb_evds'
  notlar?: string;       // Opsiyonel açıklama
  created_at?: string;
  updated_at?: string;
}

// ── Tüm faiz oranlarını çek ────────────────────────────
export function useFaizOranlari(tur?: string) {
  return useQuery<FaizOraniKayit[]>({
    queryKey: ['faiz_oranlari', tur || 'all'],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from('faiz_oranlari')
        .select('*')
        .order('tur')
        .order('baslangic', { ascending: true });

      if (tur) {
        query = query.eq('tur', tur);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((r) => ({
        ...r,
        oran: Number(r.oran),
      })) as FaizOraniKayit[];
    },
    staleTime: 5 * 60 * 1000, // 5 dk cache
  });
}

// ── Faiz oranlarını OranGirdi[] formatına dönüştür (faiz.ts uyumlu) ──
export function useFaizOranDB(): Record<string, { b: string; o: number }[]> | undefined {
  const { data } = useFaizOranlari();

  if (!data?.length) return undefined;

  const db: Record<string, { b: string; o: number }[]> = {};
  for (const kayit of data) {
    if (!db[kayit.tur]) db[kayit.tur] = [];
    db[kayit.tur].push({ b: kayit.baslangic, o: kayit.oran });
  }
  // Her türü tarihe göre sırala
  for (const tur of Object.keys(db)) {
    db[tur].sort((a, b) => a.b.localeCompare(b.b));
  }
  return db;
}

// ── Mevcut türlerin listesi ────────────────────────────
export function useFaizTurleri() {
  const { data } = useFaizOranlari();
  if (!data) return [];
  return [...new Set(data.map((d) => d.tur))].sort();
}

// ── Yeni oran ekle ─────────────────────────────────────
export function useFaizOraniEkle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Omit<FaizOraniKayit, 'id' | 'created_at' | 'updated_at'>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('faiz_oranlari')
        .insert({
          tur: kayit.tur,
          baslangic: kayit.baslangic,
          oran: kayit.oran,
          kaynak: kayit.kaynak || 'manuel',
          notlar: kayit.notlar || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faiz_oranlari'] });
    },
  });
}

// ── Oran güncelle ──────────────────────────────────────
export function useFaizOraniGuncelle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...guncelleme }: Partial<FaizOraniKayit> & { id: number }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('faiz_oranlari')
        .update({ ...guncelleme, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faiz_oranlari'] });
    },
  });
}

// ── Oran sil ───────────────────────────────────────────
export function useFaizOraniSil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('faiz_oranlari')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faiz_oranlari'] });
    },
  });
}
