# Proposal: login + email/SMS alerts (V9 — proposal only, nothing wired)

Status: **not built**. No keys, accounts or secrets are in this repo. Ty must approve before anything is wired.

## Recommended free stack
| Piece | Service | Free tier (check before signing up) | Why |
|---|---|---|---|
| Login + user database | **Supabase** (Auth + Postgres) | Free project: 50k monthly active users, 500 MB database; pauses after 1 week idle | Magic-link email login, row-level security, works from a static GitHub Pages site with the public "anon" key |
| Alert emails | **Resend** | 3,000 emails/month, 100/day | Simple API, good deliverability |
| Alert texts (optional) | **Twilio** | Trial credit only; real SMS is **paid** (~$0.008/text + ~$1.15/month number) and US numbers need A2P 10DLC registration | SMS is the one part that cannot be fully free |
| Scheduler | GitHub Actions (same 2h sync) | Free for public repos | After each sync, a step compares new listings to each user's saved filters and sends digests |

Alternative: Railway (Postgres + a small worker) — only $5 trial credit, then paid. Supabase is the better free fit.

## How it would work
1. Ty's site keeps working with no login. "Sign in" (magic link) only adds: saved profile, tracker sync across devices, and alerts.
2. Users save filters ("IB in NY", "new listings that match me ≥75%") and pick email and/or SMS, daily or instant.
3. After each sync, `pipeline/alerts.py` (to be written) reads new listing IDs, matches saved filters, and sends through Resend/Twilio. Every message has an unsubscribe link; SMS requires opt-in and honors STOP.

## Exactly what Ty must provide
Create the accounts, then add the values as **GitHub Actions secrets** (Settings → Secrets and variables → Actions), never in files:
1. Supabase: create a project → `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public, goes in site config), `SUPABASE_SERVICE_ROLE_KEY` (secret, Actions only).
2. Resend: account + verified sending domain (or the shared test domain) → `RESEND_API_KEY`, `ALERT_FROM_EMAIL`.
3. Twilio (only if SMS wanted, paid): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, plus A2P 10DLC brand/campaign registration.
4. The `workflow` permission for the sync (see README / V9 report), since alerts run in the same Action.
