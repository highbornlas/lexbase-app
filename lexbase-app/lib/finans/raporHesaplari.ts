import { safeNum, yuvarla } from '../utils/finans.ts';
import { raporGelirHareketleri, raporKaydiGorunurMu } from './gelirKurallari.ts';

type Kayit = Record<string, unknown>;
export interface RaporVerileri {
  davalar?: Kayit[]; icralar?: Kayit[]; danismanliklar?: Kayit[];
  arabuluculuklar?: Kayit[]; ihtarnameler?: Kayit[]; giderler?: Kayit[];
}

export function raporTarihi(tarih: unknown): string | null {
  if (typeof tarih !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return null;
  const date = new Date(`${tarih}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === tarih ? tarih : null;
}

export function raporDonemindeMi(tarih: unknown, yil?: number, ay?: number): boolean {
  if (yil === undefined && ay === undefined) return true;
  if (yil === undefined || !Number.isInteger(yil) || yil < 1 || yil > 9999
    || (ay !== undefined && (!Number.isInteger(ay) || ay < 1 || ay > 12))) return false;
  const valid = raporTarihi(tarih);
  return !!valid && Number(valid.slice(0, 4)) === yil && (ay === undefined || Number(valid.slice(5, 7)) === ay);
}

export function karZararHesapla(veriler: RaporVerileri, yil?: number, ay?: number) {
  const gelirler = { akdiVekaletUcreti: 0, karsiVekaletHakedis: 0, danismanlikGeliri: 0,
    arabuluculukGeliri: 0, ihtarnameGeliri: 0, digerGelir: 0, toplam: 0 };
  let dosyaMasraflari = 0, muvekkilMasraflari = 0, buroGiderToplam = 0;
  const buroGiderleri: Record<string, number> = {};
  const gruplar = [
    { items: veriler.davalar || [], key: null }, { items: veriler.icralar || [], key: null },
    { items: veriler.danismanliklar || [], key: 'danismanlikGeliri' as const },
    { items: veriler.arabuluculuklar || [], key: 'arabuluculukGeliri' as const },
    { items: veriler.ihtarnameler || [], key: 'ihtarnameGeliri' as const },
  ];
  for (const { items, key } of gruplar) for (const record of items) {
    if (!raporKaydiGorunurMu(record, true)) continue;
    for (const movement of raporGelirHareketleri(record, key !== null)) {
      if (!raporDonemindeMi(movement.tarih, yil, ay)) continue;
      const tutar = safeNum(movement.tutar);
      if (key) gelirler[key] += tutar;
      else if (movement.tur === 'akdi_vekalet') gelirler.akdiVekaletUcreti += tutar;
      else gelirler.karsiVekaletHakedis += tutar;
    }
    const expenses = Array.isArray(record.harcamalar) ? record.harcamalar : [];
    for (const expense of expenses) if (expense && !expense._silindi && raporDonemindeMi(expense.tarih, yil, ay)) {
      if (expense.masrafSahibi === 'buro') dosyaMasraflari += safeNum(expense.tutar);
      else muvekkilMasraflari += safeNum(expense.tutar);
    }
    if (key === 'ihtarnameGeliri' && raporDonemindeMi(record.tarih, yil, ay)) muvekkilMasraflari += safeNum(record.noterMasrafi);
  }
  for (const expense of veriler.giderler || []) {
    if (!raporKaydiGorunurMu(expense, true) || !raporDonemindeMi(expense.tarih, yil, ay)) continue;
    const tutar = expense.netTutar === null || expense.netTutar === undefined || expense.netTutar === ''
      ? safeNum(expense.tutar) : safeNum(expense.netTutar);
    const kategori = typeof expense.kategori === 'string' && expense.kategori ? expense.kategori : 'Diğer';
    buroGiderleri[kategori] = yuvarla((buroGiderleri[kategori] || 0) + tutar);
    buroGiderToplam += tutar;
  }
  for (const key of Object.keys(gelirler) as Array<keyof typeof gelirler>) gelirler[key] = yuvarla(gelirler[key]);
  gelirler.toplam = yuvarla(Object.values(gelirler).reduce((sum, value) => sum + value, 0));
  const toplamGider = yuvarla(buroGiderToplam + dosyaMasraflari);
  const net = yuvarla(gelirler.toplam - toplamGider);
  return { gelirler, giderler: { buroGiderleri, buroGiderToplam: yuvarla(buroGiderToplam),
    dosyaMasraflari: yuvarla(dosyaMasraflari), toplam: toplamGider }, muvekkilMasraflari: yuvarla(muvekkilMasraflari), net,
    karZararOrani: gelirler.toplam > 0 ? yuvarla(net / gelirler.toplam * 100) : 0 };
}

export function vergiOzetiHesapla(gelirler: Kayit[], giderler: Kayit[], yil: number, ceyrek = 0) {
  const ilkAy = ceyrek === 0 ? 1 : (ceyrek - 1) * 3 + 1;
  const sonAy = ceyrek === 0 ? 12 : ilkAy + 2;
  const aylik = Array.from({ length: sonAy - ilkAy + 1 }, (_, i) => ({ ay: ilkAy + i,
    gelirKdv: 0, giderKdv: 0, gelirStopaj: 0, giderStopaj: 0 }));
  const donem = new Map(aylik.map(row => [row.ay, row]));
  for (const gelir of gelirler) {
    if (gelir.makbuzKesildi !== true) continue;
    const tarih = raporTarihi(gelir.makbuzTarih || gelir.tarih);
    if (!raporDonemindeMi(tarih, yil)) continue;
    const row = donem.get(Number(tarih!.slice(5, 7)));
    if (row) { row.gelirKdv += safeNum(gelir.kdvTutar); row.gelirStopaj += safeNum(gelir.stopajTutar); }
  }
  for (const gider of giderler) {
    if (!raporKaydiGorunurMu(gider, true) || !raporDonemindeMi(gider.tarih, yil)) continue;
    const row = donem.get(Number(String(gider.tarih).slice(5, 7)));
    if (row) { row.giderKdv += safeNum(gider.kdvTutar); row.giderStopaj += safeNum(gider.stopajTutar); }
  }
  for (const row of aylik) for (const key of ['gelirKdv', 'giderKdv', 'gelirStopaj', 'giderStopaj'] as const) row[key] = yuvarla(row[key]);
  const sum = (key: 'gelirKdv' | 'giderKdv' | 'gelirStopaj' | 'giderStopaj') => yuvarla(aylik.reduce((total, row) => total + row[key], 0));
  const toplamGelirKdv = sum('gelirKdv'), toplamGiderKdv = sum('giderKdv');
  return { aylik, toplamGelirKdv, toplamGiderKdv, odenecekKdv: yuvarla(toplamGelirKdv - toplamGiderKdv),
    toplamGelirStopaj: sum('gelirStopaj'), toplamGiderStopaj: sum('giderStopaj') };
}
