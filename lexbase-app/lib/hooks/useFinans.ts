'use client';

import { useMemo } from 'react';
import { useFinansRaporVerisi } from './useFinansRaporVerisi';
import { useMuvekkillar } from './useMuvekkillar';
import { useAvansHareketleri, useTumAvansHareketleri, hesaplaTumKasalar, AVANS_ESIK } from './useAvansKasasi';
import { useBuroGiderleri } from './useBuroGiderleri';
import { karZararHesapla } from '@/lib/finans/raporHesaplari';
import { muvekkilFinansOzeti } from '@/lib/finans/muvekkilOzeti';
import { dosyaKarlilikHesapla, muvekkilBakiyeleri, ucretDosyalari } from '@/lib/finans/ucretHesaplari';
import { dosyaParaOzeti, yuvarla } from '@/lib/utils/finans';
import { beklenenUcretHesapla, finansBugunu } from '@/lib/finans/beklenenHesaplari';

export function useFinansOzet(muvId: string | null) {
  const kaynak = useFinansRaporVerisi(muvId), kasa = useAvansHareketleri(muvId || undefined);
  const { davalar, icralar, arabuluculuklar, ihtarnameler, danismanliklar } = kaynak.veriler;
  const isPending = kaynak.isPending || kasa.isPending, isError = kaynak.isError || kasa.isError;
  const data = useMemo(() => muvId && !isPending && !isError ? muvekkilFinansOzeti(muvId, {
    davalar, icralar, arabuluculuklar, ihtarnameler, danismanliklar,
  }, kasa.data || []) : null, [muvId, isPending, isError, davalar, icralar, arabuluculuklar, ihtarnameler, danismanliklar, kasa.data]);
  return { data, isPending, isLoading: isPending, isError };
}

export function useBuroKarZarar(yil?: number, ay?: number) {
  const kaynak = useFinansRaporVerisi();
  const gider = useBuroGiderleri();
  const { davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler } = kaynak.veriler;
  const isPending = kaynak.isPending || gider.isPending, isError = kaynak.isError || gider.isError;
  const data = useMemo(() => !isPending && !isError ? karZararHesapla({
    davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, giderler: gider.data,
  }, yil, ay) : null, [davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, gider.data, yil, ay, isPending, isError]);
  return { data, isPending, isLoading: isPending, isError };
}

export function useDosyaKarlilik(filtre?: Record<string, string>) {
  const kaynak = useFinansRaporVerisi(), muv = useMuvekkillar();
  const { davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler } = kaynak.veriler;
  const isPending = kaynak.isPending || muv.isPending, isError = kaynak.isError || muv.isError;
  const data = useMemo(() => !isPending && !isError ? dosyaKarlilikHesapla({
    davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler,
  }, muv.data || [], filtre) : null, [davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, muv.data, filtre, isPending, isError]);
  return { data, isPending, isLoading: isPending, isError };
}

export function useBeklenenGelir() {
  const kaynak = useFinansRaporVerisi(), muv = useMuvekkillar();
  const { davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler } = kaynak.veriler;
  const isPending = kaynak.isPending || muv.isPending, isError = kaynak.isError || muv.isError;
  const bugun = finansBugunu();
  const data = useMemo(() => !isPending && !isError ? beklenenUcretHesapla({
    davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler,
  }, muv.data || [], bugun) : null, [davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, muv.data, bugun, isPending, isError]);
  return { data, isPending, isLoading: isPending, isError };
}

export function useFinansUyarilar() {
  const kaynak = useFinansRaporVerisi(), muv = useMuvekkillar(), kasa = useTumAvansHareketleri();
  const { davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler } = kaynak.veriler;
  const isPending = kaynak.isPending || muv.isPending || kasa.isPending;
  const isError = kaynak.isError || muv.isError || kasa.isError;
  const data = useMemo(() => {
    if (isPending || isError) return [];
    const bakiyeler = muvekkilBakiyeleri(muv.data || [], { davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler });
    const kasalar = hesaplaTumKasalar(kasa.data || []);
    const nakitUyarilari = bakiyeler.flatMap(b => {
      const result: { id: string; muvAd: string; mesaj: string; tutar: number; oncelik: string }[] = [];
      if (b.kalanAlacak > 0) result.push({ id: 'ucret-' + b.id, muvAd: b.ad, mesaj: 'Tahsil edilmemiş ücret alacağı', tutar: b.kalanAlacak, oncelik: 'orta' });
      const k = kasalar.get(b.id);
      if (k && k.bakiye < AVANS_ESIK) result.push({ id: 'kasa-' + b.id, muvAd: b.ad,
        mesaj: k.bakiye < 0 ? 'Müvekkilden alınacak masraf var' : 'Avans bakiyesi düşük',
        tutar: k.bakiye < 0 ? k.masrafAlacagi : k.bakiye, oncelik: k.bakiye < 0 ? 'yuksek' : 'orta' });
      return result;
    });
    const adlar = new Map(bakiyeler.map(b => [b.id, b.ad]));
    const dosyaUyarilari = ucretDosyalari({ davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler }).flatMap(d => {
      const result: typeof nakitUyarilari = [];
      const muvAd = adlar.get(String(d.kayit.muvId)) || '—';
      if (!d.grup.hizmet) {
        const p = dosyaParaOzeti(d.kayit);
        const fark = yuvarla(p.karsiTaraf - p.hakedis - p.aktarim - p.iade);
        if (fark > 100) result.push({ id: `aktarim-${d.grup.tur}-${d.kayit.id}`, muvAd,
          mesaj: 'Karşı taraf tahsilat ve aktarım hareketlerini kontrol edin; bu fark kesin emanet bakiyesi değildir.',
          tutar: fark, oncelik: 'orta' });
      }
      if (d.masrafToplam > 10000) result.push({ id: `masraf-${d.grup.tur}-${d.kayit.id}`, muvAd,
        mesaj: 'Dosya masrafları 10.000 TL kontrol eşiğini aştı.', tutar: d.masrafToplam, oncelik: 'bilgi' });
      return result;
    });
    return [...nakitUyarilari, ...dosyaUyarilari].sort((a, b) => Number(b.oncelik === 'yuksek') - Number(a.oncelik === 'yuksek'));
  }, [davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, muv.data, kasa.data, isPending, isError]);
  return { data, isPending, isLoading: isPending, isError };
}
