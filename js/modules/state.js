// ================================================================
// EMD HUKUK — LOCALSTORAGE
// js/modules/state.js
// ================================================================

function loadData(){
  try{
    const d=localStorage.getItem(SK);
    if(d){const p=JSON.parse(d);Object.keys(p).forEach(k=>{if(k in state)state[k]=p[k];});}
  }catch(e){}
  // Supabase modunda karşı taraf ve vekil verilerini localStorage'dan alma
  if(currentBuroId){
    state.karsiTaraflar=[];
    state.vekillar=[];
  }
  const koleksiyonlar=['muvekkillar','karsiTaraflar','vekillar','davalar','icra','ihtarnameler','todolar'];
  koleksiyonlar.forEach(k=>{
    if(!state[k])state[k]=[];
    let sonraki=Math.max(0,...state[k].map(x=>x.sira||0))+1;
    state[k].forEach(x=>{if(!x.sira){x.sira=sonraki++;} });
  });
}

function saveData(){
  try{ localStorage.setItem(SK, JSON.stringify(state)); }catch(e){}
}

// ================================================================
// PLAN / LİSANS SİSTEMİ
// ================================================================
const PLANLAR = {
  deneme: {
    ad: 'Başlangıç', label: 'Deneme', ikon: '🌱', renk: '#3498db',
    fiyat: 0, yillik: 0,
    limitler: { muvekkil: 25, dava: 30, icra: 15, personel: 0 },
    ozellikler: { whatsapp: false, finans: false, uyap: false, arabuluculuk: true, danismanlik: true },
    aciklama: '30 gün ücretsiz deneme',
  },
  profesyonel: {
    ad: 'Profesyonel', label: 'Profesyonel', ikon: '⚡', renk: '#c9a84c',
    fiyat: 399, yillik: 3990,
    limitler: { muvekkil: 150, dava: 200, icra: 100, personel: 0 },
    ozellikler: { whatsapp: true, finans: true, uyap: true, arabuluculuk: true, danismanlik: true },
    aciklama: 'Tek avukat için ideal',
  },
  buro: {
    ad: 'Büro', label: 'Büro', ikon: '🏛', renk: '#27ae60',
    fiyat: 699, yillik: 6990,
    limitler: { muvekkil: 500, dava: 750, icra: 400, personel: 5 },
    ozellikler: { whatsapp: true, finans: true, uyap: true, arabuluculuk: true, danismanlik: true },
    aciklama: '2-5 kişilik bürolar için',
  },
  kurumsal: {
    ad: 'Kurumsal', label: 'Kurumsal', ikon: '🏢', renk: '#8e44ad',
    fiyat: 999, yillik: 9990,
    limitler: { muvekkil: Infinity, dava: Infinity, icra: Infinity, personel: Infinity },
    ozellikler: { whatsapp: true, finans: true, uyap: true, arabuluculuk: true, danismanlik: true },
    aciklama: 'Büyük bürolar için sınırsız',
  },
};
