// ================================================================
// LEXBASE — GLOBAL BANKA YÖNETİM SİSTEMİ
// js/modules/bankaWidget.js
//
// Searchable banka dropdown, çift katmanlı IBAN doğrulama
// (Mod-97 + banka kodu eşleşmesi), isDefault checkbox.
// Müvekkil, Karşı Taraf ve Vekil formlarında kullanılır.
// ================================================================

// ── Renk sabitleri (koyu tema uyumlu) ───────────────────────────
const BW = {
  HATA_BORDER : '#ef4444',   // red-500
  HATA_GLOW   : 'rgba(239,68,68,0.25)',
  OK_BORDER   : '#22d3ee',   // cyan-400
  OK_GLOW     : 'rgba(34,211,238,0.20)',
  WARN_BORDER : '#f59e0b',   // amber-400
  WARN_GLOW   : 'rgba(245,158,11,0.20)',
};

// ── IBAN doğrulama (Mod-97) ──────────────────────────────────────
function bwIbanDogrula(iban) {
  if (!iban) return { ok: true, mesaj: '' };
  const t = iban.replace(/\s/g, '').toUpperCase();
  if (!t.startsWith('TR'))      return { ok: false, mesaj: 'IBAN TR ile başlamalıdır.' };
  if (t.length !== 26)          return { ok: false, mesaj: `IBAN 26 karakter olmalıdır (şu an: ${t.length}).` };
  if (!/^TR\d{24}$/.test(t))   return { ok: false, mesaj: 'IBAN formatı hatalı (TR + 24 rakam).' };
  const yeniden = t.slice(4) + t.slice(0, 4);
  const sayi = yeniden.split('').map(c => isNaN(c) ? (c.charCodeAt(0) - 55).toString() : c).join('');
  let mod = 0;
  for (const ch of sayi) mod = (mod * 10 + parseInt(ch)) % 97;
  if (mod !== 1) return { ok: false, mesaj: 'Geçersiz IBAN (mod-97 doğrulaması başarısız).' };
  return { ok: true, mesaj: '' };
}

// ── Banka kodu eşleşme kontrolü ─────────────────────────────────
function bwIbanBankaEslestir(iban, bankaKodu) {
  if (!iban || !bankaKodu) return { ok: true, mesaj: '' };
  const ibanKodu = ibanBankaKoduCikar(iban);
  if (!ibanKodu) return { ok: true, mesaj: '' };
  if (ibanKodu !== bankaKodu) {
    const banka = BANKA_KOD_MAP[ibanKodu];
    const bulunan = banka ? banka.name : `kod: ${ibanKodu}`;
    return { ok: false, mesaj: `Seçilen banka ile IBAN uyuşmuyor (IBAN'daki banka: ${bulunan}).`, uyari: true };
  }
  return { ok: true, mesaj: '' };
}

// ── TCKN doğrulama ───────────────────────────────────────────────
function bwTcknDogrula(tc) {
  if (!tc) return { ok: true, mesaj: '' };
  tc = tc.replace(/\D/g, '');
  if (tc.length !== 11)  return { ok: false, mesaj: 'TC Kimlik No 11 haneli olmalıdır.' };
  if (tc[0] === '0')     return { ok: false, mesaj: 'TC Kimlik No 0 ile başlayamaz.' };
  const d = tc.split('').map(Number);
  const tek  = d[0]+d[2]+d[4]+d[6]+d[8];
  const cift = d[1]+d[3]+d[5]+d[7];
  if ((tek * 7 - cift) % 10 !== d[9])                            return { ok: false, mesaj: 'Geçersiz TC Kimlik No (10. hane hatası).' };
  if (d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 !== d[10]) return { ok: false, mesaj: 'Geçersiz TC Kimlik No (11. hane hatası).' };
  return { ok: true, mesaj: '' };
}

// ── Input görsel durumu ──────────────────────────────────────────
function bwInputDurum(input, durum) {
  // durum: 'hata' | 'ok' | 'uyari' | 'normal'
  const renk  = durum === 'hata'  ? BW.HATA_BORDER
              : durum === 'ok'    ? BW.OK_BORDER
              : durum === 'uyari' ? BW.WARN_BORDER
              : '';
  const glow  = durum === 'hata'  ? BW.HATA_GLOW
              : durum === 'ok'    ? BW.OK_GLOW
              : durum === 'uyari' ? BW.WARN_GLOW
              : '';
  input.style.borderColor = renk;
  input.style.boxShadow   = renk ? `0 0 0 2px ${glow}` : '';

  // Hata mesajı
  let msg = input.parentNode.querySelector('.bw-msg');
  if (!msg) {
    msg = document.createElement('div');
    msg.className = 'bw-msg';
    msg.style.cssText = 'font-size:11px;margin-top:4px;display:flex;align-items:center;gap:4px;';
    input.parentNode.appendChild(msg);
  }
  if (durum === 'normal' || durum === 'ok') {
    msg.innerHTML = durum === 'ok' ? '<span style="color:#22d3ee">✓ Doğrulandı</span>' : '';
  } else if (durum === 'hata' || durum === 'uyari') {
    const renk2 = durum === 'hata' ? '#ef4444' : '#f59e0b';
    msg.innerHTML = `<span style="color:${renk2}">⚠️ ${input._bwMesaj || ''}</span>`;
  }
}

// ── Searchable Banka Dropdown ────────────────────────────────────
function bwDropdownOlustur(konteynerId, onChange) {
  const kont = document.getElementById(konteynerId);
  if (!kont || kont.dataset.bwKuruldu) return;
  kont.dataset.bwKuruldu = '1';

  kont.style.position = 'relative';
  kont.innerHTML = `
    <input
      class="bw-banka-input"
      placeholder="🔍 Banka ara veya seç..."
      autocomplete="off"
      style="width:100%;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:13px;box-sizing:border-box"
    />
    <input type="hidden" class="bw-banka-kod" />
    <input type="hidden" class="bw-banka-ad"  />
    <div class="bw-dropdown-liste" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:9999;max-height:220px;overflow-y:auto;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);box-shadow:0 8px 24px rgba(0,0,0,.4);margin-top:2px"></div>
    <div style="margin-top:8px;display:flex;align-items:center;gap:7px">
      <input type="checkbox" class="bw-default-cb" id="bw-default-${konteynerId}" style="accent-color:#22d3ee;width:14px;height:14px">
      <label for="bw-default-${konteynerId}" style="font-size:11px;color:var(--text-muted);cursor:pointer">Varsayılan hesap olarak ayarla</label>
    </div>
  `;

  const searchInput = kont.querySelector('.bw-banka-input');
  const kodInput    = kont.querySelector('.bw-banka-kod');
  const adInput     = kont.querySelector('.bw-banka-ad');
  const liste       = kont.querySelector('.bw-dropdown-liste');

  function listeyiGoster(filtre) {
    const f = (filtre || '').toLowerCase();
    const sonuclar = f
      ? BANKA_LISTESI.filter(b => b.name.toLowerCase().includes(f) || b.kisa.toLowerCase().includes(f))
      : BANKA_LISTESI;

    if (!sonuclar.length) {
      liste.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:var(--text-muted)">Banka bulunamadı</div>';
    } else {
      liste.innerHTML = sonuclar.map(b => `
        <div class="bw-option" data-kod="${b.code}" data-ad="${b.name}"
          style="padding:9px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .1s"
          onmouseover="this.style.background='var(--surface3)'"
          onmouseout="this.style.background=''"
        >
          <div style="font-weight:600;color:var(--text)">${b.name}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:1px">Kod: ${b.code}</div>
        </div>
      `).join('');
    }
    liste.style.display = 'block';

    liste.querySelectorAll('.bw-option').forEach(opt => {
      opt.addEventListener('mousedown', e => {
        e.preventDefault();
        searchInput.value = opt.dataset.ad;
        kodInput.value    = opt.dataset.kod;
        adInput.value     = opt.dataset.ad;
        liste.style.display = 'none';
        if (onChange) onChange({ ad: opt.dataset.ad, kod: opt.dataset.kod });
      });
    });
  }

  searchInput.addEventListener('input',  () => listeyiGoster(searchInput.value));
  searchInput.addEventListener('focus',  () => listeyiGoster(searchInput.value));
  searchInput.addEventListener('blur',   () => setTimeout(() => { liste.style.display = 'none'; }, 150));

  // Dışarı tıklayınca kapat
  document.addEventListener('click', e => {
    if (!kont.contains(e.target)) liste.style.display = 'none';
  });

  return { searchInput, kodInput, adInput };
}

// ── Banka widget'ını bir IBAN input'una bağla ────────────────────
function bwIbanKur(ibanInput, dropdownKonteynerId) {
  if (!ibanInput) return;

  ibanInput.setAttribute('maxlength', '32');
  ibanInput.setAttribute('placeholder', 'TR00 0000 0000 0000 0000 0000 00');
  ibanInput.style.fontFamily     = 'monospace';
  ibanInput.style.letterSpacing  = '1px';

  // Maskeleme
  ibanInput.addEventListener('keydown', function(e) {
    if ((e.key === 'Backspace' || e.key === 'Delete') && this.selectionStart <= 2 && this.selectionStart === this.selectionEnd) {
      e.preventDefault();
    }
  });

  ibanInput.addEventListener('input', function() {
    let v = this.value.replace(/\s/g, '').toUpperCase();
    if (!v.startsWith('TR')) v = 'TR' + v.replace(/^[A-Z]{0,2}/, '');
    v = 'TR' + v.slice(2).replace(/\D/g, '');
    v = v.slice(0, 26);
    let fmt = v.slice(0, 4);
    for (let i = 4; i < v.length; i += 4) fmt += ' ' + v.slice(i, i + 4);
    this.value = fmt;
    bwInputDurum(this, 'normal');
    this._bwMesaj = '';
    // IBAN'dan otomatik banka tespiti
    if (dropdownKonteynerId) {
      const kont     = document.getElementById(dropdownKonteynerId);
      const kodInput = kont?.querySelector('.bw-banka-kod');
      const adInput  = kont?.querySelector('.bw-banka-input');
      const banka    = ibanBankaBul(this.value);
      if (banka && kodInput && !kodInput.value) {
        kodInput.value                                           = banka.code;
        if (adInput) adInput.value                              = banka.name;
        kont.querySelector('.bw-banka-ad') && (kont.querySelector('.bw-banka-ad').value = banka.name);
      }
    }
  });

  ibanInput.addEventListener('blur', function() {
    const val = this.value.trim();
    if (!val || val === 'TR') { bwInputDurum(this, 'normal'); return; }

    // 1. Mod-97
    const mod97 = bwIbanDogrula(val);
    if (!mod97.ok) {
      this._bwMesaj = mod97.mesaj;
      bwInputDurum(this, 'hata');
      return;
    }

    // 2. Banka kodu eşleşmesi
    if (dropdownKonteynerId) {
      const kont     = document.getElementById(dropdownKonteynerId);
      const bankaKod = kont?.querySelector('.bw-banka-kod')?.value;
      if (bankaKod) {
        const eslesme = bwIbanBankaEslestir(val, bankaKod);
        if (!eslesme.ok) {
          this._bwMesaj = eslesme.mesaj;
          bwInputDurum(this, eslesme.uyari ? 'uyari' : 'hata');
          return;
        }
      }
    }

    bwInputDurum(this, 'ok');
  });

  ibanInput.addEventListener('focus', function() {
    if (!this.value.trim()) this.value = 'TR';
  });
}

// ── TCKN input'u kur ────────────────────────────────────────────
function bwTcknKur(input) {
  if (!input || input.dataset.bwTcknKuruldu) return;
  input.dataset.bwTcknKuruldu = '1';

  input.setAttribute('maxlength', '11');
  input.setAttribute('inputmode', 'numeric');
  input.style.fontFamily    = 'monospace';
  input.style.letterSpacing = '1px';
  if (!input.placeholder) input.setAttribute('placeholder', '11 haneli TC Kimlik No');

  input.addEventListener('keydown', function(e) {
    const izin = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','Home','End'];
    if (izin.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^\d$/.test(e.key)) { e.preventDefault(); return; }
    if (this.value.length >= 11 && this.selectionStart === this.selectionEnd) e.preventDefault();
  });

  input.addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '').slice(0, 11);
    bwInputDurum(this, 'normal');
  });

  input.addEventListener('blur', function() {
    const val = this.value.trim();
    if (!val) { bwInputDurum(this, 'normal'); return; }
    const sonuc = bwTcknDogrula(val);
    if (!sonuc.ok) {
      this._bwMesaj = sonuc.mesaj;
      bwInputDurum(this, 'hata');
    } else {
      bwInputDurum(this, 'ok');
    }
  });
}

// ── Müvekkil banka widget render ────────────────────────────────
// muvBankalar dizisini zengin banka widget'ı ile yeniden render et
function renderMuvBankalarBW() {
  const el = document.getElementById('m-banka-list');
  if (!el) return;
  if (!muvBankalar.length) { el.innerHTML = ''; return; }

  el.innerHTML = muvBankalar.map((b, i) => `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;position:relative">
      <button type="button" onclick="muvBankaKaldir(${i})" title="Kaldır"
        style="position:absolute;top:8px;right:10px;background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:15px">✕</button>
      <div style="font-size:10px;text-transform:uppercase;color:var(--text-dim);margin-bottom:10px;font-weight:700">
        Banka Hesabı ${i+1}${b.isDefault ? ' <span style="color:#22d3ee;font-size:9px">★ Varsayılan</span>' : ''}
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">Banka *</label>
        <div id="bw-muv-banka-dd-${i}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div>
          <label style="font-size:10px;color:var(--text-muted)">Şube</label>
          <input value="${b.sube||''}" oninput="muvBankalar[${i}].sube=this.value" placeholder="Şube adı / no"
            style="width:100%;margin-top:2px">
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted)">Hesap Adı</label>
          <input value="${b.hesapAd||''}" oninput="muvBankalar[${i}].hesapAd=this.value" placeholder="Hesap sahibi adı"
            style="width:100%;margin-top:2px">
        </div>
        <div style="grid-column:1/-1">
          <label style="font-size:10px;color:var(--text-muted)">IBAN</label>
          <input id="bw-muv-iban-${i}" value="${b.iban||''}" placeholder="TR00 0000 0000 0000 0000 0000 00"
            oninput="muvBankalar[${i}].iban=this.value"
            style="width:100%;margin-top:2px;font-family:monospace;letter-spacing:1px">
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted)">Hesap No</label>
          <input value="${b.hesapNo||''}" oninput="muvBankalar[${i}].hesapNo=this.value" placeholder="Hesap numarası"
            style="width:100%;margin-top:2px">
        </div>
      </div>
    </div>
  `).join('');

  // Her satır için dropdown ve IBAN kurulumunu yap
  muvBankalar.forEach((b, i) => {
    bwDropdownOlustur(`bw-muv-banka-dd-${i}`, ({ ad, kod }) => {
      muvBankalar[i].banka    = ad;
      muvBankalar[i].bankaKod = kod;
    });

    // Mevcut banka adını dropdown'a yaz
    const kont = document.getElementById(`bw-muv-banka-dd-${i}`);
    if (kont && b.banka) {
      const si = kont.querySelector('.bw-banka-input');
      const ki = kont.querySelector('.bw-banka-kod');
      const ai = kont.querySelector('.bw-banka-ad');
      if (si) si.value = b.banka;
      if (ki) ki.value = b.bankaKod || '';
      if (ai) ai.value = b.banka;
      // isDefault checkbox
      const cb = kont.querySelector('.bw-default-cb');
      if (cb) {
        cb.checked = !!b.isDefault;
        cb.onchange = () => {
          // Sadece bir tane varsayılan olabilir
          muvBankalar.forEach((x, j) => { x.isDefault = (j === i && cb.checked); });
          renderMuvBankalarBW();
        };
      }
    }

    // IBAN input'unu kur
    const ibanEl = document.getElementById(`bw-muv-iban-${i}`);
    if (ibanEl) {
      bwIbanKur(ibanEl, `bw-muv-banka-dd-${i}`);
      ibanEl.addEventListener('input', () => {
        muvBankalar[i].iban = ibanEl.value;
      });
    }
  });
}

// ── Tüm TCKN alanlarını global olarak kur ───────────────────────
function bwGlobalTcknKur() {
  const tcIds = [
    'm-tc', 'm-yetkili-tc',
    'kt-tc', 'kt-yetkili-tc',
    'i-btc',
  ];
  tcIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) bwTcknKur(el);
  });
}

// ── Başlatıcı ────────────────────────────────────────────────────
(function bwInit() {
  // ── Karşı Taraf Banka Widget ─────────────────────────────────
  function renderKtBankalarBW() {
    const el = document.getElementById('kt-banka-list');
    if (!el) return;
    const arr = window.ktBankalar || [];
    if (!arr.length) { el.innerHTML = ''; return; }
    el.innerHTML = arr.map((b, i) => `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;position:relative">
        <button type="button" onclick="ktBankaKaldir(${i})" title="Kaldır"
          style="position:absolute;top:8px;right:10px;background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:15px">✕</button>
        <div style="font-size:10px;text-transform:uppercase;color:var(--text-dim);margin-bottom:10px;font-weight:700">
          Banka Hesabı ${i+1}${b.isDefault ? ' <span style="color:#22d3ee;font-size:9px">★ Varsayılan</span>' : ''}
        </div>
        <div style="margin-bottom:10px">
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">Banka *</label>
          <div id="bw-kt-banka-dd-${i}"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><label style="font-size:10px;color:var(--text-muted)">Şube</label>
            <input value="${b.sube||''}" oninput="window.ktBankalar[${i}].sube=this.value" placeholder="Şube adı / no" style="width:100%;margin-top:2px"></div>
          <div><label style="font-size:10px;color:var(--text-muted)">Hesap Adı</label>
            <input value="${b.hesapAd||''}" oninput="window.ktBankalar[${i}].hesapAd=this.value" placeholder="Hesap sahibi adı" style="width:100%;margin-top:2px"></div>
          <div style="grid-column:1/-1"><label style="font-size:10px;color:var(--text-muted)">IBAN</label>
            <input id="bw-kt-iban-${i}" value="${b.iban||''}" placeholder="TR00 0000 0000 0000 0000 0000 00"
              oninput="window.ktBankalar[${i}].iban=this.value"
              style="width:100%;margin-top:2px;font-family:monospace;letter-spacing:1px"></div>
          <div><label style="font-size:10px;color:var(--text-muted)">Hesap No</label>
            <input value="${b.hesapNo||''}" oninput="window.ktBankalar[${i}].hesapNo=this.value" placeholder="Hesap numarası" style="width:100%;margin-top:2px"></div>
        </div>
      </div>
    `).join('');
    arr.forEach((b, i) => {
      bwDropdownOlustur(`bw-kt-banka-dd-${i}`, ({ ad, kod }) => {
        window.ktBankalar[i].banka = ad; window.ktBankalar[i].bankaKod = kod;
      });
      const kont = document.getElementById(`bw-kt-banka-dd-${i}`);
      if (kont && b.banka) {
        const si = kont.querySelector('.bw-banka-input');
        const cb = kont.querySelector('.bw-default-cb');
        if (si) si.value = b.banka;
        if (cb) { cb.checked = !!b.isDefault; cb.onchange = () => {
          window.ktBankalar.forEach((x, j) => { x.isDefault = (j===i && cb.checked); });
          renderKtBankalarBW();
        };}
      }
      const ibanEl = document.getElementById(`bw-kt-iban-${i}`);
      if (ibanEl) { bwIbanKur(ibanEl, `bw-kt-banka-dd-${i}`); ibanEl.addEventListener('input', () => { window.ktBankalar[i].iban = ibanEl.value; }); }
    });
  }

  // ── Avukat / Vekil Banka Widget ───────────────────────────────
  function renderVekBankalarBW() {
    const el = document.getElementById('vek-banka-list');
    if (!el) return;
    const arr = window.vekBankalar || [];
    if (!arr.length) { el.innerHTML = ''; return; }
    el.innerHTML = arr.map((b, i) => `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;position:relative">
        <button type="button" onclick="vekBankaKaldir(${i})" title="Kaldır"
          style="position:absolute;top:8px;right:10px;background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:15px">✕</button>
        <div style="font-size:10px;text-transform:uppercase;color:var(--text-dim);margin-bottom:10px;font-weight:700">
          Banka Hesabı ${i+1}${b.isDefault ? ' <span style="color:#22d3ee;font-size:9px">★ Varsayılan</span>' : ''}
        </div>
        <div style="margin-bottom:10px">
          <label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">Banka *</label>
          <div id="bw-vek-banka-dd-${i}"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><label style="font-size:10px;color:var(--text-muted)">Şube</label>
            <input value="${b.sube||''}" oninput="window.vekBankalar[${i}].sube=this.value" placeholder="Şube adı / no" style="width:100%;margin-top:2px"></div>
          <div><label style="font-size:10px;color:var(--text-muted)">Hesap Adı</label>
            <input value="${b.hesapAd||''}" oninput="window.vekBankalar[${i}].hesapAd=this.value" placeholder="Hesap sahibi adı" style="width:100%;margin-top:2px"></div>
          <div style="grid-column:1/-1"><label style="font-size:10px;color:var(--text-muted)">IBAN</label>
            <input id="bw-vek-iban-${i}" value="${b.iban||''}" placeholder="TR00 0000 0000 0000 0000 0000 00"
              oninput="window.vekBankalar[${i}].iban=this.value"
              style="width:100%;margin-top:2px;font-family:monospace;letter-spacing:1px"></div>
          <div><label style="font-size:10px;color:var(--text-muted)">Hesap No</label>
            <input value="${b.hesapNo||''}" oninput="window.vekBankalar[${i}].hesapNo=this.value" placeholder="Hesap numarası" style="width:100%;margin-top:2px"></div>
        </div>
      </div>
    `).join('');
    arr.forEach((b, i) => {
      bwDropdownOlustur(`bw-vek-banka-dd-${i}`, ({ ad, kod }) => {
        window.vekBankalar[i].banka = ad; window.vekBankalar[i].bankaKod = kod;
      });
      const kont = document.getElementById(`bw-vek-banka-dd-${i}`);
      if (kont && b.banka) {
        const si = kont.querySelector('.bw-banka-input');
        const cb = kont.querySelector('.bw-default-cb');
        if (si) si.value = b.banka;
        if (cb) { cb.checked = !!b.isDefault; cb.onchange = () => {
          window.vekBankalar.forEach((x, j) => { x.isDefault = (j===i && cb.checked); });
          renderVekBankalarBW();
        };}
      }
      const ibanEl = document.getElementById(`bw-vek-iban-${i}`);
      if (ibanEl) { bwIbanKur(ibanEl, `bw-vek-banka-dd-${i}`); ibanEl.addEventListener('input', () => { window.vekBankalar[i].iban = ibanEl.value; }); }
    });
  }

  function kur() {
    bwGlobalTcknKur();
    window.renderMuvBankalarBW = renderMuvBankalarBW;
    window.renderKtBankalarBW  = renderKtBankalarBW;
    window.renderVekBankalarBW = renderVekBankalarBW;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kur);
  else kur();

  // Modal açılışlarında da TC alanlarını kur
  const obs = new MutationObserver(() => bwGlobalTcknKur());
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });
})();
