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
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      console.warn(`[Admin] POST ${tablo} hatası: ${res.status}`, await res.text().catch(()=>''));
      return false;
    }
    return true;
  } catch(e) {
    console.warn(`[Admin] POST ${tablo} ağ hatası:`, e.message);
    return false;
  }
}

async function adminSbUpdate(tablo, id, data) {
  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) return;
  try {
    await fetch(`${ADMIN_SB_URL}/rest/v1/${tablo}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': ADMIN_SB_KEY,
        'Authorization': `Bearer ${ADMIN_SB_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  } catch(e) {}
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
    if (typeof state !== 'undefined' && state.ayarlar) email = state.ayarlar.email || '';
    if (!email && typeof state !== 'undefined' && state.profil) email = state.profil.email || '';
  } catch(e) {}

  var turEmoji = { sorun: '🐛', ozellik: '💡', soru: '❓', oneri: '📝' };
  var turLabel = { sorun: 'Hata', ozellik: 'Özellik', soru: 'Soru', oneri: 'Öneri' };

  var data = {
    id: (typeof uid === 'function') ? uid() : crypto.randomUUID(),
    musteri_id: musteriId || null,
    email: email,
    konu: '[' + (turLabel[tur] || tur) + '] ' + konu,
    mesaj: mesaj + '\n\n— Öncelik: ' + oncelik + '\n— Tür: ' + (turLabel[tur] || tur) + '\n— Versiyon: v2.1.0\n— Platform: ' + (navigator.userAgent.includes('Electron') ? 'Desktop' : 'Web'),
    durum: 'bekliyor',
    created_at: new Date().toISOString()
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

// ── Geçmiş Destek Taleplerini Yükle ─────────────────────────
async function destekGecmisiYukle() {
  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) return;

  var musteriId = '';
  try {
    if (typeof currentBuroId !== 'undefined' && currentBuroId) musteriId = currentBuroId;
  } catch(e) {}
  if (!musteriId) return;

  var el = document.getElementById('destek-gecmis');
  if (!el) return;

  try {
    var talepler = await adminSbGet('destek_talepleri', 'musteri_id=eq.' + musteriId + '&order=created_at.desc&limit=10');
    if (!talepler || !talepler.length) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);font-size:13px">Henüz destek talebiniz yok</div>';
      return;
    }

    var durumBadge = {
      bekliyor:    '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:rgba(230,126,34,.12);color:#e67e22">Bekliyor</span>',
      inceleniyor: '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:rgba(52,152,219,.12);color:#3498db">İnceleniyor</span>',
      cozuldu:     '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:rgba(39,174,96,.12);color:#27ae60">Çözüldü</span>'
    };

    el.innerHTML = talepler.map(function(t) {
      var tarih = t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '';
      return '<div style="padding:12px 0;border-bottom:1px solid var(--border)">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
          '<div style="min-width:0">' +
            '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:3px">' + (t.konu || '—') + '</div>' +
            '<div style="font-size:11px;color:var(--text-muted)">' + tarih + '</div>' +
          '</div>' +
          '<div style="flex-shrink:0">' + (durumBadge[t.durum] || durumBadge.bekliyor) + '</div>' +
        '</div>' +
        (t.admin_notu ? '<div style="margin-top:8px;padding:8px 10px;background:var(--gold-dim);border-radius:var(--radius);font-size:12px;color:var(--gold)">📝 ' + t.admin_notu + '</div>' : '') +
      '</div>';
    }).join('');
  } catch(e) {
    console.warn('[Destek] Geçmiş yüklenemedi:', e.message);
  }
}