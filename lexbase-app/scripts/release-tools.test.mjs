import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertNewLiveVersion, compareVersions, prepareRelease, validateRelease } from './release-tools.mjs';

function fixture() {
  return {
    pkg: { version: '2.3.0', scripts: { deploy: 'existing-command' } },
    lock: { version: '2.3.0', packages: { '': { version: '2.3.0' }, dependency: { version: '1.0.0' } } },
    history: { legacyLiveVersion: '2.3.0', unreleased: ['A new fix'], releases: [
      { version: '2.3.0', date: '2026-03-21', changes: ['Previous release'] },
    ] },
  };
}

test('release preparation synchronizes version, lockfile, date and notes without touching dependencies', () => {
  const f = fixture();
  const result = prepareRelease(f.pkg, f.lock, f.history, 'patch', '2026-10-14');
  assert.equal(result.pkg.version, '2.3.1');
  assert.equal(result.lock.packages[''].version, '2.3.1');
  assert.equal(result.lock.packages.dependency.version, '1.0.0');
  assert.equal(result.pkg.scripts.deploy, 'existing-command');
  assert.deepEqual(result.history.releases[0], { version: '2.3.1', date: '2026-10-14', changes: ['A new fix'] });
  assert.deepEqual(result.history.unreleased, []);
  assert.equal(f.pkg.version, '2.3.0');
});

test('minor and major releases reset the smaller version fields', () => {
  const f = fixture();
  assert.equal(prepareRelease(f.pkg,f.lock,f.history,'minor','2026-10-14').pkg.version,'2.4.0');
  assert.equal(prepareRelease(f.pkg,f.lock,f.history,'major','2026-10-14').pkg.version,'3.0.0');
});

test('missing notes, invalid dates and invalid bump modes stop preparation', () => {
  const f = fixture(); f.history.unreleased = [];
  assert.throws(() => prepareRelease(f.pkg,f.lock,f.history,'patch','2026-10-14'), /notes/);
  assert.throws(() => prepareRelease(f.pkg,f.lock,f.history,'patch','2026-02-30',['Fix']), /date/);
  assert.throws(() => prepareRelease(f.pkg,f.lock,f.history,'invalid','2026-10-14',['Fix']), /Choose/);
});

test('mismatched lockfiles, unordered history and missing current notes are rejected', () => {
  const f = fixture(); f.lock.version = '2.2.0';
  assert.throws(() => validateRelease(f.pkg,f.lock,f.history), /lockfile/);
  f.lock.version = '2.3.0'; f.history.releases.push(f.history.releases[0]);
  assert.throws(() => validateRelease(f.pkg,f.lock,f.history), /unique/);
  f.history.releases = []; assert.throws(() => validateRelease(f.pkg,f.lock,f.history), /notes/);
});

test('version comparison is numeric, not lexical', () => {
  assert.equal(compareVersions('2.10.0','2.9.9'),1);
  assert.equal(compareVersions('2.3.0','2.3.0'),0);
  assert.throws(() => compareVersions('2.03.0','2.3.0'), /Invalid/);
});

test('same or older versions and unverifiable live metadata cannot deploy', () => {
  const f = fixture();
  assert.throws(() => assertNewLiveVersion(f.pkg,f.history,200,{version:'2.3.0'}), /newer/);
  assert.throws(() => assertNewLiveVersion(f.pkg,f.history,200,{version:'2.4.0'}), /newer/);
  assert.throws(() => assertNewLiveVersion(f.pkg,f.history,200,{}), /Invalid/);
  assert.throws(() => assertNewLiveVersion(f.pkg,f.history,503), /stopped/);
});

test('first metadata release can use the known legacy baseline; later 404s fail closed', () => {
  const f = fixture(); const first = prepareRelease(f.pkg,f.lock,f.history,'patch','2026-10-14');
  assert.equal(assertNewLiveVersion(first.pkg,first.history,404),'2.3.0');
  assert.equal(assertNewLiveVersion(first.pkg,first.history,200,{version:'2.3.0'}),'2.3.0');
  const second = prepareRelease(first.pkg,first.lock,first.history,'patch','2026-10-15',['Next fix']);
  assert.throws(() => assertNewLiveVersion(second.pkg,second.history,404), /stopped/);
});
