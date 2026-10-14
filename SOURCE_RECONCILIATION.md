# Live Source Reconciliation

Read-only investigation on 2026-10-14. No frontend deployment was performed.

## Verified Production Identity

- Both lexbase.app/* and www.lexbase.app/* route to Worker lexbase-app.
- Deployment d93d1724-66cb-4ce6-954a-00814930b17d serves version
  c9c1b4da-8879-4c1e-a3e0-e2550d07cfee at 100 percent.
- Version number 210 was uploaded with Wrangler. Deployment timestamp:
  2026-03-23T01:20:08.103154Z (04:20 Istanbul).
- Cloudflare reports 213 deployment records. A Git commit is not recorded in
  the inspected deployment annotations; do not infer an exact source revision.

## Confirmed Missing Behavior

The public live asset /_next/static/chunks/3825-404042fe6542b630.js and the
Worker script both contain the same payment form behavior. This is not merely
a stale browser tab. JavaScript Unicode/hex escapes must be decoded when
comparing the Turkish labels.

Public asset SHA-256:
4a58308f25461c3b6b5a934fa0e4ca2d35d5607e20091f2a373502f61d6c94ac

Live payment form differences from GitHub main:

- Separate enforcement and case payment choices.
- Enforcement debtor payment, contractual fee, percentage share, statutory
  enforcement fee, transfer and refund choices.
- Debtor payment is displayed as borclu_odeme, but written as tahsilat.
- Enforcement statutory fee is described as a fee collected from the opposing
  party, not the client's contractual fee payment.
- Payment-specific title and labels, and income/outflow help text.

The branch restores the payment choices, titles and debtor payment storage
convention while retaining the new save/draft protections. It also stops
statutory enforcement fees from reducing contractual client dues.

This is a targeted reconstruction from observed runtime behavior, not recovery
of the original full source. No historical payment types were rewritten.

## Source Search And Remaining Gate

Desktop/Lexbase/EMD-hukuk-main, Lexbase.zip, remote branches/history and the
project-specific local Claude records did not yield the missing original form.
The former Documents/GitHub/EMD-hukuk directory no longer exists at that path.
The Worker response references worker.js.map but does not include that map.

Before frontend publication, audit other module runtime differences or recover
the original post-March-22 source. A full application release is not justified
by resolving one modal. Preserve production deployment/version identifiers as
rollback evidence and do not modify existing credentials or connections.

## Financial Semantics Still Requiring Care

- hakediş means percentage share in enforcement and opposing fee in the case
  form. Do not apply a single contractual-dues rule to both without context.
- A direct fee receipt and a fee offset from held client money are different
  movements. Existing fee types alone do not identify their payment source.
- Frontend fixes do not establish parity with the production SQL summaries.
