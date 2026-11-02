import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DAVA_ODEME_TURLERI, ICRA_ODEME_TURLERI, odemeFormTuru, odemeKayitTuru } from './odemeTurleri.ts';

test('enforcement preserves the live debtor, percentage and statutory fee options', () => {
  assert.deepEqual(ICRA_ODEME_TURLERI.map(t => t.value),
    ['borclu_odeme', 'akdi_vekalet', 'hakediş', 'icra_vekalet', 'aktarim', 'iade']);
  assert.equal(DAVA_ODEME_TURLERI.some(t => t.value === 'icra_vekalet'), false);
});

test('debtor payment editing and saving retain the live storage convention', () => {
  assert.equal(odemeFormTuru('tahsilat', true), 'borclu_odeme');
  assert.equal(odemeKayitTuru(odemeFormTuru('tahsilat', true), true), 'tahsilat');
  assert.equal(odemeFormTuru('tahsilat', false), 'tahsilat');
  for (const tur of ['akdi_vekalet', 'icra_vekalet', 'hakediş', 'aktarim', 'iade', 'unknown']) {
    assert.equal(odemeKayitTuru(odemeFormTuru(tur, true), true), tur);
  }
});
