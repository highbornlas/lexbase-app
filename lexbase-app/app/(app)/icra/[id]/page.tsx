'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import { useIcra, useIcraKaydet } from '@/lib/hooks/useIcra';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmt, fmtTarih } from '@/lib/utils';
import {
  tamIcraDairesiAdi,
  esasNoGoster,
  alacakliBelirle,
  sureHesapla,
} from '@/lib/utils/uyapHelpers';
import { SureBadge } from '@/components/ui/SureBadge';
import { IcraModal } from '@/components/modules/IcraModal';
import { DosyaEvrakTab } from '@/components/modules/DosyaEvrakTab';
import { TahsilatModal, type TahsilatKaydi } from '@/components/modules/TahsilatModal';

const TABS = [
  { key: 'ozet', label: 'Özet', icon: '📋' },
  { key: 'evrak', label: 'Evraklar', icon: '📄' },
  { key: 'tebligatlar', label: 'Tebligatlar', icon: '📬' },
  { key: 'harcama', label: 'Harcamalar', icon: '💸' },
  { key: 'tahsilat', label: 'Tahsilat', icon: '💰' },
  { key: 'sureler', label: 'Süreler', icon: '⏳' },
  { key: 'notlar', label: 'Notlar', icon: '📝' },
  { key: 'anlasma', label: 'Anlaşma', icon: '🤝' },
];

const DURUM_RENK: Record<string, string> = {
  'Aktif': 'bg-green-dim text-green border-green/20',
  'Takipte': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Haciz Aşaması': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Satış Aşaması': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  'Kapandı': 'bg-surface2 text-text-dim border-border',
};

export default function IcraDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: icra, isLoading } = useIcra(id);
  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
  const icraKaydet = useIcraKaydet();
  const [aktifTab, setAktifTab] = useState('ozet');
  const [duzenleModu, setDuzenleModu] = useState(false);
  const [tahsilatModal, setTahsilatModal] = useState(false);
  const [duzenlenecekTahsilat, setDuzenlenecekTahsilat] = useState<TahsilatKaydi | null>(null);

  // Müvekkil adı
  const muvAd = useMemo(() => {
    if (!icra?.muvId || !muvekkillar) return '—';
    return muvekkillar.find((m) => m.id === icra.muvId)?.ad || '—';
  }, [icra, muvekkillar]);

  // Tam icra dairesi adı
  const daireAdi = useMemo(() => {
    if (!icra) return '';
    return tamIcraDairesiAdi(icra.il, icra.daire);
  }, [icra]);

  // Esas no
  const esasNo = useMemo(() => {
    if (!icra) return '';
    return esasNoGoster(icra.esasYil, icra.esasNo) || icra.esas || '';
  }, [icra]);

  // Alacaklı / Borçlu
  const taraflar = useMemo(() => {
    if (!icra) return { alacakli: '—', borclu: '—' };
    return alacakliBelirle(icra.muvRol, muvAd, icra.borclu || '—');
  }, [icra, muvAd]);

  // İlişkili Dava
  const iliskiliDava = useMemo(() => {
    if (!icra?.iliskiliDavaId || !davalar) return null;
    return davalar.find((d) => d.id === icra.iliskiliDavaId) || null;
  }, [icra, davalar]);

  // Hesaplamalar
  const hesap = useMemo(() => {
    if (!icra) return { masraf: 0, tahsilat: 0, tahsilOran: 0, kalan: 0, evrakSayisi: 0 };
    const masraf = (icra.harcamalar || []).reduce((t, h) => t + (h.tutar || 0), 0);
    const tahsilat = (icra.tahsilatlar || []).filter((t) => t.tur === 'tahsilat').reduce((t, h) => t + (h.tutar || 0), 0);
    const alacak = icra.alacak || 0;
    const tahsilOran = alacak > 0 ? Math.min((tahsilat / alacak) * 100, 100) : 0;
    return { masraf, tahsilat, tahsilOran, kalan: alacak - tahsilat, evrakSayisi: (icra.evraklar || []).length };
  }, [icra]);

  // İtiraz süresi hesaplama (tebliğ tarihinden)
  const itirazBilgi = useMemo(() => {
    if (!icra?.tebligTarihi) {
      // Eski format: otarih + itarih
      if (!icra?.otarih) return null;
      const itirazTarih = icra.itarih || icra.itirazSonTarih;
      if (!itirazTarih) return null;
      const sonTarih = new Date(itirazTarih);
      const bugun = new Date();
      const kalanGun = Math.ceil((sonTarih.getTime() - bugun.getTime()) / 86400000);
      return { kalanGun, sonTarih: itirazTarih, gecmis: kalanGun < 0, acil: kalanGun >= 0 && kalanGun <= 2 };
    }

    // Yeni format: tebliğ + süre hesaplama
    const gunSayisi = icra.tur === 'Kambiyo Senetlerine Özgü Takip' ? 5 : 7;
    const sonuc = sureHesapla(icra.tebligTarihi, gunSayisi);
    return { kalanGun: sonuc.kalanGun, sonTarih: sonuc.sonTarih, gecmis: sonuc.gecmis, acil: sonuc.acil };
  }, [icra]);

  if (isLoading) {
    return <div className="text-center py-12 text-text-muted">Yükleniyor...</div>;
  }

  if (!icra) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">❌</div>
        <div className="text-sm text-text-muted">İcra dosyası bulunamadı</div>
        <Link href="/icra" className="text-xs text-gold mt-3 inline-block hover:underline">← İcra dosyalarına dön</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted mb-4">
        <Link href="/icra" className="hover:text-gold transition-colors">İcra Dosyaları</Link>
        <span>›</span>
        <span className="text-text">{esasNo || icra.no || icra.id.slice(0, 8)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-[var(--font-playfair)] text-2xl text-gold font-bold">
              {esasNo || icra.no || '—'}
            </h1>
            {icra.tur && (
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-surface2 text-text-muted border border-border">
                {icra.tur}
              </span>
            )}
          </div>

          {daireAdi && (
            <div className="text-xs text-gold/80 mt-1 font-medium">{daireAdi}</div>
          )}

          <div className="text-xs text-text-muted mt-1">
            Alacaklı: <span className="text-text">{taraflar.alacakli}</span>
            <span className="mx-1.5 text-text-dim">→</span>
            Borçlu: <span className="text-text">{taraflar.borclu}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDuzenleModu(true)}
            className="text-xs px-3 py-1.5 rounded bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors"
          >
            Düzenle
          </button>
          {icra.muvRol && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
              icra.muvRol === 'alacakli' ? 'bg-green-dim text-green border-green/20' : 'bg-red-dim text-red border-red/20'
            }`}>
              {icra.muvRol === 'alacakli' ? 'ALACAKLI' : 'BORÇLU'}
            </span>
          )}
          {icra.durum && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${DURUM_RENK[icra.durum] || 'bg-gold-dim text-gold border-gold/20'}`}>
              {icra.durum}
            </span>
          )}
        </div>
      </div>

      {/* KPI Kartlar */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <KpiCard label="Toplam Alacak" value={fmt(icra.alacak || 0)} color="text-gold" />
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Tahsil Edilen</div>
          <div className="text-sm font-bold text-green mb-1">{fmt(icra.tahsil || 0)}</div>
          <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${hesap.tahsilOran >= 100 ? 'bg-green' : hesap.tahsilOran > 50 ? 'bg-gold' : 'bg-red'}`}
              style={{ width: `${hesap.tahsilOran}%` }}
            />
          </div>
          <div className="text-[10px] text-text-dim mt-0.5 text-right">%{hesap.tahsilOran.toFixed(0)}</div>
        </div>
        <KpiCard label="Kalan" value={fmt(hesap.kalan)} color="text-red" />
        {itirazBilgi ? (
          <div className={`bg-surface border rounded-lg p-3 ${itirazBilgi.gecmis ? 'border-text-dim' : itirazBilgi.acil ? 'border-red bg-red-dim' : 'border-gold bg-gold-dim'}`}>
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">İtiraz Süresi</div>
            <SureBadge kalanGun={itirazBilgi.kalanGun} label="itiraz" />
            <div className="text-[10px] text-text-dim mt-0.5">{fmtTarih(itirazBilgi.sonTarih)}</div>
          </div>
        ) : (
          <KpiCard label="İtiraz Süresi" value="—" />
        )}
        <KpiCard label="Masraf" value={fmt(hesap.masraf)} />
        <KpiCard label="Evrak" value={hesap.evrakSayisi.toString()} />
      </div>

      {/* Kapanış Bilgisi */}
      {icra.durum === 'Kapandı' && icra.kapanisSebebi && (
        <div className="bg-surface2 border border-border rounded-lg p-4 mb-6 flex items-center gap-3">
          <span className="text-lg">🔒</span>
          <div>
            <div className="text-xs font-semibold text-text">Dosya Kapatıldı</div>
            <div className="text-[11px] text-text-muted">
              Sebep: <span className="text-text">{icra.kapanisSebebi}</span>
              {icra.kapanisTarih && <> · {fmtTarih(icra.kapanisTarih)}</>}
            </div>
          </div>
        </div>
      )}

      {/* Bilgi Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <InfoCard title="İcra Bilgileri">
          <InfoRow label="Takip Türü" value={icra.tur || '—'} />
          <InfoRow label="Alacak Türü" value={icra.atur || '—'} />
          <InfoRow label="İl / Adliye" value={[icra.il, icra.adliye].filter(Boolean).join(' / ') || '—'} />
          <InfoRow label="İcra Dairesi" value={daireAdi || icra.daire || '—'} />
          <InfoRow label="Esas No" value={esasNo || '—'} />
          <InfoRow label="Dayanak" value={icra.dayanak || '—'} />
          <InfoRow label="Faiz" value={icra.faiz ? `%${icra.faiz}` : '—'} />
        </InfoCard>

        <InfoCard title="Tarihler">
          <InfoRow label="Takip Tarihi" value={fmtTarih(icra.tarih) || '—'} />
          <InfoRow label="Ödeme Emri" value={fmtTarih(icra.otarih) || '—'} />
          <InfoRow label="Tebliğ Tarihi" value={fmtTarih(icra.tebligTarihi) || '—'} />
          <InfoRow label="İtiraz Son Tarih" value={itirazBilgi ? fmtTarih(itirazBilgi.sonTarih) : '—'} />
          {itirazBilgi && !itirazBilgi.gecmis && (
            <div className="mt-1 flex justify-end">
              <SureBadge kalanGun={itirazBilgi.kalanGun} label="itiraz" />
            </div>
          )}
          <div className="border-t border-border pt-2 mt-2">
            {iliskiliDava ? (
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted">İlişkili Dava</span>
                <Link
                  href={`/davalar/${iliskiliDava.id}`}
                  className="text-gold hover:underline font-medium"
                >
                  {esasNoGoster(iliskiliDava.esasYil, iliskiliDava.esasNo) || iliskiliDava.no || 'Dosya'}
                </Link>
              </div>
            ) : (
              <InfoRow label="İlişkili Dava" value={icra.davno || '—'} />
            )}
          </div>
        </InfoCard>

        <InfoCard title="Taraflar">
          <InfoRow label="Müvekkil" value={muvAd} />
          <InfoRow label="Müvekkil Rolü" value={icra.muvRol === 'alacakli' ? 'Alacaklı' : icra.muvRol === 'borclu' ? 'Borçlu' : '—'} />
          <InfoRow label="Alacaklı" value={taraflar.alacakli} />
          <InfoRow label="Borçlu" value={taraflar.borclu} />
          <InfoRow label="Borçlu TC" value={icra.btc || '—'} />
          <InfoRow label="Karşı Vekil" value={icra.karsav || '—'} />
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
            {tab.key === 'tebligatlar' && (icra.tebligatlar || []).length > 0 && (
              <span className="ml-1 text-[10px] bg-orange-400/10 text-orange-400 px-1 rounded">{icra.tebligatlar!.length}</span>
            )}
            {tab.key === 'sureler' && (icra.sureler || []).length > 0 && (
              <span className="ml-1 text-[10px] bg-gold/10 text-gold px-1 rounded">{icra.sureler!.length}</span>
            )}
            {tab.key === 'evrak' && hesap.evrakSayisi > 0 && (
              <span className="ml-1 text-[10px] bg-surface2 text-text-muted px-1 rounded">{hesap.evrakSayisi}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab İçerikleri */}
      <div className="bg-surface border border-border rounded-lg p-5">
        {aktifTab === 'ozet' && <OzetTab icra={icra} muvAd={muvAd} daireAdi={daireAdi} taraflar={taraflar} esasNo={esasNo} hesap={hesap} itirazBilgi={itirazBilgi} />}
        {aktifTab === 'evrak' && <DosyaEvrakTab dosyaId={id} dosyaTipi="icra" muvId={icra.muvId} />}
        {aktifTab === 'tebligatlar' && <TebligatlarTab icra={icra} onUpdate={(guncel) => icraKaydet.mutate(guncel)} />}
        {aktifTab === 'harcama' && (
          <HarcamaTab
            harcamalar={icra.harcamalar || []}
            onEkle={(h) => {
              icraKaydet.mutate({ ...icra, harcamalar: [...(icra.harcamalar || []), h] });
            }}
            onGuncelle={(h) => {
              icraKaydet.mutate({ ...icra, harcamalar: (icra.harcamalar || []).map((x) => x.id === h.id ? h : x) });
            }}
            onSil={(hId) => {
              icraKaydet.mutate({ ...icra, harcamalar: (icra.harcamalar || []).filter((x) => x.id !== hId) });
            }}
          />
        )}
        {aktifTab === 'tahsilat' && (
          <TahsilatTab
            tahsilatlar={icra.tahsilatlar || []}
            onEkle={() => { setDuzenlenecekTahsilat(null); setTahsilatModal(true); }}
            onDuzenle={(t) => { setDuzenlenecekTahsilat(t); setTahsilatModal(true); }}
            onSil={(tahsilatId) => {
              const yeni = { ...icra, tahsilatlar: (icra.tahsilatlar || []).filter((t) => t.id !== tahsilatId) };
              icraKaydet.mutate(yeni);
            }}
          />
        )}
        {aktifTab === 'sureler' && (
          <SurelerTab
            sureler={icra.sureler || []}
            onEkle={(s) => {
              icraKaydet.mutate({ ...icra, sureler: [...(icra.sureler || []), s] });
            }}
            onSil={(sId) => {
              icraKaydet.mutate({ ...icra, sureler: (icra.sureler || []).filter((x) => x.id !== sId) });
            }}
          />
        )}
        {aktifTab === 'notlar' && (
          <NotlarTab
            notlar={icra.notlar || []}
            notText={icra.not}
            onEkle={(n) => {
              icraKaydet.mutate({ ...icra, notlar: [...(icra.notlar || []), n] });
            }}
            onSil={(nId) => {
              icraKaydet.mutate({ ...icra, notlar: (icra.notlar || []).filter((x) => (x.id as string) !== nId) });
            }}
          />
        )}
        {aktifTab === 'anlasma' && (
          <AnlasmaTab
            anlasma={icra.anlasma}
            onKaydet={(a) => {
              icraKaydet.mutate({ ...icra, anlasma: a });
            }}
          />
        )}
      </div>

      {/* Düzenleme Modal */}
      {duzenleModu && (
        <IcraModal
          open={duzenleModu}
          onClose={() => setDuzenleModu(false)}
          icra={icra}
          onCreated={(ic) => {
            icraKaydet.mutate(ic);
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
          const mevcut = icra.tahsilatlar || [];
          const varMi = mevcut.find((t) => t.id === tahsilat.id);
          const yeniListe = varMi
            ? mevcut.map((t) => (t.id === tahsilat.id ? tahsilat : t))
            : [...mevcut, tahsilat];
          icraKaydet.mutate({ ...icra, tahsilatlar: yeniListe });
        }}
      />
    </div>
  );
}

// ── Alt Componentler ─────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-sm font-bold ${color || 'text-text'}`}>{value}</div>
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
  icra,
  muvAd,
  daireAdi,
  taraflar,
  esasNo: esas,
  hesap,
  itirazBilgi,
}: {
  icra: import('@/lib/hooks/useIcra').Icra;
  muvAd: string;
  daireAdi: string;
  taraflar: { alacakli: string; borclu: string };
  esasNo: string;
  hesap: { masraf: number; tahsilat: number; tahsilOran: number; kalan: number; evrakSayisi: number };
  itirazBilgi: { kalanGun: number; sonTarih: string; gecmis: boolean; acil: boolean } | null;
}) {
  return (
    <div className="space-y-5">
      {/* UYAP Tarzı Dosya Kartı */}
      <div className="bg-surface2 rounded-lg p-5 border border-border">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div className="col-span-2 border-b border-border pb-3 mb-1">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Dosya Bilgileri</div>
            <div className="text-sm font-bold text-gold">{esas || '—'}</div>
            {daireAdi && <div className="text-xs text-text-muted mt-0.5">{daireAdi}</div>}
          </div>

          <OzetSatir label="Takip Türü" value={icra.tur || '—'} />
          <OzetSatir label="Alacak Türü" value={icra.atur || '—'} />
          <OzetSatir label="Alacaklı" value={taraflar.alacakli} />
          <OzetSatir label="Borçlu" value={taraflar.borclu} />
          <OzetSatir label="Müvekkil" value={muvAd} />
          <OzetSatir label="Karşı Vekil" value={icra.karsav || '—'} />
          <OzetSatir label="Durum" value={icra.durum || '—'} />
          <OzetSatir label="Dayanak" value={icra.dayanak || '—'} />
          <OzetSatir label="Takip Tarihi" value={fmtTarih(icra.tarih) || '—'} />
          <OzetSatir label="Tebliğ Tarihi" value={fmtTarih(icra.tebligTarihi) || '—'} />
        </div>
      </div>

      {/* İtiraz Süresi */}
      {itirazBilgi && !itirazBilgi.gecmis && (
        <div className={`border rounded-lg p-4 ${itirazBilgi.acil ? 'bg-red-dim border-red/20' : 'bg-gold-dim border-gold/20'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${itirazBilgi.acil ? 'text-red' : 'text-gold'}`}>
                İtiraz Süresi
              </div>
              <div className="text-xs text-text-muted">Son tarih: {fmtTarih(itirazBilgi.sonTarih)}</div>
            </div>
            <SureBadge kalanGun={itirazBilgi.kalanGun} label="itiraz" />
          </div>
        </div>
      )}

      {/* Finansal Özet */}
      <div className="grid grid-cols-4 gap-3">
        <MiniKpi label="Alacak" value={fmt(icra.alacak || 0)} color="text-gold" />
        <MiniKpi label="Tahsilat" value={fmt(hesap.tahsilat)} color="text-green" />
        <MiniKpi label="Kalan" value={fmt(hesap.kalan)} color="text-red" />
        <MiniKpi label="Masraf" value={fmt(hesap.masraf)} />
      </div>

      {/* Tahsilat Progress */}
      <div className="bg-surface2 rounded-lg p-4">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-text-muted">Tahsilat Oranı</span>
          <span className="font-bold text-text">%{hesap.tahsilOran.toFixed(1)}</span>
        </div>
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${hesap.tahsilOran >= 100 ? 'bg-green' : hesap.tahsilOran > 50 ? 'bg-gold' : 'bg-red'}`}
            style={{ width: `${Math.min(hesap.tahsilOran, 100)}%` }}
          />
        </div>
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
  const SURE_TURLERI = ['İtiraz Süresi', 'Haciz İsteme Süresi', 'Satış İsteme Süresi', 'Şikayet Süresi', 'Ödeme Süresi', 'Takibin Kesinleşmesi', 'Diğer'];

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
  onGuncelle: (h: { id: string; kat?: string; acik?: string; tarih?: string; tutar: number }) => void;
  onSil: (id: string) => void;
}) {
  const [form, setForm] = useState(false);
  const [duzenleId, setDuzenleId] = useState<string | null>(null);
  const [yeni, setYeni] = useState({ kat: '', tarih: new Date().toISOString().split('T')[0], tutar: '', acik: '' });
  const HARCAMA_KAT = ['Harç', 'Posta/Tebligat', 'Bilirkişi', 'Keşif', 'Tanık', 'Yol/Konaklama', 'Fotokopi/Baskı', 'Vekaletname', 'Haciz Masrafı', 'Diğer'];

  function handleKaydet() {
    if (!yeni.tutar) return;
    if (duzenleId) {
      onGuncelle({ id: duzenleId, kat: yeni.kat, acik: yeni.acik, tarih: yeni.tarih, tutar: Number(yeni.tutar) });
      setDuzenleId(null);
    } else {
      onEkle({ id: crypto.randomUUID(), kat: yeni.kat, acik: yeni.acik, tarih: yeni.tarih, tutar: Number(yeni.tutar) });
    }
    setYeni({ kat: '', tarih: new Date().toISOString().split('T')[0], tutar: '', acik: '' });
    setForm(false);
  }

  function handleDuzenle(h: { id: string; kat?: string; acik?: string; tarih?: string; tutar: number }) {
    setDuzenleId(h.id);
    setYeni({ kat: h.kat || '', tarih: h.tarih || '', tutar: String(h.tutar), acik: h.acik || '' });
    setForm(true);
  }

  const toplam = harcamalar.reduce((t, h) => t + (h.tutar || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">{harcamalar.length > 0 && <>Toplam: <span className="font-bold text-text">{fmt(toplam)}</span> · {harcamalar.length} kayıt</>}</span>
        <button onClick={() => { setForm(!form); setDuzenleId(null); setYeni({ kat: '', tarih: new Date().toISOString().split('T')[0], tutar: '', acik: '' }); }}
          className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
          {form ? 'İptal' : '+ Harcama Ekle'}
        </button>
      </div>

      {form && (
        <div className="bg-surface2/50 border border-border rounded-lg p-4 mb-3 space-y-3">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider">💸 {duzenleId ? 'Harcama Düzenle' : 'Yeni Harcama'}</div>
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
              <label className="text-[10px] text-text-muted block mb-1">Tutar *</label>
              <input type="number" value={yeni.tutar} onChange={(e) => setYeni(p => ({ ...p, tutar: e.target.value }))} placeholder="0.00"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Açıklama</label>
              <input value={yeni.acik} onChange={(e) => setYeni(p => ({ ...p, acik: e.target.value }))} placeholder="Harcama açıklaması"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleKaydet} disabled={!yeni.tutar}
              className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">
              {duzenleId ? 'Güncelle' : 'Kaydet'}
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
  onEkle: (n: { id: string; icerik: string; tarih: string }) => void;
  onSil: (id: string) => void;
}) {
  const [yeniNot, setYeniNot] = useState('');

  function handleEkle() {
    if (!yeniNot.trim()) return;
    onEkle({ id: crypto.randomUUID(), icerik: yeniNot.trim(), tarih: new Date().toISOString().split('T')[0] });
    setYeniNot('');
  }

  return (
    <div className="space-y-3">
      {/* Yeni not ekleme */}
      <div className="flex gap-2">
        <input
          value={yeniNot}
          onChange={(e) => setYeniNot(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleEkle(); }}
          placeholder="Yeni not ekle..."
          className="flex-1 px-3 py-2 text-xs bg-surface2 border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold"
        />
        <button onClick={handleEkle} disabled={!yeniNot.trim()}
          className="px-4 py-2 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40">
          Ekle
        </button>
      </div>

      {notText && <div className="p-3 bg-surface2 rounded-lg text-xs text-text whitespace-pre-wrap">{notText}</div>}
      {notlar.length === 0 && !notText && <EmptyTab icon="📝" message="Henüz not eklenmemiş" />}
      {notlar.map((n, i) => (
        <div key={(n.id as string) || i} className="p-3 bg-surface2 rounded-lg group">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-dim">{fmtTarih(n.tarih as string)}</span>
              {typeof n.yazar === 'string' && <span className="text-[11px] text-text-muted">{n.yazar}</span>}
            </div>
            <button onClick={() => onSil(n.id as string)}
              className="text-text-dim hover:text-red transition-colors opacity-0 group-hover:opacity-100 text-[10px]" title="Sil">✕</button>
          </div>
          <div className="text-xs text-text whitespace-pre-wrap">{(n.icerik as string) || '—'}</div>
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
  const turLabel: Record<string, string> = { pesin: 'Peşin', taksit: 'Taksitli', basari: 'Başarıya Göre', tahsilat: 'Tahsilata Göre', karma: 'Karma' };
  const hasData = anlasma && Object.keys(anlasma).length > 0;
  const [duzenle, setDuzenle] = useState(false);
  const [form, setForm] = useState({
    tur: (anlasma?.tur as string) || 'pesin',
    ucret: anlasma?.ucret != null ? String(anlasma.ucret) : '',
    toplam: anlasma?.toplam != null ? String(anlasma.toplam) : '',
    yuzde: anlasma?.yuzde != null ? String(anlasma.yuzde) : '',
    taksitSayisi: anlasma?.taksitSayisi != null ? String(anlasma.taksitSayisi) : '',
    taksitOdenen: anlasma?.taksitOdenen != null ? String(anlasma.taksitOdenen) : '',
    vadeTarihi: (anlasma?.vadeTarihi as string) || '',
    aciklama: (anlasma?.aciklama as string) || '',
  });

  function handleKaydet() {
    const a: Record<string, unknown> = { tur: form.tur };
    if (form.ucret) a.ucret = Number(form.ucret);
    if (form.toplam) a.toplam = Number(form.toplam);
    if (form.yuzde) a.yuzde = Number(form.yuzde);
    if (form.tur === 'taksit') {
      if (form.taksitSayisi) a.taksitSayisi = Number(form.taksitSayisi);
      if (form.taksitOdenen) a.taksitOdenen = Number(form.taksitOdenen);
    }
    if (form.vadeTarihi) a.vadeTarihi = form.vadeTarihi;
    if (form.aciklama) a.aciklama = form.aciklama;
    onKaydet(a);
    setDuzenle(false);
  }

  if (!hasData && !duzenle) {
    return (
      <div className="text-center py-10">
        <div className="text-3xl mb-2">🤝</div>
        <div className="text-xs text-text-muted mb-3">Henüz anlaşma tanımlanmamış</div>
        <button onClick={() => setDuzenle(true)}
          className="px-4 py-2 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors">
          Anlaşma Tanımla
        </button>
      </div>
    );
  }

  if (duzenle) {
    return (
      <div className="space-y-4">
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">🤝 Anlaşma Bilgileri</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Ücret Türü</label>
            <select value={form.tur} onChange={(e) => setForm(p => ({ ...p, tur: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold">
              {Object.entries(turLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Ücret</label>
            <input type="number" value={form.ucret} onChange={(e) => setForm(p => ({ ...p, ucret: e.target.value }))} placeholder="0.00"
              className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Toplam</label>
            <input type="number" value={form.toplam} onChange={(e) => setForm(p => ({ ...p, toplam: e.target.value }))} placeholder="0.00"
              className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Yüzde (%)</label>
            <input type="number" value={form.yuzde} onChange={(e) => setForm(p => ({ ...p, yuzde: e.target.value }))} placeholder="0"
              className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
          {form.tur === 'taksit' && (
            <>
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Taksit Sayısı</label>
                <input type="number" value={form.taksitSayisi} onChange={(e) => setForm(p => ({ ...p, taksitSayisi: e.target.value }))} placeholder="0"
                  className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Ödenen Taksit</label>
                <input type="number" value={form.taksitOdenen} onChange={(e) => setForm(p => ({ ...p, taksitOdenen: e.target.value }))} placeholder="0"
                  className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
              </div>
            </>
          )}
          <div>
            <label className="text-[10px] text-text-muted block mb-1">Vade Tarihi</label>
            <input type="date" value={form.vadeTarihi} onChange={(e) => setForm(p => ({ ...p, vadeTarihi: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-text-muted block mb-1">Açıklama</label>
          <input value={form.aciklama} onChange={(e) => setForm(p => ({ ...p, aciklama: e.target.value }))} placeholder="Anlaşma detayları"
            className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDuzenle(false)}
            className="px-4 py-1.5 text-xs text-text-muted hover:text-text transition-colors">İptal</button>
          <button onClick={handleKaydet}
            className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors">
            Kaydet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Anlaşma Detayları</div>
        <button onClick={() => setDuzenle(true)}
          className="text-xs px-3 py-1.5 rounded bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors">
          Düzenle
        </button>
      </div>
      <div className="space-y-2">
        <InfoRow label="Ücret Türü" value={turLabel[(anlasma!.tur as string) || ''] || (anlasma!.tur as string) || '—'} />
        {typeof anlasma!.ucret === 'number' && <InfoRow label="Ücret" value={fmt(anlasma!.ucret)} />}
        {typeof anlasma!.toplam === 'number' && <InfoRow label="Toplam" value={fmt(anlasma!.toplam)} />}
        {anlasma!.yuzde != null && <InfoRow label="Yüzde" value={`%${String(anlasma!.yuzde)}`} />}
        {anlasma!.taksitSayisi != null && <InfoRow label="Taksit Sayısı" value={String(anlasma!.taksitSayisi)} />}
        {anlasma!.taksitOdenen != null && <InfoRow label="Ödenen Taksit" value={String(anlasma!.taksitOdenen)} />}
        {typeof anlasma!.vadeTarihi === 'string' && anlasma!.vadeTarihi && <InfoRow label="Vade Tarihi" value={fmtTarih(anlasma!.vadeTarihi)} />}
        {typeof anlasma!.aciklama === 'string' && anlasma!.aciklama && <InfoRow label="Açıklama" value={anlasma!.aciklama} />}
      </div>
    </div>
  );
}

// ── Tebligatlar Sekmesi (PTT Barkod Takibi) ─────────────────
function TebligatlarTab({ icra, onUpdate }: { icra: import('@/lib/hooks/useIcra').Icra; onUpdate: (icra: import('@/lib/hooks/useIcra').Icra) => void }) {
  const [yeniForm, setYeniForm] = useState(false);
  const [form, setForm] = useState({
    tur: 'Ödeme Emri',
    alici: '',
    tarih: new Date().toISOString().split('T')[0],
    pttBarkod: '',
    tebligDurum: 'Gönderilmedi' as string,
    tebligTarih: '',
    not: '',
  });
  const [pttLoading, setPttLoading] = useState<string | null>(null);
  const [pttSonuc, setPttSonuc] = useState<Record<string, string>>({});

  const tebligatlar = icra.tebligatlar || [];

  function handleYeniEkle() {
    if (!form.alici?.trim()) return;
    const yeniTebligat = {
      id: crypto.randomUUID(),
      ...form,
    };
    onUpdate({ ...icra, tebligatlar: [...tebligatlar, yeniTebligat] });
    setForm({ tur: 'Ödeme Emri', alici: '', tarih: new Date().toISOString().split('T')[0], pttBarkod: '', tebligDurum: 'Gönderilmedi', tebligTarih: '', not: '' });
    setYeniForm(false);
  }

  function handleSil(id: string) {
    if (!confirm('Bu tebligat kaydını silmek istediğinize emin misiniz?')) return;
    onUpdate({ ...icra, tebligatlar: tebligatlar.filter((t) => t.id !== id) });
  }

  async function handlePttSorgula(tebligatId: string, barkod: string) {
    if (!barkod?.trim()) return;
    setPttLoading(tebligatId);
    setPttSonuc((prev) => ({ ...prev, [tebligatId]: '' }));
    try {
      const res = await fetch('/api/ptt-sorgula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barkod: barkod.trim() }),
      });
      const data = await res.json();
      if (data.durum) {
        setPttSonuc((prev) => ({ ...prev, [tebligatId]: `${data.durum}${data.tarih ? ` — ${data.tarih}` : ''}` }));
        // Otomatik güncelleme
        if (data.tebligDurum) {
          const guncelTebligatlar = tebligatlar.map((t) =>
            t.id === tebligatId
              ? {
                  ...t,
                  tebligDurum: data.tebligDurum,
                  ...(data.tebligTarih ? { tebligTarih: data.tebligTarih } : {}),
                  pttSonSorgu: new Date().toISOString(),
                  pttSonuc: data.durum,
                }
              : t
          );
          onUpdate({ ...icra, tebligatlar: guncelTebligatlar });
        }
      } else {
        setPttSonuc((prev) => ({ ...prev, [tebligatId]: 'Otomatik sorgu başarısız. PTT sitesi açılıyor...' }));
        window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${barkod.trim()}`, '_blank');
      }
    } catch {
      setPttSonuc((prev) => ({ ...prev, [tebligatId]: 'Bağlantı hatası. PTT sitesi açılıyor...' }));
      window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${barkod.trim()}`, '_blank');
    } finally {
      setPttLoading(null);
    }
  }

  const TEBLIGAT_DURUM_RENK: Record<string, string> = {
    'Gönderilmedi': 'bg-surface2 text-text-dim border-border',
    "PTT'de Bekliyor": 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    'Tebliğ Edildi': 'bg-green-dim text-green border-green/20',
    'İade Döndü': 'bg-red-dim text-red border-red/20',
  };

  return (
    <div className="space-y-4">
      {/* Başlık + Yeni Ekle */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-muted">{tebligatlar.length} tebligat kaydı</div>
        <button
          onClick={() => setYeniForm(!yeniForm)}
          className="text-xs px-3 py-1.5 rounded bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors"
        >
          {yeniForm ? 'İptal' : '+ Yeni Tebligat'}
        </button>
      </div>

      {/* Yeni Tebligat Formu */}
      {yeniForm && (
        <div className="bg-surface2/50 border border-border rounded-lg p-4 space-y-3">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider">📬 Yeni Tebligat Ekle</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tür</label>
              <select
                value={form.tur}
                onChange={(e) => setForm((p) => ({ ...p, tur: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold"
              >
                <option>Ödeme Emri</option>
                <option>İcra Emri</option>
                <option>Haciz İhbarnamesi</option>
                <option>Satış İlanı</option>
                <option>103 Davetiye</option>
                <option>Diğer</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Alıcı *</label>
              <input
                value={form.alici}
                onChange={(e) => setForm((p) => ({ ...p, alici: e.target.value }))}
                placeholder="Tebligat alıcısı"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Gönderim Tarihi</label>
              <input
                type="date"
                value={form.tarih}
                onChange={(e) => setForm((p) => ({ ...p, tarih: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">PTT Barkod No</label>
              <input
                value={form.pttBarkod}
                onChange={(e) => setForm((p) => ({ ...p, pttBarkod: e.target.value }))}
                placeholder="RR123456789TR"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Tebliğ Durumu</label>
              <select
                value={form.tebligDurum}
                onChange={(e) => setForm((p) => ({ ...p, tebligDurum: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-gold"
              >
                <option>Gönderilmedi</option>
                <option>PTT&apos;de Bekliyor</option>
                <option>Tebliğ Edildi</option>
                <option>İade Döndü</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">Not</label>
              <input
                value={form.not}
                onChange={(e) => setForm((p) => ({ ...p, not: e.target.value }))}
                placeholder="Opsiyonel not"
                className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleYeniEkle}
              disabled={!form.alici?.trim()}
              className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40"
            >
              Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Tebligat Listesi */}
      {tebligatlar.length === 0 && !yeniForm ? (
        <EmptyTab icon="📬" message="Henüz tebligat kaydı eklenmemiş" />
      ) : (
        <div className="space-y-3">
          {tebligatlar.map((t) => (
            <div key={t.id} className="bg-surface2 rounded-lg p-4 border border-border space-y-2">
              {/* Üst satır: Tür + Alıcı + Durum + Sil */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                    {t.tur || 'Tebligat'}
                  </span>
                  <span className="text-xs font-medium text-text">{t.alici || '—'}</span>
                  {t.tarih && <span className="text-[10px] text-text-dim">{fmtTarih(t.tarih)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TEBLIGAT_DURUM_RENK[t.tebligDurum || 'Gönderilmedi'] || 'bg-surface2 text-text-dim border-border'}`}>
                    {t.tebligDurum || 'Gönderilmedi'}
                  </span>
                  {t.tebligTarih && <span className="text-[10px] text-text-dim">{fmtTarih(t.tebligTarih)}</span>}
                  <button onClick={() => handleSil(t.id)} className="text-[10px] text-red hover:text-red/70 transition-colors" title="Sil">✕</button>
                </div>
              </div>

              {/* PTT Barkod Sorgulama */}
              {t.pttBarkod && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  <span className="text-[10px] text-text-dim">📦 Barkod:</span>
                  <span className="text-[11px] font-mono text-text">{t.pttBarkod}</span>
                  <button
                    onClick={() => handlePttSorgula(t.id, t.pttBarkod!)}
                    disabled={pttLoading === t.id}
                    className="ml-auto px-3 py-1 bg-[#E30613] text-white text-[10px] font-bold rounded hover:bg-[#c00510] disabled:opacity-40 transition-all flex items-center gap-1"
                  >
                    {pttLoading === t.id ? <span className="animate-spin">⏳</span> : <span>📦</span>}
                    {pttLoading === t.id ? 'Sorgulanıyor...' : "PTT'den Sorgula"}
                  </button>
                </div>
              )}

              {/* PTT Sonucu */}
              {pttSonuc[t.id] && (
                <div className={`text-[11px] px-3 py-1.5 rounded border ${
                  pttSonuc[t.id].includes('Tebliğ Edildi') ? 'bg-green-dim border-green/20 text-green' :
                  pttSonuc[t.id].includes('İade') ? 'bg-red-dim border-red/20 text-red' :
                  pttSonuc[t.id].includes('hata') || pttSonuc[t.id].includes('başarısız') ? 'bg-orange-400/10 border-orange-400/20 text-orange-400' :
                  'bg-blue-400/10 border-blue-400/20 text-blue-400'
                }`}>
                  📬 {pttSonuc[t.id]}
                </div>
              )}

              {/* Son Sorgu Bilgisi */}
              {t.pttSonSorgu && (
                <div className="text-[10px] text-text-dim">
                  Son sorgu: {new Date(t.pttSonSorgu).toLocaleString('tr-TR')}
                  {t.pttSonuc && ` — ${t.pttSonuc}`}
                </div>
              )}

              {/* Not */}
              {t.not && <div className="text-[11px] text-text-muted italic">{t.not}</div>}
            </div>
          ))}
        </div>
      )}
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
