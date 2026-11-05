# V20 report (2026-11-04, America/New_York)

## Coverage of the 141-firm target list (`python3 test/coverage.py`)
| | Before V20 | After V20 (registry now, listings from last sync) |
|---|---|---|
| Covered (open listings) | 80 | 90 |
| In registry, 0 open now | 18 | 26 |
| Not in registry | 43 | 25 |

18 firms moved into the registry. 10 now count as covered. 8 are in the registry with 0 open, mostly boards with no US interns today (Deutsche Bank, PJT, Perella Weinberg, Guggenheim, Carlyle, Bain Capital, Eli Lilly, Unilever) and Evercore.

## Open listings
- data/meta.json (last full write 2026-10-27 20:47 UTC, partial mode): open 13,024; companies with listings 1,529 of 2,497.
- data/listings.json now holds 17,483 rows (all states).
- **A sync with the V20 sources has not run yet.** The data has 0 rows from Himalayas, The Muse API, statejobs.ny.gov, speedyapply, zshah101, awesome-ml or jobbie-bot. Per-source open and add counts can't be measured until sync.yml or sync5.yml runs. Those are templates in ops/workflows; Ty has to install them in .github.

## What is wired
- nystate: registry row in data/companies.csv (`ats=nystate`), `@adapter('nystate')` in pipeline/adapters.py, and the sync calls every registry row whose ats is in ADAPTERS. Test passes 6/6.
- Lead tables, Himalayas, Muse: code present, and tests pass (lists 11/11, feeds 13/13).

## Host fixes
- `workday_alive()` and `discover.ats_from_url()` accept `myworkdaysite.com` (`/recruiting/<tenant>/<site>/job/…` and `/<tenant>/<site>/job/…`). test_v20_wdsite 11/11.

## tal.net and the ALTCHA challenge
- A 200 response with a "Quick Check Needed" ALTCHA body is treated as a failed fetch, not an empty board. Existing rows are kept and age out through last_verified ("Check date unknown" after 72 h). test_v20_challenge 7/7.
- Evercore, Jefferies, Lazard and the Moelis campus board stay at 0 rows we can read. We do not solve the challenge.

## Unresolved (from ops/V20-SOURCES.md)
UBS (BrassRing), BNP Paribas (403), Jefferies (ALTCHA), Lazard (Oracle HCM + ALTCHA), Centerview (no ATS), Moelis interns (ALTCHA), Stifel (iCIMS), KKR (slug not found), Warburg Pincus (403), McKinsey (timeout), Bain & Company (no public JSON), KPMG, Oracle (Oracle HCM), IBM, Qualcomm/PayPal/Lockheed Martin (Eightfold), Deere, PepsiCo (iCIMS), L'Oréal. Also from the spec: HCA. Not ingested by design: dreamworkhq (aggregator-only links). USAJobs: off.

## Build, screenshots, Lighthouse/axe
- V20 changes nothing on the site's front end, so the BUILD hash is the same: 65eb7c20c3 (ops/stamp.py re-run, version.json unchanged, live site serves ?v=65eb7c20c3).
- No new screenshots, since nothing visible changed. Lighthouse and axe were not re-run for the same reason; the V19.4 axe pass still applies.

## Ty handoffs
- Install ops/workflows/sync5.yml (and sync.yml) and email-alerts.yml in .github/workflows.
- Paste supabase/migrations/20261104000006_live_presence.sql (V19.4) in the Supabase SQL editor.
- V17 email secrets.
