"""V13.3 #6 data audit: 100 random open listings re-checked against the company's own posting (ATS feed or posting page).
Uses the pipeline's polite fetcher (robots.txt respected, rate limited). Never contacts LinkedIn. Usage: python3 -m qa-v13.3 ... -> run as: python3 qa-v13.3/data_audit.py [seed]"""
import sys,os,json,random,re,datetime,collections,concurrent.futures as cf
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'));sys.path.insert(0,ROOT)
from pipeline.adapters import ADAPTERS
from pipeline.discover import load as load_registry
from pipeline.net import fetch,Blocked
from pipeline import norm as N
STN={'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California','CO':'Colorado','CT':'Connecticut','DE':'Delaware','DC':'District of Columbia','FL':'Florida','GA':'Georgia','HI':'Hawaii','ID':'Idaho','IL':'Illinois','IN':'Indiana','IA':'Iowa','KS':'Kansas','KY':'Kentucky','LA':'Louisiana','ME':'Maine','MD':'Maryland','MA':'Massachusetts','MI':'Michigan','MN':'Minnesota','MS':'Mississippi','MO':'Missouri','MT':'Montana','NE':'Nebraska','NV':'Nevada','NH':'New Hampshire','NJ':'New Jersey','NM':'New Mexico','NY':'New York','NC':'North Carolina','ND':'North Dakota','OH':'Ohio','OK':'Oklahoma','OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina','SD':'South Dakota','TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont','VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming','PR':'Puerto Rico'}
def nz(s): return re.sub(r'[^a-z0-9]+',' ',(s or '').lower()).strip()
def loc_ok(rec,rawlocs,text):
    if not rec.get('locations'): return bool(rec.get('remote')) or not rawlocs
    blob=nz(' '.join(map(str,rawlocs))+' '+(text or ''))
    for l in rec['locations']:
        c,s=l.get('city'),l.get('state')
        if c and nz(c) not in blob: return False
        if not c and s and not re.search(r'\b('+nz(s)+'|'+nz(STN.get(s,''))+r')\b',blob): return False
    return True
SEAS=re.compile(r'(?i)\b(summer|fall|autumn|winter|spring)\b[^a-z0-9]{0,3}(20\d\d)|\b(20\d\d)\b[^a-z0-9]{0,3}(summer|fall|autumn|winter|spring)\b')
TITLE_Y=re.compile(r'\b(20\d\d)\b')
def season_ok(rec,title,desc,full=False):
    terms=set()
    for m in SEAS.finditer(title+' '+((desc or '') if full else (desc or '')[:1500])):
        s=(m.group(1) or m.group(4)).lower().replace('autumn','fall');y=m.group(2) or m.group(3);terms.add((s,int(y)))
    if not rec.get('season'): return True if not terms else not any((y,N.ORDER[s.title()])>N.cur_term_tuple() for s,y in terms)
    return (rec['season'].lower(),rec['year']) in terms
DL=re.compile(r'(?i)(deadline|apply by|applications? (?:are )?(?:due|close|accepted until)|closes? on|no later than)')
def dl_ok(rec,raw,desc):
    if rec.get('deadline'):
        if raw.get('deadline'): return str(raw['deadline'])[:10]==rec['deadline']
        d=datetime.date.fromisoformat(rec['deadline']);t=desc or ''
        pats=[d.strftime('%B')+r'\.?\s+0?'+str(d.day),d.strftime('%b')+r'\.?\s+0?'+str(d.day),f'0?{d.month}/0?{d.day}',d.isoformat()]
        return any(re.search(p,t,re.I) for p in pats)
    return not raw.get('deadline')  # nothing stated by the source -> we must show none
def main(seed=133,n=100,rebuild=False):
    from pipeline.sync import build_record
    L=json.load(open(os.path.join(ROOT,'data/listings.json')));L=L['listings'] if isinstance(L,dict) else L
    op=[x for x in L if x.get('status')=='open' and not x.get('hidden')]
    random.Random(seed).shuffle(op);reg={f"{r['ats']}:{r['slug']}".lower():r for r in load_registry()}
    feeds={};
    def feed(b):
        r=reg.get(b.lower())
        if not r or r['ats'] not in ADAPTERS: return None,'no adapter row'
        try: return ADAPTERS[r['ats']]['fetch'](r),None
        except Blocked as e: return None,'robots: '+str(e)
        except Exception as e: return None,f'{type(e).__name__}: {str(e)[:120]}'
    sample=[x for x in op if 'linkedin.com' not in (x.get('apply_url') or '')][:n]
    boards=sorted({x['board'] for x in sample if x.get('board')})
    with cf.ThreadPoolExecutor(8) as ex: feeds=dict(zip(boards,ex.map(feed,boards)))
    rows=[]
    for x in sample:
        r={'id':x['id'],'company':x['company'],'title':x['title'],'source_type':x['source_type'],'url':x.get('apply_url'),'board':x.get('board')}
        posts,err=feeds.get(x.get('board'),(None,'no board'))
        raw=None
        if posts is not None:
            raw=next((p for p in posts if x.get('ats_id') and str(p.get('ats_id'))==str(x['ats_id'])),None) or next((p for p in posts if (p.get('url') or '').rstrip('/')==(x.get('apply_url') or '').rstrip('/')),None) or next((p for p in posts if nz(p.get('title'))==nz(x['title'])),None)
            r['via']='feed'
            if raw is None: r.update(live=False,note='not in company feed any more');rows.append(r);continue
            desc=N.clean_html(raw.get('desc') or '');rt=re.sub(r'\s+',' ',raw.get('title') or '').strip()
            regname=reg[x['board'].lower()]['name']
            if rebuild:
                nr,_=build_record(raw,reg[x['board'].lower()],x.get('source'),x['source_type'])
                if nr: x=dict(x,locations=nr['locations'] if nr['locations'] and not all(l.get('city') for l in x.get('locations') or [{}]) else x.get('locations'),season=nr['season'],year=nr['year'],terms=nr['terms'],deadline=x.get('deadline') if raw.get('deadline') is None else nr['deadline'])
            r.update(live=True,company_ok=nz(N.norm_company(raw.get('company_override') or regname))==nz(x['company']),title_ok=nz(rt)==nz(x['title']),
                     location_ok=loc_ok(x,raw.get('locations') or [],desc),season_ok=season_ok(x,rt,desc),deadline_ok=dl_ok(x,raw,desc),src_title=rt,src_locations=raw.get('locations'),src_deadline=raw.get('deadline'))
        else:
            r['via']='page';r['feed_error']=err
            try:
                h=fetch(x['apply_url'],allow_404=True,timeout=20,tries=2)
                if h.status_code in(404,410): r.update(live=False,note=f'HTTP {h.status_code}');rows.append(r);continue
                t=N.clean_html(re.sub(r'(?is)<(script|style|noscript)\b.*?</\1>',' ',h.text))+' '+' '.join(re.findall(r'(?is)<title>(.*?)</title>',h.text));tn=nz(t);dead=re.search(r'(?i)(no longer (?:accepting|available|open)|position (?:has been )?(?:filled|closed)|job (?:is )?(?:closed|expired)|page (?:you requested )?(?:could not be|cannot be) found)',t)
                tw=[w for w in nz(x['title']).split() if len(w)>3]
                r.update(live=not dead,page_has_title=sum(w in tn for w in tw)>=max(1,len(tw)*0.7))
                if r['page_has_title']:
                    r.update(company_ok=nz(x['company']).split()[0] in tn or nz(x['company']) in nz(h.url),title_ok=True,location_ok=loc_ok(x,[],t),season_ok=season_ok(x,x['title'],t,full=True),deadline_ok=dl_ok(x,{},t))
                else: r['note']='page is a script-rendered shell; fields not readable without a browser'
            except Blocked as e: r.update(live=None,note='robots.txt disallows; not fetched')
            except Exception as e: r.update(live=None,note=f'{type(e).__name__}: {str(e)[:100]}')
        rows.append(r)
    F=['company_ok','title_ok','location_ok','season_ok','deadline_ok']
    chk=[r for r in rows if r.get('live') and 'title_ok' in r]
    acc={f:{'ok':sum(bool(r[f]) for r in chk),'checked':len(chk),'pct':round(100*sum(bool(r[f]) for r in chk)/max(1,len(chk)),1)} for f in F}
    liv=[r for r in rows if r.get('live') is not None]
    out={'run_at':datetime.datetime.now(datetime.timezone.utc).isoformat()[:19]+'Z','seed':seed,'sample':len(rows),'fields':acc,
         'live':{'checked':len(liv),'live':sum(1 for r in liv if r['live']),'dead_shown_open':sum(1 for r in liv if not r['live']),'unreadable':len(rows)-len(liv)},
         'failures':[r for r in rows if r.get('live') is False or any(f in r and not r[f] for f in F)],'rows':rows}
    json.dump(out,open(os.path.join(ROOT,'qa-v13.3/data-audit'+('-after' if rebuild else '')+'.json'),'w'),indent=1,default=str)
    print(json.dumps({k:out[k] for k in('sample','fields','live')},indent=1));print('failures',len(out['failures']))
if __name__=='__main__': main(133,100,'--after' in sys.argv)
