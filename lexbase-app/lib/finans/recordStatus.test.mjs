import assert from 'node:assert/strict';
import { test } from 'node:test';
import { updateRecordStatus } from '../data/updateJsonRecord.ts';

function clientFixture(read, write = { data: { id: 'record' }, error: null }) {
  const calls = [];
  return {
    calls,
    client: {
      from(table) {
        const call = { table, filters: [], value: null };
        calls.push(call);
        const builder = {
          select() { return builder; },
          eq(key, value) { call.filters.push([key, value]); return builder; },
          update(value) { call.value = value; return builder; },
          async single() { return call.value ? write : read; },
        };
        return builder;
      },
    },
  };
}

test('read failures never overwrite an existing record or insert an empty one', async () => {
  const fixture = clientFixture({ data: null, error: new Error('read denied') });
  await assert.rejects(updateRecordStatus(fixture.client, 'danismanlik', 'record', 'bureau', '_silindi'), /read denied/);
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0].value, null);
});

test('status changes retain financial data and scope both queries to the bureau', async () => {
  const data = { ucret: 1000, tahsilEdildi: 500, not: 'keep' };
  const fixture = clientFixture({ data: { data }, error: null });
  await updateRecordStatus(fixture.client, 'arabuluculuk', 'record', 'bureau', '_arsivlendi');
  for (const call of fixture.calls) {
    assert.deepEqual(call.filters, [['id', 'record'], ['buro_id', 'bureau']]);
  }
  assert.equal(fixture.calls[1].value.data.ucret, 1000);
  assert.equal(fixture.calls[1].value.data.tahsilEdildi, 500);
  assert.equal(fixture.calls[1].value.data.not, 'keep');
  assert.ok(fixture.calls[1].value.data._arsivlendi);
  assert.deepEqual(data, { ucret: 1000, tahsilEdildi: 500, not: 'keep' });
});

test('missing records and rejected writes cannot report success', async () => {
  const missing = clientFixture({ data: null, error: null });
  await assert.rejects(updateRecordStatus(missing.client, 'danismanlik', 'record', 'bureau', '_silindi'), /bulunamadi/);
  const denied = clientFixture({ data: { data: {} }, error: null }, { data: null, error: new Error('write denied') });
  await assert.rejects(updateRecordStatus(denied.client, 'danismanlik', 'record', 'bureau', '_silindi'), /write denied/);
});
