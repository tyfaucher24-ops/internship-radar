# V16 launch checklist (2026-10-27)

| Item | Result |
|---|---|
| Magic-link sign-in end to end (live) | PASS |
| RLS: two users isolated (live) | PASS |
| Privacy + Terms pages, footer links (v16_legal live) | PASS 40/40 |
| CSP (v16_csp live) / security (v16_security live) | PASS 19/19, 18/18 |
| v15 live regression / 30 grader bars | PASS 25/25, 30/30 |
| Feedback + analytics RLS (mock) / telemetry / cloud | PASS 31/31, 20/20, 32/32 |
| Launch test live, Chromium (axe light+dark 1440/390, SEO, offline, slow, Retry, 404) | PASS 129/129 |
| Launch test live, Firefox | PASS 46/46 |
| Safari/WebKit | NOT TESTED (WebKit system libs unavailable on box) |
| Load: 100 parallel visits / 100 Supabase calls | PASS 100/100, 100x200 |
| 500-user projection | ~0.66 GB Pages egress per 500 cold visits; within free tiers |
| Telemetry + in-site reports live | BLOCKED until migration 0003 is run (falls back to GitHub, no errors) |

## Ty to-do
1. Run `supabase/migrations/20261027000003_feedback_analytics.sql` in the SQL editor.
2. Make yourself admin:
   `insert into public.admins(user_id) select id from auth.users where email='tyfaucher24@gmail.com' on conflict do nothing;`
3. Set custom SMTP (e.g. Resend free tier); built-in auth email allows only a few per hour.
4. Optional domain (~$10–15/yr): `python3 ops/set_domain.py example.com` (undo with `--github`).
5. Review the Privacy and Terms drafts (not legal advice).
