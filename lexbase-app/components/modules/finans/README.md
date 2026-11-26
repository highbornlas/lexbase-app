# Finance consistency candidate

Baseline: release 2.3.3, main `53351cf`. Local candidate branch: `codex/finance-consistency`.
No production deployment, database mutation, migration or credential change is part of this work.

## Rules

- Debtor/client-principal receipts are not office revenue. Contractual fees, counterpart fee entitlement and enforcement fees are office revenue under the existing movement types.
- Only contractual receipts reduce a case's contractual fee receivable. Service-specific legacy receipts retain their existing fee meaning.
- Client advance cash is calculated only from confirmed cash movements. Historical file expense arrays are not backfilled into cash or counted twice. Negative cash means client expense receivable; it never offsets fee receivables.
- Only explicitly office-owned file costs reduce office net. Unclassified historical file costs retain the existing client-owned default.
- Archived financial history remains included. Deleted records/movements do not return through legacy flat-total fallbacks.
- The financial owner is the record's primary `muvId`. Being listed as another represented party does not create another copy of the same fee receivable. Multi-client fee allocation is not inferred.
- Principal/transfer control differences are not certified held-client-money balances: old records do not identify every fee's payment source. No automatic fee deduction or money transfer was introduced.
- Expected income now means total remaining recorded fee receivables across modules, not a guessed next installment. Advances are excluded. Only explicit agreement due dates can be overdue; undated amounts remain visible as undated. No recurring-service accrual or conditional-success-fee eligibility is newly inferred.

## File map

- `lib/finans/ucretHesaplari.ts`: shared fee, balance and profitability views.
- `lib/finans/gelirListesi.ts`: pure income list, extracted from the hook; source-scoped row IDs.
- `lib/finans/muvekkilOzeti.ts`: client report DTO, keeping client cash and office fees separate.
- `lib/finans/dashboardHesaplari.ts`: monthly graph, annual office net, current-month office receipts and fee receivables.
- `lib/finans/raporHesaplari.ts`, `gelirKurallari.ts`, `avansKurallari.ts`: existing underlying accounting rules, reused rather than duplicated.
- `lib/data/raporKayitlari.ts`: bureau-scoped keyset reads, to an empty page even when the server imposes a smaller cap. Later-page errors reject the whole report. No database isolation snapshot is claimed during concurrent writes.
- `lib/hooks/useFinansRaporVerisi.ts`: one bureau lookup per consumer, parallel cached queries with the existing invalidation keys. Client-scoped views reuse client keys.
- `lib/data/buroGiderIslemi.ts`: confirmed write results, bureau-scoped reads/deletes and compare-and-set editing/deletion. Failed reads cannot create deleted stubs. An edit retry confirms the exact intended payload if the prior response was lost; it never forces an overwrite after a concurrent edit.
- `lib/finans/giderKurallari.ts`: validation, derived expense tax amounts, explicit-zero net handling and paid/unpaid totals.

Read only the relevant calculator, consumer and tests for a focused change. Do not copy financial formulas back into screen components.

## Verification

- Shared synthetic scenarios compare client principal, fees, cash deficit, file profitability, income rows, dashboard and report totals; include archive/deletion, legacy fields, rounding, overpayment and period boundaries.
- Query contract tests cover more than 1,000 records, short server pages, bureau/client filters, invalid cursors and failed later pages.
- Expense write contract tests cover rejection, unconfirmed results, retry IDs, failed reads, scoped deletion and concurrent-delete rejection.
- Actual React report components are rendered with failed-query fixtures to prove an error cannot masquerade as zero or healthy state.
- The local browser fixture uses real expense/payment components with synthetic in-memory persistence. Expense failure retained fields; draft recovery worked; double click triggered one attempt; retry created one row; editing kept its ID. Fractional-cent payment was rejected, and a valid double-click payment saved once. Browser console showed no errors.
- 176 automated tests pass, including a UTC-environment run. Production Next build, TypeScript, targeted finance lint and OpenNext Cloudflare Worker packaging pass. Existing middleware-convention and image-library bundling warnings remain; these are not a claim of repository-wide lint cleanup.
- Supabase schema/RLS and authenticated SELECT/INSERT/UPDATE grants were checked read-only. No real authenticated Supabase write end-to-end test was performed by the fixture.

Reproduce from `lexbase-app`:

```sh
npm test
npx tsc --noEmit --incremental false
npm run build
npm run cf:build
node scripts/finance-ui-fixture.mjs
```

Builds require the usual public application environment. The fixture binds only `127.0.0.1:3920`; it never connects to live data.

No Core Web Vitals or actual token-billing improvement is claimed. Report reads trade a bounded extra request for complete totals; huge offices may eventually need a server-side read model using these same tested semantics. Existing legacy SQL RPCs remain deployed but are no longer the authority for these application views. Package version remains 2.3.3 until an actual release is prepared; proposed release notes are in `unreleased`.
