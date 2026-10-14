import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gelirTahsilatiMi } from './gelirKurallari.ts';

test('recognized income types remain included', () => {
  for (const tur of ['akdi_vekalet', 'hakediş', 'tahsilat']) {
    assert.equal(gelirTahsilatiMi(tur), true);
  }
});

test('transfers, refunds and unknown records do not increase income', () => {
  for (const tur of ['aktarim', 'iade', '', undefined, null, 'unknown']) {
    assert.equal(gelirTahsilatiMi(tur), false);
  }
  const movements = [
    { tur: 'akdi_vekalet', tutar: 1000 },
    { tur: 'aktarim', tutar: 5000 },
    { tur: 'iade', tutar: 2000 },
  ];
  assert.equal(movements.filter((m) => gelirTahsilatiMi(m.tur))
    .reduce((sum, m) => sum + m.tutar, 0), 1000);
});
