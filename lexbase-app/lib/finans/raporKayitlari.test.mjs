import { test } from 'node:test';
import assert from 'node:assert/strict';
import { raporKayitlariniOku } from '../data/raporKayitlari.ts';

function mock(pages) {
  const calls = [];
  return { calls, client: { from(table) {
    const call = { table, filters: [] }; calls.push(call);
    const q = { select() { return q; }, eq(k,v) { call.filters.push([k,v]); return q; },
      or(value) { call.or=value; return q; },
      gt(k,v) { call.cursor = [k,v]; return q; }, order(k, o) { call.order = [k,o]; return q; },
      limit(n) { call.limit=n; return q; }, then(resolve,reject) { return Promise.resolve(pages.shift()).then(resolve,reject); } };
    return q;
  } } };
}

test('reports read beyond short server caps until an empty page, keeping bureau and client scope', async () => {
  const rows = Array.from({ length: 1201 }, (_, i) => ({ id: String(i).padStart(5,'0'), data: {} }));
  const { client, calls } = mock([{ data: rows.slice(0,400) }, { data: rows.slice(400,800) }, { data: rows.slice(800) }, { data: [] }]);
  const result = await raporKayitlariniOku(client, 'davalar', 'bureau', 'client');
  assert.equal(result.length, 1201);
  for (const call of calls) assert.deepEqual(call.filters, [['buro_id','bureau'], ['data->>muvId','client']]);
  assert.deepEqual(calls[1].cursor, ['id', rows[399].id]);
  assert.equal(calls.length, 4);
});

test('a later page error or malformed response never returns a partial report', async () => {
  for (const last of [{ data: null, error: new Error('denied') }, { data: null }]) {
    const { client } = mock([{ data: [{ id:'1', data:{} }] }, last]);
    await assert.rejects(raporKayitlariniOku(client,'davalar','bureau'));
  }
});

test('nonadvancing or unordered cursors fail closed rather than loop or double count', async () => {
  const { client } = mock([{ data: [{ id:'2', data:{} }, { id:'1', data:{} }] }]);
  await assert.rejects(raporKayitlariniOku(client,'davalar','bureau'));
});

test('missing bureau or unsupported table stops before any request', async () => {
  const { client, calls } = mock([]);
  await assert.rejects(raporKayitlariniOku(client,'davalar',''));
  await assert.rejects(raporKayitlariniOku(client,'auth.users','bureau'));
  assert.equal(calls.length, 0);
});

test('related-party client reads retain bureau scoping without changing financial ownership', async () => {
  const { client, calls } = mock([{ data: [] }]);
  await raporKayitlariniOku(client, 'davalar', 'bureau', 'client-id', true);
  assert.deepEqual(calls[0].filters, [['buro_id','bureau']]);
  assert.match(calls[0].or, /data->>muvId.eq.client-id/);
  assert.match(calls[0].or, /muvekkilTaraflar/);
});
