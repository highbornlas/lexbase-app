import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const migration = ['20261014102055_client_cash_expense_atomicity.sql', '20261014124659_atomic_record_lifecycle.sql']
  .map(file => readFileSync(new URL(`migrations/${file}`, root), 'utf8')).join('\n');
// Explicit schema replacement keeps all candidate DDL and writes in session-local fixtures.
const candidate = migration.replaceAll('public.', 'pg_temp.');
const tests = readFileSync(new URL('tests/client_cash_atomicity.sql', root), 'utf8');
const [setup, assertions] = tests.split('-- CANDIDATE HERE');
if (!assertions) throw new Error('Missing candidate marker');
process.stdout.write(`${setup}\n${candidate}\n${assertions}`);
