# Module Audit

Evidence labels: source, production database, browser observation, proposal.
Proposals are not implemented functionality.

| Area | Evidence | Finding | Status |
| --- | --- | --- | --- |
| Finance RPCs | Production | Six anonymous privileged entry points lacked bureau checks | Live guard and access tests passed |
| Notice archive | Source | Archive hook filtered an already archive-excluding list | Fixed in branch |
| Consulting / mediation | Source | Failed reads could cause empty upserts during status changes | Scoped, fail-closed updates; tests passed |
| Finance refresh | Source | Service mutations did not refresh summary/detail caches | Fixed in branch |
| Support | Source | Submit button has no handler; telephone is a placeholder | Pending redesign |
| Support | Source / project metadata | Turkish storage claim conflicts with eu-central-1 | Content correction pending |
| Support | Source | App Store / Play Store release claims lack verified evidence | Release verification pending |
| Reports | Production | Missing notice income, different mediation source, deleted cases included | Rules confirmed; backend parity pending |
| Collections | Source | Client funds could inflate fee totals; service payments used inconsistent sources | Frontend classification and service normalization fixed in branch |
| Client fees | Source | Form closed before save confirmation; new records lacked fee type | Async save, failure retention and explicit fee type fixed in branch |
| Dashboard | Browser | Many empty widgets; advance client count differs from active count; unresolved client names | Data linkage and prioritization review pending |
| Case loading | Browser | Temporary zero/empty list and not-found detail before data appears | Loading-state fixes pending |
| Release | Browser / source | Live payment form has changes absent from GitHub, Desktop source and ZIP | No frontend deployment until reconciliation |
| Enforcement payments | Live asset / Worker | Separate debtor, percentage-share and statutory-fee choices missing in GitHub | Choices and legacy storage mapping restored in branch; full source gate remains |
| Client drawer | Source | Explicit movements and legacy flat collections were added together; client money reduced fee dues | Shared fee/collection calculations in branch; fixtures passed |
| Enforcement cover sheet | Source | All movement types, including fees and transfers, reduced debtor debt | Explicit debtor-payment subtotal shared with detail view; refund/source allocation remains pending |
| Agreements | Source / production definitions | Percentage and mixed fee models calculated differently across views | Shared frontend formulas and precedence tests in branch |
| Summary RPC parity | Isolated production-function clones | Office income 2500 vs 2800, agreement 3000 vs 5000, fee collection 12800 vs 2000 in synthetic fixture | Reproduced; live calculation changes pending |

## Product Direction

- Keep existing case/client links in tasks/calendar; improve usability rather
  than adding a second linkage system.
- Combine expense/advance summaries after defining money ownership.
- Make totals traceable to their movements instead of adding duplicate KPIs.
- Prioritize existing deadlines, owners and tasks in the dashboard; avoid
  generating unverified legal advice or deadlines.
- Replace nonfunctional support controls with a real submission flow.
- Preserve historical accounting separately from active-work lists; the user
  confirmed that archives remain in financial reports.

## Browser Status

A signed-in Chrome session was used to inspect dashboard, finance, case list,
case detail and the collection form without submitting or changing live data.
The live form labels differ from the available source. Client workflows,
documents, tasks/calendar, team/approvals, toolbox, support and mobile checks
remain in the review queue. Source review is not browser verification.
