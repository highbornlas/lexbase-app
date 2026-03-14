/* ══════════════════════════════════════════════════════════════
   UYAP Uyumlu Sabitler — Dava & İcra modülleri
   ══════════════════════════════════════════════════════════════ */

// ── Dava Türleri ──
export const DAVA_TURLERI = [
  'Alacak',
  'Boşanma',
  'İş',
  'Tazminat',
  'Ticari',
  'İdari',
  'Ceza',
  'Tapu İptali ve Tescil',
  'Kira',
  'Miras',
  'Tüketici',
  'Fikri Haklar',
  'İflas',
  'İtirazın İptali',
  'Menfi Tespit',
  'İstirdat',
  'Ortaklığın Giderilmesi',
  'Kamulaştırma',
  'İdari İşlemin İptali',
  'Vergi',
  'Diğer',
] as const;

// ── Mahkeme Türleri ──
export const MAHKEME_TURLERI = [
  'Asliye Hukuk',
  'Asliye Ticaret',
  'Sulh Hukuk',
  'Aile',
  'İş',
  'Tüketici',
  'Kadastro',
  'Fikri ve Sınai Haklar Hukuk',
  'İcra Hukuk',
  'İdare',
  'Vergi',
  'Ağır Ceza',
  'Asliye Ceza',
  'Sulh Ceza Hakimliği',
  'Çocuk',
  'Çocuk Ağır Ceza',
  'Fikri ve Sınai Haklar Ceza',
  'İcra Ceza',
  'Bölge Adliye Mahkemesi',
  'Yargıtay',
  'Danıştay',
] as const;

// ── İcra Türleri ──
export const ICRA_TURLERI = [
  'İlamlı',
  'İlamsız',
  'Kambiyo',
  'Kira',
  'Rehnin Paraya Çevrilmesi',
  'İflas',
  'İhtiyati Haciz',
] as const;

// ── Alacak Türleri ──
export const ALACAK_TURLERI = [
  'Ticari Alacak',
  'Kira Alacağı',
  'İş Alacağı',
  'Çek/Senet',
  'Tazminat',
  'Nafaka',
  'Kredi/Finans',
  'Diğer',
] as const;

// ── Dava Kapanış Sebepleri ──
export const KAPANIS_SEBEPLERI_DAVA = [
  'Kabul',
  'Ret',
  'Kısmi Kabul',
  'Feragat',
  'Sulh',
  'Düşme',
  'Takipsizlik',
  'Görevsizlik',
  'Yetkisizlik',
  'Birleştirme',
  'Bozma',
  'Diğer',
] as const;

// ── İcra Kapanış Sebepleri ──
export const KAPANIS_SEBEPLERI_ICRA = [
  'Tahsil',
  'Haricen Tahsil',
  'Feragat',
  'Sulh',
  'Aciz Vesikası',
  'Takibin İptali',
  'Zamanaşımı',
  'Diğer',
] as const;

// ── Dava Durumları ──
export const DAVA_DURUMLARI = ['Aktif', 'Beklemede', 'Kapalı'] as const;

// ── Dava Aşamaları ──
export const DAVA_ASAMALARI = [
  'İlk Derece',
  'İstinaf',
  'Temyiz (Yargıtay)',
  'Temyiz (Danıştay)',
  'Kesinleşti',
  'Düşürüldü',
] as const;

// ── İcra Durumları ──
export const ICRA_DURUMLARI = [
  'Aktif',
  'Takipte',
  'Haciz Aşaması',
  'Satış Aşaması',
  'Kapandı',
] as const;

// ── Taraf Seçenekleri (Dava) ──
export const DAVA_TARAF = [
  { value: 'davaci', label: 'Davacı' },
  { value: 'davali', label: 'Davalı' },
  { value: 'mudahil', label: 'Müdahil' },
  { value: 'feri_mudahil', label: 'Feri Müdahil' },
] as const;

// ── Müvekkil Rolü (İcra) ──
export const ICRA_MUVEKKIL_ROL = [
  { value: 'alacakli', label: 'Alacaklı' },
  { value: 'borclu', label: 'Borçlu' },
] as const;

// ── Yasal Süreler (gün) ──
export const YASAL_SURELER = {
  dava: [
    { tip: 'İstinaf Başvuru', gun: 14, aciklama: 'Kararın tebliğinden itibaren' },
    { tip: 'Temyiz Başvuru', gun: 30, aciklama: 'Kararın tebliğinden itibaren' },
    { tip: 'Karar Düzeltme', gun: 15, aciklama: 'Temyiz kararının tebliğinden itibaren' },
    { tip: 'Cevap Dilekçesi', gun: 14, aciklama: 'Dava dilekçesinin tebliğinden itibaren' },
    { tip: 'Cevaba Cevap', gun: 14, aciklama: 'Cevap dilekçesinin tebliğinden itibaren' },
  ],
  icra: [
    { tip: 'Ödeme Emrine İtiraz (İlamsız)', gun: 7, aciklama: 'Ödeme emri tebliğinden itibaren' },
    { tip: 'Ödeme Emrine İtiraz (Kambiyo)', gun: 5, aciklama: 'Ödeme emri tebliğinden itibaren' },
    { tip: 'İcra Emrine İtiraz (İlamlı)', gun: 7, aciklama: 'İcra emri tebliğinden itibaren' },
    { tip: 'İtirazın İptali', gun: 365, aciklama: 'İtiraz tarihinden itibaren 1 yıl' },
    { tip: 'İtirazın Kaldırılması', gun: 180, aciklama: 'İtiraz tarihinden itibaren 6 ay' },
    { tip: 'Menfi Tespit', gun: 365, aciklama: 'Borçlu için' },
    { tip: 'Şikayet (Genel)', gun: 7, aciklama: 'İşlemin öğrenilmesinden itibaren' },
  ],
} as const;

// ── Duruşma Saatleri ──
export const DURUSMA_SAATLERI = [
  '09:00', '09:15', '09:30', '09:45',
  '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45',
  '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '13:45',
  '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:15', '15:30', '15:45',
  '16:00', '16:15', '16:30', '16:45',
  '17:00',
] as const;

// ── İller ──
export const ILLER = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya',
  'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik',
  'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum',
  'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
  'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis',
  'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa',
  'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye',
  'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop', 'Şırnak', 'Sivas',
  'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak',
] as const;
