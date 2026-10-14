// Client-owned collections only become office income through a separate fee entry.
export function gelirTahsilatiMi(tur: unknown): boolean {
  return tur === 'akdi_vekalet' || tur === 'hakediş' || tur === 'icra_vekalet';
}

export function ucretTahsilatiMi(tur: unknown): boolean {
  return tur === 'akdi_vekalet';
}

export function muvekkilTahsilatiMi(tur: unknown): boolean {
  return tur === 'tahsilat' || tur === 'borclu_odeme';
}

export function raporKaydiGorunurMu(kayit: { _silindi?: unknown; _arsivlendi?: unknown }, includeArchived = false): boolean {
  return !kayit._silindi && (includeArchived || !kayit._arsivlendi);
}

// Service-specific legacy collections represent fees; do not also add the flat total.
export function hizmetUcretHareketleri(kayit: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(kayit.tahsilatlar) && kayit.tahsilatlar.length > 0) {
    return kayit.tahsilatlar.filter((t): t is Record<string, unknown> =>
      !!t && typeof t === 'object' && !Array.isArray(t)
      && (!t.tur || gelirTahsilatiMi(t.tur)));
  }
  return [{
    id: `${kayit.id}-gelir`,
    tutar: kayit.tahsilEdildi,
    tarih: kayit.sonucTarih || kayit.tarih || kayit.basvuruTarih || '',
    kdvOrani: kayit.kdvOrani,
    stopajOrani: kayit.stopajOrani,
    makbuzKesildi: kayit.makbuzKesildi,
    makbuzNo: kayit.makbuzNo,
    makbuzTarih: kayit.makbuzTarih,
  }];
}

// Preserve legacy service fees when the first explicit transaction is added.
export function hizmetTahsilatiEkle(kayit: Record<string, unknown>, hareket: Record<string, unknown>): Record<string, unknown>[] {
  const mevcut = Array.isArray(kayit.tahsilatlar) ? kayit.tahsilatlar : [];
  const eskiTutar = Number(kayit.tahsilEdildi);
  const onceki = mevcut.length > 0 ? mevcut
    : Number.isFinite(eskiTutar) && eskiTutar > 0 ? hizmetUcretHareketleri(kayit) : [];
  return [...onceki, hareket];
}

export function raporGelirHareketleri(kayit: Record<string, unknown>, hizmet = false): Record<string, unknown>[] {
  if (hizmet) return hizmetUcretHareketleri(kayit);
  if (Array.isArray(kayit.tahsilatlar) && kayit.tahsilatlar.length > 0) {
    return kayit.tahsilatlar.filter((t): t is Record<string, unknown> =>
      !!t && typeof t === 'object' && !Array.isArray(t) && gelirTahsilatiMi(t.tur));
  }
  return [{ id: `${kayit.id}-legacy-fee`, tur: 'akdi_vekalet', tutar: kayit.tahsilEdildi,
    tarih: kayit.tahsilTarih || kayit.tahsilatTarihi || '' }];
}
