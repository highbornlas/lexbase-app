/**
 * Finansal yuvarlama — her zaman 2 ondalik, PostgreSQL numeric(14,2) ile uyumlu
 */
export function yuvarla(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Brutten nete hesaplama
 */
export function bruttenNete(brut: number, kdvOrani: number, stopajOrani: number) {
  const kdvTutar = yuvarla(brut * kdvOrani / 100);
  const stopajTutar = yuvarla(brut * stopajOrani / 100);
  const netTutar = yuvarla(brut + kdvTutar - stopajTutar);
  return { kdvTutar, stopajTutar, netTutar };
}

/**
 * Netten brute hesaplama
 */
export function nettenBrute(net: number, kdvOrani: number, stopajOrani: number) {
  const carpan = 1 + kdvOrani / 100 - stopajOrani / 100;
  if (carpan === 0) return { brutTutar: net, kdvTutar: 0, stopajTutar: 0 };
  const brutTutar = yuvarla(net / carpan);
  const kdvTutar = yuvarla(brutTutar * kdvOrani / 100);
  const stopajTutar = yuvarla(brutTutar * stopajOrani / 100);
  return { brutTutar, kdvTutar, stopajTutar };
}

/**
 * Para formatla (Turk Lirasi)
 */
export function formatTL(tutar: number | null | undefined): string {
  if (tutar == null) return '0,00 \u20BA';
  return yuvarla(tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20BA';
}
