'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useIcralar, useIcraKaydet, type Icra } from '@/lib/hooks/useIcra';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { fmt, fmtTarih } from '@/lib/utils';
import { IcraModal } from '@/components/modules/IcraModal';
import { ExportMenu } from '@/components/ui/ExportMenu';
import { SureBadge } from '@/components/ui/SureBadge';
import { tamIcraDairesiAdi, esasNoGoster, dosyaNoOlustur, alacakliBelirle, sureHesapla } from '@/lib/utils/uyapHelpers';
import { ICRA_TURLERI, ICRA_DURUMLARI } from '@/lib/constants/uyap';
import { exportIcraListeUYAPXLS } from '@/lib/export/excelExport';
import { exportIcraListePDF } from '@/lib/export/pdfExport';

/* ── Durum renk haritasi ── */
const DURUM_RENK: Record<string, string> = {
  'Aktif': 'text-green bg-green-dim border-green/20',
  'Takipte': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Haciz Aşaması': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Satış Aşaması': 'text-red bg-red-dim border-red/20',
  'Kapandı': 'text-text-dim bg-surface2 border-border',
};

/* ── Siralama tipleri ── */
type SortKey = 'kayitNo' | 'esasNo' | 'alacak' | 'tarih';
type SortDir = 'asc' | 'desc';

/* ── Süre gün sayisi (tür bazli) ── */
function itirazGunSayisi(tur?: string): number {
  if (tur === 'Kambiyo') return 5;
  return 7;
}

/* ── Satir vurgulama (süre bazli) ── */
function satirVurgu(kalanGun: number | null): string {
  if (kalanGun === null) return '';
  if (kalanGun >= 0 && kalanGun <= 3) return 'bg-red/5';
  if (kalanGun >= 0 && kalanGun <= 7) return 'bg-gold/5';
  return '';
}

export default function IcraPage() {
  const { data: icralar, isLoading } = useIcralar();
  const { data: muvekkillar } = useMuvekkillar();
  const kaydetMutation = useIcraKaydet();

  const [arama, setArama] = useState('');
  const [durumFiltre, setDurumFiltre] = useState<string>('hepsi');
  const [turFiltre, setTurFiltre] = useState<string>('hepsi');
  const [tarihBaslangic, setTarihBaslangic] = useState('');
  const [tarihBitis, setTarihBitis] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('kayitNo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modalAcik, setModalAcik] = useState(false);
  const [seciliIcra, setSeciliIcra] = useState<Icra | null>(null);

  /* ── Müvekkil adi map ── */
  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  /* ── Süre hesaplamalari (once hesapla, sonra KPI + row'da kullan) ── */
  const sureMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof sureHesapla> | null> = {};
    icralar?.forEach((ic) => {
      if (ic.tebligTarihi) {
        map[ic.id] = sureHesapla(ic.tebligTarihi, itirazGunSayisi(ic.tur));
      } else {
        map[ic.id] = null;
      }
    });
    return map;
  }, [icralar]);

  /* ── KPI ── */
  const kpis = useMemo(() => {
    if (!icralar) return { toplam: 0, aktifTakip: 0, toplamAlacak: 0, tahsilEdilen: 0, kalan: 0, yaklasanSure: 0 };
    const aktifTakip = icralar.filter((i) => i.durum !== 'Kapandı').length;
    const toplamAlacak = icralar.reduce((t, i) => t + (i.alacak || 0), 0);
    const tahsilEdilen = icralar.reduce((t, i) => t + (i.tahsil || 0), 0);
    const yaklasanSure = icralar.filter((ic) => {
      const s = sureMap[ic.id];
      return s && !s.gecmis && s.kalanGun <= 7;
    }).length;
    return { toplam: icralar.length, aktifTakip, toplamAlacak, tahsilEdilen, kalan: toplamAlacak - tahsilEdilen, yaklasanSure };
  }, [icralar, sureMap]);

  /* ── Filtreleme + Siralama ── */
  const filtrelenmis = useMemo(() => {
    if (!icralar) return [];

    let sonuc = icralar.filter((ic) => {
      // Durum filtre
      if (durumFiltre !== 'hepsi' && ic.durum !== durumFiltre) return false;
      // Tür filtre
      if (turFiltre !== 'hepsi' && ic.tur !== turFiltre) return false;
      // Tarih araligi
      if (tarihBaslangic && ic.tarih && ic.tarih < tarihBaslangic) return false;
      if (tarihBitis && ic.tarih && ic.tarih > tarihBitis) return false;
      // Arama
      if (arama) {
        const q = arama.toLowerCase();
        const muvAd = muvAdMap[ic.muvId || ''] || '';
        const esasStr = esasNoGoster(ic.esasYil, ic.esasNo) || ic.esas || '';
        const daireStr = tamIcraDairesiAdi(ic.il, ic.daire);
        return (
          (ic.no || '').toLowerCase().includes(q) ||
          esasStr.toLowerCase().includes(q) ||
          (ic.borclu || '').toLowerCase().includes(q) ||
          muvAd.toLowerCase().includes(q) ||
          daireStr.toLowerCase().includes(q) ||
          (ic.tur || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Siralama
    sonuc = [...sonuc].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'kayitNo':
          cmp = (a.kayitNo || a.sira || 0) - (b.kayitNo || b.sira || 0);
          break;
        case 'esasNo': {
          const ea = esasNoGoster(a.esasYil, a.esasNo) || a.esas || '';
          const eb = esasNoGoster(b.esasYil, b.esasNo) || b.esas || '';
          cmp = ea.localeCompare(eb, 'tr');
          break;
        }
        case 'alacak':
          cmp = (a.alacak || 0) - (b.alacak || 0);
          break;
        case 'tarih': {
          const ta = a.tarih || '';
          const tb = b.tarih || '';
          cmp = ta.localeCompare(tb);
          break;
        }
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return sonuc;
  }, [icralar, arama, durumFiltre, turFiltre, tarihBaslangic, tarihBitis, sortKey, sortDir, muvAdMap]);

  /* ── Siralama toggle ── */
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  /* ── Export handlers ── */
  function handleExportExcel() {
    if (!filtrelenmis.length) return;
    exportIcraListeUYAPXLS(
      filtrelenmis as unknown as Array<Record<string, unknown>>,
      muvAdMap,
    );
  }

  function handleExportPDF() {
    if (!filtrelenmis.length) return;
    exportIcraListePDF(
      filtrelenmis as unknown as Array<Record<string, unknown>>,
      muvAdMap,
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
          İcra Dosyaları
          {icralar && <span className="text-sm font-normal text-text-muted ml-2">({icralar.length})</span>}
        </h1>
        <div className="flex items-center gap-2">
          <ExportMenu
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            disabled={!filtrelenmis.length}
          />
          <button
            onClick={() => { setSeciliIcra(null); setModalAcik(true); }}
            className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
          >
            + Yeni İcra Dosyası
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        <MiniKpi label="Toplam" value={kpis.toplam.toString()} />
        <MiniKpi label="Aktif Takip" value={kpis.aktifTakip.toString()} color="text-green" />
        <MiniKpi label="Toplam Alacak" value={fmt(kpis.toplamAlacak)} color="text-gold" />
        <MiniKpi label="Tahsil Edilen" value={fmt(kpis.tahsilEdilen)} color="text-green" />
        <MiniKpi label="Kalan" value={fmt(kpis.kalan)} color="text-red" />
        <MiniKpi label="Yaklaşan Süre" value={kpis.yaklasanSure.toString()} color={kpis.yaklasanSure > 0 ? 'text-orange-400' : 'text-text-muted'} />
      </div>

      {/* Arama + Filtreler */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex-1 min-w-[220px] relative">
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Esas no, daire, alacaklı/borçlu adı, tür ile ara..."
            className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">&#x1F50D;</span>
        </div>

        <select
          value={durumFiltre}
          onChange={(e) => setDurumFiltre(e.target.value)}
          className="px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
        >
          <option value="hepsi">Tum Durumlar</option>
          {ICRA_DURUMLARI.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={turFiltre}
          onChange={(e) => setTurFiltre(e.target.value)}
          className="px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold max-w-[200px]"
        >
          <option value="hepsi">Tum Turler</option>
          {ICRA_TURLERI.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={tarihBaslangic}
            onChange={(e) => setTarihBaslangic(e.target.value)}
            className="px-2 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
            title="Baslangic tarihi"
          />
          <span className="text-text-dim text-xs">-</span>
          <input
            type="date"
            value={tarihBitis}
            onChange={(e) => setTarihBitis(e.target.value)}
            className="px-2 py-2 bg-surface border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
            title="Bitis tarihi"
          />
        </div>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted text-sm">Yukleniyor...</div>
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-border rounded-lg">
          <div className="text-4xl mb-3">&#x1F4CB;</div>
          <div className="text-sm text-text-muted">
            {arama || durumFiltre !== 'hepsi' || turFiltre !== 'hepsi' || tarihBaslangic || tarihBitis
              ? 'Arama sonucu bulunamadi'
              : 'Henuz icra dosyasi eklenmemis'}
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden overflow-x-auto">
          {/* Tablo Baslik */}
          <div className="grid grid-cols-[70px_100px_90px_1fr_1fr_1fr_90px_100px_100px_80px] gap-2 px-4 py-2.5 border-b border-border text-[11px] text-text-muted font-medium uppercase tracking-wider min-w-[1000px]">
            <button
              type="button"
              onClick={() => toggleSort('kayitNo')}
              className="text-left hover:text-text transition-colors"
            >
              Kayit No{sortIcon('kayitNo')}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('esasNo')}
              className="text-left hover:text-text transition-colors"
            >
              Esas No{sortIcon('esasNo')}
            </button>
            <span>Takip Turu</span>
            <span>Alacakli</span>
            <span>Borclu</span>
            <span>Icra Mud.</span>
            <span>Durum</span>
            <button
              type="button"
              onClick={() => toggleSort('alacak')}
              className="text-left hover:text-text transition-colors"
            >
              Alacak{sortIcon('alacak')}
            </button>
            <span>Tahsilat %</span>
            <button
              type="button"
              onClick={() => toggleSort('tarih')}
              className="text-left hover:text-text transition-colors"
            >
              Sure{sortIcon('tarih')}
            </button>
          </div>

          {/* Satirlar */}
          {filtrelenmis.map((ic, idx) => {
            const tahsilOran = ic.alacak && ic.alacak > 0 ? Math.min(((ic.tahsil || 0) / ic.alacak) * 100, 100) : 0;
            const kayitNoStr = dosyaNoOlustur('I', ic.kayitNo || ic.sira);
            const esasStr = esasNoGoster(ic.esasYil, ic.esasNo) || ic.esas || '';
            const daireFull = tamIcraDairesiAdi(ic.il, ic.daire);
            const muvAd = muvAdMap[ic.muvId || ''] || '';
            const borcluAd = ic.borclu || '';
            const { alacakli, borclu } = alacakliBelirle(ic.muvRol, muvAd, borcluAd);
            const sureInfo = sureMap[ic.id];
            const kalanGun = sureInfo ? sureInfo.kalanGun : null;
            const rowVurgu = kalanGun !== null ? satirVurgu(kalanGun) : '';

            return (
              <Link
                key={ic.id}
                href={`/icra/${ic.id}`}
                className={`grid grid-cols-[70px_100px_90px_1fr_1fr_1fr_90px_100px_100px_80px] gap-2 px-4 py-3 border-b border-border/50 hover:bg-gold-dim transition-colors group items-center min-w-[1000px] ${rowVurgu}`}
              >
                {/* Kayit No */}
                <span className="font-[var(--font-playfair)] text-[11px] font-bold text-gold">{kayitNoStr || `I-${String(idx + 1).padStart(3, '0')}`}</span>

                {/* Esas No */}
                <span className="text-xs font-semibold text-text truncate">{esasStr || '—'}</span>

                {/* Takip Turu */}
                <span className="text-[10px] text-text-muted truncate">{ic.tur || '—'}</span>

                {/* Alacakli */}
                <span className="text-xs text-text truncate" title={alacakli}>{alacakli || '—'}</span>

                {/* Borclu */}
                <span className="text-xs text-text-muted truncate" title={borclu}>{borclu || '—'}</span>

                {/* Icra Mudurlugu */}
                <span className="text-[10px] text-text-dim truncate" title={daireFull}>{daireFull || '—'}</span>

                {/* Durum */}
                <span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${DURUM_RENK[ic.durum || ''] || 'text-text-dim bg-surface2 border-border'}`}>
                    {ic.durum || '—'}
                  </span>
                </span>

                {/* Alacak */}
                <span className="text-xs font-semibold text-text font-[var(--font-playfair)]">{fmt(ic.alacak || 0)}</span>

                {/* Tahsilat % */}
                <span className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${tahsilOran >= 100 ? 'bg-green' : tahsilOran > 50 ? 'bg-gold' : 'bg-red'}`}
                      style={{ width: `${tahsilOran}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text-dim w-8 text-right">{Math.round(tahsilOran)}%</span>
                </span>

                {/* Sure */}
                <span className="flex items-center justify-center">
                  {sureInfo ? (
                    <SureBadge kalanGun={sureInfo.kalanGun} compact />
                  ) : (
                    <span className="text-[10px] text-text-dim">—</span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <IcraModal open={modalAcik} onClose={() => setModalAcik(false)} icra={seciliIcra} />
    </div>
  );
}

/* ── Mini KPI Bileşeni ── */
function MiniKpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`font-[var(--font-playfair)] text-lg font-bold ${color || 'text-text'}`}>{value}</div>
    </div>
  );
}
