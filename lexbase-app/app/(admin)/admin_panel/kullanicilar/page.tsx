'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAdminKullanicilar } from '@/lib/hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Admin — Kullanıcı Listesi
   ══════════════════════════════════════════════════════════════ */

function useKullanicilarDetayli() {
  return useQuery({
    queryKey: ['admin', 'kullanicilar-detayli'],
    queryFn: async () => {
      const supabase = createClient();
      const [kulRes, uyeRes] = await Promise.all([
        supabase.from('kullanicilar').select('*').order('created_at', { ascending: false }),
        supabase.from('uyelikler').select('auth_id, buro_id, rol, durum'),
      ]);
      const uyeMap = new Map<string, Array<Record<string, unknown>>>();
      (uyeRes.data || []).forEach((u: Record<string, unknown>) => {
        const arr = uyeMap.get(u.auth_id as string) || [];
        arr.push(u);
        uyeMap.set(u.auth_id as string, arr);
      });
      return (kulRes.data || []).map((k: Record<string, unknown>) => ({
        ...k,
        uyelikler: uyeMap.get(k.auth_id as string) || [],
      }));
    },
  });
}

const ROL_RENK: Record<string, string> = {
  sahip: 'text-amber-500 bg-amber-500/10',
  yonetici: 'text-amber-400 bg-amber-400/10',
  avukat: 'text-emerald-400 bg-emerald-400/10',
  stajyer: 'text-blue-400 bg-blue-400/10',
  sekreter: 'text-purple-400 bg-purple-400/10',
};

export default function KullanicilarPage() {
  const { data: kullanicilar, isLoading } = useKullanicilarDetayli();
  const [arama, setArama] = useState('');
  const [rolFiltre, setRolFiltre] = useState<string>('tumu');

  // DEBUG: Veri yapısını kontrol et
  if (kullanicilar && kullanicilar.length > 0) {
    console.log('🔍 KULLANICILAR DEBUG:', {
      ilkKayit: kullanicilar[0],
      keys: Object.keys(kullanicilar[0]),
      ad: kullanicilar[0].ad,
      typeofAd: typeof kullanicilar[0].ad,
    });
  }

  const filtreli = useMemo(() => {
    if (!kullanicilar) return [];
    return kullanicilar.filter((k: Record<string, unknown>) => {
      const uyelikler = (k.uyelikler || []) as Array<Record<string, string>>;
      const q = arama.toLowerCase();
      const aramaUygun = !arama ||
        ((k.ad as string) || '').toLowerCase().includes(q) ||
        ((k.email as string) || '').toLowerCase().includes(q);
      const rolUygun = rolFiltre === 'tumu' || uyelikler.some((u) => u.rol === rolFiltre);
      return aramaUygun && rolUygun;
    });
  }, [kullanicilar, arama, rolFiltre]);

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-200">👤 Kullanıcılar</h1>
          <p className="text-[11px] text-zinc-600">Platformdaki tüm kullanıcılar ({filtreli.length})</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ad veya email ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none w-52"
          />
          <select
            value={rolFiltre}
            onChange={(e) => setRolFiltre(e.target.value)}
            className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-400 focus:border-amber-500/50 focus:outline-none"
          >
            <option value="tumu">Tüm Roller</option>
            <option value="sahip">Sahip</option>
            <option value="yonetici">Yönetici</option>
            <option value="avukat">Avukat</option>
            <option value="stajyer">Stajyer</option>
            <option value="sekreter">Sekreter</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-zinc-900/50 border border-zinc-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Tablo */}
      {!isLoading && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Kullanıcı</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider hidden md:table-cell">Rol(ler)</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider hidden lg:table-cell">Büro Sayısı</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Kayıt</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtreli.map((kul: Record<string, unknown>) => {
                const uyelikler = (kul.uyelikler || []) as Array<Record<string, string>>;
                const roller = [...new Set(uyelikler.map((u) => u.rol))];

                return (
                  <tr key={kul.auth_id as string} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium text-zinc-300">{(kul.ad as string) || 'İsimsiz'}</div>
                      <div className="text-[10px] text-zinc-600">{(kul.email as string) || '—'}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {roller.length > 0 ? roller.map((r) => (
                          <span key={r} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ROL_RENK[r] || 'text-zinc-400 bg-zinc-800'}`}>
                            {r}
                          </span>
                        )) : (
                          <span className="text-[10px] text-zinc-600">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-[12px] text-zinc-400">{uyelikler.length}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-zinc-600">
                        {kul.created_at ? new Date(kul.created_at as string).toLocaleDateString('tr-TR') : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin_panel/kullanicilar/${kul.auth_id}`}
                        className="text-[11px] text-amber-500/70 hover:text-amber-500 transition-colors"
                      >
                        Detay →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtreli.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-zinc-600">
                    Kullanıcı bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
