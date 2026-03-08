// ================================================================
// LEXBASE — LOCALSTORAGE & STATE YÖNETİMİ
// js/modules/state.js
//
// Düzeltmeler:
// - loadData hata yutma düzeltildi — artık konsola uyarı yazılır
// - saveData çakışması çözüldü — tek kaynak supabase-client.js
// - Koleksiyon normalize işlemi iyileştirildi
// ================================================================

/**
 * localStorage'dan state verilerini yükler.
 * Supabase oturumu yoksa tek veri kaynağı budur.
 */
function loadData() {
  try {
    const d = localStorage.getItem(SK);
    if (d) {
      const p = JSON.parse(d);
      Object.keys(p).forEach(k => {
        if (k in state) state[k] = p[k];
      });
    }
  } catch (e) {
    console.warn('[LexBase] localStorage verisi okunamadı veya bozuk:', e.message);
    // Bozuk veri varsa yedekle
    try {
      const raw = localStorage.getItem(SK);
      if (raw && raw.length > 0) {
        console.warn('[LexBase] Bozuk veri tespit edildi. Yedek alınıyor...');
        localStorage.setItem(SK + '_yedek_' + Date.now(), raw);
      }
    } catch (backupErr) {
      // localStorage tamamen erişilemez
    }
  }

  // Supabase modunda karşı taraf ve vekil verilerini localStorage'dan alma
  if (currentBuroId) {
    state.karsiTaraflar = [];
    state.vekillar = [];
  }

  // Koleksiyonları normalize et — sira alanı garantile
  const koleksiyonlar = [
    'muvekkillar', 'karsiTaraflar', 'vekillar',
    'davalar', 'icra', 'ihtarnameler', 'todolar'
  ];
  koleksiyonlar.forEach(k => {
    if (!state[k]) state[k] = [];
    let sonraki = Math.max(0, ...state[k].map(x => x.sira || 0)) + 1;
    state[k].forEach(x => {
      if (!x.sira) { x.sira = sonraki++; }
    });
  });

  // Terminoloji göçü — eski terimler yeni değerlere eşlenir
  _terminolojiGoc();
}

/**
 * Mevcut kayıtlardaki eski terminolojiyi yeni değerlere dönüştürür.
 * Sadece bilinen eski değerleri günceller, bilinmeyen değerlere dokunmaz.
 */
function _terminolojiGoc() {
  var degisti = false;

  // Dava aşama göçü
  var asamaMap = { 'Yargıtay': 'Temyiz (Yargıtay)', 'Danıştay': 'Temyiz (Danıştay)' };
  (state.davalar || []).forEach(function(d) {
    if (d.asama && asamaMap[d.asama]) {
      d.asama = asamaMap[d.asama];
      degisti = true;
    }
  });

  // İcra türü göçü
  var icraTurMap = {
    'Kambiyo Senedi': 'Kambiyo Senetlerine Özgü Haciz Yoluyla İcra',
    'İlamsız İcra': 'İlamsız İcra (Genel Haciz Yolu)'
  };
  (state.icra || []).forEach(function(i) {
    if (i.tur && icraTurMap[i.tur]) {
      i.tur = icraTurMap[i.tur];
      degisti = true;
    }
  });

  // Bütçe kategorisi göçü
  var katMap = { 'Akdi Vekalet Ücreti': 'Akdî Vekâlet Ücreti' };
  (state.butce || []).forEach(function(b) {
    if (b.kat && katMap[b.kat]) {
      b.kat = katMap[b.kat];
      degisti = true;
    }
  });

  if (degisti) {
    console.info('[LexBase] Terminoloji göçü uygulandı.');
  }
}

/**
 * State'i localStorage'a kaydeder.
 * NOT: Supabase oturumu varsa supabase-client.js'deki saveData()
 * bu fonksiyonu override eder ve hem localStorage hem Supabase'e yazar.
 */
function saveData() {
  try {
    localStorage.setItem(SK, JSON.stringify(state));
  } catch (e) {
    console.warn('[LexBase] localStorage yazma hatası:', e.message);
    if (typeof notify === 'function') {
      notify('⚠️ Veriler kaydedilemedi — depolama alanı dolu olabilir.');
    }
  }
}

// ================================================================
// PLAN / LİSANS SİSTEMİ
// ================================================================
const PLANLAR = {
  deneme: {
    ad: 'Başlangıç', label: 'Deneme', ikon: '🌱', renk: '#3498db',
    fiyat: 0, yillik: 0,
    limitler: { muvekkil: 25, dava: 30, icra: 15, personel: 0 },
    ozellikler: { whatsapp: false, finans: false, uyap: false, arabuluculuk: true, danismanlik: true },
    aciklama: '30 gün ücretsiz deneme',
  },
  profesyonel: {
    ad: 'Profesyonel', label: 'Profesyonel', ikon: '⚡', renk: '#c9a84c',
    fiyat: 399, yillik: 3990,
    limitler: { muvekkil: 150, dava: 200, icra: 100, personel: 0 },
    ozellikler: { whatsapp: true, finans: true, uyap: true, arabuluculuk: true, danismanlik: true },
    aciklama: 'Tek avukat için ideal',
  },
  buro: {
    ad: 'Büro', label: 'Büro', ikon: '🏛', renk: '#27ae60',
    fiyat: 699, yillik: 6990,
    limitler: { muvekkil: 500, dava: 750, icra: 400, personel: 5 },
    ozellikler: { whatsapp: true, finans: true, uyap: true, arabuluculuk: true, danismanlik: true },
    aciklama: '2-5 kişilik bürolar için',
  },
  kurumsal: {
    ad: 'Kurumsal', label: 'Kurumsal', ikon: '🏢', renk: '#8e44ad',
    fiyat: 999, yillik: 9990,
    limitler: { muvekkil: Infinity, dava: Infinity, icra: Infinity, personel: Infinity },
    ozellikler: { whatsapp: true, finans: true, uyap: true, arabuluculuk: true, danismanlik: true },
    aciklama: 'Büyük bürolar için sınırsız',
  },
};
