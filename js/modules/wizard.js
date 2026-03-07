// ================================================================
// LEXBASE — WIZARD (ADIMLI FORM) SİSTEMİ
// js/modules/wizard.js
//
// Uzun formları adımlara böler. Her modal için ayrı konfigürasyon.
// ================================================================

const Wizard = (function() {

  const _instances = {};

  function olustur(modalId, config) {
    // config: { adimlar: [{baslik, ikon, panelId}], bitirFn }
    const inst = {
      modalId,
      adimlar: config.adimlar,
      bitirFn: config.bitirFn,
      aktifAdim: 0,
    };
    _instances[modalId] = inst;
    return inst;
  }

  function render(modalId) {
    const inst = _instances[modalId];
    if (!inst) return;

    // Progress bar
    const progEl = document.getElementById(modalId + '-wiz-progress');
    if (progEl) {
      progEl.innerHTML = `<div class="wizard-line"></div>` +
        inst.adimlar.map((a, i) => {
          const durum = i < inst.aktifAdim ? 'done' : i === inst.aktifAdim ? 'active' : '';
          return `<div class="wizard-step-indicator ${durum}">
            <div class="wizard-step-dot">${i < inst.aktifAdim ? '✓' : (i + 1)}</div>
            <div class="wizard-step-label">${a.baslik}</div>
          </div>`;
        }).join('');
    }

    // Paneller
    inst.adimlar.forEach((a, i) => {
      const panel = document.getElementById(a.panelId);
      if (panel) {
        panel.classList.toggle('active', i === inst.aktifAdim);
      }
    });

    // Footer butonları
    const footerEl = document.getElementById(modalId + '-wiz-footer');
    if (footerEl) {
      const ilkMi = inst.aktifAdim === 0;
      const sonMu = inst.aktifAdim === inst.adimlar.length - 1;
      footerEl.innerHTML = `
        <button class="btn btn-outline" onclick="Wizard.iptal('${modalId}')">İptal</button>
        <div style="display:flex;gap:8px">
          ${!ilkMi ? `<button class="btn btn-outline" onclick="Wizard.geri('${modalId}')">← Geri</button>` : ''}
          ${!sonMu
            ? `<button class="btn btn-gold" onclick="Wizard.ileri('${modalId}')">İleri →</button>`
            : `<button class="btn btn-gold" onclick="Wizard.bitir('${modalId}')">✓ Kaydet</button>`
          }
        </div>`;
    }

    // Adım sayacı
    const sayacEl = document.getElementById(modalId + '-wiz-sayac');
    if (sayacEl) sayacEl.textContent = `Adım ${inst.aktifAdim + 1} / ${inst.adimlar.length}`;
  }

  function ileri(modalId) {
    const inst = _instances[modalId];
    if (!inst) return;

    // Mevcut adımda zorunlu alan kontrolü
    const adim = inst.adimlar[inst.aktifAdim];
    if (adim.dogrula && !adim.dogrula()) return;

    if (inst.aktifAdim < inst.adimlar.length - 1) {
      inst.aktifAdim++;
      render(modalId);
    }
  }

  function geri(modalId) {
    const inst = _instances[modalId];
    if (!inst) return;
    if (inst.aktifAdim > 0) {
      inst.aktifAdim--;
      render(modalId);
    }
  }

  function bitir(modalId) {
    const inst = _instances[modalId];
    if (!inst) return;
    // Son adım doğrulama
    const adim = inst.adimlar[inst.aktifAdim];
    if (adim.dogrula && !adim.dogrula()) return;
    if (inst.bitirFn) inst.bitirFn();
  }

  function iptal(modalId) {
    closeModal(modalId);
  }

  function sifirla(modalId) {
    const inst = _instances[modalId];
    if (inst) {
      inst.aktifAdim = 0;
      render(modalId);
    }
  }

  return { olustur, render, ileri, geri, bitir, iptal, sifirla };
})();
