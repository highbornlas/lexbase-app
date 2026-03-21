'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useBildirimler, useBildirimOkundu, useTumBildirimlerOku } from '@/lib/hooks/useBildirimler';
import { SpotlightSearch } from '@/components/search/SpotlightSearch';
import { useRol, ROL_ETIKETLERI } from '@/lib/hooks/useRol';
import { HavaDurumuBadge } from '@/components/dashboard/HavaDurumuBadge';
import { HavaDurumuModal } from '@/components/dashboard/HavaDurumuModal';

/* ── Zaman farkı formatı ───────────────────────────────────── */
function zamanFarki(tarih: string): string {
  const fark = Date.now() - new Date(tarih).getTime();
  const dk = Math.floor(fark / 60000);
  if (dk < 1) return 'Az önce';
  if (dk < 60) return `${dk} dk önce`;
  const saat = Math.floor(dk / 60);
  if (saat < 24) return `${saat} saat önce`;
  const gun = Math.floor(saat / 24);
  if (gun < 7) return `${gun} gün önce`;
  return new Date(tarih).toLocaleDateString('tr-TR');
}

/* ── Bildirim tip ikonları ─────────────────────────────────── */
const BILDIRIM_IKONLARI: Record<string, string> = {
  durusma: '📅',
  gorev: '✅',
  dosya: '📁',
  sure: '⏰',
  belge: '📎',
  finans: '💰',
  sistem: '🔔',
};

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const router = useRouter();

  /* ── State ──────────────────────────────────────────────── */
  const [user, setUser] = useState<{ email?: string; ad?: string } | null>(null);
  const [bildirimOpen, setBildirimOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [havaOpen, setHavaOpen] = useState(false);
  const { rol, loading: rolLoading } = useRol();
  const rolInfo = rol ? (ROL_ETIKETLERI[rol] || ROL_ETIKETLERI.avukat) : ROL_ETIKETLERI.avukat;

  /* ── Bildirim hook'ları ────────────────────────────────── */
  const { data: bildirimler } = useBildirimler();
  const bildirimOkundu = useBildirimOkundu();
  const tumOku = useTumBildirimlerOku();

  const okunmamisSayi = bildirimler?.filter((b) => !b.okundu).length ?? 0;

  /* ── Refs for click-outside ─────────────────────────────── */
  const bildirimRef = useRef<HTMLDivElement>(null);

  /* ── Fetch user ─────────────────────────────────────────── */
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

  /* ── Click outside to close dropdowns ───────────────────── */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bildirimRef.current && !bildirimRef.current.contains(e.target as Node)) {
        setBildirimOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ── Keyboard shortcut: Ctrl+K / Cmd+K ──────────────────── */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* ── Logout ─────────────────────────────────────────────── */
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/giris');
  }

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center gap-2 px-3 sm:px-5 sticky top-0 z-40">

      {/* ── Hamburger (mobile only) ──────────────────────── */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-text-muted hover:bg-surface2 hover:text-text transition-colors text-lg flex-shrink-0"
        aria-label="Menu"
      >
        ☰
      </button>

      {/* ── Logo (mobile only — desktop logo is in sidebar) ── */}
      <Link
        href="/dashboard"
        className="lg:hidden flex-shrink-0 mr-1"
      >
        <span className="font-display text-lg font-bold tracking-tight">
          <span className="text-gold">L</span>
          <span className="text-text">ex</span>
          <span className="text-gold">B</span>
          <span className="text-text">ase</span>
        </span>
      </Link>

      {/* ── Search Bar (center, hidden on mobile) ────────── */}
      <div
        onClick={() => setSearchOpen(true)}
        className="topbar-search hidden md:flex items-center gap-2 flex-1 max-w-md mx-auto cursor-pointer
                   bg-surface2 border border-border rounded-[10px] px-3 py-2
                   hover:border-text-dim group"
        title="Ctrl+K"
      >
        <span className="text-text-dim text-sm">🔍</span>
        <span className="text-text-dim text-sm flex-1">Müvekkil, dava, icra ara...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-bg text-[10px] text-text-dim font-mono">
          Ctrl+K
        </kbd>
      </div>

      {/* ── Spacer (push right group to end on mobile) ──── */}
      <div className="flex-1 md:hidden" />

      {/* ── Right Group ──────────────────────────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-auto">

        {/* ── Hava Durumu ──────────────────────────────── */}
        <div className="hidden sm:block">
          <HavaDurumuBadge onClick={() => setHavaOpen(true)} />
        </div>

        {/* ── Bildirim (Notification Bell) ──────────────── */}
        <div className="relative" ref={bildirimRef}>
          <button
            onClick={() => {
              setBildirimOpen((prev) => !prev);
            }}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg
                       text-text-muted hover:bg-surface2 hover:text-text transition-all duration-200 text-base"
            title="Bildirimler"
          >
            🔔
            {okunmamisSayi > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center
                             rounded-full bg-red text-white text-[10px] font-bold px-1">
                {okunmamisSayi > 9 ? '9+' : okunmamisSayi}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {bildirimOpen && (
            <div className="dropdown-menu absolute right-0 top-full mt-1.5 w-80 z-50 animate-fade-in-up">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <span className="text-sm font-bold text-text">🔔 Bildirimler</span>
                {okunmamisSayi > 0 && (
                  <button
                    onClick={() => tumOku.mutate()}
                    className="text-xs text-text-muted hover:text-gold transition-colors"
                  >
                    ✓ Tümünü Oku
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto">
                {!bildirimler || bildirimler.length === 0 ? (
                  <div className="px-4 py-6 text-center text-text-dim text-sm">
                    Bildirim bulunmuyor
                  </div>
                ) : (
                  bildirimler.slice(0, 10).map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        if (!b.okundu) bildirimOkundu.mutate(b.id);
                        if (b.link) router.push(b.link);
                        setBildirimOpen(false);
                      }}
                      className={`w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-surface2 transition-colors border-b border-border/30 last:border-0 ${!b.okundu ? 'bg-gold-dim/20' : ''}`}
                    >
                      <span className="text-base flex-shrink-0 mt-0.5">
                        {BILDIRIM_IKONLARI[b.tip] || '🔔'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[12px] leading-snug truncate ${!b.okundu ? 'font-semibold text-text' : 'text-text-muted'}`}>
                          {b.baslik}
                        </div>
                        {b.mesaj && (
                          <div className="text-[11px] text-text-dim mt-0.5 truncate">{b.mesaj}</div>
                        )}
                        <div className="text-[10px] text-text-dim mt-0.5">
                          {zamanFarki(b.olusturma)}
                        </div>
                      </div>
                      {!b.okundu && (
                        <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between">
                <Link
                  href="/bildirimler"
                  onClick={() => setBildirimOpen(false)}
                  className="text-[11px] text-text-muted hover:text-gold transition-colors"
                >
                  Tüm Bildirimleri Gör
                </Link>
                <Link
                  href="/ayarlar"
                  onClick={() => setBildirimOpen(false)}
                  className="text-[11px] text-text-muted hover:text-gold transition-colors"
                >
                  ⚙️ Ayarlar
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Separator ─────────────────────────────────── */}
        <div className="hidden sm:block w-px h-6 bg-border mx-0.5" />

        {/* ── Plan Badge ────────────────────────────────── */}
        <span
          className="hidden sm:flex items-center px-2 py-1 rounded-full border border-green/40
                     text-[10px] font-bold text-green"
          title="Mevcut plan"
        >
          🌱 Deneme
        </span>

        {/* ── User Name + Rol Badge ─────────────────────── */}
        <div className="hidden lg:flex items-center gap-1.5">
          <span className="text-xs text-text-muted truncate max-w-[100px]">
            {user?.ad || 'Kullanıcı'}
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${rolInfo.renk}`}>
            {rolInfo.kisa}
          </span>
        </div>

        {/* ── Settings ──────────────────────────────────── */}
        <Link
          href="/ayarlar"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border
                     text-text-muted hover:bg-surface2 hover:text-text hover:border-gold/30 transition-all duration-200 text-[11px]"
          title="Ayarlar"
        >
          ⚙️
        </Link>

        {/* ── Logout ────────────────────────────────────── */}
        <button
          onClick={handleLogout}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border
                     text-text-muted hover:bg-surface2 hover:text-red hover:border-red/30 transition-all duration-200 text-[11px]"
          title="Çıkış Yap"
        >
          🚪
        </button>

      </div>

      {/* ── Spotlight Search Modal ─────────────────────────── */}
      <SpotlightSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ── Hava Durumu Modal ─────────────────────────────── */}
      <HavaDurumuModal open={havaOpen} onClose={() => setHavaOpen(false)} />
    </header>
  );
}
