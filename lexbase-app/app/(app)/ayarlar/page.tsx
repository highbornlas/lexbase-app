'use client';

import { useState } from 'react';
import { useYetki } from '@/lib/hooks/useRol';
import { ProfilTab } from '@/components/modules/ayarlar/ProfilTab';
import { BuroBilgileriTab } from '@/components/modules/ayarlar/BuroBilgileriTab';
import { EkipTab } from '@/components/modules/ayarlar/EkipTab';
import { GuvenlikTab } from '@/components/modules/ayarlar/GuvenlikTab';
import { BildirimlerTab } from '@/components/modules/ayarlar/BildirimlerTab';
import { GorunumTab } from '@/components/modules/ayarlar/GorunumTab';
import { CopKutusuTab } from '@/components/modules/ayarlar/CopKutusuTab';
import { VeriYonetimiTab } from '@/components/modules/ayarlar/VeriYonetimiTab';

/* ══════════════════════════════════════════════════════════════
   Ayarlar Sayfası — Thin shell, tüm mantık tab bileşenlerinde
   ══════════════════════════════════════════════════════════════ */

const TABS = [
  { key: 'profil', label: 'Profil', icon: '👤' },
  { key: 'buro', label: 'Büro Bilgileri', icon: '🏢' },
  { key: 'ekip', label: 'Ekip', icon: '👥', yetki: 'kullanici:yonet' },
  { key: 'guvenlik', label: 'Güvenlik', icon: '🔒' },
  { key: 'bildirimler', label: 'Bildirimler', icon: '🔔' },
  { key: 'gorunum', label: 'Görünüm', icon: '🎨' },
  { key: 'cop', label: 'Çöp Kutusu', icon: '🗑️' },
  { key: 'veri', label: 'Veri Yönetimi', icon: '💾', yetki: 'ayarlar:duzenle' },
];

export default function AyarlarPage() {
  const [aktifTab, setAktifTab] = useState('profil');
  const { yetkili: yonetici } = useYetki('kullanici:yonet');
  const { yetkili: ayarDuzenle } = useYetki('ayarlar:duzenle');

  // Yetki kontrolüne göre gösterilecek tablar
  const gorunurTabs = TABS.filter((tab) => {
    if (tab.yetki === 'kullanici:yonet' && !yonetici) return false;
    if (tab.yetki === 'ayarlar:duzenle' && !ayarDuzenle) return false;
    return true;
  });

  return (
    <div>
      <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold mb-6">Ayarlar</h1>

      <div className="grid grid-cols-[200px_1fr] gap-4">
        {/* Sol menü */}
        <div className="bg-surface border border-border rounded-lg p-2 self-start sticky top-20">
          {gorunurTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAktifTab(tab.key)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                aktifTab === tab.key
                  ? 'bg-gold-dim text-gold'
                  : 'text-text-muted hover:bg-surface2 hover:text-text'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* İçerik */}
        <div className="bg-surface border border-border rounded-lg p-6">
          {aktifTab === 'profil' && <ProfilTab />}
          {aktifTab === 'buro' && <BuroBilgileriTab />}
          {aktifTab === 'ekip' && <EkipTab />}
          {aktifTab === 'guvenlik' && <GuvenlikTab />}
          {aktifTab === 'bildirimler' && <BildirimlerTab />}
          {aktifTab === 'gorunum' && <GorunumTab />}
          {aktifTab === 'cop' && <CopKutusuTab />}
          {aktifTab === 'veri' && <VeriYonetimiTab />}
        </div>
      </div>
    </div>
  );
}
