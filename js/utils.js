// ============================================================
// UTILS.JS
// EMD Hukuk — js/utils.js
// ============================================================

// ================================================================
// UTILS
// ================================================================
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function fmt(n){return '₺'+Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2});}
function fmtD(d){if(!d)return'—';const p=d.split('-');return p[2]+'.'+p[1]+'.'+p[0];}
function today(){return new Date().toISOString().split('T')[0];}
function getMuv(id){return state.muvekkillar.find(m=>m.id===id);}
function getMuvAd(id){const m=getMuv(id);return m?m.ad:'—';}
function getDava(id){return state.davalar.find(d=>d.id===id);}
function getIcra(id){return state.icra.find(i=>i.id===id);}
function avatarI(ad){const p=(ad||'?').split(' ');return(p[0][0]+(p[1]?p[1][0]:'')).toUpperCase();}
function fileIcon(n){const e=(n||'').split('.').pop().toLowerCase();if(e==='pdf')return'📕';if(['doc','docx'].includes(e))return'📘';if(['jpg','jpeg','png'].includes(e))return'🖼';return'📎';}
function fileSize(d){const b=Math.round((d||'').length*.75);return b>1048576?(b/1048576).toFixed(1)+' MB':Math.round(b/1024)+' KB';}
function notify(msg){const e=document.getElementById('notif');e.textContent=msg;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2600);}



// ================================================================
// LOG SİSTEMİ
// ================================================================
function addLog(muvId,islem,detay){
  if(!muvId)return;
  if(!state.logs)state.logs=[];
  const now=new Date();
  const tarih=now.toISOString().slice(0,10);
  const saat=now.toTimeString().slice(0,5);
  state.logs.push({id:uid(),muvId,tarih,saat,islem,detay:detay||'',kullaniciAd:currentUser?.ad_soyad||'',kullaniciId:currentUser?.id||''});
  // Aktivite loguna da yaz
  addAktiviteLog(islem, detay, modulTespit(islem));
}

function modulTespit(islem) {
  if(/Müvekkil|Rehber/.test(islem)) return 'Müvekkil';
  if(/Dava/.test(islem)) return 'Dava';
  if(/İcra/.test(islem)) return 'İcra';
  if(/Belge|Evrak/.test(islem)) return 'Belge';
  if(/Finans|Avans|Harcama|Tahsilat|Bütçe/.test(islem)) return 'Finans';
  if(/Görev/.test(islem)) return 'Görev';
  if(/Personel/.test(islem)) return 'Personel';
  return 'Genel';
}

function addAktiviteLog(islem, detay, modul) {
  if(!state.aktiviteLog) state.aktiviteLog=[];
  const now=new Date();
  const entry = {
    id:uid(),
    kullaniciId: currentUser?.id||'sistem',
    kullaniciAd: currentUser?.ad_soyad||'Sistem',
    kullaniciRol: currentUser?.rol||'',
    islem, detay:detay||'', modul:modul||'Genel',
    tarih: now.toISOString().slice(0,10),
    saat: now.toTimeString().slice(0,5)
  };
  state.aktiviteLog.unshift(entry);
  if(state.aktiviteLog.length>500) state.aktiviteLog=state.aktiviteLog.slice(0,500);
  // Supabase'e async yaz (hata olursa sessizce geç)
  if(currentBuroId) {
    sb.from('aktivite_log').insert({
      buro_id: currentBuroId,
      kullanici_id: currentUser?.id||null,
      kullanici_ad: currentUser?.ad_soyad||'Sistem',
      kullanici_rol: currentUser?.rol||'',
      islem, detay:detay||'', modul:modul||'Genel',
    }).then(({error})=>{ if(error) console.warn('Aktivite log hatası:',error.message); });
  }
}
function openLogModal(){
  if(!aktivMuvId)return;
  if(!state.logs)state.logs=[];
  const logs=(state.logs.filter(l=>l.muvId===aktivMuvId)||[]).sort((a,b)=>(b.tarih+b.saat).localeCompare(a.tarih+a.saat));
  const m=getMuv(aktivMuvId);
  let html='';
  if(!logs.length){
    html='<div class="empty"><div class="empty-icon">📋</div><p>Henüz kayıt yok</p></div>';
  } else {
    html='<table style="width:100%"><thead><tr><th>Tarih</th><th>Saat</th><th>İşlem</th><th>Detay</th></tr></thead><tbody>';
    logs.forEach(l=>{
      const islemRenk=l.islem.includes('Silindi')?'#e74c3c':l.islem.includes('Düzenlendi')?'#f39c12':'var(--green)';
      html+=`<tr><td style="white-space:nowrap;font-size:12px">${fmtD(l.tarih)}</td><td style="font-size:12px;color:var(--text-muted)">${l.saat}</td><td><span style="color:${islemRenk};font-weight:600;font-size:12px">${l.islem}</span></td><td style="font-size:12px;color:var(--text-muted)">${l.detay}</td></tr>`;
    });
    html+='</tbody></table>';
  }
  document.getElementById('log-modal-content').innerHTML=html;
  openModal('log-modal');
}

const MRENK={'Asliye Hukuk':'#2980b9','Sulh Hukuk':'#3498db','Aile':'#8e44ad','Asliye Ticaret':'#16a085','Tüketici':'#27ae60','İş':'#f39c12','Kadastro':'#7f8c8d','Fikri ve Sınai Haklar Hukuk':'#2c3e50','Asliye Ceza':'#c0392b','Sulh Ceza':'#e74c3c','Ağır Ceza':'#922b21','Çocuk':'#e67e22','İdare':'#1abc9c','Vergi':'#0e6655','Bölge İdare':'#148f77','Bölge Adliye (İstinaf)':'#6c3483','Yargıtay':'#4a235a','Anayasa':'#1b2631','Diğer':'#566573'};
const ARENK={'İlk Derece':'var(--blue)','İstinaf':'var(--gold)','Yargıtay':'#8e44ad','Kesinleşti':'var(--green)','Düşürüldü':'var(--text-dim)'};
const IDRENK={'Aktif':'var(--green)','Takipte':'var(--gold)','Haciz Aşaması':'#e74c3c','Satış Aşaması':'#c0392b','Kapandı':'var(--text-dim)'};

// Normalize legacy data
function ensureArrays(obj, keys){keys.forEach(k=>{if(!obj[k])obj[k]=[];});}



// ================================================================
// NAVIGATION
// ================================================================
function showPage(id,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
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

function davaTab(t,el){
  document.querySelectorAll('#page-dava-detay .tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('#page-dava-detay .tab-panel').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');document.getElementById('dt-'+t).classList.add('active');
  renderDavaTabContent(t);
}

function icraTab(t,el){
  document.querySelectorAll('#page-icra-detay .tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('#page-icra-detay .tab-panel').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');document.getElementById('it-'+t).classList.add('active');
  renderIcraTabContent(t);
}



// ================================================================
// MODAL
// ================================================================
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(mo=>{mo.addEventListener('click',e=>{if(e.target===mo)mo.classList.remove('open');});});

function populateMuvSelects(){
  ['d-muv','i-muv','b-muv','t-muv','dan-muv'].forEach(sid=>{
    const el=document.getElementById(sid);if(!el)return;
    const hasEmpty=sid!=='d-muv'&&sid!=='i-muv';
    el.innerHTML=hasEmpty?'<option value="">—</option>':'';
    state.muvekkillar.forEach(m=>{el.innerHTML+=`<option value="${m.id}">${m.ad}</option>`;});
  });
}



// ================================================================
// TEMA SİSTEMİ
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
// BADGES
// ================================================================
function updateBadges(){
  const toplamRehber=state.muvekkillar.length+(state.karsiTaraflar||[]).length+(state.vekillar||[]).length;
  document.getElementById('nb-muv').textContent=toplamRehber;
  document.getElementById('nb-dav').textContent=state.davalar.filter(d=>d.durum==='Aktif').length;
  document.getElementById('nb-icr').textContent=state.icra.filter(i=>i.durum!=='Kapandı').length;
  const t=today(),f=new Date();f.setDate(f.getDate()+7);const fS=f.toISOString().split('T')[0];
  document.getElementById('nb-tak').textContent=state.etkinlikler.filter(e=>e.tarih>=t&&e.tarih<=fS).length;
  document.getElementById('nb-dan').textContent=state.danismanlik.filter(d=>d.durum!=='Tamamlandı'&&d.durum!=='İptal').length;
  const arabAktif=(state.arabuluculuk||[]).filter(a=>a.durum!=='Uzlaşma Sağlandı'&&a.durum!=='Dava Açıldı').length;
  const nbArab=document.getElementById('nb-arab');if(nbArab)nbArab.textContent=arabAktif;
  updateUyapBadge();
}

