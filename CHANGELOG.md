# Intern Index changelog
(The website was called Internship Radar before V12.1. The repo name and URL are unchanged.)

## V16 Phase 4: legal, privacy and trust (2026-10-27)
- New Privacy Policy and Terms of Use pages in plain English, marked as drafts for Ty to review (not legal advice). They cover guest mode vs accounts, resumes read on-device, the opt-in resume sync, Supabase storage with own-rows-only rules, cookie-free anonymous counts, export and delete, listings from public employer postings that link to the original, grades as estimates, and takedowns.
- The footer now has About, Privacy, Terms, Contact and Report a broken listing. Contact explains takedowns and privacy and deletion requests.
- About and the footer note no longer say "no accounts" or "no login".
- There is no cookie banner because the site sets no cookies (sign-in uses local storage; analytics will be cookie-free).

## V16.3.1: accounts live (2026-10-27)
- Accounts are on: the Supabase project URL and the publishable (anon) key are in cloud-config.js, and Google sign-in is off (the button is hidden). The site uses raw fetch with no supabase-js, so the new sb_publishable_ key works as the apikey header. Signed-out calls send only the apikey.
- Live test: a real magic link signed in, guest data migrated, a live edit auto-synced, user B saw none of user A's rows and couldn't write as A, deleting an account signs out and keeps local data, and there were no page errors.
- Fixed the layout of the resume checkbox in the account dialog.

## V16 Phase 3: optional accounts (Supabase, free tier) (2026-10-26)
- **Off until configured:** cloud-config.js is empty, so the live site is unchanged and guest mode (localStorage) still works fully. `?cloud=0` turns accounts off for a single visit.
- **Sign-in:** email magic link (60 s client cooldown on top of Supabase's rate limits) and optional Google. Uses the anon key only, with raw fetch and no new dependencies.
- **Sync:** profile, saved items and filters, tracker, contacts, templates, practice, preferences, Autopilot and Warm Paths sync one row per item. Raw resume text and parse sync only with the opt-in toggle in the account dialog.
- **Merges:** the first sign-in merges guest data with no loss. Conflicts resolve last-write-wins per row (enforced by a server trigger). When both devices changed the same item, the change is merged field by field. Deletes travel as tombstones.
- **Security:** RLS is forced on every table (own rows only; anon gets nothing). There are row and size caps per user. A real-Postgres test proves user A can't read or write user B's rows.
- **Account dialog:** export my data (local + cloud), delete account (type DELETE), sign out (keeps data on this device).
- **Admin:** when accounts are on, admin.html requires a signed-in user listed in `admins` (`is_admin()`), and the password form is disabled.
- **Setup:** supabase/README.md has the setup steps.

## V16 Phase 2: reliable sync, health, performance, security upgrades (2026-10-26)
- **Upgrades:** pdf.js 3.11.174 -> 4.10.38 (fixes CVE-2024-4367) and mammoth 1.8.0 -> 1.13.0, still vendored. Resume parsing gives identical results on all 128 qa-v14.3 fixtures.
- **CSP:** no inline scripts or on* handlers left; script-src is 'self' + cdn.jsdelivr.net (index) and 'self' (admin, 404). The theme no-flash code moved to boot.js. style-src still allows 'unsafe-inline' (inline style attributes).
- **SRI:** jsDelivr libs pinned to exact versions with integrity + crossorigin (d3-array 3.2.4, d3-geo 3.1.1, topojson-client 3.1.0, us-atlas 3.0.1); three.js 0.160.0 vendored.
- **Sync:** atomic writes (temp file, fsync, re-parse, rename); a schema gate refuses to publish on missing required fields or an open-listing drop over 15%; the 8% removal guard stays.
- **Sync churn fix:** Workday searches stop at 200 hits per query. On big boards (Walmart has 2,000 'intern' hits), new postings pushed live ones past the cap and they were closed, so about 1,000 listings churned per full sync. Postings missing from a capped board are now checked against Workday's own job page and closed only if it says they are gone.
- **Health:** data/status.json (numbers and timestamps only); the sync workflow opens a GitHub issue after 2 consecutive failures; the Live badge hides when data is over 60 minutes old.
- **Link check workflow:** ops/workflows/linkcheck.yml restores data from cache, rolls back on failure and deploys Pages; it no longer commits data/.
- **Performance:** static globe image preloaded on phones and reduced motion; chunked post-load work; cheaper sorting (same order). Lighthouse mobile went from 75 to 88-89.

## V16 Phase 1: security and cleanup (2026-10-26)
- **Admin:** the Admin item is gone from the profile menu (and the `?admin` trick that revealed it). admin.html stays reachable by URL for now, noindex and disallowed in robots.txt; real sign-in comes with Phase 3 accounts.
- **Links:** a new `safeUrl()` (store.js) lets only http(s), mailto, tel and relative links become an href; javascript:, data: and vbscript: become `#`. It is used for apply links, tracker links, Ways-in links, sources and admin links, and a click guard blocks any javascript: link that slips through. Found by the new XSS test: a listing whose apply link was `javascript:...` used to render as a clickable link.
- **Headers:** referrer policy `strict-origin-when-cross-origin` on every page; admin.html and 404.html now have a CSP too. Every new-tab link already had rel=noopener (now tested).
- **XSS:** listing text, descriptions, sources, resume text and profile fields were already escaped; tests/test_v16_security.py now proves it with payloads in every field.
- **CSS:** the 12 layered files v4.css ... v15.css are one file, site.css, in the same order (cascade unchanged). Pages: theme.css (tokens), style.css (base), site.css. Screenshots of 7 views + admin + 404, light and dark, 1440 and 390: 36 of 36 pixel-identical before and after.
- **Cleanup:** 27 old root test scripts moved to tests/legacy/; qa-v13.3, qa-v14, qa-v14.3 moved to ops/qa/; deleted legacy/ (old V3/V4 app), the V1 scripts geocode.py, ingest.py, normalize.py and cities.json (nothing imported them), and local untracked leftovers (railway_function.ts, build_data.py, shot.py, test.py, internships.json, root screenshots).
- **Dependencies:** vendored pdf.js 3.11.174 is affected by CVE-2024-4367 (font code execution), which only applies with isEvalSupported on; ours runs in a Web Worker with isEvalSupported:false, so it is mitigated. mammoth 1.8.0: CVE-2025-11849 (file-path traversal) affects Node only, not the browser build. Upgrading both is listed for later (it changes resume parsing and needs the resume fixtures re-run).
- **Secrets:** none in client code, the repo or its history (V16 audit). Nothing to rotate.

## V15.1 (V15 misses: answer key, gold pairs, top-10 relevance) (2026-10-24)
- The persona answer key was re-derived under one written rule set (tests/grader/rekey_v151.py). K1: school credit only where the spec gives it weight. K2: no relevant internship means no A in any field. K3 was checked and changes nothing. 9 pairs changed; every one is listed with its reason in ops/audit/v15.1-key-changes.md. No key was edited by hand, and no gold label changed.
- Grader: an adjacent major's fit is no longer charged twice (75 floor in the fit gate), and an adjacent interest costs 4 instead of 9.
- Grader: the title's role group now beats a wrong source category for interest and major fit (a Goldman sales & trading role filed under Marketing & Sales).
- Grader: sales & trading titles are matched before quant, and Finance & Banking covers IB, PE and S&T.
- Grader: pharmacy-intern roles expect PharmD majors (they need a state intern license). Media & Communications maps to marketing, and English counts as a communications major.
- Grader: lab titles no longer land in health just for saying "Lab", and systems-administrator, help-desk and IT titles count as software/IT.
- Top 10: core-field roles (the fields you picked, otherwise your major's) rank ahead of cross-field ones, both in the top-10 list and in the best-match sort (e.g. a data role for a software target).
- Measured: top-10 relevance 92.6% → 100%; all-four recommend 91.8% → 99.1%; persona in-band 92.1% → 95.8%; gold in-band 77.5% → 90% with 0 pairs 2+ letters off; preferred-location share 90.6% → 83.9% (bar ≥ 80%); 30/30 V15 bars pass.
- Still open: g39 is D- 43 against a B–C band (one letter low, no longer an outlier), and gold20 is D- 41 against B–C.

## V15 (Fairer grading, honest tags, faster Feedback, per specs/V15.md) (2026-10-24)
- School weight in IB/PE/consulting cut from 25% to 12%; unlisted schools score 55 (was 35); blank school no longer beats a listed one; school weight 0 in all other fields
- Blank GPA scored as 3.0 (was ~3.3 equivalent); tier-1 standout rule now keyed on in-industry internships, not school
- Projects capped at "related" (65) experience; athletics no longer counts as an experience entry by itself
- No "safety" tag for firms with estimated competitiveness (97.8% of listings); card tags now match V14.3 tags
- Feedback copy fixes: verdict grammar, single relocation hint, clean skills line, no major contradiction
- Rankings drop ineligible class years, placeholders and >120-day listings; location and company-diversity weighting
- Feedback page renders first, what-ifs run after on a top-N subset; firm-name normalisation memoised (8.0s → ≤2s target)
- Tests: school-swap fairness bar, GPA-blank bar, tag consistency, grammar, match and perf bars
- Grader accuracy ≥93.0% persona in-band (floor raised from 91.8%)
- Measured result: persona in-band 92.1% (305/331); the 93.0% bar is missed and reported, not tuned around (g39 still F 27 vs B–C band; see the V15 report)
- Addendum (location and grade accuracy): location parser fixes (Washington DC, Workday "US, CA, City" order, street/office suffixes, spelled-out states, "/" multi-city); 200-listing live audit on a held-out sample: 98.5% exact city/state, 100% remote flag; preferred locations drive Top/Realistic (≥80% of top 10 in picks or remote-OK) with 50-mile metro matching from a vendored US city table; no preferences means no location boost or penalty (remote-OK alone no longer penalises on-site listings); 40-pair hand-labelled gold set and stability tests (tests/grader/run_v15.js)
- Addendum 2 (5-minute sync): ops/workflows/sync5.yml (copy to .github/workflows/sync5.yml) runs an incremental sync every 5 minutes with ETag/If-Modified-Since, a shared concurrency group with the 2-hour full sync, and a gate that skips empty or timestamp-only commits; the site re-fetches listings every 5 minutes while visible and updates in place; a green "Live" badge replaces every "Updated X ago" and hides when the last sync is over 60 minutes old (logged in admin)
- New tests: tests/test_v15_pipeline.py, tests/test_v15_live.py, tests/grader/run_v15.js

## V14.6 (profile entries show full text, per specs/V14.6.md) (2026-10-24)
- Profile page: no truncation anywhere. Experience titles, organizations, dates and bullets, plus school, major, skills and other chips, wrap in full at every width. There are no ellipses or line clamps, and long words break cleanly.
- The profile columns no longer have fixed-height inner scrolling or a bottom fade that hid content. They grow with their content and the page scrolls.
- Edit fields grow to fit: Title and Organization are now auto-growing one-line fields (Enter does not add a line), and every growing field re-measures when its width changes or the LinkedIn box opens. The 400px cap is removed.
- Fixed: the experience edit fields (Title, Organization, What you did) were invisible because they shared the card grid's "grow" class.
- Fixed: the "one point per line" hint now meets AA contrast.
- Card titles keep the 2-line clamp with "…" (an exception Ty approved). The full title is in the hover title and the detail panel.
- Grader accuracy unchanged at 91.8%. New test: tests/test_v146_profile_full.py.

## V14.5 (no "Why this grade?", no preferences pop-up, per specs/V14.5.md) (2026-10-24)
- "Why this grade?" is removed from every internship card and from the detail panel. Cards are back to the V13.3 layout: logo and name, a title of up to 2 lines, location and deadline, grade, and Apply and Save side by side on the bottom row. All cards are the same height (322px when graded) and no button is clipped at any width. The panel's match section is now headed "How you match this posting".
- The per-posting feedback view and its code are removed. The Feedback page stays in the nav.
- The "Your preferences" pop-up is gone. A resume upload fills your profile and goes straight to the homepage with your matches graded. Manual build does the same. Preferences (locations, industries, roles, season, remote, relocation) are never taken or guessed from a resume. They stay optional, are edited only on the profile page, and when unset nothing is filtered or boosted.
- Light mode is the default again for first-time visitors. An explicit choice wins, and a device set to dark mode is followed.
- Grader accuracy unchanged at 91.8%. New test: tests/test_v145_cards_prefs.py. tests/test_v144_feedback.py no longer checks card links or the per-posting view.

## V14.4 (Honest Feedback page, no tutorial, no review screen, per specs/V14.4.md) (2026-10-24)
- The tutorial is gone: tour.js and its styles are deleted, and old ir_tour* keys are cleared from browsers that saw it.
- The "check what we read" review screen is gone. A resume upload asks only what a resume can't tell us (locations, industries, roles, season, remote, relocation), then goes straight to your filled-in profile, where everything stays editable. The "Check this" and "Not found" flags are removed.
- Honest Feedback is now a top nav item (Feedback). Every graded card and the detail panel have a "Why this grade?" link that opens feedback for that posting.
- Redesigned feedback page: a score ring with your median match and grade, factor bars (GPA, relevant experience, skills, school) that fill in a stagger, with a tap or hover tooltip quoting your resume and the grader's reason. Leadership and athletics show whether they are on your profile, with no made-up number. Also: what helps you and what holds you back, each citing your resume and how many postings it affects; next steps measured by re-grading your matches with one change; and your counts of reach, target and safety picks with links. Reduced motion shows final states with no animation.
- Per-posting view: ring, safety/target/reach tag, eligibility gates (minimum GPA, class years, sponsorship, citizenship, only when the posting states them), your factor bars for that posting, what works for and against you, next steps and a confidence note.
- Empty state: "Upload your resume to see your honest feedback" with an upload button.
- At 390px the nav moves to its own row under the brand so all items fit. Graded cards are 31px taller to fit the new link with nothing clipped.
- Grader accuracy unchanged at 91.8%. New test: tests/test_v144_feedback.py.

## V14.3 (resume reading, review-and-confirm, resume-aware grading, per specs/V14.3.md) (2026-10-23)
- Resume upload (PDF, DOCX, TXT, up to 10 MB) is read on your device in a Web Worker, using vendored pdf.js 3.11.174 and mammoth 1.8.0 with no CDN. Nothing is uploaded. The privacy note says so, and a "Delete my resume data" button clears the resume text, the parse and the stored resume.
- New review-and-confirm screen: your resume on one side and editable cards on the other (contact, education, each experience with a type dropdown, skills, certifications, languages, work authorization). Focusing a card highlights the resume lines it came from. "Check this" marks inferred values and "Not found. Add it?" marks blanks. An ambiguous school must be picked from a list. GPA is filled only on a 4.0 scale. Step 2 asks what a resume can't tell us: locations, industries, roles, season and year, remote, relocation. "Build manually instead" is kept. Nothing is filled in until you confirm, and the V14.2 tutorial still runs afterwards.
- Re-upload merges: empty fields are filled, experiences and lists are combined, and where your values differ from the resume they are kept and shown in a diff with "Use resume value" buttons. Your edits are never silently overwritten.
- Profile input fixes: full-width inputs, no clipped text, auto-growing textareas, and long school names fit, in both themes and at 390px. Schools picked from the IPEDS list are kept.
- Grader (extends match-core.js; the base isn't replaced): only confirmed fields are graded. Hard gates show "Not eligible" with the exact reason. New fit × chance score and Reach/Target/Safety tag; Top and Realistic ranking helpers. "Why this grade" in the listing detail shows the top 3 factors for and against, quoting your resume and the posting, plus next steps and a confidence note (missing data lowers confidence, never the grade). A new open-entry floor covers generalist operations and community roles at accessible employers. Sources are in specs/ref/v14.3-research.md.
- Tests: 60 synthetic resume fixtures (labelled synthetic, never shown on the website) with an accuracy report in qa-v14.3/ACCURACY-REPORT.md (optimistic: the generator and the parser have the same author). Grader: 50 personas at 91.8% in band (304/331; one honest outlier, g39_lesser_data × edf93e34fe), 20 resume + posting pairs, and 2,040 monotonicity checks with 0 breaks. CI workflow in ops/workflows/resume-v143.yml for Ty to copy to .github/workflows.

## V14.2 (saved-only Autopilot + first-run tutorial, per specs/V14.2.md) (2026-10-23)
- Autopilot, its calendar, day list, Upcoming, badges and the .ics export now come only from saved internships (tracker rows). Unsaving removes that internship's tasks at once; saving adds them. Outreach follow-ups and your own tasks tied to an unsaved internship are hidden too. The .ics keeps stable UIDs and 1-day reminders.
- Empty state when nothing is saved: "Save internships to build your Autopilot plan" with a Browse internships button. No sample tasks.
- "Turn on Autopilot" at the end of Build my profile now also saves those internships, so the plan matches the tracker.
- New 7-step guided tour (tour.js, v142.css) right after Build my profile, on the homepage: search and filters, grade, Apply and Save, My Tracker, Deadline Autopilot and the Apple Calendar export, Outreach, and profile and settings. It spotlights the real UI, has Back, Next and Skip, step dots, and supports Esc and arrow keys with a focus trap. It shows once (stored in localStorage `ir_tour_done`). "Replay tutorial" is in the profile menu.

## V14.1 (tracker sheet, per specs/V14.1.md) (2026-10-23)
- P0 fix: selecting every column in Customize sheet no longer blocks clicks. Root cause: the Priority stars used the class `stars`, which is also the full-bleed animated starfield layer (`position:absolute; inset:-20px`), so turning Priority on laid an invisible layer over the sheet that ate clicks. It's renamed to `trk-stars` and guarded. The column list also no longer re-renders under your click.
- Customize panel: fixed-size popover (max 70vh, fits the space below the button, scrolls inside), Done always visible, closes on Done / Esc / outside click. New "Reset to default columns" button. A corrupted saved column list falls back to the defaults.
- With many columns on, the sheet scrolls sideways inside its own box, with a sticky header row and a sticky Company column. The page never gets wider.
- Nothing is cut off: no ellipsis anywhere. Headers wrap, and shorter labels (Contact, Resume) carry the full name as a tooltip. Role, Notes, Next step, Location, Contact and the other text fields wrap to their full text, and the footer hint wraps.
- Alignment: every cell is vertically centred, rows are at least 64px tall with 16px cell padding, and headers share their column's left padding.
- Grade and Realistic pills have their own Grade column (default on).
- Company cell: a narrow checkbox, a 28px logo, a 10px gap, then the name.
- 15px cells, 13px uppercase headers, zebra rows and row hover. axe AA passes in both themes.
- Phone header (390): with a Tracker count badge, the theme toggle no longer runs past the screen edge (smaller badge, 32px bell and toggle), so no page scrolls sideways.
- Assets versioned and version.json bumped.

## V14.1.1 — Tidier mobile header (2026-10-23)
- At phone widths the Profile ▾ menu button no longer overlaps "Profile", and the bell and theme toggle are slimmer (36px), so the toggle sits clear of the screen edge.
- axe WCAG 2.2 AA: 0 violations on the live Find page in both themes at 1440, 1280 and 390.

## V14.1 — Cleaner Find page and header (2026-10-23)
- Find: removed the results summary line ("N open internships · similar roles grouped · N graduate-degree roles hidden by your profile") and its "show all" graduate-roles button. The degree filter still works from the filter bar.
- Header: the Intern Index wordmark now sits in the top-left corner of the header on every page, in both themes and at desktop and mobile widths.
- Assets versioned and version.json bumped.

## V14 — Audit fixes: honest data, grading and accessibility (2026-10-23)
Matches `specs/V14.md`; per-issue results in `qa-v14/FIX-REPORT.md`.
- P0: tracker CSV import with column mapping; resume date-range parser fixed.
- Data: every term up to Fall 2026 closed; open listings deduped on company + title + location; titles no longer repeat their location; San Francisco geocode fixed; New York city aliases merged.
- Grading: feedback respects your interests, grades are monotonic, Realistic sort uses your real chance, and Match/Realistic ask for a profile instead of silently falling back.
- Counts agree everywhere; graduate-degree roles hidden by your profile are counted with a "show all".
- Intro plays once (Replay intro brings it back) and traps focus; the static globe shows real listing hubs.
- Detail panel: spec order, actions last, boilerplate stripped, missing facts hidden, generic careers links labelled.
- Keyboard and mobile: Enter/Space open cards, 44px tap targets, the first-run tip no longer covers cards; light mode follows the OS on first visit; dark-mode links pass AA; no ellipsis truncation in the ticker or advice.
- Admin link only with ?admin. Screens: `ops/screens/v14-*.png`.

## V13.4 — Autopilot calendar, Apple Calendar export, site-wide wordmark (2026-10-23)
Matches `specs/V13.4.md`.
- Autopilot: the "Due now" list is replaced by a calendar. Left: month/week calendar with prev/next, Today, Month/Week toggle, and type chips that double as the legend and filters (Deadline red, Apply-by reminder purple, Follow-up blue, Interview green). Today has a green ring; the selected day is highlighted; days outside the month are dimmed. Arrow keys move between days, Enter selects.
- Right: the selected day's tasks (logo, role, company, type, time when there is one, Apply opening the job-specific application, ✓ Mark done, Open) with a friendly empty state and "Find internships"; below it "Upcoming 7 days", each row opens the listing.
- "+ Quick add task" (title, date, type, optional linked internship), saved on this device. User tasks can be completed and deleted (with undo).
- Tasks come only from real data: Autopilot plans, source-stated deadlines of saved/tracked listings, tracker follow-up dates (Interview when the row is Interviewing), Outreach contacts marked Messaged (follow-up one week later) and your own tasks. Listings without a stated deadline get no deadline dot.
- Mark done updates Autopilot, marks a Saved tracker row Applied when the apply reminder is done, and records the follow-up on Outreach contacts.
- "Add to Apple Calendar" in the calendar header: .ics with one event per open task (shown types), title "Type: Company, Role", all-day when there's no time, job-specific apply link in URL and notes, a 1-day-before alarm on deadlines, and stable UIDs so a second import updates instead of duplicating.
- Fixed panel heights with internal scroll: no layout shift when changing days or months.
- Header: the "Intern Index" wordmark ("Index" in green) replaces the old logo on every page except the intro, in dark and light.
- Test: `ops/test_v134.py`. Screens: `ops/screens/v13.4-*.png`; sample export `ops/screens/v13.4-export.ics`.

## V13.3.1
- Tracker: company names wrap onto multiple lines, stay centered and are no longer clipped at desktop widths (fixes "Ankura Consulting Group" at 1440). Textareas auto-size to their content.
- Tracker column widths rebalanced for 861-1399px and >=1400px so Role keeps a readable width.
- test/location_norm.test.js updated for the V13.3 code layout (locParts on its own line) and the state-only rule (full state name). All tests pass.
- Checked the tracker in light and dark mode at 390 (card layout, nothing clipped).
- Tracker Closes column: dates show in full on two lines ("Today" / "Oct 23") at every width, with no ellipsis. Closes is 96px and Company 206px at 861-1399px so names like "Consulting" no longer break mid-word at 1280.
- Screenshots: ops/screens/v13.3.1-tracker-*.png

## V13.3 — Data, apply links, card redesign, calibrated grader and honest feedback (2026-10-23)
Matches `specs/V13.3.md`. Reports: `qa-v13.3/DATA-REPORT.md`, `APPLY-REPORT.md`, `GRADER-RESEARCH.md`, `GRADER-REPORT.md`, `LIVE-CHECK.md`.
- Grader (§7): company tier 1–5 registry with a reason and cited source per firm, shown in the detail panel as "Company tier N of 5". Capped experience credit (athlete, leadership, military, founder, research, part-time work; ≤ +6 points, never over a tier ceiling; first-gen 0 because no evidence). Missing data lowers confidence, not the grade.
- Calibration: 50 personas × 34 listings, 331 expected pairs. In band 73.4% → **91.8%**; outliers 32 → **1** (disclosed in the report: a Statistics major on a posting that requires CS/Eng/IS); monotonic breaks 0, tier-1 A for non-standouts 0, nondeterministic 0, missing-data drops 69 → 0.
- Honest feedback (§7g): every card shows Realistic / Reach / Long shot with the reason on hover or focus; "Realistic for you" sort and a Show filter (Realistic / Reach picks); "Your honest snapshot" on Profile (top gaps and strengths from your 30 best Realistic and 30 best Reach listings, plus one next step); tracker rows show grade and tag; free resources (Wall Street Prep, LeetCode, freeCodeCamp) when skills are the gap. Feedback failures 0 / 331.
- CI: `ops/workflows/grader.yml` is written but BLOCKED (token lacks the workflow scope); copy it to `.github/workflows/` to turn it on.
- Tests: tests/grader/run.js passes all §7d checks; test/*.js all pass except location_norm.test.js, which was already failing before V13.3.
- Screens: ops/screens/v13.3-7g-*.png (live).

## V13.2 — Detail panel layout (2026-10-22, approved by Ty)
Matches `specs/V13.2.md` and `specs/ref/v13.2-detail-panel.png`. Grader v2 scoring underneath is unchanged.
- Order: header (logo, company, role, clean location with no "City -, ST", closes pill, Posted) → short role description (≤160 chars, real sentence about the role, hidden if none fits) → "▸ Show full description" (facts, summary bullets, full posting) → grade card → Why it's a match → How to improve → Ways in. The Apply row sticks to the bottom of the panel.
- Grade card: "% · grade" pill, verdict, "confidence · selectivity" label (the separate Selectivity paragraph is folded in; the full source is in its tooltip). SCHOOL / GPA / EXPERIENCE / SKILLS / FIT each show a bar and one line of ≤60 chars, e.g. "3.92 vs typical 3.0, strong", "Matters little for this role".
- Why it's a match: ≤2 bullets of ≤70 chars. How to improve: ≤2 action bullets of ≤70 chars ("Lead your resume with …", "Tick “open to relocating” if you'd move for it"). Lines that are too long get a shorter rewrite or are dropped, never cut off.
- Ways in: your contacts first, then the alumni, people and recruiter LinkedIn searches, each with a one-line reason, plus a "Draft message" button with a copyable note. These are plain links you click; nothing is fetched from LinkedIn.
- Tests: test/v132_core.test.js 6/6 (33,687 listing×profile pairs, every line within its limit, none truncated). test_v132.py 236/236 (5 listings × 1280/390 × dark/light: section order, per-section limits, clean header, no clipped text, sticky Apply, zero page errors), on localhost and on the live site. test_v13 13/13, test_v112 92/92, test_v131 92/92.
- Screens: ops/screens/v13.2-detail-1280-dark.png, v13.2-detail-1280-light.png, v13.2-detail-390-dark.png, v13.2-detail-390-light.png, v13.2-grade-card.png, v13.2-ways-in.png.
- Note: the V13.2 code reached main inside commit 66c4cd7 (a concurrent V13.3 commit included the working tree); tests, screenshots and this entry landed in the following commit.

## V13.1 — final (2026-10-22, verified live)
All 24 spec items: PASS (#11 intentionally unchanged).
- P0: #1 card unsave PASS · #2 warm-path word boundaries (Internal, International, Internship Program no longer match "intern" titles wrongly) PASS · #3 closed-listing detection PASS · #4 location_norm PASS.
- P1: #5 experience parsing (separate cards, separate bullets, no "()" titles, flagged dates) PASS · #6 D1 from the resume only PASS · #7 skills deduped, contact parsed PASS · #8 step 3 prefilled from the resume PASS · #9 grade calibration (top match 84, ≥5 distinct grades in the top 20, a missing location no longer counts as a match: 69 vs 75) PASS · #10 one open count PASS · #11 deadlines: UNCHANGED (see below) · #12 locations PASS · #13 past-cycle and degree hygiene PASS · #14 autopilot PASS · #15 mobile tracker cards + header that never overlaps PASS · #16 test_v112 92/92 PASS.
- P2: #17 match sort PASS · #18 newest sort PASS · #19 closed hint PASS · #20 editorial parentheticals (0 open titles with "listings appear"/"possible)"; 931 real cycle parentheticals kept) PASS · #21 Customize columns PASS · #22 toasts PASS · #23 modal Save min-width PASS · #24 bell titled "Autopilot reminders (Email reminders — coming soon)" with the email toggle disabled PASS.
- #11 is unchanged on purpose: the GE closing date shown is real. It comes from the posting's own similar-jobs sidebar, so replacing or hiding it would mean showing less accurate data.
- Build my profile upgrades: green progress bar, grad date ↔ class year sync, invalid years blocked, chips survive a reload, experience cards can be added, edited and deleted.
- Final tracker fit: at 1280 to 1399px the status pill and the Open link fit without clipping and no column gets tucked away; wider rules apply at 1400px and up.
- Tests: node test/v131_core.test.js 23/23. On the live site: test_v131.py 92/92 (chromium, firefox and webkit at 1440/1280/390, plus perf: DCL < 3s, load < 6s, CLS < 0.1, no long task > 200ms while scrolling), test_v112.py 92/92, test_v13.py 13/13.
- Screens: ops/screens/v13.1-onboard-1..5.png, v13.1-experience-cards.png, v13.1-experience-edit.png, v13.1-home.png, v13.1-tracker-1280.png, v13.1-tracker-390.png.

## V13.1 (part 1, build 261259e6ee, verified live 2026-10-22)
- Closed all Summer/Fall 2026 postings (those terms have started); one open count everywhere (compact runs hygiene, meta.open=11127).
- Locations: missing on 0.98% of open listings, using only real sources (ATS slug, posting text, known company sites); each fallback is labeled with loc_source.
- Linkcheck: 1399 checked, 39 dead closed. JP Morgan names merged; MBA roles tagged and hidden for undergrads unless the Degree filter is set.
- Sort defaults to Match when a profile exists; Newest sorts by posted date; the empty state offers "show closed matches".
- Autopilot: steps start no earlier than the next 9:00 AM; .ics uses the America/New_York timezone; header bell with count. Toasts auto-hide.
- Tracker: company names no longer break mid-word; test_v112 92/92 on live.
- Still to do: mobile tracker cards (#15), Customize columns (#21), resume parser and grade calibration (#5–9), and the Build my profile upgrades.

## V13 — New intro and onboarding, Deadline Autopilot, Warm-path finder (2026-10-22)
- **Intro and onboarding** (matches `specs/ref/v13-intro`, the APPROVED INTRO section):
  - New hero with the globe, a live open-internship counter from the real data, and a ticker built from `changes.json` (real added and closed postings).
  - "Build my profile" runs a 5-step onboarding: resume, school/major/GPA/year, interests and locations, experience/athletics/clubs, then your real top matches.
  - "Skip to live internship database" skips setup. The Details screen is removed, and "How it works" now links to About.
  - The globe only redraws while it moves or you interact with it.
- **Deadline Autopilot** (new page):
  - Turn it on from a posting's detail view or from your onboarding matches.
  - Reminders come from the deadline the posting states: 14, 7, 3 and 1 day before, plus the day itself. Rolling and no-deadline postings get check-in nudges.
  - Reminders appear on this website (a nav badge and a toast). Browser notifications are optional, and permission is only asked when you click. You can export to your calendar (.ics).
  - "Email reminders — coming soon" is shown disabled. Everything is saved on this device only.
- **Warm-path finder**:
  - A "Ways in" panel in each posting has plain LinkedIn search links you open yourself: alumni, the team, campus recruiters, past interns and the company.
  - Intern Index never connects to LinkedIn or reads anything from it. A test asserts zero requests to linkedin.com.
  - Add the people you find, keep a 300-character connection note for each one, and track their status on My Tracker → Outreach.
- Tests:
  - New: `test_v13.py` and `test/v13_core.test.js`.
  - Updated: `test_v7`, `test_v8` and `test_v111`, where the Details screen and "no skip" checks no longer apply.
- Screens and video: `ops/screens/v13-*.png`, `ops/screens/v13-intro.webm`.

## V12.1.2 — 2026-10-22
- My Tracker: company names are centred horizontally and vertically in their cells, wrapped names included; the Company header is centred over the same span.
- Mobile (≤640px): rebalanced the Company, Status and Closes widths so names wrap only between words and "Assessment (OA)" fits its status pill. No clipping and no horizontal scroll.

## V12.1.1 — Tracker titles, smoother graded scroll, tests (2026-10-22)
- Tracker: long role and company names now wrap at word boundaries and show in full. Cells grow to fit (minimum row 54px), so nothing is cut off. "Customize sheet" is exactly 40px tall.
- Scrolling: closing-soon dots on cards no longer pulse (each one forced its own compositing layer), and the card fade-in only plays right after a filter change instead of on every row that scrolls in. With the CPU slowed 4x, the graded list scrolls at 55.7–59.2fps on the live site (3 runs) and 59.8fps locally.
- Tests: `test_v10`, `test_v11` and `test_v111` updated for V12.1 (dark is the default, hex palette and px sizes allowed, quote bar instead of rolling digits).

## V12.1 — Intern Index, dark mode, Save and scroll fixes (2026-10-22)
- Renamed to **Intern Index** everywhere users see it. The repo name and URL are unchanged.
- Dark mode is the default (#1a1f26 / #232a33 / #2c3440, text #f3f5f7, muted #aab3bf). axe reports 0 violations in dark mode at 1280 and 390 (`ops/a11y_dark.py`).
- Save and Unsave leave the page exactly where it was, both on the list and in the detail view. Buttons are patched in place, with no re-render and no scroll restore. `test_v121_save.py` covers Save, Unsave and Save from the detail view.
- Smoother scrolling:
  - Sticky header is opaque (no backdrop blur).
  - Decorative animations and transitions pause while scrolling.
  - Card tilt is gone; virtual rows are contained.
  - Measured with `ops/perf/scroll_trace.py`, a Chrome trace at 4x CPU throttle across all listings.
- Grade panel restored, and a Description section added. A unit test now covers the location normalizer (`test/location_norm.test.js`). Stray punctuation is removed from city names in the data.
- Quote bar: a LIVE badge when the sync is 6h old or less, otherwise an amber "Delayed". The tooltip shows the sync time in ET. Big numbers sit on one bar without wrapping.
- Tracker:
  - Full width, 54px rows, 15px text, sticky header.
  - No horizontal scroll: low-priority columns collapse, and a note lists them.
  - Tab bar removed; the stat tiles filter instead.
  - "Customize sheet" is now a primary button.
- Cache: assets are versioned with `?v=<hash>` and index.html carries a no-cache meta tag.



## V12 live audit
- Live audit all PASS (ops/V12_LIVE_AUDIT.md); thermal/propulsion titles recategorised to Engineering; filler blurbs rejected.

## V12 — Grader, accuracy, polish (2026-10-22)
- No jump on Save. Smooth scrolling through keyed row reuse, with a perf test.
- Short summary bullets with a "Show full description" toggle. Full class-year list.
- Grade panel: a one-line company description quoted verbatim from the posting (omitted when the posting has none), a more open breakdown layout, and fixed athlete-line grammar.
- New UI font, Geist: self-hosted, latin subset, font-display swap. Numbers stay mono.
- Classification fixes in `pipeline/norm.py` (Engineering vs Software/Other; high-school postings excluded).
- Accessibility: axe now clean (skip link, card roles and headings, contrast, tip label).
- Wealth/insurance selectivity signal left out: no cited source (`ops/V12_GRADER.md`).
- Docs: `ops/V12_ACCURACY.md`, `ops/V12_TEST_MATRIX.md`, `ops/V12_PHASES.md`, `ops/V12_LAUNCH.md`.

## V11.2 — Polish + accurate resume reading (2026-10-21)
- **Cards:** footer chips wrap onto a second line instead of overlapping; each chip stays on one line; short labels ("No deadline listed", "✓ OA", "✓ Interview"); every card in the grid is the same height and nothing spills outside it.
- **Ticker:** every item, label and separator is vertically centred (Find and intro). Items never shrink or cut mid-text, and a 56px fade hides the edges. The label now shows the real last sync time from `data/meta.json` ("Synced 4:12 PM") and "⚠ over 4 h old" when it is stale.
- **Tracker:** the table fits 1280/1440/1920 with no sideways scroll (fixed column widths, 48px rows). "Closes" merges days left and the date ("41 days · Dec 1"). Empty dates show "—" (the date picker opens on click), with no mm/dd/yyyy placeholders or stray picker icons. The select-all box is inside the header and centred. Status pills share one width, and header text is centred. The five stat boxes are now one slim bar (SAVED 0 | APPLIED 4 | …) with mono numbers, offers in green and closing-this-week in red; clicking a stat filters the table.
- **Profile:** School only ever holds a school from the list. Short forms like "Queens University" match the one list entry by whole words, otherwise the field stays empty; older free-text values are migrated. Dropdown panels inside the columns are fixed to the screen and flip up or shift left, so a card never clips them. The search icon no longer covers the placeholder. GPA and Work authorization each get a full row. The work-auth labels are short ("Citizen / green card", "Other work permit", "Need sponsorship"). Column widths are rebalanced.
- **Resume parser (rewritten):** reads name, school (list only), degree, major, minor, class year, GPA (cumulative first, 4.0 scale only), work authorization (only when stated), skills and experience ("Org | Title | dates", "Title, Org", org line + title line). It rejoins lines wrapped by narrow PDF columns and uses the education entry that belongs to the chosen school (for transfers). Low-confidence fields are left empty and listed under "Check these".
  - Tests: 34 fictional TEST fixtures in `test/resumes/` (txt, docx, pdf, 2-column pdf; community college, state, Ivy, HBCU, international/F-1, career changer, veteran, D1 athletes, transfer). They are scored through the site's real PDF/DOCX reader by `test/resumes/score.py`.
  - Tuning set (26): 76.5% → 100% field accuracy.
  - Held-out set (8, written after tuning): 97.5% on the first run (2 major misses), 100% after fixing them. Per-field results are in the report.
- **Grader feedback:** every strength, gap, action and verdict cites the real profile or listing (city, title, company, experience); the generic tips are gone. `test/grader_grounded.js` checks 2,645 feedback lines across the 7 personas + Ty's profile: 2,645 grounded. Grades stay harsh: Ty's profile (Queens, Finance, sophomore, 3.92, D1 lacrosse, investment club) gets F (24–30%) at JPMorgan. The top match is a Charlotte wealth-management internship.
- **QA:** an automated overflow check (scrollWidth > clientWidth and spill outside cards/columns) on Find, drawer, Market, tracker and profile at 1280/1440/1920/390. test_v112 92/92 (live)

## V11.1 — Stock-market polish (2026-10-21)
- Rolling digits (position-only, under 500 ms) on the Find header count, intro counter, Details count and Market counts. Screen readers get the plain number.
- Colour-blind grades toggle (profile menu ▾): high grades and "added" turn blue instead of green. Saved in this browser.
- Dark / light mode toggle (profile menu ▾), applied before first paint so there is no flash. Light stays the default.
- Ctrl/⌘+K quick search: type a company or role, arrow keys, Enter opens the listing. Only open listings from the current data.
- Red pulsing dot on cards that close within 7 days.
- Intro: thin live ticker pinned to the bottom (a read-only copy of the real Exchange ticker, hidden when there are no sync events; never covers the buttons; static with reduced motion) and a mono, rolling live counter. Planet and Details unchanged, no skip button.
- Profile at 1440: columns end above the Save bar and fade at the bottom while there's more to scroll, instead of a hard cut.
- Design pass (ops/V11.1_DESIGN_NOTES.md, patterns from Robinhood, Public, Google Finance/Bloomberg, Stripe, Linear): one muted green/red pair used everywhere; the ticker is now a hairline strip in the page's surface colour (not a black bar); the intro ticker is a glass strip matching the counter pill; dots are 6px with a slow soft halo; Market tiles are tinted dashboard tiles; the ticker label shortens to "Live" on phones.
- QA: test_v111 32/32, test_v11 16/16, V10 41/41, V8 123/123.

## V11 — Stock-market accents + Internship Exchange (2026-10-21)
- Ty dropped the newspaper direction; those commits were reverted. Same layout, planet intro, Find and Details as V10; stock-market feel through accents using theme tokens.
- Pulsing green "live" dots on the intro count, the Find header count and the ticker label (static with reduced motion).
- Internship Exchange: a dark market-board ticker under the Find header — ▲ NEW (green), ▼ CLOSED (red), ● DEADLINE MOVED (amber) — with a time on every item. Only real events from the diff between two syncs (`pipeline/changes.py` -> `data/changes.json`, run by `pipeline.qa`). No file or no events = no ticker. Pauses on hover/focus, click opens the listing, polls every 5 min.
- Market panel (click the ticker label): added/closed/deadline counts, top movers by firm, filterable feed, trend line once two syncs exist.
- Cards lift 2px on hover; closed postings dimmed. JetBrains Mono (22 KB, self-hosted) for ticker numbers.
- V10 leftovers: phone Sort dropdown 32px; profile hints visible again.
- QA: test_v11 16/16, V10 41/41, V8 123/123.

## V10 — UI cleanup and speed (2026-10-21)
- Design tokens: new `theme.css` holds every color, the 4-step type scale, one radius and the 4px spacing grid. style.css/v4.css/v5.css read only variables, so V11 can re-theme from one file.
- Find: title and live counts share one row; one-line beginner tip; smaller pills and toolbar; one swipeable filter row and a single-row header on phones; "+N similar" fits inside cards.
- Drawer: unknown facts collapse into one "Not listed by the employer" line. "Remote/Unspecified" now reads "Location not listed".
- Profile: About you fits without running under the Save bar; GPA placeholder fits.
- Tracker: empty tracker shows just the empty state and Add/Import; compact stat strip; Undo after deleting rows.
- Speed: phones and GPU-less devices get a pre-rendered planet instead of the 3D globe; layout no longer jumps while loading; first-visit tip floats. Live Lighthouse: desktop 100, mobile 85–94.
- QA: `test_v10.py` (41 UI checks), V8 suite 123/123. Flaw list with status: `ops/V10_AUDIT.md`.

## V9 — Fresh data, honest grades, more firms (2026-10-21)
- Auto-sync (prepared): `ops/workflows/sync.yml` runs a full sync every 2h (:07) and a fast Greenhouse/Lever/Ashby pass on the odd hours (:37), runs `pipeline.qa`, commits only on success, and opens/comments a `sync-failure` issue when a run fails. It is **not active yet**: the repo token lacks the `workflow` scope (see README/report for Ty's steps). Partial runs never close listings they didn't read. Older records missing optional keys no longer crash the sync.
- Header shows "Updated X ago" and warns when data is more than 4h old.
- `pipeline/qa.py`: re-checks company names against the registry, hides listings whose "company" is a job title, cleans city text (keeps a city only if it geocodes), closes listings past their deadline, drops implausible ATS end dates (>200 days out), hides exact duplicates, writes `data/sync_report.json` + `data/sync_history.json`, fails if the open count collapses.
- Persona-report bugs: dropdown ranking (exact > alias > starts-with > word > initials), sponsorship and school aliases, numeric GPA box, resume parser (school, degree, major, grad date) with a "Check these" review step, re-picking a skill never removes it, 36 company names that were job titles fixed (e.g. Otis), location cleanup, visible "Got it" button, Reset dialog that lists what is cleared/kept with an option to clear the tracker. Long text wraps instead of being cut off.
- Grader v2: role groups with adjacent groups, firm tiers where cited, credit for past employers, unknown competition counts as average (not best case), no skills listed is a gap, "Not enough info to grade" instead of a misleading score, at most a few roles per company near the top. Drawer feedback panel: verdict (Strong shot / Worth applying / Long shot), why it's a match, what's holding you back, what to do.
- Coverage: new official boards for Two Sigma (careers site), Morgan Stanley and Evercore (campus boards, crawl-delay 10 honored), Deutsche Bank, PayPal, Home Depot, AT&T, RBC, BMO, TD. Not covered: Citadel (bot challenge), Google (robots.txt disallows job results). Audit of 141 big employers in `ops/COVERAGE.md`.
- Upcoming listings say "Expected <window>" with the basis (past posting dates) in the drawer.
- H-1B history per employer from the official USCIS H-1B Employer Data Hub (FY2022, exact-name matches only), with source link.
- Similar roles at one company (same title, different city/year) are grouped: "N similar roles" expands them in place.
- "New to internships? Start here" box with a one-click filter for roles open to freshmen/sophomores.
- "Found via GitHub" credits removed from listing details.
- Login + email/SMS alerts: proposal only (`ops/ALERTS_PROPOSAL.md`); nothing wired, no secrets in the repo.
- QA scripts: `test/spotcheck.py` (re-opens random listings at the source), `test/coverage.py`, `test/personas.js`.

## V8 — Easier controls (2026-10-20)
- Searchable dropdowns (new `combo.js`, lists in `lists.js`) for school, major, minor, class year, graduation month/year, GPA, work authorization, interests, locations, skills and experience type/dates. They offer fuzzy search ("comp sci", "penn st"), chips for multi-select, virtualized lists, a pinned Popular group, "Other: use …" for your own value, and full keyboard support. Free-text fields auto-grow.
- Every filter pill opens a panel with a search bar, checkable options with live counts, and a "Show N" Apply plus Clear. Location searches cities, states and metros, has quick picks (Remote and the top metros) and a near-a-city radius. Chips are removable one by one, with Clear all. Pills wrap, so there is no horizontal scroll.
- Beginner help: a dismissible first-visit tip, "?" tooltips (Online Assessment, Rolling deadline, Co-op, Summer Analyst, Sponsorship, Match %), glossary terms in the listing drawer, helper text with an example under every profile field, and a "How it works" footer link to the Details screen. Default sort is Closing soonest, switching to Match % after Save & Search.
- Advanced: shortcuts (`/` search, `s` save, `?` help, `Esc` close), Copy link (shareable URL), saved filter presets, tracker bulk select/status/delete with confirmation, search syntax `company:`, `location:` and "exact phrase", and More filters (company size, sponsorship, pay, date posted, season).
- My Profile is now 3 buckets (Resume · About you · Experience). Each column scrolls on its own and a Save/Reset bar stays in view. Two columns on tablet, stacked on phone. This replaces the V6 single-column profile.
- QA: `test_v8.py` gives 123/123 pass. Walkthrough fixes: a state search ("texas", "tx") ranked "Texas City, TX" above the state, so states are now boosted. The graduation year was cut off ("20…"), so the field was tightened.

## V7 — Details screen on the intro
- "Skip intro" is gone. Next to "Find My Internship" there is now a "Details" button (same size, outline style).
- Details: the planet eases to the left and shrinks (on phones it stays on top and shrinks), the hero text fades out, and a panel slides in: "What is Internship Radar?", four short steps with icons (staggered fade-in), the shared live count ("10,871 open internships right now.") and Find My Internship. It uses only transform and opacity (about 0.9s).
- Back, the browser back button and Esc all reverse it. `#details` is a real history state and works as a direct link. With reduced motion it is a simple fade.
- The copy is accurate: the scheduled sync isn't running yet, so step 1 says listings are "checked against company career sites" and shows the real "Last updated X ago" from `data/meta.json` rather than promising a refresh rate.

## V6.2 — Honest feedback page
- New page, "Honest feedback" (#feedback), linked from My Profile and next to the results count once a profile is saved. It is blunt but constructive, and every number is computed in the browser from the saved profile, the live listings and the same scoring engine. Nothing leaves the device.
- Five sections:
  1. Where you stand: A/B/C/D/F counts across the live listings, the median match and a plain verdict.
  2. What's holding you back: skills the matcher looks for in your interest areas that you haven't listed (with counts), no experience, listings you can't apply to because of class year, GPA bars, sponsorship, and elite-firm grades.
  3. Where you can realistically land now: the best industries by B-or-better count, average match by competition level, and your top 6 real listings.
  4. The 3 changes that would move your grades most: each is re-scored across every live listing in the match worker, e.g. "raises 973 listings by one grade or more".
  5. Resume checks: length, quantified bullets, dates, a skills section, an email address, and experience entries without dates or bullets. The uploaded resume text is now kept in localStorage (`idr_resumeText`) for these checks and cleared by Reset.
- The page builds in about 1s for all 3 test profiles (headless Chromium, 10,871 listings). `test_v62.py` writes screenshots `v62-*.png`.

## V6.1 — Speed and grade calibration
- Speed: the logo map is no longer fetched at startup. It loads once the page is idle, about 3s after the intro starts, and only the cards and tracker rows on screen re-render. The match worker still starts only once a saved profile exists. Requests during the first page load (local Lighthouse): 39 down to 23.
- Stricter grading, for honesty (`match-weights.json`): Fit 45%, Odds 40%, Preferences 15% (unchanged). A new strictness curve (score^1.35) pulls every score down, and the top hardest, so A grades are rare. Low competition helps only a little: the odds bonus below competition 40 dropped from +25 to +10, and the final low-competition boost from 0.6 to 0.2. No relief for missing experience, and no competition discount for strong profiles.
- Grade counts over 10,871 live listings, A-range (A+/A/A-) in brackets: no-experience profile median 29%, best grade C (0 A-range, was 0); average profile median 37%, best B+ (0 A-range, was 29); top profile median 40% (266 A-range, was 752).
- Elite firms: JPMorgan Chase, Bank of America and Goldman Sachs are now tier 1 in `config.json`. Each entry cites a public source for its acceptance rate (JPMorgan ~0.7%: 630k applications for ~4,100 interns, Financial News via eFinancialCareers; BofA ~0.8%: ~240k applications for <2,000 internships, Business Insider; Goldman: 315k applications for 2,700 spots, Bloomberg). At these firms a profile with no related experience is capped at 50% (F/D), and one below the firm's GPA bar at 60%. The drawer explains why. `node test/elite_firms.test.js` checks that a no-experience sophomore scores under 55% at every JPMorgan and Bank of America listing; it passes for all 11.
- The sync workflow copy in `ops/workflows/sync.yml` now runs the logo build (new companies only, plus careers-board retries that haven't been tried yet) and commits `assets/logos/`.

## V6 — One match grade, a simpler profile, a bigger tracker, real logos
- Matching: Strong / Realistic / Reach / Hidden Gems are gone. Every listing gets one match % and a letter grade (A+ 95–100 … F under 45). Weights live in one file, `match-weights.json`: Fit 45%, Odds 40%, Preferences 15%. If you're not eligible (class year, sponsorship or citizenship), the score is capped at 40% and the reason is shown.
- The badge sits at the top right of each card ("92% · A") on a green-to-red pastel scale with AA contrast. The detail drawer shows the score, 2–3 reasons and a tip when the score is low. Grades appear only after you save a profile, and then results sort by match %. New "Minimum match" filter: Any / 60%+ / 75%+ / 90%+.
- Rescoring runs in a Web Worker (about 165–210 ms for 10,871 live listings in headless Chromium).
- Profile: a centered single column with three sections (Resume, About you, Experience), a progress bar and 48px inputs. Drop a resume and the form fills itself ("We filled in X fields. Check them below."). LinkedIn PDF or pasted text is optional. School autocomplete, chips for interests, locations and skills, and repeatable experience entries. Drafts autosave. A sticky bar has Save & Search ("Showing your matches. X internships graded.") and Reset to default, which asks first and then clears the profile and grades.
- Tracker, sizing only: full width up to 1600px, 60px rows, 15.5px text, 16px cell padding, a 240px company column with a 28px logo, a 280px role column that wraps to 2 lines (full text in the tooltip), bigger status pills and Closes In badges, big-number stats and a friendly empty state with a Find internships button.
- Real company logos on cards (40px), the drawer (56px), the tracker (28px) and the map tooltips (which now list the top companies in each city). They sit on a white rounded tile with a fixed size (no layout shift), load lazily and fall back to the letter avatar. Built by `pipeline/logos.py` from the company's own site icon (via the public favicon service), its apple-touch-icon, or its public careers board logo. Anything under 48px is rejected, as are placeholder icons shared by unrelated companies and images too light to see on white. Coverage: 1,990 of 2,579 companies (77.2%), which is 9,786 of 11,249 open listings (87.0%).
- Removed: the old match-tier settings in `config.json` and the admin weight editors (see `match-weights.json` instead).

## V5.3 — 3D globe for everyone, tuned per device
- Starting quality tier picked from screen size, devicePixelRatio, CPU cores and device memory, then adapted by frame time (steps down quickly, back up slowly). Never stops, never a static image while WebGL works.
- Phones: 2K WebP Earth texture (206 KB, was a 313 KB JPEG); desktops get a 4K WebP (584 KB, was 1.1 MB), pixel ratio capped at 1.5, lighter sphere meshes, cheap backside atmosphere shader.
- Low tiers draw fewer (largest) hub dots and render at 30fps to free the main thread.
- Checked at 375x667, 390x844 and 768x1024: full planet visible and crisp.

## V5.2 — Intro on every visit
- The globe intro now shows every time someone opens the site root (no more "returning visitors skip it"). Deep links (#find, #tracker, #profile, ?q= and other filter URLs) and in-site navigation skip it; the logo returns to the intro. Skip / Find my internship keep the quick fade.
- The 3D globe starts once the page is idle (requestIdleCallback, 1.5s timeout); the static planet shows until then and the canvas cross-fades in.
- Hover tooltips on planet dots removed; dots still pulse on hover.

## V5.1 — Just the planet
- Intro is now just the V3 planet, rebuilt: NASA Blue Marble texture self-hosted (4K, or 2K on small screens), sRGB, max anisotropy, antialiasing, pixel ratio min(DPR,2), fresnel rim + soft pink/blue atmosphere, small glowing internship-hub dots in one draw call, slow rotation, drag to spin with inertia, hover pulse + tooltip. No ping, sweep, zoom, parallax or cursor effects.
- "Find my internship" does a quick fade to the homepage.
- Cut-off fixed: full-viewport canvas (100vw x 100dvh); the camera distance is solved from globe + halo radius and FOV on both axes so the globe fits inside its slot beside/under the headline (never under the copy); recomputed on resize, visualViewport resize and orientation change.
- Freeze fixed: the old low-fps watchdog disposed WebGL and swapped to a static globe after a few seconds of <40fps (always on software GL). Replaced with adaptive quality tiers (pixel ratio, atmosphere, shader detail) that step down/up with hysteresis and never stop rendering. 60s liveness test: test_v51_alive.py.
- One shared "open" count: header, start-page counter and results line all use open + verified within 24h of the last sync (the sync's meta.open rule; listings you added count too). Unverified open listings no longer appear under Open.
- Missing locations: filled only from explicit location text in the posting (title or description, e.g. "Primary City/State: Mesa, Arizona") that geocodes to a real US city (pipeline/locfill.py, run by sync before compact). Anything else is labelled "Remote" (if the posting says remote) or "Remote/Unspecified". Nothing guessed.
- Intro no longer leaves a scrollbar-gutter strip at tablet widths; test_v5_shots.py updated (no transition shots).
- Also includes the V5 perf work: listings index parsed in a Web Worker, metric-matched Inter fallback, reserved filter/results space (CLS).

## V5 — Website redesign + performance
- Start page: static sky hero (Inter), lazy Three.js globe (V3 planet/ping/zoom, higher quality), drag/zoom/hover/click-city preview, ~1.55s transition, reduced-motion fade, returning visitors skip it.
- Two-stage FPS watchdog (lite globe, then static CSS globe); WebGL disposed after the intro; MSAA off; pixel ratio min(dpr,2).
- Website layout: header (Find / My Tracker / My Profile + profile menu), footer, About/Contact/Privacy pages, max width 1520px.
- Find: horizontal pill filter bar, chips + Clear all, More filters modal, windowed 3/2/1 grid of big cards, friendly "Closes Nov 3" labels, 250ms drawer.
- Compact data index + on-demand detail/description shards; chunked parsing; pdf.js/mammoth lazy-loaded.
- Desktop controls 38–40px / 14.5px text (10f); touch keeps 44px+.
- Renamed to "Internship Radar" — Every internship. Tracked. Matched. Free.

## V3: landing page + globe intro (2026-10-20)
- **Landing** (`landing.js`, `landing.css`): animated coral/pink/violet/sky gradient sky, drifting clouds, faint stars; 3D Earth (globe.gl 2.46.2 via CDN, lazy-loaded after first paint) with atmosphere halo and slow rotation; tilts slightly toward the cursor.
- **Real city dots**: `geocode.py` matches listing city+state against the vendored kelvins/US-Cities-Database (MIT, `vendor/us_cities.csv`) -> `cities.json` (598 cities, 3,319 of 3,672 listings). Unmatched cities get no dot. Brighter/bigger = more listings; hover tooltip shows city + count; click filters Find to that city (clearable chip).
- Headline, subline, live counter (real totals: listings tracked, deadlines this week), "Find My Internship" and "Log in" (coming-soon note).
- **Radar moment** (~2.5s, click to skip): rotate to USA, WebAudio sonar ping (muted by default, sound toggle saved in Store `prefs`), concentric rings, radar sweep that flares dots, zoom into US as the sky deepens, rings settle into a grid background, app slides up over the globe.
- Matches glow on the map: gold = Strong, teal = Realistic.
- Polish: button glow + ripple, 3 fade-in feature sections with animated previews, stacked mobile buttons/smaller Earth, `prefers-reduced-motion` and slow/no-WebGL devices get a static CSS globe with a simple fade.
- Deep links (`#find`, `#tracker`…) skip the intro; logo returns to the landing. All V2 features unchanged.

## V2 (complete, 2026-10-20)
### V2 step 3: matcher (2026-10-20)
- **matcher.js** (fully client-side; pdf.js + mammoth.js from CDN): upload resume PDF/DOCX, LinkedIn "Save to PDF", or pasted LinkedIn text. Nothing is pulled from LinkedIn automatically.
- Parses school, major, GPA, class year (from grad year), past internships/jobs, skills, leadership, clubs into an editable form; saved via `Store('resume')` and synced to Profile. Re-upload and re-run anytime.
- Scores every open listing: **Fit 0-100** (industry, skill, experience, location overlap) and **Odds 0-100** (firm tier, target school, GPA bar, class-year eligibility, related experience). Missing inputs are left out, never guessed.
- Buckets: Strong Match / Realistic / Reach, plus a Poor fit flag, each with a plain-English reason (says "no data on this firm's tier, target schools or GPA bar" when that's the case).
- **config.json** holds every scoring input (weights, thresholds, tier odds, firm tiers, GPA bars, target schools, industry keywords, major→industry). Edit it in admin.html's Matcher config and export. Ships with PLACEHOLDER firm/school rows that name no real organizations and are ignored by scoring.
- Home "Your top matches" slot now filled.

### V2 step 2: tracker (2026-10-20)
- **tracker.js**: every listing card has *Save* and *Mark applied* (shows current status once tracked).
- **Tracker tab**: board with Saved, Applied, Online Assessment, Interview, Offer, Rejected, Withdrawn. Pointer-based drag and drop (mouse + touch) plus a status dropdown on every card; List view (table).
- Per application: date applied (auto-set when marked applied), notes, contact name, next step + date, remove.
- **Add deadlines to my calendar**: RFC 5545 .ics (all-day events, 1-day reminder) for upcoming deadlines of Saved/Applied items and next-step dates.
- Stats: tracked, applied, interview rate (reached Interview/Offer ÷ applied, status history kept), offers.
- Stored in `Store('tracker')` (included in Export/Import). V1 had no tracker; a migration normalizes any legacy tracker shape.

### V2 step 1: database + filters (2026-10-20)
- **Listing schema v2** (`normalize.py`, run by `ingest.py`): company, title, industry, role_type, locations [{city,state}], remote, deadline / rolling, season + year (terms), eligible class_years, apply_url, date_added, source. Unknown fields stay empty and show "not listed"; nothing is guessed. US only.
- **store.js**: one storage module (get/set/export/import/clear) for all user data (profile, saved filters, my listings, review queue, resume, contacts, practice). Migrates V1 keys. Export/Import my data (JSON) in header and Profile.
- **Find**: filters for industry, state, role type, deadline window (this week / this month / dated / rolling), class year, remote, hide closed, include past terms. Saved filters can be named, renamed, updated and deleted.
- **Home**: "Deadlines this week" + placeholder slot for "Your top matches" (step 3).
- **Profile** (local): name, school, major, class year, optional GPA, target industries, preferred locations.
- **Add an internship**: saves to your own list right away and to a review queue (`Submissions.SUBMIT_ENDPOINT` hook for a future server).
- **admin.html**: SHA-256 password gate (client-side, not real security), add/edit/delete, CSV bulk import with validation and dedupe, review-queue approve/reject, export updated data.json for redeploy.
- Past-term listings (e.g. Summer 2026 only) hidden by default.

## V1 (previous bot)
- Static site with 3,672 US listings from SimplifyJobs + zapplyjobs GitHub lists, Provieo non-tech tracker and Ty's Charlotte tracker (`ingest.py`).
- Find tab (search, field/location/deadline/status filters, cards/table, saved searches), For you (in-browser resume parsing + matching), Connect (outreach templates, LinkedIn search links, contact tracker), Practice (timed interview questions).
- localStorage "account" (name/school), Railway Function deploy (`railway_function.ts`).

## V4: live database (2026-10-20)
- **The homepage is the database.** First-time visitors get a short sky + dot-matrix globe intro with Skip; returning visitors land straight on the list. Search is debounced, the sidebar has every filter with live counts (category, role type, state, city radius, work setting, deadline window, date posted, season, class year, company size, sponsorship, pay, status Open/Upcoming/Closed, only my matches, hide saved/applied), plus chips and Clear all. Filters persist in the URL and localStorage. Four sorts. The virtualized list handles 11k+ rows. An optional US map syncs with the filters: click a city or the Remote marker to filter. On mobile, filters open in a bottom sheet.
- **Listing drawer** shows the description, eligibility facts ("not listed" when unknown), the Apply link to the company's own posting, the source, "last verified X ago", and Report issue (closed / wrong info / broken link → public GitHub issue; 3+ closed reports hide a listing).
- **Profile page:** basics, goals, background (resume/LinkedIn PDF or pasted text), eligibility and preferences. It has a strength meter and autosave, and the For You matches update live on the same page.
- **Matcher (phase C):** a competition score built from real inputs only (company size, brand tier, metro population, time open, eligible years, GPA cutoff, openings; unknowns are left out). Odds include competition and rise sharply when competition is low. Match = Fit × Odds. A new **Hidden Gems** bucket appears first for thin profiles, with reasons like "Strong odds: small town, accepts freshmen, no GPA cutoff listed".
- **My Tracker is now an automated spreadsheet** (board/list views removed). Save/Applied add rows automatically, with a duplicate warning. Status pills, live "Closes In" countdown, row tints (amber <7d, red <3d, gray closed), Applied → Date Applied + 7-day follow-up, overdue follow-up highlight, a one-click "Mark as Ghosted?" after 14 idle days, and a "Posting closed" badge. Also: segmented filter, stats strip, inline editing, sortable/resizable columns, sticky header, keyboard navigation, Columns menu, Add row, Import CSV, Export CSV/Excel, and .ics export. Old statuses are migrated.
- **Pipeline** (`pipeline/`) reads company career sites through public job-board APIs: Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Recruitee, BambooHR, Workday, JSON-LD/sitemaps and USAJobs (key needed). Public GitHub lists are used only for discovery, and each lead is verified on its own posting page. The registry has 2,491 companies. Ambiguous postings go to a review queue. The pipeline also geocodes from Census data, dedupes on company+title+location+season, tracks freshness, closes listings that disappear, keeps the last good data on failure, parses deadlines only from posting text/fields, and predicts Upcoming openings from real past posting dates. Includes a daily link check and report collection.
- **Admin:** data-health dashboard, missing-company queue, registry bulk add, ambiguous-posting review, and a hand-checked listings editor.
- Practice, outreach, templates and login stay hidden.
