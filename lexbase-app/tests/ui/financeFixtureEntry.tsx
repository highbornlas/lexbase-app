import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BuroGiderModal } from '../../components/modules/BuroGiderModal';
import { TahsilatModal } from '../../components/modules/TahsilatModal';
import { useFixtureState, setFixtureFailure, saveFixtureRecord } from './financeFixtureHooks';
import { muvekkilFinansOzeti } from '../../lib/finans/muvekkilOzeti';
import type { BuroGider } from '../../lib/hooks/useBuroGiderleri';

function FinanceFixture() {
  const state = useFixtureState();
  const [open, setOpen] = useState(false), [payment, setPayment] = useState(false);
  const [selected, setSelected] = useState<BuroGider | null>(null);
  const report = muvekkilFinansOzeti('test', { icralar: [{ id: 'test-case', muvId: 'test', ucret: 3000,
    tahsilatlar: [{ tur: 'tahsilat', tutar: 10000 }, { tur: 'akdi_vekalet', tutar: 1000 }] }] },
    [{ muvId: 'test', tip: 'alim', tutar: 1000 }, { muvId: 'test', tip: 'masraf', tutar: 1300 }]);
  return <main>
    <h1>Finans: yerel kayıt güvenilirliği testi</h1>
    <p>Gerçek form bileşenleri; yalnız bellek içi sentetik kayıt. Supabase veya canlı veri bağlantısı yok.</p>
    <p aria-live="polite">Deneme: {state.attempts} | Kayıt: {state.rows.length} | Bekleyen: {String(state.pending)}</p>
    <label><input type="checkbox" checked={state.fail} onChange={e => setFixtureFailure(e.target.checked)} />Başarısız kayıt simülasyonu</label>
    <button onClick={() => { setSelected(null); setOpen(true); }}>Yeni gider</button>
    <button disabled={!state.rows.length} onClick={() => { setSelected(state.rows[0]); setOpen(true); }}>Kaydı düzenle</button>
    <button onClick={() => setPayment(true)}>Yeni tahsilat</button>
    <p>Ücret alacağı: {report.alacak.kalan} TL | Avans bakiyesi: {report.bakiye.masrafBakiye} TL | Büro geliri: {report.buroGelir} TL</p>
    {open && <BuroGiderModal open onClose={() => setOpen(false)} gider={selected} />}
    {payment && <TahsilatModal open onClose={() => setPayment(false)} draftScope="synthetic-finance"
      onKaydet={async record => { await saveFixtureRecord({ ...record }); }} />}
    <details><summary>Sentetik kayıtlar</summary><pre>{JSON.stringify(state.rows, null, 2)}</pre></details>
  </main>;
}

createRoot(document.getElementById('root')!).render(<FinanceFixture />);
