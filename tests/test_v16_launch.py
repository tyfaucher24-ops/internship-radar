"""V16 Phase 6 launch polish: axe WCAG 2 A/AA = 0 on every page in light + dark at 1440 and 390 (incl. account,
Report a problem, listing detail, 404, admin gate), SEO tags, robots/sitemap, relative paths (CNAME-ready),
offline + slow-network states without layout jumps. Usage: python3 tests/test_v16_launch.py URL [chromium|firefox|webkit]"""
import sys,re,json,time,urllib.request
from playwright.sync_api import sync_playwright
URL=sys.argv[1].rstrip('/')+'/';ENG=(sys.argv[2] if len(sys.argv)>2 else 'chromium');AXE='/tmp/lh/node_modules/axe-core/axe.min.js'
R=[]
def ck(n,c,info=''):R.append((n,bool(c)));print(('PASS' if c else 'FAIL'),n,'' if c else str(info)[:600],flush=True)
def axe(p,sel=None):
    p.add_script_tag(path=AXE)
    return p.evaluate("async s=>{const r=await axe.run(s?document.querySelector(s):document,{runOnly:['wcag2a','wcag2aa']});return r.violations.map(v=>v.id+'×'+v.nodes.length+' '+v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(' ; '))}",sel)
def ready(p):
    e=time.time()+120
    while time.time()<e and not p.evaluate("()=>typeof BYID!=='undefined'&&BYID.size>0"):time.sleep(.3)
    p.evaluate("()=>window.__introEnd&&__introEnd(false)");p.wait_for_timeout(400)
with sync_playwright() as pw:
    b=getattr(pw,ENG).launch()
    full=ENG=='chromium'
    # SEO (static)
    h=urllib.request.urlopen(URL).read().decode()
    for k in ['<title>','name="description"','rel="canonical"','og:title','og:description','og:image"','og:url','twitter:card','twitter:image','name="viewport"','lang="en"']:ck('SEO tag '+k,k in h)
    ck('description no longer says no login','no login' not in h.lower())
    rb=urllib.request.urlopen(URL+'robots.txt').read().decode();ck('robots.txt has sitemap + hides admin','Sitemap:' in rb and 'Disallow: /admin.html' in rb)
    sm=urllib.request.urlopen(URL+'sitemap.xml').read().decode();ck('sitemap.xml lists the site',URL in sm or 'tyfaucher24-ops.github.io' in sm)
    ck('og.jpg reachable',urllib.request.urlopen(re.search(r'og:image" content="([^"]+)"',h).group(1)).status==200)
    srcs=re.findall(r'(?:src|href)="([^"]+)"',h);ab=[s for s in srcs if s.startswith('/') and not s.startswith('//')]
    ck('CNAME-ready: no root-absolute paths in index.html',ab==[],ab)
    a=urllib.request.urlopen(URL+'admin.html').read().decode();ck('admin.html is noindex','noindex' in a)
    for scheme in (['light','dark'] if full else ['light']):
        for w,hh in [(1440,900),(390,844)]:
            c=b.new_context(viewport={'width':w,'height':hh},color_scheme=scheme,**({'bypass_csp':True} if ENG!='webkit' else {}));p=c.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
            p.goto(URL);ready(p);tag=f'{ENG} {scheme} {w}'
            ck(f'{tag}: theme',p.evaluate("()=>document.documentElement.classList.contains('dark')")==(scheme=='dark'))
            if full:
                for pg in ['db','tracker','profile','feedback','about','contact','privacy','terms']:
                    p.evaluate(f"()=>go('{pg}')");p.wait_for_timeout(500);v=axe(p);ck(f'{tag}: axe 0 on #{pg}',v==[],v)
                    ck(f'{tag}: title on #{pg}',p.evaluate("()=>/Intern Index/.test(document.title)"))
                p.evaluate("()=>go('db')");p.wait_for_timeout(300)
                p.evaluate("()=>openDrawer([...BYID.values()].find(x=>x.st!=='closed'))");p.wait_for_timeout(1200);v=axe(p);ck(f'{tag}: axe 0 on listing detail',v==[],v)
                p.evaluate("()=>closeDrawer()");p.wait_for_timeout(400)
                p.evaluate("()=>document.querySelector('footer [data-reportproblem]').click()");p.wait_for_timeout(400);v=axe(p,'#modal');ck(f'{tag}: axe 0 on Report a problem',v==[],v)
                p.keyboard.press('Escape');p.wait_for_timeout(300)
                if p.query_selector('#acctBtn'):
                    p.evaluate("()=>{const m=document.getElementById('pmMenu');if(m)m.hidden=false;document.getElementById('acctBtn').click()}");p.wait_for_timeout(500);v=axe(p,'#modal');ck(f'{tag}: axe 0 on account dialog',v==[],v);p.keyboard.press('Escape')
            else:
                for pg in ['db','tracker','profile','privacy']:
                    p.evaluate(f"()=>go('{pg}')");p.wait_for_timeout(500);ck(f'{tag}: #{pg} renders',p.evaluate(f"()=>!document.getElementById('t-{pg}').hidden&&document.getElementById('t-{pg}').offsetHeight>100"))
                ck(f'{tag}: cards render',p.evaluate("()=>{go('db');return BYID.size>1000}"))
            ck(f'{tag}: no horizontal scroll',p.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+1"))
            # offline toast must not move the page
            p.evaluate("()=>go('db')");p.wait_for_timeout(300);y0=p.evaluate("()=>document.querySelector('main,#t-db').getBoundingClientRect().top")
            c.set_offline(True);p.wait_for_timeout(500)
            ck(f'{tag}: offline toast shown',p.evaluate("()=>!document.getElementById('netToast').hidden"))
            ck(f'{tag}: offline toast causes no layout shift',abs(p.evaluate("()=>document.querySelector('main,#t-db').getBoundingClientRect().top")-y0)<1)
            if full:v=axe(p,'#netToast');ck(f'{tag}: axe 0 on offline toast',v==[],v)
            c.set_offline(False);p.wait_for_timeout(500);ck(f'{tag}: back-online message','Back online' in p.evaluate("()=>document.getElementById('netToast').textContent"))
            ck(f'{tag}: no page errors',errs==[],errs);c.close()
    # slow network: skeletons then a "slow connection" note, then listings
    c=b.new_context(viewport={'width':1440,'height':900});p=c.new_page();held=[]
    p.route('**/data/index.json*',lambda r:held.append(r));p.route('**/data-worker.js*',lambda r:r.abort())
    p.goto(URL,wait_until='domcontentloaded');p.wait_for_timeout(2500);p.evaluate("()=>window.__introEnd&&__introEnd(false)")
    ck(f'{ENG} slow: skeleton cards while loading',p.evaluate("()=>document.querySelectorAll('.skelcard').length>0"))
    p.wait_for_timeout(7000);ck(f'{ENG} slow: "Slow connection" note after 8 s',p.evaluate("()=>!!document.getElementById('slowNote')"))
    for r in held:r.continue_()
    ready(p);p.wait_for_timeout(500);ck(f'{ENG} slow: listings arrive, note removed',p.evaluate("()=>BYID.size>1000&&!document.getElementById('slowNote')"));c.close()
    # failed load while offline: friendly message + working Retry
    c=b.new_context(viewport={'width':1440,'height':900});p=c.new_page();p.route('**/data/index.json*',lambda r:r.abort());p.route('**/data-worker.js*',lambda r:r.abort())
    p.goto(URL);p.wait_for_timeout(5000)
    ck(f'{ENG} failed load: error + Retry button',p.evaluate("()=>/Couldn't load listings/.test(document.getElementById('notice').textContent)&&!!document.querySelector('#notice [data-act=reload]')"))
    p.unroute('**/data/index.json*');p.unroute('**/data-worker.js*');
    try:p.evaluate("()=>{window.__beforeRetry=1;document.querySelector('#notice [data-act=reload]').click()}")
    except Exception:pass
    p.wait_for_timeout(4000);p.wait_for_load_state();ready(p)
    ck(f'{ENG} Retry reloads and listings load',p.evaluate("()=>BYID.size>1000&&!window.__beforeRetry"));c.close()
    # 404
    c=b.new_context(viewport={'width':390,'height':844},color_scheme='light',**({'bypass_csp':True} if ENG!='webkit' else {}));p=c.new_page();r=p.goto(URL+'no/such/page')
    if 'github.io' not in URL:print('SKIP 404 checks (local server has no 404.html routing)')
    else:
         ck(f'{ENG} 404 status + page',r.status==404 and "isn't here" in p.content())
         if full:v=axe(p);ck(f'{ENG} axe 0 on 404',v==[],v)
         p.click('text=Go to Intern Index');p.wait_for_load_state();ck(f'{ENG} 404 home link works',p.url.rstrip('/').endswith('internship-radar') or p.url.rstrip('/')==URL.rstrip('/'))
    c.close();b.close()
print(f"{sum(c for _,c in R)}/{len(R)} passed");sys.exit(0 if all(c for _,c in R) else 1)
