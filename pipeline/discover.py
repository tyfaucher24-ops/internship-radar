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
 ('speedyapply/2027-SWE-College-Jobs','https://raw.githubusercontent.com/speedyapply/2027-SWE-College-Jobs/main/README.md','md'),
 # V20: more public lists. Rows are leads only: each is verified against the employer's posting before it shows.
 ('zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships','https://raw.githubusercontent.com/zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships/main/README.md','md'),
 ('zapplyjobs/awesome-ml-internships-2027','https://raw.githubusercontent.com/zapplyjobs/awesome-ml-internships-2027/main/README.md','md'),
 ('jobbie-bot/Summer-2027-Tech-Internships','https://raw.githubusercontent.com/jobbie-bot/Summer-2027-Tech-Internships/main/README.md','md')]
# V20: markdown table layouts for lists read as listing leads (column index of company, title, location, apply link, posted)
MD_TABLES={'speedyapply/2027-SWE-College-Jobs':dict(co=0,title=1,loc=2,url=4),
 'zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships':dict(co=0,title=1,url=2,loc=3,posted=5),
 'zapplyjobs/awesome-ml-internships-2027':dict(co=0,title=1,loc=2,url=5),
 'jobbie-bot/Summer-2027-Tech-Internships':dict(co=0,title=1,loc=2,posted=3,url=4)}
_NOT_APPLY=re.compile(r'(?i)imgur\.com|raw\.githubusercontent|jobbie\.bot/register|shields\.io|github\.com/[^/]+/[^/]+/(?:blob|tree)|\.github\.io/')
def _cell_text(c):
    import html as _h
    c=re.sub(r'<[^>]+>','',c);c=re.sub(r'!?\[([^\]]*)\]\([^)]*\)',r'\1',c);c=re.sub(r'\*\*|__','',c)
    c=re.sub(r'[\U0001F000-\U0001FFFF\u2600-\u27BF\u200b\ufe0f]','',_h.unescape(c))
    return re.sub(r'\s+',' ',c).strip(' -|')
_HDR={'co':r'company|employer|name','title':r'position|role|title|job','loc':r'location|locations|where','url':r'posting|apply|application|link','posted':r'date posted|posted|date'}
def md_table_rows(txt,cols):
    """Rows of a GitHub-list README table -> lead dicts. Column positions come from each table's own header row
    (one README can hold tables with different columns); `cols` is the fallback. A row needs a company, a title and
    an employer apply link (list-owner pages, images and sign-up links are ignored)."""
    import datetime as _d
    out=[];prev='';cur=dict(cols);last=None
    for line in txt.splitlines():
        if not line.startswith('|'): last=None;continue
        cells=[c.strip() for c in line.strip().strip('|').split(' | ')]
        if re.match(r'^\|\s*:?-{3}',line):
            if last:  # the line before a separator is the header
                h=[_cell_text(x).lower() for x in last];m={}
                for k,pat in _HDR.items():
                    for i,x in enumerate(h):
                        if i not in m.values() and re.fullmatch(r'(?:'+pat+r')s?',x): m[k]=i;break
                cur=m if {'co','title','url'}<=set(m) else dict(cols)
            continue
        last=cells
        if len(cells)<=max(cur.values()): continue
        links=[u for u in re.findall(r'(?:href="|\]\()(https?://[^")\s]+)',cells[cur['url']]) if not _NOT_APPLY.search(u)]
        if not links: continue
        co=_cell_text(cells[cur['co']]);title=_cell_text(cells[cur['title']])
        title=re.sub(r'\s*_?\(\d+ openings?\)_?|\s*·\s*\$[\d,.]+(?:/hr|/yr|k)?\s*$','',title).strip()
        if co in ('↳',''): co=prev
        prev=co
        if not co or not title: continue
        posted=None
        if 'posted' in cur:
            v=_cell_text(cells[cur['posted']])
            for f in ('%Y-%m-%d','%b %d, %Y','%B %d, %Y'):
                try: posted=_d.datetime.strptime(v,f).date().isoformat();break
                except Exception: pass
        out.append({'company':co,'title':title,'url':links[0],'locations':[_cell_text(cells[cur['loc']])] if 'loc' in cur else [],'posted':posted})
    return out
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
    # V21: Rippling ATS boards and Personio public job pages
    if h=='ats.rippling.com' and parts and parts[0] not in ('api','static'): return ('rippling',parts[0])
    m=re.match(r'([a-z0-9-]+)\.jobs\.personio\.(?:de|com)$',h)
    if m: return ('personio',m.group(1))
    m=re.match(r'([a-z0-9-]+)\.recruitee\.com$',h)
    if m: return ('recruitee',m.group(1))
    m=re.match(r'([a-z0-9-]+)\.bamboohr\.com$',h)
    if m: return ('bamboohr',m.group(1))
    m=re.match(r'([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com$',h)
    if m and parts:
        site=parts[1] if re.match(r'^[a-z]{2}-[A-Z]{2}$',parts[0]) and len(parts)>1 else parts[0]
        if site.lower() not in ('job','wday'): return ('workday',f'{h}/{m.group(1)}/{site}')
    # V20: wdN.myworkdaysite.com/[xx-XX/][recruiting/]<tenant>/<site>/job/... (same shape as pipeline/hygiene.py)
    m=re.match(r'(wd\d+)\.myworkdaysite\.com$',h)
    if m:
        mm=re.match(r'/(?:[a-z]{2}-[A-Z]{2}/)?(?:recruiting/)?([^/]+)/([^/]+)(?:/|$)',p.path)
        if mm and mm.group(1).lower() not in ('job','wday','recruiting') and mm.group(2).lower() not in ('job','wday'):
            return ('workday',f'{h}/{mm.group(1)}/{mm.group(2)}')
    return None
def committed_rows():
    """V21: the registry as committed in git (HEAD:data/companies.csv). The sync restores data/ from the Actions cache
    after checkout, which overwrote registry rows added in main (V20's rows never reached the live sync). Read-only."""
    import subprocess
    try:
        r=subprocess.run(['git','-C',ROOT,'show','HEAD:data/companies.csv'],capture_output=True,text=True,timeout=20)
        if r.returncode!=0 or not r.stdout.startswith('name,'): return []
        import io;return list(csv.DictReader(io.StringIO(r.stdout)))
    except Exception: return []
def merge_rows(cached,committed):
    """union by (ats, slug): committed rows win field by field (hand fixes in main apply), cached-only rows (found by a sync) stay"""
    by={(r['ats'],r['slug'].lower()):dict(r) for r in cached}
    for r in committed:
        k=(r['ats'],r['slug'].lower())
        by[k]={**by.get(k,{}),**{f:v for f,v in r.items() if v not in (None,'')}}
    return list(by.values())
def load():
    rows=list(csv.DictReader(open(REG))) if os.path.exists(REG) else []
    if REG==os.path.join(ROOT,'data','companies.csv'): rows=merge_rows(rows,committed_rows())
    return rows
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
