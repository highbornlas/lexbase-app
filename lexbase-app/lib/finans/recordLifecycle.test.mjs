import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordLifecycle } from '../data/recordLifecycle.ts';
import { readTrashRecords, TRASH_TABLES } from '../data/readTrashRecords.ts';
import { runRecordBatch } from '../data/runRecordBatch.ts';

test('lifecycle sends one scoped RPC and never sends an old financial snapshot', async () => {
  const calls = [];
  const client = { rpc: async (name,args) => { calls.push({name,args}); return { data: {id:'case',islem:'geri_yukle'},error:null }; } };
  await recordLifecycle(client,'davalar','case','office','geri_yukle');
  assert.deepEqual(calls,[{name:'kayit_durum_islemi',args:{p_buro_id:'office',p_tablo:'davalar',p_id:'case',p_islem:'geri_yukle'}}]);
});

test('missing identity, denied writes and unconfirmed responses cannot report lifecycle success', async () => {
  const client = {rpc:async()=>({data:null,error:{code:'23514'}})};
  await assert.rejects(recordLifecycle(client,'davalar','case',null,'kalici_sil'));
  await assert.rejects(recordLifecycle(client,'davalar','case','office','kalici_sil'),{code:'23514'});
  await assert.rejects(recordLifecycle({rpc:async()=>({data:{id:'wrong',islem:'sil'},error:null})},'davalar','case','office','sil'));
});

function trashFixture(fail = false) {
  const calls = [];
  return { calls, client: { from(table) {
    const filters = [];
    const q = { select(){return q;},eq(...args){filters.push(args);return q;},not(...args){filters.push(args);return q;},
      order(){return q;}, async range(start,end) {
        calls.push({table,filters,start,end});
        if (fail && table==='icra') return {data:null,error:new Error('read denied')};
        const count = table==='davalar' && start===0 ? 250 : table==='davalar' ? 1 : 0;
        return {data:Array.from({length:count},(_,i)=>({id:String(start+i),data:{_silindi:'2020-01-01'}})),error:null};
      } };
    return q;
  } } };
}

test('trash reads all pages, filters by office, and never deletes expired records', async () => {
  const fixture = trashFixture();
  const rows = await readTrashRecords(fixture.client,'office');
  assert.equal(rows.length,251);
  assert.equal(fixture.calls.length,TRASH_TABLES.length+1);
  for (const call of fixture.calls) assert.deepEqual(call.filters,[['buro_id','office'],['data->>_silindi','is',null]]);
  assert.equal(rows[250].id,'250');
});

test('partial trash-query failures are not shown as an empty trash bin', async () => {
  await assert.rejects(readTrashRecords(trashFixture(true).client,'office'),/read denied/);
});

test('bulk actions wait for results and retain failed records instead of reporting blanket success', async () => {
  const calls = [];
  const result = await runRecordBatch(['first','protected','last'],async record => {
    calls.push(record);
    if (record==='protected') throw {code:'23514'};
  });
  assert.deepEqual(calls,['first','protected','last']);
  assert.deepEqual(result.succeeded,['first','last']);
  assert.deepEqual(result.failed,[{record:'protected',error:{code:'23514'}}]);
});

test('an empty batch performs no writes', async () => {
  assert.deepEqual(await runRecordBatch([],async()=>{throw new Error('unexpected write');}),{succeeded:[],failed:[]});
});
