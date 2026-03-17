'use client';

import { useState } from 'react';
import { MuvBelgeler } from './MuvBelgeler';
import { MuvNotlar } from './MuvNotlar';
import { MuvIletisimGecmisi } from './MuvIletisimGecmisi';
import { MuvPlanlama } from './MuvPlanlama';
import { MuvKimlik } from './MuvKimlik';
import { MuvIliskiler } from './MuvIliskiler';
import { MuvDanismanlik } from './MuvDanismanlik';
import type { Muvekkil } from '@/lib/hooks/useMuvekkillar';

type AltSekme = 'belgeler' | 'notlar' | 'iletisim' | 'planlama' | 'kimlik' | 'iliskiler' | 'danismanlik';

interface Props {
  muv: Muvekkil;
  muvId: string;
  onNotKaydet: (guncellenen: Muvekkil) => void;
}

const ALT_SEKMELER: { key: AltSekme; label: string }[] = [
  { key: 'belgeler', label: '📎 Belgeler' },
  { key: 'notlar', label: '📝 Notlar' },
  { key: 'iletisim', label: '📞 İletişim' },
  { key: 'planlama', label: '📋 Görevler' },
  { key: 'danismanlik', label: '💼 Danışmanlık' },
  { key: 'kimlik', label: '🪪 Kimlik' },
  { key: 'iliskiler', label: '🔗 İlişkiler' },
];

export function EvrakNotlarTab({ muv, muvId, onNotKaydet }: Props) {
  const [altSekme, setAltSekme] = useState<AltSekme>('belgeler');

  return (
    <div className="space-y-4">
      {/* Alt Sekme Navigasyonu — scrollable pills */}
      <div className="flex gap-1 overflow-x-auto bg-surface border border-border rounded-lg p-1">
        {ALT_SEKMELER.map((s) => (
          <button
            key={s.key}
            onClick={() => setAltSekme(s.key)}
            className={`px-3 py-2 text-xs font-semibold rounded-md whitespace-nowrap transition-all ${
              altSekme === s.key
                ? 'bg-gold text-bg shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface2'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Alt Sekme İçeriği */}
      {altSekme === 'belgeler' && <MuvBelgeler muvId={muvId} />}
      {altSekme === 'notlar' && <MuvNotlar muv={muv} onKaydet={onNotKaydet} />}
      {altSekme === 'iletisim' && <MuvIletisimGecmisi muvId={muvId} />}
      {altSekme === 'planlama' && <MuvPlanlama muvId={muvId} />}
      {altSekme === 'danismanlik' && <MuvDanismanlik muvId={muvId} />}
      {altSekme === 'kimlik' && <MuvKimlik muv={muv} />}
      {altSekme === 'iliskiler' && <MuvIliskiler muv={muv} />}
    </div>
  );
}
