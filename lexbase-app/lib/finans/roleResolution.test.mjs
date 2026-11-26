import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startRoleResolution } from '../auth/roleResolution.ts';

const tick = () => new Promise(resolve => setTimeout(resolve, 5));
async function until(fn) { for (let i = 0; i < 100; i++) { if (fn()) return; await tick(); } assert.fail('Role state did not settle'); }
function fixture({ user = { id: 'user' }, memberships = [{ data: { rol: 'sahip', buro_id: 'bureau' }, error: null }], profiles = [] } = {}) {
  const states = [], calls = [];
  let listener;
  const client = { auth: {
    getUser: async () => ({ data: { user }, error: null }),
    onAuthStateChange: callback => { listener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
  }, from(table) {
    const call = { table, filters: [] }; calls.push(call);
    const q = { select() { return q; }, eq(k,v) { call.filters.push([k,v]); return q; },
      order() { return q; }, limit() { return q; },
      async maybeSingle() { const result = (table === 'uyelikler' ? memberships : profiles).shift(); return await result || { data: null, error: null }; } };
    return q;
  } };
  return { client, states, calls, emit: (event, session) => listener(event, session) };
}

test('verified active bureau role restores protected navigation without guessing a role', async () => {
  const f = fixture(); const c = startRoleResolution(f.client, () => 'bureau', s => f.states.push(s));
  try { await until(() => f.states.at(-1)?.loading === false);
    assert.equal(f.states.at(-1).rol, 'sahip');
    assert.deepEqual(f.calls[0].filters, [['auth_id','user'],['durum','aktif'],['buro_id','bureau']]);
  } finally { c.dispose(); }
});

test('missing initial user settles, then a later sign-in recovers without remounting', async () => {
  const f = fixture({ user: null }); const c = startRoleResolution(f.client, () => 'bureau', s => f.states.push(s));
  try { await until(() => f.states.at(-1)?.loading === false);
    assert.equal(f.states.at(-1).rol, null); assert.ok(f.states.at(-1).error);
    f.emit('SIGNED_IN', { user: { id:'user' } });
    await until(() => f.states.at(-1)?.rol === 'sahip');
  } finally { c.dispose(); }
});

test('failed membership read is explicit and cannot promote through a legacy fallback', async () => {
  const f = fixture({ memberships: [{ data:null, error:{ code:'denied' } }], profiles: [{ data:{ rol:'sahip', buro_id:'other' } }] });
  const c = startRoleResolution(f.client, () => 'bureau', s => f.states.push(s));
  try { await until(() => f.states.at(-1)?.loading === false);
    assert.equal(f.states.at(-1).rol, null); assert.ok(f.states.at(-1).error); assert.equal(f.calls.length, 1);
  } finally { c.dispose(); }
});

test('invalid roles are never replaced with an assumed lawyer role', async () => {
  const f = fixture({ memberships: [{ data:{ rol:'unknown', buro_id:'bureau' } }] });
  const c = startRoleResolution(f.client, () => 'bureau', s => f.states.push(s));
  try { await until(() => f.states.at(-1)?.loading === false); assert.equal(f.states.at(-1).rol, null); }
  finally { c.dispose(); }
});

test('verified legacy role is constrained to the selected bureau', async () => {
  const f = fixture({ memberships: [{ data:null, error:null }], profiles: [{ data:{ rol:'avukat', buro_id:'bureau' }, error:null }] });
  const c = startRoleResolution(f.client, () => 'bureau', s => f.states.push(s));
  try { await until(() => f.states.at(-1)?.loading === false);
    assert.equal(f.states.at(-1).rol, 'avukat');
    assert.deepEqual(f.calls[1].filters, [['auth_id','user'],['buro_id','bureau']]);
  } finally { c.dispose(); }
});

test('timeout settles with retry instead of leaving menus silently absent forever', async () => {
  const f = fixture({ memberships: [new Promise(() => {}), { data:{ rol:'sahip', buro_id:'bureau' }, error:null }] });
  const c = startRoleResolution(f.client, () => 'bureau', s => f.states.push(s), 15);
  try { await until(() => f.states.at(-1)?.loading === false); assert.ok(f.states.at(-1).error);
    await c.refresh(); assert.equal(f.states.at(-1).rol, 'sahip');
  } finally { c.dispose(); }
});

test('a late response cannot restore a role after sign-out', async () => {
  let resolve; const pending = new Promise(r => { resolve=r; });
  const f = fixture({ memberships:[pending] });
  const c = startRoleResolution(f.client, () => 'bureau', s => f.states.push(s));
  try { await until(() => f.calls.length === 1); f.emit('SIGNED_OUT', null);
    resolve({ data:{ rol:'sahip', buro_id:'bureau' }, error:null }); await tick();
    assert.equal(f.states.at(-1).rol, null); assert.equal(f.states.at(-1).loading, false);
  } finally { c.dispose(); }
});

test('disposed role controllers cannot publish stale results', async () => {
  let resolve; const f = fixture({ memberships:[new Promise(r => { resolve=r; })] });
  const c = startRoleResolution(f.client, () => 'bureau', s => f.states.push(s));
  await until(() => f.calls.length === 1); c.dispose(); const count=f.states.length;
  resolve({ data:{ rol:'sahip', buro_id:'bureau' }, error:null }); await tick();
  assert.equal(f.states.length, count);
});
