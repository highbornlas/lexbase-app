// ================================================================
// EMD HUKUK — FINANS VE FATURA
// js/modules/finans.js
// ================================================================

function renderButce() {
  const tb = document.getElementById('but-tbody'), em = document.getElementById('but-empty');
  const ft = document.getElementById('butce-filtre-tur')?.value || '';
  const fk = document.getElementById('butce-filtre-kat')?.value || '';
  const fay = document.getElementById('butce-filtre-ay')?.value || '';

  // Kategori select'i doldur
  const katSel = document.getElementById('butce-filtre-kat');
  if (katSel && katSel.options.length <= 1) {
    const katlar = [...new Set(state.butce.map(b => b.kat).filter(Boolean))];
    katlar.forEach(k => { katSel.innerHTML += `<option value="${k}">${k}</option>`; });
  }

  let list = state.butce;
  if (ft) list = list.filter(b => b.tur === ft);
  if (fk) list = list.filter(b => b.kat === fk);
  if (fay) list = list.filter(b => b.tarih?.startsWith(fay));
  list = [...list].sort((a, b) => (b.tarih||'').localeCompare(a.tarih||''));

  tb.innerHTML = '';
  if (!list.length) { em.style.display = 'block'; }
  else {
    em.style.display = 'none';
    list.forEach(b => {
      const col = b.tur === 'Gelir' ? 'var(--green)' : '#e74c3c';
      const sign = b.tur === 'Gelir' ? '+' : '-';
      const kdvBadge = b.kdvOran > 0 ? `<span style="font-size:10px;color:var(--text-muted)">+%${b.kdvOran} KDV</span>` : '';
      tb.innerHTML += `<tr>
        <td>${fmtD(b.tarih)}</td>
        <td><span class="badge badge-${b.tur==='Gelir'?'gelir':'gider'}">${b.tur}</span></td>
        <td>${b.kat||'—'}</td>
        <td>${b.acik||'—'}</td>
        <td>${b.muvId ? getMuvAd(b.muvId) : '—'}</td>
        <td style="font-size:11px">${kdvBadge}</td>
        <td style="color:${col};font-weight:600">${sign}${fmt(b.tutar)}</td>
        <td>
          <button class="btn" style="padding:3px 8px;font-size:11px;background:var(--surface2)" onclick="openWpMuvekkilModal('${b.muvId||''}')">📱</button>
          <button class="delete-btn" onclick="delButce('${b.id}')">✕</button>
        </td>
      </tr>`;
    });
  }

  // Özet kartlar
  const tg = state.butce.filter(b => b.tur === 'Gelir').reduce((s, b) => s + b.tutar, 0);
  const td_ = state.butce.filter(b => b.tur === 'Gider').reduce((s, b) => s + b.tutar, 0);
  const net = tg - td_;
  const topKdv = state.butce.reduce((s, b) => s + (b.kdvTutar || 0), 0);
  const bekleyen = state.butce.filter(b => b.kat && b.kat.includes('Bekliyor')).reduce((s, b) => s + b.tutar, 0);

  document.getElementById('b-gelir').textContent = fmt(tg);
  document.getElementById('b-gider').textContent = fmt(td_);
  const ne = document.getElementById('b-net'); ne.textContent = fmt(net); ne.style.color = net >= 0 ? 'var(--green)' : '#e74c3c';
  document.getElementById('b-kdv').textContent = fmt(topKdv);
  document.getElementById('b-bekleyen').textContent = fmt(bekleyen);

  const now = new Date(), ayP = now.getFullYear() + '-' + (now.getMonth()+1).toString().padStart(2,'0');
  const ayG = state.butce.filter(b => b.tur === 'Gelir' && b.tarih?.startsWith(ayP)).reduce((s, b) => s + b.tutar, 0);
  const ayD = state.butce.filter(b => b.tur === 'Gider' && b.tarih?.startsWith(ayP)).reduce((s, b) => s + b.tutar, 0);
  const ae = document.getElementById('b-ay'); ae.textContent = fmt(ayG - ayD); ae.style.color = (ayG-ayD) >= 0 ? 'var(--green)' : '#e74c3c';
}

function delButce(id) {
  if (!confirm('Bu hareketi silmek istiyor musunuz?')) return;
  state.butce = state.butce.filter(b => b.id !== id);
  if (currentBuroId) deleteFromSupabase('finans', id);
  saveData(); renderButce(); notify('Silindi');
}

// ── Müvekkil Bakiye ─────────────────────────────────────────────
function renderMuvekkilBakiye() {
  const el = document.getElementById('muvekkil-bakiye-liste');
  if (!el) return;
  const muvler = state.muvekkillar;
  if (!muvler.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">👤</div><p>Müvekkil yok</p></div>'; return; }

  // ── Birleşik hesaplama: finansIslemler + butce + avanslar ──
  let html = '';
  muvler.forEach(m => {
    // Yeni sistem (finans_islemler)
    const fi = (state.finansIslemler||[]).filter(i => i.muvId === m.id);
    const fiBorc = fi.filter(i => i.yön === 'borc').reduce((s,i) => s + (i.tutar||0), 0);
    const fiAlacak = fi.filter(i => i.yön === 'alacak').reduce((s,i) => s + (i.tutar||0), 0);

    // Eski sistem (butce + avanslar) — geriye uyumluluk
    const eskiGelir = state.butce.filter(b => b.muvId === m.id && b.tur === 'Gelir').reduce((s, b) => s + b.tutar, 0);
    const eskiGider = state.butce.filter(b => b.muvId === m.id && b.tur === 'Gider').reduce((s, b) => s + b.tutar, 0);
    const avanslar = (state.avanslar||[]).filter(a => a.muvId === m.id);
    const avansAlinan = avanslar.filter(a => a.tur === 'Avans Alındı').reduce((s, a) => s + (a.tutar||0), 0);
    const beklAlacak = avanslar.filter(a => a.durum === 'Bekliyor').reduce((s, a) => s + (a.tutar||0), 0);

    // Birleşik
    const topBorc = fiBorc + eskiGider;
    const topAlacak = fiAlacak + eskiGelir + avansAlinan;
    const bakiye = topAlacak - topBorc;

    const faturalar = (state.faturalar||[]).filter(f => f.muvId === m.id);
    const odenmemis = faturalar.filter(f => f.durum === 'bekliyor' || f.durum === 'gecikti').reduce((s, f) => s + (f.genelToplam||0), 0);

    if (topAlacak === 0 && topBorc === 0 && odenmemis === 0 && beklAlacak === 0) return;

    const bakiyeRenk = bakiye >= 0 ? 'var(--green)' : 'var(--red)';

    html += `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:10px;cursor:pointer" onclick="openCariEkstre('${m.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div>
            <div style="font-weight:600;font-size:14px">${m.ad}</div>
            <div style="font-size:11px;color:var(--text-dim)">${fi.length + avanslar.length} işlem</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="text-align:right">
              <div style="font-size:10px;color:var(--text-dim)">BAKİYE</div>
              <div style="font-size:18px;font-weight:800;color:${bakiyeRenk}">${fmt(bakiye)}</div>
            </div>
            <button class="btn btn-gold btn-sm" onclick="event.stopPropagation();openFinansIslemModal('${m.id}')" style="padding:4px 10px;font-size:11px">+ İşlem</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
          <div style="text-align:center"><div style="font-size:10px;color:var(--text-muted)">Masraf/Borç</div><div style="font-size:13px;font-weight:700;color:var(--red)">${fmt(topBorc)}</div></div>
          <div style="text-align:center"><div style="font-size:10px;color:var(--text-muted)">Tahsilat</div><div style="font-size:13px;font-weight:700;color:var(--green)">${fmt(topAlacak)}</div></div>
          <div style="text-align:center"><div style="font-size:10px;color:var(--text-muted)">Avans Alınan</div><div style="font-size:13px;font-weight:700;color:var(--blue)">${fmt(avansAlinan)}</div></div>
          <div style="text-align:center"><div style="font-size:10px;color:var(--text-muted)">Bekl. Alacak</div><div style="font-size:13px;font-weight:700;color:${beklAlacak>0?'#f39c12':'var(--text-muted)'}">${fmt(beklAlacak)}</div></div>
          <div style="text-align:center"><div style="font-size:10px;color:var(--text-muted)">Ödenmemiş Fat.</div><div style="font-size:13px;font-weight:700;color:${odenmemis>0?'#e74c3c':'var(--text-muted)'}">${fmt(odenmemis)}</div></div>
        </div>
      </div>`;
  });

  el.innerHTML = html || '<div class="empty"><div class="empty-icon">💰</div><p>Müvekkil bazlı hareket yok</p></div>';
}

// ── Aylık Rapor ─────────────────────────────────────────────────
function renderFinansRapor() {
  const el = document.getElementById('finans-rapor-icerik');
  if (!el) return;
  const yilSel = document.getElementById('rapor-yil');
  if (yilSel && !yilSel.options.length) {
    const yillar = [...new Set(state.butce.map(b => b.tarih?.slice(0,4)).filter(Boolean))].sort().reverse();
    if (!yillar.length) yillar.push(new Date().getFullYear().toString());
    yillar.forEach(y => yilSel.innerHTML += `<option value="${y}">${y}</option>`);
  }
  const yil = yilSel?.value || new Date().getFullYear().toString();
  const aylar = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  let html = `<div style="font-size:16px;font-weight:700;margin-bottom:16px;color:var(--gold)">${yil} Yılı Finansal Özet</div>`;
  html += `<table><thead><tr><th>Ay</th><th>Gelir</th><th>Gider</th><th>Net</th><th>KDV</th></tr></thead><tbody>`;

  let topG = 0, topD = 0, topKdv = 0;
  for (let i = 0; i < 12; i++) {
    const ayStr = yil + '-' + String(i+1).padStart(2,'0');
    const g = state.butce.filter(b => b.tur === 'Gelir' && b.tarih?.startsWith(ayStr)).reduce((s, b) => s + b.tutar, 0);
    const d = state.butce.filter(b => b.tur === 'Gider' && b.tarih?.startsWith(ayStr)).reduce((s, b) => s + b.tutar, 0);
    const kdv = state.butce.filter(b => b.tarih?.startsWith(ayStr)).reduce((s, b) => s + (b.kdvTutar||0), 0);
    topG += g; topD += d; topKdv += kdv;
    const net = g - d;
    const satir = g === 0 && d === 0 ? `style="opacity:0.4"` : '';
    html += `<tr ${satir}><td>${aylar[i]}</td><td style="color:var(--green)">${g > 0 ? fmt(g) : '—'}</td><td style="color:var(--red)">${d > 0 ? fmt(d) : '—'}</td><td style="font-weight:600;color:${net>=0?'var(--green)':'var(--red)'}">${fmt(net)}</td><td style="color:var(--text-muted)">${kdv > 0 ? fmt(kdv) : '—'}</td></tr>`;
  }
  html += `<tr style="font-weight:700;border-top:2px solid var(--border)"><td>TOPLAM</td><td style="color:var(--green)">${fmt(topG)}</td><td style="color:var(--red)">${fmt(topD)}</td><td style="color:${(topG-topD)>=0?'var(--green)':'var(--red)'}">${fmt(topG-topD)}</td><td>${fmt(topKdv)}</td></tr>`;
  html += '</tbody></table>';

  // Kategori dağılımı
  html += `<div style="font-size:13px;font-weight:700;margin:20px 0 10px;color:var(--text-muted)">KATEGORİ DAĞILIMI (${yil})</div>`;
  const katGelir = {}, katGider = {};
  state.butce.filter(b => b.tarih?.startsWith(yil)).forEach(b => {
    if (b.tur === 'Gelir') katGelir[b.kat] = (katGelir[b.kat]||0) + b.tutar;
    else katGider[b.kat] = (katGider[b.kat]||0) + b.tutar;
  });
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
  html += '<div><div style="font-size:12px;font-weight:700;color:var(--green);margin-bottom:8px">GELİR KATEGORİLERİ</div>';
  Object.entries(katGelir).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => {
    html += `<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid var(--border)"><span>${k}</span><span style="color:var(--green);font-weight:600">${fmt(v)}</span></div>`;
  });
  html += '</div><div><div style="font-size:12px;font-weight:700;color:var(--red);margin-bottom:8px">GİDER KATEGORİLERİ</div>';
  Object.entries(katGider).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => {
    html += `<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid var(--border)"><span>${k}</span><span style="color:var(--red);font-weight:600">${fmt(v)}</span></div>`;
  });
  html += '</div></div>';
  el.innerHTML = html;
}

function finansRaporModal() {
  const el = document.getElementById('finans-rapor-icerik');
  if (el) {
    const yilSel = document.getElementById('rapor-yil');
    if (yilSel) { yilSel.innerHTML = ''; }
  }
  openModal('finans-rapor-modal');
  setTimeout(renderFinansRapor, 100);
}

function finansRaporYazdir() {
  const icerik = document.getElementById('finans-rapor-icerik')?.innerHTML || '';
  const yil = document.getElementById('rapor-yil')?.value || '';
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Finansal Rapor ${yil}</title>
  <style>body{font-family:Arial,sans-serif;padding:30px;color:#1a1714}table{width:100%;border-collapse:collapse;margin-bottom:20px}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f5f4f2}h1{color:#a07830}</style>
  </head><body><h1>Finansal Rapor — ${yil}</h1>${icerik}</body></html>`);
  w.document.close(); w.print();
}

function raporPdfIndir() { finansRaporYazdir(); }

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
// CARİ EKSTRE — Müvekkil Detay Sayfası
// ================================================================
function openCariEkstre(muvId) {
  var m = getMuv(muvId);
  if (!m) return;

  // Tüm işlemleri topla (yeni + eski sistem)
  var islemler = [];

  // finans_islemler
  (state.finansIslemler||[]).filter(function(i){return i.muvId===muvId;}).forEach(function(i) {
    islemler.push({ id:i.id, tarih:i.tarih, tur:i.tur, yon:i.yön, tutar:i.tutar||0, acik:i.aciklama||i.acik||'', kategori:i.kategori||'', dosyaNo:i.dosyaNo||'', kaynak:'finans_islemler' });
  });

  // Eski butce
  state.butce.filter(function(b){return b.muvId===muvId;}).forEach(function(b) {
    islemler.push({ id:b.id, tarih:b.tarih, tur:b.tur==='Gelir'?'Tahsilat':'Masraf', yon:b.tur==='Gelir'?'alacak':'borc', tutar:b.tutar||0, acik:b.acik||'', kategori:b.kat||'', dosyaNo:'', kaynak:'butce' });
  });

  // Eski avanslar
  (state.avanslar||[]).filter(function(a){return a.muvId===muvId;}).forEach(function(a) {
    islemler.push({ id:a.id, tarih:a.tarih, tur:a.tur||'Avans', yon:a.tur==='Avans Alındı'?'alacak':'borc', tutar:a.tutar||0, acik:a.acik||a.aciklama||'', kategori:'', dosyaNo:a.dosyaNo||'', kaynak:'avanslar' });
  });

  // Tarihe göre sırala (en yeni üstte)
  islemler.sort(function(a,b){return (b.tarih||'').localeCompare(a.tarih||'');});

  // Bakiye hesapla
  var topBorc = islemler.filter(function(i){return i.yon==='borc';}).reduce(function(s,i){return s+i.tutar;},0);
  var topAlacak = islemler.filter(function(i){return i.yon==='alacak';}).reduce(function(s,i){return s+i.tutar;},0);
  var bakiye = topAlacak - topBorc;
  var bakiyeRenk = bakiye >= 0 ? 'var(--green)' : 'var(--red)';

  // Çalışan bakiye (running balance) hesapla — alttan üste
  var calisan = 0;
  var reversed = islemler.slice().reverse();
  reversed.forEach(function(i) {
    if (i.yon === 'alacak') calisan += i.tutar;
    else calisan -= i.tutar;
    i._bakiye = calisan;
  });

  // Modal HTML
  var html = '<div style="padding:20px">';
  // Başlık
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">';
  html += '<div><div style="font-size:18px;font-weight:700;color:var(--text)">📊 ' + m.ad + ' — Cari Ekstre</div>';
  html += '<div style="font-size:12px;color:var(--text-muted)">' + islemler.length + ' işlem</div></div>';
  html += '<div style="text-align:right"><div style="font-size:10px;color:var(--text-dim);text-transform:uppercase">BAKİYE</div>';
  html += '<div style="font-size:24px;font-weight:800;color:' + bakiyeRenk + '">' + fmt(bakiye) + '</div></div></div>';

  // Özet kartlar
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">';
  html += '<div style="background:var(--surface2);border-radius:var(--radius);padding:12px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">TOPLAM BORÇ</div><div style="font-size:16px;font-weight:700;color:var(--red)">' + fmt(topBorc) + '</div></div>';
  html += '<div style="background:var(--surface2);border-radius:var(--radius);padding:12px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">TOPLAM ALACAK</div><div style="font-size:16px;font-weight:700;color:var(--green)">' + fmt(topAlacak) + '</div></div>';
  html += '<div style="background:' + bakiyeRenk + '11;border:1px solid ' + bakiyeRenk + ';border-radius:var(--radius);padding:12px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">NET BAKİYE</div><div style="font-size:16px;font-weight:700;color:' + bakiyeRenk + '">' + fmt(bakiye) + '</div></div>';
  html += '</div>';

  // + İşlem Ekle butonu
  html += '<div style="display:flex;justify-content:flex-end;margin-bottom:12px">';
  html += '<button class="btn btn-gold btn-sm" onclick="closeModal(\'cari-ekstre-modal\');openFinansIslemModal(\'' + muvId + '\')">+ Yeni İşlem Ekle</button>';
  html += '</div>';

  // İşlem tablosu (banka ekstresi tarzı)
  if (islemler.length) {
    html += '<table><thead><tr><th>Tarih</th><th>Tür</th><th>Açıklama</th><th>Dosya</th><th style="text-align:right">Borç</th><th style="text-align:right">Alacak</th><th style="text-align:right">Bakiye</th></tr></thead><tbody>';
    islemler.forEach(function(i) {
      var turRenk = i.yon === 'alacak' ? 'var(--green)' : 'var(--red)';
      var turIcon = {'Masraf':'💸','Tahsilat':'💰','Avans':'🏦','Hakediş':'⭐','Vekalet Ücreti':'⚖️','Fatura':'📄','İade':'↩️','Avans Alındı':'🏦'}[i.tur] || '📋';
      var bakiyeRenk2 = i._bakiye >= 0 ? 'var(--green)' : 'var(--red)';
      html += '<tr>';
      html += '<td style="font-size:11px;white-space:nowrap">' + fmtD(i.tarih) + '</td>';
      html += '<td><span style="font-size:11px;color:' + turRenk + ';font-weight:600">' + turIcon + ' ' + i.tur + '</span></td>';
      html += '<td style="font-size:12px">' + (i.acik||'—') + (i.kategori ? ' <span style="font-size:9px;background:var(--surface2);padding:1px 6px;border-radius:3px">' + i.kategori + '</span>' : '') + '</td>';
      html += '<td style="font-size:11px;color:var(--text-muted)">' + (i.dosyaNo||'—') + '</td>';
      html += '<td style="text-align:right;font-weight:600;color:var(--red)">' + (i.yon === 'borc' ? fmt(i.tutar) : '') + '</td>';
      html += '<td style="text-align:right;font-weight:600;color:var(--green)">' + (i.yon === 'alacak' ? fmt(i.tutar) : '') + '</td>';
      html += '<td style="text-align:right;font-weight:700;color:' + bakiyeRenk2 + '">' + fmt(i._bakiye) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
  } else {
    html += '<div class="empty"><div class="empty-icon">📊</div><p>Henüz işlem yok</p></div>';
  }
  html += '</div>';

  // Modal göster
  var modal = document.getElementById('cari-ekstre-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'cari-ekstre-modal';
    modal.innerHTML = '<div class="modal modal-lg" style="max-width:900px"><div class="modal-header"><div class="modal-title">Cari Ekstre</div></div><div id="cari-ekstre-icerik"></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal(\'cari-ekstre-modal\')">Kapat</button></div></div>';
    document.body.appendChild(modal);
  }
  document.getElementById('cari-ekstre-icerik').innerHTML = html;
  modal.classList.add('open');
}

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

  // 1. Müvekkil cari bakiye (Finans → Müvekkil sekmesi)
  if (typeof renderMuvekkilBakiye === 'function') {
    try { renderMuvekkilBakiye(); } catch(e) {}
  }

  // 2. Bütçe / finans hareketleri
  if (typeof renderButce === 'function') {
    try { renderButce(); } catch(e) {}
  }

  // 3. Dosya detay kartları (açık dosya varsa)
  if (opts.dosyaTur === 'dava' || aktivDavaId) {
    var dava = typeof getDava === 'function' ? getDava(opts.dosyaId || aktivDavaId) : null;
    if (dava) {
      try { if (typeof renderDdCards === 'function') renderDdCards(dava); } catch(e) {}
      try { if (typeof renderDavaTabContent === 'function') renderDavaTabContent('harcamalar'); } catch(e) {}
    }
  }
  if (opts.dosyaTur === 'icra' || aktivIcraId) {
    var icra = typeof getIcra === 'function' ? getIcra(opts.dosyaId || aktivIcraId) : null;
    if (icra) {
      try { if (typeof renderIdCards === 'function') renderIdCards(icra); } catch(e) {}
      try { if (typeof renderIcraTabContent === 'function') renderIcraTabContent('harcamalar'); } catch(e) {}
    }
  }

  // 4. Müvekkil detay sayfası (avans, harcama, kartlar)
  if (opts.muvId || aktivMuvId) {
    try { if (typeof renderMdAvans === 'function') renderMdAvans(); } catch(e) {}
    try { if (typeof renderMdHarcamalar === 'function') renderMdHarcamalar(); } catch(e) {}
    try { if (typeof renderMdCards === 'function') renderMdCards(); } catch(e) {}
  }

  // 5. İcra ve Dava liste kartları
  try { if (typeof renderIcraCards === 'function') renderIcraCards(); } catch(e) {}
  try { if (typeof renderDavaCards === 'function') renderDavaCards(); } catch(e) {}

  // 6. Dashboard
  try { if (typeof renderDashboard === 'function') renderDashboard(); } catch(e) {}

  // 7. Badge'ler
  try { if (typeof updateBadges === 'function') updateBadges(); } catch(e) {}
}
