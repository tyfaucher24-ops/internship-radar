# V18 progress (resume note)
- 10:50 AM EST Nov 4: spec read. Baseline measured + written (ops/V18_REPORT.md, ops/qa/v18-before-*.json, ops/v18_measure.py).
- Live build at start: 90c55328b5. sync5.yml and email-alerts.yml are NOT in .github/workflows (only linkcheck, pages, sync).
- Next: Part 1 data fixes in pipeline (new pipeline/v18_accuracy.py called at the end of pipeline.sync since workflows can't be edited).

## Step 1a — accuracy pass (pipeline/v18_accuracy.py), committed
- go.vansh.nyc robots.txt is `Disallow: /` → we never fetch it. 606 of those leads get the direct ATS link from the SimplifyJobs public list (same company+title), then are verified normally; 82 leads that duplicate a company-board row are hidden; the rest stay "Check date unknown".
- Trust rule 1.1: compact.py flags open rows not checked in 72h (`check_unknown`); hygiene open count and the site's default list exclude them.
- Seasons from explicit title text only; categories second pass (Other 15.3% → 6.2% in offline sim); 200-row hand-checked set tests/data/v18_category_200.json, precision 97% (labels checked by the agent, not by Ty).
- Stale stated term → closed (43 in sim). Dedupe on company/title/city/state/season keeps most recently verified.
- Descriptions + explicit deadlines read from JSON-LD/meta on the verified posting page (cap 900/run, then cached in desc shards).
- Next: dispatch sync, re-measure.

## Step 1b — status 2026-11-04 ~11:00 AM EST
- Sync dispatched with the V18 pass: run 41862152913 (queued). After it finishes: download data, run `python3 ops/v18_measure.py` → ops/qa/v18-after-*.json, fill the after column in ops/V18_REPORT.md.
- Part 7: delete already exists and is RLS-safe (security-definer `delete_my_account()`, cascades user_items/email_prefs/email_log/admins, events set null). Added: local-storage wipe of idr_/ir_ keys. No new migration needed.
- Live Lighthouse (build 90c55328b5, pre-V18 deploy): mobile perf 84 / a11y 100 (LCP 3.5 s, TBT 290 ms); desktop perf 99 / a11y 100. Mobile perf target (≥90, LCP <1.8 s) NOT met. LCP element = intro globe placeholder; render delay from ~35 deferred scripts (app.js ≈1.3 s main thread). A preload try made no local improvement and was reverted. Fix = bundle/lazy-load non-start scripts (not done).
- Live axe (wcag2a/aa + 21a/aa): 0 violations in 16 views (light/dark × 1440/1280/768/390 × start/database).
- Not started: Parts 2 (tokens.css, DESIGN.md), 3, 5 (JSON-LD, company/category pages, OG image), 6, 9 flow tests, 10.
