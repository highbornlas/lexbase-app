'use client';

import { usePlatformIstatistik } from '@/lib/hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Admin — Platform Analitiği
   Kullanım metrikleri, modül dağılımı, aktiflik
   ══════════════════════════════════════════════════════════════ */

function useModulKullanim() {
  return useQuery({
    queryKey: ['admin', 'modul-kullanim'],
    queryFn: async () => {
      const supabase = createClient();
      const tablolar = ['dava', 'icra', 'muvekkil', 'ihtarname', 'arabuluculuk', 'danismanlik', 'todolar', 'etkinlikler', 'belgeler'];
      const sonuclar: Record<string, number> = {};
      for (const tablo of tablolar) {
        const { count } = await supabase.from(tablo).select('id', { count: 'exact', head: true });
        sonuclar[tablo] = count || 0;
      }
      return sonuclar;
    },
    staleTime: 60_000,
  });
}

function useEnAktifBurolar() {
  return useQuery({
    queryKey: ['admin', 'en-aktif-burolar'],
    queryFn: async () => {
      const supabase = createClient();
      // Son 7 gündeki giriş sayısına göre bürolar
      const { data } = await supabase
        .from('ip_loglari')
        .select('auth_id')
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

      // Kullanıcı bazlı giriş sayısı
      const girisMap = new Map<string, number>();
      (data || []).forEach((log: Record<string, unknown>) => {
        const key = log.auth_id as string;
        girisMap.set(key, (girisMap.get(key) || 0) + 1);
      });

      return {
        toplamGiris: data?.length || 0,
        benzersizKullanici: girisMap.size,
        enAktif: [...girisMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id, sayi]) => ({ auth_id: id, giris_sayisi: sayi })),
      };
    },
    staleTime: 60_000,
  });
}

const MODUL_ETIKETLER: Record<string, { icon: string; ad: string }> = {
  dava: { icon: '📁', ad: 'Davalar' },
  icra: { icon: '⚡', ad: 'İcra Dosyaları' },
  muvekkil: { icon: '📒', ad: 'Müvekkiller' },
  ihtarname: { icon: '📨', ad: 'İhtarnameler' },
  arabuluculuk: { icon: '🤝', ad: 'Arabuluculuk' },
  danismanlik: { icon: '⚖️', ad: 'Danışmanlık' },
  todolar: { icon: '✅', ad: 'Görevler' },
  etkinlikler: { icon: '📅', ad: 'Etkinlikler' },
  belgeler: { icon: '📎', ad: 'Belgeler' },
};

export default function AnalitikPage() {
  const { data: istatistik } = usePlatformIstatistik();
  const { data: modulKullanim, isLoading: modulYukleniyor } = useModulKullanim();
  const { data: aktiflik } = useEnAktifBurolar();

  const maxModul = modulKullanim ? Math.max(...Object.values(modulKullanim), 1) : 1;

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-lg font-bold text-zinc-200">📈 Platform Analitiği</h1>
        <p className="text-[11px] text-zinc-600">Kullanım metrikleri ve platform performansı</p>
      </div>

      {/* Üst KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Bugünkü Giriş', value: istatistik?.bugunki_giris || 0, icon: '🟢', renk: 'border-emerald-500/20 bg-emerald-500/5' },
          { label: 'Haftalık Giriş', value: istatistik?.haftalik_giris || 0, icon: '📊', renk: 'border-blue-500/20 bg-blue-500/5' },
          { label: 'Benzersiz Kull. (7g)', value: aktiflik?.benzersizKullanici || 0, icon: '👤', renk: 'border-amber-500/20 bg-amber-500/5' },
          { label: 'Toplam Büro', value: istatistik?.toplam_buro || 0, icon: '🏢', renk: 'border-zinc-700 bg-zinc-900/30' },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.renk}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span>{k.icon}</span>
              <span className="text-[10px] text-zinc-600">{k.label}</span>
            </div>
            <div className="text-2xl font-bold text-zinc-200 font-[var(--font-playfair)]">{k.value.toLocaleString('tr-TR')}</div>
          </div>
        ))}
      </div>

      {/* Modül Kullanım Dağılımı */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h3 className="text-[12px] font-bold text-zinc-400 mb-4">📊 Modül Kullanım Dağılımı (Platform Geneli)</h3>
        {modulYukleniyor ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {modulKullanim && Object.entries(modulKullanim)
              .sort(([, a], [, b]) => b - a)
              .map(([modul, sayi]) => {
                const info = MODUL_ETIKETLER[modul] || { icon: '📋', ad: modul };
                const yuzde = Math.round((sayi / maxModul) * 100);
                return (
                  <div key={modul}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">{info.icon} {info.ad}</span>
                      <span className="text-zinc-500 font-medium">{sayi.toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500/60 rounded-full transition-all" style={{ width: `${yuzde}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* En Aktif Kullanıcılar */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h3 className="text-[12px] font-bold text-zinc-400 mb-3">🏆 En Aktif Kullanıcılar (Son 7 Gün)</h3>
        <div className="space-y-1.5">
          {aktiflik?.enAktif.map((k, i) => (
            <div key={k.auth_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/30">
              <span className="text-[11px] text-zinc-600 w-5 text-right">{i + 1}.</span>
              <span className="text-[11px] text-zinc-400 flex-1 font-mono truncate">{k.auth_id.slice(0, 8)}...</span>
              <span className="text-[11px] text-amber-500 font-bold">{k.giris_sayisi} giriş</span>
            </div>
          ))}
          {(!aktiflik?.enAktif || aktiflik.enAktif.length === 0) && (
            <div className="text-center py-4 text-[11px] text-zinc-600">Veri yok</div>
          )}
        </div>
      </div>
    </div>
  );
}
