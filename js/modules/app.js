// ================================================================
// EMD HUKUK — UYGULAMA BAŞLATICI
// js/modules/app.js
// ================================================================

// ── Header "Yeni Oluştur" Dropdown ──
function toggleYeniMenu() {
  var menu = document.getElementById('header-yeni-menu');
  if (menu) menu.classList.toggle('open');
}
function closeYeniMenu() {
  var menu = document.getElementById('header-yeni-menu');
  if (menu) menu.classList.remove('open');
}
// Dışarı tıklayınca kapat
document.addEventListener('click', function(e) {
  var wrap = document.getElementById('header-yeni-wrap');
  if (wrap && !wrap.contains(e.target)) closeYeniMenu();
});

function exportMuvExcel(){
  const m=getMuv(aktivMuvId);if(!m)return;
  const wb=XLSX.utils.book_new();
  const bilgi=[['MÜVEKKİL RAPORU'],[''],['Ad',m.ad],['TC',m.tc||''],['Tel',m.tel||''],['E-posta',m.mail||''],['Tarih',fmtD(today())]];
  const wsB=XLSX.utils.aoa_to_sheet(bilgi);wsB['!cols']=[{wch:18},{wch:40}];XLSX.utils.book_append_sheet(wb,wsB,'Genel');
  const davs=state.davalar.filter(d=>d.muvId===aktivMuvId);
  const dRows=[['Dosya No','Konu','Mahkeme','Aşama','Durum','Açılış','Son Duruşma']];
  davs.forEach(d=>dRows.push([d.no,d.konu,[d.il,d.mtur,d.mno].filter(Boolean).join(' '),d.asama||'',d.durum,fmtD(d.tarih),fmtD(d.durusma)]));
  const wsD=XLSX.utils.aoa_to_sheet(dRows);wsD['!cols']=[{wch:12},{wch:25},{wch:28},{wch:14},{wch:12},{wch:12},{wch:14}];XLSX.utils.book_append_sheet(wb,wsD,'Davalar');
  const harc=getAllMuvHarcamalar(aktivMuvId);
  const hRows=[['Tarih','Kaynak','Mahkeme/Dosya','Kategori','Açıklama','Tutar']];
  harc.forEach(h=>hRows.push([fmtD(h.tarih),h.kaynak,h.mahkeme||'',h.kat||'',h.acik||'',h.tutar]));
  if(harc.length)hRows.push(['','','','','TOPLAM',harc.reduce((s,h)=>s+h.tutar,0)]);
  const wsH=XLSX.utils.aoa_to_sheet(hRows);wsH['!cols']=[{wch:12},{wch:8},{wch:28},{wch:20},{wch:28},{wch:14}];XLSX.utils.book_append_sheet(wb,wsH,'Harcamalar');
  const avs=state.avanslar.filter(a=>a.muvId===aktivMuvId);
  const aRows=[['Tarih','Tür','Açıklama','Tutar','Durum','Ödeme']];
  avs.forEach(a=>aRows.push([fmtD(a.tarih),a.tur,a.acik||'',a.tutar,a.durum,fmtD(a.odeme)]));
  const wsA=XLSX.utils.aoa_to_sheet(aRows);wsA['!cols']=[{wch:12},{wch:25},{wch:28},{wch:14},{wch:12},{wch:12}];XLSX.utils.book_append_sheet(wb,wsA,'Avans & Alacak');
  XLSX.writeFile(wb,`${m.ad.replace(/\s/g,'_')}_rapor_${today()}.xlsx`);notify('✓ Excel indirildi');
}

// ================================================================
// BADGES
// ================================================================
function updateBadges(){
  const toplamRehber=state.muvekkillar.length+(state.karsiTaraflar||[]).length+(state.vekillar||[]).length;
  const aktifDav=state.davalar.filter(d=>d.durum==='Aktif').length;
  const aktifIcr=state.icra.filter(i=>i.durum!=='Kapandı').length;
  const t=today(),f=new Date();f.setDate(f.getDate()+7);const fS=f.toISOString().split('T')[0];
  const takSayi=state.etkinlikler.filter(e=>e.tarih>=t&&e.tarih<=fS).length;
  const danSayi=state.danismanlik.filter(d=>d.durum!=='Tamamlandı'&&d.durum!=='İptal').length;
  const arabAktif=(state.arabuluculuk||[]).filter(a=>a.durum!=='Uzlaşma Sağlandı'&&a.durum!=='Dava Açıldı').length;
  // Badge helper: değeri yaz, 0 ise gizle
  function _setBadge(id,val){var el=document.getElementById(id);if(!el)return;el.textContent=val;el.classList.toggle('badge-hidden',val===0||val==='0');}
  _setBadge('nb-muv',toplamRehber);
  _setBadge('nb-dav',aktifDav);
  _setBadge('nb-icr',aktifIcr);
  _setBadge('nb-tak',takSayi);
  _setBadge('nb-dan',danSayi);
  _setBadge('nb-arab',arabAktif);
  // İhtarname badge
  var ihtarSayi=(state.ihtarnameler||[]).filter(function(i){return i.durum!=='Gönderildi'&&i.durum!=='Tamamlandı';}).length;
  _setBadge('nb-ihtar',ihtarSayi);
  // Todo badge
  var todoSayi=(state.todolar||[]).filter(function(td){return td.durum!=='Tamamlandı';}).length;
  _setBadge('nb-todo',todoSayi);
  // Finans uyarı badge
  const nbFin=document.getElementById('nb-fin');
  if(nbFin){
    const finUyari=typeof FinansMotoru!=='undefined'?FinansMotoru.hesaplaUyarilar().filter(u=>u.oncelik==='yuksek').length:0;
    nbFin.textContent=finUyari;
    nbFin.classList.toggle('badge-hidden',finUyari===0);
  }
  updateUyapBadge();
}

// ================================================================
// INIT
// ================================================================
function init(){
  // Önce localStorage'dan yükle
  loadData();
  if(!state.icra)state.icra=[];
  if(!state.avanslar)state.avanslar=[];
  if(!state.karsiTaraflar)state.karsiTaraflar=[];
  if(!state.vekillar)state.vekillar=[];
  if(!state.arabuluculuk)state.arabuluculuk=[];
  if(!state.danismanlik)state.danismanlik=[];
  // Veri yoksa (localStorage çalışmıyor olabilir) direkt state'e yükle
  // Demo veri artık otomatik yüklenmiyor — Ayarlar > Demo Veri'den manuel yüklenebilir
  // Normalize
  state.davalar.forEach(d=>ensureArrays(d,['evraklar','notlar','harcamalar','tahsilatlar']));
  state.icra.forEach(i=>ensureArrays(i,['evraklar','notlar','harcamalar','tahsilatlar']));
  document.getElementById('header-date').textContent=new Date().toLocaleDateString('tr-TR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  initCal();
  renderMuvekkillar();renderDavalar();renderDavaCards();renderIcra();renderIcraCards();renderButce();renderDanismanlik();renderDashboard();if(typeof renderIhtarname==="function")renderIhtarname();if(typeof renderTodo==="function")renderTodo();updateBadges();
  document.querySelector('#dav-modal .btn-gold').onclick=saveDava;
}



// ================================================================
// DEMO VERİ — YENİ SEED SİSTEMİ (seed.js)
// ================================================================
// Eski hardcoded demo veriler kaldırıldı.
// Yeni sistem LexSeed modülünü kullanır.

function seedYukle() {
  if (state.muvekkillar.length > 0) {
    if (!confirm('⚠️ Mevcut tüm veriler silinecek ve gerçekçi demo veriler yüklenecek. Emin misiniz?')) return;
  }
  var btn = document.getElementById('seed-yukle-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="btn-spinner"></span> Yükleniyor...'; }
  var prog = document.getElementById('seed-progress');
  if (prog) prog.style.display = 'block';

  // Async çalıştır — UI thread'i bloklamadan
  setTimeout(function() {
    try {
      if (typeof LexSeed !== 'undefined') {
        LexSeed.calistir();
      } else {
        notify('❌ Seed modülü yüklenemedi');
      }
    } catch(e) {
      notify('❌ Demo veri hatası: ' + e.message);
      console.error('[Seed]', e);
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '🚀 Demo Veri Oluştur'; }
  }, 100);
}

function seedTemizle() {
  if (!confirm('⚠️ TÜM VERİLER SİLİNECEK (geri alınamaz). Emin misiniz?')) return;
  if (!confirm('⚠️ Son şans — bu işlem geri alınamaz! Devam?')) return;

  // Tüm koleksiyonları temizle
  var keys = Object.keys(state);
  keys.forEach(function(k) {
    if (Array.isArray(state[k])) state[k] = [];
  });
  saveData();

  // UI yenile
  try {
    renderMuvekkillar(); renderDavalar(); renderDavaCards();
    renderIcra(); renderIcraCards(); renderButce(); renderDanismanlik();
    renderDashboard(); updateBadges();
    if (typeof renderIhtarname === 'function') renderIhtarname();
    if (typeof renderTodo === 'function') renderTodo();
    if (typeof renderArabuluculuk === 'function') renderArabuluculuk();
    if (typeof refreshFinansViews === 'function') refreshFinansViews();
  } catch(e) { console.warn('[App] Seed temizleme sonrası UI yenileme hatası:', e.message || e); }
  notify('🗑️ Tüm veriler silindi');
}

// Eski fonksiyon isimleri geriye uyumluluk için
function demoVeriYukle() { seedYukle(); }
function demoVeriSil() { seedTemizle(); }
function demoVeriyiYukle() { seedYukle(); }
function seedDemoEkstra() {} // artık kullanılmıyor
function seedTestData() {} // artık kullanılmıyor

function yetkiVar(yetkiId) {
  if (!currentUser) return false;
  if (currentUser.rol === 'sahip') return true; // sahip her şeyi yapabilir
  const yetkiler = currentUser.yetkiler || {};
  if (yetkiler === 'tam') return true;
  return yetkiler[yetkiId] === 'tam';
}

function yetkiGoruntule(yetkiId) {
  if (!currentUser) return false;
  if (currentUser.rol === 'sahip') return true;
  const yetkiler = currentUser.yetkiler || {};
  if (yetkiler === 'tam') return true;
  return yetkiler[yetkiId] === 'tam' || yetkiler[yetkiId] === 'goruntule';
}

// ── Personel sayfası render ──────────────────────────────────────
function renderPersonelSayfasi() {
  // Yetki kontrolü
  const ekleBtn = document.getElementById('personel-ekle-btn');
  const gorevEkleBtn = document.getElementById('gorev-ekle-btn');
  if (ekleBtn) ekleBtn.style.display = yetkiVar('per_yonet') ? '' : 'none';
  if (gorevEkleBtn) gorevEkleBtn.style.display = yetkiVar('per_gorev') ? '' : 'none';
  renderPersonelListe();
  renderGorevPersonelSelect();
  renderAktiviteKisiSelect();
}

function personelTab(tab, el) {
  ['liste','gorevler','aktivite'].forEach(t => {
    document.getElementById('personel-tab-' + t).style.display = t===tab ? '' : 'none';
    document.getElementById('pt-' + t)?.classList.toggle('active', t===tab);
  });
  if (tab==='gorevler') renderGorevler();
  if (tab==='aktivite') renderAktiviteLog();
}

// Rol badge HTML
function rolBadgeHTML(rol) {
  const map = {
    sahip: ['rol-sahip','👑 Büro Sahibi'],
    avukat: ['rol-avukat','⚖️ Avukat'],
    stajyer: ['rol-stajyer','📚 Stajyer'],
    sekreter: ['rol-sekreter','📋 Sekreter'],
    muhasebe: ['rol-muhasebe','💰 Muhasebe'],
    diger: ['rol-avukat','👤 Diğer'],
  };
  const [cls, lbl] = map[rol] || ['rol-avukat', rol];
  return `<span class="personel-rol-badge ${cls}">${lbl}</span>`;
}

function personelAvatarRenk(rol) {
  const map = { sahip:'#c9a84c', avukat:'#2980b9', stajyer:'#C9A84C', sekreter:'#27ae60', muhasebe:'#e74c3c', diger:'#7f8c8d' };
  return map[rol] || '#7f8c8d';
}