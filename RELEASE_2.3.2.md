# Release 2.3.2 - 2026-11-02

## Deployment Topology

GitHub Application CI validates release metadata, runs regression tests and
builds the production Worker. It has read-only repository permissions and no
Cloudflare deploy token. Cloudflare Workers Builds is the automatic publisher.
Existing API tokens and Git repository access are reused, not rotated.

Canonical production Worker: lexbase-app (tag 4ad9d59045364cc19a46e22728f61b83).
Root: lexbase-app. Build: npm test. Deploy: npm run deploy.
Only main and application/workflow changes should trigger production builds.
The existing release gate requires a newer version than the live site.

Legacy Worker: lexbase (tag 455cc4415ef94e01b24d2f4cc503d9a4).
Its existing non-main trigger f93454b7-b90d-45d9-a736-b6d22b69beb8 now runs tests
and the full Worker build from lexbase-app, then validates metadata without
uploading or deploying. The legacy production trigger is not changed until
the canonical publishing path is verified. The repository connection is
retained; GitHub repository ID 1174351811 confirms the old EMD-hukuk label
refers to the current highbornlas/lexbase-app repository.

Before this change both legacy triggers ran from / with no build command;
non-main ran npx wrangler versions upload, main ran npx wrangler deploy.
They failed because the repository root has no Worker entry point.

## Recovery

Pre-release live Worker version: 6472479c-4da6-4039-8f60-9744b091ba7a,
deployment 44c52045-dbe7-4182-87fa-98acf1908ea6 (2.3.1).
Rollback can restore this version without rotating any credentials. Do not
enable competing deployment commands in GitHub Actions or the legacy Worker.

## Verification

Publication IDs and check results will be recorded only after verification.
