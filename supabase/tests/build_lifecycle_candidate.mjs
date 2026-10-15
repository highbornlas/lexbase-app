import { readFileSync } from 'node:fs';
const root = new URL('../',import.meta.url);
const migration = readFileSync(new URL('migrations/20261014124659_atomic_record_lifecycle.sql',root),'utf8').replaceAll('public.','pg_temp.');
const tests = readFileSync(new URL('tests/record_lifecycle.sql',root),'utf8');
const [setup,assertions] = tests.split('-- CANDIDATE HERE');
if (!assertions) throw new Error('Missing candidate marker');
process.stdout.write(`${setup}\n${migration}\n${assertions}`);
