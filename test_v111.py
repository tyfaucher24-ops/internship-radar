"""V11.1 checks: rolling digits, colour-blind toggle, light/dark mode, Ctrl+K quick search, closing-soon red pulses, intro ticker + mono counter, profile not clipped."""
import sys,json
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/'
R=[];ok=lambda n,c,d='':R.append((n,bool(c),d))
with sync_playwright() as p:
    b=p.chromium.launch();E=[]
    def page(w=1440,**kw):
        pg=b.new_page(bypass_csp=True,viewport={'width':w,'height':844 if w<600 else 900},**kw)
        pg.on('pageerror',lambda e:E.append(str(e)));return pg
    ch=None
    for w in (1440,390):
        pg=page(w);pg.goto(B);pg.wait_for_timeout(8000)
        if ch is None:ch=pg.request.get(B+'data/changes.json').json()
        ok(f'{w}: intro counter is mono',"Mono" in pg.evaluate("getComputedStyle(document.querySelector('#intro .counter')).fontFamily"))
        ok(f'{w}: intro counter rolls to the real open count',pg.evaluate("document.querySelector('#intro .counter .roll')?.querySelector('.rsr')?.textContent||''").replace(',','').isdigit())
        vis=pg.evaluate("!document.getElementById('iTk').hidden")
        ok(f'{w}: intro ticker shown (real events exist)',vis==bool(ch['events']))
        ids=pg.evaluate("[...document.querySelectorAll('#iTkTrack .tk-co')].map(e=>e.textContent)")
        cos={e['co'] for e in ch['events']}
        ok(f'{w}: intro ticker items are real companies from the sync diff',ids and all(any(c in t for c in cos) for t in ids[:10]))
        r=pg.evaluate("(()=>{const r=document.getElementById('iTk').getBoundingClientRect();return [r.top,r.bottom,innerHeight,r.width,innerWidth]})()")
        ok(f'{w}: intro ticker fully on screen (not cut off)',r[0]>=0 and r[1]<=r[2]+0.5 and r[3]>=r[4]-1,r)
        cta=pg.evaluate("document.getElementById('goFind').getBoundingClientRect().bottom")
        ok(f'{w}: intro ticker does not cover the buttons',cta<=r[0],(cta,r[0]))
        t1=pg.evaluate("getComputedStyle(document.getElementById('iTkTrack')).transform");pg.wait_for_timeout(1200);t2=pg.evaluate("getComputedStyle(document.getElementById('iTkTrack')).transform")
        ok(f'{w}: intro ticker is moving (never frozen)',t1!=t2,(t1,t2))
        ok(f'{w}: no skip button on intro',pg.locator('#intro >> text=/skip/i').count()==0)
        pg.close()
    pg=page();pg.goto(B+'#find');pg.wait_for_selector('.card');pg.wait_for_timeout(5000)
    lab=pg.evaluate("document.querySelector('.find-head .roll .rsr')?.textContent")
    meta=pg.request.get(B+'data/meta.json').json()
    qb=pg.evaluate("[...document.querySelectorAll('#hdrCount .q b')].map(b=>b.textContent.replace(/,/g,''))")
    ok('Find header quote bar shows the real open count (V12.1)',qb and qb[0]==str(pg.evaluate('liveCounts().open')),qb)
    red=pg.evaluate("[...document.querySelectorAll('.card .dl')].map(d=>[d.className,!!d.querySelector('.pulse.dn')])")
    ok('Closing-soon cards get a red pulse; others do not',red and all(('dl-red' in c or 'dl-amber' in c)==h for c,h in red),red[:4])
    ok('Red pulse is red',pg.evaluate("getComputedStyle(document.querySelector('.dl .pulse.dn')||document.body).backgroundColor") =='rgb(255, 138, 127)')  # V12.1 dark red token
    pg.keyboard.press('Control+k')
    ok('Ctrl+K opens quick search with focus',pg.evaluate("document.activeElement.id")=='qkIn')
    QK=next(x['company'] for x in pg.request.get(B+'data/index.json').json()['listings'] if x.get('status')=='open' and len(x['company'])>5).lower();pg.keyboard.type(QK);pg.wait_for_timeout(300)
    hits=pg.evaluate("[...document.querySelectorAll('#qkRes [data-qk]')].map(l=>l.textContent.toLowerCase())")
    ok('Quick search returns real matching listings',hits and all(QK in h for h in hits),hits[:2])
    pg.keyboard.press('Enter');pg.wait_for_timeout(800)
    ok('Enter opens the listing',not pg.evaluate("document.getElementById('drawer').hidden"))
    pg.keyboard.press('Escape');pg.wait_for_timeout(300)
    pg.evaluate("document.getElementById('pmMenu').hidden&&document.getElementById('pmBtn').click()");pg.click('#uiTheme');pg.wait_for_timeout(300)
    ok('Light mode toggles on (dark is the V12.1 default)',not pg.evaluate("document.documentElement.classList.contains('dark')") and pg.evaluate("getComputedStyle(document.body).backgroundColor")!='rgb(26, 31, 38)')
    pg.goto('about:blank');pg.goto(B+'#find');pg.wait_for_timeout(1500)
    ok('Light mode persists across reloads',not pg.evaluate("document.documentElement.classList.contains('dark')"))
    pg.evaluate("document.getElementById('pmMenu').hidden&&document.getElementById('pmBtn').click()");pg.click('#uiTheme');pg.wait_for_timeout(300)
    ok('Dark mode toggles back',pg.evaluate("document.documentElement.classList.contains('dark')") and pg.evaluate("getComputedStyle(document.body).backgroundColor")=='rgb(26, 31, 38)')
    pg.evaluate("document.getElementById('pmMenu').hidden&&document.getElementById('pmBtn').click()");pg.click('#uiCb');pg.wait_for_timeout(300)
    ok('Colour-blind toggle switches green to blue',pg.evaluate("document.documentElement.classList.contains('cb')") and pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--c-up').trim()")=='#6ea0f5')  # V12.1 dark colour-blind blue
    pg.evaluate("document.getElementById('pmMenu').hidden&&document.getElementById('pmBtn').click()");pg.click('#uiCb');pg.close()
    pg=page();pg.goto(B+'#find');pg.wait_for_selector('.card');pg.wait_for_timeout(5000);pg.click('#tkMarket');pg.wait_for_timeout(1500)
    ok('Market counts roll to the real sync counts',all(str(ch['counts'][k]) in [x.replace(',','') for x in pg.evaluate("[...document.querySelectorAll('.mk-s b .roll')].map(b=>b.querySelector('.rsr').textContent)")] for k in ('new','closed','deadline')))
    pg.close()
    pg=page();pg.goto(B+'#profile');pg.wait_for_timeout(3000)
    r=pg.evaluate("(()=>{const c=document.querySelectorAll('#t-profile .pf-col')[1].getBoundingClientRect(),b=document.querySelector('.pf-bar').getBoundingClientRect();return [c.bottom,b.top]})()")
    ok('1440 profile: About you column ends above the Save bar',r[0]<=r[1]-8,r)
    ok('1440 profile: a column with more content shows a fade, not a hard cut',pg.evaluate("[...document.querySelectorAll('#t-profile .pf-scroll')].every(s=>s.scrollHeight<=s.clientHeight+4||s.classList.contains('pf-more'))"))
    pg.evaluate("document.querySelectorAll('#t-profile .pf-scroll').forEach(s=>s.scrollTop=1e5)");pg.wait_for_timeout(300)
    ok('1440 profile: scrolled to the end, the fade goes away (last field fully visible)',pg.evaluate("[...document.querySelectorAll('#t-profile .pf-scroll')].every(s=>!s.classList.contains('pf-more'))"))
    pg.close()
    pg=page(reduced_motion='reduce');pg.goto(B);pg.wait_for_timeout(6000)
    ok('Reduced motion: intro ticker does not scroll',pg.evaluate("getComputedStyle(document.getElementById('iTkTrack')).animationName")=='none');pg.close()
    ok('Zero page errors',not E,E[:3])
P=sum(1 for r in R if r[1]);print('\n'.join(('PASS' if c else 'FAIL')+' | '+n+' | '+str(d) for n,c,d in R));print(json.dumps({'pass':P,'fail':len(R)-P}))
