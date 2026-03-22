/**
 * Otomatik Hatırlatma Sistemi
 * Finansal ve hukuki süre hatırlatmalarını oluşturur
 */

// ── Hatırlatma türleri ──────────────────────────────────────
export type HatirlatmaTuru =
  | 'odeme_vadesi'         // Ödeme / taksit vadesi yaklaşıyor
  | 'avans_dusuk'          // Avans bakiyesi düşük
  | 'avans_eksi'           // Avans bakiyesi eksiye düşmüş
  | 'tahsilat_gecikme'     // Tahsilat gecikmesi
  | 'dosya_suresi'         // Yasal süre yaklaşıyor
  | 'durusma_yakin'        // Duruşma tarihi yaklaşıyor
  | 'taksit_gecikme'       // Taksit ödemesi gecikmiş
  | 'vekalet_suresi'       // Vekalet süresi sona yaklaşıyor
  | 'beklenen_gelir';      // Beklenen gelir vadesi geçmiş

export interface Hatirlatma {
  id: string;
  tur: HatirlatmaTuru;
  baslik: string;
  aciklama: string;
  oncelik: 'yuksek' | 'orta' | 'dusuk';
  tarih: string;          // İlgili tarih
  kalanGun: number;       // Bugüne kalan gün (negatif = gecikmiş)
  ilgiliId?: string;      // Dosya/müvekkil ID
  ilgiliTip?: string;     // 'dava' | 'icra' | 'muvekkil' vs.
  ilgiliAd?: string;      // Görüntülenecek isim
}

// ── Hatırlatma üretici ──────────────────────────────────────

/** Basit gün farkı hesapla */
function gunFarki(tarih: string): number {
  const hedef = new Date(tarih).getTime();
  const bugun = new Date().setHours(0, 0, 0, 0);
  return Math.ceil((hedef - bugun) / 86400000);
}

/**
 * Taksit hatırlatmaları oluştur
 */
export function taksitHatirlatmalari(
  taksitler: Array<{
    id: string;
    vadeTarihi: string;
    tutar: number;
    odendi: boolean;
    dosyaAd?: string;
    dosyaId?: string;
    muvAd?: string;
  }>,
  onGun: number = 3,
): Hatirlatma[] {
  const sonuc: Hatirlatma[] = [];

  for (const t of taksitler) {
    if (t.odendi) continue;
    const kalan = gunFarki(t.vadeTarihi);

    if (kalan < 0) {
      // Gecikmiş
      sonuc.push({
        id: `taksit-gecik-${t.id}`,
        tur: 'taksit_gecikme',
        baslik: `Taksit Gecikmesi: ${t.dosyaAd || 'Bilinmeyen'}`,
        aciklama: `${Math.abs(kalan)} gün gecikmiş — ${t.tutar.toLocaleString('tr-TR')} TL`,
        oncelik: 'yuksek',
        tarih: t.vadeTarihi,
        kalanGun: kalan,
        ilgiliId: t.dosyaId,
        ilgiliAd: t.muvAd,
      });
    } else if (kalan <= onGun) {
      // Yaklaşan
      sonuc.push({
        id: `taksit-yakin-${t.id}`,
        tur: 'odeme_vadesi',
        baslik: `Taksit Vadesi: ${t.dosyaAd || 'Bilinmeyen'}`,
        aciklama: `${kalan} gün kaldı — ${t.tutar.toLocaleString('tr-TR')} TL`,
        oncelik: kalan <= 1 ? 'yuksek' : 'orta',
        tarih: t.vadeTarihi,
        kalanGun: kalan,
        ilgiliId: t.dosyaId,
        ilgiliAd: t.muvAd,
      });
    }
  }

  return sonuc;
}

/**
 * Avans kasası hatırlatmaları
 */
export function avansHatirlatmalari(
  kasalar: Array<{
    muvId: string;
    muvAd: string;
    bakiye: number;
  }>,
  esik: number = 500,
): Hatirlatma[] {
  const bugun = new Date().toISOString().slice(0, 10);
  const sonuc: Hatirlatma[] = [];

  for (const k of kasalar) {
    if (k.bakiye < 0) {
      sonuc.push({
        id: `avans-eksi-${k.muvId}`,
        tur: 'avans_eksi',
        baslik: `Avans Eksiye Düşmüş: ${k.muvAd}`,
        aciklama: `Bakiye: ${k.bakiye.toLocaleString('tr-TR')} TL`,
        oncelik: 'yuksek',
        tarih: bugun,
        kalanGun: 0,
        ilgiliId: k.muvId,
        ilgiliTip: 'muvekkil',
        ilgiliAd: k.muvAd,
      });
    } else if (k.bakiye < esik && k.bakiye >= 0) {
      sonuc.push({
        id: `avans-dusuk-${k.muvId}`,
        tur: 'avans_dusuk',
        baslik: `Düşük Avans: ${k.muvAd}`,
        aciklama: `Bakiye: ${k.bakiye.toLocaleString('tr-TR')} TL (eşik: ${esik} TL)`,
        oncelik: 'orta',
        tarih: bugun,
        kalanGun: 0,
        ilgiliId: k.muvId,
        ilgiliTip: 'muvekkil',
        ilgiliAd: k.muvAd,
      });
    }
  }

  return sonuc;
}

/**
 * Duruşma hatırlatmaları
 */
export function durusmaHatirlatmalari(
  durusmalar: Array<{
    dosyaId: string;
    dosyaAd: string;
    tarih: string;
    muvAd?: string;
  }>,
  onGun: number = 7,
): Hatirlatma[] {
  const sonuc: Hatirlatma[] = [];

  for (const d of durusmalar) {
    if (!d.tarih) continue;
    const kalan = gunFarki(d.tarih);
    if (kalan < 0 || kalan > onGun) continue;

    sonuc.push({
      id: `durusma-${d.dosyaId}-${d.tarih}`,
      tur: 'durusma_yakin',
      baslik: `Duruşma: ${d.dosyaAd}`,
      aciklama: kalan === 0 ? 'BUGÜN!' : `${kalan} gün kaldı`,
      oncelik: kalan <= 1 ? 'yuksek' : kalan <= 3 ? 'orta' : 'dusuk',
      tarih: d.tarih,
      kalanGun: kalan,
      ilgiliId: d.dosyaId,
      ilgiliTip: 'dava',
      ilgiliAd: d.muvAd,
    });
  }

  return sonuc;
}

/**
 * Beklenen gelir hatırlatmaları
 */
export function beklenenGelirHatirlatmalari(
  gelirler: Array<{
    id: string;
    aciklama: string;
    tutar: number;
    tarih: string;
    muvAd?: string;
  }>,
  onGun: number = 5,
): Hatirlatma[] {
  const sonuc: Hatirlatma[] = [];

  for (const g of gelirler) {
    if (!g.tarih) continue;
    const kalan = gunFarki(g.tarih);

    if (kalan < -30) continue; // 30 günden fazla gecikmiş olanları gösterme

    if (kalan < 0) {
      sonuc.push({
        id: `gelir-gecik-${g.id}`,
        tur: 'beklenen_gelir',
        baslik: `Gecikmiş Gelir: ${g.aciklama}`,
        aciklama: `${Math.abs(kalan)} gün gecikmiş — ${g.tutar.toLocaleString('tr-TR')} TL`,
        oncelik: 'orta',
        tarih: g.tarih,
        kalanGun: kalan,
        ilgiliAd: g.muvAd,
      });
    } else if (kalan <= onGun) {
      sonuc.push({
        id: `gelir-yakin-${g.id}`,
        tur: 'beklenen_gelir',
        baslik: `Yaklaşan Gelir: ${g.aciklama}`,
        aciklama: `${kalan} gün kaldı — ${g.tutar.toLocaleString('tr-TR')} TL`,
        oncelik: 'dusuk',
        tarih: g.tarih,
        kalanGun: kalan,
        ilgiliAd: g.muvAd,
      });
    }
  }

  return sonuc;
}

/**
 * Tüm hatırlatmaları birleştir ve önceliğe göre sırala
 */
export function hatirlatmalariSirala(hatirlatmalar: Hatirlatma[]): Hatirlatma[] {
  const oncelikSira: Record<string, number> = { yuksek: 0, orta: 1, dusuk: 2 };
  return [...hatirlatmalar].sort((a, b) => {
    const oncelikFark = (oncelikSira[a.oncelik] || 2) - (oncelikSira[b.oncelik] || 2);
    if (oncelikFark !== 0) return oncelikFark;
    return a.kalanGun - b.kalanGun; // En yakın olanlar önce
  });
}

// ── Hatırlatma türü etiketleri ──────────────────────────────
export const HATIRLATMA_ETIKETLERI: Record<HatirlatmaTuru, string> = {
  odeme_vadesi: 'Ödeme Vadesi',
  avans_dusuk: 'Düşük Avans',
  avans_eksi: 'Eksi Avans',
  tahsilat_gecikme: 'Tahsilat Gecikmesi',
  dosya_suresi: 'Yasal Süre',
  durusma_yakin: 'Duruşma',
  taksit_gecikme: 'Taksit Gecikmesi',
  vekalet_suresi: 'Vekalet Süresi',
  beklenen_gelir: 'Beklenen Gelir',
};

export const HATIRLATMA_IKONLARI: Record<HatirlatmaTuru, string> = {
  odeme_vadesi: '💳',
  avans_dusuk: '⚠️',
  avans_eksi: '🔴',
  tahsilat_gecikme: '📅',
  dosya_suresi: '⏰',
  durusma_yakin: '⚖️',
  taksit_gecikme: '🚨',
  vekalet_suresi: '📋',
  beklenen_gelir: '💰',
};
