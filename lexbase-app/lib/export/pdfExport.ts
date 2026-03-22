/* ══════════════════════════════════════════════════════════════
   PDF Export — Rapor ve liste PDF çıktıları
   (Dynamic import: jsPDF sadece tarayıcıda yüklenir)
   ══════════════════════════════════════════════════════════════ */

type JsPDF = import('jspdf').jsPDF;

// Ortak header
function headerEkle(doc: JsPDF, baslik: string, altBaslik?: string) {
  doc.setFontSize(18);
  doc.setTextColor(184, 155, 72);
  doc.text('LexBase', 20, 20);

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }), 190, 20, { align: 'right' });

  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(baslik, 20, 35);

  if (altBaslik) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(altBaslik, 20, 42);
  }

  return altBaslik ? 50 : 45;
}

function footerEkle(doc: JsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Bu rapor LexBase tarafindan olusturulmustur. Sayfa ${i}/${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }
}

// ── Müvekkil Listesi PDF ──────────────────────────────────────
export async function exportMuvekkilListePDF(muvekkillar: Array<Record<string, unknown>>) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const startY = headerEkle(doc, 'Muvekkil Listesi', `Toplam: ${muvekkillar.length} muvekkil`);

  autoTable(doc, {
    startY,
    head: [['#', 'Ad', 'Tip', 'TC / VKN', 'Telefon', 'E-posta']],
    body: muvekkillar.map((m, i) => [
      i + 1,
      (m.ad as string) || '-',
      (m.tip as string) === 'tuzel' ? 'Tuzel' : 'Gercek',
      (m.tc as string) || (m.vergiNo as string) || '-',
      (m.tel as string) || '-',
      (m.mail as string) || '-',
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [184, 155, 72], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  footerEkle(doc);
  doc.save(`muvekkil-listesi-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Karşı Taraf Listesi PDF ────────────────────────────────────
export async function exportKarsiTarafListePDF(liste: Array<Record<string, unknown>>) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const startY = headerEkle(doc, 'Karsi Taraf Listesi', `Toplam: ${liste.length} kayit`);

  autoTable(doc, {
    startY,
    head: [['#', 'Ad', 'Tip', 'TC / VKN', 'Telefon', 'E-posta']],
    body: liste.map((k, i) => [
      i + 1,
      (k.ad as string) || '-',
      (k.tip as string) === 'tuzel' ? 'Tuzel' : 'Gercek',
      (k.tc as string) || (k.vergiNo as string) || '-',
      (k.tel as string) || '-',
      (k.mail as string) || '-',
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [184, 155, 72], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  footerEkle(doc);
  doc.save(`karsi-taraflar-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Avukat Listesi PDF ────────────────────────────────────────
export async function exportAvukatListePDF(liste: Array<Record<string, unknown>>) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const startY = headerEkle(doc, 'Avukat Listesi', `Toplam: ${liste.length} avukat`);

  autoTable(doc, {
    startY,
    head: [['#', 'Ad', 'Baro', 'Sicil', 'TBB', 'Telefon', 'E-posta']],
    body: liste.map((v, i) => [
      i + 1,
      (v.ad as string) || '-',
      (v.baro as string) || '-',
      (v.baroSicil as string) || '-',
      (v.tbbSicil as string) || '-',
      (v.tel as string) || '-',
      (v.mail as string) || '-',
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [184, 155, 72], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  footerEkle(doc);
  doc.save(`avukatlar-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Faaliyet Raporu PDF ───────────────────────────────────────
export interface FaaliyetItem {
  tarih: string;
  tur: string;
  aciklama: string;
}

export async function exportFaaliyetRaporuPDF(
  muvekkilAd: string,
  faaliyetler: FaaliyetItem[],
  baslangic: string,
  bitis: string,
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const startY = headerEkle(
    doc,
    `Faaliyet Raporu: ${muvekkilAd}`,
    `Donem: ${baslangic} - ${bitis}`
  );

  if (faaliyetler.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Bu donemde faaliyet bulunamadi.', 20, startY + 10);
  } else {
    autoTable(doc, {
      startY,
      head: [['Tarih', 'Tur', 'Aciklama']],
      body: faaliyetler.map((f) => [f.tarih, f.tur, f.aciklama]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [184, 155, 72], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
      },
    });
  }

  footerEkle(doc);
  doc.save(`faaliyet-raporu-${muvekkilAd.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Finansal Rapor PDF ────────────────────────────────────────
export interface FinansOzet {
  toplamUcret: number;
  toplamTahsilat: number;
  toplamHarcama: number;
  toplamAvans: number;
  net: number;
}

export async function exportFinansRaporuPDF(muvekkilAd: string, ozet: FinansOzet) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const startY = headerEkle(doc, `Finansal Ozet: ${muvekkilAd}`);

  const fmt = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

  autoTable(doc, {
    startY,
    head: [['Kalem', 'Tutar']],
    body: [
      ['Toplam Ucret', fmt(ozet.toplamUcret)],
      ['Toplam Tahsilat', fmt(ozet.toplamTahsilat)],
      ['Toplam Harcama', fmt(ozet.toplamHarcama)],
      ['Toplam Avans', fmt(ozet.toplamAvans)],
      ['Net', fmt(ozet.net)],
    ],
    styles: { fontSize: 11, cellPadding: 5 },
    headStyles: { fillColor: [184, 155, 72], textColor: [255, 255, 255] },
    columnStyles: {
      1: { halign: 'right' },
    },
  });

  footerEkle(doc);
  doc.save(`finans-raporu-${muvekkilAd.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Dava Listesi PDF (UYAP Uyumlu) ──────────────────────────
export async function exportDavaListePDF(
  davalar: Array<Record<string, unknown>>,
  muvAdMap: Record<string, string>,
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape' });
  const startY = headerEkle(doc, 'Dava Listesi', `Toplam: ${davalar.length} dava`);

  autoTable(doc, {
    startY,
    head: [['#', 'Esas No', 'Dava Turu', 'Davaci', 'Davali', 'Mahkeme', 'Asama', 'Durum']],
    body: davalar.map((d, i) => {
      const esas = [(d.esasYil as string), (d.esasNo as string)].filter(Boolean).join('/');
      const il = (d.il as string) || '';
      const mno = (d.mno as string) || '';
      const mtur = (d.mtur as string) || '';
      const mahkeme = [il, mno ? `${mno}.` : '', mtur].filter(Boolean).join(' ');
      const muvAd = muvAdMap[(d.muvId as string) || ''] || '';
      const karsi = (d.karsi as string) || '';
      const taraf = (d.taraf as string) || '';
      const davaci = taraf === 'davaci' || taraf === 'mudahil' ? muvAd : karsi;
      const davali = taraf === 'davaci' || taraf === 'mudahil' ? karsi : muvAd;

      return [
        i + 1,
        esas || '-',
        (d.davaTuru as string) || (d.konu as string) || '-',
        davaci || '-',
        davali || '-',
        mahkeme || '-',
        (d.asama as string) || '-',
        (d.durum as string) || '-',
      ];
    }),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [184, 155, 72], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  footerEkle(doc);
  doc.save(`dava-listesi-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── İcra Listesi PDF (UYAP Uyumlu) ──────────────────────────
export async function exportIcraListePDF(
  icralar: Array<Record<string, unknown>>,
  muvAdMap: Record<string, string>,
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape' });
  const startY = headerEkle(doc, 'Icra Dosya Listesi', `Toplam: ${icralar.length} dosya`);

  const fmtTutar = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

  autoTable(doc, {
    startY,
    head: [['#', 'Esas No', 'Takip Turu', 'Alacakli', 'Borclu', 'Icra Mudurlugu', 'Durum', 'Alacak', 'Tahsil']],
    body: icralar.map((ic, i) => {
      const esasYil = (ic.esasYil as string) || '';
      const esasNo = (ic.esasNo as string) || '';
      const esas = [esasYil, esasNo].filter(Boolean).join('/') || (ic.esas as string) || '';
      const il = (ic.il as string) || '';
      const daire = (ic.daire as string) || '';
      const icraDairesi = [il, daire].filter(Boolean).join(' ');
      const muvAd = muvAdMap[(ic.muvId as string) || ''] || '';
      const muvRol = (ic.muvRol as string) || 'alacakli';
      const borcluAd = (ic.borclu as string) || '';
      const alacakli = muvRol === 'borclu' ? borcluAd : muvAd;
      const borclu = muvRol === 'borclu' ? muvAd : borcluAd;

      return [
        i + 1,
        esas || '-',
        (ic.tur as string) || '-',
        alacakli || '-',
        borclu || '-',
        icraDairesi || '-',
        (ic.durum as string) || '-',
        fmtTutar((ic.alacak as number) || 0),
        fmtTutar((ic.tahsil as number) || 0),
      ];
    }),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [184, 155, 72], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  footerEkle(doc);
  doc.save(`icra-listesi-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Kapak Hesabı PDF ─────────────────────────────────────────
export interface KapakHesabiExport {
  dosyaAdi: string;
  hesapTarihi: string;
  kalemler: Array<{
    aciklama: string;
    vadeTarihi: string;
    asilAlacak: number;
    islemizFaiz: number;
    toplamKalem: number;
  }>;
  toplamAsilAlacak: number;
  toplamIsleyenFaiz: number;
  icraVekaletUcreti: number;
  icraMasraflari: number;
  toplamDosyaDegeri: number;
  tahsilEdilen: number;
  kalanBorc: number;
}

export async function exportKapakHesabiPDF(data: KapakHesabiExport) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const fmtT = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
  const startY = headerEkle(doc, `Kapak Hesabi: ${data.dosyaAdi}`, `Hesap Tarihi: ${data.hesapTarihi}`);

  // Alacak kalemleri tablosu
  autoTable(doc, {
    startY,
    head: [['Kalem', 'Vade', 'Asil Alacak', 'Islemis Faiz', 'Toplam']],
    body: data.kalemler.map((k) => [
      k.aciklama,
      k.vadeTarihi,
      fmtT(k.asilAlacak),
      fmtT(k.islemizFaiz),
      fmtT(k.toplamKalem),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [184, 155, 72], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  });

  // Dosya degeri ozeti
  const ozetY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  autoTable(doc, {
    startY: ozetY,
    head: [['Kalem', 'Tutar']],
    body: [
      ['Toplam Asil Alacak', fmtT(data.toplamAsilAlacak)],
      ['Toplam Islemis Faiz', fmtT(data.toplamIsleyenFaiz)],
      ['Icra Vekalet Ucreti', fmtT(data.icraVekaletUcreti)],
      ['Icra Masraflari', fmtT(data.icraMasraflari)],
      ['TOPLAM DOSYA DEGERI', fmtT(data.toplamDosyaDegeri)],
      ['Tahsil Edilen', fmtT(data.tahsilEdilen)],
      ['KALAN BORC', fmtT(data.kalanBorc)],
    ],
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [184, 155, 72], textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: 'right' } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (hookData: any) => {
      if (hookData.row.index === 4 || hookData.row.index === 6) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = hookData.row.index === 6 ? [180, 30, 30] : [30, 30, 30];
      }
    },
  });

  footerEkle(doc);
  doc.save(`kapak-hesabi-${data.dosyaAdi.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Faiz Hesaplama Detay PDF ─────────────────────────────────
export interface FaizHesapExport {
  faizTuru: string;
  anapara: number;
  baslangic: string;
  bitis: string;
  toplamFaiz: number;
  genelToplam: number;
  toplamGun: number;
  detay: Array<{
    baslangic: string;
    bitis: string;
    gun: number;
    oran: number;
    faiz: number;
  }>;
}

export async function exportFaizHesapPDF(data: FaizHesapExport) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const fmtT = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
  const startY = headerEkle(doc, `Faiz Hesaplama Raporu`, `${data.faizTuru} | ${data.baslangic} - ${data.bitis}`);

  // Ozet bilgiler
  autoTable(doc, {
    startY,
    body: [
      ['Anapara', fmtT(data.anapara)],
      ['Faiz Turu', data.faizTuru],
      ['Baslangic - Bitis', `${data.baslangic}  -  ${data.bitis}`],
      ['Toplam Gun', `${data.toplamGun} gun`],
      ['Toplam Faiz', fmtT(data.toplamFaiz)],
      ['Genel Toplam', fmtT(data.genelToplam)],
    ],
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { halign: 'right' } },
    theme: 'plain',
  });

  // Donemsel detay tablosu
  const detayY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: detayY,
    head: [['Donem Baslangic', 'Donem Bitis', 'Gun', 'Oran (%)', 'Faiz']],
    body: [
      ...data.detay.map((d) => [
        d.baslangic,
        d.bitis,
        d.gun.toString(),
        `%${d.oran}`,
        fmtT(d.faiz),
      ]),
      ['TOPLAM', '', data.toplamGun.toString(), '', fmtT(data.toplamFaiz)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [184, 155, 72], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'right' } },
  });

  footerEkle(doc);
  doc.save(`faiz-hesap-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Avans Kasası Raporu PDF ──────────────────────────────────
export interface AvansKasaExport {
  kasalar: Array<{
    muvAd: string;
    toplamAlim: number;
    toplamMasraf: number;
    toplamIade: number;
    bakiye: number;
  }>;
  toplamBakiye: number;
}

export async function exportAvansKasaPDF(data: AvansKasaExport) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const fmtT = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
  const startY = headerEkle(doc, 'Avans Kasasi Raporu', `Toplam: ${data.kasalar.length} muvekkil`);

  autoTable(doc, {
    startY,
    head: [['Muvekkil', 'Alinan', 'Harcanan', 'Iade', 'Bakiye']],
    body: [
      ...data.kasalar.map((k) => [
        k.muvAd,
        fmtT(k.toplamAlim),
        fmtT(k.toplamMasraf),
        fmtT(k.toplamIade),
        fmtT(k.bakiye),
      ]),
      ['TOPLAM', '', '', '', fmtT(data.toplamBakiye)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [184, 155, 72], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  });

  footerEkle(doc);
  doc.save(`avans-kasasi-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Kar/Zarar Raporu PDF ─────────────────────────────────────
export interface KarZararExport {
  yil: number;
  ay?: string;
  gelir: number;
  gider: number;
  net: number;
  satirlar: Array<{ kalem: string; tutar: number; tur: 'gelir' | 'gider' }>;
}

export async function exportKarZararPDF(data: KarZararExport) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const fmtT = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
  const altBaslik = data.ay ? `${data.ay} ${data.yil}` : `${data.yil} Yili`;
  const startY = headerEkle(doc, 'Kar / Zarar Raporu', altBaslik);

  // Ozet
  autoTable(doc, {
    startY,
    body: [
      ['Toplam Gelir', fmtT(data.gelir)],
      ['Toplam Gider', fmtT(data.gider)],
      ['NET KAR / ZARAR', fmtT(data.net)],
    ],
    styles: { fontSize: 11, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { halign: 'right' } },
    theme: 'plain',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (hookData: any) => {
      if (hookData.row.index === 2) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = data.net >= 0 ? [30, 120, 30] : [180, 30, 30];
      }
    },
  });

  // Detay satirlari
  if (data.satirlar.length > 0) {
    const detayY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY: detayY,
      head: [['Kalem', 'Tur', 'Tutar']],
      body: data.satirlar.map((s) => [s.kalem, s.tur === 'gelir' ? 'Gelir' : 'Gider', fmtT(s.tutar)]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [184, 155, 72], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: { 2: { halign: 'right' } },
    });
  }

  footerEkle(doc);
  doc.save(`kar-zarar-${data.yil}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
