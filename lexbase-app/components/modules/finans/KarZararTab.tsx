'use client';

import { useBuroKarZarar } from '@/lib/hooks/useFinans';
import { fmt } from '@/lib/utils';
import { AYLAR, KzRow } from './shared';

interface KarZararTabProps {
  yil: number;
  setYil: (y: number) => void;
  ay: number;
  setAy: (a: number) => void;
}

export function KarZararTab(props: KarZararTabProps) {
  const { data, isPending, isError } = useBuroKarZarar(props.yil, props.ay || undefined);
  if (isError) return <div role="alert" className="py-8 text-center text-xs text-red">Finans verileri yüklenemedi. Lütfen tekrar deneyiniz.</div>;
  if (isPending || !data) return <div role="status" className="py-8 text-center text-xs text-text-muted">Finans verileri yükleniyor...</div>;
  return <KarZararRapor {...props} karZarar={data} />;
}

function KarZararRapor({ yil, setYil, ay, setAy, karZarar }: KarZararTabProps & {
  karZarar: Record<string, unknown>;
}) {
  const buYil = new Date().getFullYear();

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
            <KzRow label="Büroya Ait Dosya Maliyetleri" value={Number(giderler.dosyaMasraflari || 0)} color="text-red" />
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

    </div>
  );
}
