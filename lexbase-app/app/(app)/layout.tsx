'use client';

import { useState, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { InfoModal } from '@/components/ui/InfoModal';
import { InactivityWarning } from '@/components/auth/InactivityWarning';
import { FaizOranProvider } from '@/components/providers/FaizOranProvider';
import {
  KullanimKosullari, GizlilikPolitikasi, KvkkAydinlatma,
  VeriGuvenligi, CerezAyarlari,
} from '@/lib/legal-content';

type YasalSayfa = 'kullanim' | 'gizlilik' | 'kvkk' | 'veri' | 'cerez' | null;

const YASAL_BASLIKLAR: Record<string, string> = {
  kullanim: 'Kullanım Koşulları',
  gizlilik: 'Gizlilik Politikası',
  kvkk: 'KVKK Aydınlatma Metni',
  veri: 'Veri Güvenliği',
  cerez: 'Çerez Ayarları',
};

const YASAL_ICERIKLER: Record<string, React.FC> = {
  kullanim: KullanimKosullari,
  gizlilik: GizlilikPolitikasi,
  kvkk: KvkkAydinlatma,
  veri: VeriGuvenligi,
  cerez: CerezAyarlari,
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [yasalSayfa, setYasalSayfa] = useState<YasalSayfa>(null);

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const YasalIcerik = yasalSayfa ? YASAL_ICERIKLER[yasalSayfa] : null;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg">
        <Sidebar open={sidebarOpen} onClose={closeSidebar} />
        <div className="lg:ml-[200px] ml-0 transition-[margin] duration-300 flex flex-col min-h-screen">
          <Topbar onToggleSidebar={toggleSidebar} />
          <main className="px-3 sm:px-5 py-4 flex-1">
            <ErrorBoundary>
              <FaizOranProvider>
                {children}
              </FaizOranProvider>
            </ErrorBoundary>
          </main>
          <footer className="border-t border-border/30 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
              <span className="text-[10px] text-text-dim">&copy; {new Date().getFullYear()} LexBase — Hukuk Bürosu Yönetim Platformu</span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {([
                  ['kullanim', 'Kullanım Koşulları'],
                  ['gizlilik', 'Gizlilik Politikası'],
                  ['kvkk', 'KVKK'],
                  ['veri', 'Veri Güvenliği'],
                  ['cerez', 'Çerez Ayarları'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setYasalSayfa(key)}
                    className="text-[10px] text-text-dim hover:text-gold transition-colors"
                  >
                    {label}
                  </button>
                ))}
                <span className="text-[10px] text-text-dim">v2.1.0</span>
              </div>
            </div>
          </footer>
        </div>

        {/* Hareketsizlik Uyarısı */}
        <InactivityWarning />

        {/* Yasal İçerik Modal */}
        <InfoModal
          open={!!yasalSayfa}
          onClose={() => setYasalSayfa(null)}
          title={yasalSayfa ? YASAL_BASLIKLAR[yasalSayfa] : ''}
        >
          {YasalIcerik && <YasalIcerik />}
        </InfoModal>
      </div>
    </AuthGuard>
  );
}
