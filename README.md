# Intern Index

**Every internship. Tracked. Matched. Free.**

A free website that tracks every open US internship (and the ones about to open), keeps your applications in one spreadsheet, and matches you to roles you can actually get: https://tyfaucher24-ops.github.io/internship-radar/

Plain HTML/CSS/JS on GitHub Pages. Data is refreshed by free GitHub Actions. No accounts and no server; everything a student saves (tracker, profile, filters) stays in their own browser, and Export/Import lets them back it up.

## Where listings come from
- **Company career sites, through the public job-board APIs those sites use:** Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Recruitee, BambooHR and Workday. Pages with schema.org `JobPosting` JSON-LD (including sitemaps) are read too. The registry is in `data/companies.csv`.
- **USAJobs:** official API. It needs a free key; set the `USAJOBS_API_KEY` and `USAJOBS_EMAIL` repository secrets (request a key at https://developer.usajobs.gov/APIRequest/). Without them the adapter is skipped.
- **Public GitHub internship lists:** used only to discover companies and leads. A lead is published only after its own posting page is opened and confirmed live.
- **Hand-checked records** (`data/manual.json`) and approved submissions (`data/submissions.json`).
- **Never** LinkedIn, Indeed or Handshake. Students can report a company they saw there ("I saw one elsewhere"); we then add that company's own careers page to the registry.

Every request goes out as `InternshipRadarBot/1.0`. Requests are rate-limited per host and robots.txt is respected. Workday's public job-search endpoint is the one exception to the robots check: it is the same JSON endpoint the company's own careers page calls, and requests to it are rate-limited.

## Pipeline (`pipeline/`)
- `sync.py` runs every 6h through `.github/workflows/sync.yml`. It fetches, detects internships (ambiguous ones go to `data/review.json`), normalizes, geocodes against Census Gazetteer data, dedupes on company+title+location+season (keeping the most official source), and tracks `first_seen`/`last_verified`. Listings that disappear from their board are closed. If a source fails, its last good data is kept and marked stale.
- `linkcheck.py` runs daily (`linkcheck.yml`) and re-opens every listing that isn't confirmed by an ATS API.
- `reports.py` collects public GitHub issues labeled `listing-report` and `missing-company`. Three or more distinct "closed" reports hide a listing.
- **Deadlines** come only from the posting: an ATS field, JSON-LD `validThrough`, or an explicit phrase in the description. Unknown deadlines are left blank and shown as "not listed".
- **Upcoming predictions** come only from real past posting dates, and each one is labeled with its confidence.
- Outputs: `data/listings.json`, `data/meta.json`, `data/health.json` and description shards in `data/desc/`.

Run locally: `pip install requests && python -m pipeline.sync --workers 24` (add `--only greenhouse --limit 50` for a quick run).

## Admin
`admin.html` has the data-health dashboard, review queue, missing-company queue, registry bulk add, hand-checked listings and matcher config. Its password check runs in the browser and is not real security.

## Credits
- School names for profile autocomplete: [Hipo university-domains-list](https://github.com/Hipo/university-domains-list) (MIT).
- Company logos: each company's own website icon (fetched through Google's public favicon endpoint t1.gstatic.com/faviconV2, or from the site's apple-touch-icon), or the logo the company uploaded to its public careers board. robots.txt is checked before every request. Logos belong to their owners. Run `python3 pipeline/logos.py` to rebuild `data/logos.json`, `data/logo-map.json` and `assets/logos/`.
- Match scoring weights: `match-weights.json`.
