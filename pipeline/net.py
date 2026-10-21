"""Polite HTTP: per-host rate limits, robots.txt checks, retries, identifying user agent."""
import time,threading,urllib.robotparser,urllib.parse,json,logging
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
def fetch(url,method='GET',json_body=None,timeout=25,tries=3,check_robots=True,headers=None,allow_404=False):
    if check_robots and not allowed(url): raise Blocked('robots.txt disallows '+url)
    host=urllib.parse.urlsplit(url).netloc
    for i in range(tries):
        _wait(host)
        try:
            r=S.request(method,url,json=json_body,timeout=timeout,headers=headers)
            if r.status_code==429 or r.status_code>=500:
                time.sleep(2**i*3);continue
            if allow_404 and r.status_code in (404,410): return r
            r.raise_for_status();return r
        except requests.HTTPError: raise
        except Exception as e:
            if i==tries-1: raise
            time.sleep(2**i*2)
    raise RuntimeError(f'gave up on {url}')
