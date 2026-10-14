# Client Cash and Office Fees

Confirmed by the product owner on 2026-10-14.

- Client advances and client-owned expenses belong to the client cash ledger.
- Contractual fee receivables and receipts belong to the office account, separate from expense receivables.
- Client cash balance = advances received - client expenses - advance refunds.
- A negative balance is displayed as a positive expense receivable from that client. It must not be offset by another client's positive balance or by fee receipts.
- Client-owned expenses do not reduce office profit/loss. Explicit office-owned costs do.
- Existing unclassified file expenses are treated as client-owned in the new calculation helpers; persisted historical records have not been rewritten.
- Archives retain financial history; soft-deleted records are excluded.

## Implementation Status

The development branch has separate balance calculations, a shared expense form, and transactional save/edit/delete RPCs. These changes are not deployed.

New case/enforcement expense writes and cash-panel expense writes use one database transaction and one shared movement ID. Office costs leave the client cash ledger. Existing case edit forms use a protected writer that preserves the latest server-side expense array instead of restoring an older screen snapshot. Failed requests leave form values intact; missing RPCs fail closed rather than falling back to two writes.

Legacy expense/cash components now forward to the unified panel; duplicate implementations were removed. Historical records have not been rewritten.

The candidate migration passed 21 transaction-local SQL scenarios using temporary tables with an authenticated role, RLS, and ROLLBACK. These cover rollback after a forced ledger failure, stale snapshots, ownership changes, scoped ID collisions, retries, and all four case types. Application tests: 44 passed; TypeScript and production build passed. Browser end-to-end tests remain pending.

Read-only production diagnostics on 2026-10-14 found 249 client-owned file expenses without a matching cash movement ID and 1 linked cash movement without a matching active file expense ID. Matched IDs had no reported amount/date/client mismatch; no duplicate expense-ID groups were found. Missing ID matches are not proof of missing financial activity: older forms generated different IDs. Do not infer links or auto-backfill from amount/date alone.

## Remaining Release Gates

- Review historical linkage and produce an explicit reconciliation report before approving a data backfill.
- Verify the new lifecycle migration against the target Supabase policies before deployment. Local PostgreSQL tests use a synthetic auth identity, not hosted Auth or the exact production policies.
- Review full table-level delete permissions and client reassignment semantics. Financial deletion protection currently applies to the application RPC paths, not every direct database operation.
- Complete authenticated staging checks for the whole application, beyond the isolated form tests.
- Complete frontend/live source reconciliation before publishing, and coordinate the new RPC migration with the frontend release.

Production financial RPC calculations still require the matching reviewed migration. Passing helper tests does not establish end-to-end accounting parity.

## Lifecycle Follow-Up

Case, enforcement, consulting, mediation, notice and client lifecycle hooks now share one invoker RPC. It locks the existing row, changes only the requested flag, never recreates a missing row, and guards permanent deletion of financially linked trash records. New client trashing retains case links; restoration repairs explicit legacy `_eskiMuvId` links only when the current client field is empty, without overwriting a later reassignment.

Trash listing no longer deletes expired records. It reads deleted rows only, paginates, and reports read failures rather than presenting an empty bin. Batch actions wait for results, report partial failures and keep failed selections.

Validation: 50 Node tests, 29 combined local PostgreSQL scenarios and 12 focused lifecycle scenarios passed. The two SQL suites overlap; these are not 41 distinct business scenarios. TypeScript, targeted lint and production build were checked. Hosted transaction-test calls returned `Invalid or expired requestState`, while read-only queries continued to work; no permission change or API-key rotation was made.

Browser fixture checks exercised the real expense component, React Query hooks and candidate SQL functions through a localhost-only transport and in-memory PostgreSQL. Create/edit, failed ledger write rollback, input preservation, successful retry, archive/unarchive, trash/restore and expense ownership changes were observed. Inputs were usable at 390px. The fixture uses minimal test styling, not the production theme; it does not establish full mobile visual parity or production Auth behavior. See `lexbase-app/tests/ui/README.md` and `CLIENT_CASH_RECONCILIATION.md`.
