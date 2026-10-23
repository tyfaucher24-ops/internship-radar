# V14 (draft): LinkedIn connections + suggested people (DO NOT BUILD until Ty approves)

## Goal
On every internship, show (A) people the student already knows at that company and (B) people they don't know yet who'd be a good match. Never log into LinkedIn, never send requests to linkedin.com, and never invent people.

## A. People you know (from the student's own LinkedIn export)
- Upload area in Profile → "Connect your LinkedIn" with 3-step instructions: LinkedIn → Settings → Data privacy → Get a copy of your data → Connections → upload Connections.csv (or the zip).
- Parse it in the browser only (nothing uploaded) and store it locally. The fields are First Name, Last Name, URL, Email (often blank), Company, Position, and Connected On. Handle the notes rows at the top of the file.
- Match each connection's Company to listing companies using the company alias list (e.g. "J.P. Morgan" and "JPMorgan Chase & Co" are the same company).
- The detail modal shows "You know N people at <Company>": name, title, a link to their profile, and a "Draft message" button that uses the outreach templates.
- A homepage filter: "Companies where I know someone."
- "Remove my connections" button deletes everything.

## B. People you should meet (not connected)
We can't legally get lists of strangers, so we build smart one-click LinkedIn searches instead:
- Alumni: People search filtered by the student's school + the company (use the school's LinkedIn page ID where mapped, otherwise a keyword search).
- Same sport: "<sport> <school>" or "<sport>" + company keywords (e.g. lacrosse at Goldman).
- Same major/clubs/hometown: keyword searches built from the profile.
- 2nd-degree: a link to the company's people page filtered to 2nd-degree connections, so the student sees friends of friends.
- Rank the search buttons by how strong the shared tie is (teammate/sport > alumni > club > major) and label each with a plain reason, e.g. "Alumni from Queens at JPMorgan."
- Optional later: an opt-in directory where logged-in students and alumni list themselves. It starts empty and is never seeded with fake people.

## Privacy
- The connections file never leaves the browser. Explain this right under the upload box.
- No email addresses are displayed unless they're in the student's own file.

## Tests
- Parse a sample Connections.csv (with notes rows, blank companies, and quoted commas).
- Alias matching works on 10 known variants.
- Zero network requests to linkedin.com during parsing.
- "Remove" clears all stored data.
- Search links open with the correct filters.
