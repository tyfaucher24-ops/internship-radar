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

## 1b. Data after (2026-11-04, ~11:50 AM EST): no real after numbers yet
- Sync 41862152913 sat in "queued" behind a GitHub Actions/Pages incident and ended **cancelled**; it never ran. A new sync (41867996183) is dispatched with the V18 code and is queued. The live data is still from the last good sync (41847190787, 9:24 AM EST).
- So there are **no measured after numbers**. The only after view is an offline run of the V18 pass on that live data (not published): 82 leads hidden as copies of ATS rows, 606 shortener leads swapped for direct links, 351 seasons added, 1,269 categories fixed (Other 15.3% → 6.2%), 43 closed for past terms, 1,737 marked "Check date unknown" (left out of Open by default, so the Open count will drop by about that much). Fields that need network checks (last_verified, descriptions, deadlines) can only move in a real run.

## 2. Speed (live Lighthouse CLI, build dfd25eaea4, which is pre-V18 code)
| Run | Mobile perf | Mobile LCP | Desktop perf | Desktop LCP |
|---|---|---|---|---|
| 10:54 AM | 84 | 3.5 s | 99 | 0.7 s |
| 11:00 AM ×2 | 98 / 95 | 1.5 / 1.4 s | | |
| 11:48 AM ×3 / ×2 | 76 / 93 / 94 | 3.4 / 1.4 / 1.5 s | 100 / 99 | 0.8 / 0.7 s |
- Script transfer about 220 KB gzipped (target <250 KB: met). Median mobile is 93–94 and desktop is 99–100, but **cold runs (76, 84) miss the ≥90 / LCP <1.8 s targets.** I did not bundle or lazy-load the scripts in V18. That is still open work: about 33 deferred scripts, with app.js about 0.9 s scripting on a throttled phone.

## 3. Domain safety (checked)
- index.html has exactly one canonical tag. The new company/category pages (data/seo/, made on every sync) and their sitemap take the base URL from that tag. They have no hard-coded domain, so they need no FILES entry. The new sitemap-home.xml is in ops/set_domain.py FILES.
- In a scratch copy I ran set_domain.py example-test.dev and then --github: it ran cleanly and the copy ended with no changes. CNAME is not in .gitignore, and the Pages rsync excludes only .git/.github/screenshots/test-data/pipeline/cache, so CNAME survives the deploy.
