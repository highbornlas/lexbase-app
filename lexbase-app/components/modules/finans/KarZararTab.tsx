'use client';

import { useMemo } from 'react';
import { useBuroKarZarar } from '@/lib/hooks/useFinans';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useDanismanliklar } from '@/lib/hooks/useDanismanlik';
import { useArabuluculuklar } from '@/lib/hooks/useArabuluculuk';
import { useIhtarnameler } from '@/lib/hooks/useIhtarname';
import { useBuroGiderleri } from '@/lib/hooks/useBuroGiderleri';
import { fmt } from '@/lib/utils';
import { safeNum } from '@/lib/utils/finans';
import { AYLAR, KzRow } from './shared';

interface KarZararTabProps {
  yil: number;
  setYil: (y: number) => void;
  ay: number;
  setAy: (a: number) => void;
}

// ── Client-Side Fallback Hesaplama ────────────────────────────
function useKarZararFallback(yil: number, ay?: number) {
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const { data: danismanliklar } = useDanismanliklar();
  const { data: arabuluculuklar } = useArabuluculuklar();
  const { data: ihtarnameler } = useIhtarnameler();
  const { data: giderler } = useBuroGiderleri();

  return useMemo(() => {
    const tarihIcindeMi = (tarih: string | undefined) => {
      if (!tarih) return false;
      const d = new Date(tarih);
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== yil) return false;
      if (ay && (d.getMonth() + 1) !== ay) return false;
      return true;
    };

    // GELİRLER
    let akdiVekaletUcreti = 0;
    let karsiVekaletHakedis = 0;
    let digerGelir = 0;
    let danismanlikGeliri = 0;
    let arabuluculukGeliri = 0;
    let ihtarnameGeliri = 0;

    // Dava + İcra tahsilatları
    const tumDosyalar = [...(davalar || []), ...(icralar || [])] as Record<string, unknown>[];
    tumDosyalar.forEach((dosya) => {
      const tahsilatlar = (dosya.tahsilatlar || []) as Array<Record<string, unknown>>;
      tahsilatlar.forEach((th) => {
        if (!tarihIcindeMi(th.tarih as string)) return;
        const tutar = Number(th.tutar || 0);
        if (th.tur === 'akdi_vekalet') akdiVekaletUcreti += tutar;
        else if (th.tur === 'hakediş') karsiVekaletHakedis += tutar;
        else if (th.tur === 'tahsilat') digerGelir += tutar;
      });
    });

    // Danışmanlık
    (danismanliklar || []).forEach((d) => {
      const tarih = (d as Record<string, unknown>).sonucTarih as string || (d as Record<string, unknown>).tarih as string;
      if (tarihIcindeMi(tarih)) {
        danismanlikGeliri += safeNum(d.tahsilEdildi);
      }
    });

    // Arabuluculuk
    (arabuluculuklar || []).forEach((a) => {
      const tarih = a.sonucTarih || a.basvuruTarih;
      if (tarihIcindeMi(tarih)) {
        arabuluculukGeliri += safeNum(a.tahsilEdildi);
      }
    });

    // İhtarname
    (ihtarnameler || []).forEach((ih) => {
      if (tarihIcindeMi(ih.tarih)) {
        ihtarnameGeliri += safeNum(ih.tahsilEdildi);
      }
    });

    const toplamGelir = akdiVekaletUcreti + karsiVekaletHakedis + danismanlikGeliri + arabuluculukGeliri + ihtarnameGeliri + digerGelir;

    // GİDERLER
    let buroGiderToplam = 0;
    const buroGiderKategori: Record<string, number> = {};
    let dosyaMasraflari = 0;

    // Büro giderleri
    (giderler || []).forEach((g) => {
      if (!tarihIcindeMi(g.tarih)) return;
      const tutar = g.netTutar || g.tutar || 0;
      buroGiderToplam += tutar;
      const kat = g.kategori || 'Diğer';
      buroGiderKategori[kat] = (buroGiderKategori[kat] || 0) + tutar;
    });

    // Dosya masrafları
    tumDosyalar.forEach((dosya) => {
      const harcamalar = (dosya.harcamalar || []) as Array<Record<string, unknown>>;
      harcamalar.forEach((h) => {
        if (tarihIcindeMi(h.tarih as string)) {
          dosyaMasraflari += Number(h.tutar || 0);
        }
      });
    });

    // İhtarname noter masrafları
    (ihtarnameler || []).forEach((ih) => {
      if (tarihIcindeMi(ih.tarih)) {
        dosyaMasraflari += Number(ih.noterMasrafi || 0);
      }
    });

    const toplamGider = buroGiderToplam + dosyaMasraflari;
    const net = toplamGelir - toplamGider;
    const karZararOrani = toplamGelir > 0 ? (net / toplamGelir) * 100 : 0;

    return {
      gelirler: {
        akdiVekaletUcreti,
        karsiVekaletHakedis,
        danismanlikGeliri,
        arabuluculukGeliri,
        ihtarnameGeliri,
        digerGelir,
        toplam: toplamGelir,
      },
      giderler: {
        buroGiderleri: buroGiderKategori,
        buroGiderToplam,
        dosyaMasraflari,
        toplam: toplamGider,
      },
      net,
      karZararOrani,
      _fallback: true,
    };
  }, [davalar, icralar, danismanliklar, arabuluculuklar, ihtarnameler, giderler, yil, ay]);
}

// ── KarZararTab Bileşeni ──────────────────────────────────────
export function KarZararTab({ yil, setYil, ay, setAy }: KarZararTabProps) {
  const { data: rpcKarZarar, isLoading } = useBuroKarZarar(yil, ay || undefined);
  const fallback = useKarZararFallback(yil, ay || undefined);
  const buYil = new Date().getFullYear();

  if (isLoading) return <div className="text-center py-8 text-text-muted text-xs">Yükleniyor...</div>;

  // RPC verisi varsa kullan, yoksa fallback
  const karZarar = rpcKarZarar || fallback;
  const isFallback = !rpcKarZarar;

  const gelirler = (karZarar?.gelirler || {}) as Record<string, unknown>;
  const giderler = (karZarar?.giderler || {}) as Record<string, unknown>;
  const net = Number(karZarar?.net ?? 0);
  const oran = Number(karZarar?.karZararOrani ?? 0);

  // Gelir satırları — sıfır olmayanları dinamik göster
  const gelirSatirlari = [
    { label: 'Akdi Vekalet Ücreti', key: 'akdiVekaletUcreti' },
    { label: 'Karşı Vekalet Hakedişi', key: 'karsiVekaletHakedis' },
    { label: 'Danışmanlık Geliri', key: 'danismanlikGeliri' },
    { label: 'Arabuluculuk Geliri', key: 'arabuluculukGeliri' },
    { label: 'İhtarname Geliri', key: 'ihtarnameGeliri' },
    { label: 'Diğer Gelir', key: 'digerGelir' },
  ].filter((s) => Number(gelirler[s.key] || 0) > 0 || s.key === 'akdiVekaletUcreti');

  return (
    <div>
      {/* Yıl + Ay seçimi */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-dim uppercase tracking-wider">Yıl:</span>
          {[buYil - 2, buYil - 1, buYil].map((y) => (
            <button
              key={y}
              onClick={() => setYil(y)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                yil === y ? 'bg-gold text-bg' : 'bg-surface border border-border text-text-muted hover:text-text'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-dim uppercase tracking-wider">Ay:</span>
          <select
            value={ay}
            onChange={(e) => setAy(Number(e.target.value))}
            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
          >
            {AYLAR.map((a) => (
              <option key={a.val} value={a.val}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Gelirler */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <h4 className="text-xs font-semibold text-green mb-3">GELİRLER</h4>
          <div className="space-y-2">
            {gelirSatirlari.map((s) => (
              <KzRow key={s.key} label={s.label} value={Number(gelirler[s.key] || 0)} color="text-green" />
            ))}
            <div className="border-t border-border pt-2">
              <KzRow label="TOPLAM GELİR" value={Number(gelirler.toplam || 0)} color="text-green" bold />
            </div>
          </div>
        </div>

        {/* Giderler */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <h4 className="text-xs font-semibold text-red mb-3">GİDERLER</h4>
          <div className="space-y-2">
            {giderler.buroGiderleri !== undefined && typeof giderler.buroGiderleri === 'object' ? (
              Object.entries(giderler.buroGiderleri as Record<string, number>).map(([kat, tutar]) => (
                <KzRow key={kat} label={kat} value={tutar} color="text-red" />
              ))
            ) : (
              <KzRow label="Büro Giderleri" value={Number(giderler.buroGiderToplam || giderler.buroGiderleri || 0)} color="text-red" />
            )}
            <KzRow label="Dosya Masrafları" value={Number(giderler.dosyaMasraflari || 0)} color="text-red" />
            <div className="border-t border-border pt-2">
              <KzRow label="TOPLAM GİDER" value={Number(giderler.toplam || 0)} color="text-red" bold />
            </div>
          </div>
        </div>

        {/* Net */}
        <div className="bg-surface border border-border rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-xs text-text-muted mb-2">NET KÂR / ZARAR</div>
          <div className={`font-[var(--font-playfair)] text-3xl font-bold ${net >= 0 ? 'text-green' : 'text-red'}`}>
            {fmt(net)}
          </div>
          {oran !== 0 && (
            <div className={`text-xs mt-1 ${net >= 0 ? 'text-green' : 'text-red'}`}>
              {oran.toFixed(1)}% oran
            </div>
          )}
          <div className="text-[10px] text-text-dim mt-2">
            {ay > 0 ? `${AYLAR[ay].label} ${yil}` : `${yil} Yılı`}
          </div>
        </div>
      </div>

      {/* Fallback notu */}
      {isFallback && (
        <div className="text-center text-[10px] text-text-dim mt-2">
          📊 Hesaplama yerel veriden yapıldı
        </div>
      )}
    </div>
  );
}
