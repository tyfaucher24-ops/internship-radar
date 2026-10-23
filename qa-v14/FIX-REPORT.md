# V14 fix report (2026-10-23)

Live checks: `qa-v14/live14.py` against https://tyfaucher24-ops.github.io/internship-radar/ (build baae82d85d; version.json, window.BUILD and every `?v=` agree), at 1440, 1280 and 390 in dark and light. Results: `qa-v14/live14.json`. All six runs had axe wcag2a/aa 0 violations, 0 JS errors, 0 ellipsis-clipped elements, no horizontal scroll, intro skipped on return, Enter opens a card, action bar last in the drawer, no "not listed" facts, admin link hidden. Grader harness: 10/10 checks pass.

| # | Issue | Result | How it was checked |
|---|---|---|---|
| 1 | Tracker CSV import crash | PASS | csv.py import with column mapping |
| 2 | Resume parser date ranges | PASS | sample_resume.pdf parse |
| 3 | Past-season roles shown open | PASS | hygiene PAST rule; compact run gave 0 visible |
| 4 | Duplicates | PARTIAL | Dedupe on company+title+location gave 0 groups. Stable IDs are unchanged on purpose, because changing the ID scheme would orphan users' tracked items |
| 5 | Open counts disagree | PASS | Snapshot and list share the Show filter |
| 6 | Intro replays every load | PASS | live: hidden on return; Replay → ?intro=1 |
| 7 | Detail panel order | PASS | live: Autopilot after Ways in, actions last |
| 8 | Feedback ignores interests | PASS | grader harness |
| 9 | Ranking quality | PASS | rank.js; Realistic = chance + match |
| 10 | Grader monotonicity | PASS | grader check 5 |
| 11 | Grader check 8 | PASS | grader harness |
| 12 | Match/Realistic sort with no profile | PASS | options disabled with "add a profile to use" |
| 13 | Tracker company mid-word breaks | PASS | min-width on company column |
| 14 | Enter/Space do not open cards | PASS | live, all 6 runs |
| 15 | Intro does not trap focus | PASS | rest of the page made inert while the intro shows |
| 16 | Misleading tags | PASS | Missing facts and "Other" industry are now hidden in the detail panel. Filter buckets stay, as honest "Not listed" groups |
| 17 | Generic apply links | PASS | Labelled "General careers page: search for this role there" |
| 18 | Admin link public | PASS | live: hidden unless ?admin |
| 19 | Version mismatch | PASS | live: version.json = BUILD = asset ?v= |
| 20 | Boilerplate description | PASS | EEO and label lines stripped |
| 21 | Mobile tip covers first card | PASS | tip is static at ≤700px |
| 22 | Grad year validation | PASS | Only GY0..GY0+6 accepted |
| 23 | Static globe has no dots | PASS | live, WebGL disabled: real hubs.json dots (`ops/screens/v14-static-globe.png`) |
| 24 | Saved filter names / copy link | PASS | auto-name from chips; link carries filters |
| 25 | Duplicate New York options | PASS | city aliases merged to "New York" |
| 26 | "n/a" in Extras bar | PASS | blank instead |
| 27 | Sticky bar overlaps Ways in | PASS | live: actions moved to the end of the drawer |
| 28 | Detached profile chevron | PASS | CSS |
| 29 | Sanofi title repeats location | PASS | Hygiene strips a trailing ", City, ST" when it matches the location. Class year "Graduate" comes from the source and is unchanged |
| 30 | SF longitude −123.03 | PASS | Water centroid replaced with 37.78, −122.42. Applies on the next sync |
| 31 | Grad year and class year both asked | PASS | Class year derived from grad year |
| 32 | Mobile tap targets <44px | PASS | 44px at ≤700px |
| 33 | prefers-color-scheme ignored | PASS | live: light context → light, default dark #1a1f26 |
| 34 | axe aria-prohibited-attr / contrast | PASS | Live axe 0 violations in all 6 runs. Dark drawer links were fixed to AA |
| 35 | No "deadline not published" | PASS | label "Deadline not published" |
| 36 | 3 sources return 403 | OPEN | Tesla, JHU APL and Cvent block automated checks and can't be verified for free |
| 37 | Jabil generic link | PASS | see #17 |

Fixed 35, partial 1 (#4), open 1 (#36).
