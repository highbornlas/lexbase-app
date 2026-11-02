import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient,QueryClientProvider,useQuery } from '@tanstack/react-query';
import { DosyaHarcamaTab } from '../../components/modules/DosyaHarcamaTab';
import { useRecordLifecycle } from '../../lib/hooks/useRecordLifecycle';
import { kasaIslemHatasi,type DosyaMasraf } from '../../lib/data/financeCashTransaction';

type FixtureState = {record:{harcamalar?:DosyaMasraf[];_arsivlendi?:string;_silindi?:string};cashBalance:number;expenseDue:number;officeNet:number;rpcCount:number;failureArmed:boolean};
const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
function Fixture() {
  const query = useQuery<FixtureState>({queryKey:['dava','fixture'],queryFn:async()=>{
    const response=await fetch('/state');if(!response.ok)throw new Error('Fixture unavailable');return response.json();
  }});
  const archive=useRecordLifecycle('davalar','arsivle');
  const unarchive=useRecordLifecycle('davalar','arsivden_cikar');
  const remove=useRecordLifecycle('davalar','sil');
  const restore=useRecordLifecycle('davalar','geri_yukle');
  const destroy=useRecordLifecycle('davalar','kalici_sil');
  const [error,setError]=useState('');
  if(!query.data)return <p>Fixture loading...</p>;
  const data=query.data;
  const operations=[['Arşivle',archive],['Arşivden çıkar',unarchive],['Çöpe taşı',remove],['Geri yükle',restore],['Kalıcı sil',destroy]] as const;
  return <main>
    <h1>LexBase: izole finans testi</h1><p>Sentetik kayıtlar. Gerçek uygulama bileşeni ve SQL işlemleri; canlı bağlantı yok.</p>
    <section aria-label="Finans sonuçları"><p>Müvekkil kasa bakiyesi: {data.cashBalance}</p><p>Masraf alacağı: {data.expenseDue}</p>
      <p>Büro neti: {data.officeNet}</p><p>Dosya: {data.record._silindi?'Çöp kutusunda':data.record._arsivlendi?'Arşivde':'Aktif'}</p><p>RPC çağrı sayısı: {data.rpcCount}</p></section>
    <section>{operations.map(([name,operation])=><button key={name} disabled={operations.some(([,op])=>op.isPending)} onClick={async()=>{
      setError('');try{await operation.mutateAsync('fixture');}catch(e){setError(kasaIslemHatasi(e));}
    }}>{name}</button>)}
      <button onClick={async()=>{await fetch('/fail-next',{method:'POST'});await client.invalidateQueries({queryKey:['dava']});}}>Sonraki kasa yazımını başarısız yap</button>
      {data.failureArmed&&<p>Sonraki kasa yazımı işlem ortasında reddedilecek.</p>}{error&&<p role="alert">{error}</p>}
    </section>
    <DosyaHarcamaTab key="fixture" dosyaId="fixture" dosyaTur="Dava" harcamalar={data.record.harcamalar||[]}/>
  </main>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><Fixture/></QueryClientProvider>);
