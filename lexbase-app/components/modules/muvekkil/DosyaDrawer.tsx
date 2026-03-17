'use client';

import Link from 'next/link';
import { fmt } from '@/lib/utils';

interface DosyaInfo {
  id: string;
  tur: 'dava' | 'icra' | 'arabuluculuk' | 'ihtarname';
  no: string;
  konu: string;
  durum: string;
  alt: string; // mahkeme/daire/arabulucu/noter
  tarih: string;
  raw: Record<string, unknown>;
}

interface Props {
  dosya: DosyaInfo | null;
  onClose: () => void;
  durumRenk: Record<string, string>;
}

const TUR_ICON: Record<string, string> = {
  dava: '⚖️',
  icra: '📋',
  arabuluculuk: '🤝',
  ihtarname: '📨',
};

const TUR_LABEL: Record<string, string> = {
  dava: 'Dava',
  icra: 'İcra Dosyası',
  arabuluculuk: 'Arabuluculuk',
  ihtarname: 'İhtarname',
};

const LINK_PREFIX: Record<string, string> = {
  dava: '/davalar',
  icra: '/icra',
  arabuluculuk: '/arabuluculuk',
  ihtarname: '/ihtarname',
};

export function DosyaDrawer({ dosya, onClose, durumRenk }: Props) {
  if (!dosya) return null;

  const renkClass = durumRenk[dosya.durum] || 'text-text-muted bg-surface2 border-border';
  const raw = dosya.raw;
  const anlasma = raw.anlasma as Record<string, unknown> | undefined;
  const tahsilatlar = (raw.tahsilatlar || []) as Array<Record<string, string>>;
  const harcamalar = (raw.harcamalar || []) as Array<Record<string, string>>;
  const ucret = raw.ucret as number | string | undefined;

  // Sonraki durusma
  const sonrakiDurusma = (() => {
    const durusmalar = (raw.durusmalar || []) as Array<Record<string, unknown>>;
    const bugun = new Date().toISOString().slice(0, 10);
    const gelecek = durusmalar
      .filter((d) => (d.tarih as string) >= bugun)
      .sort((a, b) => (a.tarih as string).localeCompare(b.tarih as string));
    return gelecek[0] || null;
  })();

  // Mali bilgiler
  let anlasmaToplam = 0;
  if (anlasma) {
    anlasmaToplam = parseFloat(String(anlasma.toplam || anlasma.ucret || 0)) || 0;
  } else if (ucret) {
    anlasmaToplam = parseFloat(String(ucret)) || 0;
  }
  const tahsilEdilen = tahsilatlar.reduce((s, t) => s + (parseFloat(t.tutar) || 0), 0)
    + (parseFloat(String(raw.tahsilEdildi || 0)) || 0);
  const toplamHarcama = harcamalar.reduce((s, h) => s + (parseFloat(h.tutar) || 0), 0);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-[420px] max-w-[90vw] bg-bg border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-lg">{TUR_ICON[dosya.tur]}</span>
            <span className="text-xs font-bold text-text-dim uppercase tracking-wider">{TUR_LABEL[dosya.tur]}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-dim hover:text-text hover:bg-surface2 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Dosya No + Durum */}
          <div>
            <div className="text-gold font-[var(--font-playfair)] text-lg font-bold mb-1">
              {dosya.no || '—'}
            </div>
            <div className="text-sm text-text font-medium mb-2">{dosya.konu || '—'}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded border ${renkClass}`}>
                {dosya.durum || 'Belirsiz'}
              </span>
              {dosya.tarih && (
                <span className="text-[10px] text-text-dim bg-surface2 px-2 py-1 rounded">
                  {dosya.tarih}
                </span>
              )}
            </div>
          </div>

          {/* Alt Bilgi (Mahkeme/Daire/vs) */}
          {dosya.alt && (
            <div className="bg-surface border border-border rounded-lg p-3">
              <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">
                {dosya.tur === 'dava' ? 'Mahkeme' : dosya.tur === 'icra' ? 'İcra Dairesi' : dosya.tur === 'arabuluculuk' ? 'Arabulucu' : 'Noter'}
              </div>
              <div className="text-xs text-text font-medium">{dosya.alt}</div>
            </div>
          )}

          {/* Sonraki Durusma */}
          {sonrakiDurusma && (
            <div className="bg-gold-dim border border-gold/20 rounded-lg p-3">
              <div className="text-[10px] text-gold uppercase tracking-wider font-bold mb-1">Sonraki Duruşma</div>
              <div className="text-xs text-text font-medium">
                {sonrakiDurusma.tarih as string}{sonrakiDurusma.saat ? ` • ${sonrakiDurusma.saat as string}` : ''}
              </div>
              {typeof sonrakiDurusma.aciklama === 'string' && sonrakiDurusma.aciklama && (
                <div className="text-[11px] text-text-muted mt-1">{sonrakiDurusma.aciklama}</div>
              )}
            </div>
          )}

          {/* Finansal Özet */}
          {(anlasmaToplam > 0 || tahsilEdilen > 0 || toplamHarcama > 0) && (
            <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
              <div className="text-[10px] text-text-dim uppercase tracking-wider font-bold mb-2">Mali Durum</div>
              {anlasmaToplam > 0 && (
                <Row label="Anlaşılan Ücret" value={fmt(anlasmaToplam)} color="text-text" />
              )}
              {tahsilEdilen > 0 && (
                <Row label="Tahsil Edilen" value={fmt(tahsilEdilen)} color="text-green" />
              )}
              {anlasmaToplam > 0 && (
                <>
                  <Row label="Kalan Alacak" value={fmt(anlasmaToplam - tahsilEdilen)} color="text-gold" bold />
                  {/* Progress bar */}
                  <div className="w-full bg-surface2 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-green rounded-full h-1.5 transition-all"
                      style={{ width: `${Math.min(Math.round((tahsilEdilen / anlasmaToplam) * 100), 100)}%` }}
                    />
                  </div>
                </>
              )}
              {toplamHarcama > 0 && (
                <Row label="Masraflar" value={fmt(toplamHarcama)} color="text-text-muted" />
              )}
            </div>
          )}

          {/* Son Tahsilatlar */}
          {tahsilatlar.length > 0 && (
            <div>
              <div className="text-[10px] text-text-dim uppercase tracking-wider font-bold mb-2">Son Tahsilatlar</div>
              <div className="space-y-1.5">
                {tahsilatlar.slice(-3).reverse().map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-surface border border-border rounded-lg px-3 py-2">
                    <span className="text-text-muted">{t.tarih || '—'}</span>
                    <span className="text-green font-semibold">{fmt(parseFloat(t.tutar) || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer — Dosyaya Git */}
        <div className="p-4 border-t border-border">
          <Link
            href={`${LINK_PREFIX[dosya.tur]}/${dosya.id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold bg-gold text-bg rounded-lg hover:bg-gold-light transition-colors"
          >
            Dosyaya Git
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8h10M9 4l4 4-4 4"/>
            </svg>
          </Link>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-[11px] ${bold ? 'text-text font-medium' : 'text-text-muted'}`}>{label}</span>
      <span className={`text-xs ${bold ? 'font-bold' : 'font-semibold'} ${color}`}>{value}</span>
    </div>
  );
}
