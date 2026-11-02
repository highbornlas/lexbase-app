import assert from 'node:assert/strict';
import { test } from 'node:test';
import { muvekkileGoreGrupla } from './dosyaGruplari.ts';

test('grouping preserves client isolation, order and source records', () => {
  const records = [
    { id: '1', muvId: 'a', tutar: 100 },
    { id: '2', muvId: 'b', tutar: 200 },
    { id: '3', muvId: 'a', tutar: 300 },
    { id: '4', tutar: 400 },
  ];
  const snapshot = structuredClone(records);
  const groups = muvekkileGoreGrupla(records);
  assert.deepEqual(groups.get('a'), [records[0], records[2]]);
  assert.deepEqual(groups.get('b'), [records[1]]);
  assert.equal(groups.size, 2);
  assert.deepEqual(records, snapshot);
  assert.equal(muvekkileGoreGrupla([]).size, 0);
});
