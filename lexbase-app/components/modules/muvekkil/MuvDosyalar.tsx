'use client';

import { useState } from 'react';
import Link from 'next/link';

/* ── Filtre tipleri ── */
type DosyaFiltre = 'tumu' | 'dava' | 'icra' | 'arabuluculuk' | 'ihtarname';

const FILTRELER: { key: DosyaFiltre; label: string; icon: string }[] = [
  { key: 'tumu', label: 'Tümü', icon: '📂' },
  { key: 'dava', label: 'Davalar', icon: '⚖️' },
  { key: 'icra', label: 'İcra', icon: '📋' },
  { key: 'arabuluculuk', label: 'Arabuluculuk', icon: '🤝' },
  { key: 'ihtarname', label: 'İhtarname', icon: '📨' },
];

interface Props {
  davalar: Record<string, unknown>[];
  icralar: Record<string, unknown>[];
  arabuluculuklar: Record<string, unknown>[];
  ihtarnameler: Record<string, unknown>[];
  onYeniEkle: (tur: 'dava' | 'icra' | 'arabuluculuk' | 'ihtarname') => void;
  onIhtarnameClick?: (item: Record<string, unknown>) => void;
}

export function MuvDosyalar({ davalar, icralar, arabuluculuklar, ihtarnameler, onYeniEkle, onIhtarnameClick }: Props) {
  const [filtre, setFiltre] = useState<DosyaFiltre>('tumu');
  const [arama, setArama] = useState('');

  const durumRenk: Record<string, string> = {
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
  };

  /* ── Arama filtresi ── */
  const araFiltre = (items: Record<string, unknown>[]) => {
    if (!arama) return items;
    const q = arama.toLowerCase();
    return items.filter((d) =>
      ((d.no as string) || '').toLowerCase().includes(q) ||
      ((d.konu as string) || '').toLowerCase().includes(q) ||
      ((d.borclu as string) || '').toLowerCase().includes(q)
    );
  };

  const filtreliDavalar = araFiltre(davalar);
  const filtreliIcralar = araFiltre(icralar);
  const filtreliArabuluculuklar = araFiltre(arabuluculuklar);
  const filtreliIhtarnameler = araFiltre(ihtarnameler);

  const toplamSayi = davalar.length + icralar.length + arabuluculuklar.length + ihtarnameler.length;

  return (
    <div className="space-y-4">
      {/* Filtre Butonları + Arama */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {FILTRELER.map((f) => {
            const sayi = f.key === 'tumu' ? toplamSayi
              : f.key === 'dava' ? davalar.length
              : f.key === 'icra' ? icralar.length
              : f.key === 'arabuluculuk' ? arabuluculuklar.length
              : ihtarnameler.length;

            return (
              <button
                key={f.key}
                onClick={() => setFiltre(f.key)}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
                  ${filtre === f.key
                    ? 'bg-gold text-bg border-gold'
                    : 'bg-surface border-border text-text-muted hover:border-gold/40 hover:text-text'
                  }
                `}
              >
                {f.icon} {f.label} ({sayi})
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Dosya ara..."
          className="px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none w-48"
        />
      </div>

      {/* Dosya Listeleri */}
      {toplamSayi === 0 ? (
        <EmptyState
          icon="📂"
          message="Henüz dosya kaydı yok"
          altMesaj="Bu müvekkile ait dava, icra, arabuluculuk veya ihtarname dosyası bulunmuyor."
          butonlar={[
            { label: '+ Yeni Dava', onClick: () => onYeniEkle('dava') },
            { label: '+ Yeni İcra', onClick: () => onYeniEkle('icra') },
            { label: '+ Arabuluculuk', onClick: () => onYeniEkle('arabuluculuk') },
            { label: '+ İhtarname', onClick: () => onYeniEkle('ihtarname') },
          ]}
        />
      ) : (
        <div className="space-y-5">
          {/* Davalar */}
          {(filtre === 'tumu' || filtre === 'dava') && (
            <DosyaBolumu
              baslik="⚖️ Davalar"
              sayi={filtreliDavalar.length}
              toplam={davalar.length}
              items={filtreliDavalar}
              tur="dava"
              linkPrefix="/davalar"
              durumRenk={durumRenk}
              kartBilgi={(d) => ({
                no: d.no as string,
                konu: d.konu as string,
                alt: d.mahkeme as string,
                durum: d.durum as string,
                tarih: (d.tarihler as Record<string, string>)?.baslangic || '',
              })}
              onYeniEkle={() => onYeniEkle('dava')}
            />
          )}

          {/* İcra */}
          {(filtre === 'tumu' || filtre === 'icra') && (
            <DosyaBolumu
              baslik="📋 İcra Dosyaları"
              sayi={filtreliIcralar.length}
              toplam={icralar.length}
              items={filtreliIcralar}
              tur="icra"
              linkPrefix="/icra"
              durumRenk={durumRenk}
              kartBilgi={(i) => ({
                no: i.no as string,
                konu: (i.borclu as string) || (i.konu as string),
                alt: i.daire as string,
                durum: i.durum as string,
                tarih: (i.tarihler as Record<string, string>)?.baslangic || '',
              })}
              onYeniEkle={() => onYeniEkle('icra')}
            />
          )}

          {/* Arabuluculuk */}
          {(filtre === 'tumu' || filtre === 'arabuluculuk') && (
            <DosyaBolumu
              baslik="🤝 Arabuluculuk"
              sayi={filtreliArabuluculuklar.length}
              toplam={arabuluculuklar.length}
              items={filtreliArabuluculuklar}
              tur="arabuluculuk"
              linkPrefix="/arabuluculuk"
              durumRenk={durumRenk}
              kartBilgi={(a) => ({
                no: a.no as string,
                konu: a.konu as string,
                alt: a.arabulucu as string,
                durum: a.durum as string,
                tarih: (a.tarihler as Record<string, string>)?.baslangic || '',
              })}
              onYeniEkle={() => onYeniEkle('arabuluculuk')}
            />
          )}

          {/* İhtarname */}
          {(filtre === 'tumu' || filtre === 'ihtarname') && (
            <DosyaBolumu
              baslik="📨 İhtarnameler"
              sayi={filtreliIhtarnameler.length}
              toplam={ihtarnameler.length}
              items={filtreliIhtarnameler}
              tur="ihtarname"
              linkPrefix="/ihtarname"
              durumRenk={durumRenk}
              kartBilgi={(h) => ({
                no: h.no as string,
                konu: h.konu as string,
                alt: h.noterAd as string,
                durum: h.durum as string,
                tarih: (h.tarihler as Record<string, string>)?.tarih || '',
              })}
              onYeniEkle={() => onYeniEkle('ihtarname')}
              onItemClick={onIhtarnameClick}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* Alt Bileşenler                                                */
/* ══════════════════════════════════════════════════════════════ */

function DosyaBolumu({
  baslik,
  sayi,
  toplam,
  items,
  tur,
  linkPrefix,
  durumRenk,
  kartBilgi,
  onYeniEkle,
  onItemClick,
}: {
  baslik: string;
  sayi: number;
  toplam: number;
  items: Record<string, unknown>[];
  tur: string;
  linkPrefix: string;
  durumRenk: Record<string, string>;
  kartBilgi: (d: Record<string, unknown>) => { no: string; konu: string; alt: string; durum: string; tarih: string };
  onYeniEkle: () => void;
  onItemClick?: (item: Record<string, unknown>) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">{baslik} ({sayi})</h3>
        <button
          onClick={onYeniEkle}
          className="text-[11px] text-gold hover:text-gold-light font-medium transition-colors"
        >
          + Yeni {tur === 'dava' ? 'Dava' : tur === 'icra' ? 'İcra' : tur === 'arabuluculuk' ? 'Arabuluculuk' : 'İhtarname'}
        </button>
      </div>

      {toplam === 0 ? (
        <EmptyState
          icon={baslik.split(' ')[0]}
          message={`Henüz ${tur} kaydı yok`}
          butonlar={[{ label: '+ Yeni Ekle', onClick: onYeniEkle }]}
        />
      ) : sayi === 0 ? (
        <div className="text-center py-4 text-text-dim text-xs bg-surface border border-border rounded-lg">
          Arama sonucu bulunamadı
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((d) => {
            const bilgi = kartBilgi(d);
            if (onItemClick) {
              return (
                <div key={d.id as string} onClick={() => onItemClick(d)}>
                  <DosyaCard {...bilgi} durumRenk={durumRenk} />
                </div>
              );
            }
            return (
              <Link key={d.id as string} href={`${linkPrefix}/${d.id}`}>
                <DosyaCard {...bilgi} durumRenk={durumRenk} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DosyaCard({
  no,
  konu,
  alt,
  durum,
  tarih,
  durumRenk,
}: {
  no: string;
  konu: string;
  alt: string;
  durum: string;
  tarih: string;
  durumRenk: Record<string, string>;
}) {
  const renkClass = durumRenk[durum] || 'text-text-muted bg-surface2 border-border';

  return (
    <div className="bg-surface border border-border rounded-lg p-4 hover:border-gold hover:bg-gold-dim transition-all cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-bold text-gold">{no || '—'}</div>
          <div className="text-xs text-text mt-1">{konu || '—'}</div>
          {alt && <div className="text-[11px] text-text-muted mt-1">{alt}</div>}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${renkClass}`}>
            {durum || 'Belirsiz'}
          </span>
          {tarih && <span className="text-[10px] text-text-dim">{tarih}</span>}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  message,
  altMesaj,
  butonlar,
}: {
  icon: string;
  message: string;
  altMesaj?: string;
  butonlar?: Array<{ label: string; onClick: () => void }>;
}) {
  return (
    <div className="text-center py-10 text-text-muted bg-surface border border-border rounded-lg">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-sm font-medium mb-1">{message}</div>
      {altMesaj && <div className="text-xs text-text-dim mb-4">{altMesaj}</div>}
      {butonlar && butonlar.length > 0 && (
        <div className="flex justify-center gap-2 mt-3">
          {butonlar.map((b) => (
            <button
              key={b.label}
              onClick={b.onClick}
              className="px-3 py-1.5 text-xs font-medium text-gold border border-gold/30 rounded-lg hover:bg-gold-dim transition-colors"
            >
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
