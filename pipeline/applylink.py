"""V13.3 #5b: job-specific Apply links.
Every listing gets apply_kind:
  'direct'  - the ATS application for THAT job (built from the ATS job id), shown as "Apply ↗"
  'posting' - a job-specific posting page we could not confirm as the application, shown as "View posting ↗"
  'none'    - only a company site / careers root / search page is known: no button (never link a generic page)
and apply_link (the URL the button opens). Links are re-validated on each sync in a time-budgeted rotation:
the final URL after redirects must still contain the job id and the ATS/job path, else the listing falls back."""
import os,re,json,time,datetime,collections,concurrent.futures as cf
from urllib.parse import urlsplit,parse_qs
D=os.path.join(os.path.dirname(__file__),'..','data')
UUID=r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
GENERIC=re.compile(r'^/?(?:[a-z]{2}(?:-[a-z]{2})?/)?(?:careers?|jobs?|search|results|opportunities|join(?:-us)?|en|us|students?|university|early-careers?)?/?$',re.I)
SEARCHQ=re.compile(r'[?&](?:q|query|keywords?|search|location)=',re.I)
def _id_token(u):
    """The job id/slug that must survive redirects, or None when the URL has none."""
    p=urlsplit(u);q=parse_qs(p.query)
    for k in ('gh_jid','jobId','jobid','job_id','pid','id','job','career_job_req_id','req','jr_id','token','jobCode','jobName'):
        if q.get(k) and re.fullmatch(r'[\w-]{4,}',q[k][0]): return q[k][0]
    m=re.search(UUID,p.path,re.I)
    if m: return m.group(0)
    m=re.search(r'_([A-Za-z]{0,6}[-_]?\d[\w-]*)(?:/apply)?/?$',p.path)   # Workday ..._R123456 / _JR-0012 / _Job_Req_55883
    if m and '/job/' in p.path: return m.group(1)
    m=re.search(r'/(\d{4,})(?:[/-][^/]*)?/?$',p.path) or re.search(r'/(?:jobs?|j|position|positions|roles?|opp|careers|details|posting|req)/([A-Za-z0-9]{5,})(?:[/-]|$)',p.path,re.I)
    if m: return m.group(1)
    m=re.search(r'/(?:careers|apply)/(\d{2,}|[A-Za-z0-9]{8,12})(?:/|$)',p.path) or re.search(r'-(\d{5,})/?$',p.path)
    if m: return m.group(1)
    seg=[x for x in p.path.split('/') if x]
    if seg and seg[-1].count('-')>=2 and len(seg[-1])>=12 and not GENERIC.match('/'+seg[-1]): return seg[-1]
    return None
def classify(rec):
    """-> (kind, link) from the listing's own source URL and ATS job id. Never guesses a URL that is not built from a real job id."""
    u=(rec.get('apply_url') or '').strip();b=(rec.get('board') or '');ats,_,slug=b.partition(':');jid=str(rec.get('ats_id') or '')
    if not u.startswith('http') and not jid: return 'none',None
    p=urlsplit(u);h=p.netloc.lower();path=p.path
    # rebuild from the ATS job id when the feed gave only a board root
    if ats=='greenhouse' and jid.isdigit():
        if not re.search(r'/jobs/\d+|gh_jid=\d+',u): u=f'https://job-boards.greenhouse.io/{slug}/jobs/{jid}'
        return 'direct',u
    if ats=='lever' and re.fullmatch(UUID,jid,re.I): return 'direct',f'https://jobs.lever.co/{slug}/{jid}/apply'
    if ats=='ashby' and re.fullmatch(UUID,jid,re.I): return 'direct',f'https://jobs.ashbyhq.com/{slug}/{jid}/application'
    if ats=='smartrecruiters' and jid.isdigit(): return 'direct',f'https://jobs.smartrecruiters.com/{slug}/{jid}'
    if 'greenhouse.io' in h and re.search(r'/jobs/\d{4,}',path): return 'direct',u
    if h=='jobs.lever.co' and re.search(UUID,path,re.I):
        m=re.match(r'/([^/]+)/('+UUID+')',path,re.I);return 'direct',f'https://jobs.lever.co/{m.group(1)}/{m.group(2)}/apply'
    if h=='jobs.ashbyhq.com' and re.search(UUID,path,re.I):
        m=re.match(r'/([^/]+)/('+UUID+')',path,re.I);return 'direct',f'https://jobs.ashbyhq.com/{m.group(1)}/{m.group(2)}/application'
    if ('myworkdayjobs.com' in h or 'myworkdaysite.com' in h) and '/job/' in path and _id_token(u):
        return 'direct',re.sub(r'/apply/?$','',u.split('?')[0].rstrip('/'))+'/apply'
    if h=='jobs.smartrecruiters.com' and re.match(r'/[^/]+/\d{6,}',path): return 'direct',u
    if h=='apply.workable.com' and re.search(r'/j/[A-Z0-9]{6,}',path): return 'direct',u
    if h=='zapply.jobs':   # job-board redirector: rebuild the ATS link when the id says which job it is
        m=re.search(r'/lever-([a-z0-9-]+?)-('+UUID+')',path,re.I)
        if m: return 'direct',f'https://jobs.lever.co/{m.group(1)}/{m.group(2)}/apply'
        m=re.search(r'/greenhouse-([a-z0-9]+)-(\d{6,})',path,re.I)
        if m: return 'direct',f'https://job-boards.greenhouse.io/{m.group(1)}/jobs/{m.group(2)}'
        m=re.search(r'/ashby-([a-z0-9-]+?)-('+UUID+')',path,re.I)
        if m: return 'direct',f'https://jobs.ashbyhq.com/{m.group(1)}/{m.group(2)}/application'
        return 'posting',u   # job-specific copy; validation follows it to the employer's own page
    # any other employer ATS: job-specific only when the URL carries a job id and is not a root/search page
    if GENERIC.match(path) and not parse_qs(p.query).get('gh_jid') or (SEARCHQ.search(p.query) and not parse_qs(p.query).get('pid')): return 'none',None
    return ('posting',u) if _id_token(u) else ('none',None)
def check(link):
    """True = final URL (after redirects) still carries the job id on a job path; False = it fell to a homepage/careers root/search or is gone; None = could not check."""
    from .net import fetch,allowed
    tok=_id_token(link)
    if not tok: return False
    try:
        if not allowed(link): return None
        r=fetch(link,allow_404=True,tries=2,timeout=20,check_robots=False,headers={'Accept':'text/html'})
        if r.status_code in (404,410): return False
        if r.status_code>=400: return None
        f=r.url;fp=urlsplit(f)
        if tok.lower() not in f.lower(): return False
        if GENERIC.match(fp.path) and not parse_qs(fp.query).get('gh_jid'): return False
        return True
    except Exception: return None
def main(budget_s=None,workers=16):
    budget_s=budget_s if budget_s is not None else int(os.environ.get('APPLY_CHECK_S','600'))
    p=os.path.join(D,'listings.json');LJ=json.load(open(p));L=LJ['listings']
    now=datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()
    st=collections.Counter();fail=collections.Counter()
    for r in L:
        k,l=classify(r)
        if r.get('apply_bad')==l and l: k,l=('posting',r['apply_url']) if (r.get('apply_url') and r['apply_url']!=l and _id_token(r['apply_url'])) else ('none',None)
        r['apply_kind']=k;r['apply_link']=l
    # rotation: never-checked first, then oldest check; open listings only
    todo=sorted([r for r in L if r.get('status')=='open' and r.get('apply_link')],key=lambda r:(r.get('apply_ok_at') or ''))
    # interleave hosts so the per-host politeness delay never starves the pool
    hb=collections.defaultdict(list)
    for r in todo: hb[urlsplit(r['apply_link']).netloc].append(r)
    todo=[];qs=list(hb.values())
    while qs:
        for q in qs: todo.append(q.pop(0))
        qs=[q for q in qs if q]
    t0=time.time();done=0
    with cf.ThreadPoolExecutor(workers) as ex:
        it=iter(todo);fut={}
        def sub():
            r=next(it,None)
            if r is not None: fut[ex.submit(check,r['apply_link'])]=r
        for _ in range(workers*2): sub()
        while fut:
            dn,_=cf.wait(fut,return_when=cf.FIRST_COMPLETED)
            for f in dn:
                r=fut.pop(f);ok=f.result();done+=1
                if ok is True: r['apply_ok_at']=now;st['ok']+=1
                elif ok is False:
                    st['failed']+=1;fail[urlsplit(r['apply_link']).netloc]+=1;r['apply_bad']=r['apply_link']
                    if r['apply_kind']=='direct' and r.get('apply_url') and r['apply_url']!=r['apply_link'] and _id_token(r['apply_url']): r['apply_kind'],r['apply_link']='posting',r['apply_url']
                    else: r['apply_kind'],r['apply_link']='none',None
                else: st['unknown']+=1
                if done%250==0: print('checked',done,dict(st),round(time.time()-t0),flush=True)
                if time.time()-t0<budget_s: sub()
    for r in L: r['ak']={'direct':'d','posting':'p'}.get(r.get('apply_kind'))  # index flag for list buttons
    op=[r for r in L if r.get('status')=='open' and not r.get('hidden')]
    kinds=collections.Counter(r.get('apply_kind') for r in op)
    rep={'at':now,'open':len(op),'direct':kinds['direct'],'posting':kinds['posting'],'none':kinds['none'],'checked_this_run':done,**st,'top_failing_hosts':fail.most_common(10),
         'top_fallback_hosts':collections.Counter(urlsplit(r.get('apply_url') or '').netloc or '(no link)' for r in op if r.get('apply_kind')!='direct').most_common(10),
         'validated_within_24h':sum(1 for r in op if (r.get('apply_ok_at') or '')>(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(hours=24)).isoformat())}
    json.dump(LJ,open(p,'w'),ensure_ascii=False,separators=(',',':'))
    mp=os.path.join(D,'meta.json');m=json.load(open(mp));m['apply_links']=rep;json.dump(m,open(mp,'w'),indent=1)
    print(json.dumps(rep))
    return rep
if __name__=='__main__':
    import sys;main(int(sys.argv[1]) if len(sys.argv)>1 else None)
