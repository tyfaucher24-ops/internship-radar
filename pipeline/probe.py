"""Probe public ATS boards for seed employers. Adds only boards that respond with real jobs (HTTP 200 + at least one
job-shaped record). V21: more ATS hosts, careers-page link reading for seeds with a domain (robots.txt respected via
pipeline.net; ATS links are read with discover.ats_from_url, the one slug parser), seed files under pipeline/seeds/,
discovered_via = probe:V21:<seed>, and a new-boards log under ops/coverage/.
usage: python -m pipeline.probe [seed files...]   (default: every pipeline/seeds/*.txt)"""
import re,sys,os,json,datetime,concurrent.futures as cf
from . import net
from .net import fetch
from .discover import load,save,add,ats_from_url
ROOT=os.path.join(os.path.dirname(__file__),'..');SEEDS=os.path.join(os.path.dirname(__file__),'seeds')
net.DELAY.update({'api.rippling.com':0.35})
ATS_ALL=('greenhouse','lever','ashby','smartrecruiters','workable','rippling','recruitee','bamboohr','personio')
def akey(n): return re.sub(r'[^a-z0-9]','',(n or '').lower().replace('&','and'))
def slugs(name):
    n=name.lower().replace('&','and');a=re.sub(r'[^a-z0-9]','',n);b=re.sub(r'[^a-z0-9]+','-',n).strip('-');c=re.sub(r'[^a-z0-9]','',re.sub(r'\b(the|inc|llc|group|company|co|corp|corporation|holdings|technologies|plc)\b','',n))
    return [s for s in dict.fromkeys([a,b,c]) if s]
def board_url(ats,s):
    return {'greenhouse':f'https://boards-api.greenhouse.io/v1/boards/{s}/jobs','lever':f'https://api.lever.co/v0/postings/{s}?mode=json&limit=1',
     'ashby':f'https://api.ashbyhq.com/posting-api/job-board/{s}','smartrecruiters':f'https://api.smartrecruiters.com/v1/companies/{s}/postings?limit=1',
     'workable':f'https://apply.workable.com/api/v1/widget/accounts/{s}','rippling':f'https://api.rippling.com/platform/api/ats/v1/board/{s}/jobs',
     'recruitee':f'https://{s}.recruitee.com/api/offers/','bamboohr':f'https://{s}.bamboohr.com/careers/list','personio':f'https://{s}.jobs.personio.de/xml'}[ats]
def job_count(ats,body):
    """number of job-shaped records in a board response (0 = not a live board)"""
    if ats=='personio': return len(re.findall(r'<position>',body))
    try: j=json.loads(body)
    except Exception: return 0
    if ats=='greenhouse': return len([x for x in j.get('jobs',[]) if x.get('title')])
    if ats in ('lever','rippling'): return len([x for x in j if isinstance(x,dict) and (x.get('text') or x.get('name'))]) if isinstance(j,list) else 0
    if ats=='ashby': return len([x for x in j.get('jobs',[]) if x.get('title')])
    if ats=='smartrecruiters': return int(j.get('totalFound') or 0)
    if ats=='workable': return len(j.get('jobs',[]))
    if ats=='recruitee': return len(j.get('offers',[]))
    if ats=='bamboohr': return len(j.get('result',[]))
    return 0
def try_board(ats,s):
    if ats in ('recruitee','bamboohr','personio') and not re.fullmatch(r'[a-z0-9-]{2,40}',s): return 0
    try:
        r=fetch(board_url(ats,s),allow_404=True,tries=1,timeout=15)
        if r.status_code!=200 or ats=='bamboohr' and 'json' not in r.headers.get('Content-Type',''): return 0
        return job_count(ats,r.text)
    except Exception: return 0
CAREERS_PATHS=('https://{d}/careers','https://careers.{d}/','https://{d}/jobs','https://jobs.{d}/','https://{d}/careers/')
def _sniff(html_text,url):
    out=[]
    for h in set(re.findall(r'(?:href|src|data-url|action)=["\'](https?://[^"\'\s<>]+)',html_text))|set(re.findall(r'https?://[a-z0-9.-]+\.(?:myworkdayjobs|myworkdaysite|greenhouse|lever|ashbyhq|smartrecruiters|workable|recruitee|bamboohr|rippling|personio)\.[a-z.]+/[^"\'\s<>\\]*',html_text))|{url}:
        a=ats_from_url(h.replace('\\/','/'))
        if a and a not in out: out.append(a)
    return out
def careers_links(domain,depth=2,max_sub=4):
    """read the employer's own careers pages (robots.txt respected) and return ATS boards linked from them;
    follows up to max_sub same-site links that look like job search / student pages one level down"""
    import urllib.parse as up
    found=[];subs=[]
    for pat in CAREERS_PATHS:
        u=pat.format(d=domain)
        try: r=fetch(u,tries=1,timeout=15,allow_404=True)
        except Exception: continue
        if r.status_code!=200: continue
        for a in _sniff(r.text,r.url):
            if a not in found: found.append(a)
        if found: return found
        base=up.urlsplit(r.url).netloc
        for h in re.findall(r'href=["\']([^"\'#\s]+)',r.text):
            v=up.urljoin(r.url,h)
            if up.urlsplit(v).netloc.endswith(domain.split('/')[0]) and re.search(r'(?i)job|search|student|campus|intern|early|universit|graduate',v) and v not in subs: subs.append(v)
        break
    if depth>1:
        for v in subs[:max_sub]:
            try: r=fetch(v,tries=1,timeout=15,allow_404=True)
            except Exception: continue
            if r.status_code==200:
                for a in _sniff(r.text,r.url):
                    if a not in found: found.append(a)
            if found: break
    return found
def read_seed(path):
    out=[]
    for l in open(path):
        l=l.strip()
        if not l or l.startswith('#'): continue
        p=(l.split('|')+['',''])[:3];out.append((p[0].strip(),p[1].strip(),p[2].strip().lower()))
    return out
def probe(seed_files,ats=ATS_ALL,skip_known=True,workers=24,max_names=None,log_dir=None):
    rows=load();known={akey(r['name']) for r in rows}
    names=[];seen=set()
    for f in seed_files:
        tag=os.path.splitext(os.path.basename(f))[0]
        for n,ind,dom in read_seed(f):
            k=akey(n)
            if not k or k in seen or (skip_known and k in known): continue
            seen.add(k);names.append((n,ind,dom,tag))
    if max_names: names=names[:max_names]
    tasks=[]
    for n,ind,dom,tag in names:
        sl=slugs(n);dsl=dom.split('.')[0] if dom else None
        if dsl and dsl not in sl: sl=[dsl]+sl
        if dom: tasks.append(('site',n,ind,dom,tag,None))
        for a in ats:
            for s in (sl[:1] if a in ('workable','personio','recruitee','bamboohr') else sl[:2]): tasks.append((a,n,ind,dom,tag,s))
    stats={'names':len(names),'requests':len(tasks),'by_seed':{}};found=[]
    def run(t):
        a,n,ind,dom,tag,s=t
        if a=='site': return t,careers_links(dom)
        c=try_board(a,s);return t,([(a,s,c)] if c else [])
    with cf.ThreadPoolExecutor(workers) as ex:
        for t,res in ex.map(run,tasks):
            a,n,ind,dom,tag,s=t;st=stats['by_seed'].setdefault(tag,{'attempts':0,'boards':0});st['attempts']+=1
            for hit in res:
                ats_,slug=hit[0],hit[1]
                if add(rows,n,ats_,slug,f'probe:V21:{tag}',industry=ind,domain=dom or None):
                    st['boards']+=1;found.append({'name':n,'ats':ats_,'slug':slug,'discovered_via':f'probe:V21:{tag}','jobs':hit[2] if len(hit)>2 else None})
    save(rows);stats['added']=len(found)
    if log_dir is not False: write_log(found,stats,log_dir)
    return found,stats
def write_log(found,stats,log_dir=None):
    d=log_dir or os.path.join(ROOT,'ops','coverage');os.makedirs(d,exist_ok=True)
    day=datetime.date.today().isoformat();p=os.path.join(d,f'new-boards-{day}.log')
    with open(p,'a') as f:
        f.write(f'# probe run {datetime.datetime.now().isoformat(timespec="seconds")} stats={json.dumps(stats)}\n')
        for x in found: f.write(f"{x['ats']}\t{x['slug']}\t{x['discovered_via']}\t{x['name']}\tjobs_on_board={x['jobs'] if x['jobs'] is not None else 'linked from careers page'}\n")
    return p
if __name__=='__main__':
    fs=sys.argv[1:] or sorted(os.path.join(SEEDS,f) for f in os.listdir(SEEDS) if f.endswith('.txt'))
    f,st=probe(fs);print(json.dumps(st,indent=1));print('boards found',len(f))
