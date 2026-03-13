import Link from 'next/link';

const OZELLIKLER = [
  {
    icon: '👥',
    baslik: 'Müvekkil Yönetimi',
    aciklama: 'Müvekkil bilgileri, dosya geçmişi, finansal bakiye ve iletişim bilgilerini tek ekranda yönetin.',
  },
  {
    icon: '⚖️',
    baslik: 'Dava Takibi',
    aciklama: 'Dava dosyalarını, duruşma tarihlerini, evrakları ve harcamaları detaylı takip edin.',
  },
  {
    icon: '📋',
    baslik: 'İcra Dosyaları',
    aciklama: 'İcra takiplerini, tahsilat oranlarını ve borçlu bilgilerini anlık izleyin.',
  },
  {
    icon: '💰',
    baslik: 'Finansal Yönetim',
    aciklama: 'Kâr-zarar analizi, müvekkil bakiyeleri, beklenen gelir ve dosya kârlılığı raporları.',
  },
  {
    icon: '📅',
    baslik: 'Takvim & Görevler',
    aciklama: 'Duruşma takvimi, kritik tarihler, görev atamaları ve hatırlatmalar.',
  },
  {
    icon: '📄',
    baslik: 'Evrak Üretici',
    aciklama: 'Dilekçe, ihtarname, sözleşme ve makbuz şablonlarından otomatik evrak oluşturun.',
  },
];

const PLANLAR = [
  {
    ad: 'Başlangıç',
    fiyat: '₺499',
    periyot: '/ay',
    ozellikler: ['50 Müvekkil', '100 Dosya', '1 Kullanıcı', 'Temel Raporlar', 'E-posta Destek'],
    vurgu: false,
  },
  {
    ad: 'Profesyonel',
    fiyat: '₺999',
    periyot: '/ay',
    ozellikler: ['Sınırsız Müvekkil', 'Sınırsız Dosya', '5 Kullanıcı', 'Gelişmiş Raporlar', 'Evrak Üretici', 'Öncelikli Destek'],
    vurgu: true,
  },
  {
    ad: 'Kurumsal',
    fiyat: '₺1.999',
    periyot: '/ay',
    ozellikler: ['Sınırsız Her Şey', 'Sınırsız Kullanıcı', 'API Erişimi', 'Özel Entegrasyon', 'Dedicated Destek', 'SLA Garantisi'],
    vurgu: false,
  },
];

const ISTATISTIKLER = [
  { rakam: '2.500+', etiket: 'Aktif Avukat' },
  { rakam: '150.000+', etiket: 'Yönetilen Dosya' },
  { rakam: '%99.9', etiket: 'Uptime' },
  { rakam: '7/24', etiket: 'Destek' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-bg">
      {/* ─── Navbar ─── */}
      <nav className="border-b border-border/50 bg-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-[var(--font-playfair)] text-xl text-gold font-bold tracking-tight">
            LexBase
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/giris"
              className="px-5 py-2 text-sm text-text-muted hover:text-text transition-colors font-medium"
            >
              Giriş Yap
            </Link>
            <Link
              href="/kayit"
              className="px-5 py-2 bg-gold text-bg font-semibold rounded-lg text-sm hover:bg-gold-light transition-colors"
            >
              Ücretsiz Dene
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        {/* Arka plan dekorasyon */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gold/3 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold-dim border border-gold/20 rounded-full text-xs text-gold font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse" />
            Türkiye&apos;nin Hukuk Teknolojisi Platformu
          </div>

          <h1 className="font-[var(--font-playfair)] text-5xl md:text-6xl text-text font-bold leading-tight mb-6 max-w-3xl mx-auto">
            Hukuk Büronuzu
            <span className="text-gold"> Dijital</span> Çağa
            <br />Taşıyın
          </h1>

          <p className="text-lg text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Müvekkil yönetimi, dava takibi, icra dosyaları, finansal raporlar ve evrak üretimi —
            tümü tek platformda. Avukatlar tarafından, avukatlar için tasarlandı.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <Link
              href="/kayit"
              className="px-8 py-3.5 bg-gold text-bg font-bold rounded-lg text-sm hover:bg-gold-light transition-all shadow-lg shadow-gold/20 hover:shadow-gold/30"
            >
              14 Gün Ücretsiz Dene
            </Link>
            <Link
              href="#ozellikler"
              className="px-8 py-3.5 border border-border text-text-muted font-semibold rounded-lg text-sm hover:border-gold hover:text-gold transition-colors"
            >
              Özellikleri Keşfet
            </Link>
          </div>

          {/* Dashboard mockup */}
          <div className="max-w-4xl mx-auto relative">
            <div className="bg-surface border border-border rounded-xl p-1 shadow-2xl shadow-black/40">
              <div className="bg-surface2 rounded-lg p-6">
                {/* Fake dashboard header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red/60" />
                  <div className="w-3 h-3 rounded-full bg-gold/60" />
                  <div className="w-3 h-3 rounded-full bg-green/60" />
                  <div className="flex-1 bg-surface rounded h-6 max-w-xs mx-auto" />
                </div>
                {/* Fake KPI strip */}
                <div className="grid grid-cols-5 gap-3 mb-4">
                  {[
                    { label: 'Müvekkil', value: '128' },
                    { label: 'Dava', value: '64' },
                    { label: 'İcra', value: '37' },
                    { label: 'Duruşma', value: '12' },
                    { label: 'Gelir', value: '₺247K' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-surface border border-border/50 rounded-lg p-3 text-center">
                      <div className="text-[9px] text-text-dim uppercase tracking-wider mb-1">{kpi.label}</div>
                      <div className="font-[var(--font-playfair)] text-lg text-gold font-bold">{kpi.value}</div>
                    </div>
                  ))}
                </div>
                {/* Fake table rows */}
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-surface border border-border/30 rounded-lg h-10 flex items-center px-4 gap-4">
                      <div className="w-16 h-2 bg-gold/30 rounded" />
                      <div className="w-32 h-2 bg-border rounded" />
                      <div className="w-24 h-2 bg-border rounded" />
                      <div className="flex-1" />
                      <div className="w-16 h-5 bg-green-dim rounded text-[8px] text-green flex items-center justify-center font-bold">Aktif</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gold/5 rounded-2xl blur-2xl -z-10" />
          </div>
        </div>
      </section>

      {/* ─── İstatistikler ─── */}
      <section className="border-y border-border bg-surface/50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-4 gap-8">
            {ISTATISTIKLER.map((s) => (
              <div key={s.etiket} className="text-center">
                <div className="font-[var(--font-playfair)] text-3xl text-gold font-bold mb-1">{s.rakam}</div>
                <div className="text-sm text-text-muted">{s.etiket}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Özellikler ─── */}
      <section id="ozellikler" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-[var(--font-playfair)] text-3xl text-text font-bold mb-4">
              Büronuz İçin İhtiyacınız Olan Her Şey
            </h2>
            <p className="text-text-muted max-w-lg mx-auto">
              Dosya yönetiminden finansal raporlamaya, takvimden evrak üretimine kadar
              tüm süreçlerinizi dijitalleştirin.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {OZELLIKLER.map((oz) => (
              <div
                key={oz.baslik}
                className="bg-surface border border-border rounded-xl p-6 hover:border-gold/40 transition-all group"
              >
                <div className="w-12 h-12 bg-gold-dim rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  {oz.icon}
                </div>
                <h3 className="text-base font-semibold text-text mb-2">{oz.baslik}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{oz.aciklama}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Neden LexBase ─── */}
      <section className="py-24 bg-surface/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-[var(--font-playfair)] text-3xl text-text font-bold mb-6">
                Neden <span className="text-gold">LexBase</span>?
              </h2>
              <div className="space-y-5">
                {[
                  { baslik: 'Güvenlik Öncelikli', aciklama: 'KVKK uyumlu, uçtan uca şifreleme, Türkiye merkezli sunucular. Verileriniz her zaman güvende.', icon: '🔒' },
                  { baslik: 'Kolay Kullanım', aciklama: 'Avukatlar tarafından tasarlandı. Karmaşık menüler yok, öğrenme süresi minimum.', icon: '✨' },
                  { baslik: 'Mobil Erişim', aciklama: 'iOS ve Android uygulamalarıyla duruşmada, adliyede veya yolda her yerden erişin.', icon: '📱' },
                  { baslik: 'Hızlı Destek', aciklama: 'Avukat olan destek ekibimiz hukuki süreçleri anlıyor. Teknik dil bariyeri yok.', icon: '💬' },
                ].map((item) => (
                  <div key={item.baslik} className="flex gap-4">
                    <div className="w-10 h-10 bg-gold-dim rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text mb-1">{item.baslik}</h4>
                      <p className="text-sm text-text-muted leading-relaxed">{item.aciklama}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sağ taraf — güvenlik görseli */}
            <div className="bg-surface border border-border rounded-xl p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-dim border border-green/20 rounded-lg">
                  <span className="text-lg">🔒</span>
                  <div>
                    <div className="text-xs font-bold text-green">SSL/TLS Şifreleme</div>
                    <div className="text-[11px] text-text-muted">256-bit AES şifreleme aktif</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-dim border border-green/20 rounded-lg">
                  <span className="text-lg">🛡️</span>
                  <div>
                    <div className="text-xs font-bold text-green">KVKK Uyumlu</div>
                    <div className="text-[11px] text-text-muted">Kişisel veri koruma mevzuatı</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-dim border border-green/20 rounded-lg">
                  <span className="text-lg">🇹🇷</span>
                  <div>
                    <div className="text-xs font-bold text-green">Türkiye Lokasyonu</div>
                    <div className="text-[11px] text-text-muted">Veriler yurt içinde saklanır</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gold-dim border border-gold/20 rounded-lg">
                  <span className="text-lg">📊</span>
                  <div>
                    <div className="text-xs font-bold text-gold">%99.9 Uptime SLA</div>
                    <div className="text-[11px] text-text-muted">Kesintisiz hizmet garantisi</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-surface2 border border-border rounded-lg">
                  <span className="text-lg">🔄</span>
                  <div>
                    <div className="text-xs font-bold text-text">Otomatik Yedekleme</div>
                    <div className="text-[11px] text-text-muted">Günlük yedekleme, 30 gün geçmiş</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Fiyatlandırma ─── */}
      <section id="fiyat" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-[var(--font-playfair)] text-3xl text-text font-bold mb-4">
              Büronuza Uygun Planı Seçin
            </h2>
            <p className="text-text-muted">14 gün ücretsiz deneme. Kredi kartı gerekmez.</p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {PLANLAR.map((plan) => (
              <div
                key={plan.ad}
                className={`rounded-xl p-6 flex flex-col ${
                  plan.vurgu
                    ? 'bg-gold-dim border-2 border-gold relative'
                    : 'bg-surface border border-border'
                }`}
              >
                {plan.vurgu && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold text-bg text-[10px] font-bold rounded-full uppercase tracking-wider">
                    En Popüler
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-text mb-2">{plan.ad}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="font-[var(--font-playfair)] text-3xl text-gold font-bold">{plan.fiyat}</span>
                    <span className="text-sm text-text-dim">{plan.periyot}</span>
                  </div>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.ozellikler.map((oz) => (
                    <li key={oz} className="flex items-center gap-2 text-sm text-text-muted">
                      <span className="text-green text-xs">✓</span>
                      {oz}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/kayit"
                  className={`w-full py-3 rounded-lg text-sm font-semibold text-center transition-colors ${
                    plan.vurgu
                      ? 'bg-gold text-bg hover:bg-gold-light'
                      : 'bg-surface2 text-text hover:bg-gold-dim hover:text-gold border border-border'
                  }`}
                >
                  Ücretsiz Dene
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 bg-surface/30 border-t border-border">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-[var(--font-playfair)] text-3xl text-text font-bold mb-4">
            Büronuzu Dijitalleştirmeye Bugün Başlayın
          </h2>
          <p className="text-text-muted mb-8 max-w-lg mx-auto">
            14 gün boyunca tüm özellikleri ücretsiz deneyin.
            Kurulum gerektirmez, hemen başlayın.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/kayit"
              className="px-10 py-4 bg-gold text-bg font-bold rounded-lg text-sm hover:bg-gold-light transition-all shadow-lg shadow-gold/20"
            >
              Ücretsiz Hesap Oluştur
            </Link>
            <Link
              href="/giris"
              className="px-10 py-4 border border-border text-text-muted font-semibold rounded-lg text-sm hover:border-gold hover:text-gold transition-colors"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-4 gap-8 mb-8">
            {/* Marka */}
            <div>
              <div className="font-[var(--font-playfair)] text-lg text-gold font-bold mb-3">LexBase</div>
              <p className="text-xs text-text-dim leading-relaxed">
                Hukuk bürolarının dijital dönüşüm ortağı.
                Avukatlar tarafından, avukatlar için.
              </p>
            </div>

            {/* Ürün */}
            <div>
              <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3">Ürün</h4>
              <ul className="space-y-2">
                {['Özellikler', 'Fiyatlandırma', 'Mobil Uygulama', 'Güncellemeler'].map((item) => (
                  <li key={item}>
                    <span className="text-xs text-text-muted hover:text-gold cursor-pointer transition-colors">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Şirket */}
            <div>
              <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3">Şirket</h4>
              <ul className="space-y-2">
                {['Hakkımızda', 'Blog', 'İletişim', 'Kariyer'].map((item) => (
                  <li key={item}>
                    <span className="text-xs text-text-muted hover:text-gold cursor-pointer transition-colors">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Yasal */}
            <div>
              <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-3">Yasal</h4>
              <ul className="space-y-2">
                {['Kullanım Koşulları', 'Gizlilik Politikası', 'KVKK Aydınlatma', 'Çerez Politikası'].map((item) => (
                  <li key={item}>
                    <span className="text-xs text-text-muted hover:text-gold cursor-pointer transition-colors">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex items-center justify-between">
            <div className="text-[11px] text-text-dim">
              © 2026 LexBase. Tüm hakları saklıdır.
            </div>
            <div className="text-[11px] text-text-dim">
              EMD Hukuk &amp; Teknoloji
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
