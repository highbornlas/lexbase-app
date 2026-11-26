import { bruttenNete, safeNum, yuvarla } from '../utils/finans.ts';
import { raporTarihi } from './raporHesaplari.ts';

export function paraTutariGecerliMi(value: unknown): boolean {
  if (typeof value !== 'number' && typeof value !== 'string') return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 999999999999.99
    && Math.abs(n * 100 - Math.round(n * 100)) < 0.0001;
}

export function buroGiderKaydi(form: Record<string, unknown>) {
  if (typeof form.id !== 'string' || !form.id) throw new Error('Kayıt kimliği bulunamadı.');
  if (typeof form.kategori !== 'string' || !form.kategori.trim()) throw new Error('Kategori seçiniz.');
  if (!paraTutariGecerliMi(form.tutar)) throw new Error('Sıfırdan büyük, en fazla iki ondalıklı bir tutar giriniz.');
  if (!raporTarihi(form.tarih)) throw new Error('Geçerli bir tarih giriniz.');
  for (const key of ['kdvOrani', 'stopajOrani']) {
    const oran = Number(form[key] ?? 0);
    if (!Number.isFinite(oran) || oran < 0 || oran > 100) throw new Error('Vergi oranları 0 ile 100 arasında olmalıdır.');
  }
  return { ...form, id: form.id, tutar: yuvarla(Number(form.tutar)), kategori: form.kategori.trim(),
    ...bruttenNete(Number(form.tutar), Number(form.kdvOrani ?? 0), Number(form.stopajOrani ?? 0)) };
}

export function giderNetTutari(gider: Record<string, unknown>): number {
  return gider.netTutar === undefined || gider.netTutar === null || gider.netTutar === ''
    ? safeNum(gider.tutar) : safeNum(gider.netTutar);
}

export function giderToplamlari(giderler: Record<string, unknown>[]) {
  const aktif = giderler.filter(g => !g._silindi);
  const sum = (field: string) => yuvarla(aktif.reduce((t, g) => t + safeNum(g[field]), 0));
  const bekleyen = (g: Record<string, unknown>) => g.odemeDurumu === 'bekliyor' || g.odemeDurumu === 'gecikti';
  return { tutar: sum('tutar'), kdv: sum('kdvTutar'), stopaj: sum('stopajTutar'),
    net: yuvarla(aktif.reduce((t, g) => t + giderNetTutari(g), 0)),
    odenen: yuvarla(aktif.filter(g => !bekleyen(g)).reduce((t, g) => t + giderNetTutari(g), 0)),
    bekleyen: yuvarla(aktif.filter(bekleyen).reduce((t, g) => t + giderNetTutari(g), 0)) };
}
