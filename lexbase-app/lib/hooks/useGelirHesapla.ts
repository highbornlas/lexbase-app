'use client';

import { useMemo } from 'react';
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
import { bruttenNete, nettenBrute } from '@/lib/utils/finans';
export { bruttenNete, nettenBrute };

// ── Gelir Hesaplama Hook'u ────────────────────────────────────
export function useGelirHesapla() {
  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const { data: danismanliklar } = useDanismanliklar();
  const { data: arabuluculuklar } = useArabuluculuklar();
  const { data: ihtarnameler } = useIhtarnameler();

  return useMemo(() => {
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
        const tahsilatlar = (dosya.tahsilatlar || []) as Array<Record<string, unknown>>;
        const muvId = (dosya.muvId as string) || '';
        const dosyaNo = (dosya.no as string) || (dosya.esasNo as string) || (dosya.dosyaNo as string) || '';

        tahsilatlar.forEach((th) => {
          const tutar = Number(th.tutar || 0);
          if (tutar <= 0) return;

          const kdvOrani = Number(th.kdvOrani || 0);
          const stopajOrani = Number(th.stopajOrani || 0);
          const makbuzKesildi = th.makbuzKesildi === true;

          // Makbuz kesilmediyse KDV/Stopaj sıfır kabul et
          const efektifKdv = makbuzKesildi ? kdvOrani : 0;
          const efektifStopaj = makbuzKesildi ? stopajOrani : 0;
          const { kdvTutar, stopajTutar, netTutar } = bruttenNete(tutar, efektifKdv, efektifStopaj);

          gelirler.push({
            id: (th.id as string) || crypto.randomUUID(),
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

    // ── Danışmanlık ──
    (danismanliklar || []).forEach((d) => {
      const tutar = Number(d.tahsilEdildi || 0);
      if (tutar <= 0) return;

      const kdvOrani = Number(d.kdvOrani || 0);
      const stopajOrani = Number(d.stopajOrani || 0);
      const makbuzKesildi = (d as Record<string, unknown>).makbuzKesildi === true;
      const efektifKdv = makbuzKesildi ? kdvOrani : 0;
      const efektifStopaj = makbuzKesildi ? stopajOrani : 0;
      const { kdvTutar, stopajTutar, netTutar } = bruttenNete(tutar, efektifKdv, efektifStopaj);

      gelirler.push({
        id: d.id + '-gelir',
        tarih: (d as Record<string, unknown>).sonucTarih as string || (d as Record<string, unknown>).tarih as string || '',
        kaynak: 'Danışmanlık',
        tur: d.sozlesmeModeli === 'sureklii' ? 'Sürekli Danışmanlık' : 'Tek Seferlik',
        brutTutar: tutar,
        kdvOrani: efektifKdv, kdvTutar, stopajOrani: efektifStopaj, stopajTutar, netTutar,
        makbuzNo: (d as Record<string, unknown>).makbuzNo as string || undefined,
        makbuzKesildi,
        makbuzTarih: (d as Record<string, unknown>).makbuzTarih as string || undefined,
        muvId: d.muvId || '',
        muvAd: muvAdMap[d.muvId || ''] || '?',
        dosyaNo: d.no || '',
        dosyaId: d.id,
      });
    });

    // ── Arabuluculuk ──
    (arabuluculuklar || []).forEach((a) => {
      const tutar = Number(a.tahsilEdildi || 0);
      if (tutar <= 0) return;

      const kdvOrani = Number(a.kdvOrani || 0);
      const stopajOrani = Number(a.stopajOrani || 0);
      const makbuzKesildi = (a as Record<string, unknown>).makbuzKesildi === true;
      const efektifKdv = makbuzKesildi ? kdvOrani : 0;
      const efektifStopaj = makbuzKesildi ? stopajOrani : 0;
      const { kdvTutar, stopajTutar, netTutar } = bruttenNete(tutar, efektifKdv, efektifStopaj);

      gelirler.push({
        id: a.id + '-gelir',
        tarih: a.sonucTarih || a.basvuruTarih || '',
        kaynak: 'Arabuluculuk',
        tur: 'Arabuluculuk Ücreti',
        brutTutar: tutar,
        kdvOrani: efektifKdv, kdvTutar, stopajOrani: efektifStopaj, stopajTutar, netTutar,
        makbuzNo: (a as Record<string, unknown>).makbuzNo as string || undefined,
        makbuzKesildi,
        makbuzTarih: (a as Record<string, unknown>).makbuzTarih as string || undefined,
        muvId: a.muvId || '',
        muvAd: muvAdMap[a.muvId || ''] || '?',
        dosyaNo: a.no || '',
        dosyaId: a.id,
      });
    });

    // ── İhtarname ──
    (ihtarnameler || []).forEach((ih) => {
      const tutar = Number(ih.tahsilEdildi || 0);
      if (tutar <= 0) return;

      const kdvOrani = Number(ih.kdvOrani || 0);
      const stopajOrani = Number(ih.stopajOrani || 0);
      const makbuzKesildi = (ih as Record<string, unknown>).makbuzKesildi === true;
      const efektifKdv = makbuzKesildi ? kdvOrani : 0;
      const efektifStopaj = makbuzKesildi ? stopajOrani : 0;
      const { kdvTutar, stopajTutar, netTutar } = bruttenNete(tutar, efektifKdv, efektifStopaj);

      gelirler.push({
        id: ih.id + '-gelir',
        tarih: ih.tarih || '',
        kaynak: 'İhtarname',
        tur: 'İhtarname Ücreti',
        brutTutar: tutar,
        kdvOrani: efektifKdv, kdvTutar, stopajOrani: efektifStopaj, stopajTutar, netTutar,
        makbuzNo: (ih as Record<string, unknown>).makbuzNo as string || undefined,
        makbuzKesildi,
        makbuzTarih: (ih as Record<string, unknown>).makbuzTarih as string || undefined,
        muvId: ih.muvId || '',
        muvAd: muvAdMap[ih.muvId || ''] || '?',
        dosyaNo: ih.no || '',
        dosyaId: ih.id,
      });
    });

    // Tarihe göre sırala (yeniden eskiye)
    gelirler.sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));

    return gelirler;
  }, [muvekkillar, davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler]);
}

// ── Yardımcılar ──────────────────────────────────────────────
function turLabel(tur: string | undefined): string {
  const map: Record<string, string> = {
    'akdi_vekalet': 'Akdi Vekalet',
    'hakediş': 'Hakediş',
    'tahsilat': 'Tahsilat',
    'aktarim': 'Aktarım',
    'iade': 'İade',
  };
  return map[tur || ''] || tur || '—';
}

export const GELIR_KAYNAKLARI = ['Dava', 'İcra', 'Danışmanlık', 'Arabuluculuk', 'İhtarname'] as const;
