'use client';

import { useMemo } from 'react';
import { useMuvekkillar } from './useMuvekkillar';
import { useDavalar } from './useDavalar';
import { useIcralar } from './useIcra';
import { useVekillar } from './useVekillar';
import { useDanismanliklar } from './useDanismanlik';
import { useIhtarnameler } from './useIhtarname';
import { useArabuluculuklar } from './useArabuluculuk';
import { davaDosyaBaslik, icraDosyaBaslik, ihtarnameDosyaBaslik } from '../utils/uyapHelpers';

/* ══════════════════════════════════════════════════════════════
   Spotlight Search Hook — Tüm modüllerde client-side arama
   ══════════════════════════════════════════════════════════════ */

export interface AramaSonuc {
  kategori: string;
  id: string;
  baslik: string;
  altBilgi: string;
  ikon: string;
  href: string;
}

interface AramaKategori {
  baslik: string;
  ikon: string;
  sonuclar: AramaSonuc[];
}

const MAX_SONUC = 5;

function eslesir(metin: string | undefined | null, sorgu: string): boolean {
  if (!metin) return false;
  return metin.toLocaleLowerCase('tr').includes(sorgu);
}

export function useSpotlightSearch(query: string) {
  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const { data: vekillar } = useVekillar();
  const { data: danismanliklar } = useDanismanliklar();
  const { data: ihtarnameler } = useIhtarnameler();
  const { data: arabuluculuklar } = useArabuluculuklar();

  const kategoriler = useMemo<AramaKategori[]>(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    if (q.length < 2) return [];

    const result: AramaKategori[] = [];

    // ── Müvekkiller ──
    if (muvekkillar) {
      const sonuclar = muvekkillar
        .filter((m) =>
          eslesir(m.ad, q) ||
          eslesir(m.tc, q) ||
          eslesir(m.vergiNo, q) ||
          eslesir(m.tel, q) ||
          eslesir(m.mail, q) ||
          eslesir(m.unvan, q)
        )
        .slice(0, MAX_SONUC)
        .map((m) => ({
          kategori: 'Müvekkiller',
          id: m.id,
          baslik: m.ad || '?',
          altBilgi: [m.tip === 'tuzel' ? 'Tüzel' : 'Gerçek', m.tc || m.vergiNo, m.tel].filter(Boolean).join(' · '),
          ikon: '👤',
          href: `/muvekkillar/${m.id}`,
        }));
      if (sonuclar.length > 0) result.push({ baslik: 'Müvekkiller', ikon: '👤', sonuclar });
    }

    // ── Davalar ──
    if (davalar) {
      const sonuclar = davalar
        .filter((d) =>
          eslesir(d.konu, q) ||
          eslesir(d.no, q) ||
          eslesir(d.esasNo, q) ||
          eslesir(d.mahkeme, q) ||
          eslesir(d.hakim, q) ||
          eslesir(d.karsi, q) ||
          eslesir(d.il, q) ||
          eslesir(d.mtur, q)
        )
        .slice(0, MAX_SONUC)
        .map((d) => ({
          kategori: 'Davalar',
          id: d.id,
          baslik: davaDosyaBaslik(d),
          altBilgi: [d.konu, d.durum].filter(Boolean).join(' · '),
          ikon: '📁',
          href: `/davalar/${d.id}`,
        }));
      if (sonuclar.length > 0) result.push({ baslik: 'Davalar', ikon: '📁', sonuclar });
    }

    // ── İcralar ──
    if (icralar) {
      const sonuclar = icralar
        .filter((i) =>
          eslesir(i.borclu, q) ||
          eslesir(i.esas, q) ||
          eslesir(i.no, q) ||
          eslesir(i.daire, q) ||
          eslesir(i.karsi, q) ||
          eslesir(i.davno, q) ||
          eslesir(i.il, q)
        )
        .slice(0, MAX_SONUC)
        .map((i) => ({
          kategori: 'İcralar',
          id: i.id,
          baslik: icraDosyaBaslik(i),
          altBilgi: [i.borclu, i.durum].filter(Boolean).join(' · '),
          ikon: '⚡',
          href: `/icra/${i.id}`,
        }));
      if (sonuclar.length > 0) result.push({ baslik: 'İcralar', ikon: '⚡', sonuclar });
    }

    // ── Avukatlar ──
    if (vekillar) {
      const sonuclar = vekillar
        .filter((v) =>
          eslesir(v.ad, q) ||
          eslesir(v.baro, q) ||
          eslesir(v.baroSicil, q) ||
          eslesir(v.tel, q) ||
          eslesir(v.mail, q)
        )
        .slice(0, MAX_SONUC)
        .map((v) => ({
          kategori: 'Avukatlar',
          id: v.id,
          baslik: v.ad || '?',
          altBilgi: [v.baro ? `${v.baro} Barosu` : null, v.baroSicil, v.tel].filter(Boolean).join(' · '),
          ikon: '👔',
          href: `/muvekkillar?tab=avukatlar&ara=${encodeURIComponent(v.ad || '')}`,
        }));
      if (sonuclar.length > 0) result.push({ baslik: 'Avukatlar', ikon: '👔', sonuclar });
    }

    // ── Danışmanlıklar ──
    if (danismanliklar) {
      const sonuclar = danismanliklar
        .filter((d) =>
          eslesir(d.konu, q) ||
          eslesir(d.tur, q) ||
          eslesir(d.durum, q)
        )
        .slice(0, MAX_SONUC)
        .map((d) => ({
          kategori: 'Danışmanlıklar',
          id: d.id,
          baslik: d.konu || '?',
          altBilgi: [d.tur, d.durum].filter(Boolean).join(' · '),
          ikon: '⚖️',
          href: `/danismanlik/${d.id}`,
        }));
      if (sonuclar.length > 0) result.push({ baslik: 'Danışmanlıklar', ikon: '⚖️', sonuclar });
    }

    // ── Arabuluculuklar ──
    if (arabuluculuklar) {
      const sonuclar = arabuluculuklar
        .filter((a) => !a._silindi && !a._arsivlendi)
        .filter((a) =>
          eslesir(a.konu, q) ||
          eslesir(a.no, q) ||
          eslesir(a.arabulucu, q) ||
          eslesir(a.karsiTaraf, q) ||
          eslesir(a.tur, q)
        )
        .slice(0, MAX_SONUC)
        .map((a) => ({
          kategori: 'Arabuluculuk',
          id: a.id,
          baslik: a.konu || a.no || '?',
          altBilgi: [a.tur, a.arabulucu, a.durum].filter(Boolean).join(' · '),
          ikon: '💜',
          href: `/arabuluculuk/${a.id}`,
        }));
      if (sonuclar.length > 0) result.push({ baslik: 'Arabuluculuk', ikon: '💜', sonuclar });
    }

    // ── İhtarnameler ──
    if (ihtarnameler) {
      const sonuclar = ihtarnameler
        .filter((i) => !i._silindi && !i._arsivlendi)
        .filter((i) =>
          eslesir(i.konu, q) ||
          eslesir(i.no, q) ||
          eslesir(i.alici, q) ||
          eslesir(i.gonderen, q) ||
          eslesir(i.noterAd, q)
        )
        .slice(0, MAX_SONUC)
        .map((i) => ({
          kategori: 'İhtarnameler',
          id: i.id,
          baslik: ihtarnameDosyaBaslik(i),
          altBilgi: [i.konu, i.tur, i.durum].filter(Boolean).join(' · '),
          ikon: '📨',
          href: `/ihtarname/${i.id}`,
        }));
      if (sonuclar.length > 0) result.push({ baslik: 'İhtarnameler', ikon: '📨', sonuclar });
    }

    return result;
  }, [query, muvekkillar, davalar, icralar, vekillar, danismanliklar, arabuluculuklar, ihtarnameler]);

  const toplamSonuc = kategoriler.reduce((sum, k) => sum + k.sonuclar.length, 0);

  return { kategoriler, toplamSonuc };
}
