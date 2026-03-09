// ================================================================
// LEXBASE — ADRES WIDGET (Kademeli Dropdown)
// js/modules/adresWidget.js
//
// Ülke → İl → İlçe → Mahalle kademeli seçim widget'ı
// Veri kaynağı: TurkiyeAPI (api.turkiyeapi.dev/v1/)
// ================================================================

var AdresWidget = (function() {
  'use strict';

  // ── CACHE ──────────────────────────────────────────────────────
  var _cache = {
    provinces: null,       // bir kez yüklenir
    districts: {},         // provinceId → [{id,name}]
    neighborhoods: {}      // districtId → [{id,name}]
  };

  // ── API ────────────────────────────────────────────────────────
  var API = 'https://api.turkiyeapi.dev/v1';
  var TIMEOUT = 8000; // 8 saniye

  function _apiFetch(endpoint) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timerId = controller ? setTimeout(function() { controller.abort(); }, TIMEOUT) : null;

    return fetch(API + endpoint, controller ? { signal: controller.signal } : {})
      .then(function(r) {
        if (timerId) clearTimeout(timerId);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(json) {
        return (json && json.data) ? json.data : [];
      })
      .catch(function(e) {
        if (timerId) clearTimeout(timerId);
        console.warn('[AdresWidget] API hatası (' + endpoint + '):', e.message);
        return null;
      });
  }

  function _getProvinces() {
    if (_cache.provinces) return Promise.resolve(_cache.provinces);
    return _apiFetch('/provinces?fields=id,name&limit=100').then(function(data) {
      if (!data) return [];
      data.sort(function(a, b) { return a.name.localeCompare(b.name, 'tr'); });
      _cache.provinces = data;
      return data;
    });
  }

  function _getDistricts(provinceId) {
    if (_cache.districts[provinceId]) return Promise.resolve(_cache.districts[provinceId]);
    return _apiFetch('/districts?provinceId=' + provinceId + '&limit=1000').then(function(data) {
      if (!data) return [];
      data.sort(function(a, b) { return a.name.localeCompare(b.name, 'tr'); });
      _cache.districts[provinceId] = data;
      return data;
    });
  }

  function _getNeighborhoods(districtId) {
    if (_cache.neighborhoods[districtId]) return Promise.resolve(_cache.neighborhoods[districtId]);
    return _apiFetch('/neighborhoods?districtId=' + districtId + '&limit=5000').then(function(data) {
      if (!data) return [];
      data.sort(function(a, b) { return a.name.localeCompare(b.name, 'tr'); });
      _cache.neighborhoods[districtId] = data;
      return data;
    });
  }

  // ── DOM YARDIMCILARI ───────────────────────────────────────────
  function _el(prefix, suffix) {
    return document.getElementById(prefix + suffix);
  }

  function _populateSelect(sel, items, placeholder, selectedId) {
    sel.innerHTML = '<option value="">' + placeholder + '</option>';
    items.forEach(function(item) {
      var opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.name;
      if (selectedId && item.id === selectedId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function _setLoading(sel, loading) {
    if (!sel) return;
    if (loading) {
      sel.classList.add('aw-loading');
      sel.disabled = true;
    } else {
      sel.classList.remove('aw-loading');
      sel.disabled = false;
    }
  }

  function _toggleTrMode(prefix, isTR) {
    var widget = _el(prefix, 'widget');
    if (!widget) return;
    if (isTR) {
      widget.classList.remove('aw-foreign');
    } else {
      widget.classList.add('aw-foreign');
    }
  }

  // ── INIT ───────────────────────────────────────────────────────
  // Her prefix için bir kez çağrılır
  var _inited = {};
  var _version = {}; // stale promise koruması

  function init(prefix) {
    if (_inited[prefix]) return;
    _inited[prefix] = true;
    _version[prefix] = 0;

    var ulkeSel = _el(prefix, 'ulke');
    var ilSel   = _el(prefix, 'il');
    var ilceSel = _el(prefix, 'ilce');
    var mahSel  = _el(prefix, 'mahalle');

    if (!ulkeSel || !ilSel) return;

    // Ülke değişimi
    ulkeSel.addEventListener('change', function() {
      var isTR = ulkeSel.value === 'TR';
      _toggleTrMode(prefix, isTR);
      if (isTR && ilSel.options.length <= 1) {
        _loadProvinces(prefix);
      }
    });

    // İl değişimi → İlçe yükle
    ilSel.addEventListener('change', function() {
      var provId = parseInt(ilSel.value);
      // İlçe ve mahalle sıfırla
      if (ilceSel) { ilceSel.innerHTML = '<option value="">— İlçe seçin —</option>'; }
      if (mahSel)  { mahSel.innerHTML  = '<option value="">— Mahalle seçin —</option>'; }
      var pkEl = _el(prefix, 'pk');
      if (pkEl) pkEl.value = '';

      if (!provId) return;

      _setLoading(ilceSel, true);
      _getDistricts(provId).then(function(data) {
        _setLoading(ilceSel, false);
        if (!data.length) {
          _showFallback(prefix);
          return;
        }
        _populateSelect(ilceSel, data, '— İlçe seçin —');
      });
    });

    // İlçe değişimi → Mahalle yükle
    if (ilceSel) {
      ilceSel.addEventListener('change', function() {
        var distId = parseInt(ilceSel.value);
        if (mahSel) { mahSel.innerHTML = '<option value="">— Mahalle seçin —</option>'; }

        if (!distId) return;

        _setLoading(mahSel, true);
        _getNeighborhoods(distId).then(function(data) {
          _setLoading(mahSel, false);
          if (data.length) {
            _populateSelect(mahSel, data, '— Mahalle seçin —');
          }
        });
      });
    }

    // İlk yükleme — illeri getir
    _loadProvinces(prefix);
  }

  function _loadProvinces(prefix) {
    var ilSel = _el(prefix, 'il');
    if (!ilSel) return;

    _setLoading(ilSel, true);
    _getProvinces().then(function(data) {
      _setLoading(ilSel, false);
      if (!data || !data.length) {
        _showFallback(prefix);
        return;
      }
      _populateSelect(ilSel, data, '— İl seçin —');
    });
  }

  function _showFallback(prefix) {
    // API başarısız → basit textarea moduna geç
    var widget = _el(prefix, 'widget');
    if (!widget) return;
    widget.classList.add('aw-fallback');
    // TR alanlarını gizle, sadece detay textarea kalsın
    var trFields = widget.querySelectorAll('.aw-tr-field');
    trFields.forEach(function(el) { el.style.display = 'none'; });
    // Detay label güncelle
    var detay = _el(prefix, 'detay');
    if (detay) {
      var label = detay.previousElementSibling || detay.closest('.form-group').querySelector('label');
      if (label && label.tagName === 'LABEL') {
        label.textContent = 'Adres';
      }
    }
  }

  // ── OKU ────────────────────────────────────────────────────────
  function oku(prefix) {
    var ulkeSel = _el(prefix, 'ulke');
    var detEl   = _el(prefix, 'detay');
    var detay   = detEl ? detEl.value.trim() : '';

    // Ülke "Diğer" veya widget yok
    if (!ulkeSel || ulkeSel.value !== 'TR') {
      return {
        adresUlke: ulkeSel ? ulkeSel.value : '',
        adresIl: '', adresIlId: null,
        adresIlce: '', adresIlceId: null,
        adresMahalle: '', adresMahalleId: null,
        postaKodu: '',
        adresDetay: detay,
        adres: detay
      };
    }

    var ilSel   = _el(prefix, 'il');
    var ilceSel = _el(prefix, 'ilce');
    var mahSel  = _el(prefix, 'mahalle');
    var pkEl    = _el(prefix, 'pk');

    var ilText   = (ilSel && ilSel.selectedIndex > 0) ? ilSel.options[ilSel.selectedIndex].text : '';
    var ilceText = (ilceSel && ilceSel.selectedIndex > 0) ? ilceSel.options[ilceSel.selectedIndex].text : '';
    var mahText  = (mahSel && mahSel.selectedIndex > 0) ? mahSel.options[mahSel.selectedIndex].text : '';
    var pk       = pkEl ? pkEl.value.trim() : '';

    // Composed adres string
    var parcalar = [];
    if (mahText)  parcalar.push(mahText + ' Mah.');
    if (detay)    parcalar.push(detay);
    if (ilceText) parcalar.push(ilceText);
    if (ilText)   parcalar.push(ilText);
    if (pk)       parcalar.push(pk);

    return {
      adresUlke: 'TR',
      adresIl:   ilText,
      adresIlId: ilSel ? (parseInt(ilSel.value) || null) : null,
      adresIlce:   ilceText,
      adresIlceId: ilceSel ? (parseInt(ilceSel.value) || null) : null,
      adresMahalle:   mahText,
      adresMahalleId: mahSel ? (parseInt(mahSel.value) || null) : null,
      postaKodu: pk,
      adresDetay: detay,
      adres: parcalar.join(', ')
    };
  }

  // ── DOLDUR ─────────────────────────────────────────────────────
  function doldur(prefix, data) {
    if (!data) return Promise.resolve();

    init(prefix); // init idempotent

    var ver = ++(_version[prefix]);

    var ulkeSel = _el(prefix, 'ulke');
    var detEl   = _el(prefix, 'detay');
    var pkEl    = _el(prefix, 'pk');

    // Ülke "Diğer"
    if (data.adresUlke === 'other') {
      if (ulkeSel) ulkeSel.value = 'other';
      _toggleTrMode(prefix, false);
      if (detEl) detEl.value = data.adresDetay || data.adres || '';
      return Promise.resolve();
    }

    // Türkiye modu
    if (ulkeSel) ulkeSel.value = 'TR';
    _toggleTrMode(prefix, true);

    // Posta kodu ve detay
    if (pkEl)  pkEl.value = data.postaKodu || '';
    if (detEl) detEl.value = data.adresDetay || '';

    // Eski format: sadece adres string var, yeni alanlar yok
    if (!data.adresIl && !data.adresIlId && data.adres) {
      if (detEl) detEl.value = data.adres;
      return Promise.resolve();
    }

    // Yapılandırılmış veri: kademeli dropdown doldur
    if (!data.adresIlId) return Promise.resolve();

    var ilSel   = _el(prefix, 'il');
    var ilceSel = _el(prefix, 'ilce');
    var mahSel  = _el(prefix, 'mahalle');

    return _getProvinces().then(function(provs) {
      if (_version[prefix] !== ver) return; // stale
      if (ilSel) {
        _populateSelect(ilSel, provs, '— İl seçin —', data.adresIlId);
      }
      if (!data.adresIlceId) return;
      _setLoading(ilceSel, true);
      return _getDistricts(data.adresIlId);
    }).then(function(dists) {
      if (_version[prefix] !== ver) return;
      if (!dists) return;
      _setLoading(ilceSel, false);
      _populateSelect(ilceSel, dists, '— İlçe seçin —', data.adresIlceId);
      if (!data.adresMahalleId) return;
      _setLoading(mahSel, true);
      return _getNeighborhoods(data.adresIlceId);
    }).then(function(neigh) {
      if (_version[prefix] !== ver) return;
      if (!neigh) return;
      _setLoading(mahSel, false);
      _populateSelect(mahSel, neigh, '— Mahalle seçin —', data.adresMahalleId);
    }).catch(function(e) {
      console.warn('[AdresWidget] doldur hatası:', e.message);
    });
  }

  // ── SIFIRLA ────────────────────────────────────────────────────
  function sifirla(prefix) {
    _version[prefix] = (_version[prefix] || 0) + 1;

    var ulkeSel = _el(prefix, 'ulke');
    if (ulkeSel) ulkeSel.value = 'TR';
    _toggleTrMode(prefix, true);

    var ilSel = _el(prefix, 'il');
    if (ilSel && _cache.provinces) {
      _populateSelect(ilSel, _cache.provinces, '— İl seçin —');
    }

    var ilceSel = _el(prefix, 'ilce');
    if (ilceSel) ilceSel.innerHTML = '<option value="">— İlçe seçin —</option>';

    var mahSel = _el(prefix, 'mahalle');
    if (mahSel) mahSel.innerHTML = '<option value="">— Mahalle seçin —</option>';

    var pkEl = _el(prefix, 'pk');
    if (pkEl) pkEl.value = '';

    var detEl = _el(prefix, 'detay');
    if (detEl) detEl.value = '';

    // Fallback modunu kaldır
    var widget = _el(prefix, 'widget');
    if (widget) {
      widget.classList.remove('aw-fallback');
      var trFields = widget.querySelectorAll('.aw-tr-field');
      trFields.forEach(function(el) { el.style.display = ''; });
    }
  }

  // ── PUBLIC API ─────────────────────────────────────────────────
  return { init: init, doldur: doldur, oku: oku, sifirla: sifirla };
})();
