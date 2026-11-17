'use client';

import { fmt } from '@/lib/utils';
import { useFinansUyarilar } from '@/lib/hooks/useFinans';
import { EmptyState } from '../WidgetWrapper';

export function FinansUyariWidget() {
  const { data, isPending, isError } = useFinansUyarilar();
  if (isError) return <p role="alert" className="p-3 text-xs text-red">Finans uyarıları yüklenemedi.</p>;
  if (isPending) return <p role="status" className="p-3 text-xs text-text-muted">Finans uyarıları yükleniyor...</p>;
  if (!data.length) return <EmptyState icon="✅" text="Finansal uyarı bulunmuyor" />;
  const kritik = data.filter(u => u.oncelik === 'yuksek').length;
  return <div className="mt-1 space-y-2">
    <p className="text-xs text-text-muted">{kritik} kritik, {data.length} toplam uyarı</p>
    {data.slice(0, 6).map(u => <div key={u.id} className={`rounded-lg p-3 text-xs ${u.oncelik === 'yuksek' ? 'bg-red-dim text-red' : 'bg-gold-dim text-gold'}`}>
      <div>{u.muvAd} — {u.mesaj}</div>
      <div className="mt-1 font-semibold">{fmt(u.tutar)}</div>
    </div>)}
  </div>;
}
