# LexBase Releases

Every successful production code release gets a newer semantic version and
user-facing notes. Preparation is not publication. Failed deploy retries reuse
the prepared version until that version is actually live.

## Single Source

- `lexbase-app/package.json`: authoritative application version.
- `lexbase-app/lib/release-history.json`: dated public history and unpublished
  draft notes. Draft notes are never rendered to users.
- `lexbase-app/lib/version.ts`: shared exports for app/admin/landing views.
- `/api/version`: public, non-cached version/date only; no account information.

## Before A Production Release

Complete the source/accounting compatibility gates in ROADMAP.md first. Review
the draft notes so they describe only the work included in this release.

From `lexbase-app`:

```sh
npm run release:prepare -- patch
npm run release:check
npm test
npm run build
```

Use `minor` for new capabilities and `major` for breaking changes. Explicit
notes may be passed as individual quoted arguments after the bump type.
Preparation updates package.json, both root lockfile versions and the release
history together; it does not change dependencies, credentials, Git commits or
production. The date is calculated in Europe/Istanbul.

Review/commit the three changed release files before the production branch is
updated. Current source remains 2.3.0 until a real release is prepared; the
first patch release from this baseline will be 2.3.1.

## Publication And Verification

Keep the existing `npm run deploy` flow. Its predeploy hook validates metadata
and requires a version greater than the version returned by the live site.
GitHub deployment also checks metadata and runs regression tests first.
Do not bypass these checks by invoking Wrangler/OpenNext deploy directly.

The existing site lacks /api/version. Only the first prepared release directly
following the recorded 2.3.0 baseline may bridge a 404. Later missing endpoints,
invalid JSON, redirects, timeouts or HTTP errors stop deployment instead of
guessing. The live-version check is a preflight, not a deployment lock; serialize
production deployments and verify the result before starting the next one.

After successful deployment, verify the expected version/date at /api/version,
the sidebar/footer/admin indicators, and the current release in the update-notes
modal. Record the Cloudflare deployment identity and run the release's business
smoke checks. Announce the release only after these checks pass.

If a deployment fails before becoming live, retry the same prepared release,
not another version bump. If it is unclear whether it became live, inspect
Cloudflare and /api/version first. A rollback restores an existing deployment
and therefore its original version; document it as a rollback, not a new release.

## Collaboration

These commands can be used by Codex, Claude or a human without changing existing
Cloudflare/Supabase/GitHub credentials. Both agents should follow the same
preparation and verification steps. No automatic Git commit or token mutation
is performed by the release scripts.

Node 22.18 or newer is required for the TypeScript-backed regression tests.
