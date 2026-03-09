// ================================================================
// EMD HUKUK — KIMLIK DOĞRULAMA
// js/modules/auth.js
// ================================================================

function loginTab(tab) {
  document.getElementById('lt-giris').classList.toggle('active', tab==='giris');
  document.getElementById('lt-kayit').classList.toggle('active', tab==='kayit');
  document.getElementById('login-form').style.display = tab==='giris' ? 'block' : 'none';
  document.getElementById('kayit-form').style.display = tab==='kayit' ? 'block' : 'none';
  document.getElementById('login-error').style.display = 'none';
}

function loginHata(msg) {
  const e = document.getElementById('login-error');
  e.textContent = msg; e.style.display = 'block';
}

async function loginYap() {
  const email = document.getElementById('l-email').value.trim();
  const sifre = document.getElementById('l-sifre').value;
  if (!email || !sifre) return loginHata('E-posta ve şifre gerekli.');
  const btn = document.getElementById('login-btn');
  btn.textContent = 'Giriş yapılıyor...'; btn.disabled = true;
  try {
    await sbGirisYap(email, sifre);
    // onAuthStateChange SIGNED_IN eventi sbVeriYukle'yi tetikleyecek
    btn.textContent = 'Giriş Yap'; btn.disabled = false;
  } catch(e) {
    btn.textContent = 'Giriş Yap'; btn.disabled = false;
    loginHata('E-posta veya şifre hatalı.');
  }
}

async function kayitOl() {
  const ad = document.getElementById('k-ad').value.trim();
  const email = document.getElementById('k-email').value.trim();
  const sifre = document.getElementById('k-sifre').value;
  const buroAd = document.getElementById('k-buro').value.trim();
  if (!ad || !email || !sifre) return loginHata('Ad, e-posta ve şifre gerekli.');
  if (sifre.length < 8) return loginHata('Şifre en az 8 karakter olmalı.');
  const btn = document.getElementById('kayit-btn');
  btn.textContent = 'Kayıt yapılıyor...'; btn.disabled = true;
  try {
    const kayitData = await sbKayitOl(email, sifre, ad, buroAd);
    btn.textContent = 'Kayıt Ol & Başla'; btn.disabled = false;
    loginHata('✅ Kayıt başarılı! E-postanızı doğrulayın, ardından giriş yapın.');
  } catch(e) {
    btn.textContent = 'Kayıt Ol & Başla'; btn.disabled = false;
    if (e.message && e.message.includes('already registered')) loginHata('Bu e-posta zaten kayıtlı. Giriş yapın.');
    else loginHata('Hata: ' + (e.message || e));
    return; // hata varsa admin kaydı yapma
  }
  // Admin DB'ye yeni müşteri kaydını arka planda gönder (try/catch dışında — her zaman çalışsın)
  try {
    if (typeof adminMusteriKayit === 'function') {
      adminMusteriKayit({
        id:       crypto.randomUUID(),
        ad_soyad: ad,
        email:    email,
        buro_ad:  buroAd,
      });
    }
  } catch(e2) { console.warn('adminMusteriKayit hata:', e2); }
}

function sifreSifirla() {
  gmSifreSifirlama();
}

async function cikisYap() {
  if (typeof adminCikisLog === "function") adminCikisLog();
  // Destek bildirim interval'ı durdur
  if (typeof destekBildirimDurdur === 'function') destekBildirimDurdur();
  // ── Kullanıcı veri izolasyonu ──
  // Mevcut kullanıcının TÜM verilerini kendi anahtarına yedekle,
  // sonra ana anahtarı temizle → yeni giren kullanıcı hiçbir veriyi göremez
  try {
    var email = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.email : '';
    if (email) {
      var mevcutVeri = localStorage.getItem(SK);
      if (mevcutVeri) {
        localStorage.setItem(SK + '_user_' + email, mevcutVeri);
      }
    }
    // Ana anahtarı tamamen temizle
    localStorage.removeItem(SK);
  } catch(e) {}
  // Global değişkenleri sıfırla (sayfa yenilemesiz geçiş için)
  aktivMuvId = null; aktivDavaId = null; aktivIcraId = null;
  await sbCikisYap();
  // onAuthStateChange SIGNED_OUT eventi gerisini halleder
}

function uygulamayiBaslatLocal() {
  const unEl = document.getElementById('header-user-ad');
  if (unEl) unEl.textContent = currentUser.ad_soyad;
  const buroEl = document.getElementById('avukat-adi');
  if (buroEl) buroEl.textContent = currentUser.buro_ad || 'Yönetim Sistemi';
  const loginEl = document.getElementById('login-screen');
  if (loginEl) loginEl.classList.add('hidden');
  const ls = document.getElementById('landing-screen');
  if (ls) ls.classList.add('hidden');
  const app = document.getElementById('app-wrapper');
  if (app) app.classList.add('visible');
  temaYukle(); yetkiMenuGuncelle();
  planBilgisiGuncelle();
  renderMuvekkillar(); renderDavalar(); renderDavaCards(); renderIcra(); renderIcraCards();
  renderButce(); renderDanismanlik(); renderDashboard(); updateBadges();
  if (typeof renderIhtarname === 'function') renderIhtarname();
  if (typeof renderTodo === 'function') renderTodo();
  if (typeof Bildirim !== 'undefined') Bildirim.baslat();
  addAktiviteLog('Giriş Yapıldı', currentUser.ad_soyad, 'Genel');
  // Destek yanıt bildirimi (periyodik kontrol)
  if (typeof destekBildirimBaslat === 'function') destekBildirimBaslat();
  // Admin entegrasyon (sessizce, arka planda)
  if (currentUser.rol === 'sahip') {
    if (typeof adminGirisLog === "function") adminGirisLog(currentUser);
    setTimeout(duyurulariYukle, 2000);
    // Deneme süresi dolmuşsa uyar
    const plan = mevcutPlan();
    if (plan.sureDoldu) setTimeout(() => upgradeGoster('sureDoldu'), 1500);
  }
  // Onboarding hoşgeldin turu (ilk giriş)
  if (typeof Onboarding !== 'undefined' && !Onboarding.tamamlandiMi()) {
    setTimeout(function() { Onboarding.baslat(); }, 1000);
  }
}

// Plan seçim sayfası — header badge tıklanınca
function showPlanSayfasi() {
  const plan = mevcutPlan();
  const kullanim = planKullanim();

  // Basit modal olarak göster
  const mevcut = document.getElementById('upgrade-modal');
  document.getElementById('upg-baslik').textContent = `${plan.ikon} ${plan.ad} Planı`;

  let denemeMetni = '';
  if (plan.id === 'deneme') {
    try {
      const d = JSON.parse(localStorage.getItem(SK)||'{}');
      const gun = Math.ceil((Date.now() - new Date(d.olusturmaTarih||Date.now())) / (1000*60*60*24));
      const kalan = Math.max(0, 30 - gun);
      denemeMetni = kalan > 0 ? `Deneme süreniz: ${kalan} gün kaldı` : '⚠️ Deneme süreniz doldu!';
    } catch(e) {}
  }

  const limitBar = (sayi, limit) => {
    if (limit === Infinity) return '<span style="color:var(--green)">Sınırsız</span>';
    const oran = Math.min(sayi / limit, 1);
    const renk = oran > 0.9 ? 'var(--red)' : oran > 0.7 ? 'var(--orange)' : 'var(--green)';
    return `<div style="display:flex;align-items:center;gap:8px">
      <div style="flex:1;background:var(--surface2);border-radius:10px;height:6px;overflow:hidden">
        <div style="width:${(oran*100).toFixed(0)}%;height:100%;background:${renk};border-radius:10px"></div>
      </div>
      <span style="font-size:11px;color:${renk};min-width:60px;text-align:right">${sayi} / ${limit}</span>
    </div>`;
  };

  document.getElementById('upg-detay').innerHTML = `
    <div style="background:var(--surface2);border-radius:8px;padding:14px;margin:12px 0;text-align:left">
      ${denemeMetni ? `<div style="color:var(--orange);font-weight:600;margin-bottom:10px">${denemeMetni}</div>` : ''}
      <div style="font-size:12px;margin-bottom:8px;font-weight:700;color:var(--text-muted)">KULLANIM DURUMU</div>
      <div style="margin-bottom:8px"><div style="font-size:12px;margin-bottom:4px;display:flex;justify-content:space-between"><span>👥 Müvekkil</span></div>${limitBar(kullanim.muvekkil.sayi, kullanim.muvekkil.limit)}</div>
      <div style="margin-bottom:8px"><div style="font-size:12px;margin-bottom:4px">📁 Dava</div>${limitBar(kullanim.dava.sayi, kullanim.dava.limit)}</div>
      <div><div style="font-size:12px;margin-bottom:4px">⚡ İcra</div>${limitBar(kullanim.icra.sayi, kullanim.icra.limit)}</div>
    </div>`;

  document.getElementById('upg-mevcut-plan').textContent = `Mevcut: ${plan.ad}`;
  renderUpgradePlanlar(plan.id);
  mevcut.classList.add('open');
}

function yetkiMenuGuncelle() {
  if (!currentUser || currentUser.rol === 'sahip') return;
  const menuMap = { 'ni-muvekkillar':'muv_goruntule','ni-davalar':'dav_goruntule','ni-icra':'icr_goruntule','ni-butce':'fin_goruntule','ni-danismanlik':'dan_goruntule','ni-takvim':'tak_goruntule','ni-personel':'per_goruntule' };
  Object.entries(menuMap).forEach(([menuId, yetkiId]) => { const el = document.getElementById(menuId); if(el) el.style.display = yetkiGoruntule(yetkiId) ? '' : 'none'; });
}

// Supabase kayıt fonksiyonları — gerçek implementasyon
async function saveToSupabase(tablo, kayit) {
  if (!currentBuroId) return;
  try {
    const stateToTable = { 'karsiTaraflar': 'karsi_taraflar' };
    const gercekTablo = stateToTable[tablo] || tablo;
    const { id, ...data } = kayit;
    const { error } = await sb.from(gercekTablo).upsert({
      id,
      buro_id: currentBuroId,
      data
    });
    if (error) console.warn(`saveToSupabase ${tablo}:`, error.message);
  } catch(e) { console.warn('saveToSupabase hata:', e.message); }
}

async function deleteFromSupabase(tablo, id) {
  if (!currentBuroId) return;
  try {
    const stateToTable = { 'karsiTaraflar': 'karsi_taraflar' };
    const gercekTablo = stateToTable[tablo] || tablo;
    const { error } = await sb.from(gercekTablo).delete().eq('id', id).eq('buro_id', currentBuroId);
    if (error) console.warn(`deleteFromSupabase ${tablo}:`, error.message);
  } catch(e) { console.warn('deleteFromSupabase hata:', e.message); }
}

async function loadDataFromSupabase() {}

// Sayfa açılışında e-postayı doldur
(function() {
  try {
    const d = localStorage.getItem('hukuk_buro_v3');
    if (d) { const p = JSON.parse(d); if(p.sahipEmail) { const el = document.getElementById('l-email'); if(el) el.value = p.sahipEmail; } }
  } catch(e) {}
})();

// ================================================================
// YEDEKLEMe SİSTEMİ
// ================================================================

// Yedek istatistiklerini göster
function yedekIstatistikGoster() {
  const el = document.getElementById('yedek-istatistik');
  if (!el) return;
  const istatlar = [
    { ikon:'👥', ad:'Müvekkil', sayi: state.muvekkillar?.length||0 },
    { ikon:'📁', ad:'Dava',     sayi: state.davalar?.length||0 },
    { ikon:'⚡', ad:'İcra',     sayi: state.icra?.length||0 },
    { ikon:'💰', ad:'Bütçe',    sayi: state.butce?.length||0 },
  ];
  el.innerHTML = istatlar.map(i => `
    <div style="background:var(--surface2);border-radius:var(--radius);padding:10px;text-align:center">
      <div style="font-size:18px">${i.ikon}</div>
      <div style="font-size:18px;font-weight:700;color:var(--gold)">${i.sayi}</div>
      <div style="font-size:10px;color:var(--text-muted)">${i.ad}</div>
    </div>`).join('');

  // Son yedek tarihi
  try {
    const sonYedek = localStorage.getItem('son_yedek_tarihi');
    if (sonYedek) {
      document.getElementById('son-yedek-tarih').textContent =
        new Date(sonYedek).toLocaleString('tr-TR');
    }
    const sonYedekBoyut = localStorage.getItem('son_yedek_boyut');
    if (sonYedekBoyut) {
      document.getElementById('son-yedek-boyut').textContent = sonYedekBoyut;
    }
  } catch(e) {}

  // Plan bazlı UI
  const plan = mevcutPlan();
  const bulutKart = document.getElementById('yk-bulut');
  const bulutBadge = document.getElementById('bulut-plan-badge');
  if (plan.id !== 'kurumsal') {
    bulutKart.classList.add('kurumsal-locked');
    if (bulutBadge) {
      bulutBadge.style.background = 'var(--border)';
      bulutBadge.style.color = 'var(--text-muted)';
    }
  } else {
    bulutKart.classList.remove('kurumsal-locked');
    if (bulutBadge) {
      bulutBadge.style.background = '#8e44ad22';
      bulutBadge.style.color = '#9b59b6';
    }
    document.getElementById('bulut-yedekler-wrap').style.display = 'block';
    document.getElementById('bulut-geri-yukle-wrap').style.display = 'block';
    bulutYedekleriListele();
  }
}

// Yedek verisi oluştur
function yedekVerisiOlustur() {
  const veri = {
    _meta: {
      versiyon: '1.0',
      tarih: new Date().toISOString(),
      buro: currentUser?.buro_ad || '',
      email: currentUser?.email || '',
      uygulama: 'EMD Hukuk',
    },
    ...JSON.parse(localStorage.getItem('hukuk_buro_v3') || '{}'),
  };
  return veri;
}

function yedekBoyutuHesapla(veri) {
  const bytes = new Blob([JSON.stringify(veri)]).size;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(2) + ' MB';
}

// ── 1. Cihaza İndir ───────────────────────────────────────────