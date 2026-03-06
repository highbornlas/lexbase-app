// ================================================================
// EMD HUKUK — DASHBOARD
// js/modules/dashboard.js
// ================================================================

function renderDashSureler() {
  const bugun = new Date();
  bugun.setHours(0,0,0,0);
  const t30 = new Date(bugun); t30.setDate(t30.getDate()+30);
  const bugunS = bugun.toISOString().split('T')[0];
  const t30S = t30.toISOString().split('T')[0];

  const items = [];

  // Etkinliklerden "Son Gün" olanlar
  state.etkinlikler.forEach(e => {
    if (e.tur === 'Son Gün' && e.tarih >= bugunS && e.tarih <= t30S) {
      const gun = Math.ceil((new Date(e.tarih)-bugun)/86400000);
      items.push({ tarih: e.tarih, gun, baslik: e.baslik, tur: 'Son Gün', renk: '#e74c3c', muvAd: e.muvId ? getMuvAd(e.muvId) : '', hedef: 'takvim' });
    }
  });

  // Davalardan sonraki duruşma tarihleri
  state.davalar.forEach(d => {
    if (d.durum === 'Aktif' && d.sonDurusma && d.sonDurusma >= bugunS && d.sonDurusma <= t30S) {
      const gun = Math.ceil((new Date(d.sonDurusma)-bugun)/86400000);
      items.push({ tarih: d.sonDurusma, gun, baslik: `Duruşma: ${d.konu||d.dosyaNo||''}`, tur: 'Duruşma', renk: '#2980b9', muvAd: d.muvId ? getMuvAd(d.muvId) : '', hedef: 'davalar' });
    }
  });

  // İcradan itiraz son tarihleri
  state.icra.forEach(i => {
    if (i.itirazSonTarih && i.itirazSonTarih >= bugunS && i.itirazSonTarih <= t30S) {
      const gun = Math.ceil((new Date(i.itirazSonTarih)-bugun)/86400000);
      items.push({ tarih: i.itirazSonTarih, gun, baslik: `İtiraz Son: ${i.borcluAd||i.dosyaNo||''}`, tur: 'İtiraz', renk: '#e67e22', muvAd: i.muvId ? getMuvAd(i.muvId) : '', hedef: 'icra' });
    }
  });

  // Danışmanlıktan teslim tarihleri
  state.danismanlik.forEach(d => {
    if (d.durum !== 'Tamamlandı' && d.durum !== 'İptal' && d.teslimTarih && d.teslimTarih >= bugunS && d.teslimTarih <= t30S) {
      const gun = Math.ceil((new Date(d.teslimTarih)-bugun)/86400000);
      items.push({ tarih: d.teslimTarih, gun, baslik: `Teslim: ${d.konu||''}`, tur: 'Teslim', renk: '#8e44ad', muvAd: d.muvId ? getMuvAd(d.muvId) : '', hedef: 'danismanlik' });
    }
  });

  items.sort((a,b) => a.tarih.localeCompare(b.tarih));

  const el = document.getElementById('dash-sureler');
  if (!el) return;
  if (!items.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">✅</div><p>30 gün içinde kritik işlem yok</p></div>'; return; }

  el.innerHTML = items.map(i => {
    const acil = i.gun <= 3 ? 'background:rgba(231,76,60,.08);border-left:3px solid #e74c3c;' : i.gun <= 7 ? 'border-left:3px solid #e67e22;' : 'border-left:3px solid var(--border);';
    const gunText = i.gun === 0 ? '<span style="color:#e74c3c;font-weight:700">BUGÜN</span>' : i.gun === 1 ? '<span style="color:#e74c3c;font-weight:700">YARIN</span>' : `<span style="color:${i.gun<=7?'#e67e22':'var(--text-muted)'};">${i.gun} gün</span>`;
    return `<div onclick="showPage('${i.hedef}',document.getElementById('ni-${i.hedef}'))" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;margin-bottom:4px;border-radius:6px;cursor:pointer;transition:background .15s;${acil}" onmouseover="this.style.background='rgba(255,255,255,.04)'" onmouseout="this.style.background='${i.gun<=3?'rgba(231,76,60,.08)':'transparent'}'">
      <div>
        <span style="display:inline-block;font-size:9px;font-weight:700;padding:1px 6px;border-radius:3px;background:${i.renk}22;color:${i.renk};margin-right:6px">${i.tur}</span>
        <span style="font-size:12px;font-weight:600">${i.baslik}</span>
        ${i.muvAd ? `<span style="font-size:10px;color:var(--text-muted);margin-left:6px">${i.muvAd}</span>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:12px">
        ${gunText}
        <div style="font-size:10px;color:var(--text-dim)">${fmtD(i.tarih)}</div>
      </div>
    </div>`;
  }).join('');
}

function renderDashboard(){
  const muvs=state.muvekkillar.length,aktifD=state.davalar.filter(d=>d.durum==='Aktif').length;
  const now=new Date();
  const yilP=now.getFullYear().toString();
  const gecenYil=(now.getFullYear()-1).toString();
  // Yıl toplamları (bekleyenler hariç)
  const yilG=state.butce.filter(b=>b.tur==='Gelir'&&b.tarih.startsWith(yilP)&&!b.kat.includes('Bekliyor')).reduce((s,b)=>s+b.tutar,0);
  const yilD=state.butce.filter(b=>b.tur==='Gider'&&b.tarih.startsWith(yilP)&&!b.kat.includes('Bekliyor')).reduce((s,b)=>s+b.tutar,0);
  const gecenG=state.butce.filter(b=>b.tur==='Gelir'&&b.tarih.startsWith(gecenYil)&&!b.kat.includes('Bekliyor')).reduce((s,b)=>s+b.tutar,0);
  const gecenD=state.butce.filter(b=>b.tur==='Gider'&&b.tarih.startsWith(gecenYil)&&!b.kat.includes('Bekliyor')).reduce((s,b)=>s+b.tutar,0);
  // Hangi yılda daha fazla veri var?
  const gosterYil=gecenG>yilG?gecenYil:yilP;
  const gosterG=gecenG>yilG?gecenG:yilG;
  const gosterD=gecenG>yilG?gecenD:yilD;
  const gosterNet=gosterG-gosterD;
  // Tüm zamanlar net
  const topG=state.butce.filter(b=>b.tur==='Gelir'&&!b.kat.includes('Bekliyor')).reduce((s,b)=>s+b.tutar,0);
  const topD=state.butce.filter(b=>b.tur==='Gider'&&!b.kat.includes('Bekliyor')).reduce((s,b)=>s+b.tutar,0);
  const netTop=topG-topD;
  // Bekleyen alacaklar
  const beklButce=state.butce.filter(b=>b.tur==='Gelir'&&b.kat.includes('Bekliyor')).reduce((s,b)=>s+b.tutar,0);
  const beklAvans=state.avanslar.filter(a=>a.durum==='Bekliyor').reduce((s,a)=>s+a.tutar,0);
  const beklAktarim=state.butce.filter(b=>b.tur==='Gider'&&b.kat.includes('Bekliyor')).reduce((s,b)=>s+b.tutar,0);
  const beklAlacak=beklButce+beklAvans;
  const aktifI=state.icra.filter(i=>i.durum!=='Kapandı').length;
  document.getElementById('dash-cards').innerHTML=`
    <div class="card"><div class="card-label">Müvekkil</div><div class="card-value gold">${muvs}</div></div>
    <div class="card"><div class="card-label">Aktif Dava</div><div class="card-value gold">${aktifD}</div></div>
    <div class="card"><div class="card-label">Aktif İcra</div><div class="card-value" style="color:#e74c3c">${aktifI}</div></div>
    <div class="card"><div class="card-label">${gosterYil} Gelir</div><div class="card-value green">${fmt(gosterG)}</div></div>
    <div class="card"><div class="card-label">${gosterYil} Gider</div><div class="card-value red">${fmt(gosterD)}</div></div>
    <div class="card"><div class="card-label">${gosterYil} Net</div><div class="card-value" style="color:${gosterNet>=0?'var(--green)':'#e74c3c'}">${fmt(gosterNet)}</div></div>
    <div class="card"><div class="card-label">Toplam Net</div><div class="card-value" style="color:${netTop>=0?'var(--green)':'#e74c3c'}">${fmt(netTop)}</div></div>
    <div class="card"><div class="card-label">Bekleyen Alacak</div><div class="card-value" style="color:#e67e22">${fmt(beklAlacak)}</div></div>
    <div class="card"><div class="card-label">Aktarım Bekliyor</div><div class="card-value" style="color:#8e44ad">${fmt(beklAktarim)}</div></div>`;
  const t=today(),f=new Date();f.setDate(f.getDate()+14);const fS=f.toISOString().split('T')[0];
  const up=state.etkinlikler.filter(e=>e.tarih>=t&&e.tarih<=fS).sort((a,b)=>a.tarih.localeCompare(b.tarih));
  const de=document.getElementById('dash-etkinlikler');
  if(!up.length)de.innerHTML='<div class="empty"><div class="empty-icon">📅</div><p>Yaklaşan etkinlik yok</p></div>';
  else de.innerHTML=up.map(e=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)"><div><div style="font-size:12px;font-weight:600">${e.baslik}</div><div style="font-size:10px;color:var(--text-muted)">${fmtD(e.tarih)} ${e.saat?'– '+e.saat:''} ${e.muvId?'· '+getMuvAd(e.muvId):''}</div></div><span class="badge badge-${e.tur==='Duruşma'?'durusma':e.tur==='Son Gün'?'son':'beklemede'}">${e.tur}</span></div>`).join('');
  renderDashSureler();
  const dd=document.getElementById('dash-danismanlik');
  if(dd)dd.innerHTML=renderDashDanismanlik();
  const al=state.avanslar.filter(a=>a.durum==='Bekliyor');
  const da=document.getElementById('dash-alacaklar');
  if(!al.length)da.innerHTML='<div class="empty"><div class="empty-icon">💸</div><p>Bekleyen alacak yok</p></div>';
  else da.innerHTML=al.map(a=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)"><div><div style="font-size:12px;font-weight:600">${getMuvAd(a.muvId)}</div><div style="font-size:10px;color:var(--text-muted)">${a.tur} · ${fmtD(a.tarih)}</div></div><span style="color:#e74c3c;font-weight:700;font-size:12px">${fmt(a.tutar)}</span></div>`).join('');
}

// ================================================================
// DANIŞMANLIK
// ================================================================

const DAN_TUR_RENK = {
  'Danışmanlık / Hukuki Görüş': '#2980b9',
  'İhtarname / Protesto': '#e67e22',
  'Sözleşme Hazırlama': '#16a085',
  'Sözleşme İnceleme': '#8e44ad',
  'İdari Başvuru': '#c0392b',
  'Diğer': '#7f8c8d'
};
const DAN_DURUM_RENK = {
  'Taslak': '#7f8c8d',
  'Devam Ediyor': '#2980b9',
  'Müvekkil Onayında': '#e67e22',
  'Gönderildi': '#f39c12',
  'Tamamlandı': '#27ae60',
  'İptal': '#e74c3c'
};

let aktivDanId = null;

function openDanModal(id) {
  const el = document.getElementById('dan-modal');
  document.getElementById('dan-id').value = '';
  document.getElementById('dan-tur').value = 'Danışmanlık / Hukuki Görüş';
  document.getElementById('dan-konu').value = '';
  document.getElementById('dan-durum').value = 'Taslak';
  document.getElementById('dan-tarih').value = today();
  document.getElementById('dan-teslim').value = '';
  document.getElementById('dan-ucret').value = '';
  document.getElementById('dan-tahsil').value = '';
  document.getElementById('dan-aciklama').value = '';
  document.getElementById('dan-takvim-ekle').checked = false;
  // Müvekkil select doldur
  const ms = document.getElementById('dan-muv');
  ms.innerHTML = '';
  state.muvekkillar.forEach(m => { ms.innerHTML += `<option value="${m.id}">${m.ad}</option>`; });
  if (aktivMuvId) ms.value = aktivMuvId;
  if (id) {
    const d = state.danismanlik.find(x => x.id === id);
    if (d) {
      document.getElementById('dan-id').value = d.id;
      document.getElementById('dan-tur').value = d.tur;
      ms.value = d.muvId;
      document.getElementById('dan-konu').value = d.konu;
      document.getElementById('dan-durum').value = d.durum;
      document.getElementById('dan-tarih').value = d.tarih || '';
      document.getElementById('dan-teslim').value = d.teslimTarih || '';
      document.getElementById('dan-ucret').value = d.ucret || '';
      document.getElementById('dan-tahsil').value = d.tahsilEdildi || '';
      document.getElementById('dan-aciklama').value = d.aciklama || '';
      document.getElementById('dan-modal-title').textContent = 'Hizmeti Düzenle';
    }
  } else {
    document.getElementById('dan-modal-title').textContent = 'Yeni Hizmet';
  }
  openModal('dan-modal');
}

function toggleDanTakvim(cb) {
  // Takvim checkbox toggle — ileride geliştirilebilir
}

function saveDan() {
  const konu = document.getElementById('dan-konu').value.trim();
  const muvId = document.getElementById('dan-muv').value;
  if(!zorunluKontrol([{id:'dan-konu',deger:konu,label:'Konu'}])){notify('⚠️ Zorunlu alanları doldurun.');return;}
  if (!muvId) { notify('Müvekkil seçiniz!'); return; }
  const id = document.getElementById('dan-id').value;
  const ucret = parseFloat(document.getElementById('dan-ucret').value) || 0;
  const tahsil = parseFloat(document.getElementById('dan-tahsil').value) || 0;
  const teslim = document.getElementById('dan-teslim').value;
  const ekTakvim = document.getElementById('dan-takvim-ekle').checked;
  let takvimId = null;
  if (id) {
    const d = state.danismanlik.find(x => x.id === id);
    if (d) {
      d.tur = document.getElementById('dan-tur').value;
      d.muvId = muvId;
      d.konu = konu;
      d.durum = document.getElementById('dan-durum').value;
      d.tarih = document.getElementById('dan-tarih').value;
      d.teslimTarih = teslim;
      d.ucret = ucret;
      d.tahsilEdildi = tahsil;
      d.aciklama = document.getElementById('dan-aciklama').value.trim();
      takvimId = d.takvimId;
    }
  } else {
    const yeni = {
      id: uid(), muvId, sira: (state.danismanlik.length + 1),
      tur: document.getElementById('dan-tur').value,
      konu, durum: document.getElementById('dan-durum').value,
      tarih: document.getElementById('dan-tarih').value,
      teslimTarih: teslim, ucret, tahsilEdildi: tahsil,
      aciklama: document.getElementById('dan-aciklama').value.trim(),
      notlar: [], evraklar: [], takvimId: null
    };
    if (ekTakvim && teslim) {
      const etk = { id: uid(), baslik: konu + ' (Teslim)', tarih: teslim, saat: '', tur: 'Son Gün', muvId, acik: 'Danışmanlık hizmeti teslim tarihi' };
      state.etkinlikler.push(etk);
      yeni.takvimId = etk.id;
    }
    state.danismanlik.push(yeni);
  }
  // Takvimde güncelle
  if (ekTakvim && teslim && !takvimId) {
    const etk = { id: uid(), baslik: konu + ' (Teslim)', tarih: teslim, saat: '', tur: 'Son Gün', muvId, acik: 'Danışmanlık hizmeti teslim tarihi' };
    state.etkinlikler.push(etk);
    const d = state.danismanlik.find(x => x.id === id);
    if (d) d.takvimId = etk.id;
  }
  saveData();
  closeModal('dan-modal');
  renderDanismanlik();
  if (document.getElementById('mt-danismanlik').classList.contains('active')) renderMdDanismanlik();
  updateBadges();
  notify('✓ Hizmet kaydedildi');
}
