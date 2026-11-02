import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MuvAlacak } from '../../components/modules/muvekkil/MuvAlacak';
import { CompactStatsRow } from '../../components/modules/muvekkil/CompactStatsRow';
import { useModalDraft } from '../../lib/hooks/useModalDraft';
import { dosyaTahsilatiKaydet, hizmetTahsilatiEkle, hizmetUcretHareketleri } from '../../lib/finans/gelirKurallari';
import { dosyaParaOzeti } from '../../lib/utils/finans';

function DraftFixture() {
  const [open,setOpen]=useState(true);
  const [initial]=useState({konu:''});
  const [form,setForm]=useState(initial);
  const draft=useModalDraft('fixture-new-client-a',form,initial,open);
  return <section aria-label="Taslak testi">
    <h2>Taslak kurtarma</h2>
    <button onClick={()=>setOpen(!open)}>{open?'Formu kapat':'Formu yeniden aç'}</button>
    {open&&<><label>Test form konusu<input value={form.konu} onChange={event=>setForm({konu:event.target.value})}/></label>
      <p>Önceki oturum taslağı: {draft.hasDraft()?'Var':'Yok'}</p>
      <button onClick={()=>{const restored=draft.loadDraft();if(restored)setForm(restored);}}>Önceki taslağı yükle</button>
      <button onClick={()=>{draft.clearDraft();setForm(initial);}}>Taslağı temizle</button></>}
  </section>;
}
function Fixture() {
  const [record,setRecord]=useState<Record<string,unknown>>({id:'fixture-case',esasNo:'900015',ucret:3000,tahsilatlar:[]});
  const [consulting,setConsulting]=useState<Record<string,unknown>>({id:'fixture-consulting',konu:'CODEX TEST Danışmanlık',aylikUcret:1500,tahsilEdildi:200});
  const [fail,setFail]=useState(false);
  const [attempts,setAttempts]=useState<string[]>([]);
  const paid=dosyaParaOzeti(record).sozlesmeTahsilati+hizmetUcretHareketleri(consulting).reduce((sum,item)=>sum+Number(item.tutar||0),0);
  return <main>
    <h1>LexBase aday sürüm: müvekkil finans formu</h1>
    <p>Yalnız sentetik yerel veri. Canlı Supabase ve e-posta bağlantısı yok.</p>
    <CompactStatsRow dosyaSayisi={1} aktifDosya={1} davaSayisi={1} icraSayisi={0} arabSayisi={0} ihtSayisi={0}
      finansOzet={{masraflar:{toplam:1500},avanslar:{alinan:1000},bakiye:{masrafBakiye:-500,genelBakiye:250},alacak:{kalan:4500-paid,tahsilEdilen:paid}}}/>
    <section aria-label="Kayıt kontrolü"><button onClick={()=>setFail(true)}>Sonraki tahsilatı başarısız yap</button>
      <p>Hata simülasyonu: {fail?'Hazır':'Kapalı'}</p><p>Kayıt denemesi: {attempts.length}</p>
      <p>Benzersiz işlem kimliği: {new Set(attempts).size}</p>
      <p>Dosyaya kaydedilen tahsilat: {Array.isArray(record.tahsilatlar)?record.tahsilatlar.length:0}</p>
    </section>
    <MuvAlacak davalar={[record]} icralar={[]} arabuluculuklar={[]} ihtarnameler={[]} danismanliklar={[consulting]} finansOzet={null}
      onTahsilatKaydet={async(id,kind,payment)=>{
        setAttempts(items=>[...items,payment.id]);
        await new Promise(resolve=>setTimeout(resolve,500));
        if(fail){setFail(false);throw new Error('Sentetik bağlantı hatası. Bilgiler korunuyor.');}
        const movement={...payment,tur:'akdi_vekalet',acik:payment.aciklama};
        if(kind==='Danışmanlık')setConsulting(current=>({...current,tahsilatlar:hizmetTahsilatiEkle(current,movement)}));
        else setRecord(current=>({...current,tahsilatlar:dosyaTahsilatiKaydet(current,movement)}));
      }}/>
    <DraftFixture/>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
