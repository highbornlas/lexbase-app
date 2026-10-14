# Finance Development

## Sources

- Shared numeric and SMM calculations: `lib/utils/finans.ts`.
- Income classification: `lib/finans/gelirKurallari.ts`.
- Client grouping: `lib/finans/dosyaGruplari.ts`.
- Server summary queries: `lib/hooks/useFinans.ts`.
- Case mutations: `lib/hooks/useDavalar.ts`, `lib/hooks/useIcra.ts`.
- Collection form: `components/modules/TahsilatModal.tsx`.

## Invariants

- Transfer and refund movements are excluded from income summaries.
- General collections retain the existing income classification. Whether they
  include client-held funds is an unresolved product rule.
- Do not add legacy `tahsilEdildi` to an existing `tahsilatlar` total.
- Case mutations invalidate both case queries and finance summaries.
- A collection form closes and clears its draft only after a successful save.
- Prefer the server profit/loss summary. Load fallback module queries only when
  that summary is unavailable; never show a partial fallback as a complete total.
- Preserve existing numeric normalization and non-receipted tax normalization.

## Verification

Use Node.js 22.18 or newer for the TypeScript-backed Node tests:

```sh
node --test lib/finans/*.test.mjs
npx tsc --noEmit --incremental false
npm run build
```

These tests do not replace browser checks of save failures, duplicate submissions,
draft recovery, bureau switching, or production RPC calculations.
