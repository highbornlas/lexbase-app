// ================================================================
// EMD HUKUK — ADMIN ENTEGRASYON
// js/modules/admin.js
// ================================================================

async function adminSbPost(tablo, data) {
  if (!ADMIN_SB_URL || !ADMIN_SB_KEY) return; // Yapılandırılmamış
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
  } catch(e) { /* sessizce geç */ }
}

async function adminSbUpdate(tablo, id, data) {
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
  } catch(e) { /* sessizce geç */ }
}

async function adminSbGet(tablo, filtre) {
  try {
    const res = await fetch(`${ADMIN_SB_URL}/rest/v1/${tablo}?${filtre}&select=*`, {
      headers: { 'apikey': ADMIN_SB_KEY, 'Authorization': `Bearer ${ADMIN_SB_KEY}` }
    });
    return await res.json();
  } catch(e) { return []; }
}

// Kayıt anında admin'e bildir
async function adminMusteriKayit(musteri) {
  const kayit_tarihi = new Date().toISOString().slice(0,10);
  const lis_bitis = new Date();
  lis_bitis.setDate(lis_bitis.getDate() + 30);
  await adminSbPost('musteriler', {
    id: musteri.id,
    ad_soyad: musteri.ad_soyad,
    email: musteri.email,
    buro_ad: musteri.buro_ad,
    lisans_tur: 'deneme',
    lisans_baslangic: kayit_tarihi,
    lisans_bitis: lis_bitis.toISOString().slice(0,10),
    durum: 'deneme',
    toplam_giris_sayisi: 1,
    son_giris: new Date().toISOString(),
    kayit_tarihi: new Date().toISOString(),
  });
}

// Giriş anında log gönder + son_giris güncelle
async function adminGirisLog(musteri) {
  _oturumBaslangic = Date.now();
  _oturumLogId = uid();
  // Kullanım logu oluştur
  await adminSbPost('kullanim_log', {
    id: _oturumLogId,
    musteri_id: musteri.id,
    email: musteri.email,
    giris_tarihi: new Date().toISOString(),
    dava_sayisi: state.davalar?.length || 0,
    muvekkil_sayisi: state.muvekkillar?.length || 0,
    icra_sayisi: state.icra?.length || 0,
    butce_kayit_sayisi: state.butce?.length || 0,
    uygulama_versiyon: '1.0.0',
    platform: navigator.userAgent.includes('Electron') ? 'windows' : 'web',
  });
  // Son giriş zamanını güncelle
  await adminSbUpdate('musteriler', musteri.id, {
    son_giris: new Date().toISOString(),
    toplam_giris_sayisi: (musteri._giris_sayisi || 1),
  });
}

// Çıkışta oturum süresini güncelle
async function adminCikisLog() {
  if (!_oturumLogId || !_oturumBaslangic) return;
  const sure = Math.round((Date.now() - _oturumBaslangic) / 60000);
  await adminSbUpdate('kullanim_log', _oturumLogId, {
    cikis_tarihi: new Date().toISOString(),
    sure_dakika: sure,
    dava_sayisi: state.davalar?.length || 0,
    muvekkil_sayisi: state.muvekkillar?.length || 0,
    icra_sayisi: state.icra?.length || 0,
    butce_kayit_sayisi: state.butce?.length || 0,
  });
  _oturumLogId = null;
}

// Aktif duyuruları admin'den çek ve göster
async function duyurulariYukle() {
  try {
    const duyurular = await adminSbGet('duyurular', 'yayinda=eq.true&order=created_at.desc&limit=3');
    if (!duyurular || !duyurular.length) return;
    const turIcon = { bilgi:'ℹ️', uyari:'⚠️', guncelleme:'🔄', bakim:'🔧' };
    const turRenk = { bilgi:'var(--blue)', uyari:'var(--orange)', guncelleme:'var(--green)', bakim:'var(--red)' };
    duyurular.forEach(d => {
      // Daha önce okunmuş mu?
      const okunanlar = JSON.parse(localStorage.getItem('okunan_duyurular') || '[]');
      if (okunanlar.includes(d.id)) return;
      // Notify benzeri duyuru göster
      const el = document.createElement('div');
      el.style.cssText = `position:fixed;top:70px;right:16px;background:var(--surface);border:1px solid ${turRenk[d.tur]||'var(--border)'};border-left:4px solid ${turRenk[d.tur]||'var(--gold)'};border-radius:var(--radius);padding:12px 16px;z-index:500;max-width:320px;box-shadow:0 4px 20px rgba(0,0,0,.4);animation:slideIn .3s ease`;
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div>
            <div style="font-size:13px;font-weight:700;margin-bottom:4px">${turIcon[d.tur]||'📢'} ${d.baslik}</div>
            <div style="font-size:12px;color:var(--text-muted)">${d.icerik.slice(0,120)}${d.icerik.length>120?'...':''}</div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:0;line-height:1">×</button>
        </div>`;
      document.body.appendChild(el);
      // 10 saniye sonra kapat
      setTimeout(() => el.remove(), 10000);
      // Okundu olarak işaretle
      okunanlar.push(d.id);
      localStorage.setItem('okunan_duyurular', JSON.stringify(okunanlar.slice(-50)));
    });
  } catch(e) { /* sessizce geç */ }
}

// ================================================================
// AUTH FONKSİYONLARI — localStorage modu + Admin entegrasyon
// ================================================================