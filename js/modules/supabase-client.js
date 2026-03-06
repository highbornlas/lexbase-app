// ================================================================
// EMD HUKUK — SUPABASE CLIENT
// js/modules/supabase-client.js
// ================================================================

const SUPABASE_URL = 'https://omsahlgcuinyfvculgfj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iUS5jIX8NYPjdstm5U2xkg_MFXprA70';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================================================================
// AUTH
// ================================================================

async function sbKayitOl(email, sifre, ad) {
  const { data, error } = await sb.auth.signUp({
    email, password: sifre,
    options: { data: { ad } }
  });
  if (error) throw error;
  return data;
}

async function sbGirisYap(email, sifre) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: sifre });
  if (error) throw error;
  return data;
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
sb.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    await sbVeriYukle();
  } else if (event === 'SIGNED_OUT') {
    currentBuroId = null;
    currentUser = null;
    Object.keys(state).forEach(k => { if (Array.isArray(state[k])) state[k] = []; });
    showLanding();
  }
});

// ================================================================
// VERİ YÜKLEME (tüm state'i Supabase'den çek)
// ================================================================

async function sbVeriYukle() {
  try {
    showYukleniyor(true);

    const kul = await sbMevcutKullanici();
    if (!kul) { showLanding(); return; }

    currentUser = { id: kul.id, ad: kul.ad, email: kul.email, rol: kul.rol };
    currentBuroId = kul.buro_id;

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
      if (stateKey in state) {
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
    uygulamayiBaslat();

  } catch (e) {
    console.error('Veri yükleme hatası:', e);
    showYukleniyor(false);
    notify('❌ Bağlantı hatası: ' + e.message);
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

function showYukleniyor(goster) {
  let el = document.getElementById('sb-yukleniyor');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sb-yukleniyor';
    el.innerHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99998;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">
      <div style="width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin 1s linear infinite"></div>
      <div style="color:var(--text-muted);font-size:14px">Veriler yükleniyor...</div>
    </div>`;
    document.body.appendChild(el);
  }
  el.style.display = goster ? 'block' : 'none';
}

function showLanding() {
  document.getElementById('app-wrapper')?.style.setProperty('display', 'none');
  document.getElementById('landing-wrapper')?.style.setProperty('display', 'flex');
}

function uygulamayiBaslat() {
  document.getElementById('landing-wrapper')?.style.setProperty('display', 'none');
  document.getElementById('app-wrapper')?.style.setProperty('display', 'flex');
  // Kullanıcı adını göster
  const unEl = document.getElementById('header-user');
  if (unEl && currentUser) unEl.textContent = currentUser.ad;
  renderMuvekkillar(); renderDavalar(); renderDavaCards();
  renderIcra(); renderIcraCards(); renderButce(); renderDanismanlik();
  renderDashboard();
  if (typeof renderIhtarname === 'function') renderIhtarname();
  if (typeof renderTodo === 'function') renderTodo();
  updateBadges();
}
