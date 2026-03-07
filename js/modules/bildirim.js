// ================================================================
// LEXBASE — BİLDİRİM SİSTEMİ
// js/modules/bildirim.js
//
// Özellikler:
// - Duruşma, süre, itiraz, teslim ve görev hatırlatmaları
// - In-app bildirim merkezi (çan ikonu + dropdown)
// - Browser Notification API entegrasyonu
// - Ayarlanabilir hatırlatma süreleri
// - Okundu/okunmadı takibi
// - Periyodik kontrol (5 dk)
// ================================================================

const Bildirim = (function () {

  // ── Ayarlar (localStorage'dan yüklenir) ─────────────────────
  const AYAR_KEY = 'lb_bildirim_ayar';
  const OKUNAN_KEY = 'lb_bildirim_okunan';

  const VARSAYILAN_AYAR = {
    aktif: true,
    browser: false,         // Browser notification izni
    sesli: true,            // Ses efekti
    hatirlatGunleri: [0, 1, 3, 7], // Kaç gün önce hatırlat
    turler: {               // Hangi türler aktif
      durusma: true,
      sonGun: true,
      itiraz: true,
      teslim: true,
      gorev: true,
      arabuluculuk: true,
    },
  };

  let _ayarlar = { ...VARSAYILAN_AYAR };
  let _bildirimler = [];  // Aktif bildirimler
  let _okunanIds = new Set();
  let _timer = null;
  let _panelAcik = false;

  // ── Ayar Yönetimi ──────────────────────────────────────────
  function ayarlariYukle() {
    try {
      const d = localStorage.getItem(AYAR_KEY);
      if (d) _ayarlar = { ...VARSAYILAN_AYAR, ...JSON.parse(d) };
    } catch (e) { }
    try {
      const o = localStorage.getItem(OKUNAN_KEY);
      if (o) _okunanIds = new Set(JSON.parse(o));
    } catch (e) { }
  }

  function ayarlariKaydet() {
    try { localStorage.setItem(AYAR_KEY, JSON.stringify(_ayarlar)); } catch (e) { }
  }

  function okunanKaydet() {
    try {
      // Son 500 okunanı tut
      const arr = [..._okunanIds].slice(-500);
      localStorage.setItem(OKUNAN_KEY, JSON.stringify(arr));
    } catch (e) { }
  }

  // ── Bildirim Tarama ────────────────────────────────────────
  function yaklasaknlariTara() {
    if (!_ayarlar.aktif) return [];
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const bugunS = bugun.toISOString().split('T')[0];
    const items = [];

    // Her hatırlatma günü için kontrol
    _ayarlar.hatirlatGunleri.forEach(gun => {
      const hedefTarih = new Date(bugun);
      hedefTarih.setDate(hedefTarih.getDate() + gun);
      const hedefS = hedefTarih.toISOString().split('T')[0];

      // 1. Duruşmalar
      if (_ayarlar.turler.durusma) {
        (state.etkinlikler || []).forEach(e => {
          if (e.tur === 'Duruşma' && e.tarih === hedefS) {
            items.push({
              id: `dur_${e.id}_${gun}`,
              tur: 'durusma',
              icon: '⚖️',
              baslik: 'Duruşma Hatırlatması',
              detay: `${e.baslik}${e.saat ? ' · ' + e.saat : ''}${e.yer ? ' · ' + e.yer : ''}`,
              muvAd: e.muvId ? getMuvAd(e.muvId) : '',
              tarih: e.tarih,
              gun,
              acil: gun <= 1,
              hedef: 'takvim',
            });
          }
        });

        // Dava duruşma tarihleri
        (state.davalar || []).forEach(d => {
          if (d.durum === 'Aktif' && d.durusma === hedefS) {
            items.push({
              id: `davdur_${d.id}_${gun}`,
              tur: 'durusma',
              icon: '⚖️',
              baslik: 'Duruşma Hatırlatması',
              detay: `${d.no || ''} — ${d.konu || ''}`,
              muvAd: d.muvId ? getMuvAd(d.muvId) : '',
              tarih: d.durusma,
              gun,
              acil: gun <= 1,
              hedef: 'davalar',
            });
          }
        });
      }

      // 2. Son Günler (süre takip)
      if (_ayarlar.turler.sonGun) {
        (state.etkinlikler || []).forEach(e => {
          if (e.tur === 'Son Gün' && e.tarih === hedefS) {
            items.push({
              id: `son_${e.id}_${gun}`,
              tur: 'sonGun',
              icon: '🔴',
              baslik: 'Süre Sonu Yaklaşıyor',
              detay: e.baslik,
              muvAd: e.muvId ? getMuvAd(e.muvId) : '',
              tarih: e.tarih,
              gun,
              acil: gun <= 1,
              hedef: 'takvim',
            });
          }
        });
      }

      // 3. İcra itiraz son tarihleri
      if (_ayarlar.turler.itiraz) {
        (state.icra || []).forEach(i => {
          if (i.itirazSonTarih === hedefS) {
            items.push({
              id: `itr_${i.id}_${gun}`,
              tur: 'itiraz',
              icon: '⚡',
              baslik: 'İtiraz Süresi Doluyor',
              detay: `${i.no || ''} — ${i.borclu || ''}`,
              muvAd: i.muvId ? getMuvAd(i.muvId) : '',
              tarih: i.itirazSonTarih,
              gun,
              acil: gun <= 1,
              hedef: 'icra',
            });
          }
        });
      }

      // 4. Danışmanlık teslim tarihleri
      if (_ayarlar.turler.teslim) {
        (state.danismanlik || []).forEach(d => {
          if (d.durum !== 'Tamamlandı' && d.durum !== 'İptal' && d.teslimTarih === hedefS) {
            items.push({
              id: `tes_${d.id}_${gun}`,
              tur: 'teslim',
              icon: '📋',
              baslik: 'Teslim Tarihi Yaklaşıyor',
              detay: d.konu || '',
              muvAd: d.muvId ? getMuvAd(d.muvId) : '',
              tarih: d.teslimTarih,
              gun,
              acil: gun <= 1,
              hedef: 'danismanlik',
            });
          }
        });
      }

      // 5. Görevler son tarih
      if (_ayarlar.turler.gorev) {
        (state.todolar || []).forEach(t => {
          if (t.durum !== 'tamamlandi' && t.sonTarih === hedefS) {
            items.push({
              id: `grv_${t.id}_${gun}`,
              tur: 'gorev',
              icon: '✅',
              baslik: 'Görev Son Tarihi',
              detay: t.baslik || '',
              muvAd: t.muvId ? getMuvAd(t.muvId) : '',
              tarih: t.sonTarih,
              gun,
              acil: gun <= 1,
              hedef: 'todo',
            });
          }
        });
      }

      // 6. Arabuluculuk toplantıları
      if (_ayarlar.turler.arabuluculuk) {
        (state.arabuluculuk || []).forEach(a => {
          if (a.durum !== 'Uzlaşma Sağlandı' && a.durum !== 'Dava Açıldı' && a.ilkTarih === hedefS) {
            items.push({
              id: `arb_${a.id}_${gun}`,
              tur: 'arabuluculuk',
              icon: '🤝',
              baslik: 'Arabuluculuk Toplantısı',
              detay: `${a.konu || ''}${a.ilkSaat ? ' · ' + a.ilkSaat : ''}`,
              muvAd: a.muvId ? getMuvAd(a.muvId) : '',
              tarih: a.ilkTarih,
              gun,
              acil: gun <= 1,
              hedef: 'arabuluculuk',
            });
          }
        });
      }
    });

    // Sırala: acil → yakın → uzak
    items.sort((a, b) => a.gun - b.gun || a.tarih.localeCompare(b.tarih));

    // Benzersiz yap (aynı dosya birden fazla hatırlatma gününe düşebilir)
    const goruldu = new Set();
    return items.filter(i => {
      if (goruldu.has(i.id)) return false;
      goruldu.add(i.id);
      return true;
    });
  }

  // ── Gün Metni ──────────────────────────────────────────────
  function gunMetni(gun) {
    if (gun === 0) return 'Bugün';
    if (gun === 1) return 'Yarın';
    return gun + ' gün sonra';
  }

  function gunRenk(gun) {
    if (gun <= 0) return '#e74c3c';
    if (gun === 1) return '#e67e22';
    if (gun <= 3) return '#f39c12';
    return 'var(--text-muted)';
  }

  // ── Badge Güncelle ─────────────────────────────────────────
  function badgeGuncelle() {
    const badge = document.getElementById('bildirim-badge');
    if (!badge) return;
    const okunmamis = _bildirimler.filter(b => !_okunanIds.has(b.id)).length;
    if (okunmamis > 0) {
      badge.textContent = okunmamis > 99 ? '99+' : okunmamis;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // ── Panel Render ───────────────────────────────────────────
  function panelRender() {
    const panel = document.getElementById('bildirim-panel');
    if (!panel) return;

    const icerik = document.getElementById('bildirim-liste');
    if (!icerik) return;

    if (!_bildirimler.length) {
      icerik.innerHTML = `
        <div style="padding:40px 20px;text-align:center">
          <div style="font-size:32px;margin-bottom:8px">🔔</div>
          <div style="font-size:13px;font-weight:600;color:var(--text)">Bildirim yok</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Yaklaşan duruşma ve süre tarihleri burada görünecek</div>
        </div>`;
      return;
    }

    icerik.innerHTML = _bildirimler.map(b => {
      const okunan = _okunanIds.has(b.id);
      const renk = gunRenk(b.gun);
      return `<div class="bildirim-item ${okunan ? 'okunan' : ''} ${b.acil ? 'acil' : ''}" 
        onclick="Bildirim.tikla('${escAttr(b.id)}','${escAttr(b.hedef)}')">
        <div class="bildirim-icon">${b.icon}</div>
        <div class="bildirim-icerik">
          <div class="bildirim-baslik">${escHTML(b.baslik)}</div>
          <div class="bildirim-detay">${escHTML(b.detay)}</div>
          ${b.muvAd ? `<div class="bildirim-muv">👤 ${escHTML(b.muvAd)}</div>` : ''}
        </div>
        <div class="bildirim-zaman" style="color:${renk}">
          <div class="bildirim-gun">${gunMetni(b.gun)}</div>
          <div class="bildirim-tarih">${fmtD(b.tarih)}</div>
        </div>
      </div>`;
    }).join('');
  }

  // ── Panel Aç/Kapat ─────────────────────────────────────────
  function panelToggle() {
    const panel = document.getElementById('bildirim-panel');
    if (!panel) return;
    _panelAcik = !_panelAcik;
    panel.classList.toggle('acik', _panelAcik);

    if (_panelAcik) {
      yenile();
      panelRender();
      // Dışarı tıklayınca kapat
      setTimeout(() => {
        document.addEventListener('click', _disariTikla, { once: true, capture: true });
      }, 50);
    }
  }

  function _disariTikla(e) {
    const panel = document.getElementById('bildirim-panel');
    const btn = document.getElementById('bildirim-btn');
    if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
      _panelAcik = false;
      panel.classList.remove('acik');
    } else if (_panelAcik) {
      setTimeout(() => {
        document.addEventListener('click', _disariTikla, { once: true, capture: true });
      }, 50);
    }
  }

  // ── Bildirime Tıklama ──────────────────────────────────────
  function tikla(id, hedef) {
    _okunanIds.add(id);
    okunanKaydet();
    badgeGuncelle();
    panelRender();

    // Sayfaya git
    if (hedef && typeof showPage === 'function') {
      const navEl = document.getElementById('ni-' + hedef);
      showPage(hedef, navEl);
    }

    // Paneli kapat
    _panelAcik = false;
    const panel = document.getElementById('bildirim-panel');
    if (panel) panel.classList.remove('acik');
  }

  // ── Tümünü Oku ─────────────────────────────────────────────
  function tumunuOku() {
    _bildirimler.forEach(b => _okunanIds.add(b.id));
    okunanKaydet();
    badgeGuncelle();
    panelRender();
  }

  // ── Browser Notification ───────────────────────────────────
  function browserBildirimGonder(b) {
    if (!_ayarlar.browser || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const n = new Notification(b.baslik, {
        body: `${b.detay}${b.muvAd ? ' — ' + b.muvAd : ''} (${gunMetni(b.gun)})`,
        icon: '⚖️',
        tag: b.id, // Aynı ID'de tekrar gösterme
        silent: !_ayarlar.sesli,
      });
      n.onclick = () => {
        window.focus();
        tikla(b.id, b.hedef);
        n.close();
      };
      // 10 saniye sonra otomatik kapat
      setTimeout(() => n.close(), 10000);
    } catch (e) {
      console.warn('[Bildirim] Browser notification hatası:', e);
    }
  }

  async function browserIzinIste() {
    if (!('Notification' in window)) {
      notify('⚠️ Bu tarayıcı bildirimleri desteklemiyor.');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      notify('⚠️ Bildirim izni reddedilmiş. Tarayıcı ayarlarından açabilirsiniz.');
      return false;
    }
    const izin = await Notification.requestPermission();
    return izin === 'granted';
  }

  // ── Ses ────────────────────────────────────────────────────
  function sesOynat() {
    if (!_ayarlar.sesli) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      setTimeout(() => { osc.stop(); ctx.close(); }, 400);
    } catch (e) { }
  }

  // ── Yenile & Kontrol ──────────────────────────────────────
  function yenile() {
    _bildirimler = yaklasaknlariTara();
    badgeGuncelle();

    // Yeni okunmamış bildirimleri kontrol et — browser notification gönder
    const yeniler = _bildirimler.filter(b => !_okunanIds.has(b.id) && b.gun <= 1);
    if (yeniler.length > 0 && _ayarlar.browser) {
      // Sadece en acil olanı gönder (spam önleme)
      browserBildirimGonder(yeniler[0]);
    }
  }

  // ── Periyodik Kontrol ──────────────────────────────────────
  function baslat() {
    ayarlariYukle();
    yenile();
    panelRender();

    // Her 5 dakikada bir kontrol et
    if (_timer) clearInterval(_timer);
    _timer = setInterval(() => {
      yenile();
      if (_panelAcik) panelRender();
    }, 5 * 60 * 1000);
  }

  function durdur() {
    if (_timer) { clearInterval(_timer); _timer = null; }
  }

  // ── Ayarlar UI ─────────────────────────────────────────────
  function ayarlarRender() {
    // Aktif toggle
    const aktifEl = document.getElementById('bld-aktif');
    if (aktifEl) aktifEl.checked = _ayarlar.aktif;

    // Browser toggle
    const browserEl = document.getElementById('bld-browser');
    if (browserEl) browserEl.checked = _ayarlar.browser;

    // Ses toggle
    const sesEl = document.getElementById('bld-ses');
    if (sesEl) sesEl.checked = _ayarlar.sesli;

    // Hatırlatma günleri
    [0, 1, 3, 7].forEach(g => {
      const el = document.getElementById('bld-gun-' + g);
      if (el) el.checked = _ayarlar.hatirlatGunleri.includes(g);
    });

    // Tür toggle'ları
    Object.keys(_ayarlar.turler).forEach(t => {
      const el = document.getElementById('bld-tur-' + t);
      if (el) el.checked = _ayarlar.turler[t];
    });
  }

  function ayarDegisti(key, value) {
    if (key === 'aktif') _ayarlar.aktif = value;
    else if (key === 'browser') {
      if (value) {
        browserIzinIste().then(izin => {
          _ayarlar.browser = izin;
          ayarlariKaydet();
          const el = document.getElementById('bld-browser');
          if (el) el.checked = izin;
          if (izin) notify('✅ Tarayıcı bildirimleri açıldı');
        });
        return;
      }
      _ayarlar.browser = false;
    }
    else if (key === 'sesli') _ayarlar.sesli = value;
    else if (key.startsWith('gun_')) {
      const gun = parseInt(key.split('_')[1]);
      if (value) {
        if (!_ayarlar.hatirlatGunleri.includes(gun)) _ayarlar.hatirlatGunleri.push(gun);
      } else {
        _ayarlar.hatirlatGunleri = _ayarlar.hatirlatGunleri.filter(g => g !== gun);
      }
    }
    else if (key.startsWith('tur_')) {
      const tur = key.split('_')[1];
      _ayarlar.turler[tur] = value;
    }
    ayarlariKaydet();
    yenile();
    if (_panelAcik) panelRender();
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    baslat,
    durdur,
    yenile,
    panelToggle,
    tikla,
    tumunuOku,
    ayarlarRender,
    ayarDegisti,
    get bildirimSayisi() { return _bildirimler.filter(b => !_okunanIds.has(b.id)).length; },
  };

})();
