// ================================================================
// EMD HUKUK — ABONELIK PLANLARI
// js/modules/plan.js
// ================================================================

function mevcutPlan() {
  try {
    const d = localStorage.getItem(SK);
    if (d) {
      const p = JSON.parse(d);
      const planId = p.planId || 'deneme';
      // Deneme süresi kontrolü
      if (planId === 'deneme' && p.olusturmaTarih) {
        const gun = Math.ceil((Date.now() - new Date(p.olusturmaTarih)) / (1000*60*60*24));
        if (gun > 30) return { ...PLANLAR.deneme, id: 'deneme', sureDoldu: true };
      }
      return { ...PLANLAR[planId] || PLANLAR.deneme, id: planId };
    }
  } catch(e) {}
  return { ...PLANLAR.deneme, id: 'deneme' };
}

function planGuncelle(planId, ekVeri) {
  try {
    const d = localStorage.getItem(SK);
    const p = d ? JSON.parse(d) : {};
    p.planId = planId;
    p.planGuncellemeTarih = new Date().toISOString();
    if (ekVeri) Object.assign(p, ekVeri);
    localStorage.setItem(SK, JSON.stringify(p));
    Object.assign(state, p);
  } catch(e) {}
}

// Limit kontrolü — true = izin ver, false = engelle
function limitKontrol(tip) {
  const plan = mevcutPlan();
  if (plan.sureDoldu) { upgradeGoster('sureDoldu'); return false; }
  const limit = plan.limitler[tip];
  if (limit === undefined || limit === Infinity) return true;
  const mevcutSayilar = {
    muvekkil: state.muvekkillar.length,
    dava: state.davalar.length,
    icra: state.icra.length,
    personel: (state.personel||[]).length,
  };
  if (mevcutSayilar[tip] >= limit) {
    upgradeGoster(tip);
    return false;
  }
  return true;
}

// Özellik kontrolü
function ozellikKontrol(ozellik) {
  const plan = mevcutPlan();
  if (plan.sureDoldu) { upgradeGoster('sureDoldu'); return false; }
  if (!plan.ozellikler[ozellik]) { upgradeGoster(ozellik); return false; }
  return true;
}

// Upgrade popup
function upgradeGoster(sebep) {
  const plan = mevcutPlan();
  const mesajlar = {
    muvekkil:    { baslik: '👥 Müvekkil limitine ulaştınız', detay: `${plan.ad} planında en fazla ${plan.limitler.muvekkil} müvekkil ekleyebilirsiniz.` },
    dava:        { baslik: '📁 Dava limitine ulaştınız',     detay: `${plan.ad} planında en fazla ${plan.limitler.dava} dava açabilirsiniz.` },
    icra:        { baslik: '⚡ İcra limitine ulaştınız',     detay: `${plan.ad} planında en fazla ${plan.limitler.icra} icra takibi açabilirsiniz.` },
    personel:    { baslik: '👤 Personel limitine ulaştınız', detay: `${plan.ad} planında ${plan.limitler.personel === 0 ? 'personel hesabı ekleyemezsiniz' : 'en fazla '+plan.limitler.personel+' personel ekleyebilirsiniz'}.` },
    whatsapp:    { baslik: '📱 WhatsApp sadece üst planlarda', detay: 'WhatsApp entegrasyonu Profesyonel ve üzeri planlarda kullanılabilir.' },
    finans:      { baslik: '💰 Finans modülü üst planlarda', detay: 'Finans ve fatura modülü Profesyonel ve üzeri planlarda kullanılabilir.' },
    uyap:        { baslik: '🧰 Araç Kutusu üst planlarda',    detay: 'Faiz hesaplayıcı, süre takip ve vekalet ücreti araçları Profesyonel ve üzeri planlarda kullanılabilir.' },
    bulut_yedek: { baslik: '☁️ Bulut yedekleme Kurumsal plana özel', detay: 'Verilerinizi sunucumuzda güvenle saklayın, her yerden erişin.' },
    sureDoldu:   { baslik: '⏰ Deneme süreniz doldu',        detay: 'Uygulamayı kullanmaya devam etmek için bir plan seçin.' },
  };
  const m = mesajlar[sebep] || { baslik: 'Plan yükseltme gerekli', detay: 'Bu özellik için planınızı yükseltin.' };

  // Modal varsa kapat
  document.querySelectorAll('.modal-overlay.open').forEach(o => o.classList.remove('open'));

  // Upgrade modalını aç
  const modal = document.getElementById('upgrade-modal');
  document.getElementById('upg-baslik').textContent = m.baslik;
  document.getElementById('upg-detay').textContent = m.detay;
  document.getElementById('upg-mevcut-plan').textContent = plan.ad;
  renderUpgradePlanlar(plan.id);
  modal.classList.add('open');
}

function renderUpgradePlanlar(mevcutId) {
  const el = document.getElementById('upg-planlar');
  const siradaki = ['deneme','profesyonel','buro','kurumsal'];
  const mevcutIdx = siradaki.indexOf(mevcutId);
  el.innerHTML = siradaki.filter((_,i) => i > mevcutIdx).map(pid => {
    const p = PLANLAR[pid];
    return `<div style="background:var(--surface2);border:2px solid ${p.renk}33;border-radius:var(--radius);padding:16px;cursor:pointer;transition:all .2s;flex:1;min-width:160px" 
      onmouseover="this.style.borderColor='${p.renk}'" onmouseout="this.style.borderColor='${p.renk}33'"
      onclick="planSecildi('${pid}')">
      <div style="font-size:22px;margin-bottom:6px">${p.ikon}</div>
      <div style="font-weight:700;font-size:14px;color:${p.renk};margin-bottom:4px">${p.ad}</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:4px">${p.fiyat > 0 ? '₺'+p.fiyat+'<span style="font-size:11px;color:var(--text-muted)">/ay</span>' : 'Ücretsiz'}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${p.aciklama}</div>
      <div style="font-size:11px;color:var(--text-muted)">
        ${p.limitler.muvekkil === Infinity ? '∞ Müvekkil' : p.limitler.muvekkil+' Müvekkil'}<br>
        ${p.limitler.dava === Infinity ? '∞ Dava' : p.limitler.dava+' Dava'}<br>
        ${p.limitler.personel === 0 ? '❌ Personel' : p.limitler.personel === Infinity ? '∞ Personel' : p.limitler.personel+' Personel'}<br>
        ${p.ozellikler.whatsapp ? '✅ WhatsApp' : '❌ WhatsApp'}<br>
        ${p.ozellikler.finans ? '✅ Finans/Fatura' : '❌ Finans/Fatura'}<br>
        ${p.ozellikler.uyap ? '✅ Araç Kutusu' : '❌ Araç Kutusu'}
      </div>
      <button style="width:100%;margin-top:10px;padding:8px;border-radius:var(--radius);border:none;background:${p.renk};color:#fff;font-weight:700;cursor:pointer;font-size:12px">
        Bu Planı Seç
      </button>
    </div>`;
  }).join('');
}

function planSecildi(planId) {
  // Seçilen planı lisans kodu alanına göster
  var kodInput = document.getElementById('upg-lisans-kod');
  if (kodInput) {
    kodInput.focus();
    kodInput.setAttribute('data-secilen-plan', planId);
  }
  var sonucEl = document.getElementById('upg-lisans-sonuc');
  if (sonucEl) {
    sonucEl.style.display = 'block';
    sonucEl.style.color = 'var(--gold)';
    sonucEl.textContent = PLANLAR[planId].ikon + ' ' + PLANLAR[planId].ad + ' planı seçildi — lisans kodunuzu girin';
  }
}

// Lisans kodu doğrulama — Supabase'den kontrol eder
async function lisansKoduDogrula() {
  var kodInput = document.getElementById('upg-lisans-kod');
  var kod = (kodInput.value || '').trim().toUpperCase();
  var sonucEl = document.getElementById('upg-lisans-sonuc');
  var btn = document.getElementById('upg-dogrula-btn');

  if (!kod) {
    _lisansSonuc('Lütfen lisans kodunuzu girin.', 'err');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Doğrulanıyor...';
  _lisansSonuc('🔄 Kod doğrulanıyor...', 'info');

  try {
    // Admin Supabase'den kodu ara
    var kodlar = await adminSbGet('lisans_kodlari', 'kod=eq.' + encodeURIComponent(kod));

    if (!kodlar || !kodlar.length) {
      _lisansSonuc('❌ Geçersiz lisans kodu. Lütfen kontrol edip tekrar deneyin.', 'err');
      btn.disabled = false;
      btn.textContent = '🔑 Doğrula';
      return;
    }

    var lisans = kodlar[0];

    var maxKullanim = lisans.max_kullanim || 1;
    var kullanimSayisi = lisans.kullanim_sayisi || 0;

    if (kullanimSayisi >= maxKullanim) {
      _lisansSonuc('❌ Bu lisans kodu daha önce kullanılmış.', 'err');
      btn.disabled = false;
      btn.textContent = '🔑 Doğrula';
      return;
    }

    // Lisans türünü plan ID'sine eşle
    var turPlanMap = {
      'deneme': 'deneme',
      'aylik': 'profesyonel',
      'yillik': 'buro',
      'omur': 'kurumsal'
    };
    var planId = turPlanMap[lisans.tur] || 'profesyonel';
    var plan = PLANLAR[planId];

    if (!plan) {
      _lisansSonuc('❌ Lisans türü tanınmadı.', 'err');
      btn.disabled = false;
      btn.textContent = '🔑 Doğrula';
      return;
    }

    // Lisansı kullanıldı olarak işaretle
    var musteriId = '';
    try {
      if (typeof currentBuroId !== 'undefined' && currentBuroId) musteriId = currentBuroId;
    } catch(e) {}

    // Kullananlar kaydı oluştur
    var email = '';
    var adSoyad = '';
    try {
      if (typeof state !== 'undefined' && state.ayarlar) {
        email = state.ayarlar.email || '';
        adSoyad = state.ayarlar.buroAdi || state.ayarlar.ad || '';
      }
      if (!email && typeof state !== 'undefined' && state.profil) email = state.profil.email || '';
    } catch(e) {}

    var yeniKullanan = {
      musteri_id: musteriId || null,
      email: email,
      ad_soyad: adSoyad,
      tarih: new Date().toISOString(),
      aktif: true
    };
    var mevcutKullananlar = lisans.kullananlar || [];
    mevcutKullananlar.push(yeniKullanan);
    var yeniSayisi = kullanimSayisi + 1;

    await adminSbUpdate('lisans_kodlari', lisans.id, {
      kullanildi: yeniSayisi >= maxKullanim,
      kullanilan_musteri_id: musteriId || null,
      kullanim_tarihi: new Date().toISOString(),
      kullanim_sayisi: yeniSayisi,
      kullananlar: mevcutKullananlar
    });

    // Bitiş tarihini hesapla
    var bugun = new Date().toISOString().slice(0, 10);
    var bitis = new Date();
    if (lisans.tur === 'aylik') bitis.setMonth(bitis.getMonth() + 1);
    else if (lisans.tur === 'yillik') bitis.setFullYear(bitis.getFullYear() + 1);
    else if (lisans.tur === 'omur') bitis.setFullYear(bitis.getFullYear() + 99);
    else bitis.setDate(bitis.getDate() + 30);

    // Müşteri kaydını güncelle
    if (musteriId) {
      await adminSbUpdate('musteriler', musteriId, {
        lisans_tur: lisans.tur,
        durum: 'aktif',
        lisans_baslangic: bugun,
        lisans_bitis: bitis.toISOString().slice(0, 10)
      });
    }

    // Yerel planı güncelle (lisansBitis ve lisansTur ile)
    planGuncelle(planId, {
      lisansBitis: bitis.toISOString().slice(0, 10),
      lisansTur: lisans.tur
    });
    planBilgisiGuncelle();
    planMenuGuncelle();

    // Başarı
    _lisansSonuc('✅ ' + plan.ad + ' planı başarıyla aktifleştirildi!', 'ok');
    notify('✅ ' + plan.ad + ' planına geçildi! Tüm özellikler açıldı.');

    // Modalı kapat (biraz bekle)
    setTimeout(function() {
      closeModal('upgrade-modal');
      kodInput.value = '';
      if (sonucEl) sonucEl.style.display = 'none';
    }, 2000);

  } catch(e) {
    console.warn('[Plan] Lisans doğrulama hatası:', e.message);
    _lisansSonuc('⚠️ Doğrulama sırasında hata oluştu. Tekrar deneyin.', 'err');
  }

  btn.disabled = false;
  btn.textContent = '🔑 Doğrula';
}

function _lisansSonuc(msg, tip) {
  var el = document.getElementById('upg-lisans-sonuc');
  if (!el) return;
  el.style.display = 'block';
  el.style.color = tip === 'err' ? 'var(--red)' : tip === 'ok' ? 'var(--green)' : 'var(--gold)';
  el.textContent = msg;
}

// Header'da plan bilgisi göster
function planBilgisiGuncelle() {
  const plan = mevcutPlan();
  const el = document.getElementById('plan-badge');
  if (!el) return;
  let kalan = '';
  try {
    const d = JSON.parse(localStorage.getItem(SK)||'{}');
    if (plan.id === 'deneme') {
      const gun = Math.ceil((Date.now() - new Date(d.olusturmaTarih||Date.now())) / (1000*60*60*24));
      kalan = ` (${Math.max(0, 30-gun)} gün)`;
    } else if (d.lisansBitis && d.lisansTur !== 'omur') {
      const bitis = new Date(d.lisansBitis);
      const kalanGun = Math.ceil((bitis - Date.now()) / (1000*60*60*24));
      kalan = kalanGun > 0 ? ` (${kalanGun} gün)` : ' (süresi doldu)';
    }
  } catch(e) {}
  el.textContent = plan.ikon + ' ' + plan.ad + kalan;
  el.style.background = plan.renk + '22';
  el.style.color = plan.renk;
  el.style.borderColor = plan.renk + '44';
}

// Plan bazlı menü göster/gizle
function planMenuGuncelle() {
  const plan = mevcutPlan();
  // WhatsApp butonu
  const wpBtn = document.getElementById('header-wp-btn');
  if (wpBtn) wpBtn.style.display = plan.ozellikler.whatsapp ? '' : 'none';
  // Finans nav
  const navButce = document.getElementById('ni-butce');
  if (navButce) {
    if (!plan.ozellikler.finans) {
      navButce.setAttribute('data-locked', '1');
      navButce.innerHTML = navButce.innerHTML.replace('💰','💰🔒');
    }
  }
  // UYAP nav
  const navUyap = document.getElementById('ni-uyap');
  if (navUyap) {
    if (!plan.ozellikler.uyap) {
      navUyap.setAttribute('data-locked', '1');
    }
  }
}

// Limit doluluk oranı (dashboard için)
function planKullanim() {
  const plan = mevcutPlan();
  return {
    muvekkil: { sayi: state.muvekkillar.length, limit: plan.limitler.muvekkil, oran: plan.limitler.muvekkil === Infinity ? 0 : state.muvekkillar.length / plan.limitler.muvekkil },
    dava: { sayi: state.davalar.length, limit: plan.limitler.dava, oran: plan.limitler.dava === Infinity ? 0 : state.davalar.length / plan.limitler.dava },
    icra: { sayi: state.icra.length, limit: plan.limitler.icra, oran: plan.limitler.icra === Infinity ? 0 : state.icra.length / plan.limitler.icra },
  };
}

// ================================================================
// UTILS
// ================================================================

/**
 * Güvenli unique ID üreteci.
 * crypto.randomUUID() varsa onu kullanır (modern browsers),
 * yoksa crypto.getRandomValues ile UUID v4 üretir.
 * Eski Date.now + Math.random yöntemi çakışma riski taşıyordu.
 */
function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: crypto.getRandomValues ile UUID v4
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}