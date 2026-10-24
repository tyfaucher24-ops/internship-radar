# Intern Index — V15 QA audit: grading, Honest Feedback, matches, performance
Date: 2026-10-24 (ET). Audited copy: `/workspace/qa-v15/sandbox` (a read-only copy of `/workspace/internship-radar` at audit time; no site code was edited or committed).
All profiles are fictional (`results/profiles.json`). The listings are the live `data/index.json` (14,292 rows: 12,806 non-closed, including 1,606 predicted "(expected)" placeholders). All numbers below come from the harness in `harness/`; the raw output is in `results/`.

**About grade steps:** the site's grades go up in 5-point sub-grades (C, C+, B-, …), so one full letter is 15 points (`match-weights.json` grades).

## Top 10 findings (ranked by impact)

| # | Finding | Evidence | Impact |
|---|---|---|---|
| 1 | **97.8% of listings have no real competitiveness data, but still get confident "safety" and "A" labels.** 12,518 of 12,806 non-closed rows fall back to estimated tier 4 ("Moderately competitive"). Only 288 rows use a known tier. As a result, 92% of a strong profile's top-10 matches are tagged *safety*, and so are 58% of a **freshman with one class project** (example: `q011` Cornell freshman → *Neuralink, Neuroengineer Intern: A 90, safety*). | `harness/match.js`, `results/match_raw.json`, `summary_match.json` | Very high: dishonest optimism at well-known selective employers, and the main thing that makes "Honest Feedback" not honest |
| 2 | **A single class project counts as "directly relevant" experience (Experience = 90).** The same freshman gets "Built a full-stack web app…, directly relevant", which outweighs any internship gap. | same example, breakdown | High: inflates novices; makes grades contradict each other |
| 3 | **School is the largest single swing factor in IB, PE and consulting, and zero everywhere else.** In-field mean (target − unlisted school): IB +8.8 pts, PE +8.6, consulting +8.2. Up to **20 pts** (4 sub-grades). School alone changes the letter grade in **55.8%** of in-field IB pairs and 49.3% of consulting pairs. It moves the grade by more than 1 full letter in 2.9% (IB) and 4.3% (consulting) of pairs. In SWE, data, mech, health, accounting, marketing and ops it is 0.0. | `run_grades.js` + `analyze.js`, `results/summary_infield.json`, `school_swap_flags_infield.json` | High: this is the owner's main concern. The pattern is directionally honest but the size is too large (see research) |
| 4 | **Leaving the school blank beats naming a real non-target school.** In IB/consulting, a blank school scores **+5.0 (IB) / +4.6 (consulting) pts** above Ohio State, Queens, Howard-unlisted, App State, WGU or a community college. Blank beats a listed non-target school in **72.2%** of IB/consulting pairs. This happens because a missing school is dropped and its 25% weight is re-spread, while a listed non-target school is scored 35/100. | `summary_grades.json` (`blankSchoolBeatsUnlistedInIbConsulting`) | High: a perverse incentive, and it penalises honesty |
| 5 | **Leaving GPA blank is worth the same as a 3.3 GPA.** In-field median pct: blank 59, 2.8 → 54, 3.0 → 56, 3.3 → 59, 3.5 → 63. Mean: blank 57.4 vs 3.0 → 55.9. A parsed resume with no detectable school also loses its GPA and major, which raises its grade by up to +10.4 pts (`q124`). | `targeted.js` → `summary_targeted.json`; `resumes.js` → `resume_parse.json` | Med-high: rewards hiding a low GPA |
| 6 | **The Feedback page takes 8.0 s at 1× CPU and 11.3 s at 4× CPU slowdown** (Playwright, sandbox build, no industries picked). Cause: `renderOverall` waits for **5 what-if profiles × all 12,806 rows** in a new worker (Node: 7.2–7.8 s). It also runs a **duplicate main-thread pass** (`scoreAll`, 1.7–2.7 s) that repeats the worker rescore. Each `score` call re-normalises firm alias lists with no caching (`norm` is 24.9% of CPU; normalisation, regex and tierOf/firmLevel/firmRow work is about 40%). | `harness/perf.js`, `perf_browser.py`, `results/perf_node.json`, `perf_browser.json` | High UX cost |
| 7 | **Grade and tag text contradict each other on cards.** On 10.8% of cards the card tag says **"Reach"** while the V14.3 tag says **"target"** (for example *Intuit AI Scientist Intern*: card "Reach", v143 "target"). Of the 222 audited cards, 43.7% contain a redundant sentence, 45.9% a garbled skills sentence and 4.1% broken verdict grammar (verbatim examples below). | `feedback_quality.js` → `results/feedback_quality.json` | Medium: hurts trust and clarity |
| 8 | **Grades are harsh off-field and generous in-field at big-name firms.** Across all role groups a "strong" profile is 76% F (expected, since most of those roles are off-field). In-field, a strong profile is 37.7% A with a median of 77. The strong Harvard SWE profile gets **A+ 96 at Databricks, Uber and DoorDash**, all tagged "target". Liberal-arts majors have the weakest in-field outcomes (median 35, 63.6% F) because few listings map to them. | `summary_infield.json`, `match_raw.json` | Medium |
| 9 | **Top-10 match quality is good on relevance and openness, and weak on location and some class years.** `rank143` top-10: 97.3% relevant, 86.7% genuinely open (not placeholder, not >120 days old), 98.2% have an apply link, 7.3 unique companies per 10, and **only 14.2% are in the user's chosen locations**. Community-college students see 50% of their top-10 at listings whose class_years exclude their year label. Graduate students in the app sort see 46%. | `summary_match.json` | Medium |
| 10 | **Some code comments and copy carry numbers that need updating or citations.** The match-core GPA comment says "NACE: 40-47% screen". The current figure is **42.1%** (NACE Job Outlook 2026), and the 2025 figure was 38.1%. Feedback copy calls a **3.3 "strong"** against a typical 3.0. | match-core.js ceiling block; `feedback_quality.json` samples | Low-med |

The existing persona test is still exactly at its floor: `node tests/grader/run.js` gives 331 pairs and 91.8% in-band, with 2 outliers: g34_mid_swe B- (expected D/F) and g39_lesser_data F (expected B/C).

## 1. Grading at scale (169 profiles × 548 listings)
- **Profiles:** 169 profiles across 10 fields, 13 archetypes and 10 school tiers (`harness/gen_profiles.js`). Archetypes include athletes (D1/D2/D3), first-gen students with service jobs, career changers, community-college students, and profiles missing GPA, school, major or skills/experience.
- **Listings:** a stratified sample of up to 30 real, non-placeholder listings per role group (548 in total; `results/listing_sample.json`).
- **Graded rows:** 101,231 (`grades_raw.json`); 1.8% ungraded.

**In-field** results (listing role group matches the profile's field), from `summary_infield.json`:

| Archetype | n | median | A% | B% | C% | D% | F% |
|---|---|---|---|---|---|---|---|
| strong | 486 | 77 | 37.7 | 21.2 | 10.7 | 5.8 | 24.7 |
| solid | 486 | 69 | 31.1 | 18.7 | 14.4 | 10.9 | 24.9 |
| missing_gpa | 486 | 70 | 18.7 | 31.3 | 12.8 | 9.3 | 28.0 |
| missing_major | 486 | 69 | 23.3 | 25.1 | 20.0 | 7.8 | 23.9 |
| athlete_d3_intern | 552 | 69 | 22.3 | 26.3 | 15.8 | 7.2 | 28.4 |
| cc_student | 486 | 61 | 11.5 | 27.0 | 16.3 | 6.0 | 39.3 |
| lowgpa_strongexp (2.8, 2 internships) | 582 | 57 | **0.0** | 32.1 | 23.9 | 12.2 | 31.8 |
| career_changer | 516 | 56 | 12.0 | 21.7 | 17.4 | 15.1 | 33.7 |
| athlete_d1 (D1 + service job) | 486 | 54 | 6.0 | 28.2 | 14.6 | 16.5 | 34.8 |
| firstgen_service | 486 | 47 | 2.3 | 21.4 | 17.3 | 15.8 | 43.2 |
| athlete_d2 | 522 | 46 | 6.1 | 20.1 | 16.3 | 12.5 | 45.0 |
| freshman_novice | 546 | 35 | 4.2 | 14.8 | 12.3 | 13.6 | 55.1 |
| missing_skills_exp | 396 | 35 | 0.3 | 4.3 | 10.9 | 20.7 | 63.9 |

What stands out:
- A profile missing its GPA scores the same as or better than the "solid" profile (3.5 GPA).
- A 2.8 GPA with two internships can never reach an A. That is a defensible hard ceiling, but NACE 2026 rates internship experience above GPA (see research).
- Removing athletics (`targeted.js`) lowers the score by an average of 2.8 pts, which is within the +6 extras cap. The maximum drop is 19 pts, which happens when athletics is the profile's only experience entry.

## 2. School bias (swap tests)
Every profile was graded at the same listing with only the school swapped, across 11 schools: Harvard, Michigan, Indiana, Ohio State, App State, Queens University of Charlotte, Central Piedmont CC, Howard, NC A&T, WGU and blank. That gives 4,980 IB, 4,980 consulting and 830 PE pair sets, plus all other groups (`school_swap_raw.json`). In-field results:

| Field → group | pairs | Ivy/target | semi | Howard (listed semi in consulting) | unlisted (OSU, Queens, NC A&T, CC, WGU) | blank | grade changes from school alone | >1 full letter | max spread |
|---|---|---|---|---|---|---|---|---|---|
| ib → ib | 480 | +8.8 | +5.4 | 0 | 0 | **+5.0** | 55.8% | 2.9% | 20 pts |
| ib → pe | 80 | +8.6 | +5.1 | 0 | 0 | +3.4 | 20.0% | 1.3% | 16 |
| consulting → consulting | 540 | +8.2 | +4.7 | +4.7 | 0 | **+4.6** | 49.3% | 4.3% | 16 |
| ib → finance (corp fin, insurance…) | 480 | 0 | 0 | 0 | 0 | 0 | 0% | 0% | 0 |
| every other field | — | 0 | 0 | 0 | 0 | 0 | 0% | 0% | 0 |

- **Tier-1 "standout" rule** (`match-core.js`): an A at a tier-1 firm requires a target or semi school or a 3.7+ GPA, plus a related job. The rule checks the IB school list for every role group. In practice the effect outside finance is small: for SWE the grade changed in 0.6% of pairs (max +3 pts); for IB tier-1 rows the mean was +7.1 pts (max 13). It is still a fairness smell and should be decoupled from school (V15 §1d).
- Flagged pairs where school alone moves the grade by more than 1 full letter: `results/school_swap_flags_infield.json`. Across all groups: `school_swap_flags.json` (130 pairs).

## 3. Research (with citations) and recommended weights
**What employers say they weigh**
- **GPA screening is a minority practice.** NACE Job Outlook 2026: **42.1%** of employers screen by GPA, down from 73.3% in 2019. 70% use skills-based hiring, up from 65%. Sources: [NACE, Employer Use of Skills-Based Hiring Grows](https://naceweb.org/job-market/trends-and-predictions/employer-use-of-skills-based-hiring-practices-grows), and the [Job Outlook 2026 report](https://www.naceweb.org/docs/default-source/default-document-library/2025/publication/research-report/nace-2026-job-outlook-report.pdf). The same report gives the series: 73.3% (2019), 37.0% (2023), 38.3% (2024), 38.1% (2025), 42.1% (2026).
- **Internships decide between otherwise equal candidates.** In NACE Job Outlook 2026, an internship *with the organization* and an internship *in the industry* are the only two attributes rated "very much influence". A 3.0+ GPA ranks **below** general work experience, leadership and extracurriculars ([NACE, Feb 2026](https://www.naceweb.org/talent-acquisition/candidate-selection/internship-experience-often-the-deciding-factor-between-equal-candidates)). In the 2022 ratings (1–5 scale), "School attended" scored **2.6**. That is below GPA (3.1), extracurriculars (3.5), leadership (3.6), general work experience (3.7), major (3.8) and in-industry internship (4.3) (NACE Job Outlook 2022 influence ratings, as reported by NACE).
- **School reputation is a minor factor overall.** In the 2026 report, among employers that do **not** screen by GPA, "school's reputation" is a factor for 26.3%, versus 93.7% for academic major. Among employers that **do** screen by GPA it is 28.4%, versus 95.5% for major ([report PDF](https://www.naceweb.org/docs/default-source/default-document-library/2025/publication/research-report/nace-2026-job-outlook-report.pdf)).
- **What employers look for on a resume.** The top attributes are problem-solving (88.3%), teamwork (81.0%), written communication (77.1%), initiative (73.7%) and technical skills (73.2%). Leadership is 52.5% ([Job Outlook 2025 PDF](https://www.naceweb.org/docs/default-source/default-document-library/2025/publication/research-report/2025-nace-job-outlook-jan-2025.pdf)).

**Where school really does matter (keep it honest)**
- **Elite banks, consultancies and law firms** recruit on campus from a small set of "core" and "target" schools. Applicants from other schools go through a separate, less-reviewed stream (Lauren Rivera, *Pedigree: How Elite Students Get Elite Jobs*, Princeton University Press, 2015: 3–5 "core" and 5–15 "target" schools).
- **Goldman Sachs** hires "around half of its junior staff from its target schools" and recruits at 225 US schools ([Reuters via Yahoo Finance, 2019](https://finance.yahoo.com/news/goldman-replace-campus-interviews-video-190001750.html)).
- **Concentration at top banks.** Public-profile data (People Data Labs, as reported by rareliquid) shows the top 10 schools supply 35% of analysts at 18 top banks and the top 25 supply 65%. No school supplies more than 6.6% of any one bank (rareliquid analysis of People Data Labs data; a secondary source). The Wall Street Oasis 2017 report put the top-10 schools at 21.9% of bulge-bracket recruiting. CNBC (2015) reported that half of one Goldman class came from 218 US colleges.

**Athletics and leadership**
- **Evidence is mixed.** A resume-audit field experiment found no overall callback advantage from listing varsity athletics ([ERIC ED671825](https://files.eric.ed.gov/fulltext/ED671825.pdf)). Ivy League athletes earn about 3.4% more cumulatively ([NBER w31753](https://doi.org/10.3386/w31753)). College varsity athletes show higher later wages in longitudinal data ([NBER w34046](https://www.nber.org/system/files/working_papers/w34046/w34046.pdf)).
- **Conclusion:** keep athletics as a small extra (today's ≤ +6 cap is consistent with this). Do not make it a main factor.

**Skills-based hiring in practice**
- Removing degree requirements changed fewer than 1 in 700 hires ([HBS/Burning Glass, 2024](https://www.burningglassinstitute.org/research/skills-based-hiring-the-long-road-from-pronouncements-to-practice)). So stated skills-first policies overstate real practice.
- **Conclusion:** skills should weigh more, but feedback must not promise that skills override screens.

**Certifications**
- I found no rigorous, citable effect size for student certifications in internship hiring. Any weight is a **judgment call**. Recommendation: field-specific "+posting skill" credit only when the posting names the certification (for example CPA-track, CompTIA Security+, Google Analytics). No generic bonus.

**Recommended weights (V15)**

These are judgment calls guided by the sources above, not fitted values.

| Group | school | gpa | exp | skills | fit | Rationale |
|---|---|---|---|---|---|---|
| ib / pe | 0.25 → **0.12** | 0.20 → 0.18 | 0.30 → **0.38** | 0.10 → 0.12 | 0.15 → 0.20 | Target schools still matter (Rivera; Goldman about half), but NACE ranks internships above school. Cap the in-field mean target-vs-unlisted gap at ≤ 4 pts |
| consulting | 0.25 → **0.12** | 0.20 → 0.18 | 0.30 → **0.38** | 0.10 → 0.12 | 0.15 → 0.20 | same |
| all others | 0.05 → **0.00** (display only) | unchanged | +0.05 to exp | unchanged | unchanged | Already 0 in effect; make it explicit |

School scores inside ib/pe/consulting: target 90, semi 70, unlisted 55 (from 35), and **blank = unlisted (55) with low confidence**, not re-spread. These numbers are judgment calls.

## 4. Feedback text quality
**Method:** 29 profiles × in-field listings, 222 cards, with automated rubric checks (`feedback_quality.js`), followed by a manual read of 60 samples (`results/feedback_quality.json`).

| Rubric item | Result |
|---|---|
| No invented stats | 0 unsourced % claims found in card text. The tier "why" figures carry sources (for example Google: "estimated 1.5-2% of 125,000+ intern applicants", source whali.com) |
| Specific | Good: quotes the user's own titles, skills and GPA |
| Actionable | 0 D/F cards had no action. But 43.7% of actions are a redundant location sentence |
| Clarity / grammar | **Fails:** 4.1% broken verdict sentence and 45.9% garbled skills sentence |
| No contradictions | **Fails:** 10.8% card tag ≠ v143 tag; "major" text contradicts itself; 3.3 called "strong" |
| Honesty | **Fails for unknown firms:** "safety" at Neuralink, Databricks and Uber for novice and strong profiles alike (finding 1) |

**Bad examples (verbatim):**
1. Verdict `why`, `q013_swe_missing_gpa_cc_transfer` at *N1, Software Engineer Intern (Fullstack)*: "worth it if you it's in a city outside your picks, not a location you picked. Tick “open to relocating” if you'd move for it"
2. Action (97 of 222 cards): "It's in a city outside your picks, not a location you picked. Tick “open to relocating” if you'd move for it."
3. Skills, `q001` at *Tesla*: title "Python and java match; add c++", detail "You list python, java, git, core for this role."
4. Card tag "Reach" ("Competitive employer; experience: data Analyst Intern at Regional Firm, directly relevant") while v143 says **target**, `q031` at *Intuit, AI Scientist Intern*.
5. GPA, `q007`: "3.3 vs typical 3.0, strong — No cutoff listed; against a typical expectation of about 3.0 for this field, your 3.3 is strong."
6. Fit, `q007` at *The Exploration Company*: "The posting asks for engineering majors. It's software engineering, in line with your major." (a CS major)
7. Experience, `q011` freshman: "Built a full-stack web app (React, Node), directly relevant", scored 90. Combined with tier 4, this gives *Neuralink Neuroengineer Intern A 90, safety*.

Limitation: the overall Feedback page text (`renderOverall`, DOM) was timed in the browser but its prose was not scored for all 30 profiles. The card-level text above is the same `r.feedback` that the page shows.

## 5. Match quality (169 profiles × all 12,806 non-closed rows)
Source: `harness/match.js` → `results/summary_match.json` and `match_raw.json` (each profile's top-10 lists, verbatim).

| List | relevant | class-year listed ok | open (not placeholder, ≤120 d) | placeholder | apply link | in chosen location | unique cos / 10 |
|---|---|---|---|---|---|---|---|
| rank143 top-10 (all) | 97.3 | 88.2 | 86.7 | 0.0 | 98.2 | **14.2** | 7.3 |
| ↳ non-target schools (118) | 96.4 | 86.1 | 86.7 | 0.0 | 97.5 | 11.0 | 7.3 |
| ↳ target/semi (51) | 99.2 | 92.9 | 86.9 | 0.0 | 100 | 21.6 | 7.1 |
| rank143 realistic-10 | 91.2 | 85.6 | 90.4 | 0.6 | 97.7 | 40.5 | 7.5 |
| app "best match" sort (−3 per repeat co) | 90.9 | 85.7 | 92.0 | 0.8 | 97.5 | 41.9 | 9.3 |

- **Non-target students do get relevant, open options:** 96.4% relevant and the same openness as target-school students. The gap is in location (11.0% vs 21.6%).
- **By field:** health top-10 is only **32.4% open** (many listings older than 120 days). SWE in the app sort is 45.8% strictly-SWE, with hardware, eng and network roles mixed in.
- **Class-year mismatch by year:**

  | Profile class year | top-10 class-year ok | app sort class-year ok |
  |---|---|---|
  | Community college (2nd yr) | 50% | 51% |
  | Graduate | 83% | 46% |
  | Junior, Senior, Freshman | 100% | 100% |
  | Sophomore | 91% | 91% |

  Placeholders never reach rank143 lists. In the app sort they are 0.8%.

## 6. Feedback page load (~9 s): cause

| Measurement | Time | Source |
|---|---|---|
| Playwright, sandbox, 1× CPU, no industries | **8.04 s** to `data-ready` (`_fbMs` 7,655) | `results/perf_browser.json` |
| with 1 industry picked | 5.96 s | same |
| 4× CPU slowdown | 11.33 s / 6.48 s | same |
| Node: multi what-if (5 × 12,806) | 7.2–7.8 s | `perf_node.json` |
| Node: duplicate main-thread `scoreAll` | 1.65–2.71 s | same |
| Node: `score` | about 0.09–0.1 ms per call; `norm` 24.9% of CPU | same |

**Root cause:** `renderFeedback` awaits `renderOverall`, which awaits `multi()`. `multi()` creates a new worker (`_fbW`), posts all rows, and scores 5 extra profiles over every row before anything is marked ready. The rows are also re-scored on the main thread even though `MSCORE` already holds them. The fix is in V15 §4.
