'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import { useIhtarnameler, useIhtarnameKaydet, useIhtarnameSil, useIhtarnameArsivle, type Ihtarname } from '@/lib/hooks/useIhtarname';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { IhtarnameModal } from '@/components/modules/IhtarnameModal';
import { fmt, fmtTarih } from '@/lib/utils';

const TABS = [
  { key: 'ozet', label: 'Özet', icon: '📋' },
  { key: 'icerik', label: 'İçerik', icon: '📝' },
  { key: 'teblig', label: 'Tebliğ & Süre', icon: '📬' },
  { key: 'ptt', label: 'PTT Takip', icon: '📦' },
  { key: 'cevap', label: 'Cevap', icon: '💬' },
  { key: 'notlar', label: 'Notlar', icon: '🗒️' },
];

const DURUM_RENK: Record<string, string> = {
  'Taslak': 'bg-surface2 text-text-dim border-border',
  'Hazırlandı': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Gönderildi': 'bg-gold-dim text-gold border-gold/20',
  'Tebliğ Edildi': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  'Cevap Geldi': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Sonuçlandı': 'bg-green-dim text-green border-green/20',
};

const TUR_RENK: Record<string, string> = {
  'İhtar': 'bg-red-dim text-red border-red/20',
  'İhbarname': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Fesih İhtarı': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Ödeme İhtarı': 'bg-gold-dim text-gold border-gold/20',
  'Tahliye İhtarı': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
};

export default function IhtarnameDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ihtarnameler, isLoading } = useIhtarnameler();
  const { data: muvekkillar } = useMuvekkillar();
  const kaydet = useIhtarnameKaydet();
  const silMut = useIhtarnameSil();
  const arsivleMut = useIhtarnameArsivle();
  const [aktifTab, setAktifTab] = useState('ozet');
  const [duzenleModu, setDuzenleModu] = useState(false);
  const [pttLoading, setPttLoading] = useState(false);
  const [pttSonuc, setPttSonuc] = useState('');
  const [yeniNot, setYeniNot] = useState('');

  const ihtarname = useMemo(() => {
    return ihtarnameler?.find((i) => i.id === id && !i._silindi) ?? null;
  }, [ihtarnameler, id]);

  const muvAd = useMemo(() => {
    if (!ihtarname?.muvId || !muvekkillar) return '—';
    return muvekkillar.find((m) => m.id === ihtarname.muvId)?.ad || '—';
  }, [ihtarname, muvekkillar]);

  // Süre sonu hesaplama
  const sureBilgi = useMemo(() => {
    if (!ihtarname?.sureSonu) return null;
    const bugun = new Date();
    const sonTarih = new Date(ihtarname.sureSonu);
    const kalanGun = Math.ceil((sonTarih.getTime() - bugun.getTime()) / 86400000);
    return { kalanGun, gecmis: kalanGun < 0, acil: kalanGun >= 0 && kalanGun <= 3 };
  }, [ihtarname]);

  // PTT Sorgula
  async function handlePttSorgula() {
    if (!ihtarname?.pttBarkod?.trim()) return;
    setPttLoading(true);
    setPttSonuc('');
    try {
      const res = await fetch('/api/ptt-sorgula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barkod: ihtarname.pttBarkod.trim() }),
      });
      const data = await res.json();
      if (data.durum) {
        setPttSonuc(`${data.durum}${data.tarih ? ` — ${data.tarih}` : ''}`);
        if (data.tebligDurum) {
          await kaydet.mutateAsync({
            ...ihtarname,
            tebligDurum: data.tebligDurum,
            ...(data.tebligTarih ? { tebligTarih: data.tebligTarih } : {}),
            pttSonSorgu: new Date().toISOString(),
            pttSonuc: data.durum,
          });
        }
      } else {
        setPttSonuc('Otomatik sorgu başarısız. PTT sitesi açılıyor...');
        window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${ihtarname.pttBarkod.trim()}`, '_blank');
      }
    } catch {
      setPttSonuc('Bağlantı hatası. PTT sitesi açılıyor...');
      window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${ihtarname.pttBarkod!.trim()}`, '_blank');
    } finally {
      setPttLoading(false);
    }
  }

  // Not ekle
  async function handleNotEkle() {
    if (!ihtarname || !yeniNot.trim()) return;
    const mevcutNotlar = ihtarname.notlar || [];
    const yeniNotObj = {
      id: crypto.randomUUID(),
      icerik: yeniNot.trim(),
      tarih: new Date().toISOString(),
    };
    await kaydet.mutateAsync({ ...ihtarname, notlar: [...mevcutNotlar, yeniNotObj] });
    setYeniNot('');
  }

  // Not sil
  async function handleNotSil(notId: string) {
    if (!ihtarname) return;
    const guncelNotlar = (ihtarname.notlar || []).filter((n) => (n.id as string) !== notId);
    await kaydet.mutateAsync({ ...ihtarname, notlar: guncelNotlar });
  }

  if (isLoading) {
    return <div className="text-center py-12 text-text-muted">Yükleniyor...</div>;
  }

  if (!ihtarname) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">❌</div>
        <div className="text-sm text-text-muted">İhtarname bulunamadı</div>
        <Link href="/ihtarname" className="text-xs text-gold mt-3 inline-block hover:underline">← İhtarnamelere dön</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted mb-4">
        <Link href="/ihtarname" className="hover:text-gold transition-colors">İhtarnameler</Link>
        <span>›</span>
        <span className="text-text">{ihtarname.no || ihtarname.konu || ihtarname.id.slice(0, 8)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-[var(--font-playfair)] text-2xl text-gold font-bold">
              {ihtarname.no || '—'}
            </h1>
            {ihtarname.yon && (
              <span className="text-sm" title={ihtarname.yon === 'giden' ? 'Giden İhtarname' : 'Gelen İhtarname'}>
                {ihtarname.yon === 'giden' ? '📤' : '📥'}
              </span>
            )}
            {ihtarname.tur && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded border ${TUR_RENK[ihtarname.tur] || 'bg-surface2 text-text-muted border-border'}`}>
                {ihtarname.tur}
              </span>
            )}
          </div>
          {ihtarname.konu && (
            <div className="text-sm text-text mt-1">{ihtarname.konu}</div>
          )}
          <div className="text-xs text-text-muted mt-1">
            Gönderen: <span className="text-text">{ihtarname.gonderen || '—'}</span>
            <span className="mx-1.5 text-text-dim">→</span>
            Alıcı: <span className="text-text">{ihtarname.alici || '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDuzenleModu(true)}
            className="text-xs px-3 py-1.5 rounded bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors"
          >
            Düzenle
          </button>
          <button
            onClick={() => { arsivleMut.mutate(ihtarname); }}
            className="text-xs px-3 py-1.5 rounded bg-surface text-text-muted border border-border hover:border-gold/40 transition-colors"
            title="Arşive kaldır"
          >
            📦
          </button>
          <button
            onClick={() => {
              if (confirm(`"${ihtarname.konu || ihtarname.no}" silinecek. Emin misiniz?`)) {
                silMut.mutate(ihtarname);
                window.location.href = '/ihtarname';
              }
            }}
            className="text-xs px-3 py-1.5 rounded bg-surface text-red border border-red/20 hover:bg-red-dim transition-colors"
            title="Sil"
          >
            🗑️
          </button>
          {ihtarname.durum && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${DURUM_RENK[ihtarname.durum] || 'bg-gold-dim text-gold border-gold/20'}`}>
              {ihtarname.durum}
            </span>
          )}
        </div>
      </div>

      {/* KPI Kartlar */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <KpiCard label="Müvekkil" value={muvAd} />
        <KpiCard label="Ücret" value={fmt(ihtarname.ucret || 0)} color="text-gold" />
        <KpiCard label="Noter Masrafı" value={fmt(ihtarname.noterMasrafi || 0)} />
        <KpiCard label="Tahsil Edilen" value={fmt(ihtarname.tahsilEdildi || 0)} color="text-green" />
        {sureBilgi ? (
          <div className={`bg-surface border rounded-lg p-3 ${sureBilgi.gecmis ? 'border-red bg-red-dim' : sureBilgi.acil ? 'border-orange-400 bg-orange-400/10' : 'border-gold bg-gold-dim'}`}>
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Cevap Süresi</div>
            <div className={`text-sm font-bold ${sureBilgi.gecmis ? 'text-red' : sureBilgi.acil ? 'text-orange-400' : 'text-gold'}`}>
              {sureBilgi.gecmis ? `${Math.abs(sureBilgi.kalanGun)} gün geçti` : `${sureBilgi.kalanGun} gün kaldı`}
            </div>
          </div>
        ) : (
          <KpiCard label="Cevap Süresi" value="—" />
        )}
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
            {tab.key === 'notlar' && (ihtarname.notlar || []).length > 0 && (
              <span className="ml-1 text-[10px] bg-surface2 text-text-muted px-1 rounded">{ihtarname.notlar!.length}</span>
            )}
            {tab.key === 'cevap' && ihtarname.cevapTarih && (
              <span className="ml-1 text-[10px] bg-green-dim text-green px-1 rounded">✓</span>
            )}
            {tab.key === 'ptt' && ihtarname.pttBarkod && (
              <span className="ml-1 text-[10px] bg-orange-400/10 text-orange-400 px-1 rounded">1</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab İçerikleri */}
      <div className="bg-surface border border-border rounded-lg p-5">
        {aktifTab === 'ozet' && <OzetTab ihtarname={ihtarname} muvAd={muvAd} sureBilgi={sureBilgi} />}
        {aktifTab === 'icerik' && <IcerikTab ihtarname={ihtarname} />}
        {aktifTab === 'teblig' && <TebligTab ihtarname={ihtarname} sureBilgi={sureBilgi} />}
        {aktifTab === 'ptt' && <PttTab ihtarname={ihtarname} pttLoading={pttLoading} pttSonuc={pttSonuc} onSorgula={handlePttSorgula} />}
        {aktifTab === 'cevap' && <CevapTab ihtarname={ihtarname} />}
        {aktifTab === 'notlar' && <NotlarTab ihtarname={ihtarname} yeniNot={yeniNot} setYeniNot={setYeniNot} onNotEkle={handleNotEkle} onNotSil={handleNotSil} />}
      </div>

      {/* Düzenleme Modal */}
      {duzenleModu && (
        <IhtarnameModal
          open={duzenleModu}
          onClose={() => setDuzenleModu(false)}
          ihtarname={ihtarname}
        />
      )}
    </div>
  );
}

// ── Alt Componentler ─────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-sm font-bold truncate ${color || 'text-text'}`}>{value}</div>
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

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <h4 className="text-xs font-semibold text-text mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyTab({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="text-center py-10">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-xs text-text-muted">{message}</div>
    </div>
  );
}

// ── Özet Sekmesi ─────────────────────────────────────────────
function OzetTab({ ihtarname, muvAd, sureBilgi }: {
  ihtarname: Ihtarname;
  muvAd: string;
  sureBilgi: { kalanGun: number; gecmis: boolean; acil: boolean } | null;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <InfoCard title="İhtarname Bilgileri">
          <InfoRow label="İhtarname No" value={ihtarname.no || '—'} />
          <InfoRow label="Tür" value={ihtarname.tur || '—'} />
          <InfoRow label="Yön" value={(ihtarname.yon || 'giden') === 'giden' ? '📤 Giden' : '📥 Gelen'} />
          <InfoRow label="Durum" value={ihtarname.durum || '—'} />
          <InfoRow label="Konu" value={ihtarname.konu || '—'} />
        </InfoCard>

        <InfoCard title="Taraflar">
          <InfoRow label="Müvekkil" value={muvAd} />
          <InfoRow label="Gönderen" value={ihtarname.gonderen || '—'} />
          <InfoRow label="Alıcı" value={ihtarname.alici || '—'} />
          {ihtarname.aliciAdres && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Alıcı Adresi</div>
              <div className="text-xs text-text">{ihtarname.aliciAdres}</div>
            </div>
          )}
        </InfoCard>

        <InfoCard title="Tarihler & Noter">
          <InfoRow label="Düzenleme Tarihi" value={fmtTarih(ihtarname.tarih) || '—'} />
          <InfoRow label="Gönderim Tarihi" value={fmtTarih(ihtarname.gonderimTarih) || '—'} />
          <InfoRow label="Tebliğ Tarihi" value={fmtTarih(ihtarname.tebligTarih) || '—'} />
          <InfoRow label="Noter" value={ihtarname.noterAd || '—'} />
          <InfoRow label="Yevmiye No" value={ihtarname.noterNo || '—'} />
        </InfoCard>
      </div>

      {/* Süre uyarısı */}
      {sureBilgi && !sureBilgi.gecmis && (
        <div className={`border rounded-lg p-4 ${sureBilgi.acil ? 'bg-red-dim border-red/20' : 'bg-gold-dim border-gold/20'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${sureBilgi.acil ? 'text-red' : 'text-gold'}`}>
                Cevap Süresi
              </div>
              <div className="text-xs text-text-muted">
                Son tarih: {fmtTarih(ihtarname.sureSonu)}
                {ihtarname.cevapSuresi && ` (${ihtarname.cevapSuresi} gün)`}
              </div>
            </div>
            <div className={`text-lg font-bold ${sureBilgi.acil ? 'text-red' : 'text-gold'}`}>
              {sureBilgi.kalanGun} gün
            </div>
          </div>
        </div>
      )}

      {sureBilgi && sureBilgi.gecmis && (
        <div className="border border-red/20 rounded-lg p-4 bg-red-dim">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚨</span>
            <div>
              <div className="text-xs font-bold text-red">Cevap Süresi Doldu</div>
              <div className="text-[11px] text-text-muted">
                {fmtTarih(ihtarname.sureSonu)} tarihinde doldu ({Math.abs(sureBilgi.kalanGun)} gün önce)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finansal Özet */}
      <div className="grid grid-cols-4 gap-3">
        <MiniKpi label="Ücret" value={fmt(ihtarname.ucret || 0)} color="text-gold" />
        <MiniKpi label="Noter Masrafı" value={fmt(ihtarname.noterMasrafi || 0)} />
        <MiniKpi label="Toplam Maliyet" value={fmt((ihtarname.ucret || 0) + (ihtarname.noterMasrafi || 0))} color="text-text" />
        <MiniKpi label="Tahsil Edilen" value={fmt(ihtarname.tahsilEdildi || 0)} color="text-green" />
      </div>
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

// ── İçerik Sekmesi ───────────────────────────────────────────
function IcerikTab({ ihtarname }: { ihtarname: Ihtarname }) {
  if (!ihtarname.icerik) {
    return <EmptyTab icon="📝" message="İhtarname içeriği henüz girilmemiş. Düzenle butonundan ekleyebilirsiniz." />;
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">İhtarname Metni</div>
        <div className="text-[10px] text-text-dim">
          {ihtarname.icerik.length} karakter
        </div>
      </div>
      <div className="bg-surface2 rounded-lg p-5 text-sm text-text leading-relaxed whitespace-pre-wrap border border-border">
        {ihtarname.icerik}
      </div>
    </div>
  );
}

// ── Tebliğ & Süre Sekmesi ────────────────────────────────────
function TebligTab({ ihtarname, sureBilgi }: {
  ihtarname: Ihtarname;
  sureBilgi: { kalanGun: number; gecmis: boolean; acil: boolean } | null;
}) {
  const TEBLIG_DURUM_RENK: Record<string, string> = {
    'Gönderilmedi': 'bg-surface2 text-text-dim border-border',
    "PTT'de Bekliyor": 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    'Tebliğ Edildi': 'bg-green-dim text-green border-green/20',
    'İade Döndü': 'bg-red-dim text-red border-red/20',
  };

  return (
    <div className="space-y-5">
      {/* Tebliğ Durumu */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface2 rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Tebliğ Durumu</div>
          <span className={`text-xs font-bold px-3 py-1 rounded border inline-block ${TEBLIG_DURUM_RENK[ihtarname.tebligDurum || 'Gönderilmedi'] || ''}`}>
            {ihtarname.tebligDurum || 'Gönderilmedi'}
          </span>
        </div>
        <div className="bg-surface2 rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Tebliğ Tarihi</div>
          <div className="text-sm font-bold text-text">{fmtTarih(ihtarname.tebligTarih) || '—'}</div>
        </div>
        <div className="bg-surface2 rounded-lg p-4 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Cevap Süresi</div>
          <div className="text-sm font-bold text-text">{ihtarname.cevapSuresi ? `${ihtarname.cevapSuresi} gün` : '—'}</div>
        </div>
      </div>

      {/* Süre Çizgisi */}
      {ihtarname.sureSonu && (
        <div className={`border rounded-lg p-4 ${
          sureBilgi?.gecmis ? 'bg-red-dim border-red/20' :
          sureBilgi?.acil ? 'bg-orange-400/10 border-orange-400/20' :
          'bg-gold-dim border-gold/20'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-text">Cevap Son Tarihi</div>
            <div className={`text-sm font-bold ${
              sureBilgi?.gecmis ? 'text-red' : sureBilgi?.acil ? 'text-orange-400' : 'text-gold'
            }`}>
              {fmtTarih(ihtarname.sureSonu)}
            </div>
          </div>
          {sureBilgi && (
            <div className={`text-xs ${sureBilgi.gecmis ? 'text-red' : sureBilgi.acil ? 'text-orange-400' : 'text-text-muted'}`}>
              {sureBilgi.gecmis
                ? `⚠️ Süre ${Math.abs(sureBilgi.kalanGun)} gün önce doldu!`
                : `⏰ ${sureBilgi.kalanGun} gün kaldı`
              }
            </div>
          )}
        </div>
      )}

      {/* Zaman Çizelgesi */}
      <div>
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Zaman Çizelgesi</div>
        <div className="space-y-3">
          <ZamanSatir tarih={ihtarname.tarih} etiket="Düzenleme Tarihi" ikon="📝" aktif />
          <ZamanSatir tarih={ihtarname.gonderimTarih} etiket="Gönderim Tarihi" ikon="📮" aktif={!!ihtarname.gonderimTarih} />
          <ZamanSatir tarih={ihtarname.tebligTarih} etiket="Tebliğ Tarihi" ikon="📬" aktif={!!ihtarname.tebligTarih} />
          <ZamanSatir tarih={ihtarname.sureSonu} etiket="Cevap Son Tarihi" ikon="⏰" aktif={!!ihtarname.sureSonu} />
          <ZamanSatir tarih={ihtarname.cevapTarih} etiket="Cevap Tarihi" ikon="💬" aktif={!!ihtarname.cevapTarih} />
        </div>
      </div>
    </div>
  );
}

function ZamanSatir({ tarih, etiket, ikon, aktif }: { tarih?: string; etiket: string; ikon: string; aktif: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${aktif ? 'bg-surface2' : 'bg-surface2/30 opacity-50'}`}>
      <span className="text-sm">{ikon}</span>
      <div className="flex-1">
        <div className="text-xs font-medium text-text">{etiket}</div>
      </div>
      <div className="text-xs text-text-muted font-mono">{tarih ? fmtTarih(tarih) : '—'}</div>
    </div>
  );
}

// ── PTT Takip Sekmesi ────────────────────────────────────────
function PttTab({ ihtarname, pttLoading, pttSonuc, onSorgula }: {
  ihtarname: Ihtarname;
  pttLoading: boolean;
  pttSonuc: string;
  onSorgula: () => void;
}) {
  if (!ihtarname.pttBarkod) {
    return <EmptyTab icon="📦" message="PTT barkod numarası girilmemiş. Düzenle butonundan ekleyebilirsiniz." />;
  }

  const TEBLIG_DURUM_RENK: Record<string, string> = {
    'Gönderilmedi': 'bg-surface2 text-text-dim border-border',
    "PTT'de Bekliyor": 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    'Tebliğ Edildi': 'bg-green-dim text-green border-green/20',
    'İade Döndü': 'bg-red-dim text-red border-red/20',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">PTT Gönderi Takip</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gold">{ihtarname.pttBarkod}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TEBLIG_DURUM_RENK[ihtarname.tebligDurum || 'Gönderilmedi']}`}>
              {ihtarname.tebligDurum || 'Gönderilmedi'}
            </span>
          </div>
        </div>
        <button
          onClick={onSorgula}
          disabled={pttLoading}
          className="px-4 py-2 bg-[#E30613] text-white text-xs font-bold rounded-lg hover:bg-[#c00510] disabled:opacity-40 transition-all flex items-center gap-1.5"
        >
          {pttLoading ? <span className="animate-spin">⏳</span> : <span>📦</span>}
          {pttLoading ? 'Sorgulanıyor...' : "PTT'den Sorgula"}
        </button>
      </div>

      {pttSonuc && (
        <div className={`text-xs px-4 py-3 rounded-lg border ${
          pttSonuc.includes('Tebliğ Edildi') ? 'bg-green-dim border-green/20 text-green' :
          pttSonuc.includes('İade') ? 'bg-red-dim border-red/20 text-red' :
          pttSonuc.includes('hata') || pttSonuc.includes('başarısız') ? 'bg-orange-400/10 border-orange-400/20 text-orange-400' :
          'bg-blue-400/10 border-blue-400/20 text-blue-400'
        }`}>
          📬 {pttSonuc}
        </div>
      )}

      {ihtarname.pttSonSorgu && (
        <div className="bg-surface2 rounded-lg p-4 space-y-2">
          <div className="text-xs font-semibold text-text-muted">Son Sorgu Bilgisi</div>
          <InfoRow label="Son Sorgu Tarihi" value={new Date(ihtarname.pttSonSorgu).toLocaleString('tr-TR')} />
          {ihtarname.pttSonuc && <InfoRow label="Sonuç" value={ihtarname.pttSonuc} />}
        </div>
      )}

      <div className="border-t border-border pt-3">
        <a
          href={`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${ihtarname.pttBarkod}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gold hover:underline"
        >
          🔗 PTT Gönderi Takip Sitesinde Aç →
        </a>
      </div>
    </div>
  );
}

// ── Cevap Sekmesi ────────────────────────────────────────────
function CevapTab({ ihtarname }: { ihtarname: Ihtarname }) {
  if (!ihtarname.cevapTarih && !ihtarname.cevapOzet) {
    return <EmptyTab icon="💬" message="Henüz cevap kaydı yok. Durum 'Cevap Geldi' olduğunda buradan cevap bilgilerini görebilirsiniz." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface2 rounded-lg p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Cevap Tarihi</div>
          <div className="text-sm font-bold text-text">{fmtTarih(ihtarname.cevapTarih) || '—'}</div>
        </div>
        <div className="bg-surface2 rounded-lg p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Durum</div>
          <div className="text-sm font-bold text-green">Cevap Alındı</div>
        </div>
      </div>
      {ihtarname.cevapOzet && (
        <div>
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Cevap Özeti</div>
          <div className="bg-surface2 rounded-lg p-4 text-sm text-text whitespace-pre-wrap">
            {ihtarname.cevapOzet}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notlar Sekmesi ───────────────────────────────────────────
function NotlarTab({ ihtarname, yeniNot, setYeniNot, onNotEkle, onNotSil }: {
  ihtarname: Ihtarname;
  yeniNot: string;
  setYeniNot: (v: string) => void;
  onNotEkle: () => void;
  onNotSil: (id: string) => void;
}) {
  const notlar = ihtarname.notlar || [];

  return (
    <div className="space-y-4">
      {/* Yeni Not Ekle */}
      <div className="bg-surface2/50 border border-border rounded-lg p-4 space-y-3">
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">📝 Not Ekle</div>
        <textarea
          value={yeniNot}
          onChange={(e) => setYeniNot(e.target.value)}
          placeholder="Yeni not ekleyin..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:outline-none focus:border-gold resize-none"
        />
        <div className="flex justify-end">
          <button
            onClick={onNotEkle}
            disabled={!yeniNot.trim()}
            className="px-4 py-1.5 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-40"
          >
            Not Ekle
          </button>
        </div>
      </div>

      {/* Not Listesi */}
      {notlar.length === 0 ? (
        <div className="text-center py-6 text-text-dim text-xs">Henüz not eklenmemiş</div>
      ) : (
        <div className="space-y-2">
          {[...notlar].reverse().map((n) => (
            <div key={(n.id as string) || Math.random()} className="p-3 bg-surface2 rounded-lg group">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] text-text-dim">{n.tarih ? new Date(n.tarih as string).toLocaleString('tr-TR') : '—'}</div>
                <button
                  onClick={() => onNotSil(n.id as string)}
                  className="text-[10px] text-red opacity-0 group-hover:opacity-100 transition-opacity hover:text-red/70"
                >
                  ✕ Sil
                </button>
              </div>
              <div className="text-xs text-text whitespace-pre-wrap">{(n.icerik as string) || '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
