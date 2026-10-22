# V12 test matrix (2026-10-22, local http.server, Chromium 1248)

| Suite | Pass/Fail |
|---|---|
| test_v12 | 34/0 |
| test_v112 | 92/0 |
| test_v111 | 32/0 |
| test_v11 | 16/0 |
| test_v10 | 41/0 |
| test_v8 | pass |
| test_v12_scroll (perf) | 5/0 |
| test_v12_summary | 3/0 |
| test_v12_blurb | 2/0 |
| test/norm_v12.py | 11/0 |
| axe-core 4: find, profile, tracker, market and intro × desktop and mobile | 0 violations, 0 console errors |
| test_tracker.py | obsolete (port 8799 and old selectors; it also fails on pre-V12 commits) |
| test_v7 | output inconclusive; needs a rewrite |

**Browsers:** Chromium only. Firefox and WebKit could not launch on the box because host libraries are missing. Run them in CI: `ops/workflows/tests.yml` is a draft that needs a token with `workflow` scope.
