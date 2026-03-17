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
export const DAVA_DURUMLARI = ['Derdest', 'Hazırlık Aşamasında', 'Kapalı'] as const;

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

// ── Dava Evrak Türleri ──
export const DAVA_EVRAK_TURLERI = [
  { key: 'dava_dilekce', label: 'Dava Dilekçesi', icon: '📝' },
  { key: 'cevap_dilekce', label: 'Cevap Dilekçesi', icon: '📝' },
  { key: 'replik', label: 'Replik / Düplik', icon: '📝' },
  { key: 'tensip_zapti', label: 'Tensip Zaptı', icon: '📋' },
  { key: 'durusma_zapti', label: 'Duruşma Zaptı', icon: '📋' },
  { key: 'bilirkisi_raporu', label: 'Bilirkişi Raporu', icon: '🔍' },
  { key: 'karar', label: 'Karar', icon: '⚖️' },
  { key: 'istinaf_dilekce', label: 'İstinaf Dilekçesi', icon: '📝' },
  { key: 'temyiz_dilekce', label: 'Temyiz Dilekçesi', icon: '📝' },
  { key: 'harc_makbuz', label: 'Harç Makbuzu', icon: '🧾' },
  { key: 'vekaletname', label: 'Vekaletname', icon: '📜' },
  { key: 'delil', label: 'Delil / Ek', icon: '📎' },
  { key: 'tebligat', label: 'Tebligat', icon: '📬' },
  { key: 'diger', label: 'Diğer', icon: '📄' },
] as const;

// ── İcra Evrak Türleri ──
export const ICRA_EVRAK_TURLERI = [
  { key: 'takip_talebi', label: 'Takip Talebi', icon: '📝' },
  { key: 'odeme_emri', label: 'Ödeme / İcra Emri', icon: '📋' },
  { key: 'itiraz_dilekce', label: 'İtiraz Dilekçesi', icon: '📝' },
  { key: 'haciz_tutanagi', label: 'Haciz Tutanağı', icon: '📋' },
  { key: 'kiymet_takdiri', label: 'Kıymet Takdiri', icon: '🔍' },
  { key: 'satis_ilani', label: 'Satış İlanı', icon: '📢' },
  { key: 'harc_makbuz', label: 'Harç Makbuzu', icon: '🧾' },
  { key: 'vekaletname', label: 'Vekaletname', icon: '📜' },
  { key: 'borclu_mal_beyan', label: 'Borçlu Mal Beyanı', icon: '📄' },
  { key: 'tebligat', label: 'Tebligat', icon: '📬' },
  { key: 'diger', label: 'Diğer', icon: '📄' },
] as const;

// ── Evrak Grubu Tipi ──
export interface EvrakGrup {
  key: string;
  label: string;
  aciklama: string;
  renk: string; // Tailwind CSS class
  turler: string[]; // evrak türü key'leri
}

// ── Dava Evrak Grupları ──
export const DAVA_EVRAK_GRUPLARI: EvrakGrup[] = [
  {
    key: 'dilekceler',
    label: 'Dilekçeler',
    aciklama: 'Dava, cevap, istinaf ve temyiz dilekçeleri',
    renk: 'bg-blue-400/10 text-blue-400',
    turler: ['dava_dilekce', 'cevap_dilekce', 'replik', 'istinaf_dilekce', 'temyiz_dilekce'],
  },
  {
    key: 'zabitlar_kararlar',
    label: 'Zabıtlar & Kararlar',
    aciklama: 'Tensip, duruşma zabıtları ve mahkeme kararları',
    renk: 'bg-purple-400/10 text-purple-400',
    turler: ['tensip_zapti', 'durusma_zapti', 'karar'],
  },
  {
    key: 'bilirkisi_delil',
    label: 'Bilirkişi & Deliller',
    aciklama: 'Bilirkişi raporları ve delil/ek dosyalar',
    renk: 'bg-amber-400/10 text-amber-400',
    turler: ['bilirkisi_raporu', 'delil'],
  },
  {
    key: 'resmi_belgeler',
    label: 'Resmi Belgeler',
    aciklama: 'Harç makbuzları, vekaletnameler ve tebligatlar',
    renk: 'bg-green/10 text-green',
    turler: ['harc_makbuz', 'vekaletname', 'tebligat'],
  },
  {
    key: 'diger',
    label: 'Diğer',
    aciklama: 'Sınıflandırılmamış evraklar',
    renk: 'bg-surface2 text-text-muted',
    turler: ['diger'],
  },
];

// ── İcra Evrak Grupları ──
export const ICRA_EVRAK_GRUPLARI: EvrakGrup[] = [
  {
    key: 'takip_belgeleri',
    label: 'Takip Belgeleri',
    aciklama: 'Takip talebi, ödeme/icra emri ve itiraz dilekçeleri',
    renk: 'bg-blue-400/10 text-blue-400',
    turler: ['takip_talebi', 'odeme_emri', 'itiraz_dilekce'],
  },
  {
    key: 'haciz_satis',
    label: 'Haciz & Satış',
    aciklama: 'Haciz tutanakları, kıymet takdiri ve satış ilanları',
    renk: 'bg-red/10 text-red',
    turler: ['haciz_tutanagi', 'kiymet_takdiri', 'satis_ilani'],
  },
  {
    key: 'resmi_belgeler',
    label: 'Resmi Belgeler',
    aciklama: 'Harç makbuzları, vekaletnameler ve tebligatlar',
    renk: 'bg-green/10 text-green',
    turler: ['harc_makbuz', 'vekaletname', 'tebligat'],
  },
  {
    key: 'borclu_belgeleri',
    label: 'Borçlu Belgeleri',
    aciklama: 'Borçlu mal beyanı ve ilgili belgeler',
    renk: 'bg-amber-400/10 text-amber-400',
    turler: ['borclu_mal_beyan'],
  },
  {
    key: 'diger',
    label: 'Diğer',
    aciklama: 'Sınıflandırılmamış evraklar',
    renk: 'bg-surface2 text-text-muted',
    turler: ['diger'],
  },
];

// ── Yargı Türleri ──
export const YARGI_TURLERI = [
  'Ceza',
  'Hukuk',
  'İdari Yargı',
  'Savcılık',
  'Tazminat Komisyonu Başkanlığı',
] as const;

// ── Yargı Birimleri (Yargı Türüne bağlı) ──
export const YARGI_BIRIMLERI: Record<string, string[]> = {
  'Ceza': [
    'AĞIR CEZA MAHKEMESİ',
    'ASLİYE CEZA MAHKEMESİ',
    'Bölge Adliye Mah. Ceza Dairesi',
    'ÇOCUK AĞIR CEZA MAHKEMESİ',
    'ÇOCUK MAHKEMESİ',
    'FİKRİ VE SINAİ HAKLAR CEZA MAHKEMESİ',
    'İCRA CEZA HAKİMLİĞİ',
    'İNFAZ HAKİMLİĞİ',
    'İSTİNAF CEZA DAİRESİ (İLK DERECE)',
    'SULH CEZA HAKİMLİĞİ',
    'YARGITAY CEZA DAİRESİ (İLK DERECE)',
  ],
  'Hukuk': [
    'AİLE MAHKEMESİ',
    'ASLİYE HUKUK MAHKEMESİ',
    'ASLİYE TİCARET MAHKEMESİ',
    'BAM Hukuk Dairesi (İlk Derece)',
    'Bölge Adliye Mah. Hukuk Dairesi',
    'FİKRİ VE SINAİ HAKLAR HUKUK MAHKEMESİ',
    'İCRA HUKUK MAHKEMESİ',
    'İŞ MAHKEMESİ',
    'KADASTRO MAHKEMESİ',
    'KADASTRO MAHKEMESİ (MÜS)',
    'SULH HUKUK MAHKEMESİ',
    'TÜKETİCİ MAHKEMESİ',
  ],
  'İdari Yargı': [
    'BÖLGE İDARE MAHKEMESİ',
    'İDARE MAHKEMESİ',
    'VERGİ MAHKEMESİ',
  ],
  'Savcılık': [
    'Savcılık',
  ],
  'Tazminat Komisyonu Başkanlığı': [
    'Tazminat Komisyonu Başkanlığı',
  ],
};

// ── İcra Yargı Birimleri (İcra modülüne özel) ──
// Not: İCRA HUKUK MAHKEMESİ ve İCRA CEZA MAHKEMESİ artık Dava modülündedir (YARGI_BIRIMLERI)
export const ICRA_YARGI_BIRIMLERI = [
  'İCRA DAİRESİ',
  'SATIŞ MEMURLUĞU',
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
