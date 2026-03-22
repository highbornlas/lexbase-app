'use client';

import { useState } from 'react';
import { MuvMasrafAvans } from './MuvMasrafAvans';
import { MuvAvansKasasi } from './MuvAvansKasasi';
import { MuvAlacak } from './MuvAlacak';
import { MuvRapor } from './MuvRapor';
import type { Muvekkil } from '@/lib/hooks/useMuvekkillar';

type FinansAltSekme = 'masraf' | 'kasa' | 'alacak' | 'rapor';

interface Props {
  muv: Muvekkil;
  davalar: Record<string, unknown>[];
  icralar: Record<string, unknown>[];
  arabuluculuklar: Record<string, unknown>[];
  ihtarnameler: Record<string, unknown>[];
  finansOzet: Record<string, unknown> | null | undefined;
  onMasrafKaydet: (dosyaId: string, dosyaTur: string, harcama: { id: string; kat: string; acik: string; tarih: string; tutar: number }) => void;
  onTahsilatKaydet: (dosyaId: string, dosyaTur: string, tahsilat: { id: string; tarih: string; tutar: number; aciklama: string }) => void;
}

const ALT_SEKMELER: { key: FinansAltSekme; label: string; icon: string }[] = [
  { key: 'kasa', label: 'Avans Kasası', icon: '🏦' },
  { key: 'masraf', label: 'Masraflar', icon: '💸' },
  { key: 'alacak', label: 'Alacak', icon: '💰' },
  { key: 'rapor', label: 'Rapor', icon: '📊' },
];

export function FinansTab({ muv, davalar, icralar, arabuluculuklar, ihtarnameler, finansOzet, onMasrafKaydet, onTahsilatKaydet }: Props) {
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
        <MuvAvansKasasi
          muvId={muv.id}
          davalar={davalar}
          icralar={icralar}
          arabuluculuklar={arabuluculuklar}
          ihtarnameler={ihtarnameler}
        />
      )}
      {altSekme === 'masraf' && (
        <MuvMasrafAvans
          muvId={muv.id}
          davalar={davalar}
          icralar={icralar}
          arabuluculuklar={arabuluculuklar}
          ihtarnameler={ihtarnameler}
          finansOzet={finansOzet}
          onMasrafKaydet={onMasrafKaydet}
        />
      )}
      {altSekme === 'alacak' && (
        <MuvAlacak
          davalar={davalar}
          icralar={icralar}
          arabuluculuklar={arabuluculuklar}
          ihtarnameler={ihtarnameler}
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
