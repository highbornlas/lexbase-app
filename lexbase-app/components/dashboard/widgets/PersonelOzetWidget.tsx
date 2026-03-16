'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { EmptyState } from '../WidgetWrapper';

/* ══════════════════════════════════════════════════════════════
   Personel Özeti Widget — Aktif personel, roller, durum
   ══════════════════════════════════════════════════════════════ */

interface PersonelOzetWidgetProps {
  personeller: Array<Record<string, unknown>>;
}

const ROL_IKON: Record<string, string> = {
  sahip: '👔',
  yonetici: '🏢',
  avukat: '⚖️',
  stajyer: '📚',
  sekreter: '📝',
};

const ROL_LABEL: Record<string, string> = {
  sahip: 'Sahip',
  yonetici: 'Yönetici',
  avukat: 'Avukat',
  stajyer: 'Stajyer',
  sekreter: 'Sekreter',
};

const DURUM_RENK: Record<string, string> = {
  aktif: 'bg-green/20 text-green',
  pasif: 'bg-red/20 text-red',
  davet_gonderildi: 'bg-gold/20 text-gold',
};

const DURUM_LABEL: Record<string, string> = {
  aktif: 'Aktif',
  pasif: 'Pasif',
  davet_gonderildi: 'Davet',
};

export function PersonelOzetWidget({ personeller }: PersonelOzetWidgetProps) {
  const ozet = useMemo(() => {
    const tumPersonel = personeller || [];
    const aktif = tumPersonel.filter((p) => p.durum !== 'pasif');
    const pasif = tumPersonel.filter((p) => p.durum === 'pasif');

    // Rol dağılımı
    const rolDagilim: Record<string, number> = {};
    aktif.forEach((p) => {
      const rol = (p.rol as string) || 'avukat';
      rolDagilim[rol] = (rolDagilim[rol] || 0) + 1;
    });

    return {
      toplam: tumPersonel.length,
      aktifSayi: aktif.length,
      pasifSayi: pasif.length,
      rolDagilim,
      personelListesi: tumPersonel.slice(0, 5),
    };
  }, [personeller]);

  if (ozet.toplam === 0) {
    return <EmptyState icon="👥" text="Henüz personel eklenmemiş" action="Personel Ekle ›" actionHref="/personel?yeni=1" />;
  }

  return (
    <div className="space-y-2.5 mt-1">
      {/* Rol dağılımı */}
      <div className="flex flex-wrap gap-1.5 px-1">
        {Object.entries(ozet.rolDagilim).map(([rol, sayi]) => (
          <div key={rol} className="flex items-center gap-1 px-2 py-1 bg-surface2/60 rounded-md">
            <span className="text-xs">{ROL_IKON[rol] || '👤'}</span>
            <span className="text-[10px] text-text-muted font-medium">{sayi} {ROL_LABEL[rol] || rol}</span>
          </div>
        ))}
      </div>

      {/* Personel listesi */}
      <div className="space-y-0.5">
        {ozet.personelListesi.map((p) => {
          const durum = (p.durum as string) || 'aktif';
          return (
            <Link
              key={p.id as string}
              href={`/personel/${p.id}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface2/50 transition-colors"
            >
              <span className="text-sm flex-shrink-0">{ROL_IKON[(p.rol as string) || ''] || '👤'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-text truncate">{(p.ad as string) || 'İsimsiz'}</div>
                <div className="text-[9px] text-text-dim truncate">
                  {ROL_LABEL[(p.rol as string) || ''] || 'Personel'}
                  {p.email ? ` · ${p.email}` : ''}
                </div>
              </div>
              <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${DURUM_RENK[durum] || 'bg-surface2 text-text-dim'}`}>
                {DURUM_LABEL[durum] || durum}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Footer: toplam */}
      {ozet.toplam > 5 && (
        <div className="text-center">
          <Link href="/personel" className="text-[10px] text-gold hover:underline">
            +{ozet.toplam - 5} kişi daha ›
          </Link>
        </div>
      )}
    </div>
  );
}
