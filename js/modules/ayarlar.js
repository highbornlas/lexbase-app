// ================================================================
// EMD HUKUK — AYARLAR
// js/modules/ayarlar.js
// ================================================================

function temaAyarla(tema) {
  document.documentElement.setAttribute('data-tema', tema === 'koyu' ? '' : tema);
  localStorage.setItem('hukuk_tema', tema);
  ['koyu','acik','sistem'].forEach(t => {
    const el = document.getElementById('tema-' + t);
    if(el) el.classList.toggle('aktif', t === tema);
  });
}
function temaYukle() {
  const tema = localStorage.getItem('hukuk_tema') || 'koyu';
  temaAyarla(tema);
}
// Sayfa yüklenince temayı hemen uygula
temaYukle();

// ================================================================
// AYARLAR FONKSİYONLARI
// ================================================================
function ayarlarSayfasiDoldur() {
  if (!currentUser) return;
  const ad = currentUser.ad_soyad || '';
  document.getElementById('ayar-avatar').textContent = avatarI(ad);
  document.getElementById('ayar-profil-ad').textContent = ad;
  document.getElementById('ayar-profil-email').textContent = currentUser.email || '';
  const rolAdlar = {sahip:'👑 Büro Sahibi', avukat:'⚖️ Avukat', stajyer:'📚 Stajyer', sekreter:'📋 Sekreter'};
  document.getElementById('ayar-profil-rol').textContent = rolAdlar[currentUser.rol] || '';
  document.getElementById('ayar-ad').value = ad;
  document.getElementById('ayar-email').value = currentUser.email || '';
  document.getElementById('ayar-tel').value = currentUser.telefon || '';
  document.getElementById('ayar-buro-ad').value = currentUser.buro_ad || '';
  document.getElementById('ayar-buro-tel').value = currentUser.buro_tel || '';
  document.getElementById('ayar-buro-mail').value = currentUser.buro_mail || '';
  // Büro adres widget
  if (typeof AdresWidget !== 'undefined') {
    AdresWidget.doldur('buro-adr-', { adres: currentUser.buro_adres || '' });
  }
  // Aktif temayı işaretle
  const tema = localStorage.getItem('hukuk_tema') || 'koyu';
  ['koyu','acik','sistem'].forEach(t => {
    const el = document.getElementById('tema-' + t);
    if(el) el.classList.toggle('aktif', t === tema);
  });
  // Bildirim ayarlarını doldur
  if (typeof Bildirim !== 'undefined') Bildirim.ayarlarRender();
}

async function profilGuncelle() {
  const ad_soyad = document.getElementById('ayar-ad').value.trim();
  const email = document.getElementById('ayar-email').value.trim();
  const telefon = document.getElementById('ayar-tel').value.trim();
  if (!ad_soyad || !email) return notify('⚠️ Ad ve e-posta zorunlu.');
  try {
    // Supabase'de email güncelle
    const { error } = await sb.auth.updateUser({ email });
    if (error) return notify('⚠️ ' + error.message);
    // Profil tablosunu güncelle
    await sb.from('kullanicilar').update({ ad_soyad, telefon }).eq('id', currentUser.id);
    currentUser = { ...currentUser, ad_soyad, email, telefon };
    document.getElementById('header-user-ad').textContent = ad_soyad;
    document.getElementById('ayar-avatar').textContent = avatarI(ad_soyad);
    document.getElementById('ayar-profil-ad').textContent = ad_soyad;
    document.getElementById('ayar-profil-email').textContent = email;
    notify('✅ Profil güncellendi');
  } catch (e) { notify('⚠️ Hata: ' + e.message); }
}

async function sifreDegistir() {
  const yeni = document.getElementById('ayar-sifre-yeni').value;
  const tekrar = document.getElementById('ayar-sifre-tekrar').value;
  if (!yeni || !tekrar) return notify('⚠️ Şifre alanlarını doldurun.');
  if (yeni.length < 6) return notify('⚠️ Şifre en az 6 karakter olmalı.');
  if (yeni !== tekrar) return notify('⚠️ Şifreler eşleşmiyor.');
  try {
    const { error } = await sb.auth.updateUser({ password: yeni });
    if (error) return notify('⚠️ ' + error.message);
    document.getElementById('ayar-sifre-eski').value = '';
    document.getElementById('ayar-sifre-yeni').value = '';
    document.getElementById('ayar-sifre-tekrar').value = '';
    document.getElementById('sifre-guc-bar').style.display = 'none';
    notify('✅ Şifre başarıyla değiştirildi');
  } catch (e) { notify('⚠️ Hata: ' + e.message); }
}

function sifreGucGoster(val) {
  const bar = document.getElementById('sifre-guc-bar');
  const fill = document.getElementById('sifre-guc-fill');
  const lbl = document.getElementById('sifre-guc-lbl');
  if (!val) { bar.style.display = 'none'; return; }
  bar.style.display = 'block';
  const guc = val.length >= 10 && /[A-Z]/.test(val) && /[0-9]/.test(val) ? 'guclu'
    : val.length >= 6 ? 'orta' : 'zayif';
  fill.className = 'sifre-guc sifre-guc-' + guc;
  lbl.textContent = guc === 'guclu' ? '💪 Güçlü şifre' : guc === 'orta' ? '👍 Orta güçlü' : '⚠️ Zayıf şifre';
}

async function buroBilgisiGuncelle() {
  const ad = document.getElementById('ayar-buro-ad').value.trim();
  const telefon = document.getElementById('ayar-buro-tel').value.trim();
  const email = document.getElementById('ayar-buro-mail').value.trim();
  var adresData = typeof AdresWidget !== 'undefined' ? AdresWidget.oku('buro-adr-') : { adres: '' };
  var adres = adresData.adres;
  if (!ad) return notify('⚠️ Büro adı zorunlu.');
  try {
    await sb.from('burolar').update({ ad, telefon, email, adres }).eq('id', currentBuroId);
    currentUser = { ...currentUser, buro_ad: ad, buro_tel: telefon, buro_mail: email, buro_adres: adres };
    const _aaEl = document.getElementById('avukat-adi'); if(_aaEl) _aaEl.textContent = ad;
    notify('✅ Büro bilgileri güncellendi');
  } catch (e) { notify('⚠️ Hata: ' + e.message); }
}

function hesapSilOnay() {
  if (!confirm('⚠️ Hesabınız ve tüm verileriniz kalıcı olarak silinecek.\n\nBu işlem GERİ ALINAMAZ!\n\nDevam etmek istiyor musunuz?')) return;
  const onay = prompt('Silmek istediğinizi onaylamak için "SİL" yazın:');
  if (onay !== 'SİL') return notify('İptal edildi.');
  cikisYap();
}

// ================================================================
// SUPABASE BAĞLANTISI
// ================================================================
// Admin entegrasyonu js/modules/admin.js dosyasındadır