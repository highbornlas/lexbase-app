'use client';

import { useState } from 'react';
import { useAdminBilgi, useAdminAuditYaz } from '@/lib/hooks/useAdmin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Admin — Platform Ayarları
   Genel ayarlar, güvenlik, bakım modu, admin yönetimi
   ══════════════════════════════════════════════════════════════ */

type Sekme = 'genel' | 'guvenlik' | 'adminler' | 'bakim';

function useAdminListesi() {
  const qc = useQueryClient();
  const { data, isLoading } = (() => {
    const supabase = createClient();
    return {
      data: null as unknown,
      isLoading: false
    };
  })();

  // Aslında useQuery kullanmalı ama circular import önlemek için inline
  return { data, isLoading };
}

function useAdminEkle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, ad, yetki_seviye }: { email: string; ad: string; yetki_seviye: string }) => {
      const supabase = createClient();
      // Önce auth_id'yi bul
      const { data: kullanici } = await supabase
        .from('kullanicilar')
        .select('auth_id')
        .eq('email', email)
        .single();

      if (!kullanici) throw new Error('Bu email ile kayıtlı kullanıcı bulunamadı');

      const { error } = await supabase.from('platform_adminler').insert({
        auth_id: kullanici.auth_id,
        ad,
        email,
        yetki_seviye,
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export default function AyarlarPage() {
  const { admin } = useAdminBilgi();
  const auditYaz = useAdminAuditYaz();
  const adminEkle = useAdminEkle();
  const [sekme, setSekme] = useState<Sekme>('genel');
  const [yeniAdmin, setYeniAdmin] = useState({ email: '', ad: '', yetki_seviye: 'admin' });
  const [eklemeHata, setEklemeHata] = useState('');

  const handleAdminEkle = () => {
    setEklemeHata('');
    adminEkle.mutate(yeniAdmin, {
      onSuccess: () => {
        auditYaz.mutate({ islem: 'admin_ekle', detay: { email: yeniAdmin.email } });
        setYeniAdmin({ email: '', ad: '', yetki_seviye: 'admin' });
      },
      onError: (err) => setEklemeHata((err as Error).message),
    });
  };

  const sekmeler: { key: Sekme; label: string; icon: string }[] = [
    { key: 'genel', label: 'Genel', icon: '⚙️' },
    { key: 'guvenlik', label: 'Güvenlik', icon: '🔐' },
    { key: 'adminler', label: 'Admin Yönetimi', icon: '👑' },
    { key: 'bakim', label: 'Bakım', icon: '🔧' },
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-lg font-bold text-zinc-200">⚙️ Platform Ayarları</h1>
        <p className="text-[11px] text-zinc-600">Sistem konfigürasyonu ve bakım araçları</p>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto">
        {sekmeler.map((s) => (
          <button key={s.key} onClick={() => setSekme(s.key)}
            className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              sekme === s.key ? 'border-amber-500 text-amber-500' : 'border-transparent text-zinc-600 hover:text-zinc-400'
            }`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Genel */}
      {sekme === 'genel' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="text-[12px] font-bold text-zinc-400 mb-3">Platform Bilgileri</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Platform Adı', value: 'LexBase' },
                { label: 'Versiyon', value: 'v2.1.0' },
                { label: 'Domain', value: 'lexbase.app' },
                { label: 'Hosting', value: 'Cloudflare Pages' },
                { label: 'Veritabanı', value: 'Supabase PostgreSQL 17' },
                { label: 'Bölge', value: 'EU Central (Frankfurt)' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">{item.label}</div>
                  <div className="text-[13px] text-zinc-300">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="text-[12px] font-bold text-zinc-400 mb-3">Email Ayarları</h3>
            <div className="space-y-2">
              <div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Email Servisi</div>
                <div className="text-[13px] text-zinc-300">Resend</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Gönderici Adresi</div>
                <div className="text-[13px] text-zinc-300">noreply@lexbase.app</div>
              </div>
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2 mt-2">
                <p className="text-[10px] text-amber-400">
                  ⚠️ RESEND_API_KEY Supabase Edge Function secrets'ta tanımlı olmalıdır.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Güvenlik */}
      {sekme === 'guvenlik' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="text-[12px] font-bold text-zinc-400 mb-3">Güvenlik Politikaları</h3>
            <div className="space-y-3">
              {[
                { label: 'RLS (Row Level Security)', durum: true, aciklama: 'Tüm tablolarda aktif' },
                { label: 'Auth Guard', durum: true, aciklama: 'Client-side oturum kontrolü' },
                { label: 'Admin Guard', durum: true, aciklama: 'platform_adminler tablosu kontrolü' },
                { label: 'Audit Logging', durum: true, aciklama: 'Admin işlemleri loglanıyor' },
                { label: 'IP Loglama', durum: true, aciklama: 'Cloudflare Function ile giriş logları' },
                { label: '2FA (İki Faktörlü)', durum: false, aciklama: 'Yakında eklenecek' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-zinc-800/30 last:border-0">
                  <div>
                    <div className="text-[12px] text-zinc-300">{item.label}</div>
                    <div className="text-[10px] text-zinc-600">{item.aciklama}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.durum ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                  }`}>
                    {item.durum ? 'AKTİF' : 'PASİF'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Admin Yönetimi */}
      {sekme === 'adminler' && (
        <div className="space-y-4">
          {/* Mevcut admin */}
          {admin && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <h3 className="text-[12px] font-bold text-zinc-400 mb-2">Aktif Admin</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg font-bold text-amber-500">
                  {admin.ad[0]}
                </div>
                <div>
                  <div className="text-[13px] font-medium text-zinc-200">{admin.ad}</div>
                  <div className="text-[11px] text-zinc-500">{admin.email}</div>
                </div>
                <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">
                  {admin.yetki_seviye === 'super' ? 'SUPER ADMIN' : 'ADMIN'}
                </span>
              </div>
            </div>
          )}

          {/* Yeni admin ekle */}
          {admin?.yetki_seviye === 'super' && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
              <h3 className="text-[12px] font-bold text-zinc-400 mb-3">Yeni Admin Ekle</h3>
              <p className="text-[10px] text-zinc-600 mb-3">
                Eklenecek kişi platformda kayıtlı bir kullanıcı olmalıdır.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={yeniAdmin.email} onChange={(e) => setYeniAdmin({ ...yeniAdmin, email: e.target.value })}
                  placeholder="Email adresi"
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none" />
                <input value={yeniAdmin.ad} onChange={(e) => setYeniAdmin({ ...yeniAdmin, ad: e.target.value })}
                  placeholder="Ad Soyad"
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none" />
                <select value={yeniAdmin.yetki_seviye} onChange={(e) => setYeniAdmin({ ...yeniAdmin, yetki_seviye: e.target.value })}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none">
                  <option value="admin">Admin</option>
                  <option value="super">Super Admin</option>
                </select>
              </div>
              {eklemeHata && <p className="text-[11px] text-red-400 mt-2">❌ {eklemeHata}</p>}
              <button onClick={handleAdminEkle}
                disabled={!yeniAdmin.email || !yeniAdmin.ad || adminEkle.isPending}
                className="mt-3 px-4 py-2 rounded-lg text-[12px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                {adminEkle.isPending ? 'Ekleniyor...' : '👑 Admin Ekle'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bakım */}
      {sekme === 'bakim' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="text-[12px] font-bold text-zinc-400 mb-3">🔧 Bakım Araçları</h3>
            <div className="space-y-2">
              {[
                { label: 'Cache Temizle', aciklama: 'React Query cache\'ini temizle', icon: '🗑️', disabled: false },
                { label: 'Migration Durumu', aciklama: 'Veritabanı migration listesini kontrol et', icon: '📋', disabled: true },
                { label: 'Storage Raporu', aciklama: 'Supabase Storage kullanım raporu', icon: '💾', disabled: true },
                { label: 'Orphan Temizleme', aciklama: 'Burosu olmayan verileri bul', icon: '🧹', disabled: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-zinc-800/30">
                  <div className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <div>
                      <div className="text-[12px] text-zinc-300">{item.label}</div>
                      <div className="text-[10px] text-zinc-600">{item.aciklama}</div>
                    </div>
                  </div>
                  <button
                    disabled={item.disabled}
                    onClick={() => {
                      if (item.label === 'Cache Temizle') {
                        window.location.reload();
                      }
                    }}
                    className="px-3 py-1 rounded-lg text-[10px] font-medium border border-zinc-700 text-zinc-500 hover:border-amber-500/50 hover:text-amber-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {item.disabled ? 'Yakında' : 'Çalıştır'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-red-900/30 bg-red-900/5 p-5">
            <h3 className="text-[12px] font-bold text-red-400 mb-2">⚠️ Bakım Modu</h3>
            <p className="text-[10px] text-zinc-500 mb-3">
              Bakım modunu aktifleştirdiğinizde tüm kullanıcılar bakım sayfasını görür. Admin paneli çalışmaya devam eder.
            </p>
            <button disabled
              className="px-4 py-2 rounded-lg text-[11px] font-medium border border-red-800 text-red-400 opacity-50 cursor-not-allowed">
              Bakım Modunu Aktifleştir (Yakında)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
