// ================================================================
// LEXBASE — İHTARNAME / PROTESTO MODÜLİ v2
// js/modules/ihtarname.js
//
// Entegrasyonlar:
// - Kişiler: client_id + opposing_party_id (FK dropdown)
// - Dosyalar: case_id / icra_id (FK bağlantı)
// - Finans: Masraf otomasyonu
// - Görevler: Süre takibi otomasyonu
// ================================================================

let aktivIhtarId = null;

// ── ListeMotoru kaydı ──
ListeMotoru.register('ihtarname', {
  stateKey: 'ihtarnameler',
  containerId: 'ihtar-liste-body',
  kpiBarId: 'ihtar-cards',
  filterRowId: 'ihtar-filter-row',
  chipContainerId: 'ihtar-chips',
  searchInputId: 'ihtar-s',
  sortTabloKey: 'iht',
  defaultSort: { key: 'tarih', dir: -1 },
  dateField: 'tarih',
  renderMode: 'table',
  emptyText: 'Henüz ihtarname eklenmemiş',

  columns: [
    { key: 'no', label: 'No', sortable: true,
      render: function(i) { return '<strong style="color:var(--gold)">' + (i.no || '—') + '</strong>'; } },
    { key: 'yon', label: 'Yön', sortable: true,
      render: function(i) { var r = i.yon === 'Giden' ? 'var(--blue)' : 'var(--purple)';
        return '<span style="background:' + r + '22;color:' + r + ';padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">' + i.yon + '</span>'; } },
    { key: 'tur', label: 'Tür', sortable: true,
      render: function(i) { return '<span style="font-size:11px">' + (i.tur || '—') + '</span>'; } },
    { key: 'muvId', label: 'Müvekkil', sortable: true,
      render: function(i) { return getMuvAd(i.muvId); } },
    { key: 'karsiTaraf', label: 'Karşı Taraf', sortable: false,
      render: function(i) { return '<span style="font-size:12px">' + _getKarsiAd(i) + '</span>'; } },
    { key: 'gonderimUsulu', label: 'Gönderim', sortable: false,
      render: function(i) { var g = {'Noter':'🏛','KEP':'📧','PTT':'📮','Elden':'🤝'}[i.gonderimUsulu] || '📨';
        return '<span style="font-size:11px">' + g + ' ' + (i.gonderimUsulu || '—') + '</span>'; } },
    { key: 'tarih', label: 'Tarih', sortable: true,
      render: function(i) { return fmtD(i.tarih); } },
    { key: 'tebligDurum', label: 'Tebliğ', sortable: true,
      render: function(i) {
        var r = i.tebligDurum === 'Tebliğ Edildi' ? 'var(--green)' : i.tebligDurum === 'Bila' ? 'var(--red)' : '#e67e22';
        var sureTag = (i.verilenSure && i.tebligDurum === 'Tebliğ Edildi' && i.tebligTarih)
          ? '<span style="font-size:9px;color:#e67e22;background:rgba(230,126,34,.1);padding:1px 6px;border-radius:3px;margin-left:4px">' + i.verilenSure + 'g</span>' : '';
        return '<span style="color:' + r + ';font-size:11px;font-weight:600">● ' + (i.tebligDurum || 'Bekliyor') + '</span>' + sureTag +
          (i.tebligTarih ? '<div style="font-size:10px;color:var(--text-dim)">' + fmtD(i.tebligTarih) + '</div>' : '');
      } },
  ],

  filters: [
    { key: 'tur', label: 'Tür', options: ['İhtarname', 'Protesto', 'İhbar', 'Fesih Bildirimi', 'Diğer'] },
    { key: 'tebligDurum', label: 'Tebliğ', options: ['Bekliyor', 'Tebliğ Edildi', 'Bila', 'İade', 'Posta'] },
    { key: 'yon', label: 'Yön', options: ['Giden', 'Gelen'] },
  ],

  kpiCards: [
    { label: 'Toplam', valueClass: 'gold', calc: function(all) { return all.length; } },
    { label: 'Giden', valueColor: 'var(--blue)', calc: function(all) { return all.filter(function(i) { return i.yon === 'Giden'; }).length; },
      filterOnClick: { key: 'yon', value: 'Giden' } },
    { label: 'Gelen', valueColor: 'var(--purple)', calc: function(all) { return all.filter(function(i) { return i.yon === 'Gelen'; }).length; },
      filterOnClick: { key: 'yon', value: 'Gelen' } },
    { label: 'Tebliğ Bekliyor', valueColor: '#e67e22', calc: function(all) { return all.filter(function(i) { return i.tebligDurum === 'Bekliyor'; }).length; },
      filterOnClick: { key: 'tebligDurum', value: 'Bekliyor' } },
    { label: 'Toplam Masraf', valueColor: '#e74c3c', calc: function(all) { return all.reduce(function(s, i) { return s + (parseFloat(i.masrafTutar) || 0); }, 0); },
      format: function(v) { return fmt(v); } },
  ],

  searchFn: function(item, q) {
    return (item.no || '').toLowerCase().includes(q) ||
      getMuvAd(item.muvId).toLowerCase().includes(q) ||
      (item.konu || '').toLowerCase().includes(q) ||
      _getKarsiAd(item).toLowerCase().includes(q);
  },

  onRowClick: function(item) { return "openIhtarDetay('" + item.id + "')"; },
  onRowMenu: function(item) { return "CtxMenu.goster(event,[{icon:'👁️',label:'Görüntüle',fn:function(){openIhtarDetay('" + item.id + "')}},{icon:'✏️',label:'Düzenle',fn:function(){openIhtarModal('" + item.id + "')}},\'---\',{icon:'🗑️',label:'Sil',danger:true,fn:function(){deleteIhtar('" + item.id + "')}}])"; },
});

function renderIhtarname() {
  ListeMotoru.render('ihtarname');
}

function _getKarsiAd(ih) {
  if (ih.karsiTarafId) { const k = (state.karsiTaraflar||[]).find(x=>x.id===ih.karsiTarafId); return k ? k.ad : '—'; }
  return ih.karsiTaraf || '—';
}

function openIhtarModal(id) {
  const muvSel = document.getElementById('ihtar-muv');
  if (muvSel) { muvSel.innerHTML = '<option value="">— Müvekkil seçin —</option>'; (state.muvekkillar||[]).forEach(m => muvSel.innerHTML += '<option value="'+m.id+'">'+m.ad+'</option>'); }

  const karsiSel = document.getElementById('ihtar-karsi-id');
  if (karsiSel) { karsiSel.innerHTML = '<option value="">— Karşı taraf seçin —</option>'; (state.karsiTaraflar||[]).forEach(k => karsiSel.innerHTML += '<option value="'+k.id+'">'+k.ad+'</option>'); karsiSel.innerHTML += '<option value="__yeni__">＋ Yeni Karşı Taraf Ekle</option>'; }

  ihtarDosyaDoldur('');
  ['ihtar-id','ihtar-no','ihtar-konu','ihtar-icindekiler','ihtar-noter-adi','ihtar-noter-yevmiye','ihtar-kep-adres','ihtar-kep-delil','ihtar-ptt-barkod','ihtar-masraf','ihtar-verilen-sure','ihtar-ilgili-dosya-id'].forEach(function(f) { var el=document.getElementById(f); if(el) el.value=''; });
  var tarihEl = document.getElementById('ihtar-tarih'); if(tarihEl) tarihEl.value = today();
  var tebTarihEl = document.getElementById('ihtar-teblig-tarih'); if(tebTarihEl) tebTarihEl.value = '';
  var yonEl = document.getElementById('ihtar-yon'); if(yonEl) yonEl.value = 'Giden';
  var turEl = document.getElementById('ihtar-tur'); if(turEl) turEl.value = 'İhtarname';
  var tebDurEl = document.getElementById('ihtar-teblig-durum'); if(tebDurEl) tebDurEl.value = 'Bekliyor';
  var gondEl = document.getElementById('ihtar-gonderim'); if(gondEl) gondEl.value = 'Noter';
  var ilgTurEl = document.getElementById('ihtar-ilgili-tur'); if(ilgTurEl) ilgTurEl.value = '';
  var masrafCb = document.getElementById('ihtar-masraf-yansit'); if(masrafCb) masrafCb.checked = true;
  document.getElementById('ihtar-modal-title').textContent = 'Yeni İhtarname / Protesto';
  ihtarGonderimDegisti();

  if (id) {
    var ih = (state.ihtarnameler||[]).find(function(x){return x.id===id;});
    if (ih) {
      document.getElementById('ihtar-id').value = ih.id;
      document.getElementById('ihtar-no').value = ih.no||'';
      if(yonEl) yonEl.value = ih.yon||'Giden';
      if(turEl) turEl.value = ih.tur||'İhtarname';
      if(muvSel) muvSel.value = ih.muvId||'';
      if(karsiSel) karsiSel.value = ih.karsiTarafId||'';
      document.getElementById('ihtar-konu').value = ih.konu||'';
      if(gondEl) gondEl.value = ih.gonderimUsulu||'Noter';
      ihtarGonderimDegisti();
      var gd = ih.gonderimDetay || {};
      var na = document.getElementById('ihtar-noter-adi'); if(na) na.value = gd.noterAdi || ih.noterlik || '';
      var ny = document.getElementById('ihtar-noter-yevmiye'); if(ny) ny.value = gd.yevmiyeNo || ih.yevmiyeNo || '';
      var ka = document.getElementById('ihtar-kep-adres'); if(ka) ka.value = gd.kepAdresi || '';
      var kd = document.getElementById('ihtar-kep-delil'); if(kd) kd.value = gd.delilNo || '';
      var pb = document.getElementById('ihtar-ptt-barkod'); if(pb) pb.value = gd.barkodNo || '';
      if(tarihEl) tarihEl.value = ih.tarih||today();
      if(tebDurEl) tebDurEl.value = ih.tebligDurum||'Bekliyor';
      if(tebTarihEl) tebTarihEl.value = ih.tebligTarih||'';
      document.getElementById('ihtar-icindekiler').value = ih.icindekiler||'';
      if(ilgTurEl) ilgTurEl.value = ih.ilgiliTur||'';
      ihtarDosyaDoldur(ih.ilgiliTur||'');
      var dosyaEl = document.getElementById('ihtar-ilgili-dosya-id'); if(dosyaEl) dosyaEl.value = ih.ilgiliDosyaId||'';
      var masrafEl = document.getElementById('ihtar-masraf'); if(masrafEl) masrafEl.value = ih.masrafTutar||'';
      if(masrafCb) masrafCb.checked = ih.masrafYansit !== false;
      var sureEl = document.getElementById('ihtar-verilen-sure'); if(sureEl) sureEl.value = ih.verilenSure||'';
      document.getElementById('ihtar-modal-title').textContent = 'İhtarname Düzenle';
    }
  } else {
    document.getElementById('ihtar-no').value = autoNo('ihtarname');
  }
  openModal('ihtar-modal');
}

function ihtarGonderimDegisti() {
  var usul = (document.getElementById('ihtar-gonderim')||{}).value || 'Noter';
  ['ihtar-noter-alan','ihtar-kep-alan','ihtar-ptt-alan'].forEach(function(id) { var el = document.getElementById(id); if(el) el.style.display = 'none'; });
  var map = {'Noter':'ihtar-noter-alan','KEP':'ihtar-kep-alan','PTT':'ihtar-ptt-alan'};
  var hedef = document.getElementById(map[usul]||'');
  if (hedef) hedef.style.display = '';
}

function ihtarKarsiDegisti() {
  var sel = document.getElementById('ihtar-karsi-id');
  if (sel && sel.value === '__yeni__') { sel.value = ''; if(typeof openYeniKT==='function') openYeniKT(); }
}

function ihtarDosyaDoldur(tur) {
  var sel = document.getElementById('ihtar-ilgili-dosya-id'); if (!sel) return;
  sel.innerHTML = '<option value="">— Dosya seçin (opsiyonel) —</option>';
  if (tur === 'dava') { (state.davalar||[]).forEach(function(d) { sel.innerHTML += '<option value="'+d.id+'">📁 '+(d.no||d.id)+' — '+(d.konu||'')+'</option>'; }); }
  else if (tur === 'icra') { (state.icra||[]).forEach(function(i) { sel.innerHTML += '<option value="'+i.id+'">⚡ '+(i.no||i.id)+' — '+(i.borclu||'')+'</option>'; }); }
}

function ihtarMasrafToggle() {
  var el = document.getElementById('ihtar-masraf-body');
  var btn = document.getElementById('ihtar-masraf-toggle');
  if (!el) return;
  if (el.style.display === 'none') { el.style.display = ''; if(btn) btn.textContent = '▼'; }
  else { el.style.display = 'none'; if(btn) btn.textContent = '▶'; }
}

async function saveIhtar() {
  var no = document.getElementById('ihtar-no').value.trim();
  var muvId = document.getElementById('ihtar-muv').value;
  var konu = document.getElementById('ihtar-konu').value.trim();
  if (!muvId) { notify('⚠️ Müvekkil seçiniz.'); return; }
  if (!konu) { notify('⚠️ Konu alanı zorunludur.'); return; }
  if (!state.ihtarnameler) state.ihtarnameler = [];

  var id = document.getElementById('ihtar-id').value;
  var gonderimUsulu = (document.getElementById('ihtar-gonderim')||{}).value || 'Noter';
  var gonderimDetay = {};
  if (gonderimUsulu === 'Noter') { gonderimDetay.noterAdi = (document.getElementById('ihtar-noter-adi')||{}).value||''; gonderimDetay.yevmiyeNo = (document.getElementById('ihtar-noter-yevmiye')||{}).value||''; }
  else if (gonderimUsulu === 'KEP') { gonderimDetay.kepAdresi = (document.getElementById('ihtar-kep-adres')||{}).value||''; gonderimDetay.delilNo = (document.getElementById('ihtar-kep-delil')||{}).value||''; }
  else if (gonderimUsulu === 'PTT') { gonderimDetay.barkodNo = (document.getElementById('ihtar-ptt-barkod')||{}).value||''; }

  var tebligDurum = (document.getElementById('ihtar-teblig-durum')||{}).value || 'Bekliyor';
  var tebligTarih = (document.getElementById('ihtar-teblig-tarih')||{}).value || '';
  var verilenSure = parseInt((document.getElementById('ihtar-verilen-sure')||{}).value) || 0;
  var masrafTutar = parseFloat((document.getElementById('ihtar-masraf')||{}).value) || 0;
  var masrafYansit = document.getElementById('ihtar-masraf-yansit')?.checked !== false;

  var sureSonu = (tebligTarih && verilenSure > 0) ? _hesaplaSure(tebligTarih, verilenSure) : null;

  var veri = {
    yon: (document.getElementById('ihtar-yon')||{}).value || 'Giden',
    tur: (document.getElementById('ihtar-tur')||{}).value || 'İhtarname',
    muvId: muvId,
    karsiTarafId: (document.getElementById('ihtar-karsi-id')||{}).value || '',
    karsiTaraf: _getKarsiAdById((document.getElementById('ihtar-karsi-id')||{}).value),
    konu: konu, no: no || autoNo('ihtarname'),
    gonderimUsulu: gonderimUsulu, gonderimDetay: gonderimDetay,
    noterlik: gonderimDetay.noterAdi || '', yevmiyeNo: gonderimDetay.yevmiyeNo || '',
    tarih: (document.getElementById('ihtar-tarih')||{}).value || today(),
    tebligDurum: tebligDurum, tebligTarih: tebligTarih,
    icindekiler: (document.getElementById('ihtar-icindekiler')||{}).value || '',
    ilgiliTur: (document.getElementById('ihtar-ilgili-tur')||{}).value || '',
    ilgiliDosyaId: (document.getElementById('ihtar-ilgili-dosya-id')||{}).value || '',
    masrafTutar: masrafTutar, masrafYansit: masrafYansit,
    verilenSure: verilenSure > 0 ? verilenSure : null,
    sureSonu: sureSonu,
  };

  var eskiDurum = id ? ((state.ihtarnameler.find(function(x){return x.id===id;})||{}).tebligDurum) : null;
  var kayitId = id || uid();
  var tamKayit = Object.assign({id: kayitId}, veri);

  // Masraf ve görev otomasyonlarını hazırla (henüz state'e yazma!)
  var masrafKayit = null;
  var gorevKayit = null;
  if (masrafTutar > 0 && masrafYansit) { masrafKayit = _masrafOtoHazirla(veri, kayitId); }
  if (tebligDurum === 'Tebliğ Edildi' && tebligTarih && verilenSure > 0 && (!eskiDurum || eskiDurum !== 'Tebliğ Edildi')) {
    gorevKayit = _gorevOtoHazirla(veri, kayitId);
  }

  // ── PESSIMİSTİC KAYDET ──
  // Buton loading → Supabase'e yaz → başarılıysa kapat
  // Hata dönerse modal AÇIK kalır, veri korunur
  if (typeof LexSubmit !== 'undefined') {
    var btn = document.querySelector('#ihtar-modal .btn-gold');
    var basarili = await LexSubmit.formKaydet({
      tablo: 'ihtarnameler',
      kayit: tamKayit,
      modalId: 'ihtar-modal',
      butonEl: btn,
      basariMesaj: '✓ İhtarname kaydedildi',
      renderFn: function() {
        if (masrafKayit) _masrafOtoUygula(masrafKayit, kayitId);
        if (gorevKayit) _gorevOtoUygula(gorevKayit, kayitId);
        renderIhtarname();
        if (typeof refreshFinansViews === 'function') refreshFinansViews({muvId: veri.muvId});
      }
    });
    if (!basarili) return; // Hata — modal açık, veri form'da duruyor
  } else {
    // Supabase yoksa eski davranış (localStorage only)
    if (id) {
      var idx = state.ihtarnameler.findIndex(function(x){return x.id===id;});
      if (idx >= 0) state.ihtarnameler[idx] = tamKayit;
    } else {
      if (!state.ihtarnameler) state.ihtarnameler = [];
      state.ihtarnameler.push(tamKayit);
    }
    if (masrafKayit) _masrafOtoUygula(masrafKayit, kayitId);
    if (gorevKayit) _gorevOtoUygula(gorevKayit, kayitId);
    saveData(); closeModal('ihtar-modal'); renderIhtarname(); updateBadges();
    notify('✓ İhtarname kaydedildi');
  }
}

function _hesaplaSure(tarih, gun) { var d = new Date(tarih); d.setDate(d.getDate() + gun); return d.toISOString().split('T')[0]; }

function _getKarsiAdById(id) { if(!id) return ''; var k = (state.karsiTaraflar||[]).find(function(x){return x.id===id;}); return k ? k.ad : ''; }

function _masrafOtoHazirla(veri, ihtarId) {
  return { id: uid(), _ihtarId: ihtarId, muvId: veri.muvId, tur: 'Masraf', tutar: veri.masrafTutar, acik: veri.no+' numaralı '+veri.tur+' masrafı', tarih: veri.tarih, durum: 'Bekliyor', odeme: '' };
}
function _masrafOtoUygula(kayit, ihtarId) {
  if (!state.avanslar) state.avanslar = [];
  var mevcutIdx = state.avanslar.findIndex(function(a){return a._ihtarId===ihtarId && a.tur==='Masraf';});
  if (mevcutIdx >= 0) state.avanslar[mevcutIdx] = kayit;
  else state.avanslar.push(kayit);
  saveData();
}

function _gorevOtoHazirla(veri, ihtarId) {
  var sureSonu = _hesaplaSure(veri.tebligTarih, veri.verilenSure);
  return { id: uid(), _ihtarId: ihtarId, _otoIhtar: true, baslik: veri.no+' — İhtarname Süresi Doldu', aciklama: 'Tebliğ: '+fmtD(veri.tebligTarih)+' | Süre: '+veri.verilenSure+' gün | Son gün: '+fmtD(sureSonu), sonTarih: sureSonu, durum: 'Bekliyor', oncelik: 'Yüksek', muvId: veri.muvId };
}
function _gorevOtoUygula(kayit, ihtarId) {
  if (!state.todolar) state.todolar = [];
  state.todolar = state.todolar.filter(function(t){return t._ihtarId !== ihtarId || !t._otoIhtar;});
  state.todolar.push(kayit);
  saveData();
}

async function deleteIhtar(id) {
  if (typeof LexSubmit !== 'undefined') {
    var basarili = await LexSubmit.formSil({
      tablo: 'ihtarnameler',
      id: id,
      onayMesaj: 'Bu ihtarnameyi silmek istediğinize emin misiniz?',
      basariMesaj: 'İhtarname silindi',
      renderFn: function() {
        state.avanslar = (state.avanslar||[]).filter(function(a){return a._ihtarId !== id;});
        state.todolar = (state.todolar||[]).filter(function(t){return t._ihtarId !== id || !t._otoIhtar;});
        saveData();
        renderIhtarname();
        if (typeof refreshFinansViews === 'function') refreshFinansViews();
        if (aktivIhtarId === id) showPage('ihtarname', document.getElementById('ni-ihtarname'));
      }
    });
  } else {
    if (!confirm('Bu ihtarnameyi silmek istediğinize emin misiniz?')) return;
    state.avanslar = (state.avanslar||[]).filter(function(a){return a._ihtarId !== id;});
    state.todolar = (state.todolar||[]).filter(function(t){return t._ihtarId !== id || !t._otoIhtar;});
    state.ihtarnameler = (state.ihtarnameler||[]).filter(function(i){return i.id!==id;});
    saveData(); renderIhtarname(); updateBadges();
    if (aktivIhtarId === id) showPage('ihtarname', document.getElementById('ni-ihtarname'));
    notify('İhtarname silindi');
  }
}

function openIhtarDetay(id) {
  var ih = (state.ihtarnameler||[]).find(function(x){return x.id===id;});
  if (!ih) return;
  aktivIhtarId = id;
  var yonRenk = ih.yon==='Giden'?'var(--blue)':'var(--purple)';
  var durRenk = ih.tebligDurum==='Tebliğ Edildi'?'var(--green)':ih.tebligDurum==='Bila'?'var(--red)':'#e67e22';
  var karsiAd = _getKarsiAd(ih);

  var dosyaBilgi = '—';
  if (ih.ilgiliTur === 'dava' && ih.ilgiliDosyaId) { var d = (state.davalar||[]).find(function(x){return x.id===ih.ilgiliDosyaId;}); if (d) dosyaBilgi = '<span onclick="showPage(\'davalar\',document.getElementById(\'ni-davalar\'));setTimeout(function(){openDavaDetay(\''+d.id+'\')},200)" style="color:var(--gold);cursor:pointer">📁 '+d.no+' — '+d.konu+'</span>'; }
  else if (ih.ilgiliTur === 'icra' && ih.ilgiliDosyaId) { var i = (state.icra||[]).find(function(x){return x.id===ih.ilgiliDosyaId;}); if (i) dosyaBilgi = '<span onclick="showPage(\'icra\',document.getElementById(\'ni-icra\'));setTimeout(function(){openIcraDetay(\''+i.id+'\')},200)" style="color:var(--gold);cursor:pointer">⚡ '+i.no+' — '+i.borclu+'</span>'; }

  var gd = ih.gonderimDetay || {};
  var gonderimBilgi = ih.gonderimUsulu || 'Noter';
  if (ih.gonderimUsulu === 'Noter') gonderimBilgi = '🏛 '+(gd.noterAdi||ih.noterlik||'—')+' | Yev: '+(gd.yevmiyeNo||ih.yevmiyeNo||'—');
  else if (ih.gonderimUsulu === 'KEP') gonderimBilgi = '📧 '+(gd.kepAdresi||'—')+' | Delil: '+(gd.delilNo||'—');
  else if (ih.gonderimUsulu === 'PTT') gonderimBilgi = '📮 Barkod: '+(gd.barkodNo||'—');

  var sureBilgi = '';
  if (ih.verilenSure && ih.sureSonu) {
    var bugun = today();
    var kalanGun = Math.ceil((new Date(ih.sureSonu) - new Date(bugun)) / 86400000);
    var renk = kalanGun <= 0 ? '#e74c3c' : kalanGun <= 3 ? '#e67e22' : 'var(--green)';
    var durum = kalanGun <= 0 ? '⏰ SÜRESİ DOLDU' : kalanGun <= 3 ? '⚠️ '+kalanGun+' gün kaldı' : kalanGun+' gün kaldı';
    sureBilgi = '<div style="background:'+renk+'11;border:1px solid '+renk+';border-radius:var(--radius);padding:14px;margin-bottom:18px;display:flex;align-items:center;gap:12px"><div style="font-size:28px">'+(kalanGun<=0?'🔴':kalanGun<=3?'🟡':'🟢')+'</div><div><div style="font-size:13px;font-weight:700;color:'+renk+'">'+durum+'</div><div style="font-size:11px;color:var(--text-muted)">Muhataba '+ih.verilenSure+' gün süre verildi · Son gün: '+fmtD(ih.sureSonu)+'</div></div></div>';
  }

  document.getElementById('ihtar-detay-icerik').innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px"><div>'
    + '<h2 style="font-family:\'Playfair Display\',serif;font-size:20px;color:var(--text)">'+(ih.no||'—')+'</h2>'
    + '<div style="margin-top:4px;display:flex;gap:8px;flex-wrap:wrap">'
    + '<span style="background:'+yonRenk+'22;color:'+yonRenk+';padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700">'+ih.yon+'</span>'
    + '<span style="background:var(--surface2);color:var(--text-muted);padding:3px 10px;border-radius:4px;font-size:11px">'+(ih.tur||'İhtarname')+'</span>'
    + '<span style="color:'+durRenk+';font-size:11px;font-weight:600">● '+(ih.tebligDurum||'Bekliyor')+'</span>'
    + '</div></div>'
    + '<div style="display:flex;gap:8px"><button class="btn btn-outline" onclick="openIhtarModal(\''+ih.id+'\')">✏️ Düzenle</button><button class="btn btn-outline" style="color:var(--red);border-color:var(--red)" onclick="deleteIhtar(\''+ih.id+'\')">🗑️</button></div></div>'
    + sureBilgi
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px">'
    + bilgiKutusu('Müvekkil', getMuvAd(ih.muvId))
    + bilgiKutusu('Karşı Taraf', karsiAd)
    + bilgiKutusu('Gönderim Usulü', gonderimBilgi)
    + bilgiKutusu('Düzenleme Tarihi', fmtD(ih.tarih))
    + bilgiKutusu('Tebliğ Durumu', '<span style="color:'+durRenk+';font-weight:600">'+(ih.tebligDurum||'Bekliyor')+'</span>')
    + (ih.tebligTarih ? bilgiKutusu('Tebliğ Tarihi', fmtD(ih.tebligTarih)) : '')
    + (ih.masrafTutar ? bilgiKutusu('Masraf', '<span style="color:#e74c3c;font-weight:700">'+fmt(ih.masrafTutar)+'</span>'+(ih.masrafYansit?' <span style="font-size:10px;color:var(--green)">✓ Yansıtıldı</span>':'')) : '')
    + bilgiKutusu('İlgili Dosya', dosyaBilgi)
    + '</div>'
    + (ih.konu ? '<div class="section"><div class="section-header"><div class="section-title">Konu</div></div><div class="section-body"><p style="font-size:13px;line-height:1.7">'+ih.konu+'</p></div></div>' : '')
    + (ih.icindekiler ? '<div class="section"><div class="section-header"><div class="section-title">İçindekiler / Talepler</div></div><div class="section-body"><p style="font-size:13px;line-height:1.7;white-space:pre-wrap">'+ih.icindekiler+'</p></div></div>' : '');

  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.getElementById('page-ihtar-detay').classList.add('active');
}

function bilgiKutusu(label, val) {
  return '<div style="background:var(--surface2);border-radius:var(--radius);padding:12px"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">'+label+'</div><div style="font-size:13px;font-weight:500">'+val+'</div></div>';
}
