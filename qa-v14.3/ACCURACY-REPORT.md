# V14.3 resume parsing — accuracy report

Run on 2026-10-23 (America/New_York) with:

    NODE_PATH=<node_modules with pdfjs-dist 3.11.174 + mammoth 1.8.0> node tests/resume-fixtures/run.js -m --json /tmp/r.json

The suite has **60 fixtures** (`tests/resume-fixtures/f01`–`f60`), giving **128 files**: every fixture has a PDF and a DOCX, and the text-format fixtures also have a .txt file. Every person is **fictional** and every `expected.json` carries `_synthetic: true`. None of them is shown on the website.

## ⚠ Read this first: these numbers are optimistic

* **The same author wrote both the generator (`build.py`) and the parser (`resume-core.js` / `resume-extract.js`).** The layouts, phrasings, section names and date styles are ones the parser author knows about. Real student resumes will be messier, so expect lower real-world accuracy.
* The parser was tuned against this suite. There is no separate held-out set yet.
* The "Jake" LaTeX template is **imitated** with reportlab, because pdflatex isn't available on the build box. Real LaTeX PDFs have different text runs and ligatures.
* The Word-format PDFs come from LibreOffice (`soffice`), not Microsoft Word.
* No scanned or image-only PDFs are included. The parser cannot read those; there is no OCR. The site tells the user to paste text instead.

### Generator changes made during this round (they change the expected answers)
1. **No future dates.** Any entry starting after 2026-10 is dropped. Any end date after 2026-10 is now "Present". Volunteer entries are clamped to at least two years ago. Before this, a few fixtures had end dates like "2028" for volunteering, which isn't realistic.
2. **The plain-text PDF renderer now wraps long lines.** Before, it cut them off at 110 characters, so one certification was physically truncated in the PDF.
3. **Expected experience type now follows the title.** Medical Scribe, Pharmacy Technician and similar titles are now expected as **Job**, not "Internship". Only titles containing intern, extern, summer analyst/associate/scholar/fellow are expected as Internship, and co-op titles as Co-op. The old labels claimed facts that the resume text doesn't state.
4. Letter-spacing on Canva-style headings no longer leaks into body text. Projects are expected as title = project name, org = blank.

## Results against the bars

| Metric | Result | Bar | Status |
|---|---|---|---|
| School, degree, major, grad date, GPA (exact) | **99.73%** | ≥98% | PASS |
| Experience entries: recall | **99.15%** (821/828) | ≥95% | PASS |
| Experience entries: precision | **99.76%** (821/823) | ≥95% | PASS |
| Experience type | **99.51%** (817/821) | ≥90% | PASS |
| Dates and duration | **99.88%** (820/821) | ≥95% | PASS |
| Certifications (normalized): precision / recall | **100% / 100%** | ≥95% | PASS |
| Skills F1 | **98.22** (P 96.9 / R 99.6) | ≥90 | PASS |
| Hallucinated fields | **0** | 0 | PASS |

Other fields: name 98.4%, email 99.2%, phone 99.2%, school 98.65%, degree / major / grad / GPA / class year 100%, experience org and title 99.0%, location 100%, languages 100%, work authorization 100%.

Here, "hallucinated" means any of the following:
* A value filled where the expected value is empty.
* A school picked automatically when the match is ambiguous.
* A certification that isn't in the expected list.
* A value whose text can't be found in the source.

The two ambiguous-school fixtures (f18 and f45: "USC" and "Queens") correctly leave the school **empty** and offer a list of candidates for the user to pick from.

### By format (share of checks passed)
onecol 99.8–100 · twocol 99.6–100 · table 98.2 (pdf) / 99.3 (docx) · jake 100 · word 99.3–99.5 · text 100 · canva 98.2 (pdf) / 100 (docx)

### Known misses
* **f25 Canva PDF:** the left and right columns get interleaved. The school (Duke) is lost and 4 experience entries are missed. **The review screen shows the school as "not found — add it?" and does not guess.**
* 8 experience entries have org and title swapped or partly read. Most are a project or hackathon line with only one segment.
* 2 names and 1 email or phone are missed on heavily styled headers.
* 23 extra skills: real tools mentioned in the text that weren't on the expected skills line. They count against precision but aren't invented.

## Performance
`node tests/resume-fixtures/time.js` measures pdf.js extraction plus the full parse, 5 runs on each of the 2-page fixture PDFs:

| fixture | min | median | max (ms) |
|---|---|---|---|
| f04 | 14 | 18 | 265 (cold start) |
| f17 | 12 | 14 | 18 |
| f30 | 16 | 21 | 23 |
| f43 | 11 | 12 | 17 |
| f51 | 12 | 13 | 14 |
| f57 | 9 | 9 | 11 |

That is well under the 2-second budget. The in-browser number, including Web Worker startup and loading the libraries, is in `qa-v14.3/LIVE.md`.
