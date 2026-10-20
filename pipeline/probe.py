"""Probe public ATS boards for seed employers (non-tech, small, regional). Adds only boards that respond with real jobs."""
import re,sys,os,concurrent.futures as cf
from .net import fetch
from .discover import load,save,add
def slugs(name):
    n=name.lower().replace('&','and');a=re.sub(r'[^a-z0-9]','',n);b=re.sub(r'[^a-z0-9]+','-',n).strip('-');c=re.sub(r'[^a-z0-9]','',re.sub(r'\b(the|inc|llc|group|company|co)\b','',n))
    return list(dict.fromkeys([a,b,c]))
def try_board(ats,s):
    try:
        if ats=='greenhouse': r=fetch(f'https://boards-api.greenhouse.io/v1/boards/{s}/jobs',allow_404=True,tries=1);return r.status_code==200 and len(r.json().get('jobs',[]))>0
        if ats=='lever': r=fetch(f'https://api.lever.co/v0/postings/{s}?mode=json&limit=1',allow_404=True,tries=1);return r.status_code==200 and isinstance(r.json(),list) and len(r.json())>0
        if ats=='ashby': r=fetch(f'https://api.ashbyhq.com/posting-api/job-board/{s}',allow_404=True,tries=1);return r.status_code==200 and len(r.json().get('jobs',[]))>0
        if ats=='smartrecruiters': r=fetch(f'https://api.smartrecruiters.com/v1/companies/{s}/postings?limit=1',allow_404=True,tries=1);return r.status_code==200 and r.json().get('totalFound',0)>0
        if ats=='workable': r=fetch(f'https://apply.workable.com/api/v1/widget/accounts/{s}',allow_404=True,tries=1);return r.status_code==200 and len(r.json().get('jobs',[]))>0
    except Exception: return False
    return False
def probe(seed_file):
    rows=load();seeds=[l.strip().split('|') for l in open(seed_file) if l.strip() and not l.startswith('#')]
    tasks=[(n,ind,ats,s) for n,ind in seeds for ats in ('greenhouse','lever','ashby','smartrecruiters','workable') for s in slugs(n)]
    found={}
    def run(t): return t if try_board(t[2],t[3]) else None
    with cf.ThreadPoolExecutor(16) as ex:
        for res in ex.map(run,tasks):
            if res:
                n,ind,ats,s=res
                if (n,ats) not in found: found[(n,ats)]=s;add(rows,n,ats,s,'probe:seed list',industry=ind)
    save(rows);return found
if __name__=='__main__':
    f=probe(os.path.join(os.path.dirname(__file__),sys.argv[1] if len(sys.argv)>1 else 'seeds_nontech.txt'))
    print('boards found',len(f));[print(' ',k,v) for k,v in f.items()]
