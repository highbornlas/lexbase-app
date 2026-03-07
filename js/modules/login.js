// ================================================================
// EMD HUKUK — LANDING PAGE VE LOGIN
// js/modules/login.js
// ================================================================

function lpInit() {
  // Önce landing'i göster (flash önleme)
  const landingEl = document.getElementById('landing-screen');
  if (landingEl) landingEl.classList.remove('hidden');

  // Daha önce giriş yapılmışsa direkt uygulamayı aç
  const saved = localStorage.getItem('hukuk_buro_v3');
  if (saved) {
    try {
      const p = JSON.parse(saved);
      if (p.sahipEmail && p.sahipSifre) {
        // Landing'i gizle, uygulamayı başlat
        if (landingEl) landingEl.classList.add('hidden');
        currentUser = { id: p.sahipId||'sahip', ad_soyad: p.sahipAd||'Büro Sahibi', email: p.sahipEmail, rol: 'sahip', yetkiler: {}, buro_ad: p.buroAd||'Hukuk Bürosu', _giris_sayisi: (p._giris_sayisi||0) };
        Object.assign(state, p);
        init();
        uygulamayiBaslatLocal();
        return;
      }
    } catch(e) {}
  }
  // Giriş yoksa landing'i göster ve init yap
  init();
  // Landing scroll efekti
  const nav = document.getElementById('lp-nav');
  const topbar = document.querySelector('.lp-topbar');
  if (nav) {
    document.getElementById('landing-screen').addEventListener('scroll', function() {
      const scrolled = this.scrollTop > 40;
      nav.classList.toggle('scrolled', scrolled);
      if (topbar) topbar.classList.toggle('hide', scrolled);
    });
  }
  // Scroll reveal
  lpRevealInit();
}

function lpRevealInit() {
  const els = document.querySelectorAll('.reveal');
  const container = document.getElementById('landing-screen');
  if (!container) return;
  const check = () => {
    const ch = container.clientHeight;
    els.forEach(el => {
      const rect = el.getBoundingClientRect();
      const top = rect.top - container.getBoundingClientRect().top;
      if (top < ch * 0.88) el.classList.add('visible');
    });
  };
  container.addEventListener('scroll', check);
  setTimeout(check, 100);
}

function lpScroll(id) {
  const el = document.getElementById(id);
  const container = document.getElementById('landing-screen');
  if (!el || !container) return;
  const offset = el.offsetTop - 80;
  container.scrollTo({ top: offset, behavior: 'smooth' });
}

function gmAc(tab) {
  document.getElementById('gm-overlay').classList.add('open');
  gmTab(tab || 'giris');
  document.getElementById('gm-err').style.display = 'none';
  // Odaklan
  setTimeout(() => {
    const el = tab === 'kayit'
      ? document.getElementById('gm-kad')
      : document.getElementById('gm-email');
    if (el) el.focus();
  }, 150);
}

function gmKapat() {
  document.getElementById('gm-overlay').classList.remove('open');
}

function gmTab(t) {
  document.getElementById('gm-t-giris').classList.toggle('active', t === 'giris');
  document.getElementById('gm-t-kayit').classList.toggle('active', t === 'kayit');
  document.getElementById('gm-f-giris').style.display = t === 'giris' ? 'block' : 'none';
  document.getElementById('gm-f-kayit').style.display = t === 'kayit' ? 'block' : 'none';
  document.getElementById('gm-err').style.display = 'none';
}

function gmHata(msg) {
  const e = document.getElementById('gm-err');
  e.textContent = msg; e.style.display = 'block';
}

function gmBasari(msg) {
  const e = document.getElementById('gm-err');
  e.textContent = msg;
  e.style.display = 'block';
  e.style.background = 'var(--green-dim, #1a3a2a)';
  e.style.borderColor = 'var(--green, #27ae60)';
  e.style.color = 'var(--green, #27ae60)';
}

function gmHataTemizle() {
  const e = document.getElementById('gm-err');
  if (e) { e.style.display = 'none'; e.textContent = ''; }
}

async function gmGiris() {
  const email = document.getElementById('gm-email').value.trim();
  const sifre = document.getElementById('gm-sifre').value;
  if (!email || !sifre) return gmHata('E-posta ve şifre gerekli.');
  const btn = document.querySelector('#gm-f-giris .gm-submit');
  btn.textContent = 'Giriş yapılıyor...'; btn.disabled = true;
  try {
    await sbGirisYap(email, sifre);
    btn.textContent = 'Giriş Yap'; btn.disabled = false;
    gmKapat();
  } catch(e) {
    btn.textContent = 'Giriş Yap'; btn.disabled = false;
    gmHata(e.message || 'E-posta veya şifre hatalı.');
  }
}

async function gmKayit() {
  const ad    = document.getElementById('gm-kad').value.trim();
  const email = document.getElementById('gm-kemail').value.trim();
  const sifre  = document.getElementById('gm-ksifre').value;
  const sifre2 = document.getElementById('gm-ksifre2').value;
  if (!ad || !email || !sifre) return gmHata('Tüm alanları doldurun.');
  if (sifre.length < 6) return gmHata('Şifre en az 6 karakter olmalı.');
  if (sifre !== sifre2) return gmHata('Şifreler eşleşmiyor.');
  const btn = document.querySelector('#gm-f-kayit .gm-submit');
  btn.textContent = 'Kayıt yapılıyor...'; btn.disabled = true;
  try {
    await sbKayitOl(email, sifre, ad);
    btn.textContent = 'Kayıt Ol & Başla →'; btn.disabled = false;
    gmTab('giris');
    gmBasari('✅ Kayıt başarılı! E-posta ve şifrenizle giriş yapın.');
    const emailEl = document.getElementById('gm-email');
    if (emailEl) emailEl.value = email;
  } catch(e) {
    btn.textContent = 'Kayıt Ol & Başla →'; btn.disabled = false;
    if (e.message && e.message.includes('already registered'))
      gmHata('Bu e-posta zaten kayıtlı. Giriş yapın.');
    else gmHata('Hata: ' + e.message);
  }
}


// Klavye: ESC ile modal kapat
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') gmKapat();
});

lpInit();

// ================================================================
// TAKSİT ÖNİZLEME
// ================================================================
function taksitOnizle(){
  const sayi=parseInt(document.getElementById('an-taksit-sayi')?.value)||0;
  const aralik=parseInt(document.getElementById('an-taksit-aralik')?.value)||1;
  const ucret=parseFloat(document.getElementById('an-taksit-ucret')?.value)||0;
  const bastar=document.getElementById('an-taksit-bastar')?.value;
  const box=document.getElementById('an-taksit-onizle');
  if(!box)return;
  if(!sayi||sayi<2){box.style.display='none';return;}
  const taksitTutar=ucret?Math.round((ucret/sayi)*100)/100:0;
  const aralikAd=aralik===1?'Aylık':aralik===2?'2 Aylık':aralik===3?'Çeyreklik':aralik===6?'Yarıyıllık':'Yıllık';
  let html=`<strong style="color:var(--gold)">${sayi} taksit · ${aralikAd}</strong>`;
  if(ucret)html+=` · Taksit tutarı: <strong style="color:var(--green)">${fmt(taksitTutar)}</strong>`;
  if(bastar&&sayi){
    const d=new Date(bastar);
    const son=new Date(bastar);
    son.setMonth(son.getMonth()+(sayi-1)*aralik);
    html+=`<br>İlk ödeme: <strong>${fmtD(bastar)}</strong> · Son ödeme: <strong>${fmtD(son.toISOString().split('T')[0])}</strong>`;
  }
  box.innerHTML=html;box.style.display='block';
}

// ================================================================
// ANLAŞMA — genişletilmiş change ve save
// ================================================================
function anlasmaChange(){
  const t=document.getElementById('an-tur').value;
  document.getElementById('an-pesin-alanlar').style.display=t==='pesin'?'block':'none';
  document.getElementById('an-taksit-alanlar').style.display=t==='taksit'?'block':'none';
  document.getElementById('an-basari-alanlar').style.display=(t==='basari'||t==='tahsilat')?'block':'none';
  document.getElementById('an-karma-alanlar').style.display=t==='karma'?'block':'none';
}
function saveAnlasma(){
  const obj=anlasmaCtx.type==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);if(!obj)return;
  const tur=document.getElementById('an-tur').value;
  obj.anlasma={
    tur,
    ucret:tur==='taksit'?parseFloat(document.getElementById('an-taksit-ucret').value)||0:parseFloat(document.getElementById('an-ucret').value)||0,
    otarih:tur==='taksit'?document.getElementById('an-taksit-bastar').value:document.getElementById('an-otarih').value,
    taksitSayi:tur==='taksit'?parseInt(document.getElementById('an-taksit-sayi').value)||0:0,
    taksitAralik:tur==='taksit'?parseInt(document.getElementById('an-taksit-aralik').value)||1:1,
    yuzde:parseFloat(document.getElementById('an-yuzde').value)||0,
    baz:parseFloat(document.getElementById('an-baz').value)||0,
    karmaP:parseFloat(document.getElementById('an-karma-pesin').value)||0,
    karmaYuzde:parseFloat(document.getElementById('an-karma-yuzde').value)||0,
    not:document.getElementById('an-not').value.trim(),
  };
  // Sözleşme ücreti varsa → dashboard alacaklar'a ekle
  const ucret=obj.anlasma.ucret;
  if(ucret>0){
    const muvId=obj.muvId||obj.muvid;
    const muvAd=getMuvAd(muvId)||'—';
    const dosyaNo=obj.no||obj.konu||'Dosya';
    // Daha önce bu dosya için alacak kaydı var mı? Varsa güncelle
    const mevcutIdx=state.avanslar.findIndex(a=>a.kaynak===obj.id&&a.tur==='Sözleşme Ücreti');
    const kayit={id:mevcutIdx>=0?state.avanslar[mevcutIdx].id:uid(),muvId,tur:'Sözleşme Ücreti',aciklama:`${dosyaNo} — Ücret Anlaşması`,tutar:ucret,tarih:obj.anlasma.otarih||today(),durum:'Bekliyor',kaynak:obj.id,kaynakTur:anlasmaCtx.type};
    if(mevcutIdx>=0)state.avanslar[mevcutIdx]=kayit;
    else state.avanslar.push(kayit);
    saveData();
  }
  closeModal('anlasma-modal');saveData();
  if(anlasmaCtx.type==='dava'){renderDavaTabContent('anlasma');renderDdCards(getDava(aktivDavaId));}
  else{renderIcraTabContent('anlasma');renderIdCards(getIcra(aktivIcraId));}
  renderDashboard();
  notify('✓ Anlaşma kaydedildi'+(ucret>0?' — Alacaklar güncellendi':''));
}
function openAnlasmaModal(ctx){
  anlasmaCtx={type:ctx};
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;
  const an=obj.anlasma||{};
  document.getElementById('an-tur').value=an.tur||'pesin';anlasmaChange();
  document.getElementById('an-ucret').value=an.tur!=='taksit'?(an.ucret||''):'';
  document.getElementById('an-otarih').value=an.tur!=='taksit'?(an.otarih||today()):today();
  document.getElementById('an-taksit-ucret').value=an.tur==='taksit'?(an.ucret||''):'';
  document.getElementById('an-taksit-bastar').value=an.tur==='taksit'?(an.otarih||today()):today();
  document.getElementById('an-taksit-sayi').value=an.taksitSayi||'';
  document.getElementById('an-taksit-aralik').value=an.taksitAralik||1;
  document.getElementById('an-yuzde').value=an.yuzde||'';
  document.getElementById('an-baz').value=an.baz||'';
  document.getElementById('an-karma-pesin').value=an.karmaP||'';
  document.getElementById('an-karma-yuzde').value=an.karmaYuzde||'';
  document.getElementById('an-not').value=an.not||'';
  document.getElementById('anlasma-modal').classList.add('open');
  taksitOnizle();
}

// ================================================================
// ANLAŞMA TAB — taksit detayı göster
// ================================================================
function renderAnlasmaTab(ctx,obj){
  const an=obj.anlasma||{};
  const deger=ctx==='icra'?(obj.alacak||0):(obj.deger||0);
  const turLabels={pesin:'Peşin Sabit Ücret',taksit:'Taksitli Ücret',basari:'Başarı Primi (%)',tahsilat:'Tahsilat Payı (%)',karma:'Karma (Peşin + %)'};
  const hesaplananHakediş=calcHakedisToplam(obj);
  let html=`<div class="section"><div class="section-header"><div class="section-title">🤝 Ücret Anlaşması Koşulları</div><button class="btn btn-gold btn-sm" onclick="openAnlasmaModal('${ctx}')">✏ Düzenle</button></div><div class="section-body">`;
  if(!an.tur){
    html+=`<div class="empty"><div class="empty-icon">🤝</div><p>Henüz anlaşma koşulları girilmedi</p><div style="margin-top:12px"><button class="btn btn-gold btn-sm" onclick="openAnlasmaModal('${ctx}')">+ Anlaşma Ekle</button></div></div>`;
  } else {
    let aciklama='';
    if(an.tur==='pesin') aciklama=`Sabit ücret: ${fmt(an.ucret||0)}`;
    else if(an.tur==='taksit') aciklama=`${fmt(an.ucret||0)} — ${an.taksitSayi||'?'} taksit × ${an.taksitAralik===1?'Aylık':an.taksitAralik+'lı'} = Taksit: ${fmt(Math.round((an.ucret||0)/(an.taksitSayi||1)*100)/100)}`;
    else if(an.tur==='basari'||an.tur==='tahsilat') aciklama=`%${an.yuzde||0} × ${fmt(an.baz||deger)} = ${fmt(hesaplananHakediş)}`;
    else if(an.tur==='karma') aciklama=`Peşin ${fmt(an.karmaP||0)} + %${an.karmaYuzde||0} × ${fmt(an.baz||deger)} = ${fmt(hesaplananHakediş)}`;
    html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
      <div class="hakediş-box"><div class="hakediş-label">Anlaşma Türü</div><div class="hakediş-value" style="font-size:17px;color:var(--gold-light)">${turLabels[an.tur]||an.tur}</div></div>
      <div class="hakediş-box" style="border-color:var(--gold)"><div class="hakediş-label">Toplam Ücret</div><div class="hakediş-value" style="color:var(--gold)">${fmt(an.ucret||hesaplananHakediş)}</div><div style="font-size:10px;color:var(--text-dim);margin-top:4px">${aciklama}</div></div>
      ${an.tur==='taksit'?`
        <div class="hakediş-box"><div class="hakediş-label">Taksit Sayısı</div><div class="hakediş-value">${an.taksitSayi||'—'} Taksit</div></div>
        <div class="hakediş-box"><div class="hakediş-label">Taksit Aralığı</div><div class="hakediş-value">${an.taksitAralik===1?'Aylık (her ay)':an.taksitAralik===2?'2 Aylık':an.taksitAralik===3?'Çeyreklik':an.taksitAralik===6?'Yarıyıllık':'Yıllık'}</div></div>
        <div class="hakediş-box"><div class="hakediş-label">Taksit Tutarı</div><div class="hakediş-value" style="color:var(--green)">${fmt(Math.round((an.ucret||0)/(an.taksitSayi||1)*100)/100)}</div></div>
        ${an.otarih?`<div class="hakediş-box"><div class="hakediş-label">İlk Ödeme</div><div class="hakediş-value" style="font-size:15px">${fmtD(an.otarih)}</div></div>`:''}
      `:''}
      ${an.tur==='pesin'&&an.otarih?`<div class="hakediş-box"><div class="hakediş-label">Ödeme Vadesi</div><div class="hakediş-value" style="font-size:15px">${fmtD(an.otarih)}</div></div>`:''}
      ${(an.tur==='basari'||an.tur==='tahsilat')&&an.yuzde?`<div class="hakediş-box"><div class="hakediş-label">Oran</div><div class="hakediş-value">%${an.yuzde}</div></div>`:''}
      ${an.tur==='karma'?`<div class="hakediş-box"><div class="hakediş-label">Peşin Kısım</div><div class="hakediş-value">${fmt(an.karmaP||0)}</div></div><div class="hakediş-box"><div class="hakediş-label">Tahsilat Payı</div><div class="hakediş-value">%${an.karmaYuzde||0}</div></div>`:''}
    </div>
    ${an.not?`<div style="background:var(--surface2);border-radius:var(--radius);padding:12px 14px;font-size:12px;color:var(--text-muted);line-height:1.6;white-space:pre-wrap;margin-bottom:14px">${an.not}</div>`:''}
    <div style="padding:12px 14px;background:var(--gold-dim);border:1px solid var(--gold);border-radius:var(--radius);font-size:12px;color:var(--gold-light)">
      💡 Tahsilat ve hakediş hareketlerini kaydetmek için <strong>Tahsilat & Hakediş</strong> sekmesini kullanın.
    </div>`;
  }
  html+='</div></div>';
  return html;
}

// ================================================================
// NOTLAR — KLASÖRLÜ SİSTEM
// ================================================================
const NOT_TURLERI=[
  {tur:'Çalışma Notu',      renk:'var(--gold)',    icon:'📋'},
  {tur:'Müvekkil Görüşme Notu',renk:'var(--blue)', icon:'💬'},
  {tur:'Duruşma Notu',      renk:'var(--green)',   icon:'⚖️'},
  {tur:'Strateji Notu',     renk:'#8e44ad',        icon:'🧠'},
  {tur:'Genel Not',         renk:'var(--text-dim)',icon:'📝'},
];
let _acikNotKlasorler={};


function toggleNotKlasor(ctx,tur){
  const key=ctx+'_'+tur;
  _acikNotKlasorler[key]=!_acikNotKlasorler[key];
  if(ctx==='dava')renderDavaTabContent('notlar');
  else renderIcraTabContent('notlar');
}
function openNotModal(ctx){
  notModalCtx={type:ctx,editId:null};
  document.getElementById('not-modal-title').textContent='📝 Not Ekle';
  document.getElementById('not-tur').value='Çalışma Notu';
  document.getElementById('not-tarih').value=today();
  document.getElementById('not-icerik').value='';
  document.getElementById('not-edit-id').value='';
  document.getElementById('not-modal').classList.add('open');
}
function openNotDuzenle(id,ctx){
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;
  const n=(obj.notlar||[]).find(x=>x.id===id);
  if(!n)return;
  notModalCtx={type:ctx,editId:id};
  document.getElementById('not-modal-title').textContent='✏ Notu Düzenle';
  document.getElementById('not-tur').value=n.tur;
  document.getElementById('not-tarih').value=n.tarih;
  document.getElementById('not-icerik').value=n.icerik;
  document.getElementById('not-edit-id').value=id;
  document.getElementById('not-modal').classList.add('open');
}
function saveNot(){
  const icerik=document.getElementById('not-icerik').value.trim();
  if(!zorunluKontrol([{id:'not-icerik',deger:icerik,label:'Not içeriği'}])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  const ctx=notModalCtx.type;
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;
  if(!obj.notlar)obj.notlar=[];
  const editId=document.getElementById('not-edit-id').value;
  if(editId){
    const idx=obj.notlar.findIndex(n=>n.id===editId);
    if(idx>=0)obj.notlar[idx]={...obj.notlar[idx],tur:document.getElementById('not-tur').value,tarih:document.getElementById('not-tarih').value,icerik};
    notify('✓ Not güncellendi');
  } else {
    const n={id:uid(),tur:document.getElementById('not-tur').value,tarih:document.getElementById('not-tarih').value,icerik};
    obj.notlar.push(n);
    // Yeni notun klasörünü otomatik aç
    _acikNotKlasorler[ctx+'_'+n.tur]=true;
    notify('✓ Not eklendi');
  }
  document.getElementById('not-icerik').value='';
  closeModal('not-modal');saveData();
  if(ctx==='dava')renderDavaTabContent('notlar');else renderIcraTabContent('notlar');
}
function delNot(id,ctx){
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;obj.notlar=(obj.notlar||[]).filter(n=>n.id!==id);
  saveData();
  if(ctx==='dava')renderDavaTabContent('notlar');else renderIcraTabContent('notlar');
  notify('Silindi');
}

// ================================================================
// DASHBOARD — anlaşma alacaklarını göster
// ================================================================
const _origRenderDashboard=typeof renderDashboard==='function'?renderDashboard:null;
function patchDashAlacaklar(){
  const al=[...state.avanslar.filter(a=>a.durum==='Bekliyor')];
  const da=document.getElementById('dash-alacaklar');if(!da)return;
  if(!al.length){da.innerHTML='<div class="empty"><div class="empty-icon">💸</div><p>Bekleyen alacak yok</p></div>';return;}
  da.innerHTML=al.map(a=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:12px;font-weight:600">${getMuvAd(a.muvId)||'—'}</div>
        <div style="font-size:10px;color:var(--text-muted)">${a.tur} · ${a.aciklama||''} · ${fmtD(a.tarih)}</div>
      </div>
      <span style="color:#e74c3c;font-weight:700;font-size:12px">${fmt(a.tutar)}</span>
    </div>`).join('');
}

// ================================================================
// ARABULUCULUK
// ================================================================
const ARAB_DURUM_STIL={
  'Başvuru Yapıldı':        {bg:'var(--blue-dim)',    bdr:'var(--blue)',    txt:'var(--blue)',    icon:'📨'},
  'İlk Toplantı Bekleniyor':{bg:'rgba(230,126,34,.15)',bdr:'#e67e22',      txt:'#e67e22',        icon:'⏳'},
  'Görüşmeler Devam Ediyor':{bg:'var(--gold-dim)',    bdr:'var(--gold)',    txt:'var(--gold)',    icon:'🔄'},
  'Uzlaşma Sağlandı':       {bg:'var(--green-dim)',   bdr:'var(--green)',   txt:'var(--green)',   icon:'✅'},
  'Uzlaşma Sağlanamadı':    {bg:'var(--red-dim)',     bdr:'var(--red)',     txt:'var(--red)',     icon:'❌'},
  'Dava Açıldı':            {bg:'rgba(142,68,173,.15)',bdr:'#8e44ad',      txt:'#8e44ad',        icon:'⚖️'},
};
function arabDurumBadge(d){
  const s=ARAB_DURUM_STIL[d]||{bg:'var(--surface2)',bdr:'var(--border)',txt:'var(--text-muted)',icon:'•'};
  return`<span class="arab-durum-badge" style="background:${s.bg};border:1px solid ${s.bdr};color:${s.txt}">${s.icon} ${d}</span>`;
}

let aktivArabId=null;

function getArab(id){return(state.arabuluculuk||[]).find(a=>a.id===id);}