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

/**
 * Para formatla (Turk Lirasi)
 */
export function formatTL(tutar: number | null | undefined): string {
  if (tutar == null) return '0,00 ₺';
  return yuvarla(tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}
