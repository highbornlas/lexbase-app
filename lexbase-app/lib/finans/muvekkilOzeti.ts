import { hesaplaKasaOzet } from './avansKurallari.ts';
import { dosyaParaOzeti, yuvarla } from '../utils/finans.ts';
import { ucretDosyalari, type FinansKaydi } from './ucretHesaplari.ts';
import type { RaporVerileri } from './raporHesaplari.ts';

export function muvekkilFinansOzeti(muvId: string, veriler: RaporVerileri,
  hareketler: Parameters<typeof hesaplaKasaOzet>[0]) {
  const secili = Object.fromEntries(Object.entries(veriler).map(([key, items]) =>
    [key, (items || []).filter((k: FinansKaydi) => k.muvId === muvId)])) as RaporVerileri;
  const dosyalar = ucretDosyalari(secili);
  const kasa = hesaplaKasaOzet(hareketler.filter(h => h.muvId === muvId));
  const sum = (key: 'anlasmaToplam' | 'tahsilEdilen' | 'buroGelir' | 'muvekkilMasraf') =>
    yuvarla(dosyalar.reduce((t, d) => t + d[key], 0));
  const davaIcra = dosyalar.filter(d => !d.grup.hizmet);
  const para = davaIcra.map(d => dosyaParaOzeti(d.kayit));
  const paraSum = (key: keyof ReturnType<typeof dosyaParaOzeti>) => yuvarla(para.reduce((t, p) => t + p[key], 0));
  const akdiAnlasilan = yuvarla(davaIcra.reduce((t, d) => t + d.anlasmaToplam, 0));
  const akdiTahsil = paraSum('akdiVekalet');
  const hizmet = (key: 'danismanliklar' | 'arabuluculuklar' | 'ihtarnameler') => ({
    gelir: yuvarla(dosyalar.filter(d => d.grup.key === key).reduce((t, d) => t + d.buroGelir, 0)),
  });
  return { muvId,
    masraflar: { toplam: kasa.toplamMasraf, dosyaToplam: sum('muvekkilMasraf') },
    avanslar: { alinan: kasa.toplamAlim, iade: kasa.toplamIade, kalan: kasa.bakiye },
    alacak: { anlasilanToplam: sum('anlasmaToplam'), tahsilEdilen: sum('tahsilEdilen'),
      kalan: yuvarla(sum('anlasmaToplam') - sum('tahsilEdilen')) },
    tahsilatlar: { karsiTaraf: paraSum('karsiTaraf'), icraVekalet: paraSum('icraVekalet') },
    vekaletUcreti: { akdi: { anlasilanToplam: akdiAnlasilan, tahsilEdilen: akdiTahsil, kalan: yuvarla(akdiAnlasilan - akdiTahsil) },
      hakedis: { toplam: paraSum('hakedis') } },
    danismanlik: hizmet('danismanliklar'), arabuluculuk: hizmet('arabuluculuklar'), ihtarname: hizmet('ihtarnameler'),
    buroGelir: sum('buroGelir'),
    bakiye: { masrafBakiye: kasa.bakiye, masrafAlacagi: kasa.masrafAlacagi,
      emanetBakiyesi: kasa.emanetBakiyesi, genelBakiye: kasa.bakiye,
      // Legacy movements do not identify which fee was withheld from client principal.
      tahsilatBakiye: yuvarla(paraSum('karsiTaraf') - paraSum('hakedis') - paraSum('aktarim') - paraSum('iade')) },
  };
}
