"""V21 Part 5: a short "About <Company>" blurb per company with at least one listing, cached in data/about/{0..15}.json.
Sources, in order (all free, public, robots.txt respected through pipeline.net):
  1. the employer's own ATS board intro (Greenhouse board API `content`), source 'board'
  2. the meta description of the employer's careers page from the registry (careers_url), source 'careers'
  3. the opening sentences of the company's English Wikipedia article (/wiki/<Title>, only when the page is a company
     article: infobox with Industry/Company type), source 'wikipedia' with a link for attribution.
A miss is cached too (text None) so it is retried only after REFRESH_DAYS. Entries are never written by hand.
Seed: pipeline/seeds/company_about.json (a pull made with this same code) fills the cache on a fresh data dir.
usage: python -m pipeline.about [--budget N] [--minutes M]"""
import json,os,re,sys,html,time,datetime,urllib.parse,argparse
from . import net
from .norm import clean_html
ROOT=os.path.join(os.path.dirname(__file__),'..');D=os.path.join(ROOT,'data');AD=os.path.join(D,'about')
SEED=os.path.join(os.path.dirname(__file__),'seeds','company_about.json')
NSH=16;REFRESH_DAYS=30
net.DELAY.update({'en.wikipedia.org':1.0})
def akey(name):
    return re.sub(r'[^a-z0-9]','',(name or '').lower().replace('&','and'))
def shard(k):  # same function in app.js (aboutShard)
    return sum(ord(c) for c in k)%NSH
def sentences(t,n=3,maxlen=420):
    """first whole sentences up to maxlen (never a cut-off sentence; a single over-long sentence is cut at a word with an ellipsis)"""
    t=re.sub(r'\s+',' ',t or '').strip()
    parts=re.split(r'(?<=[a-z0-9)”"][.!?])\s+(?=[A-Z0-9"“])',t);out=''
    parts=[p for p in parts if re.search(r'[.!?]["”)]?$',p)] or parts[:1]  # drop a trailing fragment
    for p in parts[:n]:
        if out and len(out)+1+len(p)>maxlen: break
        out=(out+' '+p).strip()
    if len(out)>maxlen: out=out[:maxlen].rsplit(' ',1)[0].rstrip(',;:')+'…'
    return out
def _meta_desc(h):
    m=re.search(r'<meta[^>]+(?:name|property)=["\'](?:og:)?description["\'][^>]*content=["\']([^"\']{40,600})',h,re.I) or re.search(r'<meta[^>]+content=["\']([^"\']{40,600})["\'][^>]+(?:name|property)=["\'](?:og:)?description',h,re.I)
    return html.unescape(m.group(1)).strip() if m else None
def wiki_first_para(h):
    body=h.split('id="mw-content-text"',1)[-1]
    for p in re.findall(r'<p\b[^>]*>(.*?)</p>',body,re.S):
        t=re.sub(r'<sup[^>]*>.*?</sup>','',p,flags=re.S);t=clean_html(t);t=re.sub(r'\[\d+\]|\[[a-z]\]','',t);t=re.sub(r'\s*\([^()]*/[^()]*/[^()]*\)','',t);t=re.sub(r'\(\s*[;,]?\s*\)','',t).strip()
        if len(t)>60: return t
    return None
def _wiki_page(title):
    u='https://en.wikipedia.org/wiki/'+urllib.parse.quote(title.strip().replace(' ','_'),safe='_(),\'')
    try: r=net.fetch(u,timeout=20,tries=1,allow_404=True)
    except Exception: return None,None
    return (r.text,r.url) if r.status_code==200 else (None,None)
def from_wikipedia(name):
    """only a company article (infobox class ib-company), never a disambiguation page or a same-named thing"""
    for title in (name,name+' (company)',name+' Corporation'):
        h,url=_wiki_page(title)
        if not h or 'id="disambigbox"' in h or '"Disambiguation pages"' in h[:50000] or 'ib-company' not in h: continue
        t=wiki_first_para(h)
        # the article must name the company it was looked up for (guards against a redirect to something else)
        if not t or akey(name)[:6] not in akey(t[:200]): continue
        return {'text':sentences(t),'source':'wikipedia','url':url}
    return None
def from_greenhouse(slug):
    try: r=net.fetch(f'https://boards-api.greenhouse.io/v1/boards/{slug}',timeout=20,tries=1,allow_404=True)
    except Exception: return None
    if r.status_code!=200: return None
    t=clean_html((r.json() or {}).get('content') or '')
    if len(t)<60: return None
    return {'text':sentences(t),'source':'board','url':f'https://boards.greenhouse.io/{slug}'}
def from_careers(url):
    if not url: return None
    try: r=net.fetch(url,timeout=20,tries=1,allow_404=True)
    except Exception: return None
    if r.status_code!=200 or 'html' not in r.headers.get('Content-Type','html'): return None
    d=_meta_desc(r.text)
    if not d or len(d)<60: return None
    return {'text':sentences(d),'source':'careers','url':r.url}
def lookup(name,regrows):
    for row in regrows:
        if row.get('ats')=='greenhouse' and row.get('slug'):
            a=from_greenhouse(row['slug'])
            if a: return a
    for row in regrows:
        a=from_careers(row.get('careers_url'))
        if a: return a
    return from_wikipedia(name)
def load():
    C={}
    for i in range(NSH):
        try: C.update(json.load(open(os.path.join(AD,f'{i}.json'))))
        except Exception: pass
    if os.path.exists(SEED):
        for k,v in json.load(open(SEED)).items(): C.setdefault(k,v)
    return C
def save(C):
    os.makedirs(AD,exist_ok=True);S=[{} for _ in range(NSH)]
    for k,v in C.items(): S[shard(k)][k]=v
    for i,s in enumerate(S): json.dump(s,open(os.path.join(AD,f'{i}.json'),'w'),separators=(',',':'),ensure_ascii=False,sort_keys=True)
def companies_with_listings():
    L=json.load(open(os.path.join(D,'listings.json'))).get('listings',[])
    names={}
    for r in L:
        if r.get('status') in ('open','upcoming') and r.get('company'): names.setdefault(akey(r['company']),r['company'])
    return names
def registry():
    import csv
    R={}
    try:
        for r in csv.DictReader(open(os.path.join(D,'companies.csv'))): R.setdefault(akey(r['name']),[]).append(r)
    except Exception: pass
    return R
def run(budget=200,minutes=8,now=None):
    now=now or datetime.datetime.now(datetime.timezone.utc);C=load();R=registry();names=companies_with_listings()
    stale=lambda e:not e or (now-datetime.datetime.fromisoformat(e['at'])).days>=REFRESH_DAYS
    todo=[(k,n) for k,n in names.items() if stale(C.get(k))]
    todo.sort(key=lambda kn:(kn[0] in C,kn[0]))  # never-tried first
    t0=time.time();done=0;hit=0
    for k,n in todo[:budget]:
        if time.time()-t0>minutes*60: break
        a=lookup(n,R.get(k,[]))
        C[k]=dict(a or {'text':None,'source':None},name=n,at=now.isoformat(timespec='seconds'));done+=1;hit+=bool(a)
    save(C)
    have=sum(1 for k in names if (C.get(k) or {}).get('text'))
    print(json.dumps({'about_tried':done,'about_found':hit,'companies':len(names),'companies_with_about':have}),file=sys.stderr)
    return {'tried':done,'found':hit,'companies':len(names),'with_about':have}
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--budget',type=int,default=200);a.add_argument('--minutes',type=float,default=8);x=a.parse_args()
    run(x.budget,x.minutes)
