"""V11 checks: ticker shows only real sync events, hides with no data, pauses, reduced motion, market counts, masthead, leftovers."""
import sys,json
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/'
R=[];ok=lambda n,c,d='':R.append((n,bool(c),d))
with sync_playwright() as p:
    b=p.chromium.launch();E=[]
    def page(w=1440,**kw):
        pg=b.new_page(viewport={'width':w,'height':844 if w<600 else 900},**kw)
        pg.on('pageerror',lambda e:E.append(str(e)));pg.on('console',lambda m: m.type=='error' and E.append(m.text));return pg
    pg=page()
    ch=pg.request.get(B+'data/changes.json').json()
    pg.goto(B+'#find');pg.wait_for_selector('.card');pg.wait_for_timeout(4500)
    ids=pg.evaluate("[...document.querySelectorAll('.tk-i:not([aria-hidden])')].map(e=>e.dataset.tk)")
    evid={e['id'] for e in ch['events']}
    ok('Ticker is shown when the sync has real events',len(ids)>0,len(ids))
    ok('Every ticker item is a real event from data/changes.json',ids and all(i in evid for i in ids))
    ok('Each ticker item shows a timestamp',pg.locator('.tk-i .tk-tm').count()>=len(ids))
    pg.hover('#ticker');ok('Ticker pauses on hover',pg.evaluate("getComputedStyle(document.querySelector('.tk-track')).animationPlayState")=='paused')
    pg.evaluate("document.querySelector('.tk-i:not([disabled])').click()");pg.wait_for_timeout(800);ok('Clicking a ticker item opens the listing',not pg.evaluate("document.getElementById('drawer').hidden"))
    pg.keyboard.press('Escape');pg.wait_for_timeout(300);pg.click('#tkMarket');pg.wait_for_timeout(800)
    st=pg.inner_text('.mk-stats');c=ch.get('counts',{})
    ok('Market Activity counts match the sync diff',all(str(c[k]) in st for k in ('new','closed','deadline')),st.replace('\n',' '))
    pg.keyboard.press('Escape')
    ok('Masthead uses the display serif',"Playfair" in pg.evaluate("getComputedStyle(document.querySelector('.mast-h')).fontFamily"))
    ok('Masthead dateline shows the date and edition',('edition' in pg.inner_text('#mastDate').lower()))
    pg.keyboard.press('Control+k');pg.wait_for_timeout(200);ok('Ctrl/Cmd+K focuses search',pg.evaluate('document.activeElement.id')=='q')
    pg.goto('about:blank');pg.goto(B+'#profile');pg.wait_for_timeout(2000)
    ok('Profile hints are visible',pg.evaluate("[...document.querySelectorAll('#t-profile .pf-help')].filter(e=>e.getBoundingClientRect().width>20).length")>=5)
    pg.close()
    pg=page()
    pg.route('**/data/changes.json*',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps({'updated':'2026-01-01T00:00:00Z','events':[]})))
    pg.goto(B+'#find');pg.wait_for_selector('.card');pg.wait_for_timeout(4500);ok('No real events -> no ticker',pg.evaluate("document.getElementById('ticker').hidden"))
    pg.close();pg=page()
    pg.route('**/data/changes.json*',lambda r:r.fulfill(status=404,body=''))
    pg.goto(B+'#find');pg.wait_for_selector('.card');pg.wait_for_timeout(4500);ok('Missing events file -> no ticker',pg.evaluate("document.getElementById('ticker').hidden"));pg.close();E[:]=[e for e in E if '404' not in e]
    pg=page(reduced_motion='reduce');pg.goto(B+'#find');pg.wait_for_selector('.card');pg.wait_for_timeout(4500)
    ok('Reduced motion: ticker does not scroll by itself',pg.evaluate("getComputedStyle(document.querySelector('.tk-track')).animationName")=='none');pg.close()
    pg=page(390);pg.goto(B+'#find');pg.wait_for_selector('.card');pg.wait_for_timeout(4500)
    ok('390: no horizontal scroll with masthead + ticker',pg.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    h=pg.evaluate("document.getElementById('sort').getBoundingClientRect().height");ok('390: Sort dropdown is compact',h<=36,h)
    pg.close()
    pg=page();pg.goto(B+'#find');pg.wait_for_selector('.card');pg.wait_for_timeout(1500);pg.locator('.card .btn-save').first.click()
    pg.goto('about:blank');pg.goto(B+'#tracker');pg.wait_for_timeout(2000)
    pg.evaluate("(()=>{const k=Object.keys(localStorage).find(k=>k.includes('tracker'));const a=JSON.parse(localStorage.getItem(k));a[0].status='Offer';localStorage.setItem(k,JSON.stringify(a))})()")
    pg.goto('about:blank');pg.goto(B+'#tracker');pg.wait_for_timeout(2000);ok('Tracker shows an Offer stamp',pg.locator('.offer-stamp').count()==1)
    ok('Zero console errors',not E,E[:3])
P=sum(1 for r in R if r[1]);print('\n'.join(('PASS' if c else 'FAIL')+' | '+n+' | '+str(d) for n,c,d in R));print(json.dumps({'pass':P,'fail':len(R)-P}))
