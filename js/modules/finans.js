// ================================================================
// EMD HUKUK — FINANS VE FATURA
// js/modules/finans.js
// ================================================================

// ── Eski fonksiyonlar için uyumluluk ─────────────────────────────
// renderButce artık yok — çağıran kodların kırılmaması için
function renderButce() { try { renderFinansKPI(); renderBuroGiderleri(); } catch(e) { console.warn('[Finans] renderButce hatası:', e.message || e); } }
function tumFinansHesapla(f) {
  var kz = FinansMotoru.buroKarZarar(f || {});
  return { gelir: kz.gelirler.toplam, gider: kz.giderler.toplam, net: kz.net, gelirler: kz.gelirler, giderler: kz.giderler, karZararOrani: kz.karZararOrani };
}
function openButceModal() { openBuroGiderModal(); }
function filterButce() {}
function filterButceKat() {}

// ── KPI Kartları Render ──────────────────────────────────────────
function renderFinansKPI() {
  var el = document.getElementById('finans-kpi-bar');
  if (!el) return;
  var yil = new Date().getFullYear().toString();
  var kz = FinansMotoru.buroKarZarar({ yil: yil });
  var buAy = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  var kzAy = FinansMotoru.buroKarZarar({ yil: yil, ay: new Date().getMonth() });

  // Bekleyen alacak hesapla
  var beklAlacak = 0;
  (state.muvekkillar || []).forEach(function(m) {
    var oz = FinansMotoru.muvekkilOzet(m.id);
    if (oz.bakiye.masrafBakiye < 0) beklAlacak += Math.abs(oz.bakiye.masrafBakiye);
    beklAlacak += oz.bakiye.vekaletBakiye;
  });

  el.innerHTML =
    '<div class="card"><div class="card-label">Toplam Gelir' + helpTip('Vekalet ücretleri, hakedişler, danışmanlık ve arabuluculuk gelirlerinin toplamı') + '</div><div class="card-value green">' + fmt(kz.gelirler.toplam) + '</div></div>' +
    '<div class="card"><div class="card-label">Toplam Gider' + helpTip('Büro operasyonel giderlerinin toplamı') + '</div><div class="card-value red">' + fmt(kz.giderler.toplam) + '</div></div>' +
    '<div class="card"><div class="card-label">Büro Gideri</div><div class="card-value" style="color:var(--text-muted)">' + fmt(kz.giderler.buroGiderToplam) + '</div></div>' +
    '<div class="card"><div class="card-label">Net Kâr/Zarar' + helpTip('Toplam gelir eksi toplam gider. Büronun genel mali performansı') + '</div><div class="card-value" style="color:' + (kz.net >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(kz.net) + '</div></div>' +
    '<div class="card"><div class="card-label">Bu Ay Net</div><div class="card-value" style="color:' + (kzAy.net >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(kzAy.net) + '</div></div>' +
    '<div class="card"><div class="card-label">Bekleyen Alacak' + helpTip('Müvekkillerden tahsil edilmemiş masraf alacakları ve vekalet ücreti bakiyeleri') + '</div><div class="card-value" style="color:' + (beklAlacak > 0 ? '#f39c12' : 'var(--text-muted)') + '">' + fmt(beklAlacak) + '</div></div>';
}

// ── Finansal Uyarılar (mini bar) ─────────────────────────────────
function renderFinansUyariBar() {
  var el = document.getElementById('finans-uyari-bar');
  if (!el) return;
  var uyarilar = FinansMotoru.hesaplaUyarilar();
  if (!uyarilar.length) { el.innerHTML = ''; return; }
  var goster = uyarilar.slice(0, 3);
  var html = '';
  goster.forEach(function(u) {
    var cls = u.oncelik === 'yuksek' ? 'kritik' : (u.oncelik === 'dusuk' ? 'bilgi' : '');
    html += '<div class="finans-uyari ' + cls + '"><span class="finans-uyari-icon">' + (u.icon || u.ikon || '⚠️') + '</span><div class="finans-uyari-text">' + escHTML(u.mesaj) + '</div></div>';
  });
  if (uyarilar.length > 3) {
    html += '<div style="text-align:center;padding:6px"><button class="btn btn-sm" onclick="finansTab(\'uyarilar\')" style="font-size:11px">Tümünü Gör (' + uyarilar.length + ')</button></div>';
  }
  el.innerHTML = html;
}

// ── Müvekkil Bakiye Kartları ─────────────────────────────────────
function renderMuvekkilBakiye() {
  var el = document.getElementById('muvekkil-bakiye-liste');
  if (!el) return;
  var muvler = state.muvekkillar || [];
  if (!muvler.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">👤</div><p>Müvekkil yok</p></div>'; return; }

  // Arama filtresi
  var araEl = document.getElementById('muv-bakiye-ara');
  var q = araEl ? araEl.value.toLowerCase().trim() : '';

  var html = '';
  muvler.forEach(function(m) {
    if (q && m.ad.toLowerCase().indexOf(q) === -1) return;

    var oz = FinansMotoru.muvekkilOzet(m.id);

    // Hiç hareket yoksa gösterme
    if (oz.masraflar.toplam === 0 && oz.avanslar.alinan === 0 && oz.tahsilatlar.toplam === 0 &&
        oz.vekaletUcreti.akdi.anlasilanToplam === 0 && oz.aktarimlar.toplam === 0) return;

    var genelBakiye = oz.bakiye.genelBakiye;
    var bakiyeRenk = genelBakiye >= 0 ? 'var(--green)' : 'var(--red)';
    var bakiyeCls = genelBakiye >= 0 ? 'pozitif' : 'negatif';

    html += '<div class="muv-bakiye-card" onclick="openCariEkstre(\'' + m.id + '\')">';
    html += '<div class="muv-bakiye-header">';
    html += '<div class="muv-bakiye-ad">' + escHTML(m.ad) + '</div>';
    html += '<div style="text-align:right"><div style="font-size:10px;color:var(--text-dim)">GENEL BAKİYE' + helpTip('Müvekkil ile olan tüm alacak-borç ilişkisinin özeti') + '</div>';
    html += '<div style="font-size:18px;font-weight:800;color:' + bakiyeRenk + '">' + fmt(genelBakiye) + '</div></div>';
    html += '</div>';

    html += '<div class="muv-bakiye-grid">';
    html += '<div class="muv-bakiye-item"><span class="label">Masraf Bakiyesi' + helpTip('Masraf avansı alınan eksi yapılan masraflar. Artı ise avans fazlası, eksi ise müvekkilden alacağınız var') + '</span><span class="value ' + (oz.bakiye.masrafBakiye >= 0 ? 'pozitif' : 'negatif') + '">' + fmt(oz.bakiye.masrafBakiye) + '</span></div>';
    html += '<div class="muv-bakiye-item"><span class="label">Tahsilat Bakiyesi' + helpTip('Karşı taraftan tahsil edilen tutardan hakediş ve aktarımlar düşüldükten sonra müvekkile aktarılması gereken tutar') + '</span><span class="value ' + (oz.bakiye.tahsilatBakiye >= 0 ? 'pozitif' : 'negatif') + '">' + fmt(oz.bakiye.tahsilatBakiye) + '</span></div>';
    html += '<div class="muv-bakiye-item"><span class="label">Vekalet Bakiyesi' + helpTip('Anlaşılan vekalet ücretinden tahsil edilen kısım düşüldükten sonra kalan alacak') + '</span><span class="value ' + (oz.bakiye.vekaletBakiye > 0 ? 'pozitif' : '') + '">' + fmt(oz.bakiye.vekaletBakiye) + '</span></div>';
    html += '<div class="muv-bakiye-item"><span class="label">Masraf Toplam</span><span class="value negatif">' + fmt(oz.masraflar.toplam) + '</span></div>';
    html += '<div class="muv-bakiye-item"><span class="label">Avans Alınan</span><span class="value" style="color:var(--blue)">' + fmt(oz.avanslar.alinan) + '</span></div>';
    html += '<div class="muv-bakiye-item"><span class="label">Aktarılan</span><span class="value">' + fmt(oz.aktarimlar.toplam) + '</span></div>';
    html += '</div>';

    html += '<div class="muv-bakiye-actions">';
    html += '<button class="btn btn-sm" onclick="event.stopPropagation();openCariEkstre(\'' + m.id + '\')" style="font-size:11px">📊 Cari Ekstre</button>';
    html += '<button class="btn btn-sm" onclick="event.stopPropagation();olusturMasrafRaporu(\'' + m.id + '\')" style="font-size:11px">📄 Masraf Raporu</button>';
    html += '</div>';
    html += '</div>';
  });

  el.innerHTML = html || '<div class="empty"><div class="empty-icon">💰</div><p>Finansal hareketi olan müvekkil yok</p></div>';
}

// ── Büro Giderleri ──────────────────────────────────────────────
function renderBuroGiderleri() {
  var el = document.getElementById('buro-gider-liste');
  if (!el) return;

  var list = (state.buroGiderleri || []).slice();
  var fKat = (document.getElementById('buro-gider-kat') || {}).value || '';
  var fAy = (document.getElementById('buro-gider-ay') || {}).value || '';
  var fAra = (document.getElementById('buro-gider-ara') || {}).value.toLowerCase().trim();

  if (fKat) list = list.filter(function(g) { return g.kategori === fKat; });
  if (fAy) list = list.filter(function(g) { return g.tarih && g.tarih.startsWith(fAy); });
  if (fAra) list = list.filter(function(g) { return (g.aciklama || '').toLowerCase().indexOf(fAra) !== -1 || (g.kategori || '').toLowerCase().indexOf(fAra) !== -1; });
  list.sort(function(a, b) { return (b.tarih || '').localeCompare(a.tarih || ''); });

  // Mini KPI
  var kpiEl = document.getElementById('buro-gider-kpi');
  if (kpiEl) {
    var topKat = {};
    (state.buroGiderleri || []).forEach(function(g) {
      var k = g.kategori || 'Diğer';
      topKat[k] = (topKat[k] || 0) + (parseFloat(g.tutar) || 0);
    });
    var kpiHtml = '';
    var katSirali = Object.entries(topKat).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);
    katSirali.forEach(function(kv) {
      kpiHtml += '<div class="mini-card"><div class="mini-label">' + escHTML(kv[0]) + '</div><div class="mini-val">' + fmt(kv[1]) + '</div></div>';
    });
    kpiEl.innerHTML = kpiHtml;
  }

  if (!list.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">🏢</div><p>Büro gideri yok</p></div>';
    return;
  }

  var html = '<div style="overflow-x:auto"><table><thead><tr><th>Tarih</th><th>Kategori</th><th>Açıklama</th><th>KDV</th><th style="text-align:right">Tutar</th><th></th></tr></thead><tbody>';
  list.forEach(function(g) {
    var kdvStr = g.kdvOran > 0 ? '%' + g.kdvOran + ' (' + fmt(g.kdvTutar || 0) + ')' : '—';
    html += '<tr>';
    html += '<td style="white-space:nowrap;font-size:12px">' + fmtD(g.tarih) + '</td>';
    html += '<td><span style="font-size:11px;background:var(--surface2);padding:2px 8px;border-radius:4px">' + escHTML(g.kategori || '') + '</span></td>';
    html += '<td style="font-size:12px">' + escHTML(g.aciklama || '—') + '</td>';
    html += '<td style="font-size:11px;color:var(--text-muted)">' + kdvStr + '</td>';
    html += '<td style="text-align:right;font-weight:600;color:var(--red)">' + fmt(g.tutar) + '</td>';
    html += '<td><button class="delete-btn" onclick="delBuroGideri(\'' + g.id + '\')">✕</button></td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function delBuroGideri(id) {
  if (!confirm('Bu büro giderini silmek istiyor musunuz?')) return;
  state.buroGiderleri = (state.buroGiderleri || []).filter(function(g) { return g.id !== id; });
  if (typeof LexSubmit !== 'undefined') {
    LexSubmit.sil('buroGiderleri', id);
  } else {
    saveData();
  }
  renderBuroGiderleri();
  renderFinansKPI();
  notify('Silindi');
}

// ── Büro Gideri Modal ────────────────────────────────────────────
function openBuroGiderModal() {
  document.getElementById('bg-tarih').value = today();
  document.getElementById('bg-tutar').value = '';
  document.getElementById('bg-aciklama').value = '';
  document.getElementById('bg-kdv-oran').value = '20';
  bgKdvHesapla();
  openModal('buro-gider-modal');
}

function bgKdvHesapla() {
  var tutar = parseFloat(document.getElementById('bg-tutar').value) || 0;
  var oran = parseFloat(document.getElementById('bg-kdv-oran').value) || 0;
  var kdv = tutar * oran / 100;
  document.getElementById('bg-kdv-tutar').textContent = fmt(kdv);
  document.getElementById('bg-kdv-toplam').textContent = fmt(tutar + kdv);
}

async function saveBuroGideri() {
  var tutar = parseFloat(document.getElementById('bg-tutar').value);
  var tarih = document.getElementById('bg-tarih').value;
  if (!tarih || isNaN(tutar) || tutar <= 0) { notify('⚠️ Tarih ve tutar zorunludur.'); return; }

  var kdvOran = parseFloat(document.getElementById('bg-kdv-oran').value) || 0;
  var kdvTutar = tutar * kdvOran / 100;

  var kayit = {
    id: uid(),
    tarih: tarih,
    kategori: document.getElementById('bg-kategori').value,
    tutar: tutar,
    aciklama: document.getElementById('bg-aciklama').value.trim(),
    kdvOran: kdvOran,
    kdvTutar: kdvTutar
  };

  if (typeof LexSubmit !== 'undefined') {
    var btn = document.getElementById('bg-kaydet-btn');
    var ok = await LexSubmit.formKaydet({
      tablo: 'buroGiderleri', kayit: kayit, modalId: 'buro-gider-modal', butonEl: btn,
      basariMesaj: '✓ Büro gideri eklendi — ' + fmt(tutar),
      renderFn: function() { renderBuroGiderleri(); renderFinansKPI(); }
    });
    if (!ok) return;
  } else {
    if (!state.buroGiderleri) state.buroGiderleri = [];
    state.buroGiderleri.push(kayit);
    saveData();
    closeModal('buro-gider-modal');
    renderBuroGiderleri();
    renderFinansKPI();
    notify('✓ Büro gideri eklendi');
  }
  addAktiviteLog('Büro Gideri Eklendi', kayit.kategori + ' — ' + fmt(tutar), 'Finans');
}

// ── Kâr/Zarar Raporu ─────────────────────────────────────────────
function renderKarZararRaporu() {
  var el = document.getElementById('kz-rapor-icerik');
  if (!el) return;
  var yilSel = document.getElementById('kz-yil');
  if (yilSel && !yilSel.options.length) {
    var suanYil = new Date().getFullYear();
    for (var y = suanYil; y >= suanYil - 3; y--) {
      yilSel.innerHTML += '<option value="' + y + '">' + y + '</option>';
    }
  }
  var yil = yilSel ? yilSel.value : new Date().getFullYear().toString();
  var kz = FinansMotoru.buroKarZarar({ yil: yil });
  var aylik = FinansMotoru.buroAylikDetay(yil);
  var aylar = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  var html = '<div style="font-size:16px;font-weight:700;margin-bottom:20px;color:var(--gold)">' + yil + ' Yılı Kâr/Zarar Raporu</div>';

  // GELİRLER
  html += '<div class="kz-section"><div class="kz-section-title">GELİRLER</div>';
  html += '<div class="kz-row"><span class="kz-label">Akdi Vekalet Ücreti Tahsilatları' + helpTip('Müvekkiller ile sözleşme ile kararlaştırılan ve müvekkil tarafından ödenen avukatlık ücreti') + '</span><span class="kz-val pozitif">' + fmt(kz.gelirler.akdiVekaletUcreti) + '</span></div>';
  html += '<div class="kz-row"><span class="kz-label">Karşı Vekalet Hakedişleri' + helpTip('Kazanılan dava sonucu karşı taraftan tahsil edilen vekalet ücreti (AAÜT\'ye göre)') + '</span><span class="kz-val pozitif">' + fmt(kz.gelirler.karsiVekaletHakedis) + '</span></div>';
  html += '<div class="kz-row"><span class="kz-label">Danışmanlık Gelirleri</span><span class="kz-val pozitif">' + fmt(kz.gelirler.danismanlikGeliri) + '</span></div>';
  html += '<div class="kz-row"><span class="kz-label">Arabuluculuk Gelirleri</span><span class="kz-val pozitif">' + fmt(kz.gelirler.arabuluculukGeliri) + '</span></div>';
  if (kz.gelirler.digerGelir > 0) {
    html += '<div class="kz-row"><span class="kz-label">Diğer Gelirler</span><span class="kz-val pozitif">' + fmt(kz.gelirler.digerGelir) + '</span></div>';
  }
  html += '<div class="kz-row toplam"><span class="kz-label">TOPLAM GELİR</span><span class="kz-val pozitif">' + fmt(kz.gelirler.toplam) + '</span></div>';
  html += '</div>';

  // GİDERLER (Sadece büro operasyonel giderleri — dosya masrafları müvekkil emaneti olduğu için dahil değil)
  html += '<div class="kz-section"><div class="kz-section-title">GİDERLER' + helpTip('Sadece büro operasyonel giderleri. Dosya masrafları müvekkil adına yapıldığı için burada gösterilmez — müvekkil bakiyeleri sekmesinde takip edilir') + '</div>';

  var bg = kz.giderler.buroGiderleri;
  if (kz.giderler.buroGiderToplam > 0) {
    var bgKeys = ['kira','stopajVergi','muhasebeci','calisanUcretleri','temizlik','kirtasiye','teknoloji','ulasim','sigorta','meslekiGelisim','diger'];
    var bgLabels = {'kira':'Kira & Aidat','stopajVergi':'Stopaj & Vergi','muhasebeci':'Muhasebeci','calisanUcretleri':'Çalışan Ücretleri','temizlik':'Temizlik & Bakım','kirtasiye':'Kırtasiye & Sarf','teknoloji':'Teknoloji','ulasim':'Ulaşım & Araç','sigorta':'Sigorta','meslekiGelisim':'Mesleki Gelişim','diger':'Diğer'};
    bgKeys.forEach(function(k) {
      if (bg[k] > 0) {
        html += '<div class="kz-row"><span class="kz-label" style="padding-left:16px">' + bgLabels[k] + '</span><span class="kz-val negatif">' + fmt(bg[k]) + '</span></div>';
      }
    });
  }
  html += '<div class="kz-row toplam"><span class="kz-label">TOPLAM GİDER</span><span class="kz-val negatif">' + fmt(kz.giderler.toplam) + '</span></div>';
  html += '</div>';

  // NET
  html += '<div class="kz-section">';
  html += '<div class="kz-row net"><span class="kz-label">NET KÂR/ZARAR</span><span class="kz-val ' + (kz.net >= 0 ? 'pozitif' : 'negatif') + '">' + fmt(kz.net) + '</span></div>';
  if (kz.gelirler.toplam > 0) {
    var oran = (kz.net / kz.gelirler.toplam * 100).toFixed(1);
    html += '<div style="text-align:right;font-size:11px;color:var(--text-muted);margin-top:4px">Kârlılık Oranı: %' + oran + '</div>';
  }
  html += '</div>';

  // AYLIK DETAY
  html += '<div class="kz-section"><div class="kz-section-title">AYLIK DETAY' + helpTip('Yıl başından ilgili aya kadar biriken toplam net kâr/zarar') + '</div>';
  html += '<div style="overflow-x:auto"><table><thead><tr><th>Ay</th><th>Gelir</th><th>Gider</th><th>Net</th><th>Kümülatif</th></tr></thead><tbody>';
  var kumulatif = 0;
  aylik.forEach(function(a, i) {
    kumulatif += a.net;
    var satir = a.gelir === 0 && a.gider === 0 ? ' style="opacity:0.4"' : '';
    html += '<tr' + satir + '><td>' + aylar[i] + '</td>';
    html += '<td style="color:var(--green)">' + (a.gelir > 0 ? fmt(a.gelir) : '—') + '</td>';
    html += '<td style="color:var(--red)">' + (a.gider > 0 ? fmt(a.gider) : '—') + '</td>';
    html += '<td style="font-weight:600;color:' + (a.net >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(a.net) + '</td>';
    html += '<td style="font-weight:600;color:' + (kumulatif >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(kumulatif) + '</td></tr>';
  });
  html += '</tbody></table></div></div>';

  el.innerHTML = html;
}

function kzRaporYazdir() {
  var icerik = (document.getElementById('kz-rapor-icerik') || {}).innerHTML || '';
  var yil = (document.getElementById('kz-yil') || {}).value || '';
  var w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kâr/Zarar Raporu ' + yil + '</title>' +
    '<style>body{font-family:Arial,sans-serif;padding:30px;color:#1a1714}table{width:100%;border-collapse:collapse;margin-bottom:20px}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f5f4f2}.kz-section{margin-bottom:20px}.kz-section-title{font-weight:700;border-bottom:2px solid #333;padding-bottom:4px;margin-bottom:8px}.kz-row{display:flex;justify-content:space-between;padding:4px 0}.kz-row.toplam{font-weight:700;border-top:2px solid #333;padding-top:6px}.kz-row.net{font-size:18px;font-weight:800;border-top:3px double #333;padding-top:10px}.pozitif{color:#27ae60}.negatif{color:#c0392b}.help-tip{display:none}</style>' +
    '</head><body><h1 style="color:#a07830">Kâr/Zarar Raporu — ' + yil + '</h1>' + icerik + '</body></html>');
  w.document.close();
  w.print();
}

// ── Cari Ekstre (FinansMotoru kullanarak) ─────────────────────────
function openCariEkstre(muvId) {
  var m = getMuv(muvId);
  if (!m) return;

  var cari = FinansMotoru.muvekkilCari(muvId);
  var oz = FinansMotoru.muvekkilOzet(muvId);
  var bakiye = oz.bakiye.genelBakiye;
  var bakiyeRenk = bakiye >= 0 ? 'var(--green)' : 'var(--red)';

  document.getElementById('cari-ekstre-title').textContent = '📊 ' + m.ad + ' — Cari Ekstre';

  var html = '';
  // Özet kartlar
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">';
  html += '<div style="background:var(--surface2);border-radius:var(--radius);padding:12px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">MASRAF BAKİYE</div><div style="font-size:16px;font-weight:700;color:' + (oz.bakiye.masrafBakiye >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(oz.bakiye.masrafBakiye) + '</div></div>';
  html += '<div style="background:var(--surface2);border-radius:var(--radius);padding:12px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">TAHSİLAT BAKİYE</div><div style="font-size:16px;font-weight:700;color:' + (oz.bakiye.tahsilatBakiye >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(oz.bakiye.tahsilatBakiye) + '</div></div>';
  html += '<div style="background:' + bakiyeRenk + '11;border:1px solid ' + bakiyeRenk + ';border-radius:var(--radius);padding:12px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">GENEL BAKİYE</div><div style="font-size:16px;font-weight:700;color:' + bakiyeRenk + '">' + fmt(bakiye) + '</div></div>';
  html += '</div>';

  // İşlem tablosu
  if (cari.length) {
    html += '<table><thead><tr><th>Tarih</th><th>İşlem</th><th>Açıklama</th><th>Dosya</th><th style="text-align:right">Borç</th><th style="text-align:right">Alacak</th><th style="text-align:right">Bakiye</th></tr></thead><tbody>';
    cari.forEach(function(c) {
      var turRenk = c.yon === 'alacak' ? 'var(--green)' : 'var(--red)';
      var bRenk = c.bakiye >= 0 ? 'var(--green)' : 'var(--red)';
      html += '<tr>';
      html += '<td style="font-size:11px;white-space:nowrap">' + fmtD(c.tarih) + '</td>';
      html += '<td><span style="font-size:11px;color:' + turRenk + ';font-weight:600">' + escHTML(c.tur) + '</span></td>';
      html += '<td style="font-size:12px">' + escHTML(c.aciklama || '—') + '</td>';
      html += '<td style="font-size:11px;color:var(--text-muted)">' + escHTML(c.dosyaNo || '—') + '</td>';
      html += '<td style="text-align:right;font-weight:600;color:var(--red)">' + (c.yon === 'borc' ? fmt(c.tutar) : '') + '</td>';
      html += '<td style="text-align:right;font-weight:600;color:var(--green)">' + (c.yon === 'alacak' ? fmt(c.tutar) : '') + '</td>';
      html += '<td style="text-align:right;font-weight:700;color:' + bRenk + '">' + fmt(c.bakiye) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
  } else {
    html += '<div class="empty"><div class="empty-icon">📊</div><p>Henüz işlem yok</p></div>';
  }

  document.getElementById('cari-ekstre-icerik').innerHTML = html;
  openModal('cari-ekstre-modal');
}

function cariEkstreYazdir() {
  var title = (document.getElementById('cari-ekstre-title') || {}).textContent || '';
  var icerik = (document.getElementById('cari-ekstre-icerik') || {}).innerHTML || '';
  var w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + title + '</title>' +
    '<style>body{font-family:Arial,sans-serif;padding:30px;color:#1a1714}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:12px}th{background:#f5f4f2}.help-tip{display:none}</style></head>' +
    '<body><h2>' + title + '</h2>' + icerik + '</body></html>');
  w.document.close();
  w.print();
}

// ── Masraf Raporu Oluşturucu ──────────────────────────────────────
// Müvekkile gönderilebilir profesyonel masraf raporu
function olusturMasrafRaporu(muvId) {
  if (!muvId) { notify('Müvekkil seçilmedi'); return; }
  var muv = getMuv(muvId);
  if (!muv) { notify('Müvekkil bulunamadı'); return; }
  var harcamalar = typeof getAllMuvHarcamalar === 'function' ? getAllMuvHarcamalar(muvId) : [];
  if (!harcamalar.length) { notify('Bu müvekkilin harcaması yok'); return; }
  var oz = typeof FinansMotoru !== 'undefined' ? FinansMotoru.muvekkilOzet(muvId) : null;

  // Büro bilgileri
  var buroAd = (currentUser && currentUser.buro_ad) || 'Hukuk Bürosu';
  var avukatAd = (currentUser && (currentUser.ad_soyad || currentUser.ad)) || '';
  var baroSicil = (currentUser && currentUser.baroSicil) || '';
  var bugun = new Date().toLocaleDateString('tr-TR', {year:'numeric',month:'long',day:'numeric'});

  // Dosya bazlı gruplama
  var dosyaGrup = {};
  harcamalar.forEach(function(h) {
    var key = h.kaynak + '_' + h.kaynakNo;
    if (!dosyaGrup[key]) dosyaGrup[key] = { kaynak: h.kaynak, no: h.kaynakNo, mahkeme: h.mahkeme, items: [], toplam: 0 };
    dosyaGrup[key].items.push(h);
    dosyaGrup[key].toplam += (h.tutar || 0);
  });
  var gruplar = Object.values(dosyaGrup);
  var genelToplam = harcamalar.reduce(function(s, h) { return s + (h.tutar || 0); }, 0);
  var avansAlinan = oz ? oz.avanslar.alinan : 0;
  var masrafBakiye = oz ? oz.bakiye.masrafBakiye : (avansAlinan - genelToplam);

  // HTML oluştur
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Masraf Raporu — ' + muv.ad + '</title>';
  html += '<style>';
  html += 'body{font-family:"Segoe UI",sans-serif;font-size:12px;color:#1a1a2e;padding:40px;max-width:800px;margin:0 auto;line-height:1.5}';
  html += '.baslik{text-align:center;border-bottom:2px solid #1a1a2e;padding-bottom:16px;margin-bottom:20px}';
  html += '.baslik h1{font-size:18px;margin:0 0 4px}';
  html += '.baslik .buro{font-size:14px;color:#555;margin:0}';
  html += '.baslik .tarih{font-size:11px;color:#888;margin-top:6px}';
  html += '.bilgi{display:flex;justify-content:space-between;margin-bottom:20px;padding:12px;background:#f8f9fa;border-radius:6px}';
  html += '.bilgi div{font-size:11px;line-height:1.6}';
  html += '.bilgi strong{font-weight:700}';
  html += 'table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}';
  html += 'th{background:#1a1a2e;color:#fff;padding:6px 10px;text-align:left;font-size:10px;font-weight:600}';
  html += 'td{padding:5px 10px;border-bottom:1px solid #eee}';
  html += 'tr:nth-child(even){background:#fafafa}';
  html += '.dosya-baslik{background:#f0f0f5;font-weight:700;padding:8px 10px;margin-top:16px;border-radius:4px;font-size:12px}';
  html += '.alt-toplam{text-align:right;font-weight:700;padding:6px 10px;border-top:2px solid #ddd}';
  html += '.ozet{margin-top:24px;padding:16px;border:2px solid #1a1a2e;border-radius:6px}';
  html += '.ozet table{margin:0}';
  html += '.ozet td{border:none;padding:4px 10px;font-size:12px}';
  html += '.ozet .bakiye{font-size:14px;font-weight:800}';
  html += '.negatif{color:#e74c3c} .pozitif{color:#27ae60}';
  html += '.footer{margin-top:40px;border-top:1px solid #ccc;padding-top:12px;font-size:10px;color:#888;text-align:center}';
  html += '@media print{body{padding:20px} .no-print{display:none}}';
  html += '</style></head><body>';

  // Başlık
  html += '<div class="baslik">';
  html += '<h1>MASRAF RAPORU</h1>';
  html += '<p class="buro">' + buroAd + '</p>';
  html += '<p class="tarih">Rapor Tarihi: ' + bugun + '</p>';
  html += '</div>';

  // Bilgi kutusu
  html += '<div class="bilgi">';
  html += '<div><strong>Müvekkil:</strong> ' + muv.ad + '<br>';
  if (muv.tip === 'tuzel') {
    html += (muv.vergiNo ? 'VKN: ' + muv.vergiNo + '<br>' : '');
  } else {
    html += (muv.tc ? 'TC: ' + muv.tc + '<br>' : '');
  }
  html += (muv.tel ? 'Tel: ' + muv.tel + '<br>' : '');
  html += (muv.adres ? 'Adres: ' + muv.adres : '');
  html += '</div>';
  html += '<div style="text-align:right"><strong>Avukat:</strong> ' + avukatAd + '<br>';
  html += (baroSicil ? 'Baro Sicil: ' + baroSicil + '<br>' : '');
  html += 'Dosya Sayısı: ' + gruplar.length + '<br>';
  html += 'Toplam İşlem: ' + harcamalar.length;
  html += '</div></div>';

  // Dosya bazlı tablolar
  gruplar.forEach(function(g) {
    html += '<div class="dosya-baslik">' + g.kaynak + ' Dosyası: ' + g.no + (g.mahkeme ? ' — ' + g.mahkeme : '') + '</div>';
    html += '<table><thead><tr><th>Tarih</th><th>Kategori</th><th>Açıklama</th><th style="text-align:right">Tutar</th></tr></thead><tbody>';
    g.items.forEach(function(h) {
      html += '<tr><td>' + (h.tarih ? new Date(h.tarih).toLocaleDateString('tr-TR') : '—') + '</td>';
      html += '<td>' + (h.kat || '—') + '</td>';
      html += '<td>' + (h.acik || h.aciklama || '—') + '</td>';
      html += '<td style="text-align:right;font-weight:600">' + fmt(h.tutar) + '</td></tr>';
    });
    html += '</tbody></table>';
    html += '<div class="alt-toplam">Alt Toplam: ' + fmt(g.toplam) + '</div>';
  });

  // Finansal özet
  html += '<div class="ozet"><table>';
  html += '<tr><td><strong>GENEL MASRAF TOPLAMI</strong></td><td style="text-align:right;font-weight:800;font-size:14px">' + fmt(genelToplam) + '</td></tr>';
  html += '<tr><td>Alınan Masraf Avansı</td><td style="text-align:right;color:#27ae60;font-weight:600">' + fmt(avansAlinan) + '</td></tr>';
  html += '<tr style="border-top:2px solid #1a1a2e"><td><strong>MASRAF BAKİYESİ</strong></td>';
  html += '<td class="bakiye ' + (masrafBakiye >= 0 ? 'pozitif' : 'negatif') + '" style="text-align:right">' + fmt(masrafBakiye) + '</td></tr>';
  if (masrafBakiye < 0) {
    html += '<tr><td colspan="2" style="font-size:11px;color:#e74c3c;padding-top:8px">* Müvekkilden ' + fmt(Math.abs(masrafBakiye)) + ' masraf alacağı bulunmaktadır.</td></tr>';
  }
  html += '</table></div>';

  // Footer
  html += '<div class="footer">' + buroAd + ' — ' + avukatAd + (baroSicil ? ' (Baro Sicil: ' + baroSicil + ')' : '') + '<br>Bu rapor ' + bugun + ' tarihinde otomatik olarak oluşturulmuştur.</div>';

  // Yazdır butonu
  html += '<div class="no-print" style="text-align:center;margin-top:24px"><button onclick="window.print()" style="padding:10px 24px;background:#1a1a2e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">Yazdır / PDF</button></div>';

  html += '</body></html>';

  // Yeni pencerede aç
  var w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { notify('Popup engelleyici aktif — lütfen izin verin'); return; }
  w.document.write(html);
  w.document.close();
}

// ── Dosya Kârlılık Analizi ───────────────────────────────────────
function renderDosyaKarlilik() {
  var el = document.getElementById('karlilik-icerik');
  if (!el) return;
  var filtre = (document.getElementById('karlilik-filtre') || {}).value || '';
  var karlilik = FinansMotoru.dosyaKarlilik({ dosyaTur: filtre || undefined });

  if (!karlilik.dosyalar.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📈</div><p>Dosya kârlılık verisi yok</p></div>';
    return;
  }

  var oz = karlilik.ozet || {};
  var html = '';
  // Özet
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">';
  html += '<div style="background:var(--surface2);border-radius:var(--radius);padding:12px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">DOSYA SAYISI</div><div style="font-size:18px;font-weight:800">' + (oz.dosyaSayisi || karlilik.dosyalar.length) + '</div></div>';
  html += '<div style="background:var(--surface2);border-radius:var(--radius);padding:12px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">ORT. KÂRLILIK</div><div style="font-size:18px;font-weight:800;color:' + ((oz.ortKarlilik || 0) >= 0 ? 'var(--green)' : 'var(--red)') + '">%' + (oz.ortKarlilik || 0) + '</div></div>';
  html += '<div style="background:var(--surface2);border-radius:var(--radius);padding:12px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">TOPLAM NET</div><div style="font-size:18px;font-weight:800;color:' + ((oz.topNet || 0) >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(oz.topNet || 0) + '</div></div>';
  html += '</div>';

  // Tablo
  html += '<div style="overflow-x:auto"><table><thead><tr><th>Dosya</th><th>Müvekkil</th><th style="text-align:right">Masraf</th><th style="text-align:right">Gelir</th><th style="text-align:right">Net</th><th>Kârlılık</th></tr></thead><tbody>';
  karlilik.dosyalar.forEach(function(d) {
    var icon = d.dosyaTur === 'dava' ? '📁' : '⚡';
    var netRenk = d.net >= 0 ? 'var(--green)' : 'var(--red)';
    var barPct = d.gelir > 0 ? Math.min(100, Math.round(d.net / d.gelir * 100)) : 0;
    var barCls = d.net < 0 ? 'zarar' : '';
    html += '<tr>';
    html += '<td style="font-size:12px">' + icon + ' ' + escHTML(d.dosyaNo) + '</td>';
    html += '<td style="font-size:12px">' + escHTML(d.muvAd) + '</td>';
    html += '<td style="text-align:right;font-size:12px;color:var(--red)">' + fmt(d.masraf) + '</td>';
    html += '<td style="text-align:right;font-size:12px;color:var(--green)">' + fmt(d.gelir) + '</td>';
    html += '<td style="text-align:right;font-weight:700;color:' + netRenk + '">' + fmt(d.net) + '</td>';
    html += '<td><div class="karlilik-bar"><div class="karlilik-bar-fill ' + barCls + '" style="width:' + Math.abs(barPct) + '%"></div></div></td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  // Dosya türü (konu) bazlı kârlılık
  var konuK = karlilik.konuKarlilik || [];
  if (konuK.length) {
    html += '<div style="margin-top:20px"><div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">EN KÂRLI DOSYA TÜRLERİ</div>';
    konuK.slice(0, 5).forEach(function(k) {
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">';
      html += '<div><span style="font-size:12px;font-weight:600">' + escHTML(k.konu) + '</span><span style="font-size:10px;color:var(--text-muted);margin-left:8px">' + k.dosyaSayisi + ' dosya — %' + k.karlilikOrani + ' kârlılık</span></div>';
      html += '<span style="font-weight:700;color:' + (k.net >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(k.net) + '</span></div>';
    });
    html += '</div>';
  }

  // Müvekkil bazlı kârlılık
  var muvK = karlilik.muvekkilKarlilik || [];
  if (muvK.length) {
    html += '<div style="margin-top:20px"><div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px">EN KÂRLI MÜVEKKİLLER</div>';
    muvK.slice(0, 5).forEach(function(m) {
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">';
      html += '<div><span style="font-size:12px;font-weight:600">' + escHTML(m.muvAd) + '</span><span style="font-size:10px;color:var(--text-muted);margin-left:8px">' + m.dosyaSayisi + ' dosya</span></div>';
      html += '<span style="font-weight:700;color:' + (m.net >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmt(m.net) + '</span></div>';
    });
    html += '</div>';
  }

  el.innerHTML = html;
}

// ── Beklenen Gelir Takvimi ───────────────────────────────────────
function renderBeklenenGelir() {
  var el = document.getElementById('beklenen-gelir-icerik');
  if (!el) return;
  var sonuc = FinansMotoru.beklenenGelir();
  var kalemler = sonuc.beklenenler || [];

  if (!kalemler.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📅</div><p>Beklenen gelir kalemi yok</p></div>';
    return;
  }

  var ozet = sonuc.ozet || {};
  var html = '<div style="background:var(--surface2);border-radius:var(--radius);padding:12px;margin-bottom:16px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">TOPLAM BEKLENEN GELİR</div><div style="font-size:20px;font-weight:800;color:var(--gold)">' + fmt(ozet.topTutar || 0) + '</div>';
  if (ozet.gecikmisAdet > 0) html += '<div style="font-size:10px;color:#e74c3c;margin-top:4px">⚠ ' + ozet.gecikmisAdet + ' gecikmiş kalem (' + fmt(ozet.gecikmisTutar) + ')</div>';
  html += '</div>';

  var aylar = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  var sonAy = '';
  kalemler.forEach(function(k) {
    var ayKey = k.tarih ? k.tarih.substring(0, 7) : 'belirsiz';
    if (ayKey !== sonAy) {
      sonAy = ayKey;
      var parts = ayKey.split('-');
      var ayAd = parts.length === 2 ? aylar[parseInt(parts[1]) - 1] + ' ' + parts[0] : 'Tarih Belirsiz';
      html += '<div class="beklenen-ay-baslik">' + ayAd + '</div>';
    }
    html += '<div class="beklenen-row">';
    html += '<span class="beklenen-tarih">' + (k.tarih ? fmtD(k.tarih) : '?.??') + '</span>';
    html += '<span class="beklenen-aciklama">' + escHTML(k.acik || k.aciklama || '') + '</span>';
    html += '<span class="beklenen-tutar" style="color:var(--gold)">' + fmt(k.tutar) + '</span>';
    html += '</div>';
  });

  el.innerHTML = html;
}

// ── FATURA ──────────────────────────────────────────────────────
function openFaturaModal(editId) {
  if (!state.faturalar) state.faturalar = [];
  document.getElementById('fatura-modal-title').textContent = editId ? '🧾 Fatura Düzenle' : '🧾 Fatura Oluştur';
  document.getElementById('fat-tarih').value = today();
  // Fatura no otomatik
  const sonNo = state.faturalar.length + 1;
  document.getElementById('fat-no').value = new Date().getFullYear() + '-' + String(sonNo).padStart(3,'0');
  // Müvekkil select
  const sel = document.getElementById('fat-muv');
  sel.innerHTML = '<option value="">— Müvekkil Seçin —</option>';
  state.muvekkillar.forEach(m => sel.innerHTML += `<option value="${m.id}">${m.ad}</option>`);
  // Kalemleri sıfırla
  document.getElementById('fat-kalemler').innerHTML = '';
  fatKalemEkle();
  ['fat-aciklama','fat-notlar','fat-vade'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  document.getElementById('fat-kdv').value = '0';
  document.getElementById('fat-durum').value = 'bekliyor';
  fatToplamHesapla();
  openModal('fatura-modal');
}

function fatKalemEkle() {
  const div = document.createElement('div');
  div.className = 'fat-kalem-satir';
  div.style.cssText = 'display:grid;grid-template-columns:1fr 80px 100px 100px 30px;gap:8px;margin-bottom:6px';
  div.innerHTML = `
    <input placeholder="Hizmet açıklaması" class="fat-kalem-ad" style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);padding:7px 10px;font-size:12px">
    <input type="number" placeholder="Adet" class="fat-kalem-miktar" value="1" oninput="fatKalemHesapla(this)" style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);padding:7px 10px;font-size:12px">
    <input type="number" placeholder="Birim fiyat" class="fat-kalem-fiyat" oninput="fatKalemHesapla(this)" style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);padding:7px 10px;font-size:12px">
    <input placeholder="Toplam" class="fat-kalem-toplam" readonly style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);padding:7px 10px;font-size:12px;font-weight:600">
    <button onclick="fatKalemSil(this)" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:16px;touch-action:manipulation">✕</button>`;
  document.getElementById('fat-kalemler').appendChild(div);
}

function fatKalemSil(btn) {
  btn.closest('.fat-kalem-satir').remove();
  fatToplamHesapla();
}

function fatKalemHesapla(input) {
  const satir = input.closest('.fat-kalem-satir');
  const miktar = parseFloat(satir.querySelector('.fat-kalem-miktar').value) || 0;
  const fiyat = parseFloat(satir.querySelector('.fat-kalem-fiyat').value) || 0;
  satir.querySelector('.fat-kalem-toplam').value = (miktar * fiyat).toFixed(2);
  fatToplamHesapla();
}

function fatToplamHesapla() {
  const satirlar = document.querySelectorAll('.fat-kalem-satir');
  let ara = 0;
  satirlar.forEach(s => { ara += parseFloat(s.querySelector('.fat-kalem-toplam')?.value) || 0; });
  const kdvOran = parseFloat(document.getElementById('fat-kdv')?.value) || 0;
  const kdv = ara * kdvOran / 100;
  const genel = ara + kdv;
  document.getElementById('fat-ara-toplam').textContent = fmt(ara);
  document.getElementById('fat-kdv-tutar').textContent = fmt(kdv);
  document.getElementById('fat-genel-toplam').textContent = fmt(genel);
}

async function saveFatura() {
  const no = document.getElementById('fat-no').value.trim();
  const tarih = document.getElementById('fat-tarih').value;
  const muvId = document.getElementById('fat-muv').value;
  if (!no || !tarih || !muvId) { notify('⚠️ Fatura no, tarih ve müvekkil zorunludur.'); return; }

  const kalemler = [];
  document.querySelectorAll('.fat-kalem-satir').forEach(s => {
    const ad = s.querySelector('.fat-kalem-ad').value.trim();
    const miktar = parseFloat(s.querySelector('.fat-kalem-miktar').value) || 0;
    const fiyat = parseFloat(s.querySelector('.fat-kalem-fiyat').value) || 0;
    if (ad) kalemler.push({ ad, miktar, fiyat, toplam: miktar * fiyat });
  });
  if (!kalemler.length) { notify('⚠️ En az bir kalem ekleyin.'); return; }

  const araToplam = kalemler.reduce((s, k) => s + k.toplam, 0);
  const kdvOran = parseFloat(document.getElementById('fat-kdv').value) || 0;
  const kdvTutar = araToplam * kdvOran / 100;
  const genelToplam = araToplam + kdvTutar;

  const fatura = {
    id: uid(), no, tarih, muvId,
    vade: document.getElementById('fat-vade').value,
    aciklama: document.getElementById('fat-aciklama').value.trim(),
    notlar: document.getElementById('fat-notlar').value.trim(),
    kalemler, araToplam, kdvOran, kdvTutar, genelToplam,
    durum: document.getElementById('fat-durum').value,
    olusturanAd: currentUser?.ad_soyad || '',
    olusturmaTarih: today()
  };

  // Ödendi ise bütçe hareketi de oluştur
  var butceKayit = null;
  if (fatura.durum === 'odendi') {
    butceKayit = { id: uid(), tur: 'Gelir', tarih, tutar: genelToplam, kat: 'Fatura Tahsilatı', muvId, acik: `Fatura #${no}`, kdvOran, kdvTutar };
  }

  if (typeof LexSubmit !== 'undefined') {
    // Faturayı bütçe olarak kaydet (faturalar tablosu Supabase'de yoksa butce'ye yaz)
    var btn = document.querySelector('#fatura-modal .btn-gold');
    if (butceKayit) {
      var okB = await LexSubmit.kaydet('butce', butceKayit);
      if (!okB.ok) { notify('❌ Bütçe hareketi kaydedilemedi'); return; }
    }
    // Faturayı localStorage'a yaz (faturalar tablosu Supabase'de olmayabilir)
    if (!state.faturalar) state.faturalar = [];
    state.faturalar.push(fatura);
    saveData();
    closeModal('fatura-modal'); renderFaturaListe(); renderButce();
    notify('✅ Fatura kaydedildi');
    addAktiviteLog('Fatura Oluşturuldu', `#${no} — ${getMuvAd(muvId)} — ${fmt(genelToplam)}`, 'Finans');
  } else {
    if (!state.faturalar) state.faturalar = [];
    state.faturalar.push(fatura);
    if (butceKayit) { state.butce.push(butceKayit); }
    saveData(); closeModal('fatura-modal'); renderFaturaListe(); renderButce();
    notify('✅ Fatura kaydedildi');
    addAktiviteLog('Fatura Oluşturuldu', `#${no} — ${getMuvAd(muvId)} — ${fmt(genelToplam)}`, 'Finans');
  }
}

function renderFaturaListe() {
  const el = document.getElementById('fatura-liste');
  const em = document.getElementById('fatura-empty');
  if (!el) return;
  const faturalar = state.faturalar || [];
  if (!faturalar.length) { em.style.display = 'block'; el.innerHTML = ''; return; }
  em.style.display = 'none';
  const durumRenk = { bekliyor: '#f39c12', odendi: 'var(--green)', gecikti: 'var(--red)', iptal: 'var(--text-dim)' };
  const durumLabel = { bekliyor: '⏳ Bekliyor', odendi: '✅ Ödendi', gecikti: '🔴 Gecikti', iptal: '❌ İptal' };
  el.innerHTML = faturalar.slice().reverse().map(f => `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-weight:700;font-size:14px">Fatura #${f.no}</div>
          <div style="font-size:12px;color:var(--text-muted)">${getMuvAd(f.muvId)} — ${fmtD(f.tarih)}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span style="font-size:11px;padding:3px 10px;border-radius:20px;background:${durumRenk[f.durum]}22;color:${durumRenk[f.durum]};font-weight:700">${durumLabel[f.durum]||f.durum}</span>
          <span style="font-size:15px;font-weight:700;color:var(--gold)">${fmt(f.genelToplam)}</span>
          <button class="btn" style="font-size:11px;padding:4px 10px;background:var(--surface2)" onclick="faturaOnizleById('${f.id}')">👁 Önizle</button>
          <button class="btn" style="font-size:11px;padding:4px 10px;background:#25D366;color:#fff;border-color:#25D366" onclick="openWpFaturaModal('${f.id}')">📱 WP</button>
          <button class="delete-btn" onclick="fatSil('${f.id}')">✕</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted)">${f.aciklama||''} ${f.vade?'| Vade: '+fmtD(f.vade):''} | KDV: %${f.kdvOran||0}</div>
    </div>`).join('');
}

function fatSil(id) {
  if (!confirm('Bu faturayı silmek istiyor musunuz?')) return;
  state.faturalar = (state.faturalar||[]).filter(f => f.id !== id);
  saveData(); renderFaturaListe(); notify('Fatura silindi');
}

function faturaOnizle() {
  const no = document.getElementById('fat-no').value;
  const tarih = document.getElementById('fat-tarih').value;
  const muvId = document.getElementById('fat-muv').value;
  const kalemler = [];
  document.querySelectorAll('.fat-kalem-satir').forEach(s => {
    const ad = s.querySelector('.fat-kalem-ad').value.trim();
    const miktar = parseFloat(s.querySelector('.fat-kalem-miktar').value)||0;
    const fiyat = parseFloat(s.querySelector('.fat-kalem-fiyat').value)||0;
    if (ad) kalemler.push({ad,miktar,fiyat,toplam:miktar*fiyat});
  });
  const araToplam = kalemler.reduce((s,k)=>s+k.toplam,0);
  const kdvOran = parseFloat(document.getElementById('fat-kdv').value)||0;
  const kdvTutar = araToplam*kdvOran/100;
  const fatura = {no,tarih,muvId,kalemler,araToplam,kdvOran,kdvTutar,genelToplam:araToplam+kdvTutar,
    aciklama:document.getElementById('fat-aciklama').value, notlar:document.getElementById('fat-notlar').value,
    vade:document.getElementById('fat-vade').value};
  faturaOnizleHtml(fatura);
  openModal('fatura-onizle-modal');
}

function faturaOnizleById(id) {
  const f = (state.faturalar||[]).find(x=>x.id===id);
  if (!f) return;
  faturaOnizleHtml(f);
  openModal('fatura-onizle-modal');
}

function faturaOnizleHtml(f) {
  const buro = state.buroAyarlar || {};
  const muv = state.muvekkillar.find(m=>m.id===f.muvId)||{};
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1a1714;max-width:640px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;border-bottom:3px solid #a07830;padding-bottom:20px">
        <div>
          <div style="font-size:24px;font-weight:700;color:#a07830">FATURA</div>
          <div style="font-size:13px;color:#666">No: ${f.no}</div>
          <div style="font-size:13px;color:#666">Tarih: ${fmtD(f.tarih)}</div>
          ${f.vade?`<div style="font-size:13px;color:#666">Vade: ${fmtD(f.vade)}</div>`:''}
        </div>
        <div style="text-align:right">
          <div style="font-size:16px;font-weight:700">${buro.ad||'Hukuk Bürosu'}</div>
          <div style="font-size:12px;color:#666">${buro.adres||''}</div>
          <div style="font-size:12px;color:#666">${buro.tel||''}</div>
          <div style="font-size:12px;color:#666">${buro.email||''}</div>
        </div>
      </div>
      <div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;color:#999;text-transform:uppercase;margin-bottom:6px">FATURA KESİLEN</div>
        <div style="font-weight:700">${muv.ad||'—'}</div>
        <div style="font-size:13px;color:#666">${muv.adres||''}</div>
        <div style="font-size:13px;color:#666">${muv.tel||''} ${muv.mail?'| '+muv.mail:''}</div>
      </div>
      ${f.aciklama?`<div style="margin-bottom:16px;font-size:13px;color:#444">${f.aciklama}</div>`:''}
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <thead><tr style="background:#f5f4f2">
          <th style="padding:10px;text-align:left;border-bottom:2px solid #ddd;font-size:12px">HİZMET</th>
          <th style="padding:10px;text-align:center;border-bottom:2px solid #ddd;font-size:12px">ADET</th>
          <th style="padding:10px;text-align:right;border-bottom:2px solid #ddd;font-size:12px">BİRİM FİYAT</th>
          <th style="padding:10px;text-align:right;border-bottom:2px solid #ddd;font-size:12px">TOPLAM</th>
        </tr></thead>
        <tbody>${(f.kalemler||[]).map(k=>`
          <tr><td style="padding:10px;border-bottom:1px solid #eee;font-size:13px">${k.ad}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;font-size:13px">${k.miktar}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;font-size:13px">₺${Number(k.fiyat).toLocaleString('tr-TR',{minimumFractionDigits:2})}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:600">₺${Number(k.toplam).toLocaleString('tr-TR',{minimumFractionDigits:2})}</td></tr>`).join('')}
        </tbody>
      </table>
      <div style="float:right;width:280px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span>Ara Toplam:</span><span>₺${Number(f.araToplam||0).toLocaleString('tr-TR',{minimumFractionDigits:2})}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span>KDV (%${f.kdvOran||0}):</span><span>₺${Number(f.kdvTutar||0).toLocaleString('tr-TR',{minimumFractionDigits:2})}</span></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:16px;font-weight:700;border-top:2px solid #a07830;margin-top:6px"><span>GENEL TOPLAM:</span><span style="color:#a07830">₺${Number(f.genelToplam||0).toLocaleString('tr-TR',{minimumFractionDigits:2})}</span></div>
      </div>
      <div style="clear:both"></div>
      ${f.notlar?`<div style="margin-top:20px;padding:12px;background:#f9f8f6;border-radius:6px;font-size:12px;color:#666"><strong>Notlar:</strong> ${f.notlar}</div>`:''}
    </div>`;
  document.getElementById('fatura-onizle-icerik').innerHTML = html;
}

function faturaYazdir() {
  const icerik = document.getElementById('fatura-onizle-icerik').innerHTML;
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fatura</title><style>body{margin:20px;font-family:Arial,sans-serif}@media print{body{margin:0}}</style></head><body>${icerik}</body></html>`);
  w.document.close(); w.print();
}

// ================================================================
// UYAP & SÜRE TAKİP SİSTEMİ
// ================================================================

// Yasal süreler tablosu
const YASAL_SURELER = {
  'Cevap Süresi':        { gun: 14, aciklama: 'HMK md.127 — Davalının cevap süresi' },
  'İtiraz Süresi':       { gun: 7,  aciklama: 'İcra iflas kanunu — Ödeme emrine itiraz' },
  'Temyiz Süresi':       { gun: 30, aciklama: 'HMK md.361 — Yargıtay temyiz süresi' },
  'İstinaf Süresi':      { gun: 15, aciklama: 'HMK md.345 — Bölge Adliye Mahkemesi istinaf' },
  'İcra Takip Süresi':   { gun: 10, aciklama: 'İİK md.168 — İtiraz / ödeme emri süresi' },
  'Zamanaşımı':          { gun: 365, aciklama: 'Genel zamanaşımı takibi' },
  'Diğer':               { gun: 30, aciklama: '' },
};

// Zamanaşımı süreleri — dava türüne göre
const ZAMANASIMI = {
  'Genel (BK)':               { yil: 10, kanun: 'TBK md.125' },
  'Haksız Fiil':              { yil: 2,  kanun: 'TBK md.72 (öğrenmeden itibaren)' },
  'Haksız Fiil (azami)':      { yil: 10, kanun: 'TBK md.72 (fiilin işlenmesinden)' },
  'Kira Alacağı':             { yil: 5,  kanun: 'TBK md.147' },
  'Maaş / Ücret Alacağı':     { yil: 5,  kanun: 'TBK md.147' },
  'İş Hukuku — Alacaklar':    { yil: 5,  kanun: 'İş K. md.32' },
  'İş Hukuku — Kıdem/İhbar':  { yil: 5,  kanun: 'İş K. md.32' },
  'Ticari Alacak':             { yil: 5,  kanun: 'TTK md.6' },
  'Çek Alacağı':              { yil: 3,  kanun: 'TTK md.814' },
  'Senet (Bono/Poliçe)':      { yil: 3,  kanun: 'TTK md.749' },
  'Trafik Kazası':             { yil: 2,  kanun: 'TBK md.72' },
  'Sigorta Alacağı':          { yil: 2,  kanun: 'TTK md.1420' },
  'İdari Dava':               { gun: 60, kanun: 'İYUK md.7 (tebliğden itibaren 60 gün)' },
  'Ceza Davası — Genel':      { yil: 8,  kanun: 'TCK md.66' },
  'Veraset / Miras':          { yil: 10, kanun: 'TMK md.639' },
  'Tapu / Tescil':            { yil: 20, kanun: 'MK md.716 (zilyetlik)' },
};

function uyapTab(tab, el) {
  ['faiz','sure-hesap','ucret','sureler','durusmalar'].forEach(function(t) {
    var panel = document.getElementById('uyap-tab-' + t);
    var tabEl = document.getElementById('ut-' + t);
    if (panel) panel.style.display = t === tab ? '' : 'none';
    if (tabEl) tabEl.classList.toggle('active', t === tab);
  });
  if (tab === 'sureler') renderSureler();
  if (tab === 'durusmalar') renderDurusmalar();
  if (tab === 'faiz') _initPageFaiz();
  if (tab === 'sure-hesap') _initPageSure();
  if (tab === 'ucret') _initPageUcret();
}

function _initPageFaiz() {
  var sel = document.getElementById('ak-page-tur');
  if (!sel || sel.options.length > 1) return;
  sel.innerHTML = '';
  var gruplar = {};
  AracKutusu.FAIZ_TURLERI.forEach(function(t) {
    var kat = t.id.includes('gecikme') ? 'Kamu / Vergi / SGK' :
              t.id.includes('temerr') ? 'Temerrüt' :
              (t.id==='kidem'||t.id==='is_kazasi'||t.id==='nafaka'||t.id==='kira'||t.id==='kamuLastirma'||t.id==='sigorta') ? 'Özel Alacak Türleri' :
              'Temel Faiz Oranları';
    if(!gruplar[kat]) gruplar[kat]=[];
    gruplar[kat].push(t);
  });
  Object.keys(gruplar).forEach(function(kat) {
    var og = document.createElement('optgroup'); og.label = kat;
    gruplar[kat].forEach(function(t) {
      var o = document.createElement('option'); o.value=t.id; o.textContent=t.ad;
      o.dataset.madde=t.madde; o.dataset.acik=t.aciklama; og.appendChild(o);
    });
    sel.appendChild(og);
  });
  document.getElementById('ak-page-bit').value = today();
  AracKutusu._faizTurBilgiPage();
}

function _initPageSure() {
  var sel = document.getElementById('ak-page-sure-tur');
  if (!sel || sel.options.length > 1) return;
  sel.innerHTML = '<option value="">— Süre türü seçin —</option>';
  var gruplar = {};
  AracKutusu.SURELER.forEach(function(s){if(!gruplar[s.kat])gruplar[s.kat]=[];gruplar[s.kat].push(s);});
  Object.keys(gruplar).forEach(function(k) {
    var og = document.createElement('optgroup'); og.label = k;
    gruplar[k].forEach(function(s) {
      var o = document.createElement('option'); o.value = s.gun; o.dataset.madde = s.madde;
      o.textContent = s.ad + ' (' + s.gun + ' gün — ' + s.madde + ')'; og.appendChild(o);
    });
    sel.appendChild(og);
  });
  document.getElementById('ak-page-sure-bas').value = today();
}

function _initPageUcret() {
  var sel = document.getElementById('ak-page-ucret-tur');
  if (!sel || sel.options.length > 1) return;
  sel.innerHTML = '';
  AracKutusu.AAUT.forEach(function(a) {
    var o = document.createElement('option'); o.value = a.ad;
    o.textContent = a.ad + ' — ' + fmt(a.ucret); sel.appendChild(o);
  });
}

// Sayfa içi hesaplama fonksiyonları
function akPageFaizHesapla() {
  var anapara = parseFloat(document.getElementById('ak-page-anapara').value);
  var bas = document.getElementById('ak-page-bas').value;
  var bit = document.getElementById('ak-page-bit').value;
  var turId = document.getElementById('ak-page-tur').value;
  if (!anapara||anapara<=0) { notify('⚠️ Anapara girin'); return; }
  if (!bas||!bit) { notify('⚠️ Tarih aralığı girin'); return; }
  if (bas>=bit) { notify('⚠️ Bitiş tarihi başlangıçtan sonra olmalı'); return; }
  var sonuc = AracKutusu.faizHesapla(anapara, bas, bit, turId);
  var el = document.getElementById('ak-page-faiz-sonuc');
  var html = '<div style="display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:16px">' +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">' +
    '<div style="background:var(--surface2);border-radius:8px;padding:14px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">ANAPARA</div><div style="font-size:18px;font-weight:800">' + fmt(sonuc.anapara) + '</div></div>' +
    '<div style="background:rgba(231,76,60,.06);border:1px solid rgba(231,76,60,.2);border-radius:8px;padding:14px;text-align:center"><div style="font-size:10px;color:#e74c3c">FAİZ TUTARI</div><div style="font-size:18px;font-weight:800;color:#e74c3c">' + fmt(sonuc.toplamFaiz) + '</div></div>' +
    '<div style="background:rgba(39,174,96,.06);border:1px solid rgba(39,174,96,.2);border-radius:8px;padding:14px;text-align:center"><div style="font-size:10px;color:var(--green)">GENEL TOPLAM</div><div style="font-size:18px;font-weight:800;color:var(--green)">' + fmt(sonuc.genelToplam) + '</div></div></div></div>';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">' + sonuc.faizTuru + ' · ' + sonuc.toplamGun + ' gün · ' + sonuc.dilimSayisi + ' oran dilimi</div>';
  html += '<table><thead><tr><th>Dönem Başlangıç</th><th>Dönem Bitiş</th><th>Gün</th><th>Oran (%)</th><th style="text-align:right">Faiz (₺)</th></tr></thead><tbody>';
  var prevO = -1;
  sonuc.detay.forEach(function(d) { var deg = prevO>=0&&d.oran!==prevO; prevO=d.oran;
    html += '<tr'+(deg?' style="background:rgba(201,168,76,.06)"':'')+'><td>'+fmtD(d.baslangic)+'</td><td>'+fmtD(d.bitis)+'</td><td>'+d.gun+'</td><td>'+(deg?'<b style="color:var(--gold)">%'+d.oran+' ⬆</b>':'%'+d.oran)+'</td><td style="text-align:right;font-weight:600">'+fmt(d.faiz)+'</td></tr>';
  });
  html += '<tr style="font-weight:700;border-top:2px solid var(--border)"><td colspan="2">TOPLAM</td><td>'+sonuc.toplamGun+'</td><td></td><td style="text-align:right;color:#e74c3c">'+fmt(sonuc.toplamFaiz)+'</td></tr></tbody></table>';
  el.innerHTML = html;
}

function akPageSureSecildi() {
  var s = document.getElementById('ak-page-sure-tur');
  document.getElementById('ak-page-sure-gun').value = s.value || 14;
  var o = s.options[s.selectedIndex];
  var m = document.getElementById('ak-page-sure-madde');
  if(m) m.textContent = o && o.dataset.madde ? '📖 ' + o.dataset.madde : '';
}

function akPageSureHesapla() {
  var bas = document.getElementById('ak-page-sure-bas').value;
  var gun = parseInt(document.getElementById('ak-page-sure-gun').value);
  if (!bas) { notify('⚠️ Başlangıç tarihi girin'); return; }
  if (!gun||gun<=0) { notify('⚠️ Gün sayısı girin'); return; }
  var sonTarih = AracKutusu.sureHesapla(bas, gun);
  var kalan = Math.ceil((new Date(sonTarih) - new Date()) / 86400000);
  var renk = kalan<=0?'#e74c3c':kalan<=3?'#e67e22':kalan<=7?'#f39c12':'var(--green)';
  var durum = kalan<=0?'❌ SÜRESİ GEÇTİ':kalan<=3?'🚨 '+kalan+' gün kaldı!':'✅ '+kalan+' gün kaldı';
  document.getElementById('ak-page-sure-sonuc').innerHTML =
    '<div style="background:'+renk+'11;border:2px solid '+renk+';border-radius:12px;padding:24px;text-align:center">' +
    '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">SON TARİH</div>' +
    '<div style="font-size:32px;font-weight:800;color:'+renk+'">'+fmtD(sonTarih)+'</div>' +
    '<div style="font-size:14px;margin-top:8px;color:'+renk+'">'+durum+'</div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">Başlangıç: '+fmtD(bas)+' + '+gun+' iş günü (tatiller hariç)</div></div>' +
    '<div style="display:flex;gap:8px;margin-top:12px;justify-content:center">' +
    '<button class="btn btn-outline btn-sm" onclick="openTakModal(\''+sonTarih+'\')">📅 Takvime Ekle</button>' +
    '<button class="btn btn-outline btn-sm" onclick="if(typeof openTodoModal===\'function\')openTodoModal();var e=document.getElementById(\'todo-son-tarih\');if(e)e.value=\''+sonTarih+'\';">✅ Göreve Ekle</button></div>';
}

function akPageUcretHesapla() {
  var tur = document.getElementById('ak-page-ucret-tur').value;
  var deger = parseFloat(document.getElementById('ak-page-ucret-deger').value) || 0;
  var s = AracKutusu.vekaletHesapla(tur, deger);
  document.getElementById('ak-page-ucret-sonuc').innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">' +
    '<div style="background:var(--surface2);border-radius:8px;padding:14px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">MAKTU (AAÜT)</div><div style="font-size:18px;font-weight:800">'+fmt(s.maktu)+'</div></div>' +
    (deger>0?'<div style="background:var(--surface2);border-radius:8px;padding:14px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">NİSPİ (%15)</div><div style="font-size:18px;font-weight:800">'+fmt(s.nispi)+'</div></div>':'<div></div>') +
    '<div style="background:rgba(201,168,76,.1);border:1px solid var(--gold);border-radius:8px;padding:14px;text-align:center"><div style="font-size:10px;color:var(--gold)">ÖNERİLEN ASGARİ</div><div style="font-size:18px;font-weight:800;color:var(--gold)">'+fmt(s.onerilen)+'</div></div></div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:10px">⚠️ Nispi ücret dava değerinin %15\'idir. Maktu altında ücret kararlaştırılamaz (AAÜT 2024).</div>';
}

// ── Süre Takip ───────────────────────────────────────────────────
function openSureModal(editId) {
  if (!state.sureler) state.sureler = [];
  document.getElementById('sure-modal-title').textContent = editId ? '⏱ Süre Düzenle' : '⏱ Süre Ekle';
  document.getElementById('sure-baslangic').value = today();
  document.getElementById('sure-gun-secim').value = '30';
  document.getElementById('sure-gun-manuel').value = '';
  document.getElementById('sure-aciklama').value = '';
  document.getElementById('sure-oncelik').value = 'normal';
  document.getElementById('sure-takvim-ekle').checked = true;

  // Dava select
  const davaSel = document.getElementById('sure-dava-id');
  davaSel.innerHTML = '<option value="">— Dava/İcra seçin —</option>';
  state.davalar.forEach(d => davaSel.innerHTML += `<option value="dava_${d.id}">📁 ${d.no||d.id.slice(0,6)} — ${d.konu||''} (${getMuvAd(d.muvId)})</option>`);
  state.icra.forEach(i => davaSel.innerHTML += `<option value="icra_${i.id}">⚡ ${i.no||i.id.slice(0,6)} — ${i.borclu||''}</option>`);

  // Müvekkil select
  const muvSel = document.getElementById('sure-muv-id');
  muvSel.innerHTML = '<option value="">— Müvekkil seçin —</option>';
  state.muvekkillar.forEach(m => muvSel.innerHTML += `<option value="${m.id}">${m.ad}</option>`);

  sureGunHesapla();
  openModal('sure-modal');
}

function sureTurDegisti() {
  const tur = document.getElementById('sure-tur').value;
  const yasalSure = YASAL_SURELER[tur];
  if (yasalSure) {
    // En yakın seçeneği bul
    const sel = document.getElementById('sure-gun-secim');
    const opts = [...sel.options].map(o => parseInt(o.value));
    if (opts.includes(yasalSure.gun)) {
      sel.value = yasalSure.gun;
    } else {
      sel.value = '0';
      document.getElementById('sure-gun-manuel').value = yasalSure.gun;
    }
  }
  sureGunHesapla();
}

function sureGunHesapla() {
  const baslangic = document.getElementById('sure-baslangic').value;
  const secim = document.getElementById('sure-gun-secim').value;
  const manuel = document.getElementById('sure-gun-manuel').value;
  const gun = secim === '0' ? parseInt(manuel) : parseInt(secim);

  if (!baslangic || !gun) {
    document.getElementById('sure-son-gun-goster').textContent = '—';
    document.getElementById('sure-kalan-gun-goster').textContent = '—';
    return;
  }

  const bas = new Date(baslangic);
  const son = new Date(bas);
  son.setDate(son.getDate() + gun);

  const bugun = new Date(); bugun.setHours(0,0,0,0);
  const kalan = Math.ceil((son - bugun) / (1000*60*60*24));

  document.getElementById('sure-son-gun-goster').textContent = fmtD(son.toISOString().slice(0,10));

  const kalanEl = document.getElementById('sure-kalan-gun-goster');
  if (kalan < 0) {
    kalanEl.textContent = `${Math.abs(kalan)} gün GEÇT!`;
    kalanEl.style.color = 'var(--red)';
  } else if (kalan === 0) {
    kalanEl.textContent = '⚠️ BUGÜN SON GÜN!';
    kalanEl.style.color = 'var(--red)';
  } else if (kalan <= 3) {
    kalanEl.textContent = `🚨 ${kalan} gün kaldı`;
    kalanEl.style.color = 'var(--red)';
  } else if (kalan <= 7) {
    kalanEl.textContent = `⚠️ ${kalan} gün kaldı`;
    kalanEl.style.color = '#f39c12';
  } else {
    kalanEl.textContent = `${kalan} gün kaldı`;
    kalanEl.style.color = 'var(--green)';
  }
}

// ================================================================
// ================================================================
// FİNANS İŞLEM EKLEME MODALI (LexSubmit Pessimistic)
// ================================================================
function openFinansIslemModal(muvId) {
  var modal = document.getElementById('finans-islem-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'finans-islem-modal';
    modal.innerHTML = '\
<div class="modal modal-lg" style="max-width:580px">\
  <div class="modal-header"><div class="modal-title">💰 Yeni Finansal İşlem</div></div>\
  <div class="modal-body">\
    <input type="hidden" id="fi-muv-id">\
    <div class="form-row">\
      <div class="form-group"><label>İşlem Türü *</label>\
        <select id="fi-tur" onchange="fiTurDegisti()">\
          <option value="Masraf">💸 Masraf (Borç)</option>\
          <option value="Tahsilat">💰 Tahsilat (Alacak)</option>\
          <option value="Avans">🏦 Avans Alındı (Alacak)</option>\
          <option value="Hakediş">⭐ Hakediş / Vekalet Ücreti</option>\
          <option value="İade">↩️ İade</option>\
        </select>\
      </div>\
      <div class="form-group"><label>Tutar (₺) *</label>\
        <input type="number" id="fi-tutar" step="0.01" placeholder="0.00">\
      </div>\
    </div>\
    <div class="form-row">\
      <div class="form-group"><label>Tarih *</label><input type="date" id="fi-tarih"></div>\
      <div class="form-group"><label>Kategori</label>\
        <select id="fi-kategori">\
          <option value="">— Seçin —</option>\
          <option>Harç / Pul</option><option>Tebligat</option><option>Bilirkişi Ücreti</option>\
          <option>Ulaşım</option><option>Avukatlık Ücreti</option><option>Danışmanlık</option>\
          <option>Keşif</option><option>Tercüme</option><option>Genel Büro</option><option>Diğer</option>\
        </select>\
      </div>\
    </div>\
    <div class="form-row">\
      <div class="form-group"><label>İlişkili Dosya</label>\
        <select id="fi-dosya"><option value="">— Dosya seçin (opsiyonel) —</option></select>\
      </div>\
    </div>\
    <div class="form-group"><label>Açıklama</label><input id="fi-acik" placeholder="İşlem açıklaması..."></div>\
  </div>\
  <div class="modal-footer">\
    <button class="btn btn-outline" onclick="closeModal(\'finans-islem-modal\')">İptal</button>\
    <button class="btn btn-gold" id="fi-kaydet-btn" onclick="saveFinansIslem()">💾 Kaydet</button>\
  </div>\
</div>';
    document.body.appendChild(modal);
  }

  // Müvekkil ID ayarla
  document.getElementById('fi-muv-id').value = muvId || '';
  document.getElementById('fi-tarih').value = today();
  document.getElementById('fi-tutar').value = '';
  document.getElementById('fi-acik').value = '';
  document.getElementById('fi-tur').value = 'Masraf';
  document.getElementById('fi-kategori').value = '';

  // Dosya listesi
  var dosyaSel = document.getElementById('fi-dosya');
  dosyaSel.innerHTML = '<option value="">— Dosya seçin (opsiyonel) —</option>';
  (state.davalar||[]).filter(function(d){return !muvId || d.muvId === muvId;}).forEach(function(d) {
    dosyaSel.innerHTML += '<option value="dava:' + d.id + '">📁 ' + (d.no||'') + ' — ' + (d.konu||'') + '</option>';
  });
  (state.icra||[]).filter(function(i){return !muvId || i.muvId === muvId;}).forEach(function(i) {
    dosyaSel.innerHTML += '<option value="icra:' + i.id + '">⚡ ' + (i.no||'') + ' — ' + (i.borclu||'') + '</option>';
  });

  modal.classList.add('open');
}

function fiTurDegisti() {
  var tur = (document.getElementById('fi-tur')||{}).value;
  var katEl = document.getElementById('fi-kategori');
  // Tahsilat/Avans için kategori gizle
  if (katEl) {
    katEl.closest('.form-group').style.display = (tur === 'Masraf' || tur === 'Hakediş') ? '' : 'none';
  }
}

// ── KAYDET (LexSubmit Pessimistic) ───────────────────────────
async function saveFinansIslem() {
  var muvId = document.getElementById('fi-muv-id').value;
  var tur = document.getElementById('fi-tur').value;
  var tutar = parseFloat(document.getElementById('fi-tutar').value);
  var tarih = document.getElementById('fi-tarih').value;

  if (!tarih) { notify('⚠️ Tarih zorunludur'); return; }
  if (isNaN(tutar) || tutar <= 0) { notify('⚠️ Geçerli bir tutar girin'); return; }

  // Yön otomatik belirleme
  var yon;
  if (tur === 'Masraf') yon = 'borc';
  else if (tur === 'Tahsilat' || tur === 'Avans' || tur === 'Hakediş') yon = 'alacak';
  else if (tur === 'İade') yon = 'borc';
  else yon = 'borc';

  // Dosya bağlantısı
  var dosyaVal = (document.getElementById('fi-dosya')||{}).value || '';
  var dosyaTur = '', dosyaId = '', dosyaNo = '';
  if (dosyaVal) {
    var parts = dosyaVal.split(':');
    dosyaTur = parts[0];
    dosyaId = parts[1];
    if (dosyaTur === 'dava') { var d = getDava(dosyaId); dosyaNo = d ? d.no : ''; }
    else if (dosyaTur === 'icra') { var i = getIcra(dosyaId); dosyaNo = i ? i.no : ''; }
  }

  var kayit = {
    id: uid(),
    muvId: muvId,
    tur: tur,
    yön: yon,
    tutar: tutar,
    tarih: tarih,
    aciklama: (document.getElementById('fi-acik')||{}).value || '',
    kategori: (document.getElementById('fi-kategori')||{}).value || '',
    dosyaTur: dosyaTur,
    dosyaId: dosyaId,
    dosyaNo: dosyaNo,
    durum: 'Onaylandı',
  };

  // ── LexSubmit: Pessimistic kaydet ──
  if (typeof LexSubmit !== 'undefined') {
    var btn = document.getElementById('fi-kaydet-btn');
    var ok = await LexSubmit.formKaydet({
      tablo: 'finansIslemler',
      kayit: kayit,
      modalId: 'finans-islem-modal',
      butonEl: btn,
      basariMesaj: '✓ ' + tur + ' kaydedildi — ' + fmt(tutar),
      renderFn: function() {
        refreshFinansViews({muvId: kayit.muvId, dosyaTur: dosyaTur, dosyaId: dosyaId});
      }
    });
    if (!ok) return; // Hata → modal açık, veri korunur
  } else {
    // localStorage fallback
    if (!state.finansIslemler) state.finansIslemler = [];
    state.finansIslemler.push(kayit);
    saveData();
    closeModal('finans-islem-modal');
    renderMuvekkilBakiye();
    renderButce();
    notify('✓ ' + tur + ' kaydedildi');
  }
}

// ================================================================
// GLOBAL FİNANS REFRESH — Tüm finansal bileşenleri yeniler
// ================================================================
// Her finansal LexSubmit.renderFn içinden çağrılmalı.
// Tek çağrıda: cari bakiye, dosya kartları, bütçe, dashboard,
// avans listesi, badge'ler hepsi güncellenir.
//
// Kullanım: refreshFinansViews({ muvId, dosyaTur, dosyaId })
// ================================================================
function refreshFinansViews(opts) {
  opts = opts || {};

  // 1. KPI kartları + uyarılar
  try { renderFinansKPI(); } catch(e) { console.warn('[Finans] renderFinansKPI hatası:', e.message || e); }
  try { renderFinansUyariBar(); } catch(e) { console.warn('[Finans] renderFinansUyariBar hatası:', e.message || e); }

  // 2. Müvekkil cari bakiye (Finans → Müvekkil sekmesi)
  try { renderMuvekkilBakiye(); } catch(e) { console.warn('[Finans] renderMuvekkilBakiye hatası:', e.message || e); }

  // 3. Büro giderleri
  try { renderBuroGiderleri(); } catch(e) { console.warn('[Finans] renderBuroGiderleri hatası:', e.message || e); }

  // 4. Dosya detay kartları (açık dosya varsa)
  if (opts.dosyaTur === 'dava' || aktivDavaId) {
    var dava = typeof getDava === 'function' ? getDava(opts.dosyaId || aktivDavaId) : null;
    if (dava) {
      try { if (typeof renderDdCards === 'function') renderDdCards(dava); } catch(e) { console.warn('[Finans] renderDdCards hatası:', e.message || e); }
      try { if (typeof renderDavaTabContent === 'function') renderDavaTabContent('harcamalar'); } catch(e) { console.warn('[Finans] renderDavaTabContent hatası:', e.message || e); }
    }
  }
  if (opts.dosyaTur === 'icra' || aktivIcraId) {
    var icra = typeof getIcra === 'function' ? getIcra(opts.dosyaId || aktivIcraId) : null;
    if (icra) {
      try { if (typeof renderIdCards === 'function') renderIdCards(icra); } catch(e) { console.warn('[Finans] renderIdCards hatası:', e.message || e); }
      try { if (typeof renderIcraTabContent === 'function') renderIcraTabContent('harcamalar'); } catch(e) { console.warn('[Finans] renderIcraTabContent hatası:', e.message || e); }
    }
  }

  // 5. Müvekkil detay sayfası (avans, harcama, kartlar)
  if (opts.muvId || aktivMuvId) {
    try { if (typeof renderMdAvans === 'function') renderMdAvans(); } catch(e) { console.warn('[Finans] renderMdAvans hatası:', e.message || e); }
    try { if (typeof renderMdHarcamalar === 'function') renderMdHarcamalar(); } catch(e) { console.warn('[Finans] renderMdHarcamalar hatası:', e.message || e); }
    try { if (typeof renderMdCards === 'function') renderMdCards(); } catch(e) { console.warn('[Finans] renderMdCards hatası:', e.message || e); }
  }

  // 6. İcra ve Dava liste kartları
  try { if (typeof renderIcraCards === 'function') renderIcraCards(); } catch(e) { console.warn('[Finans] renderIcraCards hatası:', e.message || e); }
  try { if (typeof renderDavaCards === 'function') renderDavaCards(); } catch(e) { console.warn('[Finans] renderDavaCards hatası:', e.message || e); }

  // 7. Dashboard
  try { if (typeof renderDashboard === 'function') renderDashboard(); } catch(e) { console.warn('[Finans] renderDashboard hatası:', e.message || e); }

  // 8. Badge'ler
  try { if (typeof updateBadges === 'function') updateBadges(); } catch(e) { console.warn('[Finans] updateBadges hatası:', e.message || e); }
}
