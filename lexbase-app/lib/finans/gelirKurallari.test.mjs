import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gelirTahsilatiMi, muvekkilTahsilatiMi, ucretTahsilatiMi, raporKaydiGorunurMu, hizmetUcretHareketleri, hizmetTahsilatiEkle } from './gelirKurallari.ts';

test('recognized income types remain included', () => {
  for (const tur of ['akdi_vekalet', 'hakediş', 'icra_vekalet']) {
    assert.equal(gelirTahsilatiMi(tur), true);
  }
});

test('transfers, refunds and unknown records do not increase income', () => {
  for (const tur of ['tahsilat', 'borclu_odeme', 'aktarim', 'iade', '', undefined, null, 'unknown']) {
    assert.equal(gelirTahsilatiMi(tur), false);
  }
  const movements = [
    { tur: 'akdi_vekalet', tutar: 1000 },
    { tur: 'tahsilat', tutar: 10000 },
    { tur: 'aktarim', tutar: 5000 },
    { tur: 'iade', tutar: 2000 },
  ];
  assert.equal(movements.filter((m) => gelirTahsilatiMi(m.tur))
    .reduce((sum, m) => sum + m.tutar, 0), 1000);
});

test('client collection, office fee and opposing fee remain distinct', () => {
  assert.equal(muvekkilTahsilatiMi('tahsilat'), true);
  assert.equal(muvekkilTahsilatiMi('borclu_odeme'), true);
  assert.equal(muvekkilTahsilatiMi('akdi_vekalet'), false);
  assert.equal(ucretTahsilatiMi('akdi_vekalet'), true);
  assert.equal(ucretTahsilatiMi('hakediş'), false);
});

test('archiving preserves financial history without keeping deleted records', () => {
  const archived = { _arsivlendi: '2026-10-14' };
  assert.equal(raporKaydiGorunurMu(archived), false);
  assert.equal(raporKaydiGorunurMu(archived, true), true);
  assert.equal(raporKaydiGorunurMu({ ...archived, _silindi: '2026-10-14' }, true), false);
});

test('service transaction list replaces legacy flat total and excludes client money', () => {
  const record = { id: 'service', tahsilEdildi: 5000, tahsilatlar: [
    { id: 'fee', tur: 'akdi_vekalet', tutar: 1000 },
    { id: 'old-fee', tutar: 500 },
    { id: 'client', tur: 'tahsilat', tutar: 10000 },
    { id: 'refund', tur: 'iade', tutar: 200 },
  ] };
  assert.deepEqual(hizmetUcretHareketleri(record).map((t) => t.id), ['fee', 'old-fee']);
  assert.equal(hizmetUcretHareketleri({ id: 'legacy', tahsilEdildi: 500 })[0].tutar, 500);
});

test('client-only transactions do not resurrect the legacy service fee total', () => {
  assert.deepEqual(hizmetUcretHareketleri({ tahsilEdildi: 5000,
    tahsilatlar: [{ tur: 'tahsilat', tutar: 10000 }] }), []);
});

test('first service payment preserves the legacy fee without duplicating it later', () => {
  const legacy = { id: 'legacy', tahsilEdildi: 500, tarih: '2026-10-01' };
  const payment = { id: 'new', tur: 'akdi_vekalet', tutar: 200, tarih: '2026-10-14' };
  const tahsilatlar = hizmetTahsilatiEkle(legacy, payment);
  assert.deepEqual(tahsilatlar.map((t) => t.tutar), [500, 200]);
  assert.equal(tahsilatlar[0].tarih, legacy.tarih);
  assert.equal(hizmetTahsilatiEkle({ ...legacy, tahsilatlar }, payment).length, 3);
  assert.deepEqual(hizmetTahsilatiEkle({ tahsilEdildi: 'invalid' }, payment), [payment]);
});
