// ================================================================
// EMD HUKUK — PERSONEL YÖNETIMI
// js/modules/personel.js
// ================================================================

function renderPersonelListe() {
  if (!yetkiGoruntule('per_goruntule')) {
    document.getElementById('personel-liste').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">🔒 Bu bölümü görüntüleme yetkiniz yok.</div>';
    return;
  }
  const liste = document.getElementById('personel-liste');
  const empty = document.getElementById('personel-empty');
  const personeller = state.personel || [];
  if (!personeller.length) { liste.innerHTML=''; empty.style.display=''; return; }
  empty.style.display = 'none';

  // Mevcut kullanıcıyı da listele (sahip)
  const tumKisiler = [
    ...(currentUser && currentUser.rol === 'sahip' ? [{
      id: currentUser.id, ad: currentUser.ad_soyad, rol:'sahip',
      email: currentUser.email, tel:'', durum:'aktif', _sahip:true
    }] : []),
    ...personeller
  ];

  liste.innerHTML = tumKisiler.map(p => {
    const gorevSayisi = (state.gorevler||[]).filter(g=>g.personelId===p.id&&g.durum==='bekliyor').length;
    return `
    <div class="personel-kart" onclick="openPersonelProfil('${p.id}')">
      <div class="personel-avatar" style="background:${personelAvatarRenk(p.rol)}22;border-color:${personelAvatarRenk(p.rol)}44;color:${personelAvatarRenk(p.rol)}">
        ${avatarI(p.ad)}
      </div>
      <div class="personel-bilgi">
        <div class="personel-ad">${p.ad}${p._sahip?' <span style="font-size:10px;color:var(--text-dim)">(Siz)</span>':''}</div>
        ${rolBadgeHTML(p.rol)}
        <div class="personel-meta">${p.email||''}${p.tel?' · '+p.tel:''}</div>
      </div>
      ${gorevSayisi > 0 ? `<div style="background:var(--gold-dim);border:1px solid var(--gold);border-radius:20px;padding:2px 10px;font-size:11px;color:var(--gold);font-weight:600">${gorevSayisi} görev</div>` : ''}
      <div class="personel-durum ${p.durum||'aktif'}"></div>
      ${!p._sahip && yetkiVar('per_yonet') ? `<button class="btn" style="padding:5px 10px;font-size:11px" onclick="event.stopPropagation();openPersonelDuzenle('${p.id}')">✏️</button>` : ''}
    </div>`;
  }).join('');
}

// ── Personel modal ───────────────────────────────────────────────
function openPersonelModal() {
  if (!yetkiVar('per_yonet')) return notify('⚠️ Bu işlem için yetkiniz yok.');
  personelModalMod = 'yeni';
  aktivPersonelId = null;
  document.getElementById('personel-modal-title').textContent = 'Personel Ekle';
  document.getElementById('p-sil-btn').style.display = 'none';
  document.getElementById('p-sifre-label').textContent = 'Şifre *';
  document.getElementById('hesap-mevcut-bilgi').style.display = 'none';
  // Formu temizle
  ['p-ad','p-tel','p-email','p-tc','p-baro-sicil','p-notlar','p-hesap-email','p-hesap-sifre','p-hesap-sifre2'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('p-rol').value = 'avukat';
  document.getElementById('p-durum').value = 'aktif';
  document.getElementById('p-baslama').value = new Date().toISOString().slice(0,10);
  // Yetki grid'ini doldur
  renderYetkiGrid('avukat');
  personelModalTab('bilgi', document.getElementById('pmt-bilgi'));
  document.getElementById('personel-modal').classList.add('open');
}

function openPersonelDuzenle(id) {
  if (!yetkiVar('per_yonet')) return notify('⚠️ Bu işlem için yetkiniz yok.');
  const p = state.personel.find(x=>x.id===id);
  if (!p) return;
  personelModalMod = 'duzenle';
  aktivPersonelId = id;
  document.getElementById('personel-modal-title').textContent = 'Personel Düzenle';
  document.getElementById('p-sil-btn').style.display = '';
  document.getElementById('p-sifre-label').textContent = 'Şifre (değiştirmek için doldurun)';
  document.getElementById('p-ad').value = p.ad||'';
  document.getElementById('p-rol').value = p.rol||'avukat';
  document.getElementById('p-tel').value = p.tel||'';
  document.getElementById('p-email').value = p.email||'';
  document.getElementById('p-tc').value = p.tc||'';
  document.getElementById('p-baro-sicil').value = p.baroSicil||'';
  document.getElementById('p-baslama').value = p.baslama||'';
  document.getElementById('p-durum').value = p.durum||'aktif';
  document.getElementById('p-notlar').value = p.notlar||'';
  // Hesap bilgisi
  if (p.hesap?.email) {
    const el = document.getElementById('hesap-mevcut-bilgi');
    el.style.display = '';
    el.innerHTML = `✅ Mevcut hesap: <strong>${p.hesap.email}</strong>`;
    document.getElementById('p-hesap-email').value = p.hesap.email;
  } else {
    document.getElementById('hesap-mevcut-bilgi').style.display = 'none';
    document.getElementById('p-hesap-email').value = p.email||'';
  }
  document.getElementById('p-hesap-sifre').value = '';
  document.getElementById('p-hesap-sifre2').value = '';
  // Yetkiler
  renderYetkiGrid(p.rol, p.yetkiler);
  personelModalTab('bilgi', document.getElementById('pmt-bilgi'));
  document.getElementById('personel-modal').classList.add('open');
}

function personelModalTab(tab, el) {
  ['bilgi','yetki','hesap'].forEach(t => {
    document.getElementById('pmt-tab-'+t).style.display = t===tab ? '' : 'none';
    document.getElementById('pmt-'+t)?.classList.toggle('active', t===tab);
  });
}

function renderYetkiGrid(rol, mevcutYetkiler) {
  const kont = document.getElementById('yetki-gruplari');
  // Rol değiştirince varsayılan yetkiler yüklensin
  const varsayilan = mevcutYetkiler || VARSAYILAN_YETKILER[rol] || {};
  const tumYetkiler = varsayilan === 'tam';

  let html = '';
  YETKI_GRUPLARI.forEach(grup => {
    html += `<div class="yetki-grup"><div class="yetki-grup-header"><span>${grup.icon}</span>${grup.ad}</div>`;
    grup.yetkiler.forEach(y => {
      const mevcut = tumYetkiler ? 'tam' : (varsayilan[y.id] || 'yok');
      html += `
      <div class="yetki-satir">
        <div class="yetki-satir-sol">
          <div class="yetki-satir-ad">${y.ad}</div>
          <div class="yetki-satir-sub">${y.sub}</div>
        </div>
        <select class="yetki-select" id="yetki-${y.id}">
          <option value="yok" ${mevcut==='yok'?'selected':''}>🚫 Erişim Yok</option>
          <option value="goruntule" ${mevcut==='goruntule'?'selected':''}>👁️ Sadece Gör</option>
          <option value="tam" ${mevcut==='tam'?'selected':''}>✅ Tam Yetki</option>
        </select>
      </div>`;
    });
    html += '</div>';
  });
  kont.innerHTML = html;
}

// Rol değiştirilince yetkiler güncellenir
document.addEventListener('change', function(e) {
  if (e.target.id === 'p-rol') renderYetkiGrid(e.target.value);
});

function yetkiGridOku() {
  const yetkiler = {};
  YETKI_GRUPLARI.forEach(grup => {
    grup.yetkiler.forEach(y => {
      const el = document.getElementById('yetki-' + y.id);
      if (el) yetkiler[y.id] = el.value;
    });
  });
  return yetkiler;
}

async function savePersonel() {
  const ad = document.getElementById('p-ad').value.trim();
  if (!zorunluKontrol([{id:'p-ad', deger:ad, label:'Ad Soyad'}])) {
    notify('⚠️ Zorunlu alanları doldurun.'); return;
  }
  const rol = document.getElementById('p-rol').value;
  const hesapEmail = document.getElementById('p-hesap-email').value.trim();
  const hesapSifre = document.getElementById('p-hesap-sifre').value;
  const hesapSifre2 = document.getElementById('p-hesap-sifre2').value;
  if (hesapSifre && hesapSifre !== hesapSifre2) { notify('⚠️ Şifreler eşleşmiyor.'); return; }
  if (hesapSifre && hesapSifre.length < 6) { notify('⚠️ Şifre en az 6 karakter olmalı.'); return; }

  const tel = document.getElementById('p-tel').value.trim();
  const email = document.getElementById('p-email').value.trim();
  const tc = document.getElementById('p-tc').value.trim();
  const baroSicil = document.getElementById('p-baro-sicil').value.trim();
  const baslama = document.getElementById('p-baslama').value || null;
  const durum = document.getElementById('p-durum').value;
  const notlar = document.getElementById('p-notlar').value.trim();
  const yetkiler = yetkiGridOku();

  const btn = document.getElementById('p-kaydet-btn');
  btn.disabled = true; btn.textContent = 'Kaydediliyor...';

  try {
    if (personelModalMod === 'duzenle') {
      // Supabase güncelle
      if (currentBuroId) {
        const { error } = await sb.from('kullanicilar').update({
          ad_soyad: ad, rol, telefon: tel, email, tc_kimlik: tc,
          baro_sicil: baroSicil, baslama_tarihi: baslama,
          durum, notlar, yetkiler,
        }).eq('id', aktivPersonelId);
        if (error) throw error;
      }
      // State güncelle
      const p = state.personel.find(x=>x.id===aktivPersonelId);
      if (p) Object.assign(p, { ad, rol, tel, email, tc, baroSicil, baslama, durum, notlar, yetkiler });
      addAktiviteLog('Personel Düzenlendi', `${ad} | ${rol}`, 'Personel');
      notify('✅ Personel güncellendi');

    } else {
      // Yeni personel — Supabase Auth üzerinden hesap aç
      const girisEmail = hesapEmail || email;
      if (!girisEmail) { notify('⚠️ Giriş e-postası gerekli.'); btn.disabled=false; btn.textContent='💾 Kaydet'; return; }
      if (!hesapSifre) { notify('⚠️ Yeni personel için şifre gerekli.'); btn.disabled=false; btn.textContent='💾 Kaydet'; return; }

      // Admin API ile kullanıcı oluştur
      const { data: authData, error: authErr } = await sb.auth.signUp({
        email: girisEmail, password: hesapSifre,
        options: { data: { ad_soyad: ad } }
      });
      if (authErr) throw authErr;

      const newId = authData.user?.id;
      if (!newId) throw new Error('Kullanıcı ID alınamadı');

      // kullanicilar tablosuna ekle
      if (currentBuroId) {
        const { error: dbErr } = await sb.from('kullanicilar').insert({
          id: newId, buro_id: currentBuroId,
          ad_soyad: ad, rol, email: girisEmail,
          telefon: tel, tc_kimlik: tc, baro_sicil: baroSicil,
          baslama_tarihi: baslama, durum, notlar, yetkiler,
        });
        if (dbErr) throw dbErr;
      }

      // State'e ekle
      if(!limitKontrol('personel')) return; // ← Plan limit kontrolü
      state.personel.push({
        id: newId, ad, rol, tel, email: girisEmail, tc, baroSicil, baslama, durum, notlar, yetkiler,
        hesap: { email: girisEmail },
      });
      addAktiviteLog('Personel Eklendi', `${ad} | ${rol}`, 'Personel');
      notify('✅ Personel eklendi ve giriş hesabı oluşturuldu');
    }

    saveData();
    closeModal('personel-modal');
    renderPersonelListe();
  } catch(e) {
    notify('❌ Hata: ' + (e.message || 'Bilinmeyen hata'));
    console.error(e);
  }
  btn.disabled = false; btn.textContent = '💾 Kaydet';
}

async function personelSil() {
  const p = state.personel.find(x=>x.id===aktivPersonelId);
  if (!p) return;
  if (!confirm(`"${p.ad}" adlı personeli silmek istiyor musunuz?\nBu kişiye atanan görevler de silinecek.`)) return;

  if (currentBuroId) {
    await sb.from('gorevler').delete().eq('personel_id', aktivPersonelId);
    // Auth kullanıcısını silmek admin key gerektirir — sadece DB kaydını pasife al
    await sb.from('kullanicilar').update({ durum: 'pasif' }).eq('id', aktivPersonelId);
  }
  state.personel = state.personel.filter(x=>x.id!==aktivPersonelId);
  state.gorevler = (state.gorevler||[]).filter(g=>g.personelId!==aktivPersonelId);
  addAktiviteLog('Personel Pasife Alındı', p.ad, 'Personel');
  saveData();
  closeModal('personel-modal');
  renderPersonelListe();
  notify('Personel pasife alındı');
}

// ── Personel Profil Modali ────────────────────────────────────────
function openPersonelProfil(id) {
  // Sahip kendi profilini görüntülüyorsa
  const isSahip = (currentUser && currentUser.id === id);
  const p = isSahip
    ? { id: currentUser.id, ad: currentUser.ad_soyad, rol:'sahip', email: currentUser.email, durum:'aktif' }
    : state.personel.find(x=>x.id===id);
  if (!p) return;
  aktivPersonelId = id;

  document.getElementById('pp-avatar').textContent = avatarI(p.ad);
  document.getElementById('pp-avatar').style.cssText = `width:60px;height:60px;font-size:22px;background:${personelAvatarRenk(p.rol)}22;border:2px solid ${personelAvatarRenk(p.rol)}44;color:${personelAvatarRenk(p.rol)};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700`;
  document.getElementById('pp-ad').textContent = p.ad;
  document.getElementById('pp-rol-badge').innerHTML = rolBadgeHTML(p.rol);
  document.getElementById('pp-meta').textContent = [p.email, p.tel, p.baslama ? 'Başlangıç: '+fmtD(p.baslama) : ''].filter(Boolean).join(' · ');

  const gorevler = (state.gorevler||[]).filter(g=>g.personelId===id).sort((a,b)=>b.olusturmaTarih?.localeCompare(a.olusturmaTarih));
  const ppGorevler = document.getElementById('pp-gorevler');
  const ppEmpty = document.getElementById('pp-gorev-empty');
  if (!gorevler.length) { ppGorevler.innerHTML=''; ppEmpty.style.display=''; }
  else {
    ppEmpty.style.display='none';
    ppGorevler.innerHTML = gorevler.map(g => gorevKartHTML(g, true)).join('');
  }
  document.getElementById('personel-profil-modal').classList.add('open');
}

// ── Görev sistemi ────────────────────────────────────────────────
function renderGorevPersonelSelect() {
  const sel = document.getElementById('g-personel');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Personel Seçin —</option>';
  (state.personel||[]).filter(p=>p.durum!=='pasif').forEach(p => {
    sel.innerHTML += `<option value="${p.id}">${p.ad} (${p.rol})</option>`;
  });
  // Filtre select'i de güncelle
  const fsel = document.getElementById('gorev-filtre-personel');
  if (fsel) {
    fsel.innerHTML = '<option value="">Tüm Personel</option>';
    (state.personel||[]).forEach(p => { fsel.innerHTML += `<option value="${p.id}">${p.ad}</option>`; });
  }
  // Dosya select
  const dsel = document.getElementById('g-dosya');
  if (dsel) {
    dsel.innerHTML = '<option value="">— Seçin —</option>';
    (state.davalar||[]).forEach(d => { dsel.innerHTML += `<option value="dava:${d.id}">📁 ${d.no} - ${d.konu?.slice(0,30)}</option>`; });
    (state.icra||[]).forEach(i => { dsel.innerHTML += `<option value="icra:${i.id}">⚡ ${i.no} - ${i.borclu?.slice(0,30)}</option>`; });
  }
}

function openGorevModal(personelId) {
  if (!yetkiVar('per_gorev')) return notify('⚠️ Bu işlem için yetkiniz yok.');
  renderGorevPersonelSelect();
  ['g-baslik','g-aciklama'].forEach(id => { const e=document.getElementById(id); if(e) e.value=''; });
  document.getElementById('g-personel').value = personelId||'';
  document.getElementById('g-tur').value = 'dava';
  document.getElementById('g-oncelik').value = 'normal';
  document.getElementById('g-son-tarih').value = '';
  document.getElementById('gorev-modal').classList.add('open');
}

async function saveGorev() {
  const personelId = document.getElementById('g-personel').value;
  const baslik = document.getElementById('g-baslik').value.trim();
  if (!zorunluKontrol([
    {id:'g-personel', deger:personelId, label:'Personel'},
    {id:'g-baslik', deger:baslik, label:'Görev Başlığı'},
  ])) { notify('⚠️ Zorunlu alanları doldurun.'); return; }

  const dosyaSec = document.getElementById('g-dosya').value;
  let dosyaTur=null, dosyaId=null;
  if (dosyaSec) { [dosyaTur,dosyaId] = dosyaSec.split(':'); }

  const p = state.personel.find(x=>x.id===personelId);
  try {
    let newId = uid();
    if (currentBuroId) {
      const { data, error } = await sb.from('gorevler').insert({
        buro_id: currentBuroId,
        personel_id: personelId,
        olusturan_id: currentUser?.id,
        tur: document.getElementById('g-tur').value,
        baslik, aciklama: document.getElementById('g-aciklama').value.trim(),
        dosya_tur: dosyaTur, dosya_id: dosyaId||null,
        son_tarih: document.getElementById('g-son-tarih').value||null,
        oncelik: document.getElementById('g-oncelik').value,
        durum: 'bekliyor',
      }).select().single();
      if (error) throw error;
      newId = data.id;
    }
    if (!state.gorevler) state.gorevler=[];
    state.gorevler.push({
      id:newId, personelId, olusturanId:currentUser?.id, olusturanAd:currentUser?.ad_soyad,
      tur:document.getElementById('g-tur').value, baslik,
      aciklama:document.getElementById('g-aciklama').value.trim(),
      dosyaTur, dosyaId, sonTarih:document.getElementById('g-son-tarih').value,
      oncelik:document.getElementById('g-oncelik').value, durum:'bekliyor',
      olusturmaTarih:new Date().toISOString().slice(0,10),
    });
    addAktiviteLog('Görev Atandı', `${baslik} → ${p?.ad||''}`, 'Görev');
    saveData(); closeModal('gorev-modal'); renderGorevler(); renderPersonelListe();
    notify('✅ Görev atandı');
  } catch(e) { notify('❌ Hata: '+(e.message||'Bilinmeyen hata')); }
}

async function gorevTamamla() {
  const aciklama = document.getElementById('gorev-onay-aciklama').value.trim();
  if (!zorunluKontrol([{id:'gorev-onay-aciklama', deger:aciklama, label:'Açıklama'}])) {
    notify('⚠️ Açıklama zorunludur.'); return;
  }
  const g = (state.gorevler||[]).find(x=>x.id===gorevOnayId);
  if (!g) return;
  const bugun = new Date().toISOString().slice(0,10);
  try {
    if (currentBuroId) {
      const { error } = await sb.from('gorevler').update({
        durum:'yapildi', tamamlama_tarih:bugun,
        tamamlama_aciklama:aciklama, tamamlayan_id:currentUser?.id,
      }).eq('id', gorevOnayId);
      if (error) throw error;
    }
    Object.assign(g, { durum:'yapildi', tamamlamaTarih:bugun, tamamlamaAciklama:aciklama, tamamlayanId:currentUser?.id });
    addAktiviteLog('Görev Tamamlandı', g.baslik, 'Görev');
    saveData(); closeModal('gorev-onay-modal'); renderGorevler(); renderPersonelListe();
    notify('✅ Görev tamamlandı olarak işaretlendi');
  } catch(e) { notify('❌ Hata: '+(e.message||'Bilinmeyen hata')); }
}

async function gorevSil(id) {
  if (!confirm('Bu görevi silmek istiyor musunuz?')) return;
  try {
    if (currentBuroId) { const {error}=await sb.from('gorevler').delete().eq('id',id); if(error) throw error; }
    state.gorevler = (state.gorevler||[]).filter(g=>g.id!==id);
    saveData(); renderGorevler(); renderPersonelListe(); notify('Görev silindi');
  } catch(e) { notify('❌ Hata: '+(e.message||'Bilinmeyen hata')); }
}

function renderGorevler() {
  const liste = document.getElementById('gorev-liste');
  const empty = document.getElementById('gorev-empty');
  if (!liste) return;
  let gorevler = state.gorevler || [];
  const fpersonel = document.getElementById('gorev-filtre-personel')?.value;
  const fdurum = document.getElementById('gorev-filtre-durum')?.value;
  if (fpersonel) gorevler = gorevler.filter(g=>g.personelId===fpersonel);
  if (fdurum) gorevler = gorevler.filter(g=>g.durum===fdurum);
  // Gecikmiş olanları işaretle
  const bugun = new Date().toISOString().slice(0,10);
  gorevler = gorevler.map(g => ({...g, durum: g.durum==='bekliyor'&&g.sonTarih&&g.sonTarih<bugun ? 'gecikti' : g.durum}));
  gorevler.sort((a,b) => {
    const oncelik = {yuksek:0,normal:1,dusuk:2};
    return (oncelik[a.oncelik]||1) - (oncelik[b.oncelik]||1);
  });
  if (!gorevler.length) { liste.innerHTML=''; empty.style.display=''; return; }
  empty.style.display='none';
  liste.innerHTML = gorevler.map(g => gorevKartHTML(g)).join('');
}

function gorevKartHTML(g, kucuk=false) {
  const p = state.personel.find(x=>x.id===g.personelId);
  const durumMap = { bekliyor:'gorev-bekliyor', yapildi:'gorev-yapildi', gecikti:'gorev-gecikti' };
  const durumLbl = { bekliyor:'⏳ Bekliyor', yapildi:'✅ Yapıldı', gecikti:'🔴 Gecikti' };
  const oncelikMap = { yuksek:'🔴', normal:'⚪', dusuk:'🔵' };
  const benimGorevim = currentUser && g.personelId === currentUser.id;
  const yapabilir = yetkiVar('per_gorev') || benimGorevim;

  let dosyaLink = '';
  if (g.dosyaTur==='dava') { const d=getDava(g.dosyaId); if(d) dosyaLink=`📁 ${d.no} - ${d.konu?.slice(0,25)}`; }
  if (g.dosyaTur==='icra') { const i=getIcra(g.dosyaId); if(i) dosyaLink=`⚡ ${i.no} - ${i.borclu?.slice(0,25)}`; }

  return `
  <div class="gorev-kart">
    <div class="gorev-header">
      <div style="display:flex;align-items:center;gap:8px">
        <span>${oncelikMap[g.oncelik]||'⚪'}</span>
        <span class="gorev-baslik">${g.baslik}</span>
        <span class="gorev-badge ${durumMap[g.durum]||'gorev-bekliyor'}">${durumLbl[g.durum]||g.durum}</span>
      </div>
      ${g.durum==='bekliyor' && yapabilir ? `<button class="btn btn-gold" style="padding:4px 10px;font-size:11px" onclick="openGorevOnay('${g.id}')">✅ Tamamla</button>` : ''}
      ${yetkiVar('per_gorev') ? `<button class="btn btn-danger" style="padding:4px 8px;font-size:11px" onclick="gorevSil('${g.id}')">🗑</button>` : ''}
    </div>
    <div class="gorev-meta">
      ${p ? `<span>👤 ${p.ad}</span>` : ''}
      ${g.tur ? `<span>📌 ${g.tur}</span>` : ''}
      ${dosyaLink ? `<span>${dosyaLink}</span>` : ''}
      ${g.sonTarih ? `<span>📅 Son: ${fmtD(g.sonTarih)}</span>` : ''}
      ${g.olusturanAd ? `<span>Atan: ${g.olusturanAd}</span>` : ''}
    </div>
    ${g.aciklama ? `<div style="font-size:11px;color:var(--text-muted);margin-top:6px">${g.aciklama}</div>` : ''}
    ${g.durum==='yapildi'&&g.tamamlamaAciklama ? `
    <div class="gorev-onay-kutu">
      <div style="font-size:11px;font-weight:600;color:var(--green);margin-bottom:4px">✅ Tamamlandı — ${fmtD(g.tamamlamaTarih)}</div>
      <div style="font-size:11px;color:var(--text-muted)">${g.tamamlamaAciklama}</div>
    </div>` : ''}
  </div>`;
}

function openGorevOnay(gorevId) {
  const g = (state.gorevler||[]).find(x=>x.id===gorevId);
  if (!g) return;
  gorevOnayId = gorevId;
  document.getElementById('gorev-onay-bilgi').innerHTML = `<strong>${g.baslik}</strong>${g.aciklama?'<br><span style="color:var(--text-muted)">'+g.aciklama+'</span>':''}`;
  document.getElementById('gorev-onay-aciklama').value = '';
  document.getElementById('gorev-onay-modal').classList.add('open');
}

// ── Aktivite Logu ────────────────────────────────────────────────
function renderAktiviteKisiSelect() {
  const sel = document.getElementById('akt-filtre-kisi');
  if (!sel) return;
  sel.innerHTML = '<option value="">Tüm Kullanıcılar</option>';
  // Benzersiz kullanıcıları ekle
  const kisiler = [...new Map((state.aktiviteLog||[]).map(l=>[l.kullaniciId,{id:l.kullaniciId,ad:l.kullaniciAd}])).values()];
  kisiler.forEach(k => { sel.innerHTML += `<option value="${k.id}">${k.ad}</option>`; });
}

function renderAktiviteLog() {
  const liste = document.getElementById('aktivite-log-liste');
  const empty = document.getElementById('aktivite-empty');
  if (!liste) return;
  let loglar = state.aktiviteLog || [];
  const fkisi = document.getElementById('akt-filtre-kisi')?.value;
  const fislem = document.getElementById('akt-filtre-islem')?.value;
  if (fkisi) loglar = loglar.filter(l=>l.kullaniciId===fkisi);
  if (fislem) loglar = loglar.filter(l=>l.modul===fislem);
  if (!loglar.length) { liste.innerHTML=''; empty.style.display=''; return; }
  empty.style.display='none';
  const modulIcon = {Müvekkil:'📒',Dava:'📁',İcra:'⚡',Belge:'📄',Finans:'💰',Görev:'📋',Personel:'👥',Genel:'📝'};
  liste.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
  <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px">${loglar.length} aktivite kaydı</div>
  ${loglar.slice(0,100).map(l => `
  <div class="aktivite-satir" style="padding:10px 16px">
    <div class="aktivite-icon">${modulIcon[l.modul]||'📝'}</div>
    <div class="aktivite-bilgi">
      <div class="aktivite-islem"><strong>${l.kullaniciAd}</strong> — ${l.islem}</div>
      ${l.detay ? `<div class="aktivite-detay">${l.detay}</div>` : ''}
    </div>
    <div class="aktivite-zaman">${fmtD(l.tarih)} ${l.saat}</div>
  </div>`).join('')}
  </div>`;
  renderAktiviteKisiSelect();
}

// ── Personel giriş kontrolü (alt hesap) ─────────────────────────
function personelGirisKontrol(email, sifre) {
  // Personel hesabı mı kontrol et
  const p = (state.personel||[]).find(x => x.hesap?.email?.toLowerCase() === email.toLowerCase());
  if (!p) return null;
  if (!p.hesap.sifre) return null;
  if (p.hesap.sifre !== sifre) return null; // Basit karşılaştırma (gerçek uygulamada hash kullanılır)
  return p;
}

// ================================================================
// LANDING PAGE FONKSİYONLARI
// ================================================================