// ================================================================
// EMD HUKUK — UYAP VE SÜRE TAKIP
// js/modules/uyap.js
// ================================================================

function saveSure() {
  if (!state.sureler) state.sureler = [];
  const baslangic = document.getElementById('sure-baslangic').value;
  const aciklama = document.getElementById('sure-aciklama').value.trim();
  if (!baslangic || !aciklama) { notify('⚠️ Başlangıç tarihi ve açıklama zorunlu.'); return; }

  const secim = document.getElementById('sure-gun-secim').value;
  const manuel = document.getElementById('sure-gun-manuel').value;
  const gun = secim === '0' ? parseInt(manuel) : parseInt(secim);
  if (!gun || gun <= 0) { notify('⚠️ Geçerli bir süre gün sayısı girin.'); return; }

  const bas = new Date(baslangic);
  const son = new Date(bas); son.setDate(son.getDate() + gun);
  const sonTarih = son.toISOString().slice(0,10);

  const sure = {
    id: uid(),
    tur: document.getElementById('sure-tur').value,
    aciklama,
    baslangic,
    gun,
    sonTarih,
    davaId: document.getElementById('sure-dava-id').value,
    muvId: document.getElementById('sure-muv-id').value,
    oncelik: document.getElementById('sure-oncelik').value,
    durum: 'aktif',
    olusturmaTarih: today(),
    olusturanAd: currentUser?.ad_soyad || '',
  };

  state.sureler.push(sure);

  // Takvime otomatik ekle
  if (document.getElementById('sure-takvim-ekle').checked) {
    const etk = {
      id: uid(),
      baslik: `⏱ ${sure.tur} — ${aciklama}`,
      tarih: sonTarih,
      saat: '09:00',
      tur: 'Son Gün',
      notlar: `Süre başlangıcı: ${fmtD(baslangic)} | ${gun} gün | ${sure.tur}`,
      renk: '#e74c3c',
      davaId: sure.davaId,
      muvId: sure.muvId,
    };
    state.etkinlikler.push(etk);
  }

  saveData();
  closeModal('sure-modal');
  renderSureler();
  updateUyapBadge();
  notify('✅ Süre eklendi ve takvime işlendi');
  addAktiviteLog('Süre Eklendi', `${sure.tur} — Son: ${fmtD(sonTarih)}`, 'UYAP');
}

function renderSureler() {
  if (!state.sureler) state.sureler = [];
  const el = document.getElementById('sure-liste');
  const em = document.getElementById('sure-empty');
  const filtreDurum = document.getElementById('sure-filtre-durum')?.value || '';
  const filtreTur = document.getElementById('sure-filtre-tur')?.value || '';
  const bugun = new Date(); bugun.setHours(0,0,0,0);

  let liste = state.sureler.map(s => {
    const son = new Date(s.sonTarih); son.setHours(0,0,0,0);
    const kalan = Math.ceil((son - bugun) / (1000*60*60*24));
    let durum = s.durum === 'tamam' ? 'tamam' : kalan < 0 ? 'gecti' : kalan <= 3 ? 'kritik' : 'aktif';
    return { ...s, kalan, durumHesap: durum };
  });

  // Filtrele
  if (filtreDurum) liste = liste.filter(s => s.durumHesap === filtreDurum || s.durum === filtreDurum);
  if (filtreTur) liste = liste.filter(s => s.tur === filtreTur);

  // Sırala — en yakın önce
  liste.sort((a, b) => a.kalan - b.kalan);

  // Özet kartları güncelle
  const bugünBiten = state.sureler.filter(s => { const k = Math.ceil((new Date(s.sonTarih) - bugun) / (1000*60*60*24)); return k === 0 && s.durum !== 'tamam'; }).length;
  const uc = state.sureler.filter(s => { const k = Math.ceil((new Date(s.sonTarih) - bugun) / (1000*60*60*24)); return k > 0 && k <= 3 && s.durum !== 'tamam'; }).length;
  const yedi = state.sureler.filter(s => { const k = Math.ceil((new Date(s.sonTarih) - bugun) / (1000*60*60*24)); return k > 3 && k <= 7 && s.durum !== 'tamam'; }).length;
  const tamam = state.sureler.filter(s => s.durum === 'tamam').length;
  document.getElementById('uyap-bugun').textContent = bugünBiten;
  document.getElementById('uyap-3gun').textContent = uc;
  document.getElementById('uyap-7gun').textContent = yedi;
  document.getElementById('uyap-tamam').textContent = tamam;
  document.getElementById('uyap-toplam').textContent = state.sureler.length;

  if (!liste.length) { em.style.display = 'block'; el.innerHTML = ''; return; }
  em.style.display = 'none';

  el.innerHTML = liste.map(s => {
    const durumRenk = { kritik: '#e74c3c', gecti: '#c0392b', aktif: 'var(--green)', tamam: 'var(--text-dim)' };
    const durumLabel = { kritik: '🚨 KRİTİK', gecti: '❌ GEÇT!', aktif: '✅ Aktif', tamam: '☑️ Tamam' };
    const renk = durumRenk[s.durumHesap] || 'var(--text-muted)';
    const dava = s.davaId ? (state.davalar.find(d => 'dava_'+d.id === s.davaId) || state.icra.find(i => 'icra_'+i.id === s.davaId)) : null;
    const kalanText = s.durum === 'tamam' ? 'Tamamlandı' : s.kalan < 0 ? `${Math.abs(s.kalan)} gün geçti` : s.kalan === 0 ? 'BUGÜN!' : `${s.kalan} gün kaldı`;

    return `<div style="background:var(--surface);border:1px solid var(--border);border-left:4px solid ${renk};border-radius:var(--radius);padding:14px 16px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${renk}22;color:${renk};font-weight:700">${durumLabel[s.durumHesap]||s.durumHesap}</span>
            <span style="font-size:11px;color:var(--text-muted);background:var(--surface2);padding:2px 8px;border-radius:20px">${s.tur}</span>
            ${s.oncelik === 'yuksek' ? '<span style="font-size:10px;color:#e74c3c;font-weight:700">● YÜKSEK ÖNCELİK</span>' : ''}
          </div>
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${s.aciklama}</div>
          <div style="font-size:12px;color:var(--text-muted)">
            Başlangıç: ${fmtD(s.baslangic)} | ${s.gun} gün | Son: <strong style="color:${renk}">${fmtD(s.sonTarih)}</strong>
            ${dava ? ` | ${dava.no||dava.id.slice(0,6)}` : ''}
            ${s.muvId ? ` | ${getMuvAd(s.muvId)}` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div style="font-size:18px;font-weight:700;color:${renk}">${kalanText}</div>
          <div style="display:flex;gap:6px">
            ${s.durum !== 'tamam' ? `<button class="btn" style="font-size:11px;padding:3px 10px;background:var(--green-dim);color:var(--green)" onclick="sureTamamla('${s.id}')">✓ Tamam</button>` : ''}
            <button class="btn" style="font-size:11px;padding:3px 10px;background:var(--surface2)" onclick="sureWp('${s.id}')">📱</button>
            <button class="delete-btn" onclick="sureSil('${s.id}')">✕</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function sureTamamla(id) {
  if (!state.sureler) return;
  const s = state.sureler.find(x => x.id === id);
  if (s) { s.durum = 'tamam'; saveData(); renderSureler(); updateUyapBadge(); notify('✅ Süre tamamlandı olarak işaretlendi'); }
}

function sureSil(id) {
  if (!confirm('Bu süreyi silmek istiyor musunuz?')) return;
  state.sureler = (state.sureler||[]).filter(s => s.id !== id);
  saveData(); renderSureler(); updateUyapBadge(); notify('Süre silindi');
}

function sureWp(id) {
  const s = (state.sureler||[]).find(x => x.id === id);
  if (!s) return;
  const muv = state.muvekkillar.find(m => m.id === s.muvId);
  const tel = muv?.tel?.replace(/\D/g,'').replace(/^0/,'') || '';
  const mesaj = `Sayın ${muv?.ad||'Müvekkil'},\n\n${s.tur} süreniz ${fmtD(s.sonTarih)} tarihinde sona ermektedir.\n${s.kalan > 0 ? s.kalan + ' gün kaldı.' : 'Bugün son gün!'}\n\nKonu: ${s.aciklama}\n\nSaygılarımla,\n${currentUser?.ad_soyad||'Avukatlık Bürosu'}`;
  openWpModal(tel, mesaj);
}

function updateUyapBadge() {
  if (!state.sureler) return;
  const bugun = new Date(); bugun.setHours(0,0,0,0);
  const acil = state.sureler.filter(s => {
    if (s.durum === 'tamam') return false;
    const kalan = Math.ceil((new Date(s.sonTarih) - bugun) / (1000*60*60*24));
    return kalan <= 7;
  }).length;
  const badge = document.getElementById('nb-uyap');
  if (badge) { badge.textContent = acil; badge.style.display = acil > 0 ? '' : 'none'; }
}

// ── Duruşma Listesi Aktarma ───────────────────────────────────────
function openDurusmaCekModal() {
  const davaSel = document.getElementById('dc-dava-id');
  const muvSel = document.getElementById('dc-muv-id');
  davaSel.innerHTML = '<option value="">— Seçin —</option>';
  muvSel.innerHTML = '<option value="">— Seçin —</option>';
  state.davalar.forEach(d => davaSel.innerHTML += `<option value="${d.id}">📁 ${d.no||''} — ${d.konu||''}</option>`);
  state.muvekkillar.forEach(m => muvSel.innerHTML += `<option value="${m.id}">${m.ad}</option>`);
  document.getElementById('dc-metin').value = '';
  document.getElementById('dc-onizleme').style.display = 'none';
  document.getElementById('dc-aktar-btn').style.display = 'none';
  openModal('durusma-cek-modal');
}

let _dcAktarilacak = [];

function dcOnizle() {
  const metin = document.getElementById('dc-metin').value.trim();
  if (!metin) { notify('⚠️ Metin girin.'); return; }

  // Tarih pattern — DD.MM.YYYY veya YYYY-MM-DD formatlarını yakala
  const satirlar = metin.split('\n').filter(s => s.trim());
  _dcAktarilacak = [];

  satirlar.forEach(satir => {
    // DD.MM.YYYY HH:MM veya DD/MM/YYYY formatı
    const m1 = satir.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\s*(?:saat\s*)?(\d{1,2}):?(\d{2})?/i);
    if (m1) {
      const gun = m1[1].padStart(2,'0'), ay = m1[2].padStart(2,'0'), yil = m1[3];
      const saat = m1[4] ? m1[4].padStart(2,'0') + ':' + (m1[5]||'00') : '09:00';
      const tarih = `${yil}-${ay}-${gun}`;
      // Açıklama — tarihten sonraki metin
      const aciklamaMatch = satir.replace(m1[0], '').trim().replace(/^[-—:]+\s*/, '');
      _dcAktarilacak.push({ tarih, saat, baslik: aciklamaMatch || 'Duruşma', orijinal: satir.trim() });
    }
  });

  const onizEl = document.getElementById('dc-onizleme');
  if (!_dcAktarilacak.length) {
    onizEl.style.display = 'block';
    onizEl.innerHTML = '<div style="background:var(--red-dim);border:1px solid var(--red);border-radius:var(--radius);padding:10px;font-size:12px;color:var(--red)">⚠️ Tarih bulunamadı. DD.MM.YYYY formatında tarihler içerdiğinden emin olun.</div>';
    document.getElementById('dc-aktar-btn').style.display = 'none';
    return;
  }

  onizEl.style.display = 'block';
  onizEl.innerHTML = `<div style="background:var(--surface2);border-radius:var(--radius);padding:12px;margin-bottom:8px;font-size:12px">
    <div style="font-weight:700;color:var(--gold);margin-bottom:8px">✅ ${_dcAktarilacak.length} duruşma bulundu:</div>
    ${_dcAktarilacak.map(d => `<div style="padding:4px 0;border-bottom:1px solid var(--border)">📅 <strong>${fmtD(d.tarih)}</strong> ${d.saat} — ${d.baslik}</div>`).join('')}
  </div>`;
  document.getElementById('dc-aktar-btn').style.display = '';
  notify(`${_dcAktarilacak.length} duruşma analiz edildi`);
}

function dcAktar() {
  if (!_dcAktarilacak.length) return;
  const davaId = document.getElementById('dc-dava-id').value;
  const muvId = document.getElementById('dc-muv-id').value;
  let eklenen = 0;

  _dcAktarilacak.forEach(d => {
    const etk = {
      id: uid(), baslik: `⚖️ ${d.baslik}`, tarih: d.tarih, saat: d.saat,
      tur: 'Duruşma', notlar: `UYAP'tan aktarıldı: ${d.orijinal}`,
      renk: '#2980b9', davaId, muvId,
    };
    state.etkinlikler.push(etk);
    eklenen++;
  });

  saveData(); closeModal('durusma-cek-modal');
  renderCalendar(); notify(`✅ ${eklenen} duruşma takvime eklendi`);
  addAktiviteLog('Duruşma Aktarıldı', `${eklenen} duruşma UYAP'tan aktarıldı`, 'UYAP');
  _dcAktarilacak = [];
}

function renderDurusmalar() {
  const el = document.getElementById('durusma-listesi');
  const em = document.getElementById('durusma-empty');
  if (!el) return;

  const filtreAy = document.getElementById('durusma-filtre-ay')?.value || '';
  const filtreMuv = document.getElementById('durusma-filtre-muv')?.value || '';

  // Müvekkil select doldur
  const muvSel = document.getElementById('durusma-filtre-muv');
  if (muvSel && muvSel.options.length <= 1) {
    state.muvekkillar.forEach(m => muvSel.innerHTML += `<option value="${m.id}">${m.ad}</option>`);
  }

  let durusmalar = state.etkinlikler.filter(e => e.tur === 'Duruşma');
  if (filtreAy) durusmalar = durusmalar.filter(e => e.tarih?.startsWith(filtreAy));
  if (filtreMuv) durusmalar = durusmalar.filter(e => e.muvId === filtreMuv);
  durusmalar.sort((a, b) => (a.tarih||'').localeCompare(b.tarih||''));

  const bugun = today();
  if (!durusmalar.length) { em.style.display = 'block'; el.innerHTML = ''; return; }
  em.style.display = 'none';

  el.innerHTML = durusmalar.map(d => {
    const gecmis = d.tarih < bugun;
    const bugunMu = d.tarih === bugun;
    return `<div style="background:var(--surface);border:1px solid var(--border);border-left:4px solid ${bugunMu?'var(--red)':gecmis?'var(--border)':'var(--blue)'};border-radius:var(--radius);padding:12px 16px;margin-bottom:8px;opacity:${gecmis?'.6':'1'}">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-weight:600;font-size:14px">${d.baslik}</div>
          <div style="font-size:12px;color:var(--text-muted)">
            📅 ${fmtD(d.tarih)} ${d.saat ? '| ⏰ '+d.saat : ''}
            ${d.muvId ? '| 👤 '+getMuvAd(d.muvId) : ''}
            ${bugunMu ? '<span style="color:var(--red);font-weight:700"> | BUGÜN!</span>' : ''}
          </div>
          ${d.notlar ? `<div style="font-size:11px;color:var(--text-dim);margin-top:3px">${d.notlar}</div>` : ''}
        </div>
        <button class="btn" style="font-size:11px;padding:3px 10px;background:#25D366;color:#fff;border-color:#25D366" onclick="openWpDurusmaModal('${d.id}')">📱 Hatırlat</button>
      </div>
    </div>`;
  }).join('');
}

function openWpDurusmaModal(etkId) {
  const etk = state.etkinlikler.find(e => e.id === etkId);
  if (!etk) return;
  const muv = state.muvekkillar.find(m => m.id === etk.muvId);
  const tel = muv?.tel?.replace(/\D/g,'').replace(/^0/,'') || '';
  const mesaj = wpSablonlar.durusma(muv?.ad||'Müvekkil', { tarih: fmtD(etk.tarih), saat: etk.saat||'', yer: 'Mahkeme' });
  openWpModal(tel, mesaj);
}

// ── Zamanaşımı ───────────────────────────────────────────────────
function renderZamanasimi() {
  const el = document.getElementById('zamanasimi-liste');
  const em = document.getElementById('zamanasimi-empty');
  if (!el) return;

  const bugun = new Date(); bugun.setHours(0,0,0,0);

  // Tüm davalara göre zamanaşımı hesapla + manuel eklenenler
  let html = '';

  // Hesap tablosu
  html += `<div style="font-size:13px;font-weight:700;color:var(--gold);margin-bottom:12px">⌛ Yasal Zamanaşımı Süreleri Tablosu</div>`;
  html += `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:20px">
    <table><thead><tr><th>Dava / Alacak Türü</th><th>Süre</th><th>Kanun</th></tr></thead><tbody>`;
  Object.entries(ZAMANASIMI).forEach(([tur, bilgi]) => {
    const sure = bilgi.yil ? `${bilgi.yil} Yıl` : `${bilgi.gun} Gün`;
    html += `<tr><td>${tur}</td><td style="font-weight:600;color:var(--gold)">${sure}</td><td style="font-size:11px;color:var(--text-muted)">${bilgi.kanun}</td></tr>`;
  });
  html += '</tbody></table></div>';

  // Mevcut davalar üzerinden zamanaşımı takibi
  html += `<div style="font-size:13px;font-weight:700;color:var(--gold);margin-bottom:12px">📁 Aktif Dava Zamanaşımı Takibi</div>`;

  const davaSureleri = (state.sureler||[]).filter(s => s.tur === 'Zamanaşımı');
  if (!davaSureleri.length) {
    html += `<div style="background:var(--surface2);border-radius:var(--radius);padding:16px;font-size:13px;color:var(--text-muted);text-align:center">
      Zamanaşımı takibi için "Süre Ekle" butonundan tür olarak "Zamanaşımı" seçin.<br>
      <button class="btn btn-gold" onclick="openSureModalZamanasimi()" style="margin-top:10px;touch-action:manipulation">+ Zamanaşımı Ekle</button>
    </div>`;
  } else {
    davaSureleri.forEach(s => {
      const son = new Date(s.sonTarih); son.setHours(0,0,0,0);
      const kalan = Math.ceil((son - bugun) / (1000*60*60*24));
      const renk = kalan < 0 ? 'var(--red)' : kalan < 180 ? '#f39c12' : 'var(--green)';
      html += `<div style="background:var(--surface);border:1px solid var(--border);border-left:4px solid ${renk};border-radius:var(--radius);padding:14px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div style="font-weight:600;font-size:14px">${s.aciklama}</div>
            <div style="font-size:12px;color:var(--text-muted)">Başlangıç: ${fmtD(s.baslangic)} | Son: ${fmtD(s.sonTarih)} ${s.muvId?'| '+getMuvAd(s.muvId):''}</div>
          </div>
          <div style="font-size:15px;font-weight:700;color:${renk}">${kalan<0?'❌ DOLDU':kalan<180?`⚠️ ${kalan} gün`:`${kalan} gün`}</div>
        </div>
      </div>`;
    });
  }

  el.innerHTML = html;
  em.style.display = 'none';
}

function openSureModalZamanasimi() {
  openSureModal();
  setTimeout(() => { document.getElementById('sure-tur').value = 'Zamanaşımı'; sureTurDegisti(); }, 100);
}

// ── UYAP Sorgu Linkleri ──────────────────────────────────────────
function uyapPortalAc() {
  window.open('https://vatandas.uyap.gov.tr', '_blank');
}

function uyapAvukatPortalAc() {
  window.open('https://avukat.uyap.gov.tr', '_blank');
}

function uetsTebligatAc() {
  window.open('https://uets.ptt.gov.tr', '_blank');
}

function uyapMevzuatAc() {
  window.open('https://www.mevzuat.gov.tr', '_blank');
}

function openUyapSorguModal() {
  uyapTab('sorgula', document.getElementById('ut-sorgula'));
}

// showPage'e UYAP ekle
function renderUyapSayfa() {
  if (!state.sureler) state.sureler = [];
  renderSureler();
  updateUyapBadge();
}


// WhatsApp şablonları
const wpSablonlar = {
  durusma: (muv, ekstra) => `Sayın ${muv},\n\nBilginize sunmak isterim ki ${ekstra?.tarih||'[TARİH]'} tarihinde saat ${ekstra?.saat||'[SAAT]'} itibarıyla ${ekstra?.yer||'[YER]'} nezdinde duruşmanız bulunmaktadır.\n\nDuruşmada hazır bulunmanızı/vekaletnamenizin mevcut olduğunu hatırlatmak isterim.\n\nSaygılarımla,\n${currentUser?.ad_soyad||'Avukatlık Bürosu'}`,
  tahsilat: (muv, ekstra) => `Sayın ${muv},\n\n${ekstra?.tutar||'[TUTAR]'} tutarındaki avukatlık ücretinin ödeme vadesi ${ekstra?.tarih||'[TARİH]'} tarihinde dolmaktadır.\n\nÖdemenizi aşağıdaki hesap bilgilerine yapabilirsiniz:\n[BANKA HESAP BİLGİLERİ]\n\nSorularınız için iletişime geçebilirsiniz.\n\nSaygılarımla,\n${currentUser?.ad_soyad||'Avukatlık Bürosu'}`,
  fatura: (muv, ekstra) => `Sayın ${muv},\n\n${ekstra?.no||'[FATURA NO]'} numaralı ${ekstra?.tutar||''} tutarındaki faturanız düzenlenmiştir.\n\nFatura detayları için lütfen tarafımızla iletişime geçin.\n\nSaygılarımla,\n${currentUser?.ad_soyad||'Avukatlık Bürosu'}`,
  evrak: (muv) => `Sayın ${muv},\n\nDosyanıza ait evraklarınız hazırlanmış olup büromuzdan teslim alabilirsiniz.\n\nÇalışma saatlerimiz: Pazartesi - Cuma, 09:00 - 18:00\n\nSaygılarımla,\n${currentUser?.ad_soyad||'Avukatlık Bürosu'}`,
  sonuc: (muv, ekstra) => `Sayın ${muv},\n\nDavanız hakkında bilgilendirmek istiyorum: ${ekstra?.sonuc||'[SONUÇ BİLGİSİ]'}\n\nDetaylı bilgi için lütfen büromuzu arayın.\n\nSaygılarımla,\n${currentUser?.ad_soyad||'Avukatlık Bürosu'}`,
  randevu: (muv, ekstra) => `Sayın ${muv},\n\n${ekstra?.tarih||'[TARİH]'} tarihinde saat ${ekstra?.saat||'[SAAT]'} itibarıyla büromuzda randevunuz bulunmaktadır.\n\nRandevunuzu ${ekstra?.tarih||'bir gün öncesinde'} iptal etmeniz gerekirse lütfen bildiriniz.\n\nSaygılarımla,\n${currentUser?.ad_soyad||'Avukatlık Bürosu'}`,
};

function openWpModal(telefon, mesaj) {
  document.getElementById('wp-telefon').value = telefon || '';
  document.getElementById('wp-mesaj').value = mesaj || '';
  document.getElementById('wp-sablon').value = '';
  wpKarakterSay();
  openModal('wp-modal');
}

function openWpMuvekkilModal(muvId) {
  const muv = state.muvekkillar.find(m => m.id === muvId);
  const tel = muv?.tel?.replace(/\D/g,'').replace(/^0/,'') || '';
  openWpModal(tel, '');
}

function openWpFaturaModal(fatId) {
  const f = (state.faturalar||[]).find(x => x.id === fatId);
  if (!f) return;
  const muv = state.muvekkillar.find(m => m.id === f.muvId);
  const tel = muv?.tel?.replace(/\D/g,'').replace(/^0/,'') || '';
  const mesaj = wpSablonlar.fatura(muv?.ad||'', { no: f.no, tutar: fmt(f.genelToplam) });
  openWpModal(tel, mesaj);
}

function wpSablonUygula() {
  const sablon = document.getElementById('wp-sablon').value;
  if (!sablon) return;
  const fn = wpSablonlar[sablon];
  if (!fn) return;
  const mesaj = fn('Sayın Müvekkil', {});
  document.getElementById('wp-mesaj').value = mesaj;
  wpKarakterSay();
}

function wpKarakterSay() {
  const mesaj = document.getElementById('wp-mesaj').value;
  document.getElementById('wp-karakter').textContent = mesaj.length;
}

// Karakter sayacı için event listener
document.addEventListener('DOMContentLoaded', function() {
  const wpMesaj = document.getElementById('wp-mesaj');
  if (wpMesaj) wpMesaj.addEventListener('input', wpKarakterSay);
});

function wpGonder() {
  const telefon = document.getElementById('wp-telefon').value.replace(/\D/g,'');
  const kod = document.getElementById('wp-telefon-kodu').value;
  const mesaj = document.getElementById('wp-mesaj').value.trim();
  if (!telefon) { notify('⚠️ Telefon numarası giriniz.'); return; }
  if (!mesaj) { notify('⚠️ Mesaj giriniz.'); return; }
  const tamTelefon = kod + telefon;
  const url = `https://wa.me/${tamTelefon}?text=${encodeURIComponent(mesaj)}`;
  window.open(url, '_blank');
  addAktiviteLog('WhatsApp Gönderildi', `+${tamTelefon}`, 'Genel');
  closeModal('wp-modal');
}

function wpKopyala() {
  const mesaj = document.getElementById('wp-mesaj').value;
  navigator.clipboard?.writeText(mesaj).then(() => notify('📋 Mesaj kopyalandı')).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = mesaj; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    notify('📋 Mesaj kopyalandı');
  });
}

// WhatsApp butonu nav'a ekle — tüm sayfalarda erişilebilir
function openWpHizliModal() { openWpModal('', ''); }


// ================================================================
// ETKİNLİKLER / TAKVİM
// ================================================================
let takModalEditId=null;

function populateTakMuvSelect(){
  const sel=document.getElementById('t-muv');
  const cur=sel.value;
  sel.innerHTML='<option value="">— Müvekkil seçin —</option>';
  state.muvekkillar.forEach(m=>{sel.innerHTML+='<option value="'+m.id+'">'+m.ad+'</option>';});
  if(cur)sel.value=cur;
}

function populateTakDavSelect(muvId){
  const sel=document.getElementById('t-dav-sel');
  sel.innerHTML='<option value="">— Dosya bağlama —</option>';
  if(!muvId)return;
  state.davalar.filter(d=>d.muvId===muvId).forEach(d=>{
    sel.innerHTML+='<option value="'+d.no+'">📁 '+d.no+' — '+d.konu+'</option>';
  });
  state.icra.filter(i=>i.muvId===muvId).forEach(i=>{
    sel.innerHTML+='<option value="'+i.no+'">⚡ '+i.no+' — '+i.borclu+'</option>';
  });
}

function openTakModal(editId, prefillDate){
  takModalEditId=editId||null;
  document.getElementById('tak-modal-title').textContent=editId?'Etkinlik Düzenle':'Etkinlik Ekle';
  document.getElementById('tak-kaydet-btn').textContent=editId?'Güncelle':'Kaydet';
  document.getElementById('tak-sil-btn').style.display=editId?'inline-flex':'none';
  populateTakMuvSelect();
  if(editId){
    const e=state.etkinlikler.find(x=>x.id===editId);if(!e)return;
    document.getElementById('t-baslik').value=e.baslik||'';
    document.getElementById('t-tur').value=e.tur||'Diğer';
    document.getElementById('t-tarih').value=e.tarih||'';
    document.getElementById('t-saat').value=e.saat||'09:00';
    document.getElementById('t-muv').value=e.muvId||'';
    document.getElementById('t-not').value=e.not||'';
    document.getElementById('t-yer').value=e.yer||'';
    document.getElementById('t-hatirlatma').value=e.hatirlatma||'';
    populateTakDavSelect(e.muvId);
    document.getElementById('t-dav-sel').value=e.davNo||'';
  } else {
    ['t-baslik','t-not','t-yer'].forEach(i=>{const el=document.getElementById(i);if(el)el.value='';});
    document.getElementById('t-saat').value='09:00';
    document.getElementById('t-hatirlatma').value='';
    document.getElementById('t-tarih').value=prefillDate||today();
    // Müvekkil detay sayfasındaysak ön seçili yap
    if(aktivMuvId){
      document.getElementById('t-muv').value=aktivMuvId;
      populateTakDavSelect(aktivMuvId);
    }
  }
  document.getElementById('tak-modal').classList.add('open');
}

function saveEtkinlik(){
  const baslik=document.getElementById('t-baslik').value.trim(),tarih=document.getElementById('t-tarih').value;
  if(!zorunluKontrol([{id:'etk-baslik',deger:baslik,label:'Başlık'},{id:'etk-tarih',deger:tarih,label:'Tarih'}])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  const muvId=document.getElementById('t-muv').value;
  const veri={baslik,tarih,saat:document.getElementById('t-saat').value,
    tur:document.getElementById('t-tur').value,muvId,
    davNo:document.getElementById('t-dav-sel').value,
    not:document.getElementById('t-not').value.trim(),
    yer:document.getElementById('t-yer').value.trim(),
    hatirlatma:document.getElementById('t-hatirlatma').value};
  var kayit;
  if(takModalEditId){
    const e=state.etkinlikler.find(x=>x.id===takModalEditId);
    if(e){ kayit=Object.assign({},e,veri); } else return;
  } else {
    kayit={id:uid(),...veri};
  }
  if (typeof LexSubmit !== 'undefined') {
    var eBtn=document.querySelector('#tak-modal .btn-gold');
    LexSubmit.formKaydet({tablo:'etkinlikler', kayit:kayit, modalId:'tak-modal', butonEl:eBtn,
      basariMesaj:takModalEditId?'✓ Güncellendi':'✓ Etkinlik eklendi',
      renderFn:function(){
        renderCalendar();updateBadges();renderDashboard();
        var planEl2=document.getElementById('mt-planlama-content');
        if(planEl2&&planEl2.innerHTML)renderMdPlanlama();
        takModalEditId=null;
      }
    });
  } else {
    if(takModalEditId){const e2=state.etkinlikler.find(x=>x.id===takModalEditId);if(e2)Object.assign(e2,veri);}
    else state.etkinlikler.push(kayit);
    closeModal('tak-modal');saveData();renderCalendar();updateBadges();
    var planEl=document.getElementById('mt-planlama-content');
    if(planEl&&planEl.innerHTML)renderMdPlanlama();
    notify(takModalEditId?'✓ Güncellendi':'✓ Etkinlik eklendi');takModalEditId=null;
  }
}

async function delEtkinlik(id){
  if (typeof LexSubmit !== 'undefined') {
    await LexSubmit.formSil({tablo:'etkinlikler', id:id, basariMesaj:'Silindi',
      renderFn:function(){ renderCalendar();updateBadges();renderDashboard();
        var p=document.getElementById('mt-planlama-content');if(p&&p.innerHTML)renderMdPlanlama(); }
    });
  } else {
    state.etkinlikler=state.etkinlikler.filter(e=>e.id!==id);
    saveData();renderCalendar();updateBadges();notify('Silindi');
  }
}

// ================================================================
// MÜVEKKİL PLANLAMA SEKMESİ
// ================================================================
function renderMdPlanlama(){
  const muvId=aktivMuvId;
  const etkinlikler=state.etkinlikler.filter(e=>e.muvId===muvId).sort((a,b)=>a.tarih.localeCompare(b.tarih));
  const bugun=today();
  const gelecek=etkinlikler.filter(e=>e.tarih>=bugun);
  const gecmis=etkinlikler.filter(e=>e.tarih<bugun).reverse();

  const turRenk={'Duruşma':'var(--blue)','Son Gün':'#e74c3c','Müvekkil Görüşmesi':'var(--gold)',
    'Toplantı':'var(--green)','Keşif':'#9b59b6','Bilirkişi':'#e67e22',
    'Arabuluculuk':'#1abc9c','Uzlaşma':'#27ae60','Diğer':'var(--text-muted)'};
  const turIcon={'Duruşma':'⚖️','Son Gün':'⏰','Müvekkil Görüşmesi':'🤝','Toplantı':'💼',
    'Keşif':'🔍','Bilirkişi':'👨‍💼','Arabuluculuk':'🕊️','Uzlaşma':'🤲','Diğer':'📅'};

  function etkinlikKart(e){
    const renk=turRenk[e.tur]||'var(--text-muted)';
    const ikon=turIcon[e.tur]||'📅';
    const gecmisStyle=e.tarih<bugun?'opacity:0.65':'';
    return '<div style="background:var(--surface2);border:1px solid var(--border);border-left:4px solid '+renk+';border-radius:var(--radius);padding:14px 16px;margin-bottom:10px;'+gecmisStyle+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
      +'<div style="flex:1">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
      +'<span style="font-size:16px">'+ikon+'</span>'
      +'<span style="font-size:13px;font-weight:700">'+e.baslik+'</span>'
      +'<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:'+renk+'22;color:'+renk+'">'+e.tur+'</span>'
      +'</div>'
      +'<div style="display:flex;gap:16px;font-size:11px;color:var(--text-muted);flex-wrap:wrap">'
      +'<span>📅 '+fmtD(e.tarih)+(e.saat?' · '+e.saat:'')+'</span>'
      +(e.davNo?'<span>📁 '+e.davNo+'</span>':'')
      +(e.yer?'<span>📍 '+e.yer+'</span>':'')
      +'</div>'
      +(e.not?'<div style="margin-top:8px;font-size:12px;color:var(--text);line-height:1.5;white-space:pre-wrap">'+e.not+'</div>':'')
      +'</div>'
      +'<button class="btn btn-outline btn-sm" onclick="openTakModal(&quot;'+e.id+'&quot;)">✏</button>'
      +'</div></div>';
  }

  let html='';

  // Gelecek etkinlikler
  html+='<div class="section"><div class="section-header">'
    +'<div class="section-title">📅 Planlanan Etkinlikler <span style="font-size:11px;font-weight:400;color:var(--text-dim)">'+gelecek.length+' etkinlik</span></div>'
    +'<button class="btn btn-gold btn-sm" onclick="openTakModal()">+ Yeni Ekle</button>'
    +'</div><div style="padding:14px">';

  if(!gelecek.length){
    html+='<div class="empty" style="padding:32px"><div class="empty-icon">📅</div>'
      +'<p>Planlanmış etkinlik yok</p>'
      +'<button class="btn btn-gold btn-sm" style="margin-top:10px" onclick="openTakModal()">+ Etkinlik Ekle</button></div>';
  } else {
    // Yaklaşan etkinlikleri önce göster
    const yaklasan=gelecek.filter(e=>{
      const g=Math.floor((new Date(e.tarih)-new Date(bugun))/86400000);
      return g<=7;
    });
    if(yaklasan.length){
      html+='<div style="background:rgba(230,126,34,.1);border:1px solid rgba(230,126,34,.3);border-radius:var(--radius);padding:8px 12px;margin-bottom:12px;font-size:11px;color:#e67e22;font-weight:600">⏰ '+yaklasan.length+' etkinlik bu hafta içinde</div>';
    }
    gelecek.forEach(e=>{ html+=etkinlikKart(e); });
  }
  html+='</div></div>';

  // Geçmiş etkinlikler
  if(gecmis.length){
    html+='<div class="section"><div class="section-header">'
      +'<div class="section-title" style="color:var(--text-muted)">📋 Geçmiş Etkinlikler ('+gecmis.length+')</div>'
      +'<button class="btn btn-outline btn-sm" id="gecmis-tog" onclick="var b=document.getElementById(\'gecmis-etk-list\');b.style.display=b.style.display===\'none\'?\'block\':\'none\';this.textContent=this.textContent===\'Göster\'?\'Gizle\':\'Göster\'">Göster</button>'
      +'</div>'
      +'<div id="gecmis-etk-list" style="display:none;padding:14px">';
    gecmis.forEach(function(e){ html+=etkinlikKart(e); });
    html+='</div></div>';
  }

  document.getElementById('mt-planlama-content').innerHTML=html;
}

function delEtkinlikEdit(){
  if(!takModalEditId)return;
  if(!confirm('Bu etkinliği silmek istediğinize emin misiniz?'))return;
  delEtkinlik(takModalEditId);
  closeModal('tak-modal');takModalEditId=null;
}

let calY,calM;
const DTR=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'],MTR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];