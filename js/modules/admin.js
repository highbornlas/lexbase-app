// ================================================================
// LEXBASE — ADMIN ENTEGRASYON
// js/modules/admin.js
// ================================================================

// ── Admin Supabase Credentials ─────────────────────────────────
// Admin paneli için AYRI Supabase projesi. SQL çalıştırıp
// proje oluşturduktan sonra buraya URL ve anon key girin:
const ADMIN_SB_URL = 'https://ewvbpfsgmjghmbnkuvpx.supabase.co';
const ADMIN_SB_KEY = 'sb_publishable_ccz6M_f4JCnnQzr0auQD7A_-A2YGb91';

// ── Oturum değişkenleri (global) ──────────────────────────────
let _oturumBaslangic = null;
let _oturumLogId     = null;

// ── Yardımcılar ───────────────────────────────────────────────
async function adminSbPost(tablo, data) {
  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) return;
  try {
    await fetch(`${ADMIN_SB_URL}/rest/v1/${tablo}`, {
      method: 'POST',
      headers: {
        'apikey': ADMIN_SB_KEY,
        'Authorization': `Bearer ${ADMIN_SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    });
  } catch(e) {}
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
