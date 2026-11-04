"""V20 Part 3b/3e: multi-employer job APIs read as listing sources (source_type 'api').
Field names are the ones the APIs return (checked 2026-11-04):
- Himalayas /jobs/api/search: title, companyName, companySlug, employmentType, locationRestrictions, description,
  excerpt, pubDate, expiryDate (unix seconds), applicationLink, guid, minSalary, maxSalary, currency, salaryPeriod.
  Their terms: a visible credit link to Himalayas, applicationLink as the apply target, and the jobs must not be
  passed on to Google Jobs, so every row carries no_jsonld and seo_pages emits no JobPosting for it.
  Search has 20 results per request and pages only with ?page=, which robots.txt disallows (/jobs*&page=), so
  only the first page of a few queries is read.
- The Muse /api/public/jobs: name, company.name, locations[].name, publication_date, contents, refs.landing_page,
  levels. ?page= is allowed by their robots.txt.
A feed that errors raises, so the sync keeps its last-good rows instead of closing them."""
import datetime,re
from .net import fetch
HIM_QUERIES=['intern','internship','summer intern','co-op']
def _d(ts):
    try: return datetime.datetime.fromtimestamp(int(ts),datetime.timezone.utc).date().isoformat()
    except Exception: return None
def _pay(j):
    lo,hi,cur,per=j.get('minSalary'),j.get('maxSalary'),j.get('currency'),j.get('salaryPeriod')
    if not (lo or hi) or cur not in ('USD',None): return None
    f=lambda v:f'${v:,.0f}'
    return (f'{f(lo)}–{f(hi)}' if lo and hi and lo!=hi else f(lo or hi))+(f' per {per}' if per else '')
def himalayas():
    out={};today=datetime.date.today().isoformat()
    for q in HIM_QUERIES:
        r=fetch('https://himalayas.app/jobs/api/search?q='+q.replace(' ','+')+'&country=US&employment_type=Intern',timeout=30)
        jobs=r.json().get('jobs')
        if jobs is None: raise RuntimeError('Himalayas: no jobs key')
        for j in jobs:
            u=j.get('applicationLink')
            if not u or not j.get('title') or not j.get('companyName'): continue
            exp=_d(j.get('expiryDate'))
            if exp and exp<today: continue
            locs=j.get('locationRestrictions') or []
            out[j.get('guid') or u]={'title':j['title'],'company':j['companyName'],'url':u,'locations':['Remote, '+l for l in locs] or ['Remote, United States'],
              'desc':j.get('description') or j.get('excerpt') or '','posted':_d(j.get('pubDate')),'pay_text':_pay(j),'workplace':'Remote',
              'feed':'himalayas','no_jsonld':True}
    return list(out.values())
def muse(max_pages=10):
    out=[];page=1
    while page<=max_pages:
        d=fetch(f'https://www.themuse.com/api/public/jobs?level=Internship&location=United%20States&page={page}',timeout=30).json()
        if 'results' not in d: raise RuntimeError('The Muse: no results key')
        for j in d['results']:
            u=(j.get('refs') or {}).get('landing_page');co=(j.get('company') or {}).get('name')
            if not u or not j.get('name') or not co: continue
            locs=[l.get('name') for l in j.get('locations') or [] if l.get('name')]
            out.append({'title':j['name'],'company':co,'url':u,'locations':[('Remote' if re.match(r'(?i)flexible|remote',l) else l) for l in locs],
              'desc':j.get('contents') or '','posted':(j.get('publication_date') or '')[:10] or None,'feed':'muse'})
        if page>=int(d.get('page_count') or 0): break
        page+=1
    return out
FEEDS={'himalayas':('Himalayas',himalayas),'muse':('The Muse',muse)}
