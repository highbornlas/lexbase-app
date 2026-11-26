'use client';

import { fmt } from '@/lib/utils';
import { useDashboardFinans } from '@/lib/hooks/useDashboardFinans';

export function PerformansWidget() {
  const { data, isPending, isError } = useDashboardFinans();
  if (isError) return <p role="alert" className="p-3 text-xs text-red">Finans grafiği yüklenemedi.</p>;
  if (isPending || !data) return <p role="status" className="p-3 text-xs text-text-muted">Finans grafiği yükleniyor...</p>;
  const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const buAy = new Date().getMonth();
  const { aylikVeri, kaynakDagilim } = data;

  const maxVal = Math.max(1, ...aylikVeri.gelirler, ...aylikVeri.giderler);
  const toplamVarMi = aylikVeri.gelirler.some(v => v > 0) || aylikVeri.giderler.some(v => v > 0);

  const KAYNAK_RENK: Record<string, string> = {
    'Dava': 'bg-blue',
    'İcra': 'bg-red',
    'Danışmanlık': 'bg-gold',
    'Arabuluculuk': 'bg-green',
    'İhtarname': 'bg-purple',
  };

  return (
    <div className="space-y-3 mt-2">
      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-24 px-1">
        {aylar.map((ay, i) => {
          const gelirH = toplamVarMi ? (aylikVeri.gelirler[i] / maxVal) * 100 : 0;
          const giderH = toplamVarMi ? (aylikVeri.giderler[i] / maxVal) * 100 : 0;
          return (
            <div key={ay} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex gap-[1px] h-16 items-end">
                <div className={`flex-1 rounded-sm ${i === buAy ? 'bg-green' : 'bg-green/30'}`} style={{ height: `${Math.max(gelirH, 0)}%` }} title={`Gelir: ${fmt(aylikVeri.gelirler[i])}`} />
                <div className={`flex-1 rounded-sm ${i === buAy ? 'bg-red' : 'bg-red/30'}`} style={{ height: `${Math.max(giderH, 0)}%` }} title={`Gider: ${fmt(aylikVeri.giderler[i])}`} />
              </div>
              <span className={`text-[8px] ${i === buAy ? 'text-text font-bold' : 'text-text-dim'}`}>{ay}</span>
            </div>
          );
        })}
      </div>

      {/* Legend: Gelir/Gider + Kaynak dağılımı */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-center gap-5 text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green" /> Gelir</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red" /> Gider</span>
        </div>

        {/* Kaynak dağılımı mini bar */}
        {kaynakDagilim.length > 0 && (
          <div className="px-1">
            <div className="flex h-1.5 rounded-full overflow-hidden bg-surface2">
              {(() => {
                const toplam = kaynakDagilim.reduce((s, [, v]) => s + v, 0);
                return kaynakDagilim.map(([kaynak, tutar]) => (
                  <div
                    key={kaynak}
                    className={`${KAYNAK_RENK[kaynak] || 'bg-text-dim'}`}
                    style={{ width: `${(tutar / toplam) * 100}%` }}
                    title={`${kaynak}: ${fmt(tutar)}`}
                  />
                ));
              })()}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 mt-1.5">
              {kaynakDagilim.map(([kaynak, tutar]) => (
                <span key={kaynak} className="flex items-center gap-1 text-[9px] text-text-dim">
                  <span className={`w-1.5 h-1.5 rounded-full ${KAYNAK_RENK[kaynak] || 'bg-text-dim'}`} />
                  {kaynak} {fmt(tutar)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
