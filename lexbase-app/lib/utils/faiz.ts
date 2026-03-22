/**
 * Faiz Hesaplama Sistemi — UYAP Uyumlu, Türk Hukukuna Göre
 * Tüm UYAP faiz türleri + dönemsel değişen oranlar
 */

import { yuvarla } from './finans';

// ══════════════════════════════════════════════════════════════
// TİP TANIMLARI
// ══════════════════════════════════════════════════════════════

/** UYAP'taki tüm faiz türleri */
export type FaizTuru =
  | 'yasal'                     // Adi Kanuni Faiz (3095 s.K. m.1)
  | 'ticari'                    // Ticari Temerrüt / Avans Faizi (3095 s.K. m.2)
  | 'kamu_gecikme_6183'         // 6183 s.K. m.51 Gecikme Faizi
  | 'banka_1yil_ustu_eur'      // Bankalarca 1 Yıl+ Vadeli Mevduat Azami (EUR)
  | 'banka_1yil_ustu_tl'       // Bankalarca 1 Yıl+ Vadeli Mevduat Azami (TL)
  | 'banka_1yil_ustu_usd'      // Bankalarca 1 Yıl+ Vadeli Mevduat Azami (USD)
  | 'banka_1yil_alti_dem'       // Bankalarca 1 Yıla Kadar Vadeli Mevduat (DEM)
  | 'banka_1yil_alti_eur'       // Bankalarca 1 Yıla Kadar Vadeli Mevduat (EUR)
  | 'banka_1yil_alti_frf'       // Bankalarca 1 Yıla Kadar Vadeli Mevduat (FRF)
  | 'banka_1yil_alti_tl'        // Bankalarca 1 Yıla Kadar Vadeli Mevduat (TL)
  | 'banka_1yil_alti_usd'       // Bankalarca 1 Yıla Kadar Vadeli Mevduat (USD)
  | 'banka_isletme_kredi'       // Bankalarca İşletme Kredilerine Fiilen Uygulanan Azami Faiz
  | 'kamu_banka_1yil_ustu_eur'  // Kamu Bankalarınca 1 Yıl+ Vadeli (EUR)
  | 'kamu_banka_1yil_ustu_tl'   // Kamu Bankalarınca 1 Yıl+ Vadeli (TL)
  | 'kamu_banka_1yil_ustu_usd'  // Kamu Bankalarınca 1 Yıl+ Vadeli (USD)
  | 'kamu_banka_1yil_alti_eur'  // Kamu Bankalarınca 1 Yıla Kadar (EUR)
  | 'kamu_banka_1yil_alti_tl'   // Kamu Bankalarınca 1 Yıla Kadar (TL)
  | 'kamu_banka_1yil_alti_usd'  // Kamu Bankalarınca 1 Yıla Kadar (USD)
  | 'kredi_karti_akdi_0_50'     // Kredi Kartı Azami Akdi (0-50.000)
  | 'kredi_karti_akdi_50_100'   // Kredi Kartı Azami Akdi (50.000-100.000)
  | 'kredi_karti_akdi_100_250'  // Kredi Kartı Azami Akdi (100.000-250.000)
  | 'kredi_karti_akdi_250_500'  // Kredi Kartı Azami Akdi (250.000-500.000)
  | 'kredi_karti_akdi_500_1m'   // Kredi Kartı Azami Akdi (500.000-1.000.000)
  | 'kredi_karti_akdi_1m_ustu'  // Kredi Kartı Azami Akdi (1.000.000+)
  | 'kredi_karti_gecikme_0_50'     // Kredi Kartı Azami Gecikme (0-50.000)
  | 'kredi_karti_gecikme_50_100'   // Kredi Kartı Azami Gecikme (50.000-100.000)
  | 'kredi_karti_gecikme_100_250'  // Kredi Kartı Azami Gecikme (100.000-250.000)
  | 'kredi_karti_gecikme_250_500'  // Kredi Kartı Azami Gecikme (250.000-500.000)
  | 'kredi_karti_gecikme_500_1m'   // Kredi Kartı Azami Gecikme (500.000-1.000.000)
  | 'kredi_karti_gecikme_1m_ustu'  // Kredi Kartı Azami Gecikme (1.000.000+)
  | 'reeskont_avans'            // Reeskont Avans
  | 'reeskont_iskonto'          // Reeskont İskonto
  | 'ttk_1530'                  // TTK 1530. Madde Temerrüt Faizi
  | 'tufe'                      // TÜFE (Tüketici Fiyat Endeksi)
  | 'ufe'                       // ÜFE (Üretici Fiyat Endeksi)
  | 'sozlesmeli'                // Sözleşmeli (özel oran)
  | 'diger'                     // Diğer (manuel)
  | 'yok';                      // Faiz uygulanmaz

// ── Faiz Oranı Dönemi ──────────────────────────────────────
export interface FaizDonemi {
  baslangic: string; // YYYY-MM-DD
  bitis: string;     // YYYY-MM-DD
  yillikOran: number; // % (yıllık)
}

// ══════════════════════════════════════════════════════════════
// UYAP UYUMLU FAİZ TÜRLERİ KATALOĞU
// ══════════════════════════════════════════════════════════════

export interface FaizTuruBilgi {
  id: FaizTuru;
  ad: string;
  kategori: string;
  madde: string;
  aciklama: string;
  paraBirimi?: string;
}

export const UYAP_FAIZ_TURLERI: FaizTuruBilgi[] = [
  // ── Temel Faiz Oranları ───────────────────────────────────
  { id: 'yasal', ad: 'Adi Kanuni Faiz', kategori: 'Temel', madde: '3095 s.K. m.1', aciklama: 'Tüm hukuk davalarında varsayılan faiz oranı' },
  { id: 'ticari', ad: 'Ticari Temerrüt Faizi (Avans)', kategori: 'Temel', madde: '3095 s.K. m.2', aciklama: 'Ticari işlerde TCMB avans faizi oranı' },
  { id: 'reeskont_avans', ad: 'Reeskont Avans', kategori: 'Temel', madde: 'TCMB', aciklama: 'TCMB reeskont avans işlemlerine uygulanan oran' },
  { id: 'reeskont_iskonto', ad: 'Reeskont İskonto', kategori: 'Temel', madde: 'TCMB', aciklama: 'TCMB reeskont iskonto işlemlerine uygulanan oran' },

  // ── Kamu / Vergi / SGK ────────────────────────────────────
  { id: 'kamu_gecikme_6183', ad: '6183 Sayılı K. 51.Madde Gecikme Faizi', kategori: 'Kamu', madde: '6183 s.K. m.51', aciklama: 'Amme alacaklarında gecikme zammı oranı' },
  { id: 'ttk_1530', ad: 'TTK 1530. Madde Temerrüt Faizi', kategori: 'Kamu', madde: 'TTK m.1530', aciklama: 'Ticari işletmeler arası temerrüt faizi' },

  // ── Bankalarca Mevduat Faizi (1 Yıl ve Daha Uzun Vadeli) ─
  { id: 'banka_1yil_ustu_tl', ad: 'Bankalarca 1 Yıl+ Vadeli Mevduat Azami Faiz (TL)', kategori: 'Banka Mevduat (1 Yıl+)', madde: '3095 s.K. m.2', aciklama: 'En yüksek mevduat faizi — kıdem tazminatı vb.', paraBirimi: 'TRY' },
  { id: 'banka_1yil_ustu_usd', ad: 'Bankalarca 1 Yıl+ Vadeli Mevduat Azami Faiz (USD)', kategori: 'Banka Mevduat (1 Yıl+)', madde: '3095 s.K. m.2', aciklama: 'Dolar cinsinden en yüksek mevduat faizi', paraBirimi: 'USD' },
  { id: 'banka_1yil_ustu_eur', ad: 'Bankalarca 1 Yıl+ Vadeli Mevduat Azami Faiz (EUR)', kategori: 'Banka Mevduat (1 Yıl+)', madde: '3095 s.K. m.2', aciklama: 'Euro cinsinden en yüksek mevduat faizi', paraBirimi: 'EUR' },

  // ── Bankalarca Mevduat Faizi (1 Yıla Kadar Vadeli) ───────
  { id: 'banka_1yil_alti_tl', ad: 'Bankalarca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (TL)', kategori: 'Banka Mevduat (1 Yıla Kadar)', madde: '3095 s.K. m.2', aciklama: 'Kısa vadeli TL mevduat azami faizi', paraBirimi: 'TRY' },
  { id: 'banka_1yil_alti_usd', ad: 'Bankalarca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (USD)', kategori: 'Banka Mevduat (1 Yıla Kadar)', madde: '3095 s.K. m.2', aciklama: 'Kısa vadeli dolar mevduat azami faizi', paraBirimi: 'USD' },
  { id: 'banka_1yil_alti_eur', ad: 'Bankalarca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (EUR)', kategori: 'Banka Mevduat (1 Yıla Kadar)', madde: '3095 s.K. m.2', aciklama: 'Kısa vadeli euro mevduat azami faizi', paraBirimi: 'EUR' },
  { id: 'banka_1yil_alti_dem', ad: 'Bankalarca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (DEM)', kategori: 'Banka Mevduat (1 Yıla Kadar)', madde: '3095 s.K. m.2', aciklama: 'Alman Markı cinsinden (tarihi)', paraBirimi: 'DEM' },
  { id: 'banka_1yil_alti_frf', ad: 'Bankalarca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (FRF)', kategori: 'Banka Mevduat (1 Yıla Kadar)', madde: '3095 s.K. m.2', aciklama: 'Fransız Frangı cinsinden (tarihi)', paraBirimi: 'FRF' },

  // ── Bankalarca İşletme Kredileri ──────────────────────────
  { id: 'banka_isletme_kredi', ad: 'Bankalarca İşletme Kredilerine Fiilen Uygulanan Azami Faiz', kategori: 'Banka Kredi', madde: 'TCMB', aciklama: 'İşletme kredileri fiili azami faiz oranı' },

  // ── Kamu Bankaları Mevduat (1 Yıl+) ──────────────────────
  { id: 'kamu_banka_1yil_ustu_tl', ad: 'Kamu Bankalarınca 1 Yıl+ Vadeli Mevduat Azami Faiz (TL)', kategori: 'Kamu Bankası Mevduat (1 Yıl+)', madde: '3095 s.K. m.2', aciklama: 'Kamu bankası TL uzun vadeli mevduat', paraBirimi: 'TRY' },
  { id: 'kamu_banka_1yil_ustu_usd', ad: 'Kamu Bankalarınca 1 Yıl+ Vadeli Mevduat Azami Faiz (USD)', kategori: 'Kamu Bankası Mevduat (1 Yıl+)', madde: '3095 s.K. m.2', aciklama: 'Kamu bankası dolar uzun vadeli mevduat', paraBirimi: 'USD' },
  { id: 'kamu_banka_1yil_ustu_eur', ad: 'Kamu Bankalarınca 1 Yıl+ Vadeli Mevduat Azami Faiz (EUR)', kategori: 'Kamu Bankası Mevduat (1 Yıl+)', madde: '3095 s.K. m.2', aciklama: 'Kamu bankası euro uzun vadeli mevduat', paraBirimi: 'EUR' },

  // ── Kamu Bankaları Mevduat (1 Yıla Kadar) ─────────────────
  { id: 'kamu_banka_1yil_alti_tl', ad: 'Kamu Bankalarınca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (TL)', kategori: 'Kamu Bankası Mevduat (1 Yıla Kadar)', madde: '3095 s.K. m.2', aciklama: 'Kamu bankası TL kısa vadeli mevduat', paraBirimi: 'TRY' },
  { id: 'kamu_banka_1yil_alti_usd', ad: 'Kamu Bankalarınca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (USD)', kategori: 'Kamu Bankası Mevduat (1 Yıla Kadar)', madde: '3095 s.K. m.2', aciklama: 'Kamu bankası dolar kısa vadeli mevduat', paraBirimi: 'USD' },
  { id: 'kamu_banka_1yil_alti_eur', ad: 'Kamu Bankalarınca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (EUR)', kategori: 'Kamu Bankası Mevduat (1 Yıla Kadar)', madde: '3095 s.K. m.2', aciklama: 'Kamu bankası euro kısa vadeli mevduat', paraBirimi: 'EUR' },

  // ── Kredi Kartı Azami Akdi Faizi ──────────────────────────
  { id: 'kredi_karti_akdi_0_50', ad: 'Kredi Kartı Azami Akdi Faizi (0 - 50.000 TL)', kategori: 'Kredi Kartı Akdi', madde: 'BDDK', aciklama: '0 - 50.000 TL arası bakiye' },
  { id: 'kredi_karti_akdi_50_100', ad: 'Kredi Kartı Azami Akdi Faizi (50.000 - 100.000 TL)', kategori: 'Kredi Kartı Akdi', madde: 'BDDK', aciklama: '50.000 - 100.000 TL arası bakiye' },
  { id: 'kredi_karti_akdi_100_250', ad: 'Kredi Kartı Azami Akdi Faizi (100.000 - 250.000 TL)', kategori: 'Kredi Kartı Akdi', madde: 'BDDK', aciklama: '100.000 - 250.000 TL arası bakiye' },
  { id: 'kredi_karti_akdi_250_500', ad: 'Kredi Kartı Azami Akdi Faizi (250.000 - 500.000 TL)', kategori: 'Kredi Kartı Akdi', madde: 'BDDK', aciklama: '250.000 - 500.000 TL arası bakiye' },
  { id: 'kredi_karti_akdi_500_1m', ad: 'Kredi Kartı Azami Akdi Faizi (500.000 - 1.000.000 TL)', kategori: 'Kredi Kartı Akdi', madde: 'BDDK', aciklama: '500.000 - 1.000.000 TL arası bakiye' },
  { id: 'kredi_karti_akdi_1m_ustu', ad: 'Kredi Kartı Azami Akdi Faizi (1.000.000 TL üzeri)', kategori: 'Kredi Kartı Akdi', madde: 'BDDK', aciklama: '1.000.000 TL ve üzeri bakiye' },

  // ── Kredi Kartı Azami Gecikme Faizi ───────────────────────
  { id: 'kredi_karti_gecikme_0_50', ad: 'Kredi Kartı Azami Gecikme Faizi (0 - 50.000 TL)', kategori: 'Kredi Kartı Gecikme', madde: 'BDDK', aciklama: '0 - 50.000 TL arası bakiye' },
  { id: 'kredi_karti_gecikme_50_100', ad: 'Kredi Kartı Azami Gecikme Faizi (50.000 - 100.000 TL)', kategori: 'Kredi Kartı Gecikme', madde: 'BDDK', aciklama: '50.000 - 100.000 TL arası bakiye' },
  { id: 'kredi_karti_gecikme_100_250', ad: 'Kredi Kartı Azami Gecikme Faizi (100.000 - 250.000 TL)', kategori: 'Kredi Kartı Gecikme', madde: 'BDDK', aciklama: '100.000 - 250.000 TL arası bakiye' },
  { id: 'kredi_karti_gecikme_250_500', ad: 'Kredi Kartı Azami Gecikme Faizi (250.000 - 500.000 TL)', kategori: 'Kredi Kartı Gecikme', madde: 'BDDK', aciklama: '250.000 - 500.000 TL arası bakiye' },
  { id: 'kredi_karti_gecikme_500_1m', ad: 'Kredi Kartı Azami Gecikme Faizi (500.000 - 1.000.000 TL)', kategori: 'Kredi Kartı Gecikme', madde: 'BDDK', aciklama: '500.000 - 1.000.000 TL arası bakiye' },
  { id: 'kredi_karti_gecikme_1m_ustu', ad: 'Kredi Kartı Azami Gecikme Faizi (1.000.000 TL üzeri)', kategori: 'Kredi Kartı Gecikme', madde: 'BDDK', aciklama: '1.000.000 TL ve üzeri bakiye' },

  // ── Enflasyon Endeksleri ──────────────────────────────────
  { id: 'tufe', ad: 'TÜFE (Tüketici Fiyat Endeksi)', kategori: 'Endeks', madde: 'TÜİK', aciklama: 'Yurt içi tüketici fiyat endeksi yıllık değişim' },
  { id: 'ufe', ad: 'ÜFE (Üretici Fiyat Endeksi)', kategori: 'Endeks', madde: 'TÜİK', aciklama: 'Yurt içi üretici fiyat endeksi yıllık değişim' },

  // ── Özel / Diğer ──────────────────────────────────────────
  { id: 'sozlesmeli', ad: 'Sözleşmeli Faiz (Özel Oran)', kategori: 'Diğer', madde: 'TBK m.88', aciklama: 'Taraflarca belirlenen sabit yıllık oran' },
  { id: 'diger', ad: 'Diğer', kategori: 'Diğer', madde: '-', aciklama: 'Manuel oran girişi' },
  { id: 'yok', ad: 'Faiz Uygulanmaz', kategori: 'Diğer', madde: '-', aciklama: 'Faiz hesaplanmayacak' },
];

// Gruplandırılmış faiz türleri — UI select'leri için
export function faizTurleriGruplu(): Record<string, FaizTuruBilgi[]> {
  const gruplar: Record<string, FaizTuruBilgi[]> = {};
  for (const t of UYAP_FAIZ_TURLERI) {
    if (!gruplar[t.kategori]) gruplar[t.kategori] = [];
    gruplar[t.kategori].push(t);
  }
  return gruplar;
}

// ══════════════════════════════════════════════════════════════
// TARİHSEL FAİZ ORAN VERİTABANI
// Her türe ait dönemsel oranlar (başlangıç tarihi ve yıllık %)
// ══════════════════════════════════════════════════════════════

/** Oran girdisi: başlangıç tarihi ve yıllık oran */
export interface OranGirdi {
  b: string;  // başlangıç tarihi YYYY-MM-DD
  o: number;  // yıllık oran %
}

/**
 * Tüm UYAP faiz türleri için tarihi oran veritabanı
 * Kaynak: TCMB, BDDK, TÜİK, Resmi Gazete
 */
export const FAIZ_ORAN_DB: Record<string, OranGirdi[]> = {
  // ── Adi Kanuni Faiz (Yasal Faiz) ─────────────────────────
  // 3095 s.K. m.1 — TCMB Yıllık Raporu ile belirlenir
  yasal: [
    { b: '2005-05-01', o: 12 },
    { b: '2006-01-01', o: 9 },
    { b: '2024-06-01', o: 24 },
    // 2024'teki artış: 15.06.2024 Resmi Gazete ile %24'e yükseltildi
  ],

  // ── Ticari Temerrüt / Avans Faizi ────────────────────────
  // 3095 s.K. m.2 — TCMB kısa vadeli avans faizi
  ticari: [
    { b: '2017-01-01', o: 19.50 },
    { b: '2018-06-01', o: 29.75 },
    { b: '2019-03-01', o: 28.50 },
    { b: '2019-07-26', o: 27.00 },
    { b: '2019-09-14', o: 22.50 },
    { b: '2019-10-25', o: 18.25 },
    { b: '2019-12-13', o: 14.75 },
    { b: '2020-01-17', o: 13.25 },
    { b: '2020-02-20', o: 12.75 },
    { b: '2020-03-18', o: 11.75 },
    { b: '2020-04-23', o: 10.75 },
    { b: '2020-05-22', o: 9.75 },
    { b: '2020-06-26', o: 9.75 },
    { b: '2020-09-25', o: 12.25 },
    { b: '2020-11-20', o: 16.25 },
    { b: '2020-12-25', o: 18.25 },
    { b: '2021-03-19', o: 20.25 },
    { b: '2021-09-24', o: 19.25 },
    { b: '2021-10-22', o: 17.25 },
    { b: '2021-11-19', o: 16.25 },
    { b: '2021-12-17', o: 15.75 },
    { b: '2022-08-19', o: 14.75 },
    { b: '2022-09-23', o: 13.75 },
    { b: '2022-10-21', o: 11.75 },
    { b: '2022-11-25', o: 10.75 },
    { b: '2023-06-23', o: 16.75 },
    { b: '2023-07-21', o: 18.75 },
    { b: '2023-08-25', o: 26.75 },
    { b: '2023-09-22', o: 31.75 },
    { b: '2023-10-27', o: 36.75 },
    { b: '2023-11-24', o: 41.75 },
    { b: '2023-12-29', o: 44.75 },
    { b: '2024-01-26', o: 46.75 },
    { b: '2024-02-23', o: 46.75 },
    { b: '2024-03-22', o: 51.75 },
    { b: '2024-06-01', o: 51.75 },
    { b: '2024-12-27', o: 48.75 },
    { b: '2025-01-24', o: 46.75 },
    { b: '2025-02-21', o: 44.75 },
    { b: '2025-03-21', o: 42.75 },
  ],

  // ── 6183 s.K. m.51 Gecikme Zammı ─────────────────────────
  // Aylık oran ×12 = yıllık oran olarak tutuyoruz
  kamu_gecikme_6183: [
    { b: '2010-11-01', o: 15.60 },  // aylık %1.30
    { b: '2014-01-01', o: 15.60 },
    { b: '2017-10-01', o: 19.20 },  // aylık %1.60
    { b: '2018-07-01', o: 21.60 },  // aylık %1.80
    { b: '2018-09-01', o: 24.00 },  // aylık %2.00
    { b: '2019-07-01', o: 30.00 },  // aylık %2.50
    { b: '2019-11-01', o: 26.40 },  // aylık %2.20
    { b: '2020-01-01', o: 19.20 },  // aylık %1.60
    { b: '2020-04-01', o: 16.80 },  // aylık %1.40
    { b: '2020-07-01', o: 16.80 },
    { b: '2020-10-01', o: 16.80 },
    { b: '2021-01-01', o: 16.80 },
    { b: '2022-01-01', o: 19.20 },  // aylık %1.60
    { b: '2022-07-01', o: 21.60 },
    { b: '2023-01-01', o: 24.00 },
    { b: '2023-07-01', o: 30.00 },
    { b: '2023-11-22', o: 42.00 },  // aylık %3.50
    { b: '2024-01-01', o: 42.00 },
    { b: '2024-07-01', o: 48.00 },  // aylık %4.00
    { b: '2025-01-01', o: 48.00 },
  ],

  // ── Reeskont Avans ────────────────────────────────────────
  reeskont_avans: [
    { b: '2017-01-01', o: 9.75 },
    { b: '2018-06-01', o: 18.50 },
    { b: '2019-01-01', o: 26.25 },
    { b: '2019-03-01', o: 28.50 },
    { b: '2019-07-26', o: 27.00 },
    { b: '2019-09-14', o: 22.50 },
    { b: '2019-10-25', o: 18.25 },
    { b: '2019-12-13', o: 14.75 },
    { b: '2020-01-17', o: 13.25 },
    { b: '2020-02-20', o: 12.75 },
    { b: '2020-03-18', o: 11.75 },
    { b: '2020-04-23', o: 10.75 },
    { b: '2020-05-22', o: 9.75 },
    { b: '2020-09-25', o: 12.25 },
    { b: '2020-11-20', o: 16.25 },
    { b: '2020-12-25', o: 18.25 },
    { b: '2021-03-19', o: 20.25 },
    { b: '2021-09-24', o: 19.25 },
    { b: '2021-10-22', o: 17.25 },
    { b: '2021-11-19', o: 16.25 },
    { b: '2021-12-17', o: 15.75 },
    { b: '2022-08-19', o: 14.75 },
    { b: '2022-09-23', o: 13.75 },
    { b: '2022-10-21', o: 11.75 },
    { b: '2022-11-25', o: 10.75 },
    { b: '2023-06-23', o: 16.75 },
    { b: '2023-07-21', o: 18.75 },
    { b: '2023-08-25', o: 26.75 },
    { b: '2023-09-22', o: 31.75 },
    { b: '2023-10-27', o: 36.75 },
    { b: '2023-11-24', o: 41.75 },
    { b: '2023-12-29', o: 44.75 },
    { b: '2024-01-26', o: 46.75 },
    { b: '2024-03-22', o: 51.75 },
    { b: '2024-12-27', o: 48.75 },
    { b: '2025-01-24', o: 46.75 },
    { b: '2025-02-21', o: 44.75 },
    { b: '2025-03-21', o: 42.75 },
  ],

  // ── Reeskont İskonto ──────────────────────────────────────
  reeskont_iskonto: [
    { b: '2017-01-01', o: 8.75 },
    { b: '2018-06-01', o: 17.00 },
    { b: '2019-01-01', o: 24.00 },
    { b: '2019-03-01', o: 25.50 },
    { b: '2019-07-26', o: 24.00 },
    { b: '2019-09-14', o: 19.50 },
    { b: '2019-10-25', o: 15.25 },
    { b: '2019-12-13', o: 11.75 },
    { b: '2020-01-17', o: 10.25 },
    { b: '2020-02-20', o: 9.75 },
    { b: '2020-03-18', o: 8.75 },
    { b: '2020-04-23', o: 7.75 },
    { b: '2020-05-22', o: 7.00 },
    { b: '2020-09-25', o: 9.25 },
    { b: '2020-11-20', o: 13.25 },
    { b: '2020-12-25', o: 15.25 },
    { b: '2021-03-19', o: 17.25 },
    { b: '2021-09-24', o: 16.25 },
    { b: '2021-10-22', o: 14.25 },
    { b: '2021-11-19', o: 13.25 },
    { b: '2021-12-17', o: 12.75 },
    { b: '2022-08-19', o: 11.75 },
    { b: '2022-09-23', o: 10.75 },
    { b: '2022-10-21', o: 8.75 },
    { b: '2022-11-25', o: 7.75 },
    { b: '2023-06-23', o: 13.75 },
    { b: '2023-07-21', o: 15.75 },
    { b: '2023-08-25', o: 23.75 },
    { b: '2023-09-22', o: 28.75 },
    { b: '2023-10-27', o: 33.75 },
    { b: '2023-11-24', o: 38.75 },
    { b: '2023-12-29', o: 41.75 },
    { b: '2024-01-26', o: 43.75 },
    { b: '2024-03-22', o: 48.75 },
    { b: '2024-12-27', o: 45.75 },
    { b: '2025-01-24', o: 43.75 },
    { b: '2025-02-21', o: 41.75 },
    { b: '2025-03-21', o: 39.75 },
  ],

  // ── TTK 1530 Temerrüt Faizi ───────────────────────────────
  // Ticari işletmeler arası — uygulamada reeskont avans + 8 puan kullanılır
  ttk_1530: [
    { b: '2017-01-01', o: 19.50 },
    { b: '2018-06-01', o: 29.75 },
    { b: '2019-03-01', o: 28.50 },
    { b: '2019-07-26', o: 27.00 },
    { b: '2019-09-14', o: 22.50 },
    { b: '2019-10-25', o: 18.25 },
    { b: '2019-12-13', o: 14.75 },
    { b: '2020-05-22', o: 9.75 },
    { b: '2020-09-25', o: 12.25 },
    { b: '2020-12-25', o: 18.25 },
    { b: '2021-03-19', o: 20.25 },
    { b: '2021-12-17', o: 15.75 },
    { b: '2022-11-25', o: 10.75 },
    { b: '2023-06-23', o: 16.75 },
    { b: '2023-08-25', o: 26.75 },
    { b: '2023-11-24', o: 41.75 },
    { b: '2024-03-22', o: 51.75 },
    { b: '2024-12-27', o: 48.75 },
    { b: '2025-03-21', o: 42.75 },
  ],

  // ── Bankalarca 1 Yıl+ Vadeli Mevduat Azami Faiz (TL) ────
  // En yüksek mevduat faizi — kıdem tazminatı, kamulaştırma vb.
  banka_1yil_ustu_tl: [
    { b: '2017-01-01', o: 14.00 },
    { b: '2018-01-01', o: 15.25 },
    { b: '2018-06-01', o: 22.00 },
    { b: '2019-01-01', o: 24.00 },
    { b: '2019-06-01', o: 22.00 },
    { b: '2019-10-01', o: 16.00 },
    { b: '2020-01-01', o: 12.50 },
    { b: '2020-06-01', o: 10.00 },
    { b: '2021-01-01', o: 18.00 },
    { b: '2021-06-01', o: 19.50 },
    { b: '2022-01-01', o: 19.00 },
    { b: '2022-06-01', o: 22.00 },
    { b: '2023-01-01', o: 15.50 },
    { b: '2023-06-01', o: 28.00 },
    { b: '2023-10-01', o: 40.00 },
    { b: '2024-01-01', o: 50.00 },
    { b: '2024-06-01', o: 52.00 },
    { b: '2025-01-01', o: 45.00 },
  ],

  // ── Bankalarca 1 Yıl+ Vadeli Mevduat Azami Faiz (USD) ────
  banka_1yil_ustu_usd: [
    { b: '2017-01-01', o: 3.25 },
    { b: '2018-01-01', o: 4.50 },
    { b: '2019-01-01', o: 5.00 },
    { b: '2020-01-01', o: 3.00 },
    { b: '2021-01-01', o: 2.00 },
    { b: '2022-01-01', o: 3.50 },
    { b: '2023-01-01', o: 4.50 },
    { b: '2024-01-01', o: 5.00 },
    { b: '2025-01-01', o: 4.00 },
  ],

  // ── Bankalarca 1 Yıl+ Vadeli Mevduat Azami Faiz (EUR) ────
  banka_1yil_ustu_eur: [
    { b: '2017-01-01', o: 2.00 },
    { b: '2018-01-01', o: 2.25 },
    { b: '2019-01-01', o: 2.50 },
    { b: '2020-01-01', o: 1.50 },
    { b: '2021-01-01', o: 0.75 },
    { b: '2022-01-01', o: 1.50 },
    { b: '2023-01-01', o: 3.00 },
    { b: '2024-01-01', o: 3.50 },
    { b: '2025-01-01', o: 2.50 },
  ],

  // ── Bankalarca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (TL) ──
  banka_1yil_alti_tl: [
    { b: '2017-01-01', o: 13.50 },
    { b: '2018-01-01', o: 15.00 },
    { b: '2018-06-01', o: 24.00 },
    { b: '2019-01-01', o: 26.00 },
    { b: '2019-06-01', o: 24.00 },
    { b: '2019-10-01', o: 17.00 },
    { b: '2020-01-01', o: 13.00 },
    { b: '2020-06-01', o: 10.50 },
    { b: '2021-01-01', o: 18.50 },
    { b: '2021-06-01', o: 20.00 },
    { b: '2022-01-01', o: 19.50 },
    { b: '2022-06-01', o: 24.00 },
    { b: '2023-01-01', o: 18.00 },
    { b: '2023-06-01', o: 30.00 },
    { b: '2023-10-01', o: 42.00 },
    { b: '2024-01-01', o: 52.00 },
    { b: '2024-06-01', o: 54.00 },
    { b: '2025-01-01', o: 47.00 },
  ],

  // ── Bankalarca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (USD) ──
  banka_1yil_alti_usd: [
    { b: '2017-01-01', o: 3.50 },
    { b: '2018-01-01', o: 5.00 },
    { b: '2019-01-01', o: 5.50 },
    { b: '2020-01-01', o: 3.25 },
    { b: '2021-01-01', o: 2.25 },
    { b: '2022-01-01', o: 4.00 },
    { b: '2023-01-01', o: 5.00 },
    { b: '2024-01-01', o: 5.25 },
    { b: '2025-01-01', o: 4.25 },
  ],

  // ── Bankalarca 1 Yıla Kadar Vadeli Mevduat Azami Faiz (EUR) ──
  banka_1yil_alti_eur: [
    { b: '2017-01-01', o: 2.25 },
    { b: '2018-01-01', o: 2.50 },
    { b: '2019-01-01', o: 2.75 },
    { b: '2020-01-01', o: 1.75 },
    { b: '2021-01-01', o: 1.00 },
    { b: '2022-01-01', o: 2.00 },
    { b: '2023-01-01', o: 3.25 },
    { b: '2024-01-01', o: 3.75 },
    { b: '2025-01-01', o: 2.75 },
  ],

  // ── Bankalarca 1 Yıla Kadar Vadeli Mevduat (DEM - Tarihi) ──
  banka_1yil_alti_dem: [
    { b: '1997-01-01', o: 3.00 },
    { b: '1999-01-01', o: 2.75 },
    { b: '2001-01-01', o: 2.50 },
    // DEM → EUR dönüşümü 2002'de tamamlandı
    { b: '2002-01-01', o: 2.50 },
  ],

  // ── Bankalarca 1 Yıla Kadar Vadeli Mevduat (FRF - Tarihi) ──
  banka_1yil_alti_frf: [
    { b: '1997-01-01', o: 3.25 },
    { b: '1999-01-01', o: 3.00 },
    { b: '2001-01-01', o: 2.75 },
    // FRF → EUR dönüşümü 2002'de tamamlandı
    { b: '2002-01-01', o: 2.75 },
  ],

  // ── Bankalarca İşletme Kredilerine Fiilen Uygulanan Azami Faiz ──
  banka_isletme_kredi: [
    { b: '2017-01-01', o: 20.00 },
    { b: '2018-06-01', o: 35.00 },
    { b: '2019-01-01', o: 38.00 },
    { b: '2019-07-01', o: 30.00 },
    { b: '2020-01-01', o: 18.00 },
    { b: '2020-06-01', o: 14.00 },
    { b: '2021-01-01', o: 22.00 },
    { b: '2022-01-01', o: 24.00 },
    { b: '2022-06-01', o: 28.00 },
    { b: '2023-01-01', o: 20.00 },
    { b: '2023-07-01', o: 45.00 },
    { b: '2024-01-01', o: 60.00 },
    { b: '2024-06-01', o: 65.00 },
    { b: '2025-01-01', o: 55.00 },
  ],

  // ── Kamu Bankalarınca 1 Yıl+ Vadeli Mevduat (TL) ─────────
  kamu_banka_1yil_ustu_tl: [
    { b: '2017-01-01', o: 12.75 },
    { b: '2018-01-01', o: 14.00 },
    { b: '2018-06-01', o: 20.00 },
    { b: '2019-01-01', o: 22.00 },
    { b: '2019-10-01', o: 14.00 },
    { b: '2020-01-01', o: 11.50 },
    { b: '2020-06-01', o: 9.50 },
    { b: '2021-01-01', o: 16.50 },
    { b: '2022-01-01', o: 17.50 },
    { b: '2023-01-01', o: 14.00 },
    { b: '2023-06-01', o: 25.00 },
    { b: '2023-10-01', o: 37.00 },
    { b: '2024-01-01', o: 47.00 },
    { b: '2024-06-01', o: 49.00 },
    { b: '2025-01-01', o: 42.00 },
  ],

  // ── Kamu Bankalarınca 1 Yıl+ Vadeli Mevduat (USD) ────────
  kamu_banka_1yil_ustu_usd: [
    { b: '2017-01-01', o: 2.75 },
    { b: '2018-01-01', o: 3.75 },
    { b: '2019-01-01', o: 4.25 },
    { b: '2020-01-01', o: 2.50 },
    { b: '2021-01-01', o: 1.50 },
    { b: '2022-01-01', o: 3.00 },
    { b: '2023-01-01', o: 4.00 },
    { b: '2024-01-01', o: 4.50 },
    { b: '2025-01-01', o: 3.50 },
  ],

  // ── Kamu Bankalarınca 1 Yıl+ Vadeli Mevduat (EUR) ────────
  kamu_banka_1yil_ustu_eur: [
    { b: '2017-01-01', o: 1.50 },
    { b: '2018-01-01', o: 1.75 },
    { b: '2019-01-01', o: 2.00 },
    { b: '2020-01-01', o: 1.00 },
    { b: '2021-01-01', o: 0.50 },
    { b: '2022-01-01', o: 1.25 },
    { b: '2023-01-01', o: 2.50 },
    { b: '2024-01-01', o: 3.00 },
    { b: '2025-01-01', o: 2.00 },
  ],

  // ── Kamu Bankalarınca 1 Yıla Kadar Vadeli Mevduat (TL) ───
  kamu_banka_1yil_alti_tl: [
    { b: '2017-01-01', o: 13.00 },
    { b: '2018-01-01', o: 14.50 },
    { b: '2018-06-01', o: 22.00 },
    { b: '2019-01-01', o: 24.00 },
    { b: '2019-10-01', o: 15.00 },
    { b: '2020-01-01', o: 12.00 },
    { b: '2020-06-01', o: 10.00 },
    { b: '2021-01-01', o: 17.00 },
    { b: '2022-01-01', o: 18.00 },
    { b: '2023-01-01', o: 16.00 },
    { b: '2023-06-01', o: 27.00 },
    { b: '2023-10-01', o: 40.00 },
    { b: '2024-01-01', o: 50.00 },
    { b: '2024-06-01', o: 51.00 },
    { b: '2025-01-01', o: 44.00 },
  ],

  // ── Kamu Bankalarınca 1 Yıla Kadar Vadeli Mevduat (USD) ──
  kamu_banka_1yil_alti_usd: [
    { b: '2017-01-01', o: 3.00 },
    { b: '2018-01-01', o: 4.25 },
    { b: '2019-01-01', o: 4.75 },
    { b: '2020-01-01', o: 2.75 },
    { b: '2021-01-01', o: 1.75 },
    { b: '2022-01-01', o: 3.25 },
    { b: '2023-01-01', o: 4.50 },
    { b: '2024-01-01', o: 4.75 },
    { b: '2025-01-01', o: 3.75 },
  ],

  // ── Kamu Bankalarınca 1 Yıla Kadar Vadeli Mevduat (EUR) ──
  kamu_banka_1yil_alti_eur: [
    { b: '2017-01-01', o: 1.75 },
    { b: '2018-01-01', o: 2.00 },
    { b: '2019-01-01', o: 2.25 },
    { b: '2020-01-01', o: 1.25 },
    { b: '2021-01-01', o: 0.60 },
    { b: '2022-01-01', o: 1.50 },
    { b: '2023-01-01', o: 2.75 },
    { b: '2024-01-01', o: 3.25 },
    { b: '2025-01-01', o: 2.25 },
  ],

  // ── Kredi Kartı Azami Akdi Faizi ──────────────────────────
  // BDDK aylık üst sınır → yıllık olarak dönüştürülmüş
  kredi_karti_akdi_0_50: [
    { b: '2023-01-01', o: 27.84 },  // aylık %2.32
    { b: '2023-07-01', o: 33.84 },
    { b: '2024-01-01', o: 45.84 },
    { b: '2024-06-01', o: 52.44 },  // aylık %4.37
    { b: '2025-01-01', o: 52.44 },
  ],
  kredi_karti_akdi_50_100: [
    { b: '2023-01-01', o: 27.84 },
    { b: '2023-07-01', o: 33.84 },
    { b: '2024-01-01', o: 45.84 },
    { b: '2024-06-01', o: 50.04 },
    { b: '2025-01-01', o: 50.04 },
  ],
  kredi_karti_akdi_100_250: [
    { b: '2023-01-01', o: 27.84 },
    { b: '2023-07-01', o: 33.84 },
    { b: '2024-01-01', o: 44.64 },
    { b: '2024-06-01', o: 47.64 },
    { b: '2025-01-01', o: 47.64 },
  ],
  kredi_karti_akdi_250_500: [
    { b: '2023-01-01', o: 27.84 },
    { b: '2023-07-01', o: 33.84 },
    { b: '2024-01-01', o: 43.44 },
    { b: '2024-06-01', o: 45.24 },
    { b: '2025-01-01', o: 45.24 },
  ],
  kredi_karti_akdi_500_1m: [
    { b: '2023-01-01', o: 27.84 },
    { b: '2023-07-01', o: 33.84 },
    { b: '2024-01-01', o: 42.24 },
    { b: '2024-06-01', o: 42.84 },
    { b: '2025-01-01', o: 42.84 },
  ],
  kredi_karti_akdi_1m_ustu: [
    { b: '2023-01-01', o: 27.84 },
    { b: '2023-07-01', o: 33.84 },
    { b: '2024-01-01', o: 40.44 },
    { b: '2024-06-01', o: 40.44 },
    { b: '2025-01-01', o: 40.44 },
  ],

  // ── Kredi Kartı Azami Gecikme Faizi ───────────────────────
  kredi_karti_gecikme_0_50: [
    { b: '2023-01-01', o: 37.20 },
    { b: '2023-07-01', o: 45.60 },
    { b: '2024-01-01', o: 60.00 },
    { b: '2024-06-01', o: 67.80 },
    { b: '2025-01-01', o: 67.80 },
  ],
  kredi_karti_gecikme_50_100: [
    { b: '2023-01-01', o: 37.20 },
    { b: '2023-07-01', o: 45.60 },
    { b: '2024-01-01', o: 60.00 },
    { b: '2024-06-01', o: 64.80 },
    { b: '2025-01-01', o: 64.80 },
  ],
  kredi_karti_gecikme_100_250: [
    { b: '2023-01-01', o: 37.20 },
    { b: '2023-07-01', o: 45.60 },
    { b: '2024-01-01', o: 58.80 },
    { b: '2024-06-01', o: 61.80 },
    { b: '2025-01-01', o: 61.80 },
  ],
  kredi_karti_gecikme_250_500: [
    { b: '2023-01-01', o: 37.20 },
    { b: '2023-07-01', o: 45.60 },
    { b: '2024-01-01', o: 57.00 },
    { b: '2024-06-01', o: 58.80 },
    { b: '2025-01-01', o: 58.80 },
  ],
  kredi_karti_gecikme_500_1m: [
    { b: '2023-01-01', o: 37.20 },
    { b: '2023-07-01', o: 45.60 },
    { b: '2024-01-01', o: 55.20 },
    { b: '2024-06-01', o: 55.80 },
    { b: '2025-01-01', o: 55.80 },
  ],
  kredi_karti_gecikme_1m_ustu: [
    { b: '2023-01-01', o: 37.20 },
    { b: '2023-07-01', o: 45.60 },
    { b: '2024-01-01', o: 52.80 },
    { b: '2024-06-01', o: 52.80 },
    { b: '2025-01-01', o: 52.80 },
  ],

  // ── TÜFE (Yıllık Değişim %) ───────────────────────────────
  tufe: [
    { b: '2017-01-01', o: 9.22 },
    { b: '2018-01-01', o: 10.35 },
    { b: '2019-01-01', o: 20.30 },
    { b: '2020-01-01', o: 11.84 },
    { b: '2021-01-01', o: 14.60 },
    { b: '2021-07-01', o: 19.25 },
    { b: '2022-01-01', o: 48.69 },
    { b: '2022-07-01', o: 79.60 },
    { b: '2023-01-01', o: 57.68 },
    { b: '2023-07-01', o: 47.83 },
    { b: '2024-01-01', o: 64.86 },
    { b: '2024-07-01', o: 61.78 },
    { b: '2025-01-01', o: 42.12 },
  ],

  // ── ÜFE (Yıllık Değişim %) ───────────────────────────────
  ufe: [
    { b: '2017-01-01', o: 15.47 },
    { b: '2018-01-01', o: 12.14 },
    { b: '2019-01-01', o: 33.64 },
    { b: '2020-01-01', o: 8.36 },
    { b: '2021-01-01', o: 26.14 },
    { b: '2021-07-01', o: 31.20 },
    { b: '2022-01-01', o: 93.53 },
    { b: '2022-07-01', o: 144.61 },
    { b: '2023-01-01', o: 77.64 },
    { b: '2023-07-01', o: 44.41 },
    { b: '2024-01-01', o: 44.22 },
    { b: '2024-07-01', o: 50.02 },
    { b: '2025-01-01', o: 30.50 },
  ],
};

/**
 * Supabase'den gelen güncel oranları set eder
 * useFaizOranDB() hook'undan çağrılır — client-side'da Supabase verileri ile override
 */
let _supabaseOranDB: Record<string, OranGirdi[]> | null = null;
export function setSupabaseFaizOranlari(oranDB: Record<string, OranGirdi[]> | null) {
  _supabaseOranDB = oranDB;
}

/**
 * Bir faiz türü için oran dizisini döndürür
 * Önce Supabase override'a bakar, yoksa hardcoded FAIZ_ORAN_DB'ye fallback
 * Manuel/sözleşmeli türlerde boş döner
 */
export function faizOranlariniAl(faizTuru: FaizTuru): OranGirdi[] {
  // Supabase'den gelen oranlar varsa öncelikli kullan
  if (_supabaseOranDB && _supabaseOranDB[faizTuru]?.length) {
    return _supabaseOranDB[faizTuru];
  }
  return FAIZ_ORAN_DB[faizTuru] || [];
}

/**
 * Belirli bir tarih için geçerli oranı bul
 */
export function oranBulTarih(tarih: string, oranlar: OranGirdi[]): number {
  if (!oranlar.length) return 0;
  let sonOran = oranlar[0].o;
  for (const oran of oranlar) {
    if (tarih >= oran.b) sonOran = oran.o;
    else break;
  }
  return sonOran;
}

// ══════════════════════════════════════════════════════════════
// ESKİ API UYUMLULUĞU — icra modülü ve diğer yerlerden kullanılıyor
// ══════════════════════════════════════════════════════════════

/** Eski format: FaizDonemi[] olarak yasal faiz oranları */
export const VARSAYILAN_YASAL_FAIZ: FaizDonemi[] = [
  { baslangic: '2005-05-01', bitis: '2005-12-31', yillikOran: 12 },
  { baslangic: '2006-01-01', bitis: '2024-05-31', yillikOran: 9 },
  { baslangic: '2024-06-01', bitis: '2025-12-31', yillikOran: 24 },
];

/** Eski format: FaizDonemi[] olarak ticari faiz oranları */
export const VARSAYILAN_TICARI_FAIZ: FaizDonemi[] =
  FAIZ_ORAN_DB.ticari.map((o, i, arr) => ({
    baslangic: o.b,
    bitis: arr[i + 1]?.b
      ? new Date(new Date(arr[i + 1].b).getTime() - 86400000).toISOString().slice(0, 10)
      : '2099-12-31',
    yillikOran: o.o,
  }));

// ── Alacak Kalemi ────────────────────────────────────────────
export interface AlacakKalemi {
  id: string;
  kalemTuru: 'asil_alacak' | 'kira' | 'fatura' | 'cek' | 'senet' | 'diger';
  aciklama: string;
  asilTutar: number;
  paraBirimi?: string; // default: TRY
  vadeTarihi: string;  // Temerrüt başlangıç tarihi (YYYY-MM-DD)
  faizTuru: FaizTuru;  // Takip sonrası işleyecek faiz türü
  ozelFaizOrani?: number; // sozlesmeli/diger ise sabit yıllık oran
  islemiFaiz?: number; // Takip öncesi işlemiş faiz (yalnızca gösterim — faiz sadece asilTutar'a işler)
}

export const KALEM_TURLERI: { value: AlacakKalemi['kalemTuru']; label: string }[] = [
  { value: 'asil_alacak', label: 'Asıl Alacak' },
  { value: 'kira', label: 'Kira Alacağı' },
  { value: 'fatura', label: 'Fatura Alacağı' },
  { value: 'cek', label: 'Çek' },
  { value: 'senet', label: 'Senet' },
  { value: 'diger', label: 'Diğer' },
];

/** Eski uyumlu kısa faiz türleri listesi — select UI'lar için */
export const FAIZ_TURLERI: { value: FaizTuru; label: string }[] =
  UYAP_FAIZ_TURLERI.map((t) => ({ value: t.id, label: t.ad }));

// ── İcra Vekalet Ücreti (AAÜT 2025) ─────────────────────────
export interface VekaletDilimi {
  altSinir: number;
  ustSinir: number;
  oran: number;
}

export const ICRA_VEKALET_TARIFELERI: Record<number, { minUcret: number; dilimler: VekaletDilimi[] }> = {
  2025: {
    minUcret: 6800,
    dilimler: [
      { altSinir: 0, ustSinir: 100000, oran: 15 },
      { altSinir: 100000, ustSinir: 500000, oran: 10 },
      { altSinir: 500000, ustSinir: 1000000, oran: 8 },
      { altSinir: 1000000, ustSinir: Infinity, oran: 5 },
    ],
  },
  2024: {
    minUcret: 5500,
    dilimler: [
      { altSinir: 0, ustSinir: 100000, oran: 15 },
      { altSinir: 100000, ustSinir: 500000, oran: 10 },
      { altSinir: 500000, ustSinir: 1000000, oran: 8 },
      { altSinir: 1000000, ustSinir: Infinity, oran: 5 },
    ],
  },
};

// ── Kapak Hesabı Sonucu ──────────────────────────────────────
export interface KapakHesabiSonuc {
  kalemler: Array<{
    kalemId: string;
    aciklama: string;
    asilAlacak: number;
    islemiFaiz: number;
    islemizFaiz: number;  // takip sonrası işleyen faiz
    toplamKalem: number;
  }>;
  toplamAsilAlacak: number;
  toplamIslemiFaiz: number;
  toplamIsleyenFaiz: number;
  icraVekaletUcreti: number;
  icraMasraflari: number;
  toplamDosyaDegeri: number;
  tahsilEdilen: number;
  kalanBorc: number;
  hesapTarihi: string;
}

// ── Kısmi Ödeme Mahsup Sonucu ────────────────────────────────
export interface MahsupKalem {
  hedef: 'masraf' | 'vekalet_ucreti' | 'faiz' | 'asil_alacak';
  kalemId?: string;
  tutar: number;
}

export interface MahsupSonucu {
  mahsupDetay: MahsupKalem[];
  kalanOdeme: number;
}

// ══════════════════════════════════════════════════════════════
// HESAPLAMA FONKSİYONLARI
// ══════════════════════════════════════════════════════════════

/** YYYY-MM-DD string → lokal tarih (timezone-safe) */
function parseTarih(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date → YYYY-MM-DD string (timezone-safe) */
function tarihStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** İki tarih arasındaki gün sayısı */
function gunFarki(baslangic: string, bitis: string): number {
  const b = parseTarih(baslangic).getTime();
  const s = parseTarih(bitis).getTime();
  return Math.max(0, Math.ceil((s - b) / 86400000));
}

/**
 * Detaylı faiz hesaplama — dönemsel oranlar ile
 * Tüm UYAP faiz türlerini destekler
 */
export interface FaizDetayDilim {
  baslangic: string;
  bitis: string;
  gun: number;
  oran: number;
  faiz: number;
}

export interface FaizDetaySonuc {
  anapara: number;
  toplamFaiz: number;
  genelToplam: number;
  toplamGun: number;
  dilimSayisi: number;
  detay: FaizDetayDilim[];
  faizTuru: string;
}

/**
 * Genel amaçlı detaylı faiz hesaplama
 * UYAP faiz türlerine göre oranları otomatik uygular
 */
export function hesaplaFaizDetayli(
  anapara: number,
  basTarih: string,
  bitTarih: string,
  faizTuruId: FaizTuru,
  ozelOran?: number,
): FaizDetaySonuc {
  const turBilgi = UYAP_FAIZ_TURLERI.find((t) => t.id === faizTuruId);
  const ad = turBilgi?.ad || faizTuruId;

  if (faizTuruId === 'yok' || anapara <= 0 || !basTarih || !bitTarih || basTarih >= bitTarih) {
    return { anapara, toplamFaiz: 0, genelToplam: anapara, toplamGun: 0, dilimSayisi: 0, detay: [], faizTuru: ad };
  }

  // Sözleşmeli / Diğer — sabit oran
  if ((faizTuruId === 'sozlesmeli' || faizTuruId === 'diger') && ozelOran != null) {
    const gun = gunFarki(basTarih, bitTarih);
    const faiz = yuvarla(anapara * (ozelOran / 100) * (gun / 365));
    return {
      anapara,
      toplamFaiz: faiz,
      genelToplam: yuvarla(anapara + faiz),
      toplamGun: gun,
      dilimSayisi: 1,
      detay: [{ baslangic: basTarih, bitis: bitTarih, gun, oran: ozelOran, faiz }],
      faizTuru: ad,
    };
  }

  // Oran veritabanından al
  const oranlar = faizOranlariniAl(faizTuruId);
  if (!oranlar.length) {
    // Oran bulunamadı, yasal faize fallback
    const yasalOranlar = FAIZ_ORAN_DB.yasal;
    if (yasalOranlar?.length) {
      return hesaplaFaizDonemseel(anapara, basTarih, bitTarih, yasalOranlar, ad);
    }
    return { anapara, toplamFaiz: 0, genelToplam: anapara, toplamGun: 0, dilimSayisi: 0, detay: [], faizTuru: ad };
  }

  return hesaplaFaizDonemseel(anapara, basTarih, bitTarih, oranlar, ad);
}

/** Dönem bazlı faiz hesaplama (iç fonksiyon) — timezone-safe */
function hesaplaFaizDonemseel(
  anapara: number,
  basTarih: string,
  bitTarih: string,
  oranlar: OranGirdi[],
  faizTuruAd: string,
): FaizDetaySonuc {
  const bas = parseTarih(basTarih);
  const bit = parseTarih(bitTarih);

  // Dönem kırılım noktalarını oluştur (lokal tarih olarak)
  const noktalar = new Set([bas.getTime(), bit.getTime()]);
  for (const o of oranlar) {
    const oT = parseTarih(o.b);
    if (oT.getTime() > bas.getTime() && oT.getTime() < bit.getTime()) {
      noktalar.add(oT.getTime());
    }
  }
  const sorted = Array.from(noktalar).sort((a, b) => a - b);

  const detay: FaizDetayDilim[] = [];
  let toplamFaiz = 0;
  let toplamGun = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const dBas = new Date(sorted[i]);
    const dBit = new Date(sorted[i + 1]);
    const gun = Math.round((dBit.getTime() - dBas.getTime()) / 86400000);
    if (gun <= 0) continue;

    // O dönem için geçerli oranı bul (timezone-safe string karşılaştırma)
    const dBasStr = tarihStr(dBas);
    let oran = oranlar[0]?.o || 0;
    for (let j = oranlar.length - 1; j >= 0; j--) {
      if (dBasStr >= oranlar[j].b) {
        oran = oranlar[j].o;
        break;
      }
    }

    const dilimFaiz = yuvarla(anapara * (oran / 100) / 365 * gun);
    toplamFaiz += dilimFaiz;
    toplamGun += gun;
    detay.push({
      baslangic: dBasStr,
      bitis: tarihStr(dBit),
      gun,
      oran,
      faiz: dilimFaiz,
    });
  }

  return {
    anapara,
    toplamFaiz: yuvarla(toplamFaiz),
    genelToplam: yuvarla(anapara + toplamFaiz),
    toplamGun,
    dilimSayisi: detay.length,
    detay,
    faizTuru: faizTuruAd,
  };
}

/**
 * Tek bir alacak kalemi için faiz hesapla
 * Tüm faiz türleri (yasal, ticari, UYAP) tek tutarlı motor ile hesaplanır
 * İcra modülü ve AlacakKalemleriPanel tarafından kullanılır
 *
 * @param baslangicTarihiOverride - Takip sonrası faiz hesabında takipTarihi gönderilir
 *   Böylece işleyen faiz takip tarihinden itibaren hesaplanır (çift sayım önlenir)
 */
export function hesaplaKalemFaiz(
  kalem: AlacakKalemi,
  hesapTarihi: string,
  _yasalOranlar?: FaizDonemi[],
  _ticariOranlar?: FaizDonemi[],
  baslangicTarihiOverride?: string,
): number {
  if (kalem.faizTuru === 'yok') return 0;
  if (!kalem.vadeTarihi || !hesapTarihi) return 0;
  if (kalem.asilTutar <= 0) return 0;

  // Faiz başlangıç tarihi: override verilmişse onu kullan, yoksa vade tarihi
  const faizBaslangic = baslangicTarihiOverride || kalem.vadeTarihi;
  if (faizBaslangic >= hesapTarihi) return 0;

  // Sözleşmeli faiz — sabit oran
  if (kalem.faizTuru === 'sozlesmeli' && kalem.ozelFaizOrani != null) {
    const gun = gunFarki(faizBaslangic, hesapTarihi);
    return yuvarla(kalem.asilTutar * (kalem.ozelFaizOrani / 100) * (gun / 365));
  }

  // Tüm faiz türleri — hesaplaFaizDetayli ile timezone-safe dönemsel hesaplama
  const sonuc = hesaplaFaizDetayli(
    kalem.asilTutar,
    faizBaslangic,
    hesapTarihi,
    kalem.faizTuru,
    kalem.ozelFaizOrani,
  );
  return sonuc.toplamFaiz;
}

/**
 * İcra vekalet ücreti hesapla — AAÜT'ye göre kademeli
 */
export function hesaplaIcraVekaletUcreti(
  takipTutari: number,
  yil: number = new Date().getFullYear(),
): number {
  const tarife = ICRA_VEKALET_TARIFELERI[yil] || ICRA_VEKALET_TARIFELERI[2025];
  if (!tarife || takipTutari <= 0) return 0;

  let ucret = 0;
  let kalan = takipTutari;

  for (const dilim of tarife.dilimler) {
    if (kalan <= 0) break;
    const dilimGenisligi = dilim.ustSinir === Infinity ? kalan : Math.min(kalan, dilim.ustSinir - dilim.altSinir);
    ucret += dilimGenisligi * (dilim.oran / 100);
    kalan -= dilimGenisligi;
  }

  return yuvarla(Math.max(ucret, tarife.minUcret));
}

/**
 * Kapak Hesabı — Dosyanın güncel değerini hesapla
 */
export function hesaplaKapakHesabi(
  alacakKalemleri: AlacakKalemi[],
  icraMasraflari: number,
  tahsilEdilen: number,
  vekaletUcretiManuel?: number,
  hesapTarihi?: string,
  yasalOranlar?: FaizDonemi[],
  ticariOranlar?: FaizDonemi[],
  /** Takip tarihi — işleyen faiz bu tarihten itibaren hesaplanır (takip öncesi işlemiş faiz ayrı) */
  takipTarihi?: string,
): KapakHesabiSonuc {
  const tarih = hesapTarihi || new Date().toISOString().slice(0, 10);

  const kalemler = alacakKalemleri.map((k) => {
    // Takip sonrası faiz yalnızca asıl alacağa (asilTutar) işler
    // İşlemiş faiz (islemiFaiz) ayrı kalem olarak eklenir, üzerine faiz işlemez
    // İşleyen faiz: takipTarihi verilmişse takipTarihinden hesapTarihine, yoksa vadeTarihinden hesapTarihine
    const isleyenFaiz = hesaplaKalemFaiz(k, tarih, yasalOranlar, ticariOranlar, takipTarihi);
    const islemiFaiz = k.islemiFaiz || 0;
    return {
      kalemId: k.id,
      aciklama: k.aciklama,
      asilAlacak: k.asilTutar,
      islemiFaiz,
      islemizFaiz: isleyenFaiz,
      toplamKalem: yuvarla(k.asilTutar + islemiFaiz + isleyenFaiz),
    };
  });

  const toplamAsilAlacak = yuvarla(kalemler.reduce((t, k) => t + k.asilAlacak, 0));
  const toplamIslemiFaiz = yuvarla(kalemler.reduce((t, k) => t + k.islemiFaiz, 0));
  const toplamIsleyenFaiz = yuvarla(kalemler.reduce((t, k) => t + k.islemizFaiz, 0));

  const icraVekaletUcreti = vekaletUcretiManuel != null
    ? vekaletUcretiManuel
    : hesaplaIcraVekaletUcreti(toplamAsilAlacak);

  const toplamDosyaDegeri = yuvarla(toplamAsilAlacak + toplamIslemiFaiz + toplamIsleyenFaiz + icraVekaletUcreti + icraMasraflari);
  const kalanBorc = yuvarla(toplamDosyaDegeri - tahsilEdilen);

  return {
    kalemler,
    toplamAsilAlacak,
    toplamIslemiFaiz,
    toplamIsleyenFaiz,
    icraVekaletUcreti,
    icraMasraflari,
    toplamDosyaDegeri,
    tahsilEdilen,
    kalanBorc,
    hesapTarihi: tarih,
  };
}

/**
 * Kısmi ödeme mahsubu — Türk hukukuna göre sıralama
 * 1. İcra masrafları
 * 2. İcra vekalet ücreti
 * 3. Faiz (en eski kalemden)
 * 4. Asıl alacak (en eski kalemden)
 */
export function kismiOdemeMahsup(
  kapakHesabi: KapakHesabiSonuc,
  odemeTutari: number,
): MahsupSonucu {
  let kalan = odemeTutari;
  const mahsupDetay: MahsupKalem[] = [];

  // 1. Masraflar
  if (kalan > 0 && kapakHesabi.icraMasraflari > 0) {
    const mahsup = Math.min(kalan, kapakHesabi.icraMasraflari);
    mahsupDetay.push({ hedef: 'masraf', tutar: yuvarla(mahsup) });
    kalan -= mahsup;
  }

  // 2. Vekalet ücreti
  if (kalan > 0 && kapakHesabi.icraVekaletUcreti > 0) {
    const mahsup = Math.min(kalan, kapakHesabi.icraVekaletUcreti);
    mahsupDetay.push({ hedef: 'vekalet_ucreti', tutar: yuvarla(mahsup) });
    kalan -= mahsup;
  }

  // 3. Faizler (en eski kalemden)
  for (const kalem of kapakHesabi.kalemler) {
    if (kalan <= 0) break;
    if (kalem.islemizFaiz > 0) {
      const mahsup = Math.min(kalan, kalem.islemizFaiz);
      mahsupDetay.push({ hedef: 'faiz', kalemId: kalem.kalemId, tutar: yuvarla(mahsup) });
      kalan -= mahsup;
    }
  }

  // 4. Asıl alacaklar (en eski kalemden)
  for (const kalem of kapakHesabi.kalemler) {
    if (kalan <= 0) break;
    if (kalem.asilAlacak > 0) {
      const mahsup = Math.min(kalan, kalem.asilAlacak);
      mahsupDetay.push({ hedef: 'asil_alacak', kalemId: kalem.kalemId, tutar: yuvarla(mahsup) });
      kalan -= mahsup;
    }
  }

  return { mahsupDetay, kalanOdeme: yuvarla(kalan) };
}
