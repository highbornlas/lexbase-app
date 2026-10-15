import { readFileSync, writeFileSync } from 'node:fs';
import { prepareRelease } from './release-tools.mjs';

const files = ['../package.json', '../package-lock.json', '../lib/release-history.json'].map(path => new URL(path, import.meta.url));
try {
  const [pkg, lock, history] = files.map(file => JSON.parse(readFileSync(file, 'utf8')));
  const [bump = 'patch', ...notes] = process.argv.slice(2);
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const prepared = prepareRelease(pkg, lock, history, bump, date, notes);
  const contents = [prepared.pkg, prepared.lock, prepared.history].map(value => `${JSON.stringify(value, null, 2)}\n`);
  files.forEach((file, index) => writeFileSync(file, contents[index]));
  console.log(`Prepared ${prepared.pkg.version} (${date}). Not deployed. Review and commit the three release files.`);
} catch (error) {
  console.error(`Release preparation failed: ${error.message}`);
  process.exitCode = 1;
}
