'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

// ── Belge Tip Tanımı ──────────────────────────────────────────
export interface Belge {
  id: string;
  muvId: string;
  ad: string;
  tur: BelgeTur;
  tarih: string;
  dosyaAd: string;
  tip: string; // mime type
  boyut: number; // byte
  storagePath: string;
  etiketler?: string[];
  meta?: VekaletnameMeta;
  // Dosya bağlantıları (opsiyonel — dava/icra evrakları için)
  davaId?: string;
  icraId?: string;
  evrakTuru?: string; // DavaEvrakTuru | IcraEvrakTuru
  [key: string]: unknown;
}

export interface VekaletnameMeta {
  bitis?: string;
  noter?: string;
  yevmiye?: string;
  vekil?: string;
  ozel?: boolean;
  ozelAcik?: string;
}

export type BelgeTur = 'vekaletname' | 'sozlesme' | 'kimlik' | 'sirkuler' | 'makbuz' | 'diger';

export const BELGE_TURLERI: { key: BelgeTur; label: string; icon: string }[] = [
  { key: 'vekaletname', label: 'Vekaletname', icon: '📜' },
  { key: 'sozlesme', label: 'Sözleşme', icon: '📄' },
  { key: 'kimlik', label: 'Kimlik', icon: '🪪' },
  { key: 'sirkuler', label: 'Sirküler', icon: '🏢' },
  { key: 'makbuz', label: 'Makbuz/Dekont', icon: '🧾' },
  { key: 'diger', label: 'Diğer', icon: '📎' },
];

const MAX_DOSYA_BOYUT = 10 * 1024 * 1024; // 10MB (tek dosya)
const MAX_BURO_BELGE_SAYI = 500; // büro başına toplam belge
const MAX_BURO_TOPLAM_BOYUT = 1 * 1024 * 1024 * 1024; // 1GB büro başına toplam storage

export { MAX_DOSYA_BOYUT, MAX_BURO_BELGE_SAYI, MAX_BURO_TOPLAM_BOYUT };

// ── Tüm belgeler (dashboard widget için) ──────────────────────
export function useBelgeler() {
  const buroId = useBuroId();

  return useQuery<Belge[]>({
    queryKey: ['belgeler', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('belgeler')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }) as Belge)
        .filter((b) => !(b as Record<string, unknown>)._silindi);
    },
    enabled: !!buroId,
  });
}

// ── Müvekkile bağlı belgeler ──────────────────────────────────
export function useMuvBelgeler(muvId: string | null) {
  const buroId = useBuroId();

  return useQuery<Belge[]>({
    queryKey: ['belgeler', 'muv', muvId, buroId],
    queryFn: async () => {
      if (!buroId || !muvId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('belgeler')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }) as Belge)
        .filter((b) => b.muvId === muvId && !b.davaId && !b.icraId) // dava/icra evrakları müvekkil belgelerine karışmasın
        .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
    },
    enabled: !!buroId && !!muvId,
  });
}

// ── Davaya bağlı belgeler ─────────────────────────────────────
export function useDavaBelgeler(davaId: string | null) {
  const buroId = useBuroId();

  return useQuery<Belge[]>({
    queryKey: ['belgeler', 'dava', davaId, buroId],
    queryFn: async () => {
      if (!buroId || !davaId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('belgeler')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }) as Belge)
        .filter((b) => b.davaId === davaId)
        .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
    },
    enabled: !!buroId && !!davaId,
  });
}

// ── İcraya bağlı belgeler ─────────────────────────────────────
export function useIcraBelgeler(icraId: string | null) {
  const buroId = useBuroId();

  return useQuery<Belge[]>({
    queryKey: ['belgeler', 'icra', icraId, buroId],
    queryFn: async () => {
      if (!buroId || !icraId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('belgeler')
        .select('id, data')
        .eq('buro_id', buroId);

      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }) as Belge)
        .filter((b) => b.icraId === icraId)
        .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
    },
    enabled: !!buroId && !!icraId,
  });
}

// ── Büro belge istatistikleri (limit kontrolü için) ───────────
export interface BelgeIstatistik {
  toplamSayi: number;
  toplamBoyut: number;
}

export function useBelgeIstatistik() {
  const buroId = useBuroId();

  return useQuery<BelgeIstatistik>({
    queryKey: ['belge-istatistik', buroId],
    queryFn: async () => {
      if (!buroId) return { toplamSayi: 0, toplamBoyut: 0 };
      const supabase = createClient();
      const { data, error } = await supabase.rpc('fn_belge_istatistik', { p_buro_id: buroId });
      if (error) throw error;
      const row = data?.[0] || { toplam_sayi: 0, toplam_boyut: 0 };
      return {
        toplamSayi: Number(row.toplam_sayi) || 0,
        toplamBoyut: Number(row.toplam_boyut) || 0,
      };
    },
    enabled: !!buroId,
    staleTime: 30_000,
  });
}

// ── Belge Kaydet (meta veri — upsert) ─────────────────────────
export function useBelgeKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Belge) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('belgeler').upsert({
        id,
        buro_id: buroId,
        data,
      });
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['belgeler'] });
    },
  });
}

// ── Belge Sil (meta + storage) ────────────────────────────────
export function useBelgeSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath?: string }) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();

      // Storage'dan sil (varsa)
      if (storagePath) {
        await supabase.storage.from('belgeler').remove([storagePath]);
      }

      // DB'den sil
      const { error } = await supabase
        .from('belgeler')
        .delete()
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['belgeler'] });
    },
  });
}

// ── Belge Yükle (Storage + DB) ────────────────────────────────
export function useBelgeYukle() {
  const buroId = useBuroId();
  const kaydetMutation = useBelgeKaydet();

  return useMutation({
    mutationFn: async ({ dosya, belge }: { dosya: File; belge: Omit<Belge, 'storagePath' | 'dosyaAd' | 'tip' | 'boyut'> }) => {
      if (!buroId) throw new Error('Büro bulunamadı');

      // Client-side boyut kontrolü
      if (dosya.size > MAX_DOSYA_BOYUT) {
        throw new Error('Dosya boyutu 10MB\'dan büyük olamaz');
      }

      // Büro limitleri kontrolü (RPC)
      const supabaseCheck = createClient();
      const { data: istatistik } = await supabaseCheck.rpc('fn_belge_istatistik', { p_buro_id: buroId });
      const stat = istatistik?.[0];
      if (stat) {
        const mevcutSayi = Number(stat.toplam_sayi) || 0;
        const mevcutBoyut = Number(stat.toplam_boyut) || 0;
        if (mevcutSayi >= MAX_BURO_BELGE_SAYI) {
          throw new Error(`Büro belge limiti (${MAX_BURO_BELGE_SAYI}) dolmuştur. Daha fazla belge yüklemek için planınızı yükseltin.`);
        }
        if (mevcutBoyut + dosya.size > MAX_BURO_TOPLAM_BOYUT) {
          throw new Error('Toplam depolama alanı (1 GB) dolmuştur. Daha fazla alan için planınızı yükseltin.');
        }
      }

      const supabase = createClient();

      // Benzersiz path oluştur
      const ext = dosya.name.split('.').pop() || 'bin';
      const klasor = belge.muvId || (belge.davaId ? `dava-${belge.davaId}` : belge.icraId ? `icra-${belge.icraId}` : 'genel');
      const storagePath = `${buroId}/${klasor}/${belge.id}.${ext}`;

      // Storage'a yükle
      const { error: uploadError } = await supabase.storage
        .from('belgeler')
        .upload(storagePath, dosya, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // DB'ye meta veri kaydet
      await kaydetMutation.mutateAsync({
        ...belge,
        dosyaAd: dosya.name,
        tip: dosya.type,
        boyut: dosya.size,
        storagePath,
      } as Belge);
    },
  });
}

// ── Belge İndir (Signed URL) ──────────────────────────────────
export async function belgeIndir(storagePath: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('belgeler')
    .createSignedUrl(storagePath, 60 * 5); // 5 dakika geçerli

  if (error) throw error;
  return data.signedUrl;
}

// ── Boyut formatla ────────────────────────────────────────────
export function fmtBoyut(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(1)} KB`;
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}
