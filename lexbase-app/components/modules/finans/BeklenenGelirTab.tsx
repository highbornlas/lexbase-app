'use client';

import { useBeklenenGelir } from '@/lib/hooks/useFinans';
import { fmt } from '@/lib/utils';
import { MiniKpi, EmptyState } from './shared';

export function BeklenenGelirTab() {
  const { data: beklenen, isLoading, isError } = useBeklenenGelir();

  if (isError) return <div role="alert" className="py-8 text-center text-xs text-red">Beklenen ücretler yüklenemedi. Lütfen tekrar deneyiniz.</div>;
  if (isLoading) return <div className="text-center py-8 text-text-muted text-xs">Yükleniyor...</div>;

  const beklenenler = ((beklenen?.beklenenler as Record<string, unknown>[]) || []);
  const ozet = (beklenen?.ozet || {}) as Record<string, number>;

  return (
    <div>
      <p className="mb-4 text-xs text-text-muted">Kalan ücret alacaklarıdır; müvekkil avansları dahil değildir. Vade girilmemiş kayıtlar gecikmiş sayılmaz. Taksit tarihleri tahmin edilmez.</p>
      {/* Özet */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <MiniKpi label="Toplam Beklenen" value={fmt(ozet.toplam || 0)} color="text-gold" />
        <MiniKpi label="Bu Ay" value={fmt(ozet.buAy || 0)} color="text-green" />
        <MiniKpi label="Gecikmiş" value={fmt(ozet.gecikmisToplam || 0)} color="text-red" />
      </div>

      {beklenenler.length === 0 ? (
        <EmptyState icon="📅" message="Beklenen gelir kaydı bulunamadı" />
      ) : (
        <div className="space-y-2">
          {beklenenler.map((b, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 bg-surface border rounded-lg p-4 ${
                (b.gecikmisMi as boolean) ? 'border-red/30 bg-red-dim' : 'border-border'
              }`}
            >
              <div className="text-center min-w-[60px]">
                <div className="text-[10px] text-text-dim uppercase">
                  {(b.tarih as string) ? new Date(b.tarih as string).toLocaleString('tr-TR', { month: 'short' }) : '—'}
                </div>
                <div className="text-lg font-bold text-text">
                  {(b.tarih as string) ? Number(String(b.tarih).slice(8, 10)) : 'Vadesiz'}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-text">{(b.acik as string) || '—'}</div>
                <div className="text-[11px] text-text-muted">
                  {(b.dosyaNo as string) && <span>{b.dosyaNo as string}</span>}
                  {(b.tur as string) && <span> · {b.tur as string}</span>}
                </div>
              </div>
              <div className={`text-sm font-bold ${(b.gecikmisMi as boolean) ? 'text-red' : 'text-gold'}`}>
                {fmt((b.tutar as number) || 0)}
              </div>
              {(b.gecikmisMi as boolean) && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red/20 text-red rounded">GECİKMİŞ</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
