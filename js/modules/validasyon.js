// ================================================================
// LEXBASE — GLOBAL VALIDASYON
// js/modules/validasyon.js
//
// Tüm IBAN ve TCKN input'larına otomatik blur/input doğrulaması
// ekler. Kaydet butonlarını geçersiz alan varsa bloke eder.
// ================================================================

(function () {

  // ── Hata göster / temizle (ui.js'deki fonksiyonları kullan) ──
  function hataGoster(input, mesaj) {
    input.style.borderColor = 'var(--red)';
    input.style.boxShadow = '0 0 0 2px var(--red-dim)';
    let el = input.parentNode.querySelector('.input-hata');
    if (!el) {
      el = document.createElement('div');
      el.className = 'input-hata';
      el.style.cssText = 'font-size:11px;color:#e74c3c;margin-top:4px;display:flex;align-items:center;gap:4px;';
      input.parentNode.appendChild(el);
    }
    el.innerHTML = '⚠️ ' + mesaj;
    input.dataset.gecersiz = '1';
  }

  function hataTemizle(input) {
    input.style.borderColor = '';
    input.style.boxShadow = '';
    const el = input.parentNode.querySelector('.input-hata');
    if (el) el.remove();
    delete input.dataset.gecersiz;
  }

  // ── IBAN input kurulumu ───────────────────────────────────────
  function ibanKur(input) {
    if (input.dataset.valKuruldu) return;
    input.dataset.valKuruldu = '1';

    // Maskeleme: TR sabit, her 4 rakamda boşluk, max 32 görsel karakter
    input.setAttribute('maxlength', '32');
    input.style.fontFamily = 'monospace';
    input.style.letterSpacing = '1px';
    input.setAttribute('placeholder', 'TR00 0000 0000 0000 0000 0000 00');

    input.addEventListener('keydown', function (e) {
      // TR prefix'ini silmeye izin verme
      const pos = this.selectionStart;
      if ((e.key === 'Backspace' || e.key === 'Delete') && pos <= 2 && this.selectionStart === this.selectionEnd) {
        e.preventDefault();
      }
    });

    input.addEventListener('input', function () {
      let v = this.value.replace(/\s/g, '').toUpperCase();
      if (!v.startsWith('TR')) v = 'TR' + v.replace(/^[A-Z]{0,2}/, '');
      v = v.replace(/[^TR0-9]/g, '');
      // Sadece TR + rakam
      v = 'TR' + v.slice(2).replace(/\D/g, '');
      v = v.slice(0, 26);
      // Boşluklu format
      let fmt = v.slice(0, 4);
      for (let i = 4; i < v.length; i += 4) fmt += ' ' + v.slice(i, i + 4);
      this.value = fmt;
      hataTemizle(this);
    });

    input.addEventListener('blur', function () {
      const deger = this.value.trim();
      if (!deger || deger === 'TR') { hataTemizle(this); return; }
      const sonuc = ibanDogrula(deger);
      if (!sonuc.gecerli) hataGoster(this, sonuc.mesaj);
      else hataTemizle(this);
    });

    input.addEventListener('focus', function () {
      // TR yoksa ekle
      if (!this.value.trim()) this.value = 'TR';
    });
  }

  // ── TCKN input kurulumu ──────────────────────────────────────
  function tcknKur(input) {
    if (input.dataset.valKuruldu) return;
    input.dataset.valKuruldu = '1';

    input.setAttribute('maxlength', '11');
    input.style.fontFamily = 'monospace';
    input.style.letterSpacing = '1px';
    input.setAttribute('placeholder', '11 haneli TC Kimlik No');
    input.setAttribute('inputmode', 'numeric');

    input.addEventListener('keydown', function (e) {
      const izin = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','Home','End'];
      if (izin.includes(e.key) || e.ctrlKey || e.metaKey) return;
      if (!/^\d$/.test(e.key)) { e.preventDefault(); return; }
      if (this.value.length >= 11 && this.selectionStart === this.selectionEnd) e.preventDefault();
    });

    input.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 11);
      hataTemizle(this);
    });

    input.addEventListener('blur', function () {
      const deger = this.value.trim();
      if (!deger) { hataTemizle(this); return; }
      const sonuc = tcDogrula(deger);
      if (!sonuc.gecerli) hataGoster(this, sonuc.mesaj);
      else hataTemizle(this);
    });
  }

  // ── Input'un hangi tip olduğunu tespit et ─────────────────────
  function inputTipiBul(input) {
    // IBAN tespiti: id'de iban, sınıfta iban-input, placeholder'da TR, oninput'ta formatIbanInput
    const id = (input.id || '').toLowerCase();
    const cls = (input.className || '').toLowerCase();
    const ph = (input.getAttribute('placeholder') || '').toUpperCase();
    const oi = (input.getAttribute('oninput') || '').toLowerCase();
    if (
      id.includes('iban') || cls.includes('iban') ||
      ph.startsWith('TR') || oi.includes('ibaninput') ||
      ph.includes('TR00')
    ) return 'iban';

    // TCKN tespiti: id'de tc/tckn, sınıfta tckn-input
    if (
      id === 'm-tc' || id === 'kt-tc' || id === 'i-btc' ||
      id.endsWith('-tc') || id.includes('tckn') ||
      cls.includes('tckn-input') || cls.includes('tc-input')
    ) return 'tckn';

    return null;
  }

  // ── DOM'daki input'ları tara ve kur ──────────────────────────
  function inputlariTara(kok) {
    const inputlar = (kok || document).querySelectorAll('input');
    inputlar.forEach(inp => {
      const tip = inputTipiBul(inp);
      if (tip === 'iban') ibanKur(inp);
      else if (tip === 'tckn') tcknKur(inp);
    });
  }

  // ── Kaydet butonu doğrulama wrapper'ı ────────────────────────
  // Modal içindeki tüm geçersiz alanları kontrol edip varsa bloke et
  function modalDogrulaVeKaydet(modalEl, orijinalFn) {
    return function (...args) {
      if (!modalEl) return orijinalFn.apply(this, args);

      const gecersizler = modalEl.querySelectorAll('input[data-gecersiz="1"]');
      if (gecersizler.length > 0) {
        gecersizler[0].focus();
        // Hataları bir kez daha göster (5s sıfırlamış olabilir)
        gecersizler.forEach(inp => {
          const tip = inputTipiBul(inp);
          const deger = inp.value.trim();
          if (tip === 'iban') {
            const s = ibanDogrula(deger);
            if (!s.gecerli) hataGoster(inp, s.mesaj);
          } else if (tip === 'tckn') {
            const s = tcDogrula(deger);
            if (!s.gecerli) hataGoster(inp, s.mesaj);
          }
        });
        if (typeof notify === 'function') notify('⚠️ Lütfen hatalı alanları düzeltin.');
        return;
      }

      // Ayrıca blur tetikle — kullanıcı blur yapmadan kaydettiyse
      let hataVar = false;
      modalEl.querySelectorAll('input').forEach(inp => {
        const tip = inputTipiBul(inp);
        const deger = inp.value.trim();
        if (!deger) return;
        let sonuc = { gecerli: true, mesaj: '' };
        if (tip === 'iban') sonuc = ibanDogrula(deger);
        else if (tip === 'tckn') sonuc = tcDogrula(deger);
        if (!sonuc.gecerli) {
          hataGoster(inp, sonuc.mesaj);
          hataVar = true;
        }
      });

      if (hataVar) {
        if (typeof notify === 'function') notify('⚠️ Lütfen hatalı alanları düzeltin.');
        return;
      }

      orijinalFn.apply(this, args);
    };
  }

  // ── Kaydet butonlarını wrap et ────────────────────────────────
  function kaydetButonlariniWrapla() {
    const eslesme = [
      { btnId: 'm-kaydet-btn',  modalId: 'm-modal',    fn: 'saveMuvekkil' },
      { btnId: 'kt-modal-btn',  modalId: 'kt-modal',   fn: 'saveKarsiTaraf' },
      { btnId: 'vek-modal-btn', modalId: 'vek-modal',  fn: 'saveVekil' },
    ];

    eslesme.forEach(({ btnId, modalId, fn }) => {
      const btn = document.getElementById(btnId);
      const modal = document.getElementById(modalId);
      if (!btn || !modal) return;
      if (btn.dataset.valWrapped) return;
      btn.dataset.valWrapped = '1';

      const orjFn = window[fn];
      if (typeof orjFn !== 'function') return;

      btn.onclick = modalDogrulaVeKaydet(modal, orjFn);
    });
  }

  // ── MutationObserver: modal açıldığında yeni input'ları kur ──
  const observer = new MutationObserver(function (mutasyonlar) {
    mutasyonlar.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        // Eklenen node input ise
        if (node.tagName === 'INPUT') {
          const tip = inputTipiBul(node);
          if (tip === 'iban') ibanKur(node);
          else if (tip === 'tckn') tcknKur(node);
        }
        // Eklenen node'un içindeki input'ları da tara
        inputlariTara(node);
      });
    });
    // Butonları da yeniden wrap'la (geç render olan modaller için)
    kaydetButonlariniWrapla();
  });

  // ── Başlat ───────────────────────────────────────────────────
  function baslat() {
    inputlariTara();
    kaydetButonlariniWrapla();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', baslat);
  } else {
    baslat();
  }

})();
