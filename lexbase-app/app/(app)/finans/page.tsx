'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const BakiyelerTab = dynamic(
  () => import('@/components/modules/finans/BakiyelerTab').then((m) => m.BakiyelerTab),
  { ssr: false },
);
const GelirlerTab = dynamic(
  () => import('@/components/modules/finans/GelirlerTab').then((m) => m.GelirlerTab),
  { ssr: false },
);
const BuroGiderleriTab = dynamic(
  () => import('@/components/modules/finans/BuroGiderleriTab').then((m) => m.BuroGiderleriTab),
  { ssr: false },
);
const KarZararTab = dynamic(
  () => import('@/components/modules/finans/KarZararTab').then((m) => m.KarZararTab),
  { ssr: false },
);
const KarlilikTab = dynamic(
  () => import('@/components/modules/finans/KarlilikTab').then((m) => m.KarlilikTab),
  { ssr: false },
);
const BeklenenGelirTab = dynamic(
  () => import('@/components/modules/finans/BeklenenGelirTab').then((m) => m.BeklenenGelirTab),
  { ssr: false },
);
const UyarilarTab = dynamic(
  () => import('@/components/modules/finans/UyarilarTab').then((m) => m.UyarilarTab),
  { ssr: false },
);
const VergiOzetTab = dynamic(
  () => import('@/components/modules/finans/VergiOzetTab').then((m) => m.VergiOzetTab),
  { ssr: false },
);
const AvansKasaTab = dynamic(
  () => import('@/components/modules/finans/AvansKasaTab').then((m) => m.AvansKasaTab),
  { ssr: false },
);

const TABS = [
  { key: 'bakiye', label: 'Bakiyeler', icon: '💳' },
  { key: 'gelir', label: 'Gelirler', icon: '💰' },
  { key: 'gider', label: 'Büro Giderleri', icon: '📊' },
  { key: 'karzarar', label: 'Kâr / Zarar', icon: '📈' },
  { key: 'vergi', label: 'Vergi Özeti', icon: '🧾' },
  { key: 'karlilik', label: 'Kârlılık', icon: '🎯' },
  { key: 'beklenen', label: 'Beklenen Gelir', icon: '📅' },
  { key: 'avans', label: 'Avans Kasası', icon: '🏦' },
  { key: 'uyari', label: 'Uyarılar', icon: '⚠️' },
];

export default function FinansPage() {
  useEffect(() => { document.title = 'Finans | LexBase'; }, []);

  const [aktifTab, setAktifTab] = useState('bakiye');
  const [kzYil, setKzYil] = useState(new Date().getFullYear());
  const [kzAy, setKzAy] = useState(0);

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold mb-6">
        Finans
      </h1>

      {/* Tab Navigasyonu */}
      <div className="flex border-b border-border mb-5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setAktifTab(tab.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              aktifTab === tab.key
                ? 'border-gold text-gold'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab İçerikleri */}
      {aktifTab === 'bakiye' && <BakiyelerTab />}
      {aktifTab === 'gelir' && <GelirlerTab />}
      {aktifTab === 'gider' && <BuroGiderleriTab />}
      {aktifTab === 'karzarar' && <KarZararTab yil={kzYil} setYil={setKzYil} ay={kzAy} setAy={setKzAy} />}
      {aktifTab === 'vergi' && <VergiOzetTab />}
      {aktifTab === 'karlilik' && <KarlilikTab />}
      {aktifTab === 'beklenen' && <BeklenenGelirTab />}
      {aktifTab === 'avans' && <AvansKasaTab />}
      {aktifTab === 'uyari' && <UyarilarTab />}
    </div>
  );
}
