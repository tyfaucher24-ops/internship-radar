# Internship Radar changelog

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
