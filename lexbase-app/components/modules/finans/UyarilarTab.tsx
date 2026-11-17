'use client';

import { useFinansUyarilar } from '@/lib/hooks/useFinans';
import { fmt } from '@/lib/utils';
import { EmptyState } from './shared';

export function UyarilarTab() {
  const { data: uyarilar, isLoading, isError } = useFinansUyarilar();

  if (isError) return <div role="alert" className="py-8 text-center text-xs text-red">Finans uyarıları yüklenemedi. Lütfen tekrar deneyiniz.</div>;
  if (isLoading) return <div className="text-center py-8 text-text-muted text-xs">Yükleniyor...</div>;

  const liste = Array.isArray(uyarilar) ? uyarilar : [];

  if (liste.length === 0) {
    return <EmptyState icon="✅" message="Tüm finansal göstergeler normal. Uyarı bulunmuyor." />;
  }

  return (
    <div className="space-y-2">
      {liste.map((u: Record<string, unknown>, i: number) => (
        <div
          key={i}
          className={`p-4 rounded-lg border ${
            u.oncelik === 'yuksek'
              ? 'bg-red-dim border-red/20'
              : u.oncelik === 'orta'
              ? 'bg-gold-dim border-gold/20'
              : 'bg-surface2 border-border'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">{(u.icon as string) || '⚠️'}</span>
            <div className="flex-1">
              <div className={`text-sm font-medium ${
                u.oncelik === 'yuksek' ? 'text-red' : u.oncelik === 'orta' ? 'text-gold' : 'text-text'
              }`}>
                {u.mesaj as string}
              </div>
              {typeof u.muvAd === 'string' && (
                <div className="text-xs text-text-muted mt-0.5">Müvekkil: {u.muvAd}</div>
              )}
              {typeof u.tutar === 'number' && u.tutar > 0 && (
                <div className="text-xs font-semibold text-text mt-1">{fmt(u.tutar)}</div>
              )}
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
              u.oncelik === 'yuksek' ? 'bg-red/20 text-red' :
              u.oncelik === 'orta' ? 'bg-gold/20 text-gold' :
              'bg-surface text-text-muted'
            }`}>
              {u.oncelik === 'yuksek' ? 'YÜKSEK' : u.oncelik === 'orta' ? 'ORTA' : 'BİLGİ'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
