# Intern Index: QA Audit v14 (live site, 2026-10-23)
Live site: https://tyfaucher24-ops.github.io/internship-radar/ (live build **588fca8653**).
Method: headless Playwright (Chromium) at 1280, 1440 and 1920 wide, dark and light, plus mobile at 390 wide. Accessibility checked with axe-core 4.10. Grader checked with the repo's match-core.js in Node.
All screenshots are under `/workspace/qa-v14/shots/`. Everything below was observed; nothing is inferred.

**Counts:** P0 = 2, P1 = 20, P2 = 15

## P0
1. **Tracker CSV import crashes.**
   - Page: Tracker → Import CSV.
   - Steps: import `import.csv`, a 3-row CSV with a header.
   - Expected: a column-mapping modal, then the rows are imported.
   - Actual: pageerror `rows[0].map is not a function`, an empty modal with only "×", and 0 rows imported. tracker.js:112 expects arrays, but `parseCSV` in listing.js returns header-keyed objects. A 1-row CSV alerts "No rows found."
   - Shot: `tracker_csv_modal.png`
2. **The resume parser mangles experience, and the bad text spreads site-wide.**
   - Page: Onboarding step 3, then the detail drawer.
   - Steps: upload `sample_resume.pdf`.
   - Expected: the title is "Investment Banking Summer Analyst", the org is "Example Capital Partners", and the dates run Jun–Aug 2026.
   - Actual:
     - Title: "Investment Banking Summer Analyst , Example Capital Partners"
     - Org: "– August 2026"
     - End date: empty
     - The card shows "– August 2026 · Boston, MA".
     - The drawer's "How to improve" says **"Lead your resume with – August 2026"**. This text appears on 149 of 200 finance listings in the grader check.
   - Shots: `onb_exp_prefilled.png`, `detail_withprofile.png`

## P1
3. **Past-season roles are shown as open.** 30 open listings are for Summer 2026, Spring 2026, Fall 2025 or 2025, e.g. Walmart conversions, ABB, Ingredion ×7, ACLU KY Spring 2025, UT Austin Summer 2025, ibotta. Expected: hidden or marked as past. The full list is in `data_checks.txt`.
4. **Duplicates.**
   - 55 groups of exact company + title + location duplicates covering 112 rows, e.g. RTX El Segundo, Moog, Sanofi, Booz Allen, Ameren.
   - Advanced Space has 7 open roles plus 7 closed copies under new IDs. The LIVE ticker shows the same role as both "added" and "CLOSED".
   - Data: `data_checks.txt`. Shot: `mobile_find.png` (ticker).
5. **Open counts disagree.**
   - meta.json open = 11,181, index.json open = 11,334, apply_links.open = 11,352.
   - With a profile, Find shows 10,757 with no explanation.
   - Profile says "817 Realistic" while the Realistic filter shows 783.
   - Shots: `find_withprofile.png`, `profile_withprofile.png`
6. **The intro replays on every load,** even after Skip and even with a full profile. Expected: show it once and remember. Shot: `theme_persist_reload.png`
7. **Detail panel order is wrong.**
   - Expected: description → grade bars → why/improve → Ways in.
   - Actual: description → facts block (visa/H-1B/class years) → grade card → Autopilot → Ways in.
   - Shot: `detail_withprofile.png`
8. **Feedback ignores the profile's interests.**
   - A Finance/IB profile is told "Add one software engineering experience".
   - Grammar: "Matches your experience is directly relevant".
   - The snapshot says "not your location" while the drawer says "your major and your location".
   - Shots: `profile_withprofile.png`, `detail_withprofile.png`
9. **Ranking quality.**
   - For an IB/Boston profile, the top matches are insurance underwriting in Utah and Connecticut at 99% A+, ranked above Boston IB roles.
   - The "Match %" and "Realistic" sorts gave an identical top 6.
   - Shot: `find_sort_realistic.png`
10. **Grader monotonicity fails (check 5).** Adding D1 athlete plus leadership *lowers* 6 of 729 grades, e.g. AQR 46→42 and Cambridge Investment Research 60→56. See `grader_results.json`.
11. **Grader check 8 fails.** See `grader_results.json`.
12. **Match and Realistic sorts with no profile** silently fall back with no prompt to add a profile. Shot: `sort_real_noprofile.png`
13. **Tracker company names break mid-word** ("Northwest ern Mutual"; LexisNexis wraps onto 3 lines). Shot: `tracker_after_csv.png`
14. **Keyboard: cards are focusable** (role=listitem, tabindex=0), **but Enter and Space do not open the drawer.** Found with `kb2.py`.
15. **Keyboard: the intro overlay does not trap focus.** Tab reaches the header, goBuild/goFind and the footer behind it, and #intro-on has no focus ring. Shot: `keyboard_focus.png`
16. **Misleading tags.**
    - "Other" is the 2nd-largest industry (1,864 listings), e.g. a Sanofi Virology co-op.
    - 5,834 open listings have no term.
    - 7,341 have class year "Not listed".
17. **Generic apply links.** 161 listings fall back to a generic `zapply.jobs/jobs/` page, e.g. Jabil.
18. **The admin link is public** in the profile menu.
19. **Version mismatch.** The live build is 588fca8653, not the expected 0d05a564a0.
20. **Description shows boilerplate.** The drawer shows EEO-style filler ("If your experience looks a little different…") instead of what the role is (Solenis). Separately, blurbs leak labels ("Company: Marsh Description: …"). Shot: `mobile_detail.png`
21. **On mobile, the first-run tip toast covers the first card** in the Find list. Shot: `mobile_find.png`
22. **No validation on onboarding grad year.** "20" is accepted. Shot: `onb_gradyear_bad.png`

## P2
23. The static-fallback globe (no WebGL) has no green dots. Shot: `planet_*.png`
24. Saved filters get the generic name "Filters 1". Copy link does not encode filters in the URL. Shot: `saved_filter_after.png`
25. Duplicate location options: "New York City area 45", "New York, NY 44", "New York City, NY 6". Shot: `filter_*.png`
26. The Extras bar shows "n/a" next to "+5: D1 athlete". Shot: `detail_withprofile.png`
27. The sticky action bar overlaps the Ways in text, on desktop and mobile. Shot: `mobile_detail.png`
28. The ▾ profile chevron is detached from "My Profile" (28px gap). On mobile it is a lone "▾".
29. The Sanofi card title repeats the location. Class years shows "Graduate" (not verified).
30. ACLU KY geodata is NY + SF with SF longitude -123.03.
31. Onboarding asks for both Graduation year and Class year.
32. Mobile tap targets are under 44px: logo 28, theme 30, bell 34.
33. Light mode: `prefers-color-scheme: light` is ignored on first visit, and the site is always dark until toggled.
34. axe "incomplete" results: 22 nodes need manual review. These are gradient or overlap backgrounds, and I measured all of them at ≥6.2:1 (pass). There is also 1 aria-prohibited-attr. The wcag2a/aa runs found 0 violations.
35. Deadlines come only from "ATS close date". Most listings show no deadline, and none says "deadline not published".
36. 3 sources (Tesla, JHU APL, Cvent) return 403 to automated checks and could not be verified.
37. Jabil's apply link is a generic page (see #17).

## Verified OK
- Nav spacing is an even 28px at every width and theme.
- Cards are a uniform 292px with no clipping. Apply (purple 6.6:1) sits left of Save (neutral).
- No horizontal scroll at 390, 1280, 1440 or 1920.
- 0 console errors and 0 4xx responses. DCL 344 ms, load 357 ms. Largest asset is app.js at 35 KB.
- Scroll runs at 60 fps with a p95 frame of 16.7 ms and 0 long frames.
- No broken logos.
- Globe dots and spin work with WebGL. The intro fades out smoothly.
- Resume prefill of school, major, GPA and year works.
- Search, staged filters, the empty state and saved-filter storage all work.
- Save: no page jump, shows "✓ Saved", the badge updates.
- Tracker: statuses, Customize (16 columns), Add row, and no layout shift when switching subtabs.
- Theme persists. Ctrl K and Escape work. Drawer Apply opens the job-specific Workday page.
- **Source check of 40 random open listings (`verify40.json`):** 35 match the live source. 3 are unverifiable (403). 1 is generic (Jabil). 1 is past-season. 0 open listings have a past deadline.
- **Grader checks:** 8 of 10 pass. Elite firms have a median of 34 vs 59 for the rest. A nursing major scores a median of 15 vs 40 for finance on IB roles.

## Not tested
- The Autopilot .ics export and the bell.
- Adding a warm-path contact.
- Clicking all 30 apply links in a real browser. Only the Sanofi drawer link was clicked; the 40-listing check fetched the stored apply_url.

## Highest-value improvements
1. Fix CSV import and the resume experience parser (P0).
2. Data hygiene: drop past-season roles, dedupe on company + title + location, keep stable IDs, and use one source for the open count.
3. Make grading honest: tie feedback to the user's interests, make it monotonic, add a location and interest weight, and fix the copy.
4. Show the intro once, and put the detail panel in the spec'd order.
5. Keyboard and mobile: Enter opens a card, trap focus in the intro, larger tap targets, and keep the toast off the first card.
