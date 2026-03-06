// ================================================================
// EMD HUKUK — UI — MODAL/TAB/SAYFA
// js/modules/ui.js
// ================================================================

function showPage(id,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item, .top-nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  if(el)el.classList.add('active');
  document.querySelector('main').scrollTop = 0;
  const map={anasayfa:renderDashboard,davalar:()=>{renderDavalar();renderDavaCards();},icra:()=>{renderIcra();renderIcraCards();},danismanlik:renderDanismanlik,butce:renderButce,takvim:renderCalendar,arabuluculuk:renderArabuluculuk,uyap:renderUyapSayfa};
  if(id==='muvekkillar'){
    if(aktifRehberTab==='karsitaraflar')renderKarsiTaraflarListesi();
    else if(aktifRehberTab==='avukatlar')renderVekillarListesi();
    else renderMuvekkillar();
  } else if(id==='ayarlar'){
    ayarlarSayfasiDoldur();
    setTimeout(yedekIstatistikGoster, 100);
  } else if(id==='personel'){
    renderPersonelSayfasi();
  } else if(map[id]){map[id]();}
}

// ================================================================
// KARŞI TARAF & VEKİL SİSTEMİ
// ================================================================
// Aktif arama bağlamı: hangi input/liste/hidden/goster tuple'larını kullanıyoruz
let _ktCtx=null, _vekCtx=null;

function ktAra(araId,listeId,hiddenId,gosterId){
  if(!state.karsiTaraflar)state.karsiTaraflar=[];
  const q=document.getElementById(araId).value.trim().toLowerCase();
  const liste=document.getElementById(listeId);
  const sonuclar=q
    ?state.karsiTaraflar.filter(k=>k.ad.toLowerCase().includes(q))
    :state.karsiTaraflar.slice(0,10);
  let html='';
  sonuclar.forEach(k=>{
    const meta=[k.tip==='tuzel'?'🏢 Tüzel':'👤 Gerçek',k.tc,k.tel].filter(Boolean).join(' · ');
    html+=`<div class="kt-item" onmousedown="ktSec('${k.id}','${araId}','${listeId}','${hiddenId}','${gosterId}')">
      <div><div>${k.ad}</div><div class="kt-item-meta">${meta}</div></div>
    </div>`;
  });
  html+=`<div class="kt-new" onmousedown="ktYeniAc('${araId}','${listeId}','${hiddenId}','${gosterId}')">＋ "${document.getElementById(araId).value||'Yeni'}" adıyla kayıt oluştur</div>`;
  liste.innerHTML=html;
  liste.style.display='block';
  // Dışarı tıklayınca kapat
  document.getElementById(araId)._kapat=()=>{liste.style.display='none';};
  document.getElementById(araId).onblur=()=>setTimeout(()=>{liste.style.display='none';},150);
}

function ktSec(id,araId,listeId,hiddenId,gosterId){
  const k=state.karsiTaraflar.find(x=>x.id===id);if(!k)return;
  document.getElementById(hiddenId).value=id;
  document.getElementById(araId).value='';
  document.getElementById(listeId).style.display='none';
  const meta=[k.tip==='tuzel'?'🏢 Tüzel':'👤 Gerçek',k.tc,k.tel,k.mail].filter(Boolean).join(' · ');
  document.getElementById(gosterId).innerHTML=`
    <div><div class="kt-secili-ad">${k.ad}</div><div class="kt-secili-meta">${meta}</div></div>
    <button class="kt-secili-temizle" onclick="ktTemizle('${araId}','${hiddenId}','${gosterId}')" title="Seçimi kaldır">✕</button>`;
  document.getElementById(gosterId).style.display='flex';
}

function ktTemizle(araId,hiddenId,gosterId){
  document.getElementById(hiddenId).value='';
  document.getElementById(araId).value='';
  document.getElementById(gosterId).style.display='none';
  document.getElementById(gosterId).innerHTML='';
}

function ktYeniAc(araId,listeId,hiddenId,gosterId){
  _ktCtx={araId,listeId,hiddenId,gosterId};
  const q=document.getElementById(araId).value.trim();
  ktModalSifirla();
  document.getElementById('kt-ad').value=q;
  document.getElementById('kt-modal-title').textContent='Karşı Taraf Ekle';
  document.getElementById('kt-modal-btn').textContent='Kaydet & Seç';
  document.getElementById('kt-modal-btn').onclick=saveKarsiTaraf;
  openModal('kt-modal');
}

function saveKarsiTaraf(){
  const d=ktModalDataOku();
  if(!zorunluKontrol([{id:'kt-ad', deger:d.ad, label:'Ad / Unvan'}])) {
    notify('⚠️ Zorunlu alanları doldurun.');return;
  }
  // Numara doğrulama
  if (!numaralariDogrula([
    { id:'kt-tc', tip:'tc' },
    { id:'kt-vergino', tip:'vergi' },
    { id:'kt-mersis', tip:'mersis' },
    { id:'kt-iban', tip:'iban' },
  ])) {
    notify('⚠️ Hatalı veya eksik numara alanları var, lütfen kontrol edin.');
    return;
  }
  if(!state.karsiTaraflar)state.karsiTaraflar=[];
  const kt={id:uid(),sira:nextSira('karsiTaraflar'),...d};
  state.karsiTaraflar.push(kt);
  saveData();
  if(currentBuroId) saveToSupabase('karsiTaraflar', kt);
  closeModal('kt-modal');
  notify('✓ Karşı taraf kaydedildi');
  if(aktifRehberTab==='karsitaraflar')renderKarsiTaraflarListesi();
  if(_ktCtx){
    ktSec(kt.id,_ktCtx.araId,_ktCtx.listeId,_ktCtx.hiddenId,_ktCtx.gosterId);
    _ktCtx=null;
  }
}

// Vekil
function vekAra(araId,listeId,hiddenId,gosterId){
  if(!state.vekillar)state.vekillar=[];
  const q=document.getElementById(araId).value.trim().toLowerCase();
  const liste=document.getElementById(listeId);
  const sonuclar=q
    ?state.vekillar.filter(v=>v.ad.toLowerCase().includes(q))
    :state.vekillar.slice(0,10);
  let html='';
  sonuclar.forEach(v=>{
    const meta=[v.baro,v.baroSicil?'Sicil: '+v.baroSicil:'',v.tel].filter(Boolean).join(' · ');
    html+=`<div class="kt-item" onmousedown="vekSec('${v.id}','${araId}','${listeId}','${hiddenId}','${gosterId}')">
      <div><div>Av. ${v.ad}</div><div class="kt-item-meta">${meta}</div></div>
    </div>`;
  });
  html+=`<div class="kt-new" onmousedown="vekYeniAc('${araId}','${listeId}','${hiddenId}','${gosterId}')">＋ "${document.getElementById(araId).value||'Yeni'}" adıyla vekil kaydı oluştur</div>`;
  liste.innerHTML=html;
  liste.style.display='block';
  document.getElementById(araId).onblur=()=>setTimeout(()=>{liste.style.display='none';},150);
}

function vekSec(id,araId,listeId,hiddenId,gosterId){
  const v=state.vekillar.find(x=>x.id===id);if(!v)return;
  document.getElementById(hiddenId).value=id;
  document.getElementById(araId).value='';
  document.getElementById(listeId).style.display='none';
  const meta=[v.baro,v.baroSicil?'Sicil: '+v.baroSicil:'',v.tel,v.mail].filter(Boolean).join(' · ');
  document.getElementById(gosterId).innerHTML=`
    <div><div class="kt-secili-ad">Av. ${v.ad}</div><div class="kt-secili-meta">${meta}</div></div>
    <button class="kt-secili-temizle" onclick="vekTemizle('${araId}','${hiddenId}','${gosterId}')" title="Seçimi kaldır">✕</button>`;
  document.getElementById(gosterId).style.display='flex';
}

function vekTemizle(araId,hiddenId,gosterId){
  document.getElementById(hiddenId).value='';
  document.getElementById(araId).value='';
  document.getElementById(gosterId).style.display='none';
  document.getElementById(gosterId).innerHTML='';
}

function vekYeniAc(araId,listeId,hiddenId,gosterId){
  _vekCtx={araId,listeId,hiddenId,gosterId};
  const q=document.getElementById(araId).value.trim();
  document.getElementById('vek-ad').value=q;
  ['vek-baro','vek-sicil','vek-tel','vek-mail','vek-uets','vek-banka','vek-acik'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='';});
  document.getElementById('vek-modal-title').textContent='Karşı Taraf Vekili Ekle';
  document.getElementById('vek-modal-btn').textContent='Kaydet & Seç';
  document.getElementById('vek-modal-btn').onclick=saveVekil;
  openModal('vek-modal');
}

function saveVekil(){
  const ad=document.getElementById('vek-ad').value.trim();
  if(!zorunluKontrol([{id:'vek-ad', deger:ad, label:'Ad Soyad'}])) {
    notify('⚠️ Zorunlu alanları doldurun.');return;
  }
  // IBAN doğrulama
  if (!numaralariDogrula([
    { id:'vek-banka', tip:'iban' },
  ])) {
    notify('⚠️ IBAN formatı hatalı, lütfen kontrol edin.');
    return;
  }
  if(!state.vekillar)state.vekillar=[];
  const v={
    id:uid(),sira:nextSira('vekillar'),ad,
    baroSicil:document.getElementById('vek-sicil').value.trim(),
    tbbSicil:document.getElementById('vek-tbb').value.trim(),
    tel:document.getElementById('vek-tel').value.trim(),
    mail:document.getElementById('vek-mail').value.trim(),
    uets:document.getElementById('vek-uets').value.trim(),
    banka:document.getElementById('vek-banka').value.trim(),
    aciklama:document.getElementById('vek-acik').value.trim()
  };
  state.vekillar.push(v);
  saveData();
  if(currentBuroId) saveToSupabase('vekillar', v);
  closeModal('vek-modal');
  notify('✓ Vekil kaydedildi');
  if(aktifRehberTab==='avukatlar')renderVekillarListesi();
  if(_vekCtx){
    vekSec(v.id,_vekCtx.araId,_vekCtx.listeId,_vekCtx.hiddenId,_vekCtx.gosterId);
    _vekCtx=null;
  }
}

// KT/Vekil helper getters
// Tel / IBAN formatlama
function formatTelInput(input){
  let v=input.value.replace(/\D/g,'');
  if(v.startsWith('0'))v=v.slice(1);
  if(v.startsWith('90'))v=v.slice(2);
  v=v.slice(0,10);
  let fmt='';
  if(v.length>0)fmt='('+v.slice(0,3);
  if(v.length>=3)fmt+=') '+v.slice(3,6);
  if(v.length>=6)fmt+=' '+v.slice(6,8);
  if(v.length>=8)fmt+=' '+v.slice(8,10);
  input.value=fmt;
}
function formatIbanInput(input){
  let v=input.value.replace(/\s/g,'').toUpperCase();
  if(!v.startsWith('TR'))v='TR'+(v.replace(/^[A-Z]{0,2}/,''));
  v=v.slice(0,26);
  let fmt=v.slice(0,4);
  for(let i=4;i<v.length;i+=4)fmt+=' '+v.slice(i,i+4);
  input.value=fmt;
}
function fmtTel(tel){if(!tel)return'';return tel;}
function fmtIban(iban){if(!iban)return'';return iban;}

// ================================================================
// NUMARA DOĞRULAMA SİSTEMİ
// ================================================================

// ── Yalnızca rakam girişine izin ver, maxlength uygula ───────────
function sadeceRakam(input, maxLen) {
  input.addEventListener('keydown', function(e) {
    const izin = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','Home','End'];
    if (izin.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;
    if (!/^\d$/.test(e.key)) { e.preventDefault(); return; }
    if (this.value.replace(/\s/g,'').length >= maxLen && this.selectionStart === this.selectionEnd) {
      e.preventDefault();
    }
  });
  input.addEventListener('input', function() {
    const temiz = this.value.replace(/\D/g,'').slice(0, maxLen);
    this.value = temiz;
  });
  input.addEventListener('paste', function(e) {
    e.preventDefault();
    const yapistirildi = (e.clipboardData||window.clipboardData).getData('text').replace(/\D/g,'').slice(0, maxLen);
    this.value = yapistirildi;
  });
}

// ── TC Kimlik formatı ve doğrulama ───────────────────────────────
function formatTcInput(input) {
  sadeceRakam(input, 11);
  input.setAttribute('maxlength', '11');
  input.setAttribute('placeholder', '11 haneli TC No');
  input.style.fontFamily = 'monospace';
  input.style.letterSpacing = '1px';
}

function tcDogrula(tc) {
  if (!tc) return { gecerli: true, mesaj: '' }; // boş — zorunlu değilse geç
  tc = tc.replace(/\D/g,'');
  if (tc.length !== 11) return { gecerli: false, mesaj: 'TC Kimlik No 11 haneli olmalıdır.' };
  if (tc[0] === '0') return { gecerli: false, mesaj: 'TC Kimlik No 0 ile başlayamaz.' };
  // Algoritma kontrolü
  const d = tc.split('').map(Number);
  const tek = d[0]+d[2]+d[4]+d[6]+d[8];
  const cift = d[1]+d[3]+d[5]+d[7];
  if ((tek*7 - cift) % 10 !== d[9]) return { gecerli: false, mesaj: 'Geçersiz TC Kimlik No (algoritma hatası).' };
  if ((d.slice(0,10).reduce((a,b)=>a+b,0)) % 10 !== d[10]) return { gecerli: false, mesaj: 'Geçersiz TC Kimlik No (kontrol hanesi hatalı).' };
  return { gecerli: true, mesaj: '' };
}

// ── Vergi No (10 hane, Türkiye) ──────────────────────────────────
function formatVergiInput(input) {
  sadeceRakam(input, 10);
  input.setAttribute('maxlength', '10');
  input.setAttribute('placeholder', '10 haneli Vergi No');
  input.style.fontFamily = 'monospace';
  input.style.letterSpacing = '1px';
}

function vergiNoDogrula(vn) {
  if (!vn) return { gecerli: true, mesaj: '' };
  vn = vn.replace(/\D/g,'');
  if (vn.length !== 10) return { gecerli: false, mesaj: 'Vergi No 10 haneli olmalıdır.' };
  // Vergi no algoritması
  const d = vn.split('').map(Number);
  let toplam = 0;
  for (let i = 0; i < 9; i++) {
    let v = (d[i] + (9 - i)) % 10;
    toplam += v === 0 ? 9 : (v * Math.pow(2, 9-i)) % 9 || 9;
  }
  const kontrol = toplam % 10 === 0 ? 0 : 10 - (toplam % 10);
  if (kontrol !== d[9]) return { gecerli: false, mesaj: 'Geçersiz Vergi No (kontrol hanesi hatalı).' };
  return { gecerli: true, mesaj: '' };
}

// ── MERSİS No (16 hane) ──────────────────────────────────────────
function formatMersisInput(input) {
  input.setAttribute('maxlength', '19'); // 0000-0000-0000-0000
  input.setAttribute('placeholder', '0000-0000-0000-0000');
  input.style.fontFamily = 'monospace';
  input.style.letterSpacing = '1px';
  input.addEventListener('keydown', function(e) {
    const izin = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','Home','End'];
    if (izin.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^\d$/.test(e.key)) { e.preventDefault(); return; }
    if (this.value.replace(/\D/g,'').length >= 16) { e.preventDefault(); return; }
  });
  input.addEventListener('input', function() {
    const rakamlar = this.value.replace(/\D/g,'').slice(0, 16);
    let fmt = '';
    for (let i = 0; i < rakamlar.length; i++) {
      if (i > 0 && i % 4 === 0) fmt += '-';
      fmt += rakamlar[i];
    }
    this.value = fmt;
  });
}

function mersisDogrula(m) {
  if (!m) return { gecerli: true, mesaj: '' };
  const rakam = m.replace(/\D/g,'');
  if (rakam.length !== 16) return { gecerli: false, mesaj: 'MERSİS No 16 haneli olmalıdır (0000-0000-0000-0000).' };
  return { gecerli: true, mesaj: '' };
}

// ── IBAN (TR + 24 rakam = 26 karakter) ──────────────────────────
function ibanDogrula(iban) {
  if (!iban) return { gecerli: true, mesaj: '' };
  const temiz = iban.replace(/\s/g,'').toUpperCase();
  if (!temiz.startsWith('TR')) return { gecerli: false, mesaj: 'IBAN TR ile başlamalıdır.' };
  if (temiz.length !== 26) return { gecerli: false, mesaj: `IBAN 26 karakter olmalıdır (şu an: ${temiz.length}).` };
  if (!/^TR\d{24}$/.test(temiz)) return { gecerli: false, mesaj: 'IBAN formatı hatalı (TR + 24 rakam).' };
  // MOD97 kontrolü
  const yeniden = temiz.slice(4) + temiz.slice(0,4);
  const sayi = yeniden.split('').map(c => isNaN(c) ? (c.charCodeAt(0)-55).toString() : c).join('');
  let mod = 0;
  for (const ch of sayi) mod = (mod * 10 + parseInt(ch)) % 97;
  if (mod !== 1) return { gecerli: false, mesaj: 'Geçersiz IBAN (mod97 kontrolü başarısız).' };
  return { gecerli: true, mesaj: '' };
}

// ── Pasaport / Yabancı Kimlik No ────────────────────────────────
function formatPasaportInput(input) {
  input.setAttribute('maxlength', '9');
  input.setAttribute('placeholder', 'Pasaport No (9 hane)');
  input.style.fontFamily = 'monospace';
  input.style.letterSpacing = '1px';
  input.addEventListener('input', function() {
    this.value = this.value.toUpperCase().slice(0, 9);
  });
}

function formatYabanciKimlikInput(input) {
  sadeceRakam(input, 11);
  input.setAttribute('maxlength', '11');
  input.setAttribute('placeholder', '11 haneli Yabancı Kimlik No');
  input.style.fontFamily = 'monospace';
  input.style.letterSpacing = '1px';
}

// ── Ticaret Sicil No ─────────────────────────────────────────────
function formatTicaretSicilInput(input) {
  input.setAttribute('maxlength', '20');
  input.setAttribute('placeholder', 'Ticaret Sicil No');
  input.style.fontFamily = 'monospace';
}

// ── Zorunlu alanları kırmızıyla vurgula, false dön ──────────────
function zorunluKontrol(alanlar) {
  // alanlar: [{id, deger?, label?}] — deger verilmezse input value'su okunur
  let hata = false;
  alanlar.forEach(({ id, deger, label }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = deger !== undefined ? deger : el.value?.trim();
    if (!val || val === '' || val === '0') {
      inputHataGoster(id, (label || el.previousElementSibling?.textContent?.replace('*','').trim() || 'Bu alan') + ' zorunludur.');
      if (!hata) { el.focus(); } // ilk hatalı alana focus
      hata = true;
    } else {
      inputHataTemizle(id);
    }
  });
  return !hata; // true = hepsiz dolu, false = eksik var
}
function inputHataGoster(inputId, mesaj) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.style.borderColor = 'var(--red)';
  input.style.boxShadow = '0 0 0 2px var(--red-dim)';
  let hataEl = input.parentNode.querySelector('.input-hata');
  if (!hataEl) {
    hataEl = document.createElement('div');
    hataEl.className = 'input-hata';
    hataEl.style.cssText = 'font-size:11px;color:#e74c3c;margin-top:4px;display:flex;align-items:center;gap:4px;';
    input.parentNode.appendChild(hataEl);
  }
  hataEl.innerHTML = '⚠️ ' + mesaj;
  // 5 saniye sonra otomatik temizle
  setTimeout(() => inputHataTemizle(inputId), 5000);
}

function inputHataTemizle(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.style.borderColor = '';
  input.style.boxShadow = '';
  const hataEl = input.parentNode.querySelector('.input-hata');
  if (hataEl) hataEl.remove();
}

// ── Input'a tıklayınca hata görselini temizle ────────────────────
function inputHataOlayEkle(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('focus', () => inputHataTemizle(inputId));
}

// ── Tüm numara alanlarını doğrula (kaydet öncesi) ────────────────
// Döner: true = geçerli, false = hata var
function numaralariDogrula(alanlar) {
  let hatalar = [];

  alanlar.forEach(({ id, tip, zorunlu }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const deger = el.value.trim();
    if (!deger && !zorunlu) return; // boş ve zorunlu değil — geç
    if (!deger && zorunlu) {
      inputHataGoster(id, 'Bu alan zorunludur.');
      hatalar.push(id);
      return;
    }
    let sonuc = { gecerli: true, mesaj: '' };
    if (tip === 'tc') sonuc = tcDogrula(deger);
    else if (tip === 'vergi') sonuc = vergiNoDogrula(deger);
    else if (tip === 'mersis') sonuc = mersisDogrula(deger);
    else if (tip === 'iban') sonuc = ibanDogrula(deger);
    if (!sonuc.gecerli) {
      inputHataGoster(id, sonuc.mesaj);
      hatalar.push(id);
    }
  });

  return hatalar.length === 0;
}

// ── Sayfa yüklenince format uygula ──────────────────────────────
function numaraFormatlariniUygula() {
  // Müvekkil formu
  const tc = document.getElementById('m-tc'); if(tc) formatTcInput(tc);
  const ytc = document.getElementById('m-yetkili-tc'); if(ytc) formatTcInput(ytc);
  const vn = document.getElementById('m-vergino'); if(vn) formatVergiInput(vn);
  const ms = document.getElementById('m-mersis'); if(ms) formatMersisInput(ms);
  const ps = document.getElementById('m-pasaport'); if(ps) formatPasaportInput(ps);
  const ts = document.getElementById('m-ticaretsicil'); if(ts) formatTicaretSicilInput(ts);
  // Karşı taraf formu
  const kttc = document.getElementById('kt-tc'); if(kttc) formatTcInput(kttc);
  const ktvn = document.getElementById('kt-vergino'); if(ktvn) formatVergiInput(ktvn);
  const ktms = document.getElementById('kt-mersis'); if(ktms) formatMersisInput(ktms);
  // Borçlu TC (icra)
  const btc = document.getElementById('i-btc'); if(btc) {
    btc.setAttribute('maxlength','11');
    btc.setAttribute('placeholder','TC No (11 hane) veya Vergi No (10 hane)');
  }
  // Hata temizleme event'leri
  ['m-tc','m-yetkili-tc','m-vergino','m-mersis','m-pasaport','kt-tc','kt-vergino','kt-mersis','kt-iban','vek-banka']
    .forEach(inputHataOlayEkle);
}

document.addEventListener('DOMContentLoaded', numaraFormatlariniUygula);

function getKT(id){return(state.karsiTaraflar||[]).find(x=>x.id===id);}
function getVek(id){return(state.vekillar||[]).find(x=>x.id===id);}
function getKTAd(id){const k=getKT(id);return k?k.ad:id||'—';}
function getVekAd(id){const v=getVek(id);return v?'Av. '+v.ad:id||'—';}

// Widget temizleme (modal açılışında)
function ktWidgetTemizle(araId,listeId,hiddenId,gosterId){
  document.getElementById(araId).value='';
  document.getElementById(listeId).style.display='none';
  document.getElementById(hiddenId).value='';
  document.getElementById(gosterId).style.display='none';
  document.getElementById(gosterId).innerHTML='';
}
// Widget doldurma (düzenleme modunda)
function ktWidgetDoldur(ktId,araId,listeId,hiddenId,gosterId){
  if(!ktId)return;
  const k=getKT(ktId);if(!k)return;
  document.getElementById(hiddenId).value=ktId;
  const meta=[k.tip==='tuzel'?'🏢 Tüzel':'👤 Gerçek',k.tc,k.tel,k.mail].filter(Boolean).join(' · ');
  document.getElementById(gosterId).innerHTML=`
    <div><div class="kt-secili-ad">${k.ad}</div><div class="kt-secili-meta">${meta}</div></div>
    <button class="kt-secili-temizle" onclick="ktTemizle('${araId}','${hiddenId}','${gosterId}')" title="Seçimi kaldır">✕</button>`;
  document.getElementById(gosterId).style.display='flex';
}
function vekWidgetDoldur(vekId,araId,listeId,hiddenId,gosterId){
  if(!vekId)return;
  const v=getVek(vekId);if(!v)return;
  document.getElementById(hiddenId).value=vekId;
  const meta=[v.baro,v.baroSicil?'Sicil: '+v.baroSicil:'',v.tel,v.mail].filter(Boolean).join(' · ');
  document.getElementById(gosterId).innerHTML=`
    <div><div class="kt-secili-ad">Av. ${v.ad}</div><div class="kt-secili-meta">${meta}</div></div>
    <button class="kt-secili-temizle" onclick="vekTemizle('${araId}','${hiddenId}','${gosterId}')" title="Seçimi kaldır">✕</button>`;
  document.getElementById(gosterId).style.display='flex';
}

function muvTab(t,el){
  document.querySelectorAll('#page-muv-detay .tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('#page-muv-detay .tab-panel').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');document.getElementById('mt-'+t).classList.add('active');
  const map={davalar:renderMdDavalar,belgeler:renderBelgeler,harcamalar:renderMdHarcamalar,
    avans:renderMdAvans,kimlik:renderMdKimlik,iletisim:renderMdIletisim,
    planlama:renderMdPlanlama,iliskiler:renderMdIliskiler,rapor:renderMdRapor,notlar:()=>{},danismanlik:renderMdDanismanlik};
  if(map[t])map[t]();
}

// ================================================================
// SPOTLIGHT ARAMA (Ctrl+K)
// ================================================================
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    spotlightAc();
  }
  if (e.key === 'Escape') spotlightKapat();
});

function spotlightAc() {
  const overlay = document.getElementById('spotlight-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  setTimeout(() => document.getElementById('spotlight-input')?.focus(), 50);
}

function spotlightKapat() {
  const overlay = document.getElementById('spotlight-overlay');
  if (overlay) overlay.style.display = 'none';
  const inp = document.getElementById('spotlight-input');
  if (inp) inp.value = '';
  const sonuclar = document.getElementById('spotlight-sonuclar');
  if (sonuclar) sonuclar.innerHTML = '';
}

document.addEventListener('click', function(e) {
  const overlay = document.getElementById('spotlight-overlay');
  if (overlay && e.target === overlay) spotlightKapat();
});

function spotlightAra(q) {
  const container = document.getElementById('spotlight-sonuclar');
  if (!container) return;
  q = q.trim();
  if (!q) { container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-dim);font-size:13px">Arama yapmak için yazmaya başlayın...</div>'; return; }

  const sonuclar = [];
  const ql = q.toLowerCase();

  // Müvekkiller
  (state.muvekkillar||[]).filter(m => (m.ad||'').toLowerCase().includes(ql) || (m.tel||'').includes(q) || (m.email||'').toLowerCase().includes(ql)).slice(0,5).forEach(m => {
    sonuclar.push({ ikon:'👤', baslik: m.ad, alt: m.tel||m.email||'Müvekkil', renk:'var(--gold)',
      onclick: `spotlightKapat();showMuvDetay('${m.id}')` });
  });

  // Davalar
  (state.davalar||[]).filter(d => (d.no||'').toLowerCase().includes(ql) || (d.konu||'').toLowerCase().includes(ql) || getMuvAd(d.muvId).toLowerCase().includes(ql)).slice(0,5).forEach(d => {
    sonuclar.push({ ikon:'📁', baslik: `${d.no||'—'} — ${d.konu||''}`, alt: getMuvAd(d.muvId), renk:'var(--blue)',
      onclick: `spotlightKapat();showPage('davalar',document.getElementById('ni-davalar'));openDavaDetay('${d.id}')` });
  });

  // İcra
  (state.icra||[]).filter(i => (i.no||'').toLowerCase().includes(ql) || (i.borclu||'').toLowerCase().includes(ql) || getMuvAd(i.muvId).toLowerCase().includes(ql)).slice(0,3).forEach(i => {
    sonuclar.push({ ikon:'⚡', baslik: `${i.no||'—'} — ${i.borclu||''}`, alt: getMuvAd(i.muvId), renk:'#e74c3c',
      onclick: `spotlightKapat();showPage('icra',document.getElementById('ni-icra'));openIcraDetay('${i.id}')` });
  });

  // İhtarnameler
  (state.ihtarnameler||[]).filter(ih => (ih.no||'').toLowerCase().includes(ql) || (ih.konu||'').toLowerCase().includes(ql) || (ih.karsiTaraf||'').toLowerCase().includes(ql)).slice(0,3).forEach(ih => {
    sonuclar.push({ ikon:'📨', baslik: `${ih.no||'—'} — ${ih.konu||''}`, alt: getMuvAd(ih.muvId)+' · '+ih.yon, renk:'var(--purple)',
      onclick: `spotlightKapat();showPage('ihtarname',document.getElementById('ni-ihtarname'));openIhtarDetay('${ih.id}')` });
  });

  if (!sonuclar.length) {
    container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:13px">🔍 "${q}" için sonuç bulunamadı</div>`;
    return;
  }

  container.innerHTML = sonuclar.map((s,i) => `
    <div onclick="${s.onclick}" style="display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;border-radius:8px;margin:2px 4px;transition:background .1s" 
      onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
      <span style="font-size:20px;width:28px;text-align:center">${s.ikon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.baslik}</div>
        <div style="font-size:11px;color:var(--text-muted)">${s.alt}</div>
      </div>
      <span style="font-size:10px;color:${s.renk};background:${s.renk}22;padding:2px 8px;border-radius:4px;font-weight:700;flex-shrink:0">↗</span>
    </div>`).join('');
}

// ================================================================
// DİNAMİK FORM FONKSİYONLARI
// ================================================================
function muvUyrukDegis(uyruk) {
  const tcGrup = document.getElementById('m-tc')?.closest('.form-group');
  const pasGrup = document.getElementById('m-pasaport')?.closest('.form-group');
  if (!tcGrup || !pasGrup) return;
  if (uyruk === 'yabanci') {
    tcGrup.style.display = 'none';
    pasGrup.style.display = 'block';
  } else {
    tcGrup.style.display = 'block';
    pasGrup.style.display = 'none';
  }
}

function muvMeslekSec(val) {
  const input = document.getElementById('m-meslek');
  if (!input) return;
  if (val === 'diger') {
    input.style.display = 'block';
    input.focus();
    input.value = '';
  } else if (val) {
    input.style.display = 'none';
    input.value = val;
  } else {
    input.style.display = 'none';
    input.value = '';
  }
}
