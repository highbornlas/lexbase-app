'use client';

import { useState, useMemo } from 'react';
import { useIhtarnameler } from '@/lib/hooks/useIhtarname';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmt, fmtTarih } from '@/lib/utils';

const DURUM_RENK: Record<string, string> = {
  'Taslak': 'bg-surface2 text-text-dim border-border',
  'Hazırlandı': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Gönderildi': 'bg-gold-dim text-gold border-gold/20',
  'Tebliğ Edildi': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  'Cevap Geldi': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Sonuçlandı': 'bg-green-dim text-green border-green/20',
};

const TUR_BADGE: Record<string, string> = {
  'İhtar': 'text-red',
  'İhbarname': 'text-blue-400',
  'Fesih İhtarı': 'text-orange-400',
  'Ödeme İhtarı': 'text-gold',
  'Tahliye İhtarı': 'text-purple-400',
};

export default function IhtarnamePage() {
  const { data: ihtarnameler, isLoading } = useIhtarnameler();
  const { data: muvekkillar } = useMuvekkillar();
  const [arama, setArama] = useState('');
  const [durumFiltre, setDurumFiltre] = useState('hepsi');

  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  // KPI
  const kpis = useMemo(() => {
    if (!ihtarnameler) return { toplam: 0, gonderilen: 0, tebligEdilen: 0, cevapBeklenen: 0, toplamUcret: 0 };
    const gonderilen = ihtarnameler.filter((i) => i.durum !== 'Taslak' && i.durum !== 'Hazırlandı').length;
    const tebligEdilen = ihtarnameler.filter((i) => i.durum === 'Tebliğ Edildi' || i.durum === 'Cevap Geldi' || i.durum === 'Sonuçlandı').length;
    const cevapBeklenen = ihtarnameler.filter((i) => i.durum === 'Tebliğ Edildi').length;
    const toplamUcret = ihtarnameler.reduce((t, i) => t + (i.ucret || 0), 0);
    return { toplam: ihtarnameler.length, gonderilen, tebligEdilen, cevapBeklenen, toplamUcret };
  }, [ihtarnameler]);

  // Filtreleme
  const filtrelenmis = useMemo(() => {
    if (!ihtarnameler) return [];
    return ihtarnameler.filter((i) => {
      if (durumFiltre !== 'hepsi' && i.durum !== durumFiltre) return false;
      if (arama) {
        const q = arama.toLowerCase();
        return (
          (i.no || '').toLowerCase().includes(q) ||
          (i.konu || '').toLowerCase().includes(q) ||
          (i.alici || '').toLowerCase().includes(q) ||
          (i.gonderen || '').toLowerCase().includes(q) ||
          (muvAdMap[i.muvId || ''] || '').toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
  }, [ihtarnameler, arama, durumFiltre, muvAdMap]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
          İhtarnameler
          {ihtarnameler && <span className="text-sm font-normal text-text-muted ml-2">({ihtarnameler.length})</span>}
        </h1>
        <button className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
          + Yeni İhtarname
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KpiCard label="Toplam" value={kpis.toplam.toString()} icon="📨" />
        <KpiCard label="Gönderilen" value={kpis.gonderilen.toString()} icon="📤" color="text-blue-400" />
        <KpiCard label="Tebliğ Edilen" value={kpis.tebligEdilen.toString()} icon="✅" color="text-green" />
        <KpiCard label="Cevap Beklenen" value={kpis.cevapBeklenen.toString()} icon="⏳" color="text-orange-400" />
        <KpiCard label="Toplam Ücret" value={fmt(kpis.toplamUcret)} icon="💰" color="text-gold" />
      </div>

      {/* Arama + Filtre */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 relative">
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Dosya no, konu, alıcı, gönderen ile ara..."
            className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
        </div>
        <select
          value={durumFiltre}
          onChange={(e) => setDurumFiltre(e.target.value)}
          className="px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
        >
          <option value="hepsi">Tüm Durumlar</option>
          <option value="Taslak">Taslak</option>
          <option value="Hazırlandı">Hazırlandı</option>
          <option value="Gönderildi">Gönderildi</option>
          <option value="Tebliğ Edildi">Tebliğ Edildi</option>
          <option value="Cevap Geldi">Cevap Geldi</option>
          <option value="Sonuçlandı">Sonuçlandı</option>
        </select>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-lg">
          <div className="text-4xl mb-3">📨</div>
          <div className="text-sm text-text-muted">
            {arama || durumFiltre !== 'hepsi' ? 'Arama sonucu bulunamadı' : 'Henüz ihtarname kaydı eklenmemiş'}
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {/* Tablo Başlık */}
          <div className="grid grid-cols-[60px_80px_1fr_1fr_1fr_100px_80px_80px] gap-2 px-4 py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider">
            <span>No</span>
            <span>Tür</span>
            <span>Müvekkil</span>
            <span>Alıcı</span>
            <span>Konu</span>
            <span>Durum</span>
            <span>Ücret</span>
            <span>Tarih</span>
          </div>

          {/* Satırlar */}
          {filtrelenmis.map((i) => (
            <div
              key={i.id}
              className="grid grid-cols-[60px_80px_1fr_1fr_1fr_100px_80px_80px] gap-2 px-4 py-3 border-b border-border/50 hover:bg-gold-dim transition-colors items-center cursor-pointer"
            >
              <span className="text-xs font-bold text-gold truncate">{i.no || '—'}</span>
              <span className={`text-[10px] font-bold ${TUR_BADGE[i.tur || ''] || 'text-text-muted'}`}>
                {i.tur || '—'}
              </span>
              <span className="text-xs text-text truncate">{muvAdMap[i.muvId || ''] || '—'}</span>
              <span className="text-xs text-text-muted truncate">{i.alici || '—'}</span>
              <span className="text-xs text-text-muted truncate">{i.konu || '—'}</span>
              <span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${DURUM_RENK[i.durum || ''] || 'bg-surface2 text-text-dim border-border'}`}>
                  {i.durum || '—'}
                </span>
              </span>
              <span className="text-xs font-semibold text-text">{i.ucret ? fmt(i.ucret) : '—'}</span>
              <span className="text-[11px] text-text-dim">{fmtTarih(i.tarih)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tebliğ Durumu Takip */}
      {filtrelenmis.some((i) => i.durum === 'Gönderildi') && (
        <div className="mt-5 bg-gold-dim border border-gold/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gold mb-2">📬 Tebliğ Bekleyen İhtarnameler</h3>
          <div className="space-y-2">
            {filtrelenmis
              .filter((i) => i.durum === 'Gönderildi')
              .map((i) => {
                const gunFarki = i.gonderimTarih
                  ? Math.floor((Date.now() - new Date(i.gonderimTarih).getTime()) / 86400000)
                  : null;
                return (
                  <div key={`teblig-${i.id}`} className="flex items-center justify-between bg-surface rounded-lg px-3 py-2">
                    <div>
                      <span className="text-xs font-medium text-text">{i.no || '—'}</span>
                      <span className="text-[11px] text-text-muted ml-2">{i.alici || ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {gunFarki !== null && (
                        <span className={`text-[10px] font-bold ${gunFarki > 15 ? 'text-red' : gunFarki > 7 ? 'text-orange-400' : 'text-text-dim'}`}>
                          {gunFarki} gün önce gönderildi
                        </span>
                      )}
                      <span className="text-[11px] text-text-dim">{fmtTarih(i.gonderimTarih)}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: string; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-[var(--font-playfair)] text-lg font-bold ${color || 'text-gold'}`}>{value}</div>
    </div>
  );
}
