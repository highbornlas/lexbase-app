// ================================================================
// EMD HUKUK — MÜVEKKIL VE REHBER
// js/modules/rehber.js
// ================================================================

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
function closeModal(id){
  const overlay = document.getElementById(id);
  if (!overlay) return;
  const modal = overlay.querySelector('.modal');
  if (modal) {
    modal.style.animation = 'modalOut .18s ease forwards';
    setTimeout(() => { overlay.classList.remove('open'); modal.style.animation = ''; }, 170);
  } else {
    overlay.classList.remove('open');
  }
}
// Modal overlay tıklayınca kapanmaz — kullanıcı kapatma tuşu kullanmalı

function populateMuvSelects(){
  ['d-muv','i-muv','b-muv','t-muv','dan-muv'].forEach(sid=>{
    const el=document.getElementById(sid);if(!el)return;
    const hasEmpty=sid!=='d-muv'&&sid!=='i-muv';
    el.innerHTML=hasEmpty?'<option value="">—</option>':'';
    state.muvekkillar.forEach(m=>{el.innerHTML+=`<option value="${m.id}">${m.ad}</option>`;});
  });
}

// ================================================================
// MÜVEKKİLLER
// ================================================================
// ── Müvekkil Modal Yardımcıları ─────────────────────────────────
var muvBankalar=[]; // [{banka,sube,iban,hesapNo,hesapAd}] — var kullanılmalı (bankaWidget.js window.muvBankalar'a erişir)
var ktBankalar=[]; // Karşı taraf banka hesapları
var muvModalMod='yeni'; // 'yeni' | 'duzenle'

function muvTipSec(tip){
  document.getElementById('m-tip').value=tip;
  document.getElementById('m-gercek-alanlar').style.display=tip==='gercek'?'block':'none';
  document.getElementById('m-tuzel-alanlar').style.display=tip==='tuzel'?'block':'none';
  const btnG=document.getElementById('m-tip-gercek');
  const btnT=document.getElementById('m-tip-tuzel');
  btnG.style.background=tip==='gercek'?'var(--gold)':'var(--surface2)';
  btnG.style.color=tip==='gercek'?'#000':'var(--text-muted)';
  btnT.style.background=tip==='tuzel'?'var(--gold)':'var(--surface2)';
  btnT.style.color=tip==='tuzel'?'#000':'var(--text-muted)';
}

function muvBankaEkle(data){
  const idx=muvBankalar.length;
  muvBankalar.push(data||{banka:'',sube:'',iban:'',hesapNo:'',hesapAd:''});
  renderMuvBankalar();
}
function muvBankaKaldir(idx){
  muvBankalar.splice(idx,1);renderMuvBankalar();
}
function renderMuvBankalar(){
  const el=document.getElementById('m-banka-list');if(!el)return;
  if(!muvBankalar.length){el.innerHTML='';return;}
  el.innerHTML=muvBankalar.map((b,i)=>`
  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;position:relative">
    <button type="button" onclick="muvBankaKaldir(${i})" style="position:absolute;top:8px;right:10px;background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:15px">✕</button>
    <div style="font-size:10px;text-transform:uppercase;color:var(--text-dim);margin-bottom:8px;font-weight:700">Banka Hesabı ${i+1}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><label style="font-size:10px;color:var(--text-muted)">Banka</label><input value="${b.banka}" oninput="muvBankalar[${i}].banka=this.value" placeholder="Banka Adı" style="width:100%;margin-top:2px"></div>
      <div><label style="font-size:10px;color:var(--text-muted)">Şube</label><input value="${b.sube}" oninput="muvBankalar[${i}].sube=this.value" placeholder="Şube Adı / No" style="width:100%;margin-top:2px"></div>
      <div style="grid-column:1/-1"><label style="font-size:10px;color:var(--text-muted)">IBAN</label><input value="${b.iban}" oninput="muvBankalar[${i}].iban=this.value" placeholder="TR00 0000 0000 0000 0000 0000 00" style="width:100%;margin-top:2px;font-family:monospace;letter-spacing:1px"></div>
      <div><label style="font-size:10px;color:var(--text-muted)">Hesap Adı</label><input value="${b.hesapAd}" oninput="muvBankalar[${i}].hesapAd=this.value" placeholder="Hesap sahibi adı" style="width:100%;margin-top:2px"></div>
      <div><label style="font-size:10px;color:var(--text-muted)">Hesap No</label><input value="${b.hesapNo}" oninput="muvBankalar[${i}].hesapNo=this.value" placeholder="Hesap numarası" style="width:100%;margin-top:2px"></div>
    </div>
  </div>`).join('');
}

function ktBankaEkle(data){
  ktBankalar.push(data||{banka:'',sube:'',iban:'',hesapNo:'',hesapAd:''});
  renderKtBankalar();
}
function ktBankaKaldir(idx){
  ktBankalar.splice(idx,1);renderKtBankalar();
}
function renderKtBankalar(){
  const el=document.getElementById('kt-banka-list');if(!el)return;
  if(!ktBankalar.length){el.innerHTML='';return;}
  el.innerHTML=ktBankalar.map((b,i)=>`
  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;position:relative">
    <button type="button" onclick="ktBankaKaldir(${i})" style="position:absolute;top:8px;right:10px;background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:15px">✕</button>
    <div style="font-size:10px;text-transform:uppercase;color:var(--text-dim);margin-bottom:8px;font-weight:700">Banka Hesabı ${i+1}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><label style="font-size:10px;color:var(--text-muted)">Banka</label><input value="${b.banka}" oninput="ktBankalar[${i}].banka=this.value" placeholder="Banka Adı" style="width:100%;margin-top:2px"></div>
      <div><label style="font-size:10px;color:var(--text-muted)">Şube</label><input value="${b.sube}" oninput="ktBankalar[${i}].sube=this.value" placeholder="Şube Adı / No" style="width:100%;margin-top:2px"></div>
      <div style="grid-column:1/-1"><label style="font-size:10px;color:var(--text-muted)">IBAN</label><input value="${b.iban}" oninput="ktBankalar[${i}].iban=this.value" placeholder="TR00 0000 0000 0000 0000 0000 00" style="width:100%;margin-top:2px;font-family:monospace;letter-spacing:1px"></div>
      <div><label style="font-size:10px;color:var(--text-muted)">Hesap Adı</label><input value="${b.hesapAd}" oninput="ktBankalar[${i}].hesapAd=this.value" placeholder="Hesap sahibi adı" style="width:100%;margin-top:2px"></div>
      <div><label style="font-size:10px;color:var(--text-muted)">Hesap No</label><input value="${b.hesapNo}" oninput="ktBankalar[${i}].hesapNo=this.value" placeholder="Hesap numarası" style="width:100%;margin-top:2px"></div>
    </div>
  </div>`).join('');
}

function muvModalSifirla(){
  const msoyad=document.getElementById('m-soyad');if(msoyad)msoyad.value='';
  ['m-ad','m-tc','m-pasaport','m-meslek','m-unvan','m-vergino','m-vergidairesi','m-mersis','m-ticaretsicil','m-yetkili-ad','m-yetkili-unvan','m-yetkili-tc','m-yetkili-tel','m-tel','m-mail','m-faks','m-web','m-not'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  const dog=document.getElementById('m-dogum');if(dog)dog.value='';
  if(typeof AdresWidget!=='undefined')AdresWidget.sifirla('m-adr-');
  muvBankalar=[];renderMuvBankalar();
  muvTipSec('gercek');
}

function muvModalDataOku(){
  const tip=document.getElementById('m-tip').value;
  const d={
    tip,
    ad: tip==='gercek'?(document.getElementById('m-ad').value.trim()||''):(document.getElementById('m-unvan').value.trim()||''),
    // gerçek kişi
    tc: document.getElementById('m-tc').value.trim(),
    dogum: document.getElementById('m-dogum')?.value||'',
    dogumYeri: document.getElementById('m-dogum-yeri')?.value.trim()||'',
    uyruk: document.getElementById('m-uyruk')?.value||'T.C.',
    pasaport: document.getElementById('m-pasaport').value.trim(),
    meslek: document.getElementById('m-meslek').value.trim(),
    // tüzel kişi
    unvan: document.getElementById('m-unvan').value.trim(),
    sirketTur: document.getElementById('m-sirket-tur')?.value||'',
    vergiNo: document.getElementById('m-vergino').value.trim(),
    vergiDairesi: document.getElementById('m-vergidairesi').value.trim(),
    mersis: document.getElementById('m-mersis').value.trim(),
    ticaretSicil: document.getElementById('m-ticaretsicil').value.trim(),
    yetkiliAd: document.getElementById('m-yetkili-ad').value.trim(),
    yetkiliUnvan: document.getElementById('m-yetkili-unvan').value.trim(),
    yetkiliTc: document.getElementById('m-yetkili-tc').value.trim(),
    yetkiliTel: document.getElementById('m-yetkili-tel').value.trim(),
    // iletişim
    tel: document.getElementById('m-tel').value.trim(),
    mail: document.getElementById('m-mail').value.trim(),
    faks: document.getElementById('m-faks').value.trim(),
    web: document.getElementById('m-web').value.trim(),
    uets: document.getElementById('m-uets')?.value.trim()||'',
    ...(typeof AdresWidget!=='undefined'?AdresWidget.oku('m-adr-'):{adres:''}),
    bankalar: JSON.parse(JSON.stringify(muvBankalar)),
    not: document.getElementById('m-not').value.trim(),
  };
  return d;
}

function muvModalDataDoldur(m){
  muvTipSec(m.tip||'gercek');
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v||'';};
  set('m-ad',m.ad);set('m-tc',m.tc);set('m-dogum',m.dogum);set('m-dogum-yeri',m.dogumYeri);set('m-pasaport',m.pasaport);set('m-meslek',m.meslek);
  const ur=document.getElementById('m-uyruk');if(ur){ur.value=m.uyruk||'T.C.';muvUyrukDegis(ur.value);}
  set('m-unvan',m.unvan||m.ad);
  const st=document.getElementById('m-sirket-tur');if(st)st.value=m.sirketTur||'A.Ş.';
  set('m-vergino',m.vergiNo);set('m-vergidairesi',m.vergiDairesi);set('m-mersis',m.mersis);set('m-ticaretsicil',m.ticaretSicil);
  set('m-yetkili-ad',m.yetkiliAd);set('m-yetkili-unvan',m.yetkiliUnvan);set('m-yetkili-tc',m.yetkiliTc);set('m-yetkili-tel',m.yetkiliTel);
  set('m-tel',m.tel);set('m-mail',m.mail);set('m-faks',m.faks);set('m-web',m.web);set('m-uets',m.uets);set('m-not',m.not);
  if(typeof AdresWidget!=='undefined')AdresWidget.doldur('m-adr-',m);
  muvBankalar=JSON.parse(JSON.stringify(m.bankalar||[]));renderMuvBankalar();
}

function saveMuvekkil(){
  // m-soyad varsa birleştir
  const soyadEl=document.getElementById('m-soyad');
  if(soyadEl&&soyadEl.value.trim()){const adEl=document.getElementById('m-ad');if(adEl)adEl.value=(adEl.value.trim()+' '+soyadEl.value.trim()).trim();}
  const d=muvModalDataOku();
  if(!zorunluKontrol([{id:'m-ad', deger:d.ad, label:'Ad / Unvan'}])) {
    notify('⚠️ Zorunlu alanları doldurun.');return;
  }
  // Numara doğrulama
  const tip = document.getElementById('m-tip')?.value || 'bireysel';
  const alanlar = [
    { id:'m-tc', tip:'tc' },
    { id:'m-yetkili-tc', tip:'tc' },
    { id:'m-vergino', tip:'vergi' },
    { id:'m-mersis', tip:'mersis' },
  ];
  if (!numaralariDogrula(alanlar)) {
    notify('⚠️ Hatalı veya eksik numara alanları var, lütfen kontrol edin.');
    return;
  }
  if(muvModalMod==='duzenle'){
    const m=getMuv(aktivMuvId);if(!m)return;
    Object.assign(m,d);
    addLog(aktivMuvId,'Müvekkil Düzenlendi',`${d.ad}${d.tel?' | '+d.tel:''}${d.mail?' | '+d.mail:''}`);
    if (typeof LexSubmit !== 'undefined') {
      var btn = document.querySelector('#m-modal .btn-gold');
      LexSubmit.formKaydet({tablo:'muvekkillar', kayit:m, modalId:'m-modal', butonEl:btn, basariMesaj:'✓ Güncellendi',
        renderFn:function(){ openDetay(aktivMuvId);renderMuvekkillar();if(typeof refreshFinansViews==='function')refreshFinansViews({muvId:aktivMuvId}); }
      });
    } else { closeModal('m-modal');saveData();openDetay(aktivMuvId);renderMuvekkillar();notify('✓ Güncellendi'); }
  } else {
    if(!limitKontrol('muvekkil')) return;
    // ── 1. Mükerrer kayıt kontrolü ──
    if (typeof MukerrerKontrol !== 'undefined') {
      const mukKontrol = MukerrerKontrol.kisiKontrol(d, state.muvekkillar);
      if (mukKontrol.length > 0) {
        MukerrerKontrol.uyariGoster('muvekkil', d.ad, mukKontrol, function() { _saveMuvMenfaatKontrol(d); });
        return;
      }
    }
    _saveMuvMenfaatKontrol(d);
  }
}
function _saveMuvMenfaatKontrol(d) {
    // ── 2. Menfaat çakışması kontrolü ──
    if (typeof MenfaatKontrol !== 'undefined') {
      const cakismalar = MenfaatKontrol.kontrolEt(d, 'muvekkil');
      if (cakismalar.length > 0) {
        MenfaatKontrol.uyariGoster(d.ad, cakismalar, function() { _saveMuvDevam(d); });
        return;
      }
    }
    _saveMuvDevam(d);
}
function _saveMuvDevam(d) {
    const yeniId=uid();
    const yeniKayit={id:yeniId,sira:nextSira('muvekkillar'),...d};
    state.muvekkillar.push(yeniKayit);
    addLog(yeniId,'Müvekkil Oluşturuldu',`${d.ad}${d.tel?' | '+d.tel:''}${d.mail?' | '+d.mail:''}`);
    if (typeof LexSubmit !== 'undefined') {
      var btn2 = document.querySelector('#m-modal .btn-gold');
      LexSubmit.formKaydet({tablo:'muvekkillar', kayit:yeniKayit, modalId:'m-modal', butonEl:btn2, basariMesaj:'✓ Müvekkil eklendi',
        renderFn:function(){ renderMuvekkillar();updateBadges(); }
      });
    } else { closeModal('m-modal');saveData();renderMuvekkillar();updateBadges();notify('✓ Müvekkil eklendi'); }
    // Dava modalından açıldıysa widget'ı güncelle
    if(typeof muvWidgetGuncelle==='function') muvWidgetGuncelle(yeniId);
}

function openMuvEdit(){
  const m=getMuv(aktivMuvId);if(!m)return;
  muvModalMod='duzenle';
  document.getElementById('m-modal-title').textContent='Müvekkil Düzenle';
  document.getElementById('m-kaydet-btn').textContent='Güncelle';
  document.getElementById('m-sil-btn').style.display='inline-flex';
  muvModalSifirla();
  muvModalDataDoldur(m);
  document.getElementById('m-modal').classList.add('open');
}

function openModal(id){
  if(id==='m-modal'){
    muvModalMod='yeni';
    document.getElementById('m-modal-title').textContent='Yeni Müvekkil';
    document.getElementById('m-kaydet-btn').textContent='Kaydet';
    document.getElementById('m-sil-btn').style.display='none';
    muvModalSifirla();
    // Numara format uygula
    setTimeout(()=>{
      const tc=document.getElementById('m-tc');if(tc&&!tc._fmt){formatTcInput(tc);tc._fmt=true;}
      const ytc=document.getElementById('m-yetkili-tc');if(ytc&&!ytc._fmt){formatTcInput(ytc);ytc._fmt=true;}
      const vn=document.getElementById('m-vergino');if(vn&&!vn._fmt){formatVergiInput(vn);vn._fmt=true;}
      const ms=document.getElementById('m-mersis');if(ms&&!ms._fmt){formatMersisInput(ms);ms._fmt=true;}
      const ps=document.getElementById('m-pasaport');if(ps&&!ps._fmt){formatPasaportInput(ps);ps._fmt=true;}
    },50);
  }
  if(id==='dav-modal'){
    // Tüm alanları sıfırla
    ['d-no','d-konu','d-mno','d-esas-yil','d-esas-no','d-karar-yil','d-karar-no',
     'd-hakim','d-derdest','d-icrano','d-deger','d-not','d-tarih','d-durusma',
     'd-ktarih','d-kesin','d-gelecek-durusma','d-durum-aciklama'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='';});
    const dm=document.getElementById('d-muv');if(dm){dm.value=aktivMuvId||'';}
    const da=document.getElementById('d-asama');if(da)da.value='İlk Derece';
    const dd=document.getElementById('d-durum');if(dd)dd.value='Aktif';
    const dtag=document.getElementById('d-durum-tag');if(dtag)dtag.value='🟢 Akışında';
    const dt=document.getElementById('d-taraf');if(dt)dt.value='Davacı';
    const dmtur=document.getElementById('d-mtur');if(dmtur)dmtur.value='';
    populateIlSelect('d-il','');
    document.getElementById('d-adliye').innerHTML='<option value="">— Önce il seçin —</option>';
    // Müvekkil widget temizle
    const muvG=document.getElementById('d-muv-secili');if(muvG){muvG.style.display='none';muvG.innerHTML='';}
    const muvA=document.getElementById('d-muv-ara');if(muvA)muvA.value='';
    // Çoklu karşı taraf alanlarını temizle
    const karsiWrap = document.getElementById('d-karsi-wrap');
    if (karsiWrap) {
      karsiWrap.innerHTML = `
        <div class="form-row d-karsi-satir" id="d-karsi-satir-0">
          <div class="form-group" style="flex:2"><label>Karşı Taraf</label>
            <div style="position:relative">
              <input id="d-karsi-ara-0" class="d-karsi-ara" placeholder="Ad ile ara..." autocomplete="off"
                oninput="ktAra(this.id,this.dataset.liste,this.dataset.hidden,this.dataset.goster)"
                onfocus="ktAra(this.id,this.dataset.liste,this.dataset.hidden,this.dataset.goster)"
                data-liste="d-karsi-dd-0" data-hidden="d-karsi-id-0" data-goster="d-karsi-g-0">
              <div id="d-karsi-dd-0" class="kt-dropdown" style="display:none"></div>
            </div>
            <div id="d-karsi-g-0" class="kt-secili" style="display:none"></div>
            <input type="hidden" id="d-karsi-id-0">
          </div>
          <div class="form-group"><label>Vekili</label>
            <div style="position:relative">
              <input id="d-karsav-ara-0" class="d-karsav-ara" placeholder="Vekil ara..." autocomplete="off"
                oninput="vekAra(this.id,this.dataset.liste,this.dataset.hidden,this.dataset.goster)"
                onfocus="vekAra(this.id,this.dataset.liste,this.dataset.hidden,this.dataset.goster)"
                data-liste="d-karsav-dd-0" data-hidden="d-karsav-id-0" data-goster="d-karsav-g-0">
              <div id="d-karsav-dd-0" class="kt-dropdown" style="display:none"></div>
            </div>
            <div id="d-karsav-g-0" class="kt-secili" style="display:none"></div>
            <input type="hidden" id="d-karsav-id-0">
          </div>
        </div>`;
      if (typeof _davaKarsiSayac !== 'undefined') _davaKarsiSayac = 1;
    }
    const dlbl=document.getElementById('dav-modal-title');if(dlbl)dlbl.textContent='Yeni Dava Dosyası';
    const dbtn=document.getElementById('dav-kaydet-btn');if(dbtn)dbtn.textContent='Kaydet';
    // Wizard ilk adıma döndür
    if (typeof Wizard !== 'undefined') Wizard.sifirla('dav-modal');
  }
  if(id==='icra-modal'){
    // Tüm alanları sıfırla
    ['i-no','i-borclu','i-btc','i-daire','i-esas','i-alacak','i-tahsil',
     'i-faiz','i-davno','i-dayanak','i-not','i-tarih','i-otarih','i-itarih'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='';});
    const im=document.getElementById('i-muv');if(im){im.value=aktivMuvId||'';}
    const itur=document.getElementById('i-tur');if(itur)itur.value='';
    const iatur=document.getElementById('i-atur');if(iatur)iatur.value='';
    const idurum=document.getElementById('i-durum');if(idurum)idurum.value='Devam Ediyor';
    populateIlSelect('i-il','');
    document.getElementById('i-adliye').innerHTML='<option value="">— Önce il seçin —</option>';
    // İcra karşı taraf widget temizle
    const iKarsiWrap = document.getElementById('i-karsi-liste-wrap');
    if (iKarsiWrap) {
      iKarsiWrap.innerHTML = `
        <div class="form-row i-karsi-satir">
          <div class="form-group" style="flex:2">
            <div style="position:relative">
              <input class="i-karsi-ara" placeholder="Ad ile ara veya yeni ekle..." autocomplete="off"
                id="i-karsi-ara-0"
                oninput="ktAra(this.id,this.dataset.liste,this.dataset.hidden,this.dataset.goster)"
                onfocus="ktAra(this.id,this.dataset.liste,this.dataset.hidden,this.dataset.goster)"
                data-liste="i-karsi-dd-0" data-hidden="i-karsi-id-0" data-goster="i-karsi-g-0">
              <div id="i-karsi-dd-0" class="kt-dropdown" style="display:none"></div>
            </div>
            <div id="i-karsi-g-0" class="kt-secili" style="display:none"></div>
            <input type="hidden" id="i-karsi-id-0">
          </div>
        </div>`;
      if (typeof _icraKarsiSayac !== 'undefined') _icraKarsiSayac = 1;
    }
    // İcra müvekkil widget temizle
    const iMuvG = document.getElementById('i-muv-secili');
    if (iMuvG) { iMuvG.style.display='none'; iMuvG.innerHTML=''; }
    const iMuvH = document.getElementById('i-muv');
    if (iMuvH) iMuvH.value = '';
    const iMuvAra = document.getElementById('i-muv-ara');
    if (iMuvAra) iMuvAra.value = '';
    const ilbl=document.getElementById('icra-modal-title');if(ilbl)ilbl.textContent='Yeni İcra Takibi';
    const ibtn=document.getElementById('icra-kaydet-btn');if(ibtn)ibtn.textContent='Kaydet';
  }
  if(id==='avans-modal'){
    avansEditId=null;
    document.getElementById('avans-modal-title').textContent='Avans / Alacak Ekle';
    const sel=document.getElementById('a-dosya');
    sel.innerHTML='<option value="">— Dosyaya bağlamayın —</option>';
    if(aktivMuvId){
      state.davalar.filter(d=>d.muvId===aktivMuvId).forEach(d=>{
        sel.innerHTML+='<option value="dava:'+d.id+'">📁 '+d.no+' — '+d.konu+'</option>';
      });
      state.icra.filter(i=>i.muvId===aktivMuvId).forEach(i=>{
        sel.innerHTML+='<option value="icra:'+i.id+'">⚡ '+i.no+' — '+i.borclu+'</option>';
      });
    }
  }
  if(id==='tak-modal'){
    // Etkinlik ekle modali sıfırla
    takModalEditId=null;
    document.getElementById('tak-modal-title').textContent='Etkinlik Ekle';
    document.getElementById('tak-kaydet-btn').textContent='Kaydet';
    document.getElementById('tak-sil-btn').style.display='none';
    ['t-baslik','t-not','t-yer'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='';});
    document.getElementById('t-saat').value='09:00';
    document.getElementById('t-hatirlatma').value='';
    populateTakMuvSelect();
    // Eğer müvekkil detay sayfasındaysak, müvekkili ön seçili yap
    if(aktivMuvId){
      const sel=document.getElementById('t-muv');
      sel.value=aktivMuvId;
      populateTakDavSelect(aktivMuvId);
    }
  }
  populateMuvSelects();
  ['b-tarih','t-tarih','d-tarih','h-tarih','a-tarih','i-tarih','not-tarih','ev-tarih'].forEach(f=>{
    const e=document.getElementById(f);if(e&&!e.value)e.value=today();
  });
  // X butonunu her modala inject et
  const overlay = document.getElementById(id);
  if (overlay) {
    const modal = overlay.querySelector('.modal');
    if (modal && !modal.querySelector('.modal-x-btn')) {
      const xBtn = document.createElement('button');
      xBtn.className = 'modal-x-btn';
      xBtn.innerHTML = '✕';
      xBtn.title = 'Kapat';
      xBtn.onclick = () => closeModal(id);
      modal.prepend(xBtn);
    }
    overlay.classList.add('open');
  }
}

function updateMuvekkil(){saveMuvekkil();}

function deleteMuvekkil(){
  if(!confirm('Bu müvekkili ve ilişkili tüm verileri silmek istediğinize emin misiniz?'))return;
  const silId = aktivMuvId;
  state.muvekkillar=state.muvekkillar.filter(m=>m.id!==silId);
  state.davalar=state.davalar.filter(d=>d.muvId!==silId);
  state.icra=state.icra.filter(i=>i.muvId!==silId);
  state.avanslar=state.avanslar.filter(a=>a.muvId!==silId);
  state.belgeler=state.belgeler.filter(b=>b.muvId!==silId);
  if(currentBuroId) deleteFromSupabase('muvekkillar', silId);
  closeModal('m-modal');saveData();showPage('muvekkillar',document.getElementById('ni-muvekkillar'));notify('Müvekkil silindi');
}
function renderMuvekkillar(filter=''){
  const list=document.getElementById('muv-list'),empty=document.getElementById('muv-empty');
  let ms=state.muvekkillar;
  if(filter){
    const q=filter.toLowerCase();
    ms=ms.filter(m=>(m.ad||'').toLowerCase().includes(q)||(m.tc||'').includes(q)||(m.vergiNo||'').includes(q)||(m.mersis||'').includes(q)||(m.tel||'').includes(q));
  }
  ms=sortArr(ms,'muv');
  if(!ms.length){list.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  const sortBar=`<div class="sort-bar" style="grid-template-columns:36px 1fr 120px 100px 80px">
    <div class="sh active" style="justify-content:center;cursor:pointer" onclick="toggleSort('muv','sira')">#${shIcon('muv','sira')}</div>
    <div class="${shCls('muv','ad')}" onclick="toggleSort('muv','ad')">Ad / Unvan ${shIcon('muv','ad')}</div>
    <div class="${shCls('muv','tel')}" onclick="toggleSort('muv','tel')">Telefon ${shIcon('muv','tel')}</div>
    <div class="${shCls('muv','tip')}" onclick="toggleSort('muv','tip')">Tür ${shIcon('muv','tip')}</div>
    <div class="${shCls('muv','sira')}" onclick="toggleSort('muv','sira')" style="text-align:right">Kayıt ${shIcon('muv','sira')}</div>
  </div>`;
  list.innerHTML=sortBar+ms.map(m=>{
    const davSay=state.davalar.filter(d=>d.muvId===m.id).length;
    const icraSay=state.icra.filter(i=>i.muvId===m.id).length;
    const beklAlacak=state.avanslar.filter(a=>a.muvId===m.id&&a.durum==='Bekliyor').reduce((s,a)=>s+a.tutar,0);
    const isTuzel=m.tip==='tuzel';
    const tipBadge=isTuzel
      ?`<span style="background:rgba(52,152,219,.18);color:#5dade2;border-radius:4px;font-size:9px;font-weight:700;padding:1px 7px;margin-left:7px;vertical-align:middle">🏢 TÜZEL</span>`
      :`<span style="background:rgba(46,204,113,.15);color:#2ecc71;border-radius:4px;font-size:9px;font-weight:700;padding:1px 7px;margin-left:7px;vertical-align:middle">👤 GERÇEK</span>`;
    const idNo=isTuzel?(m.vergiNo?'VKN: '+m.vergiNo:m.mersis?'MERSİS: '+m.mersis:''):(m.tc?'TC: '+m.tc:'');
    const altBilgi=isTuzel?(m.yetkiliAd?'Yetkili: '+m.yetkiliAd+(m.sirketTur?' · '+m.sirketTur:''):m.sirketTur||''):(m.meslek||'');
    return`<div class="muv-card" onclick="openDetay('${m.id}')" style="border-radius:${m===ms[0]?'0':''} 0 0 0">
      <div class="sira-badge"><span class="sira-num">${m.sira||'?'}</span><span class="sira-lbl">No</span></div>
      <div class="muv-card-inner">
      <div class="muv-avatar" style="${isTuzel?'background:linear-gradient(135deg,#1a3a5c,#2980b9);color:#fff;font-size:12px':''}">${avatarI(m.ad)}</div>
      <div class="muv-card-info">
        <div class="muv-card-name">${m.ad}${tipBadge}</div>
        <div class="muv-card-meta">${[idNo,m.tel,m.mail].filter(Boolean).join(' · ')||'İletişim bilgisi yok'}</div>
        ${altBilgi?`<div class="muv-card-meta" style="font-size:10px;color:var(--text-dim);margin-top:1px">${altBilgi}</div>`:''}
      </div>
      <div class="muv-card-stats">
        <div class="muv-stat"><div class="muv-stat-val gold">${davSay}</div><div class="muv-stat-lbl">Dava</div></div>
        <div class="muv-stat"><div class="muv-stat-val" style="color:var(--blue)">${icraSay}</div><div class="muv-stat-lbl">İcra</div></div>
        ${beklAlacak>0?`<div class="muv-stat"><div class="muv-stat-val" style="color:#e74c3c">${fmt(beklAlacak)}</div><div class="muv-stat-lbl">Alacak</div></div>`:''}
        <div class="muv-stat">${skorBadge(m.id)}<div class="muv-stat-lbl" style="margin-top:2px">Skor</div></div>
      </div>
      </div>
    </div>`;
  }).join('');
}
function filterMuvekkillar(v){renderMuvekkillar(v);}

// ================================================================
// REHBER SEKME SİSTEMİ
// ================================================================
let aktifRehberTab='muvekkillar';
function rehberTab(tab,el){
  aktifRehberTab=tab;
  document.querySelectorAll('#page-muvekkillar .tabs .tab').forEach(t=>t.classList.remove('active'));
  if(el)el.classList.add('active');
  ['muvekkillar','karsitaraflar','avukatlar'].forEach(p=>{
    document.getElementById('rehber-panel-'+p).style.display=p===tab?'block':'none';
  });
  if(tab==='karsitaraflar')renderKarsiTaraflarListesi();
  if(tab==='avukatlar')renderVekillarListesi();
}

// ----------------------------------------------------------------
// KARŞI TARAFLAR LİSTESİ
// ----------------------------------------------------------------
function renderKarsiTaraflarListesi(filtre=''){
  if(!state.karsiTaraflar)state.karsiTaraflar=[];
  const list=document.getElementById('kt-list'),empty=document.getElementById('kt-empty');
  let kts=state.karsiTaraflar;
  if(filtre){const q=filtre.toLowerCase();kts=kts.filter(k=>(k.ad||'').toLowerCase().includes(q)||(k.tc||'').includes(q)||(k.tel||'').includes(q));}
  kts=sortArr(kts,'kt');
  if(!kts.length){list.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  const sortBarKT=`<div class="sort-bar" style="grid-template-columns:36px 1fr 120px 80px 100px">
    <div class="${shCls('kt','sira')}" style="justify-content:center" onclick="toggleSort('kt','sira')">#${shIcon('kt','sira')}</div>
    <div class="${shCls('kt','ad')}" onclick="toggleSort('kt','ad')">Ad / Unvan ${shIcon('kt','ad')}</div>
    <div class="${shCls('kt','tc')}" onclick="toggleSort('kt','tc')">TC / VKN ${shIcon('kt','tc')}</div>
    <div class="${shCls('kt','tip')}" onclick="toggleSort('kt','tip')">Tür ${shIcon('kt','tip')}</div>
    <div class="${shCls('kt','tel')}" onclick="toggleSort('kt','tel')">Telefon ${shIcon('kt','tel')}</div>
  </div>`;
  list.innerHTML=sortBarKT+kts.map(k=>{
    const davlar=state.davalar.filter(d=>d.karsiId===k.id).length;
    const icralar=state.icra.filter(i=>i.karsiId===k.id).length;
    const tip=k.tip==='tuzel'?'🏢 Tüzel':'👤 Gerçek';
    const meta=[k.tc?'TC/VKN: '+k.tc:'',k.tel,k.mail].filter(Boolean).join(' · ');
    return`<div class="muv-card" onclick="openKTProfil('${k.id}')">
      <div class="sira-badge"><span class="sira-num">${k.sira||'?'}</span><span class="sira-lbl">No</span></div>
      <div class="muv-card-inner">
      <div class="muv-avatar" style="${k.tip==='tuzel'?'background:linear-gradient(135deg,#1a3a5c,#2980b9);color:#fff;font-size:12px':''}">${avatarI(k.ad)}</div>
      <div class="muv-card-info">
        <div class="muv-card-name">${k.ad} <span style="background:rgba(231,76,60,.15);color:#e74c3c;border-radius:4px;font-size:9px;font-weight:700;padding:1px 7px;margin-left:6px;vertical-align:middle">${tip}</span></div>
        <div class="muv-card-meta">${meta||'İletişim bilgisi yok'}</div>
        ${k.adres?`<div class="muv-card-meta" style="font-size:10px;color:var(--text-dim)">${k.adres}</div>`:''}
      </div>
      <div class="muv-card-stats">
        <div class="muv-stat"><div class="muv-stat-val gold">${davlar}</div><div class="muv-stat-lbl">Dava</div></div>
        <div class="muv-stat"><div class="muv-stat-val" style="color:var(--blue)">${icralar}</div><div class="muv-stat-lbl">İcra</div></div>
      </div>
      </div>
    </div>`;
  }).join('');
}
function filterKarsiTaraflar(v){renderKarsiTaraflarListesi(v);}
function ktTipSec(tip){
  document.getElementById('kt-tip').value=tip;
  // Buton stilleri — müvekkil ile aynı
  const btnG=document.getElementById('kt-tip-gercek-btn');
  const btnT=document.getElementById('kt-tip-tuzel-btn');
  if(btnG){btnG.style.background=tip==='gercek'?'var(--gold)':'var(--surface2)';btnG.style.color=tip==='gercek'?'#000':'var(--text-muted)';}
  if(btnT){btnT.style.background=tip==='tuzel'?'var(--gold)':'var(--surface2)';btnT.style.color=tip==='tuzel'?'#000':'var(--text-muted)';}
  document.getElementById('kt-gercek-alanlari').style.display=tip==='gercek'?'':'none';
  document.getElementById('kt-tuzel-alanlari').style.display=tip==='tuzel'?'':'none';
  // Tüzel seçilince kt-ad alanını gizle (unvan alanı var), gerçek kişide göster
  const ktAd=document.getElementById('kt-ad');
  const ktAdTuzel=document.getElementById('kt-ad-tuzel');
  if(tip==='tuzel'){
    if(ktAd)ktAd.closest('.form-group').style.display='none';
    if(ktAdTuzel)ktAdTuzel.value=ktAd?ktAd.value:'';
  } else {
    if(ktAd)ktAd.closest('.form-group').style.display='';
  }
}
function ktModalSifirla(){
  ['kt-ad','kt-soyad','kt-ad-tuzel','kt-tc','kt-dogum','kt-dogum-yeri','kt-meslek','kt-vergino','kt-vergidairesi','kt-mersis',
   'kt-yetkili-ad','kt-yetkili-unvan','kt-yetkili-tc','kt-yetkili-tel',
   'kt-tel','kt-faks','kt-web','kt-mail','kt-uets',
   'kt-acik'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='';});
  if(typeof AdresWidget!=='undefined')AdresWidget.sifirla('kt-adr-');
  ktBankalar=[];renderKtBankalar();
  const ku=document.getElementById('kt-uyruk');if(ku)ku.value='T.C.';
  const ks=document.getElementById('kt-sirkettur');if(ks)ks.value='A.Ş.';
  const km=document.getElementById('kt-meslek-sel');if(km)km.value='';
  // kt-ad alanını tekrar görünür yap
  const ktAd=document.getElementById('kt-ad');
  if(ktAd&&ktAd.closest('.form-group'))ktAd.closest('.form-group').style.display='';
  ktTipSec('gercek');
}
function ktModalDataOku(){
  const tip=document.getElementById('kt-tip').value;
  // Gerçek kişi: Ad + Soyad birleştir; Tüzel: unvan alanından al
  let ad=document.getElementById('kt-ad').value.trim();
  const soyad=(document.getElementById('kt-soyad')?.value.trim())||'';
  if(tip==='gercek' && soyad) ad = ad + ' ' + soyad;
  if(tip==='tuzel'){
    const tuzelAd=document.getElementById('kt-ad-tuzel');
    if(tuzelAd&&tuzelAd.value.trim()) ad=tuzelAd.value.trim();
  }
  return{
    tip,
    ad,
    soyad,
    tc:document.getElementById('kt-tc').value.trim(),
    dogum:document.getElementById('kt-dogum')?.value||'',
    dogumYeri:document.getElementById('kt-dogum-yeri')?.value.trim()||'',
    meslek:document.getElementById('kt-meslek')?.value.trim()||'',
    uyruk:document.getElementById('kt-uyruk')?.value||'T.C.',
    sirketTur:document.getElementById('kt-sirkettur')?.value||'',
    vergiNo:document.getElementById('kt-vergino')?.value.trim()||'',
    vergiDairesi:document.getElementById('kt-vergidairesi')?.value.trim()||'',
    mersis:document.getElementById('kt-mersis')?.value.trim()||'',
    pasaport:document.getElementById('kt-pasaport')?.value.trim()||'',
    yetkiliAd:document.getElementById('kt-yetkili-ad')?.value.trim()||'',
    yetkiliUnvan:document.getElementById('kt-yetkili-unvan')?.value.trim()||'',
    yetkiliTc:document.getElementById('kt-yetkili-tc')?.value.trim()||'',
    yetkiliTel:document.getElementById('kt-yetkili-tel')?.value.trim()||'',
    ticaretSicil:document.getElementById('kt-ticaretsicil')?.value.trim()||'',
    tel:document.getElementById('kt-tel').value.trim(),
    faks:document.getElementById('kt-faks')?.value.trim()||'',
    web:document.getElementById('kt-web')?.value.trim()||'',
    mail:document.getElementById('kt-mail').value.trim(),
    uets:document.getElementById('kt-uets')?.value.trim()||'',
    ...(typeof AdresWidget!=='undefined'?AdresWidget.oku('kt-adr-'):{adres:''}),
    bankalar:JSON.parse(JSON.stringify(ktBankalar.filter(b=>b.banka||b.iban))),
    aciklama:document.getElementById('kt-acik').value.trim(),
  };
}
function ktModalDataDoldur(k){
  ktTipSec(k.tip||'gercek');
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v||'';};
  // Ad/Soyad ayrıştırma — eski veri tek ad alanında olabilir
  if(k.soyad){
    set('kt-ad',k.ad.replace(new RegExp('\\s+'+k.soyad.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'),'').trim()||k.ad);
    set('kt-soyad',k.soyad);
  } else {
    // Eski format: tek ad — son kelimeyi soyad olarak ayır
    var adParcalar=(k.ad||'').trim().split(/\s+/);
    if(adParcalar.length>1){
      set('kt-soyad',adParcalar.pop());
      set('kt-ad',adParcalar.join(' '));
    } else {
      set('kt-ad',k.ad);set('kt-soyad','');
    }
  }
  set('kt-tc',k.tc);set('kt-dogum',k.dogum);set('kt-meslek',k.meslek);
  const ku=document.getElementById('kt-uyruk');if(ku)ku.value=k.uyruk||'T.C.';
  const ks=document.getElementById('kt-sirkettur');if(ks)ks.value=k.sirketTur||'A.Ş.';
  set('kt-vergino',k.vergiNo);set('kt-vergidairesi',k.vergiDairesi);set('kt-mersis',k.mersis);
  set('kt-yetkili-ad',k.yetkiliAd);set('kt-yetkili-unvan',k.yetkiliUnvan);
  set('kt-yetkili-tc',k.yetkiliTc);set('kt-yetkili-tel',k.yetkiliTel);
  set('kt-ticaretsicil',k.ticaretSicil);set('kt-pasaport',k.pasaport);set('kt-dogum-yeri',k.dogumYeri);
  set('kt-tel',k.tel);set('kt-faks',k.faks);set('kt-web',k.web);set('kt-mail',k.mail);set('kt-uets',k.uets);
  set('kt-acik',k.aciklama);
  if(typeof AdresWidget!=='undefined')AdresWidget.doldur('kt-adr-',k);
  // Banka widget — eski (tekli banka/iban) ve yeni (bankalar dizisi) formatı destekle
  if(k.bankalar&&k.bankalar.length){
    ktBankalar=JSON.parse(JSON.stringify(k.bankalar));
  } else if(k.banka||k.iban){
    ktBankalar=[{banka:k.banka||'',sube:'',iban:k.iban||'',hesapNo:'',hesapAd:''}];
  } else {
    ktBankalar=[];
  }
  renderKtBankalar();
}
function openYeniKT(){
  _ktCtx=null;
  ktModalSifirla();
  document.getElementById('kt-modal-title').textContent='Karşı Taraf Ekle';
  document.getElementById('kt-modal-btn').textContent='Kaydet';
  document.getElementById('kt-modal-btn').onclick=saveKarsiTaraf;
  openModal('kt-modal');
  setTimeout(()=>{
    const kttc=document.getElementById('kt-tc');if(kttc&&!kttc._fmt){formatTcInput(kttc);kttc._fmt=true;}
    const ktvn=document.getElementById('kt-vergino');if(ktvn&&!ktvn._fmt){formatVergiInput(ktvn);ktvn._fmt=true;}
    const ktms=document.getElementById('kt-mersis');if(ktms&&!ktms._fmt){formatMersisInput(ktms);ktms._fmt=true;}
  },50);
}
function openYeniVek(){
  _vekCtx=null;
  ['vek-ad','vek-sicil','vek-tbb','vek-tel','vek-mail','vek-uets','vek-acik'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='';});
  vekBankalar = [];
  renderVekBankalar();
  document.getElementById('vek-baro').value='';
  document.getElementById('vek-modal-title').textContent='Avukat / Vekil Ekle';
  document.getElementById('vek-modal-btn').textContent='Kaydet';
  document.getElementById('vek-modal-btn').onclick=saveVekil;
  openModal('vek-modal');
  setTimeout(()=>{
    const vekiban=document.getElementById('vek-banka');if(vekiban&&!vekiban._fmt){vekiban._fmt=true;}
  },50);
}
function openKTProfil(id){
  const k=state.karsiTaraflar.find(x=>x.id===id);if(!k)return;
  const isTuzel=k.tip==='tuzel';
  const avt=document.getElementById('kt-profil-avatar');
  avt.textContent=isTuzel?'🏢':(k.ad||'?')[0].toUpperCase();
  avt.style.background=isTuzel?'linear-gradient(135deg,#1a3a5c,#2980b9)':'linear-gradient(135deg,#2c3e50,#C9A84C)';
  document.getElementById('kt-profil-ad').textContent=k.ad;
  // Alt bilgi
  const altArr=[];
  if(isTuzel){if(k.sirketTur)altArr.push(k.sirketTur);if(k.vergiNo)altArr.push('VKN: '+k.vergiNo);}
  else{if(k.tc)altArr.push('TC: '+k.tc);if(k.meslek)altArr.push(k.meslek);}
  document.getElementById('kt-profil-alt').textContent=altArr.join(' · ')||( isTuzel?'Tüzel Kişi':'Gerçek Kişi');
  // Bilgi grid
  const rows=[];
  if(isTuzel){
    if(k.vergiDairesi)rows.push({l:'Vergi Dairesi',v:k.vergiDairesi});
    if(k.mersis)rows.push({l:'MERSİS',v:k.mersis});
    if(k.yetkiliAd)rows.push({l:'Yetkili',v:k.yetkiliAd+(k.yetkiliUnvan?' ('+k.yetkiliUnvan+')':'')});
  } else {
    if(k.dogum)rows.push({l:'Doğum Tarihi',v:fmtD(k.dogum)});
    if(k.uyruk&&k.uyruk!=='T.C.')rows.push({l:'Uyruk',v:k.uyruk});
  }
  if(k.tel)rows.push({l:'Telefon',v:k.tel});
  if(k.faks)rows.push({l:'Faks',v:k.faks});
  if(k.mail)rows.push({l:'E-posta',v:`<a href="mailto:${k.mail}" style="color:var(--gold)">${k.mail}</a>`});
  if(k.uets)rows.push({l:'UETS/KEP',v:k.uets});
  if(k.adres)rows.push({l:'Adres',v:k.adres});
  if(k.iban)rows.push({l:'IBAN',v:`<span style="font-family:monospace;font-size:12px">${k.iban}</span>`});
  if(k.aciklama)rows.push({l:'Not',v:k.aciklama});
  document.getElementById('kt-profil-bilgiler').innerHTML=rows.map(r=>
    `<div class="vp-bilgi-row"><div class="vp-bilgi-label">${r.l}</div><div class="vp-bilgi-val">${r.v}</div></div>`
  ).join('');
  // Bağlı dosyalar
  const davlar=state.davalar.filter(d=>d.karsiId===id);
  const icralar=state.icra.filter(i=>i.karsiId===id);
  let dosyaHtml='';
  if(davlar.length||icralar.length){
    dosyaHtml+=`<div class="vp-section-title">📁 Taraf Olduğu Dosyalar</div>`;
    davlar.forEach(d=>{
      const muvAd=getMuvAd(d.muvId);
      dosyaHtml+=`<div class="vp-dosya-item" onclick="closeModal('kt-profil-modal');openDavaDetay('${d.id}')">
        <div>
          <div style="font-weight:600;font-size:13px">📁 ${d.no} <span style="color:var(--gold)">${d.konu}</span></div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${muvAd} · ${d.asama||''} · <span class="badge badge-${d.durum==='Aktif'?'aktif':d.durum==='Beklemede'?'beklemede':'kapali'}">${d.durum}</span></div>
        </div><span style="font-size:11px;color:var(--text-dim)">›</span>
      </div>`;
    });
    icralar.forEach(i=>{
      const muvAd=getMuvAd(i.muvId);
      dosyaHtml+=`<div class="vp-dosya-item" onclick="closeModal('kt-profil-modal');openIcraDetay('${i.id}')">
        <div>
          <div style="font-weight:600;font-size:13px">⚡ ${i.no} <span style="color:var(--gold)">${i.borclu}</span></div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${muvAd} · ${i.tur||''} · ${i.durum||''}</div>
        </div><span style="font-size:11px;color:var(--text-dim)">›</span>
      </div>`;
    });
  } else {
    dosyaHtml=`<div style="font-size:13px;color:var(--text-muted);padding:10px 0">Henüz bağlı dosya yok.</div>`;
  }
  document.getElementById('kt-profil-dosyalar').innerHTML=dosyaHtml;
  document.getElementById('kt-profil-duzenle-btn').onclick=()=>{closeModal('kt-profil-modal');editKTModal(id);};
  openModal('kt-profil-modal');
}
function editKTModal(id){
  const k=state.karsiTaraflar.find(x=>x.id===id);if(!k)return;
  ktModalDataDoldur(k);
  document.getElementById('kt-modal-title').textContent='Karşı Taraf Düzenle';
  document.getElementById('kt-modal-btn').textContent='Güncelle';
  document.getElementById('kt-modal-btn').onclick=()=>updateKT(id);
  openModal('kt-modal');
}
function updateKT(id){
  const k=state.karsiTaraflar.find(x=>x.id===id);if(!k)return;
  const d=ktModalDataOku();
  Object.assign(k,d);
  state.davalar.forEach(d2=>{if(d2.karsiId===id)d2.karsi=k.ad;});
  state.icra.forEach(i=>{if(i.karsiId===id)i.karsi=k.ad;});
  saveData();closeModal('kt-modal');
  renderKarsiTaraflarListesi(document.getElementById('kt-ara-input')?.value||'');
  notify('✓ Karşı taraf güncellendi');
}

// ----------------------------------------------------------------
// AVUKATlar / VEKİLLER LİSTESİ
// ----------------------------------------------------------------
function renderVekillarListesi(filtre=''){
  if(!state.vekillar)state.vekillar=[];
  const list=document.getElementById('vek-list'),empty=document.getElementById('vek-empty');
  let vs=state.vekillar;
  if(filtre){const q=filtre.toLowerCase();vs=vs.filter(v=>(v.ad||'').toLowerCase().includes(q)||(v.baro||'').toLowerCase().includes(q)||(v.baroSicil||'').includes(q)||(v.tbbSicil||'').includes(q));}
  vs=sortArr(vs,'vek');
  if(!vs.length){list.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  const sortBarVek=`<div class="sort-bar" style="grid-template-columns:36px 1fr 160px 120px 100px">
    <div class="${shCls('vek','sira')}" style="justify-content:center" onclick="toggleSort('vek','sira')">#${shIcon('vek','sira')}</div>
    <div class="${shCls('vek','ad')}" onclick="toggleSort('vek','ad')">Ad Soyad ${shIcon('vek','ad')}</div>
    <div class="${shCls('vek','baro')}" onclick="toggleSort('vek','baro')">Baro ${shIcon('vek','baro')}</div>
    <div class="${shCls('vek','baroSicil')}" onclick="toggleSort('vek','baroSicil')">Sicil No ${shIcon('vek','baroSicil')}</div>
    <div class="${shCls('vek','tel')}" onclick="toggleSort('vek','tel')">Telefon ${shIcon('vek','tel')}</div>
  </div>`;
  list.innerHTML=sortBarVek+vs.map(v=>{
    const davlar=state.davalar.filter(d=>d.karsavId===v.id).length;
    const icralar=state.icra.filter(i=>i.karsavId===v.id).length;
    const sicilBilgi=[v.baroSicil?'Baro Sicil: '+v.baroSicil:'',v.tbbSicil?'TBB: '+v.tbbSicil:''].filter(Boolean).join(' · ');
    const meta=[v.baro,sicilBilgi,v.tel].filter(Boolean).join(' · ');
    return`<div class="muv-card" onclick="openVekProfil('${v.id}')">
      <div class="sira-badge"><span class="sira-num">${v.sira||'?'}</span><span class="sira-lbl">No</span></div>
      <div class="muv-card-inner">
      <div class="muv-avatar" style="background:linear-gradient(135deg,#2c3e50,#34495e);color:var(--gold);font-size:20px">⚖</div>
      <div class="muv-card-info">
        <div class="muv-card-name">Av. ${v.ad} <span style="background:rgba(241,196,15,.12);color:var(--gold);border-radius:4px;font-size:9px;font-weight:700;padding:1px 7px;margin-left:6px;vertical-align:middle">${v.baro||'Baro belirtilmedi'}</span></div>
        <div class="muv-card-meta">${meta||'İletişim bilgisi yok'}</div>
        ${v.uets?`<div class="muv-card-meta" style="font-size:10px;color:var(--text-dim)">UETS: ${v.uets}</div>`:''}
      </div>
      <div class="muv-card-stats">
        <div class="muv-stat"><div class="muv-stat-val gold">${davlar}</div><div class="muv-stat-lbl">Dava</div></div>
        <div class="muv-stat"><div class="muv-stat-val" style="color:var(--blue)">${icralar}</div><div class="muv-stat-lbl">İcra</div></div>
      </div>
      </div>
    </div>`;
  }).join('');
}
function filterVekillar(v){renderVekillarListesi(v);}

function openVekProfil(id){
  const v=state.vekillar.find(x=>x.id===id);if(!v)return;
  document.getElementById('vp-ad').textContent='Av. '+v.ad;
  document.getElementById('vp-baro').textContent=v.baro||'';
  // Bilgi grid
  const bilgiRows=[
    v.baroSicil?{l:'Baro Sicil No',val:v.baroSicil}:null,
    v.tbbSicil?{l:'TBB Sicil No',val:v.tbbSicil}:null,
    v.tel?{l:'Telefon',val:v.tel}:null,
    v.mail?{l:'E-posta',val:`<a href="mailto:${v.mail}" style="color:var(--gold)">${v.mail}</a>`}:null,
    v.uets?{l:'UETS / KEP',val:v.uets}:null,
    v.banka?{l:'IBAN',val:`<span style="font-family:monospace;font-size:12px">${v.banka}</span>`}:null,
    v.aciklama?{l:'Açıklama',val:v.aciklama}:null,
  ].filter(Boolean);
  document.getElementById('vp-bilgiler').innerHTML=bilgiRows.map(r=>
    `<div class="vp-bilgi-row"><div class="vp-bilgi-label">${r.l}</div><div class="vp-bilgi-val">${r.val}</div></div>`
  ).join('');
  // Bağlı dosyalar
  const davlar=state.davalar.filter(d=>d.karsavId===id);
  const icralar=state.icra.filter(i=>i.karsavId===id);
  let dosyaHtml='';
  if(davlar.length||icralar.length){
    dosyaHtml+=`<div class="vp-section-title">⚖ Vekil Olduğu Dosyalar</div>`;
    davlar.forEach(d=>{
      const muvAd=getMuvAd(d.muvId);
      const karsiAd=d.karsiId?getKTAd(d.karsiId):(d.karsi||'—');
      dosyaHtml+=`<div class="vp-dosya-item" onclick="closeModal('vek-profil-modal');openDavaDetay('${d.id}')">
        <div>
          <div style="font-weight:600;font-size:13px">📁 ${d.no} <span style="color:var(--gold)">${d.konu}</span></div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${muvAd} · Karşı: ${karsiAd} · ${d.asama||''}</div>
        </div>
        <span style="font-size:11px;color:var(--text-dim)">›</span>
      </div>`;
    });
    icralar.forEach(i=>{
      const muvAd=getMuvAd(i.muvId);
      dosyaHtml+=`<div class="vp-dosya-item" onclick="closeModal('vek-profil-modal');openIcraDetay('${i.id}')">
        <div>
          <div style="font-weight:600;font-size:13px">⚡ ${i.no} <span style="color:var(--gold)">${i.borclu}</span></div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${muvAd} · ${i.tur||''} · ${i.durum||''}</div>
        </div>
        <span style="font-size:11px;color:var(--text-dim)">›</span>
      </div>`;
    });
  }
  // Vekil olduğu karşı taraflar
  const ktler=(state.karsiTaraflar||[]).filter(k=>k.vekId===id);
  if(ktler.length){
    dosyaHtml+=`<div class="vp-section-title">👤 Vekil Olduğu Karşı Taraflar</div>`;
    ktler.forEach(k=>{
      dosyaHtml+=`<div class="vp-dosya-item" onclick="closeModal('vek-profil-modal');openKTProfil('${k.id}')">
        <div><div style="font-weight:600;font-size:13px">${k.ad}</div><div style="font-size:11px;color:var(--text-muted)">${k.tip==='tuzel'?'🏢 Tüzel':'👤 Gerçek'}</div></div>
        <span style="font-size:11px;color:var(--text-dim)">›</span>
      </div>`;
    });
  }
  if(!dosyaHtml)dosyaHtml=`<div style="font-size:13px;color:var(--text-muted);padding:10px 0">Henüz bağlı dosya yok.</div>`;
  document.getElementById('vp-dosyalar').innerHTML=dosyaHtml;
  document.getElementById('vp-duzenle-btn').onclick=()=>{closeModal('vek-profil-modal');editVekModal(id);};
  openModal('vek-profil-modal');
}

function editVekModal(id){
  const v=state.vekillar.find(x=>x.id===id);if(!v)return;
  document.getElementById('vek-ad').value=v.ad||'';
  document.getElementById('vek-baro').value=v.baro||'';
  document.getElementById('vek-sicil').value=v.baroSicil||'';
  document.getElementById('vek-tbb').value=v.tbbSicil||'';
  document.getElementById('vek-tel').value=v.tel||'';
  document.getElementById('vek-mail').value=v.mail||'';
  document.getElementById('vek-uets').value=v.uets||'';
  document.getElementById('vek-banka').value=v.banka||'';
  document.getElementById('vek-acik').value=v.aciklama||'';
  document.getElementById('vek-modal-title').textContent='Avukat / Vekil Düzenle';
  document.getElementById('vek-modal-btn').textContent='Güncelle';
  document.getElementById('vek-modal-btn').onclick=()=>updateVek(id);
  openModal('vek-modal');
}
function updateVek(id){
  const v=state.vekillar.find(x=>x.id===id);if(!v)return;
  v.ad=document.getElementById('vek-ad').value.trim();
  v.baro=document.getElementById('vek-baro').value;
  v.baroSicil=document.getElementById('vek-sicil').value.trim();
  v.tbbSicil=document.getElementById('vek-tbb').value.trim();
  v.tel=document.getElementById('vek-tel').value.trim();
  v.mail=document.getElementById('vek-mail').value.trim();
  v.uets=document.getElementById('vek-uets').value.trim();
  v.banka=document.getElementById('vek-banka').value.trim();
  v.aciklama=document.getElementById('vek-acik').value.trim();
  state.davalar.forEach(d=>{if(d.karsavId===id)d.karsav='Av. '+v.ad;});
  state.icra.forEach(i=>{if(i.karsavId===id)i.karsav='Av. '+v.ad;});
  saveData();closeModal('vek-modal');
  renderVekillarListesi(document.getElementById('vek-ara-input')?.value||'');
  notify('✓ Avukat kaydı güncellendi');
}


// ================================================================
// MÜVEKKİL DETAY
// ================================================================
function openDetay(muvId){
  aktivMuvId=muvId;
  const m=getMuv(muvId);if(!m)return;
  const isTuzel=m.tip==='tuzel';
  document.getElementById('md-bc').textContent=m.ad;
  document.getElementById('md-ad').innerHTML=m.ad+' '+(isTuzel
    ?`<span style="background:rgba(52,152,219,.2);color:#5dade2;border-radius:5px;font-size:10px;font-weight:700;padding:2px 8px;vertical-align:middle">🏢 TÜZEL KİŞİ</span>`
    :`<span style="background:rgba(46,204,113,.18);color:#2ecc71;border-radius:5px;font-size:10px;font-weight:700;padding:2px 8px;vertical-align:middle">👤 GERÇEK KİŞİ</span>`);
  const metaItems=[];
  if(isTuzel){
    if(m.sirketTur)metaItems.push(m.sirketTur);
    if(m.vergiNo)metaItems.push('VKN: <strong>'+m.vergiNo+'</strong>');
    if(m.mersis)metaItems.push('MERSİS: '+m.mersis);
    if(m.yetkiliAd)metaItems.push('Yetkili: <strong>'+m.yetkiliAd+'</strong>'+(m.yetkiliUnvan?' ('+m.yetkiliUnvan+')':''));
  } else {
    if(m.tc)metaItems.push('TC: <strong>'+m.tc+'</strong>');
    if(m.dogum)metaItems.push('D: '+fmtD(m.dogum));
    if(m.meslek)metaItems.push(m.meslek);
  }
  if(m.tel)metaItems.push('📞 '+m.tel);
  if(m.mail)metaItems.push('✉ '+m.mail);
  document.getElementById('md-meta').innerHTML=metaItems.join(' &nbsp;·&nbsp; ');
  renderMdCards();
  document.querySelectorAll('#page-muv-detay .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#page-muv-detay .tab-panel').forEach(p=>p.classList.remove('active'));
  const kimlikTab=document.querySelector('#page-muv-detay .tab[onclick*="kimlik"]');
  const kimlikPanel=document.getElementById('mt-kimlik');
  if(kimlikTab)kimlikTab.classList.add('active');
  if(kimlikPanel)kimlikPanel.classList.add('active');
  renderMdKimlik();
  document.getElementById('md-notlar').innerHTML=m.not?`<p style="white-space:pre-wrap;font-size:13px;line-height:1.7">${m.not}</p>`:'<div class="empty"><div class="empty-icon">📝</div><p>Not yok</p></div>';
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-muv-detay').classList.add('active');
}
function renderMdCards(){
  const muvId=aktivMuvId;
  const davs=state.davalar.filter(d=>d.muvId===muvId);
  const oz=typeof FinansMotoru!=='undefined'?FinansMotoru.muvekkilOzet(muvId):{masraflar:{toplam:0},avanslar:{alinan:0},bakiye:{masrafBakiye:0,genelBakiye:0},vekaletUcreti:{akdi:{kalan:0}}};
  const el=document.getElementById('md-cards');
  if(!el)return;
  el.innerHTML=
    '<div class="card"><div class="card-label">Toplam Dava</div><div class="card-value gold">'+davs.length+'</div></div>'+
    '<div class="card"><div class="card-label">Aktif Dava</div><div class="card-value gold">'+davs.filter(function(d){return d.durum==='Aktif';}).length+'</div></div>'+
    '<div class="card"><div class="card-label">Toplam Masraf</div><div class="card-value red">'+fmt(oz.masraflar.toplam)+'</div></div>'+
    '<div class="card"><div class="card-label">Alınan Avans</div><div class="card-value green">'+fmt(oz.avanslar.alinan)+'</div></div>'+
    '<div class="card"><div class="card-label">Masraf Bakiyesi'+helpTip('Avans alınan eksi yapılan masraflar')+'</div><div class="card-value" style="color:'+(oz.bakiye.masrafBakiye>=0?'var(--green)':'var(--red)')+'">'+fmt(oz.bakiye.masrafBakiye)+'</div></div>'+
    '<div class="card"><div class="card-label">Genel Bakiye'+helpTip('Müvekkil ile olan tüm alacak-borç ilişkisinin özeti')+'</div><div class="card-value" style="color:'+(oz.bakiye.genelBakiye>=0?'var(--green)':'var(--red)')+'">'+fmt(oz.bakiye.genelBakiye)+'</div></div>';
}

function renderMdKimlik(){
  const m=getMuv(aktivMuvId);if(!m)return;
  const isTuzel=m.tip==='tuzel';
  const row=(lbl,val)=>{
    if(!val)return'';
    return'<tr><td style="color:var(--text-muted);font-size:12px;padding:9px 14px;width:175px;white-space:nowrap;border-bottom:1px solid var(--border)">'+lbl+'</td>'
      +'<td style="font-size:13px;padding:9px 14px;border-bottom:1px solid var(--border);font-weight:500">'+val+'</td></tr>';
  };

  let html='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';

  if(isTuzel){
    html+='<div class="section" style="margin:0"><div class="section-header"><div class="section-title">🏢 Şirket Bilgileri</div></div>'
      +'<div class="section-body" style="padding:0"><table style="width:100%">'
      +row('Ünvan',m.unvan||m.ad)
      +row('Şirket Türü',m.sirketTur)
      +row('Vergi No (VKN)',m.vergiNo?'<span style="font-family:monospace;letter-spacing:1px">'+m.vergiNo+'</span>':'')
      +row('Vergi Dairesi',m.vergiDairesi)
      +row('MERSİS No',m.mersis?'<span style="font-family:monospace">'+m.mersis+'</span>':'')
      +row('Ticaret Sicil No',m.ticaretSicil)
      +'</table></div></div>'
      +'<div class="section" style="margin:0"><div class="section-header"><div class="section-title">👔 Yetkili Temsilci</div></div>'
      +'<div class="section-body" style="padding:0"><table style="width:100%">'
      +row('Ad Soyad',m.yetkiliAd)
      +row('Unvan / Görevi',m.yetkiliUnvan)
      +row('TC Kimlik No',m.yetkiliTc?'<span style="font-family:monospace;letter-spacing:1px">'+m.yetkiliTc+'</span>':'')
      +row('Telefon',m.yetkiliTel)
      +'</table></div></div>';
  } else {
    html+='<div class="section" style="margin:0"><div class="section-header"><div class="section-title">🪪 Kimlik Bilgileri</div></div>'
      +'<div class="section-body" style="padding:0"><table style="width:100%">'
      +row('Ad Soyad',m.ad)
      +row('TC Kimlik No',m.tc?'<span style="font-family:monospace;letter-spacing:1px">'+m.tc+'</span>':'')
      +row('Uyruk',m.uyruk||'T.C.')
      +row('Pasaport No',m.pasaport)
      +row('Doğum Tarihi',m.dogum?fmtD(m.dogum):'')
      +row('Meslek',m.meslek)
      +'</table></div></div><div></div>';
  }
  html+='</div>';

  html+='<div class="section">'
    +'<div class="section-header"><div class="section-title">📞 İletişim Bilgileri</div>'
    +'<button class="btn btn-outline btn-sm" onclick="openMuvEdit()">✏ Düzenle</button></div>'
    +'<div class="section-body" style="padding:0"><div style="display:grid;grid-template-columns:1fr 1fr">'
    +'<table style="width:100%">'
    +row('Telefon',m.tel)
    +row('E-posta',m.mail?'<a href="mailto:'+m.mail+'" style="color:var(--gold)">'+m.mail+'</a>':'')
    +row('Faks',m.faks)
    +row('Web',m.web?'<a href="'+m.web+'" target="_blank" style="color:var(--gold)">'+m.web+'</a>':'')
    +'</table><table style="width:100%">'
    +row('Adres',m.adres)
    +'</table></div></div></div>';

  const bankalar=m.bankalar||[];
  if(bankalar.length){
    html+='<div class="section"><div class="section-header"><div class="section-title">🏦 Banka Hesapları</div></div>'
      +'<div class="section-body" style="padding:0"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;padding:14px">';
    bankalar.forEach(function(b,i){
      html+='<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:14px">'
        +'<div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;font-weight:700;margin-bottom:10px">Hesap '+(i+1)+(b.banka?' — '+b.banka:'')+'</div>'
        +(b.hesapAd?'<div style="font-size:13px;font-weight:600;margin-bottom:6px">'+b.hesapAd+'</div>':'')
        +(b.iban?'<div style="font-family:monospace;font-size:12px;background:var(--surface);padding:6px 10px;border-radius:5px;letter-spacing:1px;margin-bottom:8px;border:1px solid var(--border)">'+b.iban+'</div>':'')
        +'<div style="display:flex;gap:16px;font-size:11px;color:var(--text-muted)">'
        +(b.sube?'<span>Şube: <strong style="color:var(--text)">'+b.sube+'</strong></span>':'')
        +(b.hesapNo?'<span>Hesap No: <strong style="color:var(--text)">'+b.hesapNo+'</strong></span>':'')
        +'</div></div>';
    });
    html+='</div></div></div>';
  } else {
    html+='<div class="section"><div class="section-body" style="text-align:center;padding:24px;color:var(--text-dim)">'
      +'<div style="font-size:28px;margin-bottom:8px">🏦</div>'
      +'<div>Banka hesabı eklenmemiş</div>'
      +'<button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="openMuvEdit()">+ Banka Ekle</button>'
      +'</div></div>';
  }

  // Vekaletname uyarıları (state.belgeler'den oku)
  var bugun=today();
  var vekBelgeler=getBelgeVekaletnameler(m.id);
  var bitmisVek=vekBelgeler.filter(function(b){return b.meta&&b.meta.bitis&&b.meta.bitis<bugun;});
  var yaklaVek=vekBelgeler.filter(function(b){
    return b.meta&&b.meta.bitis&&b.meta.bitis>=bugun&&b.meta.bitis<new Date(Date.now()+30*24*3600000).toISOString().slice(0,10);
  });
  if(bitmisVek.length||yaklaVek.length){
    var uyariRenk=bitmisVek.length?'#e74c3c':'#e67e22';
    html+='<div style="background:rgba(231,76,60,.1);border:1px solid '+uyariRenk+';border-radius:var(--radius);padding:12px 16px;margin-top:0">';
    if(bitmisVek.length)html+='<div style="color:#e74c3c;font-size:12px;font-weight:600">⛔ '+bitmisVek.length+' vekâletname süresi doldu!</div>';
    if(yaklaVek.length)html+='<div style="color:#e67e22;font-size:12px;font-weight:600">⚠ '+yaklaVek.length+' vekâletname 30 gün içinde sona eriyor</div>';
    html+='<button class="btn btn-sm" style="margin-top:8px;background:'+uyariRenk+';color:#fff;border:none;padding:4px 10px;border-radius:5px;cursor:pointer" '
      +'onclick="muvTab(\'belgeler\',document.querySelectorAll(\'#page-muv-detay .tab\')[2])">Belgelere Git →</button></div>';
  }

  document.getElementById('mt-kimlik-content').innerHTML=html;
}


// ================================================================
// İLETİŞİM GEÇMİŞİ
// ================================================================
let iletisimEditId=null;

function openIletisimModal(editId){
  iletisimEditId=editId||null;
  const btn=document.getElementById('il-sil-btn');
  if(editId){
    const k=(state.iletisimler||[]).find(x=>x.id===editId);if(!k)return;
    document.getElementById('il-tarih').value=k.tarih;
    document.getElementById('il-saat').value=k.saat||'09:00';
    document.getElementById('il-kanal').value=k.kanal;
    document.getElementById('il-konu').value=k.konu||'';
    document.getElementById('il-ozet').value=k.ozet||'';
    document.getElementById('il-modal-title').textContent='💬 İletişim Kaydı Düzenle';
    btn.style.display='inline-flex';
  } else {
    ['il-konu','il-ozet'].forEach(i=>document.getElementById(i).value='');
    document.getElementById('il-tarih').value=today();
    document.getElementById('il-saat').value='09:00';
    document.getElementById('il-kanal').value='📞 Telefon Görüşmesi';
    document.getElementById('il-modal-title').textContent='💬 İletişim Kaydı Ekle';
    btn.style.display='none';
  }
  document.getElementById('iletisim-modal').classList.add('open');
}

function saveIletisim(){
  const tarih=document.getElementById('il-tarih').value;
  const ozet=document.getElementById('il-ozet').value.trim();
  if(!zorunluKontrol([{id:'il-tarih',deger:tarih,label:'Tarih'},{id:'il-ozet',deger:ozet,label:'Özet'}])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  if(!state.iletisimler)state.iletisimler=[];
  if(iletisimEditId){
    const k=state.iletisimler.find(x=>x.id===iletisimEditId);
    if(k){k.tarih=tarih;k.saat=document.getElementById('il-saat').value;k.kanal=document.getElementById('il-kanal').value;k.konu=document.getElementById('il-konu').value.trim();k.ozet=ozet;
      addLog(aktivMuvId,'İletişim Düzenlendi',`${k.kanal} | ${fmtD(tarih)}${k.konu?' | '+k.konu:''}`);
    }
  } else {
    const kanal=document.getElementById('il-kanal').value;
    const konu=document.getElementById('il-konu').value.trim();
    const _ilEntry={id:uid(),muvId:aktivMuvId,tarih,saat:document.getElementById('il-saat').value,kanal,konu,ozet};
  state.iletisimler.push(_ilEntry);
    addLog(aktivMuvId,'İletişim Eklendi',`${kanal} | ${fmtD(tarih)}${konu?' | '+konu:''}`);
  }
  closeModal('iletisim-modal');saveData();renderMdIletisim();notify('✓ İletişim kaydedildi');
}

function deleteIletisim(){
  if(!iletisimEditId)return;
  if(!confirm('Bu kaydı silmek istiyor musunuz?'))return;
  const k=(state.iletisimler||[]).find(x=>x.id===iletisimEditId);
  if(k)addLog(aktivMuvId,'İletişim Silindi',`${k.kanal} | ${fmtD(k.tarih)}${k.konu?' | '+k.konu:''}`);
  state.iletisimler=(state.iletisimler||[]).filter(x=>x.id!==iletisimEditId);
  closeModal('iletisim-modal');saveData();renderMdIletisim();notify('Silindi');
}

function renderMdIletisim(){
  const list=(state.iletisimler||[]).filter(x=>x.muvId===aktivMuvId).sort((a,b)=>b.tarih.localeCompare(a.tarih)||((b.saat||'').localeCompare(a.saat||'')));
  const kanalRenk={'📞 Telefon Görüşmesi':'var(--green)','📧 E-posta':'var(--blue)','🤝 Yüz Yüze Görüşme':'var(--gold)','💬 WhatsApp / Mesaj':'#2ecc71','📠 Faks':'var(--text-muted)','📮 Posta / Tebligat':'#e67e22','🎥 Video Görüşme':'#9b59b6','📋 Diğer':'var(--text-muted)'};
  let html=`<div class="section">
    <div class="section-header">
      <div class="section-title">💬 İletişim Geçmişi <span style="font-size:11px;color:var(--text-dim);font-weight:400">${list.length} kayıt</span></div>
      <button class="btn btn-gold btn-sm" onclick="openIletisimModal()">+ Kayıt Ekle</button>
    </div>
    <div style="padding:0">`;
  if(!list.length){
    html+=`<div class="empty" style="padding:40px"><div class="empty-icon">💬</div><p>Henüz iletişim kaydı yok</p><p style="font-size:11px;color:var(--text-dim);margin-top:4px">Telefon görüşmeleri, e-postalar ve toplantıları kaydedin</p></div>`;
  } else {
    // Aylara göre grupla
    const groups={};
    list.forEach(k=>{const ay=k.tarih.slice(0,7);if(!groups[ay])groups[ay]=[];groups[ay].push(k);});
    const aylar=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    Object.keys(groups).sort((a,b)=>b.localeCompare(a)).forEach(ay=>{
      const [yil,mon]=ay.split('-');
      html+=`<div style="padding:10px 18px 4px;font-size:11px;color:var(--text-dim);font-weight:700;text-transform:uppercase;border-top:1px solid var(--border)">${aylar[parseInt(mon)-1]} ${yil}</div>`;
      groups[ay].forEach(k=>{
        const renk=kanalRenk[k.kanal]||'var(--text-muted)';
        html+=`<div style="padding:14px 18px;border-top:1px solid var(--border);display:flex;gap:14px;cursor:pointer" onclick="openIletisimModal('${k.id}')">
          <div style="min-width:90px;text-align:right">
            <div style="font-size:12px;font-weight:600;color:var(--text)">${fmtD(k.tarih)}</div>
            ${k.saat?`<div style="font-size:10px;color:var(--text-dim)">${k.saat}</div>`:''}
          </div>
          <div style="width:3px;background:${renk};border-radius:2px;flex-shrink:0"></div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-size:11px;color:${renk};font-weight:600">${k.kanal}</span>
              ${k.konu?`<span style="font-size:11px;color:var(--text-muted)">— ${k.konu}</span>`:''}
            </div>
            <div style="font-size:13px;color:var(--text);line-height:1.5;white-space:pre-wrap">${k.ozet}</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openIletisimModal('${k.id}')" style="align-self:flex-start">✏</button>
        </div>`;
      });
    });
  }
  html+=`</div></div>`;
  document.getElementById('mt-iletisim-content').innerHTML=html;
}

// ================================================================
// MÜVEKKİL İLİŞKİLERİ
// ================================================================
function openIliskiModal(){
  // Populate select excluding self
  const sel=document.getElementById('rl-muv');
  sel.innerHTML='<option value="">— Müvekkil seçin —</option>';
  state.muvekkillar.filter(m=>m.id!==aktivMuvId).forEach(m=>{sel.innerHTML+=`<option value="${m.id}">${m.ad}</option>`;});
  document.getElementById('rl-acik').value='';
  document.getElementById('rl-tur').value='Diğer';
  document.getElementById('iliski-modal').classList.add('open');
}

function saveIliski(){
  const hedefId=document.getElementById('rl-muv').value;
  if(!hedefId){notify('Müvekkil seçin!');return;}
  const tur=document.getElementById('rl-tur').value;
  const acik=document.getElementById('rl-acik').value.trim();
  const muv=getMuv(aktivMuvId);if(!muv)return;
  if(!muv.iliskiler)muv.iliskiler=[];
  if(muv.iliskiler.find(r=>r.hedefId===hedefId)){notify('Bu ilişki zaten kayıtlı.');return;}
  muv.iliskiler.push({id:uid(),hedefId,tur,acik});
  const hedef=getMuv(hedefId);
  if(hedef){if(!hedef.iliskiler)hedef.iliskiler=[];hedef.iliskiler.push({id:uid(),hedefId:aktivMuvId,tur,acik});}
  addLog(aktivMuvId,'İlişki Eklendi',`${tur} → ${getMuvAd(hedefId)}${acik?' | '+acik:''}`);
  closeModal('iliski-modal');saveData();renderMdIliskiler();notify('✓ İlişki eklendi');
}

function deleteIliski(iliskiId, karsiId){
  if(!confirm('İlişkiyi kaldırmak istiyor musunuz?'))return;
  const muv=getMuv(aktivMuvId);if(!muv)return;
  const r=(muv.iliskiler||[]).find(x=>x.id===iliskiId);
  if(r)addLog(aktivMuvId,'İlişki Silindi',`${r.tur} → ${getMuvAd(karsiId)}`);
  muv.iliskiler=(muv.iliskiler||[]).filter(r=>r.id!==iliskiId);
  const karsi=getMuv(karsiId);
  if(karsi)karsi.iliskiler=(karsi.iliskiler||[]).filter(r=>r.hedefId!==aktivMuvId);
  saveData();renderMdIliskiler();notify('Silindi');
}

function renderMdIliskiler(){
  const muv=getMuv(aktivMuvId);if(!muv)return;
  const iliskiler=(muv.iliskiler||[]);
  const turRenk={'Eş':'#e91e8c','Anne / Baba':'#9b59b6','Çocuk':'#C9A84C','Kardeş':'#6c3483','Ortak / Hissedar':'var(--gold)','Yönetim Kurulu Üyesi':'var(--blue)','İşveren / İşçi':'#e67e22','Vekil':'var(--green)','Kefil':'#e74c3c','Diğer':'var(--text-muted)'};

  let html=`<div class="section">
    <div class="section-header">
      <div class="section-title">🔗 Müvekkil İlişkileri</div>
      <button class="btn btn-gold btn-sm" onclick="openIliskiModal()">+ İlişki Ekle</button>
    </div>`;

  if(!iliskiler.length){
    html+=`<div class="empty" style="padding:40px"><div class="empty-icon">🔗</div><p>Henüz ilişki kaydedilmedi</p><p style="font-size:11px;color:var(--text-dim);margin-top:4px">Aile bireyleri, iş ortakları, kefiller...</p></div>`;
  } else {
    html+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;padding:16px">`;
    iliskiler.forEach(r=>{
      const hedef=getMuv(r.hedefId);if(!hedef)return;
      const renk=turRenk[r.tur]||'var(--text-muted)';
      const isTuzel=hedef.tip==='tuzel';
      html+=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:14px;position:relative">
        <button onclick="deleteIliski('${r.id}','${r.hedefId}')" style="position:absolute;top:8px;right:10px;background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:13px">✕</button>
        <div style="font-size:10px;font-weight:700;color:${renk};text-transform:uppercase;margin-bottom:8px;padding:2px 8px;background:${renk}22;border-radius:4px;display:inline-block">${r.tur}</div>
        <div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="openDetay('${r.hedefId}')">
          <div class="muv-avatar" style="width:38px;height:38px;font-size:13px;${isTuzel?'background:linear-gradient(135deg,#1a3a5c,#2980b9);color:#fff':''}">${avatarI(hedef.ad)}</div>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--gold)">${hedef.ad}</div>
            <div style="font-size:10px;color:var(--text-muted)">${isTuzel?(hedef.sirketTur||'Tüzel Kişi'):(hedef.tc?'TC: '+hedef.tc:hedef.tel||'')}</div>
          </div>
        </div>
        ${r.acik?`<div style="margin-top:8px;font-size:11px;color:var(--text-muted);padding-top:8px;border-top:1px solid var(--border)">${r.acik}</div>`:''}
      </div>`;
    });
    html+=`</div>`;
  }
  html+=`</div>`;

  // Vekâletname bölümü Belgeler sekmesine taşındı — burada yalnızca ilişkiler gösterilir
  document.getElementById('mt-iliskiler-content').innerHTML=html;
}

// Vekaletname fonksiyonları Belgeler sistemine taşındı (openBelgeModal, saveBelge, delBelge)

// ================================================================
// MÜVEKKİL SKORU
// ================================================================
function calcMuvSkor(muvId){
  const muv=getMuv(muvId);if(!muv)return{puan:0,renk:'var(--text-dim)',etiket:'—'};
  let puan=100;
  const davalar=state.davalar.filter(d=>d.muvId===muvId);
  const beklAlacak=state.avanslar.filter(a=>a.muvId===muvId&&a.durum==='Bekliyor').reduce((s,a)=>s+a.tutar,0);
  const tahsilatlar=(muv.tahsilatlar||[]);
  // Bekleyen alacak varsa eksi
  if(beklAlacak>50000)puan-=30;
  else if(beklAlacak>10000)puan-=15;
  else if(beklAlacak>0)puan-=5;
  // Aktif dava sayısı (çok dava = değerli müvekkil)
  const aktifDav=davalar.filter(d=>d.durum==='Aktif').length;
  if(aktifDav>=3)puan+=10;
  else if(aktifDav>=1)puan+=5;
  // Vekaletname süresi dolmuş mu? (state.belgeler'den oku)
  const bugun=today();
  const bitmiş=getBelgeVekaletnameler(muvId).some(function(b){return b.meta&&b.meta.bitis&&b.meta.bitis<bugun;});
  if(bitmiş)puan-=20;
  // Son iletişim ne zaman?
  const ilets=(state.iletisimler||[]).filter(x=>x.muvId===muvId);
  if(ilets.length){
    const enSon=ilets.map(x=>x.tarih).sort().pop();
    const gunFark=Math.floor((Date.now()-new Date(enSon))/86400000);
    if(gunFark>90)puan-=15;
    else if(gunFark>30)puan-=5;
    else puan+=5;
  } else puan-=10;
  puan=Math.max(0,Math.min(100,puan));
  const renk=puan>=70?'var(--green)':puan>=40?'#e67e22':'#e74c3c';
  const etiket=puan>=70?'İyi':'Risk';
  return{puan,renk,etiket};
}

// ================================================================
// MÜVEKKİL ÖZET RAPORU
// ================================================================
function renderMdRapor(){
  const muv=getMuv(aktivMuvId);if(!muv)return;
  const davalar=state.davalar.filter(d=>d.muvId===aktivMuvId);
  const icralar=state.icra.filter(i=>i.muvId===aktivMuvId);
  const iletisimler=(state.iletisimler||[]).filter(x=>x.muvId===aktivMuvId);
  const skor=calcMuvSkor(aktivMuvId);
  const isTuzel=muv.tip==='tuzel';
  const bugun=new Date().toLocaleDateString('tr-TR',{year:'numeric',month:'long',day:'numeric'});
  // FinansMotoru ile merkezi hesaplama
  const oz=typeof FinansMotoru!=='undefined'?FinansMotoru.muvekkilOzet(aktivMuvId):{masraflar:{toplam:0},avanslar:{alinan:0,kalan:0},tahsilatlar:{toplam:0},vekaletUcreti:{akdi:{anlasilanToplam:0,tahsilEdilen:0,kalan:0},karsiVekalet:{kaydedilen:0},hakedis:{toplam:0}},aktarimlar:{toplam:0},iadeler:{toplam:0},bakiye:{masrafBakiye:0,tahsilatBakiye:0,vekaletBakiye:0,genelBakiye:0}};

  let html=`
  <!-- Rapor Başlığı / Yazdır Butonu -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
    <div>
      <div style="font-size:13px;color:var(--text-dim)">Rapor Tarihi: ${bugun}</div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline btn-sm" onclick="window.print()">🖨 Yazdır</button>
      <button class="btn btn-green btn-sm" onclick="exportMuvRaporPDF()">⬇ PDF</button>
    </div>
  </div>

  <!-- Müvekkil Profil Kartı -->
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px;display:flex;gap:20px;align-items:flex-start">
    <div class="muv-avatar" style="width:56px;height:56px;font-size:18px;${isTuzel?'background:linear-gradient(135deg,#1a3a5c,#2980b9);color:#fff':''}">${avatarI(muv.ad)}</div>
    <div style="flex:1">
      <div style="font-size:18px;font-weight:700;margin-bottom:4px">${muv.ad}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">
        ${isTuzel?`${muv.sirketTur||''} · VKN: ${muv.vergiNo||'—'} · MERSİS: ${muv.mersis||'—'}`:`TC: ${muv.tc||'—'} · ${muv.meslek||''}`}
      </div>
      <div style="display:flex;gap:16px;font-size:12px">
        ${muv.tel?`<span>📞 ${muv.tel}</span>`:''}
        ${muv.mail?`<span>✉ ${muv.mail}</span>`:''}
        ${muv.adres?`<span>📍 ${muv.adres}</span>`:''}
      </div>
    </div>
    <div style="text-align:center;min-width:80px">
      <div style="font-size:28px;font-weight:700;color:${skor.renk}">${skor.puan}</div>
      <div style="font-size:10px;color:${skor.renk};font-weight:700">${skor.etiket}</div>
      <div style="font-size:9px;color:var(--text-dim);margin-top:2px">Müvekkil Skoru</div>
    </div>
  </div>

  <!-- Finansal Özet — FinansMotoru verileri -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
    <div class="card" style="border-color:var(--green)">
      <div class="card-label">Toplam Tahsilat${helpTip('Karşı taraftan tahsil edilen tutarların toplamı')}</div><div class="card-value green">${fmt(oz.tahsilatlar.toplam)}</div>
    </div>
    <div class="card" style="border-color:var(--gold)">
      <div class="card-label">Avukatlık Hakedişi${helpTip('Akdi vekalet + karşı vekalet hakedişlerinin toplamı')}</div><div class="card-value gold">${fmt(oz.vekaletUcreti.hakedis.toplam)}</div>
    </div>
    <div class="card" style="border-color:#e74c3c">
      <div class="card-label">Toplam Masraf${helpTip('Tüm dosyalardaki masrafların toplamı (harç, tebligat, bilirkişi vb.)')}</div><div class="card-value red">${fmt(oz.masraflar.toplam)}</div>
    </div>
    <div class="card" style="border-color:${oz.bakiye.genelBakiye>=0?'var(--green)':'#e74c3c'}">
      <div class="card-label">Genel Bakiye${helpTip('Müvekkil ile olan tüm alacak-borç ilişkisinin özeti')}</div><div class="card-value" style="color:${oz.bakiye.genelBakiye>=0?'var(--green)':'#e74c3c'}">${fmt(oz.bakiye.genelBakiye)}</div>
    </div>
  </div>
  <!-- Detaylı Bakiye Kartları -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    <div class="card">
      <div class="card-label">Masraf Bakiyesi${helpTip('Avans alınan eksi yapılan masraflar. Artı ise avans fazlası, eksi ise müvekkilden alacağınız var')}</div>
      <div class="card-value" style="color:${oz.bakiye.masrafBakiye>=0?'var(--green)':'#e74c3c'}">${fmt(oz.bakiye.masrafBakiye)}</div>
      <div style="font-size:10px;color:var(--text-dim);margin-top:4px">Avans: ${fmt(oz.avanslar.alinan)} — Masraf: ${fmt(oz.masraflar.toplam)}</div>
    </div>
    <div class="card">
      <div class="card-label">Tahsilat Bakiyesi${helpTip('Karşı taraftan tahsil edilen tutardan hakediş ve aktarımlar düşüldükten sonra müvekkile aktarılması gereken tutar')}</div>
      <div class="card-value" style="color:${oz.bakiye.tahsilatBakiye>=0?'var(--green)':'#e74c3c'}">${fmt(oz.bakiye.tahsilatBakiye)}</div>
      <div style="font-size:10px;color:var(--text-dim);margin-top:4px">Tahsilat: ${fmt(oz.tahsilatlar.toplam)} — Hakediş: ${fmt(oz.vekaletUcreti.hakedis.toplam)} — Aktarım: ${fmt(oz.aktarimlar.toplam)}</div>
    </div>
    <div class="card">
      <div class="card-label">Vekalet Bakiyesi${helpTip('Anlaşılan vekalet ücretinden tahsil edilen kısım düşüldükten sonra kalan alacak')}</div>
      <div class="card-value" style="color:${oz.bakiye.vekaletBakiye>0?'var(--gold)':'var(--green)'}">${fmt(oz.bakiye.vekaletBakiye)}</div>
      <div style="font-size:10px;color:var(--text-dim);margin-top:4px">Anlaşılan: ${fmt(oz.vekaletUcreti.akdi.anlasilanToplam)} — Tahsil: ${fmt(oz.vekaletUcreti.akdi.tahsilEdilen)}</div>
    </div>
  </div>

  <!-- Davalar Özet -->
  <div class="section">
    <div class="section-header"><div class="section-title">📁 Dava & İcra Özeti</div></div>
    <div class="section-body" style="padding:0">
      ${davalar.length?`<table><thead><tr><th>Dosya No</th><th>Konu</th><th>Mahkeme</th><th>Aşama</th><th>Durum</th><th>Son Duruşma</th></tr></thead><tbody>
      ${davalar.map(d=>`<tr>
        <td style="color:var(--gold);font-weight:600">${d.no}</td>
        <td>${d.konu}</td>
        <td style="font-size:11px">${[d.il,d.mtur].filter(Boolean).join(' ')}</td>
        <td style="font-size:11px;color:${ARENK[d.asama]||'var(--text-muted)'}">${d.asama||'—'}</td>
        <td><span class="badge badge-${d.durum==='Aktif'?'aktif':d.durum==='Beklemede'?'beklemede':'kapali'}">${d.durum}</span></td>
        <td>${fmtD(d.durusma)}</td>
      </tr>`).join('')}
      </tbody></table>`:
      `<div style="padding:20px;color:var(--text-dim);text-align:center">Dava kaydı yok</div>`}
      ${icralar.length?`<div style="padding:10px 18px;font-size:11px;font-weight:700;color:var(--text-muted);border-top:1px solid var(--border)">İCRA DOSYALARI</div>
      <table><thead><tr><th>Dosya No</th><th>Borçlu</th><th>Alacak</th><th>Tahsil</th><th>Durum</th></tr></thead><tbody>
      ${icralar.map(i=>`<tr>
        <td style="color:var(--blue);font-weight:600">${i.no}</td>
        <td>${i.borclu||'—'}</td>
        <td style="color:var(--green);font-weight:600">${fmt(i.alacak)}</td>
        <td>${fmt(i.tahsil||0)}</td>
        <td><span style="color:${IDRENK[i.durum]||'var(--text-muted)'};">${i.durum}</span></td>
      </tr>`).join('')}
      </tbody></table>`:''}
    </div>
  </div>

  <!-- Son İletişimler -->
  ${(()=>{
    const muvetk=state.etkinlikler.filter(e=>e.muvId===aktivMuvId&&e.tarih>=today()).slice(0,5);
    if(!muvetk.length)return'';
    return '<div class="section"><div class="section-header"><div class="section-title">📅 Yaklaşan Etkinlikler</div></div><div class="section-body" style="padding:0">'
      +muvetk.map(e=>'<div style="padding:10px 18px;border-top:1px solid var(--border);display:flex;gap:12px"><div style="min-width:85px;font-size:11px;color:var(--text-muted)">'+fmtD(e.tarih)+(e.saat?' '+e.saat:'')+'</div><div style="font-size:11px;color:var(--gold);min-width:120px">'+e.tur+'</div><div style="font-size:12px;color:var(--text)">'+e.baslik+(e.yer?' — 📍'+e.yer:'')+'</div></div>').join('')
      +'</div></div>';
  })()}

    ${iletisimler.length?`<div class="section">
    <div class="section-header"><div class="section-title">💬 Son İletişimler <span style="font-size:11px;font-weight:400;color:var(--text-dim)">(son 5)</span></div></div>
    <div class="section-body" style="padding:0">
      ${iletisimler.slice(0,5).map(k=>`<div style="padding:10px 18px;border-top:1px solid var(--border);display:flex;gap:12px">
        <div style="min-width:85px;font-size:11px;color:var(--text-muted)">${fmtD(k.tarih)}${k.saat?' '+k.saat:''}</div>
        <div style="font-size:11px;color:var(--gold);min-width:160px">${k.kanal}</div>
        <div style="font-size:12px;color:var(--text)">${k.ozet}</div>
      </div>`).join('')}
    </div>
  </div>`:''}

  <!-- Vekaletname Durumu (state.belgeler'den) -->
  ${(function(){
    var vekler=getBelgeVekaletnameler(aktivMuvId);
    if(!vekler.length)return'';
    return'<div class="section"><div class="section-header"><div class="section-title">📜 Vekâletname Durumu</div></div><div class="section-body" style="padding:0">'+
      vekler.map(function(b){
        var dur=getVekDurum(b);
        var noter=(b.meta&&b.meta.noter)||'Belirtilmemiş';
        var yevmiye=(b.meta&&b.meta.yevmiye)?'/ Yev: '+b.meta.yevmiye:'';
        var ozel=(b.meta&&b.meta.ozel)?'<span style="background:var(--gold-dim);color:var(--gold);border-radius:4px;font-size:9px;font-weight:700;padding:2px 6px">ÖZEL YETKİ</span>':'';
        var bitisStr=b.meta&&b.meta.bitis?fmtD(b.meta.bitis):'';
        return'<div style="padding:10px 18px;border-top:1px solid var(--border);display:flex;gap:16px;align-items:center">'+
          '<div style="flex:1;font-size:12px">'+noter+' '+yevmiye+'</div>'+
          '<span style="color:'+dur.renk+';font-weight:700;font-size:12px">'+dur.ikon+' '+dur.label+(bitisStr?' ('+bitisStr+')':'')+'</span>'+
          ozel+'</div>';
      }).join('')+'</div></div>';
  })()}`;

  document.getElementById('mt-rapor-content').innerHTML=html;
}

function exportMuvRaporPDF(){
  // Print-based PDF export
  window.print();
}

// ================================================================
// SKOR BADGE - Müvekkil listesinde göster
// ================================================================
function skorBadge(muvId){
  const s=calcMuvSkor(muvId);
  return`<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${s.renk}22;color:${s.renk};font-size:10px;font-weight:700;border:1px solid ${s.renk}44" title="Müvekkil Skoru: ${s.puan}">${s.puan>=70?'●':s.puan>=40?'●':'●'}</span>`;
}
function getAllMuvHarcamalar(muvId){
  const direct=state.davalar.filter(d=>d.muvId===muvId).flatMap(d=>(d.harcamalar||[]).map(h=>({...h,kaynak:'Dava',kaynakNo:d.no,mahkeme:[d.il,d.adliye,d.mtur,d.mno].filter(Boolean).join(' ')})));
  const icra=state.icra.filter(i=>i.muvId===muvId).flatMap(i=>(i.harcamalar||[]).map(h=>({...h,kaynak:'İcra',kaynakNo:i.no,mahkeme:[i.il,i.daire].filter(Boolean).join(' ')})));
  return [...direct,...icra].sort((a,b)=>b.tarih.localeCompare(a.tarih));
}

function renderMdDavalar(){
  const tb=document.getElementById('md-dav-tbody'),em=document.getElementById('md-dav-empty');
  const list=state.davalar.filter(d=>d.muvId===aktivMuvId);
  tb.innerHTML='';
  if(!list.length){em.style.display='block';return;}em.style.display='none';
  list.forEach(d=>{
    const bc=d.durum==='Aktif'?'aktif':d.durum==='Beklemede'?'beklemede':'kapali';
    tb.innerHTML+=`<tr style="cursor:pointer" onclick="openDavaDetay('${d.id}')">
      <td><strong style="color:var(--gold)">${d.no}</strong></td>
      <td>${d.konu}</td><td style="font-size:11px">${[d.il,d.mtur].filter(Boolean).join(' ')}</td>
      <td style="color:${ARENK[d.asama]||'var(--text-muted)'};font-size:11px">${d.asama||'—'}</td>
      <td><span class="badge badge-${bc}">${d.durum}</span></td>
      <td>${fmtD(d.durusma)}</td><td style="font-size:11px;color:var(--blue)">${d.icrano||'—'}</td>
      <td><button class="delete-btn" onclick="event.stopPropagation();deleteDavaById('${d.id}')">✕</button></td>
    </tr>`;
  });
  // icra
  const itb=document.getElementById('md-icra-tbody'),iem=document.getElementById('md-icra-empty');
  const ilist=state.icra.filter(i=>i.muvId===aktivMuvId);
  itb.innerHTML='';
  if(!ilist.length){iem.style.display='block';}else{
    iem.style.display='none';
    ilist.forEach(i=>{
      const kalan=(i.alacak||0)-(i.tahsil||0);
      itb.innerHTML+=`<tr style="cursor:pointer" onclick="openIcraDetay('${i.id}')">
        <td><span style="font-size:9px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:1px">#${i.sira||'?'}</span><strong style="color:var(--gold)">${i.no}</strong></td>
        <td>${i.borclu}</td><td style="font-size:11px">${[i.il,i.adliye,i.daire].filter(Boolean).join(' — ')}</td>
        <td>${fmt(i.alacak)}</td><td style="color:var(--green)">${fmt(i.tahsil)}</td>
        <td style="color:${IDRENK[i.durum]||'var(--text-muted)'};font-size:11px">${i.durum}</td>
        <td><button class="delete-btn" onclick="event.stopPropagation();deleteIcraById('${i.id}')">✕</button></td>
      </tr>`;
    });
  }
}

function renderMdHarcamalar(){
  const tb=document.getElementById('md-harc-tbody'),em=document.getElementById('md-harc-empty');
  const list=getAllMuvHarcamalar(aktivMuvId);
  tb.innerHTML='';
  if(!list.length){em.style.display='block';document.getElementById('md-harc-total').textContent='₺0';return;}
  em.style.display='none';
  list.forEach(h=>{
    tb.innerHTML+=`<tr>
      <td>${fmtD(h.tarih)}</td>
      <td><span class="badge badge-${h.kaynak==='Dava'?'durusma':'avans'}">${h.kaynak}</span></td>
      <td style="font-size:11px">${h.mahkeme||''} ${h.kaynakNo?'/ '+h.kaynakNo:''}</td>
      <td>${h.kat||h.kategori||'—'}</td><td>${h.acik||h.aciklama||'—'}</td>
      <td style="color:#e74c3c;font-weight:600">${fmt(h.tutar)}</td>
      <td><button class="delete-btn" onclick="deleteHarcamaById('${h.id}','${h.kaynak}')">✕</button></td>
    </tr>`;
  });
  document.getElementById('md-harc-total').textContent=fmt(list.reduce((s,h)=>s+h.tutar,0));
}

function deleteHarcamaById(hId,kaynak){
  let acik='',tutar=0;
  if(kaynak==='Dava'){state.davalar.forEach(d=>{const h=(d.harcamalar||[]).find(x=>x.id===hId);if(h){acik=h.acik||h.aciklama||'';tutar=h.tutar;}d.harcamalar=(d.harcamalar||[]).filter(h=>h.id!==hId);});}
  else{state.icra.forEach(i=>{const h=(i.harcamalar||[]).find(x=>x.id===hId);if(h){acik=h.acik||h.aciklama||'';tutar=h.tutar;}i.harcamalar=(i.harcamalar||[]).filter(h=>h.id!==hId);});}
  addLog(aktivMuvId,'Harcama Silindi',`${kaynak} | ${fmt(tutar)}${acik?' | '+acik:''}`);
  saveData();renderMdHarcamalar();renderMdCards();notify('Harcama silindi');
}

function openHarcModalForMuv(){openHarcForDosya('muv');}

function renderMdAvans(){
  const tb=document.getElementById('md-avans-tbody'),em=document.getElementById('md-avans-empty');
  const list=state.avanslar.filter(a=>a.muvId===aktivMuvId).sort((a,b)=>b.tarih.localeCompare(a.tarih));
  tb.innerHTML='';
  if(!list.length){em.style.display='block';return;}em.style.display='none';
  list.forEach(a=>{
    const bc=a.durum==='Ödendi'?'odendi':a.durum==='Bekliyor'?'bekliyor':'kismi';
    const dosyaBadge=a.dosyaNo?`<div style="font-size:9px;color:var(--blue);margin-top:2px">${a.dosyaTur==='dava'?'📁':'⚡'} ${a.dosyaNo}</div>`:'';
    tb.innerHTML+=`<tr><td>${fmtD(a.tarih)}</td><td><span class="badge badge-avans">${a.tur}</span></td><td>${a.acik||'—'}${dosyaBadge}</td><td style="font-weight:600">${fmt(a.tutar)}</td><td><span class="badge badge-${bc}">${a.durum}</span></td><td>${fmtD(a.odeme)}</td><td style="white-space:nowrap"><button class="btn btn-outline btn-sm" style="padding:2px 7px;font-size:11px;margin-right:4px" onclick="editAvans('${a.id}')">✏</button><button class="delete-btn" onclick="deleteAvans('${a.id}')">✕</button></td></tr>`;
  });
  document.getElementById('md-avans-alinan').textContent=fmt(list.filter(a=>a.tur==='Avans Alındı').reduce((s,a)=>s+a.tutar,0));
  document.getElementById('md-avans-bekleyen').textContent=fmt(list.filter(a=>a.durum==='Bekliyor').reduce((s,a)=>s+a.tutar,0));
}

// ================================================================
// AVANS
// ================================================================
let avansEditId=null;
function editAvans(id){
  const a=state.avanslar.find(x=>x.id===id);if(!a)return;
  avansEditId=id;
  document.getElementById('avans-modal-title').textContent='Avans / Alacak Düzenle';
  document.getElementById('a-tur').value=a.tur;
  document.getElementById('a-tarih').value=a.tarih;
  document.getElementById('a-tutar').value=a.tutar;
  document.getElementById('a-durum').value=a.durum;
  document.getElementById('a-acik').value=a.acik||'';
  document.getElementById('a-odeme').value=a.odeme||'';
  openModal('avans-modal');
}
async function saveAvans(){
  const tutar=parseFloat(document.getElementById('a-tutar').value);
  const tarih=document.getElementById('a-tarih').value;
  if(!zorunluKontrol([{id:'a-tarih',deger:tarih,label:'Tarih'},{id:'a-tutar',deger:(!isNaN(tutar)&&tutar>0)?'ok':'',label:'Tutar'}])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  const dosyaSec=document.getElementById('a-dosya').value;
  let dosyaTur=null,dosyaId=null,dosyaNo='';
  if(dosyaSec){
    const [tip,did]=dosyaSec.split(':');
    dosyaTur=tip;dosyaId=did;
    if(tip==='dava'){const d=getDava(did);dosyaNo=d?d.no:'';}
    else if(tip==='icra'){const i=getIcra(did);dosyaNo=i?i.no:'';}
  }
  const acik=document.getElementById('a-acik').value.trim();
  const tur=document.getElementById('a-tur').value;
  const durum=document.getElementById('a-durum').value;
  const odeme=document.getElementById('a-odeme').value;

  if(avansEditId){
    const a=state.avanslar.find(x=>x.id===avansEditId);
    if(a){
      const eskiOzet=`${a.tur} | ${fmt(a.tutar)} | ${a.durum}`;
      const guncel = Object.assign({}, a, {tur,tarih,tutar,durum,acik,odeme});
      if (typeof LexSubmit !== 'undefined') {
        var btn = document.querySelector('#avans-modal .btn-gold');
        var ok = await LexSubmit.formKaydet({ tablo:'avanslar', kayit:guncel, modalId:'avans-modal', butonEl:btn, basariMesaj:'✓ Kayıt güncellendi',
          renderFn:function(){ addLog(aktivMuvId,'Avans Düzenlendi',eskiOzet+' → '+tur+' | '+fmt(tutar)); refreshFinansViews({muvId:aktivMuvId}); }
        });
        if(!ok) return;
      } else {
        Object.assign(a, {tur,tarih,tutar,durum,acik,odeme});
        addLog(aktivMuvId,'Avans Düzenlendi',eskiOzet+' → '+tur+' | '+fmt(tutar));
        closeModal('avans-modal');saveData();renderMdAvans();renderMdCards();notify('✓ Kayıt güncellendi');
      }
    }
    avansEditId=null;
    return;
  }
  // Yeni kayıt
  const avansId=uid();
  const yeniAvans = {id:avansId,muvId:aktivMuvId,tarih,tutar,tur,durum,acik,odeme,dosyaTur,dosyaId,dosyaNo};
  if (typeof LexSubmit !== 'undefined') {
    var btn2 = document.querySelector('#avans-modal .btn-gold');
    var ok2 = await LexSubmit.formKaydet({ tablo:'avanslar', kayit:yeniAvans, modalId:'avans-modal', butonEl:btn2, basariMesaj:'✓ Kayıt eklendi'+(dosyaNo?' → '+dosyaNo+' dosyasına da eklendi':''),
      renderFn:function(){
        addLog(aktivMuvId,'Avans Eklendi',tur+' | '+fmt(tutar)+' | '+durum);
        if(dosyaTur&&dosyaId){
          const harc={id:uid(),tarih,tutar,kat:'Avans / Masraf',acik:(acik||tur)+' — avans kaydından'};
          if(dosyaTur==='dava'){const d=getDava(dosyaId);if(d){if(!d.harcamalar)d.harcamalar=[];d.harcamalar.push(harc);}}
          else if(dosyaTur==='icra'){const i=getIcra(dosyaId);if(i){if(!i.harcamalar)i.harcamalar=[];i.harcamalar.push(harc);}}
          saveData();
        }
        refreshFinansViews({muvId:aktivMuvId, dosyaTur:dosyaTur, dosyaId:dosyaId});
      }
    });
    if(!ok2) return;
  } else {
    state.avanslar.push(yeniAvans);
    addLog(aktivMuvId,'Avans Eklendi',tur+' | '+fmt(tutar)+' | '+durum);
    if(dosyaTur&&dosyaId){
      const harc={id:uid(),tarih,tutar,kat:'Avans / Masraf',acik:(acik||tur)+' — avans kaydından'};
      if(dosyaTur==='dava'){const d=getDava(dosyaId);if(d){if(!d.harcamalar)d.harcamalar=[];d.harcamalar.push(harc);}}
      else if(dosyaTur==='icra'){const i=getIcra(dosyaId);if(i){if(!i.harcamalar)i.harcamalar=[];i.harcamalar.push(harc);}}
    }
    closeModal('avans-modal');saveData();renderMdAvans();renderMdCards();notify('✓ Kayıt eklendi');
  }
}
async function deleteAvans(id){
  if (typeof LexSubmit !== 'undefined') {
    await LexSubmit.formSil({ tablo:'avanslar', id:id, onayMesaj:'Bu kaydı silmek istediğinize emin misiniz?', basariMesaj:'Silindi',
      renderFn:function(){ refreshFinansViews({muvId:aktivMuvId}); }
    });
  } else {
    const a=state.avanslar.find(x=>x.id===id);
    if(a)addLog(aktivMuvId,'Avans Silindi',a.tur+' | '+fmt(a.tutar));
    state.avanslar=state.avanslar.filter(a=>a.id!==id);saveData();renderMdAvans();renderMdCards();notify('Silindi');
  }
}

// ================================================================
// BELGELER — MÜVEKKİL ÖZLÜK DOSYASI
// ================================================================
var BELGE_KAT = {
  vekaletname: { label:'Vekâletnameler', ikon:'📜', renk:'#9b59b6' },
  sozlesme:    { label:'Sözleşmeler',    ikon:'📋', renk:'var(--gold)' },
  kimlik:      { label:'Kimlik Belgeleri',ikon:'🪪', renk:'var(--blue)' },
  sirkuler:    { label:'Sicil / Sirkü',  ikon:'🏢', renk:'#2ecc71' },
  makbuz:      { label:'Makbuz / Dekont', ikon:'🧾', renk:'#1abc9c' },
  diger:       { label:'Diğer',          ikon:'📄', renk:'var(--text-muted)' }
};
var belgeEditId = null;
var belgeFiltreKat = '';
var belgeAraMetin = '';

// ── Yardımcılar ──────────────────────────────────────────────
function getBelgeVekaletnameler(muvId) {
  return (state.belgeler || []).filter(function(b) { return b.muvId === muvId && b.tur === 'vekaletname'; });
}
function getVekDurum(belge) {
  var bugun = today();
  var bitis = belge.meta && belge.meta.bitis;
  if (!bitis) return { kod:'belirsiz', renk:'var(--text-dim)', ikon:'—', label:'Belirtilmemiş' };
  if (bitis < bugun) return { kod:'bitmis', renk:'#e74c3c', ikon:'⛔', label:'Süresi Doldu' };
  var otuzGun = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  if (bitis < otuzGun) return { kod:'yaklasan', renk:'#e67e22', ikon:'⚠', label:'Yaklaşıyor' };
  return { kod:'gecerli', renk:'var(--green)', ikon:'✓', label:'Geçerli' };
}

// ── RENDER ───────────────────────────────────────────────────
function renderBelgeler() {
  var el = document.getElementById('belge-container');
  if (!el) return;
  var tum = (state.belgeler || []).filter(function(b) { return b.muvId === aktivMuvId; });
  var bugun = today();

  // Filtrele
  var liste = tum;
  if (belgeFiltreKat) liste = liste.filter(function(b) { return b.tur === belgeFiltreKat; });
  if (belgeAraMetin) {
    var q = belgeAraMetin.toLowerCase();
    liste = liste.filter(function(b) {
      return (b.ad || '').toLowerCase().indexOf(q) !== -1 ||
             (b.acik || '').toLowerCase().indexOf(q) !== -1 ||
             (b.meta && b.meta.noter || '').toLowerCase().indexOf(q) !== -1 ||
             (b.meta && b.meta.yevmiye || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  // Vekâletname uyarıları
  var bitmisVek = tum.filter(function(b) { return b.tur === 'vekaletname' && b.meta && b.meta.bitis && b.meta.bitis < bugun; });
  var yaklaVek = tum.filter(function(b) {
    if (b.tur !== 'vekaletname' || !b.meta || !b.meta.bitis) return false;
    return b.meta.bitis >= bugun && b.meta.bitis < new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  });

  var html = '';

  // Başlık
  html += '<div class="section"><div class="section-header">';
  html += '<div class="section-title">📁 Müvekkil Özlük Dosyası</div>';
  html += '<button class="btn btn-gold btn-sm" onclick="openBelgeModal()">+ Belge Ekle</button>';
  html += '</div>';

  // Arama + filtre
  html += '<div style="display:flex;gap:10px;padding:0 18px 12px;flex-wrap:wrap">';
  html += '<input id="belge-ara-input" type="text" placeholder="🔍 Belge ara..." value="' + (belgeAraMetin || '') + '" oninput="belgeAraMetin=this.value;renderBelgeler()" style="flex:1;min-width:160px;padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);color:var(--text);font-size:12px">';
  html += '<select onchange="belgeFiltreKat=this.value;renderBelgeler()" style="padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface2);color:var(--text);font-size:12px">';
  html += '<option value="">Tüm Kategoriler</option>';
  Object.keys(BELGE_KAT).forEach(function(k) {
    html += '<option value="' + k + '"' + (belgeFiltreKat === k ? ' selected' : '') + '>' + BELGE_KAT[k].ikon + ' ' + BELGE_KAT[k].label + '</option>';
  });
  html += '</select></div>';

  // Uyarı banner
  if (bitmisVek.length || yaklaVek.length) {
    var uyariRenk = bitmisVek.length ? '#e74c3c' : '#e67e22';
    html += '<div style="background:rgba(231,76,60,.08);border:1px solid ' + uyariRenk + '44;border-radius:var(--radius);padding:10px 16px;margin:0 18px 12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">';
    if (bitmisVek.length) html += '<span style="color:#e74c3c;font-size:12px;font-weight:600">⛔ ' + bitmisVek.length + ' vekâletname süresi doldu</span>';
    if (yaklaVek.length) html += '<span style="color:#e67e22;font-size:12px;font-weight:600">⚠ ' + yaklaVek.length + ' vekâletname 30 gün içinde sona eriyor</span>';
    html += '</div>';
  }

  // Belgeler grupla
  var katSira = ['vekaletname', 'sozlesme', 'kimlik', 'sirkuler', 'makbuz', 'diger'];
  var toplamBoyut = 0;
  var toplamSayi = liste.length;

  katSira.forEach(function(kat) {
    var items = liste.filter(function(b) { return b.tur === kat; });
    var katInfo = BELGE_KAT[kat] || BELGE_KAT.diger;

    html += '<div style="margin:0 18px 14px">';
    html += '<div style="font-size:10px;font-weight:700;color:' + katInfo.renk + ';text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;display:flex;align-items:center;gap:6px">';
    html += katInfo.ikon + ' ' + katInfo.label + ' <span style="color:var(--text-dim);font-weight:400">(' + items.length + ')</span></div>';

    if (!items.length) {
      html += '<div style="font-size:11px;color:var(--text-dim);padding:8px 0">Belge yok</div>';
    } else {
      items.forEach(function(b) {
        if (b.data) toplamBoyut += (b.data.length * 3 / 4);
        var isVek = b.tur === 'vekaletname';
        var hasDosya = !!b.data;

        // Aksiyon butonları
        var aksiyonlar = '';
        if (hasDosya) {
          aksiyonlar += '<button class="btn btn-outline btn-sm" onclick="openBelgeViewer(\'' + b.id + '\')" title="Görüntüle">👁</button>';
          aksiyonlar += '<button class="btn btn-outline btn-sm" onclick="dlBelge(\'' + b.id + '\')" title="İndir">⬇</button>';
        } else {
          aksiyonlar += '<button class="btn btn-outline btn-sm" onclick="openBelgeModal(\'' + b.id + '\')" title="Dosya Ekle" style="color:var(--gold)">📎</button>';
        }
        aksiyonlar += '<button class="btn btn-outline btn-sm" onclick="openBelgeModal(\'' + b.id + '\')" title="Düzenle">✏</button>';

        html += '<div class="file-item">';
        html += '<div class="file-icon">' + (hasDosya ? fileIcon(b.dosyaAd) : katInfo.ikon) + '</div>';
        html += '<div class="file-info">';
        html += '<div class="file-name">' + (b.ad || 'İsimsiz Belge') + '</div>';

        // Meta satırı
        var metaParts = [];
        if (b.tarih) metaParts.push(fmtD(b.tarih));
        else if (b.yukleme) metaParts.push(fmtD(b.yukleme));
        if (hasDosya) metaParts.push(fileSize(b.data));
        if (!hasDosya) metaParts.push('<span style="color:var(--gold)">dosya yok</span>');
        if (b.acik) metaParts.push(b.acik);

        // Vekâletname özel meta
        if (isVek && b.meta) {
          if (b.meta.noter) metaParts.push(b.meta.noter);
          if (b.meta.yevmiye) metaParts.push('Y:' + b.meta.yevmiye);
          if (b.meta.vekil) metaParts.push(b.meta.vekil);
        }
        html += '<div class="file-meta">' + metaParts.join(' · ') + '</div>';
        html += '</div>';

        // Vekâletname durum badge
        if (isVek && b.meta) {
          var dur = getVekDurum(b);
          html += '<div style="font-size:11px;font-weight:600;color:' + dur.renk + ';white-space:nowrap;margin-right:6px">' + dur.ikon + ' ' + dur.label + '</div>';
        }

        html += '<div class="file-actions">' + aksiyonlar + '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
  });

  // Alt bilgi
  var boyutMB = (toplamBoyut / (1024 * 1024)).toFixed(1);
  html += '<div style="text-align:right;padding:8px 18px;font-size:10px;color:var(--text-dim);border-top:1px solid var(--border)">';
  html += 'Toplam: ' + toplamSayi + ' belge' + (toplamBoyut > 0 ? ' · ' + boyutMB + ' MB' : '');
  html += '</div>';

  html += '</div>';
  el.innerHTML = html;
}

// ── MODAL ────────────────────────────────────────────────────
function bgTurDegisti() {
  var tur = document.getElementById('bg-tur').value;
  document.getElementById('bg-vek-alanlar').style.display = (tur === 'vekaletname') ? 'block' : 'none';
}

function openBelgeModal(editId) {
  belgeEditId = editId || null;
  bgFileData = null;
  document.getElementById('bg-file').value = '';
  document.getElementById('bg-file-lbl').textContent = 'Tıklayın veya sürükleyin';

  var silBtn = document.getElementById('bg-sil-btn');

  if (editId) {
    // Düzenleme modu
    var b = (state.belgeler || []).find(function(x) { return x.id === editId; });
    if (!b) return;
    document.getElementById('bg-title').textContent = '📁 Belge Düzenle';
    document.getElementById('bg-tur').value = b.tur || 'diger';
    document.getElementById('bg-ad').value = b.ad || '';
    document.getElementById('bg-tarih').value = b.tarih || '';
    document.getElementById('bg-acik').value = b.acik || '';

    if (b.data) {
      bgFileData = { ad: b.dosyaAd, tip: b.tip, data: b.data };
      document.getElementById('bg-file-lbl').textContent = '📎 ' + (b.dosyaAd || 'Mevcut dosya');
    }

    // Vekâletname alanları
    if (b.tur === 'vekaletname' && b.meta) {
      document.getElementById('bg-vk-tarih').value = b.meta.bitis ? (b.tarih || '') : '';
      document.getElementById('bg-vk-bitis').value = b.meta.bitis || '';
      document.getElementById('bg-vk-noter').value = b.meta.noter || '';
      document.getElementById('bg-vk-yevmiye').value = b.meta.yevmiye || '';
      document.getElementById('bg-vk-vekil').value = b.meta.vekil || '';
      document.getElementById('bg-vk-ozel').checked = !!b.meta.ozel;
      document.getElementById('bg-vk-ozel-alan').style.display = b.meta.ozel ? 'block' : 'none';
      document.getElementById('bg-vk-ozel-acik').value = b.meta.ozelAcik || '';
    }

    silBtn.style.display = 'inline-flex';
    bgTurDegisti();
  } else {
    // Yeni belge
    document.getElementById('bg-title').textContent = '📁 Belge Ekle';
    document.getElementById('bg-tur').value = 'diger';
    document.getElementById('bg-ad').value = '';
    document.getElementById('bg-tarih').value = today();
    document.getElementById('bg-acik').value = '';
    // Vek alanlarını sıfırla
    ['bg-vk-tarih', 'bg-vk-bitis', 'bg-vk-noter', 'bg-vk-yevmiye', 'bg-vk-vekil', 'bg-vk-ozel-acik'].forEach(function(i) {
      document.getElementById(i).value = '';
    });
    document.getElementById('bg-vk-ozel').checked = false;
    document.getElementById('bg-vk-ozel-alan').style.display = 'none';
    document.getElementById('bg-vek-alanlar').style.display = 'none';
    silBtn.style.display = 'none';
  }

  document.getElementById('belge-modal').classList.add('open');
}

function bgFileSelected(ev) {
  var f = ev.target.files[0]; if (!f) return;
  // 5 MB kontrol
  if (f.size > 5 * 1024 * 1024) {
    notify('⚠ Dosya 5 MB sınırını aşıyor!');
    ev.target.value = '';
    return;
  }
  document.getElementById('bg-file-lbl').textContent = '📎 ' + f.name;
  if (!document.getElementById('bg-ad').value) document.getElementById('bg-ad').value = f.name;
  var r = new FileReader();
  r.onload = function(e) { bgFileData = { ad: f.name, tip: f.type, data: e.target.result }; };
  r.readAsDataURL(f);
}

function saveBelge() {
  var tur = document.getElementById('bg-tur').value;
  var ad = document.getElementById('bg-ad').value.trim();
  if (!ad && bgFileData) ad = bgFileData.ad;
  if (!ad) { notify('Belge adı girin!'); return; }

  var veri = {
    muvId: aktivMuvId,
    ad: ad,
    tur: tur,
    acik: document.getElementById('bg-acik').value.trim(),
    tarih: document.getElementById('bg-tarih').value || today(),
    etiketler: [],
    meta: {}
  };

  // Dosya verisi
  if (bgFileData) {
    veri.dosyaAd = bgFileData.ad;
    veri.tip = bgFileData.tip;
    veri.data = bgFileData.data;
  }

  // Vekâletname meta
  if (tur === 'vekaletname') {
    veri.meta = {
      bitis: document.getElementById('bg-vk-bitis').value || '',
      noter: document.getElementById('bg-vk-noter').value.trim(),
      yevmiye: document.getElementById('bg-vk-yevmiye').value.trim(),
      vekil: document.getElementById('bg-vk-vekil').value.trim(),
      ozel: document.getElementById('bg-vk-ozel').checked,
      ozelAcik: document.getElementById('bg-vk-ozel-acik').value.trim()
    };
  }

  if (belgeEditId) {
    // Güncelleme
    var mevcut = state.belgeler.find(function(x) { return x.id === belgeEditId; });
    if (mevcut) {
      Object.assign(mevcut, veri);
      // Dosya değişmediyse eski dosyayı koru
      if (!bgFileData && mevcut.data) {
        // data zaten mevcut, dokunma
      } else if (!bgFileData) {
        mevcut.dosyaAd = mevcut.dosyaAd || null;
        mevcut.tip = mevcut.tip || null;
        mevcut.data = mevcut.data || null;
      }
    }
    addLog(aktivMuvId, 'Belge Güncellendi', ad + ' | ' + tur);
  } else {
    // Yeni
    veri.id = uid();
    veri.yukleme = today();
    if (!bgFileData) {
      veri.dosyaAd = null;
      veri.tip = null;
      veri.data = null;
    }
    state.belgeler.push(veri);
    addLog(aktivMuvId, 'Belge Eklendi', ad + ' | ' + tur);
  }

  bgFileData = null;
  belgeEditId = null;
  closeModal('belge-modal');
  saveData();
  renderBelgeler();
  renderMdCards();
  notify('✓ Belge kaydedildi');
}

function dlBelge(id) {
  var b = state.belgeler.find(function(x) { return x.id === id; });
  if (!b || !b.data) return;
  var a = document.createElement('a');
  a.href = b.data;
  a.download = b.dosyaAd || 'belge';
  a.click();
}

function openBelgeViewer(id) {
  var b = state.belgeler.find(function(x) { return x.id === id; });
  if (!b || !b.data) return;
  bvCurrentData = { data: b.data, tip: b.tip, ad: b.dosyaAd || b.ad };
  document.getElementById('bv-title').textContent = b.ad || b.dosyaAd || 'Belge';
  var c = document.getElementById('bv-content');
  var tip = (b.tip || '').toLowerCase();
  if (tip.includes('image') || tip.includes('jpg') || tip.includes('jpeg') || tip.includes('png')) {
    c.innerHTML = '<img src="' + b.data + '" style="max-width:100%;max-height:65vh;border-radius:var(--radius)">';
  } else if (tip.includes('pdf')) {
    c.innerHTML = '<iframe src="' + b.data + '" style="width:100%;height:65vh;border:none;border-radius:var(--radius)"></iframe>';
  } else {
    c.innerHTML = '<div style="padding:40px;text-align:center"><div style="font-size:48px;margin-bottom:16px">' + fileIcon(b.dosyaAd) + '</div><div style="font-size:14px;margin-bottom:16px">' + (b.dosyaAd || '') + '</div><button class="btn btn-gold" onclick="bvIndir()">⬇ İndir</button></div>';
  }
  document.getElementById('belge-viewer-modal').classList.add('open');
}

function delBelge(id) {
  if (!confirm('Bu belgeyi silmek istiyor musunuz?')) return;
  var b = state.belgeler.find(function(x) { return x.id === id; });
  if (b) addLog(aktivMuvId, 'Belge Silindi', b.ad + ' | ' + b.tur);
  state.belgeler = state.belgeler.filter(function(x) { return x.id !== id; });
  belgeEditId = null;
  closeModal('belge-modal');
  saveData();
  renderBelgeler();
  renderMdCards();
  notify('Silindi');
}

// ================================================================
// DAVALAR LİSTESİ
// ================================================================