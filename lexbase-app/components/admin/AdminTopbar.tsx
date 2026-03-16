'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdminBilgi } from '@/lib/hooks/useAdmin';

/* ══════════════════════════════════════════════════════════════
   Admin Topbar — Minimal, koyu tema üst bar
   ══════════════════════════════════════════════════════════════ */

interface AdminTopbarProps {
  onToggleSidebar: () => void;
}

export function AdminTopbar({ onToggleSidebar }: AdminTopbarProps) {
  const router = useRouter();
  const { admin } = useAdminBilgi();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/giris');
  }

  return (
    <header className="h-12 bg-[#0d0f14] border-b border-zinc-800/50 flex items-center gap-3 px-4 sticky top-0 z-40">
      {/* Hamburger (mobile) */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg
                   text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors text-sm"
        aria-label="Menu"
      >
        ☰
      </button>

      {/* Breadcrumb placeholder */}
      <div className="flex-1">
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
          Platform Yönetim Paneli
        </span>
      </div>

      {/* Right group */}
      <div className="flex items-center gap-2">
        {/* Status indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-800/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-500 font-medium">Sistem Aktif</span>
        </div>

        {/* Admin name */}
        <div className="hidden md:flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500">{admin?.ad || 'Admin'}</span>
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">
            {admin?.yetki_seviye === 'super' ? 'SA' : 'A'}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-zinc-800 mx-0.5" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-7 h-7 flex items-center justify-center rounded-lg
                     text-zinc-600 hover:bg-zinc-800 hover:text-red-400 transition-all text-[10px]"
          title="Çıkış Yap"
        >
          🚪
        </button>
      </div>
    </header>
  );
}
