/* ══════════════════════════════════════════════════════════════
   Excel Export — Liste ve rapor Excel çıktıları
   (Dynamic import: xlsx sadece tarayıcıda yüklenir)
   ══════════════════════════════════════════════════════════════ */

// ── Müvekkil Listesi Excel ────────────────────────────────────
export async function exportMuvekkilListeXLS(muvekkillar: Array<Record<string, unknown>>) {
  const XLSX = await import('xlsx');

  const data = muvekkillar.map((m, i) => ({
    '#': i + 1,
    'Ad': (m.ad as string) || '',
    'Tip': (m.tip as string) === 'tuzel' ? 'Tüzel' : 'Gerçek',
    'TC': (m.tc as string) || '',
    'VKN': (m.vergiNo as string) || '',
    'Telefon': (m.tel as string) || '',
    'E-posta': (m.mail as string) || '',
    'Meslek': (m.meslek as string) || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Müvekkiller');
  XLSX.writeFile(wb, `muvekkil-listesi-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── Faaliyet Raporu Excel ─────────────────────────────────────
export interface FaaliyetItem {
  tarih: string;
  tur: string;
  aciklama: string;
}

export async function exportFaaliyetRaporuXLS(muvekkilAd: string, faaliyetler: FaaliyetItem[]) {
  const XLSX = await import('xlsx');

  const data = faaliyetler.map((f, i) => ({
    '#': i + 1,
    'Tarih': f.tarih,
    'Tür': f.tur,
    'Açıklama': f.aciklama,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Faaliyet Raporu');
  XLSX.writeFile(wb, `faaliyet-${muvekkilAd.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── Karşı Taraf Listesi Excel ─────────────────────────────────
export async function exportKarsiTarafListeXLS(liste: Array<Record<string, unknown>>) {
  const XLSX = await import('xlsx');

  const data = liste.map((k, i) => ({
    '#': i + 1,
    'Ad': (k.ad as string) || '',
    'Tip': (k.tip as string) === 'tuzel' ? 'Tüzel' : 'Gerçek',
    'TC': (k.tc as string) || '',
    'VKN': (k.vergiNo as string) || '',
    'Telefon': (k.tel as string) || '',
    'E-posta': (k.mail as string) || '',
    'UETS': (k.uets as string) || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Karşı Taraflar');
  XLSX.writeFile(wb, `karsi-taraflar-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── Avukat Listesi Excel ──────────────────────────────────────
export async function exportAvukatListeXLS(liste: Array<Record<string, unknown>>) {
  const XLSX = await import('xlsx');

  const data = liste.map((v, i) => ({
    '#': i + 1,
    'Ad': (v.ad as string) || '',
    'Baro': (v.baro as string) || '',
    'Baro Sicil': (v.baroSicil as string) || '',
    'TBB Sicil': (v.tbbSicil as string) || '',
    'Telefon': (v.tel as string) || '',
    'E-posta': (v.mail as string) || '',
    'UETS': (v.uets as string) || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Avukatlar');
  XLSX.writeFile(wb, `avukatlar-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── Dosya Listesi Excel ───────────────────────────────────────
export async function exportDosyaListeXLS(
  davalar: Array<Record<string, unknown>>,
  icralar: Array<Record<string, unknown>>,
) {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  // Davalar sheet
  const davaData = davalar.map((d, i) => ({
    '#': i + 1,
    'Dosya No': (d.no as string) || '',
    'Konu': (d.konu as string) || '',
    'Mahkeme': (d.mahkeme as string) || '',
    'Esas': [(d.esasYil as string), (d.esasNo as string)].filter(Boolean).join('/'),
    'Durum': (d.durum as string) || '',
    'Aşama': (d.asama as string) || '',
    'Tarih': (d.tarih as string) || '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(davaData), 'Davalar');

  // İcralar sheet
  const icraData = icralar.map((ic, idx) => ({
    '#': idx + 1,
    'Dosya No': (ic.no as string) || '',
    'Borçlu': (ic.borclu as string) || '',
    'Daire': (ic.daire as string) || '',
    'Esas': (ic.esas as string) || '',
    'Durum': (ic.durum as string) || '',
    'Alacak': (ic.alacak as number) || 0,
    'Tahsil': (ic.tahsil as number) || 0,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(icraData), 'İcralar');

  XLSX.writeFile(wb, `dosya-listesi-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── Dava Listesi Excel (UYAP Uyumlu) ────────────────────────
export async function exportDavaListeUYAPXLS(
  davalar: Array<Record<string, unknown>>,
  muvAdMap: Record<string, string>,
) {
  const XLSX = await import('xlsx');

  const data = davalar.map((d, i) => {
    const esasYil = (d.esasYil as string) || '';
    const esasNo = (d.esasNo as string) || '';
    const esas = [esasYil, esasNo].filter(Boolean).join('/');
    const il = (d.il as string) || '';
    const mno = (d.mno as string) || '';
    const mtur = (d.mtur as string) || '';
    const mahkeme = [il, mno ? `${mno}.` : '', mtur, 'Mahkemesi'].filter(Boolean).join(' ');
    const muvAd = muvAdMap[(d.muvId as string) || ''] || '';
    const karsi = (d.karsi as string) || '';
    const taraf = (d.taraf as string) || '';
    const davaci = taraf === 'davaci' || taraf === 'mudahil' ? muvAd : karsi;
    const davali = taraf === 'davaci' || taraf === 'mudahil' ? karsi : muvAd;

    return {
      '#': i + 1,
      'Esas No': esas,
      'Dava Türü': (d.davaTuru as string) || '',
      'Konu': (d.konu as string) || '',
      'Davacı': davaci,
      'Davalı': davali,
      'Mahkeme': mahkeme,
      'Aşama': (d.asama as string) || '',
      'Durum': (d.durum as string) || '',
      'Dava Tarihi': (d.tarih as string) || '',
      'Duruşma Tarihi': (d.durusma as string) || '',
      'Dava Değeri': (d.deger as number) || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Davalar');
  XLSX.writeFile(wb, `dava-listesi-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── İcra Listesi Excel (UYAP Uyumlu) ────────────────────────
export async function exportIcraListeUYAPXLS(
  icralar: Array<Record<string, unknown>>,
  muvAdMap: Record<string, string>,
) {
  const XLSX = await import('xlsx');

  const data = icralar.map((ic, i) => {
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

    return {
      '#': i + 1,
      'Esas No': esas,
      'Takip Türü': (ic.tur as string) || '',
      'Alacaklı': alacakli,
      'Borçlu': borclu,
      'İcra Müdürlüğü': icraDairesi,
      'Durum': (ic.durum as string) || '',
      'Alacak Tutarı': (ic.alacak as number) || 0,
      'Tahsil Edilen': (ic.tahsil as number) || 0,
      'Kalan': ((ic.alacak as number) || 0) - ((ic.tahsil as number) || 0),
      'Takip Tarihi': (ic.tarih as string) || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'İcra Dosyaları');
  XLSX.writeFile(wb, `icra-listesi-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
