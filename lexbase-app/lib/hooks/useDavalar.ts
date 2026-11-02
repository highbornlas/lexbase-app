'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRecordLifecycle } from './useRecordLifecycle';
import { masraflariKoruyarakDosyaKaydet } from '@/lib/data/financeCashTransaction';
import { raporKaydiGorunurMu } from '@/lib/finans/gelirKurallari';
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
  // İlişkiler (legacy tekli alanlar — geriye uyumluluk)
  karsiId?: string;
  karsi?: string;
  karsavId?: string;
  karsav?: string;
  icrano?: string;
  iliskiliIcraId?: string;
  // Çoklu taraf desteği
  muvekkilTaraflar?: Array<{ id: string; ad: string; vekiller?: Array<{ id: string; ad: string }> }>;
  karsiTaraflar?: Array<{ id: string; ad: string; vekiller?: Array<{ id: string; ad: string }> }>;
  vekiller?: Array<{ id: string; ad: string }>;
  // Finansal
  deger?: number;
  ucret?: number; // Vekalet ücreti (sözleşme bedeli)
  tahsilEdildi?: number; // Tahsil edilen toplam ücret
  // Süreler
  sureler?: Array<{ id: string; tip: string; baslangic: string; gun: number }>;
  // Duruşmalar (çoklu)
  durusmalar?: Array<{
    id: string;
    tarih: string;
    saat?: string;
    salon?: string;
    hakim?: string;
    sonuc?: 'erteleme' | 'kesif' | 'bilirkisi' | 'karar' | 'sozlu_savunma' | 'delil_inceleme' | 'diger';
    sonucAciklama?: string;
    katildiMi?: boolean;
  }>;
  // Karar detayları
  karar?: {
    tarih?: string;
    no?: string;
    sonuc?: 'lehte' | 'aleyhte' | 'kismenLehte' | 'dusme' | 'feragat' | 'sulh';
    ozet?: string;
    kesinlestiMi?: boolean;
    kesinlesmeTarihi?: string;
    temyizEdildiMi?: boolean;
  };
  // Alt veriler
  evraklar?: Record<string, unknown>[];
  notlar?: Record<string, unknown>[];
  harcamalar?: Array<{ id: string; kat?: string; acik?: string; tarih?: string; tutar: number; masrafSahibi?: string }>;
  tahsilatlar?: Array<{ id: string; tur: string; tutar: number; tarih?: string; acik?: string; kdvOrani?: number; stopajOrani?: number; makbuzKesildi?: boolean; makbuzNo?: string; makbuzTarih?: string }>;
  // Taksitli ödeme planı
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
  anlasma?: Record<string, unknown>;
  not?: string;
  // Arşiv & Soft delete
  _arsivlendi?: string;
  _silindi?: string;
  [key: string]: unknown;
}

// ── Tüm Davalar (soft delete filtreli) ──────────────────────
export function useDavalar(includeArchived = false) {
  const buroId = useBuroId();

  return useQuery<Dava[]>({
    queryKey: includeArchived ? ['davalar', buroId, 'finans'] : ['davalar', buroId],
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
        .filter((d) => raporKaydiGorunurMu(d, includeArchived));
    },
    enabled: !!buroId,
  });
}

// ── Arşivlenmiş Davalar ──────────────────────────────────────
export function useArsivDavalar() {
  const buroId = useBuroId();

  return useQuery<Dava[]>({
    queryKey: ['davalar-arsiv', buroId],
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
        .filter((d) => d._arsivlendi && !d._silindi);
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
      const kayit = { id: data.id, ...(data.data as object) } as Dava;
      if (kayit._silindi) return null;
      return kayit;
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
      await masraflariKoruyarakDosyaKaydet(supabase, buroId, 'Dava', { ...kayit });
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
      queryClient.invalidateQueries({ queryKey: ['finans'] });
    },
  });
}

// ── Soft Delete ─────────────────────────────────────────────
export function useDavaSil() {
  return useRecordLifecycle('davalar', 'sil');
}

// ── Kalıcı Sil ──────────────────────────────────────────────
export function useDavaKaliciSil() {
  return useRecordLifecycle('davalar', 'kalici_sil');
}

// ── Geri Yükle ──────────────────────────────────────────────
export function useDavaGeriYukle() {
  return useRecordLifecycle('davalar', 'geri_yukle');
}

// ── Arşive Kaldır ────────────────────────────────────────────
export function useDavaArsivle() {
  return useRecordLifecycle('davalar', 'arsivle');
}

// ── Arşivden Çıkar ───────────────────────────────────────────
export function useDavaArsivdenCikar() {
  return useRecordLifecycle('davalar', 'arsivden_cikar');
}
