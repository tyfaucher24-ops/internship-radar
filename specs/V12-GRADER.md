# V12-GRADER — Recruiter-Accurate Match Grader (build spec for a coding agent)

> Owner: Ty Faucher · Written Oct 22, 2026 · Parent spec: `specs/V12.md` (Phase 3 + **ADDENDUM: Grader accuracy on School, GPA, Experience**).
> Log all work under **V12-grader** in `CHANGELOG.md`. Commit after every numbered work step in §9. Do not redesign the UI (keep the V11.x stock-market theme); only the grade badge, the feedback panel rows and the Fit/Odds display change visually.

## 0. Ground rules (non-negotiable)

1. **Never invent data.** No school tier, GPA bar, acceptance rate, alumni count, deadline, or "firm fills early" claim may appear in code, data or feedback unless it comes from (a) the user's profile, (b) the listing record or its description, or (c) a data-file entry with a public `source_url`, a `quote`, and a `last_verified` date. If nothing exists, the grader says so ("No public data on Queens' placement at this firm") and uses a **labeled soft default** (`"basis": "soft_default"`), never a fake-precise number.
2. **Every feedback line is grounded.** Each strength, gap, next step, row sentence and verdict reason carries a machine-readable `cites` array pointing to the exact profile field / experience id / bullet index / listing field / data-file entry it relies on. `test/grader_grounded.js` (existing, V11.2) is extended to fail on any line whose citations don't resolve to real values. Target stays **100%**.
3. **Pure, deterministic, local.** Scoring stays in pure functions (no DOM, no network) so it runs in `match-worker.js` for ~14k listings and in Node tests. Same inputs → same output. Resume parsing stays in the browser.
4. **Honest but encouraging.** Never deceptive in either direction: don't inflate a non-target's IB odds, don't crush a strong sophomore with an F. Explain *why* and *what to do*.
5. **Every weight/threshold is data, not code.** All numbers in this spec are **starting proposals to calibrate** against §8. They live in `match-weights.json` and new data files; code reads them.
6. **USA-only, undergrad internships.** Non-US, MBA/PhD and full-time listings are filtered upstream (V12 Phase 2); the grader still hard-gates them defensively.

---------------------------------------------------------------
## 1. Current state (verified in the repo, Oct 22)

| File | Role today | Notes |
|---|---|---|
| `match-core.js` (113 lines) | `MC.score(x,P,C,W)` → `{pct, grade, band, fit, odds, prefs, feedback{strengths,gaps,actions,verdict}, conf, ungraded, need, ...}`; `MC.profile(pr)`; helpers `profileGroups`, `groupOf`, `firmRow`, `competition`, `avgW`. | Fit = role 40 / interest 15 / skills 20 / experience 15 / major 10. Odds = competition 50 / classYear 15 / gpa 15 / school 10 / experience 10 / employer 15. Prefs = location 45 / classYear 25 / paid 15 / remote 15. `pct = 0.45·Fit + 0.40·Odds + 0.15·Prefs` → low-competition boost → `strictness` power curve (1.3) → elite-firm caps (`noRelatedExpCap 50`, `belowGpaBarCap 60`) → `ineligibleCap 40`. |
| `match-weights.json` (112 lines) | weights, grade table (A+ ≥95 … D ≥45, F <45), `oddsCurve`, `noExperience`, `eliteFirm`, `grader.verdict {strong:75, worth:55}`, `grader.minProfileParts`, `grader.minKnown`. | No D+ step; V12 Phase 3 wants "around D+/C-" for a strong sophomore at BB. |
| `config.json` | `firmTiers` (5 rows; 3 real, e.g. JPMorgan Chase, Bank of America, each with `evidence` + `source`), `targetSchools` (**placeholder only**), `industryGpaBars` (**placeholder only**: Quant 3.7), `majorIndustries`, `industryKeywords`, `roleGroups` (ib, pe, quant, sandt, hardware, mech, data, swe, consulting, marketing, sales, accounting, finance, nursing, health, product, ops, design, hr, legal, eng), `majorGroups`, `industryGroups`. | School score = substring match against a placeholder list → effectively always null. GPA bar only from `x.gpa_min` or `firm.gpaBar`; scoring 90/50/15 cliffs. |
| `matcher.js`, `match-worker.js` | bulk scoring in a worker + UI glue. | Worker must load new data files. |
| `feedback.js` | V6.2 feedback page ("what if" lifts are real re-scores). | Must render the new per-row breakdown. |
| `resume.js` + parser | in-browser parse → profile `{school, major, minor, classYear, gradDate, gpa, sponsorship, industries, locations, skills, experience[{title, org, bullets}]}`. | Experience has **no dates/type** — §5 adds them. |
| `data/listings.json` | 14,014 rows. Coverage: `class_years` 4,155 · `gpa_min` 1,407 · `sponsorship` 1,998 · `citizenship` 801 · `paid` 5,168 · `category` 12,267 · `has_desc` 10,809 (text in `data/desc/*.json`, detail in `data/detail/*.json`). | Grader must work when most fields are missing. |
| `data/schools.json` | flat list of US school names (parser validation). | Becomes the name authority for `school_tiers.json`. |
| `data/h1b.json` | USCIS H-1B Employer Data Hub (FY2022) counts with source URL. | May be cited for "has sponsored H-1B before" notes, never as a guarantee. |
| `cities.json`, `data/hubs.json` | geocoding / metro hubs. | Used for proximity boosts. |
| `test/personas.json`, `test/personas.js`, `test/profiles.test.json`, `test/grade_dist.js`, `test/grader_grounded.js`, `test/elite_firms.test.js`, `test/resumes/` (`holdout.py`, `score.py`) | personas incl. Ty's (`p1_ccfresh` …), grounding check, grade distribution, elite caps, parser held-out. | Extend, don't replace. |

**Problems this spec fixes**
- School has no real data → school never moves the grade; a Wharton junior and a community-college freshman look the same at Evercore.
- GPA: cliffs (90/50/15), no scale conversion, no major GPA, no "typical expectation" labeling.
- Experience relevance = keyword overlap on titles; no type, duration, recency, leadership, athletics or class-year expectation. A retail job and an investment-club DCF can score the same.
- Skills = substring matching on industry keywords → false positives (Excel credited for ML roles; "r" inside "marketing", "go" inside "google").
- Fit and Odds are blended before the user sees them; the panel can't explain "great fit, long odds".
- Weights are global, not per role group or firm tier.

---------------------------------------------------------------
## 2. Scoring architecture

### 2.1 Pipeline (new `MC.score`, same signature, old return fields kept + new ones)

```
listing x ──► classify(x)        → roleGroup g, firmTier t, level, constraints (listing + desc + config)
profile pr ─► MC.profile(pr)     → P (GPA on 4.0 scale; experiences typed + dated)
            ┌ gates(x,P)         → hard fails / caps (§2.3)
            ├ components(x,P)    → each {score 0..100|null, conf 0..1, basis, cites[], sentence}
            │   School · GPA · Experience · Skills · RoleFit · ClassYear · LocAuth · Prefs
            ├ weights(g,t)       → per-component weights (§2.4); null components drop, weight re-spread
            ├ Fit  = weighted mean of fit components            ("how well you match")
            ├ Odds = competitiveness-adjusted chance (§2.6)     ("how hard to land")
            ├ Match% = blend(Fit, Odds, Prefs) → caps → calibration map (§2.5)
            ├ letter grade + colour band
            ├ confidence / "Not enough info" (§6A)
            └ feedback panel (§7), every line with cites
```

### 2.2 Components (each returns `{score, conf, basis: sourced|posting|profile|typical|soft_default|missing, cites, sentence, detail}`)

| Key | Measures | Inputs | Null when |
|---|---|---|---|
| `school` | recruiter view of the school for this role group / firm | `P.schoolId`, `data/school_tiers.json`, firm campus lists, `P.homeState`, listing location | no school, or group school weight 0 |
| `gpa` | GPA vs posting cutoff → sourced bar → soft curve | `P.gpa4`, `P.majorGpa4`, `x.gpa_min`, `data/gpa_bars.json` | no GPA (shown neutral, not weighted; §3.6) |
| `experience` | relevant, recent, substantive, leadership experience vs what's expected for the class year | `P.exp[]`, `data/experience_taxonomy.json` | never (no experience → class-year baseline) |
| `skills` | listing required/preferred skills covered | listing skill extraction, `data/skills_taxonomy.json`, `P.skills`, bullets | listing has no skills AND group has no core set |
| `roleFit` | role group vs major/minor/interests/experience groups | `config.roleGroups`, `majorGroups`, `industryGroups` | no major, interests or experience |
| `classYear` | eligibility & seniority alignment | `x.class_years`, `x.terms`, `x.year`, title words ("Sophomore", "Freshman", "Early Insight"), `P.classYear`, `P.gradDate` | no listing info and no title cue |
| `locAuth` | US location + work authorization | `x.locations`, `x.sponsorship`, `x.citizenship`, desc phrases, `P.sponsor` | gate-only; 100 when passes |
| `prefs` | location, remote, paid, term preferences | existing `prefParts` | no prefs set |

### 2.3 Hard gates vs soft scores

Gates run first. **Hard** fail → verdict "Not eligible", Match% capped at `ineligibleCap` (propose 25, F), reason quoted. **Soft** gate → cap only, explained.

| Gate | Trigger (real fields only) | Effect | Wording |
|---|---|---|---|
| Sponsorship | `P.sponsor===true` and (`x.sponsorship==='Not offered'` or `x.citizenship===true` or desc matches `/unable to sponsor|will not sponsor|without (current or future )?(visa )?sponsorship|must be authorized to work .* without sponsorship/i`) | hard | "Not eligible: {company} says '{quoted phrase}', and you need sponsorship." |
| Citizenship / clearance | `x.citizenship===true` or desc `/U\.?S\.? citizen(ship)? (is )?required|active (secret|top secret|TS\/SCI) clearance/i` and profile not a citizen | hard | quote the phrase |
| Class year | `x.class_years` non-empty and `P.classYear` not in it after the existing `EQ` map, confirmed by `gradDate` | hard | "This program is for {years}; you're a {classYear}." |
| Degree level | listing `level` ∈ {MBA, PhD, Masters-only, full-time} and P undergrad | hard | "This is a {level} role." |
| Stated GPA cutoff | cutoff with strength `required` and `P.gpa4 < cutoff` (§3.2 rounding) | soft-hard: cap `gpaCutoffCap` 50 (D+) + red flag; `preferred` → cap 65 | "The posting asks for a {cutoff}+ GPA; yours is {gpa}. Online screens often auto-filter below it." |
| US location | no US location | hard (defensive) | "Not a US role." |
| Major restriction | desc "must be pursuing a degree in X, Y" and major/minor not in set (taxonomy synonyms) | soft cap 60 | "It asks for {majors}; you're {major}. Some firms still consider adjacent majors." |
| Licensure/program | nursing/clinical requires enrollment in BSN/RN program and P isn't | hard | "It requires current enrollment in a nursing program." |

Unknown fields never fail a gate. They lower confidence and add a "Check the posting for …" line only where that gate is common (gov → citizenship; defense → clearance; nursing → program).

### 2.4 Weights by role group and firm tier (STARTING PROPOSALS — calibrate in §8)

Role groups come from `config.roleGroups` plus three new ones: `bigtech` (= `swe` at an elite tech firm), `gov` (category/employer type), `research`. `hardware, mech, eng` share the `eng` row; `ops, design, hr, legal` use `default`. `small_local` is a **firm tier** with overrides.

Fit-component weights (relative; null components drop out; rows sum to 100):

| Role group | School | GPA | Experience | Skills | RoleFit | ClassYear | Why |
|---|---|---|---|---|---|---|---|
| ib (BB / elite boutique) | 22 | 20 | 28 | 8 | 15 | 7 | school + GPA are first-round screens; experience = finance clubs, prior IB/PWM/boutique |
| pe | 20 | 18 | 34 | 8 | 13 | 7 | prior IB/PE/valuation work dominates |
| quant | 15 | 20 | 20 | 30 | 10 | 5 | math/CS/competitions show in skills + experience |
| sandt | 18 | 18 | 27 | 12 | 18 | 7 | |
| consulting | 20 | 20 | 25 | 10 | 18 | 7 | case comps, leadership |
| swe | 5 | 8 | 30 | 37 | 15 | 5 | projects count as experience |
| bigtech | 8 | 10 | 30 | 35 | 12 | 5 | |
| data / AI | 7 | 12 | 28 | 35 | 13 | 5 | |
| product | 10 | 10 | 33 | 20 | 20 | 7 | |
| marketing / sales | 5 | 8 | 35 | 20 | 25 | 7 | |
| accounting | 8 | 22 | 25 | 15 | 23 | 7 | accounting major / CPA track in RoleFit |
| finance (corporate) | 10 | 18 | 30 | 15 | 20 | 7 | |
| eng (ME/EE/CE/ChemE/civil/hardware) | 7 | 15 | 28 | 25 | 20 | 5 | discipline alignment in RoleFit |
| nursing / health clinical | 3 | 15 | 25 | 12 | 35 | 10 | program enrollment ≈ RoleFit |
| gov | 5 | 15 | 25 | 15 | 30 | 10 | citizenship gate |
| research | 10 | 20 | 30 | 25 | 10 | 5 | lab work + coursework |
| default | 7 | 12 | 30 | 23 | 22 | 6 | |

Firm-tier multipliers on `school` / `gpa` / `experience` weights before re-normalizing:

| Firm tier | Definition (data in `config.firmTiers`, sourced) | School × | GPA × | Exp × | Competition baseline |
|---|---|---|---|---|---|
| elite | sourced acceptance ≲2% or sourced "top firm" status (BB/EB IB, MBB, top quant, big tech) | 1.0 | 1.0 | 1.0 | 90 |
| large | Fortune 500 / national firms / Big 4 | 0.7 | 0.9 | 1.0 | 70 |
| mid | ~500–10k employees, regional/national | 0.45 | 0.75 | 1.0 | 50 |
| small_local | <500 employees or single-metro | 0.15 | 0.5 | 1.1 | 30 |
| unknown | no data | 0.5 | 0.8 | 1.0 | `oddsCurve.unknownAs` (55) |

Tier sourcing order: (1) `config.firmTiers` row `{firm, aliases, tier, evidence, source, last_verified}`; (2) headcount in `data/companies.csv` if it has a source; (3) heuristic (single-metro listings, small ATS board) → only `mid`/`small_local` with `basis:"heuristic"` and lower confidence; (4) `unknown`. **Never label a firm elite by heuristic.**

Top-level blend (`match-weights.json` → `blend`):

| Tier | Fit | Odds | Prefs |
|---|---|---|---|
| default | 0.50 | 0.35 | 0.15 |
| elite | 0.45 | 0.45 | 0.10 |
| small_local | 0.55 | 0.25 | 0.20 |

### 2.5 Score → % → letter → colour

1. Fit / Odds / Prefs = weighted means of present parts; `raw = blend`.
2. Gate caps (min). Elite caps now live inside Odds (§2.6), so Fit is never capped by competition.
3. Replace global `strictness` with a **monotone piecewise-linear calibration map** `calibration: [[raw,pct],...]` in `match-weights.json` (start: `[[0,0],[40,32],[60,55],[75,72],[90,90],[100,100]]`; fit in §8).
4. Round once, at the end.
5. Grade table (add D+):

| % ≥ | 95 | 90 | 85 | 80 | 75 | 70 | 65 | 60 | 55 | 50 | 45 | <45 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Grade | A+ | A | A- | B+ | B | B- | C+ | C | C- | D+ | D | F |

6. Colour: continuous green→red, `hsl(4 + 1.1·pct, 70%, 40%)` (F ≈ red, C ≈ amber, A+ ≈ green); ≥4.5:1 contrast in both themes; the existing colour-blind toggle keeps its palette; the letter is always shown so colour is never the only signal. Ungraded = grey "—".

### 2.6 Fit vs Odds (two numbers, one grade)

- **Fit (0–100)**: School (non-competitive part), GPA vs bar, Experience, Skills, RoleFit, ClassYear.
- **Odds (0–100)**: `Odds = 100·(1−c)^k + (Fit−50)·oddsFitGain + schoolOdds + pastEmployer`, with `c` = competition from tier baseline + sourced acceptance evidence + existing `competition()` signals, `k = oddsCurve.exponent` (1.3), `oddsFitGain` 0.35, `schoolOdds` ±12 (elite/large finance, consulting, quant only; §4.3), past employer +15. Clamp 0–100.
- Elite caps (moved here): elite + no related experience → Odds ≤ 20; elite + GPA under sourced bar → Odds ≤ 25. A strong sophomore therefore lands around D+/C- at a BB sophomore program, never F from competition alone, while Fit can be A-range.
- Display: badge = Match % + letter. Below: two thin bars, "Fit 82 · Odds 31", with words ("Strong fit" / "Long odds — very competitive program"). Tooltip: "Fit = how well you match. Odds = how hard it is to land, given the applicant pool."
- Tier note for elite firms, from `firmTiers.evidence` + source, e.g. "JPMorgan: ~630,000 applications for ~4,100 internships in 2025 (~0.7%). Source: eFinancialCareers citing Financial News."

---------------------------------------------------------------
## 3. GPA

### 3.1 Posting cutoff extraction
Sources in order: `x.gpa_min` (already on 1,407 listings) → `data/desc/<shard>.json` → `data/detail`. Build-time `pipeline/gpa_extract.py` writes `gpa_min`, `gpa_min_strength: required|preferred`, `gpa_min_quote`, `gpa_scale`; a JS mirror in the grader handles client-only text.

Normalize first: `≥`→`>=`, en/em dashes → `-`, collapse whitespace. Regex (case-insensitive):
```
NUM    = (?<n>[0-4]\.\d{1,2})
SCALE  = (?:\s*(?:/|out of|on a)\s*(?<s>4\.0|4|4\.3|5\.0|5|100)(?:[- ]point)?(?:\s*scale)?)?
R1 = (?:minimum|min\.?|at least|cumulative|overall)?\s*(?:gpa|grade point average)\s*(?:of|:|requirement of)?\s*(?:a\s*)?(?:minimum of\s*)?NUM SCALE\s*(?:\+|or (?:higher|above|better)|and above|minimum)?
R2 = NUM SCALE\s*(?:\+|or (?:higher|above|better))?\s*(?:cumulative\s*|overall\s*)?(?:gpa|grade point average)
R3 = (?:gpa|grade point average)\s*(?:>=|above|over|greater than|of at least)\s*NUM
REQ  = required|must (?:have|maintain|possess)|minimum|at least|eligib|need
PREF = preferred|strongly preferred|ideally|desired|a plus|competitive candidates
REJECT (±10 chars before NUM) = python|java|ios|android|version|v\.|\$|usd|/hr|hours?|years?|credits?|miles?
```
Rules: strength words searched in a ±60-char window; no strength word → `required`; several values → take the max in the requirements section; ignore values > their scale; store the matched sentence as `gpa_min_quote` (≤160 chars) for feedback citation.

Required unit-test examples:

| Text | Result |
|---|---|
| "Minimum cumulative GPA of 3.0" | 3.0 required |
| "3.5+ GPA preferred" | 3.5 preferred |
| "GPA: 3.2/4.0 or higher" | 3.2 required |
| "Must have a GPA of at least 3.30 on a 4.0 scale" | 3.3 required |
| "Strong academic record (3.5 GPA or above)" | 3.5 required |
| "GPA >= 3.7 strongly preferred" | 3.7 preferred |
| "3.0 GPA on a 4.0 scale or top third of class (Pathways)" | 3.0 required, `alt: "top third of class"` |
| "Python 3.10 and SQL" | none |
| "Pay: $23.50/hr" | none |
| "3.5 years of experience" | none |
| "Minimum GPA 85/100" | 85 on 100 → converted 3.0, required |

### 3.2 Scale conversion `MC.gpa4(raw, scaleHint)`

| Input | Rule | Note shown to user |
|---|---|---|
| 0–4.0 | as is | — |
| 4.0–4.33, scale 4.3 | `min(4.0, g)` (A+ ≡ 4.0) | "Converted from a 4.3 scale" |
| ≤5.0, scale 5.0 | `g × 0.8` | "Converted from a 5.0 scale" |
| 50–100 or % | ≥93→4.0, 90–92→3.7, 87–89→3.3, 83–86→3.0, 80–82→2.7, 77–79→2.3, 73–76→2.0, 70–72→1.7, 67–69→1.3, 65–66→1.0, <65→0.0 (cite the conversion table used in `gpa_bars.json._scales`) | "Your 88/100 converts to about 3.3" |
| >4.0, no scale info | **don't guess**: leave blank, parser "Check these: GPA scale?" | — |

Rounding: store the GPA exactly as typed (max 2 decimals after conversion); compare to cutoffs without rounding (3.49 does not meet 3.5). Never round a user's GPA up in feedback; show both numbers ("3.50 required, you have 3.49").

### 3.3 Major GPA
Optional `majorGpa` field in profile (parser reads "Major GPA: 3.8"). Use `max(gpa, majorGpa)` only for typical/soft bars and only when RoleFit ≥ 80 (major relevant). Stated cutoffs use cumulative GPA unless the posting says "major GPA". Feedback: "Using your 3.8 Finance major GPA, which is relevant here."

### 3.4 Typical bars — `data/gpa_bars.json` (sourced only)
```json
{
  "_readme": "GPA bars by firm or role group x tier. Non-default entries need source_url + quote + last_verified. soft_default = 'typical expectation' in UI.",
  "_scales": {"source_url": "<public GPA conversion table>", "last_verified": "2026-10-xx"},
  "bars": [
    {"scope": "firm", "firm": "JPMorgan Chase", "bar": 3.5, "kind": "reported_screen", "quote": "...", "source_url": "...", "last_verified": "..."},
    {"scope": "group_tier", "group": "ib", "tier": "elite", "bar": 3.5, "kind": "typical", "quote": "...", "source_url": "...", "last_verified": "..."},
    {"scope": "group_tier", "group": "gov", "tier": "*", "bar": 3.0, "kind": "program_rule", "quote": "...", "source_url": "<OPM Pathways page>", "last_verified": "..."},
    {"scope": "group_tier", "group": "*", "tier": "*", "bar": 3.0, "kind": "soft_default", "source_url": null, "note": "No public source for this firm/group. Shown as 'typical expectation'."}
  ]
}
```
Lookup: posting cutoff → firm entry (also migrate existing `config.firmTiers[].gpaBar` with their sources) → group×tier → group×* → soft_default. Allowed sources: the firm's own careers/FAQ page, school career-center pages that state employer screens, government program rules (e.g., OPM Pathways "Superior Academic Achievement"), NACE Job Outlook (share of employers screening by GPA and the common cutoff) with report year + page, reputable journalism quoting firms. **Not allowed:** forums (WSO, Reddit), "everyone knows", the agent's memory. Those may go into `notes` as "anecdotal, unused".

### 3.5 Curve (smooth; no step >10 points per 0.1 GPA)
`d = g − bar`
- Stated required: `d ≥ 0` → `80 + min(20, 50d)`; `d < 0` → `max(5, 30 + 100d)` plus the gate cap.
- Sourced typical: `d ≥ 0.3` → 100; `0 ≤ d < 0.3` → `80 + 66d`; `−0.3 ≤ d < 0` → `80 + 150d`; `d < −0.3` → `max(15, 35 + 100(d+0.3))`.
- Soft default: same shape compressed toward 60: `60 + (s − 60)·0.6`, `basis: soft_default`.
- Upward trend: only if the profile shows it (term GPAs rising, "Dean's List Spring 2026") → +3 max, cited; never overrides a stated cutoff.
- Freshman with one semester: conf × 0.7, note "based on one semester".

### 3.6 No GPA
Not weighted (no penalty); row shows "—, not counted". If the listing has a stated cutoff → confidence medium and row: "This posting requires 3.0+; add your GPA so we can check." Tip (honest): "Add your GPA if it's 3.0 or higher. Leaving it off is common, but some recruiters assume it's below 3.0."

### 3.7 GPA row sentences (pick one)
- Meets stated: "Your 3.92 clears the 3.5 minimum this posting lists."
- Below stated: "The posting requires 3.3; your 3.1 is under it, and online screens often auto-reject below the cutoff. Apply only with a referral."
- Sourced typical: "3.92 is above the ~3.5 that {firm} is reported to screen at ({source domain})."
- Soft default: "3.2 is near the 3.0 typical expectation. We found no public GPA bar for this firm."
- Converted: "Your 88/100 converts to about 3.3 on a 4.0 scale."

---------------------------------------------------------------
## 4. School

### 4.1 Data model — `data/school_tiers.json`
```json
{
  "_readme": "Recruiting context by role group. Every tier needs >=1 source with url + quote. No source => no tier. Never infer tiers from rankings.",
  "version": "2026-10-xx",
  "schools": [
    {
      "id": "upenn",
      "name": "University of Pennsylvania",
      "aliases": ["UPenn", "Penn", "Wharton", "The Wharton School"],
      "state": "PA", "city": "Philadelphia", "ipeds_id": "215062", "kind": "4yr",
      "tiers": {
        "ib": {"tier": "target", "sources": ["src_gs_campus", "src_penn_outcomes_2025"]},
        "consulting": {"tier": "target", "sources": ["..."]}
      },
      "placement": [{"fact": "Top employers include Goldman Sachs, Morgan Stanley", "source": "src_penn_outcomes_2025"}],
      "last_verified": "2026-10-xx"
    },
    {
      "id": "queens-charlotte",
      "name": "Queens University of Charlotte",
      "aliases": ["Queens University", "Queens Charlotte", "McColl School of Business (Queens)"],
      "state": "NC", "city": "Charlotte", "kind": "4yr",
      "tiers": {},
      "placement": [],
      "last_verified": "2026-10-xx"
    }
  ],
  "sources": {
    "src_gs_campus": {"url": "https://...", "publisher": "Goldman Sachs", "type": "firm_campus_page", "quote": "...", "retrieved": "2026-10-xx"}
  },
  "firm_campus_lists": [
    {"firm": "Goldman Sachs", "schools": ["upenn"], "scope": "campus events / school dropdown", "source": "src_gs_campus"}
  ]
}
```
Tier values: `target | semi_target | non_target_listed | (absent = unknown)`. Tier keys only for `ib, pe, sandt, consulting, quant` (groups where school is a real screen). `"tiers": {}` is a valid, honest state.

### 4.2 Building it (`pipeline/school_tiers_build.py` + review in `admin.html`)
Allowed evidence, strongest first:
1. **Firm campus pages** that list schools (school dropdowns, campus event calendars, "schools we recruit from"). → `firm_campus_lists`.
2. **School first-destination / employment reports** (career-center PDFs) naming firms with hire counts.
3. **Published target-school analyses with a stated methodology** (e.g., placement counts from public profiles). Supporting only; never sufficient alone for `target`.
Not allowed as tier evidence: rankings, forum "target lists", the agent's own knowledge.

Tier is **computed**, not typed: `tierFrom(evidence)` —
- `target`: listed by ≥2 elite firms in the group on campus pages, OR ≥5 hires into elite firms in the group in the school's latest report, OR (1 elite campus listing + methodology source agreeing).
- `semi_target`: 1 elite firm campus listing, OR 1–4 elite hires reported.
- `non_target_listed`: only when a sourced statement says the firm restricts to listed schools and the school isn't listed.
Thresholds live in the file (`_rules`) and are reported. Re-verification: `pipeline/lint_sources.py` flags sources older than 12 months into `ops/school_tiers_stale.md`. Fetch only official pages/PDFs; respect robots.txt; no bot-check bypass. Report coverage per group.

### 4.3 Scoring

| Situation | Fit score | Odds adj (elite/large, ib/pe/sandt/consulting/quant only) | basis |
|---|---|---|---|
| target | 90 | +12 | sourced |
| semi_target | 75 | +5 | sourced |
| on the hiring firm's own campus list | +10 (cap 95) | +8 | sourced |
| firm appears in school's `placement` | +8 | +6 | sourced |
| unknown 4-year | 60 | 0 | soft_default ("no public data") |
| non_target_listed | 45 | −8 | sourced |
| current community college | 55 at elite finance/consulting, 65 elsewhere | −5 elite only | soft_default |
| CC with `profile.transferTo` | transfer school's tier at 0.7 weight, noted | — | profile |
| proximity (mid/small_local only): listing ≤75 mi from school or in `homeState` | +10 (cap 100) | +3 | geocode via `cities.json` |
| groups with no tiers (swe, data, marketing, eng, …) | 65 ± proximity | 0 | soft_default |

**Fairness cap:** holding everything else equal, swapping schools may move Match% by at most `schoolMaxSwing` (15 at elite ib/pe/consulting/quant, 6 elsewhere). Enforced by test §8.6.

### 4.4 Matching the profile school
Exact name/alias in `school_tiers.json` → exact name in `data/schools.json` (kind from `/Community College|Technical College|State College of/`) → else null + "Check these". **No fuzzy matching across institutions.** Known collisions must be tests: "Queens College" (CUNY) ≠ "Queens University of Charlotte"; "Miami University" (Ohio) ≠ "University of Miami"; "Washington University in St. Louis" ≠ "University of Washington"; "Penn State" ≠ "Penn".

### 4.5 Wording examples
- Non-target at BB IB (Ty × JPMorgan sophomore IB): "We found no public data showing JPMorgan recruits on campus at Queens, so treat this as a networking-led path: referrals matter more than the online application." If listings data shows Charlotte locations for the firm: "JPMorgan has Charlotte roles in our database, so local analysts are reachable."
- Target: "Penn appears on Goldman's campus recruiting page ({source}), which helps get your resume read."
- Firm-listed school: "{Firm} lists {school} among the schools it recruits at ({source})."
- Small local: "School matters little at a firm this size; you're about 8 miles away in Charlotte, which helps."
- SWE / data: "School carries little weight for software roles; your projects and internships matter more."
- Community college: "Big banks rarely hire straight from community college programs; local firms are a better fit now, and your transfer to {school} would open more doors." (transfer clause only if `transferTo` is set.)
Never write "non-target" as a sourced fact unless `non_target_listed` is sourced; otherwise say "no public data that X recruits at Y".

---------------------------------------------------------------
## 5. Experience

### 5.1 Parsed schema (`profile.experience[]`)
```json
{
  "id": "e1",
  "employer": "Queens Investment Club",
  "title": "Analyst",
  "start": "2025-09", "end": null, "current": true, "months": 13,
  "type": "club_member",
  "typeConf": 0.9,
  "location": "Charlotte, NC",
  "bullets": [
    {"i": 0, "text": "Built DCF valuation of a utility; pitched buy rating to the club portfolio",
     "skills": ["dcf", "valuation", "pitching"], "numbers": [], "verbs": ["built", "pitched"]}
  ],
  "skills": ["dcf", "valuation", "excel"],
  "quantified": ["$50K portfolio"],
  "leadership": {"level": "member", "teamSize": null},
  "athletics": null,
  "src": {"resumeLine": 23}
}
```
Types: `internship, full_time, part_time, research, club_member, club_leadership, athletics, project, competition, military, volunteer, teaching, entrepreneurship`.

Parser additions (`resume.js` and the in-browser parser module): date ranges (`Sep 2025 – Present`, `06/2024–08/2024`, `Summer 2025` → Jun–Aug), type rules (`Intern` → internship; `Research Assistant|Lab|REU` → research; `NCAA|Division I|D1|D-I|Varsity|… Team` → athletics; `Club|Society|Association` + `President|VP|Treasurer|Chair|Captain|Lead|Head` → club_leadership, else club_member; `Cashier|Server|Barista|Sales Associate|Lifeguard|Host` → part_time; `Army|Navy|Air Force|Marines|ROTC|National Guard` → military; `Volunteer` → volunteer; `Founder|Co-founder` → entrepreneurship; GitHub/“Project” → project; `Case Competition|Hackathon|Olympiad|Putnam` → competition), numbers `\$?\d[\d,.]*\s?(%|k|m|bn|users|clients|members|hours)?`. Low `typeConf` → "Check these". Never infer an employer, date or type not in the text; unknown dates stay null.

### 5.2 Relevance taxonomy — `data/experience_taxonomy.json`
Levels: `core 1.0 · adjacent 0.7 · transferable 0.35 · low 0.15 · none 0`. Rules: `{match: {type?, employerTier?, titleRe?, bulletRe?, skillsAny?}, groups: {ib: "core", ...}, why: "..."}`; most specific rule wins per group; experience relevance = max over its bullets/rules.

| Experience | ib | pe | quant | consulting | swe | data | marketing | accounting | corp fin | small/local biz | clinical |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Investment club: DCF/comps, stock pitch | core | adjacent (core if LBO) | transferable | adjacent | low | low | low | adjacent | adjacent | adjacent | none |
| Prior IB / boutique M&A internship | core | core | adjacent | adjacent | low | low | low | adjacent | core | adjacent | none |
| Wealth management / PWM intern | adjacent | transferable | low | transferable | none | low | transferable | transferable | adjacent | adjacent | none |
| Big 4 audit/tax intern | adjacent | transferable | low | adjacent | none | low | low | core | core | adjacent | none |
| Retail cashier / server | low (client-facing, transferable framing) | low | none | low | none | none | transferable | low | low | transferable | low |
| Research lab (stats/ML, Python) | low | low | adjacent (core if stochastic/ML/time series) | transferable | adjacent | adjacent (core if ML/data pipeline) | low | low | low | low | low |
| Personal SWE project with GitHub/users | none | none | adjacent | low | core | adjacent | low | none | low | low | none |
| Case competition (placed) | adjacent | transferable | low | core | low | low | adjacent | transferable | transferable | transferable | none |
| Social media manager w/ metrics | low | none | none | low | none | low | core | none | none | adjacent | none |
| CNA / hospital volunteer | none | none | none | none | none | none | none | none | none | low | core |
| Military service | transferable | transferable | low | adjacent | low | low | transferable | transferable | transferable | adjacent | low (gov: adjacent) |
| VITA tax volunteer | low | low | none | low | none | none | none | adjacent | transferable | adjacent | none |
| FSAE / engineering design team | none | none | low | low | adjacent | low | none | none | none | low | none (eng: core) |
| D1/varsity athletics | §5.5 | | | | | | | | | | |

`why` strings feed feedback: "Your DCF in the investment club ('Built DCF valuation of a utility') is the kind of work M&A analysts do."

### 5.3 Score
Per experience: `v = relevance × typeWeight × durationF × recencyF × leadershipF × substanceF`
- typeWeight: internship 1.0, full_time 1.0, research 0.9, military 0.8, entrepreneurship 0.8, club_leadership 0.75, project 0.7 (0.9 for swe/data), competition 0.7, part_time 0.6, club_member 0.5, volunteer 0.4, athletics §5.5.
- durationF = `min(1, 0.4 + months/10)`; null months → 0.7 and conf↓.
- recencyF: current or ended ≤12 mo → 1.0; 12–24 → 0.85; >24 → 0.7; high-school-only → 0.5 for juniors/seniors, 0.8 for freshmen.
- leadershipF: member 1.0, lead 1.1, officer/captain 1.15, founder 1.2.
- substanceF: quantified result 1.1; core-skill bullets 1.05; title only, no bullets 0.8.

Aggregate top 4 with diminishing returns: `E = 100 × (1 − Π(1 − 0.75·v_k))`.

Expected E by class year for the listing's term (what a recruiter expects at that point):

| Program stage | elite | large | mid / small |
|---|---|---|---|
| Freshman / sophomore programs (Early Insight, Sophomore Summer Analyst) | 25 | 20 | 15 |
| Junior summer (main pipeline) | 60 | 45 | 30 |
| Senior / recent grad / off-cycle | 70 | 55 | 40 |

`experience = clamp(58 + 0.9·(E − expected), 5, 100)`. Meeting your year's bar ≈ 58; exceeding climbs fast; none at a junior elite role ≈ 5 (honest), at a sophomore program ≈ 35.
- **Prior employer = hiring firm** (normalized + aliases, existing `pastEmp` logic): experience +15, Odds +15, cite the experience id; say "return" only if it was an internship.
- Elite prior employer in the same group (firmTiers elite) keeps the "one of the strongest signals in finance recruiting" line, now data-driven.

### 5.4 Never credit what isn't there
Every positive experience claim must cite `exp.id` (+ bullet `i`) and may quote ≤12 words from it. A claim that needs inference (e.g. "you've built LBOs" when the bullet says "investment club member") is dropped. Enforced by `test/grader_grounded.js`.

### 5.5 D1 / varsity athletics
Level from text: `NCAA Division I|D1|D-I` → d1; `Division II|III|D2|D3|Varsity` → varsity; `club|intramural` → club (counts as club_member).
- Relevance: adjacent (0.7) for ib, pe, sandt, consulting, sales, corp fin; transferable (0.35) for marketing, accounting, ops, gov; low for swe, data, quant, research, clinical. typeWeight 0.75 (d1), 0.6 (varsity).
- Sourcing: the sentence "recruiters value athletes" appears only when `experience_taxonomy.json.sources.athletics` has a public citation (e.g., firm athlete recruiting programs or athlete-specific events pages). Without it, the score still counts athletics as teamwork/time-management, and the sentence says only what the profile shows.
- `athleteProgramFirms` (sourced list): +5 Odds and a next step "Apply through {firm}'s athlete program ({link})".
- Wording: "Division I lacrosse at Queens shows the time management and competitiveness finance recruiters look for. List it under Experience with your hours per week, not just Activities."

---------------------------------------------------------------
## 6. Skills

### 6.1 `data/skills_taxonomy.json`
```json
{
  "skills": {
    "excel": {"label": "Excel", "syn": ["microsoft excel", "ms excel", "spreadsheets", "vlookup", "xlookup", "pivot tables"]},
    "financial_modeling": {"label": "Financial modeling", "syn": ["3-statement model", "three statement model", "dcf", "lbo", "comps", "precedent transactions"], "implies": ["excel", "valuation"]},
    "python": {"label": "Python", "syn": ["python3", "pandas", "numpy"]},
    "machine_learning": {"label": "Machine learning", "syn": ["ml", "deep learning", "pytorch", "tensorflow", "scikit-learn", "sklearn"]},
    "cpp": {"label": "C++", "syn": ["c++", "cpp"]},
    "r_lang": {"label": "R", "syn": ["r programming", "rstudio", "tidyverse"], "standalone": "\\bR\\b(?=.{0,30}(statistic|programming|studio|language))"},
    "go_lang": {"label": "Go", "syn": ["golang", "go (golang)"]}
  },
  "groups": {
    "ib":         {"core": ["financial_modeling", "excel", "valuation", "accounting"], "useful": ["powerpoint", "capital_iq", "factset", "bloomberg"], "not_core": []},
    "pe":         {"core": ["financial_modeling", "valuation", "excel"], "useful": ["lbo", "due_diligence"], "not_core": []},
    "quant":      {"core": ["probability", "statistics", "python", "cpp", "linear_algebra"], "useful": ["machine_learning", "c_sharp", "kdb"], "not_core": ["excel", "powerpoint"]},
    "data":       {"core": ["python", "sql", "statistics"], "useful": ["machine_learning", "tableau", "power_bi", "spark"], "not_core": ["powerpoint", "word"]},
    "ml":         {"core": ["python", "machine_learning", "linear_algebra"], "useful": ["pytorch", "cloud"], "not_core": ["excel", "powerpoint", "word"]},
    "swe":        {"core": ["one_of:python|java|cpp|javascript|go_lang|c_sharp", "data_structures", "git"], "useful": ["react", "aws", "sql"], "not_core": ["excel"]},
    "marketing":  {"core": ["social_media", "content_creation", "marketing_analytics"], "useful": ["canva", "hubspot", "google_analytics", "seo"], "not_core": []},
    "accounting": {"core": ["accounting", "excel"], "useful": ["quickbooks", "sap", "gaap"], "not_core": []},
    "nursing":    {"core": ["bls", "patient_care"], "useful": ["cna", "epic"], "not_core": []},
    "eng":        {"core": ["cad"], "useful": ["solidworks", "matlab", "ansys"], "not_core": []}
  }
}
```
### 6.2 Listing extraction (`pipeline/skills_extract.py` → `skills_req`, `skills_pref` in `data/detail`)
Split sections by header regex (`Requirements|Qualifications|Basic|Minimum` vs `Preferred|Nice to have|Bonus|Plus`). Longest-phrase-first matching with word boundaries; special tokens `C++`, `C#`, `.NET`; `R` only via `standalone` rule; `Go` only as "Golang"/"Go (Golang)"/"in Go". No desc → group `core` as implied requirements at 0.5 weight, conf↓.

### 6.3 Score
`importance = (required 3 | preferred 1.5 | implied 0) + (group core 2 | useful 1 | else 0)`; skills in group `not_core` → importance ≤ 0.5 even if listed (Excel never core for ML/AI). Profile skills = `P.skills` ∪ bullet-extracted skills ∪ `implies`. Evidence: shown in a bullet 1.0, listed only 0.8. `skills = 100 × Σ importance(matched)·evidence / Σ importance(all)`; floor 10. **No substring matching** — replaces the current `k.includes(s)` logic in `match-core.js`.

---------------------------------------------------------------
## 6A. Confidence, "Not enough info", stability, ties

**Confidence** `= Σ w_c · present_c · conf_c / Σ w_c`; ≥0.7 high, 0.45–0.7 medium, <0.45 low.

**"Not enough info"** (grade "—", grey) when conf < 0.35, OR the profile lacks ≥2 of {school, major, classYear, any experience or skills}, OR the listing has no role group and no description. Show up to 3 asks, highest weight first, specific to the listing: "Add your class year (this program is sophomore-only)", "Add your GPA (the posting requires 3.3+)", "Add dates to your experiences". Listing side: "This posting lists no class year, location or description; open it to check."

**Stability (tested):** GPA ±0.1 → Match% moves ≤4; adding a low-relevance experience ≤3; adding/removing a non-core skill ≤3; rewording a bullet without changing parsed skills/numbers = 0. No discontinuity >6 points except gates (which always show a reason). Display hysteresis: if the scoring-relevant `profileHash` is unchanged, keep the previous letter when pct moves across a boundary by ≤1.

**Ties** (equal pct in lists): Fit desc → confidence desc → sooner real deadline → newer posted → company A–Z → id.

---------------------------------------------------------------
## 7. Feedback panel

### 7.1 Structure
```
[ C-  56% ]   Fit 78 · Odds 30      Confidence: high
Tier note (elite only, sourced): "JPMorgan: ~630,000 applications for ~4,100 internships in 2025 (~0.7%)."
Rows — score bar + one honest sentence + basis chip [sourced | from posting | typical | no data]:
  School       55  ...
  GPA          98  ...
  Experience   64  ...
  Skills       70  ...
  Fit          92  (role, major, class year)
Top strengths (≤3, cited)
Gaps (≤3, cited)
Next steps (exactly 3 when graded; concrete; show the real "+N pts" lift from a re-score)
Verdict: band label + one sentence
Sources (collapsed): every URL used in this panel
```
Returned JSON (`MC.score(...).feedback`):
```json
{"rows":[{"k":"school","score":55,"basis":"soft_default","sentence":"...","cites":["profile.school","school_tiers:queens-charlotte"]}],
 "strengths":[{"t":"...","cites":["profile.gpa"]}],
 "gaps":[{"t":"...","cites":["listing.skills_req[2]"]}],
 "steps":[{"t":"...","lift":6,"cites":["profile.experience.e1.bullets[0]"]}],
 "verdict":{"k":"reach","t":"Reach: apply with a plan","why":"...","cites":[]},
 "tierNote":{"t":"...","source":"https://..."},
 "sources":["https://..."]}
```
Keep the legacy string arrays (`strengths, gaps, actions, verdict.t`) for one release so `feedback.js` and tests keep working while UI migrates.

### 7.2 Verdict wording by band
| Band | Label | Pattern |
|---|---|---|
| A range (≥85) | Strong shot | "You match what {company} asks for. Apply early and lead with {top experience}." |
| B (70–84) | Worth applying | "Good fit. {Main gap} is the one thing to shore up before you apply." |
| C (55–69) | Reach: apply with a plan | "Possible, but {main gap}. Pair the application with {top step}." |
| D/D+ (45–54) | Long shot | "Long odds: {reason}. Apply if you can get a referral, and build {x} for next cycle." |
| F (<45) | Unlikely right now | "{Reason}. Better targets: {N} similar roles grade B or higher for you." (N from real listings) |
| Not eligible | Not eligible | Gate reason with the quoted phrase. |
| — | Not enough info | The exact items to add. |
Tone: plain second person, short sentences, no hype ("perfect", "amazing"), no doom ("no chance"), no claims about hidden facts ("they'll love you"), no invented numbers.

### 7.3 Next-step rules
Exactly 3, ranked by real lift (re-score via the existing what-if mechanism in `feedback.js`). Allowed types: improve a specific bullet (quote it); add missing data (GPA, dates, hours); build a skill the listing requires that the profile lacks; networking/referral (elite/large only); timing (`x.deadline`, or `pred` labeled "Expected" with its basis); apply to an athlete/diversity/early-insight program only if sourced; alternative real listings that grade higher. ≤30 words each. Never mention alumni counts (we have no such data) or "fills early" without a source.

### 7.4 Example outputs (become golden files `test/golden/feedback/*.json`)

**A. Ty (Queens University of Charlotte, Finance, sophomore, 3.92, D1 lacrosse, investment club) × JPMorgan "2027 Sophomore Summer Analyst — Investment Banking", New York**
Grade **C- 56%** · Fit 78 · Odds 30 · confidence high. Tier note: "JPMorgan: ~630,000 applications for ~4,100 internships in 2025 (~0.7%)."
- School 55 [no data]: "We found no public data that JPMorgan recruits on campus at Queens, so this is a networking-led path, not a campus one."
- GPA 98 [sourced]: "Your 3.92 is well above the 3.5 JPMorgan is reported to screen at."
- Experience 64: "For a sophomore program, your investment club DCF ('Built DCF valuation of a utility…') plus D1 lacrosse is about what's expected."
- Skills 70: "You show Excel and valuation; the posting also asks for PowerPoint, which isn't on your profile."
- Fit 92: "It's a sophomore-only IB program and you're a Finance sophomore."
- Strengths: 3.92 GPA; DCF work in the investment club; D1 lacrosse. Gaps: no campus-recruiting link to Queens; PowerPoint not shown; no quantified result in the club bullet.
- Steps: "Message 2–3 JPMorgan analysts for a referral before you apply; a referral matters more than another bullet at this firm." · "Add numbers to your DCF bullet: company, implied share price, upside %." · "Add PowerPoint if you've built pitch slides."
- Verdict: **Reach: apply with a plan.**

**B. Ty × Charlotte independent wealth-management firm "Finance Intern" (small_local)** → **B+ 80–86**. School row: "School matters little at a firm this size; you're about 8 miles away." Experience: "Your investment club stock pitch maps directly to client research here."

**C. Ty × Evercore summer analyst (sophomore-eligible listing)** → **D+…C- 50–57**: "Elite boutiques recruit heavily from a short list of schools; we found none listing Queens, so a referral is close to required."

**D. Ty × Jane Street quant trading intern** → **F…D 35–48**: "Quant firms test probability and coding; your profile shows neither yet." Steps: a Python project with a probability component; list any math coursework; a better-fit finance listing.

**E. Ty × Google SWE intern** → **F ≤35**: "It's a software engineering role; your profile is finance." Step: "5 finance roles grade B+ or better for you — see them."

**F. Wharton junior (Morgan Stanley sophomore program, PE club, 3.85) × Goldman Summer Analyst IB** → **B…A- 75–88**: School 90 "Penn appears on Goldman's campus page"; Experience 88 "Your Morgan Stanley sophomore program is one of the strongest signals in IB recruiting." Tier note still shown; Odds ~55.

**G. Community-college freshman (Miami Dade, undeclared, 3.1, Publix cashier) × local Miami small-business operations intern** → **C+…B 65–77**: "Entry-level and local; your 2 years of customer-facing work counts here." × JPMorgan sophomore program → **Not eligible** (class year).

**H. F-1 international (Purdue Data Science, needs sponsorship) × defense contractor (U.S. citizenship required)** → **Not eligible**: "It says 'U.S. citizenship is required' and you need sponsorship." Step: data roles at employers with H-1B history in `data/h1b.json` ("sponsored N H-1B petitions in FY2022 — not a guarantee").

**I. Nursing junior (Ohio State BSN, CNA 1 yr, BLS, 3.5) × hospital "Nurse Extern"** → **A-…A 85–94**. × JPMorgan IB → **F**: "Different field; your clinical experience doesn't carry over."

**J. MIT CS senior (Google SWE intern, ML research, 3.84 converted from 4.8/5.0) × Meta SWE intern** → **A-…A+ 85–96**: School 65 "School carries little weight here; your Google internship does."

---------------------------------------------------------------
## 8. Validation

### 8.1 Process
1. `test/calibration/profiles.json` (14 personas, §8.2) and `test/calibration/listings.json` (14 listing types, §8.3): copy real listings from `data/listings.json` by id where one exists; otherwise realistic fixtures marked `"synthetic": true`.
2. Write `test/calibration/expected.json` **before running anything**, in its own commit `calibration expectations (pre-run)`, so git history proves the order. Each pair: `{profile, listing, range:[lo,hi] | "not_eligible" | "not_enough_info", grades, reasoning}`.
3. `node test/calibration/run.js` → `ops/V12_GRADER_CALIBRATION.md`: pair · expected · before (current grader) · after · Fit · Odds · rows · ✓/✗.
4. Tune **data only** (weights, curves, calibration map). Each outlier: fixed, or the expectation was wrong — with a written reason. Max 5 expectation edits; more means the process is being gamed.
5. Acceptance: **≥90% (≥54/60) in range**, every outlier explained or fixed, all tests in §8.5–8.6 green, grounding 100%.

### 8.2 Personas
| ID | Profile |
|---|---|
| P01 Ty | Queens University of Charlotte · Finance · sophomore (2029) · GPA 3.92 · NCAA D1 men's lacrosse · Investment Club analyst (DCF, stock pitch) · Excel, financial modeling, valuation · Charlotte, NC · no sponsorship |
| P02 CC freshman | Miami Dade College · Undeclared (Business) · freshman · 3.1 · Publix cashier 2 yrs · Excel, Spanish · Miami |
| P03 State marketing soph | Appalachian State · Marketing · sophomore · 3.4 · club social media manager (+40% followers) · Canva, HubSpot cert · NC |
| P04 Non-target IB junior | UNC Charlotte · Finance · junior · 3.7 · boutique M&A intern (Summer 2026, 10 wks) · investment club VP |
| P05 Wharton IB junior | UPenn (Wharton) · Finance · junior · 3.85 · Morgan Stanley sophomore program · PE club · modeling |
| P06 MIT CS senior | MIT · CS · senior · 4.8/5.0 (→3.84) · Google SWE intern · ML lab research · Python, C++, PyTorch |
| P07 F-1 international | Purdue · Data Science · junior · 3.6 · needs sponsorship · research assistant (Python, SQL) |
| P08 Nursing junior | Ohio State · BSN Nursing · junior · 3.5 · CNA 1 yr · BLS · hospital volunteer |
| P09 State accounting junior | Georgia State · Accounting · junior · 3.3 · VITA tax volunteer · QuickBooks |
| P10 ME sophomore | Virginia Tech · Mechanical Engineering · sophomore · 3.2 · FSAE · SolidWorks |
| P11 No-GPA econ junior | Arizona State · Economics · junior · GPA blank · server 2 yrs · Excel |
| P12 Low-GPA math junior | Rutgers · Math · junior · 2.9 · Putnam participant · Python, probability |
| P13 Policy junior | University of Maryland · Public Policy · junior · 3.6 · U.S. citizen · congressional office volunteer |
| P14 Recent grad changer | Queens College (CUNY) — collision test vs P01 · Psychology · recent grad · 3.4 · retail store manager 3 yrs |

### 8.3 Listing types
L1 BB sophomore IB program (JPMorgan Sophomore Summer Analyst; class_years Sophomore) · L2 elite boutique summer analyst (juniors) · L3 mid-market PE intern (juniors, gpa_min 3.5 required) · L4 quant trading intern (elite) · L5 big-tech SWE intern · L6 mid-size corporate finance / FP&A intern (gpa_min 3.0) · L7 local small firm (Charlotte wealth management; for non-NC personas use a same-metro small firm) · L8 federal government intern (citizenship, 3.0 Pathways) · L9 hospital nurse extern · L10 Big 4 audit intern · L11 marketing intern at a mid consumer brand · L12 data analyst intern (mid) · L13 defense engineering intern (citizenship/clearance) · L14 MBB consulting sophomore insight program

### 8.4 The 60 pairs (expected ranges written pre-run; full reasoning goes in expected.json)
| # | Pair | Expected | Grade | Reasoning |
|---|---|---|---|---|
| 1 | P01×L1 | 50–60 | D+…C | strong sophomore, no campus link, elite; V12 says not F |
| 2 | P01×L2 | not eligible | — | juniors only |
| 3 | P01×L3 | 25–45 | F…D | PE expects prior IB; juniors → likely not eligible; if open, low |
| 4 | P01×L4 | 30–48 | F…D | no quant/coding evidence |
| 5 | P01×L5 | 5–35 | F | wrong field |
| 6 | P01×L6 | 70–82 | B-…B+ | solid corp-fin fit, GPA clears 3.0 |
| 7 | P01×L7 | 80–92 | B+…A | local, finance fit, school irrelevant |
| 8 | P01×L10 | 62–76 | C…B | finance-adjacent, accounting gap |
| 9 | P01×L14 | 45–58 | D…C- | elite, sophomore program, finance major |
| 10 | P01×L11 | 45–60 | D…C | partial major mismatch |
| 11 | P02×L1 | not eligible | — | freshman |
| 12 | P02×L7 | 62–75 | C…B | entry-level local, customer work |
| 13 | P02×L11 | 50–64 | D+…C | |
| 14 | P02×L5 | 5–30 | F | |
| 15 | P02×L8 | 40–58 | F…C- | GPA meets 3.0, weak field match |
| 16 | P03×L11 | 75–88 | B…A- | direct fit, quantified result |
| 17 | P03×L7 | 65–80 | C+…B+ | small firm, transferable |
| 18 | P03×L1 | 20–42 | F | wrong field, elite |
| 19 | P03×L12 | 45–60 | D…C | analytics partial |
| 20 | P03×L6 | 40–58 | F…C- | |
| 21 | P04×L2 | 55–68 | C-…C+ | real M&A exp, no campus link |
| 22 | P04×L3 | 62–75 | C…B | meets 3.5 cutoff, M&A exp |
| 23 | P04×L6 | 78–90 | B…A | |
| 24 | P04×L7 | 80–92 | B+…A | local Charlotte |
| 25 | P04×L14 | not eligible | — | sophomore-only |
| 26 | P05×L2 | 78–90 | B…A | target + MS program |
| 27 | P05×L3 | 72–86 | B-…A- | |
| 28 | P05×L1 | not eligible | — | junior vs sophomore program |
| 29 | P05×L4 | 35–55 | F…C- | finance not quant |
| 30 | P05×L6 | 80–92 | B+…A | |
| 31 | P06×L5 | 85–96 | A-…A+ | |
| 32 | P06×L4 | 68–85 | C+…A- | strong CS/ML; quant odds low |
| 33 | P06×L12 | 82–94 | B+…A | |
| 34 | P06×L1 | 5–30 | F/NE | wrong field + class year |
| 35 | P06×L13 | 68–84 | C+…B+ | clearance unknown → medium conf |
| 36 | P07×L12 | 70–85 | B-…A- | sponsorship unknown on listing → medium conf |
| 37 | P07×L8 | not eligible | — | citizenship |
| 38 | P07×L13 | not eligible | — | citizenship |
| 39 | P07×L5 | 55–72 | C-…B- | |
| 40 | P07×L4 | 45–62 | D…C | |
| 41 | P08×L9 | 85–96 | A-…A+ | |
| 42 | P08×L1 | 5–25 / NE | F | |
| 43 | P08×L8 | 40–58 | F…C- | |
| 44 | P08×L7 | 25–45 | F…D | |
| 45 | P09×L10 | 72–85 | B-…A- | |
| 46 | P09×L6 | 65–80 | C+…B+ | |
| 47 | P09×L1 | NE / 20–40 | F | junior |
| 48 | P10×L13 | 62–78 | C…B | |
| 49 | P10×L5 | 30–50 | F…D+ | |
| 50 | P10×L7 | 30–55 | F…C- | depends on firm type |
| 51 | P11×L6 | 55–70 + conf medium | C-…B- | no GPA neutral; cutoff → ask |
| 52 | P11×L10 | 50–65 | D+…C+ | |
| 53 | P11×L7 | 60–75 | C…B | |
| 54 | P12×L4 | 45–62 | D…C | strong math, GPA below bar |
| 55 | P12×L3 | 20–45 | F…D | under 3.5 required cutoff → cap |
| 56 | P12×L12 | 58–72 | C-…B- | |
| 57 | P13×L8 | 78–92 | B…A | |
| 58 | P13×L14 | not eligible | — | sophomore-only |
| 59 | P14×L7 | 55–70 | C-…B- | school must resolve to CUNY, not Queens Charlotte |
| 60 | P14×L1 | not eligible | — | recent grad |

### 8.5 Unit tests (`test/grader/*.test.js`, `node --test`, in CI)
- `gpa.test.js`: every §3.1 example; conversions (4.3, 5.0, 100, %); no rounding up; major GPA only when relevant; no-GPA neutral; curve smoothness (Δ ≤10 per 0.1).
- `school.test.js`: aliases (Wharton → upenn); collisions (§4.4); unknown → 60 soft_default with basis; firm campus boost; proximity via `cities.json`; data lint: every tier has ≥1 source with url+quote+date; every school name exists in `data/schools.json`; `tierFrom` reproduces stored tiers.
- `experience.test.js`: all §5.2 table rows; duration/recency/leadership; athletics levels; prior-employer boost; class-year expectations; every positive line cites an exp id.
- `skills.test.js`: Excel not core for ML; `R`, `Go`, `C++`, `C#` tokenization; required vs preferred; no substring hits ("r" in marketing, "go" in Google).
- `gates.test.js`: each gate with its quote; unknown fields never fail.
- `confidence.test.js`: "Not enough info" triggers and the exact asks.
- `feedback.test.js`: exactly 3 steps; ≤3 strengths/gaps; verdict per band; golden files §7.4; no banned words.

### 8.6 Property, regression, fairness
- **Monotonicity** (500 random pairs, seeded): raising GPA in 0.05 steps 2.0→4.0 never lowers pct, Fit or Odds; adding a core-relevant experience never lowers; adding a required skill never lowers; a higher school tier (same group) never lowers; longer duration of the same experience never lowers.
- **Stability**: §6A bounds on 500 random pairs.
- **Regression**: `test/golden/scores.json` = pct/grade for 300 fixed pairs (personas × sampled real listings); any diff >3 points fails unless the commit message contains `[recalibrate]` and the calibration report explains it.
- **Fairness across schools**: same profile, swap school across {target, semi_target, unknown 4-yr, HBCU, regional state, community college}; assert swing ≤ `schoolMaxSwing` per group (≤6 for swe/data/marketing/eng/health); write mean grade by school kind across all listings for Ty-clone profiles to `ops/V12_GRADER_FAIRNESS.md`; flag any group where unknown schools average below sourced non-targets.
- **Grounding**: extended `test/grader_grounded.js` must stay 100%.
- **Distribution**: `test/grade_dist.js` — for Ty, ≤40% of listings F and ≤15% A-range (sanity, not a target).
- **Performance**: scoring 14k listings in Node < 800 ms; in the worker < 1.5 s on a mid laptop.

---------------------------------------------------------------
## 9. Implementation plan

### 9.1 Files
**Create**
- Data: `data/school_tiers.json`, `data/gpa_bars.json`, `data/skills_taxonomy.json`, `data/experience_taxonomy.json`
- Pipeline: `pipeline/school_tiers_build.py`, `pipeline/gpa_extract.py`, `pipeline/skills_extract.py`, `pipeline/lint_sources.py`
- Grader modules (IIFE for browser + `module.exports` for Node, concatenated into the worker bundle): `grader/gates.js`, `grader/gpa.js`, `grader/school.js`, `grader/experience.js`, `grader/skills.js`, `grader/confidence.js`, `grader/feedback.js`
- Tests: `test/grader/*.test.js`, `test/grader/properties.test.js`, `test/calibration/{profiles,listings,expected}.json`, `test/calibration/run.js`, `test/golden/feedback/*.json`, `test/golden/scores.json`
- Ops: `ops/V12_GRADER_CALIBRATION.md`, `ops/V12_GRADER_FAIRNESS.md`, `ops/V12_GRADER_SOURCES.md` (every URL and what it supports)

**Change**
- `match-core.js` — orchestrator; new fields `rows, fitScore, oddsScore, tierNote, sources, cites`; keep old fields.
- `match-weights.json` — per-group weights, tier multipliers, blend, calibration map, D+, caps, `schoolMaxSwing`, `oddsFitGain`.
- `config.json` — `firmTiers` schema (`tier: elite|large|mid|small_local`, `campusSchools`, `athleteProgram`, `source`, `last_verified`); retire placeholders once real data is in; `targetSchools`/`industryGpaBars` migrate to the new files.
- `match-worker.js`, `matcher.js`, drawer UI — load new data (versioned cache), Fit/Odds bars, rows, sources.
- `feedback.js` — rows + real-lift steps.
- `resume.js` / parser — dates, types, athletics level, majorGpa, GPA scale, quantified results; re-run `test/resumes/holdout.py` (≥97% held-out must hold).
- `admin.html` / `admin.js` — edit/verify tiers and bars; source fields required to save.
- CI workflow — run new tests + `lint_sources.py`.

### 9.2 Order of work (commit after each)
1. Baseline: snapshot current grades for all personas and the 60 pairs → `test/golden/scores_v12_before.json`.
2. Calibration fixtures + `expected.json` (pre-run commit).
3. Data schemas, empty-but-valid data files, linters in CI.
4. Research and fill sources: firm campus pages, school outcome reports, GPA statements, athlete programs → `ops/V12_GRADER_SOURCES.md`; mark every gap.
5. Parser upgrades + held-out re-score.
6. Components with unit tests, in order: gates → GPA (+ `gpa_extract.py` backfill) → school → skills (+ extraction) → experience → roleFit/classYear → confidence.
7. Orchestrator, Fit/Odds split, calibration map, grade + colour.
8. Feedback JSON + UI rows + golden files; extend grounding test.
9. Calibrate (data only) to ≥90%; fairness, monotonicity, stability, performance.
10. Persona walkthroughs (incl. Ty) with screenshots, light/dark, desktop/mobile.

### 9.3 Report format (deliver to Ty)
```
V12-GRADER REPORT
1. Summary: in-range X/60 (Y%) · grounding 100% · N tests passing · scoring time (ms)
2. Calibration table (60 rows): pair | expected | before | after | Fit | Odds | ✓/✗ | note
3. Outliers: cause → fix, or justified expectation change (≤5)
4. Data coverage: schools with tiers per group; GPA bars sourced vs soft_default; firms tiered; athlete programs; link to ops/V12_GRADER_SOURCES.md
5. Fairness: max school swing per group; mean grade by school kind
6. Property tests: monotonicity / stability results
7. Ty: top 15 matches with grades; full panels for JPMorgan sophomore IB, Evercore, a Charlotte local firm
8. Screenshots of badge + panel (light/dark, desktop/mobile)
9. Decisions for Ty (blend weights; show Odds as number or words; D+ step)
10. CHANGELOG entry
```

---------------------------------------------------------------
## 10. Edge cases (each needs a test)
- Double major / minor: RoleFit takes the best; a minor counts at 0.7.
- Undeclared: RoleFit from interests + experience; confidence down.
- Transfer students: prior-school experiences kept; school = current school.
- gradDate vs classYear disagree: gates trust gradDate; ask in "Check these".
- Multi-group listings ("IB / Capital Markets"): score each group, take the max, say which.
- Remote listings: proximity boost off; location preference met if remote OK.
- Off-cycle terms (fall/spring): class-year expectation uses the term's date.
- Same company, different divisions (JPMorgan IB vs JPMorgan software): same firm tier, different group weights.
- High-school-only experience for juniors: recencyF 0.5.
- GPA > 4.0 with no scale: left blank by the parser and flagged.
- Profile edited mid-session: versioned worker cache + display hysteresis.
- Listings with `hidden`, `dup_of`, or `closed_at`: not graded.
