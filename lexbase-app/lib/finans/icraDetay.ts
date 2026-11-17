import { dosyaMasrafToplami, dosyaMasrafOzeti, dosyaParaOzeti, safeNum } from '../utils/finans.ts';
import { raporKaydiGorunurMu } from './gelirKurallari.ts';

export function icraDetayHesabi(icra?: Record<string, unknown> | null) {
  if (!icra) return { masraf: 0, tahsilat: 0, tahsilOran: 0, kalan: 0, evrakSayisi: 0, net: 0 };
  const para = dosyaParaOzeti(icra);
  const alacak = safeNum(icra.alacak);
  return {
    masraf: dosyaMasrafToplami(icra),
    tahsilat: para.karsiTaraf,
    tahsilOran: alacak > 0 ? Math.max(0, Math.min((para.karsiTaraf / alacak) * 100, 100)) : 0,
    kalan: alacak - para.karsiTaraf,
    evrakSayisi: Array.isArray(icra.evraklar) ? icra.evraklar.length : 0,
    net: para.buroGelir - dosyaMasrafOzeti(icra).buro,
  };
}

export function icraIliskiliKayit<T extends { _silindi?: unknown; _arsivlendi?: unknown }>(kayit?: T | null): T | null {
  return kayit && raporKaydiGorunurMu(kayit) ? kayit : null;
}

export function icraMuvekkilAdi(kayit?: { ad?: string; soyad?: string; _silindi?: unknown; _arsivlendi?: unknown } | null) {
  const visible = icraIliskiliKayit(kayit);
  return visible ? [visible.ad, visible.soyad].filter(Boolean).join(' ') : '—';
}
