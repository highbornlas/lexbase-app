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

function planGuncelle(planId) {
  try {
    const d = localStorage.getItem(SK);
    const p = d ? JSON.parse(d) : {};
    p.planId = planId;
    p.planGuncellemeTarih = new Date().toISOString();
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
    uyap:        { baslik: '🏛 UYAP/Süre üst planlarda',    detay: 'UYAP ve süre takip modülü Profesyonel ve üzeri planlarda kullanılabilir.' },
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
        ${p.ozellikler.uyap ? '✅ UYAP/Süre' : '❌ UYAP/Süre'}
      </div>
      <button style="width:100%;margin-top:10px;padding:8px;border-radius:var(--radius);border:none;background:${p.renk};color:#fff;font-weight:700;cursor:pointer;font-size:12px">
        Bu Planı Seç
      </button>
    </div>`;
  }).join('');
}

function planSecildi(planId) {
  // Gerçek uygulamada burada ödeme sayfasına yönlendirme olacak
  // Şimdilik admin lisans kodu ile aktifleştirme simüle ediyoruz
  const modal = document.getElementById('upgrade-modal');
  modal.classList.remove('open');
  // Lisans kodu girişi
  const kod = prompt(`${PLANLAR[planId].ad} planı için lisans kodunuzu girin:\n(Demo için: TEST-${planId.toUpperCase()}-2025)`);
  if (!kod) return;
  // Demo: TEST- ile başlayan kodları kabul et
  if (kod.startsWith('TEST-') || kod.length > 10) {
    planGuncelle(planId);
    planBilgisiGuncelle();
    notify(`✅ ${PLANLAR[planId].ad} planına geçildi!`);
    // Menüleri güncelle
    planMenuGuncelle();
  } else {
    notify('❌ Geçersiz lisans kodu.', 'err');
  }
}

// Header'da plan bilgisi göster
function planBilgisiGuncelle() {
  const plan = mevcutPlan();
  const el = document.getElementById('plan-badge');
  if (!el) return;
  let kalan = '';
  if (plan.id === 'deneme') {
    try {
      const d = JSON.parse(localStorage.getItem(SK)||'{}');
      const gun = Math.ceil((Date.now() - new Date(d.olusturmaTarih||Date.now())) / (1000*60*60*24));
      kalan = ` (${Math.max(0, 30-gun)} gün)`;
    } catch(e) {}
  }
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
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}