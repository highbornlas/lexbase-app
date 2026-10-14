import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('migrations/20261014102055_client_cash_expense_atomicity.sql', root), 'utf8');
// Explicit schema replacement keeps all candidate DDL and writes in session-local fixtures.
const candidate = migration.replaceAll('public.', 'pg_temp.');
const tests = readFileSync(new URL('tests/client_cash_atomicity.sql', root), 'utf8');
const [setup, assertions] = tests.split('-- CANDIDATE HERE');
if (!assertions) throw new Error('Missing candidate marker');
process.stdout.write(`${setup}\n${candidate}\n${assertions}`);
