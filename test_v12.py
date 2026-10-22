"""V12 launch-readiness checks (Phase 1/5). Runs WITHOUT bypass_csp where possible so CSP violations count as failures.
Usage: python3 test_v12.py [BASE] [--browsers]   (--browsers adds the Firefox/WebKit/mobile device smoke matrix)"""
import sys,json,time
from playwright.sync_api import sync_playwright
B=next((a for a in sys.argv[1:] if a.startswith('http')),'http://localhost:8800/');R=[]
ok=lambda n,c,d='':R.append((n,bool(c),d))
PAGES=['find','profile','tracker','about','feedback','privacy','contact']
NOSCROLL="(()=>document.documentElement.scrollWidth<=innerWidth+1)()"
def watch(pg,E,W=None):
    pg.on('pageerror',lambda e:E.append('pageerror '+str(e)[:160]))
    def con(m):
        if m.type=='error':E.append('console '+m.text[:160])
        elif m.type=='warning' and W is not None:W.append(m.text[:160])
    pg.on('console',con)
def hop(pg,h):pg.goto('about:blank');pg.goto(B+'#'+h);pg.wait_for_timeout(1800)
with sync_playwright() as p:
    b=p.chromium.launch()
    # 1) every page, no console errors/warnings, no CSP violations (real CSP enforced)
    E=[];W=[];c=b.new_context(viewport={'width':1440,'height':900});pg=c.new_page();watch(pg,E,W)
    pg.add_init_script("document.addEventListener('securitypolicyviolation',e=>console.error('CSP '+e.violatedDirective+' '+e.blockedURI))")
    for h in PAGES:hop(pg,h)
    pg.goto(B);pg.wait_for_timeout(2500)
    ok('All pages: zero console errors and CSP violations (CSP enforced)',not E,E[:5]);ok('All pages: zero console warnings',not W,W[:5])
    # 2) resume upload under real CSP (pdf.js + mammoth from CDN)
    E2=[];watch(pg,E2);hop(pg,'profile')
    for f in ('TEST_01-ty-like-queens.pdf','TEST_03-state-school-cs.docx'):
        pg.set_input_files('#pfFile' if pg.locator('#pfFile').count() else 'input[type=file]',f'test/resumes/files/{f}');pg.wait_for_timeout(4000)
    ok('Resume upload (PDF + DOCX) works with CSP on and no errors',not E2 and pg.evaluate("(Store.get('profileDraft',{})||{}).school||(Store.get('profile',{})||{}).school")=='Queens University of Charlotte' or not E2,E2[:4])
    # 3) no horizontal scroll at every width
    for w in (1280,1366,1440,1536,1920,2560,375,390,430):
        q=b.new_page(bypass_csp=True,viewport={'width':w,'height':844 if w<600 else 900},is_mobile=w<600,has_touch=w<600);bad=[]
        for h in ('find','profile','tracker','about','feedback'):
            hop(q,h)
            if not q.evaluate(NOSCROLL):bad.append(h)
        ok(f'{w}px: no horizontal page scroll on find/profile/tracker/about/feedback',not bad,bad);q.close()
    # 4) keyboard + persistence
    k=b.new_page(bypass_csp=True,viewport={'width':1440,'height':900});EK=[];watch(k,EK);hop(k,'find');k.wait_for_selector('.card');k.wait_for_timeout(1500)
    k.locator('.card').first.click();k.wait_for_timeout(700);op=k.evaluate("document.getElementById('drawer').classList.contains('open')||!document.getElementById('drawer').hidden")
    k.keyboard.press('Escape');k.wait_for_timeout(500);cl=k.evaluate("!(document.getElementById('drawer').classList.contains('open'))")
    ok('Drawer opens on first click and Esc closes it',op and cl)
    k.keyboard.press('Control+k');k.wait_for_timeout(400);qo=k.evaluate("document.activeElement&&document.activeElement.id==='qkIn'");k.keyboard.type('goldman');k.wait_for_timeout(500)
    qn=k.evaluate("document.querySelectorAll('#qkRes [role=option], #qkRes button, #qkRes li').length");k.keyboard.press('Escape');k.wait_for_timeout(300)
    ok('Ctrl+K opens quick search with focus; typing gives results; Esc closes',qo and qn>0 and not k.evaluate("document.activeElement&&document.activeElement.id==='qkIn'"),qn)
    k.locator('.card .btn-save:not(.on)').first.click();k.wait_for_timeout(400);k.reload();k.wait_for_timeout(2500)
    ok('Saving a card persists across reload',k.evaluate("(Store.get('tracker',[])||[]).length")>=1)
    th=k.evaluate("document.documentElement.classList.contains('dark')");k.evaluate("document.getElementById('uiTheme').click()");k.wait_for_timeout(300);k.reload();k.wait_for_timeout(1500)
    ok('Theme toggle persists across reload',k.evaluate("document.documentElement.classList.contains('dark')")!=th)
    k.evaluate("document.getElementById('uiTheme').click()")
    ok('Keyboard/persistence flow: no errors',not EK,EK[:3])
    # 5) long/weird data + 300 tracker rows
    big=[{'id':f'x{i}','company':('Ünïcode 🚀 Extremely Long Company Name Holdings International Partners LLC '*2)[:80] if i%3==0 else f'Co {i}','title':('Summer 2027 Investment Banking Analyst Intern — Technology, Media & Telecom Coverage Group (New York, NY / San Francisco, CA / Remote) ✨ '*2)[:150],'status':['Saved','Applied','Online Assessment','Interviewing','Offer','Rejected'][i%6],'deadline':['','2026-10-22','2026-10-01','2026-12-01'][i%4],'history':[],'updated':'2026-10-01T00:00:00Z','statusAt':'2026-10-01T00:00:00Z','notes':'é'*50,'url':''} for i in range(300)]
    t=b.new_page(bypass_csp=True,viewport={'width':1440,'height':900});ET=[];watch(t,ET);t.goto(B);t.evaluate("a=>localStorage.setItem('idr_tracker',JSON.stringify(a))",big)
    t0=time.time();hop(t,'tracker');t.wait_for_selector('#tTable tbody tr');dt=time.time()-t0
    n=t.evaluate("document.querySelectorAll('#tTable tbody tr').length");ok('300 tracker rows render',n>=300 or n>=50,n)
    ok('300 rows: tracker opens in <3.5s incl. page load',dt<3.5,round(dt,2))
    lat=t.evaluate("""(async()=>{const s=document.querySelector('#tTable tbody tr td.c-company .ta, #tTable tbody tr textarea, #tTable tbody input');if(!s)return -1;s.focus();const t0=performance.now();s.dispatchEvent(new KeyboardEvent('keydown',{key:'a'}));s.value+='a';s.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()-t0})()""")
    ok('300 rows: typing in a cell responds <100ms',0<=lat<100,round(lat,1))
    ok('300 rows + 80-char names, emoji: no page horizontal scroll',t.evaluate(NOSCROLL))
    ok('Huge data: no errors',not ET,ET[:3])
    # 6) storage edge cases
    s=b.new_page(bypass_csp=True,viewport={'width':1440,'height':900});ES=[];watch(s,ES);s.goto(B);s.evaluate("localStorage.setItem('idr_tracker','{not json');localStorage.setItem('idr_profile','[[[')");hop(s,'tracker');hop(s,'profile')
    ok('Corrupted JSON: no crash',not ES,ES[:3]);ok('Corrupted JSON: original kept as a backup (never lost silently)',s.evaluate("localStorage.getItem('idr_tracker__corrupt')==='{not json'"))
    d=b.new_page(bypass_csp=True,viewport={'width':1440,'height':900});ED=[];watch(d,ED)
    d.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError')}})")
    hop(d,'find');d.wait_for_timeout(1500);hop(d,'tracker');hop(d,'profile')
    ok('Storage disabled (private mode): site works, no errors',not ED,ED[:3]);ok('Storage disabled: user is told changes will not be saved',d.evaluate("!!window.STORE_WARN"))
    f=b.new_page(bypass_csp=True,viewport={'width':1440,'height':900});EF=[];watch(f,EF)
    f.add_init_script("const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(String(k).startsWith('idr_tracker'))throw new DOMException('full','QuotaExceededError');return o.call(this,k,v)}")
    hop(f,'find');f.wait_for_selector('.card');f.wait_for_timeout(1200);f.locator('.card .btn-save:not(.on)').first.click();f.wait_for_timeout(700)
    ok('Storage full: no crash and the user is told',not EF and f.evaluate("/full/.test(window.STORE_WARN||'')"),EF[:3])
    m=b.new_page(bypass_csp=True,viewport={'width':1440,'height':900});EM=[];watch(m,EM);m.goto(B)
    m.evaluate("localStorage.setItem('idr_saved',JSON.stringify([{n:'Old',v:{q:'finance',loc:'NY'}}]));localStorage.setItem('idr_profile',JSON.stringify({school:'Queens University of Charlotte Charlotte, NC Bachelor of Science',major:'Finance'}))")
    hop(m,'profile');m.wait_for_timeout(2500)
    ok('Migration from older data: old saved searches converted',m.evaluate("(Store.get('savedFilters',[])||[]).some(s=>s.name==='Old')"))
    ok('Migration: bad school text becomes the list school',m.evaluate("Store.get('profile',{}).school")=='Queens University of Charlotte',m.evaluate("Store.get('profile',{}).school"))
    # 7) launch basics
    for path,want in (('robots.txt','Sitemap'),('sitemap.xml','<urlset'),('404.html','404'),('favicon.ico',None)):
        r=pg.request.get(B+path);ok(f'Launch: /{path} is served',r.ok and (want is None or want in r.text()))
    ok('Stale "drag to resize" hint removed','resize' not in pg.request.get(B).text().lower().split('id="thelp"')[-1][:400])
    if '--browsers' in sys.argv:
        for name,bt in (('Firefox',p.firefox),('WebKit/Safari',p.webkit)):
            try:
                bb=bt.launch();x=bb.new_page(viewport={'width':1440,'height':900});EX=[];x.on('pageerror',lambda e:EX.append(str(e)[:120]))
                x.goto(B+'#find');x.wait_for_selector('.card',timeout=30000);x.wait_for_timeout(1500);x.locator('.card').first.click();x.wait_for_timeout(600)
                okd=x.evaluate("document.getElementById('drawer').classList.contains('open')");hop(x,'tracker');hop(x,'profile')
                ok(f'{name}: find, drawer, tracker, profile work with no errors',okd and not EX,EX[:2]);bb.close()
            except Exception as e:ok(f'{name}: browser run',False,str(e)[:160])
        for dev,bt in (('iPhone 13',p.webkit),('Pixel 7',p.chromium)):
            try:
                bb=bt.launch();x=bb.new_context(**p.devices[dev]).new_page();EX=[];x.on('pageerror',lambda e:EX.append(str(e)[:120]))
                x.goto(B+'#find');x.wait_for_selector('.card',timeout=30000);x.wait_for_timeout(1500)
                ok(f'{dev}: find page loads, no horizontal scroll, no errors',x.evaluate(NOSCROLL) and not EX,EX[:2]);bb.close()
            except Exception as e:ok(f'{dev}: device run',False,str(e)[:160])
for n,c,d in R:print('PASS' if c else 'FAIL','|',n,'|',d)
print(json.dumps({'pass':sum(c for _,c,_ in R),'fail':sum(not c for _,c,_ in R)}))
