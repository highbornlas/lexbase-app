// ================================================================
// EMD HUKUK — DASHBOARD
// js/modules/dashboard.js
// ================================================================

function renderDashSureler() {
  const bugun = new Date();
  bugun.setHours(0,0,0,0);
  const t30 = new Date(bugun); t30.setDate(t30.getDate()+30);
  const bugunS = bugun.toISOString().split('T')[0];
  const t30S = t30.toISOString().split('T')[0];

  const items = [];

  // Etkinliklerden "Son Gün" olanlar
  state.etkinlikler.forEach(e => {
    if (e.tur === 'Son Gün' && e.tarih >= bugunS && e.tarih <= t30S) {
      const gun = Math.ceil((new Date(e.tarih)-bugun)/86400000);
      items.push({ tarih: e.tarih, gun, baslik: e.baslik, tur: 'Son Gün', renk: '#e74c3c', muvAd: e.muvId ? getMuvAd(e.muvId) : '', hedef: 'takvim' });
    }
  });

  // Davalardan sonraki duruşma tarihleri
  state.davalar.forEach(d => {
    if (d.durum === 'Aktif' && d.sonDurusma && d.sonDurusma >= bugunS && d.sonDurusma <= t30S) {
      const gun = Math.ceil((new Date(d.sonDurusma)-bugun)/86400000);
      items.push({ tarih: d.sonDurusma, gun, baslik: `Duruşma: ${d.konu||d.dosyaNo||''}`, tur: 'Duruşma', renk: '#2980b9', muvAd: d.muvId ? getMuvAd(d.muvId) : '', hedef: 'davalar' });
    }
  });

  // İcradan itiraz son tarihleri
  state.icra.forEach(i => {
    if (i.itirazSonTarih && i.itirazSonTarih >= bugunS && i.itirazSonTarih <= t30S) {
      const gun = Math.ceil((new Date(i.itirazSonTarih)-bugun)/86400000);
      items.push({ tarih: i.itirazSonTarih, gun, baslik: `İtiraz Son: ${i.borcluAd||i.dosyaNo||''}`, tur: 'İtiraz', renk: '#e67e22', muvAd: i.muvId ? getMuvAd(i.muvId) : '', hedef: 'icra' });
    }
  });

  // Danışmanlıktan teslim tarihleri
  state.danismanlik.forEach(d => {
    if (d.durum !== 'Tamamlandı' && d.durum !== 'İptal' && d.teslimTarih && d.teslimTarih >= bugunS && d.teslimTarih <= t30S) {
      const gun = Math.ceil((new Date(d.teslimTarih)-bugun)/86400000);
      items.push({ tarih: d.teslimTarih, gun, baslik: `Teslim: ${d.konu||''}`, tur: 'Teslim', renk: '#C9A84C', muvAd: d.muvId ? getMuvAd(d.muvId) : '', hedef: 'danismanlik' });
    }
  });

  items.sort((a,b) => a.tarih.localeCompare(b.tarih));

  const el = document.getElementById('dash-sureler');
  if (!el) return;
  if (!items.length) { el.innerHTML = '<div class="dash-empty-compact"><span>📅</span><span>30 gün içinde kritik işlem yok</span><a onclick="showPage(\'takvim\',document.getElementById(\'ni-takvim\'))">Takvim ›</a></div>'; return; }

  el.innerHTML = items.map(i => {
    const acil = i.gun <= 3 ? 'background:rgba(231,76,60,.08);border-left:3px solid #e74c3c;' : i.gun <= 7 ? 'border-left:3px solid #e67e22;' : 'border-left:3px solid var(--border);';
    const gunText = i.gun === 0 ? '<span style="color:#e74c3c;font-weight:700">BUGÜN</span>' : i.gun === 1 ? '<span style="color:#e74c3c;font-weight:700">YARIN</span>' : `<span style="color:${i.gun<=7?'#e67e22':'var(--text-muted)'};">${i.gun} gün</span>`;
    return `<div onclick="showPage('${i.hedef}',document.getElementById('ni-${i.hedef}'))" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;margin-bottom:4px;border-radius:6px;cursor:pointer;transition:background .15s;${acil}" onmouseover="this.style.background='rgba(255,255,255,.04)'" onmouseout="this.style.background='${i.gun<=3?'rgba(231,76,60,.08)':'transparent'}'">
      <div>
        <span style="display:inline-block;font-size:9px;font-weight:700;padding:1px 6px;border-radius:3px;background:${i.renk}22;color:${i.renk};margin-right:6px">${i.tur}</span>
        <span style="font-size:12px;font-weight:600">${i.baslik}</span>
        ${i.muvAd ? `<span style="font-size:10px;color:var(--text-muted);margin-left:6px">${i.muvAd}</span>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:12px">
        ${gunText}
        <div style="font-size:10px;color:var(--text-dim)">${fmtD(i.tarih)}</div>
      </div>
    </div>`;
  }).join('');
}

function renderDashboard(){
  var t = today();
  var now = new Date();
  var yil = now.getFullYear().toString();
  var ay = now.getMonth();

  // ── Hoşgeldin mesajı ──
  var saat = now.getHours();
  var selamlama = saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar';
  var hgEl = document.getElementById('dash-hosgeldin');
  if (hgEl) {
    var tarihStr = new Date().toLocaleDateString('tr-TR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    hgEl.textContent = selamlama + (currentUser ? ', ' + (currentUser.ad || currentUser.ad_soyad || '') : '') + ' — ' + tarihStr;
  }

  // ── KPI Hesaplamaları ──
  var muvSayi = state.muvekkillar.length;
  var gercekKisi = state.muvekkillar.filter(function(m){return !m.tip || m.tip === 'gercek';}).length;
  var tuzelKisi = state.muvekkillar.filter(function(m){return m.tip === 'tuzel';}).length;
  var derdestDava = state.davalar.filter(function(d){return d.durum === 'Aktif' || d.durum === 'Devam Ediyor';}).length;
  var derdestIcra = state.icra.filter(function(i){return i.durum !== 'Kapandı';}).length;

  // Bu hafta duruşma
  var haftaSonu = new Date(); haftaSonu.setDate(haftaSonu.getDate()+7);
  var haftaS = haftaSonu.toISOString().split('T')[0];
  var yakDurusma = state.etkinlikler.filter(function(e){return e.tarih >= t && e.tarih <= haftaS && (e.tur==='Duruşma'||e.baslik.includes('Duruşma'));}).length;
  yakDurusma += state.davalar.filter(function(d){return d.durusma && d.durusma >= t && d.durusma <= haftaS;}).length;

  // Net gelir
  var yilFinans = typeof tumFinansHesapla === 'function' ? tumFinansHesapla({yil: yil}) : {gelir:0, gider:0, net:0};
  var yilNet = yilFinans.net;

  // Bu hafta yapılacaklar
  var dayOfWeek = now.getDay();
  var pazartesi = new Date(now); pazartesi.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  var pazar = new Date(pazartesi); pazar.setDate(pazartesi.getDate() + 6);
  var pztStr = pazartesi.toISOString().split('T')[0];
  var pazStr = pazar.toISOString().split('T')[0];
  var buHaftaGorevler = (state.todolar||[]).filter(function(td) {
    if (td.durum === 'Tamamlandı') return false;
    if (td.sonTarih && td.sonTarih >= pztStr && td.sonTarih <= pazStr) return true;
    if (!td.sonTarih && (td.oncelik === 'Yüksek' || td.oncelik === 'Acil')) return true;
    return false;
  });

  // ── KPI STRİP (kompakt) ──
  document.getElementById('dash-cards').innerHTML =
    '<div class="kpi-item">' +
      '<div class="kpi-icon">👥</div>' +
      '<div class="kpi-content">' +
        '<div class="kpi-value gold">' + muvSayi + '</div>' +
        '<div class="kpi-label">Müvekkiller</div>' +
        '<div class="kpi-detail">' + gercekKisi + ' Gerçek · ' + tuzelKisi + ' Tüzel</div>' +
      '</div>' +
    '</div>' +
    '<div class="kpi-item">' +
      '<div class="kpi-icon">📁</div>' +
      '<div class="kpi-content">' +
        '<div class="kpi-value gold">' + derdestDava + '</div>' +
        '<div class="kpi-label">Derdest Dava</div>' +
        '<div class="kpi-detail">' + derdestDava + ' dosya</div>' +
      '</div>' +
    '</div>' +
    '<div class="kpi-item">' +
      '<div class="kpi-icon">⚡</div>' +
      '<div class="kpi-content">' +
        '<div class="kpi-value" style="color:#e74c3c">' + derdestIcra + '</div>' +
        '<div class="kpi-label">Derdest İcra</div>' +
        '<div class="kpi-detail">' + derdestIcra + ' dosya</div>' +
      '</div>' +
    '</div>' +
    '<div class="kpi-item">' +
      '<div class="kpi-icon">⚖️</div>' +
      '<div class="kpi-content">' +
        '<div class="kpi-value" style="color:#2980b9">' + yakDurusma + '</div>' +
        '<div class="kpi-label">Bu Hafta Duruşma</div>' +
        '<div class="kpi-detail">' + yakDurusma + ' adet</div>' +
      '</div>' +
    '</div>' +
    '<div class="kpi-item">' +
      '<div class="kpi-icon">💎</div>' +
      '<div class="kpi-content">' +
        '<div class="kpi-value" style="color:' + (yilNet>=0?'var(--green)':'#e74c3c') + '">' + fmt(yilNet) + '</div>' +
        '<div class="kpi-label">' + yil + ' Net Gelir</div>' +
        '<div class="kpi-detail">' + (yilNet >= 0 ? 'Kâr' : 'Zarar') + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="kpi-item">' +
      '<div class="kpi-icon">✅</div>' +
      '<div class="kpi-content">' +
        '<div class="kpi-value" style="color:#e67e22">' + buHaftaGorevler.length + '</div>' +
        '<div class="kpi-label">Bu Hafta Yapılacaklar</div>' +
        '<div class="kpi-detail">' + buHaftaGorevler.length + ' iş</div>' +
      '</div>' +
    '</div>';

  // ── HOŞGELDİN BANNER (ilk kullanım) ──
  if (muvSayi === 0 && derdestDava === 0) {
    var bannerEl = document.getElementById('dash-welcome-banner');
    if (!bannerEl) {
      bannerEl = document.createElement('div');
      bannerEl.id = 'dash-welcome-banner';
      var cardsEl = document.getElementById('dash-cards');
      if (cardsEl && cardsEl.parentElement) {
        cardsEl.parentElement.insertBefore(bannerEl, cardsEl);
      }
    }
    bannerEl.className = 'dash-welcome-banner';
    bannerEl.innerHTML =
      '<span class="dash-welcome-icon">🏛</span>' +
      '<div class="dash-welcome-content">' +
        '<div class="dash-welcome-title">LexBase\'e hoş geldiniz!</div>' +
        '<div class="dash-welcome-sub">İlk müvekkilinizi ekleyerek büronuzu dijitale taşımaya başlayın.</div>' +
      '</div>' +
      '<button class="dash-empty-cta" onclick="showPage(\'muvekkillar\',document.getElementById(\'ni-muvekkillar\'));setTimeout(function(){if(typeof openModal===\'function\')openModal(\'m-modal\');},300)">+ İlk Müvekkil</button>';
  } else {
    var existingBanner = document.getElementById('dash-welcome-banner');
    if (existingBanner) existingBanner.remove();
  }

  // ── GÜNDEM (Bugünkü Ajanda + Yaklaşan Duruşmalar birleşik) ──
  renderGundem();

  // ── BU HAFTA YAPILACAKLAR ──
  renderBuHaftaGorevler(buHaftaGorevler);

  // ── AYLIK PERFORMANS GRAFİĞİ ──
  var perfEl = document.getElementById('dash-performans');
  if (perfEl) {
    var aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    var maxVal = 1;
    var ayData = [];
    for (var ai = 0; ai < 12; ai++) {
      var ayFinans = typeof tumFinansHesapla === 'function' ? tumFinansHesapla({yil: yil, ay: ai}) : {gelir:0, gider:0};
      var g = ayFinans.gelir;
      var d2 = ayFinans.gider;
      if (g > maxVal) maxVal = g;
      if (d2 > maxVal) maxVal = d2;
      ayData.push({ay:aylar[ai], gelir:g, gider:d2, aktif:ai===ay});
    }
    var grafik = '<div style="display:flex;align-items:flex-end;gap:3px;height:100px;margin-bottom:8px">';
    ayData.forEach(function(a) {
      var gH = Math.max(2, Math.round(a.gelir / maxVal * 80));
      var dH = Math.max(2, Math.round(a.gider / maxVal * 80));
      var border = a.aktif ? 'border-bottom:2px solid var(--gold)' : '';
      grafik += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;' + border + '">' +
        '<div style="display:flex;gap:1px;align-items:flex-end;width:100%">' +
        '<div style="flex:1;height:' + gH + 'px;background:var(--green);border-radius:2px 2px 0 0;opacity:' + (a.gelir>0?'1':'0.15') + '" title="Gelir: ' + fmt(a.gelir) + '"></div>' +
        '<div style="flex:1;height:' + dH + 'px;background:#e74c3c;border-radius:2px 2px 0 0;opacity:' + (a.gider>0?'1':'0.15') + '" title="Gider: ' + fmt(a.gider) + '"></div></div>' +
        '<div style="font-size:8px;color:' + (a.aktif?'var(--gold)':'var(--text-dim)') + ';font-weight:' + (a.aktif?'700':'400') + '">' + a.ay + '</div></div>';
    });
    grafik += '</div>';
    grafik += '<div style="display:flex;gap:12px;justify-content:center;font-size:10px">' +
      '<span><span style="display:inline-block;width:8px;height:8px;background:var(--green);border-radius:2px;margin-right:3px"></span>Gelir</span>' +
      '<span><span style="display:inline-block;width:8px;height:8px;background:#e74c3c;border-radius:2px;margin-right:3px"></span>Gider</span></div>';
    perfEl.innerHTML = grafik;
  }

  // ── FİNANSAL UYARILAR ──
  var vgEl = document.getElementById('dash-vadesi-gecen');
  if (vgEl) {
    var uyarilar = typeof FinansMotoru !== 'undefined' ? FinansMotoru.hesaplaUyarilar() : [];
    if (!uyarilar.length) {
      vgEl.innerHTML = '<div class="dash-empty-compact"><span>✅</span><span>Finansal uyarı yok</span><a onclick="showPage(\'butce\',document.getElementById(\'ni-butce\'))">Finans ›</a></div>';
    } else {
      var kritikSayi = uyarilar.filter(function(u) { return u.oncelik === 'yuksek'; }).length;
      vgEl.innerHTML = (kritikSayi > 0 ? '<div style="text-align:center;padding:6px 0;margin-bottom:8px;background:rgba(231,76,60,.06);border-radius:6px"><div style="font-size:18px;font-weight:800;color:#e74c3c">' + kritikSayi + ' Kritik</div><div style="font-size:10px;color:var(--text-muted)">' + uyarilar.length + ' toplam uyarı</div></div>' : '') +
        uyarilar.slice(0, 5).map(function(u) {
          var ikon = u.icon || '⚠️';
          var renk = u.oncelik === 'yuksek' ? '#e74c3c' : '#e67e22';
          return '<div style="padding:6px 0;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:flex-start">' +
            '<span style="font-size:14px;flex-shrink:0">' + ikon + '</span>' +
            '<div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:600;color:' + renk + '">' + u.mesaj + '</div>' +
            (u.tutar ? '<div style="font-size:10px;color:var(--text-muted)">' + fmt(u.tutar) + '</div>' : '') +
            '</div></div>';
        }).join('') +
        (uyarilar.length > 5 ? '<div style="font-size:10px;color:var(--gold);text-align:center;padding:6px;cursor:pointer" onclick="showPage(\'butce\',document.getElementById(\'ni-butce\'))">Tümünü Gör (' + uyarilar.length + ') ›</div>' : '');
    }
  }

  // ── SON AKTİVİTELER ──
  var aktEl = document.getElementById('dash-aktivite');
  if (aktEl) {
    var log = (state.aktiviteLog||[]).slice(-10).reverse();
    if (!log.length) {
      aktEl.innerHTML = '<div class="dash-empty-compact"><span>📋</span><span>Henüz aktivite yok</span><a onclick="showPage(\'muvekkillar\',document.getElementById(\'ni-muvekkillar\'))">Müvekkil Ekle ›</a></div>';
    } else {
      aktEl.innerHTML = log.map(function(l) {
        var ikon = {'Giriş':'🔑','Dava':'📁','İcra':'⚡','Finans':'💰','İhtarname':'📩','Avans':'🏦','Müvekkil':'👤','Personel':'👥','Genel':'📋'}[l.module||''] || '📋';
        return '<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">' +
          '<span style="font-size:14px;flex-shrink:0">' + ikon + '</span>' +
          '<div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (l.islem||'') + '</div>' +
          '<div style="font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (l.detay||'') + '</div></div>' +
          '<div style="font-size:9px;color:var(--text-dim);flex-shrink:0;text-align:right">' + (l.saat||'') + '<br>' + fmtD(l.tarih) + '</div></div>';
      }).join('');
    }
  }

  // ── KRİTİK SÜRELER ──
  renderDashSureler();
  // ── MENFAAT ÇAKIŞMASI ──
  if (typeof renderDashMenfaat === 'function') renderDashMenfaat();
  // ── DANIŞMANLIK ──
  var dd = document.getElementById('dash-danismanlik');
  if (dd) dd.innerHTML = typeof renderDashDanismanlik === 'function' ? renderDashDanismanlik() : '';

  // ── HAVA DURUMU (badge) ──
  renderHavaDurumu();

  // ── Drag & Drop başlat ──
  initDashDragDrop();
}

// ================================================================
// HIZLI İŞLEMLER WİDGET
// ================================================================
function renderHizliIslemler() {
  var el = document.getElementById('dash-hizli-islem');
  if (!el) return;
  el.innerHTML =
    '<div class="hi-btn" onclick="showPage(\'muvekkillar\',document.getElementById(\'ni-muvekkillar\'));setTimeout(function(){if(typeof openModal===\'function\')openModal(\'m-modal\');},300)"><span class="hi-ikon">👤</span><span>Müvekkil</span></div>' +
    '<div class="hi-btn" onclick="showPage(\'davalar\',document.getElementById(\'ni-davalar\'));setTimeout(function(){if(typeof openModal===\'function\')openModal(\'dav-modal\');},300)"><span class="hi-ikon">📁</span><span>Dava</span></div>' +
    '<div class="hi-btn" onclick="showPage(\'icra\',document.getElementById(\'ni-icra\'));setTimeout(function(){if(typeof openModal===\'function\')openModal(\'icra-modal\');},300)"><span class="hi-ikon">⚖️</span><span>İcra</span></div>' +
    '<div class="hi-btn" onclick="showPage(\'takvim\',document.getElementById(\'ni-takvim\'))"><span class="hi-ikon">📅</span><span>Etkinlik</span></div>' +
    '<div class="hi-btn" onclick="showPage(\'todo\',document.getElementById(\'ni-todo\'))"><span class="hi-ikon">✅</span><span>Görev</span></div>' +
    '<div class="hi-btn" onclick="showPage(\'ihtarname\',document.getElementById(\'ni-ihtarname\'))"><span class="hi-ikon">📨</span><span>İhtarname</span></div>';
}

// ================================================================
// GÜNDEM WİDGET (Bugünkü Ajanda + Yaklaşan Duruşmalar birleşik)
// ================================================================
function renderGundem() {
  var el = document.getElementById('dash-gundem');
  if (!el) return;
  var t = today();
  var now = new Date();
  var gundem = [];

  var turRenk = {
    'Duruşma': '#e74c3c', 'Son Gün': '#e67e22', 'Görev Son Gün': '#e67e22',
    'Toplantı': '#2980b9', 'Randevu': '#16a085', 'Etkinlik': '#C9A84C'
  };

  // Bugünkü etkinlikler
  state.etkinlikler.forEach(function(e) {
    if (e.tarih === t) {
      gundem.push({ tarih: t, saat: e.saat || '', baslik: e.baslik || '', tur: e.tur || 'Etkinlik', muv: e.muvId ? getMuvAd(e.muvId) : '', bugun: true });
    }
  });

  // Bugünkü duruşmalar (davalardan)
  state.davalar.forEach(function(d) {
    if ((d.durusma === t || d.sonDurusma === t) && (d.durum === 'Aktif' || d.durum === 'Devam Ediyor')) {
      gundem.push({ tarih: t, saat: d.durusmaSaat || '', baslik: (d.no || '') + ' — ' + (d.konu || ''), tur: 'Duruşma', muv: d.muvId ? getMuvAd(d.muvId) : '', bugun: true });
    }
  });

  // Bugünkü görev son tarihleri
  (state.todolar || []).forEach(function(td) {
    if (td.sonTarih === t && td.durum !== 'Tamamlandı') {
      gundem.push({ tarih: t, saat: '', baslik: td.baslik || '', tur: 'Görev Son Gün', muv: td.muvId ? getMuvAd(td.muvId) : '', bugun: true });
    }
  });

  // Yaklaşan duruşmalar (gelecek 30 gün)
  state.etkinlikler.filter(function(e){return e.tarih > t && (e.tur==='Duruşma'||e.baslik.toLowerCase().indexOf('duruşma')!==-1);}).forEach(function(e) {
    gundem.push({ tarih: e.tarih, saat: e.saat||'', baslik: e.baslik, tur: 'Duruşma', muv: e.muvId?getMuvAd(e.muvId):'', bugun: false });
  });
  state.davalar.filter(function(d){return d.durusma && d.durusma > t && (d.durum==='Aktif'||d.durum==='Devam Ediyor');}).forEach(function(d) {
    if (!gundem.some(function(x){return x.tarih===d.durusma && x.baslik.indexOf(d.konu)!==-1;})) {
      gundem.push({ tarih: d.durusma, saat: '', baslik: d.no+' — '+d.konu, tur: 'Duruşma', muv: getMuvAd(d.muvId), bugun: false });
    }
  });

  gundem.sort(function(a,b) { return a.tarih.localeCompare(b.tarih) || (a.saat||'99').localeCompare(b.saat||'99'); });

  if (!gundem.length) {
    el.innerHTML = '<div class="dash-empty-compact"><span>☀️</span><span>Gündemde etkinlik yok</span><a onclick="showPage(\'takvim\',document.getElementById(\'ni-takvim\'))">Ekle ›</a></div>';
    return;
  }

  el.innerHTML = gundem.slice(0, 8).map(function(e) {
    var renk = turRenk[e.tur] || '#7f8c8d';
    var gun = Math.ceil((new Date(e.tarih) - now) / 86400000);
    var gunLabel = e.bugun ? '<b style="color:#e74c3c;font-size:9px">BUGÜN</b>' : gun === 1 ? '<span style="color:#e67e22;font-size:9px">YARIN</span>' : '<span style="font-size:9px;color:var(--text-dim)">' + fmtD(e.tarih) + '</span>';
    return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">' +
      '<div style="width:6px;height:6px;border-radius:50%;background:' + renk + ';flex-shrink:0"></div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + e.baslik + '</div>' +
        '<div style="font-size:10px;color:var(--text-muted)">' + (e.saat ? e.saat + ' · ' : '') + (e.muv || '') + '</div>' +
      '</div>' +
      '<div style="flex-shrink:0;text-align:right">' + gunLabel + '<div style="font-size:9px;padding:1px 6px;border-radius:3px;background:' + renk + '18;color:' + renk + '">' + e.tur + '</div></div>' +
    '</div>';
  }).join('') +
  (gundem.length > 8 ? '<div style="font-size:10px;color:var(--gold);text-align:center;padding:6px;cursor:pointer" onclick="showPage(\'takvim\',document.getElementById(\'ni-takvim\'))">+' + (gundem.length-8) + ' daha ›</div>' : '');
}

// ================================================================
// BU HAFTA YAPILACAKLAR WİDGET
// ================================================================
function renderBuHaftaGorevler(gorevler) {
  var el = document.getElementById('dash-gorevler');
  if (!el) return;
  var t = today();

  if (!gorevler || !gorevler.length) {
    el.innerHTML = '<div class="dash-empty-compact"><span>🎉</span><span>Bu hafta tüm işler tamam!</span><a onclick="showPage(\'todo\',document.getElementById(\'ni-todo\'))">Görevler ›</a></div>';
    return;
  }

  gorevler.sort(function(a,b) {
    var pa = {Yüksek:0,Acil:0,Normal:1,Orta:1,Düşük:2};
    return (pa[a.oncelik]||1) - (pa[b.oncelik]||1) || (a.sonTarih||'9').localeCompare(b.sonTarih||'9');
  });

  el.innerHTML = gorevler.slice(0,8).map(function(td) {
    var gecikme = td.sonTarih && td.sonTarih < t;
    var oncelikR = {Yüksek:'#e74c3c',Acil:'#e74c3c',Normal:'#e67e22',Orta:'#e67e22',Düşük:'var(--text-muted)'}[td.oncelik] || 'var(--text-muted)';
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">' +
      '<span style="width:6px;height:6px;border-radius:50%;background:' + oncelikR + ';flex-shrink:0"></span>' +
      '<div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' + (gecikme?';color:#e74c3c':'') + '">' + td.baslik + '</div>' +
      '<div style="font-size:10px;color:var(--text-muted)">' + (td.muvId?getMuvAd(td.muvId):'') + (td.sonTarih?' · '+fmtD(td.sonTarih):'') + '</div></div>' +
      (gecikme ? '<span style="font-size:9px;background:rgba(231,76,60,.1);color:#e74c3c;padding:2px 6px;border-radius:3px;font-weight:700;flex-shrink:0">GECİKTİ</span>' : '') +
      '</div>';
  }).join('') +
  (gorevler.length > 8 ? '<div style="font-size:10px;color:var(--gold);text-align:center;padding:6px;cursor:pointer" onclick="showPage(\'todo\',document.getElementById(\'ni-todo\'))">+' + (gorevler.length-8) + ' daha ›</div>' : '');
}

// ================================================================
// DASHBOARD DRAG & DROP
// ================================================================

function initDashDragDrop() {
  var containers = document.querySelectorAll('#dash-grid-main');
  containers.forEach(function(container) {
    var panels = container.querySelectorAll('.dash-panel');
    panels.forEach(function(panel) {
      panel.setAttribute('draggable', 'true');
      panel.addEventListener('dragstart', _dashDragStart);
      panel.addEventListener('dragend', _dashDragEnd);
      panel.addEventListener('dragover', _dashDragOver);
      panel.addEventListener('drop', _dashDrop);
    });
  });
  // Sıralama varsa geri yükle
  restoreDashOrder();
}

function _dashDragStart(e) {
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.id);
}

function _dashDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.dash-panel.drag-over').forEach(function(el) { el.classList.remove('drag-over'); });
  saveDashOrder();
}

function _dashDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  var container = this.parentElement;
  var dragging = container.querySelector('.dragging');
  if (!dragging || dragging === this) return;
  var rect = this.getBoundingClientRect();
  var midX = rect.left + rect.width / 2;
  if (e.clientX < midX) {
    container.insertBefore(dragging, this);
  } else {
    container.insertBefore(dragging, this.nextSibling);
  }
}

function _dashDrop(e) {
  e.preventDefault();
}

function saveDashOrder() {
  var order = {};
  ['dash-grid-main'].forEach(function(gid) {
    var container = document.getElementById(gid);
    if (!container) return;
    var ids = [];
    container.querySelectorAll('.dash-panel').forEach(function(p) { ids.push(p.id); });
    order[gid] = ids;
  });
  try { localStorage.setItem('dashboardSiralama', JSON.stringify(order)); } catch(e) { console.warn('[Dashboard] Dashboard sıralaması kaydedilemedi:', e.message || e); }
}

function restoreDashOrder() {
  var saved;
  try { saved = JSON.parse(localStorage.getItem('dashboardSiralama')); } catch(e) { return; }
  if (!saved) return;
  ['dash-grid-main'].forEach(function(gid) {
    var container = document.getElementById(gid);
    if (!container || !saved[gid]) return;
    saved[gid].forEach(function(id) {
      var el = document.getElementById(id);
      if (el && el.parentElement === container) container.appendChild(el);
    });
  });
}

// ================================================================
// DANIŞMANLIK
// ================================================================

const DAN_TUR_RENK = {
  'Danışmanlık / Hukuki Görüş': '#2980b9',
  'İhtarname / Protesto': '#e67e22',
  'Sözleşme Hazırlama': '#16a085',
  'Sözleşme İnceleme': '#C9A84C',
  'İdari Başvuru': '#c0392b',
  'Diğer': '#7f8c8d'
};
const DAN_DURUM_RENK = {
  'Taslak': '#7f8c8d',
  'Devam Ediyor': '#2980b9',
  'Müvekkil Onayında': '#e67e22',
  'Gönderildi': '#f39c12',
  'Tamamlandı': '#27ae60',
  'İptal': '#e74c3c'
};

let aktivDanId = null;

function openDanModal(id) {
  const el = document.getElementById('dan-modal');
  document.getElementById('dan-id').value = '';
  document.getElementById('dan-tur').value = 'Danışmanlık / Hukuki Görüş';
  document.getElementById('dan-konu').value = '';
  document.getElementById('dan-durum').value = 'Taslak';
  document.getElementById('dan-tarih').value = today();
  document.getElementById('dan-teslim').value = '';
  document.getElementById('dan-ucret').value = '';
  document.getElementById('dan-tahsil').value = '';
  document.getElementById('dan-aciklama').value = '';
  document.getElementById('dan-takvim-ekle').checked = false;
  // Müvekkil select doldur
  const ms = document.getElementById('dan-muv');
  ms.innerHTML = '';
  state.muvekkillar.forEach(m => { ms.innerHTML += `<option value="${m.id}">${m.ad}</option>`; });
  if (aktivMuvId) ms.value = aktivMuvId;
  if (id) {
    const d = state.danismanlik.find(x => x.id === id);
    if (d) {
      document.getElementById('dan-id').value = d.id;
      document.getElementById('dan-tur').value = d.tur;
      ms.value = d.muvId;
      document.getElementById('dan-konu').value = d.konu;
      document.getElementById('dan-durum').value = d.durum;
      document.getElementById('dan-tarih').value = d.tarih || '';
      document.getElementById('dan-teslim').value = d.teslimTarih || '';
      document.getElementById('dan-ucret').value = d.ucret || '';
      document.getElementById('dan-tahsil').value = d.tahsilEdildi || '';
      document.getElementById('dan-aciklama').value = d.aciklama || '';
      document.getElementById('dan-modal-title').textContent = 'Hizmeti Düzenle';
    }
  } else {
    document.getElementById('dan-modal-title').textContent = 'Yeni Hizmet';
  }
  openModal('dan-modal');
}

function toggleDanTakvim(cb) {
  var teslimEl = document.getElementById('dan-teslim');
  if (!teslimEl) return;
  if (cb.checked) {
    teslimEl.style.borderColor = 'var(--gold)';
    if (!teslimEl.value) teslimEl.focus();
  } else {
    teslimEl.style.borderColor = '';
  }
}

async function saveDan() {
  const konu = document.getElementById('dan-konu').value.trim();
  const muvId = document.getElementById('dan-muv').value;
  if(!zorunluKontrol([{id:'dan-konu',deger:konu,label:'Konu'}])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  if (!muvId) { notify('Müvekkil seçiniz!'); return; }
  const id = document.getElementById('dan-id').value;
  const ucret = parseFloat(document.getElementById('dan-ucret').value) || 0;
  const tahsil = parseFloat(document.getElementById('dan-tahsil').value) || 0;
  const teslim = document.getElementById('dan-teslim').value;
  const ekTakvim = document.getElementById('dan-takvim-ekle').checked;
  let takvimId = null;
  var kayit;
  if (id) {
    kayit = state.danismanlik.find(x => x.id === id);
    if (kayit) {
      kayit.tur = document.getElementById('dan-tur').value;
      kayit.muvId = muvId; kayit.konu = konu;
      kayit.durum = document.getElementById('dan-durum').value;
      kayit.tarih = document.getElementById('dan-tarih').value;
      kayit.teslimTarih = teslim; kayit.ucret = ucret; kayit.tahsilEdildi = tahsil;
      kayit.aciklama = document.getElementById('dan-aciklama').value.trim();
      takvimId = kayit.takvimId;
    }
  } else {
    kayit = {
      id: uid(), muvId, sira: (state.danismanlik.length + 1),
      tur: document.getElementById('dan-tur').value,
      konu, durum: document.getElementById('dan-durum').value,
      tarih: document.getElementById('dan-tarih').value,
      teslimTarih: teslim, ucret, tahsilEdildi: tahsil,
      aciklama: document.getElementById('dan-aciklama').value.trim(),
      notlar: [], evraklar: [], takvimId: null
    };
    if (ekTakvim && teslim) {
      const etk = { id: uid(), baslik: konu + ' (Teslim)', tarih: teslim, saat: '', tur: 'Son Gün', muvId, acik: 'Danışmanlık hizmeti teslim tarihi' };
      state.etkinlikler.push(etk);
      kayit.takvimId = etk.id;
    }
  }

  if (typeof LexSubmit !== 'undefined') {
    var btn = document.querySelector('#dan-modal .btn-gold');
    var ok = await LexSubmit.formKaydet({ tablo:'danismanlik', kayit:kayit, modalId:'dan-modal', butonEl:btn, basariMesaj:'✓ Hizmet kaydedildi',
      renderFn:function(){
        if (!id) { if (ekTakvim && teslim && !takvimId) { var etk2={id:uid(),baslik:konu+' (Teslim)',tarih:teslim,saat:'',tur:'Son Gün',muvId,acik:'Danışmanlık teslim'}; state.etkinlikler.push(etk2); } }
        renderDanismanlik(); updateBadges();
        if (document.getElementById('mt-danismanlik')?.classList.contains('active')) renderMdDanismanlik();
      }
    });
    if(!ok) return;
  } else {
    if (!id) state.danismanlik.push(kayit);
    if (ekTakvim && teslim && !takvimId) {
      const etk = { id: uid(), baslik: konu + ' (Teslim)', tarih: teslim, saat: '', tur: 'Son Gün', muvId, acik: 'Danışmanlık hizmeti teslim tarihi' };
      state.etkinlikler.push(etk);
      const d = state.danismanlik.find(x => x.id === (id||kayit.id));
      if (d) d.takvimId = etk.id;
    }
    saveData(); closeModal('dan-modal'); renderDanismanlik(); updateBadges(); notify('✓ Hizmet kaydedildi');
  }
}

// ================================================================
// DASHBOARD — MENFAAT ÇAKIŞMASI ÖZETİ
// ================================================================
function renderDashMenfaat() {
  const el = document.getElementById('dash-menfaat');
  if (!el || typeof MenfaatKontrol === 'undefined') return;

  const cakismalar = MenfaatKontrol.tumSistemiTara();
  const kesinSayi = cakismalar.filter(c => c.kesin).length;
  const olasiSayi = cakismalar.length - kesinSayi;

  if (!cakismalar.length) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0">
        <div style="font-size:28px">✅</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--green)">Temiz</div>
          <div style="font-size:11px;color:var(--text-muted)">Menfaat çakışması tespit edilmedi</div>
        </div>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer" onclick="MenfaatKontrol.raporGoster()">
      <div style="font-size:28px">${kesinSayi > 0 ? '🚫' : '⚠️'}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:${kesinSayi > 0 ? 'var(--red)' : '#e67e22'}">
          ${cakismalar.length} Çakışma Tespit Edildi
        </div>
        <div style="font-size:11px;color:var(--text-muted)">
          ${kesinSayi > 0 ? kesinSayi + ' kesin · ' : ''}${olasiSayi > 0 ? olasiSayi + ' olası' : ''}
           — Detay için tıklayın
        </div>
      </div>
      <span style="color:var(--text-muted);font-size:18px">→</span>
    </div>
    ${cakismalar.slice(0, 3).map(c => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--border);font-size:11px">
        <span style="color:${c.kesin ? 'var(--red)' : '#e67e22'}">${c.kesin ? '🚫' : '⚠️'}</span>
        <span style="color:var(--text);font-weight:600">${escHTML(c.muvekkil.ad)}</span>
        <span style="color:var(--text-dim)">⚔️</span>
        <span style="color:var(--text);font-weight:600">${escHTML(c.karsiTaraf.ad)}</span>
        <span style="margin-left:auto;font-size:10px;color:var(--text-dim)">%${c.skor}</span>
      </div>
    `).join('')}
    ${cakismalar.length > 3 ? `<div style="font-size:10px;color:var(--text-muted);text-align:center;padding:6px 0;border-top:1px solid var(--border)">+${cakismalar.length - 3} daha...</div>` : ''}`;
}

// ================================================================
// HAVA DURUMU BADGE (hoşgeldin satırı — inline)
// ================================================================
var _havaCache = null;
var _havaCacheT = 0;

function renderHavaDurumu() {
  var el = document.getElementById('dash-hava-badge');
  if (!el) return;

  // 30dk cache
  if (_havaCache && Date.now() - _havaCacheT < 1800000) {
    el.innerHTML = _havaCache;
    return;
  }

  if (!navigator.geolocation) {
    _havaFetch(el, 41.01, 28.98);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function(pos) { _havaFetch(el, pos.coords.latitude, pos.coords.longitude); },
    function() { _havaFetch(el, 41.01, 28.98); },
    { timeout: 5000, maximumAge: 600000 }
  );
}

function _havaFetch(el, lat, lon) {
  fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code&timezone=auto')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.current) return;
      var wc = _havaKod(data.current.weather_code);
      var html = '<span class="hava-badge">' + wc.ikon + ' ' + Math.round(data.current.temperature_2m) + '°C <span style="color:var(--text-dim)">' + wc.aciklama + '</span></span>';
      el.innerHTML = html;
      _havaCache = html;
      _havaCacheT = Date.now();
    })
    .catch(function() {});
}

function _havaKod(code) {
  var kodlar = {
    0:{ikon:'☀️',aciklama:'Açık'}, 1:{ikon:'🌤️',aciklama:'Az bulutlu'}, 2:{ikon:'⛅',aciklama:'Parçalı bulutlu'},
    3:{ikon:'☁️',aciklama:'Bulutlu'}, 45:{ikon:'🌫️',aciklama:'Sisli'}, 48:{ikon:'🌫️',aciklama:'Kırağılı sis'},
    51:{ikon:'🌦️',aciklama:'Hafif çisenti'}, 53:{ikon:'🌦️',aciklama:'Çisenti'}, 55:{ikon:'🌦️',aciklama:'Yoğun çisenti'},
    61:{ikon:'🌧️',aciklama:'Hafif yağmur'}, 63:{ikon:'🌧️',aciklama:'Yağmur'}, 65:{ikon:'🌧️',aciklama:'Şiddetli yağmur'},
    66:{ikon:'🌧️',aciklama:'Dondurucu yağmur'}, 67:{ikon:'🌧️',aciklama:'Şiddetli dondurucu yağmur'},
    71:{ikon:'🌨️',aciklama:'Hafif kar'}, 73:{ikon:'🌨️',aciklama:'Kar yağışı'}, 75:{ikon:'🌨️',aciklama:'Yoğun kar'},
    77:{ikon:'🌨️',aciklama:'Kar taneleri'}, 80:{ikon:'🌦️',aciklama:'Hafif sağanak'}, 81:{ikon:'🌧️',aciklama:'Sağanak yağmur'},
    82:{ikon:'🌧️',aciklama:'Şiddetli sağanak'}, 85:{ikon:'🌨️',aciklama:'Kar sağanağı'}, 86:{ikon:'🌨️',aciklama:'Yoğun kar sağanağı'},
    95:{ikon:'⛈️',aciklama:'Gök gürültülü fırtına'}, 96:{ikon:'⛈️',aciklama:'Dolu ile fırtına'}, 99:{ikon:'⛈️',aciklama:'Şiddetli dolu fırtınası'}
  };
  return kodlar[code] || {ikon:'🌡️',aciklama:'Bilinmiyor'};
}
