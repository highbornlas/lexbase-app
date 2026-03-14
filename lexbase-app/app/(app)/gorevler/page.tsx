'use client';

import { useState, useMemo } from 'react';
import { useTodolar, useTodoKaydet, type Todo } from '@/lib/hooks/useTodolar';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmtTarih } from '@/lib/utils';
import { GorevModal } from '@/components/modules/GorevModal';

const ONCELIK_RENK: Record<string, { bg: string; text: string; icon: string }> = {
  'Yüksek': { bg: 'bg-red-dim', text: 'text-red', icon: '🔴' },
  'Orta': { bg: 'bg-gold-dim', text: 'text-gold', icon: '🟡' },
  'Düşük': { bg: 'bg-green-dim', text: 'text-green', icon: '🟢' },
};

const DURUM_RENK: Record<string, string> = {
  'Bekliyor': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Devam Ediyor': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Tamamlandı': 'bg-green-dim text-green border-green/20',
  'İptal': 'bg-surface2 text-text-dim border-border',
};

type Grup = 'Gecikmiş' | 'Bugün' | 'Bu Hafta' | 'Diğer' | 'Tamamlandı / İptal';

export default function GorevlerPage() {
  const { data: todolar, isLoading } = useTodolar();
  const { data: muvekkillar } = useMuvekkillar();
  const todoKaydet = useTodoKaydet();
  const [arama, setArama] = useState('');
  const [filtre, setFiltre] = useState<'hepsi' | 'aktif' | 'tamamlandi'>('aktif');
  const [modalAcik, setModalAcik] = useState(false);
  const [seciliGorev, setSeciliGorev] = useState<Todo | null>(null);

  function toggleTamamla(todo: Todo) {
    const yeniDurum = todo.durum === 'Tamamlandı' ? 'Bekliyor' : 'Tamamlandı';
    todoKaydet.mutate({
      ...todo,
      durum: yeniDurum,
      ...(yeniDurum === 'Tamamlandı' ? { tamamlanmaTarih: new Date().toISOString() } : { tamamlanmaTarih: undefined }),
    });
  }

  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  // KPI'lar
  const kpis = useMemo(() => {
    if (!todolar) return { toplam: 0, bekliyor: 0, devam: 0, tamamlandi: 0, gecikmisSayi: 0 };
    const bugunStr = new Date().toISOString().split('T')[0];
    return {
      toplam: todolar.length,
      bekliyor: todolar.filter((t) => t.durum === 'Bekliyor').length,
      devam: todolar.filter((t) => t.durum === 'Devam Ediyor').length,
      tamamlandi: todolar.filter((t) => t.durum === 'Tamamlandı').length,
      gecikmisSayi: todolar.filter((t) =>
        t.sonTarih && t.sonTarih < bugunStr && t.durum !== 'Tamamlandı' && t.durum !== 'İptal'
      ).length,
    };
  }, [todolar]);

  // Gruplandırılmış ve filtrelenmiş görevler
  const gruplar = useMemo(() => {
    if (!todolar) return new Map<Grup, Todo[]>();

    const bugun = new Date();
    const bugunStr = bugun.toISOString().split('T')[0];
    const haftaSonu = new Date(bugun);
    haftaSonu.setDate(bugun.getDate() + 7);
    const haftaSonuStr = haftaSonu.toISOString().split('T')[0];

    let filtrelenmis = todolar;

    // Filtre
    if (filtre === 'aktif') {
      filtrelenmis = filtrelenmis.filter((t) => t.durum !== 'Tamamlandı' && t.durum !== 'İptal');
    } else if (filtre === 'tamamlandi') {
      filtrelenmis = filtrelenmis.filter((t) => t.durum === 'Tamamlandı' || t.durum === 'İptal');
    }

    // Arama
    if (arama) {
      const q = arama.toLowerCase();
      filtrelenmis = filtrelenmis.filter((t) =>
        (t.baslik || '').toLowerCase().includes(q) ||
        (t.aciklama || '').toLowerCase().includes(q) ||
        (muvAdMap[t.muvId || ''] || '').toLowerCase().includes(q)
      );
    }

    const map = new Map<Grup, Todo[]>();
    map.set('Gecikmiş', []);
    map.set('Bugün', []);
    map.set('Bu Hafta', []);
    map.set('Diğer', []);
    map.set('Tamamlandı / İptal', []);

    filtrelenmis.forEach((t) => {
      if (t.durum === 'Tamamlandı' || t.durum === 'İptal') {
        map.get('Tamamlandı / İptal')!.push(t);
      } else if (t.sonTarih && t.sonTarih < bugunStr) {
        map.get('Gecikmiş')!.push(t);
      } else if (t.sonTarih === bugunStr) {
        map.get('Bugün')!.push(t);
      } else if (t.sonTarih && t.sonTarih <= haftaSonuStr) {
        map.get('Bu Hafta')!.push(t);
      } else {
        map.get('Diğer')!.push(t);
      }
    });

    return map;
  }, [todolar, arama, filtre, muvAdMap]);

  const GRUP_RENK: Record<string, string> = {
    'Gecikmiş': 'border-red/30 text-red',
    'Bugün': 'border-orange-400/30 text-orange-400',
    'Bu Hafta': 'border-gold/30 text-gold',
    'Diğer': 'border-border text-text-muted',
    'Tamamlandı / İptal': 'border-border text-text-dim',
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
          Görevler
          {todolar && <span className="text-sm font-normal text-text-muted ml-2">({todolar.length})</span>}
        </h1>
        <button
          onClick={() => { setSeciliGorev(null); setModalAcik(true); }}
          className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
        >
          + Yeni Görev
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <MiniKpi label="Toplam" value={kpis.toplam} />
        <MiniKpi label="Bekliyor" value={kpis.bekliyor} color="text-orange-400" />
        <MiniKpi label="Devam Ediyor" value={kpis.devam} color="text-blue-400" />
        <MiniKpi label="Tamamlandı" value={kpis.tamamlandi} color="text-green" />
        <MiniKpi label="Gecikmiş" value={kpis.gecikmisSayi} color="text-red" />
      </div>

      {/* Arama + Filtre */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 relative">
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Görev ara..."
            className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {([['aktif', 'Aktif'], ['hepsi', 'Tümü'], ['tamamlandi', 'Tamamlanan']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFiltre(key as typeof filtre)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                filtre === key ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text hover:bg-surface2'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Gruplandırılmış Görevler */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>
      ) : (
        <div className="space-y-4 flex-1">
          {Array.from(gruplar.entries()).map(([grupAd, gorevler]) => {
            if (gorevler.length === 0) return null;
            return (
              <div key={grupAd}>
                <div className={`text-xs font-bold uppercase tracking-wider mb-2 pl-1 ${GRUP_RENK[grupAd] || 'text-text-muted'}`}>
                  {grupAd} ({gorevler.length})
                </div>
                <div className="space-y-1.5">
                  {gorevler.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => { setSeciliGorev(t); setModalAcik(true); }}
                      className={`flex items-start gap-3 bg-surface border border-border rounded-lg p-3.5 hover:border-gold transition-colors cursor-pointer ${
                        t.durum === 'Tamamlandı' ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleTamamla(t); }}
                        className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center cursor-pointer transition-colors ${
                          t.durum === 'Tamamlandı' ? 'bg-green border-green' : 'border-border hover:border-gold'
                        }`}
                      >
                        {t.durum === 'Tamamlandı' && <span className="text-[10px] text-bg">✓</span>}
                      </div>

                      {/* İçerik */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-sm font-medium ${t.durum === 'Tamamlandı' ? 'line-through text-text-dim' : 'text-text'}`}>
                            {t.baslik || '—'}
                          </span>
                          {t.oncelik && (
                            <span className="text-[10px]">{ONCELIK_RENK[t.oncelik]?.icon || ''}</span>
                          )}
                        </div>
                        {t.aciklama && (
                          <div className="text-[11px] text-text-muted truncate">{t.aciklama}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {t.durum && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${DURUM_RENK[t.durum] || ''}`}>
                              {t.durum}
                            </span>
                          )}
                          {t.muvId && muvAdMap[t.muvId] && (
                            <span className="text-[10px] text-text-dim">👤 {muvAdMap[t.muvId]}</span>
                          )}
                          {t.dosyaTur && (
                            <span className="text-[10px] text-text-dim">📂 {t.dosyaTur}</span>
                          )}
                        </div>
                      </div>

                      {/* Son Tarih */}
                      <div className="text-right flex-shrink-0">
                        {t.sonTarih ? (
                          <div className={`text-[11px] font-medium ${
                            (() => {
                              const bugunStr = new Date().toISOString().split('T')[0];
                              if (t.durum === 'Tamamlandı' || t.durum === 'İptal') return 'text-text-dim';
                              if (t.sonTarih! < bugunStr) return 'text-red';
                              if (t.sonTarih === bugunStr) return 'text-orange-400';
                              return 'text-text-muted';
                            })()
                          }`}>
                            {fmtTarih(t.sonTarih)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-text-dim">Tarih yok</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GorevModal open={modalAcik} onClose={() => setModalAcik(false)} gorev={seciliGorev} />
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
