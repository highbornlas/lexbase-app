# Invitation HTTP Reliability Candidate

Prepared 2026-10-15, NOT deployed. No real invitation, account activation,
customer-data rewrite, secret change or Auth configuration change was performed.

## Implemented

- `index.ts` is a small Deno entrypoint; `handler.ts` contains the HTTP behavior
  with injected SDK/environment/mail transport. Authorization remains in its
  separately tested module. No browser service key or new environment key.
- POST-only business endpoint, preflight support, verified getUser response,
  explicit configuration/input errors and membership-only bureau authorization.
- Auth directory lookup follows pages instead of checking only the first page;
  lookup failure or a 100-page safety limit never implies a new user.
- Membership reads fail closed. Existing active, passive and pending states are
  distinct. Reactivation checks prior state/role and confirms a returned row.
- New-user profile and pending membership writes are checked individually;
  missing provider identity, identity/email mismatch, failed writes or missing
  confirmations return `invite_setup_incomplete`, not false success.
- Only a new invited profile is upserted; both legacy firm_id and buro_id are
  aligned to the authorized bureau, with the required email supplied. Existing
  users added to another bureau do not have their home profile overwritten.
- Existing unconfirmed users cannot gain active membership merely by retrying a
  partially completed invitation. Historical pending rows are never bulk-activated.
- Secondary notification/email errors yield warnings while a confirmed primary
  membership write remains successful; retry sees the existing membership.
- Display names/metadata are escaped in supplementary email HTML. Configured
  callback origins reject unsafe protocols/credentials; missing app origin defers
  to the provider Site URL, never derives a host from SUPABASE_URL.
- Shared frontend result validation keeps pending staff pending and refuses
  unknown/malformed/partial results instead of marking them active.

## Compatibility

An existing pending invitation returns `status: invited` with
`pending_existing: true` and a message explicitly saying no email was resent.
This preserves old clients that recognize only `invited` as pending. Returning a
new success status to those clients would incorrectly mark staff active.
The new frontend validator also understands an explicit `invitation_pending`
alias but the server does not rely on that alias during rollout.

The old deployed v6 endpoint can still return `already_member` for a pending
membership. Frontend validation alone cannot repair that old server ambiguity.
Coordinate deployment and verify the actual deployed response, not only source.

## Important Limitations

Auth invitation/email and subsequent profile/membership REST writes are NOT one
database transaction. The candidate reports partial setup honestly; it does not
delete a newly created Auth user or automatically invent an opening membership.
A lost provider/HTTP response still needs server-state reconciliation, not a
guarantee of exactly-once external email delivery.

The production signup trigger still creates a new bureau when it does not see
firm_id metadata, whereas the invitation supplies buro_id. Aligning the profile
afterward does not remove a spurious bureau created by that trigger. Fix the
trusted signup/invite boundary before release; do not clean historical bureaus
automatically or fix authorization by trusting user-editable metadata.

Pending invitation acceptance/activation still needs a trusted server-owned
provenance mechanism and verified Auth/session flow. This packet intentionally
keeps pending rows pending; it does not complete that missing acceptance path.
The code-only callback assumes a session-code exchange; real invitation email
link/callback compatibility remains an actual Auth test gate.

## Verification

```sh
cd lexbase-app
node --test scripts/invite-handler.test.mjs scripts/invitation-result.test.mjs
```

24 complete HTTP-handler tests and three frontend-result tests pass with fake SDK
responses, synthetic accounts, fake keys and an injected mail transport. No real
email/API calls. Together with the existing suite, 88 Node tests pass.
The first fixture run exposed a test-double single-row/array bug; the double was
corrected before evaluating these scenarios. No production behavior was weakened
to make fixture authorization pass.

These tests execute Request/Response and handler control flow in Node, not Deno,
GoTrue, a real browser, or actual database policies. Existing independent SQL
security suites are complementary, not a substitute for those integration tests.

Before deployment package index.ts, handler.ts and authorization.ts together;
review against the latest retrieved deployed version. Preserve its manual Auth
verification/gateway setting unless separately reviewed. Complete real Auth and
one agreed-recipient email smoke check before claiming end-to-end success.
