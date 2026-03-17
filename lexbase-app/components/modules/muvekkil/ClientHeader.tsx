'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Muvekkil } from '@/lib/hooks/useMuvekkillar';

interface Props {
  muv: Muvekkil;
  isSabitlenen: boolean;
  onToggleSabitle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ClientHeader({ muv, isSabitlenen, onToggleSabitle, onEdit, onDelete }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const tipLabel = muv.tip === 'tuzel' ? 'TÜZEL KİŞİ' : 'GERÇEK KİŞİ';
  const tipColor = muv.tip === 'tuzel'
    ? 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    : 'text-green bg-green-dim border-green/20';

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div className="sticky top-0 z-30 bg-bg/95 backdrop-blur-sm border-b border-border pb-4 -mx-6 px-6 pt-2">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-text-dim mb-3">
        <Link href="/muvekkillar" className="hover:text-gold transition-colors">Müvekkiller</Link>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-text-dim/50"><path d="M3 1.5L5.5 4 3 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span className="text-text-muted">{muv.ad}</span>
      </div>

      {/* Kimlik Kartı */}
      <div className="flex items-start justify-between gap-4">
        {/* Sol: Avatar + Kimlik */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-gold">
              {(muv.ad || '?')[0].toLocaleUpperCase('tr')}
            </span>
          </div>

          <div>
            {/* İsim + Kayıt No + Tip */}
            <div className="flex items-center gap-2.5 mb-1.5">
              {muv.kayitNo && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
                  M-{String(muv.kayitNo).padStart(3, '0')}
                </span>
              )}
              <h1 className="font-[var(--font-playfair)] text-xl text-text font-bold leading-tight">
                {[muv.ad, muv.soyad].filter(Boolean).join(' ')}
              </h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${tipColor}`}>
                {tipLabel}
              </span>
            </div>

            {/* İletişim Satırı — Tıklanabilir Chip'ler */}
            <div className="flex items-center gap-2 flex-wrap">
              {muv.tc && (
                <InfoChip
                  icon={<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M5 7h2M5 9.5h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/><circle cx="12" cy="8" r="1.5" stroke="currentColor" strokeWidth="1"/></svg>}
                  label="TC"
                  value={muv.tc}
                  copied={copiedField === 'tc'}
                  onCopy={() => copy(muv.tc!, 'tc')}
                />
              )}
              {muv.vergiNo && (
                <InfoChip
                  icon={<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M5 6h6M5 8.5h4M5 11h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>}
                  label="VKN"
                  value={muv.vergiNo}
                  copied={copiedField === 'vkn'}
                  onCopy={() => copy(muv.vergiNo!, 'vkn')}
                />
              )}
              {muv.tel && (
                <InfoChip
                  icon={<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3.5 1.5h3L8 5 6.5 6c.7 1.4 1.6 2.3 3 3L11 7.5l3.5 1.5v3a1.5 1.5 0 01-1.5 1.5C7 13 3 9 2 4.5A1.5 1.5 0 013.5 3V1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  label=""
                  value={muv.tel}
                  copied={copiedField === 'tel'}
                  onCopy={() => copy(muv.tel!, 'tel')}
                  href={`tel:${muv.tel}`}
                  actionColor="text-green"
                />
              )}
              {muv.mail && (
                <InfoChip
                  icon={<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M1 5l7 4 7-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  label=""
                  value={muv.mail}
                  copied={copiedField === 'mail'}
                  onCopy={() => copy(muv.mail!, 'mail')}
                  href={`mailto:${muv.mail}`}
                  actionColor="text-blue-400"
                />
              )}
            </div>
          </div>
        </div>

        {/* Sag: Aksiyonlar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onToggleSabitle}
            className={`p-2 rounded-lg border transition-colors ${isSabitlenen ? 'bg-gold/10 text-gold border-gold/20' : 'text-text-dim border-border hover:border-gold/40 hover:text-gold'}`}
            title={isSabitlenen ? 'Hızlı erişimden kaldır' : 'Hızlı erişime sabitle'}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill={isSabitlenen ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2">
              <path d="M8 1l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 11.8 3.8 14l.8-4.7L1.2 6l4.7-.7z" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded-lg border border-border text-text-dim hover:border-gold/40 hover:text-gold transition-colors"
            title="Düzenle"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.5 1.5l3 3L5 14H2v-3z"/><path d="M9.5 3.5l3 3"/>
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg border border-red/20 text-red/60 hover:bg-red-dim hover:text-red transition-colors"
            title="Sil"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4h12M5.5 4V2.5a1 1 0 011-1h3a1 1 0 011 1V4M6.5 7v4M9.5 7v4"/><path d="M3.5 4l.5 9a1.5 1.5 0 001.5 1.5h5A1.5 1.5 0 0012 13l.5-9"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── InfoChip — Tıklanabilir bilgi parçası ── */
function InfoChip({
  icon,
  label,
  value,
  copied,
  onCopy,
  href,
  actionColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  href?: string;
  actionColor?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-text-muted bg-surface border border-border rounded-md pl-2 pr-1 py-1 hover:border-gold/30 transition-colors group">
      <span className="text-text-dim shrink-0">{icon}</span>
      {label && <span className="text-text-dim">{label}:</span>}
      <span className="text-text font-medium">{value}</span>

      {/* Copy Button */}
      <button
        onClick={(e) => { e.preventDefault(); onCopy(); }}
        className="p-0.5 rounded text-text-dim hover:text-gold transition-colors opacity-0 group-hover:opacity-100"
        title="Kopyala"
      >
        {copied ? (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3a1.5 1.5 0 011.5-1.5H11"/></svg>
        )}
      </button>

      {/* Action Link (tel/mailto) */}
      {href && (
        <a
          href={href}
          className={`p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${actionColor || 'text-gold'} hover:scale-110`}
          title={href.startsWith('tel:') ? 'Ara' : 'E-posta gönder'}
          onClick={(e) => e.stopPropagation()}
        >
          {href.startsWith('tel:') ? (
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 1.5h3L8 5 6.5 6c.7 1.4 1.6 2.3 3 3L11 7.5l3.5 1.5v3a1.5 1.5 0 01-1.5 1.5C7 13 3 9 2 4.5A1.5 1.5 0 013.5 3V1.5z"/></svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 5l7 4 7-4" fill="none" stroke="var(--bg)" strokeWidth="1.2"/></svg>
          )}
        </a>
      )}
    </span>
  );
}
