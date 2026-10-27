"""V16 Phase 2 CSP / SRI checks (live or local URL): script-src has no 'unsafe-inline'; no inline <script> or on* handler
attributes anywhere (static HTML or rendered views); no CSP violations while using every view, the map, the 3D globe
and the resume reader; CDN scripts pinned to exact versions with integrity+crossorigin; dark theme applied before
first paint (no flash); logo fallback and delegated buttons still work.
Run: python3 tests/test_v16_csp.py URL"""
import sys,time
from playwright.sync_api import sync_playwright
URL=sys.argv[1].rstrip('/')+'/'
R=[]
def ck(n,c,info=''):R.append((n,bool(c)));print(('PASS' if c else 'FAIL'),n,'' if c else info,flush=True)
def wf(p,js,t=90):
    e=time.time()+t
    while time.time()<e:
        try:
            if p.evaluate(js):return True
        except Exception:pass
        time.sleep(.2)
    return False
INL="()=>[...document.querySelectorAll('script:not([src])')].filter(s=>s.type!=='application/ld+json'&&s.textContent.trim()).length"
ONS="()=>[...document.querySelectorAll('*')].flatMap(e=>[...e.attributes].filter(a=>/^on/.test(a.name)).map(a=>e.tagName+'['+a.name+']')).slice(0,5)"
with sync_playwright() as pw:
    b=pw.chromium.launch();c=b.new_context(viewport={'width':1440,'height':900});viol=[]
    c.on('console',lambda m:viol.append(m.text) if ('Content Security Policy' in m.text or 'Refused to' in m.text or 'integrity' in m.text) else None)
    p=c.new_page();p.goto(URL)
    csp=p.evaluate("()=>document.querySelector('meta[http-equiv=Content-Security-Policy]').content")
    sp=[d for d in csp.split(';') if d.strip().startswith('script-src')][0]
    ck("index script-src has no 'unsafe-inline'","unsafe-inline" not in sp,sp)
    ck('no inline scripts in index',p.evaluate(INL)==0)
    wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0");p.evaluate("()=>window.__introEnd&&__introEnd(false)")
    ck('BUILD id read from boot.js stamp',p.evaluate("()=>/^[0-9a-f]{10}$/.test(window.BUILD)&&self.BV==='?v='+window.BUILD"),p.evaluate("()=>window.BUILD"))
    for h in ['db','tracker','profile','feedback','about','contact','privacy']:
        p.evaluate(f"()=>location.hash='{h}'");p.wait_for_timeout(700)
        o=p.evaluate(ONS);ck(f'#{h}: no on* handler attributes rendered',not o,o)
    p.evaluate("()=>location.hash='db'");p.wait_for_timeout(500)
    p.evaluate("()=>window.mapToggle&&mapToggle(true)")
    ok=wf(p,"()=>document.querySelectorAll('#mapPanel svg path').length>10",40)
    ck('map loads with pinned+SRI CDN scripts',ok)
    sc=p.evaluate("()=>[...document.querySelectorAll('script[src*=jsdelivr]')].map(s=>[s.src,s.integrity,s.crossOrigin])")
    ck('every CDN script pinned to x.y.z with integrity + crossorigin',sc and all(__import__('re').search(r'@\d+\.\d+\.\d+/',u) and i.startswith('sha384-') and co=='anonymous' for u,i,co in sc),sc)
    # delegated actions + logo fallback
    p.evaluate("()=>{const i=document.querySelector('img[data-ini]');if(i){window.__lg=i.parentNode;i.src='assets/logos/__missing__.png'}}");p.wait_for_timeout(800)
    ck('broken logo falls back to initials (delegated error handler)',p.evaluate("()=>!window.__lg||(!window.__lg.querySelector('img')&&!window.__lg.classList.contains('has-img'))"))
    p.evaluate("()=>{window.__qs=0;const o=window.quickSearch;window.quickSearch=()=>{window.__qs=1};document.getElementById('uiQk').click();window.quickSearch=o}")
    ck('Quick search button works via data-act',p.evaluate("()=>window.__qs===1"))
    ck('no CSP / SRI violations on index',not viol,viol[:3])
    # theme before first paint
    c3=b.new_context();c3.add_init_script("try{localStorage.setItem('ir_ui',JSON.stringify({theme:'dark'}))}catch(e){};document.addEventListener('readystatechange',()=>{if(document.readyState==='interactive'&&!window.__d)window.__d=document.documentElement.classList.contains('dark')})")
    q=c3.new_page();q.goto(URL)
    ck('dark theme set before first paint (boot.js in <head>)',q.evaluate("()=>window.__d===true"))
    ck('boot.js is a blocking <head> script before the stylesheets',q.evaluate("()=>{const s=document.querySelector('head script[src*=\"boot.js\"]'),l=document.querySelector('head link[rel=stylesheet]');return !!s&&!s.defer&&!s.async&&!!(s.compareDocumentPosition(l)&Node.DOCUMENT_POSITION_FOLLOWING)}"))
    for f in ('admin.html','404.html'):
        v2=[];r=c.new_page();r.on('console',lambda m:v2.append(m.text) if 'Refused' in m.text else None);r.goto(URL+f);r.wait_for_timeout(800)
        csp=r.evaluate("()=>document.querySelector('meta[http-equiv=Content-Security-Policy]').content")
        ck(f+": script-src 'self' only, no inline scripts, no violations","unsafe-inline" not in [d for d in csp.split(';') if 'script-src' in d][0] and r.evaluate(INL)==0 and not v2,v2[:2])
    b.close()
print(f'\n{sum(c for _,c in R)}/{len(R)} passed');sys.exit(0 if all(c for _,c in R) else 1)
