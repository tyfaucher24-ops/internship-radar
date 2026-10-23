# Resume accuracy fixtures (V14.3)

**Synthetic test data only.** Every person here is fictional (see `people.py`, a seeded pool). None of this is shown on the Intern Index website, and these files must never be presented as real people.

* `build.py` regenerates `f01`–`f60` (about 8 seconds). It needs reportlab, python-docx and LibreOffice.
* Seven formats: onecol, twocol, table, canva, jake (imitated), word (DOCX converted to PDF) and text.
* Seven fields, with levels including freshman, transfer, athlete, international, career and dense.
* Edge cases: no GPA, odd date formats, major GPA, double majors, study abroad, no headings, two pages, ambiguous schools, a 10-point GPA scale and publications. See `INDEX.md`.
* `expected.json` comes from the generator's spec, **never from parser output**.
* `run.js` scores the parser against the bars and exits 1 if any bar fails. Use `-v` for each miss, `--json` for the full report, and `--only f01` for one fixture.
* `time.js` times the 2-page PDFs.
* The results are optimistic because the same author wrote the generator and the parser. See `qa-v14.3/ACCURACY-REPORT.md`.
