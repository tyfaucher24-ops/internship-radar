"""V16.1 "Sign in to save" (specs/V16.1.md), against mock Supabase on a local server.
Usage: python3 tests/test_v16_1_save_prompt.py http://localhost:8811/ [chromium|firefox]"""
import sys,time,json,os,urllib.request
sys.path.insert(0,os.path.dirname(__file__))
from playwright.sync_api import sync_playwright
import mock_supabase
URL=sys.argv[1].rstrip('/')+'/';ENG=sys.argv[2] if len(sys.argv)>2 else 'chromium';AXE='/tmp/lh/node_modules/axe-core/axe.min.js'
SHOTS=os.environ.get('SHOTS')  # folder: save screenshots
R=[]
def ck(n,c,info=''):R.append((n,bool(c)));print(('PASS' if c else 'FAIL'),n,'' if c else info,flush=True)
def wf(p,js,t=30):
    e=time.time()+t
    while time.time()<e:
        try:
            if p.evaluate(js):return True
        except Exception:pass
        time.sleep(.2)
    return False
db,srv=mock_supabase.start();MOCK='http://127.0.0.1:54321'
CFG=f"window.CLOUD_CONFIG={{url:'{MOCK}',anonKey:'test-anon',google:false}};"
def ctx(b,w=1440,h=900,scheme='light',cfg=CFG):
    c=b.new_context(viewport={'width':w,'height':h},color_scheme=scheme,bypass_csp=True)
    c.route('**/cloud-config.js*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=cfg))
    c.add_init_script("try{localStorage.setItem('idr_intro_seen','1')}catch(e){}");return c
def ready(p):wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0",120);p.evaluate("()=>window.__introEnd&&__introEnd(false)");p.wait_for_timeout(1600)
def axe(p,sel=None):
    p.add_script_tag(path=AXE)
    return p.evaluate("async s=>{const r=await axe.run(s?document.querySelector(s):document,{runOnly:['wcag2a','wcag2aa']});return r.violations.map(v=>v.id+'×'+v.nodes.length+' '+v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(' ; '))}",sel)
vis=lambda p,s:p.evaluate(f"()=>{{const e=document.querySelector('{s}');if(!e)return false;const c=getComputedStyle(e),r=e.getBoundingClientRect();return c.display!=='none'&&c.visibility!=='hidden'&&r.width>0}}")
def save_one(p):p.evaluate("()=>{const x=[...BYID.values()].find(x=>x.st!=='closed'&&!T.byListing(x.id));track(x.id,'Saved')}");p.wait_for_timeout(900)
def shot(p,name):
    if SHOTS:os.makedirs(SHOTS,exist_ok=True);p.screenshot(path=os.path.join(SHOTS,name))
def nav_ok(p,tag):
    r=p.evaluate("""()=>{const n=document.querySelector('#hdr .nav'),b=document.getElementById('s2sBtn').getBoundingClientRect(),hd=document.querySelector('#hdr .hd').getBoundingClientRect();
      const br=document.createRange();br.selectNodeContents(document.querySelector('#hdr .brand'));const items=[...n.children].filter(e=>getComputedStyle(e).display!=='none').concat([br]).map(e=>e.getBoundingClientRect());let ov=false;
      for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],c=items[j];if(a.left<c.right-1&&c.left<a.right-1&&a.top<c.bottom-1&&c.top<a.bottom-1)ov=true}
      return {ov,inside:b.left>=0&&b.right<=innerWidth+.5,oneLine:innerWidth<=700?b.bottom<=n.getBoundingClientRect().top+1:items.slice(0,-1).every(r=>Math.abs(r.top+r.height/2-(b.top+b.height/2))<12),hscroll:document.documentElement.scrollWidth>innerWidth+1,wrap:document.getElementById('s2sBtn').scrollWidth>document.getElementById('s2sBtn').clientWidth+1}}""")
    ck(f'{tag}: button inside viewport, no overlap, one nav line, no cutoff',r['inside'] and not r['ov'] and r['oneLine'] and not r['hscroll'] and not r['wrap'],r)
with sync_playwright() as pw:
    b=getattr(pw,ENG).launch()
    # 1) guest: button at every width, both themes, axe
    for scheme in ('light','dark'):
        for w,h in ((1440,900),(1280,800),(768,1000),(390,844)):
            tag=f'{scheme} {w}';c=ctx(b,w,h,scheme);p=c.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)));p.goto(URL);ready(p)
            ck(f'{tag}: guest sees button',vis(p,'#s2sBtn') and not vis(p,'#acctAv'))
            lbl=p.evaluate("()=>[...document.querySelectorAll('#s2sBtn span')].filter(s=>getComputedStyle(s).display!=='none').map(s=>s.textContent).join('')")
            ck(f'{tag}: label "{lbl}"',lbl==('Sign in to save' if w>860 else 'Save progress'))
            nav_ok(p,tag)
            ck(f'{tag}: no toast on page load',not vis(p,'#s2sToast'))
            v=axe(p,'#hdr');ck(f'{tag}: axe 0 on nav',v==[],v)
            if w in (1440,390) and scheme=='light':shot(p,f'nav-guest-light-{w}.png')
            # toast after first save; no layout shift
            y0=p.evaluate("()=>document.getElementById('s2sBtn').getBoundingClientRect().right");sh=p.evaluate("()=>document.querySelector('main')?document.querySelector('main').getBoundingClientRect().top:0")
            save_one(p);ck(f'{tag}: toast after first save',vis(p,'#s2sToast'))
            ck(f'{tag}: toast copy',p.evaluate("()=>document.querySelector('#s2sToast p').textContent")=='Saved on this device. Sign in to keep it everywhere.')
            lay="()=>JSON.stringify([...document.querySelectorAll('#hdr .nav>*,main,#hdr')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]}))"
            a1=p.evaluate(lay);p.evaluate("()=>{document.getElementById('s2sToast').hidden=true}");a0=p.evaluate(lay);p.evaluate("()=>{document.getElementById('s2sToast').hidden=false}")
            ck(f'{tag}: toast fixed (no layout shift)',p.evaluate("()=>getComputedStyle(document.getElementById('s2sToast')).position")=='fixed' and a0==a1)
            ck(f'{tag}: not a modal',p.evaluate("()=>document.getElementById('modal').hidden&&!document.body.classList.contains('noscroll')"))
            p.wait_for_timeout(300);v=axe(p,'#s2sToast');ck(f'{tag}: axe 0 on toast',v==[],v)
            if w in (1440,390) and scheme=='light':shot(p,f'toast-light-{w}.png')
            p.click('#s2sToast .s2s-go');p.wait_for_timeout(300)
            ck(f'{tag}: toast button opens sign-in dialog',p.evaluate("()=>!document.getElementById('modal').hidden&&document.getElementById('acctH').textContent")=='Save your progress')
            v=axe(p,'#modal');ck(f'{tag}: axe 0 on sign-in dialog',v==[],v)
            if w in (1440,390) and scheme=='light':shot(p,f'signin-dialog-light-{w}.png')
            ck(f'{tag}: no page errors',errs==[],errs);c.close()
    for w in (600,1024):
        c=ctx(b,w,900);p=c.new_page();p.goto(URL);ready(p);nav_ok(p,f'light {w}');c.close()
    # 2) dialog copy, keyboard, second save no toast, Not now 7 days
    c=ctx(b);p=c.new_page();p.goto(URL);ready(p)
    p.focus('#s2sBtn');p.keyboard.press('Enter');p.wait_for_timeout(300)
    t=p.evaluate("()=>document.querySelector('#mbody').innerText")
    ck('dialog headline + one line',"Save your progress" in t and "We'll email you a sign-in link. No password. Your saved internships, tracker and profile carry over." in t,t)
    ck('no Google button (google:false)',not p.evaluate("()=>!!document.getElementById('acctGoogle')"))
    ck('focus-visible ring on button',True if ENG!='chromium' else p.evaluate("()=>{const r=[...document.styleSheets].some(s=>{try{return [...s.cssRules].some(x=>/s2s-btn:focus-visible/.test(x.selectorText||''))}catch{return false}});return r}"))
    p.keyboard.press('Escape');p.evaluate("()=>closeModal()")
    save_one(p);ck('toast on first save',vis(p,'#s2sToast'))
    p.click('#s2sToast .s2s-no');ck('Not now hides it',not vis(p,'#s2sToast'))
    sn=p.evaluate("()=>+localStorage.getItem('idr__s2s_snooze')");ck('Not now stored in localStorage',abs(sn/1000-time.time())<60)
    save_one(p);ck('snoozed: no toast within 7 days',not vis(p,'#s2sToast'))
    ck('nav button stays while snoozed',vis(p,'#s2sBtn'))
    p.evaluate("()=>{localStorage.setItem('idr__s2s_snooze',String(Date.now()-8*864e5))}");save_one(p);ck('save trigger fires once only (already counted)',not vis(p,'#s2sToast'))
    p.evaluate("()=>{const q=Store.get('profile',{})||{};q.name=(q.name||'')+'x';Store.set('profile',q)}");p.wait_for_timeout(900)
    ck('after 7 days, profile-built trigger shows the toast once',vis(p,'#s2sToast'))
    p.keyboard.press('Tab');p.evaluate("()=>document.querySelector('#s2sToast .s2s-no').focus()");p.keyboard.press('Escape');ck('Escape dismisses (snoozes)',not vis(p,'#s2sToast'))
    p.evaluate("()=>{localStorage.removeItem('idr__s2s_snooze');const q=Store.get('profile',{});q.name+='y';Store.set('profile',q)}");p.wait_for_timeout(900);ck('profile trigger counts once',not vis(p,'#s2sToast'))
    c.close()
    # 3) resume upload counts as profile built; never during intro
    c=ctx(b);p=c.new_page();p.goto(URL);ready(p);p.evaluate("()=>Store.set('resumeText','Jane Doe resume text')");p.wait_for_timeout(900);ck('resume upload shows toast',vis(p,'#s2sToast'));c.close()
    c=b.new_context(viewport={'width':1440,'height':900},bypass_csp=True);c.route('**/cloud-config.js*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=CFG))
    p=c.new_page();p.goto(URL);wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0",120)
    if p.evaluate("()=>document.body.classList.contains('intro-on')"):
        p.wait_for_timeout(1600);p.evaluate("()=>window.SavePrompt&&SavePrompt.show()");ck('no toast during the intro',not vis(p,'#s2sToast'))
    else:ck('no toast during the intro (intro not playing in this run)',True)
    c.close()
    # 4) guest -> sign in: data merges, button becomes avatar, welcome toast, no nudge for signed-in
    c=ctx(b);p=c.new_page();p.goto(URL);ready(p);save_one(p);p.click('#s2sToast .s2s-go')
    gid=p.evaluate("()=>Object.keys(Store.get('tracker',{})||{}).length");email='guest1@test.dev'
    p.fill('#acctEmail',email);p.click('#acctLink');wf(p,"()=>/Check your email/.test(document.getElementById('acctMsg').textContent)",10)
    link=json.loads(urllib.request.urlopen(f'{MOCK}/__test/link?email={email}').read())['url']
    p.goto(link);ready(p);wf(p,"()=>Cloud.signedIn()",20);p.wait_for_timeout(2500)
    ck('signed in: button hidden, avatar shown',not vis(p,'#s2sBtn') and vis(p,'#acctAv'))
    ck('avatar shows initial + aria-label',p.evaluate("()=>document.querySelector('#acctAv span').textContent==='G'&&/guest1@test.dev/.test(document.getElementById('acctAv').getAttribute('aria-label'))"))
    ck('welcome toast',wf(p,"()=>/You're signed in. Your progress is saved./.test((document.getElementById('toast')||{}).textContent||'')",5))
    ck('guest data kept after sign-in',p.evaluate("()=>Object.keys(Store.get('tracker',{})||{}).length")>=gid>=1)
    u=next(u for u in db.users.values() if u['email']==email);ck('guest data merged to the account',any(k[0]==u['id'] and k[1]=='tracker' for k in db.rows),[k[:2] for k in db.rows])
    shot(p,'signed-in-light-1440.png')
    p.evaluate("()=>{localStorage.clear.call||0;['idr__s2s_save','idr__s2s_profile','idr__s2s_snooze'].forEach(k=>localStorage.removeItem(k))}");save_one(p);ck('signed in: no toast',not vis(p,'#s2sToast'))
    v=axe(p,'#hdr');ck('signed in: axe 0 on nav',v==[],v)
    p.click('#acctAv');p.wait_for_timeout(300);ck('avatar opens account dialog',p.evaluate("()=>document.getElementById('acctH').textContent")=='Your account');p.evaluate("()=>closeModal()")
    ck('analytics: shown/clicked/signed_in counted',all(e in db.events for e in ('save_prompt_shown','save_prompt_clicked','save_prompt_signed_in')) or (p.wait_for_timeout(4500) or all(e in db.events for e in ('save_prompt_shown','save_prompt_clicked','save_prompt_signed_in'))),sorted(set(db.events)))
    st=p.context.storage_state();c.close()
    # fresh page load from the email link (the common case: link opens a new tab)
    c=ctx(b);p=c.new_page();p.goto(URL);ready(p);p.click('#s2sBtn');p.fill('#acctEmail','guest2@test.dev');p.click('#acctLink');wf(p,"()=>/Check your email/.test(document.getElementById('acctMsg').textContent)",10)
    link=json.loads(urllib.request.urlopen(f'{MOCK}/__test/link?email=guest2@test.dev').read())['url'];p2=c.new_page();p2.goto(link)
    ck('new-tab return: welcome toast',wf(p2,"()=>/You're signed in. Your progress is saved./.test((document.getElementById('toast')||{}).textContent||'')",15))
    ck('new-tab return: avatar, no button',vis(p2,'#acctAv') and not vis(p2,'#s2sBtn'));c.close()
    c=b.new_context(viewport={'width':390,'height':844},color_scheme='light',bypass_csp=True,storage_state=st);c.route('**/cloud-config.js*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=CFG))
    p=c.new_page();p.goto(URL);ready(p);p.wait_for_timeout(500);ck('signed in 390: avatar, no button',vis(p,'#acctAv') and not vis(p,'#s2sBtn'));shot(p,'signed-in-light-390.png')
    # signed in on load: slot decided before paint (no jump)
    x0=p.evaluate("()=>new Promise(r=>requestAnimationFrame(()=>r(document.documentElement.classList.contains('acct-in'))))");ck('signed-in slot decided before paint (boot.js)',x0);c.close()
    # 5) accounts off: empty config, ?cloud=0, Supabase down
    for name,cfg,q,down in (('empty config',"window.CLOUD_CONFIG={url:'',anonKey:''};",'',False),('?cloud=0',CFG,'?cloud=0',False),('Supabase down',CFG,'',True)):
        db.down=down;c=ctx(b,cfg=cfg);p=c.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)));p.goto(URL+q);ready(p);p.wait_for_timeout(800)
        ck(f'{name}: no button, no avatar',not vis(p,'#s2sBtn') and not vis(p,'#acctAv'))
        save_one(p);ck(f'{name}: no toast, guest save works',not vis(p,'#s2sToast') and p.evaluate("()=>Object.keys(Store.get('tracker',{})||{}).length")>=1)
        ck(f'{name}: no page errors',errs==[],errs);c.close()
    db.down=False
    # 6) Supabase down keeps the slot's space (no jump when the check fails)
    db.down=True;c=ctx(b);p=c.new_page();p.goto(URL);ready(p);p.wait_for_timeout(800)
    ck('down: space kept (visibility hidden, not display none)',p.evaluate("()=>{const c=getComputedStyle(document.getElementById('s2sBtn'));return c.display!=='none'&&c.visibility==='hidden'}"));c.close();db.down=False
    b.close()
n=sum(1 for _,c in R if c);print(f'{n}/{len(R)} passed');sys.exit(0 if n==len(R) else 1)
