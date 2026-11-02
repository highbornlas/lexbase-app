import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authorizeInvite,authorizeReactivation} from '../../supabase/functions/invite-user/authorization.ts';

const office='10000000-0000-0000-0000-000000000001';
const other='10000000-0000-0000-0000-000000000002';
function fixture(rows,error=null){
  const calls=[];
  const query={select(...args){calls.push(['select',...args]);return query;},eq(...args){calls.push(['eq',...args]);return query;},
    in(...args){calls.push(['in',...args]);return query;},limit(count){calls.push(['limit',count]);return Promise.resolve({data:rows,error});}};
  return {calls,client:{from(table){assert.equal(table,'uyelikler');calls.push(['from',table]);return query;}}};
}

test('invite requires active membership in explicitly selected bureau, not editable profile',async()=>{
  const f=fixture([{buro_id:office,rol:'sahip'}]);
  assert.deepEqual(await authorizeInvite(f.client,'actor',office,'avukat'),{buroId:office,callerRole:'sahip',role:'avukat'});
  assert.deepEqual(f.calls,[['from','uyelikler'],['select','buro_id, rol'],['eq','auth_id','actor'],['eq','durum','aktif'],
    ['in','rol',['sahip','yonetici']],['eq','buro_id',office],['limit',2]]);
});
test('older single-bureau clients work but ambiguous legacy requests fail closed',async()=>{
  await authorizeInvite(fixture([{buro_id:office,rol:'sahip'}]).client,'actor',undefined,undefined);
  await assert.rejects(authorizeInvite(fixture([{buro_id:office,rol:'sahip'},{buro_id:other,rol:'yonetici'}]).client,'actor',undefined,'avukat'),{status:400});
});
test('missing/revoked membership and membership query errors cannot fall back to profile role',async()=>{
  await assert.rejects(authorizeInvite(fixture([]).client,'actor',office,'avukat'),{status:403});
  await assert.rejects(authorizeInvite(fixture(null,{message:'backend failure'}).client,'actor',office,'avukat'),{status:503});
  await assert.rejects(authorizeInvite(fixture([{buro_id:other,rol:'sahip'}]).client,'actor',office,'avukat'),{status:403});
});
test('manager cannot assign owner/manager roles; owner can explicitly assign supported roles',async()=>{
  for(const role of ['sahip','yonetici']){
    await assert.rejects(authorizeInvite(fixture([{buro_id:office,rol:'yonetici'}]).client,'actor',office,role),{status:403});
    await authorizeInvite(fixture([{buro_id:office,rol:'sahip'}]).client,'actor',office,role);
  }
  await authorizeInvite(fixture([{buro_id:office,rol:'yonetici'}]).client,'actor',office,'stajyer');
});
test('invalid roles, bureau ids and missing actor are denied before membership lookup',async()=>{
  const f=fixture([]);
  await assert.rejects(authorizeInvite(f.client,'actor',office,'super'),{status:400});
  await assert.rejects(authorizeInvite(f.client,'actor',{},'avukat'),{status:400});
  await assert.rejects(authorizeInvite(f.client,'actor',null,'avukat'),{status:400});
  await assert.rejects(authorizeInvite(f.client,'',office,'avukat'),{status:401});
  assert.equal(f.calls.length,0);
});

test('reactivation protects existing privileged roles and rejects unverifiable role data',()=>{
  assert.throws(()=>authorizeReactivation('avukat','avukat'),{status:403});
  for(const role of ['sahip','yonetici']){
    assert.throws(()=>authorizeReactivation('yonetici',role),{status:403});
    authorizeReactivation('sahip',role);
  }
  authorizeReactivation('yonetici','avukat');
  assert.throws(()=>authorizeReactivation('sahip','super'),{status:503});
  assert.throws(()=>authorizeReactivation('sahip',null),{status:503});
});
