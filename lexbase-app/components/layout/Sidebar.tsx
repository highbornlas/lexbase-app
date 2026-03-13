'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/muvekkillar', icon: '👥', label: 'Müvekkiller' },
  { href: '/davalar', icon: '⚖️', label: 'Davalar' },
  { href: '/icra', icon: '📋', label: 'İcra Dosyaları' },
  { href: '/finans', icon: '💰', label: 'Finans' },
  { href: '/takvim', icon: '📅', label: 'Takvim' },
  { href: '/gorevler', icon: '✅', label: 'Görevler' },
  { href: '/ayarlar', icon: '⚙️', label: 'Ayarlar' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-surface border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-border">
        <span className="font-[var(--font-playfair)] text-lg text-gold font-bold tracking-tight">
          LexBase
        </span>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
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
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <div className="text-[10px] text-text-dim">
          LexBase v3.0.0-beta
        </div>
      </div>
    </aside>
  );
}
