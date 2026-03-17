'use client';

import { useState, useCallback } from 'react';
import type { Muvekkil } from '@/lib/hooks/useMuvekkillar';

export function MuvKimlik({ muv }: { muv: Muvekkil }) {
  const isGercek = muv.tip !== 'tuzel';

  /* ── Adres metnini oluştur ── */
  const adresText = (() => {
    // Önce yeni çoklu adres formatını kontrol et
    if (muv.adresler && muv.adresler.length > 0) {
      return muv.adresler.map((a) => {
        const baslik = a.baslik ? `${a.baslik}: ` : '';
        const acik = a.acik;
        const parcalar = [a.mahalle, a.sokak, a.sayi, a.ilce, a.il].filter(Boolean).join(', ');
        return baslik + (acik || parcalar || '');
      }).filter(Boolean).join(' | ') || null;
    }
    // Eski tek adres formatı
    if (!muv.adres) return null;
    const acik = muv.adres.acik;
    const parcalar = [muv.adres.mahalle, muv.adres.sokak, muv.adres.sayi, muv.adres.ilce, muv.adres.il]
      .filter(Boolean)
      .join(', ');
    return acik || parcalar || null;
  })();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Kimlik Bilgileri */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
          🪪 {isGercek ? 'Kişisel Bilgiler' : 'Kurum Bilgileri'}
        </h3>
        <div className="space-y-3">
          {isGercek ? (
            <>
              <InfoRow label="Ad Soyad" value={muv.ad} />
              <InfoRow label="TC Kimlik No" value={muv.tc} />
              <InfoRow label="Doğum Tarihi" value={muv.dogum} />
              <InfoRow label="Doğum Yeri" value={muv.dogumYeri} />
              <InfoRow label="Uyruk" value={muv.uyruk} fallback="T.C." />
              <InfoRow label="Meslek" value={muv.meslek} />
              <InfoRow label="Pasaport No" value={muv.pasaport} />
            </>
          ) : (
            <>
              <InfoRow label="Unvan" value={muv.ad} />
              <InfoRow label="Şirket Türü" value={muv.sirketTur} />
              <InfoRow label="Vergi No" value={muv.vergiNo} />
              <InfoRow label="Vergi Dairesi" value={muv.vergiDairesi} />
              <InfoRow label="MERSİS No" value={muv.mersis} />
              <InfoRow label="Ticaret Sicil" value={muv.ticaretSicil} />
              <InfoRow label="Yetkili" value={muv.yetkiliAd} />
              <InfoRow label="Yetkili Unvanı" value={muv.yetkiliUnvan} />
              <InfoRow label="Yetkili TC" value={muv.yetkiliTc} />
              <InfoRow label="Yetkili Tel" value={muv.yetkiliTel} />
            </>
          )}
        </div>
      </div>

      {/* İletişim Bilgileri */}
      <div className="space-y-6">
        <div className="bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
            📞 İletişim Bilgileri
          </h3>
          <div className="space-y-3">
            <InfoRow label="Telefon" value={muv.tel} />
            <InfoRow label="E-posta" value={muv.mail} />
            <InfoRow label="Faks" value={muv.faks} />
            <InfoRow label="Web" value={muv.web} />
            <InfoRow label="UETS" value={muv.uets} />
            <InfoRow label="Adres" value={adresText} />
          </div>
        </div>

        {/* Banka Hesapları — her zaman göster */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
            🏦 Banka Hesapları
          </h3>
          {muv.bankalar && muv.bankalar.length > 0 ? (
            <div className="space-y-3">
              {muv.bankalar.map((b, i) => (
                <div key={i} className="bg-surface2 rounded-lg p-3 border border-border/50">
                  <div className="text-xs font-semibold text-text mb-1">
                    {b.banka || '—'} {b.sube && `— ${b.sube}`}
                  </div>
                  <InfoRow label="IBAN" value={b.iban} mono copyable />
                  <InfoRow label="Hesap No" value={b.hesapNo} />
                  <InfoRow label="Hesap Sahibi" value={b.hesapAd} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-text-dim">
              <div className="text-2xl mb-2">🏦</div>
              <div className="text-xs">Henüz banka hesabı eklenmemiş</div>
              <div className="text-[10px] text-text-dim mt-1">Düzenle butonundan ekleyebilirsiniz</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  fallback,
  mono,
  copyable,
}: {
  label: string;
  value?: string | null;
  fallback?: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const display = value || fallback || '—';
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!value) return;
    navigator.clipboard.writeText(value.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <div className="flex justify-between items-center group/row">
      <span className="text-[11px] text-text-dim">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`text-xs text-text font-medium text-right max-w-[60%] ${mono ? 'font-mono tracking-wider text-text-muted' : ''}`}>
          {display}
        </span>
        {copyable && value && (
          <button
            type="button"
            onClick={handleCopy}
            className="w-5 h-5 flex items-center justify-center rounded text-text-dim hover:text-gold hover:bg-gold-dim transition-all opacity-0 group-hover/row:opacity-100"
            title="Kopyala"
          >
            {copied ? (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-green">
                <path d="M3 8.5l3 3 7-7"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="5" width="8" height="8" rx="1.5"/>
                <path d="M3 11V3a1.5 1.5 0 011.5-1.5H11"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
