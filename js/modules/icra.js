// ================================================================
// EMD HUKUK — İCRA TAKIP
// js/modules/icra.js
// ================================================================

function saveIcra(){
  const no=document.getElementById('i-no').value.trim(),muvId=document.getElementById('i-muv').value;
  let borclu=document.getElementById('i-borclu').value.trim();
  const alacak=parseFloat(document.getElementById('i-alacak').value)||0;
  if(!zorunluKontrol([
    {id:'i-no', deger:no, label:'Dosya No'},
    {id:'i-muv', deger:muvId, label:'Müvekkil'},
    {id:'i-borclu', deger:borclu, label:'Borçlu Adı'},
    {id:'i-alacak', deger:(alacak>0)?'ok':'', label:'Alacak Tutarı'},
  ])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  if(!limitKontrol('icra')) return;
  const karsavId=document.getElementById('i-karsav-id').value;
  // Karşı tarafları topla (çoklu karşı taraf desteği)
  const karsiIds = typeof icraKarsiTaraflariTopla === 'function' ? icraKarsiTaraflariTopla() : [];
  const karsiAdlar = karsiIds.map(function(kid){ return typeof getKTAd === 'function' ? getKTAd(kid) : ''; }).filter(Boolean);
  // İlk karşı tarafı borclu alanına yaz (geriye uyumluluk)
  if(karsiAdlar.length > 0 && !borclu) borclu = karsiAdlar[0];
  const yeniIcra = {
    id:uid(),sira:nextSira('icra'),no,muvId,borclu,btc:document.getElementById('i-btc').value.trim(),
    il:document.getElementById('i-il').value,adliye:document.getElementById('i-adliye').value,daire:document.getElementById('i-daire').value.trim(),
    esas:document.getElementById('i-esas').value.trim(),tur:document.getElementById('i-tur').value,
    alacak,tahsil:parseFloat(document.getElementById('i-tahsil').value)||0,
    faiz:parseFloat(document.getElementById('i-faiz').value)||0,atur:document.getElementById('i-atur').value,
    durum:document.getElementById('i-durum').value,
    durumAciklama:(document.getElementById('i-durum-aciklama')||{}).value||'',
    tarih:document.getElementById('i-tarih').value,
    otarih:document.getElementById('i-otarih').value,itarih:document.getElementById('i-itarih').value,
    karsiIds:karsiIds, karsiAdlar:karsiAdlar,
    karsiId:karsiIds[0]||'', karsi:karsiAdlar[0]||borclu,
    karsavId,karsav:getVekAd(karsavId),
    muvRol:(document.getElementById('i-muv-rol')||{}).value||'alacakli',
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
  _saveIcraDevamAsync(yeniIcra);
}
async function _saveIcraDevamAsync(yeniIcra) {
  if (yeniIcra.otarih && (!yeniIcra.itarih || yeniIcra.itarih === '')) {
    // İİK'ya göre itiraz/ödeme süreleri
    var yasalSure = {
      'İlamsız İcra (Genel Haciz Yolu)': 7,   // İİK md.62
      'İlamsız İcra': 7,                       // geriye uyumluluk
      'Kambiyo Senetlerine Özgü Haciz Yoluyla İcra': 5, // İİK md.168
      'Kambiyo Senedi': 5,                     // geriye uyumluluk
    }[yeniIcra.tur];
    // İlamlı icrada klasik itiraz süresi yoktur (İİK md.33 farklı bir süreçtir)
    if (yasalSure) {
      var itarih = new Date(yeniIcra.otarih);
      itarih.setDate(itarih.getDate() + yasalSure);
      yeniIcra.itarih = itarih.toISOString().split('T')[0];
    }
  }

  if (typeof LexSubmit !== 'undefined') {
    var btn = document.querySelector('#icra-modal .btn-gold');
    var basarili = await LexSubmit.formKaydet({
      tablo: 'icra',
      kayit: yeniIcra,
      modalId: 'icra-modal',
      butonEl: btn,
      basariMesaj: '✓ İcra dosyası eklendi',
      renderFn: function() {
        if (yeniIcra.itarih) _icraItirazGorev(yeniIcra);
        saveData(); renderIcra(); renderIcraCards(); renderMdDavalar();
        if(typeof refreshFinansViews==='function') refreshFinansViews({muvId:yeniIcra.muvId});
      }
    });
    if (!basarili) return;
  } else {
    state.icra.push(yeniIcra);
    if (yeniIcra.itarih) _icraItirazGorev(yeniIcra);
    closeModal('icra-modal');saveData();renderIcra();renderIcraCards();renderMdDavalar();updateBadges();notify('✓ İcra dosyası eklendi');
  }
}

// ── İtiraz Süresi Görev Otomasyonu ───────────────────────────
function _icraItirazGorev(icra) {
  if (!state.todolar) state.todolar = [];
  // Eski otomatik görevi sil
  state.todolar = state.todolar.filter(function(t) { return t._icraId !== icra.id || !t._otoItiraz; });
  
  var itirazTarih = new Date(icra.itarih);
  var bugun = new Date(today());
  if (itirazTarih <= bugun) return; // geçmiş tarih
  
  var gorevTarih = new Date(itirazTarih);
  gorevTarih.setDate(gorevTarih.getDate() - 2); // 2 gün önce
  
  state.todolar.push({
    id: uid(),
    _icraId: icra.id,
    _otoItiraz: true,
    baslik: '🔴 ' + icra.no + ' — İtiraz süresi doluyor',
    aciklama: 'Ödeme Emri: ' + fmtD(icra.otarih) + ' | İtiraz Son: ' + fmtD(icra.itarih) + ' | Kesinleştirme işlemi yapılabilir.',
    sonTarih: gorevTarih.toISOString().split('T')[0],
    durum: 'Bekliyor',
    oncelik: 'Yüksek',
    muvId: icra.muvId,
  });
}

// ── Harcama → Finans Senkronizasyonu ─────────────────────────
function _icraHarcamaSync(icra) {
  if (!state.avanslar) state.avanslar = [];
  // Bu icra dosyasına ait eski otomatik masrafları sil
  state.avanslar = state.avanslar.filter(function(a) { return a._icraId !== icra.id || !a._otoHarcama; });
  
  (icra.harcamalar || []).forEach(function(h) {
    if (h.tutar > 0) {
      state.avanslar.push({
        id: uid(),
        _icraId: icra.id,
        _otoHarcama: true,
        muvId: icra.muvId,
        tur: 'Masraf',
        tutar: h.tutar,
        acik: icra.no + ' İcra — ' + (h.kat || 'Harcama') + ': ' + (h.acik || ''),
        tarih: h.tarih || today(),
        durum: 'Bekliyor',
        odeme: '',
      });
    }
  });
}

// ── Tahsilat → Hakediş Hesaplama ─────────────────────────────
function _icraTahsilatSync(icra) {
  var thList = icra.tahsilatlar || [];
  var topTahsil = thList.filter(function(t){return t.tur==='tahsilat';}).reduce(function(s,t){return s+(t.tutar||0);},0);
  icra.tahsil = topTahsil;
  
  // Anlaşma bazlı hakediş
  var an = icra.anlasma || {};
  if ((an.tur === 'tahsilat' || an.tur === 'basari') && an.yuzde > 0 && topTahsil > 0) {
    icra.hesaplananHakedis = topTahsil * an.yuzde / 100;
  }
}
function deleteIcraById(id){
  if(!confirm('Bu icra dosyasını silmek istediğinize emin misiniz?'))return;
  // İlişkili otomatik masrafları temizle
  state.avanslar = (state.avanslar||[]).filter(function(a){ return a._icraId !== id; });
  // İlişkili otomatik görevleri temizle
  state.todolar = (state.todolar||[]).filter(function(t){ return t._icraId !== id; });
  state.icra=state.icra.filter(i=>i.id!==id);
  saveData();renderIcra();renderIcraCards();renderMdDavalar();updateBadges();notify('İcra silindi');
  // Detay sayfasındaysak listeye dön
  if (aktivIcraId === id) showPage('icra', document.getElementById('ni-icra'));
}
function openIcraModalForMuv(){openModal('icra-modal');setTimeout(()=>{const e=document.getElementById('i-no');if(e&&!e.value)e.value=autoNo('icra');},50);setTimeout(()=>{const e=document.getElementById('i-muv');if(aktivMuvId)e.value=aktivMuvId;},50);}

// ── Durum gösterim haritaları ──
var ICRA_DURUM_MAP = {
  'derdest':'Derdest','itiraz_durduruldu':'Durduruldu','infaz':'İnfaz',
  'infaz_haricen':'İnfaz (Haricen)','haciz':'Haciz Aşaması','satis':'Satış Aşaması','kapandi':'Kapandı',
  'Aktif':'Aktif','Takipte':'Takipte','Haciz Aşaması':'Haciz Aşaması','Satış Aşaması':'Satış Aşaması','Kapandı':'Kapandı'
};
var ICRA_DURUM_RENK = {
  'derdest':'var(--green)','itiraz_durduruldu':'#e67e22','infaz':'var(--blue)',
  'infaz_haricen':'var(--blue)','haciz':'#e74c3c','satis':'#c0392b','kapandi':'var(--text-dim)',
  'Aktif':'var(--green)','Takipte':'var(--gold)','Haciz Aşaması':'#e74c3c','Satış Aşaması':'#c0392b','Kapandı':'var(--text-dim)'
};

// ── ListeMotoru kaydı ──
ListeMotoru.register('icra', {
  stateKey: 'icra',
  containerId: 'icra-liste-body',
  kpiBarId: 'icra-cards',
  filterRowId: 'icra-filter-row',
  chipContainerId: 'icra-chips',
  searchInputId: 'icra-s',
  sortTabloKey: 'icra',
  defaultSort: { key: 'tarih', dir: -1 },
  dateField: 'tarih',
  renderMode: 'table',
  emptyText: 'Henüz icra dosyası eklenmemiş',

  columns: [
    { key: 'sira', label: '#', sortable: true,
      render: function(i) { return '<span style="font-weight:700;color:var(--text-muted);font-size:11px">' + (i.sira || '?') + '</span>'; } },
    { key: 'no', label: 'Dosya No', sortable: true,
      render: function(i) { return '<strong style="color:var(--gold)">' + i.no + '</strong>'; } },
    { key: 'muvId', label: 'Müvekkil', sortable: true,
      render: function(i) { return '<span style="color:var(--gold-light)">' + getMuvAd(i.muvId) + '</span>'; } },
    { key: 'borclu', label: 'Borçlu', sortable: true,
      render: function(i) {
        var html = '<strong>' + i.borclu + '</strong>';
        if (i.btc) html += '<div style="font-size:10px;color:var(--text-dim)">' + i.btc + '</div>';
        return html;
      } },
    { key: 'daire', label: 'İcra Dairesi', sortable: false,
      render: function(i) { return '<span style="font-size:11px">' + [i.il, i.adliye, i.daire].filter(Boolean).join(' — ') + '</span>'; } },
    { key: 'tur', label: 'Tür', sortable: true,
      render: function(i) { return '<span style="font-size:11px;color:var(--text-muted)">' + (i.tur || '') + '</span>'; } },
    { key: 'alacak', label: 'Toplam Alacak', sortable: true,
      render: function(i) { return '<strong>' + fmt(i.alacak) + '</strong>'; } },
    { key: 'tahsil', label: 'Tahsil', sortable: true,
      render: function(i) {
        var oran = i.alacak > 0 ? Math.round(((i.tahsil||0) / i.alacak) * 100) : 0;
        return '<span style="color:var(--green)">' + fmt(i.tahsil) + '</span>' +
          '<div class="progress-bar"><div class="progress-fill" style="width:' + oran + '%"></div></div>' +
          '<div style="font-size:9px;color:var(--text-dim)">%' + oran + '</div>';
      } },
    { key: 'durum', label: 'Durum', sortable: true,
      render: function(i) {
        var renk = ICRA_DURUM_RENK[i.durum] || IDRENK[i.durum] || 'var(--text-muted)';
        var txt = ICRA_DURUM_MAP[i.durum] || i.durum;
        return '<span style="color:' + renk + ';font-size:11px;font-weight:600">' + txt + '</span>';
      } },
    { key: 'tarih', label: 'Tarih', sortable: true,
      render: function(i) { return fmtD(i.tarih); } },
    { key: 'davno', label: 'Dava', sortable: false,
      render: function(i) { return i.davno ? '<span style="color:var(--blue);font-size:11px">' + i.davno + '</span>' : '—'; } },
  ],

  filters: [
    { key: 'tur', label: 'Tür', options: function(allData) {
      var turler = {}; allData.forEach(function(i) { if (i.tur) turler[i.tur] = true; }); return Object.keys(turler);
    } },
    { key: 'durum', label: 'Durum', options: function(allData) {
      var d = {}; allData.forEach(function(i) { if (i.durum) d[i.durum] = true; }); return Object.keys(d);
    }, displayFn: function(v) { return ICRA_DURUM_MAP[v] || v; } },
  ],

  kpiCards: [
    { label: 'Toplam', valueClass: 'gold', calc: function(all) { return all.length; } },
    { label: 'Aktif Takip', valueColor: '#e74c3c', calc: function(all) {
      return all.filter(function(i) { return i.durum !== 'kapandi' && i.durum !== 'Kapandı'; }).length;
    } },
    { label: 'Toplam Alacak', valueColor: '#e74c3c', calc: function(all) {
      return all.reduce(function(s, i) { return s + (i.alacak || 0); }, 0);
    }, format: function(v) { return fmt(v); } },
    { label: 'Tahsil Edilen', valueColor: 'var(--green)', calc: function(all) {
      return all.reduce(function(s, i) { return s + (i.tahsil || 0); }, 0);
    }, format: function(v) { return fmt(v); } },
    { label: 'Kalan', valueColor: '#e74c3c', calc: function(all) {
      var a = all.reduce(function(s, i) { return s + (i.alacak || 0); }, 0);
      var t = all.reduce(function(s, i) { return s + (i.tahsil || 0); }, 0);
      return a - t;
    }, format: function(v) { return fmt(v); } },
  ],

  searchFn: function(item, q) {
    return (item.no || '').toLowerCase().includes(q) ||
      (item.borclu || '').toLowerCase().includes(q) ||
      getMuvAd(item.muvId).toLowerCase().includes(q);
  },

  onRowClick: function(item) { return "openIcraDetay('" + item.id + "')"; },
  onRowMenu: function(item) { return "CtxMenu.icraMenu(event,'" + item.id + "')"; },
});

function renderIcraCards() { ListeMotoru.render('icra'); }
function filterIcra() { ListeMotoru.render('icra'); }
function renderIcra() { ListeMotoru.render('icra'); }

// ================================================================
// İCRA DETAY
// ================================================================
function openIcraDetay(icraId){
  aktivIcraId=icraId;aktivDavaId=null;
  const i=getIcra(icraId);if(!i)return;
  ensureArrays(i,['evraklar','notlar','harcamalar','tahsilatlar']);if(!i.anlasma)i.anlasma={};
  document.getElementById('id-bc').textContent=i.no;
  document.getElementById('id-baslik').textContent=`${i.no} — ${i.borclu}`;

  // İlişkili dava link
  let davaBilgi = '';
  if (i.davno) {
    const dava = (state.davalar||[]).find(d => d.no === i.davno || d.id === i.davno);
    if (dava) {
      davaBilgi = ` · <span onclick="showPage('davalar',document.getElementById('ni-davalar'));setTimeout(function(){openDavaDetay('${dava.id}')},200)" style="color:var(--gold);cursor:pointer;text-decoration:underline">📁 ${dava.no}</span>`;
    } else {
      davaBilgi = ` · 📁 ${i.davno}`;
    }
  }

  document.getElementById('id-meta').innerHTML=`${getMuvAd(i.muvId)} · ${[i.il,i.adliye,i.daire].filter(Boolean).join(' ')} · ${i.tur}${davaBilgi}`;
  document.getElementById('id-edit-btn').onclick=function(){ editIcraModal(icraId); };
  renderIdCards(i);
  document.querySelectorAll('#page-icra-detay .tab').forEach((t,idx)=>t.classList.toggle('active',idx===0));
  document.querySelectorAll('#page-icra-detay .tab-panel').forEach((p,idx)=>p.classList.toggle('active',idx===0));
  renderIcraTabContent('evraklar');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-icra-detay').classList.add('active');
}
function renderIdCards(i){
  const harcToplam=(i.harcamalar||[]).reduce((s,h)=>s+(h.tutar||0),0);
  const kalan=(i.alacak||0)-(i.tahsil||0);
  const oran=i.alacak>0?Math.round(((i.tahsil||0)/i.alacak)*100):0;
  const thList=i.tahsilatlar||[];
  const topTahsil=thList.filter(t=>t.tur==='tahsilat').reduce((s,t)=>s+(t.tutar||0),0);
  const topAktarim=thList.filter(t=>t.tur==='aktarim').reduce((s,t)=>s+(t.tutar||0),0);
  // Hakediş hesapla (anlaşmaya göre)
  const an = i.anlasma || {};
  let hakedis = 0;
  if ((an.tur === 'tahsilat' || an.tur === 'basari') && an.yuzde > 0 && topTahsil > 0) {
    hakedis = topTahsil * an.yuzde / 100;
  } else if (an.tur === 'sabit' && an.tutar > 0) {
    hakedis = an.tutar;
  }

  // İtiraz süresi countdown
  let itirazBilgi = '';
  if (i.itarih) {
    const kalanGun = Math.ceil((new Date(i.itarih) - new Date(today())) / 86400000);
    if (kalanGun > 0) {
      const renk = kalanGun <= 2 ? '#e74c3c' : kalanGun <= 5 ? '#e67e22' : 'var(--green)';
      itirazBilgi = `<div class="card" style="border:1px solid ${renk}"><div class="card-label">İtiraz Süresi</div><div class="card-value" style="font-size:14px;color:${renk}">${kalanGun} gün</div><div style="font-size:9px;color:var(--text-dim)">${fmtD(i.itarih)}</div></div>`;
    } else if (kalanGun <= 0) {
      itirazBilgi = `<div class="card" style="border:1px solid var(--green)"><div class="card-label">İtiraz Süresi</div><div class="card-value" style="font-size:12px;color:var(--green)">✅ Kesinleşti</div></div>`;
    }
  }

  document.getElementById('id-cards').innerHTML=`
    <div class="card"><div class="card-label">Toplam Alacak</div><div class="card-value red">${fmt(i.alacak)}</div></div>
    <div class="card"><div class="card-label">Tahsil Edilen</div><div class="card-value green">${fmt(i.tahsil)}<div class="progress-bar" style="margin-top:4px"><div class="progress-fill" style="width:${oran}%"></div></div><div style="font-size:9px;color:var(--text-dim)">%${oran}</div></div></div>
    <div class="card"><div class="card-label">Kalan</div><div class="card-value red">${fmt(kalan)}</div></div>
    <div class="card"><div class="card-label">Dosya Harcaması</div><div class="card-value" style="color:#e74c3c">${fmt(harcToplam)}</div></div>
    ${hakedis>0?`<div class="card" style="border:1px solid var(--gold)"><div class="card-label">Avukat Hakedişi</div><div class="card-value gold">${fmt(hakedis)}${an.yuzde?'<div style="font-size:9px;color:var(--text-dim)">%'+an.yuzde+' tahsilat payı</div>':''}</div></div>`:''}
    ${topTahsil>0?`<div class="card"><div class="card-label">Avukatlık Tahsilatı</div><div class="card-value green">${fmt(topTahsil)}</div></div>`:''}
    ${topAktarim>0?`<div class="card"><div class="card-label">Müvekkile Aktarım</div><div class="card-value" style="color:var(--blue)">${fmt(topAktarim)}</div></div>`:''}
    ${itirazBilgi}
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
  }
}

// ================================================================
// İCRA DÜZENLEME
// ================================================================
function editIcraModal(icraId) {
  var i = getIcra(icraId); if (!i) return;
  populateMuvSelects();
  populateIlSelect('i-il', i.il || '');
  if (i.il) populateAdliyeSelect('i-adliye', i.il, i.adliye || '');
  // Alanları doldur
  var fields = {'i-no':i.no,'i-daire':i.daire||'','i-esas':i.esas||'','i-alacak':i.alacak||'','i-tahsil':i.tahsil||0,'i-faiz':i.faiz||'','i-davno':i.davno||'','i-dayanak':i.dayanak||'','i-not':i.not||'','i-tarih':i.tarih||'','i-otarih':i.otarih||'','i-itarih':i.itarih||''};
  Object.keys(fields).forEach(function(id) { var el = document.getElementById(id); if (el) el.value = fields[id]; });
  // Select'ler
  var turEl = document.getElementById('i-tur'); if (turEl) turEl.value = i.tur || 'İlamlı İcra';
  var aturEl = document.getElementById('i-atur'); if (aturEl) aturEl.value = i.atur || '';
  var durEl = document.getElementById('i-durum'); if (durEl) durEl.value = i.durum || 'derdest';
  if (typeof icraDurumDegis === 'function') icraDurumDegis(i.durum);
  // Müvekkil widget
  setTimeout(function(){ muvWidgetDoldur(i.muvId, 'i-muv-ara', 'i-muv-liste', 'i-muv', 'i-muv-secili'); }, 50);
  document.getElementById('i-muv').value = i.muvId;
  // Karşı taraf vekili widget
  ktWidgetTemizle('i-karsav-ara','i-karsav-liste','i-karsav-id','i-karsav-goster');
  if (i.karsavId) vekWidgetDoldur(i.karsavId, 'i-karsav-ara', 'i-karsav-liste', 'i-karsav-id', 'i-karsav-goster');
  // Borçlu — hidden input
  document.getElementById('i-borclu').value = i.borclu || '';
  document.getElementById('i-btc').value = i.btc || '';
  // Kaydet butonunu düzenleme moduna al
  var kaydetBtn = document.getElementById('icra-kaydet-btn');
  if (kaydetBtn) {
    kaydetBtn.onclick = function() { updateIcra(icraId); };
    kaydetBtn.textContent = 'Güncelle';
  }
  document.getElementById('icra-modal-title').textContent = 'İcra Dosyası Düzenle';
  openModal('icra-modal');
}

async function updateIcra(id) {
  var i = getIcra(id); if (!i) return;
  // Alanları güncelle
  i.no = document.getElementById('i-no').value.trim();
  i.muvId = document.getElementById('i-muv').value;
  i.borclu = document.getElementById('i-borclu').value.trim();
  i.btc = document.getElementById('i-btc').value.trim();
  i.il = document.getElementById('i-il').value;
  i.adliye = document.getElementById('i-adliye').value;
  i.daire = document.getElementById('i-daire').value.trim();
  i.esas = document.getElementById('i-esas').value.trim();
  i.tur = document.getElementById('i-tur').value;
  i.alacak = parseFloat(document.getElementById('i-alacak').value) || 0;
  i.tahsil = parseFloat(document.getElementById('i-tahsil').value) || 0;
  i.faiz = parseFloat(document.getElementById('i-faiz').value) || 0;
  i.atur = document.getElementById('i-atur').value;
  i.durum = document.getElementById('i-durum').value;
  i.tarih = document.getElementById('i-tarih').value;
  i.otarih = document.getElementById('i-otarih').value;
  i.itarih = document.getElementById('i-itarih').value;
  i.karsavId = document.getElementById('i-karsav-id').value;
  i.karsav = getVekAd(i.karsavId);
  i.davno = document.getElementById('i-davno').value.trim();
  i.dayanak = document.getElementById('i-dayanak').value.trim();
  i.not = document.getElementById('i-not').value.trim();

  // Kaydet butonunu normal moda geri al
  var kaydetBtn = document.getElementById('icra-kaydet-btn');
  if (kaydetBtn) { kaydetBtn.onclick = function(){ saveIcra(); }; kaydetBtn.textContent = 'Kaydet'; }
  document.getElementById('icra-modal-title').textContent = 'İcra Dosyası Ekle';

  if (typeof LexSubmit !== 'undefined') {
    var btn = document.getElementById('icra-kaydet-btn');
    var ok = await LexSubmit.formKaydet({tablo:'icra', kayit:i, modalId:'icra-modal', butonEl:btn, basariMesaj:'✓ İcra dosyası güncellendi',
      renderFn:function(){ renderIcra();renderIcraCards();openIcraDetay(id);if(typeof refreshFinansViews==='function')refreshFinansViews({muvId:i.muvId}); }
    });
    if (!ok) return;
  } else {
    closeModal('icra-modal');saveData();openIcraDetay(id);renderIcra();renderIcraCards();notify('✓ İcra dosyası güncellendi');
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

async function saveButce() {
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

  if (typeof LexSubmit !== 'undefined') {
    var btn = document.querySelector('#but-modal .btn-gold');
    var ok = await LexSubmit.formKaydet({ tablo:'butce', kayit:_butKayit, modalId:'but-modal', butonEl:btn, basariMesaj:'✓ Hareket eklendi',
      renderFn:function(){ refreshFinansViews({muvId:_butKayit.muvId}); addAktiviteLog('Finans Hareketi Eklendi', _butKayit.tur + ' — ' + fmt(tutar), 'Finans'); }
    });
    if(!ok) return;
  } else {
    state.butce.push(_butKayit);
    closeModal('but-modal'); saveData(); renderButce(); notify('✓ Hareket eklendi');
    addAktiviteLog('Finans Hareketi Eklendi', _butKayit.tur + ' — ' + fmt(tutar), 'Finans');
  }
  ['b-tutar','b-acik'].forEach(i => document.getElementById(i).value = '');
  document.getElementById('b-kdv-oran').value = '0';
  document.getElementById('b-kdv-tutar').value = '';
  document.getElementById('b-kdv-toplam-satir').style.display = 'none';
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