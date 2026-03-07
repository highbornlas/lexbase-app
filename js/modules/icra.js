// ================================================================
// EMD HUKUK — İCRA TAKIP
// js/modules/icra.js
// ================================================================

function saveIcra(){
  const no=document.getElementById('i-no').value.trim(),muvId=document.getElementById('i-muv').value,borclu=document.getElementById('i-borclu').value.trim();
  const alacak=parseFloat(document.getElementById('i-alacak').value);
  if(!zorunluKontrol([
    {id:'i-no', deger:no, label:'Dosya No'},
    {id:'i-muv', deger:muvId, label:'Müvekkil'},
    {id:'i-borclu', deger:borclu, label:'Borçlu Adı'},
    {id:'i-alacak', deger:(!isNaN(alacak)&&alacak>0)?'ok':'', label:'Alacak Tutarı'},
  ])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  if(!limitKontrol('icra')) return;
  const karsavId=document.getElementById('i-karsav-id').value;
  const yeniIcra = {
    id:uid(),sira:nextSira('icra'),no,muvId,borclu,btc:document.getElementById('i-btc').value.trim(),
    il:document.getElementById('i-il').value,adliye:document.getElementById('i-adliye').value,daire:document.getElementById('i-daire').value.trim(),
    esas:document.getElementById('i-esas').value.trim(),tur:document.getElementById('i-tur').value,
    alacak,tahsil:parseFloat(document.getElementById('i-tahsil').value)||0,
    faiz:parseFloat(document.getElementById('i-faiz').value)||0,atur:document.getElementById('i-atur').value,
    durum:document.getElementById('i-durum').value,tarih:document.getElementById('i-tarih').value,
    otarih:document.getElementById('i-otarih').value,itarih:document.getElementById('i-itarih').value,
    karsavId,karsav:getVekAd(karsavId),
    davno:document.getElementById('i-davno').value.trim(),dayanak:document.getElementById('i-dayanak').value.trim(),
    not:document.getElementById('i-not').value.trim(),evraklar:[],notlar:[],harcamalar:[],anlasma:{}
  };
  // ── Mükerrer icra kontrolü ──
  if (typeof MukerrerKontrol !== 'undefined') {
    const mukKontrol = MukerrerKontrol.icraKontrol(yeniIcra);
    if (mukKontrol.length > 0) {
      MukerrerKontrol.uyariGoster('icra', yeniIcra.no + ' — ' + yeniIcra.borclu, mukKontrol, function() { _saveIcraDevam(yeniIcra); });
      return;
    }
  }
  _saveIcraDevam(yeniIcra);
}
function _saveIcraDevam(yeniIcra) {
  state.icra.push(yeniIcra);
  ['i-no','i-borclu','i-btc','i-daire','i-esas','i-alacak','i-tahsil','i-faiz','i-davno','i-dayanak','i-not','i-tarih','i-otarih','i-itarih'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='';}); document.getElementById('i-il').value=''; document.getElementById('i-adliye').innerHTML='<option value="">— Önce il seçin —</option>';
  ktWidgetTemizle('i-karsav-ara','i-karsav-liste','i-karsav-id','i-karsav-goster');
  closeModal('icra-modal');saveData();renderIcra();renderIcraCards();renderMdDavalar();updateBadges();notify('✓ İcra dosyası eklendi');
}
function deleteIcraById(id){
  if(!confirm('Bu icra dosyasını silmek istediğinize emin misiniz?'))return;
  state.icra=state.icra.filter(i=>i.id!==id);
  saveData();renderIcra();renderIcraCards();renderMdDavalar();updateBadges();notify('İcra silindi');
}
function openIcraModalForMuv(){openModal('icra-modal');setTimeout(()=>{const e=document.getElementById('i-no');if(e&&!e.value)e.value=autoNo('icra');},50);setTimeout(()=>{const e=document.getElementById('i-muv');if(aktivMuvId)e.value=aktivMuvId;},50);}

function renderIcraCards(){
  const l=state.icra,aktif=l.filter(i=>i.durum!=='Kapandı').length;
  const tA=l.reduce((s,i)=>s+(i.alacak||0),0),tT=l.reduce((s,i)=>s+(i.tahsil||0),0);
  document.getElementById('icra-cards').innerHTML=`<div class="card"><div class="card-label">Toplam</div><div class="card-value gold">${l.length}</div></div><div class="card"><div class="card-label">Aktif Takip</div><div class="card-value red">${aktif}</div></div><div class="card"><div class="card-label">Toplam Alacak</div><div class="card-value red">${fmt(tA)}</div></div><div class="card"><div class="card-label">Tahsil Edilen</div><div class="card-value green">${fmt(tT)}</div></div><div class="card"><div class="card-label">Kalan</div><div class="card-value red">${fmt(tA-tT)}</div></div>`;
}
function filterIcra(){renderIcra(document.getElementById('icra-s').value,document.getElementById('icra-ft').value,document.getElementById('icra-fd').value);}
function renderIcra(s='',ft='',fd=''){
  const tb=document.getElementById('icra-tbody'),em=document.getElementById('icra-empty');
  let list=state.icra;
  if(s)list=list.filter(i=>i.no.toLowerCase().includes(s.toLowerCase())||i.borclu.toLowerCase().includes(s.toLowerCase())||getMuvAd(i.muvId).toLowerCase().includes(s.toLowerCase()));
  if(ft)list=list.filter(i=>i.tur===ft);if(fd)list=list.filter(i=>i.durum===fd);
  // Update icra th active states
  ['sira','no','muvId','borclu','tur','alacak','tahsil','durum','tarih'].forEach(k=>{
    const th=document.getElementById('icra-th-'+k);if(!th)return;
    const ss=sortState.icra;
    const labels={sira:'#',no:'Dosya No',muvId:'Müvekkil',borclu:'Borçlu',tur:'Tür',alacak:'Toplam Alacak',tahsil:'Tahsil',durum:'Durum',tarih:'Tarih'};
    th.className='sort-th'+(ss.key===k?' '+(ss.dir===1?'asc':'desc'):'');
    th.innerHTML=labels[k]+' '+(ss.key===k?(ss.dir===1?'▲':'▼'):'⇅');
  });
  tb.innerHTML='';
  if(!list.length){em.style.display='block';return;}em.style.display='none';
  sortArr(list,'icra').forEach(i=>{
    const kalan=(i.alacak||0)-(i.tahsil||0),oran=i.alacak>0?Math.round((i.tahsil/i.alacak)*100):0;
    tb.innerHTML+=`<tr onclick="openIcraDetay('${i.id}')" style="cursor:pointer">
      <td style="text-align:center;font-weight:700;color:var(--text-muted);font-size:11px">${i.sira||'?'}</td>
      <td><strong style="color:var(--gold)">${i.no}</strong></td>
      <td><span style="color:var(--gold-light)">${getMuvAd(i.muvId)}</span></td>
      <td><strong>${i.borclu}</strong>${i.btc?`<div style="font-size:10px;color:var(--text-dim)">${i.btc}</div>`:''}</td>
      <td style="font-size:11px">${[i.il,i.adliye,i.daire].filter(Boolean).join(' — ')}</td>
      <td style="font-size:11px;color:var(--text-muted)">${i.tur}</td>
      <td><strong>${fmt(i.alacak)}</strong></td>
      <td><span style="color:var(--green)">${fmt(i.tahsil)}</span><div class="progress-bar"><div class="progress-fill" style="width:${oran}%"></div></div><div style="font-size:9px;color:var(--text-dim)">%${oran}</div></td>
      <td style="color:${IDRENK[i.durum]||'var(--text-muted)'};font-size:11px;font-weight:600">${i.durum}</td>
      <td>${fmtD(i.tarih)}</td>
      <td>${i.davno?`<span style="color:var(--blue);font-size:11px">📁 ${i.davno}</span>`:'—'}</td>
      <td><button class="ctx-btn" onclick="event.stopPropagation();CtxMenu.icraMenu(event,'${i.id}')">⋮</button></td>
    </tr>`;
  });
}

// ================================================================
// İCRA DETAY
// ================================================================
function openIcraDetay(icraId){
  aktivIcraId=icraId;aktivDavaId=null;
  const i=getIcra(icraId);if(!i)return;
  ensureArrays(i,['evraklar','notlar','harcamalar','tahsilatlar']);if(!i.anlasma)i.anlasma={};
  document.getElementById('id-bc').textContent=i.no;
  document.getElementById('id-baslik').textContent=`${i.no} — ${i.borclu}`;
  document.getElementById('id-meta').innerHTML=`${getMuvAd(i.muvId)} · ${[i.il,i.adliye,i.daire].filter(Boolean).join(' ')} · ${i.tur}`;
  document.getElementById('id-edit-btn').onclick=()=>notify('Düzenleme yakında');
  renderIdCards(i);
  document.querySelectorAll('#page-icra-detay .tab').forEach((t,idx)=>t.classList.toggle('active',idx===0));
  document.querySelectorAll('#page-icra-detay .tab-panel').forEach((p,idx)=>p.classList.toggle('active',idx===0));
  renderIcraTabContent('evraklar');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-icra-detay').classList.add('active');
}
function renderIdCards(i){
  const harcToplam=(i.harcamalar||[]).reduce((s,h)=>s+h.tutar,0);
  const kalan=(i.alacak||0)-(i.tahsil||0);
  const thList=i.tahsilatlar||[];
  const topTahsil=thList.filter(t=>t.tur==='tahsilat').reduce((s,t)=>s+t.tutar,0);
  const topAktarim=thList.filter(t=>t.tur==='aktarim').reduce((s,t)=>s+t.tutar,0);
  document.getElementById('id-cards').innerHTML=`
    <div class="card"><div class="card-label">Toplam Alacak</div><div class="card-value red">${fmt(i.alacak)}</div></div>
    <div class="card"><div class="card-label">Tahsil Edilen</div><div class="card-value green">${fmt(i.tahsil)}</div></div>
    <div class="card"><div class="card-label">Kalan</div><div class="card-value red">${fmt(kalan)}</div></div>
    <div class="card"><div class="card-label">Dosya Harcaması</div><div class="card-value" style="color:#e74c3c">${fmt(harcToplam)}</div></div>
    ${topTahsil>0?`<div class="card"><div class="card-label">Avukatlık Tahsilatı</div><div class="card-value green">${fmt(topTahsil)}</div></div>`:''}
    ${topAktarim>0?`<div class="card"><div class="card-label">Müvekkile Aktarım</div><div class="card-value" style="color:var(--blue)">${fmt(topAktarim)}</div></div>`:''}
    <div class="card"><div class="card-label">Durum</div><div class="card-value" style="font-size:14px;color:${IDRENK[i.durum]||'var(--text-muted)'}">${i.durum}</div></div>`;
}
function renderIcraTabContent(t){
  const i=getIcra(aktivIcraId);if(!i)return;
  ensureArrays(i,['evraklar','notlar','harcamalar']);
  if(t==='evraklar'){
    const kats=['Ödeme Emri','İcra Emri','Haciz Tutanağı','İtiraz Dilekçesi','İtirazın Kaldırılması Talebi','Satış Talebi','Satış İlanı','Kıymet Takdir Raporu','Diğer'];
    document.getElementById('it-evraklar-content').innerHTML=renderEvrakTab(i,'icra-evrak',kats,'📎 İcra Evrakları','Ödeme Emri','icra');
  } else if(t==='harcamalar'){
    document.getElementById('it-harcamalar-content').innerHTML=renderHarcTab('icra',i);
  } else if(t==='notlar'){
    document.getElementById('it-notlar-content').innerHTML=renderNotTab('icra',i);
  } else if(t==='anlasma'){
    document.getElementById('it-anlasma-content').innerHTML=renderAnlasmaTab('icra',i);
  } else if(t==='tahsilat'){
    document.getElementById('it-tahsilat-content').innerHTML=renderTahsilatTab('icra',i);
  } else if(t==='tahsilat'){
    document.getElementById('it-tahsilat-content').innerHTML=renderTahsilatTab('icra',i);
  }
}

// ================================================================
// BÜTÇE / FİNANS
// ================================================================

// KDV hesaplama
document.addEventListener('DOMContentLoaded', function() {
  const bTutar = document.getElementById('b-tutar');
  const bKdvOran = document.getElementById('b-kdv-oran');
  if (bTutar) bTutar.addEventListener('input', butceKdvHesapla);
  if (bKdvOran) bKdvOran.addEventListener('change', butceKdvHesapla);
});

function openButceModal() {
  const sel = document.getElementById('b-muv');
  sel.innerHTML = '<option value="">—</option>';
  state.muvekkillar.forEach(m => sel.innerHTML += `<option value="${m.id}">${m.ad}</option>`);
  document.getElementById('b-tarih').value = today();
  document.getElementById('b-kdv-oran').value = '0';
  document.getElementById('b-kdv-tutar').value = '';
  document.getElementById('b-kdv-toplam-satir').style.display = 'none';
  openModal('but-modal');
}

function butceKdvHesapla() {
  const tutar = parseFloat(document.getElementById('b-tutar').value) || 0;
  const oran = parseFloat(document.getElementById('b-kdv-oran').value) || 0;
  const kdv = tutar * oran / 100;
  document.getElementById('b-kdv-tutar').value = kdv > 0 ? kdv.toFixed(2) : '';
  const satirEl = document.getElementById('b-kdv-toplam-satir');
  if (oran > 0 && tutar > 0) {
    satirEl.style.display = 'block';
    document.getElementById('b-kdv-toplam').textContent = fmt(tutar + kdv);
  } else {
    satirEl.style.display = 'none';
  }
}

function saveButce() {
  const tutar = parseFloat(document.getElementById('b-tutar').value);
  const tarih = document.getElementById('b-tarih').value;
  if (!zorunluKontrol([{id:'b-tarih',deger:tarih,label:'Tarih'},{id:'b-tutar',deger:(!isNaN(tutar)&&tutar>0)?'ok':'',label:'Tutar'}])) { notify('⚠️ Zorunlu alanları doldurun.'); return; }
  const kdvOran = parseFloat(document.getElementById('b-kdv-oran').value) || 0;
  const kdvTutar = tutar * kdvOran / 100;
  const _butKayit = {
    id: uid(), tur: document.getElementById('b-tur').value, tarih, tutar,
    kat: document.getElementById('b-kat').value,
    muvId: document.getElementById('b-muv').value,
    acik: document.getElementById('b-acik').value.trim(),
    kdvOran, kdvTutar
  };
  state.butce.push(_butKayit);
  if (currentBuroId) saveToSupabase('finans', _butKayit);
  ['b-tutar','b-acik'].forEach(i => document.getElementById(i).value = '');
  document.getElementById('b-kdv-oran').value = '0';
  document.getElementById('b-kdv-tutar').value = '';
  document.getElementById('b-kdv-toplam-satir').style.display = 'none';
  closeModal('but-modal'); saveData(); renderButce(); notify('✓ Hareket eklendi');
  addAktiviteLog('Finans Hareketi Eklendi', _butKayit.tur + ' — ' + fmt(tutar), 'Finans');
}

function filterButce(ft) { renderButce(); }
function filterButceKat(ft) { renderButce(); }

function finansTab(tab, el) {
  ['hareketler','muvekkil','faturalar','rapor'].forEach(t => {
    document.getElementById('finans-tab-' + t).style.display = t === tab ? '' : 'none';
    document.getElementById('ft-' + t).classList.toggle('active', t === tab);
  });
  if (tab === 'muvekkil') renderMuvekkilBakiye();
  if (tab === 'faturalar') renderFaturaListe();
  if (tab === 'rapor') renderFinansRapor();
}