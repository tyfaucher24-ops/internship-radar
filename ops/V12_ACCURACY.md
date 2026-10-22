# V12 accuracy report (2026-10-22)

All numbers come from the live data and runs on the date above. Nothing here is estimated unless it says so.

| Check | Result | Notes |
|---|---|---|
| Open/title spot check, 200 random open listings (seed 20261022) | 194 ok, 2 title mismatch, 4 unreachable, so 99.0% of checkable listings | Mismatches: EY (Yello) and Point72, both JS-rendered pages. Unreachable: Tesla and Forvis returned 403, and we do not bypass that. Checks open status and title only. |
| Category classification, manual sample | about 83% correct on 60 listings before the norm fix | The sample was 60, not 200. Fix in `pipeline/norm.py` moves about 155 Software→Engineering and 107 Other→Engineering on the next full sync. `test/norm_v12.py` passes 11/11. |
| MBA/PhD titles tagged Graduate | 100% | |
| Exact duplicates | 10 of 11,392 open | |
| Deadline present | 18.1% | Most employers don't publish one. |
| "Other" category | 17.8% | Should fall after the norm fix. |
| Company-name-looks-like-title | 0 | Fixed by `hidden_bad_company`. |
| Time to remove closed listings | Within one full sync, about 2h | Sync run 39819959974 took 42 min. |
| Resume parser held-out % | From earlier V11.2 work, not re-measured in V12 | |
| Coverage (141 target firms) | 80 covered, 18 in registry with 0 open, 43 not in registry | `data/coverage.json` |

Limits: no field-by-field audit (location, pay or deadline) against the source page was done at 200-listing scale.
