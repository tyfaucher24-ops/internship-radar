"""V9 QA: re-open N random open listings at their source and check they are real, open, and titled as shown.
Usage: python3 -m test.spotcheck [N] [seed]. Respects robots.txt via pipeline.net.fetch. Writes data/spotcheck.json."""
import json,random,re,sys,os,html,datetime,concurrent.futures as cf
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..'))
from pipeline.net import fetch,Blocked
D=os.path.join(os.path.dirname(__file__),'..','data')
CLOSED=re.compile(r"(?i)no longer (accepting|available|open)|job (is )?not found|position has been filled|this job has expired|page not found|posting has (been )?closed|job you are looking for")
def words(t): return [w for w in re.findall(r'[a-z0-9]+',t.lower()) if len(w)>3 and w not in {'intern','internship','summer','2026','2027','2028','with','united','states'}]
def check(x):
    u=x.get('apply_url') or ''
    if not u.startswith('http'): return 'no_url',''
    try:
        r=fetch(u,allow_404=True,timeout=25,tries=2)
    except Blocked: return 'robots',''
    except Exception as e: return 'unreachable',str(e)[:80]
    if r.status_code in (404,410): return 'closed',str(r.status_code)
    t=html.unescape(r.text).lower()
    if 'myworkdayjobs.com' in u:  # Workday pages are rendered by script; ask the same site's public job JSON
        m=re.match(r'https://([^/]+)/(?:[a-z]{2}-[A-Z]{2}/)?([^/]+)/job/(.+)',u)
        if m:
            host,site,rest=m.groups();ten=host.split('.')[0]
            try:
                j=fetch(f'https://{host}/wday/cxs/{ten}/{site}/job/{rest}',allow_404=True,timeout=25,tries=2)
                if j.status_code in (404,410): return 'closed','cxs 404'
                info=j.json().get('jobPostingInfo',{})
                if info.get('canApply') is False: return 'closed','canApply false'
                t=(info.get('title','')+' '+info.get('jobDescription','')).lower()
            except Blocked: return 'robots',''
            except Exception as e: return 'unreachable','cxs '+str(e)[:60]
    if CLOSED.search(t[:20000]) and not re.search(r'(?i)apply now|submit application',t[:20000]): return 'closed','closed text'
    w=words(x['title'])
    if not w: return 'ok',''
    hit=sum(1 for k in w if k in t)/len(w)
    return ('ok' if hit>=0.6 else 'title_mismatch'),f'{hit:.2f}'
def main(n=100,seed=None):
    L=json.load(open(os.path.join(D,'listings.json')))['listings']
    o=[x for x in L if x.get('status')=='open' and not x.get('hidden')]
    seed=seed if seed is not None else int(datetime.date.today().strftime('%Y%m%d'))
    S=random.Random(seed).sample(o,min(n,len(o)))
    with cf.ThreadPoolExecutor(12) as ex: res=list(ex.map(check,S))
    rows=[{'id':x['id'],'company':x['company'],'title':x['title'],'url':x.get('apply_url'),'result':r,'detail':d} for x,(r,d) in zip(S,res)]
    c={};[c.__setitem__(r['result'],c.get(r['result'],0)+1) for r in rows]
    judged=sum(v for k,v in c.items() if k in ('ok','closed','title_mismatch'))
    acc=round(100*c.get('ok',0)/judged,1) if judged else None
    out={'when':datetime.datetime.utcnow().isoformat(timespec='seconds')+'Z','seed':seed,'n':len(rows),'counts':c,'accuracy_pct_of_checkable':acc,'rows':rows}
    json.dump(out,open(os.path.join(D,'spotcheck.json'),'w'),indent=1)
    print(json.dumps({k:out[k] for k in ('n','counts','accuracy_pct_of_checkable','seed')}))
    for r in rows:
        if r['result']!='ok': print(r['result'],r['detail'],'|',r['company'],'|',r['title'],'|',r['url'])
if __name__=='__main__': main(int(sys.argv[1]) if len(sys.argv)>1 else 100,int(sys.argv[2]) if len(sys.argv)>2 else None)
