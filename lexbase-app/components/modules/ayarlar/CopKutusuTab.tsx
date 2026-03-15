'use client';

import { useState, useEffect } from 'react';
import { useCopKutusu, getCopKutusuSuresi, setCopKutusuSuresi, SURE_SECENEKLERI } from '@/lib/hooks/useCopKutusu';
import { useMuvekkilGeriYukle, useMuvekkilKaliciSil } from '@/lib/hooks/useMuvekkillar';
import { useKarsiTarafGeriYukle, useKarsiTarafKaliciSil } from '@/lib/hooks/useKarsiTaraflar';
import { useVekilGeriYukle, useVekilKaliciSil } from '@/lib/hooks/useVekillar';
import { useDavaGeriYukle, useDavaKaliciSil } from '@/lib/hooks/useDavalar';
import { useIcraGeriYukle, useIcraKaliciSil } from '@/lib/hooks/useIcra';
import { useIhtarnameGeriYukle, useIhtarnameHardSil } from '@/lib/hooks/useIhtarname';
import { SectionTitle, Badge, AyarlarEmptyState } from './shared';

/* ══════════════════════════════════════════════════════════════
   Çöp Kutusu Tab — Silinen kayıtları yönet, geri yükle, kalıcı sil
   ══════════════════════════════════════════════════════════════ */

export function CopKutusuTab() {
  const { data: silinenler, isLoading } = useCopKutusu();
  const [sure, setSure] = useState(0);
  const [tick, setTick] = useState(0);
  const [filtre, setFiltre] = useState<string>('');

  const mGeriYukle = useMuvekkilGeriYukle();
  const mKaliciSil = useMuvekkilKaliciSil();
  const ktGeriYukle = useKarsiTarafGeriYukle();
  const ktKaliciSil = useKarsiTarafKaliciSil();
  const vGeriYukle = useVekilGeriYukle();
  const vKaliciSil = useVekilKaliciSil();
  const dGeriYukle = useDavaGeriYukle();
  const dKaliciSil = useDavaKaliciSil();
  const iGeriYukle = useIcraGeriYukle();
  const iKaliciSil = useIcraKaliciSil();
  const ihGeriYukle = useIhtarnameGeriYukle();
  const ihKaliciSil = useIhtarnameHardSil();

  useEffect(() => {
    setSure(getCopKutusuSuresi());
  }, []);

  // Live countdown — her saniye tick artır
  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  function handleSureDegistir(ms: number) {
    setCopKutusuSuresi(ms);
    setSure(ms);
  }

  function handleGeriYukle(tablo: string, id: string) {
    if (tablo === 'muvekkillar') mGeriYukle.mutate(id);
    else if (tablo === 'karsi_taraflar') ktGeriYukle.mutate(id);
    else if (tablo === 'vekillar') vGeriYukle.mutate(id);
    else if (tablo === 'davalar') dGeriYukle.mutate(id);
    else if (tablo === 'icra') iGeriYukle.mutate(id);
    else if (tablo === 'ihtarnameler') ihGeriYukle.mutate(id);
  }

  function handleKaliciSil(tablo: string, id: string) {
    if (tablo === 'muvekkillar') mKaliciSil.mutate(id);
    else if (tablo === 'karsi_taraflar') ktKaliciSil.mutate(id);
    else if (tablo === 'vekillar') vKaliciSil.mutate(id);
    else if (tablo === 'davalar') dKaliciSil.mutate(id);
    else if (tablo === 'icra') iKaliciSil.mutate(id);
    else if (tablo === 'ihtarnameler') ihKaliciSil.mutate(id);
  }

  function kalanSureFormat(silinmeTarihi: string): string {
    const saklamaSuresi = getCopKutusuSuresi();
    const ms = saklamaSuresi - (Date.now() - new Date(silinmeTarihi).getTime());
    if (ms <= 0) return 'Süresi doldu';
    const saat = Math.floor(ms / (1000 * 60 * 60));
    const dk = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const sn = Math.floor((ms % (1000 * 60)) / 1000);
    if (saat > 24) return `${Math.floor(saat / 24)} gün ${saat % 24} saat`;
    if (saat > 0) return `${saat} saat ${dk} dk ${sn} sn`;
    if (dk > 0) return `${dk} dk ${sn} sn`;
    return `${sn} sn`;
  }

  // tick kullanımı — React'ın optimize etmemesi için
  void tick;

  const BADGE_RENK: Record<string, string> = {
    muvekkillar: 'green',
    karsi_taraflar: 'red',
    vekillar: 'gold',
    davalar: 'gold',
    icra: 'purple',
    ihtarnameler: 'blue',
  };

  const filtrelenmis = filtre
    ? (silinenler || []).filter((s) => s.tablo === filtre)
    : (silinenler || []);

  // Tablo bazında sayılar
  const tabloSayilari = (silinenler || []).reduce<Record<string, number>>((acc, s) => {
    acc[s.tablo] = (acc[s.tablo] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <SectionTitle sub="Silinen kayıtlar burada saklanır. Saklama süresi dolduğunda otomatik silinir.">
          Çöp Kutusu
        </SectionTitle>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted">Saklama süresi:</span>
          <select
            value={sure}
            onChange={(e) => handleSureDegistir(Number(e.target.value))}
            className="px-2 py-1 bg-surface2 border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
          >
            {SURE_SECENEKLERI.map((s) => (
              <option key={s.ms} value={s.ms}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tablo filtresi */}
      {silinenler && silinenler.length > 0 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          <button
            onClick={() => setFiltre('')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
              !filtre ? 'bg-gold-dim text-gold border-gold/30' : 'bg-surface2 text-text-muted border-border hover:text-text'
            }`}
          >
            Tümü ({silinenler.length})
          </button>
          {Object.entries(tabloSayilari).map(([tablo, sayi]) => {
            const label = silinenler.find((s) => s.tablo === tablo)?.tabloLabel || tablo;
            return (
              <button
                key={tablo}
                onClick={() => setFiltre(tablo)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  filtre === tablo ? 'bg-gold-dim text-gold border-gold/30' : 'bg-surface2 text-text-muted border-border hover:text-text'
                }`}
              >
                {label} ({sayi})
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-text-muted text-sm">Yükleniyor...</div>
      ) : !silinenler || silinenler.length === 0 ? (
        <AyarlarEmptyState icon="🗑️" text="Çöp kutusu boş" sub="Silinen kayıtlar burada görünür" />
      ) : filtrelenmis.length === 0 ? (
        <AyarlarEmptyState icon="📋" text="Bu kategoride silinmiş kayıt yok" />
      ) : (
        <div className="space-y-2">
          {filtrelenmis.map((s) => (
            <div
              key={`${s.tablo}-${s.id}`}
              className="flex items-center gap-3 bg-surface2 border border-border/50 rounded-lg px-4 py-3"
            >
              {/* Tip badge */}
              <Badge color={BADGE_RENK[s.tablo] || 'gray'}>{s.tabloLabel}</Badge>

              {/* Ad */}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-text font-medium truncate block">{s.ad || '(adsız)'}</span>
                <span className="text-[10px] text-text-dim">
                  Silindi: {new Date(s.silinmeTarihi).toLocaleString('tr-TR')} — Kalan: {kalanSureFormat(s.silinmeTarihi)}
                </span>
              </div>

              {/* Geri Yükle */}
              <button
                onClick={() => handleGeriYukle(s.tablo, s.id)}
                className="px-2.5 py-1 text-[11px] font-medium text-green border border-green/30 rounded-lg hover:bg-green/10 transition-colors"
              >
                Geri Yükle
              </button>

              {/* Kalıcı Sil */}
              <button
                onClick={() => handleKaliciSil(s.tablo, s.id)}
                className="px-2.5 py-1 text-[11px] font-medium text-red border border-red/30 rounded-lg hover:bg-red/10 transition-colors"
              >
                Kalıcı Sil
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
