'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCopKutusu, getCopKutusuSuresi, setCopKutusuSuresi, SURE_SECENEKLERI } from '@/lib/hooks/useCopKutusu';
import { useMuvekkilGeriYukle, useMuvekkilKaliciSil } from '@/lib/hooks/useMuvekkillar';
import { useKarsiTarafGeriYukle, useKarsiTarafKaliciSil } from '@/lib/hooks/useKarsiTaraflar';
import { useVekilGeriYukle, useVekilKaliciSil } from '@/lib/hooks/useVekillar';
import { useDavaGeriYukle, useDavaKaliciSil } from '@/lib/hooks/useDavalar';
import { useIcraGeriYukle, useIcraKaliciSil } from '@/lib/hooks/useIcra';
import { useIhtarnameGeriYukle, useIhtarnameHardSil } from '@/lib/hooks/useIhtarname';
import { useArabuluculukGeriYukle, useArabuluculukKaliciSil } from '@/lib/hooks/useArabuluculuk';
import { useDanismanlikGeriYukle, useDanismanlikKaliciSil } from '@/lib/hooks/useDanismanlik';
import { SectionTitle, Badge, AyarlarEmptyState } from './shared';

/* ══════════════════════════════════════════════════════════════
   Çöp Kutusu Tab — Silinen kayıtları yönet, geri yükle, kalıcı sil
   + Çoklu seçim + Tümünü Sil
   ══════════════════════════════════════════════════════════════ */

export function CopKutusuTab() {
  const { data: silinenler, isLoading } = useCopKutusu();
  const [sure, setSure] = useState(0);
  const [tick, setTick] = useState(0);
  const [filtre, setFiltre] = useState<string>('');
  const [seciliIdler, setSeciliIdler] = useState<Set<string>>(new Set());
  const [topluOnay, setTopluOnay] = useState<'sil' | 'yukle' | null>(null);

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
  const arbGeriYukle = useArabuluculukGeriYukle();
  const arbKaliciSil = useArabuluculukKaliciSil();
  const danGeriYukle = useDanismanlikGeriYukle();
  const danKaliciSil = useDanismanlikKaliciSil();

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
    else if (tablo === 'arabuluculuk') arbGeriYukle.mutate(id);
    else if (tablo === 'danismanlik') danGeriYukle.mutate(id);
  }

  function handleKaliciSil(tablo: string, id: string) {
    if (tablo === 'muvekkillar') mKaliciSil.mutate(id);
    else if (tablo === 'karsi_taraflar') ktKaliciSil.mutate(id);
    else if (tablo === 'vekillar') vKaliciSil.mutate(id);
    else if (tablo === 'davalar') dKaliciSil.mutate(id);
    else if (tablo === 'icra') iKaliciSil.mutate(id);
    else if (tablo === 'ihtarnameler') ihKaliciSil.mutate(id);
    else if (tablo === 'arabuluculuk') arbKaliciSil.mutate(id);
    else if (tablo === 'danismanlik') danKaliciSil.mutate(id);
  }

  // ── Çoklu seçim ────────────────────────────────────────────
  function toggleSecim(key: string) {
    setSeciliIdler((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function tumunuSec() {
    if (seciliIdler.size === filtrelenmis.length) {
      setSeciliIdler(new Set());
    } else {
      setSeciliIdler(new Set(filtrelenmis.map((s) => `${s.tablo}-${s.id}`)));
    }
  }

  function handleTopluSil() {
    const hedefler = (silinenler || []).filter((s) => seciliIdler.has(`${s.tablo}-${s.id}`));
    hedefler.forEach((s) => handleKaliciSil(s.tablo, s.id));
    setSeciliIdler(new Set());
    setTopluOnay(null);
  }

  function handleTopluGeriYukle() {
    const hedefler = (silinenler || []).filter((s) => seciliIdler.has(`${s.tablo}-${s.id}`));
    hedefler.forEach((s) => handleGeriYukle(s.tablo, s.id));
    setSeciliIdler(new Set());
    setTopluOnay(null);
  }

  function handleTumunuSil() {
    (filtrelenmis || []).forEach((s) => handleKaliciSil(s.tablo, s.id));
    setSeciliIdler(new Set());
    setTopluOnay(null);
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
    arabuluculuk: 'blue',
    danismanlik: 'green',
  };

  const filtrelenmis = useMemo(() => {
    return filtre
      ? (silinenler || []).filter((s) => s.tablo === filtre)
      : (silinenler || []);
  }, [silinenler, filtre]);

  // Filtre değişince seçimi temizle
  useEffect(() => {
    setSeciliIdler(new Set());
  }, [filtre]);

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
          {/* Tümünü Sil butonu */}
          {filtrelenmis.length > 0 && (
            <button
              onClick={() => setTopluOnay('sil')}
              className="px-3 py-1.5 text-[11px] font-medium text-red border border-red/30 rounded-lg hover:bg-red/10 transition-colors"
            >
              🗑️ Çöp Kutusunu Boşalt ({filtrelenmis.length})
            </button>
          )}
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

      {/* Toplu işlem bar */}
      {seciliIdler.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-gold-dim border border-gold/20 rounded-lg">
          <span className="text-xs text-gold font-semibold">{seciliIdler.size} kayıt seçili</span>
          <button
            onClick={() => setTopluOnay('yukle')}
            className="text-[11px] px-2.5 py-1 bg-surface border border-green/30 rounded text-green hover:bg-green/10 transition-colors font-medium"
          >
            Tümünü Geri Yükle
          </button>
          <button
            onClick={() => setTopluOnay('sil')}
            className="text-[11px] px-2.5 py-1 bg-surface border border-red/30 rounded text-red hover:bg-red/10 transition-colors font-medium"
          >
            Seçilenleri Kalıcı Sil
          </button>
          <button onClick={() => setSeciliIdler(new Set())} className="ml-auto text-[11px] text-text-dim hover:text-text transition-colors">
            Seçimi Temizle
          </button>
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
          {/* Tümünü seç */}
          <div className="flex items-center gap-2 px-4 py-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-text-muted hover:text-text transition-colors">
              <input
                type="checkbox"
                checked={seciliIdler.size === filtrelenmis.length && filtrelenmis.length > 0}
                onChange={tumunuSec}
                className="accent-[var(--gold)]"
              />
              Tümünü Seç
            </label>
          </div>

          {filtrelenmis.map((s) => {
            const key = `${s.tablo}-${s.id}`;
            const secili = seciliIdler.has(key);
            return (
              <div
                key={key}
                className={`flex items-center gap-3 bg-surface2 border rounded-lg px-4 py-3 transition-colors ${
                  secili ? 'border-gold/40 bg-gold-dim/30' : 'border-border/50'
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={secili}
                  onChange={() => toggleSecim(key)}
                  className="accent-[var(--gold)] flex-shrink-0"
                />

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
            );
          })}
        </div>
      )}

      {/* Toplu İşlem Onay Modalı */}
      {topluOnay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setTopluOnay(null)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text mb-3">
              {topluOnay === 'sil' ? '🗑️ Kalıcı Silme Onayı' : '♻️ Geri Yükleme Onayı'}
            </h3>
            <p className="text-sm text-text-muted mb-5">
              {topluOnay === 'sil' && seciliIdler.size > 0
                ? `Seçili ${seciliIdler.size} kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.`
                : topluOnay === 'sil'
                ? `${filtre ? `"${(silinenler || []).find((s) => s.tablo === filtre)?.tabloLabel || filtre}" kategorisindeki` : 'Çöp kutusundaki'} ${filtrelenmis.length} kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.`
                : `Seçili ${seciliIdler.size} kayıt geri yüklenecek.`
              }
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setTopluOnay(null)}
                className="px-4 py-2 text-xs text-text-muted border border-border rounded-lg hover:text-text hover:border-gold transition-colors"
              >
                Vazgeç
              </button>
              {topluOnay === 'sil' ? (
                <button
                  onClick={seciliIdler.size > 0 ? handleTopluSil : handleTumunuSil}
                  className="px-4 py-2 text-xs font-bold text-white bg-red rounded-lg hover:bg-red/80 transition-colors"
                >
                  {seciliIdler.size > 0 ? `${seciliIdler.size} Kaydı Sil` : `${filtrelenmis.length} Kaydı Sil`}
                </button>
              ) : (
                <button
                  onClick={handleTopluGeriYukle}
                  className="px-4 py-2 text-xs font-bold text-white bg-green rounded-lg hover:bg-green/80 transition-colors"
                >
                  {seciliIdler.size} Kaydı Geri Yükle
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
