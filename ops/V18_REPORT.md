# V18 report (Launch Perfect)
Status: V18 live (build 49e4a31a7f, data sync 2026-11-04 16:57Z published); after numbers measured below. See ops/V18_PROGRESS.md for the running log.

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

After (build 49e4a31a7f, loader.js, verified live 11:50 AM EST), 5 cold mobile runs:
| Run | 1 | 2 | 3 | 4 | 5 | Median | Worst |
|---|---|---|---|---|---|---|---|
| Perf | 88 | 93 | 87 | 92 | 87 | **88** | 87 |
| LCP | 1.8 s | 1.5 s | 1.8 s | 1.5 s | 1.8 s | **1.8 s** | 1.8 s (1,814 ms) |
| TBT | 430 | 300 | 460 | 330 | 490 ms | 430 ms | 490 ms |

Desktop ×3: 99 / 99 / 99, LCP 0.7 to 0.8 s, CLS about 0.065.
- What changed: index.html now loads boot.js (sync, theme) plus store, listing and loader (defer). The other 31 scripts load in their old order once the hero image has loaded and painted. LCP render delay was 2.06 s and is now gone, so LCP went from 3.4 s to 1.5 to 1.8 s.
- **Target not fully met:** median 88 (target ≥90), LCP 1.8 s (target under 1.8). The rest of the score is TBT. The biggest single task is the first list render (update(): filter, count and sort about 10.7k listings, about 300 ms on a 4×-throttled CPU), followed by evaluating the feature scripts. Commit 790f7ce splits the post-load steps and memoises days(). It is pushed but **not live yet**; its deploy was replaced in the shared data-sync queue. It goes out with the next deploy and has not been measured live. Getting to ≥90 for certain means making the first render incremental (or skipping it while the start page covers the list). That is a bigger change I did not make.
- JS on the start page: 213.6 KB gzipped total, all 36 files including data-worker (target under 250 KB: met).

## 3. Domain safety (checked)
- index.html has exactly one canonical tag. The new company/category pages (data/seo/, made on every sync) and their sitemap take the base URL from that tag. They have no hard-coded domain, so they need no FILES entry. The new sitemap-home.xml is in ops/set_domain.py FILES.
- In a scratch copy I ran set_domain.py example-test.dev and then --github: it ran cleanly and the copy ended with no changes. CNAME is not in .gitignore, and the Pages rsync excludes only .git/.github/screenshots/test-data/pipeline/cache, so CNAME survives the deploy.
