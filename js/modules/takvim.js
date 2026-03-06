// ================================================================
// EMD HUKUK — TAKVIM VE ETKINLIK
// js/modules/takvim.js
// ================================================================

function initCal(){const n=new Date();calY=n.getFullYear();calM=n.getMonth();}
function calPrev(){calM--;if(calM<0){calM=11;calY--;}renderCalendar();}
function calNext(){calM++;if(calM>11){calM=0;calY++;}renderCalendar();}
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
  cells.forEach(c=>{
    const ds=c.y+'-'+(c.m+1).toString().padStart(2,'0')+'-'+c.d.toString().padStart(2,'0');
    const isT=ds===ts&&!c.o;const evs=state.etkinlikler.filter(e=>e.tarih===ds);
    let eh=evs.slice(0,2).map(e=>`<div class="cal-event ${e.tur==='Duruşma'?'durusma':e.tur==='Son Gün'?'son':''}" onclick="event.stopPropagation();openTakModal('${e.id}')" title="Düzenle">${e.saat?e.saat+' ':''}${e.baslik}</div>`).join('');
    if(evs.length>2)eh+=`<div style="font-size:9px;color:var(--text-dim)">+${evs.length-2}</div>`;
    const calClick=!c.o?"openTakModal(null,'"+ds+"')":'';
    const calCursor=!c.o?'cursor:pointer':'';
    body.innerHTML+=`<div class="cal-day${isT?' today':''}${c.o?' other-month':''}" onclick="${calClick}" style="${calCursor}"><div class="cal-day-num">${c.d}</div>${eh}</div>`;
  });
  const el=document.getElementById('etk-liste'),em=document.getElementById('etk-empty');
  const list=[...state.etkinlikler].sort((a,b)=>a.tarih.localeCompare(b.tarih));
  if(!list.length){el.innerHTML='';em.style.display='block';return;}em.style.display='none';
  el.innerHTML=list.map(e=>{
    const bc=e.tur==='Duruşma'?'durusma':e.tur==='Son Gün'?'son':'beklemede';
    const bugun2=today();
    const gfark=Math.ceil((new Date(e.tarih)-new Date(bugun2))/86400000);
    const yaklasanBadge=gfark>=0&&gfark<=3?`<span style="font-size:9px;background:#e67e2222;color:#e67e22;border-radius:3px;padding:1px 5px;font-weight:700">${gfark===0?'Bugün':gfark===1?'Yarın':gfark+' gün'}</span>`:'';
    return`<div style="padding:10px 14px;border-bottom:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1;cursor:pointer" onclick="openTakModal('${e.id}')">
          <div style="font-size:12px;font-weight:600;margin-bottom:2px">${e.baslik} ${yaklasanBadge}</div>
          <div style="font-size:10px;color:var(--text-muted)">${fmtD(e.tarih)}${e.saat?' – '+e.saat:''}${e.yer?' · 📍'+e.yer:''}</div>
          ${e.muvId?`<div style="font-size:10px;color:var(--text-dim)">👤 ${getMuvAd(e.muvId)}${e.davNo?' · 📁'+e.davNo:''}</div>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:5px">
          <span class="badge badge-${bc}">${e.tur}</span>
          <button class="delete-btn" onclick="delEtkinlik('${e.id}')">✕</button>
        </div>
      </div>
    </div>`;
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
