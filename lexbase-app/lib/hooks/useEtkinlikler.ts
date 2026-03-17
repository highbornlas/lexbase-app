'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';
import { useDavalar, type Dava } from './useDavalar';
import { useTodolar, type Todo } from './useTodolar';
import { useIcralar, type Icra } from './useIcra';
import { useArabuluculuklar, type Arabuluculuk } from './useArabuluculuk';
import { useIhtarnameler, type Ihtarname } from './useIhtarname';
import { useDanismanliklar, type Danismanlik } from './useDanismanlik';
import { adliTatilSureUzamasi } from '@/lib/data/tatiller';

// ── Etkinlik Arayüzü ────────────────────────────────────────────
export interface Etkinlik {
  id: string;
  baslik?: string;
  tarih?: string;
  bitisSaati?: string;
  saat?: string;
  tur?: string;
  muvId?: string;
  davNo?: string;
  yer?: string;
  not?: string;
  hatirlatma?: string;
  // Dosya bağlantısı
  dosyaTur?: string;  // 'dava' | 'icra' | 'arabuluculuk' | 'ihtarname' | 'danismanlik'
  dosyaId?: string;
  // Katılımcılar
  katilimcilar?: string[];
  // Sanal etkinlik özellikleri
  sanal?: boolean;
  kaynak?: 'dava' | 'todo' | 'icra' | 'arabuluculuk' | 'ihtarname' | 'danismanlik';
  kaynakId?: string;
  kaynakUrl?: string;
  // Adli tatil uzaması
  adliTatilUzama?: string; // Uzamış tarih (7 Eylül vb.)
  [key: string]: unknown;
}

// ── Sanal Etkinlik Türleri Renk Haritası ────────────────────────
export const TUR_RENK: Record<string, string> = {
  'Duruşma': 'bg-red/20 text-red border-red/30',
  'Son Gün': 'bg-orange-400/20 text-orange-400 border-orange-400/30',
  'Müvekkil Görüşmesi': 'bg-blue-400/20 text-blue-400 border-blue-400/30',
  'Toplantı': 'bg-purple-400/20 text-purple-400 border-purple-400/30',
  'Keşif': 'bg-green/20 text-green border-green/30',
  'Bilirkişi': 'bg-teal-400/20 text-teal-400 border-teal-400/30',
  'Arabuluculuk': 'bg-gold/20 text-gold border-gold/30',
  'Uzlaşma': 'bg-amber-400/20 text-amber-400 border-amber-400/30',
  'Görev': 'bg-indigo-400/20 text-indigo-400 border-indigo-400/30',
  'İtiraz Son Gün': 'bg-rose-500/20 text-rose-500 border-rose-500/30',
  'Oturum': 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30',
  'İhtarname Süresi': 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  'Teslim Tarihi': 'bg-cyan-400/20 text-cyan-400 border-cyan-400/30',
  'Diğer': 'bg-surface2 text-text-muted border-border',
};

export const TUR_IKON: Record<string, string> = {
  'Duruşma': '⚖️',
  'Son Gün': '⏰',
  'Müvekkil Görüşmesi': '🤝',
  'Toplantı': '👥',
  'Keşif': '🔍',
  'Bilirkişi': '📋',
  'Arabuluculuk': '🤝',
  'Uzlaşma': '🤝',
  'Görev': '📋',
  'İtiraz Son Gün': '⚠️',
  'Oturum': '🗓️',
  'İhtarname Süresi': '📬',
  'Teslim Tarihi': '📄',
  'Diğer': '📌',
};

// ── Temel CRUD Hook'ları ────────────────────────────────────────

export function useEtkinlikler() {
  const buroId = useBuroId();

  return useQuery<Etkinlik[]>({
    queryKey: ['etkinlikler', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('etkinlikler')
        .select('id, data')
        .eq('buro_id', buroId);
      if (error) throw error;
      return (data || [])
        .map((r) => ({ id: r.id, ...(r.data as object) }) as Etkinlik)
        .filter((e) => !(e as Record<string, unknown>)._silindi);
    },
    enabled: !!buroId,
  });
}

export function useEtkinlikKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Etkinlik) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('etkinlikler').upsert({ id, buro_id: buroId, data });
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['etkinlikler'] });
    },
  });
}

export function useEtkinlikSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase.from('etkinlikler').delete().eq('id', id).eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['etkinlikler'] });
    },
  });
}

// ── Sanal Etkinlik Üretici Yardımcılar ──────────────────────────

function davaSanalEtkinlikler(davalar: Dava[]): Etkinlik[] {
  const liste: Etkinlik[] = [];
  for (const d of davalar) {
    // Duruşma tarihi
    if (d.durusma && d.durum !== 'Kapalı') {
      const mahkeme = [d.mtur, d.mno].filter(Boolean).join(' ') || d.mahkeme;
      const yer = [d.adliye, mahkeme].filter(Boolean).join(' — ');
      const e: Etkinlik = {
        id: `sanal-durusma-${d.id}`,
        baslik: `Duruşma: ${d.konu || d.no || 'Dava'}`,
        tarih: d.durusma,
        saat: d.durusmaSaati,
        tur: 'Duruşma',
        muvId: d.muvId,
        davNo: d.no,
        yer,
        sanal: true,
        kaynak: 'dava',
        kaynakId: d.id,
        kaynakUrl: `/davalar/${d.id}`,
      };
      // Adli tatil uzaması kontrolü
      const uzama = adliTatilSureUzamasi(d.durusma);
      if (uzama) e.adliTatilUzama = uzama;
      liste.push(e);
    }

    // Dava süreleri
    if (d.sureler?.length) {
      for (const s of d.sureler) {
        if (!s.baslangic || !s.gun) continue;
        const baslangic = new Date(s.baslangic);
        baslangic.setDate(baslangic.getDate() + s.gun);
        const sonTarih = baslangic.toISOString().split('T')[0];
        const se: Etkinlik = {
          id: `sanal-dava-sure-${d.id}-${s.id}`,
          baslik: `${s.tip || 'Süre'}: ${d.konu || d.no || 'Dava'}`,
          tarih: sonTarih,
          tur: 'Son Gün',
          muvId: d.muvId,
          davNo: d.no,
          sanal: true,
          kaynak: 'dava',
          kaynakId: d.id,
          kaynakUrl: `/davalar/${d.id}`,
        };
        const uzama = adliTatilSureUzamasi(sonTarih);
        if (uzama) se.adliTatilUzama = uzama;
        liste.push(se);
      }
    }
  }
  return liste;
}

function todoSanalEtkinlikler(todolar: Todo[]): Etkinlik[] {
  const liste: Etkinlik[] = [];
  for (const t of todolar) {
    if (t.sonTarih && t.durum !== 'Tamamlandı' && t.durum !== 'İptal' && !t.sablon) {
      liste.push({
        id: `sanal-gorev-${t.id}`,
        baslik: `Görev: ${t.baslik || 'İsimsiz'}`,
        tarih: t.sonTarih,
        tur: 'Görev',
        muvId: t.muvId,
        sanal: true,
        kaynak: 'todo',
        kaynakId: t.id,
        kaynakUrl: '/gorevler',
        not: t.oncelik ? `Öncelik: ${t.oncelik}` : undefined,
      });
    }
  }
  return liste;
}

function icraSanalEtkinlikler(icralar: Icra[]): Etkinlik[] {
  const liste: Etkinlik[] = [];
  for (const i of icralar) {
    // İtiraz son tarihi
    const itirazTarih = i.itirazSonTarih || i.itarih;
    if (itirazTarih && i.durum !== 'Kapandı') {
      const daire = [i.adliye, i.daire].filter(Boolean).join(' — ');
      const e: Etkinlik = {
        id: `sanal-icra-itiraz-${i.id}`,
        baslik: `İtiraz Son Gün: ${i.no || 'İcra'}`,
        tarih: itirazTarih,
        tur: 'İtiraz Son Gün',
        muvId: i.muvId,
        yer: daire,
        sanal: true,
        kaynak: 'icra',
        kaynakId: i.id,
        kaynakUrl: `/icra/${i.id}`,
      };
      const uzama = adliTatilSureUzamasi(itirazTarih);
      if (uzama) e.adliTatilUzama = uzama;
      liste.push(e);
    }

    // İcra süreleri
    if (i.sureler?.length) {
      for (const s of i.sureler) {
        if (!s.baslangic || !s.gun) continue;
        const baslangic = new Date(s.baslangic);
        baslangic.setDate(baslangic.getDate() + s.gun);
        const sonTarih = baslangic.toISOString().split('T')[0];
        const se: Etkinlik = {
          id: `sanal-icra-sure-${i.id}-${s.id}`,
          baslik: `${s.tip || 'Süre'}: ${i.no || 'İcra'}`,
          tarih: sonTarih,
          tur: 'Son Gün',
          muvId: i.muvId,
          sanal: true,
          kaynak: 'icra',
          kaynakId: i.id,
          kaynakUrl: `/icra/${i.id}`,
        };
        const uzama = adliTatilSureUzamasi(sonTarih);
        if (uzama) se.adliTatilUzama = uzama;
        liste.push(se);
      }
    }
  }
  return liste;
}

function arabuluculukSanalEtkinlikler(dosyalar: Arabuluculuk[]): Etkinlik[] {
  const liste: Etkinlik[] = [];
  for (const a of dosyalar) {
    if (a.durum === 'Anlaşma' || a.durum === 'Anlaşamama' || a.durum === 'İptal') continue;

    // İlk oturum
    if (a.ilkOturumTarih) {
      liste.push({
        id: `sanal-arab-ilk-${a.id}`,
        baslik: `Arabuluculuk Oturumu: ${a.konu || a.no || ''}`,
        tarih: a.ilkOturumTarih,
        tur: 'Oturum',
        muvId: a.muvId,
        not: a.arabulucu ? `Arabulucu: ${a.arabulucu}` : undefined,
        sanal: true,
        kaynak: 'arabuluculuk',
        kaynakId: a.id,
        kaynakUrl: `/arabuluculuk/${a.id}`,
      });
    }

    // Diğer oturumlar
    if (a.oturumlar?.length) {
      for (const o of a.oturumlar) {
        if (!o.tarih || o.tarih === a.ilkOturumTarih) continue;
        liste.push({
          id: `sanal-arab-oturum-${a.id}-${o.id}`,
          baslik: `Arabuluculuk Oturumu: ${a.konu || a.no || ''}`,
          tarih: o.tarih,
          saat: o.saat,
          tur: 'Oturum',
          yer: o.yer,
          muvId: a.muvId,
          sanal: true,
          kaynak: 'arabuluculuk',
          kaynakId: a.id,
          kaynakUrl: `/arabuluculuk/${a.id}`,
        });
      }
    }

    // Yasal süre bitiş
    if (a.yasalSureBitis) {
      const e: Etkinlik = {
        id: `sanal-arab-sure-${a.id}`,
        baslik: `Arabuluculuk Yasal Süre Sonu: ${a.konu || a.no || ''}`,
        tarih: a.yasalSureBitis,
        tur: 'Son Gün',
        muvId: a.muvId,
        sanal: true,
        kaynak: 'arabuluculuk',
        kaynakId: a.id,
        kaynakUrl: `/arabuluculuk/${a.id}`,
      };
      const uzama = adliTatilSureUzamasi(a.yasalSureBitis);
      if (uzama) e.adliTatilUzama = uzama;
      liste.push(e);
    }
  }
  return liste;
}

function ihtarnameSanalEtkinlikler(dosyalar: Ihtarname[]): Etkinlik[] {
  const liste: Etkinlik[] = [];
  for (const ih of dosyalar) {
    if (ih._silindi || ih._arsivlendi) continue;
    // Süre sonu (cevap süresi bitişi)
    if (ih.sureSonu && ih.durum !== 'Sonuçlandı') {
      const e: Etkinlik = {
        id: `sanal-ihtar-sure-${ih.id}`,
        baslik: `İhtarname Cevap Süresi: ${ih.konu || ih.no || ''}`,
        tarih: ih.sureSonu,
        tur: 'İhtarname Süresi',
        muvId: ih.muvId,
        sanal: true,
        kaynak: 'ihtarname',
        kaynakId: ih.id,
        kaynakUrl: `/ihtarnameler/${ih.id}`,
      };
      const uzama = adliTatilSureUzamasi(ih.sureSonu);
      if (uzama) e.adliTatilUzama = uzama;
      liste.push(e);
    }
  }
  return liste;
}

function danismanlikSanalEtkinlikler(dosyalar: Danismanlik[]): Etkinlik[] {
  const liste: Etkinlik[] = [];
  for (const d of dosyalar) {
    // Teslim tarihi
    if (d.teslimTarih && d.durum !== 'Tamamlandı' && d.durum !== 'İptal') {
      liste.push({
        id: `sanal-dan-teslim-${d.id}`,
        baslik: `Teslim: ${d.konu || d.no || 'Danışmanlık'}`,
        tarih: d.teslimTarih,
        tur: 'Teslim Tarihi',
        muvId: d.muvId,
        sanal: true,
        kaynak: 'danismanlik',
        kaynakId: d.id,
        kaynakUrl: `/danismanlik/${d.id}`,
      });
    }

    // Sözleşme bitişi (sürekli danışmanlık)
    if (d.sozlesmeBitis && d.sozlesmeModeli === 'sureklii' && d.durum !== 'Tamamlandı' && d.durum !== 'İptal') {
      liste.push({
        id: `sanal-dan-sozlesme-${d.id}`,
        baslik: `Sözleşme Bitiş: ${d.konu || d.no || 'Danışmanlık'}`,
        tarih: d.sozlesmeBitis,
        tur: 'Son Gün',
        muvId: d.muvId,
        sanal: true,
        kaynak: 'danismanlik',
        kaynakId: d.id,
        kaynakUrl: `/danismanlik/${d.id}`,
      });
    }
  }
  return liste;
}

// ── BİRLEŞTİRİCİ HOOK: Tüm etkinlikler + sanal etkinlikler ─────
export function useTumEtkinlikler() {
  const { data: etkinlikler } = useEtkinlikler();
  const { data: davalar } = useDavalar();
  const { data: todolar } = useTodolar();
  const { data: icralar } = useIcralar();
  const { data: arabuluculuklar } = useArabuluculuklar();
  const { data: ihtarnameler } = useIhtarnameler();
  const { data: danismanliklar } = useDanismanliklar();

  const tumEtkinlikler = useMemo(() => {
    const gercek = (etkinlikler || []).map((e) => ({ ...e, sanal: false }));
    const sanalDava = davaSanalEtkinlikler(davalar || []);
    const sanalTodo = todoSanalEtkinlikler(todolar || []);
    const sanalIcra = icraSanalEtkinlikler(icralar || []);
    const sanalArab = arabuluculukSanalEtkinlikler(arabuluculuklar || []);
    const sanalIhtar = ihtarnameSanalEtkinlikler(ihtarnameler || []);
    const sanalDan = danismanlikSanalEtkinlikler(danismanliklar || []);

    const hepsi = [
      ...gercek,
      ...sanalDava,
      ...sanalTodo,
      ...sanalIcra,
      ...sanalArab,
      ...sanalIhtar,
      ...sanalDan,
    ];

    // Adli tatil uzamasına sahip etkinlikler için, uzamış tarihe de kopyalama
    const uzamaEtkinlikler: Etkinlik[] = [];
    for (const e of hepsi) {
      if (e.adliTatilUzama) {
        uzamaEtkinlikler.push({
          ...e,
          id: `${e.id}-uzama`,
          tarih: e.adliTatilUzama,
          baslik: `⚠️ Uzayan Süre: ${e.baslik?.replace('⚠️ Uzayan Süre: ', '') || ''}`,
          tur: e.tur,
          not: `Adli tatil nedeniyle uzayan süre. Orijinal tarih: ${e.tarih}`,
        });
      }
    }

    return [...hepsi, ...uzamaEtkinlikler];
  }, [etkinlikler, davalar, todolar, icralar, arabuluculuklar, ihtarnameler, danismanliklar]);

  return tumEtkinlikler;
}

// ── Çakışma Tespiti ─────────────────────────────────────────────
export interface Cakisma {
  etkinlik1: Etkinlik;
  etkinlik2: Etkinlik;
  seviye: 'sari' | 'kirmizi'; // sarı = aynı adliye, kırmızı = farklı konum
}

/**
 * Belirli bir gündeki duruşma çakışmalarını tespit eder
 * Aynı konum → Sarı uyarı (aynı adliyede sıra beklenebilir)
 * Farklı konum → Kırmızı uyarı (fiziken imkânsız)
 */
export function cakismaTespit(etkinlikler: Etkinlik[], tarih: string): Cakisma[] {
  const gunEtkinlikleri = etkinlikler.filter(
    (e) => e.tarih === tarih && e.saat && (e.tur === 'Duruşma' || e.tur === 'Oturum')
  );

  const cakismalar: Cakisma[] = [];
  for (let i = 0; i < gunEtkinlikleri.length; i++) {
    for (let j = i + 1; j < gunEtkinlikleri.length; j++) {
      const e1 = gunEtkinlikleri[i];
      const e2 = gunEtkinlikleri[j];

      // Aynı saatte mi?
      if (e1.saat === e2.saat) {
        const yer1 = (e1.yer || '').toLocaleLowerCase('tr').trim();
        const yer2 = (e2.yer || '').toLocaleLowerCase('tr').trim();

        // Her ikisinin de yeri belirtilmişse karşılaştır
        const ayniKonum = yer1 && yer2 && (
          yer1 === yer2 ||
          yer1.includes(yer2) || yer2.includes(yer1) ||
          // Aynı adliye kelimesini içeriyorsa
          ayniAdliyeMi(yer1, yer2)
        );

        cakismalar.push({
          etkinlik1: e1,
          etkinlik2: e2,
          seviye: ayniKonum ? 'sari' : 'kirmizi',
        });
      }
    }
  }
  return cakismalar;
}

function ayniAdliyeMi(yer1: string, yer2: string): boolean {
  // "İstanbul Adliyesi" vs "İstanbul 3. Asliye" → aynı il = sarı
  const ilCikar = (s: string) => s.split(/\s+/)[0] || '';
  return ilCikar(yer1) === ilCikar(yer2) && ilCikar(yer1).length > 2;
}
