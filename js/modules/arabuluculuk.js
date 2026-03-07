// ================================================================
// EMD HUKUK — ARABULUCULUK
// js/modules/arabuluculuk.js
// ================================================================

function renderArabuluculuk(){
  // Sayfayı en üste kaydır
  const sayfaEl = document.getElementById('page-arabuluculuk');
  if (sayfaEl) sayfaEl.scrollTop = 0;
  const mainEl = document.querySelector('.main-content');
  if (mainEl) mainEl.scrollTop = 0;
  if(!state.arabuluculuk)state.arabuluculuk=[];
  const ara=(document.getElementById('arab-s')||{}).value||'';
  const ft=(document.getElementById('arab-ft')||{}).value||'';
  const fd=(document.getElementById('arab-fd')||{}).value||'';
  let list=[...state.arabuluculuk];
  if(ft)list=list.filter(a=>a.tur===ft);
  if(fd)list=list.filter(a=>a.durum===fd);
  if(ara)list=list.filter(a=>(a.konu+a.karsi+a.arabulucuAd).toLowerCase().includes(ara.toLowerCase()));

  // Özet kartlar
  const toplam=state.arabuluculuk.length;
  const devam=state.arabuluculuk.filter(a=>a.durum==='Görüşmeler Devam Ediyor'||a.durum==='İlk Toplantı Bekleniyor').length;
  const uzlasma=state.arabuluculuk.filter(a=>a.durum==='Uzlaşma Sağlandı').length;
  const daval=state.arabuluculuk.filter(a=>a.durum==='Dava Açıldı').length;
  document.getElementById('arab-cards').innerHTML=`
    <div class="card"><div class="card-label">Toplam Dosya</div><div class="card-value gold">${toplam}</div></div>
    <div class="card"><div class="card-label">Devam Eden</div><div class="card-value" style="color:#e67e22">${devam}</div></div>
    <div class="card"><div class="card-label">Uzlaşma Sağlandı</div><div class="card-value green">${uzlasma}</div></div>
    <div class="card"><div class="card-label">Dava Açıldı</div><div class="card-value" style="color:#8e44ad">${daval}</div></div>`;

  const listEl=document.getElementById('arab-list');
  const emptyEl=document.getElementById('arab-empty');
  if(!list.length){listEl.innerHTML='';emptyEl.style.display='flex';return;}
  emptyEl.style.display='none';
  listEl.innerHTML=list.map(a=>`
    <div class="arab-row" onclick="openArabDetay('${a.id}')">
      <div class="arab-row-left">
        <div class="arab-row-title">${a.konu}</div>
        <div class="arab-row-meta">
          <span style="background:var(--surface2);padding:1px 7px;border-radius:10px;font-size:10px;margin-right:6px">${a.tur}</span>
          ${a.muvId?getMuvAd(a.muvId)+'  ·  ':''} 
          ${a.karsi?'Karşı: '+a.karsi:''}
          ${a.basvuruTarih?' · '+fmtD(a.basvuruTarih):''}
        </div>
      </div>
      <div class="arab-row-right">
        ${a.ilgiliDavaId?'<span style="font-size:10px;color:var(--purple);border:1px solid var(--purple);border-radius:10px;padding:1px 8px">⚖️ Dava bağlı</span>':''}
        ${arabDurumBadge(a.durum||'Başvuru Yapıldı')}
      </div>
    </div>`).join('');
}

function openArabDetay(id){
  aktivArabId=id;
  const a=getArab(id);if(!a)return;
  showPage('arab-detay',null);
  document.getElementById('arab-bc').textContent=a.konu;
  document.getElementById('arab-detay-baslik').textContent=a.konu;
  document.getElementById('arab-detay-meta').innerHTML=
    `${a.tur} Arabuluculuk · ${getMuvAd(a.muvId)||'—'} · ${arabDurumBadge(a.durum)}`;
  renderArabDetayCards(a);
  arabTab('bilgi',document.querySelector('#page-arab-detay .tab'));
}

function renderArabDetayCards(a){
  const toplanti=(a.toplantılar||[]).length;
  const sonToplanti=(a.toplantılar||[]).slice(-1)[0];
  document.getElementById('arab-detay-cards').innerHTML=`
    <div class="card"><div class="card-label">Tür</div><div class="card-value gold" style="font-size:14px">${a.tur}</div></div>
    <div class="card"><div class="card-label">Durum</div><div class="card-value" style="font-size:12px">${arabDurumBadge(a.durum)}</div></div>
    <div class="card"><div class="card-label">Toplantı Sayısı</div><div class="card-value gold">${toplanti}</div></div>
    <div class="card"><div class="card-label">Son Toplantı</div><div class="card-value" style="font-size:13px">${sonToplanti?fmtD(sonToplanti.tarih):'—'}</div></div>`;
}

let _arabAktifTab='bilgi';
function arabTab(t,el){
  _arabAktifTab=t;
  document.querySelectorAll('#page-arab-detay .tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('#page-arab-detay .tab-panel').forEach(x=>x.classList.remove('active'));
  if(el)el.classList.add('active');
  document.getElementById('abt-'+t)?.classList.add('active');
  renderArabTabContent(t);
}
function renderArabTabContent(t){
  const a=getArab(aktivArabId);if(!a)return;
  if(t==='bilgi')document.getElementById('abt-bilgi-content').innerHTML=renderArabBilgi(a);
  else if(t==='toplanti')document.getElementById('abt-toplanti-content').innerHTML=renderArabToplanti(a);
  else if(t==='taraflar')document.getElementById('abt-taraflar-content').innerHTML=renderArabTaraflar(a);
  else if(t==='tutanaklar')document.getElementById('abt-tutanaklar-content').innerHTML=renderArabTutanaklar(a);
  else if(t==='notlar')document.getElementById('abt-notlar-content').innerHTML=renderArabNotlar(a);
}
function renderArabBilgi(a){
  const bDava=a.ilgiliDavaId?getDava(a.ilgiliDavaId):null;
  return`<div class="section"><div class="section-header"><div class="section-title">📋 Dosya Bilgileri</div></div>
    <div class="section-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
        <div class="hakediş-box"><div class="hakediş-label">Arabuluculuk Türü</div><div class="hakediş-value">${a.tur}</div></div>
        <div class="hakediş-box"><div class="hakediş-label">Başvuru Tarihi</div><div class="hakediş-value" style="font-size:15px">${fmtD(a.basvuruTarih)||'—'}</div></div>
        <div class="hakediş-box"><div class="hakediş-label">Müvekkil</div><div class="hakediş-value" style="font-size:14px">${getMuvAd(a.muvId)||'—'}</div></div>
        <div class="hakediş-box"><div class="hakediş-label">Karşı Taraf</div><div class="hakediş-value" style="font-size:14px">${a.karsi||'—'}</div></div>
        ${a.ilkTarih?`<div class="hakediş-box"><div class="hakediş-label">İlk Toplantı</div><div class="hakediş-value" style="font-size:15px">${fmtD(a.ilkTarih)} ${a.ilkSaat||''}</div></div>`:''}
        ${a.yer?`<div class="hakediş-box"><div class="hakediş-label">Toplantı Yeri</div><div class="hakediş-value" style="font-size:13px">${a.yer}</div></div>`:''}
      </div>
      ${a.arabulucuAd?`
      <div style="background:var(--surface2);border-radius:var(--radius);padding:14px 16px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px">Arabulucu Bilgileri</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><div style="font-size:10px;color:var(--text-dim)">Adı</div><div style="font-size:13px;color:var(--text)">${a.arabulucuAd}</div></div>
          ${a.arabulucuSicil?`<div><div style="font-size:10px;color:var(--text-dim)">Sicil No</div><div style="font-size:13px;color:var(--text)">${a.arabulucuSicil}</div></div>`:''}
          ${a.arabulucuTel?`<div><div style="font-size:10px;color:var(--text-dim)">Telefon</div><div style="font-size:13px;color:var(--text)">${a.arabulucuTel}</div></div>`:''}
          ${a.arabulucuBuro?`<div><div style="font-size:10px;color:var(--text-dim)">Büro / Merkez</div><div style="font-size:13px;color:var(--text)">${a.arabulucuBuro}</div></div>`:''}
        </div>
      </div>`:''}
      ${a.notlar?`<div style="background:var(--surface2);border-radius:var(--radius);padding:12px 14px;font-size:12px;color:var(--text-muted);line-height:1.6;white-space:pre-wrap">${a.notlar}</div>`:''}
      ${bDava?`<div style="margin-top:14px;padding:12px 14px;background:rgba(142,68,173,.12);border:1px solid #8e44ad;border-radius:var(--radius);font-size:12px">
        <span style="color:#8e44ad;font-weight:700">⚖️ Bağlı Dava:</span> ${bDava.no||''} — ${bDava.konu}
        <button class="btn btn-outline btn-sm" style="margin-left:10px" onclick="showPage('davalar',document.getElementById('ni-davalar'));setTimeout(()=>openDavaDetay('${bDava.id}'),300)">Davaya Git →</button>
      </div>`:''}
    </div></div>`;
}
function renderArabToplanti(a){
  const list=(a.toplantılar||[]).sort((x,y)=>x.tarih.localeCompare(y.tarih));
  let html=`<div class="section"><div class="section-header"><div class="section-title">📅 Toplantılar</div>
    <button class="btn btn-gold btn-sm" onclick="openArabToplantiModal()">+ Toplantı Ekle</button></div>
    <div class="section-body">`;
  if(!list.length)html+=`<div class="empty"><div class="empty-icon">📅</div><p>Henüz toplantı eklenmedi</p></div>`;
  else list.forEach((t,i)=>{
    const sonuc=ARAB_DURUM_STIL[t.sonuc];
    html+=`<div style="display:flex;gap:14px;padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--gold-dim);border:1px solid var(--gold);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--gold);flex-shrink:0">${i+1}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${t.baslik||((i+1)+'. Toplantı')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${fmtD(t.tarih)} ${t.saat?'· '+t.saat:''} ${t.yer?'· '+t.yer:''}</div>
        ${t.sonuc?`<div style="margin-top:5px">${arabDurumBadge(t.sonuc)}</div>`:''}
        ${t.notlar?`<div style="margin-top:7px;font-size:11px;color:var(--text-muted);background:var(--surface2);border-radius:6px;padding:7px 10px;line-height:1.5;white-space:pre-wrap">${t.notlar}</div>`:''}
      </div>
      <button class="delete-btn" onclick="delArabToplanti('${t.id}')">✕</button>
    </div>`;
  });
  html+='</div></div>';return html;
}
function renderArabTaraflar(a){
  const list=(a.talepler||[]);
  const muv=list.filter(t=>t.taraf==='Müvekkil');
  const karsi=list.filter(t=>t.taraf==='Karşı Taraf');
  let html=`<div class="section"><div class="section-header"><div class="section-title">👥 Taraf Talepleri</div>
    <button class="btn btn-gold btn-sm" onclick="openArabTalepModal()">+ Talep Ekle</button></div>
    <div class="section-body">`;
  if(!list.length)html+=`<div class="empty"><div class="empty-icon">👥</div><p>Henüz talep eklenmedi</p></div>`;
  else{
    ['Müvekkil','Karşı Taraf'].forEach(taraf=>{
      const items=taraf==='Müvekkil'?muv:karsi;
      html+=`<div style="margin-bottom:18px"><div style="font-size:11px;font-weight:700;color:${taraf==='Müvekkil'?'var(--gold)':'var(--red)'};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${taraf==='Müvekkil'?'👤':'⚔️'} ${taraf} Talepleri</div>`;
      if(!items.length)html+=`<div style="font-size:11px;color:var(--text-dim);padding:4px 0">Henüz talep yok</div>`;
      else items.forEach(t=>{
        html+=`<div style="background:var(--surface2);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;border-left:3px solid ${taraf==='Müvekkil'?'var(--gold)':'var(--red)'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="font-size:13px;font-weight:600;color:var(--text)">${t.konu}</div>
            <div style="display:flex;align-items:center;gap:6px">
              ${t.tutar?`<span style="color:var(--green);font-weight:700;font-size:12px">${fmt(t.tutar)}</span>`:''}
              <button class="delete-btn" onclick="delArabTalep('${t.id}')">✕</button>
            </div>
          </div>
          ${t.tarih?`<div style="font-size:10px;color:var(--text-dim);margin-top:3px">${fmtD(t.tarih)}</div>`:''}
          ${t.detay?`<div style="font-size:11px;color:var(--text-muted);margin-top:7px;line-height:1.5;white-space:pre-wrap">${t.detay}</div>`:''}
        </div>`;
      });
      html+='</div>';
    });
  }
  html+='</div></div>';return html;
}
function renderArabTutanaklar(a){
  const list=(a.evraklar||[]);
  let html=`<div class="section"><div class="section-header"><div class="section-title">📄 Tutanaklar & Belgeler</div>
    <button class="btn btn-gold btn-sm" onclick="openArabEvrakModal()">+ Tutanak Yükle</button></div>
    <div class="section-body">`;
  if(!list.length)html+=`<div class="empty"><div class="empty-icon">📄</div><p>Tutanak yüklenmedi</p></div>`;
  else list.forEach(e=>{
    html+=`<div class="file-item"><div class="file-icon">${fileIcon(e.ad)}</div><div class="file-info"><div class="file-name">${e.ad}</div><div class="file-meta">${e.tarih?fmtD(e.tarih)+' · ':''}${fileSize(e.data)}${e.kat?' · '+e.kat:''}</div></div>
      <div class="file-actions"><button class="btn btn-outline btn-sm" onclick="dlArabEvrak('${e.id}')">⬇</button><button class="delete-btn" onclick="delArabEvrak('${e.id}')">✕</button></div></div>`;
  });
  html+='</div></div>';return html;
}
function renderArabNotlar(a){
  const list=(a.topNotlar||[]).sort((x,y)=>y.tarih.localeCompare(x.tarih));
  let html=`<div class="section"><div class="section-header"><div class="section-title">📝 Toplantı Notları</div>
    <button class="btn btn-gold btn-sm" onclick="openArabNotEkle()">+ Not Ekle</button></div>
    <div class="section-body">`;
  if(!list.length)html+=`<div class="empty"><div class="empty-icon">📝</div><p>Not yok</p></div>`;
  else list.forEach(n=>{
    html+=`<div style="background:var(--surface2);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;border-left:3px solid var(--gold)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:10px;color:var(--text-muted)">${fmtD(n.tarih)}</span>
        <button class="delete-btn" onclick="delArabNot('${n.id}')">✕</button>
      </div>
      <div style="font-size:12px;color:var(--text);line-height:1.6;white-space:pre-wrap">${n.icerik}</div>
    </div>`;
  });
  html+='</div></div>';return html;
}

// ARABULUCULUK CRUD
function openArabModal(id){
  const edit=id?getArab(id):null;
  document.getElementById('arab-modal-title').textContent=id?'Arabuluculuk Dosyasını Düzenle':'Yeni Arabuluculuk Dosyası';
  document.getElementById('arab-edit-id').value=id||'';
  const muvSel=document.getElementById('arab-muv');
  muvSel.innerHTML='<option value="">— Seçiniz —</option>'+state.muvekkillar.map(m=>`<option value="${m.id}"${edit&&edit.muvId===m.id?' selected':''}>${m.ad}</option>`).join('');
  document.getElementById('arab-konu').value=edit?.konu||'';
  document.getElementById('arab-tur').value=edit?.tur||'Zorunlu';
  document.getElementById('arab-basvuru-tarih').value=edit?.basvuruTarih||today();
  document.getElementById('arab-karsi').value=edit?.karsi||'';
  document.getElementById('arab-durum').value=edit?.durum||'Başvuru Yapıldı';
  document.getElementById('arab-arabulucu-ad').value=edit?.arabulucuAd||'';
  document.getElementById('arab-arabulucu-sicil').value=edit?.arabulucuSicil||'';
  document.getElementById('arab-arabulucu-tel').value=edit?.arabulucuTel||'';
  document.getElementById('arab-arabulucu-buro').value=edit?.arabulucuBuro||'';
  document.getElementById('arab-ilk-tarih').value=edit?.ilkTarih||'';
  document.getElementById('arab-ilk-saat').value=edit?.ilkSaat||'10:00';
  document.getElementById('arab-yer').value=edit?.yer||'';
  document.getElementById('arab-notlar').value=edit?.notlar||'';
  const silBtn=document.getElementById('arab-sil-btn');
  if(silBtn)silBtn.style.display=id?'inline-flex':'none';
  document.getElementById('arab-modal').classList.add('open');
}
function openArabEdit(){openArabModal(aktivArabId);}
function saveArab(){
  const konu=document.getElementById('arab-konu').value.trim();
  if(!zorunluKontrol([{id:'ara-konu',deger:konu,label:'Konu'}])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  const editId=document.getElementById('arab-edit-id').value;
  const kayit={
    id:editId||uid(),konu,
    tur:document.getElementById('arab-tur').value,
    muvId:document.getElementById('arab-muv').value,
    basvuruTarih:document.getElementById('arab-basvuru-tarih').value,
    karsi:document.getElementById('arab-karsi').value.trim(),
    durum:document.getElementById('arab-durum').value,
    arabulucuAd:document.getElementById('arab-arabulucu-ad').value.trim(),
    arabulucuSicil:document.getElementById('arab-arabulucu-sicil').value.trim(),
    arabulucuTel:document.getElementById('arab-arabulucu-tel').value.trim(),
    arabulucuBuro:document.getElementById('arab-arabulucu-buro').value.trim(),
    ilkTarih:document.getElementById('arab-ilk-tarih').value,
    ilkSaat:document.getElementById('arab-ilk-saat').value,
    yer:document.getElementById('arab-yer').value.trim(),
    notlar:document.getElementById('arab-notlar').value.trim(),
  };
  if(editId){
    const idx=(state.arabuluculuk||[]).findIndex(a=>a.id===editId);
    if(idx>=0){const mev=state.arabuluculuk[idx];kayit.toplantılar=mev.toplantılar||[];kayit.talepler=mev.talepler||[];kayit.evraklar=mev.evraklar||[];kayit.topNotlar=mev.topNotlar||[];kayit.ilgiliDavaId=mev.ilgiliDavaId||'';state.arabuluculuk[idx]=kayit;}
  } else {
    kayit.toplantılar=[];kayit.talepler=[];kayit.evraklar=[];kayit.topNotlar=[];
    if(!state.arabuluculuk)state.arabuluculuk=[];
    state.arabuluculuk.push(kayit);
  }
  closeModal('arab-modal');saveData();renderArabuluculuk();updateBadges();
  notify(editId?'✓ Güncellendi':'✓ Arabuluculuk dosyası oluşturuldu');
  if(editId){openArabDetay(editId);}
}
function deleteArab(){
  if(!confirm('Bu arabuluculuk dosyasını silmek istediğinize emin misiniz?'))return;
  state.arabuluculuk=(state.arabuluculuk||[]).filter(a=>a.id!==aktivArabId);
  closeModal('arab-modal');saveData();updateBadges();
  showPage('arabuluculuk',document.getElementById('ni-arabuluculuk'));
  notify('Silindi');
}

// DURUM MODAL
function openArabDurumModal(){
  const a=getArab(aktivArabId);if(!a)return;
  document.getElementById('arab-yeni-durum').value=a.durum||'Başvuru Yapıldı';
  const davaSel=document.getElementById('arab-ilgili-dava');
  davaSel.innerHTML='<option value="">— Dava seçin —</option>'+state.davalar.map(d=>`<option value="${d.id}"${a.ilgiliDavaId===d.id?' selected':''}>${d.no||''} ${d.konu}</option>`).join('');
  arabDurumChange();
  document.getElementById('arab-durum-modal').classList.add('open');
}
function arabDurumChange(){
  const d=document.getElementById('arab-yeni-durum').value;
  const show=d==='Uzlaşma Sağlanamadı'||d==='Dava Açıldı';
  document.getElementById('arab-dava-baglanti').style.display=show?'block':'none';
}
// Durum değişince dava bağlantısını güncelle
document.addEventListener('DOMContentLoaded',()=>{
  const sel=document.getElementById('arab-yeni-durum');
  if(sel)sel.addEventListener('change',arabDurumChange);
});
function saveArabDurum(){
  const a=getArab(aktivArabId);if(!a)return;
  a.durum=document.getElementById('arab-yeni-durum').value;
  const davaId=document.getElementById('arab-ilgili-dava').value;
  if(davaId)a.ilgiliDavaId=davaId;
  closeModal('arab-durum-modal');saveData();
  openArabDetay(aktivArabId);updateBadges();
  notify('✓ Durum güncellendi');
}

// TOPLANTI
function openArabToplantiModal(){
  document.getElementById('abt-edit-id').value='';
  document.getElementById('arab-toplanti-modal-title').textContent='Toplantı Ekle';
  document.getElementById('abt-baslik').value='';
  document.getElementById('abt-tarih').value=today();
  document.getElementById('abt-saat').value='10:00';
  document.getElementById('abt-yer').value='';
  document.getElementById('abt-sonuc').value='';
  document.getElementById('abt-notlar').value='';
  document.getElementById('arab-toplanti-modal').classList.add('open');
}
function saveArabToplanti(){
  const tarih=document.getElementById('abt-tarih').value;
  if(!zorunluKontrol([{id:'ara-tarih',deger:tarih,label:'Tarih'}])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  const a=getArab(aktivArabId);if(!a)return;
  if(!a.toplantılar)a.toplantılar=[];
  const t={id:uid(),
    baslik:document.getElementById('abt-baslik').value.trim(),
    tarih,saat:document.getElementById('abt-saat').value,
    yer:document.getElementById('abt-yer').value.trim(),
    sonuc:document.getElementById('abt-sonuc').value,
    notlar:document.getElementById('abt-notlar').value.trim()};
  a.toplantılar.push(t);
  // Durum otomatik güncelle
  if(t.sonuc==='Uzlaşma Sağlandı')a.durum='Uzlaşma Sağlandı';
  else if(t.sonuc==='Uzlaşma Sağlanamadı')a.durum='Uzlaşma Sağlanamadı';
  else if(t.sonuc==='Görüşme Devam Ediyor')a.durum='Görüşmeler Devam Ediyor';
  closeModal('arab-toplanti-modal');saveData();
  renderArabDetayCards(a);renderArabTabContent('toplanti');updateBadges();
  notify('✓ Toplantı eklendi');
}
function delArabToplanti(id){
  const a=getArab(aktivArabId);if(!a)return;
  a.toplantılar=(a.toplantılar||[]).filter(t=>t.id!==id);
  saveData();renderArabTabContent('toplanti');notify('Silindi');
}

// TALEP
function openArabTalepModal(){
  document.getElementById('att-edit-id').value='';
  document.getElementById('att-taraf').value='Müvekkil';
  document.getElementById('att-tarih').value=today();
  document.getElementById('att-konu').value='';
  document.getElementById('att-tutar').value='';
  document.getElementById('att-detay').value='';
  document.getElementById('arab-talep-modal').classList.add('open');
}
function saveArabTalep(){
  const konu=document.getElementById('att-konu').value.trim();
  if(!zorunluKontrol([{id:'talep-konu',deger:konu,label:'Talep konusu'}])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  const a=getArab(aktivArabId);if(!a)return;
  if(!a.talepler)a.talepler=[];
  a.talepler.push({id:uid(),
    taraf:document.getElementById('att-taraf').value,
    tarih:document.getElementById('att-tarih').value,
    konu,tutar:parseFloat(document.getElementById('att-tutar').value)||0,
    detay:document.getElementById('att-detay').value.trim()});
  closeModal('arab-talep-modal');saveData();renderArabTabContent('taraflar');
  notify('✓ Talep eklendi');
}
function delArabTalep(id){
  const a=getArab(aktivArabId);if(!a)return;
  a.talepler=(a.talepler||[]).filter(t=>t.id!==id);
  saveData();renderArabTabContent('taraflar');notify('Silindi');
}

// TUTANAK EVRAK
let arabEvrakData=[];
function openArabEvrakModal(){
  arabEvrakData=[];
  const html=`<div class="modal-overlay open" id="arab-evrak-modal-temp"><div class="modal modal-lg">
    <div class="modal-title">📄 Tutanak / Belge Yükle</div>
    <div class="form-row">
      <div class="form-group"><label>Tür</label><select id="arab-ev-kat"><option>Arabuluculuk Tutanağı</option><option>Anlaşma Belgesi</option><option>Ret Tutanağı</option><option>Taraf Beyanı</option><option>Diğer</option></select></div>
      <div class="form-group"><label>Tarih</label><input type="date" id="arab-ev-tarih" value="${today()}"></div>
    </div>
    <div class="form-group"><label>Açıklama</label><input id="arab-ev-acik" placeholder="Belge açıklaması"></div>
    <div class="form-group"><label>Dosyalar</label><input type="file" id="arab-ev-file" multiple></div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="document.getElementById('arab-evrak-modal-temp').remove()">İptal</button>
      <button class="btn btn-gold" onclick="saveArabEvrak()">Yükle</button>
    </div>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
async function saveArabEvrak(){
  const inp=document.getElementById('arab-ev-file');
  const kat=document.getElementById('arab-ev-kat').value;
  const tarih=document.getElementById('arab-ev-tarih').value;
  const acik=document.getElementById('arab-ev-acik').value;
  const a=getArab(aktivArabId);if(!a)return;
  if(!a.evraklar)a.evraklar=[];
  const files=Array.from(inp.files);
  for(const f of files){
    const data=await readFileAsBase64(f);
    a.evraklar.push({id:uid(),ad:f.name,kat,tarih,acik,data});
  }
  document.getElementById('arab-evrak-modal-temp')?.remove();
  saveData();renderArabTabContent('tutanaklar');
  notify(`✓ ${files.length} belge yüklendi`);
}
function dlArabEvrak(id){
  const a=getArab(aktivArabId);if(!a)return;
  const e=(a.evraklar||[]).find(x=>x.id===id);if(!e)return;
  const lnk=document.createElement('a');lnk.href=e.data;lnk.download=e.ad;lnk.click();
}
function delArabEvrak(id){
  const a=getArab(aktivArabId);if(!a)return;
  a.evraklar=(a.evraklar||[]).filter(e=>e.id!==id);
  saveData();renderArabTabContent('tutanaklar');notify('Silindi');
}

// ARABULUCULUK NOT
function openArabNotEkle(){
  const html=`<div class="modal-overlay open" id="arab-not-modal-temp"><div class="modal">
    <div class="modal-title">📝 Not Ekle</div>
    <div class="form-group"><label>Tarih</label><input type="date" id="arab-not-tarih" value="${today()}"></div>
    <div class="form-group"><label>Not *</label><textarea id="arab-not-icerik" rows="5"></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="document.getElementById('arab-not-modal-temp').remove()">İptal</button>
      <button class="btn btn-gold" onclick="saveArabNot()">Kaydet</button>
    </div>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
function saveArabNot(){
  const icerik=document.getElementById('arab-not-icerik').value.trim();
  if(!zorunluKontrol([{id:'not2-icerik',deger:icerik,label:'Not içeriği'}])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  const a=getArab(aktivArabId);if(!a)return;
  if(!a.topNotlar)a.topNotlar=[];
  a.topNotlar.push({id:uid(),tarih:document.getElementById('arab-not-tarih').value,icerik});
  document.getElementById('arab-not-modal-temp')?.remove();
  saveData();renderArabTabContent('notlar');notify('✓ Not eklendi');
}
function delArabNot(id){
  const a=getArab(aktivArabId);if(!a)return;
  a.topNotlar=(a.topNotlar||[]).filter(n=>n.id!==id);
  saveData();renderArabTabContent('notlar');notify('Silindi');
}

// ================================================================
// DASHBOARD PATCH — sayfa yüklenince çalıştır
// ================================================================
const _origRDash=window.renderDashboard;
window.renderDashboard=function(){
  if(_origRDash)_origRDash();
  setTimeout(patchDashAlacaklar,50);
};

// ================================================================
// TEMA SİSTEMİ
// ================================================================