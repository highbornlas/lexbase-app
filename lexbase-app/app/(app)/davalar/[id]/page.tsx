'use client';

import { use, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDava, useDavaKaydet, useDavaSil, useDavaArsivle } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmt, fmtTarih } from '@/lib/utils';
import {
  tamMahkemeAdi,
  esasNoGoster,
  davaciBelirle,
  durusmaTarihSaatGoster,
  durusmayaKalanGun,
  sureHesapla,
} from '@/lib/utils/uyapHelpers';
import { SureBadge, DurusmaBadge } from '@/components/ui/SureBadge';
import { DavaModal } from '@/components/modules/DavaModal';
import { DosyaEvrakTab } from '@/components/modules/DosyaEvrakTab';
import { TahsilatModal, type TahsilatKaydi } from '@/components/modules/TahsilatModal';
import { useSonErisim } from '@/lib/hooks/useSonErisim';

const TABS = [
  { key: 'ozet', label: 'Özet', icon: '📋' },
  { key: 'evrak', label: 'Evraklar', icon: '📄' },
  { key: 'harcama', label: 'Harcamalar', icon: '💸' },
  { key: 'tahsilat', label: 'Tahsilat', icon: '💰' },
  { key: 'sureler', label: 'Süreler', icon: '⏳' },
  { key: 'notlar', label: 'Notlar', icon: '📝' },
  { key: 'anlasma', label: 'Anlaşma', icon: '🤝' },
];

const ASAMA_RENK: Record<string, string> = {
  'İlk Derece': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'İstinaf': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  'Temyiz (Yargıtay)': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Kesinleşti': 'bg-green-dim text-green border-green/20',
};

const DURUM_RENK: Record<string, string> = {
  'Derdest': 'bg-green-dim text-green border-green/20',
  'Aktif': 'bg-green-dim text-green border-green/20',
  'Hazırlık Aşamasında': 'bg-gold-dim text-gold border-gold/20',
  'Beklemede': 'bg-gold-dim text-gold border-gold/20',
  'Kapalı': 'bg-surface2 text-text-dim border-border',
};

export default function DavaDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: dava, isLoading } = useDava(id);
  const { data: muvekkillar } = useMuvekkillar();
  const { data: icralar } = useIcralar();
  const router = useRouter();
  const davaKaydet = useDavaKaydet();
  const silMut = useDavaSil();
  const arsivleMut = useDavaArsivle();
  const [aktifTab, setAktifTab] = useState('ozet');
  const [duzenleModu, setDuzenleModu] = useState(false);
  const [tahsilatModal, setTahsilatModal] = useState(false);
  const [duzenlenecekTahsilat, setDuzenlenecekTahsilat] = useState<TahsilatKaydi | null>(null);
  const { kaydetErisim, toggleSabitle, isSabitlenen } = useSonErisim();

  useEffect(() => {
    if (dava && !(dava as Record<string, unknown>)._silindi) {
      const baslik = String(esasNoGoster(dava.esasYil, dava.esasNo) || dava.konu || dava.no || dava.id.slice(0, 8));
      kaydetErisim({ id: dava.id, tip: 'dava', baslik, tarih: new Date().toISOString() });
    }
  }, [dava?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Müvekkil adı
  const muvAd = useMemo(() => {
    if (!dava?.muvId || !muvekkillar) return '—';
    return muvekkillar.find((m) => m.id === dava.muvId)?.ad || '—';
  }, [dava, muvekkillar]);

  // Tam mahkeme adı
  const mahkemeAdi = useMemo(() => {
    if (!dava) return '';
    return tamMahkemeAdi(dava.il, dava.mno, dava.mtur, dava.adliye);
  }, [dava]);

  // Esas no
  const esasNo = useMemo(() => {
    if (!dava) return '';
    return esasNoGoster(dava.esasYil, dava.esasNo);
  }, [dava]);

  // Davacı / Davalı
  const taraflar = useMemo(() => {
    if (!dava) return { davaci: '—', davali: '—' };
    return davaciBelirle(dava.taraf, muvAd, dava.karsi || '—');
  }, [dava, muvAd]);

  // Duruşma bilgisi
  const durusmaKalan = useMemo(() => {
    if (!dava?.durusma) return null;
    return durusmayaKalanGun(dava.durusma);
  }, [dava]);

  // İlişkili İcra
  const iliskiliIcra = useMemo(() => {
    if (!dava?.iliskiliIcraId || !icralar) return null;
    return icralar.find((ic) => ic.id === dava.iliskiliIcraId) || null;
  }, [dava, icralar]);

  // Hesaplamalar
  const hesap = useMemo(() => {
    if (!dava) return { masraf: 0, tahsilat: 0, hakedis: 0, vekalet: 0, evrakSayisi: 0 };
    const masraf = (dava.harcamalar || []).reduce((t, h) => t + (h.tutar || 0), 0);
    const tahsilat = (dava.tahsilatlar || []).filter((t) => t.tur === 'tahsilat').reduce((t, h) => t + (h.tutar || 0), 0);
    const hakedis = (dava.tahsilatlar || []).filter((t) => t.tur === 'hakediş').reduce((t, h) => t + (h.tutar || 0), 0);
    const vekalet = (dava.tahsilatlar || []).filter((t) => t.tur === 'akdi_vekalet').reduce((t, h) => t + (h.tutar || 0), 0);
    const evrakSayisi = (dava.evraklar || []).length;
    return { masraf, tahsilat, hakedis, vekalet, evrakSayisi };
  }, [dava]);

  if (isLoading) {
    return <div className="text-center py-12 text-text-muted">Yükleniyor...</div>;
  }

  if (!dava || (dava as Record<string, unknown>)._silindi) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">❌</div>
        <div className="text-sm text-text-muted">{(dava as Record<string, unknown> | null)?._silindi ? 'Bu dava silinmiş' : 'Dava bulunamadı'}</div>
        <Link href="/davalar" className="text-xs text-gold mt-3 inline-block hover:underline">← Davalara dön</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted mb-4">
        <Link href="/davalar" className="hover:text-gold transition-colors">Davalar</Link>
        <span>›</span>
        <span className="text-text">{esasNo || dava.no || dava.id.slice(0, 8)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-[var(--font-playfair)] text-2xl text-gold font-bold">
              {esasNo || dava.no || '—'}
            </h1>
            {dava.davaTuru && (
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-surface2 text-text-muted border border-border">
                {dava.davaTuru}
              </span>
            )}
          </div>

          {dava.konu && <div className="text-sm text-text mt-1">{dava.konu}</div>}

          {mahkemeAdi && (
            <div className="text-xs text-gold/80 mt-1 font-medium">{mahkemeAdi}</div>
          )}

          <div className="text-xs text-text-muted mt-1">
            Davacı: <span className="text-text">{taraflar.davaci}</span>
            <span className="mx-1.5 text-text-dim">vs</span>
            Davalı: <span className="text-text">{taraflar.davali}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleSabitle({ id: dava.id, tip: 'dava', baslik: String(esasNo || dava.konu || dava.no || dava.id.slice(0, 8)), tarih: new Date().toISOString() })}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${isSabitlenen(dava.id) ? 'bg-gold/10 text-gold border-gold/20' : 'bg-surface text-text-muted border-border hover:border-gold/40'}`}
            title={isSabitlenen(dava.id) ? 'Hızlı erişimden kaldır' : 'Hızlı erişime sabitle'}
          >
            {isSabitlenen(dava.id) ? '⭐' : '☆'}
          </button>
          <button
            onClick={() => setDuzenleModu(true)}
            className="text-xs px-3 py-1.5 rounded bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors"
          >
            Düzenle
          </button>
          <button
            onClick={() => { arsivleMut.mutate(id); }}
            className="text-xs px-3 py-1.5 rounded bg-surface text-text-muted border border-border hover:border-gold/40 transition-colors"
            title="Arşive kaldır"
          >
            📦
          </button>
          <button
            onClick={async () => {
              if (confirm(`"${esasNo || dava.konu || 'Bu dava'}" silinecek. Emin misiniz?`)) {
                await silMut.mutateAsync(id);
                router.push('/davalar');
              }
            }}
            className="text-xs px-3 py-1.5 rounded bg-surface text-red border border-red/20 hover:bg-red-dim transition-colors"
            title="Sil"
          >
            🗑️
          </button>
          {dava.asama && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${ASAMA_RENK[dava.asama] || 'bg-surface2 text-text-muted border-border'}`}>
              {dava.asama}
            </span>
          )}
          {dava.durum && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${DURUM_RENK[dava.durum] || 'bg-surface2 text-text-dim border-border'}`}>
              {dava.durum}
            </span>
          )}
        </div>
      </div>

      {/* KPI Kartlar */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <KpiCard label="Mahkeme" value={mahkemeAdi || '—'} small />
        <KpiCard label="Esas No" value={esasNo || '—'} />
        <div className={`bg-surface border rounded-lg p-3 ${
          durusmaKalan !== null && durusmaKalan >= 0 && durusmaKalan <= 7 ? 'border-gold bg-gold-dim' : 'border-border'
        }`}>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Duruşma</div>
          {dava.durusma ? (
            <DurusmaBadge tarih={dava.durusma} saat={dava.durusmaSaati} />
          ) : (
            <div className="text-sm font-bold text-text-dim">—</div>
          )}
        </div>
        <KpiCard label="Toplam Masraf" value={fmt(hesap.masraf)} />
        <KpiCard label="Tahsilat" value={fmt(hesap.tahsilat)} color="text-green" />
        <KpiCard label="Evrak" value={hesap.evrakSayisi.toString()} />
      </div>

      {/* Kapanış Bilgisi */}
      {dava.durum === 'Kapalı' && dava.kapanisSebebi && (
        <div className="bg-surface2 border border-border rounded-lg p-4 mb-6 flex items-center gap-3">
          <span className="text-lg">🔒</span>
          <div>
            <div className="text-xs font-semibold text-text">Dosya Kapatıldı</div>
            <div className="text-[11px] text-text-muted">
              Sebep: <span className="text-text">{dava.kapanisSebebi}</span>
              {dava.kapanisTarih && <> · {fmtTarih(dava.kapanisTarih)}</>}
            </div>
          </div>
        </div>
      )}

      {/* Bilgi Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <InfoCard title="Dava Bilgileri">
          <InfoRow label="Dava Türü" value={dava.davaTuru || '—'} />
          <InfoRow label="Konu" value={dava.konu || '—'} />
          <InfoRow label="Taraf" value={
            dava.taraf === 'davaci' ? 'Davacı' :
            dava.taraf === 'davali' ? 'Davalı' :
            dava.taraf === 'mudahil' ? 'Müdahil' :
            dava.taraf || '—'
          } />
          <InfoRow label="İl / Adliye" value={[dava.il, dava.adliye].filter(Boolean).join(' / ') || '—'} />
          <InfoRow label="Mahkeme" value={mahkemeAdi || '—'} />
          <InfoRow label="Esas No" value={esasNo || '—'} />
          <InfoRow label="Dava Tarihi" value={fmtTarih(dava.tarih) || '—'} />
          <InfoRow label="Dava Değeri" value={dava.deger ? fmt(dava.deger) : '—'} />
          <InfoRow label="Hakim" value={dava.hakim || '—'} />
        </InfoCard>

        <InfoCard title="Karar & Duruşma">
          <InfoRow label="Aşama" value={dava.asama || '—'} />
          <InfoRow label="Durum" value={dava.durum || '—'} />
          {dava.durumAciklama && <InfoRow label="Durum Açıklama" value={dava.durumAciklama} />}
          <InfoRow label="Karar No" value={dava.kararYil && dava.kararNo ? `${dava.kararYil}/${dava.kararNo}` : '—'} />
          <InfoRow label="Karar Tarihi" value={fmtTarih(dava.ktarih) || '—'} />
          <InfoRow label="Kesinleşme" value={fmtTarih(dava.kesin) || '—'} />
          <div className="border-t border-border pt-2 mt-2">
            <InfoRow label="Duruşma" value={durusmaTarihSaatGoster(dava.durusma, dava.durusmaSaati) || '—'} />
            {durusmaKalan !== null && durusmaKalan >= 0 && (
              <div className="mt-1 flex justify-end">
                <SureBadge kalanGun={durusmaKalan} label="duruşma" />
              </div>
            )}
          </div>
        </InfoCard>

        <InfoCard title="Taraflar & İlişkiler">
          <InfoRow label="Müvekkil" value={muvAd} />
          <InfoRow label="Davacı" value={taraflar.davaci} />
          <InfoRow label="Davalı" value={taraflar.davali} />
          <InfoRow label="Karşı Vekil" value={dava.karsav || '—'} />
          <div className="border-t border-border pt-2 mt-2">
            {iliskiliIcra ? (
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted">İlişkili İcra</span>
                <Link
                  href={`/icra/${iliskiliIcra.id}`}
                  className="text-gold hover:underline font-medium"
                >
                  {esasNoGoster(iliskiliIcra.esasYil, iliskiliIcra.esasNo) || iliskiliIcra.no || 'Dosya'}
                </Link>
              </div>
            ) : (
              <InfoRow label="İlişkili İcra" value={dava.icrano || '—'} />
            )}
          </div>
        </InfoCard>
      </div>

      {/* Tab Navigasyonu */}
      <div className="flex border-b border-border mb-4">
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
            {tab.key === 'sureler' && (dava.sureler || []).length > 0 && (
              <span className="ml-1 text-[10px] bg-gold/10 text-gold px-1 rounded">{dava.sureler!.length}</span>
            )}
            {tab.key === 'evrak' && hesap.evrakSayisi > 0 && (
              <span className="ml-1 text-[10px] bg-surface2 text-text-muted px-1 rounded">{hesap.evrakSayisi}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab İçerikleri */}
      <div className="bg-surface border border-border rounded-lg p-5">
        {aktifTab === 'ozet' && <OzetTab dava={dava} muvAd={muvAd} mahkeme={mahkemeAdi} taraflar={taraflar} esasNo={esasNo} hesap={hesap} />}
        {aktifTab === 'evrak' && <DosyaEvrakTab dosyaId={id} dosyaTipi="dava" muvId={dava.muvId} />}
        {aktifTab === 'harcama' && (
          <HarcamaTab
            harcamalar={dava.harcamalar || []}
            onEkle={(h) => {
              davaKaydet.mutate({ ...dava, harcamalar: [...(dava.harcamalar || []), h] });
            }}
            onGuncelle={(h) => {
              davaKaydet.mutate({ ...dava, harcamalar: (dava.harcamalar || []).map((x) => x.id === h.id ? h : x) });
            }}
            onSil={(hId) => {
              davaKaydet.mutate({ ...dava, harcamalar: (dava.harcamalar || []).filter((x) => x.id !== hId) });
            }}
          />
        )}
        {aktifTab === 'tahsilat' && (
          <TahsilatTab
            tahsilatlar={dava.tahsilatlar || []}
            onEkle={() => { setDuzenlenecekTahsilat(null); setTahsilatModal(true); }}
            onDuzenle={(t) => { setDuzenlenecekTahsilat(t); setTahsilatModal(true); }}
            onSil={(tahsilatId) => {
              const yeni = { ...dava, tahsilatlar: (dava.tahsilatlar || []).filter((t) => t.id !== tahsilatId) };
              davaKaydet.mutate(yeni);
            }}
          />
        )}
        {aktifTab === 'sureler' && (
          <SurelerTab
            sureler={dava.sureler || []}
            onEkle={(s) => {
              davaKaydet.mutate({ ...dava, sureler: [...(dava.sureler || []), s] });
            }}
            onSil={(sId) => {
              davaKaydet.mutate({ ...dava, sureler: (dava.sureler || []).filter((x) => x.id !== sId) });
            }}
          />
        )}
        {aktifTab === 'notlar' && (
          <NotlarTab
            notlar={dava.notlar || []}
            notText={dava.not}
            onEkle={(n) => {
              davaKaydet.mutate({ ...dava, notlar: [...(dava.notlar || []), n] });
            }}
            onSil={(nId) => {
              davaKaydet.mutate({ ...dava, notlar: (dava.notlar || []).filter((x) => (x.id as string) !== nId) });
            }}
          />
        )}
        {aktifTab === 'anlasma' && (
          <AnlasmaTab
            anlasma={dava.anlasma}
            onKaydet={(a) => {
              davaKaydet.mutate({ ...dava, anlasma: a });
            }}
          />
        )}
      </div>

      {/* Düzenleme Modal */}
      {duzenleModu && (
        <DavaModal
          open={duzenleModu}
          onClose={() => setDuzenleModu(false)}
          dava={dava}
          onCreated={(d) => {
            davaKaydet.mutate(d);
            setDuzenleModu(false);
          }}
        />
      )}

      {/* Tahsilat Modal */}
      <TahsilatModal
        open={tahsilatModal}
        onClose={() => setTahsilatModal(false)}
        tahsilat={duzenlenecekTahsilat}
        onKaydet={(tahsilat) => {
          const mevcut = dava.tahsilatlar || [];
          const varMi = mevcut.find((t) => t.id === tahsilat.id);
          const yeniListe = varMi
            ? mevcut.map((t) => (t.id === tahsilat.id ? tahsilat : t))
            : [...mevcut, tahsilat];
          davaKaydet.mutate({ ...dava, tahsilatlar: yeniListe });
        }}
      />
    </div>
  );
}

// ── Alt Componentler ─────────────────────────────────────────

function KpiCard({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`${small ? 'text-xs' : 'text-sm'} font-bold ${color || 'text-text'} truncate`}>{value}</div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <h4 className="text-xs font-semibold text-text mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="text-text font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

// ── Özet Sekmesi ─────────────────────────────────────────────
function OzetTab({
  dava,
  muvAd,
  mahkeme,
  taraflar,
  esasNo: esas,
  hesap,
}: {
  dava: import('@/lib/hooks/useDavalar').Dava;
  muvAd: string;
  mahkeme: string;
  taraflar: { davaci: string; davali: string };
  esasNo: string;
  hesap: { masraf: number; tahsilat: number; hakedis: number; vekalet: number; evrakSayisi: number };
}) {
  return (
    <div className="space-y-5">
      {/* UYAP Tarzı Dosya Kartı */}
      <div className="bg-surface2 rounded-lg p-5 border border-border">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div className="col-span-2 border-b border-border pb-3 mb-1">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Dosya Bilgileri</div>
            <div className="text-sm font-bold text-gold">{esas || '—'}</div>
            {mahkeme && <div className="text-xs text-text-muted mt-0.5">{mahkeme}</div>}
          </div>

          <OzetSatir label="Dava Türü" value={dava.davaTuru || '—'} />
          <OzetSatir label="Konu" value={dava.konu || '—'} />
          <OzetSatir label="Davacı" value={taraflar.davaci} />
          <OzetSatir label="Davalı" value={taraflar.davali} />
          <OzetSatir label="Müvekkil" value={muvAd} />
          <OzetSatir label="Karşı Vekil" value={dava.karsav || '—'} />
          <OzetSatir label="Aşama" value={dava.asama || '—'} />
          <OzetSatir label="Durum" value={dava.durum || '—'} />
          <OzetSatir label="Dava Tarihi" value={fmtTarih(dava.tarih) || '—'} />
          <OzetSatir label="Dava Değeri" value={dava.deger ? fmt(dava.deger) : '—'} />
        </div>
      </div>

      {/* Duruşma Bilgisi */}
      {dava.durusma && (
        <div className="bg-gold-dim border border-gold/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-gold uppercase tracking-wider font-bold mb-1">Sonraki Duruşma</div>
              <div className="text-sm font-bold text-text">
                {durusmaTarihSaatGoster(dava.durusma, dava.durusmaSaati)}
              </div>
            </div>
            <DurusmaBadge tarih={dava.durusma} saat={dava.durusmaSaati} />
          </div>
        </div>
      )}

      {/* Finansal Özet */}
      <div className="grid grid-cols-4 gap-3">
        <MiniKpi label="Masraf" value={fmt(hesap.masraf)} />
        <MiniKpi label="Tahsilat" value={fmt(hesap.tahsilat)} color="text-green" />
        <MiniKpi label="Hakediş" value={fmt(hesap.hakedis)} color="text-gold" />
        <MiniKpi label="Akdi Vekalet" value={fmt(hesap.vekalet)} color="text-blue-400" />
      </div>
    </div>
  );
}

function OzetSatir({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-text-dim uppercase tracking-wider">{label}</div>
      <div className="text-xs text-text font-medium truncate">{value}</div>
    </div>
  );
}

function MiniKpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface2 rounded-lg p-3 text-center">
      <div className="text-[10px] text-text-muted mb-0.5">{label}</div>
      <div className={`text-sm font-bold ${color || 'text-text'}`}>{value}</div>
    </div>
  );
}

// ── Süreler Sekmesi ──────────────────────────────────────────
function SurelerTab({ sureler, onEkle, onSil }: {
  sureler: Array<{ id: string; tip: string; baslangic: string; gun: number }>;
  onEkle: (s: { id: string; tip: string; baslangic: string; gun: number }) => void;
  onSil: (id: string) => void;
}) {
  const [form, setForm] = useState(false);
  const [yeni, setYeni] = useState({ tip: '', baslangic: new Date().toISOString().split('T')[0], gun: '' });
  const SURE_TURLERI = ['Cevap Süresi', 'İstinaf Süresi', 'Temyiz Süresi', 'İtiraz Süresi', 'Islah Süresi', 'Bilirkişi İtiraz', 'Tanık Listesi', 'Delil Bildirimi', 'Diğer'];

  function handleKaydet() {
    if (!yeni.tip || !yeni.gun) return;
    onEkle({ id: crypto.randomUUID(), tip: yeni.tip, baslangic: yeni.baslangic, gun: Number(yeni.gun) });
    setYeni({ tip: '', baslangic: new Date().toISOString().split('T')[0], gun: '' });
    setForm(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">{sureler.length > 0 && `${sureler.length} süre`}</span>
        <button onClick={() => setForm(!form)}
          className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
          {form ? 'İptal' : '+ Süre Ekle'}
        </button>
      </div>

      {form && (
        <div className="bg-surface2/50 border border-border rounded-lg p-4 mb-3 space-y-3">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider">⏳ Yeni Süre</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Süre Türü *</label>
              <select value={yeni.tip} onChange={(e) => setYeni(p => ({ ...p, tip: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold">
                <option value="">Seçiniz...</option>
                {SURE_TURLERI.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Başlangıç Tarihi</label>
              <input type="date" value={yeni.baslangic} onChange={(e) => setYeni(p => ({ ...p, baslangic: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Gün Sayısı *</label>
              <input type="number" value={yeni.gun} onChange={(e) => setYeni(p => ({ ...p, gun: e.target.value }))} placeholder="7"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleKaydet} disabled={!yeni.tip || !yeni.gun}
              className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">
              Kaydet
            </button>
          </div>
        </div>
      )}

      {sureler.length === 0 && !form ? (
        <EmptyTab icon="⏳" message="Henüz süre tanımlanmamış" />
      ) : (
        <div className="space-y-2">
          {sureler.map((s) => {
            const hesapS = sureHesapla(s.baslangic, s.gun);
            return (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-surface2 rounded-lg group">
                <SureBadge kalanGun={hesapS.kalanGun} compact />
                <div className="flex-1">
                  <div className="text-xs font-medium text-text">{s.tip}</div>
                  <div className="text-[11px] text-text-muted">
                    {fmtTarih(s.baslangic)} → {fmtTarih(hesapS.sonTarih)} ({s.gun} gün)
                  </div>
                </div>
                <SureBadge kalanGun={hesapS.kalanGun} label={s.tip} />
                <button onClick={() => onSil(s.id)}
                  className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 text-[10px]" title="Sil">🗑️</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Harcama Sekmesi ──────────────────────────────────────────
function HarcamaTab({ harcamalar, onEkle, onGuncelle, onSil }: {
  harcamalar: Array<{ id: string; kat?: string; acik?: string; tarih?: string; tutar: number }>;
  onEkle: (h: { id: string; kat: string; acik: string; tarih: string; tutar: number }) => void;
  onGuncelle: (h: { id: string; kat: string; acik: string; tarih: string; tutar: number }) => void;
  onSil: (id: string) => void;
}) {
  const [form, setForm] = useState(false);
  const [duzenle, setDuzenle] = useState<string | null>(null);
  const [yeni, setYeni] = useState({ kat: '', acik: '', tarih: new Date().toISOString().split('T')[0], tutar: '' });

  const HARCAMA_KAT = ['Harç', 'Posta/Tebligat', 'Bilirkişi', 'Keşif', 'Tanık', 'Yol/Konaklama', 'Fotokopi/Baskı', 'Vekaletname', 'Diğer'];
  const toplam = harcamalar.reduce((t, h) => t + (h.tutar || 0), 0);

  function handleKaydet() {
    if (!yeni.tutar) return;
    if (duzenle) {
      onGuncelle({ id: duzenle, kat: yeni.kat, acik: yeni.acik, tarih: yeni.tarih, tutar: Number(yeni.tutar) });
      setDuzenle(null);
    } else {
      onEkle({ id: crypto.randomUUID(), kat: yeni.kat, acik: yeni.acik, tarih: yeni.tarih, tutar: Number(yeni.tutar) });
    }
    setYeni({ kat: '', acik: '', tarih: new Date().toISOString().split('T')[0], tutar: '' });
    setForm(false);
  }

  function handleDuzenle(h: typeof harcamalar[0]) {
    setYeni({ kat: h.kat || '', acik: h.acik || '', tarih: h.tarih || '', tutar: String(h.tutar) });
    setDuzenle(h.id);
    setForm(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">
          {harcamalar.length > 0 && <>Toplam: <span className="font-bold text-text">{fmt(toplam)}</span> · {harcamalar.length} kayıt</>}
        </span>
        <button onClick={() => { setForm(!form); setDuzenle(null); setYeni({ kat: '', acik: '', tarih: new Date().toISOString().split('T')[0], tutar: '' }); }}
          className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
          {form ? 'İptal' : '+ Harcama Ekle'}
        </button>
      </div>

      {form && (
        <div className="bg-surface2/50 border border-border rounded-lg p-4 mb-3 space-y-3">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider">
            {duzenle ? '✏️ Harcama Düzenle' : '💸 Yeni Harcama'}
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Kategori</label>
              <select value={yeni.kat} onChange={(e) => setYeni(p => ({ ...p, kat: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold">
                <option value="">Seçiniz...</option>
                {HARCAMA_KAT.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tarih</label>
              <input type="date" value={yeni.tarih} onChange={(e) => setYeni(p => ({ ...p, tarih: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tutar (₺) *</label>
              <input type="number" value={yeni.tutar} onChange={(e) => setYeni(p => ({ ...p, tutar: e.target.value }))} placeholder="0.00"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Açıklama</label>
              <input type="text" value={yeni.acik} onChange={(e) => setYeni(p => ({ ...p, acik: e.target.value }))} placeholder="Harcama açıklaması"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleKaydet} disabled={!yeni.tutar}
              className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">
              {duzenle ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      {harcamalar.length === 0 && !form ? (
        <EmptyTab icon="💸" message="Henüz harcama kaydı yok" />
      ) : (
        <div className="space-y-1.5">
          {harcamalar.map((h) => (
            <div key={h.id} className="flex items-center gap-3 p-3 bg-surface2 rounded-lg text-xs group">
              <span className="text-text-dim">{fmtTarih(h.tarih)}</span>
              {h.kat && <span className="px-2 py-0.5 bg-surface rounded text-text-muted text-[10px]">{h.kat}</span>}
              <span className="flex-1 text-text">{h.acik || '—'}</span>
              <span className="font-bold text-text">{fmt(h.tutar)}</span>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <button onClick={() => handleDuzenle(h)} className="text-text-dim hover:text-gold text-[10px]" title="Düzenle">✏️</button>
                <button onClick={() => onSil(h.id)} className="text-text-dim hover:text-red text-[10px]" title="Sil">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tahsilat Sekmesi ─────────────────────────────────────────
function TahsilatTab({ tahsilatlar, onEkle, onDuzenle, onSil }: {
  tahsilatlar: Array<TahsilatKaydi>;
  onEkle: () => void;
  onDuzenle: (t: TahsilatKaydi) => void;
  onSil: (id: string) => void;
}) {
  const turLabel: Record<string, string> = {
    tahsilat: 'Tahsilat', akdi_vekalet: 'Akdi Vekalet', 'hakediş': 'Hakediş', aktarim: 'Aktarım', iade: 'İade',
  };
  const toplam = tahsilatlar.reduce((t, h) => t + (h.tutar || 0), 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-text-muted">
          {tahsilatlar.length > 0 && <>Toplam: <span className="font-bold text-green">{fmt(toplam)}</span> · {tahsilatlar.length} kayıt</>}
        </div>
        <button onClick={onEkle} className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
          + Tahsilat Ekle
        </button>
      </div>
      {tahsilatlar.length === 0 ? (
        <EmptyTab icon="💰" message="Henüz tahsilat kaydı yok" />
      ) : (
        <div className="space-y-1.5">
          {tahsilatlar.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 bg-surface2 rounded-lg text-xs group">
              <span className="text-text-dim">{fmtTarih(t.tarih)}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                t.tur === 'tahsilat' ? 'bg-green-dim text-green' :
                t.tur === 'akdi_vekalet' ? 'bg-blue-400/10 text-blue-400' :
                t.tur === 'hakediş' ? 'bg-gold-dim text-gold' :
                'bg-surface text-text-muted'
              }`}>
                {turLabel[t.tur] || t.tur}
              </span>
              <span className="flex-1 text-text">{t.acik || '—'}</span>
              {t.makbuzKesildi && <span className="text-[10px] text-green" title="Makbuz kesildi">📄</span>}
              <span className={`font-bold ${t.tur === 'aktarim' || t.tur === 'iade' ? 'text-red' : 'text-green'}`}>{fmt(t.tutar)}</span>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <button onClick={() => onDuzenle(t)} className="text-text-dim hover:text-gold text-[10px]" title="Düzenle">✏️</button>
                <button onClick={() => onSil(t.id)} className="text-text-dim hover:text-red text-[10px]" title="Sil">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notlar Sekmesi ───────────────────────────────────────────
function NotlarTab({ notlar, notText, onEkle, onSil }: {
  notlar: Record<string, unknown>[];
  notText?: string;
  onEkle: (n: { id: string; tarih: string; icerik: string }) => void;
  onSil: (id: string) => void;
}) {
  const [yeniNot, setYeniNot] = useState('');

  function handleEkle() {
    if (!yeniNot.trim()) return;
    onEkle({ id: crypto.randomUUID(), tarih: new Date().toISOString(), icerik: yeniNot.trim() });
    setYeniNot('');
  }

  return (
    <div className="space-y-3">
      {/* Not Ekle */}
      <div className="flex gap-2">
        <input type="text" value={yeniNot} onChange={(e) => setYeniNot(e.target.value)}
          placeholder="Not ekle..."
          onKeyDown={(e) => { if (e.key === 'Enter') handleEkle(); }}
          className="flex-1 px-4 py-2.5 bg-surface2 border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors" />
        <button onClick={handleEkle} disabled={!yeniNot.trim()}
          className="px-4 py-2.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light disabled:opacity-40 transition-colors">
          + Ekle
        </button>
      </div>

      {notText && <div className="p-3 bg-surface2 rounded-lg text-xs text-text whitespace-pre-wrap">{notText}</div>}
      {notlar.length === 0 && !notText && <EmptyTab icon="📝" message="Henüz not eklenmemiş" />}
      {notlar.map((n, i) => (
        <div key={(n.id as string) || i} className="flex items-start gap-3 p-3 bg-surface2 rounded-lg group">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-text-dim">{fmtTarih(n.tarih as string)}</span>
              {typeof n.yazar === 'string' && <span className="text-[11px] text-text-muted">{n.yazar}</span>}
            </div>
            <div className="text-xs text-text whitespace-pre-wrap">{(n.icerik as string) || '—'}</div>
          </div>
          {typeof n.id === 'string' && (
            <button onClick={() => onSil(n.id as string)}
              className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 text-xs p-1" title="Sil">✕</button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Anlaşma Sekmesi ──────────────────────────────────────────
function AnlasmaTab({ anlasma, onKaydet }: {
  anlasma?: Record<string, unknown>;
  onKaydet: (a: Record<string, unknown>) => void;
}) {
  const [duzenle, setDuzenle] = useState(false);
  const [form, setForm] = useState({
    tur: (anlasma?.tur as string) || '',
    ucret: String(anlasma?.ucret || ''),
    yuzde: String(anlasma?.yuzde || ''),
    taksitSayisi: String(anlasma?.taksitSayisi || ''),
    taksitOdenen: String(anlasma?.taksitOdenen || ''),
    toplam: String(anlasma?.toplam || ''),
    vadeTarihi: (anlasma?.vadeTarihi as string) || '',
    aciklama: (anlasma?.aciklama as string) || '',
  });

  const turLabel: Record<string, string> = { pesin: 'Peşin', taksit: 'Taksitli', basari: 'Başarıya Göre', tahsilat: 'Tahsilata Göre', karma: 'Karma' };
  const hasAnlasma = anlasma && Object.keys(anlasma).length > 0;

  function handleKaydet() {
    const yeni: Record<string, unknown> = { tur: form.tur };
    if (form.ucret) yeni.ucret = Number(form.ucret);
    if (form.yuzde) yeni.yuzde = Number(form.yuzde);
    if (form.taksitSayisi) yeni.taksitSayisi = Number(form.taksitSayisi);
    if (form.taksitOdenen) yeni.taksitOdenen = Number(form.taksitOdenen);
    if (form.toplam) yeni.toplam = Number(form.toplam);
    if (form.vadeTarihi) yeni.vadeTarihi = form.vadeTarihi;
    if (form.aciklama) yeni.aciklama = form.aciklama;
    onKaydet(yeni);
    setDuzenle(false);
  }

  function handleDuzenleBasla() {
    if (hasAnlasma) {
      setForm({
        tur: (anlasma?.tur as string) || '',
        ucret: String(anlasma?.ucret || ''),
        yuzde: String(anlasma?.yuzde || ''),
        taksitSayisi: String(anlasma?.taksitSayisi || ''),
        taksitOdenen: String(anlasma?.taksitOdenen || ''),
        toplam: String(anlasma?.toplam || ''),
        vadeTarihi: (anlasma?.vadeTarihi as string) || '',
        aciklama: (anlasma?.aciklama as string) || '',
      });
    }
    setDuzenle(true);
  }

  if (duzenle) {
    return (
      <div className="space-y-4">
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">
          {hasAnlasma ? '✏️ Anlaşma Düzenle' : '🤝 Yeni Anlaşma'}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Ücret Türü</label>
            <select value={form.tur} onChange={(e) => setForm(p => ({ ...p, tur: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold">
              <option value="">Seçiniz...</option>
              <option value="pesin">Peşin</option>
              <option value="taksit">Taksitli</option>
              <option value="basari">Başarıya Göre</option>
              <option value="tahsilat">Tahsilata Göre</option>
              <option value="karma">Karma</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Ücret (₺)</label>
            <input type="number" value={form.ucret} onChange={(e) => setForm(p => ({ ...p, ucret: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Toplam Tutar (₺)</label>
            <input type="number" value={form.toplam} onChange={(e) => setForm(p => ({ ...p, toplam: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Yüzde (%)</label>
            <input type="number" value={form.yuzde} onChange={(e) => setForm(p => ({ ...p, yuzde: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          {form.tur === 'taksit' && (
            <>
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Taksit Sayısı</label>
                <input type="number" value={form.taksitSayisi} onChange={(e) => setForm(p => ({ ...p, taksitSayisi: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Ödenen Taksit</label>
                <input type="number" value={form.taksitOdenen} onChange={(e) => setForm(p => ({ ...p, taksitOdenen: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
              </div>
            </>
          )}
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Vade Tarihi</label>
            <input type="date" value={form.vadeTarihi} onChange={(e) => setForm(p => ({ ...p, vadeTarihi: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-text-muted block mb-1">Açıklama</label>
            <textarea value={form.aciklama} onChange={(e) => setForm(p => ({ ...p, aciklama: e.target.value }))} rows={2}
              className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDuzenle(false)}
            className="px-4 py-1.5 bg-surface border border-border text-xs text-text-muted rounded-lg hover:text-text transition-colors">
            İptal
          </button>
          <button onClick={handleKaydet}
            className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors">
            Kaydet
          </button>
        </div>
      </div>
    );
  }

  if (!hasAnlasma) {
    return (
      <div className="text-center py-10">
        <div className="text-3xl mb-2">🤝</div>
        <div className="text-xs text-text-muted mb-3">Henüz vekalet anlaşması tanımlanmamış</div>
        <button onClick={handleDuzenleBasla}
          className="px-4 py-2 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors">
          + Anlaşma Tanımla
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Vekalet Anlaşması</div>
        <button onClick={handleDuzenleBasla}
          className="text-xs px-3 py-1.5 rounded bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors">
          ✏️ Düzenle
        </button>
      </div>
      <InfoRow label="Ücret Türü" value={turLabel[(anlasma?.tur as string) || ''] || (anlasma?.tur as string) || '—'} />
      {typeof anlasma?.ucret === 'number' && <InfoRow label="Ücret" value={fmt(anlasma.ucret as number)} />}
      {typeof anlasma?.toplam === 'number' && <InfoRow label="Toplam" value={fmt(anlasma.toplam as number)} />}
      {anlasma?.yuzde != null && <InfoRow label="Yüzde" value={`%${String(anlasma.yuzde)}`} />}
      {anlasma?.taksitSayisi != null && <InfoRow label="Taksit Sayısı" value={String(anlasma.taksitSayisi)} />}
      {anlasma?.taksitOdenen != null && <InfoRow label="Ödenen Taksit" value={String(anlasma.taksitOdenen)} />}
      {typeof anlasma?.vadeTarihi === 'string' && anlasma.vadeTarihi && <InfoRow label="Vade Tarihi" value={fmtTarih(anlasma.vadeTarihi)} />}
      {typeof anlasma?.aciklama === 'string' && anlasma.aciklama && <InfoRow label="Açıklama" value={anlasma.aciklama} />}
    </div>
  );
}

// ── Boş Sekme ────────────────────────────────────────────────
function EmptyTab({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="text-center py-10">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-xs text-text-muted">{message}</div>
    </div>
  );
}
