/* ══════════════════════════════════════════════════════════════
   LexBase — Yasal & Bilgilendirme İçerikleri (JSX)
   Orijinal Vanilla JS login.js'teki fonksiyonların birebir
   React/JSX karşılığı. InfoModal içinde kullanılır.
   ══════════════════════════════════════════════════════════════ */

import { APP_VERSION, CHANGELOG } from './version';

// ── Ortak tablo stili ──
const TH = 'text-left px-3 py-2 text-[11px] font-semibold text-text-muted border-b border-border/50 bg-surface2/50';
const TD = 'px-3 py-2 text-[12px] text-text-muted border-b border-border/30';

/* ═══════════════════════════════════════════════
   1. KULLANIM KOŞULLARI
   ═══════════════════════════════════════════════ */
export function KullanimKosullari() {
  return (
    <>
      <p className="text-[11px] text-gold mb-4">Son güncelleme: 9 Mart 2026</p>
      <H3>1. Hizmet Tanımı</H3>
      <P>LexBase, avukatlar ve hukuk büroları için geliştirilmiş bulut tabanlı bir büro yönetim platformudur. Platform; dava/icra takibi, müvekkil yönetimi, takvim, finans takibi, doküman yönetimi ve danışmanlık modülleri sunar. Hizmet, <strong>lexbase.app</strong> alan adı üzerinden SaaS (Software as a Service) modeli ile sağlanmaktadır.</P>
      <H3>2. Taraflar</H3>
      <P>İşbu sözleşme; LexBase platformunu işleten <strong>EMD Yazılım</strong> (&ldquo;Hizmet Sağlayıcı&rdquo;) ile platforma kayıt olarak hizmeti kullanan gerçek veya tüzel kişi (&ldquo;Kullanıcı&rdquo;) arasında, kullanıcının kayıt işlemini tamamlaması ile birlikte yürürlüğe girer.</P>
      <H3>3. Hesap Yükümlülükleri</H3>
      <UL items={['Kullanıcı, kayıt sırasında doğru ve güncel bilgi vermekle yükümlüdür.','Hesap güvenliği kullanıcının sorumluluğundadır; şifrenin üçüncü kişilerle paylaşılmaması gerekir.','Her büro için tek sahip hesabı bulunur. Alt kullanıcılar sahip tarafından oluşturulur.','Hesap bilgilerinde değişiklik olduğunda kullanıcı bu bilgileri güncellemekle yükümlüdür.']} />
      <H3>4. Kullanım Kuralları</H3>
      <UL items={['Platform yalnızca yasal amaçlarla ve meslek etiğine uygun biçimde kullanılabilir.','Sisteme zararlı yazılım yüklenmesi, güvenlik açığı araştırılması veya başka kullanıcıların verilerine erişim girişiminde bulunulması yasaktır.','Kullanıcı, platforma yüklediği tüm verilerden (doğruluk, hukuka uygunluk vb.) bizzat sorumludur.','Otomatik veri çekme (scraping), ters mühendislik veya API\'nin izinsiz kullanımı yasaktır.']} />
      <H3>5. Fikri Mülkiyet</H3>
      <P>LexBase platformunun tasarımı, kaynak kodu, logosu, arayüzü ve tüm yazılımsal bileşenleri EMD Yazılım&apos;a aittir ve 5846 sayılı Fikir ve Sanat Eserleri Kanunu ile korunmaktadır.</P>
      <H3>6. Ücretlendirme ve Abonelik</H3>
      <UL items={['Platform, farklı plan seçenekleri (Deneme, Başlangıç, Profesyonel, Kurumsal) ile sunulur.','Deneme süresi sonunda ücretli plana geçiş yapılmaması halinde hesap kısıtlanır.','Fiyat değişiklikleri en az 30 gün önceden bildirilir; mevcut dönem etkilenmez.','İade politikası, ilgili plan koşullarında belirtilir.']} />
      <H3>7. Hizmet Seviyesi ve Kesintiler</H3>
      <P>LexBase, %99.5 erişilebilirlik hedeflemektedir. Planlı bakım çalışmaları önceden duyurulur. Mücbir sebepler nedeniyle oluşan kesintilerden Hizmet Sağlayıcı sorumlu tutulamaz.</P>
      <H3>8. Sorumluluk Sınırlandırması</H3>
      <P>LexBase bir büro yönetim aracıdır; hukuki danışmanlık hizmeti vermez. Hizmet Sağlayıcı&apos;nın toplam sorumluluğu, kullanıcının son 12 ayda ödediği ücret tutarıyla sınırlıdır.</P>
      <H3>9. Hesap Fesih ve Kapatma</H3>
      <UL items={['Kullanıcı, hesabını dilediği zaman kapatma talebinde bulunabilir.','Hizmet Sağlayıcı, kullanım koşullarını ihlal eden hesapları askıya alabilir veya kapatabilir.','Hesap kapanması halinde veriler 90 gün süreyle saklanır; bu süre sonunda kalıcı olarak silinir.']} />
      <H3>10. Uygulanacak Hukuk ve Yetki</H3>
      <P>İşbu sözleşme Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda <strong>İstanbul Mahkemeleri ve İcra Daireleri</strong> yetkilidir.</P>
      <H3>11. Değişiklikler</H3>
      <P>Hizmet Sağlayıcı, kullanım koşullarını güncelleme hakkını saklı tutar. Önemli değişiklikler e-posta ve/veya platform içi bildirim ile duyurulur.</P>
      <Contact>iletisim@lexbase.app</Contact>
    </>
  );
}


/* ═══════════════════════════════════════════════
   2. GİZLİLİK POLİTİKASI
   ═══════════════════════════════════════════════ */
export function GizlilikPolitikasi() {
  return (
    <>
      <p className="text-[11px] text-gold mb-4">Son güncelleme: 10 Mart 2026</p>
      <H3>1. Giriş</H3>
      <P>LexBase olarak kullanıcılarımızın gizliliğini en üst düzeyde korumayı taahhüt ediyoruz. Bu politika, hangi verilerin toplandığını, nasıl kullanıldığını, kimlerle paylaşıldığını ve haklarınızı açıklamaktadır.</P>
      <H3>2. Toplanan Veriler</H3>
      <table className="w-full text-left mb-4 border border-border/30 rounded-lg overflow-hidden">
        <thead><tr><th className={TH}>Veri Kategorisi</th><th className={TH}>Veri Türleri</th><th className={TH}>Toplama Yöntemi</th></tr></thead>
        <tbody>
          <tr><td className={TD}>Kimlik Bilgileri</td><td className={TD}>Ad, soyad, e-posta adresi</td><td className={TD}>Kayıt formu / Google OAuth</td></tr>
          <tr><td className={TD}>Hesap Bilgileri</td><td className={TD}>Büro adı, şifre (hashlenmiş), plan türü</td><td className={TD}>Kayıt ve kullanım</td></tr>
          <tr><td className={TD}>Kullanım Verileri</td><td className={TD}>Giriş/çıkış zamanları, kullanılan özellikler</td><td className={TD}>Otomatik loglama</td></tr>
          <tr><td className={TD}>Teknik Veriler</td><td className={TD}>IP adresi, tarayıcı türü, işletim sistemi</td><td className={TD}>Otomatik (sunucu)</td></tr>
          <tr><td className={TD}>Konum Verileri</td><td className={TD}>Ülke, şehir, bölge, ISP (IP tabanlı)</td><td className={TD}>Otomatik (Cloudflare geo)</td></tr>
          <tr><td className={TD}>İş Verileri</td><td className={TD}>Müvekkil, dava, icra, finans kayıtları</td><td className={TD}>Kullanıcı girişi</td></tr>
        </tbody>
      </table>
      <H3>3. Verilerin İşlenme Amaçları</H3>
      <UL items={['Hizmet sunumu: Platform özelliklerinin çalışması, kullanıcı oturumlarının yönetimi','Güvenlik: Yetkisiz erişim tespiti, hesap güvenliği, IP loglama','İyileştirme: Platform performansının analizi, hata tespiti ve düzeltme','Yasal yükümlülük: 5651 sayılı Kanun gereği trafik verisi saklama','İletişim: Hizmetle ilgili bildirimler, plan değişikliği duyuruları']} />
      <H3>4. Verilerin Paylaşımı ve Aktarımı</H3>
      <table className="w-full text-left mb-4 border border-border/30 rounded-lg overflow-hidden">
        <thead><tr><th className={TH}>Hizmet Sağlayıcı</th><th className={TH}>Amaç</th><th className={TH}>Konum</th></tr></thead>
        <tbody>
          <tr><td className={TD}>Supabase (AWS)</td><td className={TD}>Veritabanı, kimlik doğrulama</td><td className={TD}>ABD / AB</td></tr>
          <tr><td className={TD}>Cloudflare</td><td className={TD}>CDN, DDoS koruması, DNS</td><td className={TD}>Global</td></tr>
          <tr><td className={TD}>Google (OAuth 2.0)</td><td className={TD}>Sosyal giriş</td><td className={TD}>ABD</td></tr>
        </tbody>
      </table>
      <P>Verileriniz reklam veya pazarlama amacıyla üçüncü taraflarla <strong>asla</strong> paylaşılmaz.</P>
      <H3>5. Yurt Dışına Veri Aktarımı</H3>
      <P>Altyapı hizmetleri sebebiyle veriler ABD ve AB&apos;deki sunucularda işlenebilmektedir. Bu aktarım, KVKK md.9 kapsamında açık rıza ve/veya yeterli koruma koşullarına dayanmaktadır.</P>
      <H3>6. Saklama Süreleri</H3>
      <table className="w-full text-left mb-4 border border-border/30 rounded-lg overflow-hidden">
        <thead><tr><th className={TH}>Veri Türü</th><th className={TH}>Saklama Süresi</th></tr></thead>
        <tbody>
          <tr><td className={TD}>Hesap ve kimlik bilgileri</td><td className={TD}>Hesap aktif + 90 gün</td></tr>
          <tr><td className={TD}>IP ve oturum logları</td><td className={TD}>2 yıl (5651 s. Kanun)</td></tr>
          <tr><td className={TD}>Fatura ve ödeme kayıtları</td><td className={TD}>10 yıl (VUK gereği)</td></tr>
        </tbody>
      </table>
      <H3>7. Çerezler ve Yerel Depolama</H3>
      <P>LexBase, oturum yönetimi için tarayıcı yerel depolama (localStorage) kullanmaktadır. Üçüncü taraf izleme çerezleri kullanılmamaktadır.</P>
      <H3>8. Haklarınız</H3>
      <P>6698 sayılı KVKK kapsamındaki haklarınız için KVKK Aydınlatma Metni&apos;ni inceleyiniz. Talepleriniz için: <strong>guvenlik@lexbase.app</strong></P>
      <Contact>guvenlik@lexbase.app</Contact>
    </>
  );
}


/* ═══════════════════════════════════════════════
   3. KVKK AYDINLATMA METNİ
   ═══════════════════════════════════════════════ */
export function KvkkAydinlatma() {
  return (
    <>
      <p className="text-[11px] text-gold mb-4">Son güncelleme: 10 Mart 2026</p>
      <div className="bg-gold-dim border border-gold/30 rounded-[10px] p-3 text-[11px] text-gold-light mb-4">
        Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;nun (&ldquo;KVKK&rdquo;) 10. maddesi gereğince aydınlatma yükümlülüğü kapsamında hazırlanmıştır.
      </div>
      <H3>1. Veri Sorumlusu</H3>
      <P><strong>EMD Yazılım</strong> (&ldquo;Şirket&rdquo;) olarak, kişisel verilerinizi KVKK ve ilgili mevzuata uygun şekilde işlemekteyiz.</P>
      <H3>2. İşlenen Kişisel Veri Kategorileri</H3>
      <table className="w-full text-left mb-4 border border-border/30 rounded-lg overflow-hidden">
        <thead><tr><th className={TH}>Kategori</th><th className={TH}>Veri Türleri</th></tr></thead>
        <tbody>
          <tr><td className={TD}>Kimlik</td><td className={TD}>Ad, soyad, profil fotoğrafı</td></tr>
          <tr><td className={TD}>İletişim</td><td className={TD}>E-posta adresi</td></tr>
          <tr><td className={TD}>Müşteri İşlem</td><td className={TD}>Büro adı, plan bilgisi, ödeme geçmişi</td></tr>
          <tr><td className={TD}>İşlem Güvenliği</td><td className={TD}>IP adresi, oturum logları, giriş/çıkış zamanları</td></tr>
          <tr><td className={TD}>Konum</td><td className={TD}>IP tabanlı ülke, şehir, bölge, ISP bilgisi</td></tr>
        </tbody>
      </table>
      <H3>3. Kişisel Verilerin İşlenme Amaçları</H3>
      <UL items={['Üyelik ve hesap oluşturma işlemlerinin yürütülmesi','Platform hizmetlerinin sunulması ve iyileştirilmesi','Bilgi güvenliği süreçlerinin yürütülmesi','Yetkisiz işlem ve erişimlerin tespiti, önlenmesi','5651 sayılı Kanun kapsamında trafik verisi saklama yükümlülüğü','Yasal düzenlemelere uyum sağlanması','Fatura ve finansal kayıtların tutulması','Kullanıcı destek taleplerinin yanıtlanması']} />
      <H3>4. Hukuki Sebepler</H3>
      <UL items={['Sözleşmenin ifası (md.5/2-c): Platformun çalışması, hesap yönetimi','Hukuki yükümlülük (md.5/2-ç): 5651 s. Kanun, VUK','Meşru menfaat (md.5/2-f): Güvenlik logları, hizmet iyileştirme','Açık rıza (md.5/1): Yurt dışına veri aktarımı']} />
      <H3>5. Kişisel Verilerin Aktarımı</H3>
      <P><strong>Yurt içi:</strong> Yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına</P>
      <P><strong>Yurt dışı (KVKK md.9):</strong> Supabase Inc. (ABD/AB), Cloudflare Inc. (ABD/Global), Google LLC (ABD — OAuth)</P>
      <H3>6. Veri Saklama Süreleri</H3>
      <UL items={['Hesap verileri: Üyelik devam ettiği sürece + 90 gün','Trafik ve IP logları: 5651 s. Kanun gereği 2 yıl','Mali kayıtlar: VUK gereği 10 yıl']} />
      <H3>7. KVKK md.11 Kapsamındaki Haklarınız</H3>
      <UL items={['Kişisel verilerinizin işlenip işlenmediğini öğrenme','İşlenmişse buna ilişkin bilgi talep etme','İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme','Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme','Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme','KVKK md.7 kapsamında silinmesini veya yok edilmesini isteme','Kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme']} />
      <H3>8. Başvuru Yöntemi</H3>
      <P>Haklarınızı kullanmak için <strong>guvenlik@lexbase.app</strong> adresine kimliğinizi doğrulayıcı bilgilerle birlikte yazılı başvuruda bulunabilirsiniz. Başvurunuz en geç <strong>30 gün</strong> içinde ücretsiz olarak sonuçlandırılacaktır.</P>
      <Contact>guvenlik@lexbase.app</Contact>
    </>
  );
}


/* ═══════════════════════════════════════════════
   4. VERİ GÜVENLİĞİ
   ═══════════════════════════════════════════════ */
export function VeriGuvenligi() {
  return (
    <>
      <p className="text-[11px] text-gold mb-4">Son güncelleme: 9 Mart 2026</p>
      <H3>1. Genel Yaklaşım</H3>
      <P>LexBase, kullanıcı verilerinin güvenliğini sağlamak için endüstri standardı teknik ve idari tedbirler uygulamaktadır.</P>
      <H3>2. İletişim Güvenliği</H3>
      <UL items={['SSL/TLS şifreleme: Tüm veri iletişimi 256-bit SSL/TLS sertifikası ile şifrelenmektedir.','HSTS: HTTP Strict Transport Security politikası uygulanmaktadır.','Cloudflare DDoS koruması: Tüm trafik Cloudflare ağı üzerinden korunmaktadır.']} />
      <H3>3. Veritabanı Güvenliği</H3>
      <UL items={['Supabase altyapısı: Veritabanı, AWS altyapısında barındırılmaktadır.','Row Level Security (RLS): Her kullanıcı yalnızca kendi bürosuna ait verilere erişebilir.','Şifre güvenliği: Kullanıcı şifreleri bcrypt algoritması ile hashlenmiş olarak saklanır.','Otomatik yedekleme: Veritabanı günlük olarak yedeklenmektedir.']} />
      <H3>4. Uygulama Güvenliği</H3>
      <UL items={['Oturum yönetimi: JWT tabanlı token doğrulama kullanılmaktadır.','Girdi doğrulama: Tüm kullanıcı girdileri sanitize edilerek XSS ve SQL Injection koruması.','CORS politikası: API istekleri yalnızca yetkili alan adlarından kabul edilmektedir.','Content Security Policy: CSP başlıkları ile kaynak yükleme kısıtlamaları.']} />
      <H3>5. Erişim Kontrolü</H3>
      <UL items={['Rol tabanlı yetkilendirme: Sahip, yönetici ve personel rolleri.','IP loglama: Tüm giriş/çıkış işlemlerinde IP adresi, cihaz bilgisi kaydı.','Oturum takibi: Aktif oturumlar izlenmekte, şüpheli etkinlik tespiti.']} />
      <H3>6. Altyapı Güvenliği</H3>
      <table className="w-full text-left mb-4 border border-border/30 rounded-lg overflow-hidden">
        <thead><tr><th className={TH}>Katman</th><th className={TH}>Sağlayıcı</th><th className={TH}>Sertifikalar</th></tr></thead>
        <tbody>
          <tr><td className={TD}>Veritabanı</td><td className={TD}>Supabase (AWS)</td><td className={TD}>SOC 2 Type II, ISO 27001</td></tr>
          <tr><td className={TD}>CDN & Güvenlik</td><td className={TD}>Cloudflare</td><td className={TD}>SOC 2 Type II, ISO 27001, PCI DSS</td></tr>
          <tr><td className={TD}>Hosting</td><td className={TD}>Cloudflare Pages</td><td className={TD}>SOC 2 Type II</td></tr>
        </tbody>
      </table>
      <H3>7. Veri İhlali Bildirimi</H3>
      <UL items={['İhlal tespit edildikten sonra en kısa sürede etkilenen kullanıcılar bilgilendirilir.','KVKK md.12/5 gereği, Kişisel Verileri Koruma Kurulu\'na 72 saat içinde bildirim yapılır.','İhlalin kapsamı, etkilenen veri türleri ve alınan önlemler şeffaf biçimde paylaşılır.']} />
      <H3>8. Fiziksel Güvenlik</H3>
      <P>LexBase bulut tabanlı bir hizmettir. Sunucu altyapısının fiziksel güvenliği, hizmet sağlayıcıların veri merkezlerindeki endüstri standardı fiziksel güvenlik önlemleri ile sağlanmaktadır.</P>
      <H3>9. Güvenlik Güncellemeleri</H3>
      <P>Platform güvenlik yamaları düzenli olarak uygulanır. Kritik güvenlik açıkları tespit edildiğinde acil müdahale prosedürü işletilir.</P>
      <Contact>guvenlik@lexbase.app</Contact>
    </>
  );
}


/* ═══════════════════════════════════════════════
   5. HAKKIMIZDA
   ═══════════════════════════════════════════════ */
export function Hakkimizda() {
  return (
    <>
      <div className="text-center mb-6">
        <h3 className="font-[var(--font-playfair)] text-xl text-gold font-bold mb-2">Hukuku Dijitalleştiriyoruz</h3>
        <P>LexBase, avukatlar ve hukuk büroları için tasarlanmış Türkiye&apos;nin yeni nesil büro yönetim platformudur.</P>
      </div>
      <H3>Hikayemiz</H3>
      <P>LexBase, hukuk mesleğinin dijital dönüşümüne katkı sağlamak amacıyla <strong>EMD Yazılım</strong> tarafından geliştirilmiştir. Avukatların günlük iş yükünü hafifletmek, büro süreçlerini verimli hale getirmek ve hukuki takip işlerini kolaylaştırmak temel hedefimizdir.</P>
      <H3>Misyonumuz</H3>
      <P>Hukuk profesyonellerinin zamanını idari işlerden kurtararak asıl işlerine — hukuka — odaklanmalarını sağlamak.</P>
      <H3>Değerlerimiz</H3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { icon: '🔒', title: 'Güvenlik Öncelikli', desc: 'Avukat-müvekkil gizliliği kutsaldır.' },
          { icon: '🇹🇷', title: 'Türk Hukukuna Uyumlu', desc: 'Türkiye mevzuatına göre tasarlandı.' },
          { icon: '⚡', title: 'Sürekli Gelişim', desc: 'Her ay yeni özellikler yayınlanır.' },
          { icon: '🤝', title: 'Kullanıcı Odaklı', desc: 'Gerçek avukatların ihtiyaçlarını dinleriz.' },
        ].map((d) => (
          <div key={d.title} className="bg-surface2 rounded-[10px] p-3">
            <div className="text-lg mb-1">{d.icon}</div>
            <div className="text-[12px] font-semibold text-text mb-0.5">{d.title}</div>
            <div className="text-[11px] text-text-muted">{d.desc}</div>
          </div>
        ))}
      </div>
      <H3>Rakamlarla LexBase</H3>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { n: '15+', l: 'Modül' },
          { n: '7', l: 'Büyük Güncelleme' },
          { n: '%99.5', l: 'Uptime' },
          { n: '7/24', l: 'Cloud Erişim' },
        ].map((s) => (
          <div key={s.l} className="text-center bg-surface2 rounded-[10px] py-3">
            <div className="font-[var(--font-playfair)] text-lg text-gold font-bold">{s.n}</div>
            <div className="text-[10px] text-text-dim">{s.l}</div>
          </div>
        ))}
      </div>
      <Contact>iletisim@lexbase.app</Contact>
    </>
  );
}


/* ═══════════════════════════════════════════════
   6. SÜRÜM NOTLARI
   ═══════════════════════════════════════════════ */
export function SurumNotlari() {
  const versions = CHANGELOG.map((release) => ({
    ver: `v${release.version}`, tarih: release.date,
    guncel: release.version === APP_VERSION, items: release.changes,
  }));
  return (
    <>
      <P>LexBase sürekli gelişiyor. İşte son güncellemeler ve iyileştirmeler:</P>
      <div className="space-y-4">
        {versions.map((v) => (
          <div key={v.ver} className={`bg-surface2 rounded-[10px] p-4 ${v.guncel ? 'border border-gold/30' : 'border border-border/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {v.guncel && <span className="text-[9px] font-bold bg-gold text-bg px-2 py-0.5 rounded-full uppercase">Güncel</span>}
              <span className="text-[13px] font-bold text-text">{v.ver}</span>
              <span className="text-[11px] text-text-dim">{v.tarih}</span>
            </div>
            <ul className="space-y-1">
              {v.items.map((item, i) => (
                <li key={i} className="text-[11px] text-text-muted leading-relaxed">• {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}


/* ═══════════════════════════════════════════════
   7. İLETİŞİM
   ═══════════════════════════════════════════════ */
export function Iletisim() {
  return (
    <>
      <P>Sorularınız, önerileriniz veya destek talepleriniz için bize ulaşın.</P>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {[
          { icon: '📧', title: 'E-posta', desc: 'Genel sorular', link: 'info@lexbase.app' },
          { icon: '🛡️', title: 'Teknik Destek', desc: 'Platform sorunları', link: 'destek@lexbase.app' },
          { icon: '🤝', title: 'İş Birlikleri', desc: 'Baro ortaklıkları', link: 'satis@lexbase.app' },
          { icon: '🔒', title: 'KVKK & Güvenlik', desc: 'Veri talepleri', link: 'guvenlik@lexbase.app' },
        ].map((c) => (
          <div key={c.title} className="bg-surface2 rounded-[10px] p-3">
            <div className="text-lg mb-1">{c.icon}</div>
            <div className="text-[12px] font-semibold text-text">{c.title}</div>
            <div className="text-[10px] text-text-dim mb-1">{c.desc}</div>
            <div className="text-[11px] text-gold">{c.link}</div>
          </div>
        ))}
      </div>
      <H3>Yanıt Süreleri</H3>
      <table className="w-full text-left mb-4 border border-border/30 rounded-lg overflow-hidden">
        <thead><tr><th className={TH}>Kanal</th><th className={TH}>Yanıt Süresi</th></tr></thead>
        <tbody>
          <tr><td className={TD}>Genel sorular</td><td className={TD}>1 iş günü içinde</td></tr>
          <tr><td className={TD}>Teknik destek</td><td className={TD}>4 saat içinde</td></tr>
          <tr><td className={TD}>Kritik sorunlar</td><td className={TD}>1 saat içinde</td></tr>
          <tr><td className={TD}>İş birlikleri</td><td className={TD}>2 iş günü içinde</td></tr>
        </tbody>
      </table>
      <Contact>iletisim@lexbase.app</Contact>
    </>
  );
}


/* ═══════════════════════════════════════════════
   8. YARDIM MERKEZİ
   ═══════════════════════════════════════════════ */
export function YardimMerkezi() {
  return (
    <>
      <P>LexBase&apos;i en verimli şekilde kullanmanız için kapsamlı rehberler ve sıkça sorulan sorular.</P>
      <H3>🚀 Hızlı Başlangıç</H3>
      <div className="space-y-2 mb-5">
        {[
          { n: '1', t: 'Hesap Oluşturun', d: 'Kayıt formunu doldurun, e-posta doğrulamasını tamamlayın.' },
          { n: '2', t: 'Müvekkil Ekleyin', d: 'Sol menüden "Rehber" sekmesine giderek ilk müvekkilinizi oluşturun.' },
          { n: '3', t: 'Dosya Açın', d: 'Müvekkile bağlı dava, icra veya danışmanlık dosyası oluşturun.' },
          { n: '4', t: 'Finans Takibi', d: 'Ücret sözleşmesini tanımlayın, tahsilatları ve giderleri kaydedin.' },
        ].map((s) => (
          <div key={s.n} className="flex items-start gap-3 bg-surface2 rounded-[10px] px-3 py-2.5">
            <div className="w-6 h-6 bg-gold-dim rounded-full flex items-center justify-center text-gold font-bold text-[11px] flex-shrink-0 mt-0.5">{s.n}</div>
            <div>
              <div className="text-[12px] font-semibold text-text">{s.t}</div>
              <div className="text-[11px] text-text-muted">{s.d}</div>
            </div>
          </div>
        ))}
      </div>
      <H3>❓ Sıkça Sorulan Sorular</H3>
      <div className="space-y-1.5">
        {[
          { s: 'Verilerim güvende mi?', c: 'Evet. LexBase, SSL/TLS şifreleme, bcrypt şifre hashleme, Row Level Security ve Cloudflare DDoS koruması kullanmaktadır.' },
          { s: 'Mobil cihazdan kullanabilir miyim?', c: 'Evet. PWA teknolojisi ile telefonunuzun tarayıcısından uygulama gibi kullanabilirsiniz.' },
          { s: 'Deneme süresi ne kadar?', c: 'Tüm yeni kullanıcılara tüm özelliklerin açık olduğu ücretsiz deneme süresi sunulmaktadır.' },
          { s: 'Birden fazla avukat kullanabilir mi?', c: 'Profesyonel ve Kurumsal planlarda ekip desteği mevcuttur.' },
          { s: 'Verilerimi dışa aktarabilir miyim?', c: 'Evet. Müvekkil, dosya ve finans verilerinizi dışa aktarabilirsiniz.' },
          { s: 'UYAP entegrasyonu var mı?', c: 'UYAP entegrasyonu geliştirme aşamasındadır. Gelişmeler duyurulacaktır.' },
          { s: 'Plan değişikliği nasıl yapılır?', c: 'Ayarlar > Abonelik bölümünden planınızı yükseltebilir veya düşürebilirsiniz.' },
        ].map((item) => (
          <details key={item.s} className="bg-surface2 rounded-[10px] group">
            <summary className="px-3 py-2.5 text-[12px] font-medium text-text cursor-pointer hover:text-gold transition-colors list-none flex items-center justify-between">
              {item.s}
              <span className="text-text-dim group-open:rotate-180 transition-transform text-[10px]">▾</span>
            </summary>
            <div className="px-3 pb-2.5 text-[11px] text-text-muted leading-relaxed">{item.c}</div>
          </details>
        ))}
      </div>
      <Contact>destek@lexbase.app</Contact>
    </>
  );
}


/* ═══════════════════════════════════════════════
   9. ÇEREZ AYARLARI
   ═══════════════════════════════════════════════ */
export function CerezAyarlari() {
  return (
    <>
      <P>LexBase&apos;in kullandığı çerezler ve yerel depolama teknolojileri hakkında bilgi edinin.</P>
      <H3>Kullanılan Çerez ve Depolama Teknolojileri</H3>
      <table className="w-full text-left mb-4 border border-border/30 rounded-lg overflow-hidden">
        <thead><tr><th className={TH}>Teknoloji</th><th className={TH}>Adı</th><th className={TH}>Amacı</th><th className={TH}>Türü</th></tr></thead>
        <tbody>
          <tr><td className={TD}>localStorage</td><td className={TD}><code className="text-gold text-[10px]">hukuk_buro_v3</code></td><td className={TD}>Uygulama verileri</td><td className={TD}>🔴 Zorunlu</td></tr>
          <tr><td className={TD}>localStorage</td><td className={TD}><code className="text-gold text-[10px]">lb_consent</code></td><td className={TD}>Çerez tercihi</td><td className={TD}>🔴 Zorunlu</td></tr>
          <tr><td className={TD}>localStorage</td><td className={TD}><code className="text-gold text-[10px]">sb-*-auth-token</code></td><td className={TD}>Supabase oturum</td><td className={TD}>🔴 Zorunlu</td></tr>
          <tr><td className={TD}>Cookie</td><td className={TD}><code className="text-gold text-[10px]">__cf_bm</code></td><td className={TD}>Cloudflare bot koruması</td><td className={TD}>🔴 Zorunlu</td></tr>
          <tr><td className={TD}>Cookie</td><td className={TD}><code className="text-gold text-[10px]">__cfruid</code></td><td className={TD}>Cloudflare yük dengeleme</td><td className={TD}>🔴 Zorunlu</td></tr>
        </tbody>
      </table>
      <P>LexBase yalnızca zorunlu çerezler ve yerel depolama kullanmaktadır. Üçüncü taraf izleme çerezleri <strong>kullanılmamaktadır</strong>.</P>
      <Contact>guvenlik@lexbase.app</Contact>
    </>
  );
}


/* ═══════════════════════════════════════════════
   YARDIMCI BİLEŞENLER
   ═══════════════════════════════════════════════ */
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-semibold text-text mt-4 mb-2">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-text-muted leading-relaxed mb-3">{children}</p>;
}

function UL({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mb-3 ml-1">
      {items.map((item, i) => (
        <li key={i} className="text-[12px] text-text-muted leading-relaxed flex items-start gap-2">
          <span className="text-gold text-[10px] mt-1 flex-shrink-0">●</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Contact({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 pt-3 border-t border-border/30 text-[11px] text-text-dim">
      <strong className="text-text-muted">İletişim:</strong> {children}
    </div>
  );
}
