# V14.3 live verification
Site: https://tyfaucher24-ops.github.io/internship-radar/ (window.BUILD v143t1755, version.json 3b7f2528c6), Playwright Chromium, light+dark at 1440/1280/390.

- **96/96 checks pass**: 16 per theme×width (build, no horizontal overflow, privacy note, delete button, upload→review <3s, review cards, source lines, inputs inside box, focus→source highlight, prefs step, confirm, "Why this grade" detail, no page errors, plus 3 axe runs).
- axe (wcag2a/aa, 21aa) on profile, review dialog, detail: **0 violations** in all 18 runs. The first run found `scrollable-region-focusable` on #rvSrc (serious). Fixed in 9d3394f by adding tabindex and an aria-label.
- Upload of the f04 2-page PDF to the review dialog on the live site: 824–835 ms (includes worker cold start).
- Screenshots: ops/screens/v14.3-{profile,review,prefs,grade}-{light,dark}-{1440,1280,390}.png
- Raw data: qa-v14.3/LIVE.json
