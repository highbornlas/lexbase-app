'use client';

import { useState, useCallback } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';

/* ══════════════════════════════════════════════════════════════
   Admin Layout — Platform Yönetim Paneli

   Uygulama layout'undan (app) tamamen bağımsız:
   - Kendi sidebar, topbar, tema
   - AdminGuard ile superadmin yetki kontrolü
   - Koyu/minimal tema (zinc + amber)
   ══════════════════════════════════════════════════════════════ */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#080a0e]">
        <AdminSidebar open={sidebarOpen} onClose={closeSidebar} />

        <div className="lg:ml-[220px] ml-0 transition-[margin] duration-300 flex flex-col min-h-screen">
          <AdminTopbar onToggleSidebar={toggleSidebar} />

          <main className="px-4 sm:px-6 py-5 flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-zinc-800/30 px-5 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-700">
                LexBase Admin Panel — Platform Yönetimi
              </span>
              <span className="text-[9px] text-zinc-700">v2.1.0</span>
            </div>
          </footer>
        </div>
      </div>
    </AdminGuard>
  );
}
