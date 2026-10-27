"""Pluggable source adapters. Each adapter: fetch(company_row) -> list of raw postings.
Raw posting: title, url, locations[str], desc (html/text), posted (iso), deadline (iso|None), workplace, dept, ats_id."""
import json,re,datetime
from .net import fetch,Blocked
def _iso(v):
    if not v: return None
    if isinstance(v,(int,float)): return datetime.datetime.utcfromtimestamp(v/1000 if v>1e11 else v).date().isoformat()
    return str(v)[:10]
ADAPTERS={}
def adapter(name,**cfg):
    def deco(f): ADAPTERS[name]={'fetch':f,'config':cfg,'name':name};return f
    return deco
@adapter('greenhouse',api='https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true',official=True)
def greenhouse(c):
    j=fetch(f"https://boards-api.greenhouse.io/v1/boards/{c['slug']}/jobs?content=true").json()
    out=[]
    for x in j.get('jobs',[]):
        locs=[x.get('location',{}).get('name') or '']+[o.get('name','') for o in x.get('offices',[]) if o.get('name')]
        out.append({'title':x['title'],'url':x.get('absolute_url'),'locations':locs,'desc':x.get('content'),'posted':_iso(x.get('first_published') or x.get('updated_at')),
          'dept':', '.join(d.get('name','') for d in x.get('departments',[])),'ats_id':str(x['id'])})
    return out
@adapter('lever',api='https://api.lever.co/v0/postings/{slug}?mode=json',official=True)
def lever(c):
    j=fetch(f"https://api.lever.co/v0/postings/{c['slug']}?mode=json").json()
    out=[]
    for x in j:
        cat=x.get('categories',{});locs=cat.get('allLocations') or [cat.get('location') or '']
        desc=(x.get('descriptionPlain') or '')+'\n'+'\n'.join(l.get('text','')+'\n'+re.sub('<[^>]+>',' ',l.get('content','')) for l in x.get('lists',[]))+'\n'+(x.get('additionalPlain') or '')
        out.append({'title':x['text'],'url':x.get('hostedUrl'),'locations':locs,'desc':desc,'posted':_iso(x.get('createdAt')),'workplace':x.get('workplaceType'),'dept':cat.get('team') or cat.get('department'),'ats_id':x['id'],
          'pay_range':x.get('salaryRange')})
    return out
@adapter('ashby',api='https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true',official=True)
def ashby(c):
    j=fetch(f"https://api.ashbyhq.com/posting-api/job-board/{c['slug']}?includeCompensation=true").json()
    out=[]
    for x in j.get('jobs',[]):
        if x.get('isListed') is False: continue
        locs=[x.get('location') or '']+[(a.get('location') or '') for a in x.get('secondaryLocations',[])]
        addr=(x.get('address') or {}).get('postalAddress') or {}
        if addr.get('addressLocality'): locs.append(f"{addr.get('addressLocality')}, {addr.get('addressRegion','')}, {addr.get('addressCountry','')}")
        comp=(x.get('compensation') or {}).get('compensationTierSummary')
        out.append({'title':x['title'],'url':x.get('jobUrl'),'locations':locs,'desc':x.get('descriptionHtml') or x.get('descriptionPlain'),'posted':_iso(x.get('publishedAt')),
          'workplace':x.get('workplaceType') or ('Remote' if x.get('isRemote') else None),'dept':x.get('department') or x.get('team'),'ats_id':x.get('id'),'pay_text':comp})
    return out
@adapter('smartrecruiters',api='https://api.smartrecruiters.com/v1/companies/{slug}/postings',official=True)
def smartrecruiters(c):
    out=[];off=0
    while off<1000:
        j=fetch(f"https://api.smartrecruiters.com/v1/companies/{c['slug']}/postings?limit=100&offset={off}&q=intern").json()
        for x in j.get('content',[]):
            L=x.get('location') or {}
            if (L.get('country') or '').lower() not in ('us','usa','united states'): continue
            det={}
            try: det=fetch(f"https://api.smartrecruiters.com/v1/companies/{c['slug']}/postings/{x['id']}").json()
            except Exception: pass
            sec=((det.get('jobAd') or {}).get('sections') or {});desc='\n'.join((sec.get(k) or {}).get('text','') for k in ('jobDescription','qualifications','additionalInformation'))
            loc=', '.join(v for v in [L.get('city'),(L.get('region') or '').upper()[:2] if len(L.get('region') or '')==2 else L.get('region'),'US'] if v)
            out.append({'title':x['name'],'url':det.get('postingUrl') or f"https://jobs.smartrecruiters.com/{c['slug']}/{x['id']}",'locations':[loc+(' (Remote)' if L.get('remote') else '')],'desc':desc,
              'posted':_iso(x.get('releasedDate')),'workplace':'Remote' if L.get('remote') else ('Hybrid' if L.get('hybrid') else None),'dept':(x.get('department') or {}).get('label'),'ats_id':x['id']})
        off+=100
        if off>=j.get('totalFound',0): break
    return out
@adapter('workable',api='https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true',official=True)
def workable(c):
    j=fetch(f"https://apply.workable.com/api/v1/widget/accounts/{c['slug']}?details=true").json()
    out=[]
    for x in j.get('jobs',[]):
        if (x.get('country') or '').lower() not in ('united states','us','usa') and not x.get('telecommuting'): continue
        locs=[f"{x.get('city','')}, {x.get('state','')}, {x.get('country','')}"]+[f"{l.get('city','')}, {l.get('region','')}, {l.get('country','')}" for l in x.get('locations',[]) or []]
        out.append({'title':x['title'],'url':x.get('url') or x.get('shortlink'),'locations':locs+(['Remote US'] if x.get('telecommuting') else []),'desc':x.get('description'),'posted':_iso(x.get('published_on') or x.get('created_at')),
          'workplace':'Remote' if x.get('telecommuting') else None,'dept':x.get('department'),'ats_id':x.get('shortcode')})
    return out
@adapter('recruitee',api='https://{slug}.recruitee.com/api/offers/',official=True)
def recruitee(c):
    j=fetch(f"https://{c['slug']}.recruitee.com/api/offers/").json()
    out=[]
    for x in j.get('offers',[]):
        locs=[f"{l.get('city','')}, {l.get('state_code') or l.get('state','')}, {l.get('country_code','')}" for l in x.get('locations',[])] or [x.get('location') or '']
        out.append({'title':x['title'],'url':x.get('careers_url'),'locations':locs+(['Remote US'] if x.get('remote') else []),'desc':(x.get('description') or '')+(x.get('requirements') or ''),'posted':_iso(x.get('published_at') or x.get('created_at')),
          'deadline':_iso(x.get('close_at')) if x.get('close_at') else None,'workplace':'Remote' if x.get('remote') else ('Hybrid' if x.get('hybrid') else ('On-site' if x.get('on_site') else None)),'dept':x.get('department'),'ats_id':str(x.get('id'))})
    return out
@adapter('bamboohr',api='https://{slug}.bamboohr.com/careers/list',official=True)
def bamboohr(c):
    j=fetch(f"https://{c['slug']}.bamboohr.com/careers/list").json()
    out=[]
    for x in j.get('result',[]):
        if not re.search(r'intern|co-?op|student|apprentic|fellow',x.get('jobOpeningName',''),re.I): continue
        L=x.get('location') or {};loc=f"{L.get('city') or ''}, {L.get('state') or ''}, {L.get('country') or ''}"
        det={}
        try: det=fetch(f"https://{c['slug']}.bamboohr.com/careers/{x['id']}/detail").json().get('result',{}).get('jobOpening',{})
        except Exception: pass
        out.append({'title':x['jobOpeningName'],'url':f"https://{c['slug']}.bamboohr.com/careers/{x['id']}",'locations':[loc]+(['Remote US'] if x.get('isRemote') else []),'desc':det.get('description'),'posted':_iso(det.get('datePosted')),
          'workplace':'Remote' if x.get('isRemote') else None,'dept':(x.get('departmentLabel')),'ats_id':str(x['id'])})
    return out
@adapter('workday',api='https://{host}/wday/cxs/{tenant}/{site}/jobs (public career site search)',official=True)
class TList(list):
    truncated=False
def workday_alive(board_slug,url):
    """V16: True/False if Workday's own detail endpoint says the posting is live/gone; None if it cannot tell."""
    m=re.search(r'myworkdayjobs\.com/(?:[a-z]{2}-[A-Z]{2}/)?[^/]+(/job/[^?#]+)',url or '')
    if not m: return None
    host,tenant,site=board_slug.split('/')
    try:
        r=fetch(f'https://{host}/wday/cxs/{tenant}/{site}'+m.group(1),check_robots=False,allow_404=True)
        if r.status_code==404: return False
        info=r.json().get('jobPostingInfo') or {}
        return bool(info) and info.get('canApply',True) is not False
    except Exception: return None
def workday(c):
    host,tenant,site=c['slug'].split('/')
    base=f'https://{host}/wday/cxs/{tenant}/{site}';out=TList();seen=set()
    for q in ('intern','co-op','internship'):
        off=0;total=None
        while off<200:
            j=fetch(base+'/jobs',method='POST',json_body={'appliedFacets':{},'limit':20,'offset':off,'searchText':q},check_robots=False).json()
            posts=j.get('jobPostings',[])
            for x in posts:
                p=x.get('externalPath')
                if not p or p in seen: continue
                seen.add(p)
                if not re.search(r'intern|co-?op|apprentic|student',x.get('title',''),re.I): continue
                det={}
                for _try in (0,1):  # V16: one retry; a failed detail read used to drop the city and change the URL
                    try: det=fetch(base+p,check_robots=False).json().get('jobPostingInfo',{});break
                    except Exception: pass
                locs=[det.get('location') or x.get('locationsText') or '']+(det.get('additionalLocations') or [])
                # V15 addendum: Workday paths carry the site's own location code (/job/USA-OH-Cleveland/...); use it when the label has no city
                mloc=re.match(r'/job/([^/]+)/',p or '')
                if mloc and re.match(r'^(US|USA)-[A-Z]{2}-',mloc.group(1)) and not re.search(r',',locs[0] or ''):locs.append(mloc.group(1))
                if det.get('country',{}).get('descriptor') and det['country']['descriptor'] not in ('United States of America','United States'): 
                    if not any('United States' in (l or '') or re.search(r',\s*[A-Z]{2}\b',l or '') for l in locs): continue
                out.append({'title':x['title'],'url':det.get('externalUrl') or f'https://{host}/{site}{p}','locations':locs+([ 'United States' ] if (det.get('country') or {}).get('descriptor','').startswith('United States') else []),'desc':det.get('jobDescription'),
                  'posted':_iso(det.get('startDate')),'deadline':_iso(det.get('endDate')) if det.get('endDate') else None,'workplace':det.get('remoteType'),'ats_id':det.get('jobReqId') or p})
            off+=20
            # V16: Workday reports `total` only on the first page (later pages say 0), so the old check stopped after
            # 20 results per query -> which internships made the cut varied run to run and the rest were "closed".
            if total is None: total=j.get('total') or 0
            if off>=total or not posts: break
        # V16 Phase 2: search hits past the 200 cap are not read, so a missing posting is not proof it closed
        if total and total>off: out.truncated=True
    return out
def _jsonld_jobs(html):
    for m in re.finditer(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>',html,re.S|re.I):
        try: d=json.loads(m.group(1).strip())
        except Exception: continue
        stack=d if isinstance(d,list) else [d]
        while stack:
            o=stack.pop()
            if isinstance(o,dict):
                if o.get('@type')=='JobPosting' or (isinstance(o.get('@type'),list) and 'JobPosting' in o['@type']): yield o
                for v in o.values():
                    if isinstance(v,(list,dict)): stack.extend(v if isinstance(v,list) else [v])
            elif isinstance(o,list): stack.extend(o)
@adapter('jsonld',api='schema.org JobPosting on career pages (robots.txt respected; urls from registry or sitemap)',official=True)
def jsonld(c):
    """registry slug = a careers URL, or 'sitemap:<url>' (only job-looking URLs followed, max 150)"""
    urls=[c['slug']]
    if c['slug'].startswith('sitemap:'):
        sm=fetch(c['slug'][8:]).text;urls=[u for u in re.findall(r'<loc>\s*([^<]+?)\s*</loc>',sm) if re.search(r'job|career|position|opening|intern',u,re.I)][:150]
    out=[]
    for u in urls:
        try: h=fetch(u).text
        except Blocked: continue
        for o in _jsonld_jobs(h):
            locs=[]
            for jl in (o.get('jobLocation') if isinstance(o.get('jobLocation'),list) else [o.get('jobLocation') or {}]):
                a=(jl or {}).get('address') or {}
                if isinstance(a,dict): locs.append(f"{a.get('addressLocality','')}, {a.get('addressRegion','')}, {a.get('addressCountry','') if isinstance(a.get('addressCountry'),str) else (a.get('addressCountry') or {}).get('name','')}")
            if o.get('jobLocationType')=='TELECOMMUTE': locs.append('Remote US')
            org=o.get('hiringOrganization') or {}
            out.append({'title':o.get('title',''),'url':o.get('url') or u,'locations':locs,'desc':o.get('description'),'posted':_iso(o.get('datePosted')),'deadline':_iso(o.get('validThrough')),
              'workplace':'Remote' if o.get('jobLocationType')=='TELECOMMUTE' else None,'ats_id':str((o.get('identifier') or {}).get('value') if isinstance(o.get('identifier'),dict) else o.get('identifier') or u),'company_override':org.get('name') if isinstance(org,dict) else None})
    return out
@adapter('usajobs',api='https://data.usajobs.gov/api/search (free key required: USAJOBS_API_KEY + USAJOBS_EMAIL secrets)',official=True,needs_key=True)
def usajobs(c):
    import os
    key=os.environ.get('USAJOBS_API_KEY');email=os.environ.get('USAJOBS_EMAIL')
    if not key or not email: raise RuntimeError('USAJobs needs a free API key (developer.usajobs.gov); set USAJOBS_API_KEY and USAJOBS_EMAIL secrets')
    out=[];page=1
    while page<=10:
        j=fetch(f'https://data.usajobs.gov/api/search?Keyword=intern&HiringPath=student&ResultsPerPage=250&Page={page}',headers={'Authorization-Key':key,'User-Agent':email,'Host':'data.usajobs.gov'},check_robots=False).json()
        items=j.get('SearchResult',{}).get('SearchResultItems',[])
        for it in items:
            d=it['MatchedObjectDescriptor']
            out.append({'title':d['PositionTitle'],'url':d.get('PositionURI'),'locations':[l.get('LocationName','') for l in d.get('PositionLocation',[])],'desc':(d.get('UserArea',{}).get('Details',{}).get('JobSummary') or '')+'\n'+(d.get('QualificationSummary') or ''),
              'posted':_iso(d.get('PublicationStartDate')),'deadline':_iso(d.get('ApplicationCloseDate')),'ats_id':it.get('MatchedObjectId'),'company_override':d.get('OrganizationName'),'pay_text':(d.get('PositionRemuneration') or [{}])[0].get('MinimumRange') and f"${d['PositionRemuneration'][0]['MinimumRange']}–${d['PositionRemuneration'][0]['MaximumRange']} {d['PositionRemuneration'][0].get('Description','')}"})
        if len(items)<250: break
        page+=1
    return out

# --- V9: careers sites without a public JSON API (robots.txt checked by fetch; crawl-delay honored in net.DELAY) ---
def _txt(h):
    import html as _h
    h=re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>','',h)
    return _h.unescape(re.sub(r'[ \t]+',' ',re.sub(r'<[^>]+>','\n',h)))
_INTERNISH=re.compile(r'(?i)\b(intern|internship|summer analyst|summer associate|co-?op|summer program)')
@adapter('avature',official=False)
def avature(c):
    """Avature careers portals (e.g. Two Sigma). slug = full list-page URL. Reads the public list page + each job page."""
    base=c['slug'];seen={};off=0
    while off<300:
        h=fetch(base+(f'?jobOffset={off}' if off else '')).text
        new=0
        for u,t in re.findall(r'href="(https://[^"]+/JobDetail/[^"]+)"[^>]*>\s*([^<]+?)\s*<',h):
            t=t.strip()
            if t and t!='View role' and u not in seen: seen[u]=t;new+=1
        if not new or f'jobOffset={off+10}' not in h: break
        off+=10
    out=[]
    for u,t in seen.items():
        if not _INTERNISH.search(t): continue
        d=fetch(u).text;tx=_txt(d)
        loc='';m=re.search(r'Location\s*\n\s*(?:\s*\n)*\s*([A-Z]{2}) ([^\n]+?)\s*\n(?:\s*\n)*\s*([^\n]+?)\s*\n',tx)
        if m and m.group(3).strip()=='United States': loc=f"{m.group(2).strip()}, {m.group(1)}"
        if not loc: continue  # non-US or unreadable location: skip rather than guess
        i=tx.find('Location')
        out.append({'title':t,'url':u,'locations':[loc],'desc':tx[max(0,i):i+12000],'ats_id':u.rstrip('/').rsplit('/',1)[-1]})
    return out
# US office cities for tal.net boards, which only list a bare city name. Any city not here is skipped (never guessed).
TALNET_US={'New York':'New York, NY','Houston':'Houston, TX','Baltimore':'Baltimore, MD','Alpharetta':'Alpharetta, GA','Purchase':'Purchase, NY','Chicago':'Chicago, IL',
 'San Francisco':'San Francisco, CA','Menlo Park':'Menlo Park, CA','Boston':'Boston, MA','Los Angeles':'Los Angeles, CA','Salt Lake City':'Salt Lake City, UT','Columbus':'Columbus, OH',
 'Philadelphia':'Philadelphia, PA','Charlotte':'Charlotte, NC','Dallas':'Dallas, TX','Atlanta':'Atlanta, GA','Miami':'Miami, FL','Seattle':'Seattle, WA','Minneapolis':'Minneapolis, MN',
 'Washington DC':'Washington, DC','Washington, D.C.':'Washington, DC','Denver':'Denver, CO','West Conshohocken':'West Conshohocken, PA','New York City':'New York, NY','NYC':'New York, NY','Jersey City':'Jersey City, NJ'}
@adapter('talnet',official=False)
def talnet(c):
    """Oracle tal.net campus boards (Morgan Stanley, Evercore). slug = host, e.g. morganstanley.tal.net. Only /candidate/ and /vx/ pages (allowed by robots.txt)."""
    host=c['slug'];rows=[];start=0
    while start<1000:
        h=fetch(f'https://{host}/candidate/jobboard/vacancy/1/adv/'+(f'?start={start}' if start else '')).text
        got=[]
        for row in re.findall(r'(?s)<tr class="opp_\d+[^"]*".*?</tr>',h):
            m=re.search(r'<a[^>]+href="([^"]+)"[^>]*>\s*(.*?)\s*</a>',row,re.S)
            if m: got.append((m.group(1),m.group(2),[re.sub(r'<[^>]+>|\s+',' ',td).strip() for td in re.findall(r'(?s)<td[^>]*>(.*?)</td>',row)[1:]]))
        rows+=got
        if len(got)<50 or f'start={start+50}' not in h: break
        start+=50
    import html as _h
    def _d(x):
        try: return datetime.datetime.strptime(x.replace('Sept','Sep'),'%d %b %Y').date().isoformat()
        except Exception: return None
    out=[]
    for u,t,cols in rows:
        t=_h.unescape(re.sub(r'\s+',' ',t)).strip();cols=[_h.unescape(x) for x in cols]
        if not _INTERNISH.search(t) or re.search(r'(?i)full[- ]time|coffee chat|webinar|insight|event|networking|open house',t): continue
        dates=[_d(x) for x in cols];posted=deadline=None
        if any(dates): posted=dates[0];deadline=dates[1] if len(dates)>1 else None
        cities=[x.strip() for x in re.split(r'[,/;]| and ',cols[0]) if x.strip()] if cols and not dates[0] else []
        us=[TALNET_US[x] for x in cities if x in TALNET_US]
        if not cols or dates[0]:  # board has no city column: read the city from the title, else skip
            us=[v for k,v in TALNET_US.items() if re.search(r'\b'+re.escape(k)+r'\b',t)][:1]
        if not us: continue
        tx=_txt(fetch(u).text)
        i=tx.find('Job description')
        out.append({'title':t,'url':u,'locations':us,'desc':tx[i:i+12000] if i>=0 else '','posted':posted,'deadline':deadline,'ats_id':re.search(r'/opp/(\d+)',u).group(1) if '/opp/' in u else u})
    return out
