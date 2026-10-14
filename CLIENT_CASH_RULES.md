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
- Make archive/restore status writes atomic as well; some legacy status handlers still read and replace whole JSON records and can race with expense edits.
- Review permanent case deletion and client reassignment semantics for linked financial history.
- Run browser tests on an isolated fixture environment, including failed requests and double submissions.
- Complete frontend/live source reconciliation before publishing, and coordinate the new RPC migration with the frontend release.

Production financial RPC calculations still require the matching reviewed migration. Passing helper tests does not establish end-to-end accounting parity.
