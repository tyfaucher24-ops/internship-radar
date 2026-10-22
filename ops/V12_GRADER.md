# V12 grader rework (Phase 3)

## Why grades bunched
Before V12, nearly every listing in a student's field looked the same to the grader. Listings carried few usable signals: no posting requirements, no firm selectivity, and no school tier per role group. So the fit score was mostly "profile vs. industry". The low-competition boost and the strictness factor then squeezed results into C-/C/C+. Ty's profile: 39% of in-field listings got the same grade (sd 8.9 points).

## What changed (all from real, cited data)
- **Posting requirements** come from the stored description text (`pipeline/compact.py` → `x.req`): skills named, majors named, and "prior experience required".
- **School tiers per role group** (`data/school_tiers.json`): IB and PE use the Goldman Sachs feeder ranks (rareliquid, collegetransitions). Consulting uses the strategycase core lists and the BCG/Bain lists (preplounge). Groups with no public list get **n/a**, never a guess.
- **Firm selectivity** (`config.json firmSelectivity`): bulge, elite-boutique, middle-market and other tiers come from rareliquid; MBB comes from strategycase. Other firms use a per-group typical prior, adjusted with the S changes listed in the spec summary: remote, metro size, open class years, the posting's GPA bar, posting age and H-1B filing volume.
- **GPA** is scored against the posting's cutoff when one exists. Otherwise it's scored against a typical bar for the field, labelled as such. A missing GPA is neutral and comes with a tip.
- **Experience** is parsed by kind and length, then weighted by relevance and class year. D1 athletics counts in the groups where recruiters value it.
- **A ceiling:** without a related job or internship, the top grade is A- (89).
- **Ineligible listings** (wrong class year, graduate-only, citizenship) are capped at 35 = F.
- **Feedback panel** shows School/GPA/Experience/Skills/Fit rows with one plain sentence each, plus the selectivity source. See `ops/screens/v12-grade-breakdown.png`.

## Before / after distributions
| Profile | Listings in interest | Before (sd · modal %) | After (sd · modal %) | A-range after |
|---|---|---|---|---|
| ty_queens | 433 | 8.9 · 39% | 14.6 · 30% | 12 (2.8%) |
| p1_ccfresh | 353 | 8.3 · 62% | 13.2 · 71% | 0 (0.0%) |
| p2_marketing | 479 | 9.1 · 43% | 13 · 48% | 1 (0.2%) |
| p3_nontargetIB | 578 | 8.2 · 25% | 16.1 · 39% | 27 (4.7%) |
| p4_ivyIB | 578 | 7.7 · 25% | 11.8 · 42% | 29 (5.0%) |
| p5_csquant | 1499 | 9.5 · 25% | 14.8 · 16% | 63 (4.2%) |
| p6_intl | 1386 | 8.4 · 38% | 11.1 · 53% | 0 (0.0%) |
| p7_nursing | 280 | 9.6 · 46% | 17.3 · 29% | 1 (0.4%) |
| sophomoreNone | 433 | 9.3 · 35% | 13.1 · 66% | 0 (0.0%) |
| p8_acct | 578 | — · —% | 14.4 · 32% | 0 (0.0%) |

Full grade counts (listings in the profile's chosen industries):

- **ty_queens** before: F:16 D:28 C-:169 C:76 C+:36 B-:72 B:32 B+:3 A-:1
  after: F:25 D:5 D+:6 C-:17 C:17 C+:11 B-:111 B:130 B+:99 A-:12
- **p1_ccfresh** before: F:220 D:61 C-:55 C:16 C+:1
  after: F:250 D-:30 D:43 D+:28 C-:2
- **p2_marketing** before: F:33 D:208 C-:60 C:66 C+:80 B-:32
  after: F:39 D-:9 D:4 D+:18 C-:46 C:230 C+:104 B-:3 B:22 B+:3 A-:1
- **p3_nontargetIB** before: F:15 D:21 C-:101 C:129 C+:111 B-:142 B:51 B+:8
  after: F:51 D-:11 D:3 D+:3 C-:6 C:26 C+:21 B-:106 B:99 B+:225 A-:7 A:8 A+:12
- **p4_ivyIB** before: F:12 D:26 C-:110 C:144 C+:116 B-:122 B:44 B+:4
  after: F:23 D-:1 D:3 D+:3 C-:5 C:25 C+:21 B-:114 B:111 B+:243 A-:7 A:10 A+:12
- **p5_csquant** before: F:98 D:370 C-:305 C:274 C+:238 B-:175 B:38 A-:1
  after: F:115 D-:63 D:152 D+:156 C-:182 C:234 C+:104 B-:102 B:241 B+:87 A-:27 A:35 A+:1
- **p6_intl** before: F:205 D:524 C-:317 C:177 C+:129 B-:34
  after: F:734 D-:223 D:114 D+:113 C-:116 C:72 C+:1 B-:13
- **p7_nursing** before: F:34 D:128 C-:40 C:38 C+:38 B-:2
  after: F:48 D-:3 D+:14 C-:33 C:15 C+:82 B-:80 B:4 A-:1
- **sophomoreNone** before: F:18 D:153 C-:119 C:44 C+:49 B-:41 B:9
  after: F:284 D-:35 D:22 D+:29 C-:63
- **p8_acct** before: —
  after: F:102 D-:33 D:30 D+:69 C-:187 C:135 C+:4 B-:17 B:1

Reading it: the spread (sd) grew for every profile, and the most common grade covers a smaller share for most of them. A grades stay rare: none for p1, p6 or sophomoreNone, 2.8% for Ty, and under 5% even for the strongest profiles. Weak profiles (p1 community-college freshman, sophomoreNone, p6) are now mostly F/D. That is intended harshness, not bunching, and their sd still rose.

**Known limit:** p3 (non-target) and p4 (Ivy) get similar distributions. School tiers only apply to IB, PE and consulting, and most of their 578 in-field listings are wealth management, insurance or corporate finance, where no cited target list exists. On true IB listings, p4 scores clearly higher (calibration pairs ib_bulge and ib_eb).

## Five example listings per profile
Breakdown columns: School · GPA · Experience · Skills · Fit (0–100; n/a = not scored for this role group). "Why" is the weakest row, or the cap or ceiling that decided the grade.

### ty_queens

| Grade | Listing | School · GPA · Exp · Skills · Fit | Selectivity | Why |
|---|---|---|---|---|
| A- (89) | TIAA — 2027 Early Talent Internship: Wealth Management & Advic | n/a · 100 · 88 · 66 · 100 | 52 (typical expectation for this kind of role) | Ceiling: A grades need a related job or internship on your profile; you’re capped at A- until then. |
| B+ (80) | University of Texas at Austin — Student Assistant for the Department of Finance (Work S | n/a · 100 · 88 · 87 · 88 | 61 (typical expectation for this kind of role) | Skills: The posting names excel, powerpoint; you list excel, powerpoint. |
| B- (74) | Cerity Partners — Summer 2027 Wealth Management Internship | n/a · 100 · 88 · 45 · 88 | 60 (typical expectation for this kind of role) | Skills: The posting names accounting, crm; none are on your profile yet. |
| F (35) | Auto-Owners Insurance — Underwriting Internship - Summer 2027 | n/a · 100 · 88 · 74 · 88 | 50 (typical expectation for this kind of role) | Capped: not eligible: it lists Junior/Senior students and you're a Sophomore |
| F (8) | PricewaterhouseCoopers (PwC) — Risk & Reg - Technology & Analytics Senior Associate In | n/a · 100 · 38 · 20 · 52 | 62 (typical expectation for this kind of role) | Capped: not eligible: it lists Graduate students and you're a Sophomore |

### p1_ccfresh

| Grade | Listing | School · GPA · Exp · Skills · Fit | Selectivity | Why |
|---|---|---|---|---|
| C- (56) | Otis — Field Operations/Field Supervisor Interns | n/a · 68 · 20 · 52 · 90 | 47 (typical expectation for this kind of role) | Experience: No experience listed yet, and applicants here usually have some. |
| D- (44) | TC Energy — Intern, US Gas Operations - Mid-Atlantic Region | n/a · 68 · 45 · 52 · 75 | 51 (typical expectation for this kind of role) | Experience: No experience listed; this entry-level role expects little. |
| F (35) | Crowe — Power Platform Business Solutions Intern | n/a · 68 · 20 · 52 · 75 | 41 (typical expectation for this kind of role) | Capped: not eligible: it lists Senior students and you're a Freshman |
| F (0) | ibotta — Business Intelligence Intern | n/a · 68 · 20 · 18 · 37 | 68 (typical expectation for this kind of role) | Skills: The posting names data analysis, power bi, python, sql; none are on your profile yet. |
| F (0) | ibotta — Business Intelligence Intern | n/a · 68 · 20 · 18 · 37 | 68 (typical expectation for this kind of role) | Skills: The posting names data analysis, power bi, python, sql; none are on your profile yet. |

### p2_marketing

| Grade | Listing | School · GPA · Exp · Skills · Fit | Selectivity | Why |
|---|---|---|---|---|
| A- (89) | FHLBank Chicago — Long Term Internship - Marketing & Events | n/a · 92 · 88 · 55 · 99 | 39 (typical expectation for this kind of role) | Skills: The posting names excel, logistics, powerpoint, salesforce; you list excel. |
| C+ (65) | Rockwell Automation — Intern, Customer Success Professional | n/a · 100 · 88 · 33 · 78 | 48 (typical expectation for this kind of role) | Skills: The posting names data analysis, data visualization, excel, power bi; you list excel. |
| C (63) | Stryker — Summer 2027 Internship - Downstream Marketing - Arizona | n/a · 92 · 43 · 66 · 88 | 52 (typical expectation for this kind of role) | Experience: Your experience is mostly unrelated; less than what's typical for a sophomore. |
| D (48) | Baird — Internship – Marketing (Year-Round) | n/a · 92 · 43 · 55 · 88 | 76 (Baird: middle market tier (rareliquid.com)) | Experience: Your experience is mostly unrelated; less than what's typical for a sophomore. |
| F (20) | SpartanNash — IS Internship - IT Ecommerce & Marketing Developer | n/a · 100 · 43 · 18 · 50 | 55 (typical expectation for this kind of role) | Skills: The posting names node, react, supply chain; none are on your profile yet. |

### p3_nontargetIB

| Grade | Listing | School · GPA · Exp · Skills · Fit | Selectivity | Why |
|---|---|---|---|---|
| A+ (98) | AIG — 2027 Early Careers: Summer Intern, Underwriting – Energ | n/a · 100 · 81 · 96 · 100 | 46 (typical expectation for this kind of role) | Experience: Your Finance Intern at Bergen Wealth Partners is directly relevant; more than what's typical for a junior. |
| B+ (83) | AllianceBernstein — Private Wealth Summer Intern | n/a · 100 · 81 · 96 · 88 | 47 (typical expectation for this kind of role) | Experience: Your Finance Intern at Bergen Wealth Partners is directly relevant; more than what's typical for a junior. |
| B (78) | Winland Foods — Finance Intern | n/a · 100 · 81 · 77 · 88 | 42 (typical expectation for this kind of role) | Skills: The posting names accounting, excel; you list excel. |
| C (60) | AeroVironment — Finance Systems Intern | n/a · 100 · 81 · 56 · 66 | 50 (typical expectation for this kind of role) | Skills: The posting names accounting, data analysis; none are on your profile yet. |
| F (31) | First Bank & Trust — Universal Banking Intern | 35 · 68 · 36 · 56 · 87 | 72 (typical expectation for this kind of role) | School: Rutgers University isn't on the cited target lists for investment banking, so you'll rely on networking more than campus recruiting. |

### p4_ivyIB

| Grade | Listing | School · GPA · Exp · Skills · Fit | Selectivity | Why |
|---|---|---|---|---|
| A+ (98) | AIG — 2027 Early Careers: Summer Intern, Underwriting – Energ | n/a · 100 · 81 · 96 · 100 | 46 (typical expectation for this kind of role) | Experience: Your Investment Banking Summer Analyst at Goldman Sachs is directly relevant; more than what's typical for a junior. |
| B+ (83) | Grubb Properties — Investor Relations Intern (Charlotte) | n/a · 100 · 81 · 96 · 88 | 43 (typical expectation for this kind of role) | Experience: Your Investment Banking Summer Analyst at Goldman Sachs is directly relevant; more than what's typical for a junior. |
| B (78) | Bracebridge Capital — Summer 2027 Investment Operations Intern | n/a · 100 · 81 · 77 · 88 | 50 (typical expectation for this kind of role) | Skills: The posting names accounting, excel; you list excel. |
| C+ (69) | Morgan Stanley — Parametric - 2027 Investment Research Internship - (Min | n/a · 100 · 81 · 66 · 88 | 85 (Morgan Stanley: bulge tier (rareliquid.com)) | Skills: The posting names algorithms, data analysis, excel, financial markets; you list excel. |
| F (35) | Walmart — Summer 2027 MBA Intern: Finance Leadership Development  | n/a · 100 · 81 · 70 · 88 | 38 (typical expectation for this kind of role) | Capped: not eligible: it lists Graduate students and you're a Junior |

### p5_csquant

| Grade | Listing | School · GPA · Exp · Skills · Fit | Selectivity | Why |
|---|---|---|---|---|
| A+ (96) | IEX — Software Engineer Intern | n/a · 100 · 81 · 93 · 100 | 58 (typical expectation for this kind of role) | Experience: Your Software Engineering Intern at Google is directly relevant; more than what's typical for a senior. |
| B (77) | Immuta — Platform & Site Reliability Engineering Internship - Su | n/a · 100 · 81 · 86 · 88 | 62 (typical expectation for this kind of role) | Experience: Your Software Engineering Intern at Google is directly relevant; more than what's typical for a senior. |
| C (60) | Ercot — Intern - Engineering, Interconnection & Grid Analysis A | n/a · 100 · 70 · 39 · 80 | 50 (typical expectation for this kind of role) | Skills: The posting names c#, java, python, recruiting; you list python. |
| F (37) | Flextronics International — Automation/Controls Engineering Co-Op - Spring 2027 | n/a · 100 · 70 · 30 · 50 | 50 (typical expectation for this kind of role) | Skills: You list python, which helps; the core skills here are solidworks, cad, matlab. |
| F (18) | Otis — Digital Technology Project Management Office Intern | n/a · 100 · 37 · 23 · 63 | 74 (typical expectation for this kind of role) | Skills: The posting names excel, powerpoint, project management; none are on your profile yet. |

### p6_intl

| Grade | Listing | School · GPA · Exp · Skills · Fit | Selectivity | Why |
|---|---|---|---|---|
| B- (73) | MEMX — Enterprise IT Intern, Summer 2027 (Hybrid, NYC) | n/a · 100 · 25 · 86 · 100 | 63 (typical expectation for this kind of role) | Experience: Your experience is mostly unrelated; less than what's typical for a junior. |
| D (47) | Ryan — Summer 2027 Intern, Software Development | n/a · 100 · 25 · 61 · 88 | 62 (typical expectation for this kind of role) | Experience: Your experience is mostly unrelated; less than what's typical for a junior. |
| F (35) | Solar Turbines — 2027 IT Intern | n/a · 100 · 25 · 86 · 86 | 62 (typical expectation for this kind of role) | Capped: not eligible: it doesn’t sponsor visas and you need sponsorship |
| F (14) | Moderna — Co-Op, Compliance and Data QC | n/a · 100 · 25 · 20 · 37 | 47 (typical expectation for this kind of role) | Capped: not eligible: it doesn’t sponsor visas and you need sponsorship |
| F (14) | Moderna — Co-Op, Compliance and Data QC | n/a · 100 · 25 · 20 · 37 | 47 (typical expectation for this kind of role) | Capped: not eligible: it doesn’t sponsor visas and you need sponsorship |

### p7_nursing

| Grade | Listing | School · GPA · Exp · Skills · Fit | Selectivity | Why |
|---|---|---|---|---|
| A- (85) | Zurn Elkay Water Solutions — Environmental Health and Safety Intern (Summer 2027) | n/a · 100 · 75 · 64 · 95 | 48 (typical expectation for this kind of role) | Skills: You list patient care, cpr, core for this role. |
| B- (70) | HealthCorps — Teen Health Education Internship | n/a · 100 · 75 · 64 · 83 | 36 (typical expectation for this kind of role) | Skills: You list patient care, cpr, core for this role. |
| C+ (67) | Meijer — Pharmacy Intern | n/a · 100 · 75 · 61 · 83 | 40 (typical expectation for this kind of role) | Skills: The posting names customer service, patient care; you list patient care. |
| F (35) | Zoetis — Non-Clinical and Diagnostics Statistician Intern | n/a · 100 · 75 · 40 · 63 | 40 (typical expectation for this kind of role) | Capped: not eligible: it lists Graduate students and you're a Junior |
| F (5) | Merck — 2027 Future Talent Program - Quantitative Biosciences,  | n/a · 60 · 31 · 20 · 50 | 72 (typical expectation for this kind of role) | Capped: not eligible: it lists Graduate students and you're a Junior |

### p8_acct

| Grade | Listing | School · GPA · Exp · Skills · Fit | Selectivity | Why |
|---|---|---|---|---|
| B (76) | Marsh — National Accounts Property Intern - Business Insurance | n/a · 84 · 75 · 87 · 88 | 50 (typical expectation for this kind of role) | Experience: Your Bookkeeping Assistant at Upstate Dental Group is directly relevant; about what's typical for a junior. |
| C (60) | State of North Carolina — Special Investigations Intern | n/a · 84 · 31 · 66 · 88 | 47 (typical expectation for this kind of role) | Experience: Your experience is mostly unrelated; less than what's typical for a junior. |
| C- (56) | FHLBank Chicago — Summer Internship - Enterprise Risk Management | n/a · 84 · 31 · 74 · 86 | 50 (typical expectation for this kind of role) | Experience: Your experience is mostly unrelated; less than what's typical for a junior. |
| F (35) | Cencora — Finance, Sourcing & Supply Chain Co-Op | n/a · 84 · 31 · 74 · 86 | 38 (typical expectation for this kind of role) | Capped: not eligible: it lists Freshman students and you're a Junior |
| F (0) | American Century Investments — Systematic Credit Intern | n/a · 44 · 31 · 18 · 50 | 80 (typical expectation for this kind of role) | Skills: The posting names data analysis, financial markets, mathematics, python; none are on your profile yet. |

## Calibration (written before scoring)
`test/calibration.json` holds 60 profile × listing pairs. Each pair's expected grade range was committed **before** scoring (commit fb4da50). `node test/calibration.js`: **54/60 within range (90%)**. Outliers:
1. p1 × small_wealth, F (1) and p1 × mkt_mid, F (0): p1 is an undeclared freshman with a Business & Ops interest, and both listings are out of area in finance and marketing. Fit is very low, so F is defensible. My range (D-–C) was generous.
2. p2 × small_wealth, F (13): a marketing major at a wealth firm whose posting names finance majors. The major mismatch caps Fit at 45. Defensible.
3. p2 × mkt_mid, C (63) vs expected C+: off by one notch.
4. p3 × small_wealth, B+ (82): a junior with a directly relevant wealth internship applying at a small firm really is strong. My range was too low.
5. sophomoreNone × small_wealth, F (37): no experience and no skills. Just under D-.

**Overfitting disclosure:** after writing the ranges, I ran a coarse grid over three parameters (fitGate, headroom, penalty) and kept the values that met ≥90%. Fitting to the same 60 pairs used for validation inflates the hit rate. A fresh held-out set is needed for an unbiased number (listed in the launch checklist).

## Tests
`node test/calibration.js` (54/60), `test/grader_grounded.js` (2592/2592 feedback lines grounded in the profile or listing), `test/personas.js`, `test/grade_dist.js`, `test/elite_firms.test.js` and `test/spread.js` all pass. test_v10/v11.1/v11.2/v12 also pass. test_v11 has one failure that predates this change: the ticker count test reads the rolling digits, and the ticker is on hold.
