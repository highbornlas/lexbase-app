# Signed-In Test Account Verification

## 2026-10-15: Synthetic Client Finance Scenario

The owner explicitly authorized new test records in the signed-in Chrome test
account. Records below were created through the deployed UI, not inserted by SQL.
Existing customer records were not edited. No invitations or emails were sent.

| Record | ID | Values |
| --- | --- | --- |
| Client | `393c8a6f-aee9-405d-b06b-285c3b42c539` | CODEX TEST Finans 20261015; fictitious passport; no contact details |
| Dava | `4b76ccd5-172d-4879-9112-c6f3a756d267` | 2026/900015; Alacak; claim 10,000; agreed fee 3,000 |
| Client advance | `dde54e81-8a56-4a93-a55d-fcfc304a7035` | 1,000; cash; 2026-10-15 |
| Case expense and linked cash movement | `583ea26f-62b6-4aee-8d57-471c774688cf` | 1,500; Posta/Tebligat; 2026-10-15 |
| Case fee collection | `bd76f230-b2c6-4a00-aa7a-8df850b3fdf3` | 750; cash; 2026-10-15; CODEX TEST description |

Observed cash balance: -500. Agreed fee receivable remained separately 3,000,
with no fee collection. A read-only database check confirmed the saved case and
the two cash movements, including the shared expense/movement ID. These synthetic
records are deliberately retained for follow-up tests; no cleanup was performed.

A subsequent 750 fee collection updated the case row to 750 collected / 2,250
remaining. Read-only database verification confirmed one collection in the case
and exactly the same two client cash movements: fees did not offset the -500
expense deficit. The live summary card and table totals still showed the old
zero-collected / 3,000 remaining state after saving. The client cash subtab showed
zero movements despite the global cash tab and database showing both movements;
the cause is not yet established. These are additional release-blocking UI
consistency findings, not passed candidate tests.

After full reload the live summary showed 750 collected and 2,250 fee receivable,
but incorrectly changed its balance from -500 to +250. This explicitly reproduces
the forbidden offset of office fee income against client expense debt. The
persisted cash movements remain unchanged; summary calculation must keep -500
cash / 500 expense receivable separate from office income. The existing candidate
summary correction is not live and still needs coordinated browser verification.
Evidence: `/private/tmp/lexbase-codex-test-fee-offset-20261015.png`.

Filtered global cash screenshot: `/private/tmp/lexbase-codex-test-cash-20261015.png`.

### Findings And Candidate Changes

- Client detail's new-case form did not preselect the current client. Candidate
  forms now receive client context, while existing-record data takes precedence.
- After creating the case, the file count updated but the financial summary still
  showed zero fee receivable until full reload. Existing candidate query
  invalidation requires candidate browser verification before calling this fixed.
- Closed client-detail modals eagerly mounted their data hooks. Candidate page
  mounts dynamically imported forms only while open. No measured speed claim yet.
- Initialization effects could reset an open form on query refresh. Candidate
  initialization is per open-record session and waits for required list data.

This is evidence for the deployed old UI, not end-to-end certification of the
candidate branch. Refund, counterparty/held-fund fee allocation, edit/delete, archive/restore,
ordinary-role and cross-tenant browser scenarios remain open. Component session
behavior has TypeScript/build checks but still needs interactive candidate tests.

## Legacy Expense Trigger Candidate

`20261015164303_legacy_expense_projection_ownership.sql` is NOT applied live.
Its local runner loads captured production function definitions and validates
21 assertions, including the original office-cost and cancelled-notice defects,
ownership changes, no historical backfill, rollback, idempotence and source drift.

```sh
node supabase/tests/run_legacy_expense_projection_fixtures.mjs /private/tmp/lexbase-pg-fixture/node_modules/@electric-sql/pglite/dist/index.js
```

The legacy `avanslar` projection is not a second official client cash movement.
Notice rows have no reliable generated-row marker beyond the existing link/type
convention. Financial edits can recreate projection IDs and payment status;
settled history and manually linked rows require reconciliation before release.
This candidate does not fix full profit/loss or migrate historical balances.
