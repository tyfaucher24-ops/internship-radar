# V13.3 §7f — Grader report

Run: `node tests/grader/run.js` (50 fictional personas × 34 real open listings, 331 hand-written expected pairs in `tests/grader/expected.json`, written before the grader was tuned). Research behind every weight: `qa-v13.3/GRADER-RESEARCH.md`.

## Before and after
| Measure | Original (first run) | Before (fixed fixtures, old grader) | After (V13.3) | Spec |
|---|---|---|---|---|
| In band | 62.2% | 73.4% (243/331) | **91.8% (304/331)** | ≥ 90% |
| Outliers (off by 2+ steps) | 65 | 32 | **1** | 0 |
| Monotonic breaks | — | 0 | **0** | 0 |
| Tier-1 A for a non-standout | — | 0 | **0** | 0 |
| Nondeterministic pairs | — | 0 | **0** | 0 |
| Missing GPA lowers the grade (instead of confidence) | — | 69 | **0** | 0 |
| Honest-feedback failures | — | not checked | **0 of 331** | 0 |

"Original" ran on the first fixtures. Two fixture bugs were then fixed, and "Before" is the old grader on the fixed fixtures, so before/after compare like with like:
1. An RBC listing in the set had closed; it was replaced with an open Morgan Stanley listing (`74cb211bc7`).
2. The judge's eligibility check (class year) was wrong for some pairs; `judge()` in `build_fixtures.py` was fixed and the bands rewritten from it.

## The one outlier (disclosed, not hidden)
`g39_lesser_data` (Cleveland State, Statistics, GPA 3.7, a data internship, D1 athlete) × Baird `edf93e34fe`: expected B/C, grader gives **F (38)**. The posting requires Computer Science, Engineering or Information Systems majors; a Statistics major does not meet it, so the grader treats it as a hard fit miss. The expected band was written from the company tier and the profile without that requirement. We kept the grader's answer because it follows the posting's own text; this is a judge-vs-grader disagreement, not a grader bug.

## Weight and logic changes, with reasons
| Change | Old | New | Why |
|---|---|---|---|
| Company tier 1–5 registry (`config.json` → `companyTiers`), each firm with a reason and source | none | 1 = cited acceptance ≤2%; unknown firms estimated from size, brand lists, metro and posting age | Research §1; tier and reason are shown in the detail panel |
| Selectivity tilt (`selTilt`, `tiltAt`) | none | 0.5 from selectivity 60 | Selective firms were graded like local ones (most "Before" outliers) |
| `headroom` | 0.8 | 0.75 | Leaves room above B for standouts only |
| `penalty` | 0.4 | 0.2 | Missing data was dropping grades; now it lowers confidence instead (69 → 0) |
| `base` | 0 | +10 | Accessible tier 4–5 roles that fit were landing at D |
| Top compression (above 80, non-selectivity part × 0.35, max 99) | none | new | The +10 base pinned strong profiles at 100 (top-20 had 1 distinct value); now 5 distinct, max 99 |
| Capped experience credit (athlete, leadership, military, founder, research, part-time work) | uncapped/none | ≤ +6 points total, never over a tier ceiling | Research §3; never outweighs GPA or internships |
| First-generation status | — | 0 | No source shows a screening effect |
| Tier-1 A gate | none | A only with (target/semi-target school or GPA ≥ 3.7) **and** a relevant internship | Research §1 and NACE internship factor |

## Honest feedback (§7g)
Checked on all 331 pairs by `run.js`: every result has a tag (Realistic / Reach / Long shot) with a reason ≤110 characters, a tier label, at least one action; no "Strong shot" at C/D/F, no "Worth applying" at D/F, no Realistic below 70, no tier-1 Realistic below B, no generic filler phrases, and resource links only from the allowed list (Wall Street Prep free resources, LeetCode problem set, freeCodeCamp). **Failure rate: 0 / 331 (0%).**

Notes:
- The data has no elite-boutique bank listings open right now (Evercore, Centerview, PJT, etc.), so that tier is in the registry but untested by fixtures.
- Citadel and Jane Street sources: the original eFinancialCareers link returned an error and could not be checked; it was replaced with Whali (Citadel about 0.4%), which was checked.
- LeetCode answers automated checks with 403; the public page exists in a browser.

## Persona cards
(The personas are fictional test students with made-up names; the schools are real names used only as the school field. Before = old grader, After = V13.3.)

### Taylor Patel (g06_elite_finance)
Massachusetts Institute of Technology · Finance · GPA 3.6 · Sophomore · Internship: Investment Banking Summer Analyst; Job: Part-time Cashier

| Listing | Expected | Before | After | Tag | Tag reason |
|---|---|---|---|---|---|
| Morgan Stanley: 2027 Investment Management Summer Analyst Program - Fixed Income (Boston) | D/F | F (29) | F (35) | Long shot | Not eligible: it lists Junior/Senior students and you're a Sophomore |
| Baird: Internship – Private Wealth Management (Phoenix, AZ Summer 2027) | A/B | D+ (53) | B (75) | Realistic | GPA: 3.6 vs typical 3.0, strong; competitive employer |
| Corient: Portfolio Implementation Intern (Summer 2027) | D/F | F (35) | F (35) | Long shot | Not eligible: it lists Junior students and you're a Sophomore |
| Baird: Internship - Equity Asset Management Research Analyst, Growth Team (Summer 2027) | A/B | F (26) | C- (55) | Reach | Competitive employer; skills: accounting matches; add bloomberg |
| Lake Michigan Credit Union: Premier Banking Intern | D/F | F (35) | F (35) | Long shot | Not eligible: it lists Junior/Senior students and you're a Sophomore |
| Apple Bank: 2027 Summer Intern - Retail Banking | D/F | F (35) | F (35) | Long shot | Not eligible: it lists Junior/Senior students and you're a Sophomore |
| Boston Consulting Group: Forward Deployed AI Engineer Intern | D/F | F (0) | F (0) | Long shot | Extremely competitive employer; skills: add python or java |
| State Farm: Data Science Intern - Magnet Program | D/F | F (0) | F (20) | Long shot | Competitive employer; skills: add python or sql |

### Hayden Turner (g15_strong_swe)
Cornell University · Computer Science · GPA 3.8 · Junior · Internship: Software Engineering Intern; Internship: Software Engineer Intern; Club: NCAA Division III Varsity Athlete; Club: President

| Listing | Expected | Before | After | Tag | Tag reason |
|---|---|---|---|---|---|
| Datadog: Software Engineer Intern - Summer | A/B | C (64) | B+ (82) | Realistic | GPA: 3.8 vs typical 3.0, strong; competitive employer |
| Jane Street: Software Engineer Intern | B/C | C (63) | C (63) | Reach | Extremely competitive employer; skills: python and java match; add c++ |
| Baird: Internship – Software Developer (Year-Round) | A/B | C- (58) | B+ (80) | Realistic | GPA: 3.8 vs typical 3.0, strong; competitive employer |
| Boston Consulting Group: Forward Deployed AI Engineer Intern | B/C | F (12) | D (47) | Long shot | Extremely competitive employer; skills: python and java match; add c++ |
| Citadel: Software Engineer Intern | B/C | C (63) | C (63) | Reach | Extremely competitive employer; skills: python and java match; add c++ |
| Microsoft: Software Engineer Intern, CoreAI | A/B | C+ (65) | B- (72) | Realistic | GPA: 3.8 vs typical 3.0, strong; very competitive employer |
| Baird: Internship – Private Wealth Management (Phoenix, AZ Summer 2027) | D/F | F (12) | D- (41) | Long shot | Competitive employer; skills: add excel or financial modeling |
| Baird: Internship - Equity Asset Management Research Analyst, Growth Team (Summer 2027) | D/F | F (10) | F (39) | Long shot | Competitive employer; skills: posting asks for accounting, bloomberg |

### Remy Okafor (g23_mid_swe)
Rutgers University · Computer Science · GPA 3.3 · Junior · Internship: Software Engineering Intern; Club: President; Project: Founder

| Listing | Expected | Before | After | Tag | Tag reason |
|---|---|---|---|---|---|
| NVIDIA: Systems Software Intern, Aerial PHY- Summer 2027 | C/D | D (48) | C (62) | Reach | Very competitive employer; skills: c++ matches; add python |
| Google: Software Engineering Intern | D/F | D- (43) | D (49) | Long shot | Extremely competitive employer; skills: c++ matches; add python |
| Microsoft: Software Engineer Intern, CoreAI | C/D | D (45) | C- (59) | Reach | Very competitive employer; skills: c++ matches; add python |
| Northrop Grumman: 2027 Software Engineering Intern - Roy UT | B/C | D- (43) | C- (56) | Reach | Moderately competitive employer; gpa: 3.3 is under the 3.7 cutoff |
| Datadog: Software Engineer Intern - Summer | C/D | D- (42) | B- (72) | Realistic | Fit: Your major; competitive employer |
| Boston Consulting Group: Forward Deployed AI Engineer Intern | D/F | F (0) | F (32) | Long shot | Extremely competitive employer; skills: c++ matches; add python |
| Baird: Internship - Equity Asset Management Research Analyst, Growth Team (Summer 2027) | D/F | F (0) | F (23) | Long shot | Competitive employer; gpa: 3.3 is under the 3.5 cutoff |
| Corient: Portfolio Implementation Intern (Summer 2027) | D/F | F (28) | D+ (52) | Long shot | Moderately competitive employer; skills: posting asks for excel, mathematics |

### Avery Alvarez (g01_elite_swe)
Harvard University · Computer Science · GPA 3.2 · Freshman · Club: NCAA Division III Varsity Athlete; Job: Sergeant, U.S. Army Reserve

| Listing | Expected | Before | After | Tag | Tag reason |
|---|---|---|---|---|---|
| Boston Consulting Group: Forward Deployed AI Engineer Intern | D/F | F (7) | F (38) | Long shot | Extremely competitive employer; experience: mostly unrelated so far |
| Jane Street: Software Engineer Intern | D/F | C (64) | D+ (50) | Long shot | Extremely competitive employer; experience: mostly unrelated so far |
| Baird: Internship – Software Developer (Year-Round) | B/C | D+ (52) | C (64) | Reach | Competitive employer; experience: mostly unrelated so far |
| Google: Software Engineering Intern | D/F | C (64) | D+ (50) | Long shot | Extremely competitive employer; experience: mostly unrelated so far |
| Citadel: Software Engineer Intern | D/F | C (64) | D+ (50) | Long shot | Extremely competitive employer; experience: mostly unrelated so far |
| Amazon: Software Development Engineer Intern - Summer | D/F | C+ (66) | C- (58) | Reach | Very competitive employer; experience: mostly unrelated so far |
| Sherwin-Williams: 2027 Quality Intern - Grove City, OH | D/F | F (23) | D- (42) | Long shot | Moderately competitive employer; fit: not your major, interests or experience |
| Piper Sandler: 2027 Summer Internship Program – Public Finance | D/F | F (12) | F (31) | Long shot | Not eligible: it lists Junior/Senior students and you're a Freshman |

### Finley Gupta (g39_lesser_data)
Cleveland State University · Statistics · GPA 3.7 · Junior · Internship: Data Analyst Intern; Club: NCAA Division I Varsity Athlete

| Listing | Expected | Before | After | Tag | Tag reason |
|---|---|---|---|---|---|
| State Farm: Data Science Intern - Magnet Program | A/B | C+ (65) | B+ (84) | Realistic | GPA: 3.7 vs typical 3.0, strong; competitive employer |
| Jane Street: Software Engineer Intern | D/F | F (4) | F (15) | Long shot | Extremely competitive employer; skills: sql matches; add python |
| Baird: Internship – Marketing (Year-Round) | D/F | F (0) | F (21) | Long shot | Competitive employer; skills: posting asks for customer service, email marketing |
| Baird: Internship – Software Developer (Year-Round) | B/C | F (0) | F (38) | Long shot | Competitive employer; skills: sql matches; add algorithms |

## 10 sample feedback blocks

**1. Avery Alvarez → Boston Consulting Group: Forward Deployed AI Engineer Intern** — 38% · F · Long shot
- Tag reason: Extremely competitive employer; experience: mostly unrelated so far
- Tier: 1 of 5 · Extremely competitive
- School: n/a — Matters little for this role
- GPA: 76 — 3.2 vs typical 3.0, fine
- Experience: 50 — Mostly unrelated so far
- Skills: 86 — Python and c++ match; add java
- Fit: 63 — Your major
- Extras: n/a — +3: military service, D2/D3 athlete
- Do: Add one software engineering experience: a class project, club role or part-time job you can describe in 2 bullets.

**2. Casey Ibarra → Datadog: Software Engineer Intern - Summer** — 48% · D · Long shot
- Tag reason: Competitive employer; gpa: 2.5 vs typical 3.0, on the low side
- Tier: 3 of 5 · Competitive
- School: n/a — Matters little for this role
- GPA: 20 — 2.5 vs typical 3.0, on the low side
- Experience: 50 — NCAA Division III Varsity Athlete at Athletics, valued here
- Skills: 42 — C++ matches; add python
- Fit: 92 — Your major
- Extras: n/a — +3: research, D2/D3 athlete
- Do: Build or show these skills the role asks for: python, java, javascript. A short course or a small project you can talk about counts.
- Do: Add one software engineering experience: a class project, club role or part-time job you can describe in 2 bullets.
- Free resource: [LeetCode problem set (free coding interview practice)](https://leetcode.com/problemset/)
- Free resource: [freeCodeCamp (free courses with projects you can show)](https://www.freecodecamp.org/)

**3. Dakota Diaz → Sherwin-Williams: 2027 Quality Intern - Grove City, OH** — 36% · F · Long shot
- Tag reason: Moderately competitive employer; skills: add solidworks or cad
- Tier: 4 of 5 · Moderately competitive
- School: n/a — Matters little for this role
- GPA: 36 — 2.7 vs typical 3.0, on the low side
- Experience: 50 — Mostly unrelated so far
- Skills: 20 — Add solidworks or cad
- Fit: 27 — Not your major, interests or experience
- Extras: n/a — +3: D1 athlete, leadership role
- Do: Add one mechanical / process / manufacturing engineering experience: a class project, club role or part-time job you can describe in 2 bullets.

**4. Hayden Turner → Baird: Internship – Private Wealth Management (Phoenix, AZ Summer 2027)** — 41% · D- · Long shot
- Tag reason: Competitive employer; skills: add excel or financial modeling
- Tier: 3 of 5 · Competitive
- School: n/a — Matters little for this role
- GPA: 100 — 3.8 vs typical 3.0, strong
- Experience: 80 — NCAA Division III Varsity Athlete at Athletics, valued here
- Skills: 20 — Add excel or financial modeling
- Fit: 40 — Posting asks for business, finance majors
- Extras: n/a — +4: D2/D3 athlete, leadership role
- Do: Build or show these skills the role asks for: excel, financial modeling, accounting. A short course or a small project you can talk about counts.
- Free resource: [Wall Street Prep free resources (modeling and Excel guides)](https://www.wallstreetprep.com/free-resources/)

**5. Oakley Alvarez → Lake Michigan Credit Union: Small Business Lending Intern** — 35% · F · Long shot
- Tag reason: Not eligible: it lists Junior/Senior students and you're a Freshman
- Tier: 4 of 5 · Moderately competitive
- School: n/a — Matters little for this role
- GPA: 84 — 3.3 vs typical 3.0, strong
- Experience: 50 — Mostly unrelated so far
- Skills: 61 — Excel matches; add crm
- Fit: 63 — Your major
- Extras: n/a — +1: work during school
- Do: Look for roles open to Freshmans; this one lists Junior/Senior only.

**6. Avery Patel → Microsoft: Software Engineer Intern, CoreAI** — 13% · F · Long shot
- Tag reason: Very competitive employer; skills: add python or java
- Tier: 2 of 5 · Very competitive
- School: n/a — Matters little for this role
- GPA: 100 — 3.9 vs typical 3.0, strong
- Experience: 50 — Mostly unrelated so far
- Skills: 20 — Add python or java
- Fit: 43 — Partly related to your major
- Extras: n/a — +3: military service, D2/D3 athlete
- Do: Build or show these skills the role asks for: python, java, javascript. A short course or a small project you can talk about counts.
- Do: Add one software engineering experience: a class project, club role or part-time job you can describe in 2 bullets.
- Free resource: [LeetCode problem set (free coding interview practice)](https://leetcode.com/problemset/)
- Free resource: [freeCodeCamp (free courses with projects you can show)](https://www.freecodecamp.org/)

**7. Taylor Kim → Meta: Software Engineer Intern** — 57% · C- · Reach
- Tag reason: Extremely competitive employer; skills: react matches; add python
- Tier: 1 of 5 · Extremely competitive
- School: n/a — Matters little for this role
- GPA: 100 — 3.6 vs typical 3.0, strong
- Experience: 89 — Software Engineering Intern at Startup, directly relevant
- Skills: 42 — React matches; add python
- Fit: 94 — Your major
- Extras: n/a — +1: D2/D3 athlete
- Do: Build or show these skills the role asks for: python, java, javascript. A short course or a small project you can talk about counts.
- Free resource: [LeetCode problem set (free coding interview practice)](https://leetcode.com/problemset/)
- Free resource: [freeCodeCamp (free courses with projects you can show)](https://www.freecodecamp.org/)

**8. Dakota Turner → Baird: Internship – Private Wealth Management (Phoenix, AZ Summer 2027)** — 66% · C+ · Reach
- Tag reason: Competitive employer; gpa: 2.7 vs typical 3.0, on the low side
- Tier: 3 of 5 · Competitive
- School: n/a — Matters little for this role
- GPA: 36 — 2.7 vs typical 3.0, on the low side
- Experience: 85 — Finance Intern at Local Credit Union, directly relevant
- Skills: 52 — Accounting matches; add excel
- Fit: 94 — Your major
- Extras: n/a — +4: D2/D3 athlete, military service
- Do: Apply, and put your Finance Intern at Local Credit Union experience first on your resume; it's the closest match to “Internship – Private Wealth Management (Phoenix, A”.
- Free resource: [Wall Street Prep free resources (modeling and Excel guides)](https://www.wallstreetprep.com/free-resources/)

**9. Hayden Nguyen → Lake Michigan Credit Union: Small Business Lending Intern** — 41% · D- · Long shot
- Tag reason: Moderately competitive employer; skills: posting asks for crm, due diligence
- Tier: 4 of 5 · Moderately competitive
- School: n/a — Matters little for this role
- GPA: 68 — 3.1 vs typical 3.0, fine
- Experience: 49 — NCAA Division I Varsity Athlete at Athletics, valued here
- Skills: 23 — Posting asks for crm, due diligence
- Fit: 27 — Not your major, interests or experience
- Extras: n/a — +3: D1 athlete
- Do: Build or show these skills the role asks for: excel, operations, supply chain. A short course or a small project you can talk about counts.
- Do: Add one corporate finance / wealth / insurance experience: a class project, club role or part-time job you can describe in 2 bullets.
- Free resource: [Wall Street Prep free resources (modeling and Excel guides)](https://www.wallstreetprep.com/free-resources/)

**10. Oakley Patel → Northrop Grumman: 2027 Software Engineering Intern - Roy UT** — 63% · C · Reach
- Tag reason: Competitive employer; skills: c++ matches; add python
- Tier: 3 of 5 · Competitive
- School: n/a — Matters little for this role
- GPA: 79 — 3.8 clears the 3.7 cutoff
- Experience: 50 — Mostly unrelated so far
- Skills: 42 — C++ matches; add python
- Fit: 94 — Your major
- Extras: n/a — +1: work during school
- Do: Build or show these skills the role asks for: python, java, javascript. A short course or a small project you can talk about counts.
- Do: Add one software engineering experience: a class project, club role or part-time job you can describe in 2 bullets.
- Free resource: [LeetCode problem set (free coding interview practice)](https://leetcode.com/problemset/)
- Free resource: [freeCodeCamp (free courses with projects you can show)](https://www.freecodecamp.org/)
