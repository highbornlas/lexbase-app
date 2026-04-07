'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Admin — Kullanıcı Detay Sayfası
   Sekmeler: Profil, Bürolar, Oturum Geçmişi, Aktivite
   ══════════════════════════════════════════════════════════════ */

type Sekme = 'profil' | 'burolar' | 'oturumlar' | 'aktivite';

const AKSIYON_STILLERI: Record<string, string> = {
  create: 'bg-emerald-500',
  update: 'bg-amber-500',
  delete: 'bg-red-500',
  upload: 'bg-sky-500',
  download: 'bg-violet-500',
  login: 'bg-cyan-500',
  logout: 'bg-zinc-500',
};

const AKSIYON_ETIKETLERI: Record<string, string> = {
  create: 'Oluşturdu',
  update: 'Güncelledi',
  delete: 'Sildi',
  upload: 'Yükledi',
  download: 'İndirdi',
  login: 'Giriş yaptı',
  logout: 'Çıkış yaptı',
};

function useKullaniciDetay(authId: string) {
  return useQuery({
    queryKey: ['admin', 'kullanici', authId],
    queryFn: async () => {
      const supabase = createClient();
      const [kulRes, uyeRes, ipRes, auditRes] = await Promise.all([
        supabase.from('kullanicilar').select('*').eq('auth_id', authId).single(),
        supabase.from('uyelikler').select('*, buro:buro_id(id, ad, adres)').eq('auth_id', authId),
        supabase.from('ip_loglari').select('*').eq('auth_id', authId).order('created_at', { ascending: false }).limit(20),
        supabase.from('audit_log').select('*').eq('kullanici_id', authId).order('created_at', { ascending: false }).limit(30),
      ]);
      return {
        kullanici: kulRes.data,
        uyelikler: uyeRes.data || [],
        ipLoglari: ipRes.data || [],
        auditLog: auditRes.data || [],
      };
    },
    enabled: !!authId,
  });
}

export default function KullaniciDetayPage() {
  const params = useParams();
  const authId = params.id as string;
  const { data, isLoading } = useKullaniciDetay(authId);
  const [sekme, setSekme] = useState<Sekme>('profil');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.kullanici) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3">🔍</div>
        <div className="text-zinc-400 text-sm">Kullanıcı bulunamadı</div>
        <Link href="/admin_panel/kullanicilar" className="text-amber-500 text-xs mt-2 inline-block hover:underline">← Geri Dön</Link>
      </div>
    );
  }

  const kul = data.kullanici as Record<string, unknown>;

  const sekmeler: { key: Sekme; label: string; icon: string }[] = [
    { key: 'profil', label: 'Profil', icon: '📋' },
    { key: 'burolar', label: `Bürolar (${data.uyelikler.length})`, icon: '🏢' },
    { key: 'oturumlar', label: `Oturumlar (${data.ipLoglari.length})`, icon: '🔐' },
    { key: 'aktivite', label: 'Aktivite', icon: '📊' },
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-zinc-600">
        <Link href="/admin_panel/kullanicilar" className="hover:text-amber-500 transition-colors">Kullanıcılar</Link>
        <span>›</span>
        <span className="text-zinc-400">{(kul.ad as string) || 'Kullanıcı Detay'}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg font-bold text-amber-500">
          {((kul.ad as string) || '?')[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-200">{(kul.ad as string) || 'İsimsiz'}</h1>
          <div className="text-[11px] text-zinc-500">{data.kullanici.email || '—'}</div>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto">
        {sekmeler.map((s) => (
          <button
            key={s.key}
            onClick={() => setSekme(s.key)}
            className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              sekme === s.key ? 'border-amber-500 text-amber-500' : 'border-transparent text-zinc-600 hover:text-zinc-400'
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Profil */}
      {sekme === 'profil' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Ad Soyad', value: (kul.ad as string) },
              { label: 'Email', value: data.kullanici.email },
              { label: 'Telefon', value: (kul.tel as string) },
              { label: 'Baro Sicil', value: (kul.baro_sicil as string) },
              { label: 'TC Kimlik', value: (kul.tc as string) ? `****${(kul.tc as string).slice(-4)}` : undefined },
              { label: 'Kayıt Tarihi', value: data.kullanici.created_at ? new Date(data.kullanici.created_at).toLocaleDateString('tr-TR') : undefined },
              { label: 'Üye Olduğu Büro Sayısı', value: String(data.uyelikler.length) },
              { label: 'Toplam Giriş', value: String(data.ipLoglari.length) },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">{item.label}</div>
                <div className="text-[13px] text-zinc-300">{item.value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bürolar */}
      {sekme === 'burolar' && (
        <div className="space-y-2">
          {data.uyelikler.map((uye: Record<string, unknown>) => {
            const buro = (uye.buro || {}) as Record<string, unknown>;
            return (
              <Link
                key={uye.id as string}
                href={`/admin_panel/burolar/${buro.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🏢</span>
                  <div>
                    <div className="text-[13px] font-medium text-zinc-300">{(buro.ad as string) || 'İsimsiz Büro'}</div>
                    <div className="text-[10px] text-zinc-600">{(buro.adres as string)?.split(',')[0] || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">{uye.rol as string}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    uye.durum === 'aktif' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                  }`}>{uye.durum as string}</span>
                </div>
              </Link>
            );
          })}
          {data.uyelikler.length === 0 && (
            <div className="text-center py-8 text-[12px] text-zinc-600">Büro üyeliği bulunamadı</div>
          )}
        </div>
      )}

      {/* Oturum Geçmişi */}
      {sekme === 'oturumlar' && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase">Tarih</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase">IP</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase hidden md:table-cell">Konum</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase hidden lg:table-cell">Cihaz</th>
              </tr>
            </thead>
            <tbody>
              {data.ipLoglari.map((log: Record<string, unknown>) => (
                <tr key={log.id as string} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-2.5 text-[11px] text-zinc-400">
                    {new Date(log.created_at as string).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-zinc-500 font-mono">{((log.ip as string) || '—').replace('/32', '').replace('/128', '')}</td>
                  <td className="px-4 py-2.5 text-[11px] text-zinc-500 hidden md:table-cell">
                    {(log.konum as string) || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-[10px] text-zinc-600 hidden lg:table-cell max-w-[200px] truncate">
                    {(log.cihaz as string)?.includes('Windows') ? '🖥️ Windows' :
                     (log.cihaz as string)?.includes('Mac') ? '💻 Mac' :
                     (log.cihaz as string)?.includes('iPhone') ? '📱 iPhone' :
                     (log.cihaz as string)?.includes('Android') ? '📱 Android' :
                     (log.cihaz as string) || '—'}
                  </td>
                </tr>
              ))}
              {data.ipLoglari.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-[12px] text-zinc-600">Oturum kaydı yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Aktivite */}
      {sekme === 'aktivite' && (
        <div className="space-y-1.5">
          {data.auditLog.map((log: Record<string, unknown>) => {
            const aksiyon = typeof log.aksiyon === 'string' ? log.aksiyon.toLowerCase() : '';
            const hedefTur = typeof log.hedef_tur === 'string' ? log.hedef_tur : '';

            return (
              <div key={log.id as string} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-zinc-800/50 bg-zinc-900/20">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${AKSIYON_STILLERI[aksiyon] || 'bg-zinc-500'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-zinc-400">{AKSIYON_ETIKETLERI[aksiyon] || (log.aksiyon as string) || 'İşlem yaptı'}</span>
                  <span className="text-[10px] text-zinc-600 ml-2">{hedefTur || 'genel'}</span>
                </div>
                <span className="text-[10px] text-zinc-600 flex-shrink-0">
                  {new Date(log.created_at as string).toLocaleString('tr-TR')}
                </span>
              </div>
            );
          })}
          {data.auditLog.length === 0 && (
            <div className="text-center py-8 text-[12px] text-zinc-600">Aktivite kaydı bulunamadı</div>
          )}
        </div>
      )}
    </div>
  );
}
