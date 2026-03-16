'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminBilgi } from '@/lib/hooks/useAdmin';

/* ══════════════════════════════════════════════════════════════
   Admin Sidebar — Platform Yönetim Navigasyonu
   Koyu tema, uygulama sidebar'ından bağımsız tasarım
   ══════════════════════════════════════════════════════════════ */

interface AdminMenuItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}

interface AdminMenuGroup {
  title?: string;
  items: AdminMenuItem[];
}

const menuGroups: AdminMenuGroup[] = [
  {
    items: [
      { href: '/admin_panel', icon: '📊', label: 'Dashboard' },
    ],
  },
  {
    title: 'YÖNETİM',
    items: [
      { href: '/admin_panel/burolar', icon: '🏢', label: 'Bürolar' },
      { href: '/admin_panel/kullanicilar', icon: '👤', label: 'Kullanıcılar' },
    ],
  },
  {
    title: 'FİNANS',
    items: [
      { href: '/admin_panel/abonelikler', icon: '💳', label: 'Abonelikler' },
      { href: '/admin_panel/planlar', icon: '📦', label: 'Planlar & Fiyatlar' },
      { href: '/admin_panel/lisanslar', icon: '🔑', label: 'Lisans Kodları' },
      { href: '/admin_panel/indirimler', icon: '🏷️', label: 'İndirimler' },
      { href: '/admin_panel/gelirler', icon: '💰', label: 'Gelir Raporu' },
    ],
  },
  {
    title: 'İLETİŞİM',
    items: [
      { href: '/admin_panel/duyurular', icon: '📢', label: 'Duyurular' },
      { href: '/admin_panel/destek', icon: '🎧', label: 'Destek Talepleri' },
    ],
  },
  {
    title: 'SİSTEM',
    items: [
      { href: '/admin_panel/analitik', icon: '📈', label: 'Analitik' },
      { href: '/admin_panel/audit', icon: '🔍', label: 'Audit Log' },
      { href: '/admin_panel/parametreler', icon: '⚖️', label: 'Hukuki Parametreler' },
      { href: '/admin_panel/ayarlar', icon: '⚙️', label: 'Platform Ayarları' },
    ],
  },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { admin } = useAdminBilgi();

  const isActive = (href: string) => {
    if (href === '/admin_panel') return pathname === '/admin_panel';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 bottom-0 w-[220px] bg-[#0a0c10] border-r border-zinc-800/50
          flex flex-col z-50 transition-transform duration-300
          lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-zinc-800/50">
          <Link href="/admin_panel" onClick={onClose} className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <span className="font-bold text-sm tracking-tight">
              <span className="text-amber-500">Lex</span>
              <span className="text-zinc-300">Base</span>
              <span className="text-zinc-600 ml-1 text-[10px] font-normal">ADMIN</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {menuGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
              {group.title && (
                <div className="px-4 py-1.5 text-[9px] font-bold text-zinc-600 uppercase tracking-[0.1em]">
                  {group.title}
                </div>
              )}
              <div className="space-y-[1px]">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center gap-2.5 px-4 py-2 mx-2 rounded-lg text-[13px]
                      transition-all duration-150 group
                      ${isActive(item.href)
                        ? 'bg-amber-500/10 text-amber-500 font-semibold'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                      }
                    `}
                  >
                    <span className="text-[14px] w-[18px] text-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto rounded-full bg-red-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: Uygulamaya dön + Admin bilgisi */}
        <div className="border-t border-zinc-800/50 p-3 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]
                       text-zinc-500 hover:text-amber-500 hover:bg-zinc-800/50 transition-all"
          >
            <span>←</span>
            <span>Uygulamaya Dön</span>
          </Link>

          {admin && (
            <div className="px-3 py-1.5">
              <div className="text-[11px] text-zinc-400 truncate">{admin.ad}</div>
              <div className="text-[9px] text-zinc-600 truncate">{admin.email}</div>
              <span className={`
                inline-block mt-1 text-[8px] font-bold px-1.5 py-0.5 rounded
                ${admin.yetki_seviye === 'super'
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'bg-zinc-700 text-zinc-400'}
              `}>
                {admin.yetki_seviye === 'super' ? 'SUPER ADMIN' : 'ADMIN'}
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
