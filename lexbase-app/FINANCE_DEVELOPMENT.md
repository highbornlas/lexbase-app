# Finance Development

## Sources

- Shared numeric and SMM calculations: `lib/utils/finans.ts`.
- Income classification: `lib/finans/gelirKurallari.ts`.
- Client grouping: `lib/finans/dosyaGruplari.ts`.
- Server summary queries: `lib/hooks/useFinans.ts`.
- Case mutations: `lib/hooks/useDavalar.ts`, `lib/hooks/useIcra.ts`.
- Collection form: `components/modules/TahsilatModal.tsx`.

## Invariants

- Transfer and refund movements are excluded from income summaries.
- General/counterparty collections belong to clients, not office income.
- Recognized office income includes contractual fees, opposing fees and legacy
  enforcement fees. Only contractual fees reduce the contractual amount due.
- Archives remain in financial history; soft-deleted records are excluded.
- A service's first explicit collection preserves its legacy flat fee payment.
- Do not add legacy `tahsilEdildi` to an existing `tahsilatlar` total.
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
- Live collection UI differs from the checked-out GitHub and Desktop sources;
  web publication remains gated on source reconciliation.

Do not replace these functions by replaying old migration files. Prepare a
forward migration against the live schema, define archival/accounting rules,
and verify access isolation and calculation parity first.
