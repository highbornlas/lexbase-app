// ================================================================
// EMD HUKUK — İHTARNAME / PROTESTO MODÜLİ
// js/modules/ihtarname.js
// ================================================================

let aktivIhtarId = null;

function renderIhtarname() {
  const filS = document.getElementById('ihtar-s')?.value || '';
  const filTur = document.getElementById('ihtar-ft')?.value || '';
  const filDur = document.getElementById('ihtar-fd')?.value || '';

  let liste = state.ihtarnameler || [];
  if (filS) {
    const q = filS.toLowerCase();
    liste = liste.filter(i =>
      (i.no||'').toLowerCase().includes(q) ||
      getMuvAd(i.muvId).toLowerCase().includes(q) ||
      (i.konu||'').toLowerCase().includes(q) ||
      (i.karsiTaraf||'').toLowerCase().includes(q)
    );
  }
  if (filTur) liste = liste.filter(i => i.tur === filTur);
  if (filDur) liste = liste.filter(i => i.tebligDurum === filDur);

  const cards = document.getElementById('ihtar-cards');
  const toplam = (state.ihtarnameler||[]).length;
  const giden = (state.ihtarnameler||[]).filter(i=>i.yon==='Giden').length;
  const gelen = (state.ihtarnameler||[]).filter(i=>i.yon==='Gelen').length;
  const tebligBekl = (state.ihtarnameler||[]).filter(i=>i.tebligDurum==='Bekliyor').length;
  if (cards) cards.innerHTML = `
    <div class="card"><div class="card-label">Toplam</div><div class="card-value gold">${toplam}</div></div>
    <div class="card"><div class="card-label">Giden</div><div class="card-value" style="color:var(--blue)">${giden}</div></div>
    <div class="card"><div class="card-label">Gelen</div><div class="card-value" style="color:var(--purple)">${gelen}</div></div>
    <div class="card"><div class="card-label">Tebliğ Bekliyor</div><div class="card-value" style="color:#e67e22">${tebligBekl}</div></div>`;

  const tbody = document.getElementById('ihtar-tbody');
  const empty = document.getElementById('ihtar-empty');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!liste.length) { if(empty) empty.style.display='block'; return; }
  if(empty) empty.style.display='none';

  liste.sort((a,b)=>(b.tarih||'').localeCompare(a.tarih||'')).forEach(i => {
    const durRenk = i.tebligDurum==='Tebliğ Edildi'?'var(--green)':i.tebligDurum==='Bila'?'var(--red)':'#e67e22';
    const yonRenk = i.yon==='Giden'?'var(--blue)':'var(--purple)';
    tbody.innerHTML += `<tr onclick="openIhtarDetay('${i.id}')" style="cursor:pointer">
      <td><strong style="color:var(--gold)">${i.no||'—'}</strong></td>
      <td><span style="background:${yonRenk}22;color:${yonRenk};padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">${i.yon}</span></td>
      <td style="font-size:11px">${i.tur||'—'}</td>
      <td>${getMuvAd(i.muvId)}</td>
      <td style="font-size:12px">${i.karsiTaraf||'—'}</td>
      <td style="font-size:11px">${i.noterlik||'—'}</td>
      <td style="font-size:11px">${i.yevmiyeNo||'—'}</td>
      <td>${fmtD(i.tarih)}</td>
      <td><span style="color:${durRenk};font-size:11px;font-weight:600">${i.tebligDurum||'Bekliyor'}</span>${i.tebligTarih?`<div style="font-size:10px;color:var(--text-dim)">${fmtD(i.tebligTarih)}</div>`:''}</td>
      <td><button class="delete-btn" onclick="event.stopPropagation();deleteIhtar('${i.id}')">✕</button></td>
    </tr>`;
  });
}

function openIhtarModal(id) {
  // Müvekkil listesini doldur
  const muvSel = document.getElementById('ihtar-muv');
  muvSel.innerHTML = '<option value="">— Müvekkil seçin —</option>';
  state.muvekkillar.forEach(m => muvSel.innerHTML += `<option value="${m.id}">${m.ad}</option>`);

  // İlgili dosya listesini doldur
  ihtarDosyaDoldur('');

  // Formu temizle
  const fields = ['ihtar-id','ihtar-no','ihtar-konu','ihtar-karsi-taraf','ihtar-noterlik','ihtar-yevmiye','ihtar-icindekiler','ihtar-ilgili-dosya-id'];
  fields.forEach(f => { const el=document.getElementById(f); if(el) el.value=''; });
  document.getElementById('ihtar-tarih').value = today();
  document.getElementById('ihtar-teblig-tarih').value = '';
  document.getElementById('ihtar-yon').value = 'Giden';
  document.getElementById('ihtar-tur').value = 'İhtarname';
  document.getElementById('ihtar-teblig-durum').value = 'Bekliyor';
  document.getElementById('ihtar-ilgili-tur').value = '';
  document.getElementById('ihtar-modal-title').textContent = 'Yeni İhtarname / Protesto';

  if (id) {
    const ih = (state.ihtarnameler||[]).find(x=>x.id===id);
    if (ih) {
      document.getElementById('ihtar-id').value = ih.id;
      document.getElementById('ihtar-no').value = ih.no||'';
      document.getElementById('ihtar-yon').value = ih.yon||'Giden';
      document.getElementById('ihtar-tur').value = ih.tur||'İhtarname';
      muvSel.value = ih.muvId||'';
      document.getElementById('ihtar-karsi-taraf').value = ih.karsiTaraf||'';
      document.getElementById('ihtar-konu').value = ih.konu||'';
      document.getElementById('ihtar-noterlik').value = ih.noterlik||'';
      document.getElementById('ihtar-yevmiye').value = ih.yevmiyeNo||'';
      document.getElementById('ihtar-tarih').value = ih.tarih||today();
      document.getElementById('ihtar-teblig-durum').value = ih.tebligDurum||'Bekliyor';
      document.getElementById('ihtar-teblig-tarih').value = ih.tebligTarih||'';
      document.getElementById('ihtar-icindekiler').value = ih.icindekiler||'';
      document.getElementById('ihtar-ilgili-tur').value = ih.ilgiliTur||'';
      ihtarDosyaDoldur(ih.ilgiliTur||'');
      document.getElementById('ihtar-ilgili-dosya-id').value = ih.ilgiliDosyaId||'';
      document.getElementById('ihtar-modal-title').textContent = 'İhtarname Düzenle';
    }
  } else {
    // Otomatik numara
    document.getElementById('ihtar-no').value = autoNo('ihtarname');
  }

  openModal('ihtar-modal');
}

function ihtarDosyaDoldur(tur) {
  const sel = document.getElementById('ihtar-ilgili-dosya-id');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Dosya seçin (opsiyonel) —</option>';
  if (tur === 'dava') {
    state.davalar.forEach(d => sel.innerHTML += `<option value="${d.id}">${d.no||d.id} — ${d.konu||''}</option>`);
  } else if (tur === 'icra') {
    state.icra.forEach(i => sel.innerHTML += `<option value="${i.id}">${i.no||i.id} — ${i.borclu||''}</option>`);
  }
}

function saveIhtar() {
  const no = document.getElementById('ihtar-no').value.trim();
  const muvId = document.getElementById('ihtar-muv').value;
  const konu = document.getElementById('ihtar-konu').value.trim();

  if (!muvId) { notify('⚠️ Müvekkil seçiniz.'); return; }
  if (!konu) { notify('⚠️ Konu alanı zorunludur.'); return; }

  if (!state.ihtarnameler) state.ihtarnameler = [];

  const id = document.getElementById('ihtar-id').value;
  const veri = {
    yon: document.getElementById('ihtar-yon').value,
    tur: document.getElementById('ihtar-tur').value,
    muvId,
    karsiTaraf: document.getElementById('ihtar-karsi-taraf').value.trim(),
    konu,
    no: no || autoNo('ihtarname'),
    noterlik: document.getElementById('ihtar-noterlik').value.trim(),
    yevmiyeNo: document.getElementById('ihtar-yevmiye').value.trim(),
    tarih: document.getElementById('ihtar-tarih').value,
    tebligDurum: document.getElementById('ihtar-teblig-durum').value,
    tebligTarih: document.getElementById('ihtar-teblig-tarih').value,
    icindekiler: document.getElementById('ihtar-icindekiler').value.trim(),
    ilgiliTur: document.getElementById('ihtar-ilgili-tur').value,
    ilgiliDosyaId: document.getElementById('ihtar-ilgili-dosya-id').value,
  };

  if (id) {
    const idx = state.ihtarnameler.findIndex(x=>x.id===id);
    if (idx >= 0) state.ihtarnameler[idx] = {...state.ihtarnameler[idx], ...veri};
  } else {
    state.ihtarnameler.push({id: uid(), ...veri});
  }

  saveData();
  closeModal('ihtar-modal');
  renderIhtarname();
  notify('✓ İhtarname kaydedildi');
}

function deleteIhtar(id) {
  if (!confirm('Bu ihtarnameyi silmek istediğinize emin misiniz?')) return;
  state.ihtarnameler = (state.ihtarnameler||[]).filter(i=>i.id!==id);
  saveData();
  renderIhtarname();
  notify('İhtarname silindi');
}

function openIhtarDetay(id) {
  const ih = (state.ihtarnameler||[]).find(x=>x.id===id);
  if (!ih) return;
  aktivIhtarId = id;

  const yonRenk = ih.yon==='Giden'?'var(--blue)':'var(--purple)';
  const durRenk = ih.tebligDurum==='Tebliğ Edildi'?'var(--green)':ih.tebligDurum==='Bila'?'var(--red)':'#e67e22';

  let ilgiliDosyaBilgi = '—';
  if (ih.ilgiliTur === 'dava' && ih.ilgiliDosyaId) {
    const d = state.davalar.find(x=>x.id===ih.ilgiliDosyaId);
    if (d) ilgiliDosyaBilgi = `📁 Dava: ${d.no||''} — ${d.konu||''}`;
  } else if (ih.ilgiliTur === 'icra' && ih.ilgiliDosyaId) {
    const i = state.icra.find(x=>x.id===ih.ilgiliDosyaId);
    if (i) ilgiliDosyaBilgi = `⚡ İcra: ${i.no||''} — ${i.borclu||''}`;
  }

  document.getElementById('ihtar-detay-icerik').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
      <div>
        <h2 style="font-family:'Playfair Display',serif;font-size:20px;color:var(--text)">${ih.no||'—'}</h2>
        <div style="margin-top:4px;display:flex;gap:8px;flex-wrap:wrap">
          <span style="background:${yonRenk}22;color:${yonRenk};padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700">${ih.yon}</span>
          <span style="background:var(--surface2);color:var(--text-muted);padding:3px 10px;border-radius:4px;font-size:11px">${ih.tur||'İhtarname'}</span>
          <span style="color:${durRenk};font-size:11px;font-weight:600">● ${ih.tebligDurum||'Bekliyor'}</span>
        </div>
      </div>
      <button class="btn btn-gold" onclick="openIhtarModal('${ih.id}')">✏️ Düzenle</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px">
      ${bilgiKutusu('Müvekkil', getMuvAd(ih.muvId))}
      ${bilgiKutusu('Karşı Taraf', ih.karsiTaraf||'—')}
      ${bilgiKutusu('Noterlik', ih.noterlik||'—')}
      ${bilgiKutusu('Yevmiye No', ih.yevmiyeNo||'—')}
      ${bilgiKutusu('Düzenleme Tarihi', fmtD(ih.tarih))}
      ${bilgiKutusu('Tebliğ Durumu', `<span style="color:${durRenk};font-weight:600">${ih.tebligDurum||'Bekliyor'}</span>`)}
      ${ih.tebligTarih ? bilgiKutusu('Tebliğ Tarihi', fmtD(ih.tebligTarih)) : ''}
      ${bilgiKutusu('İlgili Dosya', ilgiliDosyaBilgi)}
    </div>
    ${ih.konu ? `<div class="section"><div class="section-header"><div class="section-title">Konu</div></div><div class="section-body"><p style="font-size:13px;line-height:1.7">${ih.konu}</p></div></div>` : ''}
    ${ih.icindekiler ? `<div class="section"><div class="section-header"><div class="section-title">İçindekiler / Talepler</div></div><div class="section-body"><p style="font-size:13px;line-height:1.7;white-space:pre-wrap">${ih.icindekiler}</p></div></div>` : ''}
  `;

  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-ihtar-detay').classList.add('active');
}

function bilgiKutusu(label, val) {
  return `<div style="background:var(--surface2);border-radius:var(--radius);padding:12px">
    <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">${label}</div>
    <div style="font-size:13px;font-weight:500">${val}</div>
  </div>`;
}
