// ================================================================
// LEXBASE — ONBOARDING HOSGELDIN TURU
// js/modules/onboarding.js
// Spotlight overlay ile adim adim uygulama tanitimi
// ================================================================

var Onboarding = (function() {
  'use strict';

  var DONE_KEY = 'lb_onboarding_done';
  var _aktifAdim = 0;
  var _overlay = null;
  var _spotlight = null;
  var _tooltip = null;
  var _resizeTimer = null;

  var ADIMLAR = [
    {
      hedef: null,
      baslik: 'LexBase\'e Hoş Geldiniz!',
      aciklama: 'Hukuk büronuzu dijital ortamda yönetmenize yardımcı olacağız. Bu kısa tur ile temel özellikleri tanıyın.',
      ikon: '🏛',
      konum: 'center'
    },
    {
      hedef: '#app-wrapper nav',
      baslik: 'Gezinti Menüsü',
      aciklama: 'Sol menüden Rehber, Davalar, İcra, Finans, Takvim ve diğer modüllere tek tıkla erişebilirsiniz.',
      ikon: '📒',
      konum: 'right'
    },
    {
      hedef: '#ni-muvekkillar',
      baslik: 'İlk Müvekkilinizi Ekleyin',
      aciklama: 'Rehber sayfasından müvekkil, karşı taraf ve vekil bilgilerini yönetebilirsiniz. Her sayfadaki "+" butonlarıyla yeni kayıt ekleyin.',
      ikon: '👤',
      konum: 'right'
    },
    {
      hedef: '#bildirim-btn',
      baslik: 'Bildirimler',
      aciklama: 'Yaklaşan duruşmalar, süre sonları, görev hatırlatmaları ve ödeme bildirimleri burada görünür. Zil ikonuna tıklayarak kontrol edin.',
      ikon: '🔔',
      konum: 'bottom'
    },
    {
      hedef: '#ni-ayarlar',
      baslik: 'Ayarlar',
      aciklama: 'Büro bilgilerinizi, tema tercihini, bildirim ayarlarını ve abonelik detaylarını buradan yönetebilirsiniz.',
      ikon: '⚙️',
      konum: 'right'
    },
    {
      hedef: null,
      baslik: 'Hazırsınız!',
      aciklama: 'İlk müvekkilinizi ekleyerek başlayabilirsiniz. Bu turu dilediğiniz zaman Ayarlar sayfasından tekrar başlatabilirsiniz.',
      ikon: '🚀',
      konum: 'center',
      sonAdim: true
    }
  ];

  // ── DOM oluşturma ──
  function _olustur() {
    // Overlay
    _overlay = document.createElement('div');
    _overlay.id = 'onboarding-overlay';
    _overlay.className = 'onboarding-overlay';

    // Backdrop (tıklanabilir — kapatma)
    var backdrop = document.createElement('div');
    backdrop.className = 'onboarding-backdrop';
    backdrop.addEventListener('click', bitir);
    _overlay.appendChild(backdrop);

    // Spotlight
    _spotlight = document.createElement('div');
    _spotlight.className = 'onboarding-spotlight';
    _overlay.appendChild(_spotlight);

    // Tooltip
    _tooltip = document.createElement('div');
    _tooltip.className = 'onboarding-tooltip';
    _tooltip.addEventListener('click', function(e) { e.stopPropagation(); });
    _overlay.appendChild(_tooltip);

    document.body.appendChild(_overlay);

    // ESC tuşu
    document.addEventListener('keydown', _escHandler);
    // Resize
    window.addEventListener('resize', _resizeHandler);
  }

  function _temizle() {
    document.removeEventListener('keydown', _escHandler);
    window.removeEventListener('resize', _resizeHandler);
    if (_overlay && _overlay.parentElement) {
      _overlay.parentElement.removeChild(_overlay);
    }
    _overlay = null;
    _spotlight = null;
    _tooltip = null;
  }

  function _escHandler(e) {
    if (e.key === 'Escape') bitir();
  }

  function _resizeHandler() {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(function() { _render(); }, 150);
  }

  // ── Render ──
  function _render() {
    if (!_tooltip || !_spotlight) return;
    var adim = ADIMLAR[_aktifAdim];
    if (!adim) return;

    // İçerik
    var sonAdimBtn = adim.sonAdim
      ? '<button class="onboarding-basla" onclick="Onboarding._ileriTikla()">Başlayın! 🚀</button>'
      : '<button class="onboarding-ileri" onclick="Onboarding._ileriTikla()">İleri →</button>';

    var geriBtn = _aktifAdim > 0
      ? '<button class="onboarding-geri" onclick="Onboarding._geriTikla()">← Geri</button>'
      : '';

    var dots = '';
    for (var i = 0; i < ADIMLAR.length; i++) {
      var cls = i === _aktifAdim ? 'active' : (i < _aktifAdim ? 'done' : '');
      dots += '<div class="onboarding-dot ' + cls + '"></div>';
    }

    _tooltip.innerHTML =
      '<button class="onboarding-close" onclick="Onboarding._kapat()" title="Kapat">✕</button>' +
      '<div class="onboarding-header">' +
        '<span class="onboarding-ikon">' + adim.ikon + '</span>' +
        '<span class="onboarding-adim-no">' + (_aktifAdim + 1) + ' / ' + ADIMLAR.length + '</span>' +
      '</div>' +
      '<div class="onboarding-baslik">' + adim.baslik + '</div>' +
      '<div class="onboarding-aciklama">' + adim.aciklama + '</div>' +
      '<div class="onboarding-progress">' + dots + '</div>' +
      '<div class="onboarding-footer">' +
        '<button class="onboarding-atla" onclick="Onboarding._kapat()">Tur\'u Atla</button>' +
        '<div>' + geriBtn + sonAdimBtn + '</div>' +
      '</div>';

    // Spotlight + konum
    _konumla(adim);
  }

  // ── Spotlight ve tooltip konumlama ──
  function _konumla(adim) {
    if (adim.konum === 'center' || !adim.hedef) {
      // Merkezi kart — spotlight gizle
      _spotlight.style.display = 'none';
      _tooltip.classList.add('center-mode');
      _tooltip.style.top = '';
      _tooltip.style.left = '';
      _tooltip.style.right = '';
      _tooltip.style.bottom = '';
      return;
    }

    _tooltip.classList.remove('center-mode');

    // Hedef element bul
    var el = document.querySelector(adim.hedef);
    if (!el) {
      // Element bulunamazsa merkeze geç
      _spotlight.style.display = 'none';
      _tooltip.classList.add('center-mode');
      return;
    }

    // Spotlight konumla
    var rect = el.getBoundingClientRect();
    var pad = 6;
    _spotlight.style.display = 'block';
    _spotlight.style.top = (rect.top - pad) + 'px';
    _spotlight.style.left = (rect.left - pad) + 'px';
    _spotlight.style.width = (rect.width + pad * 2) + 'px';
    _spotlight.style.height = (rect.height + pad * 2) + 'px';

    // Tooltip konumla
    var ttRect = _tooltip.getBoundingClientRect();
    var ttW = 340;
    var ttH = ttRect.height || 280;
    var gap = 16;

    var top, left;

    switch (adim.konum) {
      case 'right':
        top = rect.top + (rect.height / 2) - (ttH / 2);
        left = rect.right + gap;
        // Ekrandan taşma kontrolü
        if (left + ttW > window.innerWidth - 20) {
          left = rect.left - ttW - gap;
        }
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + (rect.width / 2) - (ttW / 2);
        break;
      case 'bottom-left':
        top = rect.bottom + gap;
        left = rect.right - ttW;
        break;
      default:
        top = rect.bottom + gap;
        left = rect.left;
    }

    // Ekran sınırları
    top = Math.max(10, Math.min(top, window.innerHeight - ttH - 20));
    left = Math.max(10, Math.min(left, window.innerWidth - ttW - 20));

    _tooltip.style.top = top + 'px';
    _tooltip.style.left = left + 'px';
    _tooltip.style.right = '';
    _tooltip.style.bottom = '';
  }

  // ── Navigasyon ──
  function ileri() {
    if (_aktifAdim < ADIMLAR.length - 1) {
      _aktifAdim++;
      _render();
    } else {
      bitir();
    }
  }

  function geri() {
    if (_aktifAdim > 0) {
      _aktifAdim--;
      _render();
    }
  }

  function bitir() {
    localStorage.setItem(DONE_KEY, 'true');
    _temizle();
  }

  // ── Lifecycle ──
  function baslat() {
    if (tamamlandiMi()) return;
    _aktifAdim = 0;
    _olustur();
    _render();
  }

  function tekrarBaslat() {
    localStorage.removeItem(DONE_KEY);
    _aktifAdim = 0;
    if (_overlay) _temizle();
    _olustur();
    _render();
  }

  function tamamlandiMi() {
    return localStorage.getItem(DONE_KEY) === 'true';
  }

  // ── Public API ──
  return {
    baslat: baslat,
    tekrarBaslat: tekrarBaslat,
    tamamlandiMi: tamamlandiMi,
    // onclick handler'lar için
    _ileriTikla: ileri,
    _geriTikla: geri,
    _kapat: bitir
  };
})();
