# V12 Phases 4–6 notes (2026-10-22)

## Phase 4: feature audit
| Feature | State |
|---|---|
| Tracker add, CSV export, .ics export | Present (`tracker.js` trackerTable, buildICS) |
| Tracker follow-up date and next step | Present (fields in each row) |
| Saved searches | Present as saved filter presets. **Missing:** the "+N new since last visit" count. |
| Share link | Present (filters live in the URL) |
| Today view | **Not built.** Cards show "Posted today" and "Closes today", but there is no dedicated view. |
| Follow companies | **Not built.** |
| Search synonyms (e.g. IB → investment banking) | **Not built** as a list. |

## Phase 5: quality
Lighthouse on the live site before the font change (perf/a11y/BP/SEO):

| Page | Desktop | Mobile |
|---|---|---|
| Home | 100/98/100/100 | 95/98/100/100 |
| Profile | 100/94/100/100 | 93/94/100/100 |
| Tracker | 100/98/100/100 | 93/98/100/100 |
| Market | 100/97/100/100 | 95/97/100/100 |

- Accessibility issues found since then are fixed, and axe now reports 0 violations.
- Core Web Vitals: mobile LCP is 2.2–2.4s, above the 2.0s target. Tracker CLS on mobile is 0.091 (under 0.1). Desktop LCP is 0.3–0.5s.
- The Geist font (29KB woff2, latin subset, swap, metric-matched fallback) replaces Inter. It is preloaded, so LCP should not move. Re-check after deploy.
- Privacy: no accounts and no analytics. The profile and resume stay in localStorage.
- Error monitoring: none (needs Ty's choice).

## Phase 6: personas
`test/personas.json` (including ty_queens) was graded in the V12 grader work; see `ops/V12_GRADER.md`. In p2, p3, p4 and p6 the top grade's share went up. The wealth/insurance fix was declined for lack of sources (see that doc).
