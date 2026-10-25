"""Polite HTTP: per-host rate limits, robots.txt checks, retries, identifying user agent."""
import time,threading,urllib.robotparser,urllib.parse,json,logging,os,hashlib
import requests
UA='InternshipRadarBot/1.0 (+https://tyfaucher24-ops.github.io/internship-radar/; free student internship index)'
S=requests.Session();S.headers.update({'User-Agent':UA,'Accept':'application/json, text/html;q=0.9'})
_lock=threading.Lock();_next={};_robots={};_hostlock={}
DELAY={'default':1.0,'boards-api.greenhouse.io':0.35,'api.lever.co':0.35,'api.ashbyhq.com':0.35,'api.smartrecruiters.com':0.35,'apply.workable.com':1.0,'careers.twosigma.com':3.0,'morganstanley.tal.net':10.0,'evercore.tal.net':10.0}
log=logging.getLogger('net')
def _wait(host):
    d=DELAY.get(host,DELAY['default'] if 'myworkdayjobs' not in host else 0.6)
    with _lock:
        lk=_hostlock.setdefault(host,threading.Lock())
    lk.acquire()
    try:
        now=time.time();t=_next.get(host,0)
        if t>now: time.sleep(t-now)
        _next[host]=time.time()+d
    finally: lk.release()
def allowed(url):
    p=urllib.parse.urlsplit(url);base=f'{p.scheme}://{p.netloc}'
    with _lock: rp=_robots.get(base)
    if rp is None:
        rp=urllib.robotparser.RobotFileParser()
        try:
            r=S.get(base+'/robots.txt',timeout=10)
            if r.status_code>=400: rp.parse([])  # no robots file = allowed
            else: rp.parse(r.text.splitlines())
        except Exception: rp.parse([])
        with _lock: _robots[base]=rp
    return rp.can_fetch(UA,url)
class Blocked(Exception): pass
# V15 addendum 2: conditional requests. When COND_DIR is set (the 5-minute incremental sync), GETs send
# If-None-Match / If-Modified-Since from the last response; a 304 replays the cached body, so unchanged boards cost one tiny request.
COND_DIR=os.environ.get('RADAR_COND_DIR');COND_STATS={'sent':0,'not_modified':0}
class _Cached:
    def __init__(s,url,body,headers):s.url=url;s.status_code=200;s.content=body.encode('utf-8');s.text=body;s.headers=headers;s.from_cache=True
    def json(s):return json.loads(s.text)
    def raise_for_status(s):pass
def _cpath(url):return os.path.join(COND_DIR,hashlib.sha1(url.encode()).hexdigest()+'.json')
def _cond_headers(url):
    try:c=json.load(open(_cpath(url)))
    except Exception:return {},None
    h={}
    if c.get('etag'):h['If-None-Match']=c['etag']
    if c.get('lm'):h['If-Modified-Since']=c['lm']
    return h,c
def _cond_store(url,r):
    et,lm=r.headers.get('ETag'),r.headers.get('Last-Modified')
    if not(et or lm):return
    try:
        os.makedirs(COND_DIR,exist_ok=True);json.dump({'etag':et,'lm':lm,'body':r.text,'ct':r.headers.get('Content-Type','')},open(_cpath(url),'w'))
    except Exception:pass
def fetch(url,method='GET',json_body=None,timeout=25,tries=3,check_robots=True,headers=None,allow_404=False):
    if check_robots and not allowed(url): raise Blocked('robots.txt disallows '+url)
    host=urllib.parse.urlsplit(url).netloc
    for i in range(tries):
        _wait(host)
        cond=COND_DIR and method=='GET' and json_body is None
        hh=dict(headers or {});cc=None
        if cond:
            ch,cc=_cond_headers(url);hh.update(ch)
            if ch:COND_STATS['sent']+=1
        try:
            r=S.request(method,url,json=json_body,timeout=timeout,headers=hh or None)
            if r.status_code==304 and cc:
                COND_STATS['not_modified']+=1;return _Cached(url,cc['body'],{'Content-Type':cc.get('ct','')})
            if r.status_code==429 or r.status_code>=500:
                ra=r.headers.get('Retry-After');time.sleep(min(60,int(ra)) if ra and ra.isdigit() else 2**i*3);continue
            if allow_404 and r.status_code in (404,410): return r
            r.raise_for_status()
            if cond:_cond_store(url,r)
            return r
        except requests.HTTPError: raise
        except Exception as e:
            if i==tries-1: raise
            time.sleep(2**i*2)
    raise RuntimeError(f'gave up on {url}')
