"""V15 live checks: Live badge (fresh/stale with mocked meta), no 'ago'/timestamps, 5-min refresh without layout jump,
stale-sync admin log, feedback <= 2 s, axe AA both themes at 1440/1280/768/390, screenshots.
Run: python3 tests/test_v15_live.py URL [screens_dir]"""
import sys,re,json,time,datetime,os
from playwright.sync_api import sync_playwright
URL=sys.argv[1];OUT=sys.argv[2] if len(sys.argv)>2 else None
AXE=open('/workspace/t/axe.min.js').read();ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROF=json.load(open(ROOT+'/tests/grader/v15_profiles.json'));PROF.pop('_note',None);PR=PROF[sorted(PROF)[0]]
R=[]
def ck(n,c,info=''):R.append((n,bool(c)));print(('PASS' if c else 'FAIL'),n,info if not c else '',flush=True)
def wf(p,js,t=60):
    e=time.time()+t
    while time.time()<e:
        try:
            if p.evaluate(js):return True
        except Exception:pass
        time.sleep(.2)
    raise Exception('timeout '+js)
def theme(p,d):p.evaluate(f"document.documentElement.classList.toggle('dark',{str(d).lower()})")
def axe(p,tag):
    if not p.evaluate("()=>!!window.axe"):p.add_script_tag(content=AXE)
    v=p.evaluate("async()=>{const r=await axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']});return r.violations.map(v=>v.id+':'+v.nodes.length+':'+v.nodes[0].target)}")
    ck('axe '+tag,not v,v)
iso=lambda m:(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(minutes=m)).strftime('%Y-%m-%dT%H:%M:%SZ')
def open_(br,meta_age=None,w=1440):
    p=br.new_page(bypass_csp=True,viewport={'width':w,'height':900 if w>390 else 844})
    if meta_age is not None:
        def h(route):
            r=route.fetch();m=r.json();m['updated']=iso(meta_age);route.fulfill(response=r,body=json.dumps(m),headers={**r.headers,'content-type':'application/json'})
        p.route(re.compile(r'.*/data/meta\.json.*'),h)
    p.goto(URL);wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0");p.evaluate("()=>window.__introEnd&&__introEnd(false)");p.wait_for_timeout(1200);return p
NOAGO=re.compile(r'\b(\d+\s*(min|mins|minutes|hours?|hrs?|days?)\s+ago|just now|updated\s+\d)',re.I)
with sync_playwright() as pw:
    br=pw.chromium.launch()
    p=open_(br,5)
    ck('Live badge shown when last sync 5 min old',p.evaluate("()=>[...document.querySelectorAll('.live-b')].some(e=>e.offsetParent&&/Live/.test(e.textContent))"))
    body=p.evaluate("()=>document.body.innerText");ck('no "X ago" / sync timestamps in UI',not NOAGO.search(body),NOAGO.search(body) and NOAGO.search(body).group(0))
    # refresh: forced liveRefresh keeps scroll and card heights (no layout jump)
    p.evaluate("()=>window.scrollTo(0,1400)");p.wait_for_timeout(400)
    b=p.evaluate("()=>{const c=[...document.querySelectorAll('[data-id]')].find(e=>e.getBoundingClientRect().top>0);return c?{id:c.dataset.id,top:c.getBoundingClientRect().top,y:scrollY}:null}")
    p.evaluate("()=>{META.updated='2000-01-01T00:00:00Z'}");r=p.evaluate("()=>liveRefresh(true)");p.wait_for_timeout(800)
    a=p.evaluate("(id)=>{const c=document.querySelector(`[data-id=\"${CSS.escape(id)}\"]`);return c?{top:c.getBoundingClientRect().top,y:scrollY}:null}",b['id'] if b else '')
    ck('5-min refresh ran',r is True,r);ck('refresh: no layout jump (anchor card moves <= 2px)',b and a and abs(a['top']-b['top'])<=2 and abs(a['y']-b['y'])<=2,(b,a))
    ck('refresh interval is 5 minutes',p.evaluate("()=>LIVE_MS===300000"))
    if OUT:
        for d in (False,True):theme(p,d);p.evaluate("()=>scrollTo(0,0)");p.wait_for_timeout(300);p.screenshot(path=f"{OUT}/v15-find-live-1440-{'dark' if d else 'light'}.png")
    p.close()
    p=open_(br,75)
    ck('Live badge hidden when last sync 75 min old',not p.evaluate("()=>[...document.querySelectorAll('.live-b')].some(e=>e.offsetParent)"))
    body=p.evaluate("()=>document.body.innerText");ck('stale: no timestamp shown instead',not NOAGO.search(body))
    log=p.evaluate("()=>JSON.parse(localStorage.getItem('liveStaleLog')||'[]')");ck('stale sync written to admin log',len(log)>=1,log)
    if OUT:p.screenshot(path=f'{OUT}/v15-find-stale-1440-light.png')
    p.close()
    # feedback page <= 2 s with a full profile
    p=open_(br,5)
    p.evaluate("(pr)=>{Store.set('profile',pr);profile=pr}",PR);p.reload();wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0");p.evaluate("()=>window.__introEnd&&__introEnd(false)")
    wf(p,"()=>typeof MSCORE!=='undefined'&&MSCORE.size>0",90)
    ts=[]
    for i in range(3):
        p.evaluate("()=>{const e=document.getElementById('t-feedback');e.querySelectorAll('.fx-card').forEach(c=>c.remove());go('db')}");p.wait_for_timeout(300)
        t=time.time();p.evaluate("()=>go('feedback')");wf(p,"()=>document.querySelector('#t-feedback .fx-card h2')&&!document.querySelector('#t-feedback .fx-empty')",20);ts.append(time.time()-t)
    ck(f'feedback renders <= 2 s (median {sorted(ts)[1]:.2f}s)',sorted(ts)[1]<=2.0,ts)
    for w in (1440,1280,768,390):
        p.set_viewport_size({'width':w,'height':900 if w>390 else 844})
        for pg in ('db','feedback'):
            p.evaluate(f"()=>go('{pg}')");p.wait_for_timeout(900)
            for d in (False,True):
                theme(p,d);p.wait_for_timeout(250);axe(p,f'{pg} {w} {"dark" if d else "light"}')
                if OUT and w in (1440,390):p.screenshot(path=f"{OUT}/v15-{'find' if pg=='db' else 'feedback'}-{w}-{'dark' if d else 'light'}.png")
        theme(p,False)
    p.close();br.close()
n=sum(1 for _,c in R if c);print(f'{n}/{len(R)} passed');sys.exit(0 if n==len(R) else 1)
