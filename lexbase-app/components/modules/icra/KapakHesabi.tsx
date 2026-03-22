'use client';

import { useMemo, useState } from 'react';
import { fmt, fmtTarih } from '@/lib/utils';
import {
  hesaplaKapakHesabi,
  kismiOdemeMahsup,
  type AlacakKalemi,
  type KapakHesabiSonuc,
  type MahsupSonucu,
} from '@/lib/utils/faiz';
import { tahsilatToplam } from '@/lib/utils/finans';
import { exportKapakHesabiPDF } from '@/lib/export/pdfExport';
import { exportKapakHesabiXLS } from '@/lib/export/excelExport';
import type { Icra } from '@/lib/hooks/useIcra';

/* ══════════════════════════════════════════════════════════════
   Kapak Hesabı Paneli — İcra dosyasının güncel değer hesabı
   Faiz, vekalet ücreti, masraflar dahil tam kapak hesabı
   ══════════════════════════════════════════════════════════════ */

interface KapakHesabiProps {
  icra: Icra;
}

export function KapakHesabiPanel({ icra }: KapakHesabiProps) {
  const [hesapTarihi, setHesapTarihi] = useState(new Date().toISOString().slice(0, 10));
  const [mahsupTutar, setMahsupTutar] = useState('');
  const [mahsupSonuc, setMahsupSonuc] = useState<MahsupSonucu | null>(null);

  // Alacak kalemlerini hazırla (yeni yapı varsa onu, yoksa eski flat yapıdan dönüştür)
  const alacakKalemleri = useMemo<AlacakKalemi[]>(() => {
    if (icra.alacakDetay?.length) {
      return icra.alacakDetay as AlacakKalemi[];
    }
    // Eski yapıdan migrasyon — flat alacakKalemleri'nden tek kalem oluştur
    const eski = icra.alacakKalemleri;
    if (eski?.asilAlacak && eski.asilAlacak > 0) {
      return [{
        id: 'legacy-asil',
        kalemTuru: 'asil_alacak' as const,
        aciklama: 'Asıl Alacak',
        asilTutar: eski.asilAlacak,
        vadeTarihi: icra.tarih || '2024-01-01',
        faizTuru: 'yasal' as const,
      }];
    }
    // alacak field'ından tek kalem
    if (icra.alacak && Number(icra.alacak) > 0) {
      return [{
        id: 'legacy-alacak',
        kalemTuru: 'asil_alacak' as const,
        aciklama: 'Takip Alacağı',
        asilTutar: Number(icra.alacak),
        vadeTarihi: icra.tarih || '2024-01-01',
        faizTuru: 'yasal' as const,
      }];
    }
    return [];
  }, [icra]);

  // Masraflar toplamı
  const icraMasraflari = useMemo(() => {
    const harcamalar = icra.harcamalar || [];
    return harcamalar.reduce((t, h) => t + (h.tutar || 0), 0);
  }, [icra.harcamalar]);

  // Tahsilat toplamı
  const tahsilEdilen = useMemo(() => {
    const tahArr = icra.tahsilatlar as Array<{ tutar?: number }> | undefined;
    return tahArr?.length ? tahsilatToplam(tahArr) : Number(icra.tahsil || 0);
  }, [icra.tahsilatlar, icra.tahsil]);

  // Vekalet ücreti
  const vekaletUcreti = icra.vekaletUcretiOtomatik !== false
    ? undefined // otomatik hesapla
    : icra.vekaletUcretiManuel || Number(icra.alacakKalemleri?.vekaletUcreti || 0);

  // Kapak hesabı
  const kapak = useMemo<KapakHesabiSonuc>(() => {
    return hesaplaKapakHesabi(
      alacakKalemleri,
      icraMasraflari,
      tahsilEdilen,
      vekaletUcreti,
      hesapTarihi,
    );
  }, [alacakKalemleri, icraMasraflari, tahsilEdilen, vekaletUcreti, hesapTarihi]);

  // Kısmi ödeme mahsubu
  function handleMahsup() {
    const tutar = Number(mahsupTutar);
    if (tutar <= 0) return;
    const sonuc = kismiOdemeMahsup(kapak, tutar);
    setMahsupSonuc(sonuc);
  }

  if (alacakKalemleri.length === 0) {
    return (
      <div className="text-center py-8 bg-surface border border-border rounded-lg">
        <div className="text-2xl mb-2">📋</div>
        <div className="text-sm text-text-muted">Alacak kalemi girilmemiş</div>
        <div className="text-xs text-text-dim mt-1">Dosya detayından alacak kalemleri ekleyerek kapak hesabını görüntüleyin</div>
      </div>
    );
  }

  const MAHSUP_LABELS: Record<string, string> = {
    masraf: 'İcra Masrafları',
    vekalet_ucreti: 'Vekalet Ücreti',
    faiz: 'İşlemiş Faiz',
    asil_alacak: 'Asıl Alacak',
  };

  return (
    <div className="space-y-4">
      {/* Hesap Tarihi + Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gold">Kapak Hesabı</h3>
          <button
            onClick={() => {
              const dosyaAdi = icra.borclu || icra.esas || 'dosya';
              const exportData = { ...kapak, dosyaAdi, hesapTarihi, kalemler: kapak.kalemler.map((k) => ({ ...k, vadeTarihi: alacakKalemleri.find((ak) => ak.id === k.kalemId)?.vadeTarihi || '' })) };
              exportKapakHesabiPDF(exportData);
            }}
            className="px-2 py-1 text-[10px] font-medium text-text-muted bg-surface border border-border rounded hover:text-gold hover:border-gold/30 transition-colors"
          >PDF</button>
          <button
            onClick={() => {
              const dosyaAdi = icra.borclu || icra.esas || 'dosya';
              const exportData = { ...kapak, dosyaAdi, hesapTarihi, kalemler: kapak.kalemler.map((k) => ({ ...k, vadeTarihi: alacakKalemleri.find((ak) => ak.id === k.kalemId)?.vadeTarihi || '' })) };
              exportKapakHesabiXLS(exportData);
            }}
            className="px-2 py-1 text-[10px] font-medium text-text-muted bg-surface border border-border rounded hover:text-gold hover:border-gold/30 transition-colors"
          >Excel</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-dim">Hesap tarihi:</span>
          <input
            type="date"
            value={hesapTarihi}
            onChange={(e) => setHesapTarihi(e.target.value)}
            className="text-xs px-2 py-1 bg-surface border border-border rounded text-text focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Alacak Kalemleri Tablosu */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-surface2">
              <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Kalem</th>
              <th className="px-3 py-2 text-left text-[10px] text-text-muted font-medium">Vade</th>
              <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">Asıl Alacak</th>
              <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">İşlemiş Faiz</th>
              <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">İşleyen Faiz</th>
              <th className="px-3 py-2 text-right text-[10px] text-text-muted font-medium">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {kapak.kalemler.map((k) => (
              <tr key={k.kalemId} className="border-b border-border/50">
                <td className="px-3 py-2 text-text">{k.aciklama}</td>
                <td className="px-3 py-2 text-text-muted">
                  {fmtTarih(alacakKalemleri.find((ak) => ak.id === k.kalemId)?.vadeTarihi || '')}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-text">{fmt(k.asilAlacak)}</td>
                <td className="px-3 py-2 text-right text-orange-400">{k.islemiFaiz > 0 ? fmt(k.islemiFaiz) : '—'}</td>
                <td className="px-3 py-2 text-right text-orange-300">{fmt(k.islemizFaiz)}</td>
                <td className="px-3 py-2 text-right font-bold text-text">{fmt(k.toplamKalem)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dosya Değeri Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-center">
          <div className="text-[9px] text-text-muted uppercase tracking-wider">Asıl Alacak</div>
          <div className="text-sm font-bold text-text">{fmt(kapak.toplamAsilAlacak)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-center">
          <div className="text-[9px] text-text-muted uppercase tracking-wider">İşlemiş Faiz</div>
          <div className="text-sm font-bold text-orange-400">{fmt(kapak.toplamIslemiFaiz)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-center">
          <div className="text-[9px] text-text-muted uppercase tracking-wider">İşleyen Faiz</div>
          <div className="text-sm font-bold text-orange-300">{fmt(kapak.toplamIsleyenFaiz)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-center">
          <div className="text-[9px] text-text-muted uppercase tracking-wider">Vekalet Ücreti</div>
          <div className="text-sm font-bold text-text">{fmt(kapak.icraVekaletUcreti)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-center">
          <div className="text-[9px] text-text-muted uppercase tracking-wider">Masraflar</div>
          <div className="text-sm font-bold text-text">{fmt(kapak.icraMasraflari)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2 text-center">
          <div className="text-[9px] text-text-muted uppercase tracking-wider">Tahsil Edilen</div>
          <div className="text-sm font-bold text-green">{fmt(kapak.tahsilEdilen)}</div>
        </div>
        <div className={`border rounded-lg px-3 py-2 text-center ${kapak.kalanBorc > 0 ? 'bg-red/5 border-red/30' : 'bg-green/5 border-green/30'}`}>
          <div className="text-[9px] text-text-muted uppercase tracking-wider">Kalan Borç</div>
          <div className={`text-base font-bold ${kapak.kalanBorc > 0 ? 'text-red' : 'text-green'}`}>
            {fmt(kapak.kalanBorc)}
          </div>
        </div>
      </div>

      {/* Toplam Dosya Değeri */}
      <div className="bg-gold-dim border border-gold/20 rounded-lg px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gold uppercase tracking-wider font-semibold">Toplam Dosya Değeri</div>
          <div className="text-[10px] text-text-dim">{fmtTarih(kapak.hesapTarihi)} tarihi itibariyle</div>
        </div>
        <div className="font-[var(--font-playfair)] text-2xl font-bold text-gold">{fmt(kapak.toplamDosyaDegeri)}</div>
      </div>

      {/* Kısmi Ödeme Mahsubu */}
      <div className="border-t border-border pt-4">
        <h4 className="text-xs font-semibold text-text-muted mb-3">Kısmi Ödeme Mahsubu</h4>
        <div className="flex items-center gap-3">
          <input
            type="number" step="0.01" min="0"
            value={mahsupTutar}
            onChange={(e) => { setMahsupTutar(e.target.value); setMahsupSonuc(null); }}
            placeholder="Ödeme tutarı..."
            className="w-48 text-xs px-3 py-2 bg-surface border border-border rounded-lg text-text focus:border-gold focus:outline-none"
          />
          <button
            onClick={handleMahsup}
            disabled={!mahsupTutar || Number(mahsupTutar) <= 0}
            className="px-4 py-2 text-xs font-semibold text-gold border border-gold/30 rounded-lg hover:bg-gold-dim transition-colors disabled:opacity-40"
          >
            Hesapla
          </button>
        </div>

        {mahsupSonuc && (
          <div className="mt-3 bg-surface border border-border rounded-lg p-3 space-y-2">
            <div className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">Mahsup Sırası (Yasal)</div>
            {mahsupSonuc.mahsupDetay.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-text">
                  {i + 1}. {MAHSUP_LABELS[m.hedef] || m.hedef}
                  {m.kalemId && kapak.kalemler.find((k) => k.kalemId === m.kalemId) && (
                    <span className="text-text-dim ml-1">
                      ({kapak.kalemler.find((k) => k.kalemId === m.kalemId)?.aciklama})
                    </span>
                  )}
                </span>
                <span className="font-semibold text-green">{fmt(m.tutar)}</span>
              </div>
            ))}
            {mahsupSonuc.kalanOdeme > 0 && (
              <div className="flex items-center justify-between text-xs border-t border-border pt-2 mt-2">
                <span className="text-text-muted">Kalan (fazla ödeme)</span>
                <span className="font-semibold text-blue-400">{fmt(mahsupSonuc.kalanOdeme)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
