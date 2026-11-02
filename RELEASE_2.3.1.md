# Release 2.3.1 - 2026-11-02

## Production Database

Applied through the authenticated Supabase connector; historical records were
not backfilled or reclassified. Remote migration versions differ from local
candidate filenames because the connector assigns application timestamps.

| Remote version | Local candidate |
| --- | --- |
| 20261102035217 | 20261014102055_client_cash_expense_atomicity.sql |
| 20261102035525 | 20261014124659_atomic_record_lifecycle.sql |
| 20261102035711 | 20261014092345_finance_summary_calculation_fixes.sql |
| 20261102035719 | 20261015180004_profit_loss_cash_basis_parity.sql |
| 20261102035819 | 20261015164303_legacy_expense_projection_ownership.sql |
| 20261102035843 | 20261014141003_atomic_approval_request_notifications.sql |

The summary fixture ran against temporary clones of current production
functions: 34 assertions passed and the transaction rolled back. The deployed
cash, case-save, lifecycle, approval and profit/loss functions deny anonymous
EXECUTE. Existing table RLS remains enabled and unchanged.

Invitation function v7 deployed with explicit owner approval. Its existing
gateway JWT setting remains false; the handler verifies the bearer token with
Auth getUser and authorizes active membership before privileged writes.
Unauthenticated POST returns 401. No actual invitation email was sent as a test.
The prior v6 source is retained in supabase/rollback/invite-user-v6.ts.

## Verification

- Application regression suite: 95 passing assertions.
- Local Postgres summary fixture: 34; profit/loss parity: 16.
- Cash/lifecycle fixtures: 29 and 12; legacy projection: 21.
- Real UI component fixture: failed save preserves inputs; retry uses one ID
  and creates one receipt; office fee collection does not offset client cash.
- Draft recovery UI tested independently with synthetic local data.

## Web Publication

Prepared version: 2.3.1. Publication and postflight are recorded below only
after success. Do not treat preparation or database deployment as web publication.

Rollback target before this release: Cloudflare worker lexbase-app, deployment
d93d1724-66cb-4ce6-954a-00814930b17d, version
c9c1b4da-8879-4c1e-a3e0-e2550d07cfee (100 percent).

Use the existing npm run deploy release gate. The CLI OAuth session was renewed
with limited Workers script/routes write and account/user/zone read permissions.
No GitHub secrets or Claude configuration were changed. GitHub Actions still
requires its missing CLOUDFLARE_API_TOKEN for future automated deployments;
this release uses the authorized local publication path instead.

## Remaining Scope

This is a bounded finance reliability release, not completion of the full
product roadmap. Complete original-source parity could not be established;
the known live receipt options and interest management route are preserved.
Historical unclassified receipts/costs require reconciliation, not automatic
income or debt creation. Real invitation acceptance, all device layouts and
all approval decision paths are not certified by the component fixtures.
