'use client';

import { useState, useMemo } from 'react';
import { useEtkinlikler, type Etkinlik } from '@/lib/hooks/useEtkinlikler';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { EtkinlikModal } from '@/components/modules/EtkinlikModal';
import { fmtTarih } from '@/lib/utils';

const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const TUR_RENK: Record<string, string> = {
  'Duruşma': 'bg-red/20 text-red border-red/30',
  'Son Gün': 'bg-orange-400/20 text-orange-400 border-orange-400/30',
  'Müvekkil Görüşmesi': 'bg-blue-400/20 text-blue-400 border-blue-400/30',
  'Toplantı': 'bg-purple-400/20 text-purple-400 border-purple-400/30',
  'Keşif': 'bg-green/20 text-green border-green/30',
  'Arabuluculuk': 'bg-gold/20 text-gold border-gold/30',
};

export default function TakvimPage() {
  const { data: etkinlikler } = useEtkinlikler();
  const { data: davalar } = useDavalar();
  const { data: muvekkillar } = useMuvekkillar();

  const bugun = new Date();
  const [yil, setYil] = useState(bugun.getFullYear());
  const [ay, setAy] = useState(bugun.getMonth());
  const [modalAcik, setModalAcik] = useState(false);
  const [seciliEtkinlik, setSeciliEtkinlik] = useState<Etkinlik | null>(null);

  // Müvekkil adı map
  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  // Tüm etkinlikleri + sanal etkinlikleri birleştir
  const tumEtkinlikler = useMemo(() => {
    const liste = [...(etkinlikler || [])];

    // Davalardan sanal duruşma etkinlikleri
    davalar?.forEach((d) => {
      if (d.durusma) {
        liste.push({
          id: `virtual-durusma-${d.id}`,
          baslik: `Duruşma: ${d.no || d.konu || ''}`,
          tarih: d.durusma,
          tur: 'Duruşma',
          muvId: d.muvId,
          davNo: d.no,
        });
      }
    });

    return liste;
  }, [etkinlikler, davalar]);

  // Takvim grid hesaplama
  const grid = useMemo(() => {
    const ilkGun = new Date(yil, ay, 1);
    const sonGun = new Date(yil, ay + 1, 0);
    const baslangicGunu = (ilkGun.getDay() + 6) % 7; // Pazartesi = 0
    const toplamGun = sonGun.getDate();

    const hucreler: Array<{ gun: number | null; tarih: string; etkinlikler: typeof tumEtkinlikler }> = [];

    // Önceki aydan boş hücreler
    for (let i = 0; i < baslangicGunu; i++) {
      hucreler.push({ gun: null, tarih: '', etkinlikler: [] });
    }

    // Ay günleri
    for (let g = 1; g <= toplamGun; g++) {
      const tarih = `${yil}-${String(ay + 1).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
      const gunEtkinlikleri = tumEtkinlikler.filter((e) => e.tarih === tarih);
      hucreler.push({ gun: g, tarih, etkinlikler: gunEtkinlikleri });
    }

    return hucreler;
  }, [yil, ay, tumEtkinlikler]);

  // Bu ay yaklaşan etkinlikler (sidebar)
  const yaklasan = useMemo(() => {
    const bugunStr = bugun.toISOString().split('T')[0];
    return tumEtkinlikler
      .filter((e) => e.tarih && e.tarih >= bugunStr)
      .sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''))
      .slice(0, 12);
  }, [tumEtkinlikler, bugun]);

  const bugunStr = bugun.toISOString().split('T')[0];

  // Navigasyon
  const oncekiAy = () => {
    if (ay === 0) { setAy(11); setYil(yil - 1); }
    else setAy(ay - 1);
  };
  const sonrakiAy = () => {
    if (ay === 11) { setAy(0); setYil(yil + 1); }
    else setAy(ay + 1);
  };
  const bugunGit = () => { setYil(bugun.getFullYear()); setAy(bugun.getMonth()); };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">Takvim</h1>
        <button
          onClick={() => { setSeciliEtkinlik(null); setModalAcik(true); }}
          className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
        >
          + Yeni Etkinlik
        </button>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-4 flex-1">
        {/* Takvim Grid */}
        <div className="bg-surface border border-border rounded-lg p-4">
          {/* Ay Navigasyonu */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={oncekiAy} className="px-3 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text-muted hover:text-text transition-colors">‹ Önceki</button>
            <div className="flex items-center gap-3">
              <h2 className="font-[var(--font-playfair)] text-lg text-text font-bold">
                {AYLAR[ay]} {yil}
              </h2>
              <button onClick={bugunGit} className="px-2 py-1 text-[10px] bg-gold-dim text-gold rounded border border-gold/20 hover:bg-gold hover:text-bg transition-colors">
                Bugün
              </button>
            </div>
            <button onClick={sonrakiAy} className="px-3 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text-muted hover:text-text transition-colors">Sonraki ›</button>
          </div>

          {/* Gün başlıkları */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {GUNLER.map((g) => (
              <div key={g} className="text-center text-[11px] text-text-muted font-medium py-1">{g}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-px">
            {grid.map((hucre, i) => (
              <div
                key={i}
                className={`min-h-[80px] p-1 border border-border/30 rounded ${
                  hucre.gun === null ? 'bg-transparent' :
                  hucre.tarih === bugunStr ? 'bg-gold-dim border-gold/30' :
                  'bg-surface2/50 hover:bg-surface2'
                }`}
              >
                {hucre.gun !== null && (
                  <>
                    <div className={`text-[11px] font-medium mb-0.5 ${
                      hucre.tarih === bugunStr ? 'text-gold font-bold' : 'text-text-muted'
                    }`}>
                      {hucre.gun}
                    </div>
                    {hucre.etkinlikler.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className={`text-[9px] px-1 py-0.5 rounded mb-0.5 truncate border ${
                          TUR_RENK[e.tur || ''] || 'bg-surface2 text-text-muted border-border'
                        }`}
                        title={`${e.saat ? e.saat + ' ' : ''}${e.baslik}`}
                      >
                        {e.saat && <span className="font-bold">{e.saat} </span>}
                        {e.baslik}
                      </div>
                    ))}
                    {hucre.etkinlikler.length > 2 && (
                      <div className="text-[9px] text-text-dim text-center">+{hucre.etkinlikler.length - 2}</div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Yaklaşan */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-text mb-3">📅 Yaklaşan Etkinlikler</h3>
          {yaklasan.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-xs">Yaklaşan etkinlik yok</div>
          ) : (
            <div className="space-y-2">
              {yaklasan.map((e) => {
                const gun = Math.ceil((new Date(e.tarih!).getTime() - Date.now()) / 86400000);
                return (
                  <div key={e.id} className="p-2.5 bg-surface2 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TUR_RENK[e.tur || ''] || 'bg-surface text-text-muted border-border'}`}>
                        {e.tur || 'Diğer'}
                      </span>
                      <span className={`text-[10px] font-bold ${gun <= 1 ? 'text-red' : gun <= 3 ? 'text-gold' : 'text-text-dim'}`}>
                        {gun === 0 ? 'BUGÜN' : gun === 1 ? 'YARIN' : `${gun} gün`}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-text truncate">{e.baslik || '—'}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      {fmtTarih(e.tarih)} {e.saat && `· ${e.saat}`}
                      {e.muvId && muvAdMap[e.muvId] && ` · ${muvAdMap[e.muvId]}`}
                    </div>
                    {e.yer && <div className="text-[10px] text-text-dim mt-0.5">📍 {e.yer}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <EtkinlikModal open={modalAcik} onClose={() => setModalAcik(false)} etkinlik={seciliEtkinlik} />
    </div>
  );
}
