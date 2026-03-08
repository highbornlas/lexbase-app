// ================================================================
// LEXBASE — EVRAK ÜRETİCİ (Belge Şablon Motoru)
// js/modules/evrakUretici.js
//
// Türk hukuk sistemine uygun dilekçe, ihtarname, vekaletname
// ve icra takip talebi şablonları. Müvekkil/dava/icra verileriyle
// otomatik doldurulur. HTML preview + yazdır.
// ================================================================

var EvrakUretici = (function () {

  // ── ŞABLON KATALOĞU ────────────────────────────────────────
  var SABLONLAR = [
    { id: 'dava-dilekce', ad: 'Dava Dilekçesi', ikon: '📝', kat: 'Dilekçe', ctx: 'dava' },
    { id: 'cevap-dilekce', ad: 'Cevap Dilekçesi', ikon: '📝', kat: 'Dilekçe', ctx: 'dava' },
    { id: 'istinaf-dilekce', ad: 'İstinaf Dilekçesi', ikon: '📝', kat: 'Dilekçe', ctx: 'dava' },
    { id: 'temyiz-dilekce', ad: 'Temyiz Dilekçesi', ikon: '📝', kat: 'Dilekçe', ctx: 'dava' },
    { id: 'ihtarname', ad: 'İhtarname', ikon: '📩', kat: 'İhtarname', ctx: 'genel' },
    { id: 'vekaletname', ad: 'Genel Vekaletname', ikon: '📜', kat: 'Vekaletname', ctx: 'genel' },
    { id: 'icra-takip', ad: 'İcra Takip Talebi', ikon: '⚡', kat: 'İcra', ctx: 'icra' },
    { id: 'haciz-talep', ad: 'Haciz Talebi', ikon: '⚡', kat: 'İcra', ctx: 'icra' },
    { id: 'sulh-protokol', ad: 'Sulh Protokolü', ikon: '🤝', kat: 'Sözleşme', ctx: 'dava' },
    { id: 'avukatlik-sozlesme', ad: 'Avukatlık Ücret Sözleşmesi', ikon: '📋', kat: 'Sözleşme', ctx: 'genel' },
  ];

  // ── MODAL AÇ ───────────────────────────────────────────────
  function ac(ctx, dosyaId) {
    var modal = document.getElementById('evrak-uretici-modal');
    if (!modal) _modalOlustur();
    modal = document.getElementById('evrak-uretici-modal');

    // Context bilgisini sakla
    modal.dataset.ctx = ctx || 'genel';
    modal.dataset.dosyaId = dosyaId || '';

    // Şablon listesini render et
    _renderKatalog(ctx);

    modal.classList.add('open');
  }

  function _modalOlustur() {
    var m = document.createElement('div');
    m.className = 'modal-overlay';
    m.id = 'evrak-uretici-modal';
    m.innerHTML =
      '<div class="modal modal-lg" style="max-width:1000px;max-height:90vh;display:flex;flex-direction:column">' +
        '<div class="modal-header" style="flex-shrink:0"><div class="modal-title">📄 Evrak Üretici</div></div>' +
        '<div style="display:flex;flex:1;overflow:hidden">' +
          '<div id="eu-katalog" style="width:260px;border-right:1px solid var(--border);overflow-y:auto;padding:12px;flex-shrink:0"></div>' +
          '<div id="eu-icerik" style="flex:1;overflow-y:auto;padding:20px">' +
            '<div class="empty"><div class="empty-icon">📄</div><p>Sol menüden şablon seçin</p></div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer" style="flex-shrink:0">' +
          '<button class="btn btn-outline" onclick="closeModal(\'evrak-uretici-modal\')">Kapat</button>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="btn btn-outline" id="eu-yazdir-btn" onclick="EvrakUretici.yazdir()" style="display:none">🖨 Yazdır / PDF</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
  }

  // ── KATALOG RENDER ─────────────────────────────────────────
  function _renderKatalog(ctx) {
    var el = document.getElementById('eu-katalog');
    if (!el) return;

    var filtreli = SABLONLAR;
    if (ctx === 'dava') filtreli = SABLONLAR.filter(function(s) { return s.ctx === 'dava' || s.ctx === 'genel'; });
    else if (ctx === 'icra') filtreli = SABLONLAR.filter(function(s) { return s.ctx === 'icra' || s.ctx === 'genel'; });

    var kategoriler = {};
    filtreli.forEach(function(s) {
      if (!kategoriler[s.kat]) kategoriler[s.kat] = [];
      kategoriler[s.kat].push(s);
    });

    var html = '';
    Object.keys(kategoriler).forEach(function(kat) {
      html += '<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px;padding-left:4px">' + kat + '</div>';
      kategoriler[kat].forEach(function(s) {
        html += '<div class="eu-sablon-btn" onclick="EvrakUretici.sec(\'' + s.id + '\')" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;cursor:pointer;margin-bottom:2px;font-size:13px;transition:background .15s" onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\'transparent\'">';
        html += '<span>' + s.ikon + '</span><span>' + s.ad + '</span></div>';
      });
    });

    el.innerHTML = html;
  }

  // ── ŞABLON SEÇ ─────────────────────────────────────────────
  function sec(sablonId) {
    var modal = document.getElementById('evrak-uretici-modal');
    var ctx = modal ? modal.dataset.ctx : 'genel';
    var dosyaId = modal ? modal.dataset.dosyaId : '';

    // Veri topla
    var veri = _veriTopla(ctx, dosyaId);

    // Şablon render et
    var html = _sablonRender(sablonId, veri);

    var icerikEl = document.getElementById('eu-icerik');
    if (icerikEl) icerikEl.innerHTML = html;

    // Yazdır butonunu göster
    var yazBtn = document.getElementById('eu-yazdir-btn');
    if (yazBtn) yazBtn.style.display = '';

    // Aktif şablonu işaretle
    document.querySelectorAll('.eu-sablon-btn').forEach(function(b) { b.style.background = 'transparent'; });
    var aktif = document.querySelector('.eu-sablon-btn[onclick*="' + sablonId + '"]');
    if (aktif) aktif.style.background = 'var(--surface2)';
  }

  // ── VERİ TOPLA ─────────────────────────────────────────────
  function _veriTopla(ctx, dosyaId) {
    var v = {
      bugun: new Date().toLocaleDateString('tr-TR', {day:'numeric', month:'long', year:'numeric'}),
      bugunKisa: today(),
      buroAd: currentUser ? (currentUser.buro_ad || 'LexBase Hukuk Bürosu') : 'LexBase Hukuk Bürosu',
      avukatAd: currentUser ? (currentUser.ad_soyad || currentUser.ad || '') : '',
      baroSicil: currentUser ? (currentUser.baroSicil || '') : '',
    };

    // Müvekkil
    if (aktivMuvId) {
      var m = getMuv(aktivMuvId);
      if (m) {
        v.muvAd = m.ad || '';
        v.muvTc = m.tc || '';
        v.muvAdres = m.adres || '';
        v.muvTel = m.tel || '';
        v.muvMail = m.mail || '';
        v.muvTip = m.tip || 'gercek';
        v.muvVergiNo = m.vergiNo || '';
      }
    }

    // Dava
    if (ctx === 'dava' && dosyaId) {
      var d = getDava(dosyaId);
      if (d) {
        v.davaNo = d.no || '';
        v.davaKonu = d.konu || '';
        v.mahkeme = [d.il, d.mno].filter(Boolean).join(' ');
        v.esasNo = [d.esasYil, d.esasNo].filter(Boolean).join('/');
        v.davaTaraf = d.taraf || 'Davacı';
        v.davaDeger = d.deger || 0;
        v.davaKarsiAd = d.karsi || '';
        v.davaKarsiVekil = d.karsav || '';
        v.muvAd = v.muvAd || getMuvAd(d.muvId);
        if (!v.muvTc && d.muvId) { var m2 = getMuv(d.muvId); if(m2) { v.muvTc = m2.tc || ''; v.muvAdres = m2.adres || ''; }}
      }
    }

    // İcra
    if (ctx === 'icra' && dosyaId) {
      var ic = getIcra(dosyaId);
      if (ic) {
        v.icraNo = ic.no || '';
        v.icraDaire = [ic.il, ic.daire].filter(Boolean).join(' ');
        v.icraEsas = ic.esas || '';
        v.icraTur = ic.tur || '';
        v.icraAlacak = ic.alacak || 0;
        v.icraFaiz = ic.faiz || 0;
        v.icraBorclu = ic.borclu || '';
        v.icraBorcluTc = ic.btc || '';
        v.icraDayanak = ic.dayanak || '';
        v.muvAd = v.muvAd || getMuvAd(ic.muvId);
        if (!v.muvTc && ic.muvId) { var m3 = getMuv(ic.muvId); if(m3) { v.muvTc = m3.tc || ''; v.muvAdres = m3.adres || ''; }}
      }
    }

    return v;
  }

  // ── ŞABLON RENDER ──────────────────────────────────────────
  function _sablonRender(id, v) {
    var wrap = function(icerik, baslik) {
      return '<div id="eu-belge-icerik" style="background:#fff;color:#000;padding:40px;border:1px solid var(--border);border-radius:8px;font-family:\'Times New Roman\',serif;font-size:14px;line-height:1.8;min-height:600px">' +
        '<div style="text-align:center;margin-bottom:30px"><div style="font-size:18px;font-weight:700;border-bottom:2px solid #000;padding-bottom:8px;display:inline-block">' + baslik + '</div></div>' +
        icerik + '</div>' +
        '<div style="margin-top:12px;padding:10px;background:var(--surface2);border-radius:6px;font-size:11px;color:var(--text-muted)">' +
        '💡 <b>İpucu:</b> Sarı ile işaretli alanları düzenleyebilirsiniz. "Yazdır / PDF" butonuyla çıktı alabilirsiniz. Tarayıcıda "PDF olarak kaydet" seçeneği ile PDF oluşturabilirsiniz.</div>';
    };

    var editable = function(text, placeholder) {
      return '<span contenteditable="true" style="background:rgba(255,193,7,.15);padding:1px 4px;border-radius:3px;border-bottom:1px dashed #c9a84c;outline:none;min-width:60px;display:inline-block" title="Düzenlemek için tıklayın">' + (text || placeholder || '...') + '</span>';
    };

    var satirBos = '<div style="height:20px"></div>';

    switch (id) {
      case 'dava-dilekce':
        return wrap(
          '<div style="text-align:center;font-weight:700;margin-bottom:20px">' + editable(v.mahkeme, '... MAHKEMESİ') + ' SAYIN HAKİMLİĞİNE</div>' +
          '<table style="width:100%;border-collapse:collapse;margin-bottom:20px">' +
          '<tr><td style="width:120px;font-weight:700;vertical-align:top;padding:4px 0">DAVACI</td><td style="padding:4px 0">: ' + editable(v.muvAd, 'Müvekkil Adı') + ' (T.C. ' + editable(v.muvTc, 'TC Kimlik No') + ')</td></tr>' +
          '<tr><td style="font-weight:700;vertical-align:top;padding:4px 0">VEKİLİ</td><td style="padding:4px 0">: Av. ' + editable(v.avukatAd, 'Avukat Adı') + '</td></tr>' +
          '<tr><td style="font-weight:700;vertical-align:top;padding:4px 0">DAVALI</td><td style="padding:4px 0">: ' + editable(v.davaKarsiAd, 'Davalı Adı') + '</td></tr>' +
          '<tr><td style="font-weight:700;vertical-align:top;padding:4px 0">KONU</td><td style="padding:4px 0">: ' + editable(v.davaKonu, 'Dava konusu') + '</td></tr>' +
          '<tr><td style="font-weight:700;vertical-align:top;padding:4px 0">DAVA DEĞERİ</td><td style="padding:4px 0">: ' + editable(v.davaDeger ? fmt(v.davaDeger) + ' TL' : '', '... TL') + '</td></tr>' +
          '</table>' +
          '<div style="font-weight:700;margin-bottom:8px">AÇIKLAMALAR</div>' +
          '<div style="text-align:justify">' + editable('', '1. Müvekkil ile davalı arasında ... konusunda uyuşmazlık bulunmaktadır.\n\n2. ...\n\n3. ...') + '</div>' +
          satirBos +
          '<div style="font-weight:700;margin-bottom:8px">HUKUKİ NEDENLER</div>' +
          '<div>' + editable('', 'HMK, TBK, TMK ve ilgili mevzuat.') + '</div>' +
          satirBos +
          '<div style="font-weight:700;margin-bottom:8px">DELİLLER</div>' +
          '<div>' + editable('', '1. Sözleşme sureti\n2. Banka dekontları\n3. Tanık beyanları\n4. Bilirkişi incelemesi\n5. Her türlü yasal delil') + '</div>' +
          satirBos +
          '<div style="font-weight:700;margin-bottom:8px">SONUÇ VE TALEP</div>' +
          '<div style="text-align:justify">' + editable('', 'Yukarıda arz ve izah olunan nedenlerle; davalının ... TL ödemeye mahkum edilmesine, yargılama giderleri ve vekalet ücretinin davalıya yükletilmesine karar verilmesini saygıyla vekaleten arz ve talep ederiz.') + '</div>' +
          satirBos +
          '<div style="text-align:right;margin-top:30px">' +
          '<div>' + v.bugun + '</div>' +
          '<div style="margin-top:8px;font-weight:700">Av. ' + editable(v.avukatAd, 'Avukat Adı') + '</div>' +
          '<div style="font-size:12px;color:#666">Davacı Vekili</div></div>',
          'DAVA DİLEKÇESİ'
        );

      case 'cevap-dilekce':
        return wrap(
          '<div style="text-align:center;font-weight:700;margin-bottom:20px">' + editable(v.mahkeme, '... MAHKEMESİ') + ' SAYIN HAKİMLİĞİNE</div>' +
          '<div style="text-align:right;margin-bottom:16px">Esas No: ' + editable(v.esasNo, '20../...') + '</div>' +
          '<table style="width:100%;border-collapse:collapse;margin-bottom:20px">' +
          '<tr><td style="width:120px;font-weight:700;padding:4px 0">DAVALI</td><td style="padding:4px 0">: ' + editable(v.muvAd, 'Müvekkil Adı (Davalı)') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">VEKİLİ</td><td style="padding:4px 0">: Av. ' + editable(v.avukatAd, 'Avukat Adı') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">DAVACI</td><td style="padding:4px 0">: ' + editable(v.davaKarsiAd, 'Davacı Adı') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">KONU</td><td style="padding:4px 0">: Dava dilekçesine cevaplarımızın sunulmasıdır.</td></tr>' +
          '</table>' +
          '<div style="font-weight:700;margin-bottom:8px">ÖN İTİRAZLARIMIZ</div>' +
          '<div>' + editable('', '1. Görev / Yetki itirazlarımız\n2. Zamanaşımı itirazımız\n3. ...') + '</div>' +
          satirBos +
          '<div style="font-weight:700;margin-bottom:8px">ESASA İLİŞKİN CEVAPLAR</div>' +
          '<div style="text-align:justify">' + editable('', '1. Davacının iddiaları asılsız ve mesnetsizdir.\n\n2. ...\n\n3. ...') + '</div>' +
          satirBos +
          '<div style="font-weight:700;margin-bottom:8px">SONUÇ VE TALEP</div>' +
          '<div>' + editable('', 'Arz ve izah edilen nedenlerle; haksız ve mesnetsiz davanın REDDİNE, yargılama giderleri ve vekalet ücretinin davacıya yükletilmesine karar verilmesini saygıyla vekaleten arz ve talep ederiz.') + '</div>' +
          '<div style="text-align:right;margin-top:30px"><div>' + v.bugun + '</div><div style="margin-top:8px;font-weight:700">Av. ' + editable(v.avukatAd, '') + '</div><div style="font-size:12px;color:#666">Davalı Vekili</div></div>',
          'CEVAP DİLEKÇESİ'
        );

      case 'istinaf-dilekce':
        return wrap(
          '<div style="text-align:center;font-weight:700;margin-bottom:20px">BÖLGE ADLİYE MAHKEMESİ İLGİLİ HUKUK DAİRESİ BAŞKANLIĞINA<br><span style="font-size:13px;font-weight:400">Sunulmak üzere</span><br>' + editable(v.mahkeme, '... MAHKEMESİ') + ' SAYIN HAKİMLİĞİNE</div>' +
          '<div style="text-align:right;margin-bottom:16px">Esas No: ' + editable(v.esasNo, '20../...') + '<br>Karar No: ' + editable('', '20../...') + '</div>' +
          '<table style="width:100%;border-collapse:collapse;margin-bottom:20px">' +
          '<tr><td style="width:140px;font-weight:700;padding:4px 0">İSTİNAF EDEN</td><td style="padding:4px 0">: ' + editable(v.muvAd, 'Adı Soyadı') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">VEKİLİ</td><td style="padding:4px 0">: Av. ' + editable(v.avukatAd, '') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">KARŞI TARAF</td><td style="padding:4px 0">: ' + editable(v.davaKarsiAd, '') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">KONU</td><td style="padding:4px 0">: İstinaf başvurumuzun kabulü ile yerel mahkeme kararının kaldırılması talebidir.</td></tr>' +
          '</table>' +
          '<div style="font-weight:700;margin-bottom:8px">İSTİNAF NEDENLERİ</div>' +
          '<div style="text-align:justify">' + editable('', '1. Yerel mahkeme kararı hukuka aykırıdır.\n\n2. Eksik inceleme yapılmıştır.\n\n3. Deliller yeterince değerlendirilmemiştir.') + '</div>' +
          satirBos +
          '<div style="font-weight:700;margin-bottom:8px">SONUÇ VE TALEP</div>' +
          '<div>' + editable('', 'Yukarıda açıklanan nedenlerle; yerel mahkeme kararının KALDIRILMASINA ve yeniden yargılama yapılarak davanın kabulüne karar verilmesini saygıyla vekaleten arz ve talep ederiz.') + '</div>' +
          '<div style="text-align:right;margin-top:30px"><div>' + v.bugun + '</div><div style="margin-top:8px;font-weight:700">Av. ' + editable(v.avukatAd, '') + '</div></div>',
          'İSTİNAF DİLEKÇESİ'
        );

      case 'ihtarname':
        return wrap(
          '<div style="text-align:center;margin-bottom:20px;font-weight:700">İ H T A R N A M E</div>' +
          '<table style="width:100%;border-collapse:collapse;margin-bottom:20px">' +
          '<tr><td style="width:140px;font-weight:700;padding:4px 0">İHTAR EDEN</td><td style="padding:4px 0">: ' + editable(v.muvAd, 'İhtar Eden Adı') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">VEKİLİ</td><td style="padding:4px 0">: Av. ' + editable(v.avukatAd, '') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">MUHATAP</td><td style="padding:4px 0">: ' + editable('', 'Muhatap Adı Soyadı') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">KONU</td><td style="padding:4px 0">: ' + editable('', 'İhtarname konusu') + '</td></tr>' +
          '</table>' +
          '<div style="text-align:justify">' +
          '<p>Sayın Muhatap,</p>' +
          '<p>' + editable('', 'Müvekkilimiz ile aranızdaki ... tarihli sözleşme gereğince, ... TL tutarındaki borcunuzun ödeme süresi ... tarihinde sona ermiştir.\n\nİşbu ihtarnamenin tarafınıza tebliğinden itibaren 7 (yedi) gün içinde borcunuzu ödemenizi, aksi takdirde yasal yollara başvurulacağını ve faiz, masraf ve vekalet ücreti talepli dava ve icra takibi açılacağını ihtar ederiz.') + '</p></div>' +
          satirBos +
          '<div style="text-align:justify;font-style:italic;font-size:13px;color:#666">Sayın Noter; üç nüshadan ibaret işbu ihtarnamenin bir nüshasının muhataba tebliğini, bir nüshasının dairenizde saklanmasını, tebliğ şerhi düşülmüş bir nüshasının da tarafımıza iadesini saygılarımızla arz ederiz.</div>' +
          '<div style="text-align:right;margin-top:30px"><div>' + v.bugun + '</div><div style="margin-top:8px;font-weight:700">Av. ' + editable(v.avukatAd, '') + '</div><div style="font-size:12px;color:#666">İhtar Eden Vekili</div></div>',
          'İHTARNAME'
        );

      case 'vekaletname':
        return wrap(
          '<div style="text-align:center;margin-bottom:20px;font-weight:700">G E N E L   V E K A L E T N A M E</div>' +
          '<div style="text-align:justify;margin-bottom:16px"><p>Leh ve aleyhimde açılmış ve açılacak tüm dava ve takiplerde, her türlü hukuki işlemi yapmaya, dava açmaya, icra takibi başlatmaya, davadan feragat etmeye, kabul ve sulh olmaya, ' +
          'yemin teklif etmeye, yemini kabul, iade ve reddetmeye, haczi kaldırmaya, tahkim sözleşmesi yapmaya, konkordato talep etmeye, başkasını tevkil, teşrik ve azle, ' +
          'kanuni yollara başvurmaya, mal beyanında bulunmaya, hükümlerin icrası için gerekli tüm işlemleri yapmaya ve ilamları icraya koymaya, ahzu kabza, davayı ıslah etmeye, ' +
          'müdahale davası açmaya, hakimleri reddetmeye ve ihtar çekmeye, ihtarname keşide etmeye, protesto çekmeye ' +
          'arabuluculuk süreçlerinde temsil etmeye yetkili olmak üzere;</p></div>' +
          '<div style="text-align:center;margin:20px 0;font-weight:700;font-size:16px">' + editable(v.buroAd, 'Hukuk Bürosu Adı') + '</div>' +
          '<div style="text-align:center;margin-bottom:20px">adresinde mukim <b>Av. ' + editable(v.avukatAd, 'Avukat Adı') + '</b>' +
          ' (' + editable(v.baroSicil, 'Baro Sicil No') + ') birlikte ve ayrı ayrı yetkili olmak üzere vekil tayin ettim.</div>' +
          satirBos +
          '<table style="width:100%;border-collapse:collapse">' +
          '<tr><td style="width:50%;vertical-align:top;padding:10px"><div style="font-weight:700;margin-bottom:8px">VEKİL EDEN</div>' +
          '<div>Ad Soyad: ' + editable(v.muvAd, '...') + '</div>' +
          '<div>T.C. No: ' + editable(v.muvTc, '...') + '</div>' +
          '<div>Adres: ' + editable(v.muvAdres, '...') + '</div>' +
          '<div style="margin-top:30px;border-top:1px solid #000;padding-top:4px;text-align:center;font-size:12px">İmza</div></td>' +
          '<td style="width:50%;vertical-align:top;padding:10px"><div style="font-weight:700;margin-bottom:8px">NOTER TASDİKİ</div>' +
          '<div style="height:100px;border:1px dashed #999;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px">Noter mühür ve imza alanı</div></td></tr></table>',
          'GENEL VEKALETNAME'
        );

      case 'icra-takip':
        return wrap(
          '<div style="text-align:center;font-weight:700;margin-bottom:20px">' + editable(v.icraDaire, '... İCRA MÜDÜRLÜĞÜNE') + '</div>' +
          '<table style="width:100%;border-collapse:collapse;margin-bottom:20px">' +
          '<tr><td style="width:140px;font-weight:700;padding:4px 0">ALACAKLI</td><td style="padding:4px 0">: ' + editable(v.muvAd, 'Alacaklı Adı') + ' (T.C. ' + editable(v.muvTc, '...') + ')</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">VEKİLİ</td><td style="padding:4px 0">: Av. ' + editable(v.avukatAd, '') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">BORÇLU</td><td style="padding:4px 0">: ' + editable(v.icraBorclu, 'Borçlu Adı') + ' (T.C. ' + editable(v.icraBorcluTc, '...') + ')</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">ALACAK MİKTARI</td><td style="padding:4px 0">: ' + editable(v.icraAlacak ? fmt(v.icraAlacak) + ' TL' : '', '... TL') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">FAİZ</td><td style="padding:4px 0">: ' + editable(v.icraFaiz ? '%' + v.icraFaiz : '', '% ...') + ' yasal/ticari faiz</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">TAKİP TÜRÜ</td><td style="padding:4px 0">: ' + editable(v.icraTur, 'İlamsız İcra') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">DAYANAK</td><td style="padding:4px 0">: ' + editable(v.icraDayanak, 'Senet / Çek / İlam') + '</td></tr>' +
          '</table>' +
          '<div style="text-align:justify"><p>Yukarıda belirtilen alacağımızın tahsili için borçlu aleyhine ' + editable(v.icraTur, 'ilamsız icra') + ' yoluyla takip yapılmasını, borçluya ödeme / icra emri gönderilmesini saygıyla talep ederiz.</p></div>' +
          '<div style="text-align:right;margin-top:30px"><div>' + v.bugun + '</div><div style="margin-top:8px;font-weight:700">Av. ' + editable(v.avukatAd, '') + '</div><div style="font-size:12px;color:#666">Alacaklı Vekili</div></div>',
          'İCRA TAKİP TALEBİ'
        );

      case 'haciz-talep':
        return wrap(
          '<div style="text-align:center;font-weight:700;margin-bottom:20px">' + editable(v.icraDaire, '... İCRA MÜDÜRLÜĞÜNE') + '</div>' +
          '<div style="text-align:right;margin-bottom:16px">Dosya No: ' + editable(v.icraEsas || v.icraNo, '20../...') + '</div>' +
          '<div style="text-align:justify"><p>Yukarıda dosya numarası belirtilen icra takibimizde, borçluya gönderilen ödeme emri kesinleşmiş olup, borcun ödenmediği anlaşılmıştır.</p>' +
          '<p>Borçlunun menkul ve gayrimenkul malları ile üçüncü kişilerdeki hak ve alacaklarının HACZİNE karar verilmesini saygıyla talep ederiz.</p></div>' +
          '<div style="text-align:right;margin-top:30px"><div>' + v.bugun + '</div><div style="margin-top:8px;font-weight:700">Av. ' + editable(v.avukatAd, '') + '</div></div>',
          'HACİZ TALEBİ'
        );

      case 'avukatlik-sozlesme':
        return wrap(
          '<div style="text-align:center;margin-bottom:20px;font-weight:700">AVUKATLIK ÜCRET SÖZLEŞMESİ</div>' +
          '<table style="width:100%;border-collapse:collapse;margin-bottom:20px">' +
          '<tr><td style="width:80px;font-weight:700;padding:4px 0">MADDE 1</td><td style="padding:4px 0"><b>TARAFLAR:</b> Bir tarafta ' + editable(v.muvAd, 'Müvekkil Adı') + ' (bundan sonra "Müvekkil" olarak anılacaktır), diğer tarafta Av. ' + editable(v.avukatAd, 'Avukat Adı') + ' (bundan sonra "Avukat" olarak anılacaktır).</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">MADDE 2</td><td style="padding:4px 0"><b>KONU:</b> ' + editable('', 'İş bu sözleşmenin konusu, Müvekkilin ... davasında/işinde Avukat tarafından hukuki danışmanlık ve avukatlık hizmeti verilmesidir.') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">MADDE 3</td><td style="padding:4px 0"><b>ÜCRET:</b> Avukatlık ücreti ' + editable('', '... TL (... Türk Lirası)') + ' olarak kararlaştırılmıştır. Bu ücret ' + editable('', 'peşin / 2 taksit halinde / tahsilat payı olarak %...') + ' ödenecektir.</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">MADDE 4</td><td style="padding:4px 0"><b>MASRAFLAR:</b> Dava/takip masrafları (harç, tebligat, bilirkişi ücreti vb.) Müvekkil tarafından avans olarak karşılanacaktır.</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">MADDE 5</td><td style="padding:4px 0"><b>SÜRE:</b> İşbu sözleşme imza tarihinden itibaren dava/iş sonuçlanana kadar geçerlidir.</td></tr>' +
          '</table>' +
          '<div style="display:flex;justify-content:space-between;margin-top:40px">' +
          '<div style="text-align:center;width:45%"><div style="font-weight:700;margin-bottom:30px">MÜVEKKİL</div><div>' + editable(v.muvAd, '') + '</div><div style="border-top:1px solid #000;margin-top:30px;padding-top:4px;font-size:12px">İmza</div></div>' +
          '<div style="text-align:center;width:45%"><div style="font-weight:700;margin-bottom:30px">AVUKAT</div><div>Av. ' + editable(v.avukatAd, '') + '</div><div style="border-top:1px solid #000;margin-top:30px;padding-top:4px;font-size:12px">İmza</div></div></div>',
          'AVUKATLIK ÜCRET SÖZLEŞMESİ'
        );

      case 'sulh-protokol':
        return wrap(
          '<div style="text-align:center;margin-bottom:20px;font-weight:700">SULH PROTOKOLÜ</div>' +
          '<div style="text-align:right;margin-bottom:16px">' + editable(v.mahkeme, '... Mahkemesi') + '<br>Esas No: ' + editable(v.esasNo, '20../...') + '</div>' +
          '<div style="text-align:justify"><p>Aşağıda isimleri yazılı taraflar, aralarındaki uyuşmazlığı sulh yoluyla çözmek konusunda anlaşmışlardır.</p></div>' +
          '<table style="width:100%;border-collapse:collapse;margin:20px 0">' +
          '<tr><td style="width:80px;font-weight:700;padding:4px 0">1. TARAF</td><td style="padding:4px 0">: ' + editable(v.muvAd, '') + '</td></tr>' +
          '<tr><td style="font-weight:700;padding:4px 0">2. TARAF</td><td style="padding:4px 0">: ' + editable(v.davaKarsiAd, '') + '</td></tr>' +
          '</table>' +
          '<div style="font-weight:700;margin-bottom:8px">SULH KOŞULLARI</div>' +
          '<div>' + editable('', '1. ... TL ödeme yapılacaktır.\n2. Ödeme ... tarihine kadar ...\n3. Taraflar karşılıklı olarak birbirlerinden herhangi bir hak ve alacak talebinde bulunmayacaklardır.\n4. Yargılama giderleri ...') + '</div>' +
          '<div style="display:flex;justify-content:space-between;margin-top:40px">' +
          '<div style="text-align:center;width:45%"><div style="font-weight:700">' + editable(v.muvAd, '1. Taraf') + '</div><div style="border-top:1px solid #000;margin-top:40px;padding-top:4px;font-size:12px">İmza</div></div>' +
          '<div style="text-align:center;width:45%"><div style="font-weight:700">' + editable(v.davaKarsiAd, '2. Taraf') + '</div><div style="border-top:1px solid #000;margin-top:40px;padding-top:4px;font-size:12px">İmza</div></div></div>',
          'SULH PROTOKOLÜ'
        );

      default:
        return '<div class="empty"><div class="empty-icon">📄</div><p>Şablon bulunamadı</p></div>';
    }
  }

  // ── YAZDIR ─────────────────────────────────────────────────
  function yazdir() {
    var belge = document.getElementById('eu-belge-icerik');
    if (!belge) { notify('⚠️ Önce bir şablon seçin'); return; }

    var w = window.open('', '_blank');
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>LexBase — Evrak</title>' +
      '<style>body{margin:30px 40px;font-family:"Times New Roman",serif;font-size:14px;line-height:1.8;color:#000}' +
      '@media print{body{margin:15px 20px}[contenteditable]{background:none!important;border:none!important}}' +
      'table{width:100%;border-collapse:collapse}td{padding:4px 0;vertical-align:top}</style></head><body>' +
      belge.innerHTML + '</body></html>');
    w.document.close();
    setTimeout(function() { w.print(); }, 300);
  }

  return {
    ac: ac,
    sec: sec,
    yazdir: yazdir,
    SABLONLAR: SABLONLAR,
  };
})();
