const noop = () => {};
const empty = { id: 'fixture-icra', muvId: 'fixture-client' };
const populated = {
  ...empty, il: 'Ankara', daire: '1', esasYil: '2026', esasNo: '900002',
  tur: 'Genel Haciz Yoluyla Takip', durum: 'Takipte', muvRol: 'alacakli',
  alacak: 10000, tarih: '2026-10-01', tebligTarihi: '2026-10-31',
  borclu: 'Sentetik Karşı Taraf', not: 'Sentetik dosya notu',
  alacakKalemleri: { asilAlacak: 10000, islemisiFaiz: 200, vekaletUcreti: 500 },
  hacizler: [{ id: 'h1', tarih: '2026-10-20', tur: 'banka', aciklama: 'Sentetik haciz', kurum: 'Test Kurumu', tutar: 1000, durum: 'uygulandi' }],
  odemePlani: { aktif: true, toplamTutar: 1000, taksitSayisi: 2, baslangicTarihi: '2026-10-01', taksitler: [
    { id: 'p1', no: 1, vadeTarihi: '2026-10-01', tutar: 500, odpiYapildiMi: true, odemeTarihi: '2026-10-02' },
    { id: 'p2', no: 2, vadeTarihi: '2026-11-01', tutar: 500, odpiYapildiMi: false },
  ] },
  borcluDetay: { adres: 'Sentetik adres', bankaHesaplari: ['Test Bankası'], aracPlakalari: ['TEST'], tasinmazlar: ['Test taşınmaz'] },
  tebligatlar: [{ id: 't1', tur: 'Ödeme Emri', alici: 'Sentetik kişi', tarih: '2026-10-28', pttBarkod: 'TEST0001', tebligDurum: 'Tebliğ Edildi', tebligTarih: '2026-10-31' }],
};

export function icraDetailCases() {
  const cases = [];
  const hesap = { masraf: 1500, tahsilat: 2000, tahsilOran: 20, kalan: 8000, evrakSayisi: 0, net: 600 };
  for (const [label, icra] of [['empty', empty], ['populated', populated], ['debtor', { ...populated, muvRol: 'borclu' }]]) {
    cases.push({ name: `overview-${label}`, component: 'OzetTab', props: {
      icra, muvAd: 'Sentetik Müvekkil', daireAdi: 'Test İcra Dairesi', esasNo: '2026/900002',
      taraflar: { alacakli: 'Sentetik Müvekkil', borclu: 'Sentetik Karşı Taraf' }, hesap,
      itirazBilgi: label === 'empty' ? null : { kalanGun: 2, sonTarih: '2026-11-04', gecmis: false, acil: true },
      iliskiliDava: label === 'empty' ? null : { id: 'fixture-case', esasYil: '2026', esasNo: '900001' },
      onDuzenle: noop, onUpdate: noop,
    } });
  }
  for (const [label, icra] of [['empty', empty], ['populated', populated]]) {
    for (const component of ['TebligatlarTab', 'HacizTakibiSection', 'OdemePlaniSection', 'BorcluBilgileriSection']) {
      cases.push({ name: `${component}-${label}`, component, props: { icra, onUpdate: noop } });
    }
  }
  for (const populated of [false, true]) {
    cases.push({ name: `deadlines-${populated}`, component: 'SurelerTab', props: { sureler: populated ? [{ id: 's1', tip: 'Sentetik süre', baslangic: '2026-11-01', gun: 7 }] : [], onEkle: noop, onSil: noop } });
    cases.push({ name: `receipts-${populated}`, component: 'TahsilatTab', props: { tahsilatlar: populated ? ['tahsilat', 'akdi_vekalet', 'hakediş', 'icra_vekalet', 'aktarim', 'iade'].map((tur, i) => ({ id: `r${i}`, tur, tutar: 100 + i, tarih: '2026-10-31', acik: 'Sentetik tahsilat' })) : [], onEkle: noop, onDuzenle: noop, onSil: noop } });
    cases.push({ name: `notes-${populated}`, component: 'NotlarTab', props: { notlar: populated ? [{ id: 'n1', tarih: '2026-10-31', icerik: 'Sentetik not' }] : [], notText: populated ? 'Eski not' : '', onEkle: noop, onSil: noop } });
    cases.push({ name: `agreement-${populated}`, component: 'AnlasmaTab', props: { anlasma: populated ? { tur: 'taksit', toplam: 3000, taksitSayisi: 3, taksitOdenen: 1, aciklama: 'Sentetik anlaşma' } : undefined, onKaydet: noop } });
  }
  return cases;
}

export function icraClaimFormCases() {
  return [false, true].map(populated => ({
    name: `claim-form-${populated}`, component: 'AlacakKalemleriAdim', props: {
      alacakDetay: populated ? [{ id: 'claim', kalemTuru: 'asil_alacak', aciklama: 'Sentetik alacak', asilTutar: 1000, paraBirimi: 'TRY', vadeTarihi: '2026-09-01', faizTuru: 'yok' }] : [],
      takipTarihi: '2026-10-01', onChange: noop, onLegacyChange: noop,
    },
  }));
}
