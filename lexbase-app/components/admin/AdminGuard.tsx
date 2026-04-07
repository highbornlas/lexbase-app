'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * AdminGuard — Admin paneli erişim kontrolü
 *
 * Güvenlik modeli:
 * 1. Cloudflare Access → URL bazlı koruma (asıl güvenlik katmanı)
 * 2. Auth oturumu kontrol → yoksa /giris
 * 3. platform_adminler kaydı → yoksa sadece bootstrap izin listesiyle kayıt
 *    → Cloudflare yanlış yapılandırılsa bile izinli olmayan hesap admin olamaz
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [durum, setDurum] = useState<'yukleniyor' | 'yetkili' | 'giris_gerekli' | 'yetkisiz'>('yukleniyor');
  const [mesaj, setMesaj] = useState('');

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setDurum('giris_gerekli');
        router.replace('/giris');
        return;
      }

      // platform_adminler tablosunda var mı kontrol et
      const { data: admin, error: adminError } = await supabase
        .from('platform_adminler')
        .select('auth_id')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (adminError) {
        setMesaj('Admin doğrulaması yapılamadı.');
        setDurum('yetkisiz');
        return;
      }

      if (admin) {
        setDurum('yetkili');
        return;
      }

      const { error: bootstrapError } = await supabase.rpc('admin_bootstrap', {
          p_auth_id: user.id,
          p_email: user.email || '',
          p_ad: user.user_metadata?.ad || user.email?.split('@')[0] || 'Admin',
      });

      if (cancelled) return;

      if (!bootstrapError) {
        const { data: bootstrappedAdmin } = await supabase
          .from('platform_adminler')
          .select('auth_id')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (bootstrappedAdmin) {
          setDurum('yetkili');
          return;
        }
      }

      setMesaj(bootstrapError?.message || 'Bu hesap platform admin listesinde değil.');
      setDurum('yetkisiz');
    })();

    return () => { cancelled = true; };
  }, [router]);

  if (durum === 'yukleniyor') {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-sm text-zinc-500 font-medium">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (durum === 'giris_gerekli') {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <div className="text-sm text-zinc-400">Oturum açmanız gerekiyor</div>
          <div className="text-xs text-zinc-600 mt-1">Giriş sayfasına yönlendiriliyorsunuz...</div>
        </div>
      </div>
    );
  }

  if (durum === 'yetkisiz') {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="text-4xl mb-3">⛔</div>
          <div className="text-sm text-zinc-300">Bu hesap admin paneline yetkili değil</div>
          <div className="text-xs text-zinc-600 mt-2">
            {mesaj || 'İlk admin ataması veritabanında açıkça yetkilendirilmelidir.'}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
