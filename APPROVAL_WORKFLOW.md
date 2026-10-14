# Approval Workflow Audit and Notification Candidate

Status: branch-only. No production migration or web deployment.

## Verified Findings

- `useOnayTalebiOlustur` previously inserted the queue row, read managers from
  `uyelikler`, then separately inserted notifications without checking errors.
  Tightening membership reads would hide managers from ordinary members.
- The source has no callers of `useOnayTalebiOlustur` or `useOnayGerekliMi`
  outside their definitions. Sidebar reads the queue; the approvals page lists
  and processes it. Current form integration is incomplete, despite settings
  claiming that expenses/receipts automatically await approval. This is a source
  finding, not a claim about every unrecovered production asset.
- Live queue INSERT/SELECT/UPDATE policies only check `get_user_buro_id()`.
  UPDATE does not enforce a manager role or maker/checker separation. Browser
  filtering/buttons are not database authorization.
- `useOnayIslem` marks approved first, then upserts the client-selected target
  table. Its best-effort rollback is another request. Full-row JSON can overwrite
  newer expense/payment data. This decision path is NOT repaired by the new
  request/notification function and remains a release gate.

## Implemented Candidate

`public.onay_talebi_olustur` is SECURITY INVOKER with an empty search path.
It checks active membership, accepts only request fields, derives actor/status
from the server, and uses a caller-supplied stable UUID for idempotent retries.
Same-id/different-payload conflicts fail closed. It stores target-table metadata
but NEVER executes dynamic SQL or writes that target table.

`lexbase_private.onay_talebi_bildir` is a narrowly privileged SECURITY DEFINER
function in a non-public schema. It verifies current caller identity, ownership
of the persisted request and active bureau membership. It delivers only to
distinct active owners/managers of that bureau, excluding the requester. Fixed
notification IDs avoid duplicates. It returns a count, not membership rows.
PUBLIC/anon execution is revoked; authenticated gets only schema USAGE and
function EXECUTE, not CREATE. Private schema must not be added to exposed schemas.

Request and notifications share the RPC transaction; delivery failure leaves
neither a new request nor partial notifications. Processed-request retries do
not reopen the decision. Existing queue RLS is retained, NOT bypassed: its
first-bureau-only limitation still needs a policy redesign before multi-bureau
approval rollout.

The unused creation hook now requires a stable request UUID from the calling
form. Do not create a new UUID on a retry after an ambiguous network response.
There is no insecure two-write fallback if the RPC is unavailable.

Approvals UI now shows loading/read failures instead of empty/zero data, handles
mutation errors, preserves rejection input and prevents duplicate clicks. Setting
updates confirm a returned row. A visible warning distinguishes prepared approval
settings from actually integrated finance forms. UI changes still need browser
and mobile verification against the actual product theme.

## Validation

```sh
node supabase/tests/run_approval_request_fixtures.mjs /private/tmp/lexbase-pg-fixture/node_modules/@electric-sql/pglite/dist/index.js
```

33 isolated PostgreSQL assertions cover active/foreign/inactive/anonymous roles,
membership privacy, recipient scope, request identity spoofing, money validation,
stable retry/conflict, rollback on mid-delivery failure, source preconditions,
private execution access and RLS preservation. Local fixtures stub auth.uid;
they are not live Auth/PostgREST or concurrent-session tests.
Notification fixture policies are intentionally stricter than production to
prove that fixed delivery does not depend on broad client grants. Live notification
SELECT/INSERT/UPDATE/DELETE policies still allow bureau-wide operations; this
packet does not establish recipient-only confidentiality or prevent all direct
notification spam/deletion. Review that separately before claiming private inboxes.

## Remaining Work

1. Replace decision/upsert with an atomic authorized operation using fixed
   action-to-table mappings and the shared financial writers; enforce manager
   role and prohibit self-approval in the database.
2. Redesign queue/settings row policies so direct API calls cannot bypass those
   rules; review target-table writes and role exemptions together.
3. Integrate selected forms with stable draft IDs, pending approval state and
   confirmed settings semantics. Do not imply all writes are protected yet.
4. Test real Auth, multi-bureau selection, revoked users, manager/platform-admin
   access, notifications and decision failure before coordinated release.

## Production Trigger Audit Follow-Up

Read-only metadata also confirms legacy enforcement/notice triggers project costs into
`avanslar`, separately from the new client-cash writer. `auto_icra_harcama_sync`
deletes/recreates generated projections on expense changes; `auto_ihtar_masraf`
recreates legacy expenses when reflecting a positive cost. Existing candidate
fixtures do not include all these production triggers. Their ownership behavior,
metadata retention and coexistence with client cash must be tested before an
accounting release; no automatic cleanup of historical rows is approved.

The security advisor reports 37 mutable-function-search-path warnings and two
RLS-without-policy tables. These are investigation items, not 39 confirmed
exploits and not findings about the new local-only functions.
See [search-path guidance](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
and [missing-policy guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
