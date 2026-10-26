# V16 Phase 0: backend and launch audit (2026-10-26)

Read-only audit; nothing changed except adding this file. HEAD at the start: 8cbd07a.
No secret values are written here. The admin password is not in the repo; only its SHA-256 hash is (see section 3).

## 1. Current architecture
- **Frontend:** a static site on GitHub Pages (index.html, app.js, many layered CSS/JS files). No server.
- **Data:** the pipeline/ Python package builds data/*.json. The browser loads data/meta.json, then data/index.json (6.56 MB raw, 671 KB gzip). Detail and description shards in data/detail/ and data/desc/ load on demand, plus logos.json, h1b.json and schools.json. data/listings.json (14.2 MB) and data/state.json (4.7 MB) are pipeline files, but they are also publicly served.
- **Sync:** .github/workflows/sync.yml runs on a schedule (about every 3 to 6 h) and commits the data back to main. The QA gate is pipeline/qa.py. A failed run opens or comments on a `sync-failure` issue. linkcheck.yml checks apply links.
- **Workers:** data-worker.js parses index.json off the main thread. match-worker.js and resume-worker.js do resume parsing and matching **in the browser**.
- **Third-party runtime:** cdn.jsdelivr.net serves three.js 0.160.0 (pinned, for the globe intro) and d3-array@3, d3-geo@3, topojson-client@3 and us-atlas@3 (major-version only, not pinned). There is no SRI.
- **CSP:** a meta CSP with default-src 'self', script-src that allows 'unsafe-inline' and jsDelivr, and form-action limited to self and github.com.

## 2. Secrets, keys and tokens (working tree and full history)
- Searched tracked files and all of git history (excluding data/) for GitHub PATs, OpenAI/AWS/Google keys, Slack tokens, private keys and .env/.pem/credentials files. **Nothing was found.**
- The workflows use only `secrets.GITHUB_TOKEN`, `secrets.USAJOBS_API_KEY` and `secrets.USAJOBS_EMAIL`, all as GitHub Actions secrets. The USAJobs adapter reads them from the environment. No literal value was found in history.
- The only credential-like value in the repo is the **admin password's SHA-256 hash** (salted with a fixed public salt) in admin.html, committed in 0428912. See section 3.

## 3. What admin.html / admin.js exposes
- admin.html is public. It is linked from the index.html menu, marked noindex, and disallowed in robots.txt (which hides it from search engines but does not block access).
- The "password gate" is client-side. It compares SHA-256('idr-salt:'+input) with a hash shipped in the page and then sets sessionStorage `idr_admin`. **Anyone can bypass it** by setting that sessionStorage key in devtools, or can brute-force a weak password offline from the published hash. The page itself already says it is "not real security".
- **Impact today is low.** The admin page can only edit a working copy in that visitor's own localStorage and export data/manual.json. Nothing reaches the live site unless someone with push access commits the file. It reads only public files (manual.json, config.json and data health).
- **Remaining risk:** the hash is public and permanent in history. If Ty reuses that password anywhere else, it should be considered exposed.

## 4. railway_function.ts
- It is a 91 KB Bun HTTP server holding inlined copies of old V1 site HTML. It came from the "Railway Function deploy" in the V1 changelog.
- It is **untracked** (listed in .gitignore) and is a local leftover in the working copy. **Nothing references it.** It isn't deployed by the repo and isn't used, so it can be deleted locally.
- Railway now has no free tier ($5 trial, then paid; see ops/ALERTS_PROPOSAL.md).

## 5. Repo root clutter (tracked unless noted)
- There are 27 old test_*.py/test.py files in the root. The current suites are in tests/.
- There are 14 stacked CSS files: style.css, theme.css, v4, v5, v13, v133, v134, v14, v141, v1412, v143, v144, v146 and v15. Each layer overrides the one before it, which makes changes risky.
- There are versioned JS files: v111.js, v133.js, v14.js, v144.js and resume-v131.js (alongside resume-core.js).
- Old dirs: legacy/ (2.4 MB), qa-v13.3/, qa-v14/, qa-v14.3/, test/ (1.1 MB) and test-data/.
- Screenshots: 6 screenshot*.png in the root. screenshots/ is 105 MB on disk, and ops/screens/ holds 258 tracked image files (about 53 MB). There are also untracked demo* files, which are not mine.
- Old one-off scripts: shot.py, geocode.py, ingest.py, normalize.py and build_data.py. internships.json and cities.json are from V1. Before deleting any of these, check whether pipeline/ imports normalize.py, since listing.js cites it for the schema.
- **.git is 457 MB.** The main cause is that each sync commits a new 14 MB listings.json (37+ versions) plus index and state. GitHub warns at 1 GB, and Pages sites have a soft 1 GB limit.

## 6. Listings payload and 4G load
| file | raw | gzip | slow-4G (1.6 Mbps) |
|---|---|---|---|
| data/index.json (loaded on every visit) | 6.56 MB | 671 KB | ~3.5 s download + JSON parse of 6.5 MB (~0.3 to 1 s on a mid phone) |
| data/listings.json (not loaded by the site) | 14.2 MB | 1.34 MB | ~7 s if anything ever fetches it |
| data/state.json (pipeline only) | 4.7 MB | 479 KB | n/a |
- Estimated first useful list on slow 4G is **about 4 to 5 s**, plus the globe/three.js on a first visit.
- One code path (app.js line ~336, the live-refresh check) fetches index.json with `cache:'no-store'` and a timestamp, so it **re-downloads the full 671 KB with no cache**. This needs checking and fixing in Phase 2.

## 7. Sync reliability
- **GitHub Actions runs:** the last 46 sync.yml runs available (2026-10-22 to 2026-10-26 UTC) are **29 success, 16 failure, 1 in progress**. That's **about 35% failing**, and at least one failed every day.
- Every failure I sampled is the pipeline/qa.py **mass-removal ("collapse") gate**. A run that would remove more than 8% of open listings is refused. The failing runs wanted to remove 1,043 to 1,718 listings (with 732 to 2,125 added). This gate is working as intended: bad data was **not published**, and the site kept the last good data. However, it means the site is frequently stale for 6 to 12 h.
- The likely root causes are flaky sources (sync_health reports `failed_sources: 40` of about 1,088 boards) and churn in location normalization (`city_dropped_unverifiable` ~1,200 to 1,400 per run). Phase 2 should make a failed source keep its last good listings instead of letting them all drop at once.
- **data/sync_history.json** holds only 31 entries (since 2026-10-21) and logs **only successful runs**, because qa.py exits before it's committed. It has no failure field, so it can't answer "last 50 runs". The Actions log above is the real record.
- The latest successful publish was 2026-10-26 14:40 UTC (10:40 am EDT): 10,953 open listings, +3, −50.

## 8. Where user data lives
- **All of it is in the user's own browser. There is no server or database.**
- **localStorage**, through store.js with an `idr_` prefix: profile, profileDraft, resume, resumeText and resumeParse (**the resume text, which is personal data**), tracker (with trackerCols, trackerSort and trackerW), savedFilters, filters, prefs, myListings, reviewQueue, missingQueue, reports, contacts, tpls, practice, notify, autopilot and apCal/apSeen/apCalOff, warmpaths, sortPicked, liveStaleLog, plus ir_ui, ir_beg_x and idr_intro_seen. Admin-only: adminListings and adminConfig.
- **sessionStorage:** only `idr_admin`.
- **No IndexedDB, cookies, analytics or trackers.** Resumes are parsed in a Web Worker and **never uploaded**.
- **Leaves the browser only when the user clicks:** "Report issue" and "Add an internship" open a prefilled GitHub issue under the user's own GitHub account. `Submissions.SUBMIT_ENDPOINT` is null, so nothing is POSTed.
- **Consequence:** clearing the browser or switching devices loses everything. Phase 3 (accounts) addresses this, but it will be the first time personal data (resumes) is stored on a server, which needs the Phase 4 privacy policy.

## 9. Ranked: launch blockers vs nice-to-haves
**Launch blockers**
1. **Sync fails about 35% of runs** because of the collapse gate, so listings go stale for hours. Fix the per-source "keep last good" behavior and record failures in sync_history (Phase 2).
2. **No privacy policy or terms.** Needed before public launch, and essential once accounts store resumes (Phase 4).
3. **The admin page is publicly reachable with a client-side-only gate.** It's harmless today, but it's linked from the public menu and its hash is public. Remove the menu link and either drop the page from the deployed site or move admin behind real auth (Phase 1 and 3). Don't reuse that password elsewhere.
4. **Repo history growth (457 MB, about +40 MB per day of syncs)** will reach GitHub's 1 GB soft limit in a few weeks. Stop committing listings.json and state.json on every sync, or move them out of git (Phase 1 and 2). **Ty's decision needed** on rewriting history (see below).
5. **First load on mobile is about 4 to 5 s,** and the uncached no-store refetch of index.json happens on every visit. Fix caching and trim index.json (Phase 2).

**Nice-to-haves**
6. Root clutter cleanup: old test_*.py, legacy/, qa-v*/, screenshots, V1 scripts and JSON (Phase 1).
7. Collapse the 14 CSS layers and the versioned JS files into one stylesheet per concern.
8. Pin d3/topojson/us-atlas to exact versions and add SRI, or self-host them, so the CSP can drop jsDelivr.
9. Remove 'unsafe-inline' from script-src, which needs inline scripts moved out first.
10. Delete the local untracked railway_function.ts.
11. Accounts/sync across devices (Phase 3, Supabase free tier).

## Decisions and costs for Ty
- **History rewrite:** shrinking .git means rewriting history (git filter-repo) and force-pushing, which breaks existing clones. The alternative is to stop committing big data from now on and accept the current 457 MB. **It's free, but it's destructive and needs Ty's OK.**
- **Admin page:** keep it public (link removed), take it off the deployed site, or wait for Supabase auth.
- **Supabase (Phase 3):** the free tier is $0 (500 MB DB, 50k monthly active users), but **free projects pause after 7 days without activity**, and the 1 GB file storage limit matters if resumes are stored as files rather than text. Paid Pro is $25/mo, and we are **not** adding it.
- Railway: not needed and not free. No cost has been added in this phase.
