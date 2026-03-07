// ================================================================
// EMD HUKUK — DANIŞMANLIK
// js/modules/danismanlik.js
// ================================================================

function renderDanismanlik() {
  const filTur = document.getElementById('dan-fil-tur') ? document.getElementById('dan-fil-tur').value : '';
  const filDurum = document.getElementById('dan-fil-durum') ? document.getElementById('dan-fil-durum').value : '';
  let list = state.danismanlik;
  if (filTur) list = list.filter(d => d.tur === filTur);
  if (filDurum) list = list.filter(d => d.durum === filDurum);
  list = list.slice().sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));

  const toplam = state.danismanlik.length;
  const devam = state.danismanlik.filter(d => !['Tamamlandı','İptal'].includes(d.durum)).length;
  const tamam = state.danismanlik.filter(d => d.durum === 'Tamamlandı').length;
  const bekleyen = state.danismanlik.reduce((s, d) => s + ((d.ucret || 0) - (d.tahsilEdildi || 0)), 0);

  const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setEl('dan-toplam', toplam);
  setEl('dan-devam', devam);
  setEl('dan-tamam', tamam);
  setEl('dan-bekleyen', fmt(Math.max(0, bekleyen)));

  const tbody = document.getElementById('dan-tbody');
  const empty = document.getElementById('dan-empty');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  tbody.innerHTML = list.map(d => {
    const turRenk = DAN_TUR_RENK[d.tur] || '#7f8c8d';
    const durRenk = DAN_DURUM_RENK[d.durum] || '#7f8c8d';
    const kalan = (d.ucret || 0) - (d.tahsilEdildi || 0);
    return `<tr style="cursor:pointer" onclick="openDanDetay('${d.id}')">
      <td style="font-size:12px">${fmtD(d.tarih)}</td>
      <td><span style="background:${turRenk}22;color:${turRenk};font-size:11px;padding:2px 7px;border-radius:10px;font-weight:600;white-space:nowrap">${d.tur}</span></td>
      <td style="font-size:12px">${getMuvAd(d.muvId)}</td>
      <td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.konu}</td>
      <td><span style="background:${durRenk}22;color:${durRenk};font-size:11px;padding:2px 7px;border-radius:10px;font-weight:600">${d.durum}</span></td>
      <td style="font-size:12px">${d.teslimTarih ? fmtD(d.teslimTarih) : '—'}</td>
      <td style="font-size:12px;color:var(--green)">${d.ucret ? fmt(d.ucret) : '—'}</td>
      <td style="font-size:12px;color:${kalan > 0 ? '#e74c3c' : 'var(--green)'}">${d.ucret ? fmt(d.tahsilEdildi || 0) : '—'}</td>
      <td><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openDanModal('${d.id}')">✏</button></td>
    </tr>`;
  }).join('');
}

function openDanDetay(id) {
  aktivDanId = id;
  const d = state.danismanlik.find(x => x.id === id);
  if (!d) return;
  document.getElementById('dan-detay-title').textContent = d.konu;
  // Sekmeleri sıfırla
  document.querySelectorAll('#dan-detay-modal .tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  document.querySelectorAll('#dan-detay-modal .tab-panel').forEach((p, i) => p.classList.toggle('active', i === 0));
  renderDanDetayBilgi(d);
  openModal('dan-detay-modal');
}

function danDetayTab(t, el) {
  document.querySelectorAll('#dan-detay-modal .tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('#dan-detay-modal .tab-panel').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('ddt-' + t).classList.add('active');
  const d = state.danismanlik.find(x => x.id === aktivDanId);
  if (!d) return;
  if (t === 'bilgi') renderDanDetayBilgi(d);
  else if (t === 'evraklar') renderDanDetayEvraklar(d);
  else if (t === 'notlar') renderDanDetayNotlar(d);
}

function renderDanDetayBilgi(d) {
  const turRenk = DAN_TUR_RENK[d.tur] || '#7f8c8d';
  const durRenk = DAN_DURUM_RENK[d.durum] || '#7f8c8d';
  const kalan = (d.ucret || 0) - (d.tahsilEdildi || 0);
  document.getElementById('ddt-bilgi-content').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">HİZMET TÜRÜ</div>
        <span style="background:${turRenk}22;color:${turRenk};font-size:12px;padding:3px 10px;border-radius:10px;font-weight:600">${d.tur}</span></div>
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">DURUM</div>
        <span style="background:${durRenk}22;color:${durRenk};font-size:12px;padding:3px 10px;border-radius:10px;font-weight:600">${d.durum}</span></div>
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">MÜVEKKİL</div><div style="font-size:13px;font-weight:600">${getMuvAd(d.muvId)}</div></div>
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">BAŞLANGIÇ TARİHİ</div><div style="font-size:13px">${fmtD(d.tarih)}</div></div>
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">TESLİM TARİHİ</div><div style="font-size:13px">${d.teslimTarih ? fmtD(d.teslimTarih) : '—'}</div></div>
      <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">TAKVİM</div><div style="font-size:12px;color:var(--text-muted)">${d.takvimId ? '✅ Takvime eklendi' : '—'}</div></div>
    </div>
    <div style="background:var(--surface2);border-radius:8px;padding:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      <div><div style="font-size:11px;color:var(--text-muted)">KARARLAŞTIRILAN ÜCRET</div><div style="font-size:16px;font-weight:700;color:var(--green)">${d.ucret ? fmt(d.ucret) : '—'}</div></div>
      <div><div style="font-size:11px;color:var(--text-muted)">TAHSİL EDİLEN</div><div style="font-size:16px;font-weight:700;color:var(--green)">${fmt(d.tahsilEdildi || 0)}</div></div>
      <div><div style="font-size:11px;color:var(--text-muted)">KALAN</div><div style="font-size:16px;font-weight:700;color:${kalan > 0 ? '#e74c3c' : 'var(--green)'}">${fmt(Math.max(0, kalan))}</div></div>
    </div>
    ${d.aciklama ? `<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">AÇIKLAMA / NOTLAR</div><div style="font-size:13px;line-height:1.6;white-space:pre-wrap;padding:12px;background:var(--surface2);border-radius:8px">${d.aciklama}</div></div>` : ''}
    <div style="margin-top:16px">
      <select id="dan-detay-durum" style="padding:6px 12px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:12px;margin-right:8px">
        <option ${d.durum==='Taslak'?'selected':''}>Taslak</option>
        <option ${d.durum==='Devam Ediyor'?'selected':''}>Devam Ediyor</option>
        <option ${d.durum==='Müvekkil Onayında'?'selected':''}>Müvekkil Onayında</option>
        <option ${d.durum==='Gönderildi'?'selected':''}>Gönderildi</option>
        <option ${d.durum==='Tamamlandı'?'selected':''}>Tamamlandı</option>
        <option ${d.durum==='İptal'?'selected':''}>İptal</option>
      </select>
      <button class="btn btn-gold btn-sm" onclick="danDurumGuncelle()">Durum Güncelle</button>
    </div>`;
}

function danDurumGuncelle() {
  const d = state.danismanlik.find(x => x.id === aktivDanId);
  if (!d) return;
  d.durum = document.getElementById('dan-detay-durum').value;
  saveData();
  renderDanDetayBilgi(d);
  renderDanismanlik();
  if (document.getElementById('mt-danismanlik').classList.contains('active')) renderMdDanismanlik();
  updateBadges();
  notify('✓ Durum güncellendi');
}

function renderDanDetayEvraklar(d) {
  const el = document.getElementById('ddt-evraklar-content');
  let html = `<div style="margin-bottom:12px"><label class="btn btn-outline btn-sm" style="cursor:pointer">📎 Dosya Ekle<input type="file" multiple style="display:none" onchange="danEvrakEkle(this)"></label></div>`;
  if (!(d.evraklar || []).length) {
    html += '<div class="empty"><div class="empty-icon">📄</div><p>Evrak yok</p></div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:8px">';
    d.evraklar.forEach((ev, i) => {
      html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--surface2);border-radius:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">${fileIcon(ev.ad)}</span>
          <div><div style="font-size:12px;font-weight:600">${ev.ad}</div>
          <div style="font-size:11px;color:var(--text-muted)">${fileSize(ev.data)} · ${fmtD(ev.tarih)}</div></div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="danEvrakIndir(${i})">⬇</button>
          <button class="btn btn-outline btn-sm" onclick="danEvrakSil(${i})">🗑</button>
        </div>
      </div>`;
    });
    html += '</div>';
  }
  el.innerHTML = html;
}

function danEvrakEkle(input) {
  const d = state.danismanlik.find(x => x.id === aktivDanId);
  if (!d) return;
  if (!d.evraklar) d.evraklar = [];
  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      d.evraklar.push({ ad: file.name, tarih: today(), data: e.target.result });
      saveData();
      renderDanDetayEvraklar(d);
      notify('✓ Evrak eklendi');
    };
    reader.readAsDataURL(file);
  });
}

function danEvrakIndir(i) {
  const d = state.danismanlik.find(x => x.id === aktivDanId);
  if (!d || !d.evraklar[i]) return;
  const a = document.createElement('a');
  a.href = d.evraklar[i].data; a.download = d.evraklar[i].ad; a.click();
}

function danEvrakSil(i) {
  const d = state.danismanlik.find(x => x.id === aktivDanId);
  if (!d) return;
  d.evraklar.splice(i, 1);
  saveData(); renderDanDetayEvraklar(d); notify('Evrak silindi');
}

function renderDanDetayNotlar(d) {
  const el = document.getElementById('ddt-notlar-content');
  const notlar = d.notlar || [];
  let html = `<div style="display:flex;gap:8px;margin-bottom:16px">
    <textarea id="dan-not-input" rows="2" style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:12px;resize:vertical" placeholder="Not ekle..."></textarea>
    <button class="btn btn-gold btn-sm" style="align-self:flex-end" onclick="danNotEkle()">Ekle</button>
  </div>`;
  if (!notlar.length) {
    html += '<div class="empty"><div class="empty-icon">📝</div><p>Not yok</p></div>';
  } else {
    html += notlar.slice().reverse().map((n, i) => `
      <div style="padding:10px 14px;background:var(--surface2);border-radius:8px;margin-bottom:8px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${fmtD(n.tarih)} ${n.saat || ''}</div>
        <div style="font-size:13px;line-height:1.5;white-space:pre-wrap">${n.metin}</div>
      </div>`).join('');
  }
  el.innerHTML = html;
}

function danNotEkle() {
  const d = state.danismanlik.find(x => x.id === aktivDanId);
  if (!d) return;
  const metin = document.getElementById('dan-not-input').value.trim();
  if (!metin) return;
  if (!d.notlar) d.notlar = [];
  d.notlar.push({ tarih: today(), saat: new Date().toTimeString().slice(0,5), metin });
  saveData();
  renderDanDetayNotlar(d);
  notify('✓ Not eklendi');
}

function editDanFromDetay() {
  closeModal('dan-detay-modal');
  openDanModal(aktivDanId);
}

function deleteDanFromDetay() {
  if (!confirm('Bu hizmet kaydı silinsin mi?')) return;
  state.danismanlik = state.danismanlik.filter(x => x.id !== aktivDanId);
  saveData();
  closeModal('dan-detay-modal');
  renderDanismanlik();
  if (document.getElementById('mt-danismanlik').classList.contains('active')) renderMdDanismanlik();
  updateBadges();
  notify('Hizmet silindi');
}

// Müvekkil kartı danışmanlık sekmesi
function renderMdDanismanlik() {
  const list = state.danismanlik.filter(d => d.muvId === aktivMuvId);
  const el = document.getElementById('mt-danismanlik-content');
  if (!el) return;
  let html = `<div class="section"><div class="section-header"><div class="section-title">Danışmanlık & Diğer Hizmetler</div>
    <button class="btn btn-gold btn-sm" onclick="openDanModal()">+ Yeni Hizmet</button></div>
    <div class="section-body" style="padding:0">`;
  if (!list.length) {
    html += '<div class="empty"><div class="empty-icon">⚖️</div><p>Hizmet kaydı yok</p></div>';
  } else {
    html += `<table><thead><tr><th>Tarih</th><th>Tür</th><th>Konu</th><th>Durum</th><th>Teslim</th><th>Ücret</th><th>Tahsilat</th><th></th></tr></thead><tbody>`;
    list.sort((a, b) => (b.tarih || '').localeCompare(a.tarih || '')).forEach(d => {
      const turRenk = DAN_TUR_RENK[d.tur] || '#7f8c8d';
      const durRenk = DAN_DURUM_RENK[d.durum] || '#7f8c8d';
      html += `<tr style="cursor:pointer" onclick="openDanDetay('${d.id}')">
        <td style="font-size:12px">${fmtD(d.tarih)}</td>
        <td><span style="background:${turRenk}22;color:${turRenk};font-size:11px;padding:2px 7px;border-radius:10px;font-weight:600">${d.tur}</span></td>
        <td style="font-size:12px">${d.konu}</td>
        <td><span style="background:${durRenk}22;color:${durRenk};font-size:11px;padding:2px 7px;border-radius:10px;font-weight:600">${d.durum}</span></td>
        <td style="font-size:12px">${d.teslimTarih ? fmtD(d.teslimTarih) : '—'}</td>
        <td style="font-size:12px;color:var(--green)">${d.ucret ? fmt(d.ucret) : '—'}</td>
        <td style="font-size:12px">${d.ucret ? fmt(d.tahsilEdildi || 0) : '—'}</td>
        <td><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openDanModal('${d.id}')">✏</button></td>
      </tr>`;
    });
    html += '</tbody></table>';
    const top = list.reduce((s, d) => s + (d.ucret || 0), 0);
    const tah = list.reduce((s, d) => s + (d.tahsilEdildi || 0), 0);
    html += `<div style="padding:12px 18px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:20px">
      <span style="font-size:12px;color:var(--text-muted)">Toplam Ücret: <strong style="color:var(--green)">${fmt(top)}</strong></span>
      <span style="font-size:12px;color:var(--text-muted)">Tahsil Edilen: <strong style="color:var(--green)">${fmt(tah)}</strong></span>
      <span style="font-size:12px;color:var(--text-muted)">Bekleyen: <strong style="color:#e74c3c">${fmt(Math.max(0, top - tah))}</strong></span>
    </div>`;
  }
  html += '</div></div>';
  el.innerHTML = html;
}

// Dashboard danışmanlık özeti
function renderDashDanismanlik() {
  const devam = state.danismanlik.filter(d => !['Tamamlandı','İptal'].includes(d.durum));
  return devam.length ? devam.slice(0, 5).map(d => {
    const durRenk = DAN_DURUM_RENK[d.durum] || '#7f8c8d';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
      <div><div style="font-size:12px;font-weight:600">${d.konu}</div>
      <div style="font-size:10px;color:var(--text-muted)">${getMuvAd(d.muvId)} · ${d.tur}</div></div>
      <span style="background:${durRenk}22;color:${durRenk};font-size:11px;padding:2px 7px;border-radius:10px;font-weight:600">${d.durum}</span>
    </div>`;
  }).join('') : '<div class="empty"><div class="empty-icon">⚖️</div><p>Devam eden hizmet yok</p></div>';
}


// ================================================================
// EXCEL - Müvekkil
// ================================================================