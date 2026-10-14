// Keep transfers and refunds out of income and tax summaries.
export function gelirTahsilatiMi(tur: unknown): boolean {
  return tur === 'akdi_vekalet' || tur === 'hakediş' || tur === 'tahsilat';
}
