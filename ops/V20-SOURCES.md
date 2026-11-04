# V20 data sources: what I found (gathered 2026-11-04, about 5–6 PM ET)
I checked every claim with a live fetch from the box (python requests, UA "InternIndexResearch/1.0"). "robots" means I fetched /robots.txt and checked the exact path with urllib.robotparser for UA `*`. No repo files were changed.
Already used by the repo (per data/state.json and companies.csv): SimplifyJobs/Summer2027, vanshb03/Summer2027, zapplyjobs/Internships-2027 links, speedyapply (as a discovery source).

## A. Free public sources (each one fetched today)
| Source | URL | HTTP | Format | US intern records reachable | Date field | robots | Terms / notes | Verdict |
|---|---|---|---|---|---|---|---|---|
| SimplifyJobs/Summer2027-Internships | raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json | 200 | JSON (17,640 rows) | 5,139 active; 3,815 active with a US location; 2,662 updated in the last 60 days | date_posted, date_updated (no deadline) | raw.githubusercontent.com/robots.txt = 404, so no rules | 48,292 stars, pushed 2026-11-04 | PASS (already used) |
| vanshb03/Summer2027-Internships | …/vanshb03/Summer2027-Internships/dev/.github/scripts/listings.json | 200 | JSON (2,896) | 2,124 active / 1,851 US | date_posted/updated | no robots (404) | 9,171 stars, pushed 2026-11-04 | PASS (already used) |
| zapplyjobs/Internships-2027 | …/zapplyjobs/Internships-2027/main/README.md | 200 | MD table | 600 intern rows | relative age ("35m") | no robots | 5,253 stars, pushed 2026-11-04; links go through the zapply.jobs redirector | PASS (already used) |
| speedyapply/2027-SWE-College-Jobs | …/speedyapply/2027-SWE-College-Jobs/main/README.md (+INTERN_INTL.md) | 200 | MD/HTML table | 751 intern rows (README = US) | age ("2d"), pay | no robots | 9,603 stars, pushed 2026-11-04 | PASS |
| pittcsc/Summer2027-Internships | …/pittcsc/Summer2027-Internships/dev/.github/scripts/listings.json | 200 | JSON (14,916) | 1,670 active US, but 0 updated in the last 60 days | dates | no robots | 67 stars, last push 2026-08-30 (>30 days) | FAIL (stale) |
| dreamworkhq/Tech-Internships-2027 | …/dreamworkhq/Tech-Internships-2027/main/data/listings.json + business-listings.json | 200 | JSON | 1,899 tech + 440 business + 34 crypto (+1,665 international); 1,245 intern README rows | postedAt, firstIndexedAt, salary | no robots | 155 stars, pushed 2026-11-04. **Has non-tech business internships** | PASS |
| ApplyGuy/2027-Internships | …/ApplyGuy/2027-Internships/main/data/internships.json | 200 | JSON (not dict rows; my parse failed) / README 483 intern rows | ~483 | unverified | no robots | 41 stars, pushed 2026-11-04 | PARTIAL (format not verified) |
| zshah101/Automated-List-…-2027… | README | 200 | MD | 557 intern rows | ? | no robots | 964 stars, pushed 2026-11-04 | PASS (overlaps heavily with Simplify, I assume) |
| Chieler/Summer-2027-SWE-Internships | README | 200 | MD | 3,441 intern rows | ? | no robots | 29 stars, pushed 2026-11-04; low trust | MAYBE |
| zapplyjobs/awesome-ml-internships-2027 | README | 200 | MD | 324 | age | no robots | 463 stars, pushed 2026-11-04 | PASS (ML only) |
| jobbie-bot/Summer-2027-Tech-Internships | README | 200 | MD | 116 | ? | no robots | 100 stars, pushed 2026-11-04 | PASS (small) |
| northwesternfintech/2027QuantInternships | (repo API only) | 200 | – | not counted | – | – | last push 2026-07-30 (>30 days) | FAIL (stale) |
| Himalayas API | https://himalayas.app/jobs/api/search?q=intern&country=US | 200 | JSON | totalCount 757; in a sample of 140, 139 had "intern" in the title and all were US or unrestricted (remote only) | pubDate, expiryDate | robots 200, allowed | **Terms: visible Himalayas credit link required; must use applicationLink; "do not pass them on to … Google Jobs"**. If our SEO pages emit JobPosting schema for these rows, that would violate this. Max 20 per request, cursor paging | PASS (with conditions) |
| The Muse API | https://www.themuse.com/api/public/jobs?level=Internship&location=United%20States | 200 | JSON | 59 (3 pages) | publication_date | robots 200, allowed | no key; anonymous rate limit (I have not checked their docs on this) | PASS (small) |
| Remotive | https://remotive.com/api/remote-jobs?search=intern | 200 | JSON | 0 intern titles (11 results; full feed 11 jobs) | publication_date | allowed | – | FAIL (0) |
| Arbeitnow | https://www.arbeitnow.com/api/job-board-api | 200 | JSON | 0 US intern in pages 1–5 (1,463 jobs, mostly Germany) | created_at | allowed | asks for a link back | FAIL (0 US) |
| RemoteOK | https://remoteok.com/api | 200 | JSON | 1 intern of 99 | date | allowed | requires a link back to RemoteOK | FAIL (≈0) |
| Jobicy | https://jobicy.com/api/v2/remote-jobs?count=100&geo=usa | 200 | JSON | 0 intern of 100 | pubDate | allowed | – | FAIL (0) |
| Working Nomads | https://www.workingnomads.com/api/exposed_jobs/ | 200 | JSON | 7 "ntern" string hits (not counted per record) | – | allowed | – | FAIL (≈0) |
| We Work Remotely RSS | https://weworkremotely.com/remote-jobs.rss | 200 | RSS | 1 intern item of 100 (not US-only) | pubDate | allowed | – | FAIL |
| HN "who is hiring" RSS | https://hnrss.org/whoishiring/jobs?q=intern | 200 | RSS | 2 items | pubDate | allowed | – | FAIL (tiny) |
| NY State Jobs | https://statejobs.ny.gov/public/vacancyTable.cfm | 200 | HTML table | 29 student assistant/intern rows of 1,795 | posted + **deadline** columns | robots.txt 404 (no rules) | public state site | PASS (small, but has deadlines, non-tech, gov) |
| USAJobs search API | https://data.usajobs.gov/api/search | 401 without key | JSON | not verified (no key) | yes | **data.usajobs.gov/robots.txt = "Disallow: /"** | The key is free (request form at developer.usajobs.gov/apirequest, 200; email only, no card). The adapter already exists | Strictly by robots, NO. But it's an official, documented API, so you decide |
| USAJobs historicjoa (no key) | https://data.usajobs.gov/api/historicjoa?StartPositionOpenDate=2026-10-20&EndPositionOpenDate=2026-11-04 | 200 | JSON | totalCount 12,891 for 15 days; intern/student count not finished (my paging loop failed after ~3 minutes) | open/close dates | same Disallow: / | – | UNVERIFIED |
| governmentjobs.com (NEOGOV) RSS | https://www.governmentjobs.com/jobs/rss?keyword=intern | 200 (HTML, not RSS) | – | – | – | **robots disallows** | – | NO |
| Idealist | https://www.idealist.org/en/jobs?q=intern | 200 | HTML, 0 JobPosting JSON-LD | not countable | – | allowed | needs scraping of HTML/JS | FAIL |
| Built In / Levels.fyi / YC jobs / WayUp / internships.com | builtin.com/jobs?search=intern, levels.fyi/internships, ycombinator.com/jobs…, wayup.com, internships.com | all 200 | HTML behind Cloudflare headers; no JSON-LD on Built In; no __NEXT_DATA__ on Levels | not counted | – | robots allows the paths | HTML scraping of a commercial aggregator; not a public data API | NO (scraping) |
| Handshake / CalCareers / UN careers | joinhandshake.com, calcareers.ca.gov, careers.un.org | 200 | HTML | 0 usable records (login or JS) | – | – | – | FAIL |
Not verified: university career-board ICS/RSS feeds (I didn't find a public one in this pass), chamber-of-commerce boards, and the ApplyGuy JSON schema.
**Part A: 12 sources passed** (Simplify, vanshb03, zapply, speedyapply, dreamworkhq, zshah101, awesome-ml, jobbie-bot, Himalayas, The Muse, NY State Jobs, plus ApplyGuy and Chieler as partial). Only these are new: speedyapply-as-rows, dreamworkhq, Himalayas, Muse, NY State, zshah101.

## B. The 43 firms marked "not in registry"
Workday probe: POST https://HOST/wday/cxs/TENANT/SITE/jobs with searchText intern, then internship and co-op, fully paged. "Intern" means the title matches intern/internship/co-op/summer analyst/associate. "US" means the locationsText or path matched a US place. "3 Locations" rows are not counted as US, so US numbers are a lower bound.
Robots for *.myworkdayjobs.com: 200, allowed. For wd1.myworkdaysite.com, robots.txt returned 422, so there are no rules.
| Firm | ATS | Adapter slug | Probe HTTP / result | Robots | Status |
|---|---|---|---|---|---|
| Wells Fargo | workday (myworkdaysite) | wd1.myworkdaysite.com/wf/WellsFargoJobs | 200, total=717; 4 intern, 3 US (e.g. "2028 Investment Banking Summer Internship", Houston TX). Note: wfrs/… is wrong. workday_alive() regex only matches myworkdayjobs.com | no rules | SOLVED |
| UBS | BrassRing (jobs.ubs.com/TGnewUI…, 200); ubs.wd3/ubs/UBS_Careers and UBS_Experienced_Professionals = 422 | – | no Workday tenant found | jobs.ubs.com/ = 403 | UNRESOLVED (BrassRing: no adapter, no public JSON found) |
| Deutsche Bank | workday | db.wd3.myworkdayjobs.com/db/DBWebsite | 200, total=598; 37 intern, 0 US now | allowed | ATS RESOLVED, 0 US interns today |
| BNP Paribas | unknown | – | group.bnpparibas/en/careers 403; careers.bnpparibas.com SSL EOF | – | UNRESOLVED (403/blocked) |
| RBC | workday (jobs.rbc.com is Phenom) | rbc.wd3.myworkdayjobs.com/rbc/RBCGLOBAL1 | 200, total=300; 37 intern, ≥6 US (2028 Global Markets Summer Associate, New York) | allowed | SOLVED |
| BMO | workday (jobs.bmo.com is Phenom) | bmo.wd3.myworkdayjobs.com/bmo/External | 200, total=594; 8 intern, 2 US (Chicago IL) | allowed | SOLVED |
| TD Securities | workday | td.wd3.myworkdayjobs.com/td/TD_Bank_Careers (linked from careers.td.com) | 200, total=1517; 8 intern, ≥4 US | allowed | SOLVED |
| Jefferies | talnet jefferies.tal.net | jefferies.tal.net | 200, but the body is an ALTCHA "Quick Check Needed" challenge, 0 rows | robots allowed | UNRESOLVED (bot challenge). **Warning: the existing talnet adapter (Morgan Stanley, Evercore) probably hits this too** |
| Lazard | Oracle HCM (icbpjb.fa.ocs.oraclecloud.com) + lazard-careers.tal.net | – | tal.net = ALTCHA challenge | – | UNRESOLVED (no adapter for Oracle HCM; tal.net challenge) |
| Centerview | none detected on careers page (200) | – | no GH/Lever/tal.net (tal.net SSL EOF; GH centerviewpartners 404) | – | UNRESOLVED |
| PJT Partners | workday | pjtpartners.wd1.myworkdayjobs.com/pjtpartners/Careers | 200, total=41; 0 intern | allowed | ATS RESOLVED, 0 interns today |
| Moelis | workday + tal.net (campus) | moelis.wd1.myworkdayjobs.com/moelis/Experienced-Hires | 200, 0 intern; moelis-careers.tal.net = ALTCHA | – | UNRESOLVED for interns (campus board behind challenge) |
| Perella Weinberg | workday (myworkdaysite) | wd1.myworkdaysite.com/pwp/pwp_experienced_opportunities | 200, total=3; 0 intern | no rules | ATS RESOLVED, 0 interns |
| Guggenheim | workday ×2 + icims | guggenheim.wd1.myworkdayjobs.com/guggenheim/Guggenheim_Partners (200, total 5); guggenheiminvestment.wd5…/guggenheiminvestment/External (200, total 19); External_Careers_Site = 403 | 0 intern | allowed | ATS RESOLVED, 0 interns |
| Stifel | iCIMS (careers-stifel.icims.com); stifel.wd1/Stifel_Careers 422 | – | – | – | UNRESOLVED (iCIMS: no adapter) |
| KKR | Greenhouse embed on kkr.com/careers/career-opportunities (200), but the `for=` value I parsed was "stage"; kkr.wd1 variants 422 | – | GH kkr 404 | – | UNRESOLVED (slug not found) |
| Carlyle | workday | carlyle.wd1.myworkdayjobs.com/carlyle/Carlyle | 200; 1 intern, 0 US (carlyle.com = 403) | allowed | ATS RESOLVED, 0 US interns |
| TPG | greenhouse | tpgcareers | 200, 19 jobs, 3 intern ("Y Analytics … Research Assistant, Internship", Remote) | allowed | SOLVED (remote) |
| Bain Capital | workday | baincapital.wd1.myworkdayjobs.com/baincapital/External_Public | 200, total=17; 0 intern | allowed | ATS RESOLVED, 0 interns |
| Warburg Pincus | ? | – | warburgpincus.com/careers 403; GH 404 | – | UNRESOLVED (403) |
| Bridgewater | greenhouse | bridgewater89 | 200, 22 jobs, 1 intern ("2027 Investment Associate Intern", New York City) | allowed | SOLVED |
| McKinsey | own site | – | www.mckinsey.com read timeout (no status) | – | UNRESOLVED |
| Bain & Company | own site | – | bain.com/careers 200, no ATS signature | – | UNRESOLVED (no public JSON found) |
| PwC | workday | pwc.wd3.myworkdayjobs.com/pwc/US_Entry_Level_Careers | 200, total=50; 34 intern titles (e.g. "Chicago - Tax JD - Intern - Summer 2027", IL-Chicago); my regex confirmed 4 as US, but the site is US-only | allowed | SOLVED |
| KPMG | unknown | – | kpmg.wd1/kpmg/US_Careers and KPMG_US 422; kpmguscareers.com 200, no ATS signature or job links | – | UNRESOLVED |
| Oracle | Oracle HCM (eeho.fa.us2.oraclecloud.com) | – | careers.oracle.com 200 | – | UNRESOLVED (no adapter for Oracle Recruiting Cloud) |
| IBM | own (careers.ibm.com returned 202) | – | no signature | – | UNRESOLVED |
| Qualcomm | Eightfold (careers.qualcomm.com 200) | – | – | – | UNRESOLVED (no Eightfold adapter) |
| PayPal | Eightfold (careers.pypl.com 200) | – | – | – | UNRESOLVED (no Eightfold adapter) |
| Lockheed Martin | Eightfold; lockheedmartinjobs.com/search-jobs redirects to a 404 page | – | – | – | UNRESOLVED |
| Deere | unknown; johndeere.wd5 External / JohnDeere = 422 | – | deere.com careers 200, no signature | – | UNRESOLVED |
| Eli Lilly | workday (found in Phenom page source) | lilly.wd115.myworkdayjobs.com/lilly/LLY | 200; 5 intern, 0 US today | allowed | ATS RESOLVED, 0 US interns |
| PepsiCo | iCIMS (pepsico.icims.com) | – | – | – | UNRESOLVED (iCIMS: no adapter) |
| Coca-Cola | workday | coke.wd1.myworkdayjobs.com/coke/coca-cola-careers | 200, total=125; 2 intern, 0 US confirmed ("2 Locations") | allowed | ATS RESOLVED, US unconfirmed |
| Unilever | workday | unilever.wd3.myworkdayjobs.com/unilever/Unilever_Experienced_Professionals | 200; 12 intern, 0 US (Rotterdam etc.) | allowed | ATS RESOLVED, 0 US |
| L'Oreal | own (careers.loreal.com 200; apply site 403) | – | – | – | UNRESOLVED |
| AT&T | workday | att.wd1.myworkdayjobs.com/att/ATTcollege (ATTGeneral works, 200 total=1148, but has 0 interns) | 200; 6 intern, 5 US (Dallas TX) | allowed | SOLVED |
| Home Depot | workday + BrassRing | homedepot.wd5.myworkdayjobs.com/homedepot/CareerDepot | 200, total=260 (CareerDepot does work); 0 intern | allowed | ATS RESOLVED, 0 interns |
| Ford | Radancy site with JSON-LD | sitemap:https://www.careers.ford.com/sitemap.xml (filter to /job/ URLs containing "intern") | search page 200 (53 results), detail pages 200 with JobPosting; samples were ON/Paris; 18 intern URLs in sitemap | /search-jobs/ disallowed; detail and sitemap allowed | PARTIAL (no US intern confirmed) |
| ExxonMobil | SuccessFactors | RSS jobs.exxonmobil.com/services/rss/job/?keywords=(intern) returned 200 | **robots Disallow: /services/** | NO | UNRESOLVED (robots) |
| Kaiser Permanente | Radancy JSON-LD | sitemap:https://www.kaiserpermanentejobs.org/sitemap.xml (intern filter) | search 200 (97 results; that path is robots-disallowed); detail JSON-LD 6 intern, CA; 8 intern URLs in sitemap | detail/sitemap allowed | SOLVED (needs the sitemap intern filter) |
| HCA Healthcare | ? | – | careers.hcahealthcare.com 403 | – | UNRESOLVED (403) |
| UnitedHealth Group | Radancy JSON-LD | sitemap:https://careers.unitedhealthgroup.com/sitemap.xml (intern filter) | detail pages 200: 15/15 JobPosting intern (AR, MA, …); 17 intern URLs in sitemap (24,140 total) | detail/sitemap allowed; /search-jobs disallowed | SOLVED (needs the sitemap intern filter) |
**Part B: 10 of 43 solved with real US intern records:** Wells Fargo, RBC, BMO, TD, TPG, Bridgewater, PwC, AT&T, Kaiser, UHG.
11 more have a working ATS endpoint but no US interns today: DB, PJT, PWP, Guggenheim, Carlyle, Bain Capital, Lilly, Coke, Unilever, Home Depot, plus Moelis (experienced hires only). Ford is partial.
The other 22 are UNRESOLVED.
Adapter note: jsonld with `sitemap:` takes the first 150 job-looking URLs, which won't reach the intern pages on UHG (24k URLs). It needs an "intern" URL filter, which is a code change.

## C. Recommendation, ranked by coverage per build hour
1. **Add the 10 solved firms plus the 11 working Workday/GH slugs as registry rows** (0 code). Only CSV rows are needed, and they pick up interns automatically when firms post them. 30 min. Check that the workday adapter's fallback URL and workday_alive() handle myworkdaysite hosts (WF, PWP).
2. **dreamworkhq/Tech-Internships-2027 JSON** (≈2.3k rows including 440 business internships, with postedAt and salary). It's a new GitHub JSON like the existing Simplify ingest. About 1 hour.
3. **speedyapply README rows** (751 intern rows, with pay) as listings, not just discovery. About 1 hour. Dedupe against Simplify.
4. **Himalayas API** (757 US/remote intern results, expiryDate). About 1 hour. **Flag:** their terms require a visible credit and forbid passing jobs to Google Jobs, so leave these rows out of the JobPosting JSON-LD/SEO pages.
5. **Radancy sitemap + JSON-LD with an intern URL filter** (UHG, Kaiser, Ford, and likely many other Radancy employers). About 2 hours. Only the sitemap and /job/ detail pages, which robots allows. **Never** /search-jobs/, which robots disallows.
6. **NY State Jobs vacancy table** (29 student/intern roles with real deadlines). About 1.5 hours of HTML parsing. robots.txt is 404.
7. **The Muse API** (59 US internships). 30 min, small.
8. USAJobs: the key is free (email only). But data.usajobs.gov/robots.txt is `Disallow: /`, so you need to decide whether an official keyed API counts as allowed under your robots rule.

**Don't do (scraping or forbidden):** tal.net boards (ALTCHA challenge; also check the existing Morgan Stanley/Evercore talnet rows), ExxonMobil RSS (/services/ disallowed), Radancy /search-jobs/ pages (disallowed), governmentjobs.com (disallowed), Built In / Levels / WayUp / internships.com / YC HTML (commercial pages behind Cloudflare), and BNP/Carlyle/Warburg/HCA (403).

## What I could not verify
- USAJobs keyed search counts (no key); historicjoa intern count (my paging loop failed).
- ApplyGuy JSON schema; the overlap between the GitHub lists and Simplify.
- US share for Coke, Ford, and Workday "N Locations" rows (I didn't fetch detail pages).
- Correct Workday tenants for KPMG, UBS, Deere, KKR (every guess returned 422); McKinsey (timeout); Bain & Co, IBM, L'Oreal, Centerview (no machine-readable source found).
- The Muse and Himalayas rate limits (I didn't read the full docs).
