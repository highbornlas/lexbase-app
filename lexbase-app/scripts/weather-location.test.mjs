import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPreviouslyGrantedLocation } from '../lib/weather/location.ts';

for (const state of ['prompt', 'denied']) {
  test(`automatic weather never requests geolocation when permission is ${state}`, async () => {
    let requests = 0;
    const browser = { permissions: { query: async () => ({ state }) },
      geolocation: { getCurrentPosition() { requests++; } } };
    assert.equal(await getPreviouslyGrantedLocation(browser), null);
    assert.equal(requests, 0);
  });
}

test('unsupported Permissions API falls back without opening a prompt', async () => {
  let requests = 0;
  assert.equal(await getPreviouslyGrantedLocation({ geolocation: { getCurrentPosition() { requests++; } } }), null);
  assert.equal(requests, 0);
});

test('previously granted location still works', async () => {
  const browser = { permissions: { query: async () => ({ state: 'granted' }) },
    geolocation: { getCurrentPosition(success) { success({ coords: { latitude: 41, longitude: 29 } }); } } };
  assert.deepEqual(await getPreviouslyGrantedLocation(browser), { lat: 41, lon: 29 });
});

test('permission API failure falls back to the selected city', async () => {
  assert.equal(await getPreviouslyGrantedLocation({ permissions: { query: async () => { throw Error('unsupported'); } },
    geolocation: {} }), null);
});

test('a stalled location service cannot block weather initialization forever', async () => {
  const browser = { permissions: { query: async () => ({ state: 'granted' }) },
    geolocation: { getCurrentPosition() {} } };
  assert.equal(await getPreviouslyGrantedLocation(browser, 5), null);
});
