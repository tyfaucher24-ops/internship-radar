# V13.3 #5b Apply button report

Live build 90906b90f0, tested 2026-10-22 (ET).

## Live click test: 50 random open listings
- Ran `python3 qa-v13.3/apply_click_test.py https://tyfaucher24-ops.github.io/internship-radar/ 50`. Raw results are in `apply-click-results.json`.
- Result: 50/50 passed.
  - 40 clicks were on cards and 10 in the detail panel.
  - 45 were "Apply ↗" and 5 were "View posting ↗" fallbacks.
  - Every click opened a new tab with `window.opener === null`.
  - Every final URL still contained the job's own ID and none was a careers root or search page.
  - The "Mark as applied?" prompt appeared after all 50 clicks. Nothing was auto-marked.

## Link check (first real run in the sync, pipeline/applylink.py)
- There were 11,229 open listings.
  - 9,950 have a direct job-specific application link.
  - 1,236 fall back to a job-specific posting ("View posting ↗").
  - 43 have no confirmed link, so no button is shown.
- 5,258 links were fetched this run, with per-host delays and robots.txt respected:
  - 5,132 OK
  - 20 failed (0.38%)
  - 106 unknown (timeouts)
- The rest rotate through on later syncs.
- Top failing hosts: zapply.jobs 6, careers.itw.com 4, careers.rivianvw.tech 3, ursamajor.com 3.
- Top fallback sources (no job-specific apply URL exposed):
  - zapply 145, Tesla 121, metacareers 50, ByteDance 46, Waymo 33, AMD 28, Shure (iCIMS) 28, Oracle Cloud 47, Microsoft 24.
- Closed listings show a disabled "Closed" button.

## Layout
- Cards (5c): Apply and Save sit on their own bottom row and split 50/50.
  - 185×40 at 1440 and 147×40 at 390, with no clipping.
  - Apply is solid --acc purple rgb(91,70,201) with white text at opacity 1 in both themes. The pale state at 390 dark is fixed.
- Panel: Apply and Save are equal width, 170×38 at 1440 and 112×44 at 390.
- Screenshots are in ops/screens/v13.3-5b-*.png and v13.3-5c-*.png.
