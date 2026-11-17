import { karZararHesapla, raporDonemindeMi, type RaporVerileri } from './raporHesaplari.ts';
import { gelirListesiOlustur } from './gelirListesi.ts';
import { alacakSatirlari } from './ucretHesaplari.ts';
import { finansBugunu } from './beklenenHesaplari.ts';
import { yuvarla } from '../utils/finans.ts';

export function dashboardFinansHesapla(veriler: RaporVerileri, bugun = finansBugunu()) {
  const yil = Number(bugun.slice(0, 4)), ay = Number(bugun.slice(5, 7));
  const aylik = Array.from({ length: 12 }, (_, i) => karZararHesapla(veriler, yil, i + 1));
  const kaynaklar = new Map<string, number>();
  for (const gelir of gelirListesiOlustur(veriler)) if (raporDonemindeMi(gelir.tarih, yil)) {
    kaynaklar.set(gelir.kaynak, yuvarla((kaynaklar.get(gelir.kaynak) || 0) + gelir.brutTutar));
  }
  return { yilNet: karZararHesapla(veriler, yil).net,
    buAyTahsilat: aylik[ay - 1].gelirler.toplam,
    ucretAlacagi: yuvarla(alacakSatirlari(veriler).reduce((t, d) => t + Math.max(0, d.kalan), 0)),
    aylikVeri: { gelirler: aylik.map(a => a.gelirler.toplam), giderler: aylik.map(a => a.giderler.toplam) },
    kaynakDagilim: [...kaynaklar].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]) };
}
