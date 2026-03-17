'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { fmt } from '@/lib/utils';
import { DosyaDrawer } from './DosyaDrawer';

/* ── Dosya türü ayarları ── */
const DOSYA_TURLERI = [
  { key: 'dava', label: 'Davalar', icon: '⚖️', color: 'text-blue-400', bgColor: 'bg-blue-400/10', linkPrefix: '/davalar' },
  { key: 'icra', label: 'İcra Dosyaları', icon: '📋', color: 'text-orange-400', bgColor: 'bg-orange-400/10', linkPrefix: '/icra' },
  { key: 'arabuluculuk', label: 'Arabuluculuk', icon: '🤝', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10', linkPrefix: '/arabuluculuk' },
  { key: 'ihtarname', label: 'İhtarnameler', icon: '📨', color: 'text-purple-400', bgColor: 'bg-purple-400/10', linkPrefix: '/ihtarname' },
] as const;

const DURUM_RENK: Record<string, string> = {
  'Derdest': 'text-green bg-green-dim border-green/20',
  'Aktif': 'text-green bg-green-dim border-green/20',
  'derdest': 'text-green bg-green-dim border-green/20',
  'Devam Ediyor': 'text-green bg-green-dim border-green/20',
  'Başvuru': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Görüşme': 'text-gold bg-gold-dim border-gold/20',
  'Hazırlandı': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Gönderildi': 'text-gold bg-gold-dim border-gold/20',
  'Tebliğ Edildi': 'text-green bg-green-dim border-green/20',
  'Kapandı': 'text-text-dim bg-surface2 border-border',
  'kapandi': 'text-text-dim bg-surface2 border-border',
  'Tamamlandı': 'text-text-dim bg-surface2 border-border',
  'Anlaşma': 'text-green bg-green-dim border-green/20',
  'Anlaşamama': 'text-red bg-red-dim border-red/20',
  'Kazanıldı': 'text-green bg-green-dim border-green/20',
  'Kaybedildi': 'text-red bg-red-dim border-red/20',
  'Taslak': 'text-text-dim bg-surface2 border-border',
};

interface DosyaInfo {
  id: string;
  tur: 'dava' | 'icra' | 'arabuluculuk' | 'ihtarname';
  no: string;
  konu: string;
  durum: string;
  alt: string;
  tarih: string;
  raw: Record<string, unknown>;
}

interface Props {
  davalar: Record<string, unknown>[];
  icralar: Record<string, unknown>[];
  arabuluculuklar: Record<string, unknown>[];
  ihtarnameler: Record<string, unknown>[];
  finansOzet: Record<string, unknown> | null | undefined;
  onYeniEkle: (tur: 'dava' | 'icra' | 'arabuluculuk' | 'ihtarname') => void;
  onIhtarnameClick?: (item: Record<string, unknown>) => void;
  danismanlikSayisi: number;
  iliskiSayisi: number;
}

export function GenelBakis({
  davalar,
  icralar,
  arabuluculuklar,
  ihtarnameler,
  finansOzet,
  onYeniEkle,
  onIhtarnameClick,
  danismanlikSayisi,
  iliskiSayisi,
}: Props) {
  const [acikAccordion, setAcikAccordion] = useState<string | null>(() => {
    // İlk dolu kategoriyi aç
    if (davalar.length > 0) return 'dava';
    if (icralar.length > 0) return 'icra';
    if (arabuluculuklar.length > 0) return 'arabuluculuk';
    if (ihtarnameler.length > 0) return 'ihtarname';
    return null;
  });
  const [drawerDosya, setDrawerDosya] = useState<DosyaInfo | null>(null);

  const dosyaGruplari = useMemo(() => {
    const grp: Record<string, Record<string, unknown>[]> = {
      dava: davalar,
      icra: icralar,
      arabuluculuk: arabuluculuklar,
      ihtarname: ihtarnameler,
    };
    return grp;
  }, [davalar, icralar, arabuluculuklar, ihtarnameler]);

  const kartBilgi = (d: Record<string, unknown>, tur: string): DosyaInfo => {
    switch (tur) {
      case 'dava':
        return {
          id: d.id as string, tur: 'dava', no: d.no as string || '', konu: d.konu as string || '',
          alt: d.mahkeme as string || '', durum: d.durum as string || '',
          tarih: (d.tarihler as Record<string, string>)?.baslangic || '', raw: d,
        };
      case 'icra':
        return {
          id: d.id as string, tur: 'icra', no: d.no as string || '', konu: (d.borclu as string) || (d.konu as string) || '',
          alt: d.daire as string || '', durum: d.durum as string || '',
          tarih: (d.tarihler as Record<string, string>)?.baslangic || '', raw: d,
        };
      case 'arabuluculuk':
        return {
          id: d.id as string, tur: 'arabuluculuk', no: d.no as string || '', konu: d.konu as string || '',
          alt: d.arabulucu as string || '', durum: d.durum as string || '',
          tarih: (d.tarihler as Record<string, string>)?.baslangic || (d.basvuruTarih as string) || '', raw: d,
        };
      default: // ihtarname
        return {
          id: d.id as string, tur: 'ihtarname', no: d.no as string || '', konu: d.konu as string || '',
          alt: d.noterAd as string || '', durum: d.durum as string || '',
          tarih: (d.tarihler as Record<string, string>)?.tarih || '', raw: d,
        };
    }
  };

  // Mali toplamlar
  const masraflar = finansOzet?.masraflar as Record<string, number> | undefined;
  const vekalet = finansOzet?.vekaletUcreti as Record<string, Record<string, number>> | undefined;
  const danismanlik = finansOzet?.danismanlik as Record<string, number> | undefined;

  return (
    <div className="space-y-5">
      {/* ── Dosya Accordion Kartları ── */}
      <div className="space-y-2">
        {DOSYA_TURLERI.map((dt) => {
          const items = dosyaGruplari[dt.key] || [];
          const isOpen = acikAccordion === dt.key;
          const isEmpty = items.length === 0;

          return (
            <div key={dt.key} className={`border rounded-xl transition-all ${isOpen ? 'border-gold/30 bg-surface' : 'border-border'}`}>
              {/* Accordion Header */}
              <button
                onClick={() => setAcikAccordion(isOpen ? null : dt.key)}
                className={`w-full flex items-center justify-between px-4 transition-all ${isEmpty ? 'py-2.5' : 'py-3'}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{dt.icon}</span>
                  <span className={`text-xs font-semibold ${isEmpty ? 'text-text-dim' : 'text-text'}`}>
                    {dt.label}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isEmpty ? 'bg-surface2 text-text-dim' : `${dt.bgColor} ${dt.color}`}`}>
                    {items.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isEmpty && (
                    <span
                      onClick={(e) => { e.stopPropagation(); onYeniEkle(dt.key); }}
                      className="text-[11px] text-gold hover:text-gold-light font-medium cursor-pointer"
                    >
                      + Yeni Ekle
                    </span>
                  )}
                  {!isEmpty && (
                    <svg
                      width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      className={`text-text-dim transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    >
                      <path d="M4 6l4 4 4-4"/>
                    </svg>
                  )}
                </div>
              </button>

              {/* Accordion Body */}
              {isOpen && !isEmpty && (
                <div className="px-3 pb-3 space-y-1.5">
                  {/* Ekle Butonu */}
                  <div className="flex justify-end mb-1">
                    <button
                      onClick={() => onYeniEkle(dt.key)}
                      className="text-[11px] text-gold hover:text-gold-light font-medium transition-colors"
                    >
                      + Yeni {dt.label.replace(' Dosyaları', '').replace('ler', '').replace('lar', '')}
                    </button>
                  </div>

                  {items.map((item) => {
                    const info = kartBilgi(item, dt.key);
                    const renkClass = DURUM_RENK[info.durum] || 'text-text-muted bg-surface2 border-border';
                    const sonrakiDurusma = (() => {
                      const durusmalar = (item.durusmalar || []) as Array<Record<string, unknown>>;
                      const bugun = new Date().toISOString().slice(0, 10);
                      return durusmalar.find((d) => (d.tarih as string) >= bugun) || null;
                    })();

                    return (
                      <div
                        key={info.id}
                        onClick={() => {
                          if (dt.key === 'ihtarname' && onIhtarnameClick) {
                            onIhtarnameClick(item);
                          } else {
                            setDrawerDosya(info);
                          }
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 bg-bg border border-border rounded-lg cursor-pointer hover:border-gold/40 hover:bg-gold-dim/30 transition-all group"
                      >
                        {/* Sol: No + Konu */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-gold truncate">{info.no || '—'}</span>
                            {info.alt && (
                              <span className="text-[10px] text-text-dim truncate hidden sm:inline">{info.alt}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-text-muted truncate">{info.konu || '—'}</div>
                        </div>

                        {/* Orta: Durusma Badge (varsa) */}
                        {sonrakiDurusma && (
                          <span className="text-[9px] font-bold text-gold bg-gold-dim border border-gold/20 px-1.5 py-0.5 rounded shrink-0 hidden md:inline-flex items-center gap-1">
                            <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 4v4l2.5 1.5" strokeLinecap="round"/></svg>
                            {sonrakiDurusma.tarih as string}
                          </span>
                        )}

                        {/* Sag: Durum + Tarih */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${renkClass}`}>
                            {info.durum || 'Belirsiz'}
                          </span>
                          {info.tarih && <span className="text-[9px] text-text-dim">{info.tarih}</span>}
                        </div>

                        {/* Arrow */}
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim/40 group-hover:text-gold transition-colors shrink-0" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 4l4 4-4 4"/>
                        </svg>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Hızlı Bakış Kartları ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Danışmanlık */}
        <QuickCard
          icon="💼"
          label="Danışmanlık"
          value={danismanlikSayisi}
          sub={danismanlik?.gelir ? `${fmt(danismanlik.gelir)} gelir` : undefined}
        />
        {/* Masraf Özeti */}
        <QuickCard
          icon="💸"
          label="Masraflar"
          value={fmt(masraflar?.toplam ?? 0)}
          sub={vekalet?.akdi?.kalan ? `${fmt(vekalet.akdi.kalan)} alacak` : undefined}
          valueColor={(masraflar?.toplam ?? 0) > 0 ? 'text-text' : 'text-text-dim'}
        />
        {/* İlişkiler */}
        <QuickCard
          icon="🔗"
          label="İlişkiler"
          value={iliskiSayisi}
        />
      </div>

      {/* ── Dosya Drawer ── */}
      <DosyaDrawer dosya={drawerDosya} onClose={() => setDrawerDosya(null)} durumRenk={DURUM_RENK} />
    </div>
  );
}

function QuickCard({ icon, label, value, sub, valueColor }: { icon: string; label: string; value: string | number; sub?: string; valueColor?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center gap-3">
      <div className="text-xl">{icon}</div>
      <div>
        <div className="text-[10px] text-text-dim uppercase tracking-wider">{label}</div>
        <div className={`text-sm font-bold ${valueColor || 'text-text'}`}>{value}</div>
        {sub && <div className="text-[10px] text-text-muted">{sub}</div>}
      </div>
    </div>
  );
}
