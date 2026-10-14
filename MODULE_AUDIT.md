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
| Reports | Production | Missing notice income, different mediation source, deleted cases included | Pending accounting decisions |

## Product Direction

- Keep existing case/client links in tasks/calendar; improve usability rather
  than adding a second linkage system.
- Combine expense/advance summaries after defining money ownership.
- Make totals traceable to their movements instead of adding duplicate KPIs.
- Prioritize existing deadlines, owners and tasks in the dashboard; avoid
  generating unverified legal advice or deadlines.
- Replace nonfunctional support controls with a real submission flow.
- Preserve historical accounting separately from active-work lists; archive
  behavior awaits the product decision in ROADMAP.md.

## Browser Status

An unauthenticated /dashboard request redirected to the landing page.
Internal desktop/mobile browser checks require a signed-in session.
Dashboard, clients, cases, documents, tasks/calendar, team/approvals, toolbox and
support remain in the review queue. Source review is not browser verification.
