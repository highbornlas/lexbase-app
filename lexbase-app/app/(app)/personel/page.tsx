'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePersoneller, usePersonelSil, type Personel } from '@/lib/hooks/usePersonel';
import { useTodolar } from '@/lib/hooks/useTodolar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useYetki } from '@/lib/hooks/useRol';
import { PersonelModal } from '@/components/modules/PersonelModal';

/* ══════════════════════════════════════════════════════════════
   Personel Sayfası — FAZ P2 Yeniden Tasarım
   - Actionable KPI kartları (kapasite, boşta, davet bekleyen)
   - Tablo + Kart toggle görünüm
   - Gelişmiş kartlar (görev sayısı, dosya sayısı, durum badge)
   - Silme + pasifleştirme + durum filtresi
   ══════════════════════════════════════════════════════════════ */

const ROL_RENK: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  sahip: { bg: 'bg-gold-dim', text: 'text-gold', label: 'Büro Sahibi', icon: '👑' },
  yonetici: { bg: 'bg-gold-dim', text: 'text-gold', label: 'Yönetici', icon: '🛡️' },
  avukat: { bg: 'bg-blue-400/10', text: 'text-blue-400', label: 'Avukat', icon: '⚖️' },
  stajyer: { bg: 'bg-purple-400/10', text: 'text-purple-400', label: 'Stajyer', icon: '📚' },
  sekreter: { bg: 'bg-green-dim', text: 'text-green', label: 'Sekreter', icon: '📋' },
};

type RolFiltre = 'hepsi' | 'sahip' | 'yonetici' | 'avukat' | 'stajyer' | 'sekreter';
type DurumFiltre = 'hepsi' | 'aktif' | 'davet_gonderildi' | 'pasif';
type Gorunum = 'kart' | 'tablo';

const ROL_FILTRE_LABELS: Record<RolFiltre, string> = {
  hepsi: 'Tüm Roller',
  sahip: 'Büro Sahibi',
  yonetici: 'Yönetici',
  avukat: 'Avukat',
  stajyer: 'Stajyer',
  sekreter: 'Sekreter',
};

const DURUM_LABELS: Record<DurumFiltre, string> = {
  hepsi: 'Tüm Durumlar',
  aktif: 'Aktif',
  davet_gonderildi: 'Davet Bekleyen',
  pasif: 'Pasif',
};

const DURUM_BADGE: Record<string, { label: string; renk: string; bg: string }> = {
  aktif: { label: 'Aktif', renk: 'text-green', bg: 'bg-green-dim border-green/20' },
  davet_gonderildi: { label: 'Davet Bekleyen', renk: 'text-gold', bg: 'bg-gold-dim border-gold/20' },
  pasif: { label: 'Pasif', renk: 'text-text-dim', bg: 'bg-surface2 border-border' },
};

// ── Personel bazlı istatistik hesaplama ─────────────────────
interface PersonelStat {
  gorevSayisi: number;
  gecikmisSayisi: number;
  tamamlananSayisi: number;
  dosyaSayisi: number;
}

function usePersonelIstatistik(personeller: Personel[] | undefined) {
  const { data: gorevler } = useTodolar();
  const { data: davalar } = useDavalar();

  return useMemo(() => {
    const map = new Map<string, PersonelStat>();
    if (!personeller) return map;

    for (const p of personeller) {
      const pid = p.id;
      const ad = (p.ad || '').toLocaleLowerCase('tr');

      // Görev istatistikleri (atananId ile eşleşme)
      const kisininGorevleri = (gorevler || []).filter(
        (g) => g.atananId === pid || (g.atananId || '').toLocaleLowerCase('tr') === ad
      );
      const gecikmisSayisi = kisininGorevleri.filter(
        (g) => g.durum !== 'Tamamlandı' && g.durum !== 'İptal' && g.sonTarih && new Date(g.sonTarih) < new Date()
      ).length;
      const tamamlananSayisi = kisininGorevleri.filter((g) => g.durum === 'Tamamlandı').length;
      const aktifGorevSayisi = kisininGorevleri.filter(
        (g) => g.durum !== 'Tamamlandı' && g.durum !== 'İptal'
      ).length;

      // Dosya istatistikleri (sorumlu alanı)
      const dosyaSayisi = (davalar || []).filter(
        (d) => {
          const sorumlu = ((d as Record<string, unknown>).sorumlu_avukat || (d as Record<string, unknown>).sorumlu || '') as string;
          return sorumlu === pid || sorumlu.toLocaleLowerCase('tr') === ad;
        }
      ).length;

      map.set(pid, {
        gorevSayisi: aktifGorevSayisi,
        gecikmisSayisi,
        tamamlananSayisi,
        dosyaSayisi,
      });
    }
    return map;
  }, [personeller, gorevler, davalar]);
}

export default function PersonelPage() {
  useEffect(() => { document.title = 'Personel | LexBase'; }, []);

  const { data: personeller, isLoading } = usePersoneller();
  const { yetkili: yoneticiMi } = useYetki('kullanici:yonet');
  const sil = usePersonelSil();
  const istatistikler = usePersonelIstatistik(personeller);

  const [modalAcik, setModalAcik] = useState(false);
  const [secili, setSecili] = useState<Personel | null>(null);
  const [arama, setArama] = useState('');
  const [rolFiltre, setRolFiltre] = useState<RolFiltre>('hepsi');
  const [durumFiltre, setDurumFiltre] = useState<DurumFiltre>('hepsi');
  const [gorunum, setGorunum] = useState<Gorunum>('kart');
  const [silmeOnay, setSilmeOnay] = useState<string | null>(null);

  // ── KPI hesaplama ─────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!personeller) return { toplam: 0, aktif: 0, kapasiteAsimi: 0, bosta: 0, davetBekleyen: 0 };

    const aktifPersonel = personeller.filter((p) => p.durum === 'aktif' || !p.durum);
    let kapasiteAsimi = 0;
    let bosta = 0;

    for (const p of aktifPersonel) {
      const stat = istatistikler.get(p.id);
      if (!stat) continue;
      // 5+ açık görev veya 2+ gecikmiş = kapasite aşımı
      if (stat.gorevSayisi >= 5 || stat.gecikmisSayisi >= 2) kapasiteAsimi++;
      // 0 görev ve 0 dosya = boşta
      else if (stat.gorevSayisi === 0 && stat.dosyaSayisi === 0) bosta++;
    }

    return {
      toplam: personeller.length,
      aktif: aktifPersonel.length,
      kapasiteAsimi,
      bosta,
      davetBekleyen: personeller.filter((p) => p.durum === 'davet_gonderildi').length,
    };
  }, [personeller, istatistikler]);

  // ── Filtreleme ────────────────────────────────────────────
  const filtrelenmis = useMemo(() => {
    if (!personeller) return [];
    let sonuc = [...personeller];

    if (rolFiltre !== 'hepsi') sonuc = sonuc.filter((p) => p.rol === rolFiltre);
    if (durumFiltre !== 'hepsi') sonuc = sonuc.filter((p) => (p.durum || 'aktif') === durumFiltre);

    if (arama) {
      const q = arama.toLocaleLowerCase('tr');
      sonuc = sonuc.filter((p) => {
        const ad = (p.ad || '').toLocaleLowerCase('tr');
        const email = (p.email || '').toLocaleLowerCase('tr');
        const tel = (p.tel || '').toLocaleLowerCase('tr');
        const baroSicil = (p.baroSicil || '').toLocaleLowerCase('tr');
        return ad.includes(q) || email.includes(q) || tel.includes(q) || baroSicil.includes(q);
      });
    }

    return sonuc;
  }, [personeller, arama, rolFiltre, durumFiltre]);

  const aktifFiltre = arama || rolFiltre !== 'hepsi' || durumFiltre !== 'hepsi';

  async function handleSil(id: string) {
    await sil.mutateAsync(id);
    setSilmeOnay(null);
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
          Ekip Yönetimi
          {personeller && <span className="text-sm font-normal text-text-muted ml-2">({personeller.length} kişi)</span>}
        </h1>
        {yoneticiMi && (
          <button
            onClick={() => { setSecili(null); setModalAcik(true); }}
            className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
          >
            + Personel Ekle
          </button>
        )}
      </div>

      {/* Actionable KPI Strip */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <ActionKpi
          label="Toplam Ekip"
          value={kpis.toplam}
          icon="👥"
          color="text-text"
          onClick={() => { setRolFiltre('hepsi'); setDurumFiltre('hepsi'); }}
        />
        <ActionKpi
          label="Aktif"
          value={kpis.aktif}
          icon="✅"
          color="text-green"
          onClick={() => setDurumFiltre('aktif')}
        />
        <ActionKpi
          label="Kapasite Aşımı"
          value={kpis.kapasiteAsimi}
          icon="🔥"
          color="text-red"
          pulse={kpis.kapasiteAsimi > 0}
          desc="5+ görev veya 2+ gecikmiş"
        />
        <ActionKpi
          label="Boşta"
          value={kpis.bosta}
          icon="💤"
          color="text-gold"
          desc="Görev/dosya atanmamış"
        />
        <ActionKpi
          label="Davet Bekleyen"
          value={kpis.davetBekleyen}
          icon="📩"
          color="text-blue-400"
          onClick={() => setDurumFiltre('davet_gonderildi')}
        />
      </div>

      {/* Arama & Filtre Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Ad, e-posta, telefon ara..."
            className="px-3 py-2 bg-surface2 border border-border rounded-lg text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors w-56"
          />
          <select
            value={rolFiltre}
            onChange={(e) => setRolFiltre(e.target.value as RolFiltre)}
            className="px-2.5 py-2 bg-surface2 border border-border rounded-lg text-xs text-text-muted focus:outline-none focus:border-gold transition-colors cursor-pointer"
          >
            {(Object.keys(ROL_FILTRE_LABELS) as RolFiltre[]).map((key) => (
              <option key={key} value={key}>{ROL_FILTRE_LABELS[key]}</option>
            ))}
          </select>
          <select
            value={durumFiltre}
            onChange={(e) => setDurumFiltre(e.target.value as DurumFiltre)}
            className="px-2.5 py-2 bg-surface2 border border-border rounded-lg text-xs text-text-muted focus:outline-none focus:border-gold transition-colors cursor-pointer"
          >
            {(Object.keys(DURUM_LABELS) as DurumFiltre[]).map((key) => (
              <option key={key} value={key}>{DURUM_LABELS[key]}</option>
            ))}
          </select>
          {aktifFiltre && (
            <button
              onClick={() => { setArama(''); setRolFiltre('hepsi'); setDurumFiltre('hepsi'); }}
              className="px-2.5 py-1.5 text-[11px] font-medium text-gold hover:text-gold-light transition-colors"
            >
              Temizle
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sonuc sayisi */}
          {personeller && personeller.length > 0 && (
            <span className="text-[11px] text-text-muted mr-2">
              {aktifFiltre ? `${filtrelenmis.length} / ${personeller.length}` : `${personeller.length}`} personel
            </span>
          )}
          {/* Görünüm toggle */}
          <div className="flex bg-surface2 border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setGorunum('kart')}
              className={`px-2.5 py-1.5 text-[11px] transition-colors ${gorunum === 'kart' ? 'bg-gold-dim text-gold font-semibold' : 'text-text-muted hover:text-text'}`}
            >
              ▦ Kart
            </button>
            <button
              onClick={() => setGorunum('tablo')}
              className={`px-2.5 py-1.5 text-[11px] transition-colors ${gorunum === 'tablo' ? 'bg-gold-dim text-gold font-semibold' : 'text-text-muted hover:text-text'}`}
            >
              ☰ Tablo
            </button>
          </div>
        </div>
      </div>

      {/* İçerik */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>
      ) : !personeller || personeller.length === 0 ? (
        <EmptyState yoneticiMi={yoneticiMi} onEkle={() => { setSecili(null); setModalAcik(true); }} />
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-lg">
          <div className="text-4xl mb-3">🔍</div>
          <div className="text-sm text-text-muted">Arama sonucu bulunamadı</div>
          <button onClick={() => { setArama(''); setRolFiltre('hepsi'); setDurumFiltre('hepsi'); }} className="mt-2 text-xs text-gold hover:text-gold-light transition-colors">Filtreleri temizle</button>
        </div>
      ) : gorunum === 'kart' ? (
        /* ── KART GÖRÜNÜM ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1">
          {filtrelenmis.map((p) => (
            <PersonelKart
              key={p.id}
              personel={p}
              stat={istatistikler.get(p.id)}
              yoneticiMi={yoneticiMi}
              silmeOnay={silmeOnay === p.id}
              onDuzenle={() => { setSecili(p); setModalAcik(true); }}
              onSilmeOnayla={() => setSilmeOnay(p.id)}
              onSil={() => handleSil(p.id)}
              onIptal={() => setSilmeOnay(null)}
              siliyor={sil.isPending}
            />
          ))}
        </div>
      ) : (
        /* ── TABLO GÖRÜNÜM ── */
        <PersonelTablo
          personeller={filtrelenmis}
          istatistikler={istatistikler}
          yoneticiMi={yoneticiMi}
          silmeOnay={silmeOnay}
          onDuzenle={(p) => { setSecili(p); setModalAcik(true); }}
          onSilmeOnayla={(id) => setSilmeOnay(id)}
          onSil={(id) => handleSil(id)}
          onIptal={() => setSilmeOnay(null)}
          siliyor={sil.isPending}
        />
      )}

      <PersonelModal open={modalAcik} onClose={() => setModalAcik(false)} personel={secili} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Actionable KPI Kartı
   ══════════════════════════════════════════════════════════════ */
function ActionKpi({ label, value, icon, color, pulse, desc, onClick }: {
  label: string; value: number; icon: string; color: string; pulse?: boolean; desc?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-surface border border-border rounded-lg px-3 py-3 text-center transition-all hover:border-gold/30 hover:shadow-sm ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      } ${pulse ? 'ring-1 ring-red/30' : ''}`}
    >
      <div className="text-lg mb-0.5">{icon}</div>
      <div className={`font-[var(--font-playfair)] text-xl font-bold ${color} ${pulse ? 'animate-pulse' : ''}`}>{value}</div>
      <div className="text-[10px] text-text-muted uppercase tracking-wider">{label}</div>
      {desc && <div className="text-[9px] text-text-dim mt-0.5">{desc}</div>}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   Personel Kartı — Gelişmiş
   ══════════════════════════════════════════════════════════════ */
function PersonelKart({ personel: p, stat, yoneticiMi, silmeOnay, onDuzenle, onSilmeOnayla, onSil, onIptal, siliyor }: {
  personel: Personel;
  stat?: PersonelStat;
  yoneticiMi: boolean;
  silmeOnay: boolean;
  onDuzenle: () => void;
  onSilmeOnayla: () => void;
  onSil: () => void;
  onIptal: () => void;
  siliyor: boolean;
}) {
  const rol = ROL_RENK[p.rol || ''] || { bg: 'bg-surface2', text: 'text-text-muted', label: p.rol || '—', icon: '👤' };
  const durum = DURUM_BADGE[p.durum || 'aktif'] || DURUM_BADGE.aktif;
  const kapasiteAsimi = stat && (stat.gorevSayisi >= 5 || stat.gecikmisSayisi >= 2);

  return (
    <div className={`bg-surface border rounded-lg p-4 transition-all group ${
      kapasiteAsimi ? 'border-red/30 shadow-[0_0_8px_rgba(231,76,60,0.1)]' : 'border-border hover:border-gold/30'
    } ${p.durum === 'pasif' ? 'opacity-60' : ''}`}>
      {/* Üst: Avatar + Ad + Rol + Durum */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-11 h-11 rounded-full ${rol.bg} flex items-center justify-center text-sm font-bold flex-shrink-0 ${rol.text}`}>
          {rol.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text truncate">{p.ad || '—'}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${durum.bg} ${durum.renk}`}>
              {durum.label}
            </span>
          </div>
          <div className="text-[11px] text-text-muted truncate mt-0.5">
            <span className={`${rol.text} font-medium`}>{rol.label}</span>
            {p.baroSicil && <span className="ml-1.5">· Sicil: {p.baroSicil}</span>}
          </div>
        </div>
      </div>

      {/* İletişim */}
      <div className="space-y-1 mb-3">
        {p.email && (
          <div className="text-[11px] text-text-muted flex items-center gap-1.5 truncate">
            <span className="w-4 text-center">✉️</span> {p.email}
          </div>
        )}
        {p.tel && (
          <div className="text-[11px] text-text-muted flex items-center gap-1.5">
            <span className="w-4 text-center">📞</span> {p.tel}
          </div>
        )}
        {p.baslama && (
          <div className="text-[11px] text-text-dim flex items-center gap-1.5">
            <span className="w-4 text-center">📅</span> Başlangıç: {new Date(p.baslama).toLocaleDateString('tr-TR')}
          </div>
        )}
      </div>

      {/* İstatistik Çubukları */}
      {stat && p.durum !== 'pasif' && p.durum !== 'davet_gonderildi' && (
        <div className="flex gap-2 mb-3">
          <StatBadge
            icon="📋"
            value={stat.gorevSayisi}
            label="görev"
            color={stat.gorevSayisi >= 5 ? 'text-red bg-red-dim' : 'text-blue-400 bg-blue-400/10'}
          />
          {stat.gecikmisSayisi > 0 && (
            <StatBadge icon="⚠️" value={stat.gecikmisSayisi} label="gecikmiş" color="text-red bg-red-dim" />
          )}
          <StatBadge icon="✅" value={stat.tamamlananSayisi} label="tamamlanan" color="text-green bg-green-dim" />
          <StatBadge icon="📁" value={stat.dosyaSayisi} label="dosya" color="text-gold bg-gold-dim" />
        </div>
      )}

      {/* Aksiyonlar */}
      {yoneticiMi && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
          {silmeOnay ? (
            <>
              <span className="text-[10px] text-text-dim flex-1">Silinsin mi?</span>
              <button onClick={onSil} disabled={siliyor} className="px-2 py-1 text-[11px] text-red border border-red/20 rounded hover:bg-red/10 transition-colors">
                {siliyor ? '...' : 'Evet'}
              </button>
              <button onClick={onIptal} className="px-2 py-1 text-[11px] text-text-muted border border-border rounded hover:bg-surface2 transition-colors">
                Hayır
              </button>
            </>
          ) : (
            <>
              <button onClick={onDuzenle} className="flex-1 px-2 py-1 text-[11px] text-gold border border-gold/20 rounded hover:bg-gold-dim transition-colors">
                Düzenle
              </button>
              <button onClick={onSilmeOnayla} className="px-2 py-1 text-[11px] text-text-muted border border-border rounded hover:text-red hover:border-red/20 transition-colors">
                Sil
              </button>
            </>
          )}
        </div>
      )}

      {/* Sadece okuma — tıklayınca düzenle */}
      {!yoneticiMi && (
        <div className="pt-2 border-t border-border/50">
          <button onClick={onDuzenle} className="w-full px-2 py-1 text-[11px] text-text-muted hover:text-gold transition-colors text-center">
            Detay Görüntüle
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Stat Badge
   ══════════════════════════════════════════════════════════════ */
function StatBadge({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${color}`} title={`${value} ${label}`}>
      <span>{icon}</span>
      <span>{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Tablo Görünümü
   ══════════════════════════════════════════════════════════════ */
function PersonelTablo({ personeller, istatistikler, yoneticiMi, silmeOnay, onDuzenle, onSilmeOnayla, onSil, onIptal, siliyor }: {
  personeller: Personel[];
  istatistikler: Map<string, PersonelStat>;
  yoneticiMi: boolean;
  silmeOnay: string | null;
  onDuzenle: (p: Personel) => void;
  onSilmeOnayla: (id: string) => void;
  onSil: (id: string) => void;
  onIptal: () => void;
  siliyor: boolean;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden flex-1">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-surface2">
            <th className="text-left px-4 py-2.5 font-medium text-text-muted">Personel</th>
            <th className="text-left px-3 py-2.5 font-medium text-text-muted">Rol</th>
            <th className="text-left px-3 py-2.5 font-medium text-text-muted">İletişim</th>
            <th className="text-center px-3 py-2.5 font-medium text-text-muted">Görev</th>
            <th className="text-center px-3 py-2.5 font-medium text-text-muted">Dosya</th>
            <th className="text-center px-3 py-2.5 font-medium text-text-muted">Durum</th>
            {yoneticiMi && <th className="text-right px-4 py-2.5 font-medium text-text-muted">İşlem</th>}
          </tr>
        </thead>
        <tbody>
          {personeller.map((p) => {
            const rol = ROL_RENK[p.rol || ''] || { bg: 'bg-surface2', text: 'text-text-muted', label: p.rol || '—', icon: '👤' };
            const durum = DURUM_BADGE[p.durum || 'aktif'] || DURUM_BADGE.aktif;
            const stat = istatistikler.get(p.id);
            const kapasiteAsimi = stat && (stat.gorevSayisi >= 5 || stat.gecikmisSayisi >= 2);

            return (
              <tr
                key={p.id}
                className={`border-b border-border/50 hover:bg-surface2/50 transition-colors ${
                  p.durum === 'pasif' ? 'opacity-50' : ''
                } ${kapasiteAsimi ? 'bg-red/[0.03]' : ''}`}
              >
                {/* Personel */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full ${rol.bg} flex items-center justify-center text-xs font-bold flex-shrink-0 ${rol.text}`}>
                      {rol.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-text truncate">{p.ad || '—'}</div>
                      {p.baroSicil && <div className="text-[10px] text-text-dim">Sicil: {p.baroSicil}</div>}
                    </div>
                  </div>
                </td>

                {/* Rol */}
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rol.bg} ${rol.text}`}>{rol.label}</span>
                </td>

                {/* İletişim */}
                <td className="px-3 py-2.5">
                  {p.email && <div className="text-text-muted truncate max-w-[160px]">{p.email}</div>}
                  {p.tel && <div className="text-text-dim">{p.tel}</div>}
                </td>

                {/* Görev */}
                <td className="px-3 py-2.5 text-center">
                  {stat ? (
                    <div className="flex items-center justify-center gap-1">
                      <span className={stat.gorevSayisi >= 5 ? 'text-red font-bold' : 'text-text'}>{stat.gorevSayisi}</span>
                      {stat.gecikmisSayisi > 0 && (
                        <span className="text-red text-[9px]">({stat.gecikmisSayisi}⚠️)</span>
                      )}
                    </div>
                  ) : '—'}
                </td>

                {/* Dosya */}
                <td className="px-3 py-2.5 text-center text-text-muted">
                  {stat?.dosyaSayisi || '—'}
                </td>

                {/* Durum */}
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${durum.bg} ${durum.renk}`}>
                    {durum.label}
                  </span>
                </td>

                {/* İşlem */}
                {yoneticiMi && (
                  <td className="px-4 py-2.5 text-right">
                    {silmeOnay === p.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onSil(p.id)} disabled={siliyor} className="px-2 py-0.5 text-[10px] text-red border border-red/20 rounded hover:bg-red/10">
                          {siliyor ? '...' : 'Sil'}
                        </button>
                        <button onClick={onIptal} className="px-2 py-0.5 text-[10px] text-text-muted border border-border rounded hover:bg-surface2">
                          İptal
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onDuzenle(p)} className="px-2 py-0.5 text-[10px] text-gold border border-gold/20 rounded hover:bg-gold-dim">
                          Düzenle
                        </button>
                        <button onClick={() => onSilmeOnayla(p.id)} className="px-2 py-0.5 text-[10px] text-text-dim hover:text-red">
                          Sil
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Empty State
   ══════════════════════════════════════════════════════════════ */
function EmptyState({ yoneticiMi, onEkle }: { yoneticiMi: boolean; onEkle: () => void }) {
  return (
    <div className="text-center py-16 bg-surface border border-border rounded-lg flex-1">
      <div className="text-5xl mb-4">👥</div>
      <h2 className="text-lg font-semibold text-text mb-2">Ekibinizi Oluşturun</h2>
      <p className="text-sm text-text-muted mb-4 max-w-md mx-auto">
        Avukatlarınızı, stajyerlerinizi ve sekreterlerinizi ekleyerek büronuzu dijitalleştirin.
        Her personele rol atayın, görev verin ve performanslarını takip edin.
      </p>
      {yoneticiMi && (
        <button
          onClick={onEkle}
          className="px-5 py-2.5 bg-gold text-bg font-semibold rounded-lg text-sm hover:bg-gold-light transition-colors"
        >
          + İlk Personeli Ekle
        </button>
      )}
      <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg mx-auto">
        <div className="text-center">
          <div className="text-2xl mb-1">⚖️</div>
          <div className="text-[11px] text-text-muted">Avukat ekleyin</div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">📧</div>
          <div className="text-[11px] text-text-muted">Davet gönderin</div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">📊</div>
          <div className="text-[11px] text-text-muted">Performans izleyin</div>
        </div>
      </div>
    </div>
  );
}
