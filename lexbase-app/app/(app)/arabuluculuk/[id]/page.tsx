'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useArabuluculuk, useArabuluculukKaydet, useArabuluculukSil, useArabuluculukArsivle,
  type Arabuluculuk, type OturumKaydi,
  YASAL_SURE_HAFTA, hesaplaYasalSureBitis,
} from '@/lib/hooks/useArabuluculuk';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { fmt, fmtTarih } from '@/lib/utils';
import { ArabuluculukModal } from '@/components/modules/ArabuluculukModal';

const DURUM_RENK: Record<string, string> = {
  'Başvuru': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Arabulucu Atandı': 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  'Görüşme': 'bg-gold-dim text-gold border-gold/20',
  'Anlaşma': 'bg-green-dim text-green border-green/20',
  'Anlaşamama': 'bg-red-dim text-red border-red/20',
  'İptal': 'bg-surface2 text-text-dim border-border',
};

type TabKey = 'ozet' | 'oturumlar' | 'notlar';

export default function ArabuluculukDetayPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: arb, isLoading } = useArabuluculuk(id);
  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const kaydet = useArabuluculukKaydet();
  const silMut = useArabuluculukSil();
  const arsivleMut = useArabuluculukArsivle();
  const [aktifTab, setAktifTab] = useState<TabKey>('ozet');

  // Oturum ekleme
  const [yeniOturum, setYeniOturum] = useState({ tarih: new Date().toISOString().split('T')[0], saat: '', sure: '', ozet: '', sonuc: 'Devam' });
  // Not ekleme
  const [yeniNot, setYeniNot] = useState('');
  const [duzenleModu, setDuzenleModu] = useState(false);

  const muvAd = useMemo(() => {
    if (!arb?.muvId || !muvekkillar) return '—';
    return muvekkillar.find((m) => m.id === arb.muvId)?.ad || '—';
  }, [arb, muvekkillar]);

  const iliskiliDosya = useMemo(() => {
    if (!arb?.iliskiliDosyaId) return null;
    if (arb.iliskiliDosyaTip === 'dava') {
      const d = davalar?.find((x) => x.id === arb.iliskiliDosyaId);
      return d ? { label: `⚖️ ${(d as Record<string, unknown>).esasNo || d.konu || 'Dava'}`, href: `/davalar/${d.id}` } : null;
    }
    if (arb.iliskiliDosyaTip === 'icra') {
      const ic = icralar?.find((x) => x.id === arb.iliskiliDosyaId);
      return ic ? { label: `📋 ${(ic as Record<string, unknown>).esasNo || ic.konu || 'İcra'}`, href: `/icra/${ic.id}` } : null;
    }
    return null;
  }, [arb, davalar, icralar]);

  if (isLoading) return <div className="text-center py-16 text-text-muted text-sm">Yükleniyor...</div>;
  if (!arb) return <div className="text-center py-16 text-text-muted text-sm">Arabuluculuk dosyası bulunamadı</div>;

  const oturumlar = arb.oturumlar || [];
  const notlar = arb.notlar || [];
  const sureBitis = hesaplaYasalSureBitis(arb.tur, arb.ilkOturumTarih, arb.sureUzatmaHafta || 0);
  const kalanGun = sureBitis ? Math.ceil((new Date(sureBitis).getTime() - Date.now()) / 86400000) : null;
  const aktifDurum = ['Başvuru', 'Arabulucu Atandı', 'Görüşme'].includes(arb.durum || '');

  async function handleOturumEkle() {
    if (!yeniOturum.tarih) return;
    const oturum: OturumKaydi = {
      id: crypto.randomUUID(),
      tarih: yeniOturum.tarih,
      saat: yeniOturum.saat || undefined,
      sure: yeniOturum.sure ? Number(yeniOturum.sure) : undefined,
      ozet: yeniOturum.ozet,
      sonuc: yeniOturum.sonuc,
    };
    const yeniOturumlar = [...oturumlar, oturum];
    await kaydet.mutateAsync({
      ...arb!,
      oturumlar: yeniOturumlar,
      oturumSayisi: yeniOturumlar.length,
      sonOturumTarih: yeniOturum.tarih,
    } as Arabuluculuk);
    setYeniOturum({ tarih: new Date().toISOString().split('T')[0], saat: '', sure: '', ozet: '', sonuc: 'Devam' });
  }

  async function handleOturumSil(oturumId: string) {
    const yeniOturumlar = oturumlar.filter((o) => o.id !== oturumId);
    await kaydet.mutateAsync({
      ...arb!,
      oturumlar: yeniOturumlar,
      oturumSayisi: yeniOturumlar.length,
    } as Arabuluculuk);
  }

  async function handleNotEkle() {
    if (!yeniNot.trim()) return;
    const not = { id: crypto.randomUUID(), tarih: new Date().toISOString(), icerik: yeniNot.trim() };
    await kaydet.mutateAsync({ ...arb!, notlar: [...notlar, not] } as Arabuluculuk);
    setYeniNot('');
  }

  async function handleNotSil(notId: string) {
    await kaydet.mutateAsync({ ...arb!, notlar: notlar.filter((n) => n.id !== notId) } as Arabuluculuk);
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-xs text-text-muted">
        <Link href="/arabuluculuk" className="hover:text-gold transition-colors">Arabuluculuk</Link>
        <span>/</span>
        <span className="text-text">{arb.no || arb.konu || 'Detay'}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-playfair)] text-xl text-text font-bold mb-1">{arb.konu || '—'}</h1>
          <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
            <span>{muvAd}</span>
            {arb.tur && <span className={`font-bold ${{'Ticari': 'text-gold', 'İş': 'text-blue-400', 'Tüketici': 'text-green', 'Aile': 'text-purple-400'}[arb.tur] || 'text-text-muted'}`}>{arb.tur}</span>}
            <span className={`font-bold px-1.5 py-0.5 rounded border ${DURUM_RENK[arb.durum || ''] || ''}`}>{arb.durum || '—'}</span>
            {arb.arabulucu && <span>Arabulucu: {arb.arabulucu}</span>}
            {iliskiliDosya && (
              <Link href={iliskiliDosya.href} className="text-gold hover:underline">{iliskiliDosya.label}</Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDuzenleModu(true)}
            className="text-xs px-3 py-1.5 rounded bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors">
            Düzenle
          </button>
          <button
            onClick={() => { arsivleMut.mutate(arb); }}
            className="text-xs px-3 py-1.5 rounded bg-surface text-text-muted border border-border hover:border-gold/40 transition-colors"
            title="Arşive kaldır"
          >
            📦
          </button>
          <button
            onClick={async () => {
              if (confirm(`"${arb.konu || arb.no || 'Bu dosya'}" silinecek. Emin misiniz?`)) {
                await silMut.mutateAsync(arb);
                router.push('/arabuluculuk');
              }
            }}
            className="text-xs px-3 py-1.5 rounded bg-surface text-red border border-red/20 hover:bg-red-dim transition-colors"
            title="Sil"
          >
            🗑️
          </button>
          <button onClick={() => router.push('/arabuluculuk')} className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-muted hover:text-text transition-colors">
            ← Listeye Dön
          </button>
        </div>
      </div>

      {/* Yasal Süre Uyarısı */}
      {sureBitis && aktifDurum && (
        <div className={`mb-5 rounded-lg p-3 text-xs border flex items-center justify-between ${
          kalanGun !== null && kalanGun <= 7 ? 'bg-red-dim border-red/20 text-red' :
          kalanGun !== null && kalanGun <= 14 ? 'bg-orange-400/10 border-orange-400/20 text-orange-400' :
          'bg-blue-400/10 border-blue-400/20 text-blue-400'
        }`}>
          <span>
            ⏰ <span className="font-bold">Yasal Süre:</span> {arb.tur} — {YASAL_SURE_HAFTA[arb.tur || ''] || '?'} hafta
            {(arb.sureUzatmaHafta || 0) > 0 && ` (+${arb.sureUzatmaHafta} hafta uzatma)`}
            <span className="ml-2">· Bitiş: <span className="font-bold">{new Date(sureBitis).toLocaleDateString('tr-TR')}</span></span>
            {kalanGun !== null && (
              <span className="ml-2 font-bold">
                · {kalanGun > 0 ? `${kalanGun} gün kaldı` : kalanGun === 0 ? 'BUGÜN DOLUYOR!' : `${Math.abs(kalanGun)} gün geçti!`}
              </span>
            )}
          </span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Talep</div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-gold">{fmt(arb.talep || 0)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Anlaşma Ücreti</div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-green">{fmt(arb.anlasmaUcret || 0)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Vekalet Ücreti</div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-text">{fmt(arb.ucret || 0)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Oturum Sayısı</div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-purple-400">{oturumlar.length || arb.oturumSayisi || 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Not</div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-text">{notlar.length}</div>
        </div>
      </div>

      {/* Tab Navigasyonu */}
      <div className="flex border-b border-border mb-5">
        {([
          { key: 'ozet' as TabKey, label: '📋 Özet' },
          { key: 'oturumlar' as TabKey, label: `🗓️ Oturumlar (${oturumlar.length})` },
          { key: 'notlar' as TabKey, label: `📝 Notlar (${notlar.length})` },
        ]).map((tab) => (
          <button key={tab.key} onClick={() => setAktifTab(tab.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${aktifTab === tab.key ? 'border-gold text-gold' : 'border-transparent text-text-muted hover:text-text'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Özet ────────────────────────────────── */}
      {aktifTab === 'ozet' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text mb-3">Genel Bilgiler</h3>
            <OzetRow label="Müvekkil" value={muvAd} />
            <OzetRow label="Tür" value={arb.tur} />
            <OzetRow label="Konu" value={arb.konu} />
            <OzetRow label="Durum" value={arb.durum} />
            <OzetRow label="Arabulucu" value={arb.arabulucu} />
            <OzetRow label="Karşı Taraf" value={arb.karsiTaraf} />
            <OzetRow label="Karşı Taraf Vekili" value={arb.karsiTarafVekil} />
            <OzetRow label="Başvuru Tarihi" value={fmtTarih(arb.basvuruTarih)} />
            <OzetRow label="İlk Oturum Tarihi" value={fmtTarih(arb.ilkOturumTarih)} />
            {arb.sonTutanakNo && <OzetRow label="Son Tutanak No" value={arb.sonTutanakNo} />}
            {iliskiliDosya && (
              <div className="flex justify-between text-xs pt-2 border-t border-border">
                <span className="text-text-muted">İlişkili Dosya</span>
                <Link href={iliskiliDosya.href} className="text-gold hover:underline font-medium">{iliskiliDosya.label}</Link>
              </div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text mb-3">Finansal Bilgiler</h3>
            <OzetRow label="Talep Tutarı" value={fmt(arb.talep || 0)} color="text-gold" />
            <OzetRow label="Anlaşma Ücreti" value={fmt(arb.anlasmaUcret || 0)} color="text-green" />
            <OzetRow label="Vekalet Ücreti" value={fmt(arb.ucret || 0)} color="text-text" />
            <OzetRow label="Tahsil Edilen" value={fmt(arb.tahsilEdildi || 0)} color="text-green" />
            <OzetRow label="Kalan Alacak" value={fmt((arb.ucret || 0) - (arb.tahsilEdildi || 0))} color="text-red" />
            {arb.aciklama && (
              <div className="pt-3 border-t border-border">
                <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Açıklama</div>
                <div className="text-xs text-text-muted whitespace-pre-wrap">{arb.aciklama}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Oturumlar ───────────────────────────── */}
      {aktifTab === 'oturumlar' && (
        <div className="space-y-4">
          {/* Yeni Oturum Ekle */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-[11px] text-text-muted font-medium uppercase tracking-wider mb-3">+ Yeni Oturum Kaydı</div>
            <div className="grid grid-cols-[120px_80px_80px_1fr_100px_100px] gap-3 items-end">
              <div>
                <label className="text-[10px] text-text-dim block mb-1">Tarih</label>
                <input type="date" value={yeniOturum.tarih} onChange={(e) => setYeniOturum((p) => ({ ...p, tarih: e.target.value }))}
                  className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[10px] text-text-dim block mb-1">Saat</label>
                <input type="time" value={yeniOturum.saat} onChange={(e) => setYeniOturum((p) => ({ ...p, saat: e.target.value }))}
                  className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[10px] text-text-dim block mb-1">Süre (dk)</label>
                <input type="number" value={yeniOturum.sure} onChange={(e) => setYeniOturum((p) => ({ ...p, sure: e.target.value }))} placeholder="60"
                  className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[10px] text-text-dim block mb-1">Özet</label>
                <input type="text" value={yeniOturum.ozet} onChange={(e) => setYeniOturum((p) => ({ ...p, ozet: e.target.value }))} placeholder="Oturum özeti..."
                  className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[10px] text-text-dim block mb-1">Sonuç</label>
                <select value={yeniOturum.sonuc} onChange={(e) => setYeniOturum((p) => ({ ...p, sonuc: e.target.value }))}
                  className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold">
                  <option value="Devam">Devam</option>
                  <option value="Ertelendi">Ertelendi</option>
                  <option value="Anlaşma">Anlaşma</option>
                  <option value="Anlaşamama">Anlaşamama</option>
                </select>
              </div>
              <button type="button" onClick={handleOturumEkle} disabled={!yeniOturum.tarih || kaydet.isPending}
                className="px-3 py-2 bg-gold text-bg font-semibold rounded text-xs hover:bg-gold-light disabled:opacity-40 transition-colors">
                {kaydet.isPending ? '...' : 'Ekle'}
              </button>
            </div>
          </div>

          {/* Oturum Listesi */}
          {oturumlar.length === 0 ? (
            <div className="text-center py-12 bg-surface border border-border rounded-lg">
              <div className="text-3xl mb-2">🗓️</div>
              <div className="text-xs text-text-muted">Henüz oturum kaydı eklenmemiş</div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[40px_100px_60px_60px_1fr_80px_60px] gap-2 px-4 py-2.5 border-b border-border text-[10px] text-text-muted font-medium uppercase tracking-wider">
                <span>#</span>
                <span>Tarih</span>
                <span>Saat</span>
                <span>Süre</span>
                <span>Özet</span>
                <span>Sonuç</span>
                <span></span>
              </div>
              {[...oturumlar].sort((a, b) => (a.tarih || '').localeCompare(b.tarih || '')).map((o, idx) => (
                <div key={o.id} className="grid grid-cols-[40px_100px_60px_60px_1fr_80px_60px] gap-2 px-4 py-3 border-b border-border/50 text-xs items-center hover:bg-gold-dim transition-colors group">
                  <span className="text-text-dim font-bold">{idx + 1}</span>
                  <span className="text-text-dim">{fmtTarih(o.tarih)}</span>
                  <span className="text-text-dim">{o.saat || '—'}</span>
                  <span className="text-gold font-semibold">{o.sure ? `${o.sure} dk` : '—'}</span>
                  <span className="text-text truncate">{o.ozet || '—'}</span>
                  <span className={`text-[10px] font-bold ${
                    o.sonuc === 'Anlaşma' ? 'text-green' :
                    o.sonuc === 'Anlaşamama' ? 'text-red' :
                    o.sonuc === 'Ertelendi' ? 'text-orange-400' : 'text-blue-400'
                  }`}>{o.sonuc || '—'}</span>
                  <button onClick={() => handleOturumSil(o.id)}
                    className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 text-xs">
                    🗑️
                  </button>
                </div>
              ))}
              <div className="px-4 py-2.5 bg-surface2 text-xs font-semibold text-text">
                Toplam: {oturumlar.length} oturum
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Notlar ──────────────────────────────── */}
      {aktifTab === 'notlar' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input type="text" value={yeniNot} onChange={(e) => setYeniNot(e.target.value)}
              placeholder="Not ekle..."
              onKeyDown={(e) => { if (e.key === 'Enter') handleNotEkle(); }}
              className="flex-1 px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors" />
            <button onClick={handleNotEkle} disabled={!yeniNot.trim() || kaydet.isPending}
              className="px-4 py-2.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light disabled:opacity-40 transition-colors">
              + Ekle
            </button>
          </div>

          {notlar.length === 0 ? (
            <div className="text-center py-12 bg-surface border border-border rounded-lg">
              <div className="text-3xl mb-2">📝</div>
              <div className="text-xs text-text-muted">Henüz not eklenmemiş</div>
            </div>
          ) : (
            <div className="space-y-2">
              {[...notlar].sort((a, b) => (b.tarih || '').localeCompare(a.tarih || '')).map((n) => (
                <div key={n.id} className="flex items-start gap-3 bg-surface border border-border rounded-lg p-3 group">
                  <div className="flex-1">
                    <div className="text-xs text-text">{n.icerik}</div>
                    <div className="text-[10px] text-text-dim mt-1">
                      {new Date(n.tarih).toLocaleString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button onClick={() => handleNotSil(n.id)}
                    className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 text-xs p-1">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Düzenleme Modal */}
      {duzenleModu && (
        <ArabuluculukModal
          open={duzenleModu}
          onClose={() => setDuzenleModu(false)}
          arabuluculuk={arb}
        />
      )}
    </div>
  );
}

function OzetRow({ label, value, color }: { label: string; value?: string | null; color?: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span className={`font-medium ${color || 'text-text'}`}>{value || '—'}</span>
    </div>
  );
}
