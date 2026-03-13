import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════
   Orijinal Vanilla JS landing page'in birebir Next.js karşılığı.
   Yapı: Topbar → Nav → Split Hero → Mockup → Sticky Scroll →
         Nasıl Çalışır → 4 Plan → CTA → 4-Sütun Footer
   ═══════════════════════════════════════════════════════════ */

const STICKY_FEATURES = [
  {
    num: '01',
    tag: 'En Onemli Modul',
    title: 'Tum muvekkilleriniz,\ntek bir merkezde.',
    desc: 'Gercek ve tuzel kisi profillerini eksiksiz tutun. TC kimlik, vergi no, MERSIS, IBAN ve iletisim bilgilerinden dava gecmisine, belgelerden WhatsApp yazismalarina kadar her sey elinizin altinda.',
    list: [
      'Gercek & tuzel kisi profilleri, tam bilgi yonetimi',
      'Bagli dava, icra ve arabuluculuk dosyalari',
      'Belge arsivi & WhatsApp entegrasyonu',
    ],
  },
  {
    num: '02',
    tag: 'Dava Yonetimi',
    title: 'Davalariniz ve her\nkurus, kontrol altinda.',
    desc: '50+ mahkeme turu, asama takibi ve durusma takviminin yani sira dava bazli finansal takip.',
    list: [
      '50+ mahkeme turu, karsi taraf & vekil yonetimi',
      'Dava harcamalari: harc, bilirkisi, tebligat takibi',
      'Hakedilen & anlasilan vekalet ucreti takibi',
    ],
  },
  {
    num: '03',
    tag: 'Icra Takibi',
    title: 'Icra dosyalarinizi\nkayipsiz yonetin.',
    desc: 'Ilamli, ilamsiz, kambiyo ve haciz takiplerinizi 8 farkli icra turu destegiyle yonetin.',
    list: [
      '8 icra turu: ilamli, ilamsiz, kambiyo, haciz...',
      'Icra dairesi, dosya no & asama takibi',
      'Alacak, tahsilat & kalan bakiye takibi',
    ],
  },
  {
    num: '04',
    tag: 'Arabuluculuk',
    title: 'Arabuluculuk surecleri\nduzenli ve izlenebilir.',
    desc: 'Zorunlu ve ihtiyari arabuluculuk dosyalarinizi ayri ayri takip edin.',
    list: [
      'Zorunlu & ihtiyari arabuluculuk ayrimi',
      'Arabulucu bilgileri, sicil no & toplanti takibi',
      'Anlasma tutari & arabuluculuk ucreti yonetimi',
    ],
  },
  {
    num: '05',
    tag: 'Personel & Ekip',
    title: 'Ekibinizi yonetin,\nyetkileri belirleyin.',
    desc: 'Avukat, stajyer ve sekreter icin farkli yetki seviyeleri tanimlayin.',
    list: [
      'Avukat, stajyer, sekreter rol ayrimi',
      'Modul bazli yetki & erisim kontrolu',
      'Gorev atamasi & aktivite loglari',
    ],
  },
  {
    num: '06',
    tag: 'Gorev Yonetimi',
    title: 'Yapilacaklar listeniz\noncelikli ve duzenli.',
    desc: 'Buro gorevlerini oncelik ve son tarihe gore listeleyin.',
    list: [
      'Acil / Normal oncelik renk kodlari',
      'Dava & muvekkil bazli gorev atama',
      'Son tarih hatirlaticilari & tamamlanma takibi',
    ],
  },
  {
    num: '07',
    tag: 'Uyari Sistemi',
    title: 'Hicbir kritik sure\ngozden kacmasin.',
    desc: 'Itiraz son gunleri, temyiz tarihleri, durusmalar ve icra sureleri — hepsi renk kodlu uyarilarla onunuzde.',
    list: [
      'Kirmizi / Sari / Yesil renk kodlu oncelik sistemi',
      'Dava, icra, gorev bazli sure takibi',
      'Dashboard entegre kritik uyari merkezi',
    ],
  },
  {
    num: '08',
    tag: 'Butce & Finans',
    title: 'Buronuzun mali tablosu\nanlik ve net.',
    desc: 'Gelir, gider, avans ve vekalet ucretlerini kategoriye gore takip edin.',
    list: [
      'Gelir & gider kategorileri, aylik/yillik rapor',
      'Muvekkil avans yonetimi & vekalet ucreti takibi',
      'Fatura & makbuz olusturma',
    ],
  },
];

const PLANLAR = [
  {
    icon: '🌱',
    ad: 'Baslangic',
    aciklama: 'Tanisma donemi',
    fiyat: 'Ucretsiz',
    periyot: '/ 30 gun',
    ozellikler: [
      { text: '25 Muvekkil', var: true },
      { text: '30 Dava, 15 Icra', var: true },
      { text: 'Arabuluculuk', var: true },
      { text: 'WhatsApp', var: false },
      { text: 'Finans & Fatura', var: false },
      { text: 'Personel hesabi', var: false },
    ],
    vurgu: false,
    btnText: 'Ucretsiz Basla',
  },
  {
    icon: '⚡',
    ad: 'Profesyonel',
    aciklama: 'Tek avukat icin ideal',
    fiyat: '₺399',
    periyot: '/ ay',
    ozellikler: [
      { text: '150 Muvekkil', var: true },
      { text: '200 Dava, 100 Icra', var: true },
      { text: 'WhatsApp', var: true },
      { text: 'Finans & Fatura', var: true },
      { text: 'Arac Kutusu', var: true },
      { text: 'Personel hesabi', var: false },
    ],
    vurgu: false,
    btnText: 'Plani Sec',
  },
  {
    icon: '🏛',
    ad: 'Buro',
    aciklama: '2-5 kisilik burolar',
    fiyat: '₺699',
    periyot: '/ ay',
    ozellikler: [
      { text: '500 Muvekkil', var: true },
      { text: '750 Dava, 400 Icra', var: true },
      { text: 'WhatsApp & Finans', var: true },
      { text: 'Arac Kutusu', var: true },
      { text: '5 Personel Hesabi', var: true },
      { text: 'Bulut Yedek', var: false },
    ],
    vurgu: true,
    btnText: 'Plani Sec',
  },
  {
    icon: '🏢',
    ad: 'Kurumsal',
    aciklama: 'Buyuk burolar icin',
    fiyat: '₺999',
    periyot: '/ ay',
    ozellikler: [
      { text: 'Sinirsiz Muvekkil', var: true },
      { text: 'Sinirsiz Dava & Icra', var: true },
      { text: 'Tum Ozellikler', var: true },
      { text: 'Sinirsiz Personel', var: true },
      { text: 'Bulut Yedekleme', var: true },
      { text: 'Ozel Destek Hatti', var: true },
    ],
    vurgu: false,
    btnText: 'Plani Sec',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-bg">
      {/* ─── Ust Iletisim Bandi ─── */}
      <div className="bg-surface border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-center gap-8 text-xs text-text-muted">
          <span>📧 info@lexbase.app</span>
          <span>📞 +90 (212) 000 00 00</span>
          <span className="hidden sm:inline">🕐 Pzt–Cum 09:00–18:00</span>
        </div>
      </div>

      {/* ─── Navbar ─── */}
      <nav className="border-b border-border/50 bg-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-[var(--font-playfair)] text-xl font-bold tracking-tight">
            <span className="text-gold">L</span><span className="text-text">ex</span><span className="text-gold">B</span><span className="text-text">ase</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#ozellikler" className="text-sm text-text-muted hover:text-text transition-colors">Ozellikler</a>
            <a href="#fiyatlar" className="text-sm text-text-muted hover:text-text transition-colors">Fiyatlar</a>
            <a href="#nasil" className="text-sm text-text-muted hover:text-text transition-colors">Nasil Calisir</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/giris" className="px-5 py-2 text-sm text-text-muted hover:text-text transition-colors font-medium border border-border rounded-lg hover:border-gold/50">
              Giris Yap
            </Link>
            <Link href="/kayit" className="px-5 py-2 bg-gold text-bg font-semibold rounded-lg text-sm hover:bg-gold-light transition-colors">
              Ucretsiz Basla
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero (Split Layout) ─── */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          {/* Sol: Metin */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold-dim border border-gold/20 rounded-full text-xs text-gold font-medium mb-6">
              <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
              Turkiye&apos;nin hukuk burolari icin tasarlandi
            </div>
            <h1 className="font-[var(--font-playfair)] text-4xl md:text-5xl lg:text-6xl text-text font-bold leading-tight mb-6">
              Hukuk Buronuzu<br />
              <em className="text-gold not-italic">Dijitale Tasiyin.</em>
            </h1>
            <p className="text-base md:text-lg text-text-muted mb-8 leading-relaxed max-w-lg">
              Muvekkil yonetiminden dava takibine, icra dosyalarindan finansal raporlara — tum is akislariniz tek platformda.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <Link href="/kayit" className="px-7 py-3.5 bg-[#0097A7] text-white font-bold rounded-lg text-sm hover:bg-[#00ACC1] transition-all shadow-lg">
                30 Gun Ucretsiz Dene →
              </Link>
              <a href="#ozellikler" className="px-7 py-3.5 border border-border text-text-muted font-semibold rounded-lg text-sm hover:border-gold hover:text-gold transition-colors">
                Ozellikleri Kesfet
              </a>
            </div>
            {/* Istatistikler */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { n: '12+', l: 'Modul' },
                { n: '100%', l: 'Veri Guvenligi' },
                { n: '30', l: 'Gun Ucretsiz' },
                { n: '4', l: 'Abonelik Plani' },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <div className="font-[var(--font-playfair)] text-xl md:text-2xl text-gold font-bold">{s.n}</div>
                  <div className="text-[11px] text-text-dim">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sag: Gorsel Placeholder */}
          <div className="relative hidden md:block">
            <div className="relative rounded-2xl overflow-hidden bg-surface border border-border">
              <div className="aspect-[4/3] bg-gradient-to-br from-gold/10 via-surface to-surface2 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 opacity-50">⚖️</div>
                  <div className="font-[var(--font-playfair)] text-2xl text-gold/50 font-bold">LexBase</div>
                  <div className="text-xs text-text-dim mt-1">Dashboard</div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-4 bg-gold/5 rounded-3xl blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* ─── Browser Mockup ─── */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-2xl shadow-black/30">
            {/* Tarayici Bar */}
            <div className="bg-surface2 px-4 py-3 flex items-center gap-3 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#e74c3c]/80" />
                <div className="w-3 h-3 rounded-full bg-[#f39c12]/80" />
                <div className="w-3 h-3 rounded-full bg-[#2ecc71]/80" />
              </div>
              <div className="flex-1 text-center text-[11px] text-text-dim/40">LexBase — Yonetim Paneli</div>
            </div>
            {/* Icerik */}
            <div className="flex min-h-[320px]">
              {/* Sidebar */}
              <div className="w-44 bg-[#0c0f14] border-r border-border/50 p-3 space-y-1 hidden sm:block">
                <div className="font-[var(--font-playfair)] text-sm text-gold font-bold mb-4 px-2">LexBase</div>
                {[
                  { icon: '📊', label: 'Anasayfa', active: true },
                  { icon: '👥', label: 'Muvekkillar', active: false },
                  { icon: '📁', label: 'Davalar', active: false },
                  { icon: '⚡', label: 'Icra Takip', active: false },
                  { icon: '💰', label: 'Butce', active: false },
                  { icon: '📅', label: 'Takvim', active: false },
                  { icon: '🧰', label: 'Arac Kutusu', active: false },
                  { icon: '📱', label: 'WhatsApp', active: false },
                  { icon: '🤝', label: 'Arabuluculuk', active: false },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] ${item.active ? 'bg-gold/15 text-gold font-semibold' : 'text-text-dim/60'}`}>
                    <span className="text-xs">{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>
              {/* Ana Icerik */}
              <div className="flex-1 p-5">
                <div className="text-sm font-semibold text-text mb-4">Genel Bakis</div>
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { v: '148', l: 'Aktif Dava', c: 'text-gold' },
                    { v: '₺284K', l: 'Bu Ay Gelir', c: 'text-[#2ecc71]' },
                    { v: '27', l: 'Muvekkil', c: 'text-text' },
                    { v: '5', l: 'Kritik Sure', c: 'text-[#e74c3c]' },
                  ].map((kpi) => (
                    <div key={kpi.l} className="bg-surface2 border border-border/50 rounded-lg p-3 text-center">
                      <div className={`font-[var(--font-playfair)] text-lg font-bold ${kpi.c}`}>{kpi.v}</div>
                      <div className="text-[9px] text-text-dim uppercase tracking-wider mt-0.5">{kpi.l}</div>
                    </div>
                  ))}
                </div>
                {/* Tablo */}
                <div className="space-y-0">
                  <div className="grid grid-cols-4 gap-3 text-[10px] text-text-dim uppercase tracking-wider px-3 py-2">
                    <span>Dosya No</span><span>Muvekkil</span><span>Durusma</span><span>Durum</span>
                  </div>
                  {[
                    { no: '2024/1247', ad: 'Kadir Yilmaz', tarih: '15.03.2026', durum: 'Aktif', renk: 'bg-[#2ecc71]/15 text-[#2ecc71]' },
                    { no: '2024/0934', ad: 'Altin Yapi A.S.', tarih: '22.03.2026', durum: 'Bekliyor', renk: 'bg-[#f39c12]/15 text-[#f39c12]' },
                    { no: '2023/2108', ad: 'Leyla Sonmez', tarih: '—', durum: 'Kapandi', renk: 'bg-[#e74c3c]/15 text-[#e74c3c]' },
                    { no: '2024/0512', ad: 'Berrak Su Ltd.', tarih: '01.04.2026', durum: 'Aktif', renk: 'bg-[#2ecc71]/15 text-[#2ecc71]' },
                  ].map((row) => (
                    <div key={row.no} className="grid grid-cols-4 gap-3 text-[11px] px-3 py-2 border-t border-border/30">
                      <span className="text-text-dim/50">{row.no}</span>
                      <span className="text-text/80">{row.ad}</span>
                      <span className="text-text/60">{row.tarih}</span>
                      <span><span className={`px-2 py-0.5 rounded text-[9px] font-bold ${row.renk}`}>{row.durum}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Sticky Scroll Features ─── */}
      <section id="ozellikler" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Baslik */}
          <div className="text-center mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-gold mb-3">Platform Ozellikleri</div>
            <h2 className="font-[var(--font-playfair)] text-3xl md:text-4xl text-text font-bold mb-3">
              Buronuzun ihtiyaci olan<br />her sey, tek platformda
            </h2>
            <p className="text-text-muted">8 guclu modul — gercek veri, gercek akis</p>
          </div>

          {/* Ozellik Listesi */}
          <div className="space-y-24 md:space-y-32">
            {STICKY_FEATURES.map((feat, i) => (
              <div key={feat.num} className={`grid md:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? 'md:[direction:rtl]' : ''}`}>
                <div className={i % 2 === 1 ? 'md:[direction:ltr]' : ''}>
                  <div className="text-5xl font-[var(--font-playfair)] text-gold/20 font-bold mb-2">{feat.num}</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gold mb-3">{feat.tag}</div>
                  <h3 className="font-[var(--font-playfair)] text-2xl md:text-3xl text-text font-bold mb-4 leading-tight whitespace-pre-line">{feat.title}</h3>
                  <p className="text-sm text-text-muted mb-5 leading-relaxed">{feat.desc}</p>
                  <ul className="space-y-2">
                    {feat.list.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-text-muted">
                        <span className="text-gold font-bold mt-0.5">✔</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Gorsel Placeholder */}
                <div className={`bg-surface border border-border rounded-xl p-8 min-h-[250px] flex items-center justify-center ${i % 2 === 1 ? 'md:[direction:ltr]' : ''}`}>
                  <div className="text-center opacity-40">
                    <div className="text-4xl mb-2">{['👥', '📁', '⚡', '🤝', '👥', '✅', '🚨', '💰'][i]}</div>
                    <div className="text-xs text-text-dim">{feat.tag}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Nasil Calisir ─── */}
      <section id="nasil" className="py-20 bg-surface/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-gold mb-3">Nasil Calisir</div>
            <h2 className="font-[var(--font-playfair)] text-3xl text-text font-bold">Dakikalar icinde hazir olun</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { n: '1', t: 'Kaydolun', d: '30 saniyelik kayit formuyla buronuzu olusturun. Kart bilgisi gerekmez.' },
              { n: '2', t: 'Muvekkilleri Ekleyin', d: 'Gercek veya tuzel kisi profillerini hizlica girin.' },
              { n: '3', t: 'Davalari Acin', d: 'Her muvekkil icin dava ve icra dosyalari olusturun. Takvim otomatik guncellenir.' },
              { n: '4', t: 'Buronuzu Yonetin', d: 'Dashboard\'dan tum is akislarinizi izleyin. Raporlarla karar alin.' },
            ].map((step) => (
              <div key={step.n} className="bg-surface border border-border rounded-xl p-6 text-center">
                <div className="w-10 h-10 bg-gold-dim rounded-full flex items-center justify-center text-gold font-bold text-lg mx-auto mb-4">{step.n}</div>
                <h4 className="text-sm font-semibold text-text mb-2">{step.t}</h4>
                <p className="text-xs text-text-muted leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Fiyatlandirma (4 Plan) ─── */}
      <section id="fiyatlar" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-gold mb-3">Fiyatlandirma</div>
            <h2 className="font-[var(--font-playfair)] text-3xl text-text font-bold mb-3">Her buro icin dogru plan</h2>
            <p className="text-text-muted">30 gun ucretsiz deneyin, begenirseniz devam edin</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANLAR.map((plan) => (
              <div
                key={plan.ad}
                className={`rounded-xl p-6 flex flex-col relative transition-all ${
                  plan.vurgu
                    ? 'bg-gold-dim border-2 border-gold shadow-lg shadow-gold/10'
                    : 'bg-surface border border-border hover:border-gold/30'
                }`}
              >
                {plan.vurgu && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold text-bg text-[10px] font-bold rounded-full uppercase tracking-wider whitespace-nowrap">
                    EN POPULER
                  </div>
                )}
                <div className="text-2xl mb-2">{plan.icon}</div>
                <h3 className="text-base font-bold text-text">{plan.ad}</h3>
                <p className="text-xs text-text-dim mb-3">{plan.aciklama}</p>
                <div className="mb-4">
                  <span className="font-[var(--font-playfair)] text-2xl text-gold font-bold">{plan.fiyat}</span>
                  <span className="text-xs text-text-dim ml-1">{plan.periyot}</span>
                </div>
                <div className="border-t border-border/50 pt-4 space-y-2.5 flex-1 mb-5">
                  {plan.ozellikler.map((oz) => (
                    <div key={oz.text} className="flex items-center gap-2 text-xs">
                      <span className={oz.var ? 'text-gold' : 'text-text-dim/40'}>
                        {oz.var ? '✓' : '✗'}
                      </span>
                      <span className={oz.var ? 'text-text-muted' : 'text-text-dim/40'}>{oz.text}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/kayit"
                  className={`w-full py-3 rounded-lg text-sm font-semibold text-center transition-colors block ${
                    plan.vurgu
                      ? 'bg-gold text-bg hover:bg-gold-light'
                      : 'bg-surface2 text-text hover:bg-gold-dim hover:text-gold border border-border/50'
                  }`}
                >
                  {plan.btnText}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center relative">
          <div className="absolute inset-0 bg-gold/5 rounded-3xl blur-3xl -z-10" />
          <div className="text-xs font-bold uppercase tracking-widest text-gold mb-4">Hemen Baslayin</div>
          <h2 className="font-[var(--font-playfair)] text-3xl md:text-4xl text-text font-bold mb-4 leading-tight">
            Buronuzu bugun<br /><span className="text-gold">dijitale tasiyin</span>
          </h2>
          <p className="text-text-dim mb-10">30 gun ucretsiz — kart bilgisi gerekmez — istediginizde iptal edin</p>
          <Link href="/kayit" className="inline-block px-12 py-4 bg-[#0097A7] text-white font-bold rounded-lg text-base hover:bg-[#00ACC1] transition-all shadow-lg">
            Hemen Basla — Ucretsiz →
          </Link>
        </div>
      </section>

      {/* ─── Footer (4 Sutun) ─── */}
      <footer className="border-t border-border py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Marka */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gold-dim border border-gold/20 rounded-lg flex items-center justify-center">
                  <span className="font-[var(--font-playfair)] text-sm text-gold font-bold">L</span>
                </div>
                <span className="font-[var(--font-playfair)] text-lg text-text font-bold">LexBase</span>
              </div>
              <p className="text-sm text-text-dim leading-relaxed mb-4">
                Hukuk Buronuzu<br />Dijitale Tasiyin.
              </p>
              <div className="flex items-center gap-3">
                <a href="#" className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-dim hover:text-gold hover:border-gold/50 transition-colors text-sm" title="LinkedIn">in</a>
                <a href="#" className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-dim hover:text-gold hover:border-gold/50 transition-colors text-sm" title="X">X</a>
                <a href="#" className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-dim hover:text-gold hover:border-gold/50 transition-colors text-sm" title="Instagram">ig</a>
              </div>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2.5">
                <li><a href="#ozellikler" className="text-sm text-text-muted hover:text-gold transition-colors">Ozellikler</a></li>
                <li><a href="#fiyatlar" className="text-sm text-text-muted hover:text-gold transition-colors">Fiyatlandirma</a></li>
                <li><span className="text-sm text-text-muted hover:text-gold cursor-pointer transition-colors">Avukat Arac Kutusu</span></li>
                <li><span className="text-sm text-text-muted hover:text-gold cursor-pointer transition-colors">Surum Notlari</span></li>
              </ul>
            </div>

            {/* Kurumsal */}
            <div>
              <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-4">LexBase</h4>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-text-muted hover:text-gold cursor-pointer transition-colors">Hakkimizda</span></li>
                <li><span className="text-sm text-text-muted hover:text-gold cursor-pointer transition-colors">Blog</span></li>
                <li><span className="text-sm text-text-muted hover:text-gold cursor-pointer transition-colors">Iletisim</span></li>
                <li><span className="text-sm text-text-muted hover:text-gold cursor-pointer transition-colors">Yardim Merkezi</span></li>
              </ul>
            </div>

            {/* Yasal */}
            <div>
              <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-4">Yasal</h4>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-text-muted hover:text-gold cursor-pointer transition-colors">Kullanim Kosullari</span></li>
                <li><span className="text-sm text-text-muted hover:text-gold cursor-pointer transition-colors">Gizlilik Politikasi</span></li>
                <li><span className="text-sm text-text-muted hover:text-gold cursor-pointer transition-colors">KVKK Aydinlatma Metni</span></li>
                <li><span className="text-sm text-text-muted hover:text-gold cursor-pointer transition-colors">Veri Guvenligi</span></li>
                <li><span className="text-sm text-text-muted hover:text-gold cursor-pointer transition-colors">Cerez Ayarlari</span></li>
              </ul>
            </div>
          </div>

          {/* Alt Telif */}
          <div className="border-t border-border pt-6 flex items-center justify-between text-[11px] text-text-dim">
            <span>© 2026 LexBase. Tum haklari saklidir.</span>
            <span>Turkiye&apos;de Gelistirilmistir 🇹🇷</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
