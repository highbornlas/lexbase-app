'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Muvekkil } from '@/lib/hooks/useMuvekkillar';

type FinansAltSekme = 'kasa' | 'alacak' | 'rapor';
function Loading() { return <p role="status" className="p-5 text-xs text-text-muted">Finans bölümü yükleniyor...</p>; }
const MuvMasrafAvansKasa = dynamic(() => import('./MuvMasrafAvansKasa').then(m => m.MuvMasrafAvansKasa), { loading: Loading });
const MuvAlacak = dynamic(() => import('./MuvAlacak').then(m => m.MuvAlacak), { loading: Loading });
const MuvRapor = dynamic(() => import('./MuvRapor').then(m => m.MuvRapor), { loading: Loading });

interface Props {
  muv: Muvekkil;
  davalar: Record<string, unknown>[];
  icralar: Record<string, unknown>[];
  arabuluculuklar: Record<string, unknown>[];
  ihtarnameler: Record<string, unknown>[];
  danismanliklar: Record<string, unknown>[];
  finansOzet: Record<string, unknown> | null | undefined;
  onTahsilatKaydet: (dosyaId: string, dosyaTur: string, tahsilat: { id: string; tarih: string; tutar: number; aciklama: string }) => Promise<void>;
}

const ALT_SEKMELER: { key: FinansAltSekme; label: string; icon: string }[] = [
  { key: 'kasa', label: 'Masraf & Avans Kasası', icon: '🏦' },
  { key: 'alacak', label: 'Alacak', icon: '💰' },
  { key: 'rapor', label: 'Rapor', icon: '📊' },
];

export function FinansTab({ muv, davalar, icralar, arabuluculuklar, ihtarnameler, danismanliklar, finansOzet, onTahsilatKaydet }: Props) {
  const [altSekme, setAltSekme] = useState<FinansAltSekme>('kasa');

  return (
    <div className="space-y-4">
      {/* Alt Sekme Navigasyonu — pill style */}
      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
        {ALT_SEKMELER.map((s) => (
          <button
            key={s.key}
            onClick={() => setAltSekme(s.key)}
            className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-all ${
              altSekme === s.key
                ? 'bg-gold text-bg shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface2'
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Alt Sekme İçeriği */}
      {altSekme === 'kasa' && (
        <MuvMasrafAvansKasa
          muvId={muv.id}
          muvAd={muv.ad || muv.unvan || undefined}
          davalar={davalar}
          icralar={icralar}
          arabuluculuklar={arabuluculuklar}
          ihtarnameler={ihtarnameler}
        />
      )}
      {altSekme === 'alacak' && (
        <MuvAlacak
          davalar={davalar}
          icralar={icralar}
          arabuluculuklar={arabuluculuklar}
          ihtarnameler={ihtarnameler}
          danismanliklar={danismanliklar}
          finansOzet={finansOzet}
          onTahsilatKaydet={onTahsilatKaydet}
        />
      )}
      {altSekme === 'rapor' && (
        <MuvRapor muv={muv} finansOzet={finansOzet} />
      )}
    </div>
  );
}
