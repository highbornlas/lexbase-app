// ================================================================
// LEXBASE — ADMIN ENTEGRASYON
// js/modules/admin.js
// ================================================================

// ── Admin Supabase Credentials ─────────────────────────────────
// ⚠️ GÜVENLİK UYARISI: Bu anahtarlar client-side'da açıktır.
// ÖNERİ: Admin işlemlerini Supabase Edge Function arkasına taşıyın.
// Row Level Security (RLS) ile sadece yazma izni verin, okuma engelleyin.
// Mevcut RLS kurallarını kontrol edin: admin tablosuna herkes yazabilir mi?
const ADMIN_SB_URL = 'https://ewvbpfsgmjghmbnkuvpx.supabase.co';
const ADMIN_SB_KEY = 'sb_publishable_ccz6M_f4JCnnQzr0auQD7A_-A2YGb91';

// ── Oturum değişkenleri (global) ──────────────────────────────
let _oturumBaslangic = null;
let _oturumLogId     = null;

// ── IP Log Gönderici (Cloudflare Pages Function) ─────────────
// Fire-and-forget: await KULLANILMAZ, ana akışı engellemez
function ipLogGonder(islem) {
  try {
    var email = '';
    var musteriId = '';
    if (typeof currentUser !== 'undefined' && currentUser) {
      email = currentUser.email || '';
      musteriId = currentUser.id || '';
    }
    // Tarayıcı tespiti
    var ua = navigator.userAgent || '';
    var tarayici = 'Bilinmiyor';
    if (ua.indexOf('Edg/') > -1) tarayici = 'Edge';
    else if (ua.indexOf('OPR/') > -1 || ua.indexOf('Opera') > -1) tarayici = 'Opera';
    else if (ua.indexOf('Chrome/') > -1) tarayici = 'Chrome';
    else if (ua.indexOf('Firefox/') > -1) tarayici = 'Firefox';
    else if (ua.indexOf('Safari/') > -1) tarayici = 'Safari';

    // Platform tespiti
    var platform = 'web';
    if (ua.indexOf('Electron') > -1) platform = 'desktop';
    else if (/Mobi|Android|iPhone|iPad/i.test(ua)) platform = 'mobile';

    fetch('/api/log-giris', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        musteri_id: musteriId || null,
        email: email,
        platform: platform,
        ekran: screen.width + 'x' + screen.height,
        user_agent: ua.substring(0, 500),
        tarayici: tarayici,
        islem: islem || 'giris'
      })
    }).catch(function(e) {
      console.warn('[IP Log] Gönderilemedi:', e.message);
    });
  } catch(e) {
    // Sessizce yut — IP log başarısız olursa uygulama etkilenmemeli
  }
}

// ── Yardımcılar ───────────────────────────────────────────────
async function adminSbPost(tablo, data) {
  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) return false;
  try {
    const res = await fetch(`${ADMIN_SB_URL}/rest/v1/${tablo}`, {
      method: 'POST',
      headers: {
        'apikey': ADMIN_SB_KEY,
        'Authorization': `Bearer ${ADMIN_SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      var errText = await res.text().catch(function() { return ''; });
      console.warn(`[Admin] POST ${tablo} hatası: ${res.status}`, errText);
      // RLS hatası ise kullanıcıya anlamlı mesaj
      if (res.status === 401 || res.status === 403 || errText.indexOf('policy') !== -1) {
        console.warn('[Admin] RLS yetkisi eksik — admin projesinde tablo izinlerini kontrol edin.');
      }
      return false;
    }
    return true;
  } catch(e) {
    console.warn(`[Admin] POST ${tablo} ağ hatası:`, e.message);
    return false;
  }
}

async function adminSbUpdate(tablo, id, data) {
  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) return false;
  try {
    const res = await fetch(`${ADMIN_SB_URL}/rest/v1/${tablo}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': ADMIN_SB_KEY,
        'Authorization': `Bearer ${ADMIN_SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      console.warn(`[Admin] PATCH ${tablo} hatası: ${res.status}`, await res.text().catch(()=>''));
      return false;
    }
    // Prefer: return=representation ile Supabase güncellenen satırları döndürür
    // Eğer boş dizi dönerse → RLS engelledi veya id eşleşmedi
    var body = await res.json().catch(function() { return null; });
    if (Array.isArray(body) && body.length === 0) {
      console.warn(`[Admin] PATCH ${tablo} başarısız: satır güncellenemedi (RLS veya id eşleşmedi). id=${id}`);
      return false;
    }
    return true;
  } catch(e) {
    console.warn(`[Admin] PATCH ${tablo} ağ hatası:`, e.message);
    return false;
  }
}

async function adminSbGet(tablo, filtre) {
  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) return [];
  try {
    const res = await fetch(`${ADMIN_SB_URL}/rest/v1/${tablo}?${filtre}&select=*`, {
      headers: { 'apikey': ADMIN_SB_KEY, 'Authorization': `Bearer ${ADMIN_SB_KEY}` }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch(e) { return []; }
}

// ── Yeni kayıt → Admin DB'ye ekle ─────────────────────────────
// auth.js > kayitOl() başarısından sonra çağrılır
async function adminMusteriKayit(musteri) {
  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) return;
  const bugun = new Date().toISOString().slice(0,10);
  const lisBitis = new Date();
  lisBitis.setDate(lisBitis.getDate() + 30);
  await adminSbPost('musteriler', {
    id:                  musteri.id,
    ad_soyad:            musteri.ad_soyad || musteri.ad || '',
    email:               musteri.email || '',
    buro_ad:             musteri.buro_ad  || musteri.buro || '',
    lisans_tur:          'deneme',
    lisans_baslangic:    bugun,
    lisans_bitis:        lisBitis.toISOString().slice(0,10),
    lisans_aktif:        true,
    durum:               'deneme',
    toplam_giris_sayisi: 1,
    son_giris:           new Date().toISOString(),
    kayit_tarihi:        new Date().toISOString(),
  });
}

// ── Giriş → log + son_giris güncelle ──────────────────────────
// uygulamayiBaslat() içinde (sahip rolü) çağrılır
async function adminGirisLog(musteri) {
  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) return;
  _oturumBaslangic = Date.now();
  _oturumLogId = (typeof uid === 'function') ? uid() : crypto.randomUUID();

  // IP log gönder (fire-and-forget — await yok)
  ipLogGonder('giris');

  await adminSbPost('kullanim_log', {
    id:                 _oturumLogId,
    musteri_id:         musteri.id,
    email:              musteri.email,
    giris_tarihi:       new Date().toISOString(),
    dava_sayisi:        (typeof state !== 'undefined') ? (state.davalar?.length    || 0) : 0,
    muvekkil_sayisi:    (typeof state !== 'undefined') ? (state.muvekkillar?.length|| 0) : 0,
    icra_sayisi:        (typeof state !== 'undefined') ? (state.icra?.length       || 0) : 0,
    butce_kayit_sayisi: (typeof state !== 'undefined') ? (state.butce?.length      || 0) : 0,
    uygulama_versiyon:  '1.0.0',
    platform:           navigator.userAgent.includes('Electron') ? 'windows' : 'web',
  });

  // Mevcut giriş sayısını oku, 1 artır
  try {
    const kayitlar = await adminSbGet('musteriler', `id=eq.${musteri.id}`);
    const mevcutSayi = kayitlar?.[0]?.toplam_giris_sayisi || 0;
    await adminSbUpdate('musteriler', musteri.id, {
      son_giris:           new Date().toISOString(),
      toplam_giris_sayisi: mevcutSayi + 1,
    });
  } catch(e) {}
}

// ── Çıkış → oturum süresini kapat ─────────────────────────────
// cikisYap() içinde çağrılır
async function adminCikisLog() {
  if (!_oturumLogId || !_oturumBaslangic) return;
  // IP log gönder (fire-and-forget — await yok)
  ipLogGonder('cikis');
  const sure = Math.round((Date.now() - _oturumBaslangic) / 60000);
  await adminSbUpdate('kullanim_log', _oturumLogId, {
    cikis_tarihi:       new Date().toISOString(),
    sure_dakika:        sure,
    dava_sayisi:        (typeof state !== 'undefined') ? (state.davalar?.length    || 0) : 0,
    muvekkil_sayisi:    (typeof state !== 'undefined') ? (state.muvekkillar?.length|| 0) : 0,
    icra_sayisi:        (typeof state !== 'undefined') ? (state.icra?.length       || 0) : 0,
    butce_kayit_sayisi: (typeof state !== 'undefined') ? (state.butce?.length      || 0) : 0,
  });
  _oturumLogId = null;
  _oturumBaslangic = null;
}

// ── Duyuruları çek ve göster ───────────────────────────────────
// setTimeout(duyurulariYukle, 2000) ile çağrılır
async function duyurulariYukle() {
  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) return;
  try {
    const duyurular = await adminSbGet('duyurular', 'yayinda=eq.true&order=created_at.desc&limit=3');
    if (!duyurular?.length) return;

    const turIcon = { bilgi:'ℹ️', uyari:'⚠️', guncelleme:'🔄', bakim:'🔧' };
    const turRenk = { bilgi:'#2980b9', uyari:'#e67e22', guncelleme:'#27ae60', bakim:'#e74c3c' };
    const okunanlar = JSON.parse(localStorage.getItem('okunan_duyurular') || '[]');

    duyurular.forEach(d => {
      if (okunanlar.includes(d.id)) return;
      const renk = turRenk[d.tur] || '#c9a84c';
      const el = document.createElement('div');
      el.style.cssText = `position:fixed;top:70px;right:16px;background:var(--surface,#141210);border:1px solid ${renk};border-left:4px solid ${renk};border-radius:8px;padding:12px 16px;z-index:9999;max-width:320px;box-shadow:0 4px 20px rgba(0,0,0,.4);animation:slideIn .3s ease`;
      el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div>
          <div style="font-size:13px;font-weight:700;margin-bottom:4px">${turIcon[d.tur]||'📢'} ${d.baslik}</div>
          <div style="font-size:12px;color:var(--text-muted,#8a8278)">${d.icerik.slice(0,120)}${d.icerik.length>120?'…':''}</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;padding:0">×</button>
      </div>`;
      document.body.appendChild(el);
      setTimeout(() => { if (el.parentNode) el.remove(); }, 10000);
      okunanlar.push(d.id);
      localStorage.setItem('okunan_duyurular', JSON.stringify(okunanlar.slice(-50)));
    });
  } catch(e) {}
}

// ── Destek Talebi Gönder ────────────────────────────────────
// Kullanıcı arayüzünden (page-destek) çağrılır
async function destekTalebiGonder() {
  var konu = document.getElementById('destek-konu').value.trim();
  var mesaj = document.getElementById('destek-mesaj').value.trim();
  var tur = document.getElementById('destek-tur').value;
  var oncelik = document.getElementById('destek-oncelik').value;

  if (!konu || !mesaj) {
    notify('Konu ve açıklama zorunludur.', true);
    return;
  }

  var btn = document.getElementById('destek-gonder-btn');
  btn.disabled = true;
  btn.textContent = 'Gönderiliyor...';

  // Kullanıcı bilgilerini topla
  var email = '';
  var musteriId = '';
  try {
    if (typeof currentBuroId !== 'undefined' && currentBuroId) musteriId = currentBuroId;
    if (typeof currentUser !== 'undefined' && currentUser) email = currentUser.email || '';
    if (!email && typeof state !== 'undefined' && state.ayarlar) email = state.ayarlar.email || '';
    if (!email && typeof state !== 'undefined' && state.profil) email = state.profil.email || '';
  } catch(e) {}

  var turEmoji = { sorun: '🐛', ozellik: '💡', soru: '❓', oneri: '📝' };
  var turLabel = { sorun: 'Hata', ozellik: 'Özellik', soru: 'Soru', oneri: 'Öneri' };

  var tamMesaj = mesaj + '\n\n— Öncelik: ' + oncelik + '\n— Tür: ' + (turLabel[tur] || tur) + '\n— Versiyon: v2.1.0\n— Platform: ' + (navigator.userAgent.includes('Electron') ? 'Desktop' : 'Web');
  var simdi = new Date().toISOString();

  var data = {
    id: (typeof uid === 'function') ? uid() : crypto.randomUUID(),
    musteri_id: musteriId || null,
    email: email,
    konu: '[' + (turLabel[tur] || tur) + '] ' + konu,
    mesaj: tamMesaj,
    mesajlar: [{ gonderen: 'musteri', mesaj: tamMesaj, tarih: simdi }],
    durum: 'bekliyor',
    created_at: simdi
  };

  // Önce musteri_id ile dene, foreign key hatası alırsa musteri_id'siz tekrar dene
  var basarili = await adminSbPost('destek_talepleri', data);
  if (!basarili && data.musteri_id) {
    data.musteri_id = null;
    basarili = await adminSbPost('destek_talepleri', data);
  }

  if (basarili) {
    // Formu temizle
    document.getElementById('destek-konu').value = '';
    document.getElementById('destek-mesaj').value = '';
    document.getElementById('destek-tur').value = 'sorun';
    document.getElementById('destek-oncelik').value = 'normal';

    // Belirgin başarı onay kartı göster
    var formDiv = btn.closest('.ayar-section');
    if (formDiv) {
      var formContent = formDiv.querySelector('[style*="padding:20px"]');
      if (formContent) {
        formContent.innerHTML =
          '<div style="text-align:center;padding:30px 20px">' +
            '<div style="font-size:52px;margin-bottom:12px">✅</div>' +
            '<div style="font-size:18px;font-weight:700;color:var(--green,#27ae60);margin-bottom:8px">Talebiniz Başarıyla Gönderildi!</div>' +
            '<div style="font-size:13px;color:var(--text-muted);margin-bottom:20px;line-height:1.6">' +
              'Ekibimiz talebinizi en kısa sürede inceleyecek.<br>Gelişmeleri <b style="color:var(--text)">Taleplerim</b> bölümünden takip edebilirsiniz.' +
            '</div>' +
            '<button class="btn btn-gold" onclick="destekFormunuSifirla()" style="padding:10px 28px">' +
              '📨 Yeni Talep Oluştur' +
            '</button>' +
          '</div>';
      }
    }
    notify('✅ Destek talebiniz gönderildi!');
    // Geçmiş talepleri yenile
    destekGecmisiYukle();
  } else {
    // Hata durumu — belirgin hata göster
    var hataMsj = document.getElementById('destek-hata-msj');
    if (!hataMsj) {
      hataMsj = document.createElement('div');
      hataMsj.id = 'destek-hata-msj';
      hataMsj.style.cssText = 'margin-top:10px;padding:12px 16px;border-radius:var(--radius,8px);background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.25);color:#e74c3c;font-size:13px;text-align:center';
      btn.parentNode.insertBefore(hataMsj, btn.nextSibling);
    }
    hataMsj.textContent = '❌ Talep gönderilemedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.';
    hataMsj.style.display = 'block';
    btn.disabled = false;
    btn.textContent = '📨 Talebi Gönder';
    return;
  }

  btn.disabled = false;
  btn.textContent = '📨 Talebi Gönder';
}

// ── Formu sıfırla (başarı kartından geri dönmek için) ────────
function destekFormunuSifirla() {
  var formDiv = document.querySelector('#page-destek .ayar-section');
  if (!formDiv) return;
  var formContent = formDiv.querySelector('[style*="padding"]');
  if (formContent) {
    formContent.innerHTML =
      '<div class="form-group">' +
        '<label>Talep Türü</label>' +
        '<select id="destek-tur">' +
          '<option value="sorun">🐛 Sorun / Hata Bildirimi</option>' +
          '<option value="ozellik">💡 Yeni Özellik Talebi</option>' +
          '<option value="soru">❓ Soru / Yardım</option>' +
          '<option value="oneri">📝 Öneri / Geri Bildirim</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Konu *</label>' +
        '<input id="destek-konu" placeholder="Kısa bir başlık yazın...">' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Açıklama *</label>' +
        '<textarea id="destek-mesaj" rows="5" placeholder="Sorununuzu veya talebinizi detaylı açıklayın..."></textarea>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Öncelik</label>' +
        '<select id="destek-oncelik">' +
          '<option value="normal">Normal</option>' +
          '<option value="yuksek">⚡ Yüksek — İş akışımı engelliyor</option>' +
          '<option value="dusuk">Düşük — Acil değil</option>' +
        '</select>' +
      '</div>' +
      '<button class="btn btn-gold" id="destek-gonder-btn" onclick="destekTalebiGonder()" style="width:100%;justify-content:center;padding:11px">' +
        '📨 Talebi Gönder' +
      '</button>';
  }
}

// ── Geçmiş Destek Taleplerini Yükle (Kompakt Liste) ──────────
var _destekTalepler = [];
async function destekGecmisiYukle() {
  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) return;

  var email = '';
  try {
    if (typeof currentUser !== 'undefined' && currentUser) email = currentUser.email || '';
    if (!email && typeof state !== 'undefined' && state.ayarlar) email = state.ayarlar.email || '';
    if (!email && typeof state !== 'undefined' && state.profil) email = state.profil.email || '';
  } catch(e) {}
  if (!email) return;

  var el = document.getElementById('destek-gecmis');
  if (!el) return;

  try {
    _destekTalepler = await adminSbGet('destek_talepleri', 'email=eq.' + encodeURIComponent(email) + '&order=created_at.desc&limit=20');
    if (!_destekTalepler || !_destekTalepler.length) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:13px">Henüz destek talebiniz yok</div>';
      return;
    }

    var durumRenk = { bekliyor: '#e67e22', inceleniyor: '#3498db', cozuldu: '#27ae60' };
    var durumLabel = { bekliyor: 'Bekliyor', inceleniyor: 'İnceleniyor', cozuldu: 'Çözüldü' };

    el.innerHTML = _destekTalepler.map(function(t, idx) {
      var tarih = t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR', { day:'2-digit', month:'short' }) : '';
      var renk = durumRenk[t.durum] || durumRenk.bekliyor;
      var yanitVar = t.admin_notu || (t.mesajlar && t.mesajlar.some(function(m) { return m.gonderen === 'admin'; }));
      return '<div onclick="destekDetayGoster(' + idx + ')" style="padding:10px 14px;margin-bottom:4px;background:var(--surface2);border-radius:var(--radius);cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .15s" onmouseover="this.style.background=\'var(--surface3,#1e1c18)\'" onmouseout="this.style.background=\'var(--surface2)\'">' +
        '<div style="width:6px;height:6px;border-radius:50%;background:' + renk + ';flex-shrink:0"></div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (t.konu || '—') + '</div>' +
        '</div>' +
        (yanitVar ? '<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(39,174,96,.12);color:#27ae60;font-weight:600">yanıt</span>' : '') +
        '<span style="font-size:10px;padding:2px 7px;border-radius:8px;background:' + renk + '18;color:' + renk + ';font-weight:700">' + (durumLabel[t.durum] || 'Bekliyor') + '</span>' +
        '<span style="font-size:11px;color:var(--text-muted);flex-shrink:0;min-width:44px;text-align:right">' + tarih + '</span>' +
      '</div>';
    }).join('');
  } catch(e) {
    console.warn('[Destek] Geçmiş yüklenemedi:', e.message);
  }
}

// ── Talep Detay Modalı Aç ────────────────────────────────────
function destekDetayGoster(idx) {
  var t = _destekTalepler[idx];
  if (!t) return;

  var modal = document.getElementById('destek-talep-modal');
  if (!modal) return;

  // Başlık
  var durumLabel = { bekliyor: 'Bekliyor', inceleniyor: 'İnceleniyor', cozuldu: 'Çözüldü' };
  var durumRenk = { bekliyor: '#e67e22', inceleniyor: '#3498db', cozuldu: '#27ae60' };
  var renk = durumRenk[t.durum] || durumRenk.bekliyor;
  document.getElementById('dt-konu').textContent = t.konu || '—';
  document.getElementById('dt-durum').textContent = durumLabel[t.durum] || 'Bekliyor';
  document.getElementById('dt-durum').style.cssText = 'display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:' + renk + '18;color:' + renk;
  document.getElementById('dt-tarih').textContent = t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

  // Konuşma geçmişini oluştur
  var konusma = [];
  // mesajlar JSONB dizisi varsa onu kullan
  if (t.mesajlar && t.mesajlar.length) {
    konusma = t.mesajlar;
  } else {
    // Geriye uyumluluk: eski mesaj + admin_notu'ndan konuşma oluştur
    if (t.mesaj) {
      var temizMesaj = (t.mesaj || '').split('\n\n— Öncelik:')[0] || t.mesaj;
      konusma.push({ gonderen: 'musteri', mesaj: temizMesaj, tarih: t.created_at });
    }
    if (t.admin_notu) {
      konusma.push({ gonderen: 'admin', mesaj: t.admin_notu, tarih: '' });
    }
  }

  var konusmaEl = document.getElementById('dt-konusma');
  if (!konusma.length) {
    konusmaEl.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:13px;padding:20px">Henüz mesaj yok</div>';
  } else {
    konusmaEl.innerHTML = konusma.map(function(m) {
      var benMi = m.gonderen !== 'admin';
      var zaman = m.tarih ? new Date(m.tarih).toLocaleDateString('tr-TR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
      return '<div style="display:flex;justify-content:' + (benMi ? 'flex-start' : 'flex-end') + ';margin-bottom:10px">' +
        '<div style="max-width:80%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.6;' +
          (benMi
            ? 'background:var(--surface2);color:var(--text);border-bottom-left-radius:4px'
            : 'background:var(--gold-dim,rgba(201,168,76,.12));color:var(--text);border-bottom-right-radius:4px;border-left:3px solid var(--gold)') +
        '">' +
          '<div style="font-size:10px;font-weight:600;margin-bottom:4px;color:' + (benMi ? 'var(--text-muted)' : 'var(--gold)') + '">' +
            (benMi ? '🧑 Siz' : '💬 Ekip') + (zaman ? ' · ' + zaman : '') +
          '</div>' +
          m.mesaj +
        '</div>' +
      '</div>';
    }).join('');
    // Konuşmayı en alta kaydır
    setTimeout(function() { konusmaEl.scrollTop = konusmaEl.scrollHeight; }, 50);
  }

  // Yanıt alanını göster/gizle (çözülmüş taleplere de yanıt verilebilir)
  document.getElementById('dt-yanit-alani').value = '';
  modal.setAttribute('data-talep-idx', idx);
  modal.classList.add('open');
}

// ── Kullanıcı Yanıtı Gönder ─────────────────────────────────
async function destekYanitGonder() {
  var modal = document.getElementById('destek-talep-modal');
  var idx = parseInt(modal.getAttribute('data-talep-idx'));
  var t = _destekTalepler[idx];
  if (!t) return;

  var mesaj = document.getElementById('dt-yanit-alani').value.trim();
  if (!mesaj) { notify('Mesaj yazın.', true); return; }

  var btn = document.getElementById('dt-gonder-btn');
  btn.disabled = true;
  btn.textContent = 'Gönderiliyor...';

  var mevcutMesajlar = t.mesajlar || [];
  // Eğer mesajlar boşsa, mevcut mesaj + admin_notu'nu da ekle
  if (!mevcutMesajlar.length) {
    if (t.mesaj) {
      var temizMesaj = (t.mesaj || '').split('\n\n— Öncelik:')[0] || t.mesaj;
      mevcutMesajlar.push({ gonderen: 'musteri', mesaj: temizMesaj, tarih: t.created_at });
    }
    if (t.admin_notu) {
      mevcutMesajlar.push({ gonderen: 'admin', mesaj: t.admin_notu, tarih: '' });
    }
  }
  mevcutMesajlar.push({ gonderen: 'musteri', mesaj: mesaj, tarih: new Date().toISOString() });

  var basarili = await adminSbUpdate('destek_talepleri', t.id, {
    mesajlar: mevcutMesajlar,
    durum: 'bekliyor'
  });

  btn.disabled = false;
  btn.textContent = '📨 Gönder';

  if (basarili) {
    t.mesajlar = mevcutMesajlar;
    t.durum = 'bekliyor';
    destekDetayGoster(idx);
    destekGecmisiYukle();
    notify('✅ Yanıtınız gönderildi');
  } else {
    notify('Yanıt gönderilemedi.', true);
  }
}

// ── Destek Yanıt Bildirim Kontrolü (periyodik) ────────────
var _destekBildirimInterval = null;

async function destekBildirimKontrol() {
  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) return;
  var email = '';
  try {
    if (typeof currentUser !== 'undefined' && currentUser) email = currentUser.email || '';
  } catch(e) {}
  if (!email) return;

  try {
    var sonKontrol = localStorage.getItem('lb_destek_son_kontrol') || '';
    var talepler = await adminSbGet('destek_talepleri', 'email=eq.' + encodeURIComponent(email) + '&order=created_at.desc&limit=20');
    if (!talepler || !talepler.length) return;

    var yeniYanitSayisi = 0;
    talepler.forEach(function(t) {
      var mesajlar = t.mesajlar || [];
      mesajlar.forEach(function(m) {
        if (m.gonderen === 'admin' && m.tarih && m.tarih > sonKontrol) yeniYanitSayisi++;
      });
      // Eski format fallback — admin_notu varsa ve mesajlar boşsa
      if (!mesajlar.length && t.admin_notu && !sonKontrol) yeniYanitSayisi++;
    });

    if (yeniYanitSayisi > 0) {
      notify('🎧 ' + yeniYanitSayisi + ' yeni destek yanıtınız var!');
    }
    localStorage.setItem('lb_destek_son_kontrol', new Date().toISOString());
  } catch(e) {
    console.warn('[Destek] Bildirim kontrol hatası:', e.message);
  }
}

function destekBildirimBaslat() {
  if (_destekBildirimInterval) clearInterval(_destekBildirimInterval);
  setTimeout(destekBildirimKontrol, 3000);
  _destekBildirimInterval = setInterval(destekBildirimKontrol, 5 * 60 * 1000);
}

function destekBildirimDurdur() {
  if (_destekBildirimInterval) { clearInterval(_destekBildirimInterval); _destekBildirimInterval = null; }
}