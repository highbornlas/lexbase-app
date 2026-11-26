import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dosyaParaOzeti, dosyaMasrafToplami } from '../utils/finans.ts';
import { dosyaUcretOzeti, alacakSatirlari, muvekkilBakiyeleri, dosyaKarlilikHesapla } from './ucretHesaplari.ts';
import { karZararHesapla } from './raporHesaplari.ts';
import { muvekkilFinansOzeti } from './muvekkilOzeti.ts';
import { beklenenUcretHesapla, finansBugunu } from './beklenenHesaplari.ts';
import { hesaplaKasaOzet } from './avansKurallari.ts';
import { gelirListesiOlustur } from './gelirListesi.ts';
import { dashboardFinansHesapla } from './dashboardHesaplari.ts';
import { buroGiderKaydi, giderToplamlari, giderNetTutari, paraTutariGecerliMi } from './giderKurallari.ts';

const muvekkiller = [{ id: 'm1', ad: 'TEST Müvekkil' }];
const tarih = '2026-11-17';
const icra = { id: 'i1', muvId: 'm1', anlasma: { toplam: 3000, ucret: 9000, tur: 'taksit', vadeTarihi: '2026-11-10' },
  tahsilatlar: [{ tur: 'tahsilat', tutar: 10000, tarih }, { tur: 'akdi_vekalet', tutar: 1000, tarih },
    { tur: 'hakediş', tutar: 200, tarih }, { tur: 'icra_vekalet', tutar: 300, tarih },
    { tur: 'aktarim', tutar: 8000, tarih }, { tur: 'iade', tutar: 500, tarih },
    { tur: 'akdi_vekalet', tutar: 999, tarih, _silindi: true }],
  harcamalar: [{ tutar: 1200, tarih, masrafSahibi: 'muvekkil' }, { tutar: 100, tarih, masrafSahibi: 'buro' },
    { tutar: 999, tarih, masrafSahibi: 'buro', _silindi: true }] };
const hizmet = { id: 'd1', muvId: 'm1', ucret: 0, aylikUcret: 500, tahsilEdildi: 200, tarih };
const veriler = { icralar: [icra], danismanliklar: [hizmet] };
const kasa = [{ muvId: 'm1', tip: 'alim', tutar: 1000 }, { muvId: 'm1', tip: 'masraf', tutar: 1200 },
  { muvId: 'm1', tip: 'iade', tutar: 100 }];

test('client principal, contractual receipt and office fees remain separate across all views', () => {
  assert.equal(dosyaParaOzeti(icra).karsiTaraf, 10000);
  assert.equal(dosyaUcretOzeti(icra).tahsilEdilen, 1000);
  assert.equal(dosyaUcretOzeti(icra).buroGelir, 1500);
  const rows = alacakSatirlari(veriler), bakiye = muvekkilBakiyeleri(muvekkiller, veriler)[0];
  const rapor = muvekkilFinansOzeti('m1', veriler, kasa);
  assert.equal(bakiye.anlasilanToplam, 3500);
  assert.equal(bakiye.tahsilEdilenToplam, 1200);
  assert.equal(bakiye.kalanAlacak, 2300);
  assert.equal(rows.reduce((t, r) => t + r.kalan, 0), bakiye.kalanAlacak);
  assert.equal(rapor.alacak.kalan, bakiye.kalanAlacak);
  assert.equal(rapor.buroGelir, 1700);
  assert.equal(bakiye.netBakiye, 1600);
});

test('file profitability and profit-loss exclude client costs, deleted rows and client principal', () => {
  const kar = karZararHesapla(veriler, 2026, 11);
  const karlilik = dosyaKarlilikHesapla(veriler, muvekkiller);
  assert.equal(kar.gelirler.toplam, 1700);
  assert.equal(kar.giderler.dosyaMasraflari, 100);
  assert.equal(kar.muvekkilMasraflari, 1200);
  assert.equal(kar.net, 1600);
  assert.equal(karlilik.ozet.topNet, kar.net);
  assert.equal(karlilik.ozet.topMasraf, 100);
  assert.equal(dosyaMasrafToplami(icra), 1300);
  assert.equal(gelirListesiOlustur(veriler, muvekkiller).reduce((t, d) => t + d.brutTutar, 0), kar.gelirler.toplam);
});

test('income row keys are scoped to source and record, even with repeated movement ids', () => {
  const record = { id: 'reused', tahsilatlar: [{ id: 'movement', tur: 'akdi_vekalet', tutar: 100 }] };
  const gelir = gelirListesiOlustur({ davalar: [record], icralar: [record] });
  assert.equal(gelir.length, 2);
  assert.equal(new Set(gelir.map(g => g.id)).size, 2);
});

test('negative client advance balance is visible and never offset with fees', () => {
  const ozet = muvekkilFinansOzeti('m1', veriler, kasa);
  assert.equal(ozet.bakiye.masrafBakiye, -300);
  assert.equal(ozet.bakiye.masrafAlacagi, 300);
  assert.equal(ozet.bakiye.emanetBakiyesi, 0);
  assert.equal(ozet.bakiye.masrafBakiye, hesaplaKasaOzet(kasa).bakiye);
  assert.equal(ozet.alacak.kalan, 2300);
  const noCash = muvekkilFinansOzeti('m1', veriler, []);
  assert.equal(noCash.bakiye.masrafBakiye, 0, 'legacy file expenses must not be backfilled into cash');
});

test('archive retains history while deletion removes it from every report', () => {
  for (const archived of [false, true]) {
    const data = { icralar: [{ ...icra, _arsivlendi: archived }] };
    assert.equal(muvekkilBakiyeleri(muvekkiller, data)[0].kalanAlacak, 2000);
    assert.equal(karZararHesapla(data).gelirler.toplam, 1500);
  }
  const deleted = { icralar: [{ ...icra, _silindi: true }] };
  assert.equal(alacakSatirlari(deleted).length, 0);
  assert.equal(dosyaKarlilikHesapla(deleted, muvekkiller).ozet.topNet, 0);
  assert.equal(muvekkilFinansOzeti('m1', deleted, []).alacak.kalan, 0);
});

test('legacy flat fees are fallback only, never added to explicit or deleted movements', () => {
  assert.equal(dosyaUcretOzeti({ ucret: 100, tahsilEdildi: 40 }).kalan, 60);
  assert.equal(dosyaUcretOzeti({ ucret: 100, tahsilEdildi: 40, tahsilatlar: [{ tur: 'akdi_vekalet', tutar: 20 }] }).kalan, 80);
  assert.equal(dosyaUcretOzeti({ ucret: 100, tahsilEdildi: 40, tahsilatlar: [{ tur: 'akdi_vekalet', tutar: 20, _silindi: true }] }).kalan, 100);
  assert.equal(dosyaUcretOzeti({ ucret: 100, tahsilEdildi: 40 }, true).kalan, 60);
});

test('expected income uses actual unpaid fees and explicit dates, with matching widget totals', () => {
  const expected = beklenenUcretHesapla(veriler, muvekkiller, tarih);
  assert.equal(expected.ozet.toplam, 2300);
  assert.equal(expected.ozet.buAy, 2000);
  assert.equal(expected.ozet.gecikmisToplam, 2000);
  assert.equal(expected.ozet.vadesizToplam, 300);
  assert.equal(expected.items, expected.beklenenler);
  assert.equal(expected.topTutar, expected.ozet.toplam);
  assert.equal(expected.items.find(d => d.kaynak === 'Danışmanlık').gecikmisMi, false);
});

test('overpayment is preserved as a negative receivable but never forecast as negative income', () => {
  const data = { davalar: [{ id: 'a', muvId: 'm1', ucret: 100, tahsilEdildi: 125 }] };
  assert.equal(alacakSatirlari(data)[0].kalan, -25);
  assert.equal(beklenenUcretHesapla(data, muvekkiller, tarih).topTutar, 0);
});

test('Istanbul financial day is stable across UTC midnight and year boundaries', () => {
  assert.equal(finansBugunu(new Date('2026-12-31T22:00:00Z')), '2027-01-01');
  assert.equal(finansBugunu(new Date('2026-11-16T22:30:00Z')), tarih);
});

test('expense save recalculates stale derived amounts and keeps the same ID for retry/edit', () => {
  const form = { id: 'stable', kategori: ' Kira ', tutar: 1000, tarih, kdvOrani: 20, stopajOrani: 10, netTutar: 1 };
  const kayit = buroGiderKaydi(form);
  assert.equal(kayit.id, 'stable'); assert.equal(kayit.kategori, 'Kira');
  assert.equal(kayit.kdvTutar, 200); assert.equal(kayit.stopajTutar, 100); assert.equal(kayit.netTutar, 1100);
  assert.equal(form.netTutar, 1);
  assert.equal(buroGiderKaydi(form).id, kayit.id);
});

test('expense validation rejects nonfinite, fractional cents, invalid date and rates', () => {
  const base = { id: 'a', kategori: 'Kira', tutar: 10, tarih };
  for (const tutar of [NaN, Infinity, -1, 0, 0.001, '', null, true, 1e12]) {
    assert.equal(paraTutariGecerliMi(tutar), false);
    assert.throws(() => buroGiderKaydi({ ...base, tutar }));
  }
  for (const tarih of ['2026-02-30', '', 'bad']) assert.throws(() => buroGiderKaydi({ ...base, tarih }));
  for (const stopajOrani of [-1, Infinity, 101]) assert.throws(() => buroGiderKaydi({ ...base, stopajOrani }));
});

test('expense totals preserve explicit zero net and separate unpaid from paid cash', () => {
  const giderler = [{ tutar: 100, netTutar: 0 }, { tutar: 100, netTutar: 120, odemeDurumu: 'bekliyor' },
    { tutar: '50', odemeDurumu: 'odendi' }, { tutar: 999, _silindi: true }];
  assert.equal(giderNetTutari(giderler[0]), 0);
  assert.deepEqual(giderToplamlari(giderler), { tutar: 250, kdv: 0, stopaj: 0, net: 170, odenen: 50, bekleyen: 120 });
});

test('rounding is consistent for fractional amounts and client isolation', () => {
  const data = { davalar: [{ id: 'a', muvId: 'm1', ucret: 0.3, tahsilEdildi: 0.1 },
    { id: 'b', muvId: 'other', ucret: 10000, tahsilEdildi: 9999 }] };
  assert.equal(muvekkilFinansOzeti('m1', data, []).alacak.kalan, 0.2);
  assert.equal(muvekkilBakiyeleri(muvekkiller, data)[0].kalanAlacak, 0.2);
});

test('dashboard, income rows and monthly profit-loss agree without client principal or expenses', () => {
  const dashboard = dashboardFinansHesapla(veriler, tarih);
  assert.equal(dashboard.buAyTahsilat, 1700);
  assert.equal(dashboard.yilNet, 1600);
  assert.equal(dashboard.ucretAlacagi, 2300);
  assert.equal(dashboard.aylikVeri.gelirler[10], 1700);
  assert.equal(dashboard.aylikVeri.giderler[10], 100);
  assert.equal(dashboard.kaynakDagilim.reduce((t, [, n]) => t + n, 0), 1700);
});

test('dashboard annual net is not accidentally limited to the current month', () => {
  const data = { davalar: [{ id: 'old', ucret: 100, tahsilatlar: [{ tur: 'akdi_vekalet', tutar: 100, tarih: '2026-01-02' }] }] };
  const dashboard = dashboardFinansHesapla(data, tarih);
  assert.equal(dashboard.buAyTahsilat, 0);
  assert.equal(dashboard.yilNet, 100);
});
