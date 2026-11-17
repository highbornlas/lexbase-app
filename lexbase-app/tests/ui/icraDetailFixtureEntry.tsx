import { lazy, Suspense, useState, type ElementType } from 'react';
import { createRoot } from 'react-dom/client';
import { OzetTab } from '../../components/modules/icra/detay/OzetTab';
import { icraDetailCases } from './icra-detail-cases.mjs';
import { icraDetayHesabi } from '../../lib/finans/icraDetay';
import type { Icra } from '../../lib/hooks/useIcra';

const panels: Record<string, ElementType> = {
  OzetTab,
  NotlarTab: lazy(() => import('../../components/modules/icra/detay/NotlarTab').then(m => ({ default: m.NotlarTab }))),
  SurelerTab: lazy(() => import('../../components/modules/icra/detay/SurelerTab').then(m => ({ default: m.SurelerTab }))),
  AnlasmaTab: lazy(() => import('../../components/modules/icra/detay/AnlasmaTab').then(m => ({ default: m.AnlasmaTab }))),
  TebligatlarTab: lazy(() => import('../../components/modules/icra/detay/TebligatlarTab').then(m => ({ default: m.TebligatlarTab }))),
  OdemePlaniSection: lazy(() => import('../../components/modules/icra/detay/OdemePlaniSection').then(m => ({ default: m.OdemePlaniSection }))),
  AlacakKalemleriAdim: lazy(() => import('../../components/modules/icra/form/AlacakKalemleriAdim').then(m => ({ default: m.AlacakKalemleriAdim }))),
};

function Fixture() {
  const [record, setRecord] = useState<Icra>({ id: 'synthetic-icra', alacak: 1000, tarih: '2026-10-01' });
  const [selected, setSelected] = useState('OzetTab');
  const [writes, setWrites] = useState(0);
  const save = (next: Icra) => { setRecord(next); setWrites(value => value + 1); };
  const patch = (fields: Partial<Icra>) => { setRecord(current => ({ ...current, ...fields })); setWrites(value => value + 1); };
  const Panel = panels[selected];
  const props: Record<string, unknown> = {
    ...icraDetailCases()[0].props, icra: record, hesap: icraDetayHesabi(record), onUpdate: save,
    notlar: record.notlar || [], notText: record.not, sureler: record.sureler || [],
    onEkle: (item: { id: string }) => selected === 'NotlarTab'
      ? save({ ...record, notlar: [...(record.notlar || []), item] })
      : save({ ...record, sureler: [...(record.sureler || []), item as NonNullable<Icra['sureler']>[number]] }),
    onSil: (id: string) => selected === 'NotlarTab'
      ? save({ ...record, notlar: (record.notlar || []).filter(item => item.id !== id) })
      : save({ ...record, sureler: (record.sureler || []).filter(item => item.id !== id) }),
    anlasma: record.anlasma, onKaydet: (anlasma: Record<string, unknown>) => save({ ...record, anlasma }),
    alacakDetay: record.alacakDetay || [], takipTarihi: record.tarih || '',
    onChange: (alacakDetay: Icra['alacakDetay']) => patch({ alacakDetay }),
    onLegacyChange: (alacakKalemleri: Icra['alacakKalemleri']) => patch({ alacakKalemleri }),
  };
  return <main>
    <h1>İcra modülü: yerel davranış testi</h1>
    <p>Gerçek sekme bileşenleri, yalnız sentetik bellek verisi. Canlı hesap/veritabanı bağlantısı yok.</p>
    <nav>{Object.keys(panels).map(name => <button key={name} onClick={() => setSelected(name)}>{name}</button>)}</nav>
    <p aria-live="polite">Başarılı yerel kayıt: {writes}</p>
    <Suspense fallback={<p role="status">Bölüm yükleniyor...</p>}><Panel {...props} /></Suspense>
    <details><summary>Sentetik kayıt</summary><pre>{JSON.stringify(record, null, 2)}</pre></details>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
