// ================================================================
// EMD HUKUK — GÖREV YÖNETİCİSİ (TODO)
// js/modules/todo.js
// ================================================================

const TODO_ONCELIK_RENK = { 'Yüksek': '#e74c3c', 'Orta': '#f39c12', 'Düşük': '#27ae60' };
const TODO_ONCELIK_IKON = { 'Yüksek': '🔴', 'Orta': '🟡', 'Düşük': '🟢' };
const TODO_DURUM_RENK = { 'Bekliyor': '#e67e22', 'Devam Ediyor': '#2980b9', 'Tamamlandı': '#27ae60', 'İptal': '#95a5a6' };

// ── ListeMotoru kaydı ──
ListeMotoru.register('todo', {
  containerId: 'todo-liste-body',
  kpiBarId: 'todo-cards',
  filterRowId: 'todo-filter-row',
  chipContainerId: 'todo-chips',
  searchInputId: 'todo-s',
  sortTabloKey: 'todo',
  defaultSort: { key: 'sonTarih', dir: 1 },
  dateField: 'sonTarih',
  renderMode: 'card',
  emptyText: 'Henüz görev eklenmemiş',

  getData: function() {
    var liste = state.todolar || [];
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.rol !== 'sahip') {
      var pk = (state.personel || []).find(function(p) { return p.hesap && p.hesap.email === currentUser.email; });
      if (pk) liste = liste.filter(function(t) { return t.atananId === pk.id || !t.atananId; });
    }
    return liste;
  },

  groupBy: {
    fn: function(t) {
      var bugun = today();
      var f7 = new Date(); f7.setDate(f7.getDate() + 7);
      var f7S = f7.toISOString().split('T')[0];
      if (t.durum === 'Tamamlandı' || t.durum === 'İptal') return 'Tamamlandi / Iptal';
      if (t.sonTarih && t.sonTarih < bugun) return 'Gecikmis';
      if (t.sonTarih === bugun) return 'Bugün';
      if (t.sonTarih > bugun && t.sonTarih <= f7S) return 'Bu Hafta';
      return 'Diger';
    },
    order: ['Gecikmis', 'Bugün', 'Bu Hafta', 'Diger', 'Tamamlandi / Iptal'],
    colors: { 'Gecikmis': '#e74c3c', 'Bugün': '#e67e22', 'Bu Hafta': '#f39c12', 'Diger': 'var(--text-muted)', 'Tamamlandi / Iptal': 'var(--text-dim)' },
  },

  cardRenderer: function(t, isYeni) {
    var atanan = t.atananId ? ((state.personel || []).find(function(p) { return p.id === t.atananId; }) || {}).ad || '?' : 'Ben';
    var dosyaLink = todoGetDosyaLink(t);
    var durRenk = TODO_DURUM_RENK[t.durum] || 'var(--text-muted)';
    var tamamlandi = t.durum === 'Tamamlandı' || t.durum === 'İptal';
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;margin-bottom:6px;display:flex;align-items:flex-start;gap:12px;' + (tamamlandi ? 'opacity:.6' : '') + (isYeni ? ';border-left:3px solid var(--gold)' : '') + '">' +
      '<div style="margin-top:2px;cursor:pointer;font-size:18px" onclick="todoToggleTamamla(\'' + t.id + '\')" title="' + (tamamlandi ? 'Geri al' : 'Tamamlandi olarak isaretle') + '">' +
        (t.durum === 'Tamamlandı' ? '☑️' : '⬜') +
      '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">' +
          '<span style="font-size:13px;font-weight:600;' + (tamamlandi ? 'text-decoration:line-through;color:var(--text-muted)' : '') + '">' + t.baslik + '</span>' +
          (isYeni ? ' <span class="lm-yeni-badge">YENİ</span>' : '') +
          '<span style="font-size:10px">' + (TODO_ONCELIK_IKON[t.oncelik] || '') + '</span>' +
          '<span style="font-size:10px;font-weight:700;color:' + durRenk + ';background:' + durRenk + '22;padding:1px 6px;border-radius:3px">' + t.durum + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--text-muted)">' +
          (t.sonTarih ? '<span>' + fmtD(t.sonTarih) + '</span>' : '') +
          '<span>' + atanan + '</span>' +
          (dosyaLink ? '<span>' + dosyaLink + '</span>' : '') +
          (t.muvId ? '<span>' + getMuvAd(t.muvId) + '</span>' : '') +
        '</div>' +
        (t.aciklama ? '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">' + t.aciklama + '</div>' : '') +
      '</div>' +
      '<div style="display:flex;gap:4px;flex-shrink:0">' +
        '<button class="btn" style="padding:4px 8px;font-size:11px" onclick="openTodoModal(\'' + t.id + '\')">✏️</button>' +
        '<button class="delete-btn" onclick="deleteTodo(\'' + t.id + '\')">✕</button>' +
      '</div>' +
    '</div>';
  },

  filters: [
    { key: 'durum', label: 'Durum', options: ['Bekliyor', 'Devam Ediyor', 'Tamamlandı', 'İptal'] },
    { key: 'oncelik', label: 'Öncelik', options: ['Yüksek', 'Orta', 'Düşük'] },
  ],

  kpiCards: [
    { label: 'Toplam', valueClass: 'gold', calc: function(all) { return all.length; } },
    { label: 'Bekliyor', valueColor: '#e67e22', calc: function(all) {
      return all.filter(function(t) { return t.durum === 'Bekliyor'; }).length;
    }, filterOnClick: { key: 'durum', value: 'Bekliyor' } },
    { label: 'Devam Eden', valueColor: '#2980b9', calc: function(all) {
      return all.filter(function(t) { return t.durum === 'Devam Ediyor'; }).length;
    }, filterOnClick: { key: 'durum', value: 'Devam Ediyor' } },
    { label: 'Tamamlanan', valueColor: '#27ae60', calc: function(all) {
      return all.filter(function(t) { return t.durum === 'Tamamlandı'; }).length;
    }, filterOnClick: { key: 'durum', value: 'Tamamlandı' } },
  ],

  searchFn: function(item, q) {
    return (item.baslik || '').toLowerCase().includes(q) ||
      (item.aciklama || '').toLowerCase().includes(q) ||
      getMuvAd(item.muvId).toLowerCase().includes(q);
  },
});

function renderTodo() {
  ListeMotoru.render('todo');
  // Badge güncelle
  var bekleyen = (state.todolar || []).filter(function(t) { return t.durum === 'Bekliyor' || t.durum === 'Devam Ediyor'; }).length;
  var nbTodo = document.getElementById('nb-todo');
  if (nbTodo) nbTodo.textContent = bekleyen;
}

function todoGetDosyaLink(t) {
  if (!t.dosyaId || !t.dosyaTur) return '';
  if (t.dosyaTur === 'dava') {
    const d = state.davalar.find(x=>x.id===t.dosyaId);
    return d ? `📁 ${d.no||'Dava'}` : '';
  } else if (t.dosyaTur === 'icra') {
    const i = state.icra.find(x=>x.id===t.dosyaId);
    return i ? `⚡ ${i.no||'İcra'}` : '';
  } else if (t.dosyaTur === 'danismanlik') {
    const d = state.danismanlik.find(x=>x.id===t.dosyaId);
    return d ? `⚖️ ${d.konu||'Danışmanlık'}` : '';
  }
  return '';
}

function todoToggleTamamla(id) {
  const t = (state.todolar||[]).find(x=>x.id===id);
  if (!t) return;
  if (t.durum === 'Tamamlandı') {
    t.durum = 'Bekliyor';
    t.tamamlanmaTarih = null;
  } else {
    t.durum = 'Tamamlandı';
    t.tamamlanmaTarih = today();
  }
  saveData();
  renderTodo();
}

function openTodoModal(id) {
  // Personel listesini doldur
  const atananSel = document.getElementById('todo-atanan');
  atananSel.innerHTML = '<option value="">— Kendim (atanmamış) —</option>';
  state.personel.filter(p=>p.durum==='Aktif').forEach(p => {
    atananSel.innerHTML += `<option value="${p.id}">${p.ad} (${p.rol})</option>`;
  });

  // Müvekkil listesi
  const muvSel = document.getElementById('todo-muv-id');
  muvSel.innerHTML = '<option value="">— Opsiyonel —</option>';
  state.muvekkillar.forEach(m => muvSel.innerHTML += `<option value="${m.id}">${m.ad}</option>`);

  // Formu temizle
  ['todo-id','todo-baslik','todo-aciklama'].forEach(f => { const el=document.getElementById(f); if(el) el.value=''; });
  document.getElementById('todo-son-tarih').value = '';
  document.getElementById('todo-oncelik').value = 'Orta';
  document.getElementById('todo-dosya-tur').value = '';
  document.getElementById('todo-dosya-id').innerHTML = '<option value="">— Seçin —</option>';
  document.getElementById('todo-modal-title').textContent = 'Yeni Görev';

  if (id) {
    const t = (state.todolar||[]).find(x=>x.id===id);
    if (t) {
      document.getElementById('todo-id').value = t.id;
      document.getElementById('todo-baslik').value = t.baslik||'';
      document.getElementById('todo-aciklama').value = t.aciklama||'';
      document.getElementById('todo-oncelik').value = t.oncelik||'Orta';
      document.getElementById('todo-son-tarih').value = t.sonTarih||'';
      document.getElementById('todo-atanan').value = t.atananId||'';
      document.getElementById('todo-muv-id').value = t.muvId||'';
      document.getElementById('todo-dosya-tur').value = t.dosyaTur||'';
      todoDosyaDoldur(t.dosyaTur||'', t.dosyaId);
      document.getElementById('todo-modal-title').textContent = 'Görevi Düzenle';
    }
  }

  openModal('todo-modal');
}

function todoDosyaDoldur(tur, seciliId) {
  const sel = document.getElementById('todo-dosya-id');
  sel.innerHTML = '<option value="">— Seçin —</option>';
  if (tur === 'dava') state.davalar.forEach(d => sel.innerHTML += `<option value="${d.id}"${d.id===seciliId?' selected':''}>${d.no||d.id} — ${d.konu||''}</option>`);
  else if (tur === 'icra') state.icra.forEach(i => sel.innerHTML += `<option value="${i.id}"${i.id===seciliId?' selected':''}>${i.no||i.id} — ${i.borclu||''}</option>`);
  else if (tur === 'danismanlik') state.danismanlik.forEach(d => sel.innerHTML += `<option value="${d.id}"${d.id===seciliId?' selected':''}>${d.konu||d.id}</option>`);
  else if (tur === 'arabuluculuk') (state.arabuluculuk||[]).forEach(a => sel.innerHTML += `<option value="${a.id}"${a.id===seciliId?' selected':''}>${a.no||a.id}</option>`);
}

function saveTodo() {
  const baslik = document.getElementById('todo-baslik').value.trim();
  if (!baslik) { notify('⚠️ Başlık zorunludur.'); return; }

  if (!state.todolar) state.todolar = [];

  const id = document.getElementById('todo-id').value;
  const veri = {
    baslik,
    aciklama: document.getElementById('todo-aciklama').value.trim(),
    oncelik: document.getElementById('todo-oncelik').value,
    sonTarih: document.getElementById('todo-son-tarih').value,
    atananId: document.getElementById('todo-atanan').value,
    muvId: document.getElementById('todo-muv-id').value,
    dosyaTur: document.getElementById('todo-dosya-tur').value,
    dosyaId: document.getElementById('todo-dosya-id').value,
    olusturanId: currentUser?.id || 'sahip',
  };

  var kayit;
  if (id) {
    const idx = state.todolar.findIndex(x=>x.id===id);
    if (idx >= 0) { kayit = {...state.todolar[idx], ...veri}; }
    else return;
  } else {
    kayit = { id: uid(), durum: 'Bekliyor', olusturmaTarih: today(), ...veri };
  }

  if (typeof LexSubmit !== 'undefined') {
    var btn = document.querySelector('#todo-modal .btn-gold');
    LexSubmit.formKaydet({tablo:'todolar', kayit:kayit, modalId:'todo-modal', butonEl:btn, basariMesaj:'✓ Görev kaydedildi',
      renderFn:function(){ renderTodo(); updateBadges(); }
    });
  } else {
    if (id) { const idx2 = state.todolar.findIndex(x=>x.id===id); if(idx2>=0) state.todolar[idx2]=kayit; }
    else state.todolar.push(kayit);
    saveData(); closeModal('todo-modal'); renderTodo(); notify('✓ Görev kaydedildi');
  }
}

async function deleteTodo(id) {
  if (typeof LexSubmit !== 'undefined') {
    await LexSubmit.formSil({tablo:'todolar', id:id, onayMesaj:'Bu görevi silmek istediğinize emin misiniz?', basariMesaj:'Görev silindi',
      renderFn:function(){ renderTodo(); updateBadges(); }
    });
  } else {
    if (!confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
    state.todolar = (state.todolar||[]).filter(t=>t.id!==id);
    saveData(); renderTodo(); notify('Görev silindi');
  }
}
