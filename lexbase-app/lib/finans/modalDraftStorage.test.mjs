import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDraftStorage } from '../utils/modalDraftStorage.ts';

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('clearing a draft cancels a pending write', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const memory = storage();
  const draft = createDraftStorage('case-a', () => memory);
  draft.schedule({ tutar: 100 });
  draft.clear();
  t.mock.timers.tick(1000);
  assert.equal(draft.has(), false);
});

test('explicit save is immediate and replaces a queued older snapshot', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const memory = storage();
  const draft = createDraftStorage('case-a', () => memory);
  draft.schedule({ tutar: 100 });
  draft.save({ tutar: 200 });
  assert.deepEqual(draft.load(), { tutar: 200 });
  t.mock.timers.tick(1000);
  assert.deepEqual(draft.load(), { tutar: 200 });
});

test('reopening recovers the draft without leaking across cases', () => {
  const memory = storage();
  createDraftStorage('case-a', () => memory).save({ tutar: 300 });
  assert.deepEqual(createDraftStorage('case-a', () => memory).load(), { tutar: 300 });
  assert.equal(createDraftStorage('case-b', () => memory).load(), null);
});

test('invalid data and unavailable storage do not crash the form', () => {
  const memory = storage();
  const draft = createDraftStorage('case-a', () => memory);
  for (const raw of ['broken-json', 'null', '123', '[]']) {
    memory.setItem('case-a', raw);
    assert.equal(draft.load(), null);
  }
  const unavailable = createDraftStorage('case-a', () => { throw new Error('denied'); });
  assert.doesNotThrow(() => unavailable.save({ tutar: 100 }));
  assert.doesNotThrow(() => unavailable.clear());
  assert.equal(unavailable.load(), null);
});

test('autosaving this session never advertises a previous recoverable draft', () => {
  const memory = storage();
  const draft = createDraftStorage('new-case-client-a', () => memory);
  draft.beginSession();
  draft.save({ konu: 'Typing now' });
  assert.equal(draft.has(), true);
  assert.equal(draft.hasRecoverableDraft(), false);
  draft.beginSession();
  assert.equal(draft.hasRecoverableDraft(), true);
});

test('recovery restores the opening snapshot rather than a later autosave', () => {
  const memory = storage();
  createDraftStorage('case', () => memory).save({ tutar: 100 });
  const draft = createDraftStorage('case', () => memory);
  draft.beginSession();
  draft.save({ tutar: 200 });
  assert.deepEqual(draft.recover(), { tutar: 100 });
  assert.equal(draft.hasRecoverableDraft(), false);
  draft.beginSession();
  draft.clear();
  assert.equal(draft.hasRecoverableDraft(), false);
});

test('reopening and consuming drafts notify mounted form subscribers', () => {
  const memory = storage();
  const draft = createDraftStorage('reopen', () => memory);
  const snapshots = [];
  const unsubscribe = draft.subscribe(() => snapshots.push(draft.hasRecoverableDraft()));
  draft.save({ konu: 'Saved draft' });
  assert.deepEqual(snapshots, []);
  draft.beginSession();
  draft.recover();
  draft.beginSession();
  draft.clear();
  assert.deepEqual(snapshots, [true, false, true, false]);
  unsubscribe();
  draft.beginSession();
  assert.equal(snapshots.length, 4);
});
