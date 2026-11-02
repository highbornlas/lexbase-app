# Historical Client Cash Reconciliation

Read-only production classification, 2026-10-14. No records were changed.

| Source | File expenses without matching cash ID | No same-case/client/date/amount candidate | Unverified client link |
| --- | ---: | ---: | ---: |
| Cases | 174 | 174 | 8 |
| Enforcement | 75 | 75 | 3 |
| Total | 249 | 249 | 11 |

All 249 expenses had a nonempty ID, a nonempty date and a positive parsable amount. These checks do not establish complete business correctness, date validity or reimbursement status.

The one previously reported unmatched linked cash movement belongs to a soft-deleted case. It is not evidence of a duplicated expense or a physically missing case.

The initial matched-ID diagnostic found no client/date/amount mismatch and no duplicate expense-ID groups. The context comparison above checks only explicit case links; it cannot rule out general cash entries, legacy flat advances or reimbursements recorded outside the cash table.

## Safe Resolution

1. Keep historical data unchanged while reviewing each client's opening cash balance and existing reimbursements.
2. Resolve unverified client links first. Empty or stale IDs do not prove that a client was permanently deleted. Explicit `_eskiMuvId` markers may be repaired when that client is restored; never infer a client from amount/date alone.
3. Produce an ID-based preview of proposed links/imports with previous and proposed balances, before any backfill.
4. Require an explicit review of historical reimbursement/opening-balance assumptions before committing that preview. Importing all 249 costs automatically could falsely create new receivables.
5. Re-run diagnostics after an approved transactional backfill and compare case/client/cash/office reports.

The current cash table is not a verified complete ledger for historical file expenses. Do not treat its displayed expense deficit as a newly confirmed debt without reconciliation.
