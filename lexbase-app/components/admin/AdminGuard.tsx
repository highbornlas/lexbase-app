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
 * 3. platform_adminler tablosuna otomatik kayıt (bootstrap)
 *    → Cloudflare Access'i geçen + oturum açmış kullanıcı = admin
 *    → Hesaba bağlı değil, Cloudflare Access güvenliğine dayanır
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [durum, setDurum] = useState<'yukleniyor' | 'yetkili' | 'yetkisiz'>('yukleniyor');

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setDurum('yetkisiz');
        router.replace('/giris');
        return;
      }

      // platform_adminler tablosunda var mı kontrol et
      const { data: admin } = await supabase
        .from('platform_adminler')
        .select('auth_id')
        .eq('auth_id', user.id)
        .single();

      if (cancelled) return;

      // Yoksa otomatik kaydet (bootstrap)
      // Cloudflare Access bu URL'e erişimi kısıtlar — buraya ulaşan kullanıcı admin'dir
      if (!admin) {
        await supabase.rpc('admin_bootstrap', {
          p_auth_id: user.id,
          p_email: user.email || '',
          p_ad: user.user_metadata?.ad || user.email?.split('@')[0] || 'Admin',
        });
      }

      setDurum('yetkili');
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

  if (durum === 'yetkisiz') {
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

  return <>{children}</>;
}
