/**
 * Taksitli Ödeme Planı — Ortak tiplendirme ve hesaplama
 * Tüm modüllerde (Dava, İcra, Danışmanlık, Arabuluculuk, İhtarname) kullanılır.
 */

export interface Taksit {
  id: string;
  no: number;
  vadeTarihi: string;
  tutar: number;
  odpiYapildiMi: boolean;
  odemeTarihi?: string;
}

export interface OdemePlani {
  aktif: boolean;
  toplamTutar: number;
  taksitSayisi: number;
  baslangicTarihi: string;
  taksitler: Taksit[];
}

/**
 * Taksit planı oluştur — eşit taksitler
 */
export function odemePlaniOlustur(
  toplamTutar: number,
  taksitSayisi: number,
  baslangicTarihi: string,
  aralikAy: number = 1,
): OdemePlani {
  if (taksitSayisi <= 0 || toplamTutar <= 0) {
    return { aktif: true, toplamTutar, taksitSayisi: 0, baslangicTarihi, taksitler: [] };
  }

  const taksitTutar = Math.floor((toplamTutar / taksitSayisi) * 100) / 100;
  const sonTaksitFark = toplamTutar - taksitTutar * (taksitSayisi - 1);
  const taksitler: Taksit[] = [];

  for (let i = 0; i < taksitSayisi; i++) {
    const vade = new Date(baslangicTarihi);
    vade.setMonth(vade.getMonth() + i * aralikAy);

    taksitler.push({
      id: crypto.randomUUID(),
      no: i + 1,
      vadeTarihi: vade.toISOString().slice(0, 10),
      tutar: i === taksitSayisi - 1 ? Math.round(sonTaksitFark * 100) / 100 : taksitTutar,
      odpiYapildiMi: false,
    });
  }

  return {
    aktif: true,
    toplamTutar,
    taksitSayisi,
    baslangicTarihi,
    taksitler,
  };
}

/**
 * Ödeme planı özet hesapla
 */
export function odemePlaniOzet(plan: OdemePlani | undefined | null) {
  if (!plan?.taksitler?.length) return { toplam: 0, odenen: 0, kalan: 0, geciken: 0, sonrakiVade: '' };

  const bugun = new Date().toISOString().slice(0, 10);
  let odenen = 0;
  let geciken = 0;
  let sonrakiVade = '';

  plan.taksitler.forEach((t) => {
    if (t.odpiYapildiMi) {
      odenen += t.tutar;
    } else {
      if (t.vadeTarihi < bugun) geciken++;
      if (!sonrakiVade && t.vadeTarihi >= bugun) sonrakiVade = t.vadeTarihi;
    }
  });

  return {
    toplam: plan.toplamTutar,
    odenen,
    kalan: plan.toplamTutar - odenen,
    geciken,
    sonrakiVade,
  };
}
