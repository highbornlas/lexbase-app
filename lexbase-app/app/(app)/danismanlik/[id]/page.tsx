'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDanismanlik, useDanismanlikKaydet, useDanismanlikSil, useDanismanlikArsivle, type Danismanlik, type EforKaydi, EFOR_KATEGORILERI } from '@/lib/hooks/useDanismanlik';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmt, fmtTarih } from '@/lib/utils';
import { DanismanlikModal } from '@/components/modules/DanismanlikModal';

const DURUM_RENK: Record<string, string> = {
  'Taslak': 'bg-surface2 text-text-dim border-border',
  'Devam Ediyor': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'İncelemede': 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  'Müvekkil Onayında': 'bg-gold-dim text-gold border-gold/20',
  'Revize Bekliyor': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Gönderildi': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  'Tamamlandı': 'bg-green-dim text-green border-green/20',
  'İptal': 'bg-surface2 text-text-dim border-border',
};

type TabKey = 'ozet' | 'efor' | 'notlar';

export default function DanismanlikDetayPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: dan, isLoading } = useDanismanlik(id);
  const { data: muvekkillar } = useMuvekkillar();
  const kaydet = useDanismanlikKaydet();
  const silMut = useDanismanlikSil();
  const arsivleMut = useDanismanlikArsivle();
  const [aktifTab, setAktifTab] = useState<TabKey>('ozet');

  // Efor ekleme
  const [yeniEfor, setYeniEfor] = useState({ aciklama: '', sure: '', kategori: '', tarih: new Date().toISOString().split('T')[0] });
  // Not ekleme
  const [yeniNot, setYeniNot] = useState('');
  const [duzenleModu, setDuzenleModu] = useState(false);

  const muvAd = useMemo(() => {
    if (!dan?.muvId || !muvekkillar) return '—';
    return muvekkillar.find((m) => m.id === dan.muvId)?.ad || '—';
  }, [dan, muvekkillar]);

  if (isLoading) return <div className="text-center py-16 text-text-muted text-sm">Yükleniyor...</div>;
  if (!dan || (dan as Record<string, unknown>)._silindi) return <div className="text-center py-16 text-text-muted text-sm">{(dan as Record<string, unknown> | null)?._silindi ? 'Bu danışmanlık kaydı silinmiş' : 'Danışmanlık bulunamadı'}</div>;

  const isSureklii = dan.sozlesmeModeli === 'sureklii';
  const eforlar = dan.eforlar || [];
  const toplamEforDk = eforlar.reduce((t, e) => t + (e.sure || 0), 0);
  const notlar = dan.notlar || [];

  function fmtSure(dk: number) {
    const saat = Math.floor(dk / 60);
    const kalan = dk % 60;
    if (dk === 0) return '—';
    if (saat === 0) return `${kalan} dk`;
    return kalan > 0 ? `${saat} sa ${kalan} dk` : `${saat} saat`;
  }

  async function handleEforEkle() {
    if (!yeniEfor.aciklama.trim() || !yeniEfor.sure) return;
    const efor: EforKaydi = {
      id: crypto.randomUUID(),
      tarih: yeniEfor.tarih,
      sure: Number(yeniEfor.sure),
      aciklama: yeniEfor.aciklama,
      kategori: yeniEfor.kategori || 'Diğer',
    };
    const yeniEforlar = [...eforlar, efor];
    await kaydet.mutateAsync({
      ...dan!,
      eforlar: yeniEforlar,
      toplamEforDk: yeniEforlar.reduce((t, e) => t + (e.sure || 0), 0),
    } as Danismanlik);
    setYeniEfor({ aciklama: '', sure: '', kategori: '', tarih: new Date().toISOString().split('T')[0] });
  }

  async function handleEforSil(eforId: string) {
    const yeniEforlar = eforlar.filter((e) => e.id !== eforId);
    await kaydet.mutateAsync({
      ...dan!,
      eforlar: yeniEforlar,
      toplamEforDk: yeniEforlar.reduce((t, e) => t + (e.sure || 0), 0),
    } as Danismanlik);
  }

  async function handleNotEkle() {
    if (!yeniNot.trim()) return;
    const not = { id: crypto.randomUUID(), tarih: new Date().toISOString(), icerik: yeniNot.trim() };
    await kaydet.mutateAsync({ ...dan!, notlar: [...notlar, not] } as Danismanlik);
    setYeniNot('');
  }

  async function handleNotSil(notId: string) {
    await kaydet.mutateAsync({ ...dan!, notlar: notlar.filter((n) => n.id !== notId) } as Danismanlik);
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Breadcrumb + Header */}
      <div className="flex items-center gap-2 mb-4 text-xs text-text-muted">
        <Link href="/danismanlik" className="hover:text-gold transition-colors">Danışmanlık</Link>
        <span>/</span>
        <span className="text-text">{dan.konu || dan.no || 'Detay'}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-[var(--font-playfair)] text-xl text-text font-bold mb-1">{dan.konu || '—'}</h1>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>{muvAd}</span>
            {dan.tur && <span className="px-1.5 py-0.5 bg-surface2 rounded text-text-dim">{dan.tur}</span>}
            {isSureklii && <span className="px-1.5 py-0.5 bg-blue-400/10 text-blue-400 rounded border border-blue-400/20">🔄 Sürekli Sözleşme</span>}
            <span className={`font-bold px-1.5 py-0.5 rounded border ${DURUM_RENK[dan.durum || ''] || ''}`}>{dan.durum || '—'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDuzenleModu(true)}
            className="text-xs px-3 py-1.5 rounded bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors">
            Düzenle
          </button>
          <button
            onClick={() => { arsivleMut.mutate(dan); }}
            className="text-xs px-3 py-1.5 rounded bg-surface text-text-muted border border-border hover:border-gold/40 transition-colors"
            title="Arşive kaldır"
          >
            📦
          </button>
          <button
            onClick={async () => {
              if (confirm(`"${dan.konu || dan.no || 'Bu danışmanlık'}" silinecek. Emin misiniz?`)) {
                await silMut.mutateAsync(dan);
                router.push('/danismanlik');
              }
            }}
            className="text-xs px-3 py-1.5 rounded bg-surface text-red border border-red/20 hover:bg-red-dim transition-colors"
            title="Sil"
          >
            🗑️
          </button>
          <button onClick={() => router.push('/danismanlik')} className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-muted hover:text-text transition-colors">
            ← Listeye Dön
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{isSureklii ? 'Aylık Ücret' : 'Toplam Ücret'}</div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-gold">{fmt(isSureklii ? (dan.aylikUcret || 0) : (dan.ucret || 0))}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Tahsil Edilen</div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-green">{fmt(dan.tahsilEdildi || 0)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Toplam Efor</div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-purple-400">{fmtSure(toplamEforDk)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Kayıt Sayısı</div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-text">{eforlar.length}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Not Sayısı</div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-text">{notlar.length}</div>
        </div>
      </div>

      {/* Tab Navigasyonu */}
      <div className="flex border-b border-border mb-5">
        {([
          { key: 'ozet' as TabKey, label: '📋 Özet' },
          { key: 'efor' as TabKey, label: `⏱️ Efor Kayıtları (${eforlar.length})` },
          { key: 'notlar' as TabKey, label: `📝 Notlar (${notlar.length})` },
        ]).map((tab) => (
          <button key={tab.key} onClick={() => setAktifTab(tab.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${aktifTab === tab.key ? 'border-gold text-gold' : 'border-transparent text-text-muted hover:text-text'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Özet ──────────────────────────────────── */}
      {aktifTab === 'ozet' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text mb-3">Genel Bilgiler</h3>
            <OzetRow label="Müvekkil" value={muvAd} />
            <OzetRow label="Tür" value={dan.tur} />
            <OzetRow label="Konu" value={dan.konu} />
            <OzetRow label="Durum" value={dan.durum} />
            <OzetRow label="Sözleşme Modeli" value={isSureklii ? 'Sürekli Danışmanlık' : 'Tek Seferlik'} />
            {isSureklii && (
              <>
                <OzetRow label="Sözleşme Başlangıcı" value={fmtTarih(dan.sozlesmeBaslangic)} />
                <OzetRow label="Sözleşme Bitişi" value={fmtTarih(dan.sozlesmeBitis)} />
                <OzetRow label="Faturalama Döngüsü" value={
                  dan.taksitDongusu === 'aylik' ? 'Aylık' :
                  dan.taksitDongusu === '3aylik' ? '3 Aylık' :
                  dan.taksitDongusu === '6aylik' ? '6 Aylık' :
                  dan.taksitDongusu === 'yillik' ? 'Yıllık' : '—'
                } />
              </>
            )}
            {!isSureklii && (
              <>
                <OzetRow label="Başlangıç Tarihi" value={fmtTarih(dan.tarih)} />
                <OzetRow label="Teslim Tarihi" value={fmtTarih(dan.teslimTarih)} />
              </>
            )}
          </div>

          <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text mb-3">Finansal Bilgiler</h3>
            {isSureklii ? (
              <>
                <OzetRow label="Aylık Ücret" value={fmt(dan.aylikUcret || 0)} color="text-gold" />
                <OzetRow label="Yıllık Değer" value={fmt((dan.aylikUcret || 0) * 12)} color="text-gold" />
              </>
            ) : (
              <OzetRow label="Toplam Ücret" value={fmt(dan.ucret || 0)} color="text-gold" />
            )}
            <OzetRow label="Tahsil Edilen" value={fmt(dan.tahsilEdildi || 0)} color="text-green" />
            <OzetRow label="Kalan Alacak" value={fmt((dan.ucret || dan.aylikUcret || 0) - (dan.tahsilEdildi || 0))} color="text-red" />

            {dan.aciklama && (
              <div className="pt-3 border-t border-border">
                <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Açıklama</div>
                <div className="text-xs text-text-muted whitespace-pre-wrap">{dan.aciklama}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Efor Kayıtları ────────────────────────── */}
      {aktifTab === 'efor' && (
        <div className="space-y-4">
          {/* Yeni Efor Ekle */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-[11px] text-text-muted font-medium uppercase tracking-wider mb-3">+ Yeni Efor Kaydı</div>
            <div className="grid grid-cols-[120px_80px_1fr_120px_100px] gap-3 items-end">
              <div>
                <label className="text-[10px] text-text-dim block mb-1">Tarih</label>
                <input type="date" value={yeniEfor.tarih} onChange={(e) => setYeniEfor((p) => ({ ...p, tarih: e.target.value }))}
                  className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[10px] text-text-dim block mb-1">Süre (dk)</label>
                <input type="number" value={yeniEfor.sure} onChange={(e) => setYeniEfor((p) => ({ ...p, sure: e.target.value }))} placeholder="60"
                  className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[10px] text-text-dim block mb-1">Açıklama</label>
                <input type="text" value={yeniEfor.aciklama} onChange={(e) => setYeniEfor((p) => ({ ...p, aciklama: e.target.value }))} placeholder="Yapılan iş..."
                  className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[10px] text-text-dim block mb-1">Kategori</label>
                <select value={yeniEfor.kategori} onChange={(e) => setYeniEfor((p) => ({ ...p, kategori: e.target.value }))}
                  className="w-full px-2 py-2 bg-bg border border-border rounded text-xs text-text focus:outline-none focus:border-gold">
                  <option value="">Seçiniz...</option>
                  {EFOR_KATEGORILERI.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <button type="button" onClick={handleEforEkle} disabled={!yeniEfor.aciklama.trim() || !yeniEfor.sure || kaydet.isPending}
                className="px-3 py-2 bg-gold text-bg font-semibold rounded text-xs hover:bg-gold-light disabled:opacity-40 transition-colors">
                {kaydet.isPending ? '...' : 'Ekle'}
              </button>
            </div>
          </div>

          {/* Efor Listesi */}
          {eforlar.length === 0 ? (
            <div className="text-center py-12 bg-surface border border-border rounded-lg">
              <div className="text-3xl mb-2">⏱️</div>
              <div className="text-xs text-text-muted">Henüz efor kaydı eklenmemiş</div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[100px_80px_120px_1fr_60px] gap-2 px-4 py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider">
                <span>Tarih</span>
                <span>Süre</span>
                <span>Kategori</span>
                <span>Açıklama</span>
                <span></span>
              </div>
              {[...eforlar].sort((a, b) => (b.tarih || '').localeCompare(a.tarih || '')).map((e) => (
                <div key={e.id} className="grid grid-cols-[100px_80px_120px_1fr_60px] gap-2 px-4 py-3 border-b border-border/50 text-xs items-center hover:bg-gold-dim transition-colors group">
                  <span className="text-text-dim">{fmtTarih(e.tarih)}</span>
                  <span className="font-bold text-gold">{fmtSure(e.sure)}</span>
                  <span className="text-text-dim truncate">{e.kategori || '—'}</span>
                  <span className="text-text">{e.aciklama}</span>
                  <button onClick={() => handleEforSil(e.id)}
                    className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 text-xs">
                    🗑️
                  </button>
                </div>
              ))}
              <div className="px-4 py-2.5 bg-surface2 flex justify-between text-xs">
                <span className="font-semibold text-text">Toplam: {eforlar.length} kayıt</span>
                <span className="font-bold text-gold">{fmtSure(toplamEforDk)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Notlar ────────────────────────────────── */}
      {aktifTab === 'notlar' && (
        <div className="space-y-4">
          {/* Not Ekle */}
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
        <DanismanlikModal
          open={duzenleModu}
          onClose={() => setDuzenleModu(false)}
          danismanlik={dan}
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
