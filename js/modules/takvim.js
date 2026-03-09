// ================================================================
// EMD HUKUK — TAKVIM VE ETKINLIK
// js/modules/takvim.js
//
// Tatil entegrasyonu: Tatiller modülü ile resmi/dini/adli tatiller
// Sanal birleştirme: Dava duruşma, görev son tarih, icra itiraz
// ================================================================

function initCal(){const n=new Date();calY=n.getFullYear();calM=n.getMonth();}
function calPrev(){calM--;if(calM<0){calM=11;calY--;}renderCalendar();}
function calNext(){calM++;if(calM>11){calM=0;calY++;}renderCalendar();}

// ── Sanal etkinlik üretici — dava/görev/icra ──
function _sanalEtkinlikler() {
  var sanal = [];
  var bugun = today();

  // Dava duruşma tarihleri
  (state.davalar || []).forEach(function(d) {
    if (d.durusma && (d.durum === 'Aktif' || d.durum === 'Devam Ediyor')) {
      // Zaten etkinliklerde varsa ekleme
      var zatenVar = state.etkinlikler.some(function(e) {
        return e.tarih === d.durusma && (e.tur === 'Duruşma' || e.baslik.toLowerCase().indexOf('duruşma') !== -1);
      });
      if (!zatenVar) {
        sanal.push({
          tarih: d.durusma,
          baslik: (d.no || '') + ' Duruşma',
          tur: 'Duruşma',
          saat: d.durusmaSaat || '',
          sanal: true,
          kaynak: 'dava',
          muvId: d.muvId || '',
          hedef: 'davalar'
        });
      }
    }
  });

  // Görev son tarihleri
  (state.todolar || []).forEach(function(td) {
    if (td.sonTarih && td.durum !== 'Tamamlandı') {
      sanal.push({
        tarih: td.sonTarih,
        baslik: td.baslik || 'Görev',
        tur: 'Görev',
        saat: '',
        sanal: true,
        kaynak: 'todo',
        muvId: td.muvId || '',
        hedef: 'todo'
      });
    }
  });

  // İcra itiraz son tarihleri
  (state.icra || []).forEach(function(i) {
    if (i.itirazSonTarih && i.durum !== 'Kapandı') {
      sanal.push({
        tarih: i.itirazSonTarih,
        baslik: 'İtiraz: ' + (i.borcluAd || i.no || ''),
        tur: 'İtiraz',
        saat: '',
        sanal: true,
        kaynak: 'icra',
        muvId: i.muvId || '',
        hedef: 'icra'
      });
    }
  });

  return sanal;
}

function renderCalendar(){
  document.getElementById('cal-label').textContent=MTR[calM]+' '+calY;
  document.getElementById('cal-header').innerHTML=DTR.map(d=>`<div class="cal-day-name">${d}</div>`).join('');
  const body=document.getElementById('cal-body');body.innerHTML='';
  const fd=new Date(calY,calM,1);let sdow=fd.getDay();sdow=sdow===0?6:sdow-1;
  const dim=new Date(calY,calM+1,0).getDate(),pd=new Date(calY,calM,0).getDate();
  const ts=today();const cells=[];
  for(let i=sdow-1;i>=0;i--)cells.push({d:pd-i,m:calM-1,y:calY,o:true});
  for(let i=1;i<=dim;i++)cells.push({d:i,m:calM,y:calY,o:false});
  let nd=1;while(cells.length%7!==0)cells.push({d:nd++,m:calM+1,y:calY,o:true});

  // Sanal etkinlikleri bir kez hesapla
  var sanalList = _sanalEtkinlikler();

  cells.forEach(c=>{
    const ds=c.y+'-'+(c.m+1).toString().padStart(2,'0')+'-'+c.d.toString().padStart(2,'0');
    const isT=ds===ts&&!c.o;

    // 1) Kullanıcı etkinlikleri
    const evs=state.etkinlikler.filter(e=>e.tarih===ds);

    // 2) Tatil/özel gün bilgisi
    var tatilBilgi = (typeof Tatiller !== 'undefined') ? Tatiller.tarihBilgi(ds) : [];

    // 3) Sanal etkinlikler (dava/görev/icra)
    var sanalGun = sanalList.filter(function(s) { return s.tarih === ds; });

    // Tatil HTML
    var th = '';
    tatilBilgi.forEach(function(t) {
      var cls = 'cal-tatil tatil-' + t.tip;
      th += '<div class="' + cls + '" title="' + t.ad + '">' + t.ad + '</div>';
    });

    // Kullanıcı etkinlik HTML
    let eh=evs.slice(0,2).map(e=>`<div class="cal-event ${e.tur==='Duruşma'?'durusma':e.tur==='Son Gün'?'son':''}" onclick="event.stopPropagation();openTakModal('${e.id}')" title="Düzenle">${e.saat?e.saat+' ':''}${e.baslik}</div>`).join('');

    // Sanal etkinlik HTML
    var sh = '';
    sanalGun.slice(0, 2).forEach(function(s) {
      var cls = 'cal-event cal-sanal sanal-' + s.kaynak;
      sh += '<div class="' + cls + '" onclick="event.stopPropagation();showPage(\'' + s.hedef + '\',document.getElementById(\'ni-' + s.hedef + '\'))" title="' + s.baslik + '">' + (s.saat ? s.saat + ' ' : '') + s.baslik + '</div>';
    });

    // Toplam fazlalık göstergesi
    var topEtkinlik = evs.length + sanalGun.length;
    var gosterilen = Math.min(evs.length, 2) + Math.min(sanalGun.length, 2);
    if (topEtkinlik > 3) {
      var fazla = topEtkinlik - gosterilen;
      if (fazla > 0) eh += '<div style="font-size:9px;color:var(--text-dim)">+' + fazla + '</div>';
    } else if (evs.length > 2) {
      eh += '<div style="font-size:9px;color:var(--text-dim)">+' + (evs.length - 2) + '</div>';
    }

    // Tatil günü özel class
    var tatilCls = '';
    if (tatilBilgi.length && !c.o) {
      var tipSet = {};
      tatilBilgi.forEach(function(t) { tipSet[t.tip] = true; });
      if (tipSet.resmi || tipSet.dini) tatilCls = ' cal-day-tatil';
      else if (tipSet.adli) tatilCls = ' cal-day-adli';
      else if (tipSet.hukuk || tipSet.anma) tatilCls = ' cal-day-ozel';
    }

    const calClick=!c.o?"openTakModal(null,'"+ds+"')":'';
    const calCursor=!c.o?'cursor:pointer':'';
    body.innerHTML+=`<div class="cal-day${isT?' today':''}${c.o?' other-month':''}${tatilCls}" onclick="${calClick}" style="${calCursor}"><div class="cal-day-num">${c.d}</div>${th}${eh}${sh}</div>`;
  });

  // ── SAĞDAKI ETKİNLİK LİSTESİ ──
  const el=document.getElementById('etk-liste'),em=document.getElementById('etk-empty');

  // Tüm kaynakları birleştir
  var birlesik = [];

  // a) Kullanıcı etkinlikleri
  state.etkinlikler.forEach(function(e) {
    birlesik.push({
      id: e.id,
      baslik: e.baslik,
      tarih: e.tarih,
      saat: e.saat || '',
      tur: e.tur,
      muvId: e.muvId || '',
      davNo: e.davNo || '',
      yer: e.yer || '',
      sanal: false,
      kaynak: 'etkinlik',
      hedef: 'takvim'
    });
  });

  // b) Sanal etkinlikler
  sanalList.forEach(function(s) {
    birlesik.push({
      id: null,
      baslik: s.baslik,
      tarih: s.tarih,
      saat: s.saat || '',
      tur: s.tur,
      muvId: s.muvId || '',
      davNo: '',
      yer: '',
      sanal: true,
      kaynak: s.kaynak,
      hedef: s.hedef
    });
  });

  // c) Bu aydaki tatiller
  if (typeof Tatiller !== 'undefined') {
    var ayTatil = Tatiller.ayTatilleri(calY, calM);
    Object.keys(ayTatil).forEach(function(tarih) {
      ayTatil[tarih].forEach(function(t) {
        birlesik.push({
          id: null,
          baslik: t.ad,
          tarih: tarih,
          saat: '',
          tur: t.tip === 'resmi' ? 'Resmi Tatil' : t.tip === 'dini' ? 'Dini Bayram' : t.tip === 'adli' ? 'Adli Tatil' : 'Özel Gün',
          muvId: '',
          davNo: '',
          yer: '',
          sanal: true,
          kaynak: 'tatil',
          hedef: '',
          renk: t.renk
        });
      });
    });
  }

  birlesik.sort(function(a,b) { return a.tarih.localeCompare(b.tarih); });

  if(!birlesik.length){el.innerHTML='';em.style.display='block';return;}
  em.style.display='none';

  el.innerHTML=birlesik.map(function(e) {
    var bugun2=today();
    var gfark=Math.ceil((new Date(e.tarih)-new Date(bugun2))/86400000);
    var yaklasanBadge=gfark>=0&&gfark<=3?'<span style="font-size:9px;background:#e67e2222;color:#e67e22;border-radius:3px;padding:1px 5px;font-weight:700">'+(gfark===0?'Bugün':gfark===1?'Yarın':gfark+' gün')+'</span>':'';

    // Tatil/özel gün kartı
    if (e.kaynak === 'tatil') {
      var tRenk = e.renk || '#27ae60';
      return '<div style="padding:8px 14px;border-bottom:1px solid var(--border);border-left:3px solid ' + tRenk + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<div style="flex:1">' +
        '<div style="font-size:12px;font-weight:600;color:' + tRenk + '">' + e.baslik + ' ' + yaklasanBadge + '</div>' +
        '<div style="font-size:10px;color:var(--text-muted)">' + fmtD(e.tarih) + '</div>' +
        '</div>' +
        '<span class="badge" style="background:' + tRenk + '22;color:' + tRenk + ';font-size:9px">' + e.tur + '</span>' +
        '</div></div>';
    }

    // Sanal etkinlik kartı (dava/görev/icra)
    if (e.sanal) {
      var sRenk = e.kaynak === 'dava' ? '#2980b9' : e.kaynak === 'todo' ? '#e67e22' : '#C9A84C';
      var sIcon = e.kaynak === 'dava' ? '⚖️' : e.kaynak === 'todo' ? '✅' : '⚡';
      return '<div style="padding:8px 14px;border-bottom:1px solid var(--border);border-left:3px solid ' + sRenk + ';cursor:pointer" onclick="showPage(\'' + e.hedef + '\',document.getElementById(\'ni-' + e.hedef + '\'))">' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<div style="flex:1">' +
        '<div style="font-size:12px;font-weight:600">' + sIcon + ' ' + e.baslik + ' ' + yaklasanBadge + '</div>' +
        '<div style="font-size:10px;color:var(--text-muted)">' + fmtD(e.tarih) + (e.saat ? ' – ' + e.saat : '') + '</div>' +
        (e.muvId ? '<div style="font-size:10px;color:var(--text-dim)">👤 ' + getMuvAd(e.muvId) + '</div>' : '') +
        '</div>' +
        '<span class="badge" style="background:' + sRenk + '22;color:' + sRenk + ';font-size:9px">' + e.tur + '</span>' +
        '</div></div>';
    }

    // Normal etkinlik kartı (mevcut)
    var bc=e.tur==='Duruşma'?'durusma':e.tur==='Son Gün'?'son':'beklemede';
    return '<div style="padding:10px 14px;border-bottom:1px solid var(--border)">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
      '<div style="flex:1;cursor:pointer" onclick="openTakModal(\'' + e.id + '\')">' +
      '<div style="font-size:12px;font-weight:600;margin-bottom:2px">' + e.baslik + ' ' + yaklasanBadge + '</div>' +
      '<div style="font-size:10px;color:var(--text-muted)">' + fmtD(e.tarih) + (e.saat ? ' – ' + e.saat : '') + (e.yer ? ' · 📍' + e.yer : '') + '</div>' +
      (e.muvId ? '<div style="font-size:10px;color:var(--text-dim)">👤 ' + getMuvAd(e.muvId) + (e.davNo ? ' · 📁' + e.davNo : '') + '</div>' : '') +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:5px">' +
      '<span class="badge badge-' + bc + '">' + e.tur + '</span>' +
      '<button class="delete-btn" onclick="delEtkinlik(\'' + e.id + '\')">✕</button>' +
      '</div></div></div>';
  }).join('');
}

// ================================================================
// DASHBOARD
// ================================================================

// Eklendi: eksik fonksiyon
function etkinlikKart(e){
    const renk=turRenk[e.tur]||'var(--text-muted)';
    const ikon=turIcon[e.tur]||'📅';
    const gecmisStyle=e.tarih<bugun?'opacity:0.65':'';
    return '<div style="background:var(--surface2);border:1px solid var(--border);border-left:4px solid '+renk+';border-radius:var(--radius);padding:14px 16px;margin-bottom:10px;'+gecmisStyle+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
      +'<div style="flex:1">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
      +'<span style="font-size:16px">'+ikon+'</span>'
      +'<span style="font-size:13px;font-weight:700">'+e.baslik+'</span>'
      +'<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:'+renk+'22;color:'+renk+'">'+e.tur+'</span>'
      +'</div>'
      +'<div style="display:flex;gap:16px;font-size:11px;color:var(--text-muted);flex-wrap:wrap">'
      +'<span>📅 '+fmtD(e.tarih)+(e.saat?' · '+e.saat:'')+'</span>'
      +(e.davNo?'<span>📁 '+e.davNo+'</span>':'')
      +(e.yer?'<span>📍 '+e.yer+'</span>':'')
      +'</div>'
      +(e.not?'<div style="margin-top:8px;font-size:12px;color:var(--text);line-height:1.5;white-space:pre-wrap">'+e.not+'</div>':'')
      +'</div>'
      +'<button class="btn btn-outline btn-sm" onclick="openTakModal(&quot;'+e.id+'&quot;)">✏</button>'
      +'</div></div>';
  }
