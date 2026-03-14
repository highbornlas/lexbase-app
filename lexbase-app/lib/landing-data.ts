/* ═══════════════════════════════════════════════════════════════
   Landing Page — Tüm Data Sabitleri
   ═══════════════════════════════════════════════════════════════ */

/* ── Özellikler (Z-Pattern) ── */
export const FEATURES = [
  {
    key: 'muvekkil',
    tag: 'Müvekkil Yönetimi',
    title: 'Tüm müvekkilleriniz, tek merkezde.',
    desc: 'Gerçek ve tüzel kişi profillerini eksiksiz yönetin. TC kimlik, vergi no, MERSİS, IBAN bilgilerinden dava geçmişine kadar her şey elinizin altında.',
    list: ['Gerçek & tüzel kişi profilleri', 'Bağlı dava, icra ve arabuluculuk dosyaları', 'Belge arşivi & iletişim geçmişi'],
    icon: '📒',
  },
  {
    key: 'dava',
    tag: 'Dava Yönetimi',
    title: 'Davalarınız ve her kuruş, kontrol altında.',
    desc: '50+ mahkeme türü, aşama takibi ve duruşma takvimi. Dava bazlı finansal takiple her harcama ve vekâlet ücreti kayıt altında.',
    list: ['50+ mahkeme türü & vekil yönetimi', 'Harç, bilirkişi, tebligat takibi', 'Vekâlet ücreti & tahsilat yönetimi'],
    icon: '📁',
  },
  {
    key: 'icra',
    tag: 'İcra Takibi',
    title: 'İcra dosyalarınızı kayıpsız yönetin.',
    desc: 'İlamlı, ilamsız, kambiyo ve haciz takiplerinizi 8 farklı icra türü desteğiyle yönetin. Alacak ve tahsilat bakiyeniz her zaman güncel.',
    list: ['8 icra türü desteği', 'İcra dairesi & dosya no takibi', 'Alacak, tahsilat & kalan bakiye'],
    icon: '⚡',
  },
  {
    key: 'finans',
    tag: 'Finans & Raporlama',
    title: 'Büronuzun mali tablosu anlık ve net.',
    desc: 'Gelir, gider, avans ve vekâlet ücretlerini kategorize edin. Müvekkil bazlı kârlılık analizi ve beklenen gelir tahminleri.',
    list: ['Gelir & gider kategorileri', 'Müvekkil kârlılık analizi', 'Fatura & makbuz oluşturma'],
    icon: '💰',
  },
  {
    key: 'takvim',
    tag: 'Takvim & Uyarılar',
    title: 'Hiçbir kritik süre gözden kaçmasın.',
    desc: 'Duruşma tarihleri, itiraz süreleri, temyiz son günleri — hepsi renk kodlu uyarılarla karşınızda. Görevlerinizi öncelikle yönetin.',
    list: ['Renk kodlu öncelik sistemi', 'Otomatik duruşma takvimi', 'Görev atama & takip'],
    icon: '📅',
  },
  {
    key: 'ekip',
    tag: 'Ekip & Yetki',
    title: 'Ekibinizi yönetin, yetkileri belirleyin.',
    desc: 'Avukat, stajyer ve sekreter için farklı yetki seviyeleri. Modül bazlı erişim kontrolü ile veri güvenliğini sağlayın.',
    list: ['Rol bazlı yetki yönetimi', 'Modül bazlı erişim kontrolü', 'Aktivite logları & denetim'],
    icon: '👥',
  },
];

/* ── Fiyat Planları ── */
export const PLANLAR = [
  {
    icon: '🌱', ad: 'Başlangıç', aciklama: 'Tanışma dönemi',
    fiyatAylik: 'Ücretsiz', fiyatYillik: 'Ücretsiz',
    periyotAylik: '/ 30 gün', periyotYillik: '/ 30 gün',
    ozellikler: [
      { text: '25 Müvekkil', var: true }, { text: '30 Dava, 15 İcra', var: true },
      { text: 'Arabuluculuk', var: true }, { text: 'İletişim Geçmişi', var: false },
      { text: 'Finans & Fatura', var: false }, { text: 'Personel hesabı', var: false },
    ],
    vurgu: false, btnText: 'Ücretsiz Başla',
  },
  {
    icon: '⚡', ad: 'Profesyonel', aciklama: 'Tek avukat için ideal',
    fiyatAylik: '₺399', fiyatYillik: '₺319',
    periyotAylik: '/ ay', periyotYillik: '/ ay (yıllık)',
    ozellikler: [
      { text: '150 Müvekkil', var: true }, { text: '200 Dava, 100 İcra', var: true },
      { text: 'İletişim Geçmişi', var: true }, { text: 'Finans & Fatura', var: true },
      { text: 'Araç Kutusu', var: true }, { text: 'Personel hesabı', var: false },
    ],
    vurgu: false, btnText: 'Planı Seç',
  },
  {
    icon: '🏛', ad: 'Büro', aciklama: '2-5 kişilik bürolar',
    fiyatAylik: '₺699', fiyatYillik: '₺559',
    periyotAylik: '/ ay', periyotYillik: '/ ay (yıllık)',
    ozellikler: [
      { text: '500 Müvekkil', var: true }, { text: '750 Dava, 400 İcra', var: true },
      { text: 'Finans & Fatura', var: true }, { text: 'Araç Kutusu', var: true },
      { text: '5 Personel Hesabı', var: true }, { text: 'Bulut Yedek', var: false },
    ],
    vurgu: true, btnText: 'Planı Seç',
  },
  {
    icon: '🏢', ad: 'Kurumsal', aciklama: 'Büyük bürolar için',
    fiyatAylik: '₺999', fiyatYillik: '₺799',
    periyotAylik: '/ ay', periyotYillik: '/ ay (yıllık)',
    ozellikler: [
      { text: 'Sınırsız Müvekkil', var: true }, { text: 'Sınırsız Dava & İcra', var: true },
      { text: 'Tüm Özellikler', var: true }, { text: 'Sınırsız Personel', var: true },
      { text: 'Bulut Yedekleme', var: true }, { text: 'Özel Destek Hattı', var: true },
    ],
    vurgu: false, btnText: 'Planı Seç',
  },
];

/* ── Sosyal Kanıt ── */
export const SOSYAL_KANIT = [
  { n: '12+', l: 'Profesyonel Modül', icon: '📦' },
  { n: '100%', l: 'Veri Güvenliği', icon: '🔒' },
  { n: '7/24', l: 'Bulut Erişim', icon: '☁️' },
  { n: '4', l: 'Esnek Plan', icon: '⚡' },
];

/* ── Nasıl Çalışır ── */
export const ADIMLAR = [
  { n: '1', t: 'Kaydolun', d: '30 saniyelik kayıt formuyla büronuzu oluşturun. Kart bilgisi gerekmez.', icon: '📝' },
  { n: '2', t: 'Müvekkil Ekleyin', d: 'Gerçek veya tüzel kişi profillerini hızlıca girin.', icon: '👤' },
  { n: '3', t: 'Davaları Açın', d: 'Dava ve icra dosyaları oluşturun. Takvim otomatik güncellenir.', icon: '📁' },
  { n: '4', t: 'Yönetin', d: "Dashboard'dan tüm iş akışlarınızı izleyin. Raporlarla karar alın.", icon: '📊' },
];

/* ── SSS (Sıkça Sorulan Sorular) ── */
export const SSS_DATA = [
  {
    kategori: 'Genel',
    sorular: [
      {
        soru: 'LexBase nedir?',
        cevap: 'LexBase, avukatlar ve hukuk büroları için geliştirilmiş kapsamlı bir dijital büro yönetim platformudur. Müvekkil yönetimi, dava ve icra takibi, finansal raporlama, takvim yönetimi, görev takibi ve ekip yetkilendirme gibi tüm iş süreçlerini tek bir platformda birleştirir. Bulut tabanlı yapısı sayesinde internet bağlantısı olan her yerden güvenle erişebilirsiniz.',
      },
      {
        soru: 'Kimler kullanabilir?',
        cevap: 'LexBase, bireysel avukatlardan büyük hukuk bürolarına kadar her ölçekteki hukuk profesyoneli için tasarlanmıştır. Tek başına çalışan avukatlar, 2-5 kişilik bürolar ve 10+ kişilik kurumsal hukuk departmanları için farklı plan seçenekleri sunuyoruz. Stajyer avukatlar ve sekreterler de yetki seviyelerine göre sisteme dahil edilebilir.',
      },
      {
        soru: 'Deneme süresi nasıl işliyor?',
        cevap: 'Kayıt olduğunuzda otomatik olarak 30 günlük ücretsiz deneme süresi başlar. Bu sürede tüm temel özelliklere erişebilirsiniz — kredi kartı bilgisi gerekmez. Deneme süresi sonunda isterseniz ücretli planlara geçebilir, istemezseniz hesabınız Başlangıç planına düşer ve sınırlı erişimle kullanmaya devam edebilirsiniz.',
      },
      {
        soru: 'Mevcut verilerimi aktarabilir miyim?',
        cevap: 'Evet, mevcut müvekkil ve dosya verilerinizi Excel veya CSV formatında sisteme toplu aktarabilirsiniz. Aktarım sihirbazımız sütun eşleştirmesini otomatik yapar. Ayrıca destek ekibimiz büyük veri aktarımlarında size yardımcı olur. Aktarım sırasında mevcut verilerinizde herhangi bir kayıp yaşanmaz.',
      },
    ],
  },
  {
    kategori: 'Veri Güvenliği & KVKK',
    sorular: [
      {
        soru: 'Verilerim nerede saklanıyor?',
        cevap: 'Tüm verileriniz Supabase altyapısında, AB (Avrupa Birliği) bölgesindeki veri merkezlerinde şifreli olarak saklanır. Veritabanı seviyesinde Row Level Security (RLS) politikaları uygulanır — bu sayede her büro yalnızca kendi verilerine erişebilir. Farklı büroların verileri kesinlikle birbirine karışmaz.',
      },
      {
        soru: 'KVKK\'ya uyumlu mu?',
        cevap: 'Evet, LexBase 6698 sayılı Kişisel Verilerin Korunması Kanunu\'na (KVKK) tam uyumlu olarak geliştirilmiştir. Kayıt aşamasında KVKK aydınlatma metni onayı alınır, kişisel veriler şifreli saklanır, veri saklama süreleri yasaya uygun belirlenir ve veri sahibi hakları (erişim, düzeltme, silme) sistem üzerinden kullanılabilir. Detaylar için KVKK Aydınlatma Metni sayfamıza göz atabilirsiniz.',
      },
      {
        soru: 'Yedekleme politikanız nedir?',
        cevap: 'Veritabanı günlük otomatik yedeklenir ve yedekler 30 gün boyunca saklanır. Kurumsal plandaki kullanıcılar için anlık (point-in-time) kurtarma desteği sunulmaktadır. Tüm yedekler şifreli olarak ayrı bir lokasyonda tutulur. Ayrıca istediğiniz zaman verilerinizi dışa aktarabilirsiniz.',
      },
      {
        soru: 'Şifreleme ve güvenlik önlemleriniz neler?',
        cevap: 'İletişimde TLS/SSL şifreleme, veritabanında AES-256 şifreleme, şifrelerde bcrypt hash algoritması kullanıyoruz. Kullanıcı oturumları JWT token ile yönetilir ve belirli süre sonra otomatik sonlanır. Supabase RLS (Row Level Security) ile her sorgu büro bazlı filtrelenir. Ayrıca IP loglama ve oturum takibi ile şüpheli erişim denemeleri izlenir.',
      },
    ],
  },
  {
    kategori: 'Özellikler & Entegrasyonlar',
    sorular: [
      {
        soru: 'UYAP entegrasyonu var mı?',
        cevap: 'Şu an için doğrudan UYAP API entegrasyonu bulunmamaktadır. Ancak dosya numarası, mahkeme bilgileri ve duruşma tarihlerini manuel olarak girdiğinizde sistem tüm takibi otomatik yapar. UYAP entegrasyonu yol haritamızda yer almaktadır ve gelecek güncellemelerde sunulması planlanmaktadır.',
      },
      {
        soru: 'Evrak ve belge oluşturma özelliği var mı?',
        cevap: 'Evet, Araç Kutusu modülümüzde vekâletname, ihtarname, dilekçe ve sözleşme gibi sık kullanılan hukuki belgeleri şablon üzerinden oluşturabilirsiniz. Müvekkil ve dosya bilgileri otomatik olarak belgeye aktarılır. Oluşturulan belgeler PDF formatında indirilebilir veya doğrudan yazdırılabilir.',
      },
      {
        soru: 'Offline (çevrimdışı) kullanılabilir mi?',
        cevap: 'LexBase tamamen bulut tabanlı bir platform olduğundan internet bağlantısı gerektirir. Bu tercih bilinçli olarak yapılmıştır: verileriniz her zaman güncel, güvende ve her cihazdan erişilebilir olsun. Mobil cihazlarda düşük bant genişliğinde bile sorunsuz çalışacak şekilde optimize edilmiştir.',
      },
    ],
  },
  {
    kategori: 'Fiyatlandırma & Ödeme',
    sorular: [
      {
        soru: 'Ücretsiz plan ne kadar süre kullanılabilir?',
        cevap: '30 günlük deneme süresi bitiminde Başlangıç planı sınırlı özelliklerle süresiz olarak kullanılmaya devam edilebilir. Başlangıç planında 25 müvekkil ve 30 dava limiti bulunur. Daha fazla müvekkil veya gelişmiş özellikler için ücretli planlara geçiş yapabilirsiniz.',
      },
      {
        soru: 'Planımı istediğim zaman değiştirebilir miyim?',
        cevap: 'Evet, dilediğiniz zaman üst plana geçiş yapabilirsiniz. Üst plana geçişte kalan gün sayınız oranlanarak yeni plana aktarılır. Alt plana geçiş ise mevcut fatura döneminin sonunda gerçekleşir. Plan değişikliği sırasında verilerinizde herhangi bir kayıp yaşanmaz.',
      },
      {
        soru: 'İptal etmek istersem ne olur?',
        cevap: 'İstediğiniz zaman aboneliğinizi iptal edebilirsiniz — herhangi bir ceza veya ek ücret yoktur. İptal ettiğinizde mevcut fatura dönemi sonuna kadar tüm özelliklere erişiminiz devam eder. Sonrasında hesabınız Başlangıç planına düşer. Verileriniz 90 gün boyunca saklanır ve bu sürede dışa aktarabilirsiniz.',
      },
      {
        soru: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?',
        cevap: 'Kredi kartı (Visa, Mastercard, Troy), banka kartı ve havale/EFT ile ödeme kabul ediyoruz. Yıllık planlarda %20\'ye varan indirim uygulanır. Faturalarınız her ay otomatik olarak oluşturulur ve e-posta adresinize gönderilir. Tüm ödemeler 256-bit SSL ile korunur.',
      },
    ],
  },
  {
    kategori: 'Mobil & Teknik',
    sorular: [
      {
        soru: 'Mobil uygulama var mı?',
        cevap: 'Evet, LexBase iOS ve Android platformlarında mobil uygulama olarak kullanılabilir. Mobil uygulama, web sürümündeki tüm temel özellikleri içerir ve tamamen responsive tasarıma sahiptir. App Store ve Google Play üzerinden indirilebilir. Aynı hesapla hem web hem mobilde sorunsuz geçiş yapabilirsiniz.',
      },
      {
        soru: 'Hangi tarayıcıları destekliyorsunuz?',
        cevap: 'LexBase tüm modern tarayıcılarda sorunsuz çalışır: Google Chrome, Mozilla Firefox, Safari, Microsoft Edge ve Opera. Optimum deneyim için tarayıcınızın güncel sürümünü kullanmanızı öneriyoruz. Internet Explorer desteklenmemektedir.',
      },
      {
        soru: 'Verilerimi dışa aktarabilir miyim?',
        cevap: 'Evet, tüm verilerinizi (müvekkiller, davalar, icra dosyaları, finansal veriler) Excel ve CSV formatında dışa aktarabilirsiniz. Finansal raporlar PDF olarak da indirilebilir. Veri taşınabilirliği KVKK kapsamında da güvence altındadır — verileriniz her zaman size aittir.',
      },
    ],
  },
  {
    kategori: 'Destek & Eğitim',
    sorular: [
      {
        soru: 'Teknik destek nasıl sağlanıyor?',
        cevap: 'Tüm planlarda e-posta desteği sunuyoruz. Profesyonel ve Büro planlarında öncelikli destek ile ortalama 4 saat içinde yanıt alırsınız. Kurumsal planda özel destek hattı ve telefon desteği mevcuttur. Ayrıca kapsamlı bir Yardım Merkezi ve video eğitim içerikleri tüm kullanıcılarımıza açıktır.',
      },
      {
        soru: 'Eğitim materyalleri var mı?',
        cevap: 'Evet, Yardım Merkezimizde adım adım kullanım kılavuzları, video eğitimler ve sık sorulan sorular bölümü bulunmaktadır. Yeni kullanıcılar için başlangıç rehberi, her modül için detaylı açıklamalar ve ipuçları mevcuttur. Büro ve Kurumsal plan kullanıcılarına canlı onboarding eğitimi de sunulmaktadır.',
      },
      {
        soru: 'Özelleştirme ve entegrasyon talepleri karşılanıyor mu?',
        cevap: 'Kurumsal plan kullanıcıları için özel entegrasyon ve geliştirme talepleri değerlendirilmektedir. Büyük hukuk büroları ve kurumsal hukuk departmanları için ihtiyaca özel çözümler sunabiliyoruz. Detaylı bilgi almak için İletişim sayfamızdan bizimle iletişime geçebilirsiniz.',
      },
    ],
  },
];

/* ── Fiyat Karşılaştırma Tablosu ── */
export interface KarsilastirmaSatir {
  ozellik: string;
  kategori: string;
  baslangic: boolean | string;
  profesyonel: boolean | string;
  buro: boolean | string;
  kurumsal: boolean | string;
}

export const KARSILASTIRMA_DATA: KarsilastirmaSatir[] = [
  // Müvekkil
  { kategori: 'Müvekkil Yönetimi', ozellik: 'Müvekkil Limiti', baslangic: '25', profesyonel: '150', buro: '500', kurumsal: 'Sınırsız' },
  { kategori: 'Müvekkil Yönetimi', ozellik: 'Gerçek & Tüzel Kişi Profili', baslangic: true, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Müvekkil Yönetimi', ozellik: 'TC / Vergi No Doğrulama', baslangic: true, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Müvekkil Yönetimi', ozellik: 'İletişim Geçmişi', baslangic: false, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Müvekkil Yönetimi', ozellik: 'Belge Arşivi', baslangic: false, profesyonel: true, buro: true, kurumsal: true },
  // Dava & İcra
  { kategori: 'Dava & İcra', ozellik: 'Dava Limiti', baslangic: '30', profesyonel: '200', buro: '750', kurumsal: 'Sınırsız' },
  { kategori: 'Dava & İcra', ozellik: 'İcra Dosya Limiti', baslangic: '15', profesyonel: '100', buro: '400', kurumsal: 'Sınırsız' },
  { kategori: 'Dava & İcra', ozellik: '50+ Mahkeme Türü', baslangic: true, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Dava & İcra', ozellik: '8 İcra Türü Desteği', baslangic: true, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Dava & İcra', ozellik: 'Harç & Masraf Takibi', baslangic: true, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Dava & İcra', ozellik: 'Arabuluculuk Modülü', baslangic: true, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Dava & İcra', ozellik: 'Danışmanlık Modülü', baslangic: false, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Dava & İcra', ozellik: 'İhtarname Modülü', baslangic: false, profesyonel: true, buro: true, kurumsal: true },
  // Finans
  { kategori: 'Finans & Raporlama', ozellik: 'Gelir / Gider Takibi', baslangic: false, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Finans & Raporlama', ozellik: 'Müvekkil Bazlı Kârlılık', baslangic: false, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Finans & Raporlama', ozellik: 'Kâr / Zarar Raporu', baslangic: false, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Finans & Raporlama', ozellik: 'Fatura & Makbuz', baslangic: false, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Finans & Raporlama', ozellik: 'Beklenen Gelir Tahmini', baslangic: false, profesyonel: false, buro: true, kurumsal: true },
  // Takvim & Görevler
  { kategori: 'Takvim & Görevler', ozellik: 'Takvim Görünümü', baslangic: true, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Takvim & Görevler', ozellik: 'Otomatik Duruşma Takvimi', baslangic: true, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Takvim & Görevler', ozellik: 'Görev Atama & Takip', baslangic: false, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Takvim & Görevler', ozellik: 'Kanban Görev Tahtası', baslangic: false, profesyonel: true, buro: true, kurumsal: true },
  // Ekip
  { kategori: 'Ekip & Yetki', ozellik: 'Personel Hesabı', baslangic: false, profesyonel: false, buro: '5 kişi', kurumsal: 'Sınırsız' },
  { kategori: 'Ekip & Yetki', ozellik: 'Rol Bazlı Yetki', baslangic: false, profesyonel: false, buro: true, kurumsal: true },
  { kategori: 'Ekip & Yetki', ozellik: 'Modül Bazlı Erişim', baslangic: false, profesyonel: false, buro: true, kurumsal: true },
  { kategori: 'Ekip & Yetki', ozellik: 'Aktivite Logları', baslangic: false, profesyonel: false, buro: true, kurumsal: true },
  // Araçlar & Destek
  { kategori: 'Araçlar & Destek', ozellik: 'Araç Kutusu (Evrak Üretici)', baslangic: false, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Araçlar & Destek', ozellik: 'Excel / CSV Dışa Aktarım', baslangic: true, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Araçlar & Destek', ozellik: 'Bulut Yedekleme', baslangic: false, profesyonel: false, buro: false, kurumsal: true },
  { kategori: 'Araçlar & Destek', ozellik: 'Özel Destek Hattı', baslangic: false, profesyonel: false, buro: false, kurumsal: true },
  { kategori: 'Araçlar & Destek', ozellik: 'Öncelikli Destek', baslangic: false, profesyonel: true, buro: true, kurumsal: true },
  { kategori: 'Araçlar & Destek', ozellik: 'Mobil Uygulama (iOS & Android)', baslangic: true, profesyonel: true, buro: true, kurumsal: true },
];
