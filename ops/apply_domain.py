"""V18.1: apply a custom domain to Intern Index in one command.

    python3 ops/apply_domain.py internindex.app            # do it (rewrites URLs, writes CNAME, commits, pushes, sets GitHub Pages domain)
    python3 ops/apply_domain.py internindex.app --dry-run  # show what would change, change nothing
    python3 ops/apply_domain.py --github                   # revert to the github.io address

It cannot do the three things that need a login, and prints them at the end:
  1. DNS records at the registrar
  2. Google Cloud OAuth origins (Google sign-in)
  3. Supabase Auth Site URL + redirect allow-list
"""
import sys, os, re, json, subprocess, urllib.request

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = "tyfaucher24-ops/internship-radar"
GH_SITE = "https://tyfaucher24-ops.github.io/internship-radar/"

def sh(*a, check=True, capture=True):
    p = subprocess.run(a, cwd=R, text=True, capture_output=capture)
    if check and p.returncode:
        raise SystemExit(f"failed: {' '.join(a)}\n{p.stdout}\n{p.stderr}")
    return (p.stdout or "").strip()

def token():
    return sh("gh", "auth", "token")

def api(path, method="GET", body=None):
    req = urllib.request.Request("https://api.github.com" + path, method=method,
        data=json.dumps(body).encode() if body else None,
        headers={"Authorization": "token " + token(), "Accept": "application/vnd.github+json",
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode()
        return json.loads(raw) if raw.strip() else {}

def main(argv):
    dry = "--dry-run" in argv
    argv = [a for a in argv if a != "--dry-run"]
    if not argv:
        print(__doc__); return 1
    target = "--github" if argv[0] == "--github" else argv[0].strip().strip("/")
    if target != "--github":
        target = re.sub(r"^https?://", "", target)
        if not re.fullmatch(r"[a-z0-9.-]+\.[a-z]{2,}", target):
            print("that doesn't look like a domain:", target); return 1

    before = sh("git", "status", "--porcelain")
    if dry:
        print("would run: python3 ops/set_domain.py", target)
        print("would write CNAME" if target != "--github" else "would delete CNAME")
        print("would commit and push to main, then set the GitHub Pages custom domain")
        return 0

    sh(sys.executable, "ops/set_domain.py", target)
    changed = sh("git", "status", "--porcelain")
    if changed:
        sh("git", "add", "-A", "index.html", "robots.txt", "sitemap.xml", "404.html", "CNAME", check=False)
        sh("git", "add", "-A")
        sh("git", "commit", "-m", f"Custom domain: {target}")
        print(sh("git", "push", "origin", "HEAD"))
    else:
        print("no file changes")

    if target == "--github":
        try: api(f"/repos/{REPO}/pages", "PUT", {"source": {"branch": "main", "path": "/"}})
        except Exception as e: print("pages source:", e)
        print("reverted to", GH_SITE); return 0

    try:
        api(f"/repos/{REPO}/pages", "PUT", {"cname": target, "https_enforced": True})
        print("GitHub Pages now points at", target)
    except Exception as e:
        print("could not set the Pages domain through the API (set it in Settings > Pages):", e)

    print(f"""
Next, in this order. None of it can be done from here.

1. DNS at your registrar (GitHub shows these under Settings > Pages > Custom domain):
     A records for {target}  ->  185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
     AAAA (optional)         ->  2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153
     CNAME for www           ->  tyfaucher24-ops.github.io
   Wait for it to check out green in GitHub, then tick Enforce HTTPS.
   (If the DNS is on Cloudflare, set those records to "DNS only", not proxied, or Pages will fail its check.)

2. Google Cloud, project "Intern Index" > APIs & Services > Credentials > the OAuth client:
     Authorized JavaScript origins: add https://{target}
     OAuth consent screen > Authorized domains: add {target}

3. Supabase > Authentication > URL Configuration:
     Site URL: https://{target}/
     Redirect URLs: add https://{target}/** (keep the github.io one until the switch is confirmed)

4. Resend (only when you want real deadline emails): add {target} as a domain there and add the DNS records it gives you.
   That is what replaces the Gmail sending cap.
""")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
