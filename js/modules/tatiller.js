// ================================================================
// LEXBASE — TÜRKİYE TATİL VE ÖZEL GÜNLER
// js/modules/tatiller.js
//
// Resmi tatiller, dini bayramlar, adli tatil, hukuk önemli günleri
// ================================================================

var Tatiller = (function() {

  // ── RESMİ TATİLLER (sabit tarihli) ──
  var resmi = [
    { ay: 1, gun: 1, ad: 'Yılbaşı', tip: 'resmi' },
    { ay: 4, gun: 23, ad: 'Ulusal Egemenlik ve Çocuk Bayramı', tip: 'resmi' },
    { ay: 5, gun: 1, ad: 'Emek ve Dayanışma Günü', tip: 'resmi' },
    { ay: 5, gun: 19, ad: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', tip: 'resmi' },
    { ay: 7, gun: 15, ad: 'Demokrasi ve Millî Birlik Günü', tip: 'resmi' },
    { ay: 8, gun: 30, ad: 'Zafer Bayramı', tip: 'resmi' },
    { ay: 10, gun: 29, ad: 'Cumhuriyet Bayramı', tip: 'resmi' }
  ];

  // ── DİNİ BAYRAMLAR (yıla göre değişir — Hicri takvim) ──
  // Ramazan Bayramı (3 gün) + arife
  // Kurban Bayramı (4 gün) + arife
  var dini = {
    2024: {
      ramazan: ['04-10','04-11','04-12'], ramazanArife: '04-09',
      kurban: ['06-17','06-18','06-19','06-20'], kurbanArife: '06-16'
    },
    2025: {
      ramazan: ['03-30','03-31','04-01'], ramazanArife: '03-29',
      kurban: ['06-06','06-07','06-08','06-09'], kurbanArife: '06-05'
    },
    2026: {
      ramazan: ['03-20','03-21','03-22'], ramazanArife: '03-19',
      kurban: ['05-27','05-28','05-29','05-30'], kurbanArife: '05-26'
    },
    2027: {
      ramazan: ['03-09','03-10','03-11'], ramazanArife: '03-08',
      kurban: ['05-16','05-17','05-18','05-19'], kurbanArife: '05-15'
    },
    2028: {
      ramazan: ['02-26','02-27','02-28'], ramazanArife: '02-25',
      kurban: ['05-04','05-05','05-06','05-07'], kurbanArife: '05-03'
    },
    2029: {
      ramazan: ['02-14','02-15','02-16'], ramazanArife: '02-13',
      kurban: ['04-24','04-25','04-26','04-27'], kurbanArife: '04-23'
    },
    2030: {
      ramazan: ['02-04','02-05','02-06'], ramazanArife: '02-03',
      kurban: ['04-13','04-14','04-15','04-16'], kurbanArife: '04-12'
    }
  };

  // ── ADLİ TATİL (her yıl sabit) ──
  // 20 Temmuz – 31 Ağustos (HMK md.104, CMK md.331)
  var adliTatilBaslangic = { ay: 7, gun: 20 };
  var adliTatilBitis = { ay: 8, gun: 31 };

  // ── HUKUK CAMİASI ÖZEL GÜNLERİ ──
  var hukukGunleri = [
    { ay: 1, gun: 13, ad: 'Basın Onur Günü', tip: 'hukuk' },
    { ay: 4, gun: 5, ad: 'Avukatlar Günü', tip: 'hukuk' },
    { ay: 5, gun: 6, ad: 'Hıdrellez (geleneksel)', tip: 'hukuk' },
    { ay: 6, gun: 1, ad: 'Adli Yıl Kapanışı', tip: 'hukuk' },
    { ay: 9, gun: 1, ad: 'Adli Yıl Açılışı', tip: 'hukuk' },
    { ay: 10, gun: 6, ad: 'Dünya Avukatlar Günü', tip: 'hukuk' },
    { ay: 11, gun: 10, ad: 'Atatürk\'ü Anma Günü', tip: 'anma' },
    { ay: 11, gun: 26, ad: 'Dünya Arabuluculuk Günü', tip: 'hukuk' },
    { ay: 12, gun: 10, ad: 'İnsan Hakları Günü', tip: 'hukuk' }
  ];

  // ── Belirli bir tarih için tatil/özel gün bilgisi döndür ──
  function tarihBilgi(tarihStr) {
    // tarihStr: 'YYYY-MM-DD'
    var p = tarihStr.split('-');
    var yil = parseInt(p[0]);
    var ay = parseInt(p[1]);
    var gun = parseInt(p[2]);
    var mmdd = p[1] + '-' + p[2]; // '03-20'
    var sonuclar = [];

    // Resmi tatiller
    resmi.forEach(function(t) {
      if (t.ay === ay && t.gun === gun) {
        sonuclar.push({ ad: t.ad, tip: 'resmi', renk: '#e74c3c' });
      }
    });

    // Dini bayramlar
    var yilDini = dini[yil];
    if (yilDini) {
      if (yilDini.ramazanArife === mmdd) {
        sonuclar.push({ ad: 'Ramazan Bayramı Arifesi', tip: 'dini', renk: '#C9A84C' });
      }
      if (yilDini.ramazan.indexOf(mmdd) !== -1) {
        var ri = yilDini.ramazan.indexOf(mmdd) + 1;
        sonuclar.push({ ad: 'Ramazan Bayramı (' + ri + '. gün)', tip: 'dini', renk: '#C9A84C' });
      }
      if (yilDini.kurbanArife === mmdd) {
        sonuclar.push({ ad: 'Kurban Bayramı Arifesi', tip: 'dini', renk: '#C9A84C' });
      }
      if (yilDini.kurban.indexOf(mmdd) !== -1) {
        var ki = yilDini.kurban.indexOf(mmdd) + 1;
        sonuclar.push({ ad: 'Kurban Bayramı (' + ki + '. gün)', tip: 'dini', renk: '#C9A84C' });
      }
    }

    // Adli tatil kontrolü
    var adliBasla = new Date(yil, adliTatilBaslangic.ay - 1, adliTatilBaslangic.gun);
    var adliBit = new Date(yil, adliTatilBitis.ay - 1, adliTatilBitis.gun);
    var buTarih = new Date(yil, ay - 1, gun);
    if (buTarih >= adliBasla && buTarih <= adliBit) {
      sonuclar.push({ ad: 'Adli Tatil', tip: 'adli', renk: '#2980b9' });
    }

    // Hukuk özel günleri
    hukukGunleri.forEach(function(h) {
      if (h.ay === ay && h.gun === gun) {
        sonuclar.push({ ad: h.ad, tip: h.tip, renk: '#27ae60' });
      }
    });

    return sonuclar;
  }

  // ── Belirli bir ay için tüm tatil/özel gün tarihlerini map olarak döndür ──
  function ayTatilleri(yil, ay) {
    // ay: 0-indexed (Ocak=0)
    var map = {};
    var dim = new Date(yil, ay + 1, 0).getDate();
    for (var g = 1; g <= dim; g++) {
      var ds = yil + '-' + (ay + 1).toString().padStart(2, '0') + '-' + g.toString().padStart(2, '0');
      var bilgi = tarihBilgi(ds);
      if (bilgi.length) map[ds] = bilgi;
    }
    return map;
  }

  // ── Tatil mi? (iş günü hesaplamaları için) ──
  function tatilMi(tarihStr) {
    var bilgi = tarihBilgi(tarihStr);
    return bilgi.some(function(b) {
      return b.tip === 'resmi' || b.tip === 'dini' || b.tip === 'adli';
    });
  }

  return {
    tarihBilgi: tarihBilgi,
    ayTatilleri: ayTatilleri,
    tatilMi: tatilMi
  };
})();
