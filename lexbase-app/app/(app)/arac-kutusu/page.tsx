'use client';

import { useState, useRef, useEffect } from 'react';
import {
  type FaizTuru as FaizTuruId,
  type FaizDetaySonuc,
  UYAP_FAIZ_TURLERI,
  faizTurleriGruplu,
  hesaplaFaizDetayli,
} from '@/lib/utils/faiz';
import { exportFaizHesapPDF } from '@/lib/export/pdfExport';
import { exportFaizHesapXLS } from '@/lib/export/excelExport';

/* ══════════════════════════════════════════════════════════════
   YARDIMCI FONKSİYONLAR
   ══════════════════════════════════════════════════════════════ */
function formatTL(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
}

/* ── TC Kimlik Doğrulama ───────────────────────────────────── */
function validateTC(tc: string): { gecerli: boolean; mesaj: string } {
  if (!tc || tc.length !== 11) return { gecerli: false, mesaj: 'TC Kimlik No 11 haneli olmalıdır.' };
  if (/[^0-9]/.test(tc)) return { gecerli: false, mesaj: 'Sadece rakam girilmelidir.' };
  if (tc[0] === '0') return { gecerli: false, mesaj: 'TC Kimlik No 0 ile başlayamaz.' };
  const d = tc.split('').map(Number);
  let tek = 0, cift = 0;
  for (let i = 0; i < 9; i += 2) tek += d[i];
  for (let i = 1; i < 8; i += 2) cift += d[i];
  if (((tek * 7 - cift) % 10 + 10) % 10 !== d[9]) return { gecerli: false, mesaj: '10. hane kontrolü başarısız.' };
  let toplam = 0;
  for (let i = 0; i < 10; i++) toplam += d[i];
  if (toplam % 10 !== d[10]) return { gecerli: false, mesaj: '11. hane kontrolü başarısız.' };
  return { gecerli: true, mesaj: 'Geçerli TC Kimlik Numarası.' };
}

/* ── IBAN Doğrulama ────────────────────────────────────────── */
function validateIBAN(iban: string): { gecerli: boolean; mesaj: string; banka?: string } {
  const temiz = iban.replace(/\s/g, '').toUpperCase();
  if (temiz.length !== 26) return { gecerli: false, mesaj: 'TR IBAN 26 karakter olmalıdır.' };
  if (!temiz.startsWith('TR')) return { gecerli: false, mesaj: 'Türk IBAN\'ı "TR" ile başlamalıdır.' };
  if (/[^A-Z0-9]/.test(temiz)) return { gecerli: false, mesaj: 'Geçersiz karakter.' };
  const reordered = temiz.slice(4) + temiz.slice(0, 4);
  let numStr = '';
  for (const ch of reordered) { const c = ch.charCodeAt(0); numStr += c >= 65 ? (c - 55).toString() : ch; }
  let rem = 0;
  for (let i = 0; i < numStr.length; i++) rem = (rem * 10 + parseInt(numStr[i])) % 97;
  if (rem !== 1) return { gecerli: false, mesaj: 'IBAN kontrol haneleri hatalı.' };
  const bk = temiz.slice(4, 9);
  const bankalar: Record<string, string> = {
    '00010': 'T.C. Ziraat Bankası', '00012': 'Halkbank', '00015': 'VakıfBank',
    '00032': 'TEB', '00046': 'Akbank', '00062': 'Garanti BBVA',
    '00064': 'İş Bankası', '00067': 'Yapı Kredi', '00099': 'ING',
    '00103': 'Fibabanka', '00111': 'QNB Finansbank', '00134': 'Denizbank',
    '00146': 'Odeabank', '00203': 'Albaraka Türk', '00205': 'Kuveyt Türk',
    '00206': 'Türkiye Finans', '00209': 'Ziraat Katılım', '00210': 'Vakıf Katılım',
  };
  return { gecerli: true, mesaj: 'Geçerli IBAN.', banka: bankalar[bk] || `Banka Kodu: ${bk}` };
}

/* ── VKN Doğrulama ─────────────────────────────────────────── */
function validateVKN(vkn: string): { gecerli: boolean; mesaj: string } {
  if (!vkn || vkn.length !== 10) return { gecerli: false, mesaj: 'VKN 10 haneli olmalıdır.' };
  if (/[^0-9]/.test(vkn)) return { gecerli: false, mesaj: 'Sadece rakam girilmelidir.' };
  const d = vkn.split('').map(Number);
  let toplam = 0;
  for (let i = 0; i < 9; i++) {
    let t = (d[i] + (9 - i)) % 10;
    toplam += (t * Math.pow(2, 9 - i)) % 9 + (t !== 0 && (t * Math.pow(2, 9 - i)) % 9 === 0 ? 9 : 0);
  }
  if (toplam % 10 === 0 && d[9] === 0) return { gecerli: true, mesaj: 'Geçerli Vergi Kimlik Numarası.' };
  if ((10 - (toplam % 10)) % 10 === d[9]) return { gecerli: true, mesaj: 'Geçerli Vergi Kimlik Numarası.' };
  return { gecerli: false, mesaj: 'Kontrol hanesi doğrulaması başarısız.' };
}

/* ── Faiz Hesaplama — UYAP uyumlu tüm türler faiz.ts'den gelir ── */
// UYAP_FAIZ_TURLERI, faizTurleriGruplu, hesaplaFaizDetayli import edildi

/* ── Yasal Süre Hesaplayıcı ────────────────────────────────── */
type SureTipi = { kat: string; ad: string; gun: number; madde: string };

const SURELER: SureTipi[] = [
  { kat: 'HMK', ad: 'Cevap dilekçesi süresi', gun: 14, madde: 'HMK m.127' },
  { kat: 'HMK', ad: 'Cevaba cevap dilekçesi', gun: 14, madde: 'HMK m.136/1' },
  { kat: 'HMK', ad: 'İkinci cevap dilekçesi', gun: 14, madde: 'HMK m.136/1' },
  { kat: 'HMK', ad: 'İstinaf süresi', gun: 14, madde: 'HMK m.345' },
  { kat: 'HMK', ad: 'Temyiz süresi', gun: 14, madde: 'HMK m.361' },
  { kat: 'HMK', ad: 'Karar düzeltme süresi', gun: 15, madde: 'HMK m.363' },
  { kat: 'HMK', ad: 'İhtiyati tedbire itiraz', gun: 7, madde: 'HMK m.394' },
  { kat: 'İİK', ad: 'Ödeme emrine itiraz (ilamsız)', gun: 7, madde: 'İİK m.62' },
  { kat: 'İİK', ad: 'Kambiyo senedine itiraz', gun: 5, madde: 'İİK m.168/5' },
  { kat: 'İİK', ad: 'İcra emrine itiraz (ilamlı)', gun: 7, madde: 'İİK m.33' },
  { kat: 'İİK', ad: 'İtirazın iptali davası', gun: 365, madde: 'İİK m.67 (1 yıl)' },
  { kat: 'İİK', ad: 'İtirazın kaldırılması', gun: 180, madde: 'İİK m.68 (6 ay)' },
  { kat: 'İİK', ad: 'Menfi tespit davası', gun: 7, madde: 'İİK m.72' },
  { kat: 'İİK', ad: 'İstihkak davası', gun: 7, madde: 'İİK m.97' },
  { kat: 'İş', ad: 'İşe iade davası', gun: 30, madde: 'İş K. m.20' },
  { kat: 'İş', ad: 'Arabuluculuk sonrası dava', gun: 14, madde: '7036 s.K. m.3/15' },
  { kat: 'İş', ad: 'Kıdem tazminatı zamanaşımı', gun: 1825, madde: 'İş K. Geçici m.7 (5 yıl)' },
  { kat: 'Ceza', ad: 'İstinaf süresi (ceza)', gun: 7, madde: 'CMK m.273' },
  { kat: 'Ceza', ad: 'Temyiz süresi (ceza)', gun: 15, madde: 'CMK m.291' },
  { kat: 'Ceza', ad: 'İtiraz süresi', gun: 7, madde: 'CMK m.268' },
  { kat: 'İdare', ad: 'İptal davası süresi', gun: 60, madde: 'İYUK m.7' },
  { kat: 'İdare', ad: 'Tam yargı davası', gun: 60, madde: 'İYUK m.13' },
  { kat: 'İdare', ad: 'İstinaf süresi (idari)', gun: 30, madde: 'İYUK m.45' },
];

const TATILLER = [
  '2024-01-01','2024-04-10','2024-04-11','2024-04-12','2024-04-23','2024-05-01',
  '2024-06-16','2024-06-17','2024-06-18','2024-06-19','2024-07-15','2024-08-30','2024-10-28','2024-10-29',
  '2025-01-01','2025-03-30','2025-03-31','2025-04-01','2025-04-23','2025-05-01',
  '2025-06-06','2025-06-07','2025-06-08','2025-06-09','2025-07-15','2025-08-30','2025-10-28','2025-10-29',
  '2026-01-01','2026-03-20','2026-03-21','2026-03-22','2026-04-23','2026-05-01',
  '2026-05-26','2026-05-27','2026-05-28','2026-05-29','2026-07-15','2026-08-30','2026-10-28','2026-10-29',
];

function tatilMi(d: Date): boolean {
  const s = d.toISOString().split('T')[0];
  return TATILLER.includes(s) || d.getDay() === 0 || d.getDay() === 6;
}

function sureHesapla(basTarih: string, gun: number): string {
  const d = new Date(basTarih); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1);
  let kalan = gun;
  while (kalan > 0) { if (!tatilMi(d)) kalan--; if (kalan > 0) d.setDate(d.getDate() + 1); }
  while (tatilMi(d)) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/* ── Vekalet Ücreti (AAÜT 2024 Tam Liste) ─────────────────── */
const AAUT_2024 = [
  { ad: 'Danışma (sözlü)', ucret: 4_700 },
  { ad: 'Danışma (yazılı)', ucret: 12_000 },
  { ad: 'Ceza — Sulh Ceza', ucret: 12_500 },
  { ad: 'Ceza — Asliye Ceza', ucret: 20_000 },
  { ad: 'Ceza — Ağır Ceza', ucret: 32_000 },
  { ad: 'Hukuk — Sulh Hukuk', ucret: 12_500 },
  { ad: 'Hukuk — Asliye Hukuk', ucret: 20_000 },
  { ad: 'Hukuk — Asliye Ticaret', ucret: 27_000 },
  { ad: 'Hukuk — İş Mahkemesi', ucret: 16_500 },
  { ad: 'Hukuk — Aile Mahkemesi', ucret: 16_500 },
  { ad: 'Hukuk — Tüketici Mahkemesi', ucret: 7_600 },
  { ad: 'İcra Takibi (ilamsız)', ucret: 7_000 },
  { ad: 'İcra Takibi (ilamlı)', ucret: 7_000 },
  { ad: 'İcra — İtirazın kaldırılması', ucret: 7_600 },
  { ad: 'İcra — İtirazın iptali', ucret: 16_500 },
  { ad: 'İstinaf (Hukuk)', ucret: 16_500 },
  { ad: 'İstinaf (Ceza)', ucret: 16_500 },
  { ad: 'Temyiz (Hukuk)', ucret: 20_000 },
  { ad: 'Temyiz (Ceza)', ucret: 20_000 },
  { ad: 'İdare — İptal davası', ucret: 16_500 },
  { ad: 'İdare — Tam yargı', ucret: 20_000 },
  { ad: 'Arabuluculuk', ucret: 7_600 },
  { ad: 'Tahkim', ucret: 32_000 },
];

function hesaplaVekaletAAUT(davaTuru: string, davaDeger: number) {
  const t = AAUT_2024.find(a => a.ad === davaTuru);
  const maktu = t?.ucret || 16_500;
  const nispi = davaDeger > 0 ? Math.round(davaDeger * 0.15 * 100) / 100 : 0;
  return { maktu, nispi, onerilen: Math.max(maktu, nispi) };
}

function hesaplaFaiz(anapara: number, oran: number, gun: number) {
  const faizTutari = (anapara * oran * gun) / (365 * 100);
  return { faizTutari, toplam: anapara + faizTutari };
}

/* ── Harç Hesaplama ────────────────────────────────────────── */
function hesaplaHarc(deger: number, tur: string) {
  const basvuru = 427.60;
  let pesin = 0, karar = 0;
  if (tur === 'nisbi') { pesin = deger * 0.0683; karar = deger * 0.0683; }
  else if (tur === 'maktu') { pesin = 427.60; karar = 427.60; }
  else if (tur === 'icra') { pesin = deger * 0.0455; }
  return { basvuru, pesin, karar, toplam: basvuru + pesin + karar };
}

/* ── Vekalet Ücreti (AAÜT 2025 yaklaşık) ──────────────────── */
function hesaplaVekalet(deger: number, davaTuru: string) {
  let ucret = 0;
  if (deger <= 0) {
    const maktuMap: Record<string, number> = {
      'bosanma': 26_000, 'is': 20_000, 'tuketici': 13_000, 'sulh': 13_000,
      'icra': 10_000, 'idare': 20_000, 'ceza_agir': 40_000, 'ceza_asliye': 26_000,
    };
    ucret = maktuMap[davaTuru] || 15_000;
  } else {
    if (deger <= 100_000) ucret = deger * 0.15;
    else if (deger <= 500_000) ucret = 15_000 + (deger - 100_000) * 0.12;
    else if (deger <= 1_000_000) ucret = 63_000 + (deger - 500_000) * 0.09;
    else if (deger <= 5_000_000) ucret = 108_000 + (deger - 1_000_000) * 0.06;
    else if (deger <= 10_000_000) ucret = 348_000 + (deger - 5_000_000) * 0.04;
    else ucret = 548_000 + (deger - 10_000_000) * 0.02;
    ucret = Math.max(ucret, 15_000);
  }
  return { ucret, kdv: ucret * 0.20, stopaj: ucret * 0.20, net: ucret + ucret * 0.20 - ucret * 0.20 };
}

/* ── Kıdem / İhbar Tazminatı ───────────────────────────────── */
function hesaplaTazminat(brutMaas: number, yil: number, ay: number) {
  const toplamAy = yil * 12 + ay;
  const kidemTavan = 35_058.58;
  const kidemBaz = Math.min(brutMaas, kidemTavan);
  const kidem = kidemBaz * (toplamAy / 12);
  let ihbarHafta = 0;
  if (toplamAy < 6) ihbarHafta = 2;
  else if (toplamAy < 18) ihbarHafta = 4;
  else if (toplamAy < 36) ihbarHafta = 6;
  else ihbarHafta = 8;
  const ihbar = (brutMaas / 30) * (ihbarHafta * 7);
  return { kidem, ihbar, ihbarHafta, toplam: kidem + ihbar, kidemTavan };
}

/* ── SM Makbuzu Hesaplama ──────────────────────────────────── */
function hesaplaMakbuz(brut: number, kdvOran: number, stopajOran: number) {
  const kdv = brut * (kdvOran / 100);
  const stopaj = brut * (stopajOran / 100);
  const net = brut + kdv - stopaj;
  return { brut, kdv, stopaj, net, toplamTahsil: brut + kdv };
}

/* ══════════════════════════════════════════════════════════════
   SABİT VERİLER
   ══════════════════════════════════════════════════════════════ */

const ADLI_TAKVIM_2026 = [
  { tarih: '1 Ocak 2026', ad: 'Yılbaşı', tur: 'resmi' },
  { tarih: '20 Mart 2026', ad: 'Ramazan Bayramı Arifesi (yarım gün)', tur: 'dini' },
  { tarih: '21-23 Mart 2026', ad: 'Ramazan Bayramı', tur: 'dini' },
  { tarih: '23 Nisan 2026', ad: 'Ulusal Egemenlik ve Çocuk Bayramı', tur: 'resmi' },
  { tarih: '1 Mayıs 2026', ad: 'Emek ve Dayanışma Günü', tur: 'resmi' },
  { tarih: '19 Mayıs 2026', ad: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', tur: 'resmi' },
  { tarih: '27 Mayıs 2026', ad: 'Kurban Bayramı Arifesi (yarım gün)', tur: 'dini' },
  { tarih: '28-31 Mayıs 2026', ad: 'Kurban Bayramı', tur: 'dini' },
  { tarih: '15 Temmuz 2026', ad: 'Demokrasi ve Milli Birlik Günü', tur: 'resmi' },
  { tarih: '20 Temmuz - 31 Ağustos 2026', ad: 'Adli Tatil', tur: 'adli' },
  { tarih: '30 Ağustos 2026', ad: 'Zafer Bayramı', tur: 'resmi' },
  { tarih: '28-29 Ekim 2026', ad: 'Cumhuriyet Bayramı', tur: 'resmi' },
];

const DILEKCE_SABLONLARI = [
  { ad: 'Dava Dilekçesi (Genel)', aciklama: 'Genel dava açılış dilekçesi şablonu', icerik: `... MAHKEMESİ SAYIN HAKİMLİĞİ'NE

DAVACI      : [Ad Soyad] — TC: [TC No]
              [Adres]
VEKİLİ      : Av. [Ad Soyad] — [Baro Sicil No]
              [Adres]
DAVALI      : [Ad Soyad/Unvan]
              [Adres]

KONU        : [Dava konusunun özeti]

AÇIKLAMALAR :

1. [Olayın özeti ve kronolojisi]

2. [Hukuki dayanak ve gerekçeler]

3. [Deliller ve ispat araçları]

HUKUKİ NEDENLER: [İlgili kanun maddeleri]

DELİLLER    : 1) Tanık beyanları  2) Bilirkişi incelemesi
              3) Keşif  4) Yazılı belgeler  5) Her türlü yasal delil

SONUÇ VE İSTEM:
Yukarıda açıklanan nedenlerle;
[Taleplerin sıralanması]
... karar verilmesini saygılarımla arz ve talep ederim. [Tarih]

                              Davacı Vekili
                              Av. [Ad Soyad]
                              [İmza]` },
  { ad: 'Cevap Dilekçesi', aciklama: 'Davaya karşı cevap dilekçesi', icerik: `... MAHKEMESİ SAYIN HAKİMLİĞİ'NE

DOSYA NO    : .../... E.

DAVALI      : [Ad Soyad]
VEKİLİ      : Av. [Ad Soyad]
DAVACI      : [Ad Soyad]

KONU        : Dava dilekçesine karşı cevaplarımızın sunulmasıdır.

AÇIKLAMALAR :

1. [Davacının iddialarına yanıt]

2. [Karşı deliller ve itirazlar]

3. [Hukuki değerlendirme]

HUKUKİ NEDENLER: [İlgili kanun maddeleri]

DELİLLER    : [Delillerin listesi]

SONUÇ VE İSTEM:
Yukarıda açıklanan nedenlerle davanın REDDİNE,
yargılama giderleri ve vekalet ücretinin davacıya yükletilmesine
karar verilmesini saygılarımla arz ve talep ederim. [Tarih]

                              Davalı Vekili
                              Av. [Ad Soyad]` },
  { ad: 'İstinaf Dilekçesi', aciklama: 'Bölge Adliye Mahkemesi istinaf başvurusu', icerik: `BÖLGE ADLİYE MAHKEMESİ İLGİLİ HUKUK DAİRESİ'NE
Gönderilmek Üzere
... MAHKEMESİ SAYIN HAKİMLİĞİ'NE

DOSYA NO    : .../... E., .../... K.

İSTİNAF EDEN: [Ad Soyad] (Davacı/Davalı)
VEKİLİ      : Av. [Ad Soyad]
KARŞI TARAF : [Ad Soyad]

KONU        : ... Mahkemesinin .../.../... tarih, .../... E., .../... K.
              sayılı kararının istinaf incelemesi istemidir.

KARARIN TEBLİĞ TARİHİ: .../.../...

İSTİNAF NEDENLERİ:

1. [Hukuka aykırılık sebepleri]

2. [Maddi olgu değerlendirme hataları]

3. [Eksik inceleme iddiaları]

SONUÇ VE İSTEM:
Yerel mahkeme kararının KALDIRILMASINA ve davanın
kabulüne/reddine karar verilmesini arz ve talep ederim.

                              İstinaf Eden Vekili
                              Av. [Ad Soyad]` },
  { ad: 'İcra Takip Talebi', aciklama: 'İcra dairesi takip başlatma talebi', icerik: `İCRA MÜDÜRLÜĞÜ'NE

ALACAKLI    : [Ad Soyad] — TC: [TC No]
VEKİLİ      : Av. [Ad Soyad]
BORÇLU      : [Ad Soyad] — TC: [TC No]
              [Adres]

TAKİBİN TÜRÜ: [İlamlı/İlamsız/Kambiyo]

TAKİBİN DAYANAĞI: [Mahkeme kararı / Senet / Çek bilgileri]

ALACAK MİKTARI:
Asıl Alacak    : [Tutar] TL
İşlemiş Faiz   : [Tutar] TL
Toplam          : [Tutar] TL

TALEP: Borçluya ödeme/icra emri gönderilmesini,
       ödeme yapılmadığı takdirde haciz işlemlerinin
       başlatılmasını talep ederim. [Tarih]

                              Alacaklı Vekili
                              Av. [Ad Soyad]` },
];

const SOZLESME_SABLONLARI = [
  { ad: 'Avukatlık Vekalet Sözleşmesi', aciklama: 'Avukat-müvekkil ilişkisini düzenleyen ana sözleşme' },
  { ad: 'Kira Sözleşmesi', aciklama: 'Konut ve işyeri kira sözleşmesi' },
  { ad: 'İş Sözleşmesi (Belirsiz Süreli)', aciklama: 'İşçi-işveren belirsiz süreli iş sözleşmesi' },
  { ad: 'Gizlilik Sözleşmesi (NDA)', aciklama: 'Karşılıklı gizlilik ve ifşa etmeme sözleşmesi' },
  { ad: 'Hizmet Sözleşmesi', aciklama: 'Danışmanlık ve hizmet alım sözleşmesi' },
  { ad: 'Protokol (Sulh Anlaşması)', aciklama: 'Taraflar arası sulh ve uzlaşma protokolü' },
];

const IHTARNAME_SABLONLARI = [
  { ad: 'Kira Ödeme İhtarı', aciklama: 'Ödenmeyen kira bedellerinin tahsili için' },
  { ad: 'Tahliye İhtarı', aciklama: 'Kiracının tahliyesi için yasal bildirim' },
  { ad: 'Alacak İhtarnamesi', aciklama: 'Vadesi geçmiş alacakların ödenmesi talebi' },
  { ad: 'İş Akdi Fesih İhbarı', aciklama: 'İş sözleşmesinin feshi bildirimi' },
  { ad: 'Sözleşme Fesih İhtarı', aciklama: 'Sözleşmenin ihlali nedeniyle fesih bildirimi' },
  { ad: 'Haksız Fiil İhtarı', aciklama: 'Haksız fiil nedeniyle tazminat talebi' },
];

/* ══════════════════════════════════════════════════════════════
   SVG İKONLAR
   ══════════════════════════════════════════════════════════════ */
function IkonFaiz() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>);
}
function IkonHarc() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10h8M8 14h8"/></svg>);
}
function IkonTerazi() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v18M3 7l9-4 9 4M3 7l3 6h0a5 5 0 0 0 6 0h0l-3-6M15 7l3 6h0a5 5 0 0 0 6 0h0l-3-6"/></svg>);
}
function IkonTazminat() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>);
}
function IkonMakbuz() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/></svg>);
}
function IkonTC() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
}
function IkonIBAN() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>);
}
function IkonVKN() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M3 7v14M21 7v14M6 7V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3M9 11h6M9 15h6"/></svg>);
}
function IkonDilekce() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>);
}
function IkonIhtarname() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>);
}
function IkonSozlesme() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/></svg>);
}
function IkonTakvim() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>);
}
function IkonMevzuat() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>);
}
function IkonMahkeme() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4"/><path d="M9 10h1M14 10h1M9 14h1M14 14h1"/></svg>);
}
function IkonIcraDaire() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>);
}
function IkonSure() {
  return (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>);
}

/* ══════════════════════════════════════════════════════════════
   ARAÇ TANİMLARI
   ══════════════════════════════════════════════════════════════ */
type AracTipi = 'tc' | 'iban' | 'vkn' | 'faiz' | 'harc' | 'vekalet' | 'tazminat' | 'makbuz' | 'sure'
  | 'dilekce' | 'ihtarname_sab' | 'sozlesme' | 'adli_takvim' | 'mevzuat' | 'mahkeme' | 'icra_bilgi' | null;

type AracItem = {
  icon: React.FC;
  ad: string;
  aciklama: string;
  aracId: AracTipi;
  renk: string; // tailwind color name
};

const ARACLAR: { kategori: string; renkClass: string; items: AracItem[] }[] = [
  {
    kategori: 'Hesaplama Araçları',
    renkClass: 'text-gold',
    items: [
      { icon: IkonFaiz, ad: 'Faiz Hesaplama', aciklama: 'UYAP uyumlu 37 faiz türü', aracId: 'faiz', renk: 'gold' },
      { icon: IkonHarc, ad: 'Harç Hesaplama', aciklama: 'Dava ve icra harçları', aracId: 'harc', renk: 'gold' },
      { icon: IkonTerazi, ad: 'Vekalet Ücreti', aciklama: 'AAÜT asgari tarife hesaplama', aracId: 'vekalet', renk: 'gold' },
      { icon: IkonTazminat, ad: 'Tazminat Hesaplama', aciklama: 'Kıdem ve ihbar tazminatı', aracId: 'tazminat', renk: 'gold' },
      { icon: IkonMakbuz, ad: 'SM Makbuzu', aciklama: 'Serbest meslek makbuzu hesabı', aracId: 'makbuz', renk: 'gold' },
      { icon: IkonSure, ad: 'Yasal Süre Hesaplama', aciklama: '23 süre türü, tatil motoru dahil', aracId: 'sure', renk: 'gold' },
    ],
  },
  {
    kategori: 'Doğrulama',
    renkClass: 'text-green',
    items: [
      { icon: IkonTC, ad: 'TC Kimlik Doğrulama', aciklama: 'TC kimlik no geçerlilik kontrolü', aracId: 'tc', renk: 'green' },
      { icon: IkonIBAN, ad: 'IBAN Doğrulama', aciklama: 'IBAN format ve banka kontrolü', aracId: 'iban', renk: 'green' },
      { icon: IkonVKN, ad: 'Vergi No Doğrulama', aciklama: 'VKN geçerlilik kontrolü', aracId: 'vkn', renk: 'green' },
    ],
  },
  {
    kategori: 'Evrak Şablonları',
    renkClass: 'text-blue-400',
    items: [
      { icon: IkonDilekce, ad: 'Dilekçe Şablonları', aciklama: 'Dava, cevap, istinaf dilekçeleri', aracId: 'dilekce', renk: 'blue-400' },
      { icon: IkonIhtarname, ad: 'İhtarname Şablonları', aciklama: 'Kira, alacak, fesih ihtarnameleri', aracId: 'ihtarname_sab', renk: 'blue-400' },
      { icon: IkonSozlesme, ad: 'Sözleşme Şablonları', aciklama: 'Vekalet, kira, iş sözleşmeleri', aracId: 'sozlesme', renk: 'blue-400' },
    ],
  },
  {
    kategori: 'Bilgi ve Referans',
    renkClass: 'text-purple-400',
    items: [
      { icon: IkonTakvim, ad: 'Adli Takvim 2026', aciklama: 'Resmi tatiller ve adli tatil', aracId: 'adli_takvim', renk: 'purple-400' },
      { icon: IkonMevzuat, ad: 'Mevzuat Arama', aciklama: 'mevzuat.gov.tr kanun arama', aracId: 'mevzuat', renk: 'purple-400' },
      { icon: IkonMahkeme, ad: 'Mahkeme Bilgileri', aciklama: 'Adliye ve mahkeme bilgileri', aracId: 'mahkeme', renk: 'purple-400' },
      { icon: IkonIcraDaire, ad: 'İcra Dairesi Bilgileri', aciklama: 'UYAP icra dairesi erişimi', aracId: 'icra_bilgi', renk: 'purple-400' },
    ],
  },
];

/* ══════════════════════════════════════════════════════════════
   RENK MAP
   ══════════════════════════════════════════════════════════════ */
const RENK_MAP: Record<string, { bg: string; bgHover: string; border: string; text: string; iconBg: string }> = {
  'gold':       { bg: 'bg-gold/5',  bgHover: 'hover:bg-gold/10',  border: 'border-gold/20 hover:border-gold/50',  text: 'text-gold',       iconBg: 'bg-gold/15 text-gold' },
  'green':      { bg: 'bg-green/5', bgHover: 'hover:bg-green/10', border: 'border-green/20 hover:border-green/50', text: 'text-green',      iconBg: 'bg-green/15 text-green' },
  'blue-400':   { bg: 'bg-blue-400/5',  bgHover: 'hover:bg-blue-400/10',  border: 'border-blue-400/20 hover:border-blue-400/50',  text: 'text-blue-400',   iconBg: 'bg-blue-400/15 text-blue-400' },
  'purple-400': { bg: 'bg-purple-400/5', bgHover: 'hover:bg-purple-400/10', border: 'border-purple-400/20 hover:border-purple-400/50', text: 'text-purple-400', iconBg: 'bg-purple-400/15 text-purple-400' },
};

/* ══════════════════════════════════════════════════════════════
   ANA SAYFA
   ══════════════════════════════════════════════════════════════ */
export default function AracKutusuPage() {
  const [arama, setArama] = useState('');
  const [acikArac, setAcikArac] = useState<AracTipi>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll to panel when tool opens
  useEffect(() => {
    if (acikArac && panelRef.current) {
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [acikArac]);

  // === TC / IBAN / VKN ===
  const [tcNo, setTcNo] = useState('');
  const [tcSonuc, setTcSonuc] = useState<{ gecerli: boolean; mesaj: string } | null>(null);
  const [ibanNo, setIbanNo] = useState('');
  const [ibanSonuc, setIbanSonuc] = useState<{ gecerli: boolean; mesaj: string; banka?: string } | null>(null);
  const [vknNo, setVknNo] = useState('');
  const [vknSonuc, setVknSonuc] = useState<{ gecerli: boolean; mesaj: string } | null>(null);

  // === Faiz ===
  const [faizAnapara, setFaizAnapara] = useState('');
  const [faizOran, setFaizOran] = useState('24');
  const [faizOranCustom, setFaizOranCustom] = useState('');
  const [faizGun, setFaizGun] = useState('');
  const [faizBaslangic, setFaizBaslangic] = useState('');
  const [faizBitis, setFaizBitis] = useState('');
  const [faizSonuc, setFaizSonuc] = useState<ReturnType<typeof hesaplaFaiz> | null>(null);

  // === Harç ===
  const [harcDeger, setHarcDeger] = useState('');
  const [harcTur, setHarcTur] = useState('nisbi');
  const [harcSonuc, setHarcSonuc] = useState<ReturnType<typeof hesaplaHarc> | null>(null);

  // === Vekalet ===
  const [vekDeger, setVekDeger] = useState('');
  const [vekTur, setVekTur] = useState('nisbi');
  const [vekSonuc, setVekSonuc] = useState<ReturnType<typeof hesaplaVekalet> | null>(null);

  // === Tazminat ===
  const [tazBrut, setTazBrut] = useState('');
  const [tazYil, setTazYil] = useState('');
  const [tazAy, setTazAy] = useState('0');
  const [tazSonuc, setTazSonuc] = useState<ReturnType<typeof hesaplaTazminat> | null>(null);

  // === Makbuz ===
  const [makBrut, setMakBrut] = useState('');
  const [makKdv, setMakKdv] = useState('20');
  const [makStopaj, setMakStopaj] = useState('20');
  const [makSonuc, setMakSonuc] = useState<ReturnType<typeof hesaplaMakbuz> | null>(null);

  // === Dilekçe ===
  const [seciliDilekce, setSeciliDilekce] = useState<number | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);

  // === Yasal Süre ===
  const [sureSecili, setSureSecili] = useState('');
  const [sureBas, setSureBas] = useState(new Date().toISOString().split('T')[0]);
  const [sureGun, setSureGun] = useState('14');
  const [sureSonuc, setSureSonuc] = useState<{ sonTarih: string; kalan: number } | null>(null);

  // === Detaylı Faiz ===
  const [faizTuru, setFaizTuru] = useState<FaizTuruId>('yasal');
  const [faizOzelOran, setFaizOzelOran] = useState('');
  const [faizDetaySonuc, setFaizDetaySonuc] = useState<FaizDetaySonuc | null>(null);

  // === AAÜT Vekalet ===
  const [aautTur, setAautTur] = useState(AAUT_2024[0].ad);
  const [aautDeger, setAautDeger] = useState('');
  const [aautSonuc, setAautSonuc] = useState<ReturnType<typeof hesaplaVekaletAAUT> | null>(null);

  // === Mevzuat ===
  const [mevzuatArama, setMevzuatArama] = useState('');

  const filtrelenmis = arama
    ? ARACLAR.map((kat) => ({
        ...kat,
        items: kat.items.filter((a) =>
          a.ad.toLocaleLowerCase('tr').includes(arama.toLocaleLowerCase('tr')) ||
          a.aciklama.toLocaleLowerCase('tr').includes(arama.toLocaleLowerCase('tr'))
        ),
      })).filter((kat) => kat.items.length > 0)
    : ARACLAR;

  function gunHesapla() {
    if (faizBaslangic && faizBitis) {
      const fark = Math.abs(new Date(faizBitis).getTime() - new Date(faizBaslangic).getTime());
      setFaizGun(Math.ceil(fark / 86400000).toString());
    }
  }

  function kopyala(metin: string) {
    navigator.clipboard.writeText(metin);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 2000);
  }

  // Aktif aracın bilgilerini bul
  const aktifArac = acikArac ? ARACLAR.flatMap(k => k.items).find(a => a.aracId === acikArac) : null;
  const aktifRenk = aktifArac ? RENK_MAP[aktifArac.renk] : null;

  /* ── Sonuç bileşenleri ─────────────────────────────────────── */
  const Sonuc = ({ basarili, children }: { basarili: boolean; children: React.ReactNode }) => (
    <div className={`p-3.5 rounded-xl border text-sm font-medium flex items-start gap-2.5 ${
      basarili
        ? 'bg-green/10 border-green/20 text-green'
        : 'bg-red/10 border-red/20 text-red'
    }`}>
      <span className="text-base mt-px">{basarili ? '\u2705' : '\u274C'}</span>
      <div>{children}</div>
    </div>
  );

  const SatirSonuc = ({ label, value, vurgulu }: { label: string; value: string; vurgulu?: boolean }) => (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${vurgulu ? 'text-gold' : 'text-text'}`}>{value}</span>
    </div>
  );

  const SonucKutu = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-surface border border-gold/20 rounded-xl p-4 space-y-1 mt-4">
      {children}
    </div>
  );

  const Ayirici = () => <div className="border-t border-border my-2" />;

  const Uyari = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[10px] text-text-dim mt-3 flex items-start gap-1.5">
      <span className="text-text-dim/50 mt-px">*</span>
      <span>{children}</span>
    </div>
  );

  const FormLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-xs font-medium text-text-muted mb-1.5">
      {children}{required && <span className="text-red ml-0.5">*</span>}
    </label>
  );

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors ${props.className || ''}`} />
  );

  const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className={`w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors ${props.className || ''}`}>
      {children}
    </select>
  );

  const HesaplaBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className="w-full py-2.5 bg-gold text-bg font-semibold rounded-lg text-sm hover:bg-gold-light transition-colors mt-1">
      {children}
    </button>
  );

  /* ── Araç paneli içeriği ─────────────────────────────────── */
  function renderAracIcerik() {
    switch (acikArac) {
      case 'tc':
        return (
          <div className="space-y-4">
            <FormLabel>TC Kimlik Numarası</FormLabel>
            <Input value={tcNo} onChange={(e) => { setTcNo(e.target.value); setTcSonuc(null); }}
              placeholder="11 haneli TC Kimlik No" maxLength={11} />
            <HesaplaBtn onClick={() => setTcSonuc(validateTC(tcNo))}>Doğrula</HesaplaBtn>
            {tcSonuc && <Sonuc basarili={tcSonuc.gecerli}>{tcSonuc.mesaj}</Sonuc>}
          </div>
        );

      case 'iban':
        return (
          <div className="space-y-4">
            <FormLabel>IBAN Numarası</FormLabel>
            <Input value={ibanNo} onChange={(e) => { setIbanNo(e.target.value); setIbanSonuc(null); }}
              placeholder="TR00 0000 0000 0000 0000 0000 00" />
            <HesaplaBtn onClick={() => setIbanSonuc(validateIBAN(ibanNo))}>Doğrula</HesaplaBtn>
            {ibanSonuc && (
              <Sonuc basarili={ibanSonuc.gecerli}>
                <div>{ibanSonuc.mesaj}</div>
                {ibanSonuc.banka && <div className="mt-1 text-xs opacity-80">Banka: {ibanSonuc.banka}</div>}
              </Sonuc>
            )}
          </div>
        );

      case 'vkn':
        return (
          <div className="space-y-4">
            <FormLabel>Vergi Kimlik Numarası</FormLabel>
            <Input value={vknNo} onChange={(e) => { setVknNo(e.target.value); setVknSonuc(null); }}
              placeholder="10 haneli VKN" maxLength={10} />
            <HesaplaBtn onClick={() => setVknSonuc(validateVKN(vknNo))}>Doğrula</HesaplaBtn>
            {vknSonuc && <Sonuc basarili={vknSonuc.gecerli}>{vknSonuc.mesaj}</Sonuc>}
          </div>
        );

      case 'faiz': {
        const seciliFaizTuru = UYAP_FAIZ_TURLERI.find(t => t.id === faizTuru);
        const faizGruplari = faizTurleriGruplu();
        const manuelOranTurleri: FaizTuruId[] = ['sozlesmeli', 'diger'];

        return (
          <div className="space-y-4">
            <div className="bg-gold/5 border border-gold/15 rounded-lg px-3 py-2 text-[11px] text-text-muted">
              <span className="font-bold text-gold">UYAP uyumlu {UYAP_FAIZ_TURLERI.length} faiz türü.</span> Dönemsel oran değişiklikleri ayrı dilim olarak hesaplanır.
            </div>
            <div>
              <FormLabel required>Faiz Türü ({UYAP_FAIZ_TURLERI.length} tür)</FormLabel>
              <Select value={faizTuru} onChange={(e) => { setFaizTuru(e.target.value as FaizTuruId); setFaizDetaySonuc(null); }}>
                {Object.entries(faizGruplari).map(([kat, turler]) => (
                  <optgroup key={kat} label={kat}>
                    {turler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
                  </optgroup>
                ))}
              </Select>
            </div>
            {seciliFaizTuru && (
              <div className="bg-surface2 rounded-lg px-3 py-2 text-[11px] text-text-muted">
                <span className="font-bold text-text">{seciliFaizTuru.madde}</span> — {seciliFaizTuru.aciklama}
                {seciliFaizTuru.paraBirimi && <span className="ml-2 text-gold font-semibold">({seciliFaizTuru.paraBirimi})</span>}
              </div>
            )}
            {manuelOranTurleri.includes(faizTuru) && (
              <div>
                <FormLabel required>Yıllık Faiz Oranı (%)</FormLabel>
                <Input type="number" step="0.01" min="0" value={faizOzelOran}
                  onChange={(e) => { setFaizOzelOran(e.target.value); setFaizDetaySonuc(null); }}
                  placeholder="Ör: 24.00" />
              </div>
            )}
            <div>
              <FormLabel required>Anapara (TL)</FormLabel>
              <Input type="number" value={faizAnapara} onChange={(e) => { setFaizAnapara(e.target.value); setFaizDetaySonuc(null); }} placeholder="100.000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel required>Başlangıç Tarihi</FormLabel>
                <Input type="date" value={faizBaslangic} onChange={(e) => { setFaizBaslangic(e.target.value); setFaizDetaySonuc(null); }} />
              </div>
              <div>
                <FormLabel required>Bitiş Tarihi</FormLabel>
                <Input type="date" value={faizBitis} onChange={(e) => { setFaizBitis(e.target.value); setFaizDetaySonuc(null); }} />
              </div>
            </div>
            <HesaplaBtn onClick={() => {
              const ap = parseFloat(faizAnapara);
              if (ap > 0 && faizBaslangic && faizBitis && faizBaslangic < faizBitis) {
                const ozelOran = manuelOranTurleri.includes(faizTuru) ? parseFloat(faizOzelOran) || undefined : undefined;
                setFaizDetaySonuc(hesaplaFaizDetayli(ap, faizBaslangic, faizBitis, faizTuru, ozelOran));
              }
            }}>Hesapla</HesaplaBtn>
            {faizDetaySonuc && (
              <>
                {/* Özet kartlar */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-surface2 rounded-lg p-2.5 text-center">
                    <div className="text-[9px] text-text-muted uppercase">Anapara</div>
                    <div className="text-sm font-bold text-text">{formatTL(faizDetaySonuc.anapara)}</div>
                  </div>
                  <div className="bg-red/5 border border-red/15 rounded-lg p-2.5 text-center">
                    <div className="text-[9px] text-red uppercase">Faiz Tutarı</div>
                    <div className="text-sm font-bold text-red">{formatTL(faizDetaySonuc.toplamFaiz)}</div>
                  </div>
                  <div className="bg-green/5 border border-green/15 rounded-lg p-2.5 text-center">
                    <div className="text-[9px] text-green uppercase">Genel Toplam</div>
                    <div className="text-sm font-bold text-green">{formatTL(faizDetaySonuc.genelToplam)}</div>
                  </div>
                </div>
                <div className="text-[10px] text-text-muted mt-1">
                  {faizDetaySonuc.faizTuru} &middot; {faizDetaySonuc.toplamGun} gün &middot; {faizDetaySonuc.dilimSayisi} oran dilimi
                </div>
                {/* Dönemsel detay tablosu */}
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 text-text-muted font-medium">Dönem Başlangıç</th>
                        <th className="text-left py-1.5 text-text-muted font-medium">Dönem Bitiş</th>
                        <th className="text-center py-1.5 text-text-muted font-medium">Gün</th>
                        <th className="text-center py-1.5 text-text-muted font-medium">Oran</th>
                        <th className="text-right py-1.5 text-text-muted font-medium">Faiz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faizDetaySonuc.detay.map((d, i) => {
                        const degisti = i > 0 && d.oran !== faizDetaySonuc.detay[i - 1].oran;
                        return (
                          <tr key={i} className={`border-b border-border/30 ${degisti ? 'bg-gold/5' : ''}`}>
                            <td className="py-1.5 text-text">{d.baslangic}</td>
                            <td className="py-1.5 text-text">{d.bitis}</td>
                            <td className="py-1.5 text-center text-text">{d.gun}</td>
                            <td className={`py-1.5 text-center font-semibold ${degisti ? 'text-gold' : 'text-text'}`}>
                              %{d.oran}{degisti && ' \u2B06'}
                            </td>
                            <td className="py-1.5 text-right font-semibold text-text">{formatTL(d.faiz)}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-border font-bold">
                        <td colSpan={2} className="py-1.5 text-text">TOPLAM</td>
                        <td className="py-1.5 text-center text-text">{faizDetaySonuc.toplamGun}</td>
                        <td></td>
                        <td className="py-1.5 text-right text-red">{formatTL(faizDetaySonuc.toplamFaiz)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Export butonları */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => exportFaizHesapPDF({ ...faizDetaySonuc, baslangic: faizBaslangic, bitis: faizBitis })}
                    className="flex-1 py-1.5 text-[11px] font-medium text-text-muted bg-surface2 border border-border rounded-lg hover:text-gold hover:border-gold/30 transition-colors"
                  >PDF İndir</button>
                  <button
                    onClick={() => exportFaizHesapXLS({ ...faizDetaySonuc, baslangic: faizBaslangic, bitis: faizBitis })}
                    className="flex-1 py-1.5 text-[11px] font-medium text-text-muted bg-surface2 border border-border rounded-lg hover:text-gold hover:border-gold/30 transition-colors"
                  >Excel İndir</button>
                </div>
              </>
            )}
          </div>
        );
      }

      case 'harc':
        return (
          <div className="space-y-4">
            <div>
              <FormLabel>Harç Türü</FormLabel>
              <Select value={harcTur} onChange={(e) => { setHarcTur(e.target.value); setHarcSonuc(null); }}>
                <option value="nisbi">Nisbi Harç (Dava Değerine Göre)</option>
                <option value="maktu">Maktu Harç (Sabit)</option>
                <option value="icra">İcra Harcı</option>
              </Select>
            </div>
            <div>
              <FormLabel required>Dava/Takip Değeri (TL)</FormLabel>
              <Input type="number" value={harcDeger} onChange={(e) => { setHarcDeger(e.target.value); setHarcSonuc(null); }} placeholder="100.000" />
            </div>
            <HesaplaBtn onClick={() => { const d = parseFloat(harcDeger); if (d > 0) setHarcSonuc(hesaplaHarc(d, harcTur)); }}>Hesapla</HesaplaBtn>
            {harcSonuc && (
              <SonucKutu>
                <SatirSonuc label="Başvuru Harcı" value={formatTL(harcSonuc.basvuru)} />
                <SatirSonuc label="Peşin Harç" value={formatTL(harcSonuc.pesin)} />
                {harcSonuc.karar > 0 && <SatirSonuc label="Karar Harcı" value={formatTL(harcSonuc.karar)} />}
                <Ayirici />
                <SatirSonuc label="Toplam" value={formatTL(harcSonuc.toplam)} vurgulu />
                <Uyari>Yaklaşık hesaplama. Kesin tutarlar resmi tarifeden kontrol edilmelidir.</Uyari>
              </SonucKutu>
            )}
          </div>
        );

      case 'vekalet':
        return (
          <div className="space-y-4">
            <div>
              <FormLabel required>Dava / İş Türü (AAÜT 2024 — 23 tür)</FormLabel>
              <Select value={aautTur} onChange={(e) => { setAautTur(e.target.value); setAautSonuc(null); }}>
                {AAUT_2024.map(a => (
                  <option key={a.ad} value={a.ad}>{a.ad} — {formatTL(a.ucret)}</option>
                ))}
              </Select>
            </div>
            <div>
              <FormLabel>Dava Değeri (TL, opsiyonel — nispi hesap için)</FormLabel>
              <Input type="number" value={aautDeger} onChange={(e) => { setAautDeger(e.target.value); setAautSonuc(null); }} placeholder="Boş bırakılabilir" />
            </div>
            <HesaplaBtn onClick={() => {
              setAautSonuc(hesaplaVekaletAAUT(aautTur, parseFloat(aautDeger) || 0));
            }}>Hesapla</HesaplaBtn>
            {aautSonuc && (
              <>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-surface2 rounded-lg p-2.5 text-center">
                    <div className="text-[9px] text-text-muted uppercase">Maktu (AAÜT)</div>
                    <div className="text-sm font-bold text-text">{formatTL(aautSonuc.maktu)}</div>
                  </div>
                  {aautSonuc.nispi > 0 && (
                    <div className="bg-surface2 rounded-lg p-2.5 text-center">
                      <div className="text-[9px] text-text-muted uppercase">Nispi (%15)</div>
                      <div className="text-sm font-bold text-text">{formatTL(aautSonuc.nispi)}</div>
                    </div>
                  )}
                  <div className={`bg-gold/10 border border-gold/20 rounded-lg p-2.5 text-center ${aautSonuc.nispi <= 0 ? 'col-span-2' : ''}`}>
                    <div className="text-[9px] text-gold uppercase">Önerilen Asgari</div>
                    <div className="text-sm font-bold text-gold">{formatTL(aautSonuc.onerilen)}</div>
                  </div>
                </div>
                <Uyari>Nispi ücret dava değerinin %15&apos;idir. Maktu altında ücret kararlaştırılamaz (AAÜT 2024).</Uyari>
              </>
            )}
          </div>
        );

      case 'tazminat':
        return (
          <div className="space-y-4">
            <div>
              <FormLabel required>Brüt Aylık Maaş (TL)</FormLabel>
              <Input type="number" value={tazBrut} onChange={(e) => { setTazBrut(e.target.value); setTazSonuc(null); }} placeholder="30.000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel required>Çalışma Süresi (Yıl)</FormLabel>
                <Input type="number" value={tazYil} onChange={(e) => { setTazYil(e.target.value); setTazSonuc(null); }} placeholder="5" />
              </div>
              <div>
                <FormLabel>Ek Ay</FormLabel>
                <Select value={tazAy} onChange={(e) => { setTazAy(e.target.value); setTazSonuc(null); }}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i} ay</option>)}
                </Select>
              </div>
            </div>
            <HesaplaBtn onClick={() => {
              const b = parseFloat(tazBrut), y = parseInt(tazYil), a = parseInt(tazAy);
              if (b > 0 && (y > 0 || a > 0)) setTazSonuc(hesaplaTazminat(b, y || 0, a || 0));
            }}>Hesapla</HesaplaBtn>
            {tazSonuc && (
              <SonucKutu>
                <SatirSonuc label="Kıdem Tazminatı" value={formatTL(tazSonuc.kidem)} vurgulu />
                <SatirSonuc label={`İhbar Tazminatı (${tazSonuc.ihbarHafta} hafta)`} value={formatTL(tazSonuc.ihbar)} />
                <Ayirici />
                <SatirSonuc label="Toplam" value={formatTL(tazSonuc.toplam)} vurgulu />
                <Uyari>Kıdem tavanı: {formatTL(tazSonuc.kidemTavan)} (2025 H1). Damga vergisi ve gelir vergisi dahil değildir.</Uyari>
              </SonucKutu>
            )}
          </div>
        );

      case 'makbuz':
        return (
          <div className="space-y-4">
            <div>
              <FormLabel required>Brüt Ücret (TL)</FormLabel>
              <Input type="number" value={makBrut} onChange={(e) => { setMakBrut(e.target.value); setMakSonuc(null); }} placeholder="10.000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel>KDV Oranı</FormLabel>
                <Select value={makKdv} onChange={(e) => { setMakKdv(e.target.value); setMakSonuc(null); }}>
                  <option value="20">%20</option><option value="10">%10</option><option value="1">%1</option><option value="0">KDV İstisna</option>
                </Select>
              </div>
              <div>
                <FormLabel>Stopaj Oranı</FormLabel>
                <Select value={makStopaj} onChange={(e) => { setMakStopaj(e.target.value); setMakSonuc(null); }}>
                  <option value="20">%20 (Standart)</option><option value="0">%0 (İstisna)</option>
                </Select>
              </div>
            </div>
            <HesaplaBtn onClick={() => { const b = parseFloat(makBrut); if (b > 0) setMakSonuc(hesaplaMakbuz(b, parseFloat(makKdv), parseFloat(makStopaj))); }}>Hesapla</HesaplaBtn>
            {makSonuc && (
              <SonucKutu>
                <SatirSonuc label="Brüt Ücret" value={formatTL(makSonuc.brut)} />
                <SatirSonuc label={`KDV (%${makKdv})`} value={`+${formatTL(makSonuc.kdv)}`} />
                <SatirSonuc label={`Stopaj (%${makStopaj})`} value={`-${formatTL(makSonuc.stopaj)}`} />
                <Ayirici />
                <SatirSonuc label="Müvekkil Ödemesi (Brüt + KDV)" value={formatTL(makSonuc.toplamTahsil)} vurgulu />
                <SatirSonuc label="Avukata Kalan (Net)" value={formatTL(makSonuc.net)} vurgulu />
              </SonucKutu>
            )}
          </div>
        );

      case 'sure': {
        // Süreleri kategorize et
        const sureGruplari: Record<string, SureTipi[]> = {};
        SURELER.forEach(s => {
          if (!sureGruplari[s.kat]) sureGruplari[s.kat] = [];
          sureGruplari[s.kat].push(s);
        });
        const seciliSure = SURELER.find(s => `${s.kat}-${s.ad}` === sureSecili);

        return (
          <div className="space-y-4">
            <div className="bg-blue-400/5 border border-blue-400/15 rounded-lg px-3 py-2 text-[11px] text-text-muted">
              Hafta sonları ve <span className="font-bold text-blue-400">resmi tatiller otomatik atlanır</span>. Son gün tatile denk gelirse bir sonraki iş gününe kaydırılır.
            </div>
            <div>
              <FormLabel required>Süre Türü (23 tür — HMK/İİK/İş/Ceza/İdare)</FormLabel>
              <Select value={sureSecili} onChange={(e) => {
                setSureSecili(e.target.value);
                setSureSonuc(null);
                const s = SURELER.find(s => `${s.kat}-${s.ad}` === e.target.value);
                if (s) setSureGun(s.gun.toString());
              }}>
                <option value="">— Süre türü seçin —</option>
                {Object.entries(sureGruplari).map(([kat, sureler]) => (
                  <optgroup key={kat} label={kat}>
                    {sureler.map(s => (
                      <option key={`${s.kat}-${s.ad}`} value={`${s.kat}-${s.ad}`}>
                        {s.ad} ({s.gun} gün — {s.madde})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </div>
            {seciliSure && (
              <div className="bg-surface2 rounded-lg px-3 py-2 text-[11px] text-text-muted">
                <span className="font-bold text-text">{seciliSure.madde}</span> — {seciliSure.gun} gün
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel required>Tebliğ / Başlangıç Tarihi</FormLabel>
                <Input type="date" value={sureBas} onChange={(e) => { setSureBas(e.target.value); setSureSonuc(null); }} />
              </div>
              <div>
                <FormLabel>Gün Sayısı</FormLabel>
                <Input type="number" value={sureGun} onChange={(e) => { setSureGun(e.target.value); setSureSonuc(null); }} min={1} />
              </div>
            </div>
            <HesaplaBtn onClick={() => {
              const g = parseInt(sureGun);
              if (sureBas && g > 0) {
                const sonTarih = sureHesapla(sureBas, g);
                const kalan = Math.ceil((new Date(sonTarih).getTime() - Date.now()) / 86400000);
                setSureSonuc({ sonTarih, kalan });
              }
            }}>Hesapla</HesaplaBtn>
            {sureSonuc && (() => {
              const { sonTarih, kalan } = sureSonuc;
              const renkClass = kalan <= 0 ? 'border-red bg-red/5 text-red' :
                kalan <= 3 ? 'border-orange-400 bg-orange-400/5 text-orange-400' :
                kalan <= 7 ? 'border-gold bg-gold/5 text-gold' :
                'border-green bg-green/5 text-green';
              const durum = kalan <= 0 ? 'SÜRESİ GEÇTİ' :
                kalan <= 3 ? `${kalan} gün kaldı!` :
                `${kalan} gün kaldı`;
              const fmtSonTarih = new Date(sonTarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
              return (
                <div className={`border-2 rounded-xl p-5 text-center mt-2 ${renkClass}`}>
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">Son Tarih</div>
                  <div className="text-2xl font-[var(--font-playfair)] font-bold">{fmtSonTarih}</div>
                  <div className="text-sm font-semibold mt-2">
                    {kalan <= 0 ? '\u274C' : kalan <= 3 ? '\uD83D\uDEA8' : '\u2705'} {durum}
                  </div>
                  <div className="text-[10px] opacity-60 mt-2">
                    Başlangıç: {new Date(sureBas).toLocaleDateString('tr-TR')} + {sureGun} iş günü (tatiller hariç)
                  </div>
                </div>
              );
            })()}
          </div>
        );
      }

      case 'dilekce':
        return (
          <div className="space-y-3">
            {seciliDilekce === null ? (
              DILEKCE_SABLONLARI.map((s, i) => (
                <button key={i} onClick={() => setSeciliDilekce(i)}
                  className="w-full text-left p-3.5 bg-surface2 rounded-xl border border-border hover:border-blue-400/40 hover:bg-blue-400/5 transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-text group-hover:text-blue-400 transition-colors">{s.ad}</div>
                      <div className="text-[11px] text-text-muted mt-0.5">{s.aciklama}</div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-text-dim group-hover:text-blue-400 transition-colors" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </button>
              ))
            ) : (
              <>
                <button onClick={() => setSeciliDilekce(null)} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors mb-2">
                  <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                  Listeye Dön
                </button>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-text">{DILEKCE_SABLONLARI[seciliDilekce].ad}</h3>
                  <button onClick={() => kopyala(DILEKCE_SABLONLARI[seciliDilekce].icerik)}
                    className="flex items-center gap-1.5 text-[11px] bg-blue-400/10 text-blue-400 border border-blue-400/20 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-400/20 transition-colors">
                    {kopyalandi ? (
                      <><svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg> Kopyalandı</>
                    ) : (
                      <><svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Kopyala</>
                    )}
                  </button>
                </div>
                <pre className="text-xs text-text-muted bg-surface2 rounded-xl p-4 whitespace-pre-wrap font-mono leading-relaxed max-h-[45vh] overflow-y-auto border border-border">
                  {DILEKCE_SABLONLARI[seciliDilekce].icerik}
                </pre>
              </>
            )}
          </div>
        );

      case 'ihtarname_sab':
        return (
          <div className="space-y-2.5">
            {IHTARNAME_SABLONLARI.map((s, i) => (
              <div key={i} className="p-3.5 bg-surface2 rounded-xl border border-border hover:border-blue-400/30 transition-colors">
                <div className="text-sm font-semibold text-text mb-0.5">{s.ad}</div>
                <div className="text-[11px] text-text-muted">{s.aciklama}</div>
              </div>
            ))}
            <div className="text-[10px] text-text-dim mt-3 bg-surface2 rounded-lg p-2.5 border border-border">
              Detaylı ihtarname şablonlarına <span className="text-blue-400 font-medium">İhtarname</span> sayfasından ulaşabilirsiniz.
            </div>
          </div>
        );

      case 'sozlesme':
        return (
          <div className="space-y-2.5">
            {SOZLESME_SABLONLARI.map((s, i) => (
              <div key={i} className="p-3.5 bg-surface2 rounded-xl border border-border hover:border-blue-400/30 transition-colors">
                <div className="text-sm font-semibold text-text mb-0.5">{s.ad}</div>
                <div className="text-[11px] text-text-muted">{s.aciklama}</div>
              </div>
            ))}
            <div className="text-[10px] text-text-dim mt-3 bg-surface2 rounded-lg p-2.5 border border-border">
              Sözleşme şablonları yakında indirilebilir formatta eklenecektir.
            </div>
          </div>
        );

      case 'adli_takvim':
        return (
          <div className="space-y-2">
            {ADLI_TAKVIM_2026.map((t, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${
                t.tur === 'adli' ? 'bg-red/5 border-red/20' :
                t.tur === 'dini' ? 'bg-gold/5 border-gold/20' :
                'bg-surface2 border-border'
              }`}>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                  t.tur === 'adli' ? 'bg-red/15 text-red' :
                  t.tur === 'dini' ? 'bg-gold/15 text-gold' :
                  'bg-blue-400/10 text-blue-400'
                }`}>
                  {t.tur === 'adli' ? 'ADLİ TATİL' : t.tur === 'dini' ? 'DİNİ' : 'RESMİ'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-text">{t.ad}</div>
                  <div className="text-[11px] text-text-muted">{t.tarih}</div>
                </div>
              </div>
            ))}
            <Uyari>Dini bayram tarihleri tahminidir, kesin tarihler Diyanet tarafından ilan edilir.</Uyari>
          </div>
        );

      case 'mevzuat':
        return (
          <div className="space-y-4">
            <p className="text-xs text-text-muted">mevzuat.gov.tr üzerinde kanun, yönetmelik ve tüzük araması yapın.</p>
            <div>
              <FormLabel>Arama Terimi</FormLabel>
              <Input value={mevzuatArama} onChange={(e) => setMevzuatArama(e.target.value)}
                placeholder="Ör: Türk Borçlar Kanunu, İş Kanunu, HMK"
                onKeyDown={(e) => { if (e.key === 'Enter' && mevzuatArama.trim()) window.open(`https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=&MevzuatTur=&MevzuatTertip=&Kelime=${encodeURIComponent(mevzuatArama.trim())}`, '_blank'); }} />
            </div>
            <HesaplaBtn onClick={() => {
              if (mevzuatArama.trim()) window.open(`https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=&MevzuatTur=&MevzuatTertip=&Kelime=${encodeURIComponent(mevzuatArama.trim())}`, '_blank');
            }}>mevzuat.gov.tr&apos;de Ara</HesaplaBtn>
            <div className="border-t border-border pt-4">
              <div className="text-xs text-text-muted font-semibold mb-2.5">Sık Kullanılan Kanunlar</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { ad: 'Türk Borçlar Kanunu', no: '6098' },
                  { ad: 'Hukuk Muhakemeleri Kanunu', no: '6100' },
                  { ad: 'İcra ve İflas Kanunu', no: '2004' },
                  { ad: 'Türk Ceza Kanunu', no: '5237' },
                  { ad: 'İş Kanunu', no: '4857' },
                  { ad: 'Türk Medeni Kanunu', no: '4721' },
                  { ad: 'Türk Ticaret Kanunu', no: '6102' },
                  { ad: 'Tüketici Koruma Kanunu', no: '6502' },
                ].map((k) => (
                  <button key={k.no} onClick={() => window.open(`https://www.mevzuat.gov.tr/MevzuatMetin/${k.no}`, '_blank')}
                    className="text-left p-2.5 bg-surface2 rounded-lg hover:bg-purple-400/5 transition-colors border border-border hover:border-purple-400/30 group">
                    <div className="text-[11px] font-medium text-text group-hover:text-purple-400 transition-colors">{k.ad}</div>
                    <div className="text-[10px] text-text-dim">No: {k.no}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'mahkeme':
        return (
          <div className="space-y-4">
            <p className="text-xs text-text-muted">Mahkeme adres ve iletişim bilgilerine UYAP üzerinden ulaşabilirsiniz.</p>
            <button onClick={() => window.open('https://vatandas.uyap.gov.tr', '_blank')}
              className="w-full py-2.5 bg-purple-400/10 text-purple-400 border border-purple-400/20 font-semibold rounded-lg text-sm hover:bg-purple-400/20 transition-colors flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
              UYAP Vatandaş Portal
            </button>
            <div className="border-t border-border pt-4">
              <div className="text-xs text-text-muted font-semibold mb-2.5">Büyükşehir Adliyeleri</div>
              <div className="space-y-2">
                {[
                  { il: 'İstanbul', adliye: ['Çağlayan', 'Anadolu (Kartal)', 'Bakırköy', 'Gaziosmanpaşa'] },
                  { il: 'Ankara', adliye: ['Ankara Adliyesi', 'Batı (Sincan)'] },
                  { il: 'İzmir', adliye: ['İzmir Adliyesi', 'Kuzey (Karşıyaka)'] },
                  { il: 'Bursa', adliye: ['Bursa Adliyesi'] },
                  { il: 'Antalya', adliye: ['Antalya Adliyesi'] },
                ].map((m) => (
                  <div key={m.il} className="p-3 bg-surface2 rounded-xl border border-border">
                    <div className="text-xs font-bold text-purple-400 mb-1">{m.il}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.adliye.map((a) => (
                        <span key={a} className="text-[10px] text-text-muted bg-surface border border-border rounded-md px-2 py-0.5">{a}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'icra_bilgi':
        return (
          <div className="space-y-4">
            <p className="text-xs text-text-muted">İcra dairesi bilgilerine aşağıdaki portallerden ulaşabilirsiniz.</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => window.open('https://avukat.uyap.gov.tr', '_blank')}
                className="py-2.5 bg-purple-400/10 text-purple-400 border border-purple-400/20 font-semibold rounded-lg text-xs hover:bg-purple-400/20 transition-colors flex items-center justify-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
                UYAP Avukat
              </button>
              <button onClick={() => window.open('https://www.turkiye.gov.tr', '_blank')}
                className="py-2.5 bg-purple-400/10 text-purple-400 border border-purple-400/20 font-semibold rounded-lg text-xs hover:bg-purple-400/20 transition-colors flex items-center justify-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
                e-Devlet
              </button>
            </div>
            <div className="border-t border-border pt-4">
              <div className="text-xs text-text-muted font-semibold mb-2.5">Faydalı Linkler</div>
              <div className="space-y-2">
                {[
                  { ad: 'UYAP Dosya Sorgulama', aciklama: 'Vatandaş portalı üzerinden dosya takibi', url: 'https://vatandas.uyap.gov.tr' },
                  { ad: 'e-Satış (Açık Artırma)', aciklama: 'İhale ve açık artırma ilanları', url: 'https://esatis.uyap.gov.tr' },
                  { ad: 'İcra Harç Hesaplama', aciklama: 'Bu sayfadaki harç hesaplama aracı', url: '#' },
                  { ad: 'Posta Takip (PTT)', aciklama: 'Tebligat ve gönderi takibi', url: 'https://gonderitakip.ptt.gov.tr' },
                ].map((l) => (
                  <button key={l.ad} onClick={() => { if (l.url === '#') setAcikArac('harc'); else window.open(l.url, '_blank'); }}
                    className="w-full text-left p-3 bg-surface2 rounded-xl border border-border hover:border-purple-400/30 hover:bg-purple-400/5 transition-all group">
                    <div className="text-xs font-medium text-text group-hover:text-purple-400 transition-colors">{l.ad}</div>
                    <div className="text-[10px] text-text-dim">{l.aciklama}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">Avukat Araç Kutusu</h1>
        <p className="text-sm text-text-muted mt-1">Hukuki hesaplama, doğrulama ve bilgi araçları</p>
      </div>

      {/* Arama */}
      <div className="mb-8 relative max-w-lg">
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-text-dim absolute left-3.5 top-1/2 -translate-y-1/2" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" value={arama} onChange={(e) => setArama(e.target.value)}
          placeholder="Araç ara... (ör: faiz, tazminat, IBAN)"
          className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors" />
        {arama && (
          <button onClick={() => setArama('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition-colors">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      {/* İki kolon layout: Kartlar + Aktif Araç Paneli */}
      <div className={`grid gap-6 ${acikArac ? 'grid-cols-[1fr_420px]' : 'grid-cols-1'}`}>
        {/* Sol: Araç kartları */}
        <div className="space-y-6">
          {filtrelenmis.map((kat) => (
            <div key={kat.kategori}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-1 h-4 rounded-full ${
                  kat.renkClass === 'text-gold' ? 'bg-gold' :
                  kat.renkClass === 'text-green' ? 'bg-green' :
                  kat.renkClass === 'text-blue-400' ? 'bg-blue-400' :
                  'bg-purple-400'
                }`} />
                <h2 className={`text-xs font-bold uppercase tracking-wider ${kat.renkClass}`}>{kat.kategori}</h2>
              </div>
              <div className={`grid gap-2.5 ${acikArac ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
                {kat.items.map((arac) => {
                  const renk = RENK_MAP[arac.renk];
                  const aktif = acikArac === arac.aracId;
                  const Icon = arac.icon;
                  return (
                    <button
                      key={arac.ad}
                      onClick={() => setAcikArac(aktif ? null : arac.aracId)}
                      className={`relative p-4 rounded-xl border text-left transition-all duration-200 group ${
                        aktif
                          ? `${renk.bg} ${renk.border.split(' ')[0]} ring-1 ring-${arac.renk}/30`
                          : `bg-surface ${renk.border} ${renk.bgHover}`
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                        aktif ? renk.iconBg : 'bg-surface2 text-text-muted group-hover:' + renk.iconBg.split(' ').join(' group-hover:')
                      }`}>
                        <Icon />
                      </div>
                      <div className={`text-sm font-semibold mb-0.5 transition-colors ${
                        aktif ? renk.text : 'text-text group-hover:' + renk.text
                      }`}>
                        {arac.ad}
                      </div>
                      <div className="text-[11px] text-text-muted leading-relaxed">{arac.aciklama}</div>
                      {aktif && (
                        <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
                          arac.renk === 'gold' ? 'bg-gold' :
                          arac.renk === 'green' ? 'bg-green' :
                          arac.renk === 'blue-400' ? 'bg-blue-400' :
                          'bg-purple-400'
                        } animate-pulse`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sağ: Aktif araç paneli */}
        {acikArac && aktifArac && aktifRenk && (
          <div ref={panelRef} className="sticky top-4">
            <div className={`bg-surface border rounded-xl overflow-hidden ${aktifRenk.border.split(' ')[0]}`}>
              {/* Panel header */}
              <div className={`px-5 py-3.5 border-b border-border flex items-center justify-between ${aktifRenk.bg}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${aktifRenk.iconBg}`}>
                    <aktifArac.icon />
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${aktifRenk.text}`}>{aktifArac.ad}</div>
                    <div className="text-[10px] text-text-muted">{aktifArac.aciklama}</div>
                  </div>
                </div>
                <button onClick={() => setAcikArac(null)}
                  className="w-7 h-7 rounded-lg bg-surface2/50 flex items-center justify-center text-text-muted hover:text-text hover:bg-surface2 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              {/* Panel body */}
              <div className="p-5 max-h-[calc(100vh-180px)] overflow-y-auto">
                {renderAracIcerik()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
