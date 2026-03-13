'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Badge type: 'count' shows number, 'red' shows red badge (financial alerts)
type BadgeType = 'count' | 'red';

interface MenuItem {
  href: string;
  icon: string;
  label: string;
  badge?: BadgeType;
}

interface SidebarGroup {
  items: MenuItem[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    items: [
      { href: '/dashboard', icon: '🏛', label: 'Ana Sayfa' },
      { href: '/muvekkillar', icon: '📒', label: 'Rehber', badge: 'count' },
    ],
  },
  {
    items: [
      { href: '/davalar', icon: '📁', label: 'Davalar', badge: 'count' },
      { href: '/icra', icon: '⚡', label: 'İcra', badge: 'count' },
      { href: '/arabuluculuk', icon: '🤝', label: 'Arabuluculuk', badge: 'count' },
      { href: '/danismanlik', icon: '⚖️', label: 'Danışmanlık', badge: 'count' },
      { href: '/ihtarname', icon: '📨', label: 'İhtarname', badge: 'count' },
      { href: '/gorevler', icon: '✅', label: 'Görevler', badge: 'count' },
    ],
  },
  {
    items: [
      { href: '/finans', icon: '💰', label: 'Finans', badge: 'red' },
      { href: '/takvim', icon: '📅', label: 'Takvim', badge: 'count' },
    ],
  },
  {
    items: [
      { href: '/personel', icon: '👥', label: 'Personel' },
      { href: '/arac-kutusu', icon: '🧰', label: 'Araç Kutusu', badge: 'count' },
    ],
  },
];

const bottomItems: MenuItem[] = [
  { href: '/ayarlar', icon: '⚙️', label: 'Ayarlar' },
  { href: '/destek', icon: '🎧', label: 'Destek' },
];

// TODO: Replace with real counts from state/store when available
function useBadgeCounts(): Record<string, number> {
  // Placeholder — in production these come from Supabase queries / app state
  return {};
}

export function Sidebar() {
  const pathname = usePathname();
  const badgeCounts = useBadgeCounts();

  const renderItem = (item: MenuItem) => {
    const isActive =
      item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(item.href);

    const count = badgeCounts[item.href] ?? 0;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium
          transition-all duration-150
          ${isActive
            ? 'bg-gold-dim text-gold'
            : 'text-text-muted hover:bg-surface2 hover:text-text'
          }
        `}
      >
        <span className="text-base w-5 text-center">{item.icon}</span>
        <span className="flex-1">{item.label}</span>
        {item.badge && count > 0 && (
          <span
            className={`
              min-w-[20px] h-5 flex items-center justify-center rounded-full
              text-[10px] font-semibold px-1.5
              ${item.badge === 'red'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-white/10 text-text-muted'
              }
            `}
          >
            {count}
          </span>
        )}
      </Link>
    );
  };

  const separator = (key: string) => (
    <div key={key} className="h-px bg-border mx-2 my-2" />
  );

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-surface border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-border">
        <span className="font-[var(--font-playfair)] text-lg text-gold font-bold tracking-tight">
          LexBase
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {sidebarGroups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && separator(`sep-${gi}`)}
            <div className="space-y-0.5">
              {group.items.map(renderItem)}
            </div>
          </div>
        ))}

        {/* Spacer pushes bottom items down */}
        <div className="flex-1" />
      </nav>

      {/* Bottom Section */}
      <div className="px-2 pb-2">
        {separator('sep-bottom')}
        <div className="space-y-0.5">
          {bottomItems.map(renderItem)}
        </div>

        {/* Version */}
        <div className="mt-3 px-3 pb-1">
          <span className="text-[10px] text-text-dim">v2.1.0</span>
        </div>
      </div>
    </aside>
  );
}
