'use client';

import { useState, useMemo } from 'react';
import { usePersoneller, type Personel } from '@/lib/hooks/usePersonel';
import { PersonelModal } from '@/components/modules/PersonelModal';

const ROL_RENK: Record<string, { bg: string; text: string; label: string }> = {
  sahip: { bg: 'bg-gold-dim', text: 'text-gold', label: 'Büro Sahibi' },
  avukat: { bg: 'bg-blue-400/10', text: 'text-blue-400', label: 'Avukat' },
  stajyer: { bg: 'bg-purple-400/10', text: 'text-purple-400', label: 'Stajyer' },
  sekreter: { bg: 'bg-green-dim', text: 'text-green', label: 'Sekreter' },
};

export default function PersonelPage() {
  const { data: personeller, isLoading } = usePersoneller();
  const [modalAcik, setModalAcik] = useState(false);
  const [secili, setSecili] = useState<Personel | null>(null);

  const kpis = useMemo(() => {
    if (!personeller) return { toplam: 0, aktif: 0, avukat: 0, stajyer: 0 };
    return {
      toplam: personeller.length,
      aktif: personeller.filter((p) => p.durum === 'aktif').length,
      avukat: personeller.filter((p) => p.rol === 'avukat').length,
      stajyer: personeller.filter((p) => p.rol === 'stajyer').length,
    };
  }, [personeller]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
          Personel
          {personeller && <span className="text-sm font-normal text-text-muted ml-2">({personeller.length})</span>}
        </h1>
        <button
          onClick={() => { setSecili(null); setModalAcik(true); }}
          className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
        >
          + Personel Ekle
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <MiniKpi label="Toplam" value={kpis.toplam} />
        <MiniKpi label="Aktif" value={kpis.aktif} color="text-green" />
        <MiniKpi label="Avukat" value={kpis.avukat} color="text-blue-400" />
        <MiniKpi label="Stajyer" value={kpis.stajyer} color="text-purple-400" />
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>
      ) : !personeller || personeller.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-lg">
          <div className="text-4xl mb-3">👥</div>
          <div className="text-sm text-text-muted">Henüz personel eklenmemiş</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 flex-1">
          {personeller.map((p) => {
            const rol = ROL_RENK[p.rol || ''] || { bg: 'bg-surface2', text: 'text-text-muted', label: p.rol || '—' };
            return (
              <div key={p.id} onClick={() => { setSecili(p); setModalAcik(true); }} className="bg-surface border border-border rounded-lg p-4 hover:border-gold transition-colors cursor-pointer group">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${rol.bg} border border-current flex items-center justify-center ${rol.text} text-sm font-bold flex-shrink-0`}>
                    {(p.ad || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text group-hover:text-gold transition-colors truncate">
                        {p.ad || '—'}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rol.bg} ${rol.text}`}>
                        {rol.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      {p.email && <span>{p.email}</span>}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      {p.tel && <span>📞 {p.tel}</span>}
                      {p.baroSicil && <span> · Baro: {p.baroSicil}</span>}
                    </div>
                  </div>
                  {/* Durum */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                    p.durum === 'aktif' ? 'bg-green' :
                    p.durum === 'davet_gonderildi' ? 'bg-gold' :
                    'bg-text-dim'
                  }`} title={p.durum === 'aktif' ? 'Aktif' : p.durum === 'davet_gonderildi' ? 'Davet Gönderildi' : 'Pasif'} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <PersonelModal open={modalAcik} onClose={() => setModalAcik(false)} personel={secili} />
    </div>
  );
}

function MiniKpi({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`font-[var(--font-playfair)] text-xl font-bold ${color || 'text-text'}`}>{value}</div>
    </div>
  );
}
