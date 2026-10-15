# Database Security Releases

## DB-SEC-2026.10.15.1

Applied 2026-10-15, approximately 20:45-20:48 Europe/Istanbul, to project
`omsahlgcuinyfvcuigfj`. Frontend remains **2.3.0**. No frontend or Edge Function
was deployed. No credentials, OAuth settings or Claude configuration were changed.

### Changes

- `20261014143113_platform_admin_access_hardening`: platform-admin checks now
  require an existing registry entry; bootstrap cannot self-provision an admin.
  Nonrecursive registry policies and restricted browser privileges are active.
- `20261014140314_membership_service_policy_scope`: the unconditional membership
  policy now applies only to `service_role`. Anonymous membership privileges and
  browser TRUNCATE/REFERENCES/TRIGGER grants were removed.

### Application And Evidence

The connector's earlier write-confirmation failure was not repaired or bypassed
by disabling confirmations. The owner signed into the Supabase Dashboard, and
the reviewed SQL was run through its visible SQL Editor. Each correction first
passed a live transaction ending in ROLLBACK. Permanent application included its
exact migration source and history entry in one transaction, with lock and
statement timeouts and before-commit assertions.

Independent connector readback confirmed migration history and source hashes:

| Migration | MD5 of saved source |
| --- | --- |
| `20261014143113` | `bfdb29e1166096252eb9782a97975037` |
| `20261014140314` | `85d7252a05ee4e8be6c192f5d5a8aaf5` |

All three super administrators and all 37 memberships remained (36 active,
one inactive at preflight). No customer or membership row was intentionally
inserted, updated or deleted by this release. The transactions checked ordinary
identity denial, retained super access, outsider membership denial and an existing
active non-admin member's own-row visibility. These SQL role/claim checks are not
real sign-in, JWT issuance, email delivery or a complete tenant-isolation test.
Local suites also passed: 38 admin assertions and 23 membership assertions.
The checked-in read-only `supabase/tests/security_release_postflight.sql` returned
11/11 passing checks against production after both migrations were committed.

Signed-in Chrome finance reloaded and returned the synthetic case/fee totals.
The team screen rendered its empty state; this does not verify invitation delivery
or visibility of a populated team. The existing signed-in super administrator also
opened the admin dashboard and its platform statistics successfully after both
corrections. Existing accounting inconsistencies remain.

Private preflight snapshots (0600, outside the managed Git checkout):

- `/Users/enes/Desktop/Lexbase/EMD-hukuk-main/lexbase-admin-security-preflight-20261015-2043.private.json`
- `/Users/enes/Desktop/Lexbase/EMD-hukuk-main/lexbase-membership-preflight-20261015-2045.private.json`

Admin success screenshot: `/private/tmp/lexbase-admin-security-applied-20261015.png`.
The SQL Editor retains private test snippets; existing snippets were not replaced.
One attempt to reuse the virtualized editor produced a syntax error before the
membership test. A separate blank snippet then passed; independent history hashes
and readback above verify the applied sources, not the failed editor buffer.

### Remaining Gates

This bounded release is not an all-clear security audit. Profile/onboarding
authority, staff synchronization, approvals, other RPC grants and complete
Auth/PostgREST role/bureau-switch tests remain open. Finance candidates, invitation
Edge changes and frontend source reconciliation are still unreleased.

Post-release advisor review found 2 no-policy RLS notices, 34 mutable function
search paths, one public extension, 42 anonymous and 48 authenticated definer-call
warnings, plus disabled leaked-password protection. Warnings require individual
review: an executable definer function is not automatically an exploitable path.
Do not bulk-revoke functions or move extensions without dependency tests.
See [function privilege review](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
and [search-path guidance](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).

Recovery must never reopen the public membership rule or self-provisioning
bootstrap. Repair confirmed legitimate workflows through narrowly authorized
server operations rather than restoring insecure preflight definitions wholesale.
