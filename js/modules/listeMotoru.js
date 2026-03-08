// ================================================================
// EMD HUKUK — LİSTE MOTORU
// js/modules/listeMotoru.js
// Tüm liste/tablo modülleri için ortak render motoru
// ================================================================

const ListeMotoru = (function() {
  'use strict';

  const _configs = {};
  const _activeFilters = {};

  // ── Register ──────────────────────────────────────────────────
  function register(modul, config) {
    _configs[modul] = config;
    _activeFilters[modul] = {};
    // Varsayılan sıralama ayarla
    if (config.defaultSort && config.sortTabloKey) {
      if (!sortState[config.sortTabloKey]) {
        sortState[config.sortTabloKey] = { key: config.defaultSort.key, dir: config.defaultSort.dir };
      } else {
        sortState[config.sortTabloKey].key = config.defaultSort.key;
        sortState[config.sortTabloKey].dir = config.defaultSort.dir;
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────
  function render(modul) {
    var c = _configs[modul];
    if (!c) return;

    var allData = c.getData ? c.getData() : (state[c.stateKey] || []);

    // 1. KPI kartları (filtresiz tam veri üzerinden)
    _renderKPI(modul, c, allData);

    // 2. Filtre chip'leri render
    _renderFilterRow(modul, c, allData);
    _renderActiveChips(modul, c);

    // 3. Arama
    var searchEl = c.searchInputId ? document.getElementById(c.searchInputId) : null;
    var q = searchEl ? searchEl.value.toLowerCase().trim() : '';

    // 4. Filtrele
    var filtered = allData.slice();
    if (q && c.searchFn) {
      filtered = filtered.filter(function(item) { return c.searchFn(item, q); });
    }
    var af = _activeFilters[modul] || {};
    Object.keys(af).forEach(function(key) {
      var val = af[key];
      if (val) {
        filtered = filtered.filter(function(item) { return item[key] === val; });
      }
    });

    // 5. Sırala
    if (c.sortTabloKey && sortState[c.sortTabloKey]) {
      filtered = sortArr(filtered, c.sortTabloKey);
    }

    // 6. YENİ badge eşik tarihi
    var yediGunOnce = new Date();
    yediGunOnce.setDate(yediGunOnce.getDate() - 7);
    var yediGunStr = yediGunOnce.toISOString().split('T')[0];

    // 7. Render
    var container = document.getElementById(c.containerId);
    if (!container) return;

    if (!filtered.length) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-dim);font-size:13px">' +
        (c.emptyText || 'Kayıt bulunamadı') + '</div>';
      return;
    }

    // Gruplama kontrolü
    if (c.groupBy) {
      _renderGrouped(modul, c, filtered, yediGunStr, container);
    } else if (c.renderMode === 'card') {
      _renderCards(modul, c, filtered, yediGunStr, container);
    } else {
      _renderTable(modul, c, filtered, yediGunStr, container);
    }
  }

  // ── Tablo Render ──────────────────────────────────────────────
  function _renderTable(modul, c, data, yediGunStr, container) {
    var html = '<div style="overflow-x:auto"><table><thead><tr>';
    (c.columns || []).forEach(function(col) {
      if (col.sortable) {
        html += '<th class="sort-th ' + shCls(c.sortTabloKey, col.key) + '" onclick="ListeMotoru.sort(\'' + modul + '\',\'' + col.key + '\')" style="cursor:pointer;white-space:nowrap">' +
          col.label + ' ' + shIcon(c.sortTabloKey, col.key) + '</th>';
      } else {
        html += '<th style="white-space:nowrap">' + col.label + '</th>';
      }
    });
    if (c.onRowMenu) html += '<th style="width:32px"></th>';
    html += '</tr></thead><tbody>';

    data.forEach(function(item, idx) {
      var isYeni = c.dateField && item[c.dateField] && item[c.dateField] >= yediGunStr;
      var yeniStyle = isYeni ? 'border-left:3px solid var(--gold);' : '';
      html += '<tr class="lm-row" style="cursor:pointer;' + yeniStyle + '" onclick="' + (c.onRowClick ? c.onRowClick(item) : '') + '">';

      (c.columns || []).forEach(function(col) {
        var val = col.render ? col.render(item, idx) : (item[col.key] || '');
        // İlk sütuna YENİ badge ekle
        if (isYeni && col === c.columns[0]) {
          val += ' <span class="lm-yeni-badge">YENİ</span>';
        }
        html += '<td>' + val + '</td>';
      });

      if (c.onRowMenu) {
        html += '<td style="text-align:center"><button class="ctx-btn" onclick="event.stopPropagation();' +
          c.onRowMenu(item) + '" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:4px">⋮</button></td>';
      }

      // Hover aksiyonları (satır içi, son td'den önce)
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  // ── Kart Render ───────────────────────────────────────────────
  function _renderCards(modul, c, data, yediGunStr, container) {
    container.innerHTML = data.map(function(item) {
      var isYeni = c.dateField && item[c.dateField] && item[c.dateField] >= yediGunStr;
      return c.cardRenderer ? c.cardRenderer(item, isYeni) : '';
    }).join('');
  }

  // ── Gruplu Render ─────────────────────────────────────────────
  function _renderGrouped(modul, c, data, yediGunStr, container) {
    var gb = c.groupBy;
    var groups = {};
    var groupOrder = [];

    data.forEach(function(item) {
      var key = typeof gb.fn === 'function' ? gb.fn(item) : (item[gb.key] || gb.defaultLabel || 'Diğer');
      if (!groups[key]) {
        groups[key] = [];
        groupOrder.push(key);
      }
      groups[key].push(item);
    });

    // Sıralama varsa uygula
    if (gb.order) {
      groupOrder.sort(function(a, b) {
        var ia = gb.order.indexOf(a);
        var ib = gb.order.indexOf(b);
        if (ia === -1) ia = 999;
        if (ib === -1) ib = 999;
        return ia - ib;
      });
    }

    var html = '';
    groupOrder.forEach(function(key) {
      var items = groups[key];
      var renk = (gb.colors && gb.colors[key]) || 'var(--text-muted)';
      var sayi = items.length;

      html += '<div class="section" style="border-left:3px solid ' + renk + ';margin-bottom:12px">';
      html += '<div class="section-header" style="padding:10px 16px">';
      html += '<div class="section-title" style="font-size:13px">' + key +
        ' <span style="font-size:11px;color:var(--text-muted);font-weight:400;margin-left:6px;background:var(--surface2);padding:1px 8px;border-radius:10px">' + sayi + '</span></div>';
      html += '</div>';
      html += '<div class="section-body" style="padding:0">';

      if (c.renderMode === 'card') {
        html += items.map(function(item) {
          var isYeni = c.dateField && item[c.dateField] && item[c.dateField] >= yediGunStr;
          return c.cardRenderer ? c.cardRenderer(item, isYeni) : '';
        }).join('');
      } else {
        // Grup içi tablo
        html += '<div style="overflow-x:auto"><table><thead><tr>';
        (c.columns || []).forEach(function(col) {
          if (col.sortable) {
            html += '<th class="sort-th ' + shCls(c.sortTabloKey, col.key) + '" onclick="ListeMotoru.sort(\'' + modul + '\',\'' + col.key + '\')" style="cursor:pointer;white-space:nowrap">' +
              col.label + ' ' + shIcon(c.sortTabloKey, col.key) + '</th>';
          } else {
            html += '<th style="white-space:nowrap">' + col.label + '</th>';
          }
        });
        if (c.onRowMenu) html += '<th style="width:32px"></th>';
        html += '</tr></thead><tbody>';

        items.forEach(function(item, idx) {
          var isYeni = c.dateField && item[c.dateField] && item[c.dateField] >= yediGunStr;
          var yeniStyle = isYeni ? 'border-left:3px solid var(--gold);' : '';
          html += '<tr class="lm-row" style="cursor:pointer;' + yeniStyle + '" onclick="' + (c.onRowClick ? c.onRowClick(item) : '') + '">';
          (c.columns || []).forEach(function(col) {
            var val = col.render ? col.render(item, idx) : (item[col.key] || '');
            if (isYeni && col === c.columns[0]) val += ' <span class="lm-yeni-badge">YENİ</span>';
            html += '<td>' + val + '</td>';
          });
          if (c.onRowMenu) {
            html += '<td style="text-align:center"><button class="ctx-btn" onclick="event.stopPropagation();' +
              c.onRowMenu(item) + '" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:4px">⋮</button></td>';
          }
          html += '</tr>';
        });
        html += '</tbody></table></div>';
      }

      html += '</div></div>';
    });

    container.innerHTML = html;
  }

  // ── KPI Kartları ──────────────────────────────────────────────
  function _renderKPI(modul, c, allData) {
    var el = c.kpiBarId ? document.getElementById(c.kpiBarId) : null;
    if (!el || !c.kpiCards) return;

    var af = _activeFilters[modul] || {};

    el.innerHTML = c.kpiCards.map(function(kpi) {
      var val = kpi.calc(allData);
      var displayVal = kpi.format ? kpi.format(val) : val;
      var isActive = kpi.filterOnClick && af[kpi.filterOnClick.key] === kpi.filterOnClick.value;
      var clickAttr = kpi.filterOnClick
        ? ' onclick="ListeMotoru.filterByKPI(\'' + modul + '\',\'' + kpi.filterOnClick.key + '\',\'' + kpi.filterOnClick.value + '\')"'
        : '';
      var activeClass = isActive ? ' lm-kpi-active' : '';
      var colorStyle = kpi.valueColor ? 'color:' + kpi.valueColor : '';
      return '<div class="card lm-kpi-card' + activeClass + '"' + clickAttr + '>' +
        '<div class="card-label">' + kpi.label + '</div>' +
        '<div class="card-value ' + (kpi.valueClass || '') + '" style="' + colorStyle + '">' + displayVal + '</div>' +
        '</div>';
    }).join('');
  }

  // ── Filtre Satırı (Chip Butonları) ────────────────────────────
  function _renderFilterRow(modul, c, allData) {
    var el = c.filterRowId ? document.getElementById(c.filterRowId) : null;
    if (!el || !c.filters) return;

    var af = _activeFilters[modul] || {};

    var html = '';
    c.filters.forEach(function(f) {
      html += '<div class="lm-filter-group">';
      html += '<span class="lm-filter-label">' + f.label + ':</span>';
      var options = typeof f.options === 'function' ? f.options(allData) : f.options;
      (options || []).forEach(function(opt) {
        var isActive = af[f.key] === opt;
        var displayText = f.displayFn ? f.displayFn(opt) : opt;
        html += '<button class="lm-filter-btn' + (isActive ? ' active' : '') + '" onclick="ListeMotoru.setFilter(\'' + modul + '\',\'' + f.key + '\',\'' + opt.replace(/'/g, "\\'") + '\')">' + displayText + '</button>';
      });
      html += '</div>';
    });

    el.innerHTML = html;
  }

  // ── Aktif Chip'ler ────────────────────────────────────────────
  function _renderActiveChips(modul, c) {
    var el = c.chipContainerId ? document.getElementById(c.chipContainerId) : null;
    if (!el) return;
    var af = _activeFilters[modul] || {};
    var keys = Object.keys(af);

    if (!keys.length) { el.innerHTML = ''; return; }

    var html = keys.map(function(key) {
      var filterDef = (c.filters || []).find(function(f) { return f.key === key; });
      var label = filterDef ? filterDef.label : key;
      return '<span class="chip">' + label + ': <b>' + af[key] + '</b>' +
        ' <button class="chip-x" onclick="ListeMotoru.clearFilter(\'' + modul + '\',\'' + key + '\')">×</button></span>';
    }).join('');

    html += ' <button class="chip" onclick="ListeMotoru.clearAllFilters(\'' + modul + '\')" style="background:transparent;border:1px dashed var(--border);color:var(--text-dim);cursor:pointer;font-size:10px">Temizle</button>';
    el.innerHTML = html;
  }

  // ── Sıralama ──────────────────────────────────────────────────
  function sort(modul, key) {
    var c = _configs[modul];
    if (!c) return;
    var s = sortState[c.sortTabloKey];
    if (!s) return;
    if (s.key === key) s.dir *= -1;
    else { s.key = key; s.dir = 1; }
    render(modul);
  }

  // ── Filtre Yönetimi ───────────────────────────────────────────
  function setFilter(modul, key, value) {
    if (!_activeFilters[modul]) _activeFilters[modul] = {};
    if (_activeFilters[modul][key] === value) {
      delete _activeFilters[modul][key]; // toggle off
    } else {
      _activeFilters[modul][key] = value;
    }
    render(modul);
  }

  function clearFilter(modul, key) {
    if (_activeFilters[modul]) delete _activeFilters[modul][key];
    render(modul);
  }

  function clearAllFilters(modul) {
    _activeFilters[modul] = {};
    var c = _configs[modul];
    if (c && c.searchInputId) {
      var el = document.getElementById(c.searchInputId);
      if (el) el.value = '';
    }
    render(modul);
  }

  function filterByKPI(modul, key, value) {
    setFilter(modul, key, value);
  }

  // ── Aşama çubuğu yardımcısı ──────────────────────────────────
  function stageBar(currentStage, stages) {
    var idx = stages.indexOf(currentStage);
    if (idx === -1) idx = 0;
    var html = '<div class="lm-stage-bar" title="' + (currentStage || '') + '">';
    stages.forEach(function(s, i) {
      var cls = i < idx ? 'done' : (i === idx ? 'active' : '');
      html += '<div class="lm-stage-step ' + cls + '" title="' + s + '"></div>';
    });
    html += '</div>';
    return html;
  }

  return {
    register: register,
    render: render,
    sort: sort,
    setFilter: setFilter,
    clearFilter: clearFilter,
    clearAllFilters: clearAllFilters,
    filterByKPI: filterByKPI,
    stageBar: stageBar
  };
})();
