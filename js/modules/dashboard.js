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
      items.push({ tarih: d.teslimTarih, gun, baslik: `Teslim: ${d.konu||''}`, tur: 'Teslim', renk: '#8e44ad', muvAd: d.muvId ? getMuvAd(d.muvId) : '', hedef: 'danismanlik' });
    }
  });

  items.sort((a,b) => a.tarih.localeCompare(b.tarih));

  const el = document.getElementById('dash-sureler');
  if (!el) return;
  if (!items.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">✅</div><p>30 gün içinde kritik işlem yok</p></div>'; return; }

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
  var ay = now.getMonth(); // 0-indexed

  // ── Hoşgeldin mesajı ──
  var saat = now.getHours();
  var selamlama = saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar';
  var hgEl = document.getElementById('dash-hosgeldin');
  if (hgEl) hgEl.textContent = selamlama + (currentUser ? ', ' + (currentUser.ad || currentUser.ad_soyad || '') : '') + ' — ' + new Date().toLocaleDateString('tr-TR', {weekday:'long', day:'numeric', month:'long'});

  // ── KPI hesaplamaları ──
  var muvSayi = state.muvekkillar.length;
  var aktifDava = state.davalar.filter(function(d){return d.durum === 'Aktif' || d.durum === 'Devam Ediyor';}).length;
  var aktifIcra = state.icra.filter(function(i){return i.durum !== 'kapandi' && i.durum !== 'Kapandı';}).length;
  var aktifArab = (state.arabuluculuk||[]).filter(function(a){return a.durum !== 'Uzlaşma Sağlandı' && a.durum !== 'Dava Açıldı';}).length;
  var aktifDan = state.danismanlik.filter(function(d){return d.durum !== 'Tamamlandı' && d.durum !== 'İptal';}).length;
  var bekGorev = (state.todolar||[]).filter(function(td){return td.durum === 'Bekliyor' || td.durum === 'Devam Ediyor';}).length;

  // Finansal
  var yilG = state.butce.filter(function(b){return b.tur==='Gelir' && b.tarih && b.tarih.startsWith(yil);}).reduce(function(s,b){return s+b.tutar;},0);
  var yilD = state.butce.filter(function(b){return b.tur==='Gider' && b.tarih && b.tarih.startsWith(yil);}).reduce(function(s,b){return s+b.tutar;},0);
  var yilNet = yilG - yilD;

  // İcra toplam alacak/tahsil
  var topAlacak = state.icra.reduce(function(s,i){return s+(i.alacak||0);},0);
  var topTahsil = state.icra.reduce(function(s,i){return s+(i.tahsil||0);},0);
  var topKalan = topAlacak - topTahsil;
  var tahsilOran = topAlacak > 0 ? Math.round(topTahsil / topAlacak * 100) : 0;

  // Bekleyen alacaklar
  var beklAlacak = (state.avanslar||[]).filter(function(a){return a.durum==='Bekliyor';}).reduce(function(s,a){return s+(a.tutar||0);},0);

  // Yaklaşan duruşma sayısı (7 gün)
  var haftaSonu = new Date(); haftaSonu.setDate(haftaSonu.getDate()+7);
  var haftaS = haftaSonu.toISOString().split('T')[0];
  var yakDurusma = state.etkinlikler.filter(function(e){return e.tarih >= t && e.tarih <= haftaS && (e.tur==='Duruşma'||e.baslik.includes('Duruşma'));}).length;
  yakDurusma += state.davalar.filter(function(d){return d.durusma && d.durusma >= t && d.durusma <= haftaS;}).length;

  // ── KPI KARTLARI ──
  document.getElementById('dash-cards').innerHTML =
    '<div class="card"><div class="card-label">Müvekkil</div><div class="card-value gold">' + muvSayi + '</div></div>' +
    '<div class="card"><div class="card-label">Aktif Dava</div><div class="card-value gold">' + aktifDava + '</div></div>' +
    '<div class="card"><div class="card-label">Aktif İcra</div><div class="card-value" style="color:#e74c3c">' + aktifIcra + '</div></div>' +
    '<div class="card" style="border:1px solid rgba(41,128,185,.3)"><div class="card-label">Bu Hafta Duruşma</div><div class="card-value" style="color:#2980b9">' + yakDurusma + '</div></div>' +
    '<div class="card"><div class="card-label">' + yil + ' Gelir</div><div class="card-value green">' + fmt(yilG) + '</div></div>' +
    '<div class="card"><div class="card-label">' + yil + ' Gider</div><div class="card-value red">' + fmt(yilD) + '</div></div>' +
    '<div class="card"><div class="card-label">' + yil + ' Net</div><div class="card-value" style="color:' + (yilNet>=0?'var(--green)':'#e74c3c') + '">' + fmt(yilNet) + '</div></div>' +
    '<div class="card"><div class="card-label">İcra Tahsilat</div><div class="card-value green">' + fmt(topTahsil) + '<div class="progress-bar" style="margin-top:4px"><div class="progress-fill" style="width:' + tahsilOran + '%"></div></div><div style="font-size:9px;color:var(--text-dim)">%' + tahsilOran + ' — Kalan: ' + fmt(topKalan) + '</div></div></div>' +
    (beklAlacak > 0 ? '<div class="card" style="border:1px solid rgba(231,76,60,.3)"><div class="card-label">Bekleyen Alacak</div><div class="card-value" style="color:#e74c3c">' + fmt(beklAlacak) + '</div></div>' : '') +
    (bekGorev > 0 ? '<div class="card"><div class="card-label">Açık Görev</div><div class="card-value" style="color:#e67e22">' + bekGorev + '</div></div>' : '');

  // ── YAKLAŞAN DURUŞMALAR ──
  var durusmalar = [];
  state.etkinlikler.filter(function(e){return e.tarih >= t && (e.tur==='Duruşma'||e.baslik.toLowerCase().includes('duruşma'));}).forEach(function(e) {
    durusmalar.push({tarih:e.tarih, saat:e.saat||'', baslik:e.baslik, muv:e.muvId?getMuvAd(e.muvId):'', yer:e.yer||e.not||''});
  });
  state.davalar.filter(function(d){return d.durusma && d.durusma >= t && d.durum==='Aktif';}).forEach(function(d) {
    if (!durusmalar.some(function(x){return x.tarih===d.durusma && x.baslik.includes(d.konu);})) {
      durusmalar.push({tarih:d.durusma, saat:'', baslik:d.no+' — '+d.konu, muv:getMuvAd(d.muvId), yer:[d.il,d.mno].filter(Boolean).join(' ')});
    }
  });
  durusmalar.sort(function(a,b){return a.tarih.localeCompare(b.tarih);});
  var durEl = document.getElementById('dash-durusmalar');
  if (durEl) {
    if (!durusmalar.length) {
      durEl.innerHTML = '<div class="empty"><div class="empty-icon">⚖️</div><p>Yaklaşan duruşma yok</p></div>';
    } else {
      durEl.innerHTML = durusmalar.slice(0,8).map(function(d) {
        var gun = Math.ceil((new Date(d.tarih) - now) / 86400000);
        var acil = gun <= 1 ? 'background:rgba(231,76,60,.06);border-left:3px solid #e74c3c;' : gun <= 3 ? 'border-left:3px solid #e67e22;' : 'border-left:3px solid #2980b9;';
        var gunLabel = gun <= 0 ? '<b style="color:#e74c3c">BUGÜN</b>' : gun === 1 ? '<b style="color:#e74c3c">YARIN</b>' : '<span style="color:' + (gun<=3?'#e67e22':'var(--text-muted)') + '">' + gun + ' gün</span>';
        return '<div style="padding:8px 10px;margin-bottom:4px;border-radius:6px;' + acil + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<div style="font-size:12px;font-weight:600">' + d.baslik + '</div>' +
          '<div style="text-align:right;flex-shrink:0;margin-left:10px">' + gunLabel + '<div style="font-size:10px;color:var(--text-dim)">' + fmtD(d.tarih) + (d.saat ? ' ' + d.saat : '') + '</div></div></div>' +
          '<div style="font-size:10px;color:var(--text-muted);margin-top:2px">' + d.muv + (d.yer ? ' · ' + d.yer : '') + '</div></div>';
      }).join('');
    }
  }

  // ── ACİL GÖREVLER ──
  var gorevler = (state.todolar||[]).filter(function(td){return td.durum !== 'Tamamlandı';}).sort(function(a,b) {
    var pa = {Yüksek:0,Acil:0,Normal:1,Orta:1,Düşük:2}; return (pa[a.oncelik]||1) - (pa[b.oncelik]||1) || (a.sonTarih||'9').localeCompare(b.sonTarih||'9');
  });
  var grvEl = document.getElementById('dash-gorevler');
  if (grvEl) {
    if (!gorevler.length) {
      grvEl.innerHTML = '<div class="empty"><div class="empty-icon">✅</div><p>Açık görev yok</p></div>';
    } else {
      grvEl.innerHTML = gorevler.slice(0,6).map(function(td) {
        var gecikme = td.sonTarih && td.sonTarih < t;
        var oncelikR = {Yüksek:'#e74c3c',Acil:'#e74c3c',Normal:'#e67e22',Orta:'#e67e22',Düşük:'var(--text-muted)'}[td.oncelik] || 'var(--text-muted)';
        return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">' +
          '<span style="width:6px;height:6px;border-radius:50%;background:' + oncelikR + ';flex-shrink:0"></span>' +
          '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' + (gecikme?';color:#e74c3c':'') + '">' + td.baslik + '</div>' +
          '<div style="font-size:10px;color:var(--text-muted)">' + (td.muvId?getMuvAd(td.muvId):'') + (td.sonTarih?' · '+fmtD(td.sonTarih):'') + '</div></div>' +
          (gecikme ? '<span style="font-size:9px;background:rgba(231,76,60,.1);color:#e74c3c;padding:2px 6px;border-radius:3px;font-weight:700;flex-shrink:0">GECİKTİ</span>' : '') +
          '</div>';
      }).join('');
    }
  }

  // ── AYLIK PERFORMANS GRAFİĞİ ──
  var perfEl = document.getElementById('dash-performans');
  if (perfEl) {
    var aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    var maxVal = 1;
    var ayData = [];
    for (var ai = 0; ai < 12; ai++) {
      var ayStr = yil + '-' + String(ai+1).padStart(2,'0');
      var g = state.butce.filter(function(b){return b.tur==='Gelir' && b.tarih && b.tarih.startsWith(ayStr);}).reduce(function(s,b){return s+b.tutar;},0);
      var d2 = state.butce.filter(function(b){return b.tur==='Gider' && b.tarih && b.tarih.startsWith(ayStr);}).reduce(function(s,b){return s+b.tutar;},0);
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

  // ── VADESİ GEÇEN ALACAKLAR ──
  var vgEl = document.getElementById('dash-vadesi-gecen');
  if (vgEl) {
    var gecenler = [];
    // Avanslardan bekleyenler
    (state.avanslar||[]).filter(function(a){return a.durum==='Bekliyor' && a.tutar > 0;}).forEach(function(a) {
      gecenler.push({muv:getMuvAd(a.muvId), tutar:a.tutar, tur:a.tur||'Alacak', tarih:a.tarih, dosya:a.dosyaNo||''});
    });
    // Ödenmemiş faturalar
    (state.faturalar||[]).filter(function(f){return (f.durum==='bekliyor'||f.durum==='gecikti') && f.vade && f.vade < t;}).forEach(function(f) {
      gecenler.push({muv:getMuvAd(f.muvId), tutar:f.genelToplam||0, tur:'Fatura #'+f.no, tarih:f.vade, dosya:''});
    });
    gecenler.sort(function(a,b){return b.tutar - a.tutar;});
    var topVG = gecenler.reduce(function(s,g){return s+g.tutar;},0);

    if (!gecenler.length) {
      vgEl.innerHTML = '<div class="empty"><div class="empty-icon">✅</div><p>Vadesi geçen alacak yok</p></div>';
    } else {
      vgEl.innerHTML = '<div style="text-align:center;padding:8px 0;margin-bottom:8px;background:rgba(231,76,60,.06);border-radius:6px"><div style="font-size:10px;color:#e74c3c">TOPLAM</div><div style="font-size:20px;font-weight:800;color:#e74c3c">' + fmt(topVG) + '</div></div>' +
        gecenler.slice(0,6).map(function(g) {
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)">' +
            '<div><div style="font-size:12px;font-weight:600">' + g.muv + '</div>' +
            '<div style="font-size:10px;color:var(--text-muted)">' + g.tur + (g.dosya ? ' · ' + g.dosya : '') + '</div></div>' +
            '<div style="text-align:right"><div style="font-size:13px;font-weight:700;color:#e74c3c">' + fmt(g.tutar) + '</div>' +
            '<div style="font-size:9px;color:var(--text-dim)">' + fmtD(g.tarih) + '</div></div></div>';
        }).join('') +
        (gecenler.length > 6 ? '<div style="font-size:10px;color:var(--text-muted);text-align:center;padding:6px">+' + (gecenler.length-6) + ' daha</div>' : '');
    }
  }

  // ── SON AKTİVİTELER ──
  var aktEl = document.getElementById('dash-aktivite');
  if (aktEl) {
    var log = (state.aktiviteLog||[]).slice(-10).reverse();
    if (!log.length) {
      aktEl.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><p>Henüz aktivite yok</p></div>';
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

  // ── KRİTİK SÜRELER (mevcut) ──
  renderDashSureler();
  // ── MENFAAT ÇAKIŞMASI ──
  if (typeof renderDashMenfaat === 'function') renderDashMenfaat();
  // ── DANIŞMANLIK ──
  var dd = document.getElementById('dash-danismanlik');
  if (dd) dd.innerHTML = typeof renderDashDanismanlik === 'function' ? renderDashDanismanlik() : '';
}

// ================================================================
// DANIŞMANLIK
// ================================================================

const DAN_TUR_RENK = {
  'Danışmanlık / Hukuki Görüş': '#2980b9',
  'İhtarname / Protesto': '#e67e22',
  'Sözleşme Hazırlama': '#16a085',
  'Sözleşme İnceleme': '#8e44ad',
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
  // Takvim checkbox toggle — ileride geliştirilebilir
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
