import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApprovalRequest, approvalErrorMessage } from '../data/approvalRequest.ts';

const input = {modul:'finans',islem_tipi:'masraf_ekle',hedef_tablo:'davalar',veri:{tutar:500}};

test('approval request uses one atomic RPC with stable id and no membership read', async () => {
  const calls = [];
  const client = {rpc:async(name,args)=>{calls.push({name,args});return {data:{id:'request',bildirim_sayisi:1},error:null};}};
  await createApprovalRequest(client,'office','request',input);
  assert.deepEqual(calls,[{name:'onay_talebi_olustur',args:{p_buro_id:'office',p_id:'request',p_talep:input}}]);
});

test('approval retry preserves id and payload; no manager also remains a confirmed save', async () => {
  const calls = [];
  const client = {rpc:async(_name,args)=>{calls.push(args);return {data:{id:'request',bildirim_sayisi:0},error:null};}};
  await createApprovalRequest(client,'office','request',input);
  await createApprovalRequest(client,'office','request',input);
  assert.deepEqual(calls[0],calls[1]);
});

test('missing identity or denied/unconfirmed approval requests cannot report success', async () => {
  const denied = {rpc:async()=>({data:null,error:{code:'42501'}})};
  await assert.rejects(createApprovalRequest(denied,null,'request',input));
  await assert.rejects(createApprovalRequest(denied,'office','',input));
  await assert.rejects(createApprovalRequest(denied,'office','request',input),{code:'42501'});
  for (const data of [null,{id:'other',bildirim_sayisi:1},{id:'request',bildirim_sayisi:-1},{id:'request',bildirim_sayisi:0.5}]) {
    await assert.rejects(createApprovalRequest({rpc:async()=>({data,error:null})},'office','request',input));
  }
});

test('missing approval RPC fails closed without a two-write fallback', async () => {
  const client={rpc:async()=>({data:null,error:{code:'PGRST202'}})};
  await assert.rejects(createApprovalRequest(client,'office','request',input),{code:'PGRST202'});
});

test('approval errors show actionable messages instead of silent failure or database details', () => {
  assert.match(approvalErrorMessage({code:'42501',message:'private database detail'}),/yetkisi/);
  assert.match(approvalErrorMessage({code:'40001'}),/yenileyip/);
  assert.match(approvalErrorMessage({code:'PGRST202'}),/henüz/);
  assert.match(approvalErrorMessage({code:'22023'}),/geçersiz/);
  assert.match(approvalErrorMessage(null),/doğrulanamadı/);
  assert.equal(approvalErrorMessage(new Error('Oturum bulunamadı')),'Oturum bulunamadı');
});
