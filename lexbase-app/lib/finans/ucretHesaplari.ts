import { anlasilanUcret, dosyaParaOzeti, dosyaMasrafOzeti, safeNum, yuvarla } from '../utils/finans.ts';
import { hizmetUcretHareketleri, raporKaydiGorunurMu } from './gelirKurallari.ts';
import type { RaporVerileri } from './raporHesaplari.ts';

export type FinansKaydi = Record<string, unknown>;
export const DOSYA_GRUPLARI = [
  { key: 'davalar', tur: 'Dava', yol: '/davalar', hizmet: false },
  { key: 'icralar', tur: 'İcra', yol: '/icra', hizmet: false },
  { key: 'danismanliklar', tur: 'Danışmanlık', yol: '/danismanlik', hizmet: true },
  { key: 'arabuluculuklar', tur: 'Arabuluculuk', yol: '/arabuluculuk', hizmet: true },
  { key: 'ihtarnameler', tur: 'İhtarname', yol: '/ihtarname', hizmet: true },
] as const;

export function dosyaUcretOzeti(kayit: FinansKaydi, hizmet = false) {
  const anlasmaToplam = anlasilanUcret(kayit) || (hizmet ? safeNum(kayit.aylikUcret) : 0);
  const tahsilEdilen = hizmet
    ? yuvarla(hizmetUcretHareketleri(kayit).reduce((sum, t) => sum + safeNum(t.tutar), 0))
    : dosyaParaOzeti(kayit).sozlesmeTahsilati;
  const masraf = dosyaMasrafOzeti(kayit);
  if (hizmet && kayit.noterMasrafi) masraf.muvekkil = yuvarla(masraf.muvekkil + safeNum(kayit.noterMasrafi));
  const buroGelir = hizmet ? tahsilEdilen : dosyaParaOzeti(kayit).buroGelir;
  return { anlasmaToplam: yuvarla(anlasmaToplam), tahsilEdilen,
    kalan: yuvarla(anlasmaToplam - tahsilEdilen), buroGelir,
    buroMasraf: masraf.buro, muvekkilMasraf: masraf.muvekkil,
    masrafToplam: yuvarla(masraf.buro + masraf.muvekkil), net: yuvarla(buroGelir - masraf.buro) };
}

export function ucretDosyalari(veriler: RaporVerileri) {
  return DOSYA_GRUPLARI.flatMap(grup => (veriler[grup.key] || [])
    .filter(kayit => raporKaydiGorunurMu(kayit, true))
    .map(kayit => ({ kayit, grup, ...dosyaUcretOzeti(kayit, grup.hizmet) })));
}

export function alacakSatirlari(veriler: RaporVerileri) {
  return ucretDosyalari(veriler).filter(d => d.anlasmaToplam > 0 || d.tahsilEdilen !== 0).map(d => {
    const anlasma = (d.kayit.anlasma || {}) as FinansKaydi;
    return { dosyaId: String(d.kayit.id), dosyaNo: String(d.kayit.no || d.kayit.esasNo || d.kayit.dosyaNo || d.kayit.konu || '—'),
      dosyaTur: d.grup.tur, dosyaLink: `${d.grup.yol}/${d.kayit.id}`, anlasmaToplam: d.anlasmaToplam,
      tahsilEdilen: d.tahsilEdilen, kalan: d.kalan,
      vadeTarihi: anlasma.vadeTarihi as string | undefined, taksitSayisi: anlasma.taksitSayisi as number | undefined,
      taksitOdenen: anlasma.taksitOdenen as number | undefined };
  });
}

export function muvekkilBakiyeleri(muvekkiller: FinansKaydi[], veriler: RaporVerileri) {
  const gruplar = new Map<string, ReturnType<typeof ucretDosyalari>>();
  for (const dosya of ucretDosyalari(veriler)) {
    const id = String(dosya.kayit.muvId || '');
    const grup = gruplar.get(id) || [];
    grup.push(dosya); gruplar.set(id, grup);
  }
  return muvekkiller.filter(m => raporKaydiGorunurMu(m, true)).map(m => {
    const dosyalar = gruplar.get(String(m.id)) || [];
    const sum = (key: 'anlasmaToplam' | 'tahsilEdilen' | 'kalan' | 'masrafToplam' | 'net') =>
      yuvarla(dosyalar.reduce((t, d) => t + d[key], 0));
    return { id: String(m.id), ad: [m.ad || m.unvan, m.soyad].filter(Boolean).join(' ') || '—',
      kayitNo: m.kayitNo as number | undefined, anlasilanToplam: sum('anlasmaToplam'),
      tahsilEdilenToplam: sum('tahsilEdilen'), kalanAlacak: sum('kalan'), masrafToplam: sum('masrafToplam'),
      netBakiye: sum('net'), dosyaSayisi: dosyalar.length };
  });
}

export function dosyaKarlilikHesapla(veriler: RaporVerileri, muvekkiller: FinansKaydi[], filtre: Record<string, string> = {}) {
  const adlar = new Map(muvekkiller.map(m => [String(m.id), String(m.ad || m.unvan || '—')]));
  const dosyalar = ucretDosyalari(veriler).filter(d => {
    const tur = d.grup.key === 'davalar' ? 'dava' : d.grup.key === 'icralar' ? 'icra' : d.grup.key;
    if (filtre.dosyaTur && filtre.dosyaTur !== tur) return false;
    if (filtre.durum === 'aktif' && !['Aktif', 'derdest'].includes(String(d.kayit.durum))) return false;
    if (filtre.durum === 'tamamlanan' && !['Kapalı', 'Kapandı', 'kapandi', 'Kazanıldı', 'Kaybedildi'].includes(String(d.kayit.durum))) return false;
    return true;
  }).map(d => ({ dosyaId: String(d.kayit.id), dosyaTur: d.grup.tur,
    dosyaNo: String(d.kayit.no || d.kayit.esasNo || d.kayit.dosyaNo || ''),
    muvAd: adlar.get(String(d.kayit.muvId)) || '—', konu: String(d.kayit.konu || d.kayit.borclu || ''),
    masraf: d.buroMasraf, muvekkilMasraf: d.muvekkilMasraf, gelir: d.buroGelir, net: d.net,
    karlilikOrani: d.buroGelir > 0 ? yuvarla(d.net / d.buroGelir * 100) : d.buroMasraf > 0 ? -100 : 0 }));
  const sum = (key: 'masraf' | 'gelir' | 'net') => yuvarla(dosyalar.reduce((t, d) => t + d[key], 0));
  return { dosyalar, ozet: { dosyaSayisi: dosyalar.length, topMasraf: sum('masraf'), topGelir: sum('gelir'),
    topNet: sum('net'), ortKarlilik: sum('gelir') > 0 ? yuvarla(sum('net') / sum('gelir') * 100) : 0 } };
}
