# V18 report (Launch Perfect)
Status: in progress. See ops/V18_PROGRESS.md for the running log.

## 1. Data accuracy: baseline (Radar, measured on live data 2026-11-04)
| Measure | Baseline |
|---|---|
| Open listings | 13,746 |
| No `last_verified` | 1,626 |
| `has_desc` false | 3,024 |
| Duplicate rows (company+title+location) | 151 rows across 149 groups |
| No `apply_ok_at` | 9,125 |
| `apply_kind` none | 1,598 |
| With a deadline | 2,028 |
| No season | 7,594 |
| Category "Other" | 2,108 |
| No locations | 443 |

My re-measure of the same live file (10:47 AM EST, `ops/v18_measure.py`, counting hidden rows as Radar did) matches every number except duplicates:
my key (company, title, first city, state, normalized) finds 236 extra rows in 234 groups; Radar's key differed. Excluding hidden rows: 13,463 open shown.
Raw: ops/qa/v18-before-all.json, ops/qa/v18-before-visible.json. After numbers use the same script.
