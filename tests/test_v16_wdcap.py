"""V16 Phase 2: a Workday board whose search passes the 200-hit cap must not close postings that are still live."""
import sys,types,unittest.mock as M
sys.path.insert(0,'.')
from pipeline import adapters as A
ok=0;n=0
def t(c,m):
    global ok,n;n+=1;ok+=bool(c);print(('PASS ' if c else 'FAIL ')+m)
def fake(total):
    def f(url,method='GET',json_body=None,**k):
        r=M.Mock();r.status_code=200
        if url.endswith('/jobs'):
            off=json_body['offset'];r.json=lambda:{'total':total if off==0 else 0,'jobPostings':[{'title':f'Intern {off+i}','externalPath':f'/job/US-NY-X/Intern_{json_body["searchText"]}{off+i}'} for i in range(20)] if off<total else []}
        else: r.json=lambda:{'jobPostingInfo':{'country':{'descriptor':'United States of America'}}}
        return r
    return f
with M.patch.object(A,'fetch',fake(60)): o=A.workday({'slug':'h.wd1.myworkdayjobs.com/t/s'})
t(not o.truncated,'60 hits: not truncated')
with M.patch.object(A,'fetch',fake(900)): o=A.workday({'slug':'h.wd1.myworkdayjobs.com/t/s'})
t(o.truncated,'900 hits: truncated (200 cap)')
def r404(url,**k): r=M.Mock();r.status_code=404;return r
with M.patch.object(A,'fetch',r404): t(A.workday_alive('h.wd1.myworkdayjobs.com/t/s','https://h.wd1.myworkdayjobs.com/en-US/s/job/X/Y_R1') is False,'404 -> gone')
with M.patch.object(A,'fetch',fake(0)): t(A.workday_alive('h.wd1.myworkdayjobs.com/t/s','https://h.wd1.myworkdayjobs.com/s/job/X/Y_R1') is True,'detail live -> alive')
def boom(url,**k): raise IOError('x')
with M.patch.object(A,'fetch',boom): t(A.workday_alive('h.wd1.myworkdayjobs.com/t/s','https://h.wd1.myworkdayjobs.com/s/job/X/Y_R1') is None,'network error -> unknown (kept, stale)')
src=open('pipeline/sync.py').read()
t("kept_beyond_search_cap" in src and "_wd_alive.get(pid) is not False" in src,'sync keeps truncated-board postings unless Workday says gone')
print(f'{ok}/{n}');sys.exit(ok!=n)
