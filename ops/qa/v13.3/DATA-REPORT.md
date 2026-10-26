# V13.3 §6 — Data accuracy report

Run 2026-10-22, 11:20 PM – 12:00 AM EDT. Scripts: `qa-v13.3/data_audit.py`, `qa-v13.3/retry_failed_sources.py`, `ops/health_check.py`.
All fetches go through `pipeline/net.fetch`, which respects robots.txt and is rate limited. Nothing is fetched from LinkedIn.

## 1. 100-listing audit against the company's own posting
The sample is 100 random open listings (seed 133). 91 were checked against the company's ATS feed and 9 against the posting page.
Raw rows: `data-audit.json` (before) and `data-audit-after.json` (after).
"After" means the same 100 postings rebuilt by the fixed parser, which is what the next sync will publish.

| Field | Before | After | Target |
|---|---|---|---|
| Company | 97/97 (100%) | 97/97 (100%) | 98% |
| Title | 97/97 (100%) | 97/97 (100%) | 98% |
| Location | 97/97 (100%)* | 97/97 (100%) | 98% |
| Season / year | 92/97 (94.8%) | 95/97 (97.9%) | 98% |
| Deadline | 96/97 (99.0%)† | 97/97 (100%) | 98% |
| Live (open in source) | 100/100 | 100/100 | — |
| **Dead links shown as open** | **0** | **0** | 0 |

The 3 checked rows that are missing (97 of 100) are posting pages that don't show the fields without a browser. Liveness was still checked for them.

\* The location check accepts a state-only listing when the source names the state. One real miss is hidden by that rule: NVIDIA's "US, CA, Santa Clara" was parsed as city "US", so the listing showed only "California". That is fixed now (see §3).
† FOX: the record says Nov 22 and the ATS end date says Nov 23. The posting text says "Application Deadline: Sunday, November 22, 2026", so our date is the correct one; the checker only had the feed text.

**Remaining season misses (2):** Huck Adventures and Transcard Payments. Both posting pages are script-rendered and never state a term, so the term comes from the curated list that pointed us to them. These count as unverifiable, not wrong.

**Checker false positives fixed during the run:** a first pass flagged DocuSign as dead and missed a term on Shure. The cause was text inside page scripts and an over-short text window. After the checker was fixed, DocuSign was re-verified as live (HTTP 200, title present).

## 2. Liveness
- **ATS listings (9,853):** a listing that leaves its company board closes on the next sync where that board fetch succeeds.
  - Fast pass every 30 min (Greenhouse, Lever, Ashby); full pass every 2 h.
  - A past deadline closes a listing on any job.
- **Curated-list and hand-checked listings (1,376):** link re-check on every full sync and daily.
- **Open past-season listings shown on the site: 0.** Of 11,334 open records, 51 had `past_term`; the site, compact index and counts all exclude them.
  - 3 of the 51 were wrong: e.g. "Summer Intern- IT & Cyber Audit (2027)" was marked Summer 2026 from description text.
  - These 3 are fixed (§3). 48 genuinely past-term records stay hidden.
- **Open listings with a past deadline: 0.**
- **Honest caveat:** GitHub's scheduler does not always fire on time. `sync_history.json` shows a gap of about 19.5 h on Oct 21–22.
  - The 2 h close guarantee holds only when the scheduled run fires.
  - The new health gate logs every run, so gaps are visible.

## 3. Fixes made
- **Season from title:**
  - `norm.terms_from` now reads "2027 Summer …" (year first).
  - A future year in the title beats a past term read from the description.
  - It combines one season word plus one year ("Summer … (2027)") but never guesses a season that isn't stated.
  - Applied in `sync.build_record` and in every hygiene pass. On current data that is 671 listings gaining a correct season and 3 wrongly hidden listings restored.
  - Titles with a past year in them (e.g. "2026 Intern Conversion: 2027 …") are left alone.
- **Locations:** Workday-style "US, CA, Santa Clara" now parses to Santa Clara, CA. State-only sources still show the full state name; no city is ever guessed.
- **"Verified X ago" on every card:**
  - Uses `last_verified`; the detail panel already showed it.
  - Records not yet verified say "Not verified yet".
  - Cards stay at 292 px with no clipping (checked at 1440 and 390, both themes).
- **Deadlines:** unchanged rule. A date appears only when the ATS or the posting text states one; otherwise "Rolling deadline" or "No deadline listed". The audit found 0 invented deadlines.
- **Titles and dedupe:** title 100% match; dedupe keeps the ATS link (existing rank `ats` > `jsonld` > `manual` > `github-verified`). Duplicate rate per health.json: 7.4% of raw rows merged.

The data fixes take effect on the next CI sync; the data files from this run were not committed, to avoid fighting the bot.

## 4. Failed sources (retried)
40 boards failed on the last sync, and all 40 still fail on retry with HTTP 404: 23 Greenhouse, 15 Ashby, 2 Lever. The boards have moved or closed.
None of them still has an open listing on the site. Full list: `failed-sources.json`.
Next step (not done): re-discover the new board slugs for those companies.

## 5. Sync health log + CI gate
`ops/health_check.py` runs after each sync and appends one row to `data/sync_health.json`.
It fails the run if the open count moves more than ±30% against the previous sync, or if more than 2% of checked links are dead.
Current row: open 11,179 (0.0% change), 20 dead of 5,258 checked (0.38%), 40 failed sources, 97.9% verified in 24 h, ok.
It is wired into `ops/workflows/sync.yml` only. **Blocked:** `.github/workflows/` was not touched because the token lacks the workflow scope; someone with that scope needs to copy the step.

## Before → after summary
| | Before | After |
|---|---|---|
| Season/year accuracy (sample) | 94.8% | 97.9% (rest unverifiable) |
| Deadline accuracy | 99.0% (checker) / 100% hand-checked | 100% |
| Dead links shown open | 0 | 0 |
| Listings missing season despite title stating it | 671 | 0 |
| Future listings wrongly hidden as past | 3 | 0 |
| Cards showing verification age | 0 | all |
| Health gate | none | ±30% / 2% gate + log |
