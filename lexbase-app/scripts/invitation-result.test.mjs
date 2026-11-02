import {test} from 'node:test';
import assert from 'node:assert/strict';
import {invitationResult} from '../lib/data/invitationResult.ts';

test('new and already-pending invitations never promote staff to active',()=>{
  for(const status of ['invited','invitation_pending']) assert.equal(invitationResult({status}).durum,'davet_gonderildi');
});
test('only recognized completed membership responses mark staff active',()=>{
  for(const status of ['already_member','existing_user_added','reactivated']) assert.equal(invitationResult({status}).durum,'aktif');
});
test('unknown, partial and malformed invitation results cannot update staff state',()=>{
  for(const payload of [null,[],{},'ok',{status:'invite_setup_incomplete'},{status:'__proto__'},
    {status:'invited',error:'setup failed'},{status:'unexpected_success'}]) assert.throws(()=>invitationResult(payload));
});
