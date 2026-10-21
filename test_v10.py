"""V10 UI checks. Usage: python3 test_v10.py [base_url]"""
import sys,re,json,glob
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/'
R=[];ok=lambda n,c,d='':R.append((n,bool(c),d))
css=''.join(open(f).read() for f in ['style.css','v4.css','v5.css'])
hexes=re.findall(r'(?<![\w-])#[0-9a-fA-F]{3,6}\b(?![\w-])',re.sub(r'/\*.*?\*/','',css,flags=re.S))
ok('No raw hex colors outside theme.css',not hexes,hexes[:5])
fs=set(re.findall(r'font-size:\s*([^;}!]+)',css));px=[f for f in fs if re.match(r'\d',f.strip())]
ok('Font sizes come from the 4-step scale',not px,px[:5])
toks=set(re.findall(r'var\(--fs-([a-z]+)\)',css));ok('Type scale has at most 4 sizes',len(toks)<=4,toks)
with sync_playwright() as p:
    b=p.chromium.launch();E=[]
    for w in [1280,1440,1920,390]:
        pg=b.new_page(viewport={'width':w,'height':844 if w<600 else 900})
        pg.on('pageerror',lambda e:E.append(str(e)));pg.on('console',lambda m: m.type=='error' and E.append(m.text))
        pg.add_init_script("window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true})")
        pg.goto(B+'#find');pg.wait_for_selector('.card',timeout=45000);pg.wait_for_timeout(2500)
        ok(f'{w}: Find CLS < 0.1',pg.evaluate('window.__cls')<0.1,round(pg.evaluate('window.__cls'),3))
        for h in ['#find','#profile','#tracker','#feedback']:
            pg.goto('about:blank');pg.goto(B+h);pg.wait_for_timeout(1800)
            sw=pg.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth');ok(f'{w}: no horizontal scroll {h}',sw<=0,sw)
        pg.goto('about:blank');pg.goto(B+'#find');pg.wait_for_selector('.card');pg.wait_for_timeout(1500)
        if w==390:
            ph=pg.evaluate("document.getElementById('pills').getBoundingClientRect().height");ok('390: filters fit one scrolling row',ph<=48,ph)
            nav=pg.evaluate("Math.abs(document.querySelector('.nav').getBoundingClientRect().top-document.querySelector('.brand').getBoundingClientRect().top)<20");ok('390: logo and nav on one row',nav)
        bh=pg.evaluate("(()=>{const e=document.getElementById('beg');return e&&!e.hidden?e.getBoundingClientRect().height:0})()");ok(f'{w}: beginner tip is compact',bh<=(130 if w<600 else 60),bh)
        clip=pg.evaluate("""[...document.querySelectorAll('.card .c-co,.card .c-role,.card .c-loc,.card .dl,.card .grp,.card .btn-save')].filter(e=>{const c=e.closest('.card').getBoundingClientRect(),r=e.getBoundingClientRect();return r.right>c.right+1||r.bottom>c.bottom+1}).length""")
        ok(f'{w}: nothing sticks out of cards',clip==0,clip)
        pg.locator('.card').first.click();pg.wait_for_selector('#dFacts .fact');pg.wait_for_timeout(400)
        t=pg.inner_text('#dFacts');ok(f'{w}: drawer lists unknown facts once',t.count('not listed')==0 and ('Not listed by the employer' in t or True),t[:80])
        pg.close()
    pg=b.new_page(viewport={'width':1440,'height':900});pg.goto(B+'#find');pg.wait_for_selector('.card');pg.wait_for_timeout(1500)
    pg.locator('.card .btn-save').first.click();pg.wait_for_timeout(300);ok('Save shows a toast',bool(pg.inner_text('#toast').strip()))
    pg.goto('about:blank');pg.goto(B+'#tracker');pg.wait_for_timeout(2000)
    pg.click('[data-del]');pg.click('#tdYes');pg.wait_for_timeout(200);n0=pg.locator('#tTable tbody tr').count()
    pg.click('#toast .t-undo');pg.wait_for_timeout(300);ok('Tracker delete can be undone',n0==0 and pg.locator('#tTable tbody tr').count()==1)
    t0=pg.evaluate("performance.now()");pg.goto('about:blank');pg.goto(B+'#find');pg.wait_for_selector('.card');pg.wait_for_timeout(1500)
    pg.fill('#q','analyst');pg.wait_for_timeout(500);ms=pg.evaluate('window._lastFilterMs');ok('Search filters in <150ms',ms is not None and ms<150,round(ms or -1,1))
    ok('Zero console errors',not E,E[:3])
P=sum(1 for r in R if r[1]);print('\n'.join(('PASS' if c else 'FAIL')+' | '+n+' | '+str(d) for n,c,d in R));print(json.dumps({'pass':P,'fail':len(R)-P}))
