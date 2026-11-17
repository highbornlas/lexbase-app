'use client';

import { fmt, fmtTarih } from "@/lib/utils";
import { esasNoGoster } from "@/lib/utils/uyapHelpers";
import { SureBadge } from "@/components/ui/SureBadge";
import Link from "next/link";
import { SectionHeader, OzetSatir, FinansKart } from "./DetailUi";
import { AlacakKalemleriSection } from "./AlacakKalemleriSection";
import { HacizTakibiSection } from "./HacizTakibiSection";
import { OdemePlaniSection } from "./OdemePlaniSection";
import { BorcluBilgileriSection } from "./BorcluBilgileriSection";

export function OzetTab({
  icra, muvAd, daireAdi, taraflar, esasNo: esas, hesap, itirazBilgi, iliskiliDava, onDuzenle, onUpdate,
}: {
  icra: import('@/lib/hooks/useIcra').Icra;
  muvAd: string;
  daireAdi: string;
  taraflar: { alacakli: string; borclu: string };
  esasNo: string;
  hesap: { masraf: number; tahsilat: number; tahsilOran: number; kalan: number; evrakSayisi: number; net: number };
  itirazBilgi: { kalanGun: number; sonTarih: string; gecmis: boolean; acil: boolean } | null;
  iliskiliDava: import('@/lib/hooks/useDavalar').Dava | null;
  onDuzenle: () => void;
  onUpdate: (icra: import('@/lib/hooks/useIcra').Icra) => void;
}) {
  return (
    <div className="space-y-6">
      {/* İki sütunlu detay grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sol: İcra Bilgileri */}
        <div className="space-y-4">
          <SectionHeader title="İcra Bilgileri" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <OzetSatir label="Takip Türü" value={icra.tur || '—'} />
            <OzetSatir label="Alacak Türü" value={icra.atur || '—'} />
            <OzetSatir label="İl / Adliye" value={[icra.il, icra.adliye].filter(Boolean).join(' / ') || '—'} />
            <OzetSatir label="İcra Dairesi" value={daireAdi || icra.daire || '—'} />
            <OzetSatir label="Esas No" value={esas || '—'} />
            <OzetSatir label="Dayanak" value={icra.dayanak || '—'} />
            <OzetSatir label="Faiz" value={icra.faiz ? `%${icra.faiz}` : '—'} />
            <OzetSatir label="Toplam Alacak" value={icra.alacak ? fmt(icra.alacak) : '—'} />
          </div>
        </div>

        {/* Sağ: Tarihler & Taraflar */}
        <div className="space-y-4">
          <SectionHeader title="Tarihler" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <OzetSatir label="Takip Tarihi" value={fmtTarih(icra.tarih) || '—'} />
            <OzetSatir label="Ödeme Emri" value={fmtTarih(icra.otarih) || '—'} />
            <OzetSatir label="Tebliğ Tarihi" value={fmtTarih(icra.tebligTarihi) || '—'} />
            <OzetSatir label="İtiraz Son Tarih" value={itirazBilgi ? fmtTarih(itirazBilgi.sonTarih) : '—'} />
          </div>

          <SectionHeader title="Taraflar" className="mt-5" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <OzetSatir label="Müvekkil" value={muvAd} />
            <OzetSatir label="Müvekkil Rolü" value={icra.muvRol === 'alacakli' ? 'Alacaklı' : icra.muvRol === 'borclu' ? 'Borçlu' : '—'} />
            <OzetSatir label="Alacaklı" value={taraflar.alacakli} />
            <OzetSatir label="Borçlu" value={taraflar.borclu} />
            <OzetSatir label={icra.muvRol === 'borclu' ? 'Alacaklı TC' : 'Borçlu TC'} value={icra.btc || '—'} />
            <OzetSatir label="Karşı Vekil" value={icra.karsav || '—'} />
            {iliskiliDava && (
              <div>
                <div className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">İlişkili Dava</div>
                <Link href={`/davalar/${iliskiliDava.id}`} className="text-xs text-gold hover:underline font-medium">
                  {esasNoGoster(iliskiliDava.esasYil, iliskiliDava.esasNo) || iliskiliDava.no || 'Dosya'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* İtiraz süresi vurgu kartı */}
      {itirazBilgi && !itirazBilgi.gecmis && (
        <div className={`border rounded-xl p-4 flex items-center justify-between ${itirazBilgi.acil ? 'bg-red/5 border-red/20' : 'bg-gold/5 border-gold/20'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${itirazBilgi.acil ? 'bg-red/10' : 'bg-gold/10'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={itirazBilgi.acil ? 'text-red' : 'text-gold'}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <div>
              <div className={`text-[10px] uppercase tracking-wider font-bold ${itirazBilgi.acil ? 'text-red' : 'text-gold'}`}>İtiraz Süresi</div>
              <div className="text-sm font-bold text-text">Son tarih: {fmtTarih(itirazBilgi.sonTarih)}</div>
            </div>
          </div>
          <SureBadge kalanGun={itirazBilgi.kalanGun} label="itiraz" />
        </div>
      )}

      {/* Alacak Kalemleri */}
      <AlacakKalemleriSection icra={icra} hesap={hesap} onUpdate={onUpdate} />

      {/* Finansal özet çizelgesi */}
      <div>
        <SectionHeader title="Finansal Durum" />
        <div className="mt-3 bg-surface2/50 rounded-xl border border-border/50 p-4">
          <div className="grid grid-cols-5 gap-4">
            <FinansKart label="Toplam Alacak" value={icra.alacak || 0} color="text-gold" />
            <FinansKart label="Tahsilat" value={hesap.tahsilat} color="text-green" />
            <FinansKart label="Kalan" value={hesap.kalan} color="text-red" />
            <FinansKart label="Masraf" value={hesap.masraf} color="text-text" />
            <div className="border-l border-border pl-4">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Ücret - Masraf</div>
              <div className={`font-[var(--font-playfair)] text-lg font-bold ${hesap.net >= 0 ? 'text-green' : 'text-red'}`}>
                {fmt(hesap.net)}
              </div>
              {(icra.alacak || 0) > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-surface2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${hesap.tahsilOran >= 100 ? 'bg-green' : hesap.tahsilOran > 50 ? 'bg-gold' : 'bg-red'}`}
                    style={{ width: `${Math.min(hesap.tahsilOran, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Haciz Takibi */}
      <HacizTakibiSection icra={icra} onUpdate={onUpdate} />

      {/* Odeme Plani */}
      <OdemePlaniSection icra={icra} onUpdate={onUpdate} />

      {/* Karşı Taraf Bilgileri (role göre borçlu/alacaklı) */}
      <BorcluBilgileriSection icra={icra} onUpdate={onUpdate} karsiRolLabel={icra.muvRol === 'borclu' ? 'Alacaklı' : 'Borçlu'} />

      {/* Notlar önizleme */}
      {icra.not && (
        <div>
          <SectionHeader title="Son Notlar" />
          <div className="mt-2 bg-gold-dim/30 border border-gold/20 rounded-lg p-3 relative">
            <div className="absolute top-0 left-4 w-6 h-1.5 bg-gold/30 rounded-b-sm" />
            <div className="text-xs text-text whitespace-pre-wrap mt-1">
              {icra.not.length > 300 ? icra.not.slice(0, 300) + '...' : icra.not}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
