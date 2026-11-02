import { readFileSync } from 'node:fs';
import { assertNewLiveVersion, validateRelease } from './release-tools.mjs';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
try {
  const pkg = read('../package.json'), lock = read('../package-lock.json');
  const history = read('../lib/release-history.json');
  validateRelease(pkg, lock, history);
  if (process.argv.includes('--live')) {
    const response = await fetch('https://lexbase.app/api/version', {
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    const payload = response.status === 200 ? await response.json() : undefined;
    const previous = assertNewLiveVersion(pkg, history, response.status, payload);
    console.log(`Release ${pkg.version} is newer than live ${previous}.`);
  } else console.log(`Version ${pkg.version}, lockfile and release notes match.`);
} catch (error) {
  console.error(`Release check failed: ${error.message}`);
  process.exitCode = 1;
}
