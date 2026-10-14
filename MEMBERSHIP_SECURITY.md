# Membership Security Candidate

Status: prepared and locally tested, NOT applied to production.

## Confirmed 2026-10-14

Read-only production metadata shows `uyelikler` has RLS enabled, but
`service_role_full_access` is an ALL policy TO PUBLIC with USING/WITH CHECK true.
Both anon and authenticated also have row-operation and TRUNCATE grants.
Permissive policies combine with OR, so manager/self policies do not narrow this
unconditional policy. Membership helpers and the finance access guard trust
active rows in this table. Forging an active membership can therefore undermine
bureau isolation. No production exploit or customer-row mutation was attempted.

The fixture copies these policies and membership helpers into isolated PGlite.
It reproduces anonymous disclosure and forged membership access, then runs the
actual candidate migration. Tests use synthetic identities, not real JWTs.

## Minimal Correction

- Restrict only the existing unconditional policy to service_role.
- Revoke PUBLIC/anon membership table privileges.
- Revoke authenticated TRUNCATE, REFERENCES and TRIGGER, retain ordinary DML
  subject to existing manager/self/platform-admin RLS.
- Reject a missing/changed policy or disabled RLS rather than guessing.
- Preserve server credentials, auth settings and existing membership rows.

The file is idempotent. It does not broaden finance table permissions, replace
the manager hierarchy, or fix unrelated permissive policies. Do not roll back
by reopening the unconditional public policy. Repair a legitimate workflow with
a narrowly authorized server operation instead.

## Release Gates

- Real Supabase Auth/staging checks: outsider/member/manager/platform admin,
  multiple bureaus, revoked membership, invitation and bureau switching.
- `useOnay.ts` currently reads other managers' membership auth_ids to send
  notifications from the browser. A regular member will no longer see those rows
  with the existing self-only SELECT policy. Move recipient lookup/delivery to
  an authorized server operation before coordinated publication; do NOT restore
  broad membership reads just to make notifications work.
- Review registration/bootstrap paths and server-owned onboarding functions;
  this packet does not prove their full compatibility.
- Audit `kullanicilar_insert`, `ip_loglari` insertion, license visibility,
  platform-admin bootstrap and inherited role/table grants separately.
- Run `supabase/tests/membership_security_diagnostics.sql` before/after an
  approved security-only rollout. Expected: service policy `{service_role}`,
  anon SELECT/INSERT/TRUNCATE false, authenticated TRUNCATE false, server DML true.
- This security fix is higher priority than the accounting/frontend release;
  source parity blocks the latter, not inherently a reviewed isolated DB fix.

## Verification

```sh
node supabase/tests/run_membership_security_fixtures.mjs /private/tmp/lexbase-pg-fixture/node_modules/@electric-sql/pglite/dist/index.js
```

23 assertions passed: exploit reproduction, denial after fix, preserved team
management/server invite, inactive-member denial, idempotence, drift rejection,
disabled-RLS and missing-policy rejection.
This is real PostgreSQL policy evaluation in an isolated database, not a live
PostgREST/Auth test. The platform-admin predicate is stubbed false; platform-admin
behavior remains an explicit staging gate.
