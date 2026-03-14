'use client';

import { useState, useMemo } from 'react';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import {
  useBuroKarZarar,
  useFinansUyarilar,
  useDosyaKarlilik,
  useBeklenenGelir,
} from '@/lib/hooks/useFinans';
import { fmt, fmtTarih } from '@/lib/utils';

const TABS = [
  { key: 'bakiye', label: 'Bakiyeler', icon: '💳' },
  { key: 'gider', label: 'Büro Giderleri', icon: '📊' },
  { key: 'karzarar', label: 'Kâr / Zarar', icon: '📈' },
  { key: 'karlilik', label: 'Kârlılık', icon: '🎯' },
  { key: 'beklenen', label: 'Beklenen Gelir', icon: '📅' },
  { key: 'uyari', label: 'Uyarılar', icon: '⚠️' },
];

export default function FinansPage() {
  const [aktifTab, setAktifTab] = useState('bakiye');
  const [kzYil, setKzYil] = useState(new Date().getFullYear());

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold mb-6">
        Finans
      </h1>

      {/* Tab Navigasyonu */}
      <div className="flex border-b border-border mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setAktifTab(tab.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              aktifTab === tab.key
                ? 'border-gold text-gold'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab İçerikleri */}
      {aktifTab === 'bakiye' && <BakiyelerTab />}
      {aktifTab === 'gider' && <BuroGiderleriTab />}
      {aktifTab === 'karzarar' && <KarZararTab yil={kzYil} setYil={setKzYil} />}
      {aktifTab === 'karlilik' && <KarlilikTab />}
      {aktifTab === 'beklenen' && <BeklenenGelirTab />}
      {aktifTab === 'uyari' && <UyarilarTab />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 1: Bakiyeler
// ══════════════════════════════════════════════════════════════
function BakiyelerTab() {
  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const [arama, setArama] = useState('');

  // Her müvekkil için bakiye hesapla (client-side)
  const bakiyeler = useMemo(() => {
    if (!muvekkillar) return [];
    return muvekkillar.map((m) => {
      const muvDavalar = (davalar || []).filter((d) => d.muvId === m.id);
      const muvIcralar = (icralar || []).filter((i) => i.muvId === m.id);

      let masrafToplam = 0;
      let avansAlinan = 0;
      let tahsilatToplam = 0;
      let vekaletTahsil = 0;
      let hakedisToplam = 0;

      // Tüm dosyalardan topla
      [...muvDavalar, ...muvIcralar].forEach((dosya) => {
        masrafToplam += (dosya.harcamalar || []).reduce((t: number, h: { tutar: number }) => t + (h.tutar || 0), 0);
        (dosya.tahsilatlar || []).forEach((th: { tur: string; tutar: number }) => {
          if (th.tur === 'tahsilat') tahsilatToplam += th.tutar || 0;
          if (th.tur === 'akdi_vekalet') vekaletTahsil += th.tutar || 0;
          if (th.tur === 'hakediş') hakedisToplam += th.tutar || 0;
        });
      });

      const masrafBakiye = avansAlinan - masrafToplam;
      const genelBakiye = vekaletTahsil + hakedisToplam + avansAlinan - masrafToplam;

      return {
        id: m.id,
        ad: m.ad,
        masrafToplam,
        avansAlinan,
        tahsilatToplam,
        vekaletTahsil,
        hakedisToplam,
        masrafBakiye,
        genelBakiye,
      };
    }).filter((b) => {
      if (!arama) return true;
      return b.ad.toLowerCase().includes(arama.toLowerCase());
    });
  }, [muvekkillar, davalar, icralar, arama]);

  return (
    <div>
      <div className="mb-4 relative max-w-md">
        <input
          type="text"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Müvekkil ara..."
          className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
      </div>

      {bakiyeler.length === 0 ? (
        <EmptyState icon="💳" message="Müvekkil bakiyesi bulunamadı" />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {bakiyeler.map((b) => (
            <div key={b.id} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-text">{b.ad}</span>
                <span className={`text-sm font-bold ${b.genelBakiye >= 0 ? 'text-green' : 'text-red'}`}>
                  {fmt(b.genelBakiye)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <BakiyeItem label="Masraf Toplam" value={fmt(b.masrafToplam)} />
                <BakiyeItem label="Avans Alınan" value={fmt(b.avansAlinan)} color="text-green" />
                <BakiyeItem label="Masraf Bakiye" value={fmt(b.masrafBakiye)} color={b.masrafBakiye >= 0 ? 'text-green' : 'text-red'} />
                <BakiyeItem label="Tahsilat" value={fmt(b.tahsilatToplam)} />
                <BakiyeItem label="Vekalet Tahsil" value={fmt(b.vekaletTahsil)} color="text-green" />
                <BakiyeItem label="Hakediş" value={fmt(b.hakedisToplam)} color="text-gold" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BakiyeItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface2 rounded px-2 py-1.5">
      <div className="text-[9px] text-text-dim uppercase tracking-wider">{label}</div>
      <div className={`text-xs font-semibold ${color || 'text-text'}`}>{value}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 2: Büro Giderleri
// ══════════════════════════════════════════════════════════════
function BuroGiderleriTab() {
  // Büro giderleri state.buroGiderleri'nden gelir — şimdilik Supabase'den
  // buroGiderleri tablosu yoksa boş göster
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text">Büro Giderleri</h3>
        <button className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
          + Gider Ekle
        </button>
      </div>

      <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-muted text-xs">
        Büro giderleri verisi Supabase entegrasyonu sonrası aktif olacak.
        <br />
        Mevcut uygulamadaki giderler otomatik taşınacaktır.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 3: Kâr / Zarar
// ══════════════════════════════════════════════════════════════
function KarZararTab({ yil, setYil }: { yil: number; setYil: (y: number) => void }) {
  const { data: karZarar, isLoading } = useBuroKarZarar(yil);
  const buYil = new Date().getFullYear();

  if (isLoading) return <div className="text-center py-8 text-text-muted text-xs">Yükleniyor...</div>;

  const gelirler = (karZarar?.gelirler || {}) as Record<string, number>;
  const giderler = (karZarar?.giderler || {}) as Record<string, unknown>;
  const net = (karZarar?.net ?? 0) as number;

  return (
    <div>
      {/* Yıl seçimi */}
      <div className="flex items-center gap-2 mb-5">
        {[buYil - 2, buYil - 1, buYil].map((y) => (
          <button
            key={y}
            onClick={() => setYil(y)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              yil === y ? 'bg-gold text-bg' : 'bg-surface border border-border text-text-muted hover:text-text'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Gelirler */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <h4 className="text-xs font-semibold text-green mb-3">GELİRLER</h4>
          <div className="space-y-2">
            <KzRow label="Akdi Vekalet Ücreti" value={gelirler.akdiVekaletUcreti} color="text-green" />
            <KzRow label="Karşı Vekalet Hakedişi" value={gelirler.karsiVekaletHakedis} color="text-green" />
            <KzRow label="Danışmanlık Geliri" value={gelirler.danismanlikGeliri} color="text-green" />
            <KzRow label="Arabuluculuk Geliri" value={gelirler.arabuluculukGeliri} color="text-green" />
            <KzRow label="Diğer Gelir" value={gelirler.digerGelir} color="text-green" />
            <div className="border-t border-border pt-2">
              <KzRow label="TOPLAM GELİR" value={gelirler.toplam} color="text-green" bold />
            </div>
          </div>
        </div>

        {/* Giderler */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <h4 className="text-xs font-semibold text-red mb-3">GİDERLER</h4>
          <div className="space-y-2">
            {giderler.buroGiderleri && typeof giderler.buroGiderleri === 'object' ? (
              Object.entries(giderler.buroGiderleri as Record<string, number>).map(([kat, tutar]) => (
                <KzRow key={kat} label={kat} value={tutar} color="text-red" />
              ))
            ) : null}
            <div className="border-t border-border pt-2">
              <KzRow label="TOPLAM GİDER" value={(giderler.toplam as number) || 0} color="text-red" bold />
            </div>
          </div>
        </div>

        {/* Net */}
        <div className="bg-surface border border-border rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-xs text-text-muted mb-2">NET KÂR / ZARAR</div>
          <div className={`font-[var(--font-playfair)] text-3xl font-bold ${net >= 0 ? 'text-green' : 'text-red'}`}>
            {fmt(net)}
          </div>
          {karZarar?.karZararOrani !== undefined && (
            <div className={`text-xs mt-1 ${net >= 0 ? 'text-green' : 'text-red'}`}>
              {(karZarar.karZararOrani as number).toFixed(1)}% oran
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KzRow({ label, value, color, bold }: { label: string; value?: number; color?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className={bold ? 'font-bold text-text' : 'text-text-muted'}>{label}</span>
      <span className={`font-semibold ${bold ? 'font-bold' : ''} ${color || 'text-text'}`}>{fmt(value ?? 0)}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 4: Kârlılık
// ══════════════════════════════════════════════════════════════
function KarlilikTab() {
  const { data: karlilik, isLoading } = useDosyaKarlilik();

  if (isLoading) return <div className="text-center py-8 text-text-muted text-xs">Yükleniyor...</div>;

  const dosyalar = ((karlilik?.dosyalar as Record<string, unknown>[]) || []);
  const ozet = (karlilik?.ozet || {}) as Record<string, number>;

  return (
    <div>
      {/* Özet KPI */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <MiniKpi label="Dosya Sayısı" value={String(ozet.dosyaSayisi || 0)} />
        <MiniKpi label="Toplam Masraf" value={fmt(ozet.topMasraf || 0)} />
        <MiniKpi label="Toplam Gelir" value={fmt(ozet.topGelir || 0)} color="text-green" />
        <MiniKpi label="Net" value={fmt(ozet.topNet || 0)} color={(ozet.topNet || 0) >= 0 ? 'text-green' : 'text-red'} />
        <MiniKpi label="Ort. Kârlılık" value={`%${(ozet.ortKarlilik || 0).toFixed(1)}`} color="text-gold" />
      </div>

      {/* Dosya Tablosu */}
      {dosyalar.length === 0 ? (
        <EmptyState icon="🎯" message="Kârlılık verisi bulunamadı" />
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_100px_100px_100px_80px] gap-2 px-4 py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider">
            <span>Dosya No</span>
            <span>Müvekkil</span>
            <span>Konu</span>
            <span>Masraf</span>
            <span>Gelir</span>
            <span>Net</span>
            <span>Oran</span>
          </div>
          {dosyalar.slice(0, 20).map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_100px_100px_100px_80px] gap-2 px-4 py-2.5 border-b border-border/50 text-xs">
              <span className="text-gold font-bold truncate">{(d.dosyaNo as string) || '—'}</span>
              <span className="text-text truncate">{(d.muvAd as string) || '—'}</span>
              <span className="text-text-muted truncate">{(d.konu as string) || '—'}</span>
              <span className="text-text">{fmt((d.masraf as number) || 0)}</span>
              <span className="text-green">{fmt((d.gelir as number) || 0)}</span>
              <span className={`font-semibold ${((d.net as number) || 0) >= 0 ? 'text-green' : 'text-red'}`}>
                {fmt((d.net as number) || 0)}
              </span>
              <span className={`${((d.karlilikOrani as number) || 0) >= 0 ? 'text-green' : 'text-red'}`}>
                %{((d.karlilikOrani as number) || 0).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 5: Beklenen Gelir
// ══════════════════════════════════════════════════════════════
function BeklenenGelirTab() {
  const { data: beklenen, isLoading } = useBeklenenGelir();

  if (isLoading) return <div className="text-center py-8 text-text-muted text-xs">Yükleniyor...</div>;

  const beklenenler = ((beklenen?.beklenenler as Record<string, unknown>[]) || []);
  const ozet = (beklenen?.ozet || {}) as Record<string, number>;

  return (
    <div>
      {/* Özet */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <MiniKpi label="Toplam Beklenen" value={fmt(ozet.toplam || 0)} color="text-gold" />
        <MiniKpi label="Bu Ay" value={fmt(ozet.buAy || 0)} color="text-green" />
        <MiniKpi label="Gecikmiş" value={fmt(ozet.gecikmisToplam || 0)} color="text-red" />
      </div>

      {beklenenler.length === 0 ? (
        <EmptyState icon="📅" message="Beklenen gelir kaydı bulunamadı" />
      ) : (
        <div className="space-y-2">
          {beklenenler.map((b, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 bg-surface border rounded-lg p-4 ${
                (b.gecikmisMi as boolean) ? 'border-red/30 bg-red-dim' : 'border-border'
              }`}
            >
              <div className="text-center min-w-[60px]">
                <div className="text-[10px] text-text-dim uppercase">
                  {(b.tarih as string) ? new Date(b.tarih as string).toLocaleString('tr-TR', { month: 'short' }) : '—'}
                </div>
                <div className="text-lg font-bold text-text">
                  {(b.tarih as string) ? new Date(b.tarih as string).getDate() : '—'}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-text">{(b.acik as string) || '—'}</div>
                <div className="text-[11px] text-text-muted">
                  {(b.dosyaNo as string) && <span>{b.dosyaNo as string}</span>}
                  {(b.tur as string) && <span> · {b.tur as string}</span>}
                </div>
              </div>
              <div className={`text-sm font-bold ${(b.gecikmisMi as boolean) ? 'text-red' : 'text-gold'}`}>
                {fmt((b.tutar as number) || 0)}
              </div>
              {(b.gecikmisMi as boolean) && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red/20 text-red rounded">GECİKMİŞ</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 6: Uyarılar
// ══════════════════════════════════════════════════════════════
function UyarilarTab() {
  const { data: uyarilar, isLoading } = useFinansUyarilar();

  if (isLoading) return <div className="text-center py-8 text-text-muted text-xs">Yükleniyor...</div>;

  const liste = Array.isArray(uyarilar) ? uyarilar : [];

  if (liste.length === 0) {
    return <EmptyState icon="✅" message="Tüm finansal göstergeler normal. Uyarı bulunmuyor." />;
  }

  return (
    <div className="space-y-2">
      {liste.map((u: Record<string, unknown>, i: number) => (
        <div
          key={i}
          className={`p-4 rounded-lg border ${
            u.oncelik === 'yuksek'
              ? 'bg-red-dim border-red/20'
              : u.oncelik === 'orta'
              ? 'bg-gold-dim border-gold/20'
              : 'bg-surface2 border-border'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">{(u.icon as string) || '⚠️'}</span>
            <div className="flex-1">
              <div className={`text-sm font-medium ${
                u.oncelik === 'yuksek' ? 'text-red' : u.oncelik === 'orta' ? 'text-gold' : 'text-text'
              }`}>
                {u.mesaj as string}
              </div>
              {typeof u.muvAd === 'string' && (
                <div className="text-xs text-text-muted mt-0.5">Müvekkil: {u.muvAd}</div>
              )}
              {typeof u.tutar === 'number' && u.tutar > 0 && (
                <div className="text-xs font-semibold text-text mt-1">{fmt(u.tutar)}</div>
              )}
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
              u.oncelik === 'yuksek' ? 'bg-red/20 text-red' :
              u.oncelik === 'orta' ? 'bg-gold/20 text-gold' :
              'bg-surface text-text-muted'
            }`}>
              {u.oncelik === 'yuksek' ? 'YÜKSEK' : u.oncelik === 'orta' ? 'ORTA' : 'BİLGİ'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Ortak Componentler ───────────────────────────────────────

function MiniKpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`font-[var(--font-playfair)] text-lg font-bold ${color || 'text-text'}`}>{value}</div>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="text-center py-16 bg-surface border border-border rounded-lg">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-sm text-text-muted">{message}</div>
    </div>
  );
}
