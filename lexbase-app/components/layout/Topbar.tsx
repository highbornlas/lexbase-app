'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Topbar() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; ad?: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email,
          ad: data.user.user_metadata?.ad || data.user.email?.split('@')[0],
        });
      }
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/giris');
  }

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Breadcrumb / Arama */}
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium text-text-muted">
          {/* Breadcrumb buraya gelecek */}
        </div>
      </div>

      {/* Sağ taraf */}
      <div className="flex items-center gap-3">
        {/* Bildirimler */}
        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-text-muted hover:bg-surface2 hover:text-text transition-colors text-base">
          🔔
        </button>

        {/* Kullanıcı */}
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-gold-dim border border-gold flex items-center justify-center text-gold text-xs font-bold">
            {user?.ad?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-text">{user?.ad || 'Kullanıcı'}</div>
            <div className="text-[10px] text-text-dim">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="ml-2 text-xs text-text-dim hover:text-red transition-colors"
            title="Çıkış Yap"
          >
            ↗
          </button>
        </div>
      </div>
    </header>
  );
}
