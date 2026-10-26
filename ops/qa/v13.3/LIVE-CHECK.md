# V13.3 item 2: live checks for sections 1–5

Live build 90906b90f0, checked 2026-10-22 (ET). The script is `qa-v13.3/live_check.py` and raw numbers are in `live-check.json`.

| Section | Check | Result |
|---|---|---|
| 1 Nav | Gaps between items at 1280 / 1440 / 1920, both themes | Every gap is 28px (spread 0). The nav's right edge equals the container padding: 58px at 1440 and 51px at 1280, matching the logo's left edge. Labels read "My Tracker" and "My Profile" with a single non-breaking space. |
| 2 Theme | The #thTog sun/moon button flips dark↔light with no reload | Pass both ways. Light body is rgb(246,247,251); dark is rgb(26,31,38). Dark is the default. |
| 3 Tracker shell | Applications vs Outreach: h1, tabs, box | Identical on both tabs and in both themes: h1 (115,121), tabs (115,250) w1195, box (58,121) w1310. 0px movement. |
| 4 Intro | Planet, dots, exit | Screenshots are below. The exit video is ops/screens/v13.3-live-exit.webm. |
| 5 Logo | Header logo | Original white assets/icon.svg. No green glow or sweep. |
| 5b/5c | Apply, cards | See APPLY-REPORT.md: 50/50 live clicks. |
| — | Page errors | None in either theme. |

Screenshots (both themes) are `ops/screens/v13.3-live-{intro,db,tracker,outreach,profile,about}-{dark,light}.png`.

## 60fps exit: limitation
This box has no GPU, so WebGL runs in software rendering (SwiftShader).
- rAF frame times on the idle intro planet average 36ms, which comes from software GL and not from the page.
- During the 900ms exit they average 17.4ms (118 frames). 30 frames ran over 25ms, mostly while the WebGL canvas was still being drawn.
- The exit animates only transform, opacity and filter, so it doesn't cause layout thrash.
- **60fps is not proven here.** It still needs one check on a real laptop GPU (Chrome DevTools > Performance while clicking "Build my profile").
