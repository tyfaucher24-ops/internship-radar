# V18 report (Launch Perfect)
Status: V18 live, build eb77fe6b68 (verified via live version.json; data sync 41872603460 published). See ops/V18_PROGRESS.md for the running log.

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

## 1b. Data after: REAL (sync 41872603460 with V18 code, success, data updated 11:57 AM EST; live build eb77fe6b68 verified 1:06 PM EST)
Same script, same file type (live data/listings.json), counting rows not hidden. Raw: ops/qa/v18-after-visible.json and v18-after-all.json.
| Measure | Before (10:47 AM) | After (11:57 AM) | Change |
|---|---|---|---|
| Open listings (not hidden) | 13,463 | 13,372 | −91 |
| …shown by default (excludes "Check date unknown") | 13,463 | 12,243 | −1,220 (flagged rows sit behind the Include unchecked toggle) |
| No `last_verified` | 1,478 | 1,021 | −457 |
| Verified within 24 h | 11,882 | 12,255 | +373 |
| `has_desc` false | 2,806 | 2,311 | −495 |
| Duplicate rows (my key) | 5 | 4 | −1 |
| `apply_kind` none | 1,443 | 943 | −500 |
| No `apply_ok_at` | 8,889 | 9,607 | **+718 (worse)**: new direct links swapped in for shorteners don't have a link check yet. They get one on the next daily link check. |
| With a deadline | 2,020 | 2,055 | +35 |
| No season | 7,392 | 6,970 | −422 |
| Category "Other" | 2,089 | 832 | −1,257 (15.5% → 6.2%) |
| No locations (incl. remote) | 440 | 437 | −3 |
- The sync ran 49 min (duration_s 2945), up from about 18 min. That is still inside the 75-min step limit, but it's worth watching.
- SEO pages are live: data/seo/index.html returns 200.

## 2. Speed (live Lighthouse CLI, mobile = default simulated Moto G / slow 4G; every run is a fresh Chrome profile, empty cache)
Before (build dfd25eaea4, pre-V18): cold mobile 76 and 84, LCP 3.4 to 3.5 s. Desktop 99 to 100.

After (build eb77fe6b68, live; raw JSON in ops/qa/v18-final/), 3 cold mobile runs:
| Run | 1 | 2 | 3 | Median | Worst |
|---|---|---|---|---|---|
| Perf | 95 | 91 | 95 | **95** | 91 |
| LCP | 1.52 s | 1.73 s | 1.53 s | **1.53 s** | 1.73 s |
| TBT | 251 | 366 | 254 ms | 254 ms | 366 ms |
| A11y | 100 | 100 | 100 | 100 | 100 |

Desktop ×2: perf 99 / 99, LCP 0.74 / 0.75 s, TBT 4 / 0 ms, a11y 100.
Supplementary: 5 more cold mobile runs on the same build (ops/qa/v18-lighthouse-live.jsonl, fin_*): perf 98/92/92/95/88 (median 92, worst 88), LCP median 1.53 s, worst 1.75 s. A slow-4G run can still land at 88.
- What changed: index.html loads boot.js (sync, theme) plus store, listing and loader (defer). The other 31 scripts load in their old order after the hero has painted, which removed the 2.06 s LCP render delay. 790f7ce splits boot() with yields and memoises days().
- **Target met:** median 95 (≥90) and LCP 1.53 s (<1.8 s).
- JS on the start page: 213.6 KB gzipped total, all 36 files including data-worker (target under 250 KB: met).

## Part 9 final status (live = build eb77fe6b68)
| Check | Result |
|---|---|
| test_v15_pipeline | 31/31 pass |
| test_v16_launch (LIVE) | 129/129 pass |
| test_v16_live_auth | skips cleanly (no test accounts set) |
| test_v16_rls (local Postgres 17) | 34/34 pass |
| test_v16_feedback_rls | 33/33 pass |
| V17 SQL test | 35/35 pass |
| axe (LIVE) | 0 violations across 40 views |
| test_v18_flows (LIVE) | 7/7 pass |
| test_v17_ui (LIVE) | 55/55 pass |
| Google sign-in tests (local) | 116/116 pass |

## 3. Domain safety (checked)
- index.html has exactly one canonical tag. The new company/category pages (data/seo/, made on every sync) and their sitemap take the base URL from that tag. They have no hard-coded domain, so they need no FILES entry. The new sitemap-home.xml is in ops/set_domain.py FILES.
- In a scratch copy I ran set_domain.py example-test.dev and then --github: it ran cleanly and the copy ended with no changes. CNAME is not in .gitignore, and the Pages rsync excludes only .git/.github/screenshots/test-data/pipeline/cache, so CNAME survives the deploy.
