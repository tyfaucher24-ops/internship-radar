from playwright.sync_api import sync_playwright
import sys,time
U=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
SH=sys.argv[2] if len(sys.argv)>2 else 'screenshots/v3-'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
with sync_playwright() as p:
    b=p.chromium.launch(args=ARGS);E=[]
    def watch(pg,t):pg.on('pageerror',lambda e:E.append(t+' '+str(e)));pg.on('console',lambda m:m.type=='error' and E.append(t+' console '+m.text))
    c=b.new_context(viewport={'width':1440,'height':900});pg=c.new_page();watch(pg,'desk')
    pg.goto(U);fcp=pg.evaluate("new Promise(r=>{const f=()=>{const e=performance.getEntriesByName('first-contentful-paint')[0];e?r(e.startTime):setTimeout(f,50)};f()})")
    print('FCP ms',round(fcp))
    pg.wait_for_function("document.getElementById('cY').textContent!=='…'");pg.wait_for_timeout(1000)
    try: pg.wait_for_function("Landing.has3d()",timeout=20000);pg.wait_for_selector('.gdot',timeout=15000)
    except Exception as e: print('no 3d',e)
    print('3d',pg.evaluate('Landing.has3d()'),'dots',pg.locator('.gdot').count(),'counter',pg.inner_text('#counter'))
    pg.wait_for_timeout(2500);pg.screenshot(path=SH+'landing.png')
    d=pg.locator('.gdot').nth(0)
    vis=pg.evaluate("[...document.querySelectorAll('.gdot')].findIndex(e=>{const r=e.getBoundingClientRect();return r.width>0&&getComputedStyle(e.parentElement).visibility!=='hidden'&&e.offsetParent&&r.x>0&&r.y>0&&r.x<innerWidth&&r.y<innerHeight})")
    vis=pg.evaluate("[...document.querySelectorAll('.gdot')].findIndex(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.x>5&&r.y>5&&r.x<innerWidth-5&&r.y<innerHeight-5&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e})")
    if vis>=0:
        pg.locator('.gdot').nth(vis).hover(force=True);pg.wait_for_timeout(200);print('tooltip',pg.inner_text('#tip'))
    else: print('no hoverable dot')
    pg.mouse.move(10,10);pg.evaluate("window.scrollTo(0,900)");pg.wait_for_timeout(1200);pg.screenshot(path=SH+'features.png');pg.evaluate("window.scrollTo(0,0)");pg.wait_for_timeout(300)
    pg.evaluate("window._t0=performance.now();new MutationObserver(()=>{if(document.body.classList.contains('app-mode')&&!window._t1)window._t1=performance.now()-window._t0}).observe(document.body,{attributes:true})");pg.click('#goFind');t0=time.time()
    pg.wait_for_selector('body.app-mode');print('in-page intro ms',round(pg.evaluate('window._t1')))
    s=b.new_page(viewport={'width':1440,'height':900});watch(s,'slow');s.goto(U+'?introSlow=8');s.wait_for_function('Landing.has3d()',timeout=30000);s.wait_for_timeout(2500)
    s.evaluate("window._s=performance.now();Landing.startIntro()")
    for ms,name in [(450,'anim1-rotate'),(800,'anim2-ping'),(1250,'anim3-sweep'),(1900,'anim4-zoom')]:
        s.wait_for_function(f"performance.now()-window._s>={ms*8}",timeout=60000,polling=50);s.screenshot(path=SH+name+'.png')
    s.close()
    pg.wait_for_timeout(800)
    print('tab',pg.evaluate("document.querySelector('.tabs .on').dataset.t"));pg.screenshot(path=SH+'results.png')
    # city click in app-mode via API-equivalent: click a visible dot
    idx=pg.evaluate("[...document.querySelectorAll('.gdot')].findIndex(e=>{const r=e.getBoundingClientRect();if(!(r.width>0&&r.x>5&&r.y>80&&r.x<innerWidth-5&&r.y<innerHeight-5))return false;const t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return t===e})")
    print('clickable dot idx',idx)
    if idx>=0: pg.locator('.gdot').nth(idx).click();pg.wait_for_timeout(300);print('city filter',pg.input_value('#fCity'),pg.inner_text('#count')[:90])
    # skip test
    p2=c.new_page();watch(p2,'skip');p2.goto(U);p2.wait_for_function('Landing.has3d()',timeout=30000);p2.click('#goFind');p2.wait_for_timeout(300);p2.mouse.click(700,200);p2.wait_for_timeout(100);print('skip ->',p2.evaluate('Landing.state()'))
    # matches glow: seed resume & profile then open landing
    p3=c.new_page();watch(p3,'glow');p3.goto(U+'#foryou');p3.wait_for_function('D.length>0');p3.set_input_files('#resume','test-data/TEST_resume_fictional.pdf');p3.wait_for_function("document.getElementById('rstat').textContent.startsWith('Read ')");p3.click('#parsedForm button');p3.wait_for_timeout(500)
    p3.goto(U);p3.wait_for_function("Landing.has3d()",timeout=20000);p3.wait_for_selector('.gdot');p3.wait_for_timeout(1500)
    print('gold',p3.locator('.gdot.strong').count(),'teal',p3.locator('.gdot.real').count());p3.evaluate("Landing.startIntro()");p3.wait_for_timeout(2700);p3.screenshot(path=SH+'matches-glow.png')
    # mobile
    m=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);mp=m.new_page();watch(mp,'mob')
    mp.goto(U);print('mobile FCP',round(mp.evaluate("new Promise(r=>{const f=()=>{const e=performance.getEntriesByName('first-contentful-paint')[0];e?r(e.startTime):setTimeout(f,50)};f()})")))
    try: mp.wait_for_function("Landing.has3d()",timeout=20000)
    except: print('mobile no 3d')
    mp.wait_for_timeout(2500);mp.screenshot(path=SH+'mobile-landing.png');mp.tap('#goFind');mp.wait_for_timeout(1150);mp.screenshot(path=SH+'mobile-anim.png');mp.wait_for_selector('body.app-mode');mp.wait_for_timeout(700);mp.screenshot(path=SH+'mobile-results.png');print('mobile overflow',mp.evaluate('document.documentElement.scrollWidth'))
    # reduced motion
    r=b.new_context(viewport={'width':1280,'height':800},reduced_motion='reduce');rp=r.new_page();watch(rp,'rm');rp.goto(U);rp.wait_for_timeout(1500);rp.evaluate("window._t0=performance.now();new MutationObserver(()=>{if(document.body.classList.contains('app-mode')&&!window._t1)window._t1=performance.now()-window._t0}).observe(document.body,{attributes:true})");rp.click('#goFind');rp.wait_for_selector('body.app-mode');print('reduced-motion in-page ms',round(rp.evaluate('window._t1')),'3d',rp.evaluate('Landing.has3d()'));rp.wait_for_timeout(500);rp.screenshot(path=SH+'reduced-motion.png')
    print('ERRORS',E)
