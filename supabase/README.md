# Intern Index accounts (Supabase, free tier)

Accounts are **off** until `cloud-config.js` has a project URL and anon key. While empty, the site runs in guest mode exactly as before (everything in localStorage).

## What's here
- `migrations/20261027000001_accounts.sql`: `user_items` (one row per saved item, RLS forced, own rows only), `admins` + `is_admin()`, `admin_state` (admin-only), `delete_my_account()`, abuse guards (5,000 rows/user, 100 KB/row, future timestamps clamped).
- `migrations/20261027000002_lww.sql`: server-side last-write-wins (an older write can't overwrite a newer row).
- `tests/shim.sql`: minimal `auth` schema so the RLS tests run on plain Postgres (`python3 tests/test_v16_rls.py`).

## Setup (Ty, about 15 minutes, $0)
1. **Create the project.** At https://supabase.com/dashboard, sign in with GitHub, then click **New project**. Choose the **Free** plan, any name (e.g. `intern-index`), a strong DB password (keep it to yourself, it isn't needed here), and the region closest to you (e.g. East US). Free projects **pause after 7 days with no traffic**; you can resume one from the dashboard at no cost. Don't enable any paid add-ons (compute upgrade, PITR, custom domain, IPv4). Those are the only things that cost money.
2. **Run the SQL.** Open **SQL Editor**, then **New query**. Paste all of `migrations/20261027000001_accounts.sql` and click **Run**. Then do the same for `20261027000002_lww.sql`. Do **not** run `tests/shim.sql`; it's for local tests only.
3. **Auth, URL configuration** (Authentication, then URL Configuration):
   - Site URL: `https://tyfaucher24-ops.github.io/internship-radar/`
   - Redirect URLs: add `https://tyfaucher24-ops.github.io/internship-radar/**` and `https://tyfaucher24-ops.github.io/internship-radar/admin.html`
4. **Email magic link** (Authentication, then Providers, then Email): keep **Enabled** on and **Confirm email** on. The magic link is the sign-in method; no passwords are used. The built-in sender only sends a few emails per hour, which is fine for personal use. If more people sign up later, you can add free SMTP (e.g. Resend free tier) under Authentication, then SMTP.
5. **Google sign-in (optional):**
   - In Google Cloud Console (free), go to APIs & Services, then Credentials, then **Create OAuth client ID** (type: Web application).
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - In Supabase, go to Authentication, then Providers, then **Google**. Paste the Client ID and Client Secret and enable it. The secret stays in Supabase; don't send it to me.
   - The OAuth consent screen can stay in "Testing" with your own email added as a test user.
6. **Abuse protection** (Authentication, then Rate Limits): the defaults are fine. Optionally lower "emails sent" to 10/hour. Optional: Authentication, then Attack Protection, then enable CAPTCHA with hCaptcha or Cloudflare Turnstile (both free). Tell me if you do, because the sign-in form then needs a widget.
7. **Make yourself admin.** Sign in on the site once (after step 8), then run this in the SQL Editor:
   `insert into public.admins(user_id) select id from auth.users where email = 'YOUR_EMAIL';`
8. **Send me two values** from Project Settings, then API:
   - **Project URL** (`https://<ref>.supabase.co`)
   - **anon / public key** (also called "publishable key"). This key is safe in the browser because RLS protects the data.
   - **Never** send the `service_role` / secret key or the DB password.
   - Also tell me whether Google is enabled. These values go into `cloud-config.js` as `{url, anonKey, google:true|false}`.

## Cost
Everything above is $0 on the Free plan (500 MB DB, 50k monthly active users, built-in email with low hourly limits). There's no card on file, so nothing can charge.

## Migration 0003 (V16 Phase 5): usage counts, reports, error log, admin dashboard
Run `migrations/20261027000003_feedback_analytics.sql` once in the SQL editor (it is safe to re-run). Until you do, the site works normally: counting and error logging switch themselves off, "Report a problem" offers a GitHub issue instead, and the admin dashboard shows only sync health. There is nothing to set up after that. The pipeline reads the public, aggregated `report_counts()` with the publishable key.
