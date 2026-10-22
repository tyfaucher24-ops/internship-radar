# Internship Radar changelog


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
