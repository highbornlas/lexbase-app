export function muvekkileGoreGrupla<T extends { muvId?: string }>(kayitlar: readonly T[]): Map<string, T[]> {
  const gruplar = new Map<string, T[]>();
  for (const kayit of kayitlar) {
    if (!kayit.muvId) continue;
    const grup = gruplar.get(kayit.muvId);
    if (grup) grup.push(kayit);
    else gruplar.set(kayit.muvId, [kayit]);
  }
  return gruplar;
}
