# V10 audit: flaws found and their status

Before screenshots: `screenshots/v10-before-*.png` (intro, find, filter, drawer, profile, tracker, feedback, details at 1280/1440/1920/390). After: `screenshots/v10-after-*.png` (taken on live).

| # | Flaw (before) | Status |
|---|---|---|
| 1 | ~200 hard-coded colors, 30 font sizes, 10 radii, off-grid spacing across 3 stylesheets | Fixed: `theme.css` tokens; every color/size/radius reads a variable; 4 type sizes (13/15/18/display); one radius + pill; spacing snapped to 4px |
| 2 | Find header: big title + a second count line, a lot of empty space | Fixed: title and live counts on one row, tighter padding |
| 3 | Beginner box took ~140px with 3 bullets, plus a second "New here?" tip | Fixed: one-line tip with one button and ×; first-visit tip floats at the bottom instead of pushing results |
| 4 | Filter pills 48px tall; on phones they wrapped into 3 rows | Fixed: 36px pills; one swipeable row on phones |
| 5 | Phone nav dropped under the logo (two header rows) | Fixed: icon + nav on one row |
| 6 | Toolbar (Copy link / Saved filters / Map / Sort) as large as primary controls | Fixed: small 32px buttons and select |
| 7 | "9 similar roles" badge pushed Save outside the card on phones | Fixed: "+8 similar"; no element leaves a card at any width |
| 8 | Drawer: 7 boxes of "not listed", plus "Class years Class years not listed" / "Term not listed" | Fixed: known facts only, then one line "Not listed by the employer: …" |
| 9 | 3,077 listings said "Remote/Unspecified" (implies remote, unverified) | Fixed: "Location not listed" |
| 10 | Profile "About you" column ran under the Save bar; GPA placeholder cut off | Fixed: helper hints visually hidden (still read by screen readers); placeholder "e.g. 3.40" |
| 11 | Empty tracker showed stats, filter tabs, exports, Columns and an empty table under the empty state | Fixed: empty state plus Add row / Import only; stats become a compact strip when rows exist |
| 12 | Deleting tracker rows said "can't be undone" | Fixed: Undo in the toast for 7s |
| 13 | Mobile Lighthouse 68–75 (3D globe = ~5s main-thread work in software WebGL) | Fixed: pre-rendered planet image on phones/no-GPU devices; live mobile 85–94 |
| 14 | Layout shift while loading (CLS up to 0.29 on phones) | Fixed: reserved header/toolbar space; CLS ≤0.03 |

Still imperfect: the profile hints are now hidden (examples like "ohio st" only reach screen readers); the static planet replaces the 3D globe on phones; v5.css still layers many old overrides (cleanup is token-level, not a rewrite; V11 replaces the look).
