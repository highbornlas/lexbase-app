'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useMuvekkillar, type Muvekkil } from '@/lib/hooks/useMuvekkillar';
import { MuvekkilModal } from '@/components/modules/MuvekkilModal';

type TabKey = 'muvekkillar' | 'karsitaraflar' | 'avukatlar';

export default function RehberPage() {
  const { data: muvekkillar, isLoading } = useMuvekkillar();
  const [aktifTab, setAktifTab] = useState<TabKey>('muvekkillar');
  const [arama, setArama] = useState('');
  const [filtre, setFiltre] = useState<'hepsi' | 'gercek' | 'tuzel'>('hepsi');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMuvekkil, setEditMuvekkil] = useState<Muvekkil | null>(null);

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'muvekkillar', icon: '👤', label: 'Müvekkiller' },
    { key: 'karsitaraflar', icon: '⚖️', label: 'Karşı Taraflar' },
    { key: 'avukatlar', icon: '👔', label: 'Avukatlar' },
  ];

  // Sadece müvekkiller tabı için filtreleme (karşı taraf ve avukat verileri gelecek)
  const filtrelenmis = useMemo(() => {
    if (!muvekkillar || aktifTab !== 'muvekkillar') return [];
    return muvekkillar.filter((m) => {
      if (filtre === 'gercek' && m.tip === 'tuzel') return false;
      if (filtre === 'tuzel' && m.tip !== 'tuzel') return false;
      if (arama) {
        const q = arama.toLowerCase();
        return (
          (m.ad || '').toLowerCase().includes(q) ||
          (m.tc || '').includes(q) ||
          (m.tel || '').includes(q) ||
          (m.mail || '').toLowerCase().includes(q) ||
          (m.vergiNo || '').includes(q)
        );
      }
      return true;
    });
  }, [muvekkillar, arama, filtre, aktifTab]);

  return (
    <div>
      {/* Başlık */}
      <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold mb-1">Rehber</h1>
      <p className="text-sm text-text-muted mb-5">Müvekkiller, karşı taraflar ve avukatlar</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setAktifTab(tab.key); setArama(''); }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              aktifTab === tab.key
                ? 'border-gold text-gold'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── MÜVEKKİLLER TAB ─── */}
      {aktifTab === 'muvekkillar' && (
        <div>
          {/* Section Header */}
          <div className="bg-surface border border-border rounded-lg">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="text-sm font-semibold text-text">Müvekkil Listesi</div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={arama}
                  onChange={(e) => setArama(e.target.value)}
                  placeholder="🔍 Ara..."
                  className="px-3 py-2 bg-surface2 border border-border rounded-lg text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors w-48"
                />
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(['hepsi', 'gercek', 'tuzel'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFiltre(f)}
                      className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                        filtre === f ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text hover:bg-surface2'
                      }`}
                    >
                      {f === 'hepsi' ? 'Tümü' : f === 'gercek' ? 'Gerçek' : 'Tüzel'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setEditMuvekkil(null); setModalOpen(true); }}
                  className="px-3 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
                >
                  + Yeni Müvekkil
                </button>
              </div>
            </div>

            {/* Liste */}
            <div className="p-4">
              {isLoading ? (
                <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>
              ) : filtrelenmis.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">👤</div>
                  <p className="text-sm text-text-muted">
                    {arama ? 'Arama sonucu bulunamadı' : 'Henüz müvekkil yok'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtrelenmis.map((m) => (
                    <Link
                      key={m.id}
                      href={`/muvekkillar/${m.id}`}
                      className="flex items-center gap-4 bg-surface2 border border-border/50 rounded-lg p-4 hover:border-gold hover:bg-gold-dim transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-gold-dim border border-gold flex items-center justify-center text-gold text-sm font-bold flex-shrink-0">
                        {m.ad?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text group-hover:text-gold transition-colors truncate">
                            {m.ad}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            m.tip === 'tuzel' ? 'text-blue-400 bg-blue-400/10' : 'text-green bg-green-dim'
                          }`}>
                            {m.tip === 'tuzel' ? 'TÜZEL' : 'GERÇEK'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-text-muted mt-0.5">
                          {m.tc && <span>TC: {m.tc}</span>}
                          {m.vergiNo && <span>VKN: {m.vergiNo}</span>}
                          {m.tel && <span>📞 {m.tel}</span>}
                          {m.mail && <span>✉️ {m.mail}</span>}
                        </div>
                      </div>
                      <span className="text-text-dim group-hover:text-gold transition-colors text-lg">›</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── KARŞI TARAFLAR TAB ─── */}
      {aktifTab === 'karsitaraflar' && (
        <div className="bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="text-sm font-semibold text-text">Karşı Taraf Listesi</div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="🔍 Ara..."
                className="px-3 py-2 bg-surface2 border border-border rounded-lg text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors w-48"
              />
              <button className="px-3 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
                + Yeni Karşı Taraf
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="text-center py-16">
              <div className="text-4xl mb-3">⚖️</div>
              <p className="text-sm text-text-muted">Henüz kayıt yok</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── AVUKATLAR TAB ─── */}
      {aktifTab === 'avukatlar' && (
        <div className="bg-surface border border-border rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="text-sm font-semibold text-text">Avukat / Vekil Listesi</div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="🔍 Ara..."
                className="px-3 py-2 bg-surface2 border border-border rounded-lg text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors w-48"
              />
              <button className="px-3 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
                + Yeni Avukat
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="text-center py-16">
              <div className="text-4xl mb-3">👔</div>
              <p className="text-sm text-text-muted">Henüz kayıt yok</p>
            </div>
          </div>
        </div>
      )}

      {/* Müvekkil Modal */}
      <MuvekkilModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        muvekkil={editMuvekkil}
      />
    </div>
  );
}
