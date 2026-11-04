"""V20 Part 3b/3e: Himalayas + The Muse feeds. Fixture is a real Himalayas search record (2026-11-04, description cut).
--live also calls both APIs once."""
import sys,json,re
sys.path.insert(0,'.')
from pipeline import feeds as F, seo_pages as S, sync as Y
ok=0;n=0
def t(c,m):
    global ok,n;n+=1;ok+=bool(c);print(('PASS ' if c else 'FAIL ')+m)
J=json.load(open('tests/data/v20_himalayas_job.json'))
class R:
    def __init__(s,d):s.d=d
    def json(s):return s.d
calls=[]
def fake(u,**k):
    calls.append(u)
    if 'himalayas' in u: return R({'jobs':[J,{**J,'guid':'x','expiryDate':1}]})
    return R({'page':1,'page_count':1,'results':[{'name':'Data Science Intern','company':{'name':'Allstate'},'locations':[{'name':'Chicago, IL'}],'publication_date':'2026-10-30T00:00:00Z','contents':'<p>x</p>','refs':{'landing_page':'https://www.themuse.com/jobs/allstate/data-science-intern'}}]})
F.fetch=fake
h=F.himalayas()
t(len(h)==1,'expired Himalayas record (expiryDate in the past) dropped')
x=h[0]
t(x['url']==J['applicationLink'],'apply target is applicationLink')
t(x['company']==J['companyName'] and x['title']==J['title'],'companyName / title used')
t(x['no_jsonld'] is True,'Himalayas rows carry no_jsonld')
t(not any(re.search(r'[?&]page=',u) for u in calls),'no ?page= request (robots.txt disallows /jobs*&page=)')
m=F.muse()
t(m and m[0]['url'].startswith('https://www.themuse.com/jobs/') and m[0]['company']=='Allstate' and not m[0].get('no_jsonld'),'The Muse: landing_page, company.name')
rec,why=Y.build_record(x,{'name':x['company']},'via Himalayas','api')
t(rec is not None,'Himalayas record builds a listing ('+why+')')
r={**rec,'id':'a1','first_seen':'2026-11-04','no_jsonld':True}
t(S.jobposting(r,'some description') is None,'no JobPosting JSON-LD for a no_jsonld row')
t(S.jobposting({**r,'no_jsonld':None,'locations':[{'city':'Chicago','state':'IL'}]},'some description') is not None,'other rows still get JSON-LD')
pg=S.page('t','h','i',[r],{'a1':'desc'},'x.html')
t('application/ld+json' not in pg and 'href="https://himalayas.app" rel="noopener">Himalayas</a>' in pg,'company page: no JSON-LD block, visible credit link')
pg2=S.page('t','h','i',[{**r,'no_jsonld':None,'apply_url':'https://jobs.lever.co/x/1'}],{},'x.html')
t('also found via' not in pg2,'credit only on pages that show Himalayas rows')
idx=open('index.html').read()
t('Internships also found via <a href="https://himalayas.app" rel="noopener">Himalayas</a>' in idx,'#about credit line')
t(Y.RANK['api']>Y.RANK['ats'],'an employer-board copy of the same job wins over the API copy')
if '--live' in sys.argv:
    import importlib;importlib.reload(F)
    a,b=F.himalayas(),F.muse();t(len(a)>20 and len(b)>10,f'live: Himalayas {len(a)}, The Muse {len(b)}')
print(f'{ok}/{n}');sys.exit(ok!=n)
