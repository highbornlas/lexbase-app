import { alacakSatirlari, type FinansKaydi } from './ucretHesaplari.ts';
import { raporTarihi, type RaporVerileri } from './raporHesaplari.ts';
import { yuvarla } from '../utils/finans.ts';

export function finansBugunu(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// Only recorded fee receivables are income expectations. Client advances are not office income.
export function beklenenUcretHesapla(veriler: RaporVerileri, muvekkiller: FinansKaydi[], bugun = finansBugunu()) {
  if (!raporTarihi(bugun)) throw new Error('Geçersiz rapor tarihi');
  const adlar = new Map(muvekkiller.map(m => [String(m.id), String(m.ad || m.unvan || '—')]));
  const muvIds = new Map<string, string>();
  for (const [key, items] of Object.entries(veriler)) for (const d of items || []) muvIds.set(`${key}:${d.id}`, String(d.muvId || ''));
  const keys: Record<string, string> = { Dava: 'davalar', 'İcra': 'icralar', 'Danışmanlık': 'danismanliklar', Arabuluculuk: 'arabuluculuklar', 'İhtarname': 'ihtarnameler' };
  const beklenenler = alacakSatirlari(veriler).filter(d => d.kalan > 0).map(d => {
    const tarih = raporTarihi(d.vadeTarihi) || '';
    const muvId = muvIds.get(`${keys[d.dosyaTur]}:${d.dosyaId}`) || '';
    const muvAd = adlar.get(muvId) || '—';
    return { id: `${d.dosyaTur}:${d.dosyaId}`, dosyaNo: d.dosyaNo, kaynak: d.dosyaTur, tur: 'Ücret alacağı',
      dosyaLink: d.dosyaLink, muvId, muvAd, tarih, tutar: d.kalan,
      acik: `${muvAd} — Kalan ücret`, aciklama: `${muvAd} — Kalan ücret`,
      gecikmisMi: !!tarih && tarih < bugun };
  }).sort((a, b) => (a.tarih || '9999').localeCompare(b.tarih || '9999'));
  const sum = (fn: (row: typeof beklenenler[number]) => boolean) => yuvarla(beklenenler.filter(fn).reduce((t, d) => t + d.tutar, 0));
  const toplam = sum(() => true), gecikmisToplam = sum(d => d.gecikmisMi);
  const ozet = { toplam, buAy: sum(d => d.tarih.slice(0, 7) === bugun.slice(0, 7)),
    gecikmisToplam, vadesizToplam: sum(d => !d.tarih) };
  return { beklenenler, ozet, items: beklenenler, topTutar: toplam, gecikmisTutar: gecikmisToplam,
    gecikmisAdet: beklenenler.filter(d => d.gecikmisMi).length };
}
