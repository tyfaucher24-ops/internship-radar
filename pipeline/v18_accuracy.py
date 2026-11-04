"""V18 Part 1: data-accuracy pass, run from pipeline.sync after finalize and before writes.
Real data only: links are resolved through other public lists, never by fetching a robots-disallowed shortener."""
import re,json,os,html,datetime,collections,concurrent.futures as cf,urllib.parse
from . import norm as N
SHORTENERS={'go.vansh.nyc'}   # robots.txt: Disallow / -> we never fetch these
CATS2=[('Engineering & Hardware',r'design verification|digital verification|circuit design|master planning|landscape|urban planning|transportation planning'),
('Healthcare & Life Sciences',r'\bemt\b|paramedic'),
('Business & Operations',r'\bmeat\b'),
('Finance & Banking',r'claims|corporate development|capital management'),
('Accounting & Audit',r'accounts payable|accounts receivable'),
('Marketing & Sales',r'market research'),
('Consulting & Strategy',r'strategic'),
('Software & IT',r'tech support|av support|digital collections'),
('Supply Chain & Logistics',r'materials management|supply planning|inventory planning|production plann|demand planning'),
('Research',r'research intern|researcher|phd research|research co-?op|archaeolog'),
('HR & People',r'human resource|training intern'),
('Finance & Banking',r'lending|\bloan|order execution'),
('Accounting & Audit',r'taxation'),
('Real Estate',r'housing'),
('Nonprofit & Education',r'admissions|university|fellowship program'),
('Media & Communications',r'\bnews\b|show|production intern|sports|broadcast|\bfox\b'),
('Healthcare & Life Sciences',r'protein|speech language|optometr|care intern|eye'),
('Government & Policy',r'skillbridge|military intern|\bfws\b|work-study'),
('Healthcare & Life Sciences',r'toxicolog|radiolog|respiratory|translational|in silico|sterile|petcare|veterinar|dermat|surgical|therapy|scientific intern|\blab\b'),
('Accounting & Audit',r'\bsox\b|record to report|accountant|payroll'),
('Legal',r'compliance|trade compliance|regulatory'),
('HR & People',r'workforce|rewards|learning and development|learning & development|people|benefits'),
('Supply Chain & Logistics',r'replenish|planner|planning|spend management|inventory|transportation|fleet|packaging|material handl'),
('Engineering & Hardware',r'construction|estimat|weld|machinist|photonic|maintenance|yield|process integration|autonomy|r&d|research and development|energy|electric vehicle|sustainab|resilience|environmental|facilities|fabricat|resource assess|derms|semiconductor|optic|solar|battery|utility|grid|engineering intern|\beng\b|fuel|apprentice|safety|\behs\b|architecture|\bgis\b|finite element|antenna|vehicle|validation|integration|controls|thermoplastic|product development|terminal operator|electromagnet'),
('Software & IT',r'computer science|solution architect|\bsap\b|\berp\b|digital'),
('Marketing & Sales',r'customer experience|client experience|client solutions|client group|dealer|store executive|store leadership|retail|store|claims representative|account'),
('Media & Communications',r'communicat|photograph|design'),
('Business & Operations',r'continuous improvement|transformation|innovation|corporate|leadership|management|executive|deposits|claims|coordinator|specialist|associate|global|athletic|farm stand|student assistant|student worker|rotational|\\bmba\\b|project delivery|project solutions|future leaders|operational excellence')]
def category_v18(title,cur):
    if cur and cur!='Other': return cur
    t=' '+(title or '').lower()+' '
    for c,rx in CATS2:
        if re.search(rx,t): return c
    return 'Other'
SEAS=re.compile(r'(?i)\b(summer|fall|autumn|spring|winter)\b')
def season_v18(title):
    """Explicit text only: a single season word in the title, year only if the title states one."""
    s={w.title().replace('Autumn','Fall') for w in SEAS.findall(title or '')}
    if len(s)!=1: return None,None
    ys={int(y) for y in re.findall(r'\b(20\d\d)\b(?![-–/]\d)',title or '')}
    if re.search(r'20\d\d\s*[-–/]\s*(20)?\d\d',title or ''): ys=set()
    return s.pop(),(ys.pop() if len(ys)==1 else None)
def host(u): return urllib.parse.urlsplit(u or '').netloc.lower()
def _desc_from_html(t):
    for m in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>',t,re.S|re.I):
        try: j=json.loads(m.group(1).strip())
        except Exception: continue
        for o in (j if isinstance(j,list) else j.get('@graph',[j]) if isinstance(j,dict) else []):
            if isinstance(o,dict) and o.get('@type')=='JobPosting' and o.get('description'): return N.clean_html(html.unescape(o['description']))
    m=re.search(r'<meta[^>]+(?:property|name)=["\'](?:og:)?description["\'][^>]+content=["\']([^"\']{120,})',t,re.I)
    return N.clean_html(html.unescape(m.group(1))) if m else None
def direct_map(cache_dir):
    """company|title -> direct apply URL, from public GitHub lists that publish real ATS links (no shorteners)."""
    m={}
    for f in sorted(os.listdir(cache_dir)) if os.path.isdir(cache_dir) else []:
        if not f.endswith('.json'): continue
        try: L=json.load(open(os.path.join(cache_dir,f)))
        except Exception: continue
        for x in L if isinstance(L,list) else []:
            u=x.get('url') or '';
            if not x.get('active') or not u.startswith('http') or host(u) in SHORTENERS: continue
            m.setdefault(N.nkey(x.get('company_name'))+'|'+N.nkey(x.get('title')),u)
    return m
def check(u,fetch,allowed,DEAD):
    """-> (state,final_url,desc): state True live / False gone / None unknown"""
    try:
        if host(u) in SHORTENERS or not allowed(u): return None,u,None
        r=fetch(u,allow_404=True,tries=2,timeout=20,check_robots=False,headers={'Accept':'text/html'})
        if r.status_code in (404,410): return False,r.url,None
        if r.status_code>=400: return None,u,None
        t=r.text[:400000]
        if DEAD.search(t[:200000]) or re.search(r'"isApplyAvailable"\s*:\s*false',t): return False,r.url,None
        return True,r.url,_desc_from_html(t)
    except Exception: return None,u,None
def run(out,cache_dir,fetch,allowed,DEAD,shard_has,nowS,now,workers=16,cap=900,log=None):
    st=collections.Counter()
    op=[r for r in out if r.get('status')=='open']
    ats_keys={N.nkey(r['company'])+'|'+N.nkey(r['title']) for r in op if r.get('source_type')=='ats'}
    dm=direct_map(cache_dir)
    # 1) leads: duplicate of a verified ATS row -> hide; shortener -> swap to the direct link another public list publishes
    todo=[]
    for r in op:
        if r.get('source_type') not in ('github-verified','manual'): continue
        k=N.nkey(r['company'])+'|'+N.nkey(r['title'])
        if k in ats_keys: r['hidden']=True;r['hidden_reason']='duplicate of company-board listing';st['lead_dup_of_ats']+=1;continue
        if host(r.get('apply_url')) in SHORTENERS and k in dm: r['apply_url']=dm[k];st['shortener_resolved']+=1
        need_v=not r.get('last_verified'); need_d=not shard_has(r['id'])
        if (need_v or need_d) and r.get('apply_url') and host(r.get('apply_url')) not in SHORTENERS: todo.append(r)
    todo.sort(key=lambda r:(bool(r.get('last_verified')),r['id']));todo=todo[:cap]
    with cf.ThreadPoolExecutor(workers) as ex:
        for r,(s,fin,d) in zip(todo,ex.map(lambda r:check(r.get('apply_url'),fetch,allowed,DEAD),todo)):
            if s is True:
                r['last_verified']=nowS;r['link_ok_at']=nowS;r['apply_link']=r['apply_url'];r['apply_kind']='direct';st['lead_verified']+=1
                if d and len(d)>80 and not shard_has(r['id']): r['_desc']=d[:3000];st['desc_added']+=1
                if d and not r.get('deadline'):
                    dl,ctx=N.deadline_from_text(d,r.get('posted'))
                    if dl and dl>=str(N.TODAY): r['deadline']=dl;r['deadline_source']='posting text: “'+ctx+'”';st['deadline_added']+=1
            elif s is False: r['status']='closed';r['closed_at']=nowS;st['lead_closed_dead']+=1
            else: st['lead_unknown']+=1
    # 2) seasons + categories (explicit text only)
    for r in out:
        if r.get('status')!='open': continue
        if not r.get('season'):
            s,y=season_v18(r.get('title'))
            if s: r['season']=s;st['season_added']+=1
            if s and y and not r.get('year'): r['year']=y
        c=category_v18(r.get('title'),r.get('category'))
        if c!=r.get('category'): r['category']=c;st['category_fixed']+=1
    # 3) stale term guard: a stated term that has fully passed -> close
    for r in out:
        if r.get('status')=='open' and r.get('season') and r.get('year') and (r['year'],N.ORDER.get(r['season'],0))<N.cur_term_tuple(): r['status']='closed';r['closed_at']=nowS;st['closed_past_term']+=1
    # 4) dedupe visible open rows: company,title,first city/state,season -> keep most recently verified
    g=collections.defaultdict(list)
    for r in out:
        if r.get('status')=='open' and not r.get('hidden'):
            l=(r.get('locations') or [{}])[0]
            g[(N.nkey(r['company']),N.nkey(r['title']),N.nkey(l.get('city')),l.get('state'),r.get('season'))].append(r)
    for rows in g.values():
        if len(rows)<2: continue
        rows.sort(key=lambda r:r.get('last_verified') or '',reverse=True)
        for r in rows[1:]: r['hidden']=True;r['hidden_reason']='duplicate';r['dup_of']=rows[0]['id'];st['dedupe_hidden']+=1
    # 5) trust rule: open but not checked within 72h -> flagged; the site hides these from Open by default
    cut=(now-datetime.timedelta(hours=72)).isoformat()
    for r in out:
        if r.get('status')=='open' and (not r.get('last_verified') or r['last_verified']<cut): r['check_unknown']=True;st['check_unknown']+=1
        else: r.pop('check_unknown',None)
    if log: log(dict(st))
    return dict(st)
