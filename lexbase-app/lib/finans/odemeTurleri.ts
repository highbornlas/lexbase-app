export const DAVA_ODEME_TURLERI = [
  { value: 'akdi_vekalet', label: 'Akdi Vekalet Ücreti' },
  { value: 'hakediş', label: 'Karşı Vekalet Hakedişi' },
  { value: 'tahsilat', label: 'Müvekkil Adına Tahsilat' },
  { value: 'aktarim', label: 'Müvekkile Aktarım' },
  { value: 'iade', label: 'İade' },
];

export const ICRA_ODEME_TURLERI = [
  { value: 'borclu_odeme', label: 'Borçlu Ödemesi' },
  { value: 'akdi_vekalet', label: 'Akdi Vekalet Ücreti' },
  { value: 'hakediş', label: 'Yüzdelik Pay (Hakediş)' },
  { value: 'icra_vekalet', label: 'İcra Vekalet Ücreti' },
  { value: 'aktarim', label: 'Müvekkile Aktarım' },
  { value: 'iade', label: 'İade' },
];

export function odemeFormTuru(tur: string, icraDosyasi: boolean): string {
  return icraDosyasi && tur === 'tahsilat' ? 'borclu_odeme' : tur;
}

// The live enforcement writer stores debtor payments as the legacy "tahsilat".
export function odemeKayitTuru(tur: string, icraDosyasi: boolean): string {
  return icraDosyasi && tur === 'borclu_odeme' ? 'tahsilat' : tur;
}
