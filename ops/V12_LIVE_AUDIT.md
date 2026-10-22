# V12 live audit — 2026-10-22, build 7e504ab579 (fresh Playwright context, live Pages URL)
| Item | Result | Evidence |
|---|---|---|
| Build current (cache-busting) | PASS | loaded = version.json |
| Geist font | PASS | 2 faces loaded |
| No jump on Save | PASS | card y 426→426, width 104→104 |
| Smooth Save (crossfade, no blip) | PASS | animation `svf`, "✓ Saved" |
| Smooth scroll | PASS | p95 frame 16.7ms, 0 >50ms |
| Class-year list | PASS | 9 options incl. Master's, PhD, CC, Recent grad |
| Summary bullets + toggle | PASS | 5 bullets + "Show full description" |
| Company blurb | PASS | one clean sentence; filler lines rejected |
| Grade breakdown (profile set) | PASS | 5 rows, 10px padding |
| Ticker whole items + 56px fade | PASS | 72 items, no ellipsis |
| a11y (axe wcag2a/aa, desktop+mobile) | PASS | 0 violations |
| Engineering category | PASS after fix | 386/403 mech/thermal/propulsion titles (was 357) |
First run failures: Engineering (thermal/propulsion data tagged Software & IT; fixed in data and norm.py), and a weak blurb ("That’s where X comes in."; filter tightened).
Why Ty's view can differ: no profile saved means no breakdown (by design); old cached HTML lasts up to 10 min after deploy, then the version check reloads it; no feature flags gate V12.
