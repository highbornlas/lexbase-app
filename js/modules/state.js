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

  // Finans veri migrasyonu — FAZ 7: eski state.butce → state.buroGiderleri
  _migrateFinansData();

  // Belgeler migrasyonu — muv.vekaletnameler → state.belgeler
  _migrateBelgelerData();

  // Terminoloji göçü — eski terimler yeni değerlere eşlenir
  _terminolojiGoc();
}

/**
 * FAZ 7 — Finans veri migrasyonu
 * 1. syncTahsilatBudget kopyalarını (th_ prefix) state.butce'den sil
 * 2. _icraHarcamaSync otomatik avanslarını (_otoHarcama) state.avanslar'dan sil
 * 3. Kalan state.butce (manuel büro giderleri) → state.buroGiderleri'ne taşı
 * 4. state.finansIslemler → dosya bağlantılı olanları kaldır
 * Bir kez çalışır (state._finansMigrated flag).
 */
function _migrateFinansData() {
  if (state._finansMigrated) return;

  var degisti = false;

  // 1. syncTahsilatBudget kopyalarını sil (th_ prefix ID'li butce kayıtları)
  if (state.butce && state.butce.length) {
    var eskiLen = state.butce.length;
    state.butce = state.butce.filter(function(b) { return !b.id || !b.id.toString().startsWith('th_'); });
    if (state.butce.length < eskiLen) {
      console.info('[Migrasyon] ' + (eskiLen - state.butce.length) + ' syncTahsilatBudget kopyası silindi.');
      degisti = true;
    }
  }

  // 2. _icraHarcamaSync otomatik avanslarını sil
  if (state.avanslar && state.avanslar.length) {
    var eskiAvans = state.avanslar.length;
    state.avanslar = state.avanslar.filter(function(a) { return !a._otoHarcama; });
    if (state.avanslar.length < eskiAvans) {
      console.info('[Migrasyon] ' + (eskiAvans - state.avanslar.length) + ' otomatik icra harcama avansı silindi.');
      degisti = true;
    }
  }

  // 3. Kalan state.butce kayıtlarını state.buroGiderleri'ne taşı
  if (state.butce && state.butce.length) {
    if (!state.buroGiderleri) state.buroGiderleri = [];
    var katEsle = {
      'Kira': 'Kira & Aidat', 'Aidat': 'Kira & Aidat',
      'Stopaj': 'Stopaj & Vergi', 'Vergi': 'Stopaj & Vergi', 'KDV': 'Stopaj & Vergi',
      'Muhasebe': 'Muhasebeci / Mali Müşavir', 'Muhasebeci': 'Muhasebeci / Mali Müşavir',
      'Maaş': 'Çalışan Ücretleri', 'Personel': 'Çalışan Ücretleri', 'SGK': 'Çalışan Ücretleri',
      'Temizlik': 'Temizlik & Bakım',
      'Kırtasiye': 'Kırtasiye & Sarf Malzeme',
      'İnternet': 'Teknoloji', 'Yazılım': 'Teknoloji', 'Bilgisayar': 'Teknoloji',
      'Ulaşım': 'Ulaşım & Araç', 'Araç': 'Ulaşım & Araç', 'Yakıt': 'Ulaşım & Araç',
      'Sigorta': 'Sigorta',
      'Baro': 'Mesleki Gelişim', 'Seminer': 'Mesleki Gelişim',
    };
    var tasindi = 0;
    state.butce.forEach(function(b) {
      // Müvekkil bağlantılı gelirleri atla (zaten dosya bazında mevcut)
      if (b.tur === 'Gelir' && b.muvId) return;
      // Giderleri buroGiderleri'ne aktar
      var yeniKat = 'Diğer Genel Gider';
      if (b.kat) {
        // Mevcut kategoriyi eşlemeye çalış
        Object.keys(katEsle).forEach(function(anahtar) {
          if (b.kat.toLowerCase().indexOf(anahtar.toLowerCase()) !== -1) {
            yeniKat = katEsle[anahtar];
          }
        });
      }
      state.buroGiderleri.push({
        id: b.id || uid(),
        tarih: b.tarih || '',
        kategori: yeniKat,
        tutar: Math.abs(b.tutar || 0),
        aciklama: b.aciklama || b.kat || '',
        tekrar: '',
        kdvOran: b.kdvOran || 0,
        kdvTutar: b.kdvTutar || 0,
        _migratedFrom: 'butce'
      });
      tasindi++;
    });
    if (tasindi) {
      console.info('[Migrasyon] ' + tasindi + ' bütçe kaydı buroGiderleri\'ne taşındı.');
      degisti = true;
    }
  }

  // 4. state.finansIslemler temizle
  if (state.finansIslemler && state.finansIslemler.length) {
    console.info('[Migrasyon] ' + state.finansIslemler.length + ' finansIslemler kaydı temizlendi.');
    degisti = true;
  }

  // 5. Eski dizileri temizle ve flag koy
  state.butce = [];
  state.finansIslemler = [];
  state._finansMigrated = true;

  if (degisti) {
    console.info('[Migrasyon] Finans veri migrasyonu tamamlandı.');
    try { localStorage.setItem(SK, JSON.stringify(state)); }
    catch (e) { console.warn('[Migrasyon] localStorage kayıt hatası:', e.message); }
  }
}

/**
 * Belgeler migrasyonu — muvekkil.vekaletnameler[] → state.belgeler[]
 * Vekaletname takibi İlişkiler sekmesinden Belgeler sekmesine taşınıyor.
 * Bir kez çalışır (state._belgelerMigrated flag).
 */
function _migrateBelgelerData() {
  if (state._belgelerMigrated) return;
  var degisti = false;
  if (!state.belgeler) state.belgeler = [];

  // 1. muvekkil.vekaletnameler[] → state.belgeler[]
  (state.muvekkillar || []).forEach(function(muv) {
    if (!muv.vekaletnameler || !muv.vekaletnameler.length) return;
    muv.vekaletnameler.forEach(function(v) {
      // Daha önce taşınmış mı kontrol et
      var zatenVar = state.belgeler.some(function(b) {
        return b._migratedFrom === 'vekaletname' && b._sourceId === v.id;
      });
      if (zatenVar) return;

      state.belgeler.push({
        id: uid(),
        muvId: muv.id,
        ad: 'Vekâletname' + (v.noter ? ' — ' + v.noter : ''),
        tur: 'vekaletname',
        acik: v.not || '',
        dosyaAd: null,
        tip: null,
        data: null,
        yukleme: v.tarih || today(),
        tarih: v.tarih || '',
        etiketler: [],
        meta: {
          bitis: v.bitis || '',
          noter: v.noter || '',
          yevmiye: v.yevmiye || '',
          vekil: v.vekil || '',
          ozel: !!v.ozel,
          ozelAcik: v.ozelAcik || '',
          dosyalar: v.dosyalar || ''
        },
        _migratedFrom: 'vekaletname',
        _sourceId: v.id
      });
      degisti = true;
    });
  });

  // 2. Mevcut belgeler'e yeni alanları ekle (geriye uyumluluk)
  state.belgeler.forEach(function(b) {
    if (!b.meta) b.meta = {};
    if (!b.tarih) b.tarih = b.yukleme || '';
    if (!b.etiketler) b.etiketler = [];
  });

  state._belgelerMigrated = true;
  if (degisti) {
    console.info('[Migrasyon] Vekaletname verileri belgeler sistemine taşındı.');
    try { localStorage.setItem(SK, JSON.stringify(state)); }
    catch (e) { console.warn('[Migrasyon] localStorage kayıt hatası:', e.message); }
  }
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
    ad: 'Kurumsal', label: 'Kurumsal', ikon: '🏢', renk: '#C9A84C',
    fiyat: 999, yillik: 9990,
    limitler: { muvekkil: Infinity, dava: Infinity, icra: Infinity, personel: Infinity },
    ozellikler: { whatsapp: true, finans: true, uyap: true, arabuluculuk: true, danismanlik: true },
    aciklama: 'Büyük bürolar için sınırsız',
  },
};
