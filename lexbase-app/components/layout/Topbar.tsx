'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/* ── Yeni Olustur Menu Items ─────────────────────────────── */
const yeniMenuItems = [
  { icon: '👤', label: 'Yeni Müvekkil', href: '/muvekkillar?yeni=1' },
  { icon: '📁', label: 'Yeni Dava', href: '/davalar?yeni=1' },
  { icon: '⚡', label: 'Yeni İcra', href: '/icra?yeni=1' },
  { icon: '📅', label: 'Yeni Etkinlik', href: '/takvim?yeni=1' },
  { icon: '✅', label: 'Yeni Görev', href: '/gorevler?yeni=1' },
  { icon: '📨', label: 'Yeni İhtarname', href: '/ihtarname?yeni=1' },
];

export function Topbar() {
  const router = useRouter();

  /* ── State ──────────────────────────────────────────────── */
  const [user, setUser] = useState<{ email?: string; ad?: string } | null>(null);
  const [yeniMenuOpen, setYeniMenuOpen] = useState(false);
  const [bildirimOpen, setBildirimOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Placeholder badge count
  const [bildirimCount] = useState(3);

  /* ── Refs for click-outside ─────────────────────────────── */
  const yeniMenuRef = useRef<HTMLDivElement>(null);
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
      if (yeniMenuRef.current && !yeniMenuRef.current.contains(e.target as Node)) {
        setYeniMenuOpen(false);
      }
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
        // TODO: Open spotlight search modal
        console.log('Spotlight search triggered');
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

  /* ── Toggle mobile sidebar ──────────────────────────────── */
  function toggleSidebar() {
    setSidebarOpen((prev) => !prev);
    // Dispatch custom event so Sidebar can listen
    window.dispatchEvent(new CustomEvent('toggle-sidebar'));
  }

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center gap-2 px-3 sm:px-5 sticky top-0 z-40">

      {/* ── Hamburger (mobile only) ──────────────────────── */}
      <button
        onClick={toggleSidebar}
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
        onClick={() => {
          // TODO: Open spotlight search
          console.log('Open search');
        }}
        className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-auto cursor-pointer
                   bg-surface2 border border-border rounded-lg px-3 py-2
                   hover:border-text-dim transition-colors group"
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

        {/* ── + Yeni Olustur ────────────────────────────── */}
        <div className="relative" ref={yeniMenuRef}>
          <button
            onClick={() => {
              setYeniMenuOpen((prev) => !prev);
              setBildirimOpen(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                       bg-gold-dim text-gold border border-gold/30
                       hover:bg-gold/20 transition-colors"
          >
            <span>+</span>
            <span className="hidden sm:inline">Yeni Oluştur</span>
          </button>

          {/* Dropdown */}
          {yeniMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48
                           bg-surface border border-border rounded-xl shadow-xl
                           py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              {yeniMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setYeniMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-muted
                             hover:bg-surface2 hover:text-text transition-colors"
                >
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Bildirim (Notification Bell) ──────────────── */}
        <div className="relative" ref={bildirimRef}>
          <button
            onClick={() => {
              setBildirimOpen((prev) => !prev);
              setYeniMenuOpen(false);
            }}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg
                       text-text-muted hover:bg-surface2 hover:text-text transition-colors text-base"
            title="Bildirimler"
          >
            🔔
            {bildirimCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center
                             rounded-full bg-red text-white text-[10px] font-bold px-1">
                {bildirimCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {bildirimOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80
                           bg-surface border border-border rounded-xl shadow-xl
                           z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-bold text-text">🔔 Bildirimler</span>
                <button className="text-xs text-text-muted hover:text-gold transition-colors">
                  ✓ Tümü
                </button>
              </div>

              {/* List (placeholder) */}
              <div className="max-h-72 overflow-y-auto">
                <div className="px-4 py-6 text-center text-text-dim text-sm">
                  Bildirim bulunmuyor
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-border text-center">
                <Link
                  href="/ayarlar"
                  onClick={() => setBildirimOpen(false)}
                  className="text-[11px] text-text-muted hover:text-gold transition-colors"
                >
                  ⚙️ Bildirim Ayarları
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Separator ─────────────────────────────────── */}
        <div className="hidden sm:block w-px h-6 bg-border mx-0.5" />

        {/* ── Plan Badge ────────────────────────────────── */}
        <Link
          href="/plan"
          className="hidden sm:flex items-center px-2 py-1 rounded-full border border-green/40
                     text-[10px] font-bold text-green hover:bg-green-dim transition-colors cursor-pointer"
          title="Planınızı görüntüle"
        >
          🌱 Deneme
        </Link>

        {/* ── User Name ─────────────────────────────────── */}
        <span className="hidden lg:inline text-xs text-text-muted truncate max-w-[100px]">
          {user?.ad || 'Kullanıcı'}
        </span>

        {/* ── Settings ──────────────────────────────────── */}
        <Link
          href="/ayarlar"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border
                     text-text-muted hover:bg-surface2 hover:text-text transition-colors text-[11px]"
          title="Ayarlar"
        >
          ⚙️
        </Link>

        {/* ── Logout ────────────────────────────────────── */}
        <button
          onClick={handleLogout}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border
                     text-text-muted hover:bg-surface2 hover:text-red transition-colors text-[11px]"
          title="Çıkış Yap"
        >
          🚪
        </button>

        {/* ── WhatsApp ──────────────────────────────────── */}
        <button
          onClick={() => {
            // TODO: Open WhatsApp quick-send modal
            console.log('WhatsApp modal');
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg
                     bg-[#25D366] text-white text-[11px] font-semibold
                     hover:bg-[#20bd5a] transition-colors"
          title="WhatsApp Gönder"
        >
          📱
        </button>
      </div>
    </header>
  );
}
