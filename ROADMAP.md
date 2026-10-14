# LexBase Roadmap

Approved scope: existing module design and functionality review, finance
consistency, form reliability, performance, tenant security, tests and controlled
publication. Existing Claude credentials and connections must be preserved.

## Completion Criteria

- Defined financial scenarios agree across case, client and office summaries.
- Create, update, delete and restore refresh dependent screens.
- Failed saves preserve input and drafts.
- Active bureau access is enforced in the database and tested.
- Critical screen performance has a measured before/after comparison.
- Regression tests, type checks and production builds pass.
- Releases have post-deployment smoke checks and a documented rollback.
- Every new production code release advances the version, includes dated
  user-facing update notes and passes the RELEASING.md preflight/smoke checks.

## Work Packages

- [x] Create a clean GitHub-based checkout; preserve newer shared utilities.
- [x] First form/query improvements, nine regression tests, draft PR #2.
- [ ] Complete module/data dependency map and browser review.
- [x] Secure six finance RPCs in production and verify cross-bureau denial.
- [x] Fix consulting/mediation status-write failures, notice archive and
      service-module finance refresh; 12 Node regression tests passed.
- [x] Confirm income/client-held money and archive accounting rules.
- [x] Implement frontend income classification, archived financial lists and
      reliable client fee saves; legacy service fees survive the first payment.
- [ ] Unify frontend/backend finance calculations with fixture tests.
- [x] Prepare atomic expense/cash writes, shared expense form and separate client
      expense receivables; 21 hosted temporary-table candidate scenarios passed.
- [x] Prepare atomic lifecycle operations, remove destructive trash listing and
      add explicit-delete finance guards; local SQL and isolated browser checks.
- [ ] Reconcile 249 historical file expenses and 11 unverified client links;
      the unmatched cash movement belongs to a deleted case, not a proven duplicate.
- [x] Share case movement, expense and agreement calculations across detail,
      client drawer, client dues and balance screens; six additional fixtures.
- [x] Reproduce three production summary discrepancies using isolated temporary
      SQL fixtures and cloned functions, without writing persistent data.
- [x] Prepare guarded case/client summary corrections, rollback snapshot and
      27 passing isolated SQL scenarios; verify idempotence and drift rejection.
- [x] Align client cards/report/PDF fee labels with separated fee summaries.
- [x] Centralize version/history displays, add release preparation and predeploy
      version/notes checks; seven new release tests and local notes/API checks.
- [ ] Review and improve core forms, list/detail screens and mobile behavior.
- [ ] Measure and improve critical screen loading.
- [ ] Complete role/admin/invitation checks.
- [ ] Validate, publish in bounded releases and run production smoke checks.

## Module Review

Each module needs a keep/fix/combine/add/remove assessment based on source and
browser observations. Proposed product changes are not verified findings.

| Module | Review focus |
| --- | --- |
| Dashboard | Prioritized work, due dates, collections; duplicated metrics |
| Clients | Case relationships, money, communications, next action |
| Cases / enforcement | Stage, owner, deadlines, money, long forms |
| Finance | Income vs client funds, advances, traceable totals |
| Tasks / calendar | Case/client links, ownership, duplicate input |
| Consulting / mediation / notices | Service flow and shared financial behavior |
| Documents | Case linkage, categories, versions, retrieval |
| Team / approvals | Visibility, authority and pending decisions |
| Toolbox | Actual utility, task grouping, reusable case results |
| Support / settings | Setup, imports, invitation guidance, simplification |

## Decisions Requiring Product Clarification

- Confirmed: counterparty collections belong to clients; only separately
  recognized fees are office income. Direct fee payments must be distinguished
  from fees offset against held client funds before implementing held balances.
- Confirmed: archives remain in financial history, not active-work screens.
- Whether deletion of a case with financial history is allowed, or requires
  cancellation/correction entries instead.
- Historical expense reimbursement/opening balances must be reviewed before
  backfilling missing cash movements; the 249 unmatched costs are not automatically
  newly collectible debts.

## Current Evidence

- Local original directory differs from GitHub and must not be uploaded wholesale.
- Six production finance RPCs previously allowed anonymous execution without
  bureau checks. A forward migration now denies anonymous/nonmember calls;
  active-member and cross-bureau checks passed after application.
- Production profit/loss omits notice income and uses mediation meeting amounts
  rather than the collected-fee field used in the UI.
- Production client/profit-loss case queries include soft-deleted records.
- Signed-in Chrome review reached dashboard, finance, cases and collection forms.
- Live collection form differs from GitHub and Desktop/Lexbase sources, including
  the ZIP backup. Frontend publication is blocked until this is reconciled;
  do not overwrite live functionality with the older source.
- Cloudflare runtime inspection confirmed missing enforcement payment options
  and the debtor-payment storage convention. These are reconstructed in the
  branch; full-source reconciliation remains open (SOURCE_RECONCILIATION.md).
- Case/client calculation corrections are tested candidates, not live changes.
  Profit/loss, refund/source allocation, tax totals and full browser parity
  remain open before a coordinated accounting release.

## Deferred Feature Backlog

Client portal, AI document generation and major integrations require separate
scope selection after existing workflows are reliable.
