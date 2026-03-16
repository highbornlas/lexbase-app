'use client';

import { usePlatformIstatistik, useAdminBilgi } from '@/lib/hooks/useAdmin';

/* ══════════════════════════════════════════════════════════════
   Admin Dashboard — Platform Genel Bakış
   ══════════════════════════════════════════════════════════════ */

interface KpiCardProps {
  icon: string;
  label: string;
  value: number | string;
  alt?: string;
  renk?: 'amber' | 'emerald' | 'blue' | 'red' | 'purple' | 'zinc';
}

function KpiCard({ icon, label, value, alt, renk = 'amber' }: KpiCardProps) {
  const renkler = {
    amber: 'border-amber-500/20 bg-amber-500/5',
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    red: 'border-red-500/20 bg-red-500/5',
    purple: 'border-purple-500/20 bg-purple-500/5',
    zinc: 'border-zinc-700 bg-zinc-800/30',
  };

  const degerRenk = {
    amber: 'text-amber-500',
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    zinc: 'text-zinc-300',
  };

  return (
    <div className={`rounded-xl border p-4 ${renkler[renk]} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[11px] text-zinc-500 font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold font-[var(--font-playfair)] ${degerRenk[renk]}`}>
        {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
      </div>
      {alt && <div className="text-[10px] text-zinc-600 mt-1">{alt}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: istatistik, isLoading } = usePlatformIstatistik();
  const { admin } = useAdminBilgi();

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Başlık */}
      <div>
        <h1 className="text-xl font-bold text-zinc-200">
          Hoş geldin, <span className="text-amber-500">{admin?.ad || 'Admin'}</span>
        </h1>
        <p className="text-[12px] text-zinc-600 mt-0.5">
          Platform genelindeki tüm verileri buradan yönetebilirsin
        </p>
      </div>

      {/* Yükleniyor */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-800/20 p-4 animate-pulse">
              <div className="h-3 bg-zinc-800 rounded w-20 mb-3" />
              <div className="h-7 bg-zinc-800 rounded w-12" />
            </div>
          ))}
        </div>
      )}

      {/* KPI Grid */}
      {istatistik && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            icon="🏢"
            label="Toplam Büro"
            value={istatistik.toplam_buro}
            renk="amber"
          />
          <KpiCard
            icon="👤"
            label="Toplam Kullanıcı"
            value={istatistik.toplam_kullanici}
            renk="blue"
          />
          <KpiCard
            icon="🟢"
            label="Bugünkü Giriş"
            value={istatistik.bugunki_giris}
            alt="Son 24 saat"
            renk="emerald"
          />
          <KpiCard
            icon="📅"
            label="Haftalık Giriş"
            value={istatistik.haftalik_giris}
            alt="Son 7 gün"
            renk="emerald"
          />
          <KpiCard
            icon="💳"
            label="Aktif Abonelik"
            value={istatistik.aktif_abonelik}
            renk="purple"
          />
          <KpiCard
            icon="📁"
            label="Toplam Dava"
            value={istatistik.toplam_dava}
            renk="zinc"
          />
          <KpiCard
            icon="⚡"
            label="Toplam İcra"
            value={istatistik.toplam_icra}
            renk="zinc"
          />
          <KpiCard
            icon="📒"
            label="Toplam Müvekkil"
            value={istatistik.toplam_muvekkil}
            renk="zinc"
          />
          <KpiCard
            icon="🎧"
            label="Bekleyen Destek"
            value={istatistik.bekleyen_destek}
            renk={istatistik.bekleyen_destek > 0 ? 'red' : 'zinc'}
          />
          <KpiCard
            icon="📢"
            label="Aktif Duyuru"
            value={istatistik.aktif_duyuru}
            renk="zinc"
          />
        </div>
      )}

      {/* Hızlı Aksiyonlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Son Kayıtlar */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-[12px] font-bold text-zinc-400 mb-3 flex items-center gap-2">
            <span>⚡</span> Hızlı Erişim
          </h3>
          <div className="space-y-1.5">
            {[
              { href: '/admin_panel/burolar', label: 'Büro Yönetimi', icon: '🏢' },
              { href: '/admin_panel/planlar', label: 'Plan & Fiyat Düzenle', icon: '📦' },
              { href: '/admin_panel/duyurular', label: 'Duyuru Yayınla', icon: '📢' },
              { href: '/admin_panel/lisanslar', label: 'Lisans Kodu Oluştur', icon: '🔑' },
              { href: '/admin_panel/destek', label: 'Destek Talepleri', icon: '🎧' },
              { href: '/admin_panel/parametreler', label: 'Hukuki Parametreler', icon: '⚖️' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]
                           text-zinc-500 hover:text-amber-500 hover:bg-zinc-800/50
                           transition-all group"
              >
                <span className="group-hover:scale-110 transition-transform">{item.icon}</span>
                <span>{item.label}</span>
                <span className="ml-auto text-zinc-700 group-hover:text-zinc-500">→</span>
              </a>
            ))}
          </div>
        </div>

        {/* Platform Durumu */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-[12px] font-bold text-zinc-400 mb-3 flex items-center gap-2">
            <span>🩺</span> Platform Durumu
          </h3>
          <div className="space-y-2.5">
            {[
              { label: 'Veritabanı', durum: 'aktif' },
              { label: 'Auth Servisi', durum: 'aktif' },
              { label: 'Storage', durum: 'aktif' },
              { label: 'Edge Functions', durum: 'aktif' },
              { label: 'Cloudflare Pages', durum: 'aktif' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">{item.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-emerald-500 font-medium">Aktif</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Yaklaşan Görevler */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-[12px] font-bold text-zinc-400 mb-3 flex items-center gap-2">
            <span>📋</span> Yapılacaklar
          </h3>
          <div className="space-y-2">
            {[
              { text: 'Süresi dolacak abonelikleri kontrol et', oncelik: 'yuksek' },
              { text: 'Bekleyen destek taleplerini yanıtla', oncelik: 'normal' },
              { text: 'Haftalık analitik raporunu incele', oncelik: 'dusuk' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-zinc-800/30"
              >
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  item.oncelik === 'yuksek' ? 'bg-red-500' :
                  item.oncelik === 'normal' ? 'bg-amber-500' :
                  'bg-zinc-600'
                }`} />
                <span className="text-[11px] text-zinc-400">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
