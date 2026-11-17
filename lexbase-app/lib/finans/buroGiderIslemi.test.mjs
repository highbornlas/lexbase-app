import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buroGiderIslemi } from '../data/buroGiderIslemi.ts';

const gider = { id: 'same-id', kategori: 'Kira', tutar: 100, tarih: '2026-11-17', kdvOrani: 20 };
function clientMock(responses) {
  const calls = [];
  const client = { from(table) {
    const call = { table, filters: [] }; calls.push(call);
    const query = { select(columns) { call.columns = columns; return query; },
      eq(column, value) { call.filters.push([column, value]); return query; },
      async single() { const next = responses.shift(); if (next instanceof Error) throw next; return next; } };
    return { select(columns) { call.op = 'read'; return query.select(columns); },
      upsert(row) { call.op = 'upsert'; call.row = row; return query; },
      update(row) { call.op = 'update'; call.row = row; return query; } };
  } };
  return { client, calls };
}

test('expense save confirms an exact row and uses the stable id on retry', async () => {
  const { client, calls } = clientMock([{ data: null, error: { code: '42501' } }, { data: { id: gider.id }, error: null }]);
  await assert.rejects(buroGiderIslemi(client, 'bureau', gider));
  assert.equal(await buroGiderIslemi(client, 'bureau', gider), gider.id);
  assert.equal(calls.length, 2);
  for (const c of calls) {
    assert.equal(c.row.id, gider.id); assert.equal(c.row.buro_id, 'bureau'); assert.equal(c.row.data.netTutar, 120);
    assert.equal(c.columns, 'id');
  }
});

test('unconfirmed writes, zero rows and wrong ids cannot report expense success', async () => {
  for (const response of [{ data: null, error: null }, { data: { id: 'wrong' }, error: null }, new Error('network')]) {
    const { client } = clientMock([response]);
    await assert.rejects(buroGiderIslemi(client, 'bureau', gider));
  }
});

test('expense validation and missing bureau stop before database access', async () => {
  const { client, calls } = clientMock([]);
  await assert.rejects(buroGiderIslemi(client, null, gider));
  await assert.rejects(buroGiderIslemi(client, 'bureau', { ...gider, tutar: 0.001 }));
  assert.equal(calls.length, 0);
});

test('failed or empty read cannot create a deleted stub through upsert', async () => {
  for (const response of [{ data: null, error: { code: 'fail' } }, { data: null, error: null }]) {
    const { client, calls } = clientMock([response]);
    await assert.rejects(buroGiderIslemi(client, 'bureau', gider, true));
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].filters, [['id', gider.id], ['buro_id', 'bureau']]);
  }
});

test('soft delete preserves server fields and guards bureau, id and concurrent changes', async () => {
  const data = { ...gider, notlar: 'latest server notes' };
  const { client, calls } = clientMock([{ data: { id: gider.id, data }, error: null }, { data: { id: gider.id }, error: null }]);
  await buroGiderIslemi(client, 'bureau', gider, true);
  assert.equal(calls[1].op, 'update');
  assert.equal(calls[1].row.data.notlar, data.notlar);
  assert.ok(calls[1].row.data._silindi);
  assert.deepEqual(calls[1].filters, [['id', gider.id], ['buro_id', 'bureau'], ['data', JSON.stringify(data)]]);
});

test('concurrent edit or rejected delete is explicit rather than reported as success', async () => {
  const { client } = clientMock([{ data: { id: gider.id, data: gider }, error: null }, { data: null, error: { code: 'PGRST116' } }]);
  await assert.rejects(buroGiderIslemi(client, 'bureau', gider, true));
});

test('expense editing uses an expected snapshot and cannot silently overwrite another session', async () => {
  const { client, calls } = clientMock([{ data: null, error: { code: 'PGRST116' } }, { data: null, error: null }]);
  await assert.rejects(buroGiderIslemi(client, 'bureau', { ...gider, tutar: 200 }, false, gider), /Gider değişmiş/);
  assert.equal(calls[0].op, 'update');
  assert.deepEqual(calls[0].filters.slice(0, 2), [['id', gider.id], ['buro_id', 'bureau']]);
  assert.equal(calls[0].filters[2][0], 'data');
  assert.equal(calls[1].op, 'read');
  assert.equal(calls.some(c => c.op === 'upsert'), false);
});

test('expense edit retry can confirm an identical prior save without overwriting newer data', async () => {
  const { client, calls } = clientMock([{ data: null, error: { code: 'PGRST116' } }, { data: { id: gider.id }, error: null }]);
  assert.equal(await buroGiderIslemi(client, 'bureau', { ...gider, tutar: 200 }, false, gider), gider.id);
  assert.equal(JSON.parse(calls[1].filters[2][1]).tutar, 200);
});
