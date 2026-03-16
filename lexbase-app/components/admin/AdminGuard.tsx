'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * AdminGuard — Admin paneli erişim kontrolü
 *
 * Sadece oturum açmış kullanıcıları kontrol eder.
 * Asıl güvenlik katmanı: Cloudflare Access (URL bazlı koruma)
 *
 * 1. Auth oturumu kontrol et (yoksa → /giris)
 * 2. Oturum varsa → children render
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
