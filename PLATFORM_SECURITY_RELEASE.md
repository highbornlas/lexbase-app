# Bounded Platform Security Release Candidate

Prepared 2026-10-14. NOT applied or deployed. App version remains 2.3.0.
No credentials, connection settings, customer records or admin roles were changed.

## Confirmed Production Metadata

- `is_platform_admin()` currently returns `auth.uid() IS NOT NULL`. Thus every
  signed-in identity satisfies policies intended for platform administrators.
- `admin_bootstrap(uuid,text,text)` is publicly executable SECURITY DEFINER. It
  self-provisions admin/super records. Its `p_auth_id != auth.uid()` check does not
  reject a null unauthenticated uid. A valid target auth ID still has to satisfy
  any actual table constraints; no production exploitation was attempted.
- Platform registry policies reference that same table from its own policies,
  a recursion risk reproduced in a production-shaped local fixture.
- Anon/authenticated have TRUNCATE table grants, which are not restricted by RLS.
- There are three current super-admin records. Their legitimacy requires owner
  confirmation; this candidate deliberately preserves all existing registry rows.
- Three user profiles have no active membership. This count does NOT prove they
  should be activated: they may be disabled, legacy or otherwise unverified.
- Auth signup trigger trusts user-editable `firm_id`/`rol` metadata for profile
  assignment, does not create memberships, and swallows all exceptions. No profile
  or bureau trigger was found that repairs that omission. Registration hardening
  and trusted membership reconciliation remain separate work.
- Deployed invite-user v6 validates the caller with Auth getUser, but can fall back
  to editable profile `buro_id/rol` for authorization. Its code was inspected
  read-only; no invitation was sent. JWT verification is disabled at the gateway,
  with manual token verification in the body; settings were NOT changed.
- Invite-user passes `buro_id` metadata, whereas the signup trigger reads
  `firm_id`. A new invite can take the new-office branch before the service
  upserts its profile, leaving legacy firm/bureau fields inconsistent. The
  inspected callback only exchanges the session code; it does not activate
  pending `davet_gonderildi` membership. Trusted invitation acceptance must be
  implemented/verified instead of broadly activating historical pending rows.

## Candidate Corrections

`20261014143113_platform_admin_access_hardening.sql`:

- Public predicate names/signatures remain compatible, now SECURITY INVOKER.
- Private definer helpers in `lexbase_security` only answer whether the current
  identity appears in the registry; empty search paths and explicit permissions.
- Anonymous predicate calls safely return false, preserving RLS evaluation.
- Bootstrap only acknowledges an already provisioned current administrator;
  it never inserts, promotes, or changes registry rows.
- Registry rules use nonrecursive helpers. Only super admins can provision,
  update or delete others; self-delete is denied. Trusted server provisioning
  remains possible. Removing/demoting the last super admin is NOT fully guarded
  by this packet; avoid that operation and review it separately.
- Revoke anonymous registry privileges and browser TRUNCATE/REFERENCES/TRIGGER.
- Reject unexpected predicate source, missing RLS or changed policy inventory.
  This guard is not a fingerprint of every existing function/policy expression;
  capture and review the full preflight snapshot before application.

Invite source candidate additionally uses active membership only, scopes explicit
selected bureau, rejects ambiguous older multi-bureau requests, and restricts
privileged role assignment/reactivation to owners. Older clients with exactly one
eligible bureau remain compatible. Both current caller forms send the bureau ID.
Reactivation checks bureau/state/role and confirms a row before reporting success.
This Edge Function is NOT deployed; legacy profile-only callers will be denied
and must be reconciled from trusted evidence, not automatically elevated.

## Release Order and Gates

1. Confirm the existing administrator accounts with the owner. Do not publish
   names/emails/auth IDs into Git history or PR comments.
2. Capture function definitions, policy definitions and grants privately;
   compare fresh metadata with the reviewed candidate. Record a DB security
   release separately from the frontend app version. Do not imply a web version
   bump without deploying a verified frontend.
   A read-only preflight snapshot is stored at
   `/private/tmp/lexbase-security-preflight-20261014.json` (mode 600), without
   customer rows, emails or tokens. Deployed invite source v6 is preserved at
   `/private/tmp/lexbase-invite-user-live-v6.ts` (mode 600). Refresh both before an
   actual rollout; temporary files are not a durable rollback archive and the
   insecure definitions must never be restored wholesale.
3. Verify real Supabase Auth/staging: normal member, super admin, revoked user,
   bureau switching, signup and invitation. Current local tests use synthetic
   identities and do not establish real Auth/email delivery compatibility.
4. Apply only reviewed membership and platform-admin security migrations, not
   the entire pending finance migration directory. Source/function grants and
   postflight diagnostics must match; preserve existing admin/tenant counts.
5. Do not blindly deploy the local invite function over v6: review the full diff
   against its retrieved source, package the imported authorization.ts file,
   validate Deno/runtime behavior and reconcile profile-only legacy callers.
   No local Deno runtime is currently available; full handler validation is open.
6. Check normal-member read denial across bureaus and legitimate own-bureau reads
   through Auth/PostgREST, admin UI read paths (without triggering auto-provision),
   and a controlled invitation only to an agreed test recipient.
7. Publish dated security notes with exact DB/Edge versions and postflight evidence.
   The broader frontend release remains blocked by source parity and accounting
   gates. Finance/onboarding/role correctness is NOT certified by this packet.

## Recovery

Never restore the unconditional public membership rule, any-auth-user admin
predicate or self-provisioning bootstrap. Never open registry writes to ordinary
users to recover a UI issue. Use trusted server/operator access to repair only a
confirmed administrator or a specific compatible function/grant, preserving an
audit trail. Current admin rows are not removed by the migration.

## Local Verification

```sh
node supabase/tests/run_platform_admin_fixtures.mjs /private/tmp/lexbase-pg-fixture/node_modules/@electric-sql/pglite/dist/index.js
```

38 assertions passed: cross-bureau admin-policy bypass and bootstrap reproduction,
ordinary/anonymous denial after correction, existing admin preservation, super
management, retained tenant-policy access, server access, idempotence and drift checks. Read-only diagnostics:
`supabase/tests/platform_admin_security_diagnostics.sql`.

The invite authorization helper has six Node tests and an independent strict
TypeScript check. These do not send emails or execute the deployed handler.

## Other Security Work Still Open

Profile INSERT/UPDATE permissions, profile-based legacy enforcement policies,
staff-to-membership trigger authority, arbitrary bureau metadata edits, approval
decision rules and recipient inbox permissions require separate restriction and
tests. Fixing membership and admin predicates reduces critical exposure but is
not a claim that every tenant/role boundary is now secure.
