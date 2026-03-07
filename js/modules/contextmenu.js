// ================================================================
// LEXBASE — CONTEXT MENU (⋮ ÜÇ NOKTA MENÜSÜ)
// js/modules/contextmenu.js
// ================================================================

const CtxMenu = (function() {
  let _menuEl = null;

  function init() {
    _menuEl = document.createElement('div');
    _menuEl.className = 'ctx-menu';
    _menuEl.id = 'ctx-menu-global';
    document.body.appendChild(_menuEl);
    document.addEventListener('click', kapat);
    document.addEventListener('scroll', kapat, true);
  }

  function kapat() {
    if (_menuEl) _menuEl.classList.remove('open');
  }

  function goster(e, items) {
    e.stopPropagation();
    e.preventDefault();
    if (!_menuEl) init();

    _menuEl.innerHTML = items.map(item => {
      if (item === '---') return '<div class="ctx-divider"></div>';
      return `<button class="ctx-item ${item.danger ? 'danger' : ''}" data-idx="${items.indexOf(item)}">
        ${item.icon || ''} ${item.label}
      </button>`;
    }).join('');

    // Event binding
    _menuEl.querySelectorAll('.ctx-item').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.idx);
        if (items[idx] && items[idx].fn) items[idx].fn();
        kapat();
      });
    });

    // Pozisyon
    const rect = e.currentTarget.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.right - 170;

    // Ekran dışına çıkmasın
    if (top + 200 > window.innerHeight) top = rect.top - 200;
    if (left < 8) left = 8;

    _menuEl.style.top = top + 'px';
    _menuEl.style.left = left + 'px';
    _menuEl.classList.add('open');
  }

  // Hazır menü oluşturucular
  function davaMenu(e, davaId) {
    goster(e, [
      { icon: '👁️', label: 'Görüntüle', fn: () => openDavaDetay(davaId) },
      { icon: '✏️', label: 'Düzenle', fn: () => { openDavaDetay(davaId); setTimeout(() => { if(typeof editDava === 'function') editDava(davaId); }, 300); }},
      '---',
      { icon: '📋', label: 'Dosya No Kopyala', fn: () => { const d = getDava(davaId); if(d) { navigator.clipboard.writeText(d.no); notify('📋 Kopyalandı'); }}},
      '---',
      { icon: '🗑️', label: 'Sil', danger: true, fn: () => deleteDavaById(davaId) },
    ]);
  }

  function icraMenu(e, icraId) {
    goster(e, [
      { icon: '👁️', label: 'Görüntüle', fn: () => openIcraDetay(icraId) },
      { icon: '✏️', label: 'Düzenle', fn: () => { openIcraDetay(icraId); setTimeout(() => { if(typeof editIcra === 'function') editIcra(icraId); }, 300); }},
      '---',
      { icon: '📋', label: 'Dosya No Kopyala', fn: () => { const i = getIcra(icraId); if(i) { navigator.clipboard.writeText(i.no); notify('📋 Kopyalandı'); }}},
      '---',
      { icon: '🗑️', label: 'Sil', danger: true, fn: () => deleteIcraById(icraId) },
    ]);
  }

  function muvMenu(e, muvId) {
    goster(e, [
      { icon: '👁️', label: 'Detay Görüntüle', fn: () => openDetay(muvId) },
      { icon: '✏️', label: 'Düzenle', fn: () => { openDetay(muvId); setTimeout(() => { if(typeof openMuvEdit === 'function') openMuvEdit(); }, 300); }},
      '---',
      { icon: '📞', label: 'Telefon Kopyala', fn: () => { const m = getMuv(muvId); if(m && m.tel) { navigator.clipboard.writeText(m.tel); notify('📋 Kopyalandı'); } else notify('⚠️ Telefon yok'); }},
      { icon: '📧', label: 'E-posta Kopyala', fn: () => { const m = getMuv(muvId); if(m && m.mail) { navigator.clipboard.writeText(m.mail); notify('📋 Kopyalandı'); } else notify('⚠️ E-posta yok'); }},
      '---',
      { icon: '🗑️', label: 'Sil', danger: true, fn: () => { if(typeof deleteMuvekkil === 'function') { aktivMuvId = muvId; deleteMuvekkil(); }}},
    ]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 100);

  return { goster, kapat, davaMenu, icraMenu, muvMenu };
})();
