// ================================================================
// EMD HUKUK — FİNANS MOTORU
// js/modules/finansMotoru.js
// Saf hesaplama modülü — DOM erişimi yok, side effect yok
// Tüm finansal verileri dosya bazlı kaynaklardan okur, kopyalamaz
// ================================================================

var FinansMotoru = (function() {
  'use strict';

  // ── Yardımcı: tarih filtresi ──────────────────────────────────
  function _tarihPrefix(yil, ay) {
    if (yil && ay >= 0) return yil + '-' + String(ay + 1).padStart(2, '0');
    if (yil) return String(yil);
    return '';
  }

  function _tarihUygun(tarih, prefix) {
    if (!prefix) return true;
    if (!tarih) return false;
    return tarih.startsWith(prefix);
  }

  // ── Yardımcı: dosya listelerini müvekkile göre filtrele ──────
  function _muvDavalar(muvId) {
    return (state.davalar || []).filter(function(d) { return d.muvId === muvId; });
  }
  function _muvIcralar(muvId) {
    return (state.icra || []).filter(function(i) { return i.muvId === muvId; });
  }
  function _muvDanismanliklar(muvId) {
    return (state.danismanlik || []).filter(function(d) { return d.muvId === muvId; });
  }
  function _muvArabuluculuklar(muvId) {
    return (state.arabuluculuk || []).filter(function(a) { return a.muvId === muvId; });
  }
  function _muvAvanslar(muvId) {
    return (state.avanslar || []).filter(function(a) {
      return a.muvId === muvId && !a._otoHarcama; // _otoHarcama olanlar eski sync artığı
    });
  }

  // ── Tek dosya masraf toplamı ──────────────────────────────────
  function _dosyaMasrafToplam(obj) {
    return (obj.harcamalar || []).reduce(function(s, h) {
      return s + (parseFloat(h.tutar) || 0);
    }, 0);
  }

  // ── Tek dosya tahsilat detayı ─────────────────────────────────
  function _dosyaTahsilatDetay(obj) {
    var thList = obj.tahsilatlar || [];
    var karsiTaraf = 0, akdiVekalet = 0, hakedis = 0, aktarim = 0, iade = 0;

    thList.forEach(function(t) {
      var tutar = parseFloat(t.tutar) || 0;
      if (t.tur === 'tahsilat') karsiTaraf += tutar;
      else if (t.tur === 'akdi_vekalet') akdiVekalet += tutar;
      else if (t.tur === 'hakediş') hakedis += tutar;
      else if (t.tur === 'aktarim') aktarim += tutar;
      else if (t.tur === 'iade') iade += tutar;
    });

    return {
      karsiTaraf: karsiTaraf,
      akdiVekalet: akdiVekalet,
      hakedis: hakedis,
      aktarim: aktarim,
      iade: iade,
      hareketSayisi: thList.length
    };
  }

  // ── Tek dosya anlaşma bilgisi ─────────────────────────────────
  function _dosyaAnlasma(obj) {
    var an = obj.anlasma || {};
    if (!an.tur) return { tur: '', anlasilanToplam: 0 };

    var anlasilanToplam = 0;
    if (an.tur === 'pesin' || an.tur === 'taksit') {
      anlasilanToplam = parseFloat(an.ucret) || 0;
    } else if (an.tur === 'basari' || an.tur === 'tahsilat') {
      var baz = parseFloat(an.baz) || parseFloat(obj.alacak) || parseFloat(obj.deger) || 0;
      anlasilanToplam = (baz * (parseFloat(an.yuzde) || 0)) / 100;
    } else if (an.tur === 'karma') {
      var bazK = parseFloat(an.baz) || parseFloat(obj.alacak) || parseFloat(obj.deger) || 0;
      anlasilanToplam = (parseFloat(an.karmaP) || 0) + ((bazK * (parseFloat(an.karmaYuzde) || 0)) / 100);
    }

    return {
      tur: an.tur,
      anlasilanToplam: anlasilanToplam,
      yuzde: parseFloat(an.yuzde) || parseFloat(an.karmaYuzde) || 0
    };
  }

  // ================================================================
  // DOSYA BAZLI ÖZET
  // ================================================================
  function dosyaOzet(dosyaTur, dosyaId) {
    var obj = null;
    if (dosyaTur === 'dava') {
      obj = (state.davalar || []).find(function(d) { return d.id === dosyaId; });
    } else if (dosyaTur === 'icra') {
      obj = (state.icra || []).find(function(i) { return i.id === dosyaId; });
    }
    if (!obj) return null;

    var masraf = _dosyaMasrafToplam(obj);
    var th = _dosyaTahsilatDetay(obj);
    var an = _dosyaAnlasma(obj);

    return {
      dosyaId: dosyaId,
      dosyaTur: dosyaTur,
      dosyaNo: obj.no || '',
      muvId: obj.muvId || '',
      masraf: masraf,
      tahsilat: th,
      anlasma: an,
      // Kârlılık: büro için net gelir (hakediş + akdi vekalet - dosya masrafları)
      buroGelir: th.hakedis + th.akdiVekalet,
      buroNet: th.hakedis + th.akdiVekalet - masraf
    };
  }

  // ================================================================
  // MÜVEKKİL BAZLI ÖZET
  // ================================================================
  function muvekkilOzet(muvId) {
    var davalar = _muvDavalar(muvId);
    var icralar = _muvIcralar(muvId);
    var danismanliklar = _muvDanismanliklar(muvId);
    var avanslar = _muvAvanslar(muvId);

    // ── Masraflar ───────────────────────────────────────────────
    var masrafToplam = 0;
    var masrafDetay = [];

    davalar.forEach(function(d) {
      var m = _dosyaMasrafToplam(d);
      masrafToplam += m;
      if (m > 0) masrafDetay.push({ dosyaId: d.id, dosyaTur: 'dava', dosyaNo: d.no, tutar: m });
    });
    icralar.forEach(function(i) {
      var m = _dosyaMasrafToplam(i);
      masrafToplam += m;
      if (m > 0) masrafDetay.push({ dosyaId: i.id, dosyaTur: 'icra', dosyaNo: i.no, tutar: m });
    });

    // ── Avanslar ────────────────────────────────────────────────
    var avansAlinan = 0, avansBekleyen = 0;
    avanslar.forEach(function(a) {
      var tutar = parseFloat(a.tutar) || 0;
      if (a.tur === 'Avans Alındı' && a.durum !== 'Bekliyor') avansAlinan += tutar;
      if (a.durum === 'Bekliyor') avansBekleyen += tutar;
    });

    // ── Tahsilatlar (tüm dosyalardan) ───────────────────────────
    var topKarsiTaraf = 0, topAkdiVekalet = 0, topHakedis = 0;
    var topAktarim = 0, topIade = 0;
    var dosyalar = [];

    function isleDosy(obj, tur) {
      var th = _dosyaTahsilatDetay(obj);
      var an = _dosyaAnlasma(obj);
      var masraf = _dosyaMasrafToplam(obj);

      topKarsiTaraf += th.karsiTaraf;
      topAkdiVekalet += th.akdiVekalet;
      topHakedis += th.hakedis;
      topAktarim += th.aktarim;
      topIade += th.iade;

      dosyalar.push({
        dosyaId: obj.id,
        dosyaTur: tur,
        dosyaNo: obj.no || '',
        masraf: masraf,
        karsiTaraf: th.karsiTaraf,
        akdiVekalet: th.akdiVekalet,
        hakedis: th.hakedis,
        aktarim: th.aktarim,
        iade: th.iade,
        anlasma: an
      });
    }

    davalar.forEach(function(d) { isleDosy(d, 'dava'); });
    icralar.forEach(function(i) { isleDosy(i, 'icra'); });

    // ── Vekalet Ücreti Hesaplama ────────────────────────────────
    var anlasilanAkdiToplam = 0;
    dosyalar.forEach(function(df) {
      if (df.anlasma.tur === 'pesin' || df.anlasma.tur === 'taksit') {
        anlasilanAkdiToplam += df.anlasma.anlasilanToplam;
      }
    });

    // ── Danışmanlık gelirleri ───────────────────────────────────
    var danismanlikGeliri = 0;
    danismanliklar.forEach(function(d) {
      danismanlikGeliri += parseFloat(d.tahsilEdildi) || 0;
    });

    // ── Bakiye Hesaplamaları ────────────────────────────────────
    var masrafBakiye = avansAlinan - masrafToplam; // + ise avans fazlası, - ise alacağımız
    var tahsilatBakiye = topKarsiTaraf - topHakedis - topAktarim - topIade; // müvekkile aktarılacak
    var vekaletBakiye = anlasilanAkdiToplam - topAkdiVekalet; // kalan vekalet alacağı
    var genelBakiye = (topAkdiVekalet + topHakedis + avansAlinan + danismanlikGeliri)
                    - (masrafToplam + topAktarim + topIade);

    return {
      muvId: muvId,
      masraflar: { toplam: masrafToplam, detay: masrafDetay },
      avanslar: { alinan: avansAlinan, bekleyen: avansBekleyen, kalan: masrafBakiye },
      tahsilatlar: { karsiTaraf: topKarsiTaraf, toplam: topKarsiTaraf + topAkdiVekalet + topHakedis },
      vekaletUcreti: {
        akdi: { anlasilanToplam: anlasilanAkdiToplam, tahsilEdilen: topAkdiVekalet, kalan: vekaletBakiye },
        hakedis: { toplam: topHakedis }
      },
      aktarimlar: { toplam: topAktarim },
      iadeler: { toplam: topIade },
      danismanlik: { gelir: danismanlikGeliri },
      bakiye: {
        masrafBakiye: masrafBakiye,
        tahsilatBakiye: tahsilatBakiye,
        vekaletBakiye: vekaletBakiye,
        genelBakiye: genelBakiye
      },
      dosyalar: dosyalar
    };
  }

  // ================================================================
  // MÜVEKKİL CARİ EKSTRE
  // ================================================================
  function muvekkilCari(muvId) {
    var islemler = [];

    // Dava ve İcra harcamaları
    function harcEkle(obj, tur) {
      (obj.harcamalar || []).forEach(function(h) {
        islemler.push({
          id: h.id, tarih: h.tarih, islemTuru: 'masraf', yon: 'borc',
          tutar: parseFloat(h.tutar) || 0,
          acik: (h.kat || 'Harcama') + (h.acik ? ' — ' + h.acik : ''),
          dosyaNo: obj.no || '', dosyaTur: tur, dosyaId: obj.id
        });
      });
    }

    // Dava ve İcra tahsilatları
    function tahsilatEkle(obj, tur) {
      (obj.tahsilatlar || []).forEach(function(t) {
        var yon = (t.tur === 'aktarim' || t.tur === 'iade') ? 'borc' : 'alacak';
        islemler.push({
          id: t.id, tarih: t.tarih, islemTuru: t.tur, yon: yon,
          tutar: parseFloat(t.tutar) || 0,
          acik: t.acik || '',
          dosyaNo: obj.no || '', dosyaTur: tur, dosyaId: obj.id
        });
      });
    }

    _muvDavalar(muvId).forEach(function(d) { harcEkle(d, 'dava'); tahsilatEkle(d, 'dava'); });
    _muvIcralar(muvId).forEach(function(i) { harcEkle(i, 'icra'); tahsilatEkle(i, 'icra'); });

    // Avanslar
    _muvAvanslar(muvId).forEach(function(a) {
      var yon = (a.tur === 'Avans Alındı') ? 'alacak' : 'borc';
      islemler.push({
        id: a.id, tarih: a.tarih, islemTuru: 'avans', yon: yon,
        tutar: parseFloat(a.tutar) || 0,
        acik: a.acik || a.tur || '',
        dosyaNo: a.dosyaNo || '', dosyaTur: '', dosyaId: ''
      });
    });

    // Danışmanlık tahsilatları
    _muvDanismanliklar(muvId).forEach(function(d) {
      var tahsil = parseFloat(d.tahsilEdildi) || 0;
      if (tahsil > 0) {
        islemler.push({
          id: d.id + '_tahsil', tarih: d.tarih, islemTuru: 'danismanlik', yon: 'alacak',
          tutar: tahsil,
          acik: 'Danışmanlık ücreti — ' + (d.konu || d.tur || ''),
          dosyaNo: '', dosyaTur: 'danismanlik', dosyaId: d.id
        });
      }
    });

    // Eski buroGiderleri'ndeki müvekkil bağlantılı kayıtlar (migrasyon sonrası kalabilir)
    (state.buroGiderleri || []).forEach(function(bg) {
      if (bg.muvId === muvId) {
        islemler.push({
          id: bg.id, tarih: bg.tarih, islemTuru: 'buro_gider', yon: 'borc',
          tutar: parseFloat(bg.tutar) || 0,
          acik: bg.aciklama || bg.kategori || '',
          dosyaNo: '', dosyaTur: '', dosyaId: ''
        });
      }
    });

    // Tarihe göre sırala (en yeni üstte)
    islemler.sort(function(a, b) { return (b.tarih || '').localeCompare(a.tarih || ''); });

    // Çalışan bakiye (running balance) — alttan üste
    var calisan = 0;
    var reversed = islemler.slice().reverse();
    reversed.forEach(function(i) {
      if (i.yon === 'alacak') calisan += i.tutar;
      else calisan -= i.tutar;
      i._bakiye = calisan;
    });

    return islemler;
  }

  // ================================================================
  // BÜRO KÂR/ZARAR HESAPLAMASI
  // ================================================================
  function buroKarZarar(filtre) {
    filtre = filtre || {};
    var yil = filtre.yil || '';
    var ay = filtre.ay !== undefined ? filtre.ay : -1;
    var prefix = _tarihPrefix(yil, ay);

    // ── GELİRLER ────────────────────────────────────────────────
    var akdiVekaletUcreti = 0;
    var karsiVekaletHakedis = 0;
    var danismanlikGeliri = 0;
    var arabuluculukGeliri = 0;
    var digerGelir = 0;

    // Dava ve İcra tahsilatlarından gelirler
    function dosyaGelirTara(list) {
      list.forEach(function(obj) {
        (obj.tahsilatlar || []).forEach(function(t) {
          if (!_tarihUygun(t.tarih, prefix)) return;
          var tutar = parseFloat(t.tutar) || 0;
          if (t.tur === 'akdi_vekalet') akdiVekaletUcreti += tutar;
          else if (t.tur === 'hakediş') karsiVekaletHakedis += tutar;
          // tahsilat ve aktarim/iade gelir değil (tahsilat müvekkile ait, aktarım gider)
        });
      });
    }
    dosyaGelirTara(state.davalar || []);
    dosyaGelirTara(state.icra || []);

    // Danışmanlık gelirleri
    (state.danismanlik || []).forEach(function(d) {
      if (!_tarihUygun(d.tarih, prefix)) return;
      var tahsil = parseFloat(d.tahsilEdildi) || 0;
      if (tahsil > 0) danismanlikGeliri += tahsil;
    });

    // Arabuluculuk (toplantı tutarları)
    (state.arabuluculuk || []).forEach(function(a) {
      if (!_tarihUygun(a.tarih, prefix)) return;
      (a.toplanti || []).forEach(function(t) {
        var tutar = parseFloat(t.tutar) || 0;
        if (tutar > 0) arabuluculukGeliri += tutar;
      });
    });

    // Fatura gelirleri (ödendi durumundakiler)
    (state.faturalar || []).forEach(function(f) {
      if (f.durum !== 'odendi') return;
      if (!_tarihUygun(f.tarih, prefix)) return;
      digerGelir += parseFloat(f.genelToplam) || 0;
    });

    var toplamGelir = akdiVekaletUcreti + karsiVekaletHakedis + danismanlikGeliri + arabuluculukGeliri + digerGelir;

    // ── GİDERLER ────────────────────────────────────────────────
    // NOT: Dosya masrafları (müvekkil adına yapılan harç, bilirkişi vb.) büronun
    // kendi gideri DEĞİLDİR. Bunlar emanet niteliğindedir — müvekkilden masraf
    // avansı alınır, artan kısım iade edilir, eksik kısım talep edilir.
    // Bu nedenle dosya masrafları büro kâr/zarar hesabına dahil edilmez.

    // Büro giderleri (kategorilere göre)
    var buroKat = {
      'Kira & Aidat': 0,
      'Stopaj & Vergi': 0,
      'Muhasebeci / Mali Müşavir': 0,
      'Çalışan Ücretleri': 0,
      'Temizlik & Bakım': 0,
      'Kırtasiye & Sarf Malzeme': 0,
      'Teknoloji': 0,
      'Ulaşım & Araç': 0,
      'Sigorta': 0,
      'Mesleki Gelişim': 0,
      'Diğer Genel Gider': 0
    };
    var buroGiderToplam = 0;

    (state.buroGiderleri || []).forEach(function(bg) {
      if (!_tarihUygun(bg.tarih, prefix)) return;
      var tutar = parseFloat(bg.tutar) || 0;
      var kat = bg.kategori || 'Diğer Genel Gider';
      if (buroKat[kat] !== undefined) buroKat[kat] += tutar;
      else buroKat['Diğer Genel Gider'] += tutar;
      buroGiderToplam += tutar;
    });

    // Müvekkile aktarımlar — büro gideri değil (müvekkilin parasını iade ediyoruz)
    // Ancak kâr/zarar raporunda gösterilmez çünkü bu büronun geliri/gideri değil

    var toplamGider = buroGiderToplam;
    var net = toplamGelir - toplamGider;

    return {
      gelirler: {
        akdiVekaletUcreti: akdiVekaletUcreti,
        karsiVekaletHakedis: karsiVekaletHakedis,
        danismanlikGeliri: danismanlikGeliri,
        arabuluculukGeliri: arabuluculukGeliri,
        digerGelir: digerGelir,
        toplam: toplamGelir
      },
      giderler: {
        buroGiderleri: buroKat,
        buroGiderToplam: buroGiderToplam,
        toplam: toplamGider
      },
      net: net,
      karZararOrani: toplamGelir > 0 ? Math.round((net / toplamGelir) * 100) : 0
    };
  }

  // ── Aylık detay (12 ay) ───────────────────────────────────────
  function buroAylikDetay(yil) {
    yil = yil || new Date().getFullYear().toString();
    var aylar = [];
    var kumulatif = 0;

    for (var i = 0; i < 12; i++) {
      var ayKZ = buroKarZarar({ yil: yil, ay: i });
      kumulatif += ayKZ.net;
      aylar.push({
        ay: i,
        gelir: ayKZ.gelirler.toplam,
        gider: ayKZ.giderler.toplam,
        net: ayKZ.net,
        kumulatif: kumulatif
      });
    }

    return aylar;
  }

  // ================================================================
  // FİNANSAL UYARILAR
  // ================================================================
  function hesaplaUyarilar() {
    var uyarilar = [];
    var bugun = new Date().toISOString().split('T')[0];

    (state.muvekkillar || []).forEach(function(m) {
      var ozet = muvekkilOzet(m.id);

      // 1. Masraf avansı tükendi / eksi bakiye
      if (ozet.bakiye.masrafBakiye < -100) { // ₺100'den fazla alacak varsa
        uyarilar.push({
          tur: 'masraf_avans',
          oncelik: 'yuksek',
          muvId: m.id,
          muvAd: m.ad,
          mesaj: m.ad + ' — Masraf avansı tükendi. ' + fmt(Math.abs(ozet.bakiye.masrafBakiye)) + ' alacağınız var.',
          tutar: Math.abs(ozet.bakiye.masrafBakiye),
          icon: '⚠️'
        });
      }

      // 2. Vekalet ücreti bakiyesi (kalan alacak)
      if (ozet.bakiye.vekaletBakiye > 100) {
        // Son akdi_vekalet ödemesinin tarihine bak
        var sonOdeme = null;
        ozet.dosyalar.forEach(function(df) {
          var obj = df.dosyaTur === 'dava'
            ? (state.davalar || []).find(function(d) { return d.id === df.dosyaId; })
            : (state.icra || []).find(function(i) { return i.id === df.dosyaId; });
          if (!obj) return;
          (obj.tahsilatlar || []).filter(function(t) { return t.tur === 'akdi_vekalet'; }).forEach(function(t) {
            if (!sonOdeme || t.tarih > sonOdeme) sonOdeme = t.tarih;
          });
        });

        if (sonOdeme) {
          var gunFark = Math.floor((new Date(bugun) - new Date(sonOdeme)) / 86400000);
          if (gunFark > 30) {
            uyarilar.push({
              tur: 'vekalet_gecikme',
              oncelik: 'yuksek',
              muvId: m.id,
              muvAd: m.ad,
              mesaj: m.ad + ' — ' + fmt(ozet.bakiye.vekaletBakiye) + ' vekalet ücreti bakiyesi ' + gunFark + ' gündür ödenmedi.',
              tutar: ozet.bakiye.vekaletBakiye,
              icon: '⏰'
            });
          }
        }
      }

      // 3. Aktarım bekleyen tutar
      if (ozet.bakiye.tahsilatBakiye > 100) {
        uyarilar.push({
          tur: 'aktarim_bekliyor',
          oncelik: 'orta',
          muvId: m.id,
          muvAd: m.ad,
          mesaj: m.ad + ' — ' + fmt(ozet.bakiye.tahsilatBakiye) + ' aktarım bekliyor.',
          tutar: ozet.bakiye.tahsilatBakiye,
          icon: '📤'
        });
      }
    });

    // 4. Fatura vadesi geçmiş/yaklaşıyor
    (state.faturalar || []).forEach(function(f) {
      if (f.durum !== 'bekliyor' && f.durum !== 'gecikti') return;
      if (!f.vade) return;
      var gunFark = Math.floor((new Date(f.vade) - new Date(bugun)) / 86400000);
      if (gunFark < 0) {
        uyarilar.push({
          tur: 'fatura_gecikti',
          oncelik: 'yuksek',
          muvId: f.muvId,
          muvAd: typeof getMuvAd === 'function' ? getMuvAd(f.muvId) : '',
          mesaj: 'Fatura #' + f.no + ' — ' + fmt(f.genelToplam) + ' vadesi ' + Math.abs(gunFark) + ' gün geçti.',
          tutar: f.genelToplam,
          icon: '🔴'
        });
      } else if (gunFark <= 7) {
        uyarilar.push({
          tur: 'fatura_yaklasıyor',
          oncelik: 'orta',
          muvId: f.muvId,
          muvAd: typeof getMuvAd === 'function' ? getMuvAd(f.muvId) : '',
          mesaj: 'Fatura #' + f.no + ' — ' + fmt(f.genelToplam) + ' vadesi ' + gunFark + ' gün sonra.',
          tutar: f.genelToplam,
          icon: '⏳'
        });
      }
    });

    // 5. Yüksek masraf uyarısı (dosya bazlı)
    var masrafEsik = 10000;
    (state.davalar || []).forEach(function(d) {
      var m = _dosyaMasrafToplam(d);
      if (m > masrafEsik) {
        uyarilar.push({
          tur: 'yuksek_masraf',
          oncelik: 'bilgi',
          muvId: d.muvId,
          muvAd: typeof getMuvAd === 'function' ? getMuvAd(d.muvId) : '',
          mesaj: 'Dava ' + (d.no || '') + ' — Masraflar ' + fmt(masrafEsik) + ' eşiğini aştı (' + fmt(m) + ').',
          tutar: m,
          icon: '💸'
        });
      }
    });

    // Önceliğe göre sırala
    var oncelikSira = { yuksek: 0, orta: 1, bilgi: 2 };
    uyarilar.sort(function(a, b) {
      return (oncelikSira[a.oncelik] || 2) - (oncelikSira[b.oncelik] || 2);
    });

    return uyarilar;
  }

  // ================================================================
  // DOSYA KÂRLILIK ANALİZİ
  // ================================================================
  function dosyaKarlilik(filtre) {
    filtre = filtre || {};
    var sonuclar = [];

    function isleDosy(obj, tur) {
      if (filtre.dosyaTur && filtre.dosyaTur !== tur) return;
      if (filtre.durum === 'aktif' && obj.durum !== 'Aktif' && obj.durum !== 'derdest') return;
      if (filtre.durum === 'tamamlanan' && obj.durum !== 'Kapandı' && obj.durum !== 'kapandi' && obj.durum !== 'Kazanıldı' && obj.durum !== 'Kaybedildi') return;

      var masraf = _dosyaMasrafToplam(obj);
      var th = _dosyaTahsilatDetay(obj);
      var gelir = th.akdiVekalet + th.hakedis;
      var net = gelir - masraf;

      sonuclar.push({
        dosyaId: obj.id,
        dosyaTur: tur,
        dosyaNo: obj.no || '',
        muvId: obj.muvId,
        muvAd: typeof getMuvAd === 'function' ? getMuvAd(obj.muvId) : '',
        konu: obj.konu || obj.borclu || '',
        masraf: masraf,
        gelir: gelir,
        net: net,
        karlilikOrani: gelir > 0 ? Math.round(((gelir - masraf) / gelir) * 100) : (masraf > 0 ? -100 : 0),
        durum: obj.durum || ''
      });
    }

    (state.davalar || []).forEach(function(d) { isleDosy(d, 'dava'); });
    (state.icra || []).forEach(function(i) { isleDosy(i, 'icra'); });

    // Kârlılığa göre sırala (en kârlı üstte)
    sonuclar.sort(function(a, b) { return b.net - a.net; });

    // Özetler
    var topMasraf = sonuclar.reduce(function(s, d) { return s + d.masraf; }, 0);
    var topGelir = sonuclar.reduce(function(s, d) { return s + d.gelir; }, 0);
    var topNet = sonuclar.reduce(function(s, d) { return s + d.net; }, 0);
    var ortKarlilik = topGelir > 0 ? Math.round(((topGelir - topMasraf) / topGelir) * 100) : 0;

    // Müvekkil bazlı toplam
    var muvMap = {};
    sonuclar.forEach(function(d) {
      if (!muvMap[d.muvId]) muvMap[d.muvId] = { muvAd: d.muvAd, net: 0, dosyaSayisi: 0 };
      muvMap[d.muvId].net += d.net;
      muvMap[d.muvId].dosyaSayisi++;
    });
    var muvKarlilik = Object.keys(muvMap).map(function(k) {
      return { muvId: k, muvAd: muvMap[k].muvAd, net: muvMap[k].net, dosyaSayisi: muvMap[k].dosyaSayisi };
    }).sort(function(a, b) { return b.net - a.net; });

    // Dosya türü (konu) bazlı kârlılık
    var konuMap = {};
    sonuclar.forEach(function(d) {
      var k = d.konu || 'Belirtilmemiş';
      if (!konuMap[k]) konuMap[k] = { konu: k, gelir: 0, masraf: 0, net: 0, dosyaSayisi: 0 };
      konuMap[k].gelir += d.gelir;
      konuMap[k].masraf += d.masraf;
      konuMap[k].net += d.net;
      konuMap[k].dosyaSayisi++;
    });
    var konuKarlilik = Object.keys(konuMap).map(function(k) {
      var o = konuMap[k];
      o.karlilikOrani = o.gelir > 0 ? Math.round(((o.gelir - o.masraf) / o.gelir) * 100) : 0;
      return o;
    }).sort(function(a, b) { return b.net - a.net; });

    return {
      dosyalar: sonuclar,
      ozet: { topMasraf: topMasraf, topGelir: topGelir, topNet: topNet, ortKarlilik: ortKarlilik, dosyaSayisi: sonuclar.length },
      muvekkilKarlilik: muvKarlilik,
      konuKarlilik: konuKarlilik
    };
  }

  // ================================================================
  // BEKLENEN GELİR TAKVİMİ
  // ================================================================
  function beklenenGelir() {
    var beklenenler = [];
    var bugun = new Date().toISOString().split('T')[0];

    // 1. Taksitli vekalet ücretleri — son ödeme + taksit aralığından hesapla
    function taksitTara(obj, tur) {
      var an = obj.anlasma || {};
      if (an.tur !== 'taksit' || !an.ucret) return;

      var toplam = parseFloat(an.ucret) || 0;
      var odenenler = (obj.tahsilatlar || []).filter(function(t) { return t.tur === 'akdi_vekalet'; });
      var odenen = odenenler.reduce(function(s, t) { return s + (parseFloat(t.tutar) || 0); }, 0);
      var kalan = toplam - odenen;
      if (kalan <= 0) return;

      // Tahmini taksit tutarı ve sonraki tarih
      var taksitSayisi = parseFloat(an.taksitSayisi) || 6;
      var taksitTutar = toplam / taksitSayisi;
      var sonOdeme = odenenler.length > 0
        ? odenenler.sort(function(a, b) { return b.tarih.localeCompare(a.tarih); })[0].tarih
        : (obj.tarih || bugun);

      // Sonraki ödeme tarihi: son ödeme + 30 gün
      var sonOdemeTarih = new Date(sonOdeme);
      sonOdemeTarih.setDate(sonOdemeTarih.getDate() + 30);
      var tahminiTarih = sonOdemeTarih.toISOString().split('T')[0];

      var odemeSira = odenenler.length + 1;

      beklenenler.push({
        tur: 'vekalet_taksit',
        tarih: tahminiTarih,
        tutar: Math.min(taksitTutar, kalan),
        acik: (typeof getMuvAd === 'function' ? getMuvAd(obj.muvId) : '') + ' — Vekâlet taksiti (' + odemeSira + '/' + taksitSayisi + ')',
        dosyaNo: obj.no || '',
        muvId: obj.muvId,
        kesinlik: 'tahmini',
        gecikmisMi: tahminiTarih < bugun
      });
    }

    (state.davalar || []).forEach(function(d) { taksitTara(d, 'dava'); });
    (state.icra || []).forEach(function(i) { taksitTara(i, 'icra'); });

    // 2. Ödenmemiş faturalar
    (state.faturalar || []).forEach(function(f) {
      if (f.durum !== 'bekliyor' && f.durum !== 'gecikti') return;
      beklenenler.push({
        tur: 'fatura',
        tarih: f.vade || f.tarih,
        tutar: parseFloat(f.genelToplam) || 0,
        acik: 'Fatura #' + f.no + ' — ' + (typeof getMuvAd === 'function' ? getMuvAd(f.muvId) : ''),
        dosyaNo: '',
        muvId: f.muvId,
        kesinlik: 'kesin',
        gecikmisMi: (f.vade || f.tarih) < bugun
      });
    });

    // 3. Bekleyen avans ödemeleri
    (state.avanslar || []).forEach(function(a) {
      if (a.durum !== 'Bekliyor') return;
      if (a._otoHarcama) return;
      beklenenler.push({
        tur: 'avans',
        tarih: a.odeme || '',
        tutar: parseFloat(a.tutar) || 0,
        acik: (typeof getMuvAd === 'function' ? getMuvAd(a.muvId) : '') + ' — ' + (a.tur || 'Avans'),
        dosyaNo: a.dosyaNo || '',
        muvId: a.muvId,
        kesinlik: 'tahmini',
        gecikmisMi: a.odeme ? a.odeme < bugun : false
      });
    });

    // Tarihe göre sırala
    beklenenler.sort(function(a, b) { return (a.tarih || '9').localeCompare(b.tarih || '9'); });

    // Özetler
    var topTutar = beklenenler.reduce(function(s, b) { return s + b.tutar; }, 0);
    var gecikmisTutar = beklenenler.filter(function(b) { return b.gecikmisMi; }).reduce(function(s, b) { return s + b.tutar; }, 0);
    var gecikmisAdet = beklenenler.filter(function(b) { return b.gecikmisMi; }).length;

    // Önümüzdeki 3 ay
    var ucAySonra = new Date();
    ucAySonra.setMonth(ucAySonra.getMonth() + 3);
    var ucAyStr = ucAySonra.toISOString().split('T')[0];
    var ucAyToplam = beklenenler.filter(function(b) {
      return b.tarih && b.tarih >= bugun && b.tarih <= ucAyStr;
    }).reduce(function(s, b) { return s + b.tutar; }, 0);

    return {
      beklenenler: beklenenler,
      ozet: {
        topTutar: topTutar,
        gecikmisTutar: gecikmisTutar,
        gecikmisAdet: gecikmisAdet,
        ucAyToplam: ucAyToplam
      }
    };
  }

  // ================================================================
  // RPC WRAPPER'LAR (async — server-first, local fallback)
  // Next.js geçişinde tüm çağrılar bunlara dönüşecek
  // ================================================================
  async function muvekkilOzetRpc(muvId) {
    if (typeof sb !== 'undefined' && sb && typeof currentBuroId !== 'undefined' && currentBuroId) {
      try {
        var res = await sb.rpc('finans_muvekkil_ozet', { p_buro_id: currentBuroId, p_muv_id: muvId });
        if (!res.error && res.data) return res.data;
      } catch(e) { /* fallback */ }
    }
    return muvekkilOzet(muvId);
  }

  async function dosyaOzetRpc(dosyaTur, dosyaId) {
    if (typeof sb !== 'undefined' && sb && typeof currentBuroId !== 'undefined' && currentBuroId) {
      try {
        var res = await sb.rpc('finans_dosya_ozet', { p_buro_id: currentBuroId, p_dosya_tur: dosyaTur, p_dosya_id: dosyaId });
        if (!res.error && res.data) return res.data;
      } catch(e) { /* fallback */ }
    }
    return dosyaOzet(dosyaTur, dosyaId);
  }

  async function buroKarZararRpc(filtre) {
    filtre = filtre || {};
    if (typeof sb !== 'undefined' && sb && typeof currentBuroId !== 'undefined' && currentBuroId) {
      try {
        var res = await sb.rpc('finans_buro_kar_zarar', {
          p_buro_id: currentBuroId,
          p_yil: filtre.yil ? parseInt(filtre.yil) : null,
          p_ay: filtre.ay !== undefined ? filtre.ay : null
        });
        if (!res.error && res.data) return res.data;
      } catch(e) { /* fallback */ }
    }
    return buroKarZarar(filtre);
  }

  async function dosyaKarlilikRpc(filtre) {
    if (typeof sb !== 'undefined' && sb && typeof currentBuroId !== 'undefined' && currentBuroId) {
      try {
        var res = await sb.rpc('finans_dosya_karlilik', { p_buro_id: currentBuroId, p_filtre: filtre || {} });
        if (!res.error && res.data) return res.data;
      } catch(e) { /* fallback */ }
    }
    return dosyaKarlilik(filtre);
  }

  async function beklenenGelirRpc() {
    if (typeof sb !== 'undefined' && sb && typeof currentBuroId !== 'undefined' && currentBuroId) {
      try {
        var res = await sb.rpc('finans_beklenen_gelir', { p_buro_id: currentBuroId });
        if (!res.error && res.data) return res.data;
      } catch(e) { /* fallback */ }
    }
    return beklenenGelir();
  }

  async function hesaplaUyarilarRpc() {
    if (typeof sb !== 'undefined' && sb && typeof currentBuroId !== 'undefined' && currentBuroId) {
      try {
        var res = await sb.rpc('finans_uyarilar', { p_buro_id: currentBuroId });
        if (!res.error && res.data) return res.data;
      } catch(e) { /* fallback */ }
    }
    return hesaplaUyarilar();
  }

  // ================================================================
  // PUBLIC API
  // ================================================================
  return {
    // Senkron (local hesaplama — mevcut çağrıcılar)
    muvekkilOzet: muvekkilOzet,
    muvekkilCari: muvekkilCari,
    dosyaOzet: dosyaOzet,
    buroKarZarar: buroKarZarar,
    buroAylikDetay: buroAylikDetay,
    hesaplaUyarilar: hesaplaUyarilar,
    dosyaKarlilik: dosyaKarlilik,
    beklenenGelir: beklenenGelir,
    // Async RPC (server-first — Next.js ve gelecek kullanım)
    muvekkilOzetRpc: muvekkilOzetRpc,
    dosyaOzetRpc: dosyaOzetRpc,
    buroKarZararRpc: buroKarZararRpc,
    dosyaKarlilikRpc: dosyaKarlilikRpc,
    beklenenGelirRpc: beklenenGelirRpc,
    hesaplaUyarilarRpc: hesaplaUyarilarRpc
  };
})();
