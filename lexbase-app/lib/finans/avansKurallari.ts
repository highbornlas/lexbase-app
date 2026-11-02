import { safeNum, yuvarla } from '../utils/finans.ts';

interface KasaHareket {
  muvId: string; tip: string; tutar: unknown; _silindi?: unknown;
}

export function hesaplaKasaOzet(hareketler: readonly KasaHareket[]) {
  let toplamAlim = 0, toplamMasraf = 0, toplamIade = 0, hareketSayisi = 0, gecersizHareketSayisi = 0;
  for (const hareket of hareketler) {
    if (hareket._silindi) continue;
    const tutar = safeNum(hareket.tutar);
    if (tutar <= 0 || !['alim', 'masraf', 'iade'].includes(hareket.tip)) { gecersizHareketSayisi++; continue; }
    if (hareket.tip === 'alim') toplamAlim += tutar;
    else if (hareket.tip === 'masraf') toplamMasraf += tutar;
    else toplamIade += tutar;
    hareketSayisi++;
  }
  const bakiye = yuvarla(toplamAlim - toplamMasraf - toplamIade);
  return { toplamAlim: yuvarla(toplamAlim), toplamMasraf: yuvarla(toplamMasraf), toplamIade: yuvarla(toplamIade),
    bakiye, masrafAlacagi: Math.max(0, -bakiye), emanetBakiyesi: Math.max(0, bakiye), hareketSayisi, gecersizHareketSayisi };
}

export function hesaplaTumKasalar(hareketler: readonly KasaHareket[]) {
  const gruplar = new Map<string, KasaHareket[]>();
  for (const hareket of hareketler) {
    if (!hareket.muvId || hareket._silindi) continue;
    const grup = gruplar.get(hareket.muvId) || [];
    grup.push(hareket); gruplar.set(hareket.muvId, grup);
  }
  return new Map(Array.from(gruplar, ([muvId, grup]) => [muvId, { muvId, ...hesaplaKasaOzet(grup) }]));
}
