# Custom domain: what's already done, and what only Ty can do

Code is domain-ready. Ty's part is buying the name and pasting DNS records; everything else is one command.

## Already prepared
- Every page and asset uses relative paths, so the site works at a root domain, a subdomain, or the current `github.io` address.
- `ops/set_domain.py` rewrites the canonical URL, `og:url`, `og:image`, the Twitter card URLs, `robots.txt` and `sitemap.xml`, and writes `CNAME`. `404.html` gets its absolute links rewritten too. Verified by applying a test domain and reverting cleanly.
- `ops/apply_domain.py <domain>` does the whole switch: runs `set_domain.py`, commits, pushes, and sets the GitHub Pages custom domain with HTTPS enforced. `--github` reverts. `--dry-run` shows the plan.
- Email links now follow the site's canonical URL instead of a hardcoded `github.io` address, so deadline emails always point at the live domain.
- The Pages workflow deploys the repo root, so `CNAME` ships with every deploy and won't be lost on the next build.

## Ty's checklist
1. **Buy the domain.** Cloudflare Registrar or Porkbun, at cost, with free WHOIS privacy. `.app` and `.dev` are HTTPS-only, which is fine here. Avoid upsells.
2. **Tell Radar. BUILD the domain**, or run `python3 ops/apply_domain.py yourdomain.com` from the box. It prints exactly what to paste next.
3. **DNS at the registrar.** GitHub shows the current values under Settings > Pages > Custom domain. As of now: A records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; `www` as a CNAME to `tyfaucher24-ops.github.io`. If DNS is on Cloudflare, set these to **DNS only** (grey cloud), not proxied, or Pages fails its check.
4. **Wait for the green check, then tick Enforce HTTPS.** GitHub issues the certificate free.
5. **Google Cloud** (project "Intern Index"): add `https://yourdomain.com` to the OAuth client's Authorized JavaScript origins, and the domain to the consent screen's Authorized domains. Without this, "Continue with Google" fails on the new domain.
6. **Supabase** > Authentication > URL Configuration: Site URL becomes `https://yourdomain.com/`, and add `https://yourdomain.com/**` to Redirect URLs. Keep the `github.io` entry until the new domain is confirmed, so nobody's link breaks during the switch.
7. **Later, for real email:** add the domain in Resend and paste its DNS records. That removes the Gmail sending cap and is what deadline alerts at any scale need.

## Notes
- The old `github.io` address keeps working and redirects to the custom domain, so any link Ty already shared still lands.
- Pick the name before telling anyone. A `.com` for this brand is already registered (since 2018) and parked on a reseller; `.app`, `.dev`, `.us`, `.co`, `.io`, `.org` and `.net` showed no DNS records, which suggests they're available. Confirm at checkout — no availability was reserved.
