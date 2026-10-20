"""Discovery: grow the company registry from ATS links found in public GitHub internship lists and our own hand-checked lists.
GitHub lists are used ONLY to find companies + ATS boards; listings are then read from each company's own board."""
import csv,json,re,os,sys,urllib.parse
from .net import fetch
from .norm import norm_company,nkey
ROOT=os.path.join(os.path.dirname(__file__),'..');REG=os.path.join(ROOT,'data','companies.csv')
COLS=['name','domain','ats','slug','size','industry','hq_state','careers_url','discovered_via','notes']
GITHUB_LISTS=[('SimplifyJobs/Summer2027-Internships','https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json','json'),
 ('vanshb03/Summer2027-Internships','https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/dev/.github/scripts/listings.json','json'),
 ('zapplyjobs/Internships-2027','https://raw.githubusercontent.com/zapplyjobs/Internships-2027/main/README.md','md'),
 ('speedyapply/2027-SWE-College-Jobs','https://raw.githubusercontent.com/speedyapply/2027-SWE-College-Jobs/main/README.md','md')]
def ats_from_url(u):
    if not u: return None
    p=urllib.parse.urlsplit(u.strip());h=p.netloc.lower();parts=[x for x in p.path.split('/') if x]
    q=urllib.parse.parse_qs(p.query)
    if 'greenhouse.io' in h:
        if q.get('for'): return ('greenhouse',q['for'][0])
        if parts and parts[0] not in ('embed','v1'): return ('greenhouse',parts[0])
    if h=='jobs.lever.co' and parts: return ('lever',parts[0])
    if h=='jobs.ashbyhq.com' and parts: return ('ashby',parts[0])
    if h in ('jobs.smartrecruiters.com','careers.smartrecruiters.com') and parts: return ('smartrecruiters',parts[0])
    if h=='apply.workable.com' and parts and parts[0]!='api': return ('workable',parts[0])
    m=re.match(r'([a-z0-9-]+)\.recruitee\.com$',h)
    if m: return ('recruitee',m.group(1))
    m=re.match(r'([a-z0-9-]+)\.bamboohr\.com$',h)
    if m: return ('bamboohr',m.group(1))
    m=re.match(r'([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com$',h)
    if m and parts:
        site=parts[1] if re.match(r'^[a-z]{2}-[A-Z]{2}$',parts[0]) and len(parts)>1 else parts[0]
        if site.lower() not in ('job','wday'): return ('workday',f'{h}/{m.group(1)}/{site}')
    return None
def load():
    if not os.path.exists(REG): return []
    return list(csv.DictReader(open(REG)))
def save(rows):
    rows.sort(key=lambda r:(r['name'].lower(),r['ats']))
    with open(REG,'w',newline='') as f:
        w=csv.DictWriter(f,COLS);w.writeheader();[w.writerow({k:r.get(k,'') for k in COLS}) for r in rows]
def add(rows,name,ats,slug,via,**kw):
    k=(ats,slug.lower())
    for r in rows:
        if (r['ats'],r['slug'].lower())==k:
            for f,v in kw.items():
                if v and not r.get(f): r[f]=v
            return False
    rows.append({'name':norm_company(name),'ats':ats,'slug':slug,'discovered_via':via,**kw});return True
def from_github(rows,cache_dir=None):
    n=0
    for name,url,kind in GITHUB_LISTS:
        try: txt=fetch(url,check_robots=False,timeout=60).text
        except Exception as e: print('discovery: could not read',name,e,file=sys.stderr);continue
        if cache_dir: open(os.path.join(cache_dir,nkey(name)+('.json' if kind=='json' else '.md')),'w').write(txt)
        if kind=='json':
            for x in json.loads(txt):
                a=ats_from_url(x.get('url'))
                if a: n+=add(rows,x.get('company_name',''),a[0],a[1],'github:'+name)
        else:
            for m in re.finditer(r'\|\s*\**\[?([^|\]*]+?)\]?(?:\([^)]*\))?\**\s*\|.*?(https?://[^\s)"\'>|]+)',txt):
                a=ats_from_url(m.group(2))
                if a: n+=add(rows,re.sub(r'<[^>]+>','',m.group(1)).strip(),a[0],a[1],'github:'+name)
    return n
if __name__=='__main__':
    rows=load();print('registry before',len(rows));c=os.path.join(os.path.dirname(__file__),'cache');os.makedirs(c,exist_ok=True)
    print('added from GitHub lists',from_github(rows,c));save(rows);print('registry after',len(rows))
