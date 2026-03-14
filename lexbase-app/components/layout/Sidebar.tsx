'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useDanismanliklar } from '@/lib/hooks/useDanismanlik';
import { useTodolar } from '@/lib/hooks/useTodolar';
import { useFinansUyarilar } from '@/lib/hooks/useFinans';
import { useIhtarnameler } from '@/lib/hooks/useIhtarname';
import { useRol, yetkiVar } from '@/lib/hooks/useRol';

/* ══════════════════════════════════════════════════════════════
   Premium Sidebar — Responsive + Mobil Toggle
   - Desktop (lg+): Her zaman görünür, fixed 200px
   - Mobil (<lg): Gizli, hamburger ile açılır, backdrop overlay
   ══════════════════════════════════════════════════════════════ */

type BadgeType = 'count' | 'red';

interface MenuItem {
  href: string;
  icon: string;
  label: string;
  badge?: BadgeType;
  countKey?: string;
  yetki?: string; // gerekli yetki (yoksa herkese görünür)
}

interface SidebarGroup {
  items: MenuItem[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    items: [
      { href: '/dashboard', icon: '🏛', label: 'Ana Sayfa' },
      { href: '/muvekkillar', icon: '📒', label: 'Rehber', badge: 'count', countKey: 'muvekkil' },
    ],
  },
  {
    items: [
      { href: '/davalar', icon: '📁', label: 'Davalar', badge: 'count', countKey: 'dava' },
      { href: '/icra', icon: '⚡', label: 'İcra', badge: 'count', countKey: 'icra' },
      { href: '/arabuluculuk', icon: '🤝', label: 'Arabuluculuk', badge: 'count', countKey: 'arabuluculuk' },
      { href: '/danismanlik', icon: '⚖️', label: 'Danışmanlık', badge: 'count', countKey: 'danismanlik' },
      { href: '/ihtarname', icon: '📨', label: 'İhtarname', badge: 'count', countKey: 'ihtarname' },
      { href: '/gorevler', icon: '✅', label: 'Görevler', badge: 'count', countKey: 'gorev' },
    ],
  },
  {
    items: [
      { href: '/finans', icon: '💰', label: 'Finans', badge: 'red', countKey: 'finans', yetki: 'finans:oku' },
      { href: '/takvim', icon: '📅', label: 'Takvim', badge: 'count', countKey: 'takvim' },
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
  { href: '/ayarlar', icon: '⚙️', label: 'Ayarlar', yetki: 'ayarlar:oku' },
  { href: '/destek', icon: '🎧', label: 'Destek' },
];

/* Hook: gerçek badge sayılarını hesapla */
function useBadgeCounts(): Record<string, number> {
  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const { data: danismanliklar } = useDanismanliklar();
  const { data: gorevler } = useTodolar();
  const { data: uyarilar } = useFinansUyarilar();
  const { data: ihtarnameler } = useIhtarnameler();

  return {
    muvekkil: muvekkillar?.length ?? 0,
    dava: davalar?.filter((d) => d.durum === 'Aktif' || d.durum === 'Devam Ediyor').length ?? 0,
    icra: icralar?.filter((i) => i.durum !== 'Kapandı').length ?? 0,
    danismanlik: danismanliklar?.filter((d) => d.durum === 'Aktif' || d.durum === 'Devam Ediyor').length ?? 0,
    gorev: gorevler?.filter((g) => g.durum !== 'Tamamlandı' && g.durum !== 'İptal').length ?? 0,
    finans: Array.isArray(uyarilar) ? uyarilar.length : 0,
    arabuluculuk: 0,
    ihtarname: ihtarnameler?.filter((i) => !i._silindi && !i._arsivlendi && i.durum !== 'Sonuçlandı').length ?? 0,
    takvim: 0,
  };
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const badgeCounts = useBadgeCounts();
  const rol = useRol();

  const renderItem = (item: MenuItem) => {
    const isActive =
      item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(item.href);

    const count = item.countKey ? (badgeCounts[item.countKey] ?? 0) : 0;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`
          flex items-center gap-2 px-3 py-[7px] mx-2 my-[1px]
          text-[13px] rounded-lg transition-all duration-200 group
          ${isActive
            ? 'bg-[rgba(212,175,55,0.12)] text-[#D4AF37] font-bold shadow-[inset_0_0_0_1px_rgba(212,175,55,0.08)]'
            : 'text-[#8B95A5] font-medium hover:text-white hover:bg-[rgba(212,175,55,0.06)]'
          }
        `}
      >
        <span className="text-[14px] w-[18px] text-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && count > 0 && (
          <span
            className={`
              ml-auto rounded-full text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none
              ${item.badge === 'red'
                ? 'bg-[#e74c3c] text-white shadow-[0_0_8px_rgba(231,76,60,0.3)]'
                : 'bg-[#D4AF37] text-[#0D1117]'
              }
            `}
          >
            {count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Backdrop overlay — sadece mobilde, sidebar açıkken */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 bottom-0 w-[200px] bg-[#0D1117] border-r border-white/[0.06] flex flex-col z-50
          transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-white/[0.06]">
          <Link href="/dashboard" onClick={onClose} className="font-[var(--font-playfair)] text-lg font-bold tracking-tight hover:opacity-90 transition-opacity">
            <span className="text-[#D4AF37]">Lex</span><span className="text-white">Base</span>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 pt-4 overflow-y-auto flex flex-col">
          {sidebarGroups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <div className="h-px bg-white/[0.04] mx-3 my-1.5" />}
              <div className="space-y-[1px]">
                {group.items.filter((item) => !item.yetki || yetkiVar(rol, item.yetki)).map(renderItem)}
              </div>
            </div>
          ))}

          {/* Spacer */}
          <div className="flex-1" />
        </nav>

        {/* Bottom Section */}
        <div className="pb-3">
          <div className="h-px bg-white/[0.04] mx-3 mb-1.5" />
          <div className="space-y-[1px]">
            {bottomItems.filter((item) => !item.yetki || yetkiVar(rol, item.yetki)).map(renderItem)}
          </div>

          {/* Version */}
          <div className="text-center mt-2">
            <span className="text-[9px] text-white/15 tracking-wider">v2.1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
