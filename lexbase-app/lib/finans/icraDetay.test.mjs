import test from 'node:test';
import assert from 'node:assert/strict';
import { icraDetayHesabi, icraIliskiliKayit, icraMuvekkilAdi } from './icraDetay.ts';

test('icra overview keeps client principal, office fees and expense ownership separate', () => {
  const result = icraDetayHesabi({ alacak: 10000, evraklar: [{ id: 'document' }],
    tahsilatlar: [{ id: 'p', tur: 'tahsilat', tutar: 2000 }, { id: 'f', tur: 'akdi_vekalet', tutar: 750 }],
    harcamalar: [{ id: 'c', tutar: 1500, masrafSahibi: 'muvekkil' }, { id: 'o', tutar: 100, masrafSahibi: 'buro' }],
  });
  assert.deepEqual(result, { masraf: 1600, tahsilat: 2000, tahsilOran: 20, kalan: 8000, evrakSayisi: 1, net: 650 });
});
test('icra overview preserves legacy flat collections and caps progress without hiding overpayment', () => {
  const result = icraDetayHesabi({ alacak: 100, tahsil: 150, tahsilEdildi: 30 });
  assert.equal(result.tahsilat, 150);
  assert.equal(result.tahsilOran, 100);
  assert.equal(result.kalan, -50);
  assert.equal(result.net, 30);
});
test('missing or empty icra has a stable zero overview', () => {
  assert.deepEqual(icraDetayHesabi(), { masraf: 0, tahsilat: 0, tahsilOran: 0, kalan: 0, evrakSayisi: 0, net: 0 });
  assert.deepEqual(icraDetayHesabi({}), icraDetayHesabi());
});
test('targeted relation reads preserve the old active-list visibility and client name', () => {
  assert.equal(icraMuvekkilAdi({ ad: 'Sentetik', soyad: 'Müvekkil' }), 'Sentetik Müvekkil');
  assert.equal(icraMuvekkilAdi(null), '—');
  assert.equal(icraMuvekkilAdi({ ad: 'Archived', _arsivlendi: '2026-01-01' }), '—');
  assert.equal(icraIliskiliKayit({ _silindi: '2026-01-01' }), null);
  const record = { id: 'case', _silindi: false };
  assert.equal(icraIliskiliKayit(record), record);
});
