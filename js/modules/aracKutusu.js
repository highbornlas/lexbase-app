// ================================================================
// LEXBASE — AVUKAT ARAÇ KUTUSU (v2)
// js/modules/aracKutusu.js
//
// 1. Faiz Hesaplayıcı — 15 faiz türü, dönemsel oran, Supabase
// 2. Yasal Süre Hesaplayıcı — HMK/İİK/CMK + tatil motoru
// 3. Vekalet Ücreti Hesaplayıcı — AAÜT 2024
// ================================================================

var AracKutusu = (function () {

// ════════════════════════════════════════════════════════════════
// FAİZ TÜRLERİ KATALOĞİ
// ════════════════════════════════════════════════════════════════
// UYAP'ta dava açarken seçilebilen tüm faiz türleri.
// oranKey: Supabase'deki 'tur' kolonu (gerçek oran kaynağı)
// Bazı türler başka bir oranı referans alır (ör: kıdem tazm. = mevduat)
var FAIZ_TURLERI = [
  { id:'yasal',           ad:'Yasal Faiz',                            oranKey:'yasal',        madde:'3095 s.K. m.1',     aciklama:'Tüm hukuk davalarında varsayılan faiz oranı' },
  { id:'ticari',          ad:'Ticari Faiz (Avans)',                   oranKey:'ticari',       madde:'3095 s.K. m.2',     aciklama:'Ticari işlerde uygulanan TCMB avans faizi' },
  { id:'temerr_yasal',    ad:'Temerrüt Faizi (Yasal)',                oranKey:'yasal',        madde:'TBK m.120',         aciklama:'Borçlunun temerrüde düşmesi — yasal oran' },
  { id:'temerr_ticari',   ad:'Temerrüt Faizi (Ticari)',               oranKey:'ticari',       madde:'TBK m.120 / TTK',   aciklama:'Ticari işlemlerde temerrüt — avans oranı' },
  { id:'reeskont',        ad:'Reeskont Faizi',                        oranKey:'reeskont',     madde:'TCMB',              aciklama:'TCMB reeskont işlemlerine uygulanan oran' },
  { id:'mevduat',         ad:'En Yüksek Mevduat Faizi',              oranKey:'mevduat',      madde:'3095 s.K. m.2',     aciklama:'Bankaların uyguladığı en yüksek mevduat faizi' },
  { id:'kidem',           ad:'Kıdem Tazminatı Faizi',                oranKey:'mevduat',      madde:'1475 s.K. m.14',    aciklama:'Mevduata uygulanan en yüksek faiz oranında' },
  { id:'kamuLastirma',    ad:'Kamulaştırma Bedeli Faizi',             oranKey:'mevduat',      madde:'2942 s.K. m.10',    aciklama:'Kamulaştırma bedelinin geç ödenmesi' },
  { id:'kamu_gecikme',    ad:'Kamu Alacakları Gecikme Zammı',         oranKey:'kamu_gecikme', madde:'6183 s.K. m.51',    aciklama:'Vergi ve kamu alacaklarında gecikme zammı' },
  { id:'vergi_gecikme',   ad:'Vergi Gecikme Faizi',                   oranKey:'vergi_gecikme',madde:'VUK m.112',         aciklama:'Vergi borçlarına uygulanan gecikme faizi' },
  { id:'sgk_gecikme',     ad:'SGK Gecikme Zammı',                     oranKey:'sgk_gecikme',  madde:'5510 s.K. m.89',    aciklama:'SGK prim borçlarına uygulanan gecikme zammı' },
  { id:'nafaka',          ad:'Nafaka Faizi',                           oranKey:'yasal',        madde:'TBK m.120 / TMK',   aciklama:'Nafaka alacağına yasal faiz uygulanır' },
  { id:'kira',            ad:'Kira Alacağı Faizi',                    oranKey:'yasal',        madde:'TBK m.120',         aciklama:'Kira alacağına yasal faiz oranı' },
  { id:'is_kazasi',       ad:'İş Kazası / Meslek Hastalığı Faizi',   oranKey:'yasal',        madde:'TBK m.120 / 5510',  aciklama:'Rücuen alacaklarda yasal faiz' },
  { id:'sigorta',         ad:'Sigorta Tazminatı Faizi',               oranKey:'yasal',        madde:'TTK m.1427',        aciklama:'Temerrüt tarihinden itibaren yasal/ticari' },
];

// ════════════════════════════════════════════════════════════════
// DİNAMİK FAİZ ORANLARI (Supabase'den)
// ════════════════════════════════════════════════════════════════
var _oranlar = {}; // { 'yasal': [{baslangic,oran},...], 'ticari': [...], ... }
var _yuklendi = false;

// Fallback (Supabase yoksa)
var FALLBACK = {
  yasal:   [{b:'2006-01-01',o:9},{b:'2024-07-01',o:24}],
  ticari:  [{b:'2020-06-01',o:9.75},{b:'2023-09-01',o:34.25},{b:'2024-01-01',o:49},{b:'2024-04-01',o:54},{b:'2025-01-01',o:49},{b:'2025-04-01',o:44}],
  reeskont:[{b:'2024-01-01',o:45.5},{b:'2025-01-01',o:45.5},{b:'2025-04-01',o:40.5}],
  kamu_gecikme:[{b:'2023-11-01',o:42},{b:'2024-07-01',o:48}],
  vergi_gecikme:[{b:'2023-11-01',o:42},{b:'2024-07-01',o:36}],
  sgk_gecikme:[{b:'2023-11-01',o:42},{b:'2024-07-01',o:48}],
  mevduat:[{b:'2024-01-01',o:50},{b:'2024-07-01',o:52},{b:'2025-01-01',o:45}],
};

async function oranlariYukle() {
  if (typeof sb === 'undefined' || !sb) { _fallbackYukle(); return; }
  try {
    var r = await sb.from('faiz_oranlari').select('tur, baslangic, oran, kaynak').order('baslangic', {ascending:true});
    if (r.error) throw new Error(r.error.message);
    if (r.data && r.data.length > 0) {
      _oranlar = {};
      r.data.forEach(function(d) {
        if (!_oranlar[d.tur]) _oranlar[d.tur] = [];
        _oranlar[d.tur].push({baslangic:d.baslangic, oran:parseFloat(d.oran), kaynak:d.kaynak||''});
      });
      _yuklendi = true;
      var topTur = Object.keys(_oranlar).length;
      var topOran = r.data.length;
      console.log('[AracKutusu] ' + topOran + ' oran / ' + topTur + ' tür yüklendi (Supabase)');
    } else { _fallbackYukle(); }
  } catch(e) { console.warn('[AracKutusu] Supabase hatası, fallback:', e.message); _fallbackYukle(); }
}

function _fallbackYukle() {
  _oranlar = {};
  Object.keys(FALLBACK).forEach(function(tur) {
    _oranlar[tur] = FALLBACK[tur].map(function(r) { return {baslangic:r.b, oran:r.o, kaynak:'Fallback'}; });
  });
  _yuklendi = true;
  console.log('[AracKutusu] Fallback oranlar yüklendi');
}

// ════════════════════════════════════════════════════════════════
// FAİZ HESAPLAYICI — Dönemsel Oran Değişimli
// ════════════════════════════════════════════════════════════════

function _getOranlar(oranKey) {
  return _oranlar[oranKey] || FALLBACK[oranKey] || [{baslangic:'2006-01-01', oran:9}];
}

function _faizDilimleri(basTarih, bitTarih, oranKey) {
  var oranlar = _getOranlar(oranKey);
  var bas = new Date(basTarih); bas.setHours(0,0,0,0);
  var bit = new Date(bitTarih); bit.setHours(0,0,0,0);
  if (bas >= bit) return [];

  var noktalar = [bas.getTime()];
  for (var i = 0; i < oranlar.length; i++) {
    var oT = new Date(oranlar[i].baslangic); oT.setHours(0,0,0,0);
    if (oT > bas && oT < bit) noktalar.push(oT.getTime());
  }
  noktalar.push(bit.getTime());
  noktalar = noktalar.filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return a-b;});

  var dilimler = [];
  for (var d = 0; d < noktalar.length - 1; d++) {
    var dBas = new Date(noktalar[d]);
    var dBit = new Date(noktalar[d+1]);
    var gun = Math.round((dBit - dBas) / 86400000);
    if (gun <= 0) continue;
    var oran = 0;
    for (var o = oranlar.length - 1; o >= 0; o--) {
      var oTarih = new Date(oranlar[o].baslangic); oTarih.setHours(0,0,0,0);
      if (oTarih <= dBas) { oran = oranlar[o].oran; break; }
    }
    dilimler.push({baslangic:dBas.toISOString().split('T')[0], bitis:dBit.toISOString().split('T')[0], gun:gun, oran:oran});
  }
  return dilimler;
}

function faizHesapla(anapara, basTarih, bitTarih, faizTuruId) {
  var turObj = FAIZ_TURLERI.find(function(t){return t.id===faizTuruId;});
  var oranKey = turObj ? turObj.oranKey : 'yasal';
  var dilimler = _faizDilimleri(basTarih, bitTarih, oranKey);
  var toplamFaiz = 0, toplamGun = 0, detay = [];

  for (var i = 0; i < dilimler.length; i++) {
    var dl = dilimler[i];
    var dilimFaiz = anapara * (dl.oran / 100) / 365 * dl.gun;
    dilimFaiz = Math.round(dilimFaiz * 100) / 100;
    toplamFaiz += dilimFaiz;
    toplamGun += dl.gun;
    detay.push({baslangic:dl.baslangic, bitis:dl.bitis, gun:dl.gun, oran:dl.oran, faiz:dilimFaiz});
  }
  return {
    anapara:anapara, toplamFaiz:Math.round(toplamFaiz*100)/100,
    genelToplam:Math.round((anapara+toplamFaiz)*100)/100,
    toplamGun:toplamGun, dilimSayisi:detay.length, detay:detay,
    faizTuru:turObj ? turObj.ad : faizTuruId, oranKey:oranKey,
  };
}

// ════════════════════════════════════════════════════════════════
// SÜRE HESAPLAYICI
// ════════════════════════════════════════════════════════════════
var SURELER = [
  {kat:'HMK', ad:'Cevap dilekçesi süresi', gun:14, madde:'HMK m.127'},
  {kat:'HMK', ad:'Cevaba cevap dilekçesi', gun:14, madde:'HMK m.136/1'},
  {kat:'HMK', ad:'İkinci cevap dilekçesi', gun:14, madde:'HMK m.136/1'},
  {kat:'HMK', ad:'İstinaf süresi', gun:14, madde:'HMK m.345'},
  {kat:'HMK', ad:'Temyiz süresi', gun:14, madde:'HMK m.361'},
  {kat:'HMK', ad:'Karar düzeltme süresi', gun:15, madde:'HMK m.363'},
  {kat:'HMK', ad:'İhtiyati tedbire itiraz', gun:7, madde:'HMK m.394'},
  {kat:'İİK', ad:'Ödeme emrine itiraz (ilamsız)', gun:7, madde:'İİK m.62'},
  {kat:'İİK', ad:'Kambiyo senedine itiraz', gun:5, madde:'İİK m.168/5'},
  {kat:'İİK', ad:'İcra emrine itiraz (ilamlı)', gun:7, madde:'İİK m.33'},
  {kat:'İİK', ad:'İtirazın iptali davası', gun:365, madde:'İİK m.67 (1 yıl)'},
  {kat:'İİK', ad:'İtirazın kaldırılması', gun:180, madde:'İİK m.68 (6 ay)'},
  {kat:'İİK', ad:'Menfi tespit davası', gun:7, madde:'İİK m.72'},
  {kat:'İİK', ad:'İstihkak davası', gun:7, madde:'İİK m.97'},
  {kat:'İş', ad:'İşe iade davası', gun:30, madde:'İş K. m.20'},
  {kat:'İş', ad:'Arabuluculuk sonrası dava', gun:14, madde:'7036 s.K. m.3/15'},
  {kat:'İş', ad:'Kıdem tazminatı zamanaşımı', gun:1825, madde:'İş K. Geçici m.7 (5 yıl)'},
  {kat:'Ceza', ad:'İstinaf süresi (ceza)', gun:7, madde:'CMK m.273'},
  {kat:'Ceza', ad:'Temyiz süresi (ceza)', gun:15, madde:'CMK m.291'},
  {kat:'Ceza', ad:'İtiraz süresi', gun:7, madde:'CMK m.268'},
  {kat:'İdare', ad:'İptal davası süresi', gun:60, madde:'İYUK m.7'},
  {kat:'İdare', ad:'Tam yargı davası', gun:60, madde:'İYUK m.13'},
  {kat:'İdare', ad:'İstinaf süresi (idari)', gun:30, madde:'İYUK m.45'},
];

var TATILLER = [
  '2024-01-01','2024-04-10','2024-04-11','2024-04-12','2024-04-23','2024-05-01',
  '2024-06-16','2024-06-17','2024-06-18','2024-06-19','2024-07-15','2024-08-30','2024-10-28','2024-10-29',
  '2025-01-01','2025-03-30','2025-03-31','2025-04-01','2025-04-23','2025-05-01',
  '2025-06-06','2025-06-07','2025-06-08','2025-06-09','2025-07-15','2025-08-30','2025-10-28','2025-10-29',
  '2026-01-01','2026-03-20','2026-03-21','2026-03-22','2026-04-23','2026-05-01',
  '2026-05-26','2026-05-27','2026-05-28','2026-05-29','2026-07-15','2026-08-30','2026-10-28','2026-10-29',
];

function _tatilMi(d) {
  var s = d.toISOString().split('T')[0];
  return TATILLER.indexOf(s) >= 0 || d.getDay() === 0 || d.getDay() === 6;
}

function sureHesapla(basTarih, gun) {
  var d = new Date(basTarih); d.setHours(0,0,0,0); d.setDate(d.getDate()+1);
  var kalan = gun;
  while (kalan > 0) { if (!_tatilMi(d)) kalan--; if (kalan > 0) d.setDate(d.getDate()+1); }
  while (_tatilMi(d)) d.setDate(d.getDate()+1);
  return d.toISOString().split('T')[0];
}

// ════════════════════════════════════════════════════════════════
// VEKALET ÜCRETİ (AAÜT 2024)
// ════════════════════════════════════════════════════════════════
var AAUT = [
  {ad:'Danışma (sözlü)',ucret:4700},{ad:'Danışma (yazılı)',ucret:12000},
  {ad:'Ceza — Sulh Ceza',ucret:12500},{ad:'Ceza — Asliye Ceza',ucret:20000},{ad:'Ceza — Ağır Ceza',ucret:32000},
  {ad:'Hukuk — Sulh Hukuk',ucret:12500},{ad:'Hukuk — Asliye Hukuk',ucret:20000},
  {ad:'Hukuk — Asliye Ticaret',ucret:27000},{ad:'Hukuk — İş Mahkemesi',ucret:16500},
  {ad:'Hukuk — Aile Mahkemesi',ucret:16500},{ad:'Hukuk — Tüketici Mahkemesi',ucret:7600},
  {ad:'İcra Takibi (ilamsız)',ucret:7000},{ad:'İcra Takibi (ilamlı)',ucret:7000},
  {ad:'İcra — İtirazın kaldırılması',ucret:7600},{ad:'İcra — İtirazın iptali',ucret:16500},
  {ad:'İstinaf (Hukuk)',ucret:16500},{ad:'İstinaf (Ceza)',ucret:16500},
  {ad:'Temyiz (Hukuk)',ucret:20000},{ad:'Temyiz (Ceza)',ucret:20000},
  {ad:'İdare — İptal davası',ucret:16500},{ad:'İdare — Tam yargı',ucret:20000},
  {ad:'Arabuluculuk',ucret:7600},{ad:'Tahkim',ucret:32000},
];

function vekaletHesapla(davaTuru, davaDeger) {
  var t = AAUT.find(function(a){return a.ad===davaTuru;}); var maktu = t ? t.ucret : 16500;
  var nispi = davaDeger > 0 ? davaDeger * 0.15 : 0;
  return {maktu:maktu, nispi:Math.round(nispi*100)/100, onerilen:Math.max(maktu, nispi)};
}

// ════════════════════════════════════════════════════════════════
// MODAL UI
// ════════════════════════════════════════════════════════════════
function ac(sekme) {
  var m = document.getElementById('arac-kutusu-modal');
  if (!m) { m = document.createElement('div'); m.className='modal-overlay'; m.id='arac-kutusu-modal';
    m.innerHTML='<div class="modal modal-lg" style="max-width:900px;max-height:92vh;display:flex;flex-direction:column">' +
      '<div class="modal-header" style="flex-shrink:0"><div class="modal-title">🧰 Avukat Araç Kutusu</div></div>' +
      '<div class="tabs" style="padding:0 20px;flex-shrink:0"><div class="tab active" onclick="AracKutusu.tab(\'faiz\',this)">💰 Faiz Hesapla</div>' +
      '<div class="tab" onclick="AracKutusu.tab(\'sure\',this)">⏱ Süre Hesapla</div>' +
      '<div class="tab" onclick="AracKutusu.tab(\'ucret\',this)">⚖️ Vekalet Ücreti</div></div>' +
      '<div id="ak-icerik" style="flex:1;overflow-y:auto;padding:20px"></div>' +
      '<div class="modal-footer" style="flex-shrink:0"><button class="btn btn-outline" onclick="closeModal(\'arac-kutusu-modal\')">Kapat</button></div></div>';
    document.body.appendChild(m);
  }
  m.classList.add('open');
  aracTab(sekme||'faiz');
}

function aracTab(s, el) {
  if(el){el.parentElement.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});el.classList.add('active');}
  var ic=document.getElementById('ak-icerik'); if(!ic)return;
  if(s==='faiz')_renderFaiz(ic); else if(s==='sure')_renderSure(ic); else if(s==='ucret')_renderUcret(ic);
}

// ── FAİZ UI ──────────────────────────────────────────────────
function _renderFaiz(el) {
  var oranBilgi = _yuklendi ? Object.keys(_oranlar).length + ' tür, Supabase' : 'Fallback';

  // Faiz türleri select — kategorilere göre grupla
  var optHtml = '';
  var gruplar = {};
  FAIZ_TURLERI.forEach(function(t) {
    var kat = t.id.includes('gecikme') ? 'Kamu / Vergi / SGK' :
              t.id.includes('temerr') ? 'Temerrüt' :
              (t.id==='kidem'||t.id==='is_kazasi'||t.id==='nafaka'||t.id==='kira'||t.id==='kamuLastirma'||t.id==='sigorta') ? 'Özel Alacak Türleri' :
              'Temel Faiz Oranları';
    if(!gruplar[kat]) gruplar[kat]=[];
    gruplar[kat].push(t);
  });
  Object.keys(gruplar).forEach(function(kat) {
    optHtml += '<optgroup label="' + kat + '">';
    gruplar[kat].forEach(function(t) {
      optHtml += '<option value="' + t.id + '" data-madde="' + t.madde + '" data-acik="' + t.aciklama + '">' + t.ad + '</option>';
    });
    optHtml += '</optgroup>';
  });

  el.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
      '<div style="font-size:15px;font-weight:700">💰 Faiz Hesaplayıcı</div>' +
      '<div style="font-size:10px;color:var(--text-dim)">' + oranBilgi + '</div></div>' +
    '<div style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:8px;padding:12px;margin-bottom:16px;font-size:11px;color:var(--text-muted)">' +
      '⚠️ <b>Dönemsel oran değişimi desteklenir.</b> Her oran değişikliği ayrı dilim olarak hesaplanır. Tek oran hatası yapılmaz.</div>' +
    '<div class="form-row"><div class="form-group"><label>Faiz Türü</label><select id="ak-f-tur" onchange="AracKutusu._faizTurBilgi()">' + optHtml + '</select></div>' +
    '<div class="form-group"><label>Anapara (₺)</label><input type="number" id="ak-f-anapara" value="100000" step="0.01"></div></div>' +
    '<div id="ak-f-tur-bilgi" style="font-size:11px;color:var(--text-muted);margin-bottom:12px;padding:6px 10px;background:var(--surface2);border-radius:6px"></div>' +
    '<div class="form-row"><div class="form-group"><label>Başlangıç Tarihi</label><input type="date" id="ak-f-bas"></div>' +
    '<div class="form-group"><label>Bitiş Tarihi</label><input type="date" id="ak-f-bit"></div></div>' +
    '<button class="btn btn-gold" onclick="AracKutusu.hesaplaFaiz()" style="width:100%;margin-bottom:16px">📊 Hesapla</button>' +
    '<div id="ak-f-sonuc"></div>';
  document.getElementById('ak-f-bit').value = today();
  _faizTurBilgi();
}

function _faizTurBilgi() {
  var sel = document.getElementById('ak-f-tur'); if(!sel) return;
  var opt = sel.options[sel.selectedIndex];
  var el = document.getElementById('ak-f-tur-bilgi');
  if(el) el.innerHTML = '📖 <b>' + (opt.dataset.madde||'') + '</b> — ' + (opt.dataset.acik||'');
}

function hesaplaFaiz() {
  var anapara = parseFloat(document.getElementById('ak-f-anapara').value) || 0;
  var bas = document.getElementById('ak-f-bas').value;
  var bit = document.getElementById('ak-f-bit').value;
  var turId = document.getElementById('ak-f-tur').value;
  if (anapara<=0) { notify('⚠️ Anapara girin'); return; }
  if (!bas||!bit) { notify('⚠️ Tarih aralığı girin'); return; }
  if (bas>=bit) { notify('⚠️ Bitiş tarihi başlangıçtan sonra olmalı'); return; }

  var sonuc = faizHesapla(anapara, bas, bit, turId);
  var el = document.getElementById('ak-f-sonuc');

  var html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">' +
    '<div style="background:var(--surface2);border-radius:8px;padding:14px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">ANAPARA</div><div style="font-size:18px;font-weight:800">' + fmt(sonuc.anapara) + '</div></div>' +
    '<div style="background:rgba(231,76,60,.06);border:1px solid rgba(231,76,60,.2);border-radius:8px;padding:14px;text-align:center"><div style="font-size:10px;color:#e74c3c">FAİZ TUTARI</div><div style="font-size:18px;font-weight:800;color:#e74c3c">' + fmt(sonuc.toplamFaiz) + '</div></div>' +
    '<div style="background:rgba(39,174,96,.06);border:1px solid rgba(39,174,96,.2);border-radius:8px;padding:14px;text-align:center"><div style="font-size:10px;color:var(--green)">GENEL TOPLAM</div><div style="font-size:18px;font-weight:800;color:var(--green)">' + fmt(sonuc.genelToplam) + '</div></div></div>';

  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">' + sonuc.faizTuru + ' · ' + sonuc.toplamGun + ' gün · ' + sonuc.dilimSayisi + ' oran dilimi</div>';

  html += '<table><thead><tr><th>Dönem Başlangıç</th><th>Dönem Bitiş</th><th>Gün</th><th>Oran (%)</th><th style="text-align:right">Faiz (₺)</th></tr></thead><tbody>';
  var prevOran = -1;
  sonuc.detay.forEach(function(d) {
    var degisti = prevOran >= 0 && d.oran !== prevOran;
    prevOran = d.oran;
    html += '<tr' + (degisti ? ' style="background:rgba(201,168,76,.06)"' : '') + '>' +
      '<td>' + fmtD(d.baslangic) + '</td><td>' + fmtD(d.bitis) + '</td><td>' + d.gun + '</td>' +
      '<td>' + (degisti ? '<b style="color:var(--gold)">%'+d.oran+' ⬆</b>' : '%'+d.oran) + '</td>' +
      '<td style="text-align:right;font-weight:600">' + fmt(d.faiz) + '</td></tr>';
  });
  html += '<tr style="font-weight:700;border-top:2px solid var(--border)"><td colspan="2">TOPLAM</td><td>' + sonuc.toplamGun + '</td><td></td><td style="text-align:right;color:#e74c3c">' + fmt(sonuc.toplamFaiz) + '</td></tr>';
  html += '</tbody></table>';
  el.innerHTML = html;
}

// ── SÜRE UI ──────────────────────────────────────────────────
function _renderSure(el) {
  var gruplar = {}; SURELER.forEach(function(s){if(!gruplar[s.kat])gruplar[s.kat]=[];gruplar[s.kat].push(s);});
  var optH = '<option value="">— Süre türü seçin —</option>';
  Object.keys(gruplar).forEach(function(k) {
    optH += '<optgroup label="'+k+'">';
    gruplar[k].forEach(function(s){optH += '<option value="'+s.gun+'" data-madde="'+s.madde+'">'+s.ad+' ('+s.gun+' gün — '+s.madde+')</option>';});
    optH += '</optgroup>';
  });
  el.innerHTML =
    '<div style="font-size:15px;font-weight:700;margin-bottom:16px">⏱ Yasal Süre Hesaplayıcı</div>' +
    '<div style="background:rgba(41,128,185,.06);border:1px solid rgba(41,128,185,.2);border-radius:8px;padding:12px;margin-bottom:16px;font-size:11px;color:var(--text-muted)">' +
      'Hafta sonları ve resmi tatiller otomatik atlanır. Son gün tatile denk gelirse bir sonraki iş gününe kaydırılır.</div>' +
    '<div class="form-row"><div class="form-group"><label>Süre Türü</label><select id="ak-s-tur" onchange="AracKutusu._sureSecildi()">' + optH + '</select></div></div>' +
    '<div class="form-row"><div class="form-group"><label>Tebliğ / Başlangıç Tarihi</label><input type="date" id="ak-s-bas"></div>' +
    '<div class="form-group"><label>Gün Sayısı</label><input type="number" id="ak-s-gun" min="1" value="14"></div></div>' +
    '<div style="font-size:10px;color:var(--text-dim);margin-bottom:12px" id="ak-s-madde"></div>' +
    '<button class="btn btn-gold" onclick="AracKutusu.hesaplaSure()" style="width:100%;margin-bottom:16px">📊 Hesapla</button>' +
    '<div id="ak-s-sonuc"></div>';
  document.getElementById('ak-s-bas').value = today();
}
function _sureSecildi(){var s=document.getElementById('ak-s-tur');document.getElementById('ak-s-gun').value=s.value||14;var o=s.options[s.selectedIndex];var m=document.getElementById('ak-s-madde');if(m)m.textContent=o.dataset.madde?'📖 '+o.dataset.madde:'';}

function hesaplaSure() {
  var bas=document.getElementById('ak-s-bas').value;var gun=parseInt(document.getElementById('ak-s-gun').value)||0;
  if(!bas){notify('⚠️ Başlangıç tarihi girin');return;} if(gun<=0){notify('⚠️ Gün sayısı girin');return;}
  var sonTarih=sureHesapla(bas,gun);var kalan=Math.ceil((new Date(sonTarih)-new Date())/86400000);
  var renk=kalan<=0?'#e74c3c':kalan<=3?'#e67e22':kalan<=7?'#f39c12':'var(--green)';
  var durum=kalan<=0?'❌ SÜRESİ GEÇTİ':kalan<=3?'🚨 '+kalan+' gün kaldı!':'✅ '+kalan+' gün kaldı';
  document.getElementById('ak-s-sonuc').innerHTML =
    '<div style="background:'+renk+'11;border:2px solid '+renk+';border-radius:12px;padding:24px;text-align:center">' +
    '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">SON TARİH</div>' +
    '<div style="font-size:32px;font-weight:800;color:'+renk+'">'+fmtD(sonTarih)+'</div>' +
    '<div style="font-size:14px;margin-top:8px;color:'+renk+'">'+durum+'</div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">Başlangıç: '+fmtD(bas)+' + '+gun+' iş günü (tatiller hariç)</div></div>' +
    '<div style="display:flex;gap:8px;margin-top:12px;justify-content:center">' +
    '<button class="btn btn-outline btn-sm" onclick="AracKutusu._sureTakvimeEkle(\''+sonTarih+'\')">📅 Takvime Ekle</button>' +
    '<button class="btn btn-outline btn-sm" onclick="AracKutusu._sureTodoyaEkle(\''+sonTarih+'\')">✅ Göreve Ekle</button></div>';
}
function _sureTakvimeEkle(t){openTakModal(t);closeModal('arac-kutusu-modal');}
function _sureTodoyaEkle(t){if(typeof openTodoModal==='function')openTodoModal();var e=document.getElementById('todo-son-tarih');if(e)e.value=t;closeModal('arac-kutusu-modal');}

// ── VEKALET ÜCRETİ UI ───────────────────────────────────────
function _renderUcret(el) {
  var optH='';AAUT.forEach(function(a){optH+='<option value="'+a.ad+'">'+a.ad+' — '+fmt(a.ucret)+'</option>';});
  el.innerHTML =
    '<div style="font-size:15px;font-weight:700;margin-bottom:16px">⚖️ Vekalet Ücreti Hesaplayıcı <span style="font-size:11px;color:var(--text-muted);font-weight:400">(AAÜT 2024)</span></div>' +
    '<div class="form-row"><div class="form-group"><label>Dava / İş Türü</label><select id="ak-u-tur">'+optH+'</select></div>' +
    '<div class="form-group"><label>Dava Değeri (₺, opsiyonel)</label><input type="number" id="ak-u-deger" step="0.01" placeholder="Nispi hesap için"></div></div>' +
    '<button class="btn btn-gold" onclick="AracKutusu.hesaplaUcret()" style="width:100%;margin-bottom:16px">📊 Hesapla</button>' +
    '<div id="ak-u-sonuc"></div>';
}
function hesaplaUcret() {
  var tur=document.getElementById('ak-u-tur').value;var deger=parseFloat(document.getElementById('ak-u-deger').value)||0;
  var s=vekaletHesapla(tur,deger);
  document.getElementById('ak-u-sonuc').innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">' +
    '<div style="background:var(--surface2);border-radius:8px;padding:14px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">MAKTU (AAÜT)</div><div style="font-size:18px;font-weight:800">'+fmt(s.maktu)+'</div></div>' +
    (deger>0?'<div style="background:var(--surface2);border-radius:8px;padding:14px;text-align:center"><div style="font-size:10px;color:var(--text-muted)">NİSPİ (%15)</div><div style="font-size:18px;font-weight:800">'+fmt(s.nispi)+'</div></div>':'<div></div>') +
    '<div style="background:rgba(201,168,76,.1);border:1px solid var(--gold);border-radius:8px;padding:14px;text-align:center"><div style="font-size:10px;color:var(--gold)">ÖNERİLEN ASGARİ</div><div style="font-size:18px;font-weight:800;color:var(--gold)">'+fmt(s.onerilen)+'</div></div></div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:10px">⚠️ Nispi ücret, dava değerinin %15\'idir. Maktu altında ücret kararlaştırılamaz (AAÜT 2024).</div>';
}

// ── PUBLIC API ───────────────────────────────────────────────
return {
  oranlariYukle:oranlariYukle, faizHesapla:faizHesapla, sureHesapla:sureHesapla, vekaletHesapla:vekaletHesapla,
  ac:ac, tab:aracTab, hesaplaFaiz:hesaplaFaiz, hesaplaSure:hesaplaSure, hesaplaUcret:hesaplaUcret,
  _faizTurBilgi:_faizTurBilgi, _sureSecildi:_sureSecildi, _sureTakvimeEkle:_sureTakvimeEkle, _sureTodoyaEkle:_sureTodoyaEkle,
  _faizTurBilgiPage: function() {
    var sel = document.getElementById('ak-page-tur'); if(!sel) return;
    var opt = sel.options[sel.selectedIndex];
    var el = document.getElementById('ak-page-tur-bilgi');
    if(el && opt) el.innerHTML = '📖 <b>' + (opt.dataset.madde||'') + '</b> — ' + (opt.dataset.acik||'');
  },
  FAIZ_TURLERI:FAIZ_TURLERI, SURELER:SURELER, AAUT:AAUT,
  getOranlar:function(){return _oranlar;}, isYuklendi:function(){return _yuklendi;},
};
})();
