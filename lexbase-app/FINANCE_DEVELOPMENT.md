# Finance Development

## Sources

- Shared numeric and SMM calculations: `lib/utils/finans.ts`.
- Shared case money, expense and agreement summaries: `dosyaParaOzeti`,
  `dosyaMasrafToplami` and `anlasilanUcret` in `lib/utils/finans.ts`.
- Income classification: `lib/finans/gelirKurallari.ts`.
- Client grouping: `lib/finans/dosyaGruplari.ts`.
- Server summary queries: `lib/hooks/useFinans.ts`.
- Case mutations: `lib/hooks/useDavalar.ts`, `lib/hooks/useIcra.ts`.
- Collection form: `components/modules/TahsilatModal.tsx`.

## Invariants

- Transfer and refund movements are excluded from income summaries.
- General/counterparty collections belong to clients, not office income.
- Recognized office income includes contractual fees, opposing fees and legacy
  enforcement fees. Statutory enforcement fees do not reduce contractual dues.
  Enforcement percentage shares and case opposing fees share the legacy
  hakediş type; context-aware contractual calculations remain pending.
- Archives remain in financial history; soft-deleted records are excluded.
- A service's first explicit collection preserves its legacy flat fee payment.
- Do not add legacy `tahsilEdildi` to an existing `tahsilatlar` total.
- Case/client dues exclude client receipts, transfers and statutory opposing
  fees. The client drawer, dues table and balance list use the same helpers.
- Case and enforcement fee-minus-expense indicators exclude client money and
  are labeled as fee/expense differences, not a client-held cash balance.
- Cover-sheet debtor collections include only explicit tahsilat/borclu_odeme
  movements, or legacy tahsil when no movements exist. Refund allocation and
  separately paid statutory fees need source provenance before netting debt.
- Case mutations invalidate both case queries and finance summaries.
- A collection form closes and clears its draft only after a successful save.
- New collection draft keys are scoped by case; explicit draft saves flush
  immediately, and clearing cancels a pending automatic write.
- Prefer the server profit/loss summary. Load fallback module queries only when
  that summary is unavailable; never show a partial fallback as a complete total.
- Preserve existing numeric normalization and non-receipted tax normalization.

## Verification

Use Node.js 22.18 or newer for the TypeScript-backed Node tests:

```sh
node --test lib/finans/*.test.mjs
npx tsc --noEmit --incremental false
npm run build
```

These tests do not replace browser checks of save failures, duplicate submissions,
draft recovery, bureau switching, or production RPC calculations.

25 Node tests and the production build passed for the shared-summary packet.

## Isolated SQL Diagnostics

`../supabase/tests/finance_calculation_diagnostics.sql` clones the current
guarded production functions into pg_temp and shadows their data tables with
synthetic fixtures. It must be run as a whole, including ROLLBACK. It neither
changes real client records nor replaces production functions.

On 2026-10-14, three expected parity checks failed against production bodies:

| Scenario | Observed | Expected |
| --- | ---: | ---: |
| Office income including statutory fee | 2500 | 2800 |
| Explicit agreement total precedence | 3000 | 5000 |
| Fee collection excluding client-owned money | 12800 | 2000 |

These are diagnostic failures, not passing database regression tests. A
follow-up catalog check found zero persistent audit functions and both existing
summary access guards intact. Backend calculation fixes remain outstanding.

## Tested Summary Candidate

The forward migration `20261014092345_finance_summary_calculation_fixes.sql`
patches the inspected, guarded case/client definitions without touching rows.
It refuses unexpected source anchors or a missing access guard. It separates
statutory fees, fixes fee dues, honors agreement totals, retains archive history,
excludes deleted records and normalizes service array-vs-flat fee sources.
The aggregate gross-collection field keeps its existing meaning.

Build the isolated test SQL from the repository root:

```sh
node supabase/tests/build_finance_summary_candidate.mjs
```

Run that complete output in one SQL connection. It clones the live definitions,
uses temporary data/membership tables, retargets the migration to the temporary
namespace and ends with ROLLBACK. Never execute the unmodified migration as a
substitute for this test. Source-drift/missing-guard rejection and repeated
application are tested; 27 result scenarios passed on 2026-10-14.

The rollback snapshot `finance_summary_calculation_fixes_prechange.sql` retains
the established bureau guards, unlike the older pre-security reference.
After testing, both production fingerprints matched the snapshot, anonymous
execution remained disabled and neither candidate function was live.

Client report/card/PDF changes are staged with the candidate accounting fields.
Do not deploy the migration independently of their compatibility review.
Outstanding: production profit/loss parity, malformed numeric data, refund and
fee-source provenance, client-held balances, taxes and browser/PDF visual checks.

## Production Differences Observed

The production RPC definitions were inspected read-only on 2026-10-14.

- Profit/loss omits notice income; excluding general collections is intentional.
- Profit/loss reads mediation meeting amounts, while the UI uses collected fees.
- Client summary and profit/loss do not exclude soft-deleted cases in their
  case queries. Financial UI queries now include archives, not deleted records.
- Six finance RPCs now enforce active bureau membership and deny anonymous
  execution through the verified production finance_rpc_access_guard migration.
- Frontend and production calculation parity is still incomplete. Client-held
  balances need explicit direct-payment vs offset provenance; never infer this
  from historical fee types alone.
- Enforcement payment choices and tahsilat/borclu_odeme form/storage mapping
  are preserved from the live compiled asset; see SOURCE_RECONCILIATION.md.
- Live collection UI differs from the checked-out GitHub and Desktop sources;
  web publication remains gated on source reconciliation.

Do not replace these functions by replaying old migration files. Prepare a
forward migration against the live schema, define archival/accounting rules,
and verify access isolation and calculation parity first.
