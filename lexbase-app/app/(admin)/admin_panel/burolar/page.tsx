'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAdminBurolar } from '@/lib/hooks/useAdmin';

/* ══════════════════════════════════════════════════════════════
   Admin — Büro Listesi
   ══════════════════════════════════════════════════════════════ */

export default function BurolarPage() {
  const { data: burolar, isLoading } = useAdminBurolar();
  const [arama, setArama] = useState('');
  const [gorunum, setGorunum] = useState<'tablo' | 'kart'>('tablo');

  // DEBUG: Veri yapısını kontrol et
  if (burolar && burolar.length > 0) {
    console.log('🔍 BUROLAR DEBUG:', {
      ilkKayit: burolar[0],
      keys: Object.keys(burolar[0]),
      ad: burolar[0].ad,
      typeofAd: typeof burolar[0].ad,
    });
  }

  const filtreliBurolar = useMemo(() => {
    if (!burolar) return [];
    if (!arama.trim()) return burolar;
    const q = arama.toLowerCase();
    return burolar.filter((b: Record<string, unknown>) => {
      return (
        ((b.ad as string) || '').toLowerCase().includes(q) ||
        ((b.mail as string) || '').toLowerCase().includes(q) ||
        ((b.vergi_no as string) || '').toLowerCase().includes(q)
      );
    });
  }, [burolar, arama]);

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-200">🏢 Bürolar</h1>
          <p className="text-[11px] text-zinc-600">
            Platformdaki tüm hukuk büroları ({filtreliBurolar.length})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Büro ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none w-52"
          />
          <div className="flex border border-zinc-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setGorunum('tablo')}
              className={`px-2.5 py-1.5 text-[11px] ${gorunum === 'tablo' ? 'bg-amber-500/10 text-amber-500' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              ☰
            </button>
            <button
              onClick={() => setGorunum('kart')}
              className={`px-2.5 py-1.5 text-[11px] ${gorunum === 'kart' ? 'bg-amber-500/10 text-amber-500' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              ⊞
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-zinc-900/50 border border-zinc-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Tablo Görünümü */}
      {!isLoading && gorunum === 'tablo' && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Büro Adı</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider hidden md:table-cell">İletişim</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider hidden lg:table-cell">Vergi No</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Kayıt</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtreliBurolar.map((buro: Record<string, unknown>) => {
                return (
                  <tr key={buro.id as string} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium text-zinc-300">{(buro.ad as string) || 'İsimsiz Büro'}</div>
                      <div className="text-[10px] text-zinc-600">{(buro.adres as string)?.split(',')[0] || '—'}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-[11px] text-zinc-400">{(buro.mail as string) || '—'}</div>
                      <div className="text-[10px] text-zinc-600">{(buro.tel as string) || '—'}</div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-[11px] text-zinc-500">{(buro.vergi_no as string) || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-zinc-600">
                        {buro.created_at ? new Date(buro.created_at as string).toLocaleDateString('tr-TR') : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin_panel/burolar/${buro.id}`}
                        className="text-[11px] text-amber-500/70 hover:text-amber-500 transition-colors"
                      >
                        Detay →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtreliBurolar.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-zinc-600">
                    {arama ? 'Aramayla eşleşen büro bulunamadı' : 'Henüz büro kaydı yok'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Kart Görünümü */}
      {!isLoading && gorunum === 'kart' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtreliBurolar.map((buro: Record<string, unknown>) => {
            return (
              <Link
                key={buro.id as string}
                href={`/admin_panel/burolar/${buro.id}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 hover:border-amber-500/30 transition-all group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🏢</span>
                  <div>
                    <div className="text-[13px] font-medium text-zinc-300 group-hover:text-amber-500 transition-colors">
                      {(buro.ad as string) || 'İsimsiz Büro'}
                    </div>
                    <div className="text-[10px] text-zinc-600">{(buro.adres as string)?.split(',')[0] || '—'}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-600">Email</span>
                    <span className="text-zinc-400">{(buro.mail as string) || '—'}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-600">Telefon</span>
                    <span className="text-zinc-400">{(buro.tel as string) || '—'}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-600">Kayıt</span>
                    <span className="text-zinc-400">
                      {buro.created_at ? new Date(buro.created_at as string).toLocaleDateString('tr-TR') : '—'}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
