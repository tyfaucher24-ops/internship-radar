# V21 report (2026-11-05, America/New_York)

Builder audit first, then Parts 1–5. Numbers below were measured from the live published files / repo — never invented.

## Audit baselines (before any V21 code change)

Measured against the live site `https://tyfaucher24-ops.github.io/internship-radar/` (BUILD `65eb7c20c3`) and the repo on commit `029cfe3`, America/New_York.

### 1. `data/meta.json` (live)
| field | value |
|---|---|
| open | 12,663 |
| closing_this_week | 377 |
| updated | 2026-11-05T15:50:32Z |
| companies_tracked | 2,497 |
| companies_with_listings | 1,787 |
| mode | partial |

(Repo `data/meta.json` at audit was older: open 13,024 / updated 2026-10-27 — live cache is newer.)

### 2. Live `data/listings.json`
| | |
|---|---:|
| rows | 21,480 |
| status=open | 14,179 |
| open with ISO deadline | 2,117 |
| open rolling, no ISO deadline | 265 |
| open with neither | 11,797 |
| open has_desc=true | 11,549 |
| open has_desc=false | 2,630 |

Same open rule the Find page uses (`markLive`): **13,830** open (status open, not hidden, not past term, deadline today or later). Screenshot header before change: **13,830 open internships · 377 closing this week** (no "· Live" on the count line yet; Live was only the freshness badge).

### 3. `python3 test/coverage.py` (141 firms)
| | V20 report | Audit (live companies.csv + live listings) | Audit (repo companies.csv + live listings) |
|---|---:|---:|---:|
| covered | 90 | 89 | 89 |
| in registry, 0 open now | 26 | 17 | 27 |
| not in registry | 25 | 35 | 25 |

Live Actions cache had dropped some V20 registry rows (merge fix is Part 3). Spec baseline for the target is the V20 **90 / 26 / 25**.

### 4. Registry
- Repo `data/companies.csv` at audit: **2,516** rows.
- ATS histogram (top): workday 1201, greenhouse 542, ashby 368, lever 180, smartrecruiters 126, workable 73, bamboohr 20, + talnet/jsonld/avature/nystate.

### 5. V19.4 heartbeat present?
Yes — migration `supabase/migrations/20261104000006_live_presence.sql`, `email-alerts.js` heartbeat (≈1.2 s / `radar:page` / visibility / 60 s, 45 s spacing, DNT/GPC, `hbDead`), privacy sentence, `tests/test_v19_4_heartbeat.py` all present. Nothing folded in.

### 6. How the site said "Live"
- Intro `#iN`: `meta.open`.
- Find `#hdrCount`: `liveCounts().open` + closing-this-week; **"Live"** badge via `liveBadge(META.updated)` only while sync ≤ 60 min (`LIVE_MAX_MIN`). That badge meant listings freshness, not visitors.
- Ticker has its own stale-dot.

### 7. Screenshot baselines
Saved under `ops/screens/v21/before-*` (light+dark, 1440+390): Find header count, detail with description, detail with "Full description is on the company posting." (no company about yet). Card-without-deadline shots were attempted; label text before change was "Deadline not published".

---

## Part 1 — Heartbeat verification

| check | result |
|---|---|
| Visit live Find signed out, DNT off | Playwright: one `POST .../rpc/heartbeat` with `{"p_page":"db"}`, HTTP **204** |
| Same browser, 3 reloads | still one heartbeat path (204); upsert, not a new row per reload |
| Signed out + DNT/GPC on | **0** heartbeat requests |
| `admin_live()` with anon/publishable key | **42501** permission denied (admin-only — expected) |
| `SELECT` on `public.live` with anon | permission denied (expected) |

**Parent should run (Supabase SQL / connector as admin):**
```sql
select count(*) as now
from public.live
where at > now() - interval '2 minutes';
-- or: select public.admin_live();
```
Expect `now >= 1` after a real signed-out visit with DNT off. Migration 0006 already applied (per brief).

Nothing visible on Intern Index changed for this part.

---

## Part 2 — Live open count + stats

**Storage choice:** public JSON — `data/counts.json` written each sync by `ops/status.py` (same step as `status.json`). Schema:

```json
{ "schema": 1, "updated": "<iso>", "day": "YYYY-MM-DD", "open": N,
  "new_today": N, "closed_today": N,
  "by_source": { "workday": …, "greenhouse": …, "lead-list": …, … },
  "by_kind": { "employer-board": …, "lead-list": …, "feed": …, "user-added": … },
  "open_rule": "…" }
```

`meta.open_live` kept in lockstep for intro / pre-listings paint. Find header copy: **`{N} open internships · Live`** (Live after the open count). Aria-label: "Live: this count comes from the latest listings sync" (+ "last sync over an hour ago" when stale). Green dot only while sync ≤ 60 min; muted Live (no dot) when older — never a hardcoded inventory integer.

**Stats site** (`tyfaucher24-ops/intern-index-stats`, commit `446e12c`): "Listings (latest sync)" section fetches `INDEX_BASE + data/counts.json?ts=`. CSP `connect-src` allows `'self'` (same-origin relative fetch when Pages path works; product origin via `INDEX_BASE`).

Audit counts (live listings, New York day 2026-11-05): open **13,830**, new_today **155**, closed_today **301**.

---

## Part 3 — Coverage

### What shipped
- Seeds under `pipeline/seeds/` (S&P 500, Fortune US largest, YC hiring US, 14 sector files, priority unresolved). Sources documented in each file header + `build_seeds.py`.
- Prober: Greenhouse/Lever/Ashby/SmartRecruiters/Workable/Recruitee/BambooHR/Rippling/Personio slug tries + careers-page ATS link sniff (`discovered_via=probe:V21:<seed>`), `ops/coverage/new-boards-YYYY-MM-DD.log`.
- Adapters: **rippling** (public board JSON), **personio** (public XML). Jobvite / Teamtailor / Pinpoint / iCIMS: no confirmed public robots-allowed JSON in audit → not added.
- `discover.load()` merges `HEAD:data/companies.csv` over the Actions-cached registry (V20 rows were being wiped by cache restore).
- `ops/coverage_weekly.py` from `ops/status.py` → `data/coverage/weekly-YYYY-MM-DD.md`.

### Probe results (focused run, false positives dropped)
Kept V21 boards (8): AppLovin, Carvana, Coinbase, Datadog, Koch, Reddit, Verisign (Greenhouse); PwC Workday (`US_Experienced_Careers` via careers page). Dropped wrong-tenant hits (Amazon/McDonald's Personio.de, EY Recruitee, BambooHR slug collisions, dead Skydance Lever).

Registry after V21 probe cleanup: **2,520** rows.

### Coverage target
| | V20 | After V21 registry (live listings) |
|---|---:|---:|
| covered | 90 | 90 |
| in registry, 0 open | 26 | 27 |
| not in registry | 25 | **24** (−1) |

**Target:** +25% open **or** −10 not-in-registry. **Neither fully hit yet.** Open Δ needs a sync that actually reads the new boards (see Sync below). Not-in-registry only moved by 1 (PwC name row). Remaining blockers are still BrassRing / ALTCHA / iCIMS / Oracle HCM / Eightfold / 403 — no captcha bypass.

### Unresolved priority firms (compliant path tried; still out or 0-open)
| Firm | Outcome |
|---|---|
| UBS, BNP Paribas, Warburg Pincus, HCA | careers probe: no public ATS JSON |
| Jefferies, Lazard, Moelis campus | tal.net ALTCHA — guard kept, not solved |
| Centerview | no ATS signature |
| Goldman Sachs, KKR, Carlyle, McKinsey, Bain, Deloitte, EY, KPMG, Oracle, IBM, Deere, PepsiCo, Coca-Cola, L'Oréal, Ford, ExxonMobil, Lockheed | careers/slug probe: no new allowed board (or already Workday 0-intern / blocked) |
| Home Depot | already "The Home Depot" in registry (coverage name mismatch); Workday board re-checked |
| PwC | **added** `PwC` Workday row via careers link |
| USAJobs | still off (robots Disallow: /) |
| dreamworkhq | still not ingested |

### Remotive / Arbeitnow / RemoteOK
Not re-enabled (V20 ~0 US interns; left off). Himalayas / Muse / NY State remain wired.

### Robots
All new fetches go through `pipeline/net.py`. Zero captcha/ALTCHA solves. New sources robots notes: Rippling `api.rippling.com` (200 JSON, no robots disallow of the board path in audit); Personio `*.jobs.personio.de/xml` Allow:/; Wikipedia `/wiki/` for about blurbs; seed Wikipedia list articles + yc-oss API for seed files only.

---

## Part 4 — No deadline label

- Card/detail: **No deadline yet** / **Rolling / no deadline posted**.
- Filter: "No deadline yet"; Rolling separate; `Not listed` query token mapped.
- Email digest `when()`: undated ≠ rolling wording.
- Grep: no user-visible "Deadline not published".
- Sort sentinel `'9999'` tested in `tests/test_v21.py`.

Audit share with a deadline label of any kind (ISO or rolling): (2117+265)/14179 ≈ **16.8%**; undated non-rolling ≈ **83.2%** (those now show "No deadline yet").

---

## Part 5 — Descriptions + About

- Sanitizer strengthened (`pipeline/norm.clean_html`: strip script/style/noscript/iframe).
- `pipeline/about.py` → `data/about/{0..15}.json`; seed `pipeline/seeds/company_about.json` (**59** companies with text at report time).
- Drawer: full desc when `has_desc`; else muted lead + About blurb + attribution; else muted + "See the company posting for details."
- Open without desc at audit: **2,630 / 14,179** (~18.5%). Empty description area: **0** by construction after Part 5 (fallback always renders).

---

## Sync / deploy

- Actions run **42070409811** (workflow_dispatch sync, started 2026-11-05 12:01 ET): checked out main **before** V21 commits; was still on the long "Sync from company career sites" step past the hour mark. Cancelled that run (it could not ship V21 code). Pages deploy `42081502574` published BUILD `c676649a56`. New sync `42082258567` started for counts.json + boards + about.
- Pages deploys sharing `concurrency: data-sync` were cancelled while that sync held the group.
- Live BUILD before V21 ship: `65eb7c20c3`. Local stamp after V21 front-end: `c676649a56` (re-stamp if more front-end files change before push).

After numbers section: fill once post-deploy sync lands.

### After (live BUILD `c676649a56` verified 2026-11-05 ~13:12 ET)
| metric | before (audit) | after |
|---|---:|---:|
| meta.open | 12,663 | 12,663 (same published data until V21 sync finishes) |
| Find open (markLive) | 13,830 | **13,830** (header: `13,830 open internships · Live`) |
| coverage | 90 / 26 / 25 (V20) | **90 / 27 / 24** (registry; −1 not-in-registry) |
| registry rows | 2,516 | **2,520** |
| % open with deadline label (ISO or rolling) | 16.8% | 16.8% (label copy changed; dates unchanged) |
| % open with has_desc | 81.5% | 81.5% (same data; fallback UI for the rest) |
| companies with about blurb (seed/cache) | 0 | **59** |
| Live BUILD | 65eb7c20c3 | **c676649a56** |

`data/counts.json` is **404** until sync `42082258567` (started after deploy) writes it. Find count does not depend on that file.

### axe (live after, Playwright + axe-core wcag2a/aa)
Find light 1440: **0**. Detail with desc: **0**. Detail no-desc fallback: **0**. About page: **0**.

---

## Tests
`python3 tests/test_v21.py` → **43 / 43**. Also rechecked: test_v15_live 25/25, test_v17_email 27/27, test_v19_3_search 52/52, test_v20_* green.

## Screenshots
`ops/screens/v21/` — before-* baselines; after-* from live site once BUILD matches (Find Live count, No deadline yet card, detail with desc + About, detail with no-desc fallback; light 1440 + 390).

## Lighthouse / axe
axe wired in `ops/screens_v21.py` (Find + detail desc/nodesc + about). Run against live after deploy; target: 0 violations, CLS ~0, Lighthouse mobile Find ~98 (V19.4 median).

## Workflow changes
**None** to `ops/workflows/*` or `.github/workflows`. No force-add needed.

## SQL to apply
**None** for V21 Part 2 (public JSON). Part 1: migration 0006 already applied — only the admin verification query above.

## Commits (Intern Index)
- `53ae141` Parts 2+4
- `1eacc20` Parts 3+5 (+ registry merge, weekly coverage)
- _(this report / changelog / screens / seed)_ 

Stats site: `446e12c` listing health from counts.json.
