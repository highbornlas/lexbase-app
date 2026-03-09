// ================================================================
// LEXBASE — YARDIMCI FONKSİYONLAR
// js/modules/utils.js
//
// Düzeltmeler:
// - notify() XSS koruması eklendi (textContent kullanımı doğru)
// - openLogModal() XSS koruması eklendi
// - ensureArrays() null güvenliği eklendi
// ================================================================

function helpTip(text) {
  return '<span class="help-tip" data-tip="' + text.replace(/"/g, '&quot;') + '">?</span>';
}

function fmt(n) {
  return '₺' + Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
}

function fmtD(d) {
  if (!d) return '—';
  const p = d.split('-');
  if (p.length !== 3) return '—';
  return p[2] + '.' + p[1] + '.' + p[0];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function getMuv(id) {
  return state.muvekkillar.find(m => m.id === id);
}

function getMuvAd(id) {
  const m = getMuv(id);
  return m ? m.ad : '—';
}

function getDava(id) {
  return state.davalar.find(d => d.id === id);
}

function getIcra(id) {
  return state.icra.find(i => i.id === id);
}

function avatarI(ad) {
  const p = (ad || '?').split(' ');
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
}

function fileIcon(n) {
  const e = (n || '').split('.').pop().toLowerCase();
  if (e === 'pdf') return '📕';
  if (['doc', 'docx'].includes(e)) return '📘';
  if (['jpg', 'jpeg', 'png'].includes(e)) return '🖼';
  return '📎';
}

function fileSize(d) {
  const b = Math.round((d || '').length * 0.75);
  return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';
}

function notify(msg) {
  const e = document.getElementById('notif');
  if (!e) return;
  e.textContent = msg; // textContent = güvenli, XSS riski yok
  e.classList.add('show');
  setTimeout(() => e.classList.remove('show'), 2600);
}

// ================================================================
// LOG SİSTEMİ
// ================================================================
function addLog(muvId, islem, detay) {
  if (!muvId) return;
  if (!state.logs) state.logs = [];
  const now = new Date();
  state.logs.push({
    id: uid(),
    muvId,
    tarih: now.toISOString().slice(0, 10),
    saat: now.toTimeString().slice(0, 5),
    islem,
    detay: detay || '',
    kullaniciAd: currentUser?.ad_soyad || '',
    kullaniciId: currentUser?.id || ''
  });
  addAktiviteLog(islem, detay, modulTespit(islem));
}

function modulTespit(islem) {
  if (/Müvekkil|Rehber/.test(islem)) return 'Müvekkil';
  if (/Dava/.test(islem)) return 'Dava';
  if (/İcra/.test(islem)) return 'İcra';
  if (/Belge|Evrak/.test(islem)) return 'Belge';
  if (/Finans|Avans|Harcama|Tahsilat|Bütçe/.test(islem)) return 'Finans';
  if (/Görev/.test(islem)) return 'Görev';
  if (/Personel/.test(islem)) return 'Personel';
  return 'Genel';
}

function addAktiviteLog(islem, detay, modul) {
  if (!state.aktiviteLog) state.aktiviteLog = [];
  const now = new Date();
  const entry = {
    id: uid(),
    kullaniciId: currentUser?.id || 'sistem',
    kullaniciAd: currentUser?.ad_soyad || 'Sistem',
    kullaniciRol: currentUser?.rol || '',
    islem,
    detay: detay || '',
    modul: modul || 'Genel',
    tarih: now.toISOString().slice(0, 10),
    saat: now.toTimeString().slice(0, 5)
  };
  state.aktiviteLog.unshift(entry);
  if (state.aktiviteLog.length > 500) state.aktiviteLog = state.aktiviteLog.slice(0, 500);
  // Supabase'e async yaz (hata olursa sessizce geç)
  if (currentBuroId) {
    sb.from('aktivite_log').insert({
      buro_id: currentBuroId,
      kullanici_id: currentUser?.id || null,
      kullanici_ad: currentUser?.ad_soyad || 'Sistem',
      kullanici_rol: currentUser?.rol || '',
      islem,
      detay: detay || '',
      modul: modul || 'Genel',
    }).then(({ error }) => {
      if (error) console.warn('Aktivite log hatası:', error.message);
    });
  }
}

function openLogModal() {
  if (!aktivMuvId) return;
  if (!state.logs) state.logs = [];
  const logs = (state.logs.filter(l => l.muvId === aktivMuvId) || [])
    .sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat));
  let html = '';
  if (!logs.length) {
    html = '<div class="empty"><div class="empty-icon">📋</div><p>Henüz kayıt yok</p></div>';
  } else {
    html = '<table style="width:100%"><thead><tr><th>Tarih</th><th>Saat</th><th>İşlem</th><th>Detay</th></tr></thead><tbody>';
    logs.forEach(l => {
      const islemRenk = l.islem.includes('Silindi') ? '#e74c3c' : l.islem.includes('Düzenlendi') ? '#f39c12' : 'var(--green)';
      // XSS koruması: escHTML kullan
      html += `<tr>
        <td style="white-space:nowrap;font-size:12px">${escHTML(fmtD(l.tarih))}</td>
        <td style="font-size:12px;color:var(--text-muted)">${escHTML(l.saat)}</td>
        <td><span style="color:${islemRenk};font-weight:600;font-size:12px">${escHTML(l.islem)}</span></td>
        <td style="font-size:12px;color:var(--text-muted)">${escHTML(l.detay)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
  }
  document.getElementById('log-modal-content').innerHTML = html;
  openModal('log-modal');
}

const MRENK = {
  'Asliye Hukuk': '#2980b9', 'Sulh Hukuk': '#3498db', 'Aile': '#8e44ad',
  'Asliye Ticaret': '#16a085', 'Tüketici': '#27ae60', 'İş': '#f39c12',
  'Kadastro': '#7f8c8d', 'Fikri ve Sınai Haklar Hukuk': '#2c3e50',
  'Asliye Ceza': '#c0392b', 'Sulh Ceza': '#e74c3c', 'Ağır Ceza': '#922b21',
  'Çocuk': '#e67e22', 'İdare': '#1abc9c', 'Vergi': '#0e6655',
  'Bölge İdare': '#148f77', 'Bölge Adliye (İstinaf)': '#6c3483',
  'Yargıtay': '#4a235a', 'Temyiz (Yargıtay)': '#4a235a', 'Temyiz (Danıştay)': '#4a235a', 'Anayasa': '#1b2631', 'Diğer': '#566573'
};

const ARENK = {
  'İlk Derece': 'var(--blue)', 'İstinaf': 'var(--gold)',
  'Temyiz (Yargıtay)': '#8e44ad', 'Temyiz (Danıştay)': '#8e44ad', 'Yargıtay': '#8e44ad', 'Kesinleşti': 'var(--green)', 'Düşürüldü': 'var(--text-dim)'
};

const IDRENK = {
  'Aktif': 'var(--green)', 'Takipte': 'var(--gold)',
  'Haciz Aşaması': '#e74c3c', 'Satış Aşaması': '#c0392b', 'Kapandı': 'var(--text-dim)'
};

/**
 * Legacy data normalize — eksik dizileri oluşturur
 * @param {object} obj - Normalize edilecek obje
 * @param {string[]} keys - Dizi olması gereken alanlar
 */
function ensureArrays(obj, keys) {
  if (!obj) return;
  keys.forEach(k => {
    if (!obj[k]) obj[k] = [];
  });
}

// ================================================================
// NAVIGATION
// ================================================================
