// ================================================================
// EMD HUKUK — YEDEKLEME
// js/modules/yedekleme.js
// ================================================================

function yedegiIndir() {
  const veri = yedekVerisiOlustur();
  const boyut = yedekBoyutuHesapla(veri);
  const tarih = new Date().toISOString().slice(0,10);
  const dosyaAd = `EMDHukuk_Yedek_${tarih}.json`;

  const blob = new Blob([JSON.stringify(veri, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = dosyaAd; a.click();
  URL.revokeObjectURL(url);

  // Son yedek kaydı
  localStorage.setItem('son_yedek_tarihi', new Date().toISOString());
  localStorage.setItem('son_yedek_boyut', boyut);
  document.getElementById('son-yedek-tarih').textContent = new Date().toLocaleString('tr-TR');
  document.getElementById('son-yedek-boyut').textContent = boyut;

  addAktiviteLog('Veri Yedeklendi', `Cihaza indirildi (${boyut})`, 'Sistem');
  notify(`✅ Yedek indirildi: ${dosyaAd} (${boyut})`);
}

// ── 2. E-posta ile Gönder ─────────────────────────────────────
function yedegiMaille() {
  const email = currentUser?.email || '';
  if (!email) { notify('❌ E-posta adresi bulunamadı. Ayarlardan güncelleyin.', 'err'); return; }

  const veri = yedekVerisiOlustur();
  const boyut = yedekBoyutuHesapla(veri);
  const tarih = new Date().toISOString().slice(0,10);

  // Önce locale indir (base64 e-posta gönderimi için gerçek backend gerekir)
  const blob = new Blob([JSON.stringify(veri, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `EMDHukuk_Yedek_${tarih}.json`; a.click();
  URL.revokeObjectURL(url);

  // Admin'e yedek bildirimi gönder
  adminSbPost('kullanim_log', {
    id: uid(),
    musteri_id: currentUser?.id,
    email: currentUser?.email,
    giris_tarihi: new Date().toISOString(),
    platform: 'yedek-mail',
    uygulama_versiyon: 'yedek:' + boyut,
  }).catch(() => {});

  // Son yedek kaydı
  localStorage.setItem('son_yedek_tarihi', new Date().toISOString());
  localStorage.setItem('son_yedek_boyut', boyut);
  document.getElementById('son-yedek-tarih').textContent = new Date().toLocaleString('tr-TR');
  document.getElementById('son-yedek-boyut').textContent = boyut;

  // Kullanıcıya talimat ver
  addAktiviteLog('Veri Yedeklendi', `E-posta: ${email} (${boyut})`, 'Sistem');

  // Bilgilendirme popup
  const msg = document.createElement('div');
  msg.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px`;
  msg.innerHTML = `<div style="background:var(--surface);border:1px solid var(--gold);border-radius:12px;padding:24px;max-width:380px;text-align:center">
    <div style="font-size:32px;margin-bottom:12px">📧</div>
    <div style="font-weight:700;font-size:15px;margin-bottom:8px">Yedek Dosyası İndirildi</div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
      <strong>${a.download}</strong> (${boyut}) bilgisayarınıza indirildi.<br><br>
      Bu dosyayı e-posta ile kendinize gönderebilirsiniz:<br>
      <strong style="color:var(--gold)">${email}</strong>
    </div>
    <button class="btn btn-gold" onclick="this.closest('[style]').remove()" style="width:100%;justify-content:center">Tamam</button>
  </div>`;
  document.body.appendChild(msg);
}

// ── 3. Buluta Kaydet (Kurumsal) ───────────────────────────────
async function yedegiBuiluta() {
  const plan = mevcutPlan();
  if (plan.id !== 'kurumsal') {
    upgradeGoster('bulut_yedek');
    return;
  }

  const veri = yedekVerisiOlustur();
  const boyut = yedekBoyutuHesapla(veri);
  const tarih = new Date().toISOString();

  notify('☁️ Buluta yükleniyor...');

  try {
    // Supabase storage benzeri — yedek_dosyalar tablosuna kaydediyoruz
    await adminSbPost('yedek_dosyalar', {
      id: uid(),
      musteri_id: currentUser?.id,
      email: currentUser?.email,
      buro_ad: currentUser?.buro_ad,
      tarih: tarih,
      boyut: boyut,
      veri: JSON.stringify(veri), // 5MB limit — büyük veriler için real storage gerekir
      versiyon: '1.0',
    });

    localStorage.setItem('son_yedek_tarihi', tarih);
    localStorage.setItem('son_yedek_boyut', boyut + ' ☁️');
    document.getElementById('son-yedek-tarih').textContent = new Date(tarih).toLocaleString('tr-TR');
    document.getElementById('son-yedek-boyut').textContent = boyut + ' ☁️';

    addAktiviteLog('Veri Yedeklendi', `Buluta kaydedildi (${boyut})`, 'Sistem');
    bulutYedekleriListele();
    notify(`✅ Buluta kaydedildi! (${boyut})`);
  } catch(e) {
    // Supabase bağlantısı yoksa locale indir
    notify('⚠️ Bulut bağlantısı yok, cihaza indirildi', 'err');
    yedegiIndir();
  }
}

// Bulut yedeklerini listele
async function bulutYedekleriListele() {
  const el = document.getElementById('bulut-yedekler-liste');
  if (!el) return;
  el.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:12px">Yükleniyor...</div>';

  try {
    const yedekler = await adminSbGet('yedek_dosyalar',
      `musteri_id=eq.${currentUser?.id}&order=tarih.desc&limit=10`);

    if (!yedekler || !yedekler.length) {
      el.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:12px">Henüz bulut yedeği yok.</div>';
      return;
    }

    el.innerHTML = yedekler.map(y => `
      <div class="bulut-yedek-item">
        <div>
          <div style="font-weight:600">☁️ ${new Date(y.tarih).toLocaleString('tr-TR')}</div>
          <div style="color:var(--text-muted);font-size:11px">${y.boyut}</div>
        </div>
        <button class="btn btn-sm btn-gold" onclick="bulutYedekYukle('${y.id}')">Geri Yükle</button>
      </div>`).join('');
  } catch(e) {
    el.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:12px">Yüklenemedi.</div>';
  }
}

async function bulutYedekleriGoster() {
  bulutYedekleriListele();
  document.getElementById('bulut-yedekler-wrap').style.display = 'block';
}

async function bulutYedekYukle(id) {
  if (!confirm('Bu yedek geri yüklenecek. Mevcut veriler silinecek. Devam?')) return;
  try {
    const yedekler = await adminSbGet('yedek_dosyalar', `id=eq.${id}`);
    if (!yedekler || !yedekler[0]?.veri) { notify('❌ Yedek bulunamadı', 'err'); return; }
    const veri = JSON.parse(yedekler[0].veri);
    _yedekUygula(veri);
  } catch(e) {
    notify('❌ Geri yükleme başarısız: ' + e.message, 'err');
  }
}

// ── Dosyadan Geri Yükleme ─────────────────────────────────────
function yedegiyukle(input) {
  const dosya = input.files[0];
  if (!dosya) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const veri = JSON.parse(e.target.result);
      // Doğrulama
      if (!veri._meta || veri._meta.uygulama !== 'EMD Hukuk') {
        throw new Error('Bu dosya geçerli bir EMD Hukuk yedeği değil.');
      }
      // Onay
      const tarih = new Date(veri._meta.tarih).toLocaleString('tr-TR');
      const muv = veri.muvekkillar?.length || 0;
      const dav = veri.davalar?.length || 0;
      if (!confirm(`Geri yükleme onayı:\n\nYedek tarihi: ${tarih}\n${muv} müvekkil, ${dav} dava\n\nMevcut tüm veriler silinecek. Devam?`)) {
        input.value = ''; return;
      }
      _yedekUygula(veri);
    } catch(err) {
      const sonuc = document.getElementById('yedek-geri-yukleme-sonuc');
      sonuc.style.display = 'block';
      sonuc.innerHTML = `<div style="background:var(--red-dim);border:1px solid var(--red);border-radius:var(--radius);padding:10px;font-size:12px;color:var(--red)">❌ ${err.message}</div>`;
    }
    input.value = '';
  };
  reader.readAsText(dosya);
}

function _yedekUygula(veri) {
  try {
    // _meta'yı çıkar, geri kalanı state'e yükle
    const { _meta, ...veriTemiz } = veri;
    localStorage.setItem('hukuk_buro_v3', JSON.stringify(veriTemiz));
    Object.assign(state, veriTemiz);

    addAktiviteLog('Veri Geri Yüklendi', `Yedek: ${new Date(_meta?.tarih||Date.now()).toLocaleDateString('tr-TR')}`, 'Sistem');

    const sonuc = document.getElementById('yedek-geri-yukleme-sonuc');
    if (sonuc) {
      sonuc.style.display = 'block';
      sonuc.innerHTML = `<div style="background:var(--green-dim);border:1px solid var(--green);border-radius:var(--radius);padding:10px;font-size:12px;color:var(--green)">✅ Geri yükleme başarılı! Sayfa yenileniyor...</div>`;
    }

    notify('✅ Veriler geri yüklendi! Sayfa yenileniyor...');
    setTimeout(() => location.reload(), 2000);
  } catch(err) {
    notify('❌ Geri yükleme başarısız: ' + err.message, 'err');
  }
}

// Ayarlar sayfası açılınca çalıştır
const _origShowPage = typeof showPage === 'function' ? showPage : null;

