import { useSyncExternalStore } from 'react';
import type { BuroGider } from '../../lib/hooks/useBuroGiderleri';

let state = { fail: true, pending: false, attempts: 0, rows: [] as BuroGider[] };
const listeners = new Set<() => void>();
function update(patch: Partial<typeof state>) { state = { ...state, ...patch }; listeners.forEach(fn => fn()); }
export function useFixtureState() {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => state);
}
export function setFixtureFailure(fail: boolean) { update({ fail }); }
export async function saveFixtureRecord(record: BuroGider) {
  update({ attempts: state.attempts + 1, pending: true });
  try {
    await new Promise(resolve => setTimeout(resolve, 800));
    if (state.fail) throw new Error('Sentetik ağ hatası');
    update({ rows: [...state.rows.filter(row => row.id !== record.id), record] });
  } finally { update({ pending: false }); }
}
export function useBuroGiderKaydet() {
  const current = useFixtureState();
  return { isPending: current.pending, mutateAsync: saveFixtureRecord };
}
export function useBuroId() { return 'synthetic-bureau'; }
export const GIDER_KATEGORILERI = ['Kira', 'Diğer'];
export const KDV_ORANLARI = [0, 1, 10, 20];
