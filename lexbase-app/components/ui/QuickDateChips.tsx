'use client';

interface QuickDateChipsProps {
  value: string; // active chip key
  onChange: (key: string, baslangic: string, bitis: string) => void;
  chips?: { key: string; label: string }[];
}

const DEFAULT_CHIPS = [
  { key: 'bugun', label: 'Bugün' },
  { key: 'bu_hafta', label: 'Bu Hafta' },
  { key: 'bu_ay', label: 'Bu Ay' },
  { key: 'son_3_ay', label: 'Son 3 Ay' },
  { key: 'bu_yil', label: 'Bu Yıl' },
  { key: 'tumzaman', label: 'Tümü' },
];

function hesaplaTarih(key: string): { baslangic: string; bitis: string } {
  const bugun = new Date();
  const bitis = bugun.toISOString().split('T')[0];

  switch (key) {
    case 'bugun':
      return { baslangic: bitis, bitis };
    case 'bu_hafta': {
      const gun = bugun.getDay();
      const pazartesi = new Date(bugun);
      pazartesi.setDate(bugun.getDate() - (gun === 0 ? 6 : gun - 1));
      return { baslangic: pazartesi.toISOString().split('T')[0], bitis };
    }
    case 'bu_ay': {
      const ay = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
      return { baslangic: ay.toISOString().split('T')[0], bitis };
    }
    case 'son_3_ay': {
      const uc = new Date(bugun);
      uc.setMonth(uc.getMonth() - 3);
      return { baslangic: uc.toISOString().split('T')[0], bitis };
    }
    case 'bu_yil': {
      return { baslangic: `${bugun.getFullYear()}-01-01`, bitis };
    }
    case 'tumzaman':
      return { baslangic: '', bitis: '' };
    default:
      return { baslangic: '', bitis: '' };
  }
}

export function QuickDateChips({ value, onChange, chips = DEFAULT_CHIPS }: QuickDateChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => {
            const { baslangic, bitis } = hesaplaTarih(c.key);
            onChange(c.key, baslangic, bitis);
          }}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
            value === c.key
              ? 'bg-gold text-bg border-gold'
              : 'bg-surface border-border text-text-muted hover:text-text hover:border-gold/40'
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
