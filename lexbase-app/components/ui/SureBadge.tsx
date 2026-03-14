'use client';

import { sureBadgeRengi } from '@/lib/utils/uyapHelpers';

/* ══════════════════════════════════════════════════════════════
   Süre Badge — Yasal süre geri sayım göstergesi
   ══════════════════════════════════════════════════════════════ */

interface SureBadgeProps {
  kalanGun: number;
  label?: string;
  compact?: boolean;
}

export function SureBadge({ kalanGun, label, compact }: SureBadgeProps) {
  const renk = sureBadgeRengi(kalanGun);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${renk}`}>
        {kalanGun < 0 ? 'Bitti' : `${kalanGun}g`}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg border ${renk}`}>
      {kalanGun < 0 ? (
        <>⏰ Süre doldu ({Math.abs(kalanGun)} gün önce)</>
      ) : kalanGun === 0 ? (
        <>🔴 Bugün son gün!</>
      ) : (
        <>⏳ {kalanGun} gün kaldı</>
      )}
      {label && <span className="text-[10px] opacity-75">({label})</span>}
    </span>
  );
}

/**
 * Duruşma tarihi badge — liste satırlarında kullanılır
 */
interface DurusmaBadgeProps {
  tarih?: string;
  saat?: string;
}

export function DurusmaBadge({ tarih, saat }: DurusmaBadgeProps) {
  if (!tarih) return <span className="text-text-dim">—</span>;

  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const hedef = new Date(tarih);
  hedef.setHours(0, 0, 0, 0);
  const kalanGun = Math.ceil((hedef.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24));

  const tarihStr = hedef.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const renk = sureBadgeRengi(kalanGun);

  // Geçmiş duruşmalar
  if (kalanGun < 0) {
    return <span className="text-[11px] text-text-dim">{tarihStr}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${renk}`}>
      {tarihStr}
      {saat && <span className="opacity-75">{saat}</span>}
      {kalanGun <= 7 && <span className="ml-0.5">({kalanGun}g)</span>}
    </span>
  );
}
