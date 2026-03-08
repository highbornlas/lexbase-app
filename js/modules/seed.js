// ================================================================
// LEXBASE — DEMO VERİ ÜRETİCİ (SEED SİSTEMİ)
// js/modules/seed.js
//
// Türk hukuk sistemine uygun, gerçekçi, ilişkisel bütünlüğü
// tam demo veri seti üretir.
//
// Sıra: Müvekkiller → Karşı Taraflar → Vekillar → Davalar →
//       İcra → İhtarname → Arabuluculuk → Danışmanlık →
//       Harcamalar → Tahsilatlar → Avanslar → Finans İşlemleri →
//       Ücret Anlaşmaları → Görevler → Etkinlikler
// ================================================================

var LexSeed = (function () {

  // ── YARDIMCILAR ────────────────────────────────────────────
  function _uid() { return typeof uid === 'function' ? uid() : crypto.randomUUID(); }
  function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function _rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function _rndF(min, max) { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }
  function _pastDate(minDays, maxDays) {
    var d = new Date(); d.setDate(d.getDate() - _rnd(minDays, maxDays));
    return d.toISOString().split('T')[0];
  }
  function _futureDate(minDays, maxDays) {
    var d = new Date(); d.setDate(d.getDate() + _rnd(minDays, maxDays));
    return d.toISOString().split('T')[0];
  }
  function _today() { return new Date().toISOString().split('T')[0]; }

  // ── TÜRK HUKUK VERİ HAVUZLARI ─────────────────────────────
  var ERKEK_AD = ['Ahmet','Mehmet','Mustafa','Ali','Hüseyin','Hasan','İbrahim','Murat','Osman','Yusuf','Emre','Burak','Serkan','Tolga','Kaan','Baran','Cem','Deniz','Erkan','Fatih','Gökhan','Halil','İsmail','Kerem'];
  var KADIN_AD = ['Ayşe','Fatma','Zeynep','Elif','Merve','Esra','Selin','Gül','Derya','Hülya','Sibel','Pınar','Canan','Dilek','Ebru','Filiz','Gamze','Havva','İrem','Leyla','Melek','Nihan','Özge','Seda'];
  var SOYAD = ['Yılmaz','Kaya','Demir','Çelik','Şahin','Yıldız','Yıldırım','Öztürk','Aydın','Özdemir','Arslan','Doğan','Kılıç','Aslan','Çetin','Kara','Koç','Kurt','Erdoğan','Korkmaz','Acar','Bulut','Güneş','Tekin','Polat','Aktaş','Aksoy','Taş'];
  var SIRKET = ['Akdeniz İnşaat A.Ş.','Yıldız Holding','Boğaziçi Tekstil Ltd.Şti.','Marmara Lojistik A.Ş.','Trakya Gıda San. Tic. Ltd.Şti.','Ege Turizm A.Ş.','Anadolu Enerji A.Ş.','Karadeniz Madencilik Ltd.Şti.','İstanbul Yazılım A.Ş.','Bosphorus Trading Ltd.','Türk Metal Sanayi A.Ş.','Ankara Sigorta A.Ş.','Antalya Otelcilik A.Ş.','Konya Tarım Ürünleri A.Ş.','Bursa Otomotiv Yan San. Ltd.Şti.'];
  var IL = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Adana','Konya','Kayseri','Trabzon','Eskişehir'];
  var ADLIYE = ['Çağlayan','Kartal','Bakırköy','Kadıköy','Büyükçekmece','Anadolu','Küçükçekmece','Ankara Batı','Ankara','Bornova'];
  var MAH_TUR_HUKUK = ['Asliye Hukuk','Sulh Hukuk','Aile','Asliye Ticaret','Tüketici','İş'];
  var MAH_TUR_CEZA = ['Asliye Ceza','Sulh Ceza','Ağır Ceza'];
  var DAVA_KONU = [
    {konu:'İşe İade Talebi', mtur:'İş', asama:'İlk Derece'},
    {konu:'Kıdem ve İhbar Tazminatı', mtur:'İş', asama:'İlk Derece'},
    {konu:'Fazla Mesai Ücreti Alacağı', mtur:'İş', asama:'İstinaf'},
    {konu:'Boşanma Davası (Anlaşmalı)', mtur:'Aile', asama:'İlk Derece'},
    {konu:'Boşanma Davası (Çekişmeli)', mtur:'Aile', asama:'İlk Derece'},
    {konu:'Nafaka Artırım Davası', mtur:'Aile', asama:'İlk Derece'},
    {konu:'Velayet Davası', mtur:'Aile', asama:'İlk Derece'},
    {konu:'Maddi ve Manevi Tazminat', mtur:'Asliye Hukuk', asama:'İlk Derece'},
    {konu:'Alacak Davası (Ticari)', mtur:'Asliye Ticaret', asama:'İlk Derece'},
    {konu:'İtirazın İptali Davası', mtur:'Asliye Ticaret', asama:'İlk Derece'},
    {konu:'Kira Alacağı ve Tahliye', mtur:'Sulh Hukuk', asama:'İlk Derece'},
    {konu:'Ortaklığın Giderilmesi (İzale-i Şuyu)', mtur:'Sulh Hukuk', asama:'İlk Derece'},
    {konu:'Tüketici Hakem Heyeti İtirazı', mtur:'Tüketici', asama:'İlk Derece'},
    {konu:'Ayıplı Mal Tazminatı', mtur:'Tüketici', asama:'İlk Derece'},
    {konu:'Haksız Fesih Tazminatı', mtur:'İş', asama:'Yargıtay'},
    {konu:'Miras Paylaşımı', mtur:'Sulh Hukuk', asama:'İlk Derece'},
    {konu:'Tapu İptal ve Tescil', mtur:'Asliye Hukuk', asama:'İstinaf'},
    {konu:'Kat Mülkiyeti Uyuşmazlığı', mtur:'Sulh Hukuk', asama:'İlk Derece'},
    {konu:'İş Kazası Tazminatı', mtur:'İş', asama:'İlk Derece'},
    {konu:'Haksız Rekabet', mtur:'Asliye Ticaret', asama:'İlk Derece'},
  ];
  var ICRA_TUR = ['İlamlı İcra','İlamsız İcra','Kambiyo Senedi','İpoteğin Paraya Çevrilmesi','Nafaka İcrası'];
  var ICRA_ALACAK_TUR = ['Kira Alacağı','Borç / Senet','Tazminat','İşçilik Alacağı','Nafaka','Diğer'];
  var IHTAR_KONU = ['Kira borcunun ödenmesine ilişkin ihtarname','İş akdinin feshi bildirimi','Sözleşme ihlali nedeniyle tazminat talebi','Ayıplı mal iadesi ve bedel iadesi talebi','Tahliye ihtarnamesi','Alacak ihtarnamesi','Haksız işgal nedeniyle ecrimisil talebi','Marka ihlali ihtarnamesi','Komşuluk hukukuna aykırılık uyarısı','Devir sözleşmesine aykırılık bildirimi'];
  var NOTER = ['İstanbul 1. Noterliği','İstanbul 15. Noterliği','Kadıköy 3. Noterliği','Bakırköy 5. Noterliği','Ankara 7. Noterliği','İzmir 2. Noterliği','Bursa 4. Noterliği','Antalya 1. Noterliği'];
  var ARAB_KONU = ['İşçi alacağı uyuşmazlığı','Kira uyuşmazlığı','Ticari alacak uyuşmazlığı','Tüketici uyuşmazlığı','Ortaklık uyuşmazlığı','Sigorta tazminatı uyuşmazlığı','Franchise sözleşme uyuşmazlığı','Hizmet bedeli uyuşmazlığı'];
  var DAN_TUR = ['Hukuki Danışmanlık','Sözleşme İncelemesi','Şirket Kuruluşu','Vergi Danışmanlığı','İş Hukuku Danışmanlığı','Gayrimenkul Danışmanlığı','Fikri Mülkiyet','KVKK Uyum'];
  var HARC_KAT = ['Harç / Pul','Tebligat','Bilirkişi Ücreti','Ulaşım','Fotokopi / Baskı','Tercüme','Keşif','Diğer'];
  var TODO_BASLIK = ['Dilekçe hazırla','Duruşmaya katıl','Bilirkişi raporunu incele','Müvekkil ile görüşme','Karşı taraf vekiline cevap yaz','Mahkeme kararını tebliğ et','İstinaf dilekçesi hazırla','Tanık listesi sun','Dosyayı incele ve özet çıkar','Ödeme emrine itiraz et','Haciz talebi hazırla','İcra müdürlüğüne başvur','Arabuluculuk toplantısına katıl','Sözleşme taslağını gözden geçir','UYAP üzerinden dosya takibi yap'];

  // ── TC Kimlik No üretici (geçerli format) ──────────────────
  function _tc() {
    var digits = [_rnd(1,9)];
    for(var i=1;i<9;i++) digits.push(_rnd(0,9));
    var d10 = ((digits[0]+digits[2]+digits[4]+digits[6]+digits[8])*7 - (digits[1]+digits[3]+digits[5]+digits[7])) % 10;
    if(d10<0) d10+=10;
    digits.push(d10);
    var d11 = 0; for(var j=0;j<10;j++) d11+=digits[j]; d11=d11%10;
    digits.push(d11);
    return digits.join('');
  }
  function _tel() { return '(5' + _rnd(0,5) + _rnd(0,9) + ') ' + _rnd(100,999) + ' ' + _rnd(10,99) + ' ' + _rnd(10,99); }
  function _mail(ad,soyad) { return (ad+'.'+soyad).toLowerCase().replace(/[ıİğĞüÜşŞöÖçÇ ]/g,function(c){return{ı:'i',İ:'i',ğ:'g',Ğ:'g',ü:'u',Ü:'u',ş:'s',Ş:'s',ö:'o',Ö:'o',ç:'c',Ç:'c',' ':''}[c]||c;}) + '@' + _pick(['gmail.com','hotmail.com','outlook.com','yahoo.com','icloud.com']); }
  function _vergiNo() { return String(_rnd(1000000000,9999999999)); }

  // ── İlerleme bildirimi ─────────────────────────────────────
  var _progressEl = null;
  function _progress(mesaj) {
    if(!_progressEl) _progressEl = document.getElementById('seed-progress');
    if(_progressEl) _progressEl.innerHTML += '<div style="font-size:12px;color:var(--text-muted);margin:2px 0">✓ ' + mesaj + '</div>';
    console.log('[LexSeed] ' + mesaj);
  }

  // ================================================================
  // ANA SEED FONKSİYONU
  // ================================================================
  async function calistir() {
    _progressEl = document.getElementById('seed-progress');
    if(_progressEl) _progressEl.innerHTML = '';

    _progress('Demo veri üretimi başlıyor...');

    // ── 1. TEMİZLE ──
    _progress('Mevcut veriler temizleniyor...');
    state.muvekkillar = [];
    state.karsiTaraflar = [];
    state.vekillar = [];
    state.davalar = [];
    state.icra = [];
    state.ihtarnameler = [];
    state.arabuluculuk = [];
    state.danismanlik = [];
    state.avanslar = [];
    state.butce = [];
    state.etkinlikler = [];
    state.todolar = [];
    state.finansIslemler = [];
    state.ucretAnlasmalari = [];
    state.belgeler = [];
    state.faturalar = [];
    state.sureler = [];
    state.logs = [];
    state.aktiviteLog = [];

    // ── 2. MÜVEKKİLLER (25 kişi: 18 gerçek + 7 tüzel) ──
    _progress('Müvekkiller oluşturuluyor (25)...');
    var muvIds = [];
    for (var m = 0; m < 18; m++) {
      var cinsiyet = m % 2 === 0 ? 'E' : 'K';
      var ad = cinsiyet === 'E' ? _pick(ERKEK_AD) : _pick(KADIN_AD);
      var soyad = _pick(SOYAD);
      var muv = {
        id: _uid(), sira: m + 1, ad: ad + ' ' + soyad, tip: 'gercek',
        tc: _tc(), tel: _tel(), mail: _mail(ad, soyad),
        adres: _pick(IL) + ', ' + _pick(['Kadıköy','Beşiktaş','Çankaya','Osmangazi','Muratpaşa','Seyhan','Selçuklu','Melikgazi','Ortahisar','Tepebaşı']) + ' / Türkiye',
        uyruk: 'tc', cinsiyet: cinsiyet === 'E' ? 'Erkek' : 'Kadın',
        bankalar: [], notlar: '',
      };
      state.muvekkillar.push(muv);
      muvIds.push(muv.id);
    }
    for (var mt = 0; mt < 7; mt++) {
      var sirket = SIRKET[mt];
      var muv2 = {
        id: _uid(), sira: 19 + mt, ad: sirket, tip: 'tuzel',
        vergiNo: _vergiNo(), tel: _tel(), mail: 'info@' + sirket.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12) + '.com.tr',
        adres: _pick(IL) + ', Merkez / Türkiye',
        yetkili: _pick(ERKEK_AD) + ' ' + _pick(SOYAD),
        bankalar: [], notlar: '',
      };
      state.muvekkillar.push(muv2);
      muvIds.push(muv2.id);
    }

    // ── 3. KARŞI TARAFLAR (30) ──
    _progress('Karşı taraflar oluşturuluyor (30)...');
    var ktIds = [];
    for (var k = 0; k < 20; k++) {
      var kAd = _pick(k%2===0?ERKEK_AD:KADIN_AD) + ' ' + _pick(SOYAD);
      var kt = { id: _uid(), sira: k + 1, ad: kAd, tip: 'gercek', tc: _tc(), tel: _tel() };
      state.karsiTaraflar.push(kt);
      ktIds.push(kt.id);
    }
    for (var kt2 = 0; kt2 < 10; kt2++) {
      var ktS = { id: _uid(), sira: 21 + kt2, ad: _pick(SIRKET).replace('A.Ş.', 'Ltd.Şti.'), tip: 'tuzel', vergiNo: _vergiNo(), tel: _tel() };
      state.karsiTaraflar.push(ktS);
      ktIds.push(ktS.id);
    }

    // ── 4. VEKİLLER (10) ──
    _progress('Avukatlar/Vekiller oluşturuluyor (10)...');
    var vekIds = [];
    for (var v = 0; v < 10; v++) {
      var vAd = 'Av. ' + _pick(v%2===0?ERKEK_AD:KADIN_AD) + ' ' + _pick(SOYAD);
      var vek = { id: _uid(), sira: v + 1, ad: vAd, tel: _tel(), mail: _mail(vAd.replace('Av. ',''), ''), baroSicil: _rnd(10000, 99999).toString(), baro: _pick(IL) + ' Barosu' };
      state.vekillar.push(vek);
      vekIds.push(vek.id);
    }

    // ── 5. DAVALAR (25) ──
    _progress('Dava dosyaları oluşturuluyor (25)...');
    var davaIds = [];
    for (var d = 0; d < 25; d++) {
      var dk = DAVA_KONU[d % DAVA_KONU.length];
      var yil = _rnd(2022, 2026);
      var il = _pick(IL);
      var dava = {
        id: _uid(), sira: d + 1,
        no: 'D-' + yil + '-' + String(d + 1).padStart(3, '0'),
        konu: dk.konu, muvId: muvIds[d % muvIds.length],
        il: il, adliye: _pick(ADLIYE), mtur: dk.mtur, mno: _rnd(1, 15) + '. ' + dk.mtur + ' Mahkemesi',
        esasYil: String(yil), esasNo: String(_rnd(100, 9999)),
        kararYil: '', kararNo: '', hakim: '',
        asama: dk.asama,
        durum: _pick(['Aktif', 'Aktif', 'Aktif', 'Devam Ediyor', 'Beklemede']),
        durumTag: _pick(['🟢 Akışında', '🟡 Beklemede', '🔵 İncelemede', '🟢 Akışında']),
        durumAciklama: _pick(['Bilirkişi raporu bekleniyor', 'Duruşma tarihi belirlendi', 'Tanık dinlenecek', 'Cevap dilekçesi hazırlanıyor', 'Dosya inceleniyor']),
        taraf: _pick(['Davacı', 'Davalı']),
        tarih: _pastDate(30, 365),
        durusma: _futureDate(5, 60),
        ktarih: '', kesin: '', icrano: '', derdest: 'derdest',
        deger: _rnd(5000, 500000),
        karsiId: ktIds[d % ktIds.length],
        karsi: state.karsiTaraflar[d % ktIds.length].ad,
        karsavId: vekIds[d % vekIds.length],
        karsav: state.vekillar[d % vekIds.length].ad,
        not: '',
        evraklar: [], notlar: [], harcamalar: [], tahsilatlar: [], anlasma: {},
      };
      // Harcamalar (2-4 per dava)
      for (var dh = 0; dh < _rnd(2, 4); dh++) {
        dava.harcamalar.push({
          id: _uid(), tarih: _pastDate(1, 180), tutar: _rndF(50, 2000),
          kat: _pick(HARC_KAT), acik: _pick(['Başvuru harcı', 'Tebligat gideri', 'Bilirkişi ücreti', 'Posta masrafı', 'Dosya fotokopisi'])
        });
      }
      state.davalar.push(dava);
      davaIds.push(dava.id);
    }

    // ── 6. İCRA (20) ──
    _progress('İcra dosyaları oluşturuluyor (20)...');
    var icraIds = [];
    for (var ic = 0; ic < 20; ic++) {
      var alacak = _rnd(5000, 300000);
      var tahsil = _rnd(0, Math.floor(alacak * 0.6));
      var icraIl = _pick(IL);
      var icraTur = _pick(ICRA_TUR);
      var icra = {
        id: _uid(), sira: ic + 1,
        no: 'ICR-' + _rnd(2023, 2026) + '-' + String(ic + 1).padStart(3, '0'),
        muvId: muvIds[ic % muvIds.length],
        borclu: state.karsiTaraflar[ic % ktIds.length].ad,
        btc: state.karsiTaraflar[ic % ktIds.length].tc || '',
        il: icraIl, adliye: _pick(ADLIYE), daire: _rnd(1, 12) + '. İcra Müdürlüğü',
        esas: _rnd(2023, 2026) + '/' + _rnd(1000, 99999),
        tur: icraTur, alacak: alacak, tahsil: tahsil,
        faiz: _rndF(1, 5),
        atur: _pick(ICRA_ALACAK_TUR),
        durum: _pick(['derdest', 'derdest', 'derdest', 'haciz', 'infaz']),
        tarih: _pastDate(10, 300),
        otarih: _pastDate(5, 200),
        itarih: '',
        karsavId: vekIds[(ic + 3) % vekIds.length],
        karsav: state.vekillar[(ic + 3) % vekIds.length].ad,
        davno: ic < 10 ? state.davalar[ic].no : '',
        dayanak: _pick(['Senet', 'Çek', 'Mahkeme İlamı', 'Kira Sözleşmesi', 'Fatura']),
        not: '',
        evraklar: [], notlar: [], harcamalar: [], tahsilatlar: [], anlasma: {},
      };
      // Harcamalar (1-3)
      for (var ih = 0; ih < _rnd(1, 3); ih++) {
        icra.harcamalar.push({
          id: _uid(), tarih: _pastDate(1, 120), tutar: _rndF(100, 1500),
          kat: _pick(['Harç / Pul', 'Tebligat', 'Haciz Masrafı']), acik: ''
        });
      }
      // Tahsilatlar (0-2)
      if (tahsil > 0) {
        var parcalar = _rnd(1, 3);
        var kalan = tahsil;
        for (var it = 0; it < parcalar && kalan > 0; it++) {
          var t = it === parcalar - 1 ? kalan : _rnd(1000, Math.floor(kalan * 0.6));
          icra.tahsilatlar.push({ id: _uid(), tur: 'tahsilat', tarih: _pastDate(1, 90), tutar: t, acik: 'Tahsilat' });
          kalan -= t;
        }
      }
      state.icra.push(icra);
      icraIds.push(icra.id);
    }

    // ── 7. İHTARNAMELER (15) ──
    _progress('İhtarnameler oluşturuluyor (15)...');
    for (var iht = 0; iht < 15; iht++) {
      var ihKonu = IHTAR_KONU[iht % IHTAR_KONU.length];
      state.ihtarnameler.push({
        id: _uid(), sira: iht + 1,
        no: 'IHT-' + _rnd(2024, 2026) + '-' + String(iht + 1).padStart(3, '0'),
        yon: _pick(['Giden', 'Giden', 'Gelen']),
        tur: _pick(['İhtarname', 'İhtarname', 'Protesto', 'İhbar']),
        muvId: muvIds[iht % muvIds.length],
        karsiTarafId: ktIds[iht % ktIds.length],
        karsiTaraf: state.karsiTaraflar[iht % ktIds.length].ad,
        konu: ihKonu,
        gonderimUsulu: _pick(['Noter', 'Noter', 'KEP', 'PTT']),
        gonderimDetay: { noterAdi: _pick(NOTER), yevmiyeNo: String(_rnd(10000, 99999)) },
        noterlik: _pick(NOTER),
        yevmiyeNo: String(_rnd(10000, 99999)),
        tarih: _pastDate(5, 180),
        tebligDurum: _pick(['Tebliğ Edildi', 'Tebliğ Edildi', 'Bekliyor', 'Bila']),
        tebligTarih: _pastDate(1, 90),
        icindekiler: ihKonu + ' hakkında muhataba ihtarda bulunulmuştur.',
        ilgiliTur: iht < 8 ? 'dava' : 'icra',
        ilgiliDosyaId: iht < 8 ? davaIds[iht % davaIds.length] : icraIds[(iht - 8) % icraIds.length],
        masrafTutar: _rndF(200, 1500),
        masrafYansit: true,
        verilenSure: _pick([7, 15, 30, null]),
        sureSonu: null,
      });
    }

    // ── 8. ARABULUCULUK (10) ──
    _progress('Arabuluculuk dosyaları oluşturuluyor (10)...');
    for (var ab = 0; ab < 10; ab++) {
      state.arabuluculuk.push({
        id: _uid(), konu: ARAB_KONU[ab % ARAB_KONU.length],
        tur: _pick(['Zorunlu — İş', 'Zorunlu — Ticari', 'Zorunlu — Tüketici', 'Zorunlu — Kira', 'İhtiyari']),
        uyusmazlikTur: _pick(['İşe İade', 'Kıdem Tazminatı', 'Ticari Alacak', 'Kira Alacağı', 'Ayıplı Mal', '']),
        muvId: muvIds[ab % muvIds.length],
        basvuruTarih: _pastDate(10, 120),
        karsi: state.karsiTaraflar[(ab + 5) % ktIds.length].ad,
        durum: _pick(['Görüşmeler Devam Ediyor', 'İlk Toplantı Bekleniyor', 'Uzlaşma Sağlandı', 'Uzlaşma Sağlanamadı', 'Başvuru Yapıldı']),
        arabulucuAd: 'Arb. ' + _pick(ERKEK_AD) + ' ' + _pick(SOYAD),
        arabulucuSicil: String(_rnd(1000, 9999)),
        arabulucuTel: _tel(),
        arabulucuBuro: _pick(IL) + ' Arabuluculuk Merkezi',
        ilkTarih: _futureDate(3, 30),
        ilkSaat: _rnd(9, 16) + ':00',
        yer: _pick(IL) + ' Adalet Sarayı, Arabuluculuk Odası',
        notlar: '',
        toplantılar: [], talepler: [], evraklar: [], topNotlar: [],
      });
    }

    // ── 9. DANIŞMANLIK (12) ──
    _progress('Danışmanlık hizmetleri oluşturuluyor (12)...');
    for (var dn = 0; dn < 12; dn++) {
      state.danismanlik.push({
        id: _uid(), sira: dn + 1, muvId: muvIds[dn % muvIds.length],
        tur: DAN_TUR[dn % DAN_TUR.length],
        konu: _pick(['Şirket sözleşmesi incelemesi', 'İş sözleşmesi hazırlama', 'KVKK uyum raporu', 'Taşınmaz satış sözleşmesi', 'Ticari kiralama danışmanlığı', 'Marka tescil başvurusu', 'Vergi planlaması', 'Şirket birleşme danışmanlığı', 'İhale hukuku danışmanlığı', 'Rekabet hukuku incelemesi', 'Aile hukuku danışmanlığı', 'İcra hukuku danışmanlığı']),
        durum: _pick(['Devam Ediyor', 'Devam Ediyor', 'Tamamlandı', 'Beklemede']),
        tarih: _pastDate(5, 180),
        teslimTarih: _futureDate(5, 60),
        ucret: _rnd(3000, 30000),
        tahsilEdildi: _rnd(0, 15000),
        aciklama: '', notlar: [], evraklar: [],
      });
    }

    // ── 10. AVANSLAR (30) ──
    _progress('Avans ve alacak kayıtları oluşturuluyor (30)...');
    for (var av = 0; av < 30; av++) {
      state.avanslar.push({
        id: _uid(), muvId: muvIds[av % muvIds.length],
        tur: _pick(['Avans Alındı', 'Masraf Alacağı', 'Vekalet Ücreti Alacağı', 'Sözleşme Ücreti']),
        tarih: _pastDate(1, 200),
        tutar: _rnd(500, 20000),
        durum: _pick(['Ödendi', 'Bekliyor', 'Kısmi Ödeme']),
        acik: _pick(['Dava açılış masrafı', 'İcra takip avansı', 'Vekalet ücreti 1. taksit', 'Danışmanlık ücreti', 'Sözleşme ücreti', 'Genel avans']),
        odeme: av % 3 === 0 ? _pastDate(1, 30) : '',
        dosyaTur: av < 15 ? 'dava' : (av < 25 ? 'icra' : null),
        dosyaId: av < 15 ? davaIds[av % davaIds.length] : (av < 25 ? icraIds[(av - 15) % icraIds.length] : null),
        dosyaNo: av < 15 ? state.davalar[av % davaIds.length].no : (av < 25 ? state.icra[(av - 15) % icraIds.length].no : ''),
      });
    }

    // ── 11. BÜTÇE HAREKETLERİ (40) ──
    _progress('Bütçe hareketleri oluşturuluyor (40)...');
    for (var b = 0; b < 40; b++) {
      state.butce.push({
        id: _uid(),
        tur: b % 3 === 0 ? 'Gider' : 'Gelir',
        tarih: _pastDate(1, 365),
        tutar: _rnd(200, 25000),
        kat: b % 3 === 0
          ? _pick(['Kira', 'Elektrik / Su', 'Personel Maaş', 'Kırtasiye', 'Ulaşım', 'Vergi / SGK'])
          : _pick(['Vekalet Ücreti', 'Danışmanlık Geliri', 'İcra Tahsilatı', 'Arabuluculuk Ücreti', 'Avans Tahsilatı']),
        muvId: b % 3 === 0 ? '' : muvIds[b % muvIds.length],
        acik: '',
        kdvOran: _pick([0, 0, 10, 20]),
        kdvTutar: 0,
      });
    }

    // ── 12. GÖREVLER / TODO (20) ──
    _progress('Görevler oluşturuluyor (20)...');
    for (var td = 0; td < 20; td++) {
      state.todolar.push({
        id: _uid(),
        baslik: TODO_BASLIK[td % TODO_BASLIK.length],
        aciklama: '',
        oncelik: _pick(['Yüksek', 'Normal', 'Düşük']),
        durum: _pick(['Bekliyor', 'Bekliyor', 'Devam Ediyor', 'Tamamlandı']),
        muvId: muvIds[td % muvIds.length],
        dosyaTur: td < 12 ? 'dava' : 'icra',
        dosyaId: td < 12 ? davaIds[td % davaIds.length] : icraIds[(td - 12) % icraIds.length],
        sonTarih: td % 4 === 0 ? _pastDate(1, 5) : _futureDate(1, 30),
      });
    }

    // ── 13. ETKİNLİKLER / TAKVİM (15) ──
    _progress('Takvim etkinlikleri oluşturuluyor (15)...');
    for (var et = 0; et < 15; et++) {
      state.etkinlikler.push({
        id: _uid(),
        baslik: _pick(['Duruşma — ', 'Arabuluculuk Toplantısı — ', 'Müvekkil Görüşmesi — ', 'Haciz İşlemi — ', 'Bilirkişi İnceleme — ']) + state.muvekkillar[et % muvIds.length].ad,
        tarih: et < 8 ? _futureDate(1, 45) : _pastDate(1, 30),
        saat: _rnd(9, 17) + ':' + _pick(['00', '30']),
        tur: _pick(['Duruşma', 'Toplantı', 'Son Gün', 'Randevu', 'Hatırlatma']),
        muvId: muvIds[et % muvIds.length],
        acik: '',
      });
    }

    // ── 14. FİNANS İŞLEMLERİ (20) ──
    _progress('Finans işlemleri oluşturuluyor (20)...');
    for (var fi = 0; fi < 20; fi++) {
      var fiTur = _pick(['Masraf', 'Masraf', 'Tahsilat', 'Tahsilat', 'Hakediş', 'Avans']);
      state.finansIslemler.push({
        id: _uid(),
        muvId: muvIds[fi % muvIds.length],
        tur: fiTur,
        yön: (fiTur === 'Masraf') ? 'borc' : 'alacak',
        tutar: _rnd(200, 15000),
        tarih: _pastDate(1, 200),
        aciklama: _pick(['Dava harcı', 'İcra tahsilatı', 'Vekalet ücreti', 'Avans alındı', 'Tebligat masrafı', 'Bilirkişi ücreti']),
        kategori: _pick(HARC_KAT),
        dosyaTur: fi < 12 ? 'dava' : 'icra',
        dosyaId: fi < 12 ? davaIds[fi % davaIds.length] : icraIds[(fi - 12) % icraIds.length],
        dosyaNo: fi < 12 ? state.davalar[fi % davaIds.length].no : state.icra[(fi - 12) % icraIds.length].no,
        durum: 'Onaylandı',
      });
    }

    // ── 15. ÜCRET ANLAŞMALARI (10) ──
    _progress('Ücret anlaşmaları oluşturuluyor (10)...');
    for (var ua = 0; ua < 10; ua++) {
      var uaDosyaTur = ua < 6 ? 'dava' : 'icra';
      var uaDosyaId = ua < 6 ? davaIds[ua] : icraIds[ua - 6];
      var uaAnlasmaTuru = _pick(['sabit', 'tahsilat', 'basari', 'karma']);
      state.ucretAnlasmalari.push({
        id: _uid(), muvId: muvIds[ua % muvIds.length],
        dosyaTur: uaDosyaTur, dosyaId: uaDosyaId,
        dosyaNo: uaDosyaTur === 'dava' ? state.davalar[ua].no : state.icra[ua - 6].no,
        anlasmaTuru: uaAnlasmaTuru,
        sabitUcret: uaAnlasmaTuru === 'sabit' ? _rnd(5000, 50000) : 0,
        yuzde: (uaAnlasmaTuru === 'tahsilat' || uaAnlasmaTuru === 'basari') ? _pick([10, 15, 20, 25]) : 0,
        bazTutar: 0, taksitSayi: 0, taksitTutar: 0,
        karmaP: uaAnlasmaTuru === 'karma' ? _rnd(5000, 20000) : 0,
        karmaYuzde: uaAnlasmaTuru === 'karma' ? _pick([5, 10, 15]) : 0,
        not: '', tarih: _pastDate(10, 200),
      });
      // Dosyanın anlasma objesini de güncelle
      var hedef = uaDosyaTur === 'dava' ? state.davalar[ua] : state.icra[ua - 6];
      if (hedef) {
        hedef.anlasma = {
          tur: uaAnlasmaTuru,
          ucret: uaAnlasmaTuru === 'sabit' ? state.ucretAnlasmalari[ua].sabitUcret : 0,
          yuzde: state.ucretAnlasmalari[ua].yuzde,
          otarih: state.ucretAnlasmalari[ua].tarih,
        };
      }
    }

    // ── 16. KAYDET ──
    _progress('Veriler kaydediliyor...');
    saveData();

    _progress('');
    _progress('✅ Demo veri yükleme tamamlandı!');
    _progress('📊 ' + state.muvekkillar.length + ' Müvekkil, ' + state.davalar.length + ' Dava, ' + state.icra.length + ' İcra, ' + state.ihtarnameler.length + ' İhtarname');
    _progress('💰 ' + state.avanslar.length + ' Avans, ' + state.butce.length + ' Bütçe, ' + state.finansIslemler.length + ' Finans İşlemi');
    _progress('📅 ' + state.todolar.length + ' Görev, ' + state.etkinlikler.length + ' Etkinlik, ' + state.arabuluculuk.length + ' Arabuluculuk');

    // UI yenile
    setTimeout(function () {
      try {
        renderMuvekkillar(); renderDavalar(); renderDavaCards();
        renderIcra(); renderIcraCards(); renderButce(); renderDanismanlik();
        renderDashboard(); updateBadges();
        if (typeof renderIhtarname === 'function') renderIhtarname();
        if (typeof renderTodo === 'function') renderTodo();
        if (typeof renderArabuluculuk === 'function') renderArabuluculuk();
        if (typeof refreshFinansViews === 'function') refreshFinansViews();
      } catch (e) { console.warn('[LexSeed] Render hatası:', e.message); }
      notify('✅ Demo veriler yüklendi — tüm modüller dolu!');
    }, 300);
  }

  return { calistir: calistir };
})();
