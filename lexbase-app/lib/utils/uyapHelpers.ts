/* ══════════════════════════════════════════════════════════════
   UYAP Yardımcı Fonksiyonlar
   ══════════════════════════════════════════════════════════════ */

/**
 * Tam mahkeme adı oluştur
 * Adliye varsa il yerine adliye kullanılır
 * Ör: "Büyükçekmece 3. ASLİYE HUKUK MAHKEMESİ"
 */
export function tamMahkemeAdi(il?: string, mno?: string, mtur?: string, adliye?: string): string {
  const parcalar: string[] = [];
  // Adliye varsa onu kullan, yoksa il
  const yer = adliye || il;
  if (yer) parcalar.push(yer);
  if (mno) parcalar.push(`${mno}.`);
  if (mtur) parcalar.push(mtur);
  return parcalar.join(' ') || '';
}

/**
 * Tam icra dairesi adı oluştur
 * Ör: "İstanbul 5. İcra Müdürlüğü"
 */
export function tamIcraDairesiAdi(il?: string, daire?: string): string {
  const parcalar: string[] = [];
  if (il) parcalar.push(il);
  if (daire) parcalar.push(daire);
  if (parcalar.length > 0 && !daire?.toLowerCase().includes('müdürlüğü')) {
    parcalar.push('İcra Müdürlüğü');
  }
  return parcalar.join(' ') || '';
}

/**
 * Esas no formatla
 * Ör: "2026/123"
 */
export function esasNoGoster(esasYil?: string, esasNo?: string): string {
  if (!esasYil && !esasNo) return '';
  if (esasYil && esasNo) return `${esasYil}/${esasNo}`;
  return esasNo || esasYil || '';
}

/**
 * Esas no'yu parçala (import için)
 * "2026/123" → { esasYil: "2026", esasNo: "123" }
 */
export function esasNoParcala(esas?: string): { esasYil: string; esasNo: string } {
  if (!esas) return { esasYil: '', esasNo: '' };
  const parts = esas.split('/');
  if (parts.length === 2) {
    return { esasYil: parts[0].trim(), esasNo: parts[1].trim() };
  }
  return { esasYil: '', esasNo: esas.trim() };
}

/**
 * Süre hesapla
 * @param baslangicTarih - başlangıç tarihi (ISO string)
 * @param gunSayisi - toplam gün sayısı
 */
export function sureHesapla(baslangicTarih: string, gunSayisi: number): {
  sonTarih: string;
  kalanGun: number;
  gecmis: boolean;
  acil: boolean;
} {
  const baslangic = new Date(baslangicTarih);
  const son = new Date(baslangic);
  son.setDate(son.getDate() + gunSayisi);

  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  son.setHours(0, 0, 0, 0);

  const kalanMs = son.getTime() - bugun.getTime();
  const kalanGun = Math.ceil(kalanMs / (1000 * 60 * 60 * 24));

  return {
    sonTarih: son.toISOString().split('T')[0],
    kalanGun,
    gecmis: kalanGun < 0,
    acil: kalanGun >= 0 && kalanGun <= 3,
  };
}

/**
 * Süre rengi (CSS class)
 */
export function sureRengi(kalanGun: number): string {
  if (kalanGun < 0) return 'text-text-dim line-through';
  if (kalanGun <= 2) return 'text-red';
  if (kalanGun <= 7) return 'text-orange-400';
  return 'text-green';
}

/**
 * Süre badge rengi (background)
 */
export function sureBadgeRengi(kalanGun: number): string {
  if (kalanGun < 0) return 'bg-surface2 text-text-dim';
  if (kalanGun <= 2) return 'bg-red/15 text-red border-red/20';
  if (kalanGun <= 7) return 'bg-orange-400/15 text-orange-400 border-orange-400/20';
  return 'bg-green/15 text-green border-green/20';
}

/**
 * Davacı / Davalı belirle
 * taraf = müvekkilin pozisyonu
 */
export function davaciBelirle(
  taraf: string | undefined,
  muvAd: string,
  karsiAd: string
): { davaci: string; davali: string } {
  if (taraf === 'davaci' || taraf === 'mudahil') {
    return { davaci: muvAd, davali: karsiAd };
  }
  return { davaci: karsiAd, davali: muvAd };
}

/**
 * Alacaklı / Borçlu belirle
 * muvRol = müvekkilin rolü
 */
export function alacakliBelirle(
  muvRol: string | undefined,
  muvAd: string,
  borcluAd: string
): { alacakli: string; borclu: string } {
  if (muvRol === 'borclu') {
    return { alacakli: borcluAd, borclu: muvAd };
  }
  return { alacakli: muvAd, borclu: borcluAd };
}

/**
 * Dosya numarası oluştur
 */
export function dosyaNoOlustur(prefix: string, no?: number): string {
  if (!no) return '';
  return `${prefix}-${String(no).padStart(3, '0')}`;
}

/**
 * Duruşma tarih+saat formatla
 */
export function durusmaTarihSaatGoster(tarih?: string, saat?: string): string {
  if (!tarih) return '';
  const t = new Date(tarih);
  const gun = t.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (saat) return `${gun} ${saat}`;
  return gun;
}

/**
 * Duruşmaya kalan gün
 */
export function durusmayaKalanGun(tarih?: string): number | null {
  if (!tarih) return null;
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const hedef = new Date(tarih);
  hedef.setHours(0, 0, 0, 0);
  return Math.ceil((hedef.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Dava dosya başlığı oluştur
 * Ör: "İstanbul 14.Sulh Hukuk 2023/3654 E."
 */
export function davaDosyaBaslik(dava: {
  il?: string; adliye?: string; mno?: string; mtur?: string;
  esasYil?: string; esasNo?: string;
  konu?: string; no?: string;
}): string {
  const parcalar: string[] = [];
  const yer = dava.adliye || dava.il;
  if (yer) parcalar.push(yer);
  if (dava.mno) parcalar.push(`${dava.mno}.`);
  if (dava.mtur) parcalar.push(dava.mtur);
  const esas = esasNoGoster(dava.esasYil, dava.esasNo);
  if (esas) parcalar.push(`${esas} E.`);
  if (parcalar.length > 0) return parcalar.join(' ');
  return dava.konu || dava.no || '—';
}

/**
 * İcra dosya başlığı oluştur
 * Ör: "Ankara 2.İcra Dairesi 2025/452 E."
 */
export function icraDosyaBaslik(icra: {
  il?: string; daire?: string;
  esasYil?: string; esasNo?: string;
  esas?: string; borclu?: string; no?: string;
}): string {
  const parcalar: string[] = [];
  if (icra.il) parcalar.push(icra.il);
  if (icra.daire) parcalar.push(icra.daire);
  const esas = esasNoGoster(icra.esasYil, icra.esasNo) || icra.esas || '';
  if (esas) parcalar.push(`${esas} E.`);
  if (parcalar.length > 0) return parcalar.join(' ');
  return icra.borclu || icra.no || '—';
}

/**
 * İhtarname dosya başlığı oluştur
 * Ör: "Bakırköy 42.Noterliği 14.03.2025 tarih 4569 Yevmiye No"
 */
export function ihtarnameDosyaBaslik(ihtarname: {
  noterAd?: string; noterNo?: string;
  tarih?: string; no?: string; konu?: string;
}): string {
  const parcalar: string[] = [];
  if (ihtarname.noterAd) {
    parcalar.push(ihtarname.noterAd);
    if (ihtarname.noterNo) parcalar.push(ihtarname.noterNo);
  }
  if (ihtarname.tarih) {
    const d = new Date(ihtarname.tarih);
    parcalar.push(d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    parcalar.push('tarih');
  }
  if (ihtarname.no) {
    parcalar.push(`${ihtarname.no} Yevmiye No`);
  }
  if (parcalar.length > 0) return parcalar.join(' ');
  return ihtarname.konu || ihtarname.no || '—';
}
