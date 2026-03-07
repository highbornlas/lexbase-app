// ================================================================
// EMD HUKUK — SUPABASE CLIENT
// js/modules/supabase-client.js
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
      'todolar', 'personel', 'karsi_taraflar', 'vekillar'
    ];

    const sonuclar = await Promise.all(
      tablolar.map(t => sb.from(t).select('id, data').eq('buro_id', currentBuroId))
    );

    // State'e yükle
    const stateMap = {
      'karsi_taraflar': 'karsiTaraflar',
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
// TOPLU KAYDETME (tüm state'i sync)
// Mevcut saveData() fonksiyonunu override eder
// ================================================================

async function saveData() {
  // Her zaman localStorage'a da yaz (offline fallback)
  try { localStorage.setItem(SK, JSON.stringify(state)); } catch(e) {}

  if (!currentBuroId) return;

  // Debounce — 500ms bekle, çok sık yazmayı önle
  clearTimeout(saveData._timer);
  saveData._timer = setTimeout(async () => {
    try {
      await sbTümüSenkronize();
    } catch(e) {
      console.warn('Supabase sync hatası:', e.message);
    }
  }, 500);
}

async function sbTümüSenkronize() {
  if (!currentBuroId) return;

  const eslemeler = {
    'muvekkillar': state.muvekkillar,
    'davalar': state.davalar,
    'icra': state.icra,
    'butce': state.butce,
    'etkinlikler': state.etkinlikler,
    'avanslar': state.avanslar,
    'danismanlik': state.danismanlik,
    'arabuluculuk': state.arabuluculuk,
    'ihtarnameler': state.ihtarnameler || [],
    'todolar': state.todolar || [],
    'personel': state.personel,
    'karsi_taraflar': state.karsiTaraflar,
    'vekillar': state.vekillar,
  };

  for (const [tablo, kayitlar] of Object.entries(eslemeler)) {
    if (!kayitlar || !kayitlar.length) continue;
    const satirlar = kayitlar.map(({ id, ...data }) => ({
      id, buro_id: currentBuroId, data
    }));
    const { error } = await sb.from(tablo).upsert(satirlar);
    if (error) console.warn(`${tablo} sync hatası:`, error.message);
  }
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
}