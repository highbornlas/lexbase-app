// ================================================================
// LEXBASE — KANBAN PANO (Sürükle-Bırak)
// js/modules/kanban.js
//
// Davalar ve görevler için Kanban görünümü.
// HTML5 Drag & Drop API kullanır — kütüphane yok.
// ================================================================

const Kanban = (function() {

  // ── Dava Kanban Sütunları ──────────────────────────────────
  const DAVA_SUTUNLAR = [
    { id: 'hazirlik', baslik: 'Hazırlık', renk: '#3498db', durumlar: ['Devam Ediyor'] },
    { id: 'aktif', baslik: 'Aktif / Duruşma', renk: '#e67e22', durumlar: ['Aktif'] },
    { id: 'beklemede', baslik: 'Beklemede', renk: '#f39c12', durumlar: ['Beklemede'] },
    { id: 'istinaf', baslik: 'İstinaf', renk: '#8e44ad', asamalar: ['İstinaf'] },
    { id: 'yargitay', baslik: 'Yargıtay', renk: '#2c3e50', asamalar: ['Yargıtay'] },
    { id: 'kapandi', baslik: 'Kesinleşti / Kapandı', renk: '#27ae60', durumlar: ['Kapandı'], asamalar: ['Kesinleşti', 'Düşürüldü'] },
  ];

  // ── Görev Kanban Sütunları ─────────────────────────────────
  const GOREV_SUTUNLAR = [
    { id: 'bekliyor', baslik: 'Bekliyor', renk: '#3498db', durumlar: ['Bekliyor', 'bekliyor'] },
    { id: 'devam', baslik: 'Devam Ediyor', renk: '#e67e22', durumlar: ['Devam Ediyor', 'devam'] },
    { id: 'onayda', baslik: 'Onay Bekliyor', renk: '#f39c12', durumlar: ['Onay Bekliyor', 'onayda'] },
    { id: 'tamamlandi', baslik: 'Tamamlandı', renk: '#27ae60', durumlar: ['Tamamlandı', 'tamamlandi', 'yapildi'] },
  ];

  let _dragItem = null;
  let _dragType = '';

  // ── Dava → Sütun Eşleştirme ────────────────────────────────
  function davaSutunBul(dava) {
    for (const s of DAVA_SUTUNLAR) {
      if (s.asamalar && s.asamalar.includes(dava.asama)) return s.id;
      if (s.durumlar && s.durumlar.includes(dava.durum)) return s.id;
    }
    return 'aktif'; // varsayılan
  }

  function gorevSutunBul(gorev) {
    for (const s of GOREV_SUTUNLAR) {
      if (s.durumlar && s.durumlar.includes(gorev.durum)) return s.id;
    }
    return 'bekliyor';
  }

  // ── Render: Dava Kanban ────────────────────────────────────
  function renderDavaKanban() {
    const el = document.getElementById('kanban-davalar');
    if (!el) return;
    const davalar = state.davalar || [];

    // Sütunlara dağıt
    const gruplar = {};
    DAVA_SUTUNLAR.forEach(s => gruplar[s.id] = []);
    davalar.forEach(d => {
      const sutun = davaSutunBul(d);
      if (gruplar[sutun]) gruplar[sutun].push(d);
    });

    el.innerHTML = DAVA_SUTUNLAR.map(s => `
      <div class="kanban-col" data-sutun="${s.id}" data-tip="dava">
        <div class="kanban-col-header" style="border-top:3px solid ${s.renk}">
          <span class="kanban-col-title">${s.baslik}</span>
          <span class="kanban-col-count">${gruplar[s.id].length}</span>
        </div>
        <div class="kanban-col-body" data-sutun="${s.id}"
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="Kanban.drop(event,this)">
          ${gruplar[s.id].map(d => davaKart(d)).join('')}
          ${gruplar[s.id].length === 0 ? '<div style="font-size:11px;color:var(--text-dim);text-align:center;padding:20px 0">Dosya yok</div>' : ''}
        </div>
      </div>`).join('');
  }

  function davaKart(d) {
    const asamaRenk = { 'İlk Derece': '#3498db', 'İstinaf': '#8e44ad', 'Yargıtay': '#2c3e50', 'Kesinleşti': '#27ae60' };
    return `<div class="kanban-card" draggable="true" data-id="${d.id}" data-tip="dava"
      ondragstart="Kanban.dragStart(event)" ondragend="Kanban.dragEnd(event)"
      onclick="openDavaDetay('${d.id}')">
      <div class="kanban-card-title">${d.no}</div>
      <div class="kanban-card-meta">
        ${d.konu}<br>
        👤 ${getMuvAd(d.muvId)}
        ${d.karsi ? '<br>⚔️ ' + d.karsi : ''}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">
        <span class="kanban-card-badge" style="background:${(asamaRenk[d.asama] || '#566573')}22;color:${asamaRenk[d.asama] || '#566573'}">${d.asama || '—'}</span>
        ${d.durusma ? `<span class="kanban-card-badge" style="background:rgba(230,126,34,.1);color:#e67e22">📅 ${fmtD(d.durusma)}</span>` : ''}
      </div>
    </div>`;
  }

  // ── Render: Görev Kanban ───────────────────────────────────
  function renderGorevKanban() {
    const el = document.getElementById('kanban-gorevler');
    if (!el) return;
    const gorevler = state.todolar || [];

    const gruplar = {};
    GOREV_SUTUNLAR.forEach(s => gruplar[s.id] = []);
    gorevler.forEach(g => {
      const sutun = gorevSutunBul(g);
      if (gruplar[sutun]) gruplar[sutun].push(g);
    });

    el.innerHTML = GOREV_SUTUNLAR.map(s => `
      <div class="kanban-col" data-sutun="${s.id}" data-tip="gorev">
        <div class="kanban-col-header" style="border-top:3px solid ${s.renk}">
          <span class="kanban-col-title">${s.baslik}</span>
          <span class="kanban-col-count">${gruplar[s.id].length}</span>
        </div>
        <div class="kanban-col-body" data-sutun="${s.id}"
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="Kanban.drop(event,this)">
          ${gruplar[s.id].map(g => gorevKart(g)).join('')}
          ${gruplar[s.id].length === 0 ? '<div style="font-size:11px;color:var(--text-dim);text-align:center;padding:20px 0">Görev yok</div>' : ''}
        </div>
      </div>`).join('');
  }

  function gorevKart(g) {
    const oncelikRenk = { Yüksek: '#e74c3c', Normal: '#e67e22', Düşük: '#27ae60' };
    const renk = oncelikRenk[g.oncelik] || '#566573';
    return `<div class="kanban-card" draggable="true" data-id="${g.id}" data-tip="gorev"
      ondragstart="Kanban.dragStart(event)" ondragend="Kanban.dragEnd(event)">
      <div class="kanban-card-title">${g.baslik || '—'}</div>
      <div class="kanban-card-meta">
        ${g.muvId ? '👤 ' + getMuvAd(g.muvId) : ''}
        ${g.sonTarih ? '<br>📅 ' + fmtD(g.sonTarih) : ''}
      </div>
      ${g.oncelik ? `<span class="kanban-card-badge" style="background:${renk}22;color:${renk}">${g.oncelik}</span>` : ''}
    </div>`;
  }

  // ── Drag & Drop ────────────────────────────────────────────
  function dragStart(e) {
    _dragItem = e.target.closest('.kanban-card');
    _dragType = _dragItem?.dataset.tip || '';
    setTimeout(() => { if (_dragItem) _dragItem.classList.add('dragging'); }, 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', _dragItem?.dataset.id || '');
  }

  function dragEnd(e) {
    if (_dragItem) _dragItem.classList.remove('dragging');
    document.querySelectorAll('.kanban-col-body.drag-over').forEach(el => el.classList.remove('drag-over'));
    _dragItem = null;
  }

  function drop(e, colBody) {
    e.preventDefault();
    colBody.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const hedefSutun = colBody.dataset.sutun;
    if (!id || !hedefSutun) return;

    if (_dragType === 'dava') {
      const dava = getDava(id);
      if (!dava) return;
      // Hedef sütunun durum/aşamasını ata
      const sutunConf = DAVA_SUTUNLAR.find(s => s.id === hedefSutun);
      if (!sutunConf) return;
      if (sutunConf.asamalar && sutunConf.asamalar.length) dava.asama = sutunConf.asamalar[0];
      if (sutunConf.durumlar && sutunConf.durumlar.length) dava.durum = sutunConf.durumlar[0];
      saveData();
      renderDavaKanban();
      notify(`✓ "${dava.no}" → ${sutunConf.baslik}`);
    }
    else if (_dragType === 'gorev') {
      const gorev = (state.todolar || []).find(t => t.id === id);
      if (!gorev) return;
      const sutunConf = GOREV_SUTUNLAR.find(s => s.id === hedefSutun);
      if (!sutunConf) return;
      gorev.durum = sutunConf.durumlar[0];
      saveData();
      renderGorevKanban();
      notify(`✓ Görev → ${sutunConf.baslik}`);
    }
  }

  return {
    renderDavaKanban,
    renderGorevKanban,
    dragStart,
    dragEnd,
    drop,
  };

})();
