// ================================================================
// EMD HUKUK — DAVA TAKIP
// js/modules/davalar.js
// ================================================================

function saveDava(){
  const no=document.getElementById('d-no').value.trim(),konu=document.getElementById('d-konu').value.trim(),muvId=document.getElementById('d-muv').value;
  const derdest=document.getElementById('d-derdest').value;
  if(derdest==='kesinlesti'&&!document.getElementById('d-kesin-tarih').value){notify('⚠️ Kesinleşme tarihi zorunlu');return;}
  if(!zorunluKontrol([
    {id:'d-no', deger:no, label:'Dosya No'},
    {id:'d-konu', deger:konu, label:'Konu'},
    {id:'d-muv', deger:muvId, label:'Müvekkil'},
  ])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  if(!limitKontrol('dava')) return;
  // Otomatik numara — boşsa ata
  if(!no) { const autoN=autoNo('dava'); document.getElementById('d-no').value=autoN; } // ← Plan limit kontrolü
  const yeniDava={
    id:uid(),sira:nextSira('davalar'),no,konu,muvId,
    il:document.getElementById('d-il').value,adliye:document.getElementById('d-adliye').value,mtur:document.getElementById('d-mtur').value,
    mno:document.getElementById('d-mno').value.trim(),
    esasYil:document.getElementById('d-esas-yil').value.trim(),esasNo:document.getElementById('d-esas-no').value.trim(),
    kararYil:document.getElementById('d-karar-yil').value.trim(),kararNo:document.getElementById('d-karar-no').value.trim(),
    hakim:document.getElementById('d-hakim').value.trim(),
    asama:document.getElementById('d-asama').value,durum:document.getElementById('d-durum').value,
    derdest:document.getElementById('d-derdest').value,taraf:document.getElementById('d-taraf').value,
    tarih:document.getElementById('d-tarih').value,durusma:document.getElementById('d-durusma').value,
    ktarih:document.getElementById('d-ktarih').value,kesin:document.getElementById('d-kesin').value,
    icrano:document.getElementById('d-icrano').value.trim(),
    karsiId:document.getElementById('d-karsi-id').value,karsi:getKTAd(document.getElementById('d-karsi-id').value),
    karsavId:document.getElementById('d-karsav-id').value,karsav:getVekAd(document.getElementById('d-karsav-id').value),
    deger:parseFloat(document.getElementById('d-deger').value)||0,
    not:document.getElementById('d-not').value.trim(),
    evraklar:[],notlar:[],harcamalar:[],anlasma:{}
  };
  // ── Mükerrer dava kontrolü ──
  if (typeof MukerrerKontrol !== 'undefined') {
    const mukKontrol = MukerrerKontrol.davaKontrol(yeniDava);
    if (mukKontrol.length > 0) {
      MukerrerKontrol.uyariGoster('dava', yeniDava.no + ' — ' + yeniDava.konu, mukKontrol, function() { _saveDavaDevam(yeniDava); });
      return;
    }
  }
  _saveDavaDevam(yeniDava);
}
function _saveDavaDevam(yeniDava) {
  state.davalar.push(yeniDava);
  ['d-no','d-konu','d-mno','d-esas-yil','d-esas-no','d-karar-yil','d-karar-no','d-hakim','d-derdest','d-icrano','d-deger','d-not','d-durusma','d-ktarih','d-kesin','d-muv','d-muv-ara'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='';});
  const muvGoster=document.getElementById('d-muv-secili');if(muvGoster){muvGoster.style.display='none';muvGoster.innerHTML='';}; document.getElementById('d-il').value=''; document.getElementById('d-adliye').innerHTML='<option value="">— Önce il seçin —</option>';
  ktWidgetTemizle('d-karsi-ara','d-karsi-liste','d-karsi-id','d-karsi-goster');
  ktWidgetTemizle('d-karsav-ara','d-karsav-liste','d-karsav-id','d-karsav-goster');
  addLog(yeniDava.muvId,'Dava Eklendi',`${yeniDava.no} | ${yeniDava.konu}${yeniDava.mtur?' | '+yeniDava.mtur:''}`);
  if(currentBuroId) saveToSupabase('davalar', {id:yeniDava.id, muvId:yeniDava.muvId, davaNo:yeniDava.no, konu:yeniDava.konu, mahkeme:yeniDava.adliye, tur:yeniDava.mtur, durum:yeniDava.durum, tarih:yeniDava.tarih||null, notlar:yeniDava.not});
  closeModal('dav-modal');saveData();renderDavalar();renderDavaCards();renderMdDavalar();updateBadges();notify('✓ Dava eklendi');
}

async function deleteDavaById(id){
  const onay = await silmeOnay('Dava', 'Bu davayı kalıcı olarak silmek istediğinize emin misiniz?');
  if(!onay) return;
  const d=getDava(id);
  if(d)addLog(d.muvId,'Dava Silindi',`${d.no} | ${d.konu}`);
  state.davalar=state.davalar.filter(d=>d.id!==id);
  if(currentBuroId) deleteFromSupabase('davalar', id);
  saveData();renderDavalar();renderDavaCards();renderMdDavalar();updateBadges();notify('Dava silindi');
}

function openDavModalForMuv(){openModal('dav-modal');setTimeout(()=>{const e=document.getElementById('d-muv');if(aktivMuvId)e.value=aktivMuvId;},50);}

function renderDavaCards(){
  const t=state.davalar.length,a=state.davalar.filter(d=>d.durum==='Aktif').length;
  const is=state.davalar.filter(d=>d.asama==='İstinaf').length,yr=state.davalar.filter(d=>d.asama==='Yargıtay').length,ks=state.davalar.filter(d=>d.asama==='Kesinleşti').length;
  document.getElementById('dav-cards').innerHTML=`<div class="card"><div class="card-label">Toplam</div><div class="card-value gold">${t}</div></div><div class="card"><div class="card-label">Aktif</div><div class="card-value green">${a}</div></div><div class="card"><div class="card-label">İstinaf</div><div class="card-value" style="color:#8e44ad">${is}</div></div><div class="card"><div class="card-label">Yargıtay</div><div class="card-value" style="color:#6c3483">${yr}</div></div><div class="card"><div class="card-label">Kesinleşmiş</div><div class="card-value" style="color:var(--text-muted)">${ks}</div></div>`;
}

function filterDavalar(){
  const s=document.getElementById('dav-s').value,k=document.getElementById('dav-fk').value,a=document.getElementById('dav-fa').value,d=document.getElementById('dav-fd').value;
  renderDavalar(s,k,a,d);
}

function renderDavalar(search='',fk='',fa='',fd=''){
  const em=document.getElementById('dav-empty'),cont=document.getElementById('dav-grouped');
  let list=state.davalar;
  if(search)list=list.filter(d=>d.no.toLowerCase().includes(search.toLowerCase())||d.konu.toLowerCase().includes(search.toLowerCase())||getMuvAd(d.muvId).toLowerCase().includes(search.toLowerCase()));
  if(fk)list=list.filter(d=>d.mtur===fk);if(fa)list=list.filter(d=>d.asama===fa);if(fd)list=list.filter(d=>d.durum===fd);
  if(!list.length){cont.innerHTML='';em.style.display='block';return;}em.style.display='none';
  list=sortArr(list,'dav');
  const groups={};list.forEach(d=>{const k=d.mtur||'Diğer';if(!groups[k])groups[k]=[];groups[k].push(d);});
  cont.innerHTML=Object.entries(groups).map(([tur,davalar])=>{
    const renk=MRENK[tur]||'#566573';
    const rows=davalar.map(d=>{
      const bc=d.durum==='Aktif'?'aktif':d.durum==='Beklemede'?'beklemede':'kapali';
      return`<tr class="dava-row" onclick="openDavaDetay('${d.id}')" style="cursor:pointer">
        <td style="text-align:center;font-weight:700;color:var(--text-muted);font-size:11px">${d.sira||'?'}</td>
        <td><strong style="color:var(--gold)">${d.no}</strong>${(d.esasYil||d.esasNo)?`<div style="font-size:10px;color:var(--text-dim)">Esas: ${d.esasYil||''}/${d.esasNo||''}</div>`:''}</td>
        <td><span style="color:var(--gold-light);cursor:pointer">${getMuvAd(d.muvId)}</span></td>
        <td>${d.konu}${d.karsi?`<div style="font-size:10px;color:var(--text-dim)">Karşı: ${d.karsi}</div>`:''}</td>
        <td style="font-size:11px">${[d.il,d.mno].filter(Boolean).join(' ')}</td>
        <td style="color:${ARENK[d.asama]||'var(--text-muted)'};font-size:11px;font-weight:600">${d.asama||'—'}</td>
        <td><span class="badge badge-${bc}">${d.durum}</span></td>
        <td>${d.taraf||'—'}</td><td>${fmtD(d.durusma)}</td>
        <td>${d.icrano?`<span style="color:var(--gold);font-size:11px">⚡ ${d.icrano}</span>`:'—'}</td>
        <td><button class="ctx-btn" onclick="event.stopPropagation();CtxMenu.davaMenu(event,'${d.id}')">⋮</button></td>
      </tr>`;
    }).join('');
    return`<div class="section" style="margin-bottom:14px"><div class="section-header" style="border-left:3px solid ${renk}">
      <div style="display:flex;align-items:center;gap:8px"><div class="section-title">${tur}</div><span style="background:${renk}22;color:${renk};border-radius:8px;font-size:10px;font-weight:700;padding:1px 7px">${davalar.length}</span></div>
    </div><div style="overflow-x:auto"><table style="min-width:860px"><thead><tr>
  <th class="sort-th" onclick="toggleSort('dav','sira')" style="width:50px"># `+shIcon('dav','sira')+`</th>
  <th class="sort-th" onclick="toggleSort('dav','no')">Dosya No `+shIcon('dav','no')+`</th>
  <th class="sort-th" onclick="toggleSort('dav','muvId')">Müvekkil `+shIcon('dav','muvId')+`</th>
  <th class="sort-th" onclick="toggleSort('dav','konu')">Konu `+shIcon('dav','konu')+`</th>
  <th>Mahkeme</th>
  <th class="sort-th" onclick="toggleSort('dav','asama')">Aşama `+shIcon('dav','asama')+`</th>
  <th class="sort-th" onclick="toggleSort('dav','durum')">Durum `+shIcon('dav','durum')+`</th>
  <th class="sort-th" onclick="toggleSort('dav','taraf')">Taraf `+shIcon('dav','taraf')+`</th>
  <th class="sort-th" onclick="toggleSort('dav','durusma')">Son Duruşma `+shIcon('dav','durusma')+`</th>
  <th>İcra</th><th></th>
</tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }).join('');
}

// ================================================================
// DAVA DETAY
// ================================================================
function openDavaDetay(davaId){
  aktivDavaId=davaId;aktivIcraId=null;
  const d=getDava(davaId);if(!d)return;
  ensureArrays(d,['evraklar','notlar','harcamalar','tahsilatlar']);if(!d.anlasma)d.anlasma={};
  document.getElementById('dd-bc').textContent=d.no;
  document.getElementById('dd-baslik').textContent=`${d.no} — ${d.konu}`;
  const mahkeme=[d.il,d.adliye,d.mtur,d.mno].filter(Boolean).join(' · ');
  const esasStr=(d.esasYil||d.esasNo)?(d.esasYil||'')+'/'+(d.esasNo||''):'';
  const kararStr=(d.kararYil||d.kararNo)?(d.kararYil||'')+'/'+(d.kararNo||''):'';
  const esasKarar=[esasStr?'Esas: '+esasStr:'',kararStr?'Karar: '+kararStr:''].filter(Boolean).join(' · ');
  const karsiAd=d.karsiId?getKTAd(d.karsiId):(d.karsi||'—');
  const karsavAd=d.karsavId?getVekAd(d.karsavId):(d.karsav||'');
  document.getElementById('dd-meta').innerHTML=`${getMuvAd(d.muvId)} · ${mahkeme} · ${d.asama||''} · Karşı: ${karsiAd}${karsavAd?' | Vekil: '+karsavAd:''}${esasKarar?' · '+esasKarar:''}`;
  document.getElementById('dd-edit-btn').onclick=()=>editDavaModal(davaId);
  renderDdCards(d);
  document.querySelectorAll('#page-dava-detay .tab').forEach((t,i)=>t.classList.toggle('active',i===0));
  document.querySelectorAll('#page-dava-detay .tab-panel').forEach((p,i)=>p.classList.toggle('active',i===0));
  renderDavaTabContent('dilekce');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-dava-detay').classList.add('active');
}
function renderDdCards(d){
  const harcToplam=(d.harcamalar||[]).reduce((s,h)=>s+h.tutar,0);
  const evrakSay=(d.evraklar||[]).length;
  const thList=d.tahsilatlar||[];
  const topTahsil=thList.filter(t=>t.tur==='tahsilat').reduce((s,t)=>s+t.tutar,0);
  const topAktarim=thList.filter(t=>t.tur==='aktarim').reduce((s,t)=>s+t.tutar,0);
  document.getElementById('dd-cards').innerHTML=`
    <div class="card"><div class="card-label">Aşama</div><div class="card-value" style="font-size:16px;color:${ARENK[d.asama]||'var(--text-muted)'}">${d.asama||'—'}</div></div>
    <div class="card"><div class="card-label">Durum</div><div class="card-value" style="font-size:16px">${d.durum}</div></div>
    <div class="card"><div class="card-label">Toplam Harcama</div><div class="card-value red">${fmt(harcToplam)}</div></div>
    <div class="card"><div class="card-label">Evrak</div><div class="card-value gold">${evrakSay}</div></div>
    ${topTahsil>0?`<div class="card"><div class="card-label">Tahsilat</div><div class="card-value green">${fmt(topTahsil)}</div></div>`:''}
    ${topAktarim>0?`<div class="card"><div class="card-label">Müvekkile Aktarım</div><div class="card-value" style="color:var(--blue)">${fmt(topAktarim)}</div></div>`:''}`;
}

function renderDavaTabContent(t){
  const d=getDava(aktivDavaId);if(!d)return;
  ensureArrays(d,['evraklar','notlar','harcamalar']);
  if(t==='dilekce'){
    const kats=['Dava Dilekçesi','Cevap Dilekçesi','Cevaba Cevap Dilekçesi','İkinci Cevap Dilekçesi','İstinaf Dilekçesi','Temyiz Dilekçesi','Diğer Dilekçe'];
    document.getElementById('dt-dilekce-content').innerHTML=renderEvrakTab(d,'dilekce',kats,'📝 Dilekçeler','Dava Dilekçesi');
  } else if(t==='bilirkisi'){
    const kats=['Bilirkişi Raporu','Bilirkişi Raporuna İtiraz Dilekçesi','Ek Bilirkişi Raporu Talebi','Bilirkişi Beyanı','Diğer'];
    document.getElementById('dt-bilirkisi-content').innerHTML=renderEvrakTab(d,'bilirkisi',kats,'🔬 Bilirkişi Evrakları','Bilirkişi Raporu');
  } else if(t==='zaplar'){
    const kats=['Duruşma Zaptı','Tensip Zaptı','Keşif Tutanağı','Ara Karar','Diğer'];
    document.getElementById('dt-zaplar-content').innerHTML=renderEvrakTabZap(d,kats);
  } else if(t==='harcamalar'){
    document.getElementById('dt-harcamalar-content').innerHTML=renderHarcTab('dava',d);
  } else if(t==='notlar'){
    document.getElementById('dt-notlar-content').innerHTML=renderNotTab('dava',d);
  } else if(t==='anlasma'){
    document.getElementById('dt-anlasma-content').innerHTML=renderAnlasmaTab('dava',d);
  } else if(t==='tahsilat'){
    document.getElementById('dt-tahsilat-content').innerHTML=renderTahsilatTab('dava',d);
  } else if(t==='tahsilat'){
    document.getElementById('dt-tahsilat-content').innerHTML=renderTahsilatTab('dava',d);
  }
  // re-attach event listeners after innerHTML set
  attachEvrakUpload();
}

function renderEvrakTab(obj,sekme,kats,baslik,defaultKat,forceType){
  const list=(obj.evraklar||[]).filter(e=>e.sekme===sekme);
  const grouped={};kats.forEach(k=>{grouped[k]=list.filter(e=>e.kat===k);});
  const ftParam=forceType?`,'${forceType}'`:'';
  let html=`<div class="section"><div class="section-header"><div class="section-title">${baslik}</div>
    <button class="btn btn-gold btn-sm" onclick="openEvrakModal('${sekme}','${defaultKat}'${ftParam})">+ Evrak Yükle</button></div>
    <div class="section-body">`;
  kats.forEach(k=>{
    const items=grouped[k]||[];
    html+=`<div style="margin-bottom:14px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:7px"><div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">${k}</div><span style="font-size:10px;color:var(--text-dim);background:var(--surface2);border-radius:8px;padding:1px 6px">${items.length}</span></div>`;
    if(!items.length)html+=`<div style="font-size:11px;color:var(--text-dim);padding:4px 0 8px">Henüz evrak yüklenmedi</div>`;
    else items.forEach(e=>{html+=renderEvrakItem(e,forceType||'dava');});
    html+='</div>';
  });
  html+='</div></div>';
  return html;
}

function renderEvrakTabZap(obj,kats){
  const list=(obj.evraklar||[]).filter(e=>e.sekme==='zaplar');
  const sorted=[...list].sort((a,b)=>(a.tarih||'').localeCompare(b.tarih||''));
  let html=`<div class="section"><div class="section-header"><div class="section-title">🎙 Duruşma Zaptları & Tutanaklar</div>
    <button class="btn btn-gold btn-sm" onclick="openEvrakModal('zaplar','Duruşma Zaptı')">+ Zap / Tutanak Yükle</button></div>
    <div class="section-body">`;
  if(!sorted.length)html+=`<div class="empty"><div class="empty-icon">🎙</div><p>Henüz duruşma zaptı yüklenmedi</p></div>`;
  else{
    html+=`<table><thead><tr><th>Duruşma / İşlem Tarihi</th><th>Tür</th><th>Dosya</th><th>Açıklama</th><th>Boyut</th><th></th></tr></thead><tbody>`;
    sorted.forEach(e=>{
      html+=`<tr>
        <td><strong style="color:var(--gold)">${fmtD(e.tarih)||'—'}</strong></td>
        <td><span class="badge badge-durusma">${e.kat}</span></td>
        <td>${fileIcon(e.ad)} <span style="font-size:11px">${e.ad}</span></td>
        <td style="font-size:11px;color:var(--text-muted)">${e.acik||'—'}</td>
        <td style="font-size:10px;color:var(--text-dim)">${fileSize(e.data)}</td>
        <td><div style="display:flex;gap:4px">
          <button class="btn btn-outline btn-sm" onclick="dlEvrak('${e.id}','dava')">⬇</button>
          <button class="delete-btn" onclick="delEvrak('${e.id}','dava')">✕</button>
        </div></td>
      </tr>`;
    });
    html+='</tbody></table>';
  }
  html+='</div></div>';return html;
}

function renderEvrakItem(e,ctx){
  return`<div class="file-item"><div class="file-icon">${fileIcon(e.ad)}</div><div class="file-info"><div class="file-name">${e.ad}</div><div class="file-meta">${e.tarih?fmtD(e.tarih)+' · ':''} ${fileSize(e.data)}${e.acik?' · '+e.acik:''}</div></div><div class="file-actions"><button class="btn btn-outline btn-sm" onclick="dlEvrak('${e.id}','${ctx}')">⬇</button><button class="delete-btn" onclick="delEvrak('${e.id}','${ctx}')">✕</button></div></div>`;
}

function renderHarcTab(ctx,obj){
  const hlist=(obj.harcamalar||[]).sort((a,b)=>b.tarih.localeCompare(a.tarih));
  let html=`<div class="section"><div class="section-header"><div class="section-title">💸 Dosya Harcamaları</div>
    <button class="btn btn-gold btn-sm" onclick="openHarcForDosya('${ctx}')">+ Harcama Ekle</button></div>
    <div class="section-body" style="padding:0">
    <table><thead><tr><th>Tarih</th><th>Kategori</th><th>Açıklama</th><th>Tutar</th><th></th></tr></thead><tbody>`;
  if(!hlist.length)html+=`<tr><td colspan="5"><div class="empty"><div class="empty-icon">💸</div><p>Harcama yok</p></div></td></tr>`;
  else hlist.forEach(h=>{html+=`<tr><td>${fmtD(h.tarih)}</td><td>${h.kat||'—'}</td><td>${h.acik||'—'}</td><td style="color:#e74c3c;font-weight:600">${fmt(h.tutar)}</td><td><button class="delete-btn" onclick="delHarcDosya('${h.id}','${ctx}')">✕</button></td></tr>`;});
  const toplam=hlist.reduce((s,h)=>s+h.tutar,0);
  html+=`</tbody></table></div><div style="padding:10px 16px;border-top:1px solid var(--border);text-align:right;font-size:12px;color:var(--text-muted)">Toplam: <strong style="color:#e74c3c">${fmt(toplam)}</strong></div></div>`;
  return html;
}

function renderNotTab(ctx,obj){ return ''; /* yeni versiyon yukarıdaki script bloğunda */ }

// renderAnlasmaTab — yeni versiyon yukarıdaki script bloğunda tanımlandı


// Evrak helpers
let evrakCtx={}; // {type:'dava'|'icra', sekme, kat}
function openEvrakModal(sekme,defaultKat,forceType){
  evrakCtx={type:forceType||(aktivDavaId?'dava':'icra'),sekme};evFileData=[];
  document.getElementById('ev-title').textContent='Evrak Yükle — '+sekme;
  document.getElementById('ev-file-lbl').textContent='Tıklayın veya sürükleyin';
  document.getElementById('ev-file').value='';
  ['ev-ad','ev-acik'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('ev-tarih').value=today();
  const sel=document.getElementById('ev-kat');
  sel.innerHTML='';
  let kats=[];
  if(sekme==='dilekce')kats=['Dava Dilekçesi','Cevap Dilekçesi','Cevaba Cevap Dilekçesi','İkinci Cevap Dilekçesi','İstinaf Dilekçesi','Temyiz Dilekçesi','Diğer Dilekçe'];
  else if(sekme==='bilirkisi')kats=['Bilirkişi Raporu','Bilirkişi Raporuna İtiraz Dilekçesi','Ek Bilirkişi Raporu Talebi','Bilirkişi Beyanı','Diğer'];
  else if(sekme==='zaplar')kats=['Duruşma Zaptı','Tensip Zaptı','Keşif Tutanağı','Ara Karar','Diğer'];
  else if(sekme==='icra-evrak')kats=['Ödeme Emri','İcra Emri','Haciz Tutanağı','İtiraz Dilekçesi','İtirazın Kaldırılması Talebi','Satış Talebi','Satış İlanı','Kıymet Takdir Raporu','Diğer'];
  else kats=['Genel Evrak','Diğer'];
  kats.forEach(k=>{sel.innerHTML+=`<option value="${k}" ${k===defaultKat?'selected':''}>${k}</option>`;});
  document.getElementById('evrak-modal').classList.add('open');
}
function evFileSelected(ev){
  evFileData=[];
  const files=Array.from(ev.target.files);
  if(!files.length)return;
  document.getElementById('ev-file-lbl').textContent=`📎 ${files.length} dosya seçildi`;
  if(!document.getElementById('ev-ad').value&&files.length===1)document.getElementById('ev-ad').value=files[0].name;
  let loaded=0;
  files.forEach(f=>{
    const r=new FileReader();
    r.onload=e=>{evFileData.push({ad:f.name,tip:f.type,data:e.target.result});loaded++;};
    r.readAsDataURL(f);
  });
}
function saveEvrak(){
  if(!evFileData.length){notify('Dosya seçin!');return;}
  const obj=evrakCtx.type==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;
  if(!obj.evraklar)obj.evraklar=[];
  const kat=document.getElementById('ev-kat').value;
  const tarih=document.getElementById('ev-tarih').value;
  const acik=document.getElementById('ev-acik').value.trim();
  evFileData.forEach(f=>{
    obj.evraklar.push({id:uid(),ad:f.ad||document.getElementById('ev-ad').value.trim()||f.ad,tip:f.tip,data:f.data,kat,sekme:evrakCtx.sekme,tarih,acik});
  });
  closeModal('evrak-modal');saveData();
  if(evrakCtx.type==='dava'){renderDavaTabContent(evrakCtx.sekme);renderDdCards(getDava(aktivDavaId));}
  else{renderIcraTabContent(evrakCtx.sekme==='evraklar'?'evraklar':evrakCtx.sekme);renderIdCards(getIcra(aktivIcraId));}
  notify(`✓ ${evFileData.length} evrak yüklendi`);evFileData=[];
}
function attachEvrakUpload(){/* events inline in HTML, nothing needed */}
function dlEvrak(id,ctx){
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  const e=(obj?.evraklar||[]).find(x=>x.id===id);if(!e)return;
  const a=document.createElement('a');a.href=e.data;a.download=e.ad;a.click();
}
function delEvrak(id,ctx){
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;obj.evraklar=(obj.evraklar||[]).filter(e=>e.id!==id);
  saveData();
  if(ctx==='dava'){const t=document.querySelector('#page-dava-detay .tab.active');if(t)t.click();}
  else{const t=document.querySelector('#page-icra-detay .tab.active');if(t)t.click();}
  notify('Evrak silindi');
}

// Harcama helpers
function openHarcForDosya(ctx){
  aktifSekme=ctx;
  const titles={dava:'Harcama Ekle — Dava Dosyası',icra:'Harcama Ekle — İcra Dosyası',muv:'Harcama Ekle'};
  document.getElementById('harc-modal-title').textContent=titles[ctx]||'Harcama Ekle';
  document.getElementById('h-tarih').value=today();
  document.getElementById('h-tutar').value='';
  document.getElementById('h-acik').value='';
  // Müvekkil sayfasından açılıyorsa dosya seçim dropdown'unu göster
  const dosyaGroup=document.getElementById('h-dosya-group');
  const dosyaSel=document.getElementById('h-dosya-sel');
  if(ctx==='muv' && aktivMuvId){
    dosyaGroup.style.display='block';
    dosyaSel.innerHTML='<option value="">— Dosya seçin (opsiyonel) —</option>';
    state.davalar.filter(d=>d.muvId===aktivMuvId).forEach(d=>{
      dosyaSel.innerHTML+=`<option value="dava:${d.id}">📁 ${d.no} — ${d.konu}${d.mtur?' ('+d.mtur+')':''}</option>`;
    });
    state.icra.filter(i=>i.muvId===aktivMuvId).forEach(i=>{
      dosyaSel.innerHTML+=`<option value="icra:${i.id}">⚡ ${i.no} — ${i.borclu}</option>`;
    });
  } else {
    dosyaGroup.style.display='none';
    dosyaSel.innerHTML='';
  }
  document.getElementById('harc-modal').classList.add('open');
}
function saveHarcama(){
  const tutar=parseFloat(document.getElementById('h-tutar').value);
  const tarih=document.getElementById('h-tarih').value;
  if(!zorunluKontrol([{id:'h-tarih',deger:tarih,label:'Tarih'},{id:'h-tutar',deger:(!isNaN(tutar)&&tutar>0)?'ok':'',label:'Tutar'}])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  const acik=document.getElementById('h-acik').value.trim();
  const kat=document.getElementById('h-kat').value;
  const h={id:uid(),tarih,tutar,kat,acik};
  document.getElementById('h-tutar').value='';
  document.getElementById('h-acik').value='';
  closeModal('harc-modal');

  if(aktifSekme==='dava'){
    const d=getDava(aktivDavaId);
    if(d){if(!d.harcamalar)d.harcamalar=[];d.harcamalar.push(h);saveData();renderDavaTabContent('harcamalar');renderDdCards(d);}
  } else if(aktifSekme==='icra'){
    const i=getIcra(aktivIcraId);
    if(i){if(!i.harcamalar)i.harcamalar=[];i.harcamalar.push(h);saveData();renderIcraTabContent('harcamalar');renderIdCards(i);}
  } else if(aktifSekme==='muv'){
    const secim=document.getElementById('h-dosya-sel').value; // 'dava:ID' veya 'icra:ID' veya ''
    if(secim){
      const [tip,did]=secim.split(':');
      if(tip==='dava'){const d=getDava(did);if(d){if(!d.harcamalar)d.harcamalar=[];d.harcamalar.push(h);addLog(aktivMuvId,'Harcama Eklendi',`${kat} | ${fmt(tutar)} → 📁 ${d.no}${acik?' | '+acik:''}`);}}
      else if(tip==='icra'){const i=getIcra(did);if(i){if(!i.harcamalar)i.harcamalar=[];i.harcamalar.push(h);addLog(aktivMuvId,'Harcama Eklendi',`${kat} | ${fmt(tutar)} → ⚡ ${i.no}${acik?' | '+acik:''}`);}}
    } else {
      // Dosya seçilmezse müvekkilin ilk aktif davasına ekle
      const d=state.davalar.find(x=>x.muvId===aktivMuvId&&x.durum==='Aktif')||state.davalar.find(x=>x.muvId===aktivMuvId);
      if(d){if(!d.harcamalar)d.harcamalar=[];d.harcamalar.push({...h,acik:'[Genel]'+(acik?' '+acik:'')});addLog(aktivMuvId,'Harcama Eklendi',`${kat} | ${fmt(tutar)} → 📁 ${d.no} (genel)${acik?' | '+acik:''}`);}
    }
    saveData();renderMdHarcamalar();renderMdCards();
  }
  notify('✓ Harcama eklendi');
}
function delHarcDosya(id,ctx){
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;obj.harcamalar=(obj.harcamalar||[]).filter(h=>h.id!==id);
  saveData();
  if(ctx==='dava'){renderDavaTabContent('harcamalar');renderDdCards(getDava(aktivDavaId));}
  else{renderIcraTabContent('harcamalar');renderIdCards(getIcra(aktivIcraId));}
  notify('Silindi');
}

// Not helpers
// openNotModal, saveNot, delNot, anlasmaChange, openAnlasmaModal, saveAnlasma — yeni versiyonlar yukarıdaki script bloğunda
function calcHakedisToplam(obj){
  const an=obj.anlasma||{};const deger=(obj.alacak||obj.deger||0);
  if(an.tur==='pesin'||an.tur==='taksit')return an.ucret||0;
  if(an.tur==='basari'||an.tur==='tahsilat'){const baz=an.baz||deger;return(baz*(an.yuzde||0))/100;}
  if(an.tur==='karma'){const baz=an.baz||deger;return(an.karmaP||0)+((baz*(an.karmaYuzde||0))/100);}
  return 0;
}

// Karşı taraf tahsilatından doğan avukatlık payını hesapla (sadece tahsilat/karma anlaşmalar)
function calcTahsilatPay(obj){
  const an=obj.anlasma||{};
  if(!an.tur||!an.yuzde)return null; // pay yok
  if(an.tur==='tahsilat'||an.tur==='basari'){
    const topTahsil=(obj.tahsilatlar||[]).filter(t=>t.tur==='tahsilat').reduce((s,t)=>s+t.tutar,0);
    const pay=(topTahsil*(an.yuzde||0))/100;
    return {oran:an.yuzde, baz:topTahsil, pay, tur:an.tur};
  }
  if(an.tur==='karma'&&an.karmaYuzde){
    const topTahsil=(obj.tahsilatlar||[]).filter(t=>t.tur==='tahsilat').reduce((s,t)=>s+t.tutar,0);
    const pay=(topTahsil*(an.karmaYuzde||0))/100;
    return {oran:an.karmaYuzde, baz:topTahsil, pay, tur:'karma', karmaP:an.karmaP||0};
  }
  return null;
}

// ================================================================
// TAHSİLAT / HAKEDİŞ / AKTARIM SİSTEMİ
// ================================================================
let tahsilatCtx={};  // {type:'dava'|'icra', editId:null}

const TH_TUR_LABEL={
  tahsilat:'💰 Tahsilat (Karşı Taraf)',
  akdi_vekalet:'📋 Akdi Vekalet Ücreti',
  hakediş:'⚖️ Karşı Taraf Vekalet Hakedişi',
  aktarim:'📤 Müvekkile Aktarım',
  iade:'↩️ İade / Düzeltme',
};
const TH_TUR_RENK={
  tahsilat:'var(--green)',
  akdi_vekalet:'#2ecc71',
  hakediş:'var(--gold)',
  aktarim:'var(--blue)',
  iade:'#e74c3c',
};

let thBelgeData=null; // {ad, tip, data}

function thBelgeSelected(ev){
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    thBelgeData={ad:f.name,tip:f.type,data:e.target.result};
    document.getElementById('th-belge-name').textContent='📎 '+f.name;
    document.getElementById('th-belge-name').style.display='block';
    document.getElementById('th-belge-lbl').style.display='none';
    document.getElementById('th-belge-clear').style.display='block';
  };
  r.readAsDataURL(f);
}
function thBelgeClear(){
  thBelgeData=null;
  document.getElementById('th-belge-file').value='';
  document.getElementById('th-belge-name').style.display='none';
  document.getElementById('th-belge-lbl').style.display='block';
  document.getElementById('th-belge-clear').style.display='none';
}
function thBelgeReset(){
  thBelgeData=null;
  const f=document.getElementById('th-belge-file');if(f)f.value='';
  const nm=document.getElementById('th-belge-name');if(nm){nm.style.display='none';}
  const lb=document.getElementById('th-belge-lbl');if(lb){lb.style.display='block';}
  const cl=document.getElementById('th-belge-clear');if(cl)cl.style.display='none';
}

function tahsilatTurChange(){
  const t=document.getElementById('th-tur').value;
  const box=document.getElementById('th-preview-box');
  const obj=tahsilatCtx.type==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(t==='hakediş'&&obj){
    const hak=calcHakedisToplam(obj);
    if(hak>0){
      document.getElementById('th-tutar').value=hak;
      box.style.cssText='display:block;background:var(--gold-dim);border:1px solid var(--gold);color:var(--gold-light)';
      box.innerHTML=`💡 Anlaşmaya göre hesaplanan hakediş: <strong>${fmt(hak)}</strong>. Manuel değiştirebilirsiniz.`;
    } else {
      box.style.cssText='display:block;background:var(--red-dim);border:1px solid var(--red);color:#e74c3c';
      box.innerHTML='⚠️ Önce Ücret Anlaşması sekmesinden anlaşma koşullarını kaydedin.';
    }
  } else if(t==='akdi_vekalet'&&obj){
    const hak=calcHakedisToplam(obj);
    const topOdenen=(obj.tahsilatlar||[]).filter(x=>x.tur==='akdi_vekalet').reduce((s,x)=>s+x.tutar,0);
    const kalan=Math.max(0,hak-topOdenen);
    if(hak>0){
      box.style.cssText='display:block;background:var(--green-dim);border:1px solid var(--green);color:var(--green)';
      box.innerHTML=`📋 Anlaşılan ücret: <strong>${fmt(hak)}</strong> — Daha önce tahsil edilen: <strong>${fmt(topOdenen)}</strong> — Kalan: <strong style="color:${kalan>0?'#e74c3c':'var(--green)'}">${fmt(kalan)}</strong>`;
      if(kalan>0&&!document.getElementById('th-tutar').value) document.getElementById('th-tutar').value=kalan;
    } else {
      box.style.cssText='display:block;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted)';
      box.innerHTML='💡 Akdi vekalet ücreti için önce Ücret Anlaşması sekmesini doldurun.';
    }
  } else {
    box.style.display='none';
  }
}

// Belge viewer popup
let bvCurrentData=null;
function openTahsilatBelgeViewer(hId, ctx){
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  const h=(obj?.tahsilatlar||[]).find(x=>x.id===hId);
  if(!h||!h.belge)return;
  bvCurrentData=h.belge;
  document.getElementById('bv-title').textContent=h.belge.ad||'Belge';
  const cont=document.getElementById('bv-content');
  const tip=(h.belge.tip||'').toLowerCase();
  if(tip.includes('image')||tip.includes('jpg')||tip.includes('png')||tip.includes('jpeg')){
    cont.innerHTML=`<img src="${h.belge.data}" style="max-width:100%;max-height:65vh;border-radius:6px">`;
  } else if(tip.includes('pdf')){
    cont.innerHTML=`<iframe src="${h.belge.data}" style="width:100%;height:65vh;border:none;border-radius:6px"></iframe>`;
  } else {
    cont.innerHTML=`<div style="padding:24px;text-align:center;color:var(--text-muted)">
      <div style="font-size:40px;margin-bottom:10px">📄</div>
      <div style="font-size:14px">${h.belge.ad}</div>
      <div style="font-size:11px;margin-top:6px">Bu dosya türü önizleme desteklemiyor.</div>
      <button class="btn btn-gold" style="margin-top:14px" onclick="bvIndir()">⬇ İndir</button>
    </div>`;
  }
  document.getElementById('belge-viewer-modal').classList.add('open');
}
function openBelgeUpload(hId, ctx){
  // Opens a quick file picker bound to existing hareket id
  const inp=document.createElement('input');
  inp.type='file';inp.accept='.pdf,.jpg,.jpeg,.png,.doc,.docx';
  inp.onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
      const h=(obj?.tahsilatlar||[]).find(x=>x.id===hId);
      if(h){h.belge={ad:f.name,tip:f.type,data:ev.target.result};saveData();}
      if(ctx==='dava')renderDavaTabContent('tahsilat');else renderIcraTabContent('tahsilat');
      notify('✓ Belge eklendi');
    };
    r.readAsDataURL(f);
  };
  inp.click();
}
function deleteBelge(hId, ctx){
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  const h=(obj?.tahsilatlar||[]).find(x=>x.id===hId);
  if(h){delete h.belge;saveData();}
  if(ctx==='dava')renderDavaTabContent('tahsilat');else renderIcraTabContent('tahsilat');
  notify('Belge silindi');
}
function bvIndir(){
  if(!bvCurrentData)return;
  const a=document.createElement('a');a.href=bvCurrentData.data;a.download=bvCurrentData.ad;a.click();
}

function openTahsilatModal(ctx, editId=null){
  tahsilatCtx={type:ctx, editId};
  document.getElementById('th-tarih').value=today();
  document.getElementById('th-tutar').value='';
  document.getElementById('th-acik').value='';
  document.getElementById('th-tur').value='tahsilat';
  document.getElementById('th-preview-box').style.display='none';
  thBelgeReset();
  if(editId){
    const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
    const h=(obj?.tahsilatlar||[]).find(t=>t.id===editId);
    if(h){
      document.getElementById('th-tur').value=h.tur;
      document.getElementById('th-tarih').value=h.tarih;
      document.getElementById('th-tutar').value=h.tutar;
      document.getElementById('th-acik').value=h.acik||'';
      if(h.belge){
        thBelgeData=h.belge;
        document.getElementById('th-belge-name').textContent='📎 '+h.belge.ad;
        document.getElementById('th-belge-name').style.display='block';
        document.getElementById('th-belge-lbl').style.display='none';
        document.getElementById('th-belge-clear').style.display='block';
      }
    }
    document.getElementById('th-modal-title').textContent='💵 Hareketi Düzenle';
  } else {
    document.getElementById('th-modal-title').textContent='💵 Finansal Hareket Ekle';
  }
  tahsilatTurChange();
  document.getElementById('tahsilat-modal').classList.add('open');
}

function saveTahsilatHareket(){
  const tutar=parseFloat(document.getElementById('th-tutar').value);
  const tarih=document.getElementById('th-tarih').value;
  if(!zorunluKontrol([{id:'th-tarih',deger:tarih,label:'Tarih'},{id:'th-tutar',deger:(!isNaN(tutar)&&tutar>0)?'ok':'',label:'Tutar'}])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  const obj=tahsilatCtx.type==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;
  if(!obj.tahsilatlar)obj.tahsilatlar=[];
  const tur=document.getElementById('th-tur').value;
  const acik=document.getElementById('th-acik').value.trim();
  if(tahsilatCtx.editId){
    const h=obj.tahsilatlar.find(t=>t.id===tahsilatCtx.editId);
    if(h){h.tur=tur;h.tarih=tarih;h.tutar=tutar;h.acik=acik;if(thBelgeData)h.belge=thBelgeData;}
  } else {
    const entry={id:uid(),tur,tarih,tutar,acik};
    if(thBelgeData)entry.belge=thBelgeData;
    obj.tahsilatlar.push(entry);
  }
  thBelgeReset();
  // Bütçeye yansıt
  syncTahsilatBudget(obj, tahsilatCtx.type);
  closeModal('tahsilat-modal');saveData();
  if(tahsilatCtx.type==='dava'){renderDavaTabContent('tahsilat');renderDdCards(getDava(aktivDavaId));}
  else{renderIcraTabContent('tahsilat');renderIdCards(getIcra(aktivIcraId));}
  notify(tahsilatCtx.editId?'✓ Hareket güncellendi':'✓ Hareket eklendi');
}

function deleteTahsilatHareket(id, ctx){
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;
  obj.tahsilatlar=(obj.tahsilatlar||[]).filter(t=>t.id!==id);
  syncTahsilatBudget(obj, ctx);
  saveData();
  if(ctx==='dava'){renderDavaTabContent('tahsilat');renderDdCards(getDava(aktivDavaId));}
  else{renderIcraTabContent('tahsilat');renderIdCards(getIcra(aktivIcraId));}
  notify('Hareket silindi');
}

function syncTahsilatBudget(obj, ctx){
  // Her hareket türüne göre bütçeye ayrı kayıt — dosya id bazlı, mükerrer önleme
  const dosyaId=ctx==='dava'?aktivDavaId:aktivIcraId;
  const prefix='th_'+dosyaId+'_';
  // Eski bu dosyaya ait bütçe kayıtlarını temizle
  state.butce=state.butce.filter(b=>!b.id.startsWith(prefix));
  const thList=obj.tahsilatlar||[];
  thList.forEach(h=>{
    const butId=prefix+h.id;
    if(h.tur==='tahsilat'){
      state.butce.push({id:butId,tur:'Gelir',tarih:h.tarih,tutar:h.tutar,kat:'Tahsilat (Karşı Taraf)',muvId:obj.muvId,acik:`${obj.no} — ${h.acik||'Tahsilat'}`});
    } else if(h.tur==='akdi_vekalet'){
      state.butce.push({id:butId,tur:'Gelir',tarih:h.tarih,tutar:h.tutar,kat:'Akdi Vekalet Ücreti',muvId:obj.muvId,acik:`${obj.no} — ${h.acik||'Akdi vekalet ücreti tahsilatı'}`});
    } else if(h.tur==='hakediş'){
      state.butce.push({id:butId,tur:'Gelir',tarih:h.tarih,tutar:h.tutar,kat:'Avukatlık Hakedişi',muvId:obj.muvId,acik:`${obj.no} — ${h.acik||'Hakediş'}`});
    } else if(h.tur==='aktarim'){
      state.butce.push({id:butId,tur:'Gider',tarih:h.tarih,tutar:h.tutar,kat:'Müvekkile Aktarım',muvId:obj.muvId,acik:`${obj.no} — ${h.acik||'Müvekkile aktarım'}`});
    } else if(h.tur==='iade'){
      state.butce.push({id:butId,tur:'Gider',tarih:h.tarih,tutar:h.tutar,kat:'İade / Düzeltme',muvId:obj.muvId,acik:`${obj.no} — ${h.acik||'İade'}`});
    }
  });
  renderButce();
}

function renderTahsilatTab(ctx, obj){
  const an=obj.anlasma||{};
  const thList=(obj.tahsilatlar||[]).sort((a,b)=>a.tarih.localeCompare(b.tarih));

  // Özet hesapları
  const topTahsil=thList.filter(t=>t.tur==='tahsilat').reduce((s,t)=>s+t.tutar,0);
  const topAkdiVekalet=thList.filter(t=>t.tur==='akdi_vekalet').reduce((s,t)=>s+t.tutar,0);
  const topHakediş=thList.filter(t=>t.tur==='hakediş').reduce((s,t)=>s+t.tutar,0);
  const topAktarim=thList.filter(t=>t.tur==='aktarim').reduce((s,t)=>s+t.tutar,0);
  const topIade=thList.filter(t=>t.tur==='iade').reduce((s,t)=>s+t.tutar,0);
  const hesaplananHakediş=calcHakedisToplam(obj);
  const tahsilatPay=calcTahsilatPay(obj);
  const otomatikPay=tahsilatPay?tahsilatPay.pay:0;
  const muvKalanBorc=hesaplananHakediş>0?Math.max(0,hesaplananHakediş-topAkdiVekalet):0;
  const muvHissesi=topTahsil-topHakediş-topIade;
  const kalanAktarim=muvHissesi-topAktarim;
  const turLabels={pesin:'Peşin Sabit Ücret',taksit:'Taksitli Ücret',basari:'Başarı Primi',tahsilat:'Tahsilat Payı',karma:'Karma'};

  let html=`
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;margin-bottom:20px">
    <div class="card" style="border-color:var(--green)">
      <div class="card-label">Tahsilat (Karşı Taraf)</div>
      <div class="card-value green">${fmt(topTahsil)}</div>
      <div style="font-size:10px;color:var(--text-dim);margin-top:3px">${thList.filter(t=>t.tur==='tahsilat').length} işlem</div>
    </div>
    ${tahsilatPay?`
    <div class="card" style="border-color:var(--gold);background:var(--gold-dim)">
      <div class="card-label" style="color:var(--gold-light)">⚖️ Tahsilattan Doğan Pay (%${tahsilatPay.oran})</div>
      <div class="card-value gold">${fmt(otomatikPay)}</div>
      <div style="font-size:10px;color:var(--text-dim);margin-top:3px">%${tahsilatPay.oran} × ${fmt(tahsilatPay.baz)}</div>
      ${topHakediş>0?`<div style="font-size:10px;margin-top:3px;color:${Math.abs(topHakediş-otomatikPay)<0.01?'var(--green)':'#e74c3c'}">${Math.abs(topHakediş-otomatikPay)<0.01?'✓ Kaydedildi':topHakediş<otomatikPay?`⚠ Eksik: ${fmt(otomatikPay-topHakediş)}`:`Fazla: ${fmt(topHakediş-otomatikPay)}`}</div>`:`<div style="font-size:10px;color:var(--text-dim);margin-top:3px">Hakediş kaydı yok</div>`}
    </div>`:''}
    <div class="card" style="border-color:#2ecc71">
      <div class="card-label">Akdi Vekalet Ücreti</div>
      <div class="card-value" style="color:#2ecc71">${fmt(topAkdiVekalet)}</div>
      ${muvKalanBorc>0.01?`<div style="font-size:10px;color:#e74c3c;margin-top:3px">Kalan: ${fmt(muvKalanBorc)}</div>`:`<div style="font-size:10px;color:var(--green);margin-top:3px">${topAkdiVekalet>0?'✓ Tamamlandı':'—'}</div>`}
    </div>
    <div class="card" style="border-color:var(--gold)">
      <div class="card-label">Kaydedilen Hakediş</div>
      <div class="card-value gold">${fmt(topHakediş)}</div>
      ${hesaplananHakediş>0&&an.tur?`<div style="font-size:10px;color:var(--text-dim);margin-top:3px">Hesaplanan: ${fmt(hesaplananHakediş)}</div>`:''}
    </div>
    <div class="card" style="border-color:var(--blue)">
      <div class="card-label">Müvekkile Aktarım</div>
      <div class="card-value" style="color:var(--blue)">${fmt(topAktarim)}</div>
      <div style="font-size:10px;color:var(--text-dim);margin-top:3px">${thList.filter(t=>t.tur==='aktarim').length} işlem</div>
    </div>
    <div class="card" style="border-color:${kalanAktarim>0.01?'#e74c3c':kalanAktarim<-0.01?'var(--gold)':'var(--green)'}">
      <div class="card-label">${kalanAktarim>0.01?'Müvekkile Kalan':kalanAktarim<-0.01?'Fazla Aktarım':'✓ Kapalı'}</div>
      <div class="card-value" style="color:${kalanAktarim>0.01?'#e74c3c':kalanAktarim<-0.01?'var(--gold)':'var(--green)'}">${fmt(Math.abs(kalanAktarim))}</div>
    </div>
  </div>

  ${tahsilatPay&&topTahsil>0?`
  <div style="background:var(--gold-dim);border:1px solid var(--gold);border-radius:var(--radius);padding:11px 16px;margin-bottom:14px;font-size:12px">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="color:var(--gold-light);font-weight:700">⚖️ Tahsilat Payı Hesabı</span>
      <span style="color:var(--text-muted)">Anlaşma: <strong style="color:var(--text)">${turLabels[an.tur]||an.tur} %${tahsilatPay.oran}</strong></span>
      <span style="color:var(--text-muted)">Toplam tahsilat: <strong style="color:var(--green)">${fmt(topTahsil)}</strong></span>
      <span style="color:var(--text-muted)">→ Doğan avukatlık payı: <strong style="color:var(--gold)">${fmt(otomatikPay)}</strong></span>
    </div>
    ${topHakediş<otomatikPay-0.01?`
    <div style="margin-top:8px;padding:7px 10px;background:rgba(231,76,60,0.15);border:1px solid #e74c3c33;border-radius:6px;font-size:11px;color:#e74c3c;display:flex;align-items:center;gap:10px">
      ⚠️ Henüz <strong>${fmt(otomatikPay-topHakediş)}</strong> tutarında hakediş kaydedilmemiş.
      <button class="btn btn-sm" style="background:#e74c3c;color:#fff;padding:3px 10px;font-size:11px;border:none;border-radius:5px;cursor:pointer" onclick="autoHakedisBtnClick('${ctx}',${otomatikPay})">Otomatik Kaydet</button>
    </div>`:`<div style="margin-top:6px;font-size:11px;color:var(--green)">✓ Tahsilat payına karşılık gelen hakediş kaydedilmiş.</div>`}
  </div>`:''}

  ${an.tur&&!tahsilatPay?`
  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:9px 14px;margin-bottom:14px;font-size:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <span style="color:var(--text-muted);font-weight:700">🤝 Anlaşma:</span>
    <span style="color:var(--text-muted)">${turLabels[an.tur]||an.tur}</span>
    <span>→ Toplam hakediş: <strong style="color:var(--gold)">${fmt(hesaplananHakediş)}</strong></span>
  </div>`:''}

  <div class="section">
    <div class="section-header">
      <div class="section-title">📋 Hareket Geçmişi</div>
      <button class="btn btn-gold btn-sm" onclick="openTahsilatModal('${ctx}')">+ Hareket Ekle</button>
    </div>
    <div style="padding:0">`;

  if(!thList.length){
    html+=`<div class="empty" style="padding:32px"><div class="empty-icon">💵</div><p>Henüz hareket kaydedilmedi</p></div>`;
  } else {
    html+=`<table style="min-width:680px"><thead><tr>
      <th>Tarih</th><th>Tür</th><th>Tutar</th><th>Açıklama</th><th style="text-align:center">Belge</th><th></th>
    </tr></thead><tbody>`;
    thList.forEach(h=>{
      const renk=TH_TUR_RENK[h.tur]||'var(--text)';
      const sign=(h.tur==='aktarim'||h.tur==='iade')?'−':'+';
      let payNot='';
      if(h.tur==='tahsilat'&&tahsilatPay){
        const payBurada=(h.tutar*(tahsilatPay.oran))/100;
        payNot=`<div style="font-size:9px;color:var(--gold);margin-top:2px">%${tahsilatPay.oran} payı → ${fmt(payBurada)}</div>`;
      }
      const belgeCell=h.belge
        ?`<div style="display:flex;gap:4px;justify-content:center">
            <button class="btn btn-outline btn-sm" onclick="openTahsilatBelgeViewer('${h.id}','${ctx}')" title="Görüntüle" style="padding:3px 7px;font-size:13px">👁</button>
            <button class="btn btn-outline btn-sm" onclick="openBelgeUpload('${h.id}','${ctx}')" title="Değiştir" style="padding:3px 7px;font-size:13px">📎</button>
            <button class="delete-btn" onclick="deleteBelge('${h.id}','${ctx}')" title="Sil" style="padding:3px 6px">✕</button>
          </div>`
        :`<button class="btn btn-outline btn-sm" onclick="openBelgeUpload('${h.id}','${ctx}')" title="Belge Yükle" style="padding:3px 10px;font-size:12px;display:block;margin:0 auto">📎 Ekle</button>`;
      html+=`<tr>
        <td><strong>${fmtD(h.tarih)}</strong></td>
        <td><span style="color:${renk};font-weight:700;font-size:11px">${TH_TUR_LABEL[h.tur]||h.tur}</span></td>
        <td><span style="color:${renk};font-weight:700">${sign}${fmt(h.tutar)}</span>${payNot}</td>
        <td style="color:var(--text-muted);font-size:12px">${h.acik||'—'}</td>
        <td style="text-align:center">${belgeCell}</td>
        <td><div style="display:flex;gap:4px">
          <button class="btn btn-outline btn-sm" onclick="openTahsilatModal('${ctx}','${h.id}')" title="Düzenle">✏</button>
          <button class="delete-btn" onclick="deleteTahsilatHareket('${h.id}','${ctx}')">✕</button>
        </div></td>
      </tr>`;
    });
    html+=`</tbody></table>
    <div style="padding:11px 16px;border-top:1px solid var(--border);display:flex;gap:18px;flex-wrap:wrap;font-size:12px;background:var(--surface2);border-radius:0 0 var(--radius) var(--radius)">
      <span>Karşı Taraf Tahsilatı: <strong style="color:var(--green)">${fmt(topTahsil)}</strong></span>
      ${tahsilatPay?`<span>→ Avukatlık Payı (%${tahsilatPay.oran}): <strong style="color:var(--gold)">${fmt(otomatikPay)}</strong></span>`:''}
      ${topAkdiVekalet>0?`<span>Akdi Vekalet: <strong style="color:#2ecc71">${fmt(topAkdiVekalet)}</strong></span>`:''}
      <span>Kayd. Hakediş: <strong style="color:var(--gold)">${fmt(topHakediş)}</strong></span>
      <span>Aktarılan: <strong style="color:var(--blue)">${fmt(topAktarim)}</strong></span>
      ${topIade>0?`<span>İade: <strong style="color:#e74c3c">${fmt(topIade)}</strong></span>`:''}
      <span style="margin-left:auto">Müvekkile Kalan: <strong style="color:${kalanAktarim>0.01?'#e74c3c':'var(--green)'}">${fmt(Math.abs(kalanAktarim))}</strong></span>
    </div>`;
  }

  html+=`</div></div>`;
  return html;
}

// Otomatik hakediş kaydı (tahsilat payından)
function autoHakedisBtnClick(ctx, toplamPay){
  const obj=ctx==='dava'?getDava(aktivDavaId):getIcra(aktivIcraId);
  if(!obj)return;
  if(!obj.tahsilatlar)obj.tahsilatlar=[];
  const topKayitli=(obj.tahsilatlar||[]).filter(t=>t.tur==='hakediş').reduce((s,t)=>s+t.tutar,0);
  const eksik=Math.round((toplamPay-topKayitli)*100)/100;
  if(eksik<=0){notify('Hakediş zaten kaydedilmiş.');return;}
  obj.tahsilatlar.push({id:uid(),tur:'hakediş',tarih:today(),tutar:eksik,acik:'Tahsilat payından otomatik hesaplanan hakediş'});
  syncTahsilatBudget(obj,ctx);
  saveData();
  if(ctx==='dava'){renderDavaTabContent('tahsilat');renderDdCards(getDava(aktivDavaId));}
  else{renderIcraTabContent('tahsilat');renderIdCards(getIcra(aktivIcraId));}
  notify(`✓ ${fmt(eksik)} hakediş kaydedildi`);
}

function editDavaModal(davaId){
  const d=getDava(davaId);if(!d)return;
  // Pre-fill dava modal
  populateMuvSelects();
  populateIlSelect('d-il', d.il||'');
  if(d.il) populateAdliyeSelect('d-adliye', d.il, d.adliye||'');
  else document.getElementById('d-adliye').innerHTML='<option value="">— Önce il seçin —</option>';
  const fields={'d-no':d.no,'d-konu':d.konu,'d-mno':d.mno||'','d-esas-yil':d.esasYil||d.esas||'','d-esas-no':d.esasNo||'','d-karar-yil':d.kararYil||d.karar||'','d-karar-no':d.kararNo||'','d-hakim':d.hakim||'','d-icrano':d.icrano||'','d-deger':d.deger||'','d-not':d.not||'','d-tarih':d.tarih||'','d-durusma':d.durusma||'','d-ktarih':d.ktarih||'','d-kesin':d.kesin||''};
  // Widget doldur
  setTimeout(()=>muvWidgetDoldur(d.muvId,'d-muv-ara','d-muv-liste','d-muv','d-muv-secili'),50);
  Object.entries(fields).forEach(([id,val])=>{const e=document.getElementById(id);if(e)e.value=val;});
  document.getElementById('d-muv').value=d.muvId;
  document.getElementById('d-mtur').value=d.mtur;
  document.getElementById('d-asama').value=d.asama;
  document.getElementById('d-durum').value=d.durum;
  document.getElementById('d-derdest').value=d.derdest||'';
  document.getElementById('d-taraf').value=d.taraf;
  // Karşı taraf ve vekil widget'larını doldur
  ktWidgetTemizle('d-karsi-ara','d-karsi-liste','d-karsi-id','d-karsi-goster');
  ktWidgetTemizle('d-karsav-ara','d-karsav-liste','d-karsav-id','d-karsav-goster');
  if(d.karsiId)ktWidgetDoldur(d.karsiId,'d-karsi-ara','d-karsi-liste','d-karsi-id','d-karsi-goster');
  if(d.karsavId)vekWidgetDoldur(d.karsavId,'d-karsav-ara','d-karsav-liste','d-karsav-id','d-karsav-goster');
  // Override save button for edit
  document.querySelector('#dav-modal .btn-gold').onclick=()=>updateDava(davaId);
  document.getElementById('dav-modal').classList.add('open');
}
function updateDava(id){
  const d=getDava(id);if(!d)return;
  d.no=document.getElementById('d-no').value.trim();d.konu=document.getElementById('d-konu').value.trim();d.muvId=document.getElementById('d-muv').value;
  d.il=document.getElementById('d-il').value;d.adliye=document.getElementById('d-adliye').value;d.mtur=document.getElementById('d-mtur').value;d.mno=document.getElementById('d-mno').value.trim();
  d.esas=document.getElementById('d-esas-yil').value.trim();d.esasYil=d.esas;d.esasNo=document.getElementById('d-esas-no').value.trim();d.kararYil=document.getElementById('d-karar-yil').value.trim();d.kararNo=document.getElementById('d-karar-no').value.trim();d.karar=d.kararYil;d.hakim=document.getElementById('d-hakim').value.trim();
  d.asama=document.getElementById('d-asama').value;d.durum=document.getElementById('d-durum').value;d.derdest=document.getElementById('d-derdest').value;d.taraf=document.getElementById('d-taraf').value;
  d.tarih=document.getElementById('d-tarih').value;d.durusma=document.getElementById('d-durusma').value;d.ktarih=document.getElementById('d-ktarih').value;d.kesin=document.getElementById('d-kesin').value;
  d.icrano=document.getElementById('d-icrano').value.trim();
  d.karsiId=document.getElementById('d-karsi-id').value;d.karsi=getKTAd(d.karsiId);
  d.karsavId=document.getElementById('d-karsav-id').value;d.karsav=getVekAd(d.karsavId);
  d.deger=parseFloat(document.getElementById('d-deger').value)||0;d.not=document.getElementById('d-not').value.trim();
  document.querySelector('#dav-modal .btn-gold').onclick=saveDava; // restore
  closeModal('dav-modal');saveData();openDavaDetay(id);notify('✓ Dava güncellendi');
}

// ================================================================
// İCRA
// ================================================================