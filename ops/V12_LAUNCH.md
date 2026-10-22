# V12 launch checklist

**Status: ready for a soft launch.** Not ready for a public launch until the items marked ✗ are done.

- ✓ Real data only, 99% spot-check pass, sync takes 42 min (inside the 2h window)
- ✓ All active test suites pass; axe clean; Lighthouse ≥93 on every category
- ✓ No secrets in the repo; robots.txt respected; no LinkedIn, Indeed or Handshake sources
- ✗ CI test workflow (draft in `ops/workflows/tests.yml`) needs a token with `workflow` scope
- ✗ Firefox and WebKit not yet run (CI)
- ✗ Mobile LCP 2.2–2.4s against a 2.0s target
- ✗ Email alerts, accounts and analytics: need Ty's choices (see below)
- ✗ Phase 4 gaps: Today view, follow companies, "+N new" on saved searches, synonyms

## What Ty must provide
1. Email provider for alerts: Resend or SendGrid (free tier), as an API key in a repo secret.
2. Auth/backend, if cross-device sync is wanted: Supabase or Firebase (free tier).
3. Analytics: Plausible (paid) or a self-hosted alternative, or none (the current default).
4. Error monitoring: Sentry free tier or none.
5. A GitHub token with `workflow` scope, or Ty copies `ops/workflows/*.yml` into `.github/workflows` himself.
