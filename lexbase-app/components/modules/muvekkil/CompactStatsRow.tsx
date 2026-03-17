'use client';

import { fmt } from '@/lib/utils';

interface Props {
  dosyaSayisi: number;
  aktifDosya: number;
  davaSayisi: number;
  icraSayisi: number;
  arabSayisi: number;
  ihtSayisi: number;
  finansOzet: Record<string, unknown> | null | undefined;
}

export function CompactStatsRow({
  dosyaSayisi,
  aktifDosya,
  davaSayisi,
  icraSayisi,
  arabSayisi,
  ihtSayisi,
  finansOzet,
}: Props) {
  const masraflar = finansOzet?.masraflar as Record<string, number> | undefined;
  const avanslar = finansOzet?.avanslar as Record<string, number> | undefined;
  const bakiye = finansOzet?.bakiye as Record<string, number> | undefined;
  const vekalet = finansOzet?.vekaletUcreti as Record<string, Record<string, number>> | undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
      {/* Sol: Dosya Özeti */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Dosya Özeti</h3>
          <div className="flex items-center gap-2">
            <span className="font-[var(--font-playfair)] text-lg font-bold text-text">{dosyaSayisi}</span>
            <span className="text-[10px] text-text-dim">toplam</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MiniStat label="Aktif" value={aktifDosya} color="text-green" />
          <Sep />
          <MiniStat label="Dava" value={davaSayisi} color="text-blue-400" />
          <MiniStat label="İcra" value={icraSayisi} color="text-orange-400" />
          <MiniStat label="Arb." value={arabSayisi} color="text-emerald-400" />
          <MiniStat label="İht." value={ihtSayisi} color="text-purple-400" />
        </div>
      </div>

      {/* Sag: Finansal Özet */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Finansal Özet</h3>
          <div className="flex items-center gap-2">
            <span className={`font-[var(--font-playfair)] text-lg font-bold ${(bakiye?.genelBakiye ?? 0) >= 0 ? 'text-green' : 'text-red'}`}>
              {fmt(bakiye?.genelBakiye ?? 0)}
            </span>
            <span className="text-[10px] text-text-dim">bakiye</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MiniStat label="Masraf" value={fmt(masraflar?.toplam ?? 0)} color="text-text" />
          <MiniStat label="Avans" value={fmt(avanslar?.alinan ?? 0)} color="text-green" />
          <Sep />
          <MiniStat label="Alacak" value={fmt(vekalet?.akdi?.kalan ?? 0)} color="text-gold" />
          <MiniStat label="Tahsil" value={fmt(vekalet?.akdi?.tahsilEdilen ?? 0)} color="text-green" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center min-w-0">
      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[9px] text-text-dim uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

function Sep() {
  return <div className="w-px h-6 bg-border shrink-0" />;
}
