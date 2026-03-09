// ================================================================
// EMD HUKUK — LANDING PAGE VE LOGIN
// js/modules/login.js
// ================================================================

function lpInit() {
  // Önce landing'i göster (flash önleme)
  const landingEl = document.getElementById('landing-screen');
  if (landingEl) landingEl.classList.remove('hidden');

  // Daha önce giriş yapılmışsa direkt uygulamayı aç
  const saved = localStorage.getItem('hukuk_buro_v3');
  if (saved) {
    try {
      const p = JSON.parse(saved);
      if (p.sahipEmail && p.sahipSifre) {
        // Landing'i gizle, uygulamayı başlat
        if (landingEl) landingEl.classList.add('hidden');
        currentUser = { id: p.sahipId||'sahip', ad_soyad: p.sahipAd||'Büro Sahibi', email: p.sahipEmail, rol: 'sahip', yetkiler: {}, buro_ad: p.buroAd||'Hukuk Bürosu', _giris_sayisi: (p._giris_sayisi||0) };
        Object.assign(state, p);
        init();
        uygulamayiBaslatLocal();
        return;
      }
    } catch(e) { console.error('[LexBase] Başlatma hatası:', e); }
  }
  // Giriş yoksa landing'i göster ve init yap
  try { init(); } catch(e) { console.warn('[LexBase] init() hatası (landing modunda normal):', e.message); }
  // Landing scroll efekti
  const nav = document.getElementById('lp-nav');
  const topbar = document.querySelector('.lp-topbar');
  if (nav) {
    document.getElementById('landing-screen').addEventListener('scroll', function() {
      const scrolled = this.scrollTop > 40;
      nav.classList.toggle('scrolled', scrolled);
      if (topbar) topbar.classList.toggle('hide', scrolled);
    });
  }
  // Scroll reveal
  lpRevealInit();
}

function lpRevealInit() {
  const els = document.querySelectorAll('.reveal');
  const container = document.getElementById('landing-screen');
  if (!container) return;
  const check = () => {
    const ch = container.clientHeight;
    els.forEach(el => {
      const rect = el.getBoundingClientRect();
      const top = rect.top - container.getBoundingClientRect().top;
      if (top < ch * 0.88) el.classList.add('visible');
    });
  };
  container.addEventListener('scroll', check);
  setTimeout(check, 100);
}

function lpScroll(id) {
  const el = document.getElementById(id);
  const container = document.getElementById('landing-screen');
  if (!el || !container) return;
  const offset = el.offsetTop - 80;
  container.scrollTo({ top: offset, behavior: 'smooth' });
}

function gmAc(tab) {
  document.getElementById('gm-overlay').classList.add('open');
  gmTab(tab || 'giris');
  document.getElementById('gm-err').style.display = 'none';
  // Odaklan
  setTimeout(() => {
    const el = tab === 'kayit'
      ? document.getElementById('gm-kad')
      : document.getElementById('gm-email');
    if (el) el.focus();
  }, 150);
}

function gmKapat() {
  document.getElementById('gm-overlay').classList.remove('open');
  // Dinamik görünümleri temizle (reset, magic link, yeni şifre)
  ['gm-f-reset', 'gm-f-magiclink', 'gm-f-yenisifre'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  var tabs = document.querySelector('.gm-tabs');
  if (tabs) tabs.style.display = '';
  var girisForm = document.getElementById('gm-f-giris');
  if (girisForm) girisForm.style.display = '';
  document.getElementById('gm-err').style.display = '';
  // Hata mesajı stillerini sıfırla
  var errEl = document.getElementById('gm-err');
  if (errEl) { errEl.style.background = ''; errEl.style.borderColor = ''; errEl.style.color = ''; errEl.style.display = 'none'; }
}

function gmTab(t) {
  document.getElementById('gm-t-giris').classList.toggle('active', t === 'giris');
  document.getElementById('gm-t-kayit').classList.toggle('active', t === 'kayit');
  document.getElementById('gm-f-giris').style.display = t === 'giris' ? 'block' : 'none';
  document.getElementById('gm-f-kayit').style.display = t === 'kayit' ? 'block' : 'none';
  document.getElementById('gm-err').style.display = 'none';
}

function gmHata(msg) {
  const e = document.getElementById('gm-err');
  e.textContent = msg; e.style.display = 'block';
}

function gmBasari(msg) {
  const e = document.getElementById('gm-err');
  e.textContent = msg;
  e.style.display = 'block';
  e.style.background = 'var(--green-dim, #1a3a2a)';
  e.style.borderColor = 'var(--green, #27ae60)';
  e.style.color = 'var(--green, #27ae60)';
}

function gmHataTemizle() {
  const e = document.getElementById('gm-err');
  if (e) { e.style.display = 'none'; e.textContent = ''; }
}

async function gmGiris() {
  const email = document.getElementById('gm-email').value.trim();
  const sifre = document.getElementById('gm-sifre').value;
  if (!email || !sifre) return gmHata('E-posta ve şifre gerekli.');
  const btn = document.querySelector('#gm-f-giris .gm-submit');
  btn.textContent = 'Giriş yapılıyor...'; btn.disabled = true;
  try {
    await sbGirisYap(email, sifre);
    btn.textContent = 'Giriş Yap'; btn.disabled = false;
    gmKapat();
  } catch(e) {
    btn.textContent = 'Giriş Yap'; btn.disabled = false;
    gmHata(e.message || 'E-posta veya şifre hatalı.');
  }
}

async function gmKayit() {
  const ad    = document.getElementById('gm-kad').value.trim();
  const email = document.getElementById('gm-kemail').value.trim();
  const sifre  = document.getElementById('gm-ksifre').value;
  const sifre2 = document.getElementById('gm-ksifre2').value;
  if (!ad || !email || !sifre) return gmHata('Tüm alanları doldurun.');
  if (sifre.length < 8) return gmHata('Şifre en az 8 karakter olmalı.');
  if (sifre !== sifre2) return gmHata('Şifreler eşleşmiyor.');
  var kvkkCheck = document.getElementById('gm-kvkk');
  if (kvkkCheck && !kvkkCheck.checked) return gmHata('Devam etmek için KVKK Aydınlatma Metni\'ni ve Kullanım Koşulları\'nı kabul etmeniz gerekmektedir.');
  const btn = document.querySelector('#gm-f-kayit .gm-submit');
  btn.textContent = 'Kayıt yapılıyor...'; btn.disabled = true;
  try {
    await sbKayitOl(email, sifre, ad);
    btn.textContent = 'Kayıt Ol & Başla →'; btn.disabled = false;
    gmTab('giris');
    gmBasari('✅ Kayıt başarılı! E-posta adresinize doğrulama bağlantısı gönderildi. Lütfen e-postanızı kontrol edin ve bağlantıya tıklayarak hesabınızı aktifleştirin.');
    var emailEl = document.getElementById('gm-email');
    if (emailEl) emailEl.value = email;
  } catch(e) {
    btn.textContent = 'Kayıt Ol & Başla →'; btn.disabled = false;
    if (e.message && e.message.includes('already registered'))
      gmHata('Bu e-posta zaten kayıtlı. Giriş yapın.');
    else gmHata('Hata: ' + e.message);
  }
}


// ================================================================
// ŞİFRE SIFIRLAMA (ŞİFREMİ UNUTTUM) GÖRÜNÜMÜ
// ================================================================

function gmSifreSifirlama() {
  // Tabs ve giriş formunu gizle, reset formunu göster
  document.querySelector('.gm-tabs').style.display = 'none';
  document.getElementById('gm-f-giris').style.display = 'none';
  document.getElementById('gm-f-kayit').style.display = 'none';
  document.getElementById('gm-err').style.display = 'none';
  var resetDiv = document.getElementById('gm-f-reset');
  if (!resetDiv) {
    resetDiv = document.createElement('div');
    resetDiv.id = 'gm-f-reset';
    document.querySelector('.gm-box').appendChild(resetDiv);
  }
  resetDiv.innerHTML =
    '<a class="gm-back" onclick="gmResetGeri()">← Giriş ekranına dön</a>' +
    '<div class="gm-reset-title">🔑 Şifre Sıfırlama</div>' +
    '<div class="gm-reset-desc">E-posta adresinizi girin, şifre sıfırlama bağlantısı gönderelim.</div>' +
    '<div class="gm-ig"><label>E-posta</label><input type="email" id="gm-reset-email" placeholder="ornek@mail.com" onkeydown="if(event.key===\'Enter\')gmSifreSifirlaGonder()"></div>' +
    '<button class="gm-submit" onclick="gmSifreSifirlaGonder()">Sıfırlama Bağlantısı Gönder</button>';
  resetDiv.style.display = 'block';
  // Giriş formundaki e-postayı otomatik doldur
  var girisEmail = document.getElementById('gm-email');
  var resetEmail = document.getElementById('gm-reset-email');
  if (girisEmail && girisEmail.value && resetEmail) resetEmail.value = girisEmail.value;
  setTimeout(function() { if (resetEmail) resetEmail.focus(); }, 100);
}

async function gmSifreSifirlaGonder() {
  var email = document.getElementById('gm-reset-email').value.trim();
  if (!email) return gmHata('E-posta adresinizi girin.');
  var btn = document.querySelector('#gm-f-reset .gm-submit');
  btn.textContent = 'Gönderiliyor...'; btn.disabled = true;
  try {
    await sbSifreSifirlaEmail(email);
    var resetDiv = document.getElementById('gm-f-reset');
    resetDiv.innerHTML =
      '<div class="gm-reset-basari">' +
      '<div class="gm-reset-basari-ikon">📧</div>' +
      '<div class="gm-reset-title">Bağlantı Gönderildi!</div>' +
      '<p>Şifre sıfırlama bağlantısı <strong>' + email + '</strong> adresine gönderildi. E-postanızı kontrol edin ve bağlantıya tıklayarak yeni şifrenizi belirleyin.</p>' +
      '<p style="margin-top:12px;font-size:11px;color:rgba(255,255,255,.3)">E-posta gelmedi mi? Spam klasörünüzü kontrol edin veya birkaç dakika bekleyip tekrar deneyin.</p>' +
      '</div>' +
      '<a class="gm-back" onclick="gmResetGeri()" style="display:block;text-align:center;margin-top:8px">← Giriş ekranına dön</a>';
  } catch(e) {
    btn.textContent = 'Sıfırlama Bağlantısı Gönder'; btn.disabled = false;
    gmHata(e.message || 'Bir hata oluştu. Tekrar deneyin.');
  }
}

function gmYeniSifreGorunum() {
  // Recovery link sonrası yeni şifre formu
  document.querySelector('.gm-tabs').style.display = 'none';
  document.getElementById('gm-f-giris').style.display = 'none';
  document.getElementById('gm-f-kayit').style.display = 'none';
  document.getElementById('gm-err').style.display = 'none';
  var yeniDiv = document.getElementById('gm-f-yenisifre');
  if (!yeniDiv) {
    yeniDiv = document.createElement('div');
    yeniDiv.id = 'gm-f-yenisifre';
    document.querySelector('.gm-box').appendChild(yeniDiv);
  }
  yeniDiv.innerHTML =
    '<div class="gm-reset-title">🔒 Yeni Şifre Belirleyin</div>' +
    '<div class="gm-reset-desc">Hesabınız için yeni bir şifre belirleyin.</div>' +
    '<div class="gm-ig"><label>Yeni Şifre</label><input type="password" id="gm-yenisifre1" placeholder="En az 6 karakter" autocomplete="new-password"></div>' +
    '<div class="gm-ig"><label>Şifre Tekrar</label><input type="password" id="gm-yenisifre2" placeholder="••••••••" autocomplete="new-password" onkeydown="if(event.key===\'Enter\')gmYeniSifreKaydet()"></div>' +
    '<button class="gm-submit" onclick="gmYeniSifreKaydet()">Şifreyi Güncelle</button>';
  yeniDiv.style.display = 'block';
  setTimeout(function() { var el = document.getElementById('gm-yenisifre1'); if(el) el.focus(); }, 100);
}

async function gmYeniSifreKaydet() {
  var sifre1 = document.getElementById('gm-yenisifre1').value;
  var sifre2 = document.getElementById('gm-yenisifre2').value;
  if (!sifre1 || !sifre2) return gmHata('Şifre alanlarını doldurun.');
  if (sifre1.length < 8) return gmHata('Şifre en az 8 karakter olmalı.');
  if (sifre1 !== sifre2) return gmHata('Şifreler eşleşmiyor.');
  var btn = document.querySelector('#gm-f-yenisifre .gm-submit');
  btn.textContent = 'Güncelleniyor...'; btn.disabled = true;
  try {
    var { error } = await sb.auth.updateUser({ password: sifre1 });
    if (error) throw error;
    var yeniDiv = document.getElementById('gm-f-yenisifre');
    yeniDiv.innerHTML =
      '<div class="gm-reset-basari">' +
      '<div class="gm-reset-basari-ikon">✅</div>' +
      '<div class="gm-reset-title">Şifre Güncellendi!</div>' +
      '<p>Şifreniz başarıyla değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.</p>' +
      '</div>' +
      '<button class="gm-submit" onclick="gmKapat();location.reload()">Devam Et →</button>';
  } catch(e) {
    btn.textContent = 'Şifreyi Güncelle'; btn.disabled = false;
    gmHata(e.message || 'Şifre güncellenirken bir hata oluştu.');
  }
}

function gmResetGeri() {
  // Sıfırlama görünümünden giriş formuna dön
  var resetDiv = document.getElementById('gm-f-reset');
  if (resetDiv) resetDiv.style.display = 'none';
  document.querySelector('.gm-tabs').style.display = '';
  document.getElementById('gm-f-giris').style.display = 'block';
  document.getElementById('gm-err').style.display = 'none';
}

// ================================================================
// MAGIC LINK (ŞİFRESİZ GİRİŞ) GÖRÜNÜMÜ
// ================================================================

function gmMagicLink() {
  document.querySelector('.gm-tabs').style.display = 'none';
  document.getElementById('gm-f-giris').style.display = 'none';
  document.getElementById('gm-f-kayit').style.display = 'none';
  document.getElementById('gm-err').style.display = 'none';
  var mlDiv = document.getElementById('gm-f-magiclink');
  if (!mlDiv) {
    mlDiv = document.createElement('div');
    mlDiv.id = 'gm-f-magiclink';
    document.querySelector('.gm-box').appendChild(mlDiv);
  }
  mlDiv.innerHTML =
    '<a class="gm-back" onclick="gmMagicLinkGeri()">← Giriş ekranına dön</a>' +
    '<div class="gm-reset-title">🔗 Bağlantı ile Giriş</div>' +
    '<div class="gm-reset-desc">E-posta adresinize tek kullanımlık giriş bağlantısı göndereceğiz. Şifre girmenize gerek yok.</div>' +
    '<div class="gm-ig"><label>E-posta</label><input type="email" id="gm-ml-email" placeholder="ornek@mail.com" onkeydown="if(event.key===\'Enter\')gmMagicLinkGonder()"></div>' +
    '<button class="gm-submit" onclick="gmMagicLinkGonder()">Giriş Bağlantısı Gönder</button>';
  mlDiv.style.display = 'block';
  // Giriş formundaki e-postayı doldur
  var girisEmail = document.getElementById('gm-email');
  var mlEmail = document.getElementById('gm-ml-email');
  if (girisEmail && girisEmail.value && mlEmail) mlEmail.value = girisEmail.value;
  setTimeout(function() { if (mlEmail) mlEmail.focus(); }, 100);
}

async function gmMagicLinkGonder() {
  var email = document.getElementById('gm-ml-email').value.trim();
  if (!email) return gmHata('E-posta adresinizi girin.');
  var btn = document.querySelector('#gm-f-magiclink .gm-submit');
  btn.textContent = 'Gönderiliyor...'; btn.disabled = true;
  try {
    await sbMagicLink(email);
    var mlDiv = document.getElementById('gm-f-magiclink');
    mlDiv.innerHTML =
      '<div class="gm-reset-basari">' +
      '<div class="gm-reset-basari-ikon">📧</div>' +
      '<div class="gm-reset-title">Bağlantı Gönderildi!</div>' +
      '<p>Giriş bağlantısı <strong>' + email + '</strong> adresine gönderildi. E-postanızı kontrol edin ve bağlantıya tıklayarak giriş yapın.</p>' +
      '<p style="margin-top:12px;font-size:11px;color:rgba(255,255,255,.3)">Bağlantı 1 saat geçerlidir. E-posta gelmedi mi? Spam klasörünüzü kontrol edin.</p>' +
      '</div>' +
      '<a class="gm-back" onclick="gmMagicLinkGeri()" style="display:block;text-align:center;margin-top:8px">← Giriş ekranına dön</a>';
  } catch(e) {
    btn.textContent = 'Giriş Bağlantısı Gönder'; btn.disabled = false;
    gmHata(e.message || 'Bir hata oluştu. Tekrar deneyin.');
  }
}

function gmMagicLinkGeri() {
  var mlDiv = document.getElementById('gm-f-magiclink');
  if (mlDiv) mlDiv.style.display = 'none';
  document.querySelector('.gm-tabs').style.display = '';
  document.getElementById('gm-f-giris').style.display = 'block';
  document.getElementById('gm-err').style.display = 'none';
}

// Klavye: ESC ile modal kapat
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') gmKapat();
});

// ================================================================
// YASAL BELGE MODAL SİSTEMİ
// ================================================================
function yasalBelgeAc(tur) {
  var basliklar = {
    'kullanim': 'Kullanım Koşulları',
    'gizlilik': 'Gizlilik Politikası',
    'kvkk': 'KVKK Aydınlatma Metni',
    'guvenlik': 'Veri Güvenliği Politikası',
    'araclar': 'Avukat Araç Kutusu',
    'surum': 'Sürüm Notları',
    'hakkimizda': 'Hakkımızda',
    'blog': 'Blog',
    'iletisim': 'İletişim',
    'yardim': 'Yardım Merkezi',
    'cerez': 'Çerez Ayarları'
  };
  var icerikler = {
    'kullanim': yasalKullanimKosullari(),
    'gizlilik': yasalGizlilikPolitikasi(),
    'kvkk': yasalKvkkAydinlatma(),
    'guvenlik': yasalVeriGuvenligi(),
    'araclar': sayfaAvukatAracKutusu(),
    'surum': sayfaSurumNotlari(),
    'hakkimizda': sayfaHakkimizda(),
    'blog': sayfaBlog(),
    'iletisim': sayfaIletisim(),
    'yardim': sayfaYardimMerkezi(),
    'cerez': sayfaCerezAyarlari()
  };
  var modal = document.getElementById('yasal-modal');
  if (!modal) return;
  document.getElementById('yasal-modal-title').textContent = basliklar[tur] || 'Yasal Belge';
  document.getElementById('yasal-modal-icerik').innerHTML = icerikler[tur] || '<p>İçerik bulunamadı.</p>';
  modal.classList.add('open');
}
function yasalModalKapat() {
  var modal = document.getElementById('yasal-modal');
  if (modal) modal.classList.remove('open');
}

function yasalKullanimKosullari() {
  return '<div class="yasal-icerik">' +
    '<p class="yasal-guncelleme">Son güncelleme: 9 Mart 2026</p>' +
    '<h3>1. Hizmet Tanımı</h3>' +
    '<p>LexBase, avukatlar ve hukuk büroları için geliştirilmiş bulut tabanlı bir büro yönetim platformudur. Platform; dava/icra takibi, müvekkil yönetimi, takvim, finans takibi, doküman yönetimi ve danışmanlık modülleri sunar. Hizmet, <strong>lexbase.app</strong> alan adı üzerinden SaaS (Software as a Service) modeli ile sağlanmaktadır.</p>' +
    '<h3>2. Taraflar</h3>' +
    '<p>İşbu sözleşme; LexBase platformunu işleten <strong>EMD Yazılım</strong> ("Hizmet Sağlayıcı") ile platforma kayıt olarak hizmeti kullanan gerçek veya tüzel kişi ("Kullanıcı") arasında, kullanıcının kayıt işlemini tamamlaması ile birlikte yürürlüğe girer.</p>' +
    '<h3>3. Hesap Yükümlülükleri</h3>' +
    '<ul>' +
    '<li>Kullanıcı, kayıt sırasında doğru ve güncel bilgi vermekle yükümlüdür.</li>' +
    '<li>Hesap güvenliği kullanıcının sorumluluğundadır; şifrenin üçüncü kişilerle paylaşılmaması gerekir.</li>' +
    '<li>Her büro için tek sahip hesabı bulunur. Alt kullanıcılar sahip tarafından oluşturulur.</li>' +
    '<li>Hesap bilgilerinde değişiklik olduğunda kullanıcı bu bilgileri güncellemekle yükümlüdür.</li>' +
    '</ul>' +
    '<h3>4. Kullanım Kuralları</h3>' +
    '<ul>' +
    '<li>Platform yalnızca yasal amaçlarla ve meslek etiğine uygun biçimde kullanılabilir.</li>' +
    '<li>Sisteme zararlı yazılım yüklenmesi, güvenlik açığı araştırılması veya başka kullanıcıların verilerine erişim girişiminde bulunulması yasaktır.</li>' +
    '<li>Kullanıcı, platforma yüklediği tüm verilerden (doğruluk, hukuka uygunluk vb.) bizzat sorumludur.</li>' +
    '<li>Otomatik veri çekme (scraping), ters mühendislik veya API\'nin izinsiz kullanımı yasaktır.</li>' +
    '</ul>' +
    '<h3>5. Fikri Mülkiyet</h3>' +
    '<p>LexBase platformunun tasarımı, kaynak kodu, logosu, arayüzü ve tüm yazılımsal bileşenleri EMD Yazılım\'a aittir ve 5846 sayılı Fikir ve Sanat Eserleri Kanunu ile korunmaktadır. Kullanıcı, platforma yüklediği verilerin mülkiyetini korur; ancak hizmetin sunulabilmesi için gerekli teknik işleme hakkını Hizmet Sağlayıcı\'ya tanır.</p>' +
    '<h3>6. Ücretlendirme ve Abonelik</h3>' +
    '<ul>' +
    '<li>Platform, farklı plan seçenekleri (Deneme, Başlangıç, Profesyonel, Kurumsal) ile sunulur.</li>' +
    '<li>Deneme süresi sonunda ücretli plana geçiş yapılmaması halinde hesap kısıtlanır.</li>' +
    '<li>Fiyat değişiklikleri en az 30 gün önceden bildirilir; mevcut dönem etkilenmez.</li>' +
    '<li>İade politikası, ilgili plan koşullarında belirtilir.</li>' +
    '</ul>' +
    '<h3>7. Hizmet Seviyesi ve Kesintiler</h3>' +
    '<p>LexBase, %99.5 erişilebilirlik hedeflemektedir. Planlı bakım çalışmaları önceden duyurulur. Mücbir sebepler (doğal afet, siber saldırı, altyapı kesintisi vb.) nedeniyle oluşan kesintilerden Hizmet Sağlayıcı sorumlu tutulamaz.</p>' +
    '<h3>8. Sorumluluk Sınırlandırması</h3>' +
    '<p>LexBase bir büro yönetim aracıdır; hukuki danışmanlık hizmeti vermez. Platform üzerinde yapılan hesaplamalar, hatırlatmalar ve öneriler bilgilendirme amaçlıdır. Kullanıcının hukuki kararlarından ve veri kaybından Hizmet Sağlayıcı sorumlu tutulamaz. Hizmet Sağlayıcı\'nın toplam sorumluluğu, kullanıcının son 12 ayda ödediği ücret tutarıyla sınırlıdır.</p>' +
    '<h3>9. Hesap Fesih ve Kapatma</h3>' +
    '<ul>' +
    '<li>Kullanıcı, hesabını dilediği zaman kapatma talebinde bulunabilir.</li>' +
    '<li>Hizmet Sağlayıcı, kullanım koşullarını ihlal eden hesapları önceden bildirimde bulunarak askıya alabilir veya kapatabilir.</li>' +
    '<li>Hesap kapanması halinde veriler 90 gün süreyle saklanır; bu süre sonunda kalıcı olarak silinir.</li>' +
    '</ul>' +
    '<h3>10. Uygulanacak Hukuk ve Yetki</h3>' +
    '<p>İşbu sözleşme Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda <strong>İstanbul Mahkemeleri ve İcra Daireleri</strong> yetkilidir.</p>' +
    '<h3>11. Değişiklikler</h3>' +
    '<p>Hizmet Sağlayıcı, kullanım koşullarını güncelleme hakkını saklı tutar. Önemli değişiklikler e-posta ve/veya platform içi bildirim ile duyurulur. Değişiklik sonrası platformu kullanmaya devam etmek, güncel koşulların kabul edildiği anlamına gelir.</p>' +
    '<div class="yasal-iletisim"><strong>İletişim:</strong> iletisim@lexbase.app</div>' +
    '</div>';
}

function yasalGizlilikPolitikasi() {
  return '<div class="yasal-icerik">' +
    '<p class="yasal-guncelleme">Son güncelleme: 10 Mart 2026</p>' +
    '<h3>1. Giriş</h3>' +
    '<p>LexBase olarak kullanıcılarımızın gizliliğini en üst düzeyde korumayı taahhüt ediyoruz. Bu politika, hangi verilerin toplandığını, nasıl kullanıldığını, kimlerle paylaşıldığını ve haklarınızı açıklamaktadır.</p>' +
    '<h3>2. Toplanan Veriler</h3>' +
    '<table class="yasal-tablo">' +
    '<tr><th>Veri Kategorisi</th><th>Veri Türleri</th><th>Toplama Yöntemi</th></tr>' +
    '<tr><td>Kimlik Bilgileri</td><td>Ad, soyad, e-posta adresi, profil fotoğrafı (Google ile giriş yapılması halinde)</td><td>Kayıt formu / Google OAuth</td></tr>' +
    '<tr><td>Hesap Bilgileri</td><td>Büro adı, şifre (hashlenmiş), plan türü</td><td>Kayıt ve kullanım</td></tr>' +
    '<tr><td>İletişim Bilgileri</td><td>E-posta adresi</td><td>Kayıt formu / Google OAuth</td></tr>' +
    '<tr><td>Kullanım Verileri</td><td>Giriş/çıkış zamanları, kullanılan özellikler, oturum süreleri</td><td>Otomatik loglama</td></tr>' +
    '<tr><td>Teknik Veriler</td><td>IP adresi, tarayıcı türü, işletim sistemi, ekran çözünürlüğü</td><td>Otomatik (sunucu)</td></tr>' +
    '<tr><td>Konum Verileri</td><td>Ülke, şehir, bölge, saat dilimi, ISP (IP tabanlı)</td><td>Otomatik (Cloudflare geo)</td></tr>' +
    '<tr><td>İş Verileri</td><td>Müvekkil, dava, icra, finans kayıtları (kullanıcı tarafından girilen)</td><td>Kullanıcı girişi</td></tr>' +
    '</table>' +
    '<h3>3. Verilerin İşlenme Amaçları</h3>' +
    '<ul>' +
    '<li><strong>Hizmet sunumu:</strong> Platform özelliklerinin çalışması, kullanıcı oturumlarının yönetimi</li>' +
    '<li><strong>Güvenlik:</strong> Yetkisiz erişim tespiti, hesap güvenliği, IP loglama (yasal yükümlülük)</li>' +
    '<li><strong>İyileştirme:</strong> Platform performansının analizi, hata tespiti ve düzeltme</li>' +
    '<li><strong>Yasal yükümlülük:</strong> 5651 sayılı Kanun gereği trafik verisi saklama, vergi mevzuatı uyumu</li>' +
    '<li><strong>İletişim:</strong> Hizmetle ilgili bildirimler, plan değişikliği duyuruları</li>' +
    '</ul>' +
    '<h3>4. Verilerin Paylaşımı ve Aktarımı</h3>' +
    '<p>Kişisel verileriniz aşağıdaki üçüncü taraf hizmet sağlayıcıları ile teknik zorunluluklar çerçevesinde paylaşılmaktadır:</p>' +
    '<table class="yasal-tablo">' +
    '<tr><th>Hizmet Sağlayıcı</th><th>Amaç</th><th>Konum</th></tr>' +
    '<tr><td>Supabase (AWS)</td><td>Veritabanı, kimlik doğrulama</td><td>ABD / AB</td></tr>' +
    '<tr><td>Cloudflare</td><td>CDN, DDoS koruması, DNS, IP geo verileri</td><td>Global (en yakın PoP)</td></tr>' +
    '<tr><td>Google (OAuth 2.0)</td><td>Sosyal giriş kimlik doğrulama (Google ile giriş seçilirse)</td><td>ABD</td></tr>' +
    '<tr><td>GitHub / Cloudflare Pages</td><td>Kaynak kod ve statik dosya dağıtımı</td><td>ABD</td></tr>' +
    '</table>' +
    '<p>Verileriniz reklam veya pazarlama amacıyla üçüncü taraflarla <strong>asla</strong> paylaşılmaz. Yasal zorunluluk halinde (mahkeme kararı, savcılık talebi) yetkili kamu kurumlarına bilgi verilebilir.</p>' +
    '<h3>5. Yurt Dışına Veri Aktarımı</h3>' +
    '<p>Altyapı hizmetleri (Supabase, Cloudflare) ve sosyal giriş hizmetleri (Google OAuth) sebebiyle veriler ABD ve AB\'deki sunucularda işlenebilmektedir. Bu aktarım, KVKK md.9 kapsamında açık rıza ve/veya yeterli koruma koşullarına dayanmaktadır. Aktarım yapılan tüm kuruluşlar endüstri standardı güvenlik sertifikalarına (SOC 2, ISO 27001) sahiptir.</p>' +
    '<h3>6. Saklama Süreleri</h3>' +
    '<table class="yasal-tablo">' +
    '<tr><th>Veri Türü</th><th>Saklama Süresi</th></tr>' +
    '<tr><td>Hesap ve kimlik bilgileri</td><td>Hesap aktif olduğu sürece + 90 gün</td></tr>' +
    '<tr><td>IP ve oturum logları</td><td>2 yıl (5651 s. Kanun gereği)</td></tr>' +
    '<tr><td>İş verileri (dava, müvekkil vb.)</td><td>Hesap aktif olduğu sürece + 90 gün</td></tr>' +
    '<tr><td>Fatura ve ödeme kayıtları</td><td>10 yıl (Vergi Usul Kanunu gereği)</td></tr>' +
    '</table>' +
    '<h3>7. Çerezler ve Yerel Depolama</h3>' +
    '<p>LexBase, oturum yönetimi için tarayıcı yerel depolama (localStorage) kullanmaktadır. Üçüncü taraf izleme çerezleri kullanılmamaktadır. Cloudflare güvenlik çerezleri otomatik olarak yerleştirilir ve yalnızca güvenlik amaçlıdır. Google ile giriş tercih edildiğinde, Google\'ın kendi gizlilik politikası kapsamında çerez kullanımı uygulanır.</p>' +
    '<h3>8. Haklarınız</h3>' +
    '<p>6698 sayılı KVKK kapsamındaki haklarınız için KVKK Aydınlatma Metni\'ni inceleyiniz. Talepleriniz için: <strong>guvenlik@lexbase.app</strong></p>' +
    '<div class="yasal-iletisim"><strong>Veri Sorumlusu:</strong> EMD Yazılım — guvenlik@lexbase.app</div>' +
    '</div>';
}

function yasalKvkkAydinlatma() {
  return '<div class="yasal-icerik">' +
    '<p class="yasal-guncelleme">Son güncelleme: 10 Mart 2026</p>' +
    '<p style="background:var(--gold-dim);border:1px solid var(--gold);border-radius:6px;padding:12px;font-size:12px;margin-bottom:16px;color:var(--gold-light)">Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu\'nun ("KVKK") 10. maddesi gereğince aydınlatma yükümlülüğü kapsamında hazırlanmıştır.</p>' +
    '<h3>1. Veri Sorumlusu</h3>' +
    '<p><strong>EMD Yazılım</strong> ("Şirket") olarak, kişisel verilerinizi KVKK ve ilgili mevzuata uygun şekilde işlemekteyiz.</p>' +
    '<h3>2. İşlenen Kişisel Veri Kategorileri</h3>' +
    '<table class="yasal-tablo">' +
    '<tr><th>Kategori</th><th>Veri Türleri</th></tr>' +
    '<tr><td>Kimlik</td><td>Ad, soyad, profil fotoğrafı (Google ile giriş halinde)</td></tr>' +
    '<tr><td>İletişim</td><td>E-posta adresi</td></tr>' +
    '<tr><td>Müşteri İşlem</td><td>Büro adı, plan bilgisi, ödeme geçmişi</td></tr>' +
    '<tr><td>İşlem Güvenliği</td><td>IP adresi, oturum logları, giriş/çıkış zamanları, cihaz bilgisi, tarayıcı türü</td></tr>' +
    '<tr><td>Pazarlama</td><td>E-posta tercihleri (yalnızca hizmet bildirimleri)</td></tr>' +
    '<tr><td>Konum</td><td>IP tabanlı ülke, şehir, bölge, ISP bilgisi</td></tr>' +
    '</table>' +
    '<h3>3. Kişisel Verilerin İşlenme Amaçları</h3>' +
    '<ul>' +
    '<li>Üyelik ve hesap oluşturma işlemlerinin yürütülmesi</li>' +
    '<li>Platform hizmetlerinin sunulması ve iyileştirilmesi</li>' +
    '<li>Bilgi güvenliği süreçlerinin yürütülmesi</li>' +
    '<li>Yetkisiz işlem ve erişimlerin tespiti, önlenmesi</li>' +
    '<li>5651 sayılı Kanun kapsamında trafik verisi saklama yükümlülüğünün yerine getirilmesi</li>' +
    '<li>Yasal düzenlemelere uyum sağlanması</li>' +
    '<li>Fatura ve finansal kayıtların tutulması</li>' +
    '<li>Kullanıcı destek taleplerinin yanıtlanması</li>' +
    '</ul>' +
    '<h3>4. Kişisel Verilerin İşlenmesinin Hukuki Sebepleri</h3>' +
    '<p>Kişisel verileriniz, KVKK md.5/2 kapsamında aşağıdaki hukuki sebeplere dayanılarak işlenmektedir:</p>' +
    '<ul>' +
    '<li><strong>Sözleşmenin ifası (md.5/2-c):</strong> Platformun çalışması, hesap yönetimi</li>' +
    '<li><strong>Hukuki yükümlülük (md.5/2-ç):</strong> 5651 s. Kanun (trafik verisi saklama), VUK (fatura saklama)</li>' +
    '<li><strong>Meşru menfaat (md.5/2-f):</strong> Güvenlik logları, hizmet iyileştirme, hata tespiti</li>' +
    '<li><strong>Açık rıza (md.5/1):</strong> Yurt dışına veri aktarımı (Supabase/Cloudflare altyapısı, Google OAuth)</li>' +
    '</ul>' +
    '<h3>5. Kişisel Verilerin Aktarımı</h3>' +
    '<p><strong>Yurt içi aktarım:</strong> Yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına (mahkeme, savcılık, BTK vb.)</p>' +
    '<p><strong>Yurt dışı aktarım (KVKK md.9):</strong></p>' +
    '<ul>' +
    '<li>Supabase Inc. (ABD/AB) — veritabanı altyapısı ve kimlik doğrulama</li>' +
    '<li>Cloudflare Inc. (ABD/Global) — içerik dağıtım ağı, güvenlik, IP tabanlı konum verileri</li>' +
    '<li>Google LLC (ABD) — OAuth 2.0 sosyal giriş kimlik doğrulama (kullanıcı tercih ettiğinde)</li>' +
    '</ul>' +
    '<p>Yurt dışı aktarım, açık rızanıza ve/veya aktarım yapılan ülkede yeterli korumanın bulunmasına dayanmaktadır. Bu kuruluşlar SOC 2 Type II ve/veya ISO 27001 sertifikalarına sahiptir.</p>' +
    '<h3>6. Veri Saklama Süreleri</h3>' +
    '<ul>' +
    '<li>Hesap verileri: Üyelik devam ettiği sürece + hesap kapanmasından itibaren 90 gün</li>' +
    '<li>Trafik ve IP logları: 5651 s. Kanun gereği 2 yıl</li>' +
    '<li>Mali kayıtlar: VUK gereği 10 yıl</li>' +
    '</ul>' +
    '<h3>7. KVKK md.11 Kapsamındaki Haklarınız</h3>' +
    '<p>Kanun\'un 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>' +
    '<ul>' +
    '<li><strong>a)</strong> Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>' +
    '<li><strong>b)</strong> İşlenmişse buna ilişkin bilgi talep etme</li>' +
    '<li><strong>c)</strong> İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>' +
    '<li><strong>ç)</strong> Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>' +
    '<li><strong>d)</strong> Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme</li>' +
    '<li><strong>e)</strong> KVKK md.7 kapsamında silinmesini veya yok edilmesini isteme</li>' +
    '<li><strong>f)</strong> Düzeltme/silme işlemlerinin aktarılan üçüncü kişilere bildirilmesini isteme</li>' +
    '<li><strong>g)</strong> İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonuç ortaya çıkmasına itiraz etme</li>' +
    '<li><strong>ğ)</strong> Kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>' +
    '</ul>' +
    '<h3>8. Başvuru Yöntemi</h3>' +
    '<p>Yukarıdaki haklarınızı kullanmak için <strong>guvenlik@lexbase.app</strong> adresine kimliğinizi doğrulayıcı bilgilerle birlikte yazılı başvuruda bulunabilirsiniz. Başvurunuz en geç <strong>30 gün</strong> içinde ücretsiz olarak sonuçlandırılacaktır. İşlemin ayrıca bir maliyet gerektirmesi hâlinde, Kişisel Verileri Koruma Kurulu tarafından belirlenen tarife üzerinden ücret alınabilir.</p>' +
    '<p>Başvurunuzun reddedilmesi, verilen cevabın yetersiz bulunması veya süresinde cevap verilmemesi hâlinde; cevabı öğrendiğiniz tarihten itibaren 30 gün, her hâlde başvuru tarihinden itibaren 60 gün içinde <strong>Kişisel Verileri Koruma Kurulu\'na</strong> şikayette bulunma hakkınız mevcuttur.</p>' +
    '<div class="yasal-iletisim"><strong>Veri Sorumlusu:</strong> EMD Yazılım<br><strong>E-posta:</strong> guvenlik@lexbase.app</div>' +
    '</div>';
}

function yasalVeriGuvenligi() {
  return '<div class="yasal-icerik">' +
    '<p class="yasal-guncelleme">Son güncelleme: 9 Mart 2026</p>' +
    '<h3>1. Genel Yaklaşım</h3>' +
    '<p>LexBase, kullanıcı verilerinin güvenliğini sağlamak için endüstri standardı teknik ve idari tedbirler uygulamaktadır. Tüm güvenlik önlemleri düzenli olarak gözden geçirilir ve güncellenir.</p>' +
    '<h3>2. İletişim Güvenliği</h3>' +
    '<ul>' +
    '<li><strong>SSL/TLS şifreleme:</strong> Tüm veri iletişimi 256-bit SSL/TLS sertifikası ile şifrelenmektedir. Platform yalnızca HTTPS üzerinden erişilebilir.</li>' +
    '<li><strong>HSTS:</strong> HTTP Strict Transport Security politikası uygulanmaktadır.</li>' +
    '<li><strong>Cloudflare DDoS koruması:</strong> Tüm trafik Cloudflare ağı üzerinden geçerek DDoS saldırılarına karşı korunmaktadır.</li>' +
    '</ul>' +
    '<h3>3. Veritabanı Güvenliği</h3>' +
    '<ul>' +
    '<li><strong>Supabase altyapısı:</strong> Veritabanı, AWS altyapısında barındırılmakta olup fiziksel ve ağ güvenliği AWS tarafından sağlanmaktadır.</li>' +
    '<li><strong>Row Level Security (RLS):</strong> Her kullanıcı yalnızca kendi bürosuna ait verilere erişebilir; veritabanı seviyesinde satır bazlı erişim kontrolü uygulanmaktadır.</li>' +
    '<li><strong>Şifre güvenliği:</strong> Kullanıcı şifreleri bcrypt algoritması ile hashlenmiş olarak saklanır; düz metin olarak hiçbir zaman tutulmaz.</li>' +
    '<li><strong>Otomatik yedekleme:</strong> Veritabanı günlük olarak yedeklenmektedir.</li>' +
    '</ul>' +
    '<h3>4. Uygulama Güvenliği</h3>' +
    '<ul>' +
    '<li><strong>Oturum yönetimi:</strong> JWT tabanlı token doğrulama kullanılmaktadır.</li>' +
    '<li><strong>Girdi doğrulama:</strong> Tüm kullanıcı girdileri sanitize edilerek XSS ve SQL Injection saldırılarına karşı korunmaktadır.</li>' +
    '<li><strong>CORS politikası:</strong> API istekleri yalnızca yetkili alan adlarından kabul edilmektedir.</li>' +
    '<li><strong>Content Security Policy:</strong> CSP başlıkları ile kaynak yükleme kısıtlamaları uygulanmaktadır.</li>' +
    '</ul>' +
    '<h3>5. Erişim Kontrolü</h3>' +
    '<ul>' +
    '<li><strong>Rol tabanlı yetkilendirme:</strong> Sahip, yönetici ve personel rolleri ile farklı erişim seviyeleri tanımlanmıştır.</li>' +
    '<li><strong>IP loglama:</strong> Tüm giriş/çıkış işlemlerinde IP adresi, cihaz bilgisi ve konum verileri kaydedilmektedir.</li>' +
    '<li><strong>Oturum takibi:</strong> Aktif oturumlar izlenmekte, şüpheli etkinlik tespit edilmektedir.</li>' +
    '</ul>' +
    '<h3>6. Altyapı Güvenliği</h3>' +
    '<table class="yasal-tablo">' +
    '<tr><th>Katman</th><th>Sağlayıcı</th><th>Güvenlik Sertifikaları</th></tr>' +
    '<tr><td>Veritabanı</td><td>Supabase (AWS)</td><td>SOC 2 Type II, ISO 27001</td></tr>' +
    '<tr><td>CDN & Güvenlik</td><td>Cloudflare</td><td>SOC 2 Type II, ISO 27001, PCI DSS</td></tr>' +
    '<tr><td>Hosting</td><td>Cloudflare Pages</td><td>SOC 2 Type II</td></tr>' +
    '</table>' +
    '<h3>7. Veri İhlali Bildirimi</h3>' +
    '<p>Olası bir veri ihlali durumunda:</p>' +
    '<ul>' +
    '<li>İhlal tespit edildikten sonra en kısa sürede etkilenen kullanıcılar bilgilendirilir.</li>' +
    '<li>KVKK md.12/5 gereği, Kişisel Verileri Koruma Kurulu\'na 72 saat içinde bildirim yapılır.</li>' +
    '<li>İhlalin kapsamı, etkilenen veri türleri ve alınan önlemler şeffaf biçimde paylaşılır.</li>' +
    '<li>Gerekli hallerde kullanıcılardan şifre değişikliği talep edilir.</li>' +
    '</ul>' +
    '<h3>8. Fiziksel Güvenlik</h3>' +
    '<p>LexBase bulut tabanlı bir hizmettir. Sunucu altyapısının fiziksel güvenliği, hizmet sağlayıcıların (AWS, Cloudflare) veri merkezlerindeki endüstri standardı fiziksel güvenlik önlemleri ile sağlanmaktadır (biyometrik erişim, 7/24 gözetim, çevre güvenliği vb.).</p>' +
    '<h3>9. Güvenlik Güncellemeleri</h3>' +
    '<p>Platform güvenlik yamaları düzenli olarak uygulanır. Kritik güvenlik açıkları tespit edildiğinde acil müdahale prosedürü işletilir.</p>' +
    '<div class="yasal-iletisim"><strong>Güvenlik İletişim:</strong> guvenlik@lexbase.app</div>' +
    '</div>';
}

// ================================================================
// FOOTER SAYFA İÇERİKLERİ
// ================================================================

function sayfaAvukatAracKutusu() {
  return '<div class="yasal-icerik sayfa-icerik">' +
    '<p class="sayfa-tanitim">LexBase, avukatların günlük iş yükünü hafifleten kapsamlı bir dijital araç kutusu sunar.</p>' +
    '<div class="arac-grid">' +

    '<div class="arac-kart">' +
    '<div class="arac-ikon">📁</div>' +
    '<h3>Dosya Yönetimi</h3>' +
    '<p>Hukuk, ceza ve icra dosyalarınızı tek panelden takip edin. Durum güncellemeleri, süre hatırlatmaları ve otomatik numaralandırma ile hiçbir detayı kaçırmayın.</p>' +
    '</div>' +

    '<div class="arac-kart">' +
    '<div class="arac-ikon">👥</div>' +
    '<h3>Müvekkil Takibi</h3>' +
    '<p>Müvekkil bilgilerini, iletişim geçmişini ve ilişkili dosyaları merkezi bir yapıda yönetin. Müvekkil bazlı finansal özet ve kârlılık analizi yapın.</p>' +
    '</div>' +

    '<div class="arac-kart">' +
    '<div class="arac-ikon">⚖️</div>' +
    '<h3>Duruşma Takvimi</h3>' +
    '<p>Tüm duruşma ve randevularınızı takvim görünümünde planlayın. Otomatik hatırlatmalarla önemli tarihleri asla kaçırmayın.</p>' +
    '</div>' +

    '<div class="arac-kart">' +
    '<div class="arac-ikon">📊</div>' +
    '<h3>Finans Modülü</h3>' +
    '<p>Bakiyeler, büro giderleri, kâr/zarar analizi, faturalar ve kârlılık raporları. Beklenen gelir takibi ile nakit akışınızı planlayın.</p>' +
    '</div>' +

    '<div class="arac-kart">' +
    '<div class="arac-ikon">📋</div>' +
    '<h3>İcra Takibi</h3>' +
    '<p>İcra dosyalarınızı adım adım takip edin. Harç hesaplamaları, tahsilat takibi ve icra süreç yönetimi tek ekranda.</p>' +
    '</div>' +

    '<div class="arac-kart">' +
    '<div class="arac-ikon">🔔</div>' +
    '<h3>Akıllı Hatırlatmalar</h3>' +
    '<p>Süre bitimi, duruşma tarihi, ödeme vadesi ve daha fazlası için otomatik hatırlatmalar. Kritik tarihleri asla kaçırmayın.</p>' +
    '</div>' +

    '<div class="arac-kart">' +
    '<div class="arac-ikon">☁️</div>' +
    '<h3>Cloud Senkronizasyon</h3>' +
    '<p>Verileriniz bulutta güvenle saklanır. Ofis, ev veya hareket halindeyken tüm cihazlarınızdan erişin.</p>' +
    '</div>' +

    '<div class="arac-kart">' +
    '<div class="arac-ikon">📈</div>' +
    '<h3>İstatistik & Raporlama</h3>' +
    '<p>Büronuzun performansını görsel grafiklerle analiz edin. Dosya durumları, gelir-gider trendleri ve verimlilik raporları.</p>' +
    '</div>' +

    '</div>' +
    '<div class="yasal-iletisim" style="margin-top:24px"><strong>Detaylı bilgi:</strong> satis@lexbase.app</div>' +
    '</div>';
}

function sayfaSurumNotlari() {
  return '<div class="yasal-icerik sayfa-icerik">' +
    '<p class="sayfa-tanitim">LexBase sürekli gelişiyor. İşte son güncellemeler ve iyileştirmeler:</p>' +

    '<div class="surum-blok surum-guncel">' +
    '<div class="surum-baslik">' +
    '<span class="surum-badge">Güncel</span>' +
    '<h3>v2.1.0 <span class="surum-tarih">Mart 2026</span></h3>' +
    '</div>' +
    '<ul>' +
    '<li><strong>🛡️ IP Loglama & Güvenlik:</strong> Tüm giriş/çıkış işlemlerinde IP adresi, konum ve cihaz bilgisi kaydı</li>' +
    '<li><strong>📜 KVKK Uyumluluk:</strong> Yasal belgeler (Kullanım Koşulları, Gizlilik Politikası, KVKK Aydınlatma Metni, Veri Güvenliği) eklendi</li>' +
    '<li><strong>🍪 Consent Banner:</strong> KVKK uyumlu çerez/veri kullanım onay mekanizması</li>' +
    '<li><strong>📋 Kayıt KVKK Onayı:</strong> Kayıt formuna KVKK aydınlatma metni onay kutusu</li>' +
    '</ul>' +
    '</div>' +

    '<div class="surum-blok">' +
    '<h3>v2.0.0 <span class="surum-tarih">Şubat 2026</span></h3>' +
    '<ul>' +
    '<li><strong>💰 Finans Sistemi Yeniden Tasarımı:</strong> 6 sekmeli yeni finans modülü (Bakiyeler, Büro Giderleri, Kâr/Zarar, Faturalar, Kârlılık, Beklenen Gelir)</li>' +
    '<li><strong>📊 Finans Motoru:</strong> Bağımsız hesaplama motoru — müvekkil özet, büro kâr/zarar, finansal uyarılar</li>' +
    '<li><strong>🏦 Banka Widget:</strong> Zengin banka seçim widget\'ı (3 form için ortak)</li>' +
    '<li><strong>🔄 Veri Göçü:</strong> Eski bütçe/finans yapısından yeni sisteme otomatik migrasyon</li>' +
    '</ul>' +
    '</div>' +

    '<div class="surum-blok">' +
    '<h3>v1.8.0 <span class="surum-tarih">Ocak 2026</span></h3>' +
    '<ul>' +
    '<li><strong>👑 Admin Panel:</strong> Standalone admin paneli — müşteri yönetimi, lisans kontrolü, oturum logları</li>' +
    '<li><strong>🔐 Lisans Sistemi:</strong> Plan bazlı özellik kısıtlamaları ve deneme süresi yönetimi</li>' +
    '<li><strong>📨 E-posta Bildirimleri:</strong> Supabase Edge Functions ile otomatik bildirim altyapısı</li>' +
    '</ul>' +
    '</div>' +

    '<div class="surum-blok">' +
    '<h3>v1.5.0 <span class="surum-tarih">Aralık 2025</span></h3>' +
    '<ul>' +
    '<li><strong>⚖️ İcra Modülü:</strong> İcra dosya yönetimi, harç hesaplama ve tahsilat takibi</li>' +
    '<li><strong>📱 PWA Desteği:</strong> Mobil cihazlarda uygulama olarak kurulabilme</li>' +
    '<li><strong>🌙 Karanlık Mod:</strong> Göz dostu karanlık tema seçeneği</li>' +
    '</ul>' +
    '</div>' +

    '<div class="surum-blok">' +
    '<h3>v1.0.0 <span class="surum-tarih">Kasım 2025</span></h3>' +
    '<ul>' +
    '<li><strong>🚀 İlk Sürüm:</strong> Dosya yönetimi, müvekkil takibi, duruşma takvimi</li>' +
    '<li><strong>☁️ Cloud Sync:</strong> Supabase tabanlı bulut senkronizasyon</li>' +
    '<li><strong>🎨 Modern Arayüz:</strong> Gold tema, responsive tasarım, sidebar navigasyon</li>' +
    '</ul>' +
    '</div>' +

    '</div>';
}

function sayfaHakkimizda() {
  return '<div class="yasal-icerik sayfa-icerik">' +
    '<div class="hakkimizda-hero">' +
    '<h3>Hukuku Dijitalleştiriyoruz</h3>' +
    '<p class="hakkimizda-slogan">LexBase, avukatlar ve hukuk büroları için tasarlanmış Türkiye\'nin yeni nesil büro yönetim platformudur.</p>' +
    '</div>' +

    '<h3>Hikayemiz</h3>' +
    '<p>LexBase, hukuk mesleğinin dijital dönüşümüne katkı sağlamak amacıyla <strong>EMD Yazılım</strong> tarafından geliştirilmiştir. Avukatların günlük iş yükünü hafifletmek, büro süreçlerini verimli hale getirmek ve hukuki takip işlerini kolaylaştırmak temel hedefimizdir.</p>' +
    '<p>Türkiye\'deki hukuk bürolarının çoğunluğunun Excel tabloları, dağınık notlar ve kâğıt dosyalarla çalıştığını gördük. Bu gerçeklikten yola çıkarak; modern, kullanımı kolay ve avukatların gerçek ihtiyaçlarına cevap veren bir platform inşa ettik.</p>' +

    '<h3>Misyonumuz</h3>' +
    '<p>Hukuk profesyonellerinin zamanını idari işlerden kurtararak asıl işlerine — hukuka — odaklanmalarını sağlamak. Teknolojiyi hukukun hizmetine sunmak.</p>' +

    '<h3>Değerlerimiz</h3>' +
    '<div class="deger-grid">' +
    '<div class="deger-item">' +
    '<strong>🔒 Güvenlik Öncelikli</strong>' +
    '<p>Avukat-müvekkil gizliliği kutsaldır. Verileriniz uçtan uca şifreleme ve endüstri standardı güvenlik önlemleriyle korunur.</p>' +
    '</div>' +
    '<div class="deger-item">' +
    '<strong>🇹🇷 Türk Hukukuna Uyumlu</strong>' +
    '<p>Platform, Türkiye\'deki hukuki süreçler ve mevzuat gözetilerek tasarlanmıştır. UYAP entegrasyon hazırlığı devam etmektedir.</p>' +
    '</div>' +
    '<div class="deger-item">' +
    '<strong>⚡ Sürekli Gelişim</strong>' +
    '<p>Kullanıcı geri bildirimleri doğrultusunda platform sürekli güncellenmektedir. Her ay yeni özellikler ve iyileştirmeler yayınlanır.</p>' +
    '</div>' +
    '<div class="deger-item">' +
    '<strong>🤝 Kullanıcı Odaklı</strong>' +
    '<p>Her özellik, gerçek avukatların ihtiyaçları dinlenerek geliştirilir. Teknoloji karmaşıklığını ortadan kaldırıyoruz.</p>' +
    '</div>' +
    '</div>' +

    '<h3>Rakamlarla LexBase</h3>' +
    '<div class="rakam-grid">' +
    '<div class="rakam-item"><div class="rakam-buyuk">15+</div><div>Modül</div></div>' +
    '<div class="rakam-item"><div class="rakam-buyuk">7</div><div>Büyük Güncelleme</div></div>' +
    '<div class="rakam-item"><div class="rakam-buyuk">%99.5</div><div>Uptime</div></div>' +
    '<div class="rakam-item"><div class="rakam-buyuk">7/24</div><div>Cloud Erişim</div></div>' +
    '</div>' +

    '<div class="yasal-iletisim" style="margin-top:24px"><strong>EMD Yazılım</strong> — Türkiye\'de geliştirilmiştir 🇹🇷<br>iletisim@lexbase.app</div>' +
    '</div>';
}

function sayfaBlog() {
  return '<div class="yasal-icerik sayfa-icerik">' +
    '<p class="sayfa-tanitim">Hukuk teknolojisi, büro yönetimi ve sektör trendleri hakkında içerikler.</p>' +

    '<div class="blog-liste">' +

    '<article class="blog-kart">' +
    '<div class="blog-tarih">5 Mart 2026</div>' +
    '<h3>Avukatlar İçin Dijital Dönüşüm: Nereden Başlamalı?</h3>' +
    '<p>Dijital dönüşüm artık büyük kurumsal hukuk ofislerinin değil, her ölçekten büronun gündeminde. Peki bir avukat olarak bu dönüşüme nereden başlamalısınız? Dosya yönetiminden müvekkil takibine, faturalama süreçlerinden duruşma takvimine kadar dijitalleşme adımlarını inceliyoruz.</p>' +
    '<span class="blog-etiket">Dijital Dönüşüm</span>' +
    '</article>' +

    '<article class="blog-kart">' +
    '<div class="blog-tarih">20 Şubat 2026</div>' +
    '<h3>Hukuk Bürosunda Finansal Yönetim: Kârlılık Nasıl Ölçülür?</h3>' +
    '<p>Bir hukuk bürosunun kârlılığını sadece gelir-gider farkına bakarak ölçmek yeterli değildir. Dosya bazlı kârlılık, müvekkil bazlı kârlılık ve beklenen gelir analizi gibi metriklerin nasıl takip edilebileceğini inceliyoruz.</p>' +
    '<span class="blog-etiket">Finans</span>' +
    '</article>' +

    '<article class="blog-kart">' +
    '<div class="blog-tarih">8 Şubat 2026</div>' +
    '<h3>KVKK ve Avukatlar: Veri Sorumlusu Olarak Yükümlülükleriniz</h3>' +
    '<p>Avukatlar, müvekkil verilerini işleyen veri sorumluları olarak KVKK kapsamında önemli yükümlülükler taşımaktadır. Aydınlatma yükümlülüğünden veri güvenliği tedbirlerine, VERBİS kaydından veri ihlali bildirimine kadar bilmeniz gerekenleri özetliyoruz.</p>' +
    '<span class="blog-etiket">KVKK</span>' +
    '</article>' +

    '<article class="blog-kart">' +
    '<div class="blog-tarih">15 Ocak 2026</div>' +
    '<h3>Bulut Tabanlı Hukuk Yazılımlarında Güvenlik: Nelere Dikkat Etmeli?</h3>' +
    '<p>Avukat-müvekkil gizliliği, hukuk mesleğinin temel taşıdır. Bulut tabanlı yazılımlar kullanırken verilerinizin güvenliğini nasıl sağlayabilirsiniz? SSL/TLS şifreleme, erişim kontrolü ve yedekleme stratejilerini tartışıyoruz.</p>' +
    '<span class="blog-etiket">Güvenlik</span>' +
    '</article>' +

    '<article class="blog-kart">' +
    '<div class="blog-tarih">28 Aralık 2025</div>' +
    '<h3>2026\'da Hukuk Teknolojisi Trendleri</h3>' +
    '<p>Yapay zekâ destekli hukuki araştırma, akıllı sözleşme yönetimi, otomatik belge taslakları ve prediktif analitik — 2026\'da hukuk teknolojisi dünyasında öne çıkan trendleri ve Türkiye\'ye olası yansımalarını değerlendiriyoruz.</p>' +
    '<span class="blog-etiket">Trendler</span>' +
    '</article>' +

    '</div>' +
    '<div class="yasal-iletisim" style="margin-top:24px"><strong>Blog yazılarımız yakında tam metin olarak yayında!</strong><br>Bültenimize kayıt olmak için: haber@lexbase.app</div>' +
    '</div>';
}

function sayfaIletisim() {
  return '<div class="yasal-icerik sayfa-icerik">' +
    '<p class="sayfa-tanitim">Sorularınız, önerileriniz veya destek talepleriniz için bize ulaşın.</p>' +

    '<div class="iletisim-grid">' +

    '<div class="iletisim-kart">' +
    '<div class="iletisim-ikon">📧</div>' +
    '<h3>E-posta</h3>' +
    '<p>Genel sorular ve destek talepleri</p>' +
    '<a href="mailto:info@lexbase.app" class="iletisim-link">info@lexbase.app</a>' +
    '</div>' +

    '<div class="iletisim-kart">' +
    '<div class="iletisim-ikon">🛡️</div>' +
    '<h3>Teknik Destek</h3>' +
    '<p>Platform kullanımı ve teknik sorunlar</p>' +
    '<a href="mailto:destek@lexbase.app" class="iletisim-link">destek@lexbase.app</a>' +
    '</div>' +

    '<div class="iletisim-kart">' +
    '<div class="iletisim-ikon">🤝</div>' +
    '<h3>İş Birlikleri</h3>' +
    '<p>Baro ortaklıkları ve kurumsal çözümler</p>' +
    '<a href="mailto:satis@lexbase.app" class="iletisim-link">satis@lexbase.app</a>' +
    '</div>' +

    '<div class="iletisim-kart">' +
    '<div class="iletisim-ikon">🐛</div>' +
    '<h3>Hata Bildirimi</h3>' +
    '<p>Hata ve iyileştirme önerileri</p>' +
    '<a href="mailto:destek@lexbase.app" class="iletisim-link">destek@lexbase.app</a>' +
    '</div>' +

    '<div class="iletisim-kart">' +
    '<div class="iletisim-ikon">🔒</div>' +
    '<h3>KVKK & Veri Güvenliği</h3>' +
    '<p>Kişisel veri talepleri ve güvenlik bildirimleri</p>' +
    '<a href="mailto:guvenlik@lexbase.app" class="iletisim-link">guvenlik@lexbase.app</a>' +
    '</div>' +

    '</div>' +

    '<h3>Yanıt Süreleri</h3>' +
    '<table class="yasal-tablo">' +
    '<tr><th>Kanal</th><th>Yanıt Süresi</th></tr>' +
    '<tr><td>Genel sorular</td><td>1 iş günü içinde</td></tr>' +
    '<tr><td>Teknik destek</td><td>4 saat içinde</td></tr>' +
    '<tr><td>Kritik sorunlar (erişim kaybı vb.)</td><td>1 saat içinde</td></tr>' +
    '<tr><td>İş birlikleri</td><td>2 iş günü içinde</td></tr>' +
    '</table>' +

    '<h3>Sosyal Medya</h3>' +
    '<p>Güncellemeler, duyurular ve hukuk teknolojisi içerikleri için bizi sosyal medyada takip edin:</p>' +
    '<div class="sosyal-linkler">' +
    '<span class="sosyal-badge">𝕏 Twitter</span>' +
    '<span class="sosyal-badge">📘 LinkedIn</span>' +
    '<span class="sosyal-badge">📸 Instagram</span>' +
    '</div>' +

    '<div class="yasal-iletisim" style="margin-top:24px"><strong>EMD Yazılım</strong> — Türkiye 🇹🇷<br>Mesai saatleri: Pazartesi – Cuma, 09:00 – 18:00</div>' +
    '</div>';
}

function sayfaYardimMerkezi() {
  return '<div class="yasal-icerik sayfa-icerik">' +
    '<p class="sayfa-tanitim">LexBase\'i en verimli şekilde kullanmanız için kapsamlı rehberler ve sıkça sorulan sorular.</p>' +

    '<h3>🚀 Hızlı Başlangıç</h3>' +
    '<div class="yardim-adimlar">' +
    '<div class="yardim-adim">' +
    '<div class="adim-no">1</div>' +
    '<div><strong>Hesap Oluşturun</strong><p>Kayıt formunu doldurun, e-posta doğrulamasını tamamlayın ve büro bilgilerinizi girin.</p></div>' +
    '</div>' +
    '<div class="yardim-adim">' +
    '<div class="adim-no">2</div>' +
    '<div><strong>Müvekkil Ekleyin</strong><p>Sol menüden "Müvekkillerim" sekmesine giderek ilk müvekkilinizi oluşturun.</p></div>' +
    '</div>' +
    '<div class="yardim-adim">' +
    '<div class="adim-no">3</div>' +
    '<div><strong>Dosya Açın</strong><p>Müvekkile bağlı dava, icra veya danışmanlık dosyası oluşturun. Duruşma tarihlerini ekleyin.</p></div>' +
    '</div>' +
    '<div class="yardim-adim">' +
    '<div class="adim-no">4</div>' +
    '<div><strong>Finans Takibi Başlatın</strong><p>Ücret sözleşmesini tanımlayın, tahsilatları ve büro giderlerini kaydedin.</p></div>' +
    '</div>' +
    '</div>' +

    '<h3>❓ Sıkça Sorulan Sorular</h3>' +

    '<div class="sss-liste">' +

    '<details class="sss-item">' +
    '<summary>Verilerim güvende mi?</summary>' +
    '<p>Evet. LexBase, SSL/TLS şifreleme, bcrypt şifre hashleme, Row Level Security ve Cloudflare DDoS koruması gibi endüstri standardı güvenlik önlemleri kullanmaktadır. Verileriniz SOC 2 ve ISO 27001 sertifikalı altyapıda saklanır.</p>' +
    '</details>' +

    '<details class="sss-item">' +
    '<summary>Mobil cihazdan kullanabilir miyim?</summary>' +
    '<p>Evet. LexBase, Progressive Web App (PWA) teknolojisi ile geliştirilmiştir. Telefonunuzun tarayıcısından <strong>lexbase.app</strong> adresine giderek "Ana Ekrana Ekle" seçeneği ile uygulama gibi kullanabilirsiniz.</p>' +
    '</details>' +

    '<details class="sss-item">' +
    '<summary>Deneme süresi ne kadar?</summary>' +
    '<p>LexBase, tüm yeni kullanıcılara tüm özelliklerin açık olduğu ücretsiz deneme süresi sunmaktadır. Süre dolduğunda, ihtiyacınıza uygun bir plan seçerek devam edebilirsiniz.</p>' +
    '</details>' +

    '<details class="sss-item">' +
    '<summary>Birden fazla avukat kullanabilir mi?</summary>' +
    '<p>Profesyonel ve Kurumsal planlarda ekip desteği mevcuttur. Büro sahibi, diğer avukatlar için hesap oluşturabilir ve yetkilendirme yapabilir.</p>' +
    '</details>' +

    '<details class="sss-item">' +
    '<summary>Verilerimi dışa aktarabilir miyim?</summary>' +
    '<p>Evet. Müvekkil, dosya ve finans verilerinizi dilediğiniz zaman dışa aktarabilirsiniz. Hesap kapatma durumunda 90 gün boyunca verilerinize erişim sağlanır.</p>' +
    '</details>' +

    '<details class="sss-item">' +
    '<summary>İnternet olmadan çalışır mı?</summary>' +
    '<p>LexBase, Service Worker teknolojisi ile temel işlevleri çevrimdışı kullanılabilir. Veriler cihazınızda da yerel olarak saklanır. İnternet bağlantısı geldiğinde otomatik senkronizasyon yapılır.</p>' +
    '</details>' +

    '<details class="sss-item">' +
    '<summary>UYAP entegrasyonu var mı?</summary>' +
    '<p>UYAP entegrasyonu şu anda geliştirme aşamasındadır. İlk etapta dosya bilgilerinin UYAP\'tan otomatik çekilmesi planlanmaktadır. Gelişmeler blog ve uygulama içi bildirimler aracılığıyla duyurulacaktır.</p>' +
    '</details>' +

    '<details class="sss-item">' +
    '<summary>Plan değişikliği nasıl yapılır?</summary>' +
    '<p>Ayarlar > Abonelik bölümünden planınızı yükseltebilir veya düşürebilirsiniz. Plan yükseltme anında, düşürme ise dönem sonunda geçerli olur.</p>' +
    '</details>' +

    '</div>' +

    '<div class="yasal-iletisim" style="margin-top:24px"><strong>Daha fazla yardım mı gerekiyor?</strong><br>destek@lexbase.app adresine yazın — en kısa sürede yanıtlayalım.</div>' +
    '</div>';
}

function sayfaCerezAyarlari() {
  var mevcutTercih = localStorage.getItem('lb_consent');
  var tercihMetni = !mevcutTercih ? 'Henüz tercih yapılmadı' : (mevcutTercih === 'kabul' ? 'Tümü kabul edildi' : 'Yalnızca zorunlu çerezler');
  var tercihRenk = !mevcutTercih ? 'var(--text-muted)' : (mevcutTercih === 'kabul' ? '#4ade80' : 'var(--gold-light)');

  return '<div class="yasal-icerik sayfa-icerik">' +
    '<p class="sayfa-tanitim">LexBase\'in kullandığı çerezler ve yerel depolama teknolojileri hakkında bilgi edinin ve tercihlerinizi yönetin.</p>' +

    '<div class="cerez-tercih-kutu">' +
    '<div class="cerez-tercih-baslik">Mevcut Tercihiniz</div>' +
    '<div class="cerez-tercih-durum" style="color:' + tercihRenk + '">' + tercihMetni + '</div>' +
    '<div class="cerez-tercih-butonlar">' +
    '<button class="consent-btn consent-btn-kabul" onclick="cerezTercihGuncelle(\'kabul\')" style="font-size:12px;padding:8px 16px;">Tümünü Kabul Et</button>' +
    '<button class="consent-btn consent-btn-zorunlu" onclick="cerezTercihGuncelle(\'zorunlu\')" style="font-size:12px;padding:8px 16px;">Yalnızca Zorunlu</button>' +
    '</div>' +
    '</div>' +

    '<h3>Kullanılan Çerez ve Depolama Teknolojileri</h3>' +
    '<table class="yasal-tablo">' +
    '<tr><th>Teknoloji</th><th>Adı / Anahtarı</th><th>Amacı</th><th>Türü</th><th>Süresi</th></tr>' +
    '<tr>' +
    '<td><strong>localStorage</strong></td>' +
    '<td><code>hukuk_buro_v3</code></td>' +
    '<td>Kullanıcı oturum bilgileri, uygulama verileri ve ayarlar. Uygulamanın çalışması için zorunludur.</td>' +
    '<td>🔴 Zorunlu</td>' +
    '<td>Hesap aktif olduğu sürece</td>' +
    '</tr>' +
    '<tr>' +
    '<td><strong>localStorage</strong></td>' +
    '<td><code>lb_consent</code></td>' +
    '<td>Çerez/veri kullanım tercihinin saklanması.</td>' +
    '<td>🔴 Zorunlu</td>' +
    '<td>Süresiz</td>' +
    '</tr>' +
    '<tr>' +
    '<td><strong>localStorage</strong></td>' +
    '<td><code>sb-*-auth-token</code></td>' +
    '<td>Supabase kimlik doğrulama oturum token\'ı. Cloud senkronizasyon için gereklidir.</td>' +
    '<td>🔴 Zorunlu</td>' +
    '<td>Oturum boyunca</td>' +
    '</tr>' +
    '<tr>' +
    '<td><strong>Çerez (Cookie)</strong></td>' +
    '<td><code>__cf_bm</code></td>' +
    '<td>Cloudflare bot yönetimi — DDoS ve kötü amaçlı trafik koruması.</td>' +
    '<td>🔴 Zorunlu</td>' +
    '<td>30 dakika</td>' +
    '</tr>' +
    '<tr>' +
    '<td><strong>Çerez (Cookie)</strong></td>' +
    '<td><code>__cfruid</code></td>' +
    '<td>Cloudflare yük dengeleme ve istek yönlendirme.</td>' +
    '<td>🔴 Zorunlu</td>' +
    '<td>Oturum boyunca</td>' +
    '</tr>' +
    '<tr>' +
    '<td><strong>Service Worker</strong></td>' +
    '<td><code>lexbase-v13</code></td>' +
    '<td>Çevrimdışı erişim için statik dosyaların (CSS, JS, HTML) önbelleğe alınması.</td>' +
    '<td>🔴 Zorunlu</td>' +
    '<td>Güncellemeye kadar</td>' +
    '</tr>' +
    '<tr>' +
    '<td><strong>Çerez (Cookie)</strong></td>' +
    '<td><code>Google OAuth</code></td>' +
    '<td>Google ile giriş tercih edildiğinde, kimlik doğrulama sürecinde Google tarafından yerleştirilen oturum çerezleri. Yalnızca OAuth akışı sırasında kullanılır.</td>' +
    '<td>🔴 Zorunlu</td>' +
    '<td>Oturum boyunca</td>' +
    '</tr>' +
    '</table>' +

    '<h3>Çerez Türleri Açıklaması</h3>' +
    '<div class="cerez-tur-liste">' +
    '<div class="cerez-tur-item cerez-tur-zorunlu">' +
    '<strong>🔴 Zorunlu Çerezler</strong>' +
    '<p>Platformun temel işlevlerinin çalışması için gerekli olan çerezlerdir. Oturum yönetimi, güvenlik koruması ve kullanıcı tercihleri bu kapsamdadır. Bu çerezler devre dışı bırakılamaz.</p>' +
    '</div>' +
    '<div class="cerez-tur-item cerez-tur-analitik">' +
    '<strong>📊 Analitik Çerezler</strong>' +
    '<p>LexBase şu anda herhangi bir analitik veya izleme çerezi <strong>kullanmamaktadır</strong>. Google Analytics, Facebook Pixel veya benzeri üçüncü taraf izleme araçları bulunmamaktadır.</p>' +
    '</div>' +
    '<div class="cerez-tur-item cerez-tur-reklam">' +
    '<strong>📢 Reklam Çerezleri</strong>' +
    '<p>LexBase herhangi bir reklam çerezi <strong>kullanmamaktadır</strong>. Kullanıcı verileri reklam amacıyla üçüncü taraflarla paylaşılmaz.</p>' +
    '</div>' +
    '</div>' +

    '<h3>Üçüncü Taraf Hizmetleri</h3>' +
    '<table class="yasal-tablo">' +
    '<tr><th>Hizmet</th><th>Çerez Kullanımı</th><th>Amaç</th></tr>' +
    '<tr><td>Cloudflare</td><td>__cf_bm, __cfruid</td><td>CDN, DDoS koruması, güvenlik</td></tr>' +
    '<tr><td>Supabase</td><td>Auth token (localStorage)</td><td>Veritabanı, kimlik doğrulama</td></tr>' +
    '<tr><td>Google</td><td>OAuth oturum çerezleri</td><td>Sosyal giriş kimlik doğrulama (Google ile giriş seçilirse)</td></tr>' +
    '</table>' +
    '<p style="font-size:11px;color:var(--text-muted);margin-top:8px;">Yukarıdaki hizmetler yalnızca platformun çalışması için zorunlu teknik amaçlarla kullanılmaktadır. Hiçbiri pazarlama veya reklam amacı taşımamaktadır.</p>' +

    '<h3>Haklarınız</h3>' +
    '<ul>' +
    '<li>Tarayıcı ayarlarından tüm çerezleri engelleyebilir veya silebilirsiniz. Ancak zorunlu çerezlerin engellenmesi platformun çalışmamasına neden olabilir.</li>' +
    '<li>localStorage verilerini tarayıcınızın Geliştirici Araçları > Uygulama > Yerel Depolama bölümünden inceleyebilir ve silebilirsiniz.</li>' +
    '<li>Tercihlerinizi dilediğiniz zaman bu sayfa üzerinden değiştirebilirsiniz.</li>' +
    '<li>6698 sayılı KVKK kapsamındaki tüm haklarınız saklıdır. Detaylar için <a href="javascript:void(0)" onclick="yasalBelgeAc(\'kvkk\')" style="color:var(--gold)">KVKK Aydınlatma Metni</a>\'ni inceleyebilirsiniz.</li>' +
    '</ul>' +

    '<div class="yasal-iletisim" style="margin-top:24px"><strong>Çerez politikamız hakkında sorularınız için:</strong><br>guvenlik@lexbase.app</div>' +
    '</div>';
}

function cerezTercihGuncelle(tur) {
  localStorage.setItem('lb_consent', tur);
  // Modalı yeniden render et (güncel tercihi göstermek için)
  var icerikEl = document.getElementById('yasal-modal-icerik');
  if (icerikEl) icerikEl.innerHTML = sayfaCerezAyarlari();
}

// ================================================================
// COOKIE / KVKK CONSENT BANNER
// ================================================================
function consentBannerGoster() {
  if (localStorage.getItem('lb_consent')) return;
  var banner = document.createElement('div');
  banner.id = 'consent-banner';
  banner.className = 'consent-banner';
  banner.innerHTML =
    '<div class="consent-text">' +
      '<strong>🍪 Çerez ve Veri Kullanımı</strong>' +
      '<p>LexBase, hizmet sunumu ve güvenlik amacıyla oturum verileri, IP adresi ve cihaz bilgilerini işlemektedir. Detaylar için ' +
      '<a href="javascript:void(0)" onclick="yasalBelgeAc(\'kvkk\')">KVKK Aydınlatma Metni</a> ve ' +
      '<a href="javascript:void(0)" onclick="yasalBelgeAc(\'gizlilik\')">Gizlilik Politikası</a>\'nı inceleyebilirsiniz.</p>' +
    '</div>' +
    '<div class="consent-buttons">' +
      '<button class="consent-btn consent-btn-kabul" onclick="consentKabul(\'kabul\')">Tümünü Kabul Et</button>' +
      '<button class="consent-btn consent-btn-zorunlu" onclick="consentKabul(\'zorunlu\')">Yalnızca Zorunlu</button>' +
    '</div>';
  document.body.appendChild(banner);
  // Animasyonlu gösterim
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      banner.classList.add('visible');
    });
  });
}

function consentKabul(tur) {
  localStorage.setItem('lb_consent', tur);
  var banner = document.getElementById('consent-banner');
  if (banner) {
    banner.classList.add('hiding');
    setTimeout(function() { banner.remove(); }, 400);
  }
}

lpInit();
setTimeout(consentBannerGoster, 800);

// ================================================================
// TAKSİT ÖNİZLEME
// ================================================================
function taksitOnizle(){
  const sayi=parseInt(document.getElementById('an-taksit-sayi')?.value)||0;
  const aralik=parseInt(document.getElementById('an-taksit-aralik')?.value)||1;
  const ucret=parseFloat(document.getElementById('an-taksit-ucret')?.value)||0;
  const bastar=document.getElementById('an-taksit-bastar')?.value;
  const box=document.getElementById('an-taksit-onizle');
  if(!box)return;
  if(!sayi||sayi<2){box.style.display='none';return;}
  const taksitTutar=ucret?Math.round((ucret/sayi)*100)/100:0;
  const aralikAd=aralik===1?'Aylık':aralik===2?'2 Aylık':aralik===3?'Çeyreklik':aralik===6?'Yarıyıllık':'Yıllık';
  let html=`<strong style="color:var(--gold)">${sayi} taksit · ${aralikAd}</strong>`;
  if(ucret)html+=` · Taksit tutarı: <strong style="color:var(--green)">${fmt(taksitTutar)}</strong>`;
  if(bastar&&sayi){
    const d=new Date(bastar);
    const son=new Date(bastar);
    son.setMonth(son.getMonth()+(sayi-1)*aralik);
    html+=`<br>İlk ödeme: <strong>${fmtD(bastar)}</strong> · Son ödeme: <strong>${fmtD(son.toISOString().split('T')[0])}</strong>`;
  }
  box.innerHTML=html;box.style.display='block';
}

// ================================================================
// ANLAŞMA — genişletilmiş change ve save
// ================================================================
function anlasmaChange(){
  const t=document.getElementById('an-tur').value;
  document.getElementById('an-pesin-alanlar').style.display=t==='pesin'?'block':'none';
  document.getElementById('an-taksit-alanlar').style.display=t==='taksit'?'block':'none';
  document.getElementById('an-basari-alanlar').style.display=(t==='basari'||t==='tahsilat')?'block':'none';
  document.getElementById('an-karma-alanlar').style.display=t==='karma'?'block':'none';
}
async function saveAnlasma(){
  const obj=anlasmaCtx.type==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);if(!obj)return;
  const tur=document.getElementById('an-tur').value;
  obj.anlasma={
    tur,
    ucret:tur==='taksit'?parseFloat(document.getElementById('an-taksit-ucret').value)||0:parseFloat(document.getElementById('an-ucret').value)||0,
    otarih:tur==='taksit'?document.getElementById('an-taksit-bastar').value:document.getElementById('an-otarih').value,
    taksitSayi:tur==='taksit'?parseInt(document.getElementById('an-taksit-sayi').value)||0:0,
    taksitAralik:tur==='taksit'?parseInt(document.getElementById('an-taksit-aralik').value)||1:1,
    yuzde:parseFloat(document.getElementById('an-yuzde').value)||0,
    baz:parseFloat(document.getElementById('an-baz').value)||0,
    karmaP:parseFloat(document.getElementById('an-karma-pesin').value)||0,
    karmaYuzde:parseFloat(document.getElementById('an-karma-yuzde').value)||0,
    not:document.getElementById('an-not').value.trim(),
  };
  const hedefTablo=anlasmaCtx.type==='dava'?'davalar':'icra';

  // Sözleşme ücreti → avans kaydı
  var avansKayit=null;
  const ucret=obj.anlasma.ucret;
  if(ucret>0){
    const muvId=obj.muvId||obj.muvid;
    const dosyaNo=obj.no||obj.konu||'Dosya';
    const mevcutIdx=state.avanslar.findIndex(a=>a.kaynak===obj.id&&a.tur==='Sözleşme Ücreti');
    avansKayit={id:mevcutIdx>=0?state.avanslar[mevcutIdx].id:uid(),muvId,tur:'Sözleşme Ücreti',aciklama:`${dosyaNo} — Ücret Anlaşması`,tutar:ucret,tarih:obj.anlasma.otarih||today(),durum:'Bekliyor',kaynak:obj.id,kaynakTur:anlasmaCtx.type};
  }

  if (typeof LexSubmit !== 'undefined') {
    var btn=document.querySelector('#anlasma-modal .btn-gold');
    var ok=await LexSubmit.formKaydet({ tablo:hedefTablo, kayit:obj, modalId:'anlasma-modal', butonEl:btn, basariMesaj:'✓ Ücret anlaşması kaydedildi',
      renderFn:function(){
        if(avansKayit){
          var mi=state.avanslar.findIndex(a=>a.id===avansKayit.id);
          if(mi>=0)state.avanslar[mi]=avansKayit;else state.avanslar.push(avansKayit);
          LexSubmit.kaydet('avanslar', avansKayit);
        }
        if(anlasmaCtx.type==='dava') try{renderDavaTabContent('anlasma');}catch(e){}
        else try{renderIcraTabContent('anlasma');}catch(e){}
        refreshFinansViews({dosyaTur:anlasmaCtx.type, dosyaId:anlasmaCtx.type==='dava'?aktivDavaId:aktivIcraId});
      }
    });
    if(!ok) return;
  } else {
    if(avansKayit){
      var mi2=state.avanslar.findIndex(a=>a.id===avansKayit.id);
      if(mi2>=0)state.avanslar[mi2]=avansKayit;else state.avanslar.push(avansKayit);
    }
    closeModal('anlasma-modal');saveData();
    if(anlasmaCtx.type==='dava'){renderDavaTabContent('anlasma');renderDdCards(getDava(aktivDavaId));}
    else{renderIcraTabContent('anlasma');renderIdCards(getIcra(aktivIcraId));}
    renderDashboard(); notify('✓ Ücret anlaşması kaydedildi');
  }
}
function openAnlasmaModal(ctx){
  anlasmaCtx={type:ctx};
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;
  const an=obj.anlasma||{};
  document.getElementById('an-tur').value=an.tur||'pesin';anlasmaChange();
  document.getElementById('an-ucret').value=an.tur!=='taksit'?(an.ucret||''):'';
  document.getElementById('an-otarih').value=an.tur!=='taksit'?(an.otarih||today()):today();
  document.getElementById('an-taksit-ucret').value=an.tur==='taksit'?(an.ucret||''):'';
  document.getElementById('an-taksit-bastar').value=an.tur==='taksit'?(an.otarih||today()):today();
  document.getElementById('an-taksit-sayi').value=an.taksitSayi||'';
  document.getElementById('an-taksit-aralik').value=an.taksitAralik||1;
  document.getElementById('an-yuzde').value=an.yuzde||'';
  document.getElementById('an-baz').value=an.baz||'';
  document.getElementById('an-karma-pesin').value=an.karmaP||'';
  document.getElementById('an-karma-yuzde').value=an.karmaYuzde||'';
  document.getElementById('an-not').value=an.not||'';
  document.getElementById('anlasma-modal').classList.add('open');
  taksitOnizle();
}

// ================================================================
// ANLAŞMA TAB — taksit detayı göster
// ================================================================
function renderAnlasmaTab(ctx,obj){
  const an=obj.anlasma||{};
  const deger=ctx==='icra'?(obj.alacak||0):(obj.deger||0);
  const turLabels={pesin:'Peşin Sabit Ücret',taksit:'Taksitli Ücret',basari:'Başarı Primi (%)',tahsilat:'Tahsilat Payı (%)',karma:'Karma (Peşin + %)'};
  const hesaplananHakediş=calcHakedisToplam(obj);
  let html=`<div class="section"><div class="section-header"><div class="section-title">🤝 Ücret Anlaşması Koşulları</div><button class="btn btn-gold btn-sm" onclick="openAnlasmaModal('${ctx}')">✏ Düzenle</button></div><div class="section-body">`;
  if(!an.tur){
    html+=`<div class="empty"><div class="empty-icon">🤝</div><p>Henüz anlaşma koşulları girilmedi</p><div style="margin-top:12px"><button class="btn btn-gold btn-sm" onclick="openAnlasmaModal('${ctx}')">+ Anlaşma Ekle</button></div></div>`;
  } else {
    let aciklama='';
    if(an.tur==='pesin') aciklama=`Sabit ücret: ${fmt(an.ucret||0)}`;
    else if(an.tur==='taksit') aciklama=`${fmt(an.ucret||0)} — ${an.taksitSayi||'?'} taksit × ${an.taksitAralik===1?'Aylık':an.taksitAralik+'lı'} = Taksit: ${fmt(Math.round((an.ucret||0)/(an.taksitSayi||1)*100)/100)}`;
    else if(an.tur==='basari'||an.tur==='tahsilat') aciklama=`%${an.yuzde||0} × ${fmt(an.baz||deger)} = ${fmt(hesaplananHakediş)}`;
    else if(an.tur==='karma') aciklama=`Peşin ${fmt(an.karmaP||0)} + %${an.karmaYuzde||0} × ${fmt(an.baz||deger)} = ${fmt(hesaplananHakediş)}`;
    html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
      <div class="hakediş-box"><div class="hakediş-label">Anlaşma Türü</div><div class="hakediş-value" style="font-size:17px;color:var(--gold-light)">${turLabels[an.tur]||an.tur}</div></div>
      <div class="hakediş-box" style="border-color:var(--gold)"><div class="hakediş-label">Toplam Ücret</div><div class="hakediş-value" style="color:var(--gold)">${fmt(an.ucret||hesaplananHakediş)}</div><div style="font-size:10px;color:var(--text-dim);margin-top:4px">${aciklama}</div></div>
      ${an.tur==='taksit'?`
        <div class="hakediş-box"><div class="hakediş-label">Taksit Sayısı</div><div class="hakediş-value">${an.taksitSayi||'—'} Taksit</div></div>
        <div class="hakediş-box"><div class="hakediş-label">Taksit Aralığı</div><div class="hakediş-value">${an.taksitAralik===1?'Aylık (her ay)':an.taksitAralik===2?'2 Aylık':an.taksitAralik===3?'Çeyreklik':an.taksitAralik===6?'Yarıyıllık':'Yıllık'}</div></div>
        <div class="hakediş-box"><div class="hakediş-label">Taksit Tutarı</div><div class="hakediş-value" style="color:var(--green)">${fmt(Math.round((an.ucret||0)/(an.taksitSayi||1)*100)/100)}</div></div>
        ${an.otarih?`<div class="hakediş-box"><div class="hakediş-label">İlk Ödeme</div><div class="hakediş-value" style="font-size:15px">${fmtD(an.otarih)}</div></div>`:''}
      `:''}
      ${an.tur==='pesin'&&an.otarih?`<div class="hakediş-box"><div class="hakediş-label">Ödeme Vadesi</div><div class="hakediş-value" style="font-size:15px">${fmtD(an.otarih)}</div></div>`:''}
      ${(an.tur==='basari'||an.tur==='tahsilat')&&an.yuzde?`<div class="hakediş-box"><div class="hakediş-label">Oran</div><div class="hakediş-value">%${an.yuzde}</div></div>`:''}
      ${an.tur==='karma'?`<div class="hakediş-box"><div class="hakediş-label">Peşin Kısım</div><div class="hakediş-value">${fmt(an.karmaP||0)}</div></div><div class="hakediş-box"><div class="hakediş-label">Tahsilat Payı</div><div class="hakediş-value">%${an.karmaYuzde||0}</div></div>`:''}
    </div>
    ${an.not?`<div style="background:var(--surface2);border-radius:var(--radius);padding:12px 14px;font-size:12px;color:var(--text-muted);line-height:1.6;white-space:pre-wrap;margin-bottom:14px">${an.not}</div>`:''}
    <div style="padding:12px 14px;background:var(--gold-dim);border:1px solid var(--gold);border-radius:var(--radius);font-size:12px;color:var(--gold-light)">
      💡 Tahsilat ve hakediş hareketlerini kaydetmek için <strong>Tahsilat & Hakediş</strong> sekmesini kullanın.
    </div>`;
  }
  html+='</div></div>';
  return html;
}

// ================================================================
// NOTLAR — KLASÖRLÜ SİSTEM
// ================================================================
const NOT_TURLERI=[
  {tur:'Çalışma Notu',      renk:'var(--gold)',    icon:'📋'},
  {tur:'Müvekkil Görüşme Notu',renk:'var(--blue)', icon:'💬'},
  {tur:'Duruşma Notu',      renk:'var(--green)',   icon:'⚖️'},
  {tur:'Strateji Notu',     renk:'#C9A84C',        icon:'🧠'},
  {tur:'Genel Not',         renk:'var(--text-dim)',icon:'📝'},
];
let _acikNotKlasorler={};


function toggleNotKlasor(ctx,tur){
  const key=ctx+'_'+tur;
  _acikNotKlasorler[key]=!_acikNotKlasorler[key];
  if(ctx==='dava')renderDavaTabContent('notlar');
  else renderIcraTabContent('notlar');
}
function openNotModal(ctx){
  notModalCtx={type:ctx,editId:null};
  document.getElementById('not-modal-title').textContent='📝 Not Ekle';
  document.getElementById('not-tur').value='Çalışma Notu';
  document.getElementById('not-tarih').value=today();
  document.getElementById('not-icerik').value='';
  document.getElementById('not-edit-id').value='';
  document.getElementById('not-modal').classList.add('open');
}
function openNotDuzenle(id,ctx){
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;
  const n=(obj.notlar||[]).find(x=>x.id===id);
  if(!n)return;
  notModalCtx={type:ctx,editId:id};
  document.getElementById('not-modal-title').textContent='✏ Notu Düzenle';
  document.getElementById('not-tur').value=n.tur;
  document.getElementById('not-tarih').value=n.tarih;
  document.getElementById('not-icerik').value=n.icerik;
  document.getElementById('not-edit-id').value=id;
  document.getElementById('not-modal').classList.add('open');
}
function saveNot(){
  const icerik=document.getElementById('not-icerik').value.trim();
  if(!zorunluKontrol([{id:'not-icerik',deger:icerik,label:'Not içeriği'}])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  const ctx=notModalCtx.type;
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;
  if(!obj.notlar)obj.notlar=[];
  const editId=document.getElementById('not-edit-id').value;
  if(editId){
    const idx=obj.notlar.findIndex(n=>n.id===editId);
    if(idx>=0)obj.notlar[idx]={...obj.notlar[idx],tur:document.getElementById('not-tur').value,tarih:document.getElementById('not-tarih').value,icerik};
    notify('✓ Not güncellendi');
  } else {
    const n={id:uid(),tur:document.getElementById('not-tur').value,tarih:document.getElementById('not-tarih').value,icerik};
    obj.notlar.push(n);
    // Yeni notun klasörünü otomatik aç
    _acikNotKlasorler[ctx+'_'+n.tur]=true;
    notify('✓ Not eklendi');
  }
  document.getElementById('not-icerik').value='';
  closeModal('not-modal');saveData();
  // Not kaydı sonrası ilgili sekmeyi yenile
  if(notModalCtx.type==='dava'){try{renderDavaTabContent('notlar');}catch(e){}}
  else if(notModalCtx.type==='icra'){try{renderIcraTabContent('notlar');}catch(e){}}
  if(ctx==='dava')renderDavaTabContent('notlar');else renderIcraTabContent('notlar');
}
function delNot(id,ctx){
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;obj.notlar=(obj.notlar||[]).filter(n=>n.id!==id);
  saveData();
  if(ctx==='dava')renderDavaTabContent('notlar');else renderIcraTabContent('notlar');
  notify('Silindi');
}

// ================================================================
// DASHBOARD — anlaşma alacaklarını göster
// ================================================================
const _origRenderDashboard=typeof renderDashboard==='function'?renderDashboard:null;
function patchDashAlacaklar(){
  const al=[...state.avanslar.filter(a=>a.durum==='Bekliyor')];
  const da=document.getElementById('dash-alacaklar');if(!da)return;
  if(!al.length){da.innerHTML='<div class="empty"><div class="empty-icon">💸</div><p>Bekleyen alacak yok</p></div>';return;}
  da.innerHTML=al.map(a=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:12px;font-weight:600">${getMuvAd(a.muvId)||'—'}</div>
        <div style="font-size:10px;color:var(--text-muted)">${a.tur} · ${a.aciklama||''} · ${fmtD(a.tarih)}</div>
      </div>
      <span style="color:#e74c3c;font-weight:700;font-size:12px">${fmt(a.tutar)}</span>
    </div>`).join('');
}

// ================================================================
// ARABULUCULUK
// ================================================================
const ARAB_DURUM_STIL={
  'Başvuru Yapıldı':        {bg:'var(--blue-dim)',    bdr:'var(--blue)',    txt:'var(--blue)',    icon:'📨'},
  'İlk Toplantı Bekleniyor':{bg:'rgba(230,126,34,.15)',bdr:'#e67e22',      txt:'#e67e22',        icon:'⏳'},
  'Görüşmeler Devam Ediyor':{bg:'var(--gold-dim)',    bdr:'var(--gold)',    txt:'var(--gold)',    icon:'🔄'},
  'Uzlaşma Sağlandı':       {bg:'var(--green-dim)',   bdr:'var(--green)',   txt:'var(--green)',   icon:'✅'},
  'Uzlaşma Sağlanamadı':    {bg:'var(--red-dim)',     bdr:'var(--red)',     txt:'var(--red)',     icon:'❌'},
  'Dava Açıldı':            {bg:'rgba(142,68,173,.15)',bdr:'#C9A84C',      txt:'#C9A84C',        icon:'⚖️'},
};
function arabDurumBadge(d){
  const s=ARAB_DURUM_STIL[d]||{bg:'var(--surface2)',bdr:'var(--border)',txt:'var(--text-muted)',icon:'•'};
  return`<span class="arab-durum-badge" style="background:${s.bg};border:1px solid ${s.bdr};color:${s.txt}">${s.icon} ${d}</span>`;
}

let aktivArabId=null;

function getArab(id){return(state.arabuluculuk||[]).find(a=>a.id===id);}