# Icra module pilot

Local candidate, 2026-11-02. Baseline: `2a65fea` (release 2.3.2).
This pilot does not change financial or legal rules, the database, or the live release.

## Read only the relevant boundary

- `app/(app)/icra/[id]/page.tsx`: detail orchestration, active tab, mutations and modal visibility. Reduced from 1,940 to about 564 lines.
- `components/modules/icra/detay/`: individual detail tabs and sections. `OzetTab` is eager; inactive tabs and heavy panels are dynamic imports.
- `components/modules/icra/detay/DetailUi.tsx`: shared presentational helpers, not business rules.
- `components/modules/IcraModal.tsx`: form orchestration and first two steps. Reduced from 1,052 to about 630 lines.
- `components/modules/icra/form/AlacakKalemleriAdim.tsx`: deferred third step, claim entry and existing interest calculation behavior.
- `lib/finans/icraDetay.ts`: pure detail summary calculations and related-record visibility, delegating to existing finance helpers.

For a tab-only change, start with that tab, not the full page or modal. For finance changes, inspect the shared finance rules and their tests before adding another calculation. Continue using the existing bureau-scoped query hooks. Splitting files is not itself a reduction in total source size or measured token billing.

## Measured production bundle

Fresh production webpack builds, same public build configuration:

| Page client-boundary static JavaScript | Before | After |
| --- | ---: | ---: |
| Unique chunks | 17 | 8 |
| Raw bytes | 656,937 | 327,599 |
| Gzip bytes | 172,681 | 88,781 |

Gzip reduction: 48.6%. These are page-boundary static dependencies, not the entire application payload. Async tabs, framework/layout-only chunks and CSS are excluded. This is not an LCP, INP, network transfer, or page-load timing measurement.

The detail page now requests its related client and case by ID instead of loading both complete lists. Existing hooks retain bureau scoping. Sidebar/global-search queries were not changed or profiled; dependent requests may still wait for the case record.

Reproduce from `lexbase-app`, with the usual public build environment configured:

```sh
npm run build
node scripts/measure-client-route.mjs
npm test
```

Measurements are in `tests/ui/icra-baseline-bundle.json` and `tests/ui/icra-candidate-bundle.json`.

## Verification and limits

- 123 automated tests pass, including 21 original-versus-extracted HTML snapshots, four detail-finance cases and one source-boundary assertion.
- Production build and TypeScript checks pass.
- Local browser fixture verified note creation, agreement save, payment-plan creation, and claim creation/editing. A 1,000 / 3 payment plan retained the final-cent remainder.
- The fixture uses the real extracted components and synthetic in-memory records, not Supabase persistence or full application navigation. Its CSS is test styling, not a visual redesign.
- HTML hashes preserve initial rendered markup for selected populated/empty cases; they do not prove every interaction or error path.
- Existing form `set-state-in-effect` lint errors remain: initialization in the outer modal and interest synchronization in the extracted step. Both were verified in the baseline. Do not suppress them or alter interest behavior merely to make lint green; address them with focused form-state tests.
- Existing asynchronous save-failure handling, full authenticated end-to-end tests, and runtime Core Web Vitals remain separate follow-up work. This pilot is not a claim that all modules are defect-free.

The browser fixture can be started with `node scripts/icra-detail-ui-fixture.mjs`; it binds localhost and does not write application data.
