import test from 'node:test';
import assert from 'node:assert/strict';
import {clientFormSeed} from '../lib/data/clientFormSeed.ts';

test('client detail seeds matching legacy and multi-party client identities',()=>{
  assert.deepEqual(clientFormSeed({id:'fixture',ad:'CODEX TEST',soyad:'Finans'}),{
    muvId:'fixture',muvekkilTaraflar:[{id:'fixture',ad:'CODEX TEST Finans'}],
  });
});

test('company name has no undefined surname and generic creation stays blank',()=>{
  assert.equal(clientFormSeed({id:'company',ad:'TEST LTD'}).muvekkilTaraflar[0].ad,'TEST LTD');
  assert.deepEqual(clientFormSeed(),{});
  assert.deepEqual(clientFormSeed({id:'',ad:'Missing identity'}),{});
});
