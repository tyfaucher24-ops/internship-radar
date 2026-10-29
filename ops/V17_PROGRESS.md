# V16.3 / V17 progress (resume note)
Updated: 2026-10-29 3:05 PM EDT

## V16.3
- Done: 472f108, 60113d4, e181a56 (sync fix, linkcheck, sync5.yml, deadlink sample). Before sample: ops/qa/v16.3/deadlinks-before.json (0.37% dead, 1/270 decided).
- Run 40920333313: sync OK (Workday fetched) but QA collapse guard failed (1660 removed of ~13k = catch-up of 3 days of stale Workday). Last good data kept.
- Fix 7d2513b: guard ignores removals of ATS listings unconfirmed 48h+ (25% hard cap kept). Tested locally (stale -> pass, fresh -> collapse).
- Run 40930921959 (dispatched 2:27 PM EDT): IN PROGRESS. Next: verify success, Workday last_verified = today, `python3 ops/deadlink_sample.py after`, commit ops/qa/v16.3/deadlinks-after.json, confirm live.

## V17 (all items built, live build 90c55328b5)
1. SQL 0005 + tests (bc2c646) - 35/35 on embedded PG17
2. Frontend email settings + events + #admin/stats (e5da04e) - UI 55/55
3. Email job ops/email/send_alerts.py + matches.js + unit tests 27/27 + ops/workflows/email-alerts.yml (e645557)
4. Screenshots ops/screens/v17/ (53248c2)
5. supabase/v17_paste.sql (3730291)
6. v17.css folded into site.css (7f86c84); regressions all pass
7. CHANGELOG V17 (dab2e17); live verified (#admin/stats Not found for guests, email box present, no JS errors)
Remaining: only the V16.3 "after" sample. No emails sent.
