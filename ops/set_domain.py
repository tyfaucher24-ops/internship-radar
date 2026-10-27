"""V16.6: switch Intern Index to a custom domain in one step (CNAME-ready).
All app paths are already relative. Only these absolute URLs depend on where the site lives:
canonical/og:url/og:image (index.html), robots.txt, sitemap.xml, and 404.html (served at any depth, so it needs absolute links).
Usage:  python3 ops/set_domain.py internindex.com     (writes CNAME, rewrites URLs)
        python3 ops/set_domain.py --github             (back to https://tyfaucher24-ops.github.io/internship-radar/)
Then in GitHub: Settings > Pages > Custom domain, and add the DNS records GitHub shows. Also update the Supabase Site URL and redirect."""
import sys,os,re
R=os.path.join(os.path.dirname(__file__),'..');GH='https://tyfaucher24-ops.github.io/internship-radar/'
FILES=['index.html','robots.txt','sitemap.xml','404.html']
def cur():
    m=re.search(r'<link rel="canonical" href="([^"]+)"',open(os.path.join(R,'index.html')).read());return m.group(1)
def main(a):
    if not a:print(__doc__);return 1
    new=GH if a[0]=='--github' else 'https://'+a[0].strip().strip('/').removeprefix('https://')+'/'
    old=cur();op=re.sub(r'^https://[^/]+','',old);np=re.sub(r'^https://[^/]+','',new)
    for f in FILES:
        p=os.path.join(R,f);s=open(p).read();t=s.replace(old,new)
        if f=='404.html':t=t.replace(f'"{op}',f'"{np}')
        if t!=s:open(p,'w').write(t);print('updated',f)
    c=os.path.join(R,'CNAME')
    if new==GH:
        if os.path.exists(c):os.remove(c);print('removed CNAME')
    else:open(c,'w').write(new.split('/')[2]+'\n');print('wrote CNAME')
    print('site URL now',new);return 0
if __name__=='__main__':sys.exit(main(sys.argv[1:]))
