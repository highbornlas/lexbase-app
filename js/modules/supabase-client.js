// ================================================================
// LEXBASE — SUPABASE CLIENT
// js/modules/supabase-client.js
//
// NOT: SUPABASE_KEY bir anon (publishable) key'dir, client-side
// kullanım için tasarlanmıştır. Güvenlik RLS (Row Level Security)
// kuralları ile sağlanır. Supabase Dashboard'da RLS'in aktif
// olduğundan emin olun.
// ================================================================

const SUPABASE_URL = 'https://omsahlgcuinyfvcuigfj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iUS5jIX8NYPjdstm5U2xkg_MFXprA70';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================================================================
// AUTH
// ================================================================

// Büro sahibi kaydı: email + sifre + ad
async function sbKayitOl(email, sifre, ad, buroAd) {
  const { data, error } = await sb.auth.signUp({
    email, password: sifre,
    options: { data: { ad } }
  });
  if (error) throw error;
  // Admin DB'ye hemen kaydet — SIGNED_IN tetiklenmeden önce
  try {
    if (typeof adminMusteriKayit === 'function') {
      const userId = data?.user?.id || crypto.randomUUID();
      adminMusteriKayit({ id: userId, ad_soyad: ad, email, buro_ad: buroAd || '' });
    }
  } catch(e) { console.warn('adminMusteriKayit:', e); }
  return data;
}

async function sbGirisYap(email, sifre) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: sifre });
  if (error) {
    if (error.message.includes('Invalid login credentials'))
      throw new Error('E-posta veya şifre hatalı.');
    throw error;
  }
  return data;
}

// Çalışan davet — Edge Function üzerinden (admin oturumunu bozmaz)
async function sbCalisanDavet(email, ad, rol, yetkiler = {}) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Oturum bulunamadı');
  const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1`;
  const res = await fetch(`${EDGE_FN_URL}/invite-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_KEY,
    },
    body: JSON.stringify({ email, ad, rol, yetkiler })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Davet gönderilemedi');
  return json;
}

async function sbCikisYap() {
  await sb.auth.signOut();
}

async function sbMevcutKullanici() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: kul } = await sb.from('kullanicilar').select('*').eq('auth_id', user.id).single();
  return kul ? { ...kul, authUser: user } : null;
}

// Auth state değişimini dinle
// onAuthStateChange — globals yüklendikten sonra bağlan
function sbAuthDinle() {
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session && !currentBuroId && !_sbYukleniyor) {
      // Sadece henüz yüklenmemişse çalış (sayfa yenilemede load event halleder)
      // TOKEN_REFRESHED bazen SIGNED_IN tetikler — currentBuroId kontrolü bunu önler
      await sbVeriYukle();
    } else if (event === 'SIGNED_OUT') {
      currentBuroId = null;
      currentUser = null;
      _sbYukleniyor = false;
      if (typeof state !== 'undefined') {
        Object.keys(state).forEach(k => { if (Array.isArray(state[k])) state[k] = []; });
      }
      showLanding();
    }
    // TOKEN_REFRESHED, INITIAL_SESSION vb. — hiçbir şey yapma
  });
}

// ================================================================
// VERİ YÜKLEME (tüm state'i Supabase'den çek)
// ================================================================

let _sbYukleniyor = false;
async function sbVeriYukle() {
  if (_sbYukleniyor) return;
  _sbYukleniyor = true;
  try {
    showYukleniyor(true);

    const kul = await sbMevcutKullanici();
    if (!kul) { showYukleniyor(false); showLanding(); return; }

    currentUser = { id: kul.id, ad: kul.ad, ad_soyad: kul.ad, email: kul.email, rol: kul.rol, buro_ad: '' };
    currentBuroId = kul.buro_id;

    // Büro kaydı henüz oluşmamışsa (yeni kayıt e-posta doğrulanmamış vs.) landing'e dön
    if (!currentBuroId) {
      console.warn('Büro kaydı bulunamadı, kullanıcı kurulum bekleniyor.');
      showYukleniyor(false);
      showLanding();
      return;
    }

    // Tüm tabloları paralel olarak çek
    const tablolar = [
      'muvekkillar', 'davalar', 'icra', 'butce', 'etkinlikler',
      'avanslar', 'danismanlik', 'arabuluculuk', 'ihtarnameler',
      'todolar', 'personel', 'karsi_taraflar', 'vekillar',
      'finans_islemler', 'ucret_anlasmalari'
    ];

    const sonuclar = await Promise.all(
      tablolar.map(t => sb.from(t).select('id, data').eq('buro_id', currentBuroId))
    );

    // State'e yükle
    const stateMap = {
      'karsi_taraflar': 'karsiTaraflar',
      'finans_islemler': 'finansIslemler',
      'ucret_anlasmalari': 'ucretAnlasmalari',
    };
    tablolar.forEach((t, i) => {
      const { data, error } = sonuclar[i];
      if (error) { console.warn(`${t} yüklenemedi:`, error.message); return; }
      const stateKey = stateMap[t] || t;
      if (typeof state !== 'undefined' && stateKey in state) {
        state[stateKey] = (data || []).map(r => ({ id: r.id, ...r.data }));
      }
    });

    // Büro bilgisini çek
    const { data: buro } = await sb.from('burolar').select('*').eq('id', currentBuroId).single();
    if (buro) state.plan = buro.plan || 'deneme';

    // ensure arrays
    ['davalar','icra'].forEach(k => {
      state[k].forEach(d => ensureArrays(d, ['evraklar','notlar','harcamalar','tahsilatlar']));
    });

    showYukleniyor(false);
    // Snapshot al (diff engine için)
    if (typeof _takeSyncSnapshot === 'function') _takeSyncSnapshot();
    // Faiz oranlarını yükle
    if (typeof AracKutusu !== 'undefined') AracKutusu.oranlariYukle();
    // Küçük gecikme ile başlat — DOM hazır olsun
    setTimeout(uygulamayiBaslat, 100);

  } catch (e) {
    console.error('Veri yükleme hatası:', e);
    _sbYukleniyor = false;
    notify('❌ Bağlantı hatası: ' + e.message);
    setTimeout(uygulamayiBaslat, 100);
  } finally {
    _sbYukleniyor = false;
    showYukleniyor(false); // her durumda spinner'ı kapat
  }
}

// ================================================================
// KAYDETME (upsert)
// ================================================================

async function sbKaydet(tablo, kayit) {
  if (!currentBuroId) return;
  const stateToTable = { 'karsiTaraflar': 'karsi_taraflar' };
  const gercekTablo = stateToTable[tablo] || tablo;
  const { id, ...data } = kayit;
  const { error } = await sb.from(gercekTablo).upsert({
    id,
    buro_id: currentBuroId,
    data
  });
  if (error) console.error(`${tablo} kayıt hatası:`, error.message);
}

async function sbSil(tablo, id) {
  if (!currentBuroId) return;
  const stateToTable = { 'karsiTaraflar': 'karsi_taraflar' };
  const gercekTablo = stateToTable[tablo] || tablo;
  const { error } = await sb.from(gercekTablo).delete().eq('id', id).eq('buro_id', currentBuroId);
  if (error) console.error(`${tablo} silme hatası:`, error.message);
}

// ================================================================
// TOPLU KAYDETME — HİBRİT MİMARİ
//
// saveData() her çağrıldığında:
// 1. localStorage'a ANINDA yazar (her zaman, offline'da da)
// 2. Supabase aktifse diff hesaplar → sadece değişen kayıtları gönderir
// 3. Hata varsa kırmızı toast gösterir (sessiz hata YOK)
// 4. F5/tab kapatmada beforeunload ile sync garantisi
//
// Modal formlar için LexSubmit.formKaydet() kullanılır (pessimistic).
// Diğer tüm işlemler (not ekle, harcama ekle vb.) saveData() ile sync.
// ================================================================

// Önceki (localStorage-only) saveData'yı yedekle
const _localSaveData = typeof saveData === 'function' ? saveData : null;

// Snapshot: Son sync edilen state'in kopyası (diff için)
let _syncSnapshot = {};
let _syncInProgress = false;
let _pendingSync = false;

function _takeSyncSnapshot() {
  const KEYS = ['muvekkillar','davalar','icra','butce','etkinlikler','avanslar',
    'danismanlik','arabuluculuk','ihtarnameler','todolar','personel','karsiTaraflar','vekillar',
    'finansIslemler','ucretAnlasmalari'];
  KEYS.forEach(k => {
    const arr = state[k];
    if (Array.isArray(arr)) {
      _syncSnapshot[k] = {};
      arr.forEach(item => { if (item && item.id) _syncSnapshot[k][item.id] = JSON.stringify(item); });
    }
  });
}

function saveData() {
  // ── 1. localStorage'a ANINDA yaz (her zaman) ──
  try { localStorage.setItem(SK, JSON.stringify(state)); } catch(e) {
    console.warn('[LexBase] localStorage yazma hatası:', e.message);
  }

  // ── 2. Supabase aktifse → diff sync ──
  if (!currentBuroId || typeof sb === 'undefined') return;
  _scheduleDiffSync();
}

// Çok kısa debounce (50ms) — ardışık çağrıları birleştir ama F5'e yetecek kadar hızlı
let _diffTimer = null;
function _scheduleDiffSync() {
  if (_diffTimer) clearTimeout(_diffTimer);
  _diffTimer = setTimeout(_executeDiffSync, 50);
}

async function _executeDiffSync() {
  if (_syncInProgress) { _pendingSync = true; return; }
  _syncInProgress = true;

  try {
    const TABLO_MAP = {
      'muvekkillar':'muvekkillar', 'davalar':'davalar', 'icra':'icra',
      'butce':'butce', 'etkinlikler':'etkinlikler', 'avanslar':'avanslar',
      'danismanlik':'danismanlik', 'arabuluculuk':'arabuluculuk',
      'ihtarnameler':'ihtarnameler', 'todolar':'todolar', 'personel':'personel',
      'karsiTaraflar':'karsi_taraflar', 'vekillar':'vekillar',
      'finansIslemler':'finans_islemler', 'ucretAnlasmalari':'ucret_anlasmalari',
      'buroGiderleri':'buro_giderleri',
    };

    for (const [stateKey, tablo] of Object.entries(TABLO_MAP)) {
      const current = state[stateKey];
      if (!Array.isArray(current)) continue;
      const prev = _syncSnapshot[stateKey] || {};
      const currentIds = {};

      // Değişen veya yeni kayıtları bul
      const upserts = [];
      current.forEach(item => {
        if (!item || !item.id) return;
        currentIds[item.id] = true;
        const serialized = JSON.stringify(item);
        if (!prev[item.id] || prev[item.id] !== serialized) {
          const { id, ...data } = item;
          upserts.push({ id, buro_id: currentBuroId, data });
        }
      });

      // Silinen kayıtları bul
      const deletes = [];
      Object.keys(prev).forEach(id => { if (!currentIds[id]) deletes.push(id); });

      // Upsert
      if (upserts.length > 0) {
        const { error } = await sb.from(tablo).upsert(upserts);
        if (error) {
          console.error(`[LexBase] ❌ ${tablo} sync hatası:`, error.message);
          if (typeof notify === 'function') {
            if (error.message.includes('row-level security') || error.message.includes('policy')) {
              notify('🔒 ' + tablo + ': Yetkilendirme hatası — tekrar giriş yapın');
            } else {
              notify('❌ ' + tablo + ': Kayıt senkronizasyon hatası');
            }
          }
        }
      }

      // Delete
      for (const id of deletes) {
        const { error } = await sb.from(tablo).delete().eq('id', id).eq('buro_id', currentBuroId);
        if (error) console.warn(`[LexBase] ${tablo} silme hatası:`, error.message);
      }
    }

    // Snapshot güncelle
    _takeSyncSnapshot();

  } catch (e) {
    console.error('[LexBase] Sync hatası:', e.message);
    if (typeof notify === 'function') notify('❌ Senkronizasyon hatası: ' + e.message);
  } finally {
    _syncInProgress = false;
    if (_pendingSync) { _pendingSync = false; _scheduleDiffSync(); }
  }
}

// ── beforeunload — F5/tab kapatmada son sync (keepalive) ──
// Modern tarayıcılar normal fetch'leri iptal eder. keepalive: true
// veya navigator.sendBeacon ile istek sayfa kapansa da tamamlanır.
window.addEventListener('beforeunload', function() {
  if (!currentBuroId || typeof sb === 'undefined') return;

  // localStorage zaten güncel (saveData'da yazıldı)
  try { localStorage.setItem(SK, JSON.stringify(state)); } catch(e) {}

  // Supabase REST API üzerinden doğrudan keepalive fetch
  // sb client yerine doğrudan REST endpoint kullanıyoruz çünkü
  // supabase-js kütüphanesi keepalive desteklemiyor
  try {
    var supabaseUrl = sb.supabaseUrl || '';
    var supabaseKey = sb.supabaseKey || '';
    if (!supabaseUrl || !supabaseKey) return;

    // Diff hesapla — sadece değişen kayıtları gönder
    var TABLO_MAP = {
      'muvekkillar':'muvekkillar', 'davalar':'davalar', 'icra':'icra',
      'butce':'butce', 'etkinlikler':'etkinlikler', 'avanslar':'avanslar',
      'danismanlik':'danismanlik', 'arabuluculuk':'arabuluculuk',
      'ihtarnameler':'ihtarnameler', 'todolar':'todolar', 'personel':'personel',
      'karsiTaraflar':'karsi_taraflar', 'vekillar':'vekillar',
      'finansIslemler':'finans_islemler', 'ucretAnlasmalari':'ucret_anlasmalari',
      'buroGiderleri':'buro_giderleri',
    };

    for (var stateKey in TABLO_MAP) {
      var current = state[stateKey];
      if (!Array.isArray(current)) continue;
      var prev = _syncSnapshot[stateKey] || {};
      var upserts = [];

      for (var ci = 0; ci < current.length; ci++) {
        var item = current[ci];
        if (!item || !item.id) continue;
        var serialized = JSON.stringify(item);
        if (!prev[item.id] || prev[item.id] !== serialized) {
          var data = {};
          for (var k in item) { if (k !== 'id') data[k] = item[k]; }
          upserts.push({ id: item.id, buro_id: currentBuroId, data: data });
        }
      }

      if (upserts.length > 0) {
        var tablo = TABLO_MAP[stateKey];
        var url = supabaseUrl + '/rest/v1/' + tablo;

        // Yöntem 1: fetch with keepalive (tercih edilen)
        try {
          fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': 'Bearer ' + (sb.auth?.session?.()?.access_token || supabaseKey),
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(upserts),
            keepalive: true  // ← Tarayıcı sayfayı kapatsa da istek tamamlanır
          });
        } catch(fetchErr) {
          // Yöntem 2: navigator.sendBeacon fallback
          try {
            var blob = new Blob([JSON.stringify(upserts)], { type: 'application/json' });
            navigator.sendBeacon(url + '?apikey=' + supabaseKey, blob);
          } catch(beaconErr) {
            // Her iki yöntem de başarısız — en azından localStorage güncel
          }
        }
      }
    }
  } catch(e) {
    // Sessiz başarısızlık — localStorage zaten güncel
  }
});

// İlk snapshot'ı uygulama başladığında al
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(_takeSyncSnapshot, 2000); // Uygulama yüklendikten sonra
  });
}

// ================================================================
// YARDIMCIlar
// ================================================================

// Güvenlik ağı — 8sn sonra spinner hâlâ açıksa zorla kapat
let _spinnerTimeout;
function showYukleniyor(goster) {
  let el = document.getElementById('sb-yukleniyor');
  clearTimeout(_spinnerTimeout);
  if (goster) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'sb-yukleniyor';
      el.innerHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99998;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
        <div style="width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin 1s linear infinite"></div>
        <div style="color:var(--text-muted);font-size:14px">Veriler yükleniyor...</div>
      </div>`;
      document.body.appendChild(el);
    }
    el.style.display = 'block';
    // 8 saniye sonra hâlâ açıksa zorla kapat
    _spinnerTimeout = setTimeout(() => {
      const stuck = document.getElementById('sb-yukleniyor');
      if (stuck) { stuck.remove(); _sbYukleniyor = false; }
      if (typeof uygulamayiBaslat === 'function' && currentBuroId) uygulamayiBaslat();
    }, 8000);
  } else {
    if (el) el.remove(); // tamamen kaldır
  }
}

function showLanding() {
  const app = document.getElementById('app-wrapper');
  if (app) { app.style.display = 'none'; app.classList.remove('visible'); }
  const landing = document.getElementById('landing-screen');
  if (landing) { landing.classList.remove('hidden'); landing.style.display = ''; }
  if (typeof lpRevealInit === 'function') setTimeout(lpRevealInit, 100);
}

function uygulamayiBaslat() {
  showYukleniyor(false); // garantili kapat
  // Event sistemi başlat
  if (typeof registerStandardEvents === 'function') registerStandardEvents();
  // Landing'i gizle
  const landing = document.getElementById('landing-screen');
  if (landing) landing.classList.add('hidden');
  // App'i göster
  const app = document.getElementById('app-wrapper');
  if (app) { app.style.display = ''; app.classList.add('visible'); }
  // Kullanıcı adını göster
  const unEl = document.getElementById('header-user-ad');
  if (unEl && currentUser) unEl.textContent = currentUser.ad;
  // Tema ve yetkiler
  if (typeof temaYukle === 'function') temaYukle();
  if (typeof yetkiMenuGuncelle === 'function') yetkiMenuGuncelle();
  if (typeof planBilgisiGuncelle === 'function') planBilgisiGuncelle();
  renderMuvekkillar(); renderDavalar(); renderDavaCards();
  renderIcra(); renderIcraCards(); renderButce(); renderDanismanlik();
  renderDashboard();
  if (typeof renderIhtarname === 'function') renderIhtarname();
  if (typeof renderTodo === 'function') renderTodo();
  updateBadges();
  // Bildirim sistemi başlat
  if (typeof Bildirim !== 'undefined') Bildirim.baslat();
}