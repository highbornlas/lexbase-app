# Isolated Finance UI Fixture

This is a development-only browser fixture, not a Next.js route. It does not use a production URL, API key, login session or customer data. SQL tables live in memory, and the server listens on 127.0.0.1 only.

It bundles the real `DosyaHarcamaTab`, `useKasaIslemi`, `useRecordLifecycle` and React Query. Only bureau identity and Supabase transport are substituted. Requests execute the actual candidate PL/pgSQL functions under an authenticated fixture role with a synthetic `auth.uid()` and fixture RLS. A one-shot ledger trigger can fail after the case write, verifying transaction rollback through the UI.

## Run

Install the optional runtime outside the project; do not change the app lockfile:

```sh
npm install --prefix /private/tmp/lexbase-pg-fixture --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.9
node scripts/expense-ui-fixture.mjs /private/tmp/lexbase-pg-fixture/node_modules/@electric-sql/pglite/dist/index.js
```

From the repository root, run the SQL suites independently:

```sh
node supabase/tests/run_local_finance_fixtures.mjs /private/tmp/lexbase-pg-fixture/node_modules/@electric-sql/pglite/dist/index.js
```

## Observed Checks

- 1000 advance + 1500 client expense: cash -500, expense due 500, office income unchanged at 3000.
- Injected ledger failure while editing to 1200: stored expense remains 1500 and cash -500; the form retains 1200.
- Successful retry: one expense at 1200, cash -200, expense due 200.
- Archive/unarchive and trash/restore: same expense, cash and fee history retained.
- Changing that expense to office-owned: cash restored to 1000, office net 1800.
- Pending save disables form controls. 390px inputs remain usable.

These checks are not hosted Supabase Auth tests or a visual review of the production theme. Full staging role, pagination, concurrent-session and whole-module tests are still required. The temporary test servers and agent-created tabs were stopped after inspection.
