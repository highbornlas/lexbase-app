/**
 * Finansal yuvarlama — her zaman 2 ondalik, PostgreSQL numeric(14,2) ile uyumlu
 */
export function yuvarla(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Güvenli sayıya çevirme — NaN, undefined, null → 0
 */
export function safeNum(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Brutten nete hesaplama
 */
export function bruttenNete(brut: number, kdvOrani: number, stopajOrani: number) {
  const b = safeNum(brut);
  const kdv = safeNum(kdvOrani);
  const stopaj = safeNum(stopajOrani);
  const kdvTutar = yuvarla(b * kdv / 100);
  const stopajTutar = yuvarla(b * stopaj / 100);
  const netTutar = yuvarla(b + kdvTutar - stopajTutar);
  return { kdvTutar, stopajTutar, netTutar };
}

/**
 * Netten brute hesaplama
 * Guard: carpan <= 0 olursa (stopaj > 100+kdv) brut = net döner
 */
export function nettenBrute(net: number, kdvOrani: number, stopajOrani: number) {
  const n = safeNum(net);
  const kdv = safeNum(kdvOrani);
  const stopaj = safeNum(stopajOrani);
  const carpan = 1 + kdv / 100 - stopaj / 100;
  if (carpan <= 0) return { brutTutar: n, kdvTutar: 0, stopajTutar: 0 };
  const brutTutar = yuvarla(n / carpan);
  const kdvTutar = yuvarla(brutTutar * kdv / 100);
  const stopajTutar = yuvarla(brutTutar * stopaj / 100);
  return { brutTutar, kdvTutar, stopajTutar };
}

/**
 * tahsilatlar dizisinden toplam tahsilat hesapla — tek kaynak (single source of truth)
 */
export function tahsilatToplam(tahsilatlar: Array<{ tutar?: number }> | undefined | null): number {
  if (!tahsilatlar?.length) return 0;
  return yuvarla(tahsilatlar.reduce((t, th) => t + safeNum(th.tutar), 0));
}

export function dosyaParaOzeti(kayit: Record<string, unknown>) {
  const toplamlar = { karsiTaraf: 0, akdiVekalet: 0, hakedis: 0, icraVekalet: 0, aktarim: 0, iade: 0 };
  const hareketler = Array.isArray(kayit.tahsilatlar) ? kayit.tahsilatlar : [];
  for (const hareket of hareketler) {
    if (!hareket || typeof hareket !== 'object') continue;
    const tutar = safeNum(hareket.tutar);
    switch (hareket.tur) {
      case 'tahsilat': case 'borclu_odeme': toplamlar.karsiTaraf += tutar; break;
      case 'akdi_vekalet': toplamlar.akdiVekalet += tutar; break;
      case 'hakediş': toplamlar.hakedis += tutar; break;
      case 'icra_vekalet': toplamlar.icraVekalet += tutar; break;
      case 'aktarim': toplamlar.aktarim += tutar; break;
      case 'iade': toplamlar.iade += tutar; break;
    }
  }
  // Legacy flat totals are a fallback, never additional transactions.
  if (hareketler.length === 0) {
    toplamlar.karsiTaraf = safeNum(kayit.tahsil);
    toplamlar.akdiVekalet = safeNum(kayit.tahsilEdildi);
  }
  return {
    ...Object.fromEntries(Object.entries(toplamlar).map(([key, value]) => [key, yuvarla(value)])) as typeof toplamlar,
    buroGelir: yuvarla(toplamlar.akdiVekalet + toplamlar.hakedis + toplamlar.icraVekalet),
    sozlesmeTahsilati: yuvarla(toplamlar.akdiVekalet),
  };
}

export function dosyaMasrafToplami(kayit: Record<string, unknown>): number {
  const harcamalar = Array.isArray(kayit.harcamalar) ? kayit.harcamalar : [];
  return yuvarla(harcamalar.reduce((sum, h) => sum + safeNum(h?.tutar), 0));
}

export function dosyaMasrafOzeti(kayit: Record<string, unknown>) {
  let buro = 0, muvekkil = 0;
  const harcamalar = Array.isArray(kayit.harcamalar) ? kayit.harcamalar : [];
  for (const harcama of harcamalar) {
    if (!harcama || harcama._silindi) continue;
    if (harcama.masrafSahibi === 'buro') buro += safeNum(harcama.tutar);
    else muvekkil += safeNum(harcama.tutar);
  }
  return { buro: yuvarla(buro), muvekkil: yuvarla(muvekkil) };
}

export function anlasilanUcret(kayit: Record<string, unknown>): number {
  const anlasma = kayit.anlasma && typeof kayit.anlasma === 'object' && !Array.isArray(kayit.anlasma)
    ? kayit.anlasma as Record<string, unknown> : {};
  if (safeNum(anlasma.toplam) > 0) return yuvarla(safeNum(anlasma.toplam));
  const baz = [anlasma.baz, kayit.alacak, kayit.deger].find((v) =>
    (typeof v === 'number' || typeof v === 'string') && v !== '' && Number.isFinite(Number(v)));
  let toplam: number;
  switch (anlasma.tur) {
    case 'basari': case 'tahsilat':
      toplam = safeNum(baz) * safeNum(anlasma.yuzde) / 100;
      break;
    case 'karma':
      toplam = safeNum(anlasma.karmaP) + safeNum(baz) * safeNum(anlasma.karmaYuzde) / 100;
      break;
    default:
      toplam = safeNum(anlasma.ucret);
  }
  return yuvarla(toplam || safeNum(kayit.ucret));
}

/**
 * Para formatla (Turk Lirasi)
 */
export function formatTL(tutar: number | null | undefined): string {
  if (tutar == null) return '0,00 ₺';
  return yuvarla(tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}
