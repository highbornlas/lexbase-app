'use client';

import { useMemo } from 'react';
import { raporGelirHareketleri } from '@/lib/finans/gelirKurallari';
import { useMuvekkillar } from './useMuvekkillar';
import { useDavalar } from './useDavalar';
import { useIcralar } from './useIcra';
import { useDanismanliklar } from './useDanismanlik';
import { useArabuluculuklar } from './useArabuluculuk';
import { useIhtarnameler } from './useIhtarname';

// ── Gelir Kaydı Tipi ─────────────────────────────────────────
export interface GelirKaydi {
  id: string;
  tarih: string;
  kaynak: 'Dava' | 'İcra' | 'Danışmanlık' | 'Arabuluculuk' | 'İhtarname';
  tur: string;
  brutTutar: number;
  kdvOrani: number;
  kdvTutar: number;
  stopajOrani: number;
  stopajTutar: number;
  netTutar: number;
  makbuzNo?: string;
  makbuzKesildi: boolean;
  makbuzTarih?: string;
  muvId: string;
  muvAd: string;
  dosyaNo: string;
  dosyaId: string;
}

// ── SMM Hesaplama Yardımcıları (merkezi utils'den import + re-export) ──
import { bruttenNete, nettenBrute, safeNum } from '@/lib/utils/finans';
export { bruttenNete, nettenBrute };

// ── Gelir Hesaplama Hook'u ────────────────────────────────────
export function useGelirVerisi() {
  const muvekkilQuery = useMuvekkillar();
  const davaQuery = useDavalar(true), icraQuery = useIcralar(true);
  const danismanlikQuery = useDanismanliklar(true), arabuluculukQuery = useArabuluculuklar(true);
  const ihtarnameQuery = useIhtarnameler(true);
  const { data: muvekkillar } = muvekkilQuery;
  const { data: davalar } = davaQuery, { data: icralar } = icraQuery;
  const { data: danismanliklar } = danismanlikQuery, { data: arabuluculuklar } = arabuluculukQuery;
  const { data: ihtarnameler } = ihtarnameQuery;

  const gelirler = useMemo(() => {
    const gelirler: GelirKaydi[] = [];
    const muvAdMap: Record<string, string> = {};
    (muvekkillar || []).forEach((m) => { muvAdMap[m.id] = m.ad || '?'; });

    // ── Dava + İcra tahsilatları ──
    const dosyaGruplari: Array<{ items: Record<string, unknown>[]; kaynak: 'Dava' | 'İcra' }> = [
      { items: (davalar || []) as Record<string, unknown>[], kaynak: 'Dava' },
      { items: (icralar || []) as Record<string, unknown>[], kaynak: 'İcra' },
    ];

    dosyaGruplari.forEach(({ items, kaynak }) => {
      items.forEach((dosya) => {
        const tahsilatlar = raporGelirHareketleri(dosya);
        const muvId = (dosya.muvId as string) || '';
        const dosyaNo = (dosya.no as string) || (dosya.esasNo as string) || (dosya.dosyaNo as string) || '';

        tahsilatlar.forEach((th, index) => {
          const tutar = safeNum(th.tutar);
          if (tutar === 0) return;

          const kdvOrani = safeNum(th.kdvOrani);
          const stopajOrani = safeNum(th.stopajOrani);
          const makbuzKesildi = th.makbuzKesildi === true;

          // Makbuz kesilmediyse KDV/Stopaj sıfır kabul et
          const efektifKdv = makbuzKesildi ? kdvOrani : 0;
          const efektifStopaj = makbuzKesildi ? stopajOrani : 0;
          const { kdvTutar, stopajTutar, netTutar } = bruttenNete(tutar, efektifKdv, efektifStopaj);

          gelirler.push({
            id: (th.id as string) || `${kaynak}-${dosya.id}-gelir-${index}`,
            tarih: (th.tarih as string) || '',
            kaynak,
            tur: turLabel(th.tur as string),
            brutTutar: tutar,
            kdvOrani: efektifKdv,
            kdvTutar,
            stopajOrani: efektifStopaj,
            stopajTutar,
            netTutar,
            makbuzNo: (th.makbuzNo as string) || undefined,
            makbuzKesildi,
            makbuzTarih: (th.makbuzTarih as string) || undefined,
            muvId,
            muvAd: muvAdMap[muvId] || '?',
            dosyaNo,
            dosyaId: dosya.id as string,
          });
        });
      });
    });

    const hizmetGruplari: Array<{ items: Record<string, unknown>[]; kaynak: GelirKaydi['kaynak']; tur: string }> = [
      { items: danismanliklar || [], kaynak: 'Danışmanlık', tur: 'Danışmanlık Ücreti' },
      { items: arabuluculuklar || [], kaynak: 'Arabuluculuk', tur: 'Arabuluculuk Ücreti' },
      { items: ihtarnameler || [], kaynak: 'İhtarname', tur: 'İhtarname Ücreti' },
    ];
    for (const { items, kaynak, tur } of hizmetGruplari) {
      for (const dosya of items) {
        for (const [index, th] of raporGelirHareketleri(dosya, true).entries()) {
          const tutar = safeNum(th.tutar);
          if (tutar === 0) continue;
          const makbuzKesildi = th.makbuzKesildi === true;
          const kdvOrani = makbuzKesildi ? safeNum(th.kdvOrani) : 0;
          const stopajOrani = makbuzKesildi ? safeNum(th.stopajOrani) : 0;
          const hesap = bruttenNete(tutar, kdvOrani, stopajOrani);
          const muvId = String(dosya.muvId || '');
          gelirler.push({
            id: String(th.id || `${dosya.id}-gelir-${index}`),
            tarih: String(th.tarih || ''),
            kaynak, tur, brutTutar: tutar, kdvOrani, stopajOrani,
            ...hesap, makbuzKesildi,
            makbuzNo: th.makbuzNo ? String(th.makbuzNo) : undefined,
            makbuzTarih: th.makbuzTarih ? String(th.makbuzTarih) : undefined,
            muvId, muvAd: muvAdMap[muvId] || '?',
            dosyaNo: String(dosya.no || ''),
            dosyaId: String(dosya.id),
          });
        }
      }
    }

    // Tarihe göre sırala (yeniden eskiye)
    gelirler.sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));

    return gelirler;
  }, [muvekkillar, davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler]);
  const queries = [muvekkilQuery, davaQuery, icraQuery, danismanlikQuery, arabuluculukQuery, ihtarnameQuery];
  return { gelirler, isPending: queries.some(q => q.isPending), isError: queries.some(q => q.isError) };
}

export function useGelirHesapla() {
  return useGelirVerisi().gelirler;
}

// ── Yardımcılar ──────────────────────────────────────────────
function turLabel(tur: string | undefined): string {
  const map: Record<string, string> = {
    'akdi_vekalet': 'Akdi Vekalet',
    'icra_vekalet': 'İcra Vekalet Ücreti',
    'hakediş': 'Hakediş',
    'tahsilat': 'Tahsilat',
    'aktarim': 'Aktarım',
    'iade': 'İade',
  };
  return map[tur || ''] || tur || '—';
}

export const GELIR_KAYNAKLARI = ['Dava', 'İcra', 'Danışmanlık', 'Arabuluculuk', 'İhtarname'] as const;
