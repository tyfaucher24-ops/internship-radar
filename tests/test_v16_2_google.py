"""V16.2 Continue with Google + plain-words auth errors, against mock Supabase.
Usage: python3 tests/test_v16_2_google.py http://localhost:8811/ [chromium|firefox]; SHOTS=dir saves screenshots"""
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
CFG_ON=CFG.replace('google:false','google:true')
def ctx(b,w=1440,h=900,scheme='light',cfg=CFG,csp_off=True):
    c=b.new_context(viewport={'width':w,'height':h},color_scheme=scheme,bypass_csp=csp_off)
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

RAW=('rate limit exceeded','Unsupported','provider is not enabled','HTTP ','error_code','denied access','invalid or has expired','Failed to fetch','validation_failed')
def dlg(p):p.click('#s2sBtn');wf(p,"()=>!!document.getElementById('acctEmail')",5)
def mtxt(p):return p.evaluate("()=>document.getElementById('acctMsg')?document.getElementById('acctMsg').textContent:''")
def noraw(p,tag):t=p.evaluate("()=>document.body.innerText");ck(f'{tag}: no raw error text',not any(r in t for r in RAW),[r for r in RAW if r in t])
def send(p,email='a@test.dev'):
    p.fill('#acctEmail',email);wf(p,f"()=>document.getElementById('acctEmail').value==={json.dumps(email)}",3);p.click('#acctLink')
    wf(p,"()=>!/Sending/.test(document.getElementById('acctMsg').textContent)&&document.getElementById('acctMsg').textContent",8)
def realcsp(c):
    # the site's real CSP, with only the mock's origin added to connect-src (the live site talks to https://*.supabase.co)
    def h(r):
        resp=r.fetch();body=resp.text().replace("connect-src 'self'","connect-src 'self' "+MOCK,1);r.fulfill(response=resp,body=body)
    c.route(lambda u:u.split('?')[0].split('#')[0].rstrip('/')+'/'==URL or u.split('?')[0].endswith('index.html'),h);return c
TOPS="()=>{const e=document.getElementById('acctEmail'),h=document.getElementById('acctH');return e&&h?[e.getBoundingClientRect().top,h.getBoundingClientRect().top]:null}"
import re;ck('cloud-config.js has a one-line google flag',len(re.findall(r"google:(true|false)\}",open(os.path.join(os.path.dirname(__file__),'..','cloud-config.js')).read()))==1)
with sync_playwright() as pw:
    b=getattr(pw,ENG).launch(**({'args':['--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks']} if ENG=='chromium' else {}))
    # 1) flag off: hidden entirely, V16.1 copy, no jump
    for w,h in ((1440,900),(390,844)):
        c=ctx(b,w,h);p=c.new_page();p.goto(URL);ready(p);dlg(p);t0=p.evaluate(TOPS);p.wait_for_timeout(1500)
        ck(f'off {w}: no Google button, no divider',p.evaluate("()=>!document.getElementById('acctGoogle')&&!document.querySelector('.acct-or')&&!/Google/.test(document.getElementById('modal').innerText)"))
        ck(f'off {w}: V16.1 copy kept',"We'll email you a sign-in link." in p.evaluate("()=>document.getElementById('modal').innerText"))
        ck(f'off {w}: no layout jump',t0==p.evaluate(TOPS),t0);c.close()
    # 2) flag on: every width, both themes
    for scheme in ('light','dark'):
        for w,h in ((1440,900),(1280,800),(768,1000),(390,844)):
            tag=f'on {scheme} {w}';c=ctx(b,w,h,scheme,CFG_ON);p=c.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)));p.goto(URL);ready(p);dlg(p);t0=p.evaluate(TOPS)
            r=p.evaluate("""()=>{const g=document.getElementById('acctGoogle'),e=document.getElementById('acctEmail'),o=document.querySelector('.acct-or'),cs=getComputedStyle(g),gr=g.getBoundingClientRect(),m=document.querySelector('#modal .box,#modal [role=dialog],#mbody').getBoundingClientRect();
              return {above:gr.bottom<=o.getBoundingClientRect().top&&o.getBoundingClientRect().bottom<=e.getBoundingClientRect().top,first:g.getBoundingClientRect().top<document.getElementById('acctLink').getBoundingClientRect().top,h:gr.height,fs:cs.fontSize,fw:cs.fontWeight,txt:g.textContent.trim(),paths:[...g.querySelectorAll('svg path')].map(x=>x.getAttribute('fill')).join(','),svg:g.querySelector('svg').getBoundingClientRect().width,bg:cs.backgroundColor,inside:gr.left>=m.left-1&&gr.right<=m.right+1&&gr.right<=innerWidth,or:o.textContent.trim()}}""")
            ck(f'{tag}: Google button first, then "or", then email',r['above'] and r['first'] and r['or']=='or',r)
            ck(f'{tag}: branding (40px, 14px/500, 18px G, 4 colours, label)',abs(r['h']-40)<1 and r['fs']=='14px' and r['fw'] in ('500','medium') and abs(r['svg']-18)<1 and r['paths']=='#EA4335,#4285F4,#FBBC05,#34A853' and r['txt']=='Continue with Google',r)
            ck(f'{tag}: {"light" if scheme=="light" else "dark"} variant bg',r['bg']==('rgb(255, 255, 255)' if scheme=='light' else 'rgb(19, 19, 20)'),r['bg'])
            ck(f'{tag}: fits dialog',r['inside'],r)
            p.wait_for_timeout(1500);ck(f'{tag}: no layout jump',t0==p.evaluate(TOPS))
            p.wait_for_timeout(300);v=axe(p,'#modal');ck(f'{tag}: axe 0 on dialog',v==[],v)
            if scheme=='light' and w in (1440,390):shot(p,f'dialog-google-light-{w}.png')
            # rate-limit error in plain words (and AA contrast of the error colour)
            db.otp_err=(429,{'code':429,'error_code':'over_email_send_rate_limit','msg':'email rate limit exceeded'});send(p);db.otp_err=None
            ck(f'{tag}: rate limit -> plain words w/ Google',mtxt(p)=='Too many sign-in emails right now. Try Continue with Google or try again in a bit.',mtxt(p))
            noraw(p,tag);v=axe(p,'#modal');ck(f'{tag}: axe 0 with error shown',v==[],v)
            if scheme=='light' and w in (1440,390):shot(p,f'error-ratelimit-light-{w}.png')
            ck(f'{tag}: no page errors',not errs,errs);c.close()
    # 3) rate limit with flag off: no Google suggestion
    c=ctx(b);p=c.new_page();p.goto(URL);ready(p);dlg(p);db.otp_err=(429,{'code':429,'error_code':'over_email_send_rate_limit','msg':'email rate limit exceeded'});send(p);db.otp_err=None
    ck('off: rate limit message omits Google',mtxt(p)=='Too many sign-in emails right now. Try again in a bit.',mtxt(p));noraw(p,'off rate');c.close()
    # 4) other errors in plain words
    for tag,err,email,want in (('client invalid email',None,'not-an-email',"That email address doesn't look right. Check it and try again."),
        ('server invalid email',(400,{'code':400,'error_code':'email_address_invalid','msg':'Email address "x@y.zz" is invalid'}),'x@y.zz',"That email address doesn't look right. Check it and try again."),
        ('server 500',(500,{'message':'Internal Server Error'}),'a@test.dev','Sign-in is having trouble right now. Try again in a few minutes.'),
        ('signups off',(422,{'error_code':'signup_disabled','msg':'Signups not allowed for otp'}),'a@test.dev','New sign-ups are paused right now. Try again later.')):
        c=ctx(b,cfg=CFG_ON);p=c.new_page();p.goto(URL);ready(p);dlg(p);db.otp_err=err;send(p,email);db.otp_err=None
        ck(f'{tag} -> plain words',mtxt(p)==want,mtxt(p));noraw(p,tag);c.close()
    c=ctx(b,cfg=CFG_ON);p=c.new_page();p.goto(URL);ready(p);dlg(p);c.set_offline(True);send(p);c.set_offline(False)
    ck('offline -> plain words',mtxt(p)=="You seem to be offline. Check your connection and try again.",mtxt(p));c.close()
    c=ctx(b,cfg=CFG_ON);p=c.new_page();p.goto(URL+'#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');ready(p)
    ck('expired link in hash -> dialog with plain words',mtxt(p)=='That sign-in link has expired or was already used. Ask for a new one.',mtxt(p))
    ck('expired: URL cleaned',p.evaluate("()=>!location.hash&&!/error/.test(location.search)"));noraw(p,'expired');c.close()
    # 5) Google round trip under the real CSP (no bypass): authorize -> back with tokens -> signed in + welcome toast
    c=realcsp(ctx(b,cfg=CFG_ON,csp_off=False));p=c.new_page();cons=[];p.on('console',lambda m:cons.append(m.text));errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
    p.goto(URL);ready(p);save_one(p);ck('toast path: toast shown',vis(p,'#s2sToast'));p.click('#s2sToast .s2s-go')
    ck('toast path: dialog has Continue with Google',wf(p,"()=>!!document.getElementById('acctGoogle')",5))
    n0=len(db.log);p.click('#acctGoogle');p.wait_for_load_state()
    ck('Google: welcome toast after return',wf(p,"()=>/You're signed in. Your progress is saved./.test((document.getElementById('toast')||{}).textContent||'')",15))
    a=[x for x in db.log[n0:] if x[0]=='AUTHZ'];ck('Google: /auth/v1/authorize?provider=google, redirect_to = site',a and a[0][1]=='google' and a[0][2]==URL,a)
    ck('Google: signed in (avatar, button hidden, dialog closed)',vis(p,'#acctAv') and not vis(p,'#s2sBtn') and p.evaluate("()=>document.getElementById('modal').hidden"))
    ck('Google: tokens removed from URL',p.evaluate("()=>!location.hash"))
    ck('Google: no CSP violations',not [m for m in cons if 'Content Security Policy' in m or 'Content-Security-Policy' in m],cons)
    ck('Google: no page errors',not errs,errs);c.close()
    # 6) provider disabled / user cancelled on the Google screen
    for mode,want in ((False,"Google sign-in isn't available right now. Use the email link instead."),('deny','Google sign-in was cancelled. You can try again or use the email link.')):
        db.google=mode;c=realcsp(ctx(b,cfg=CFG_ON,csp_off=False));p=c.new_page();p.goto(URL);ready(p);dlg(p);p.click('#acctGoogle');p.wait_for_load_state();ready(p)
        ck(f'Google {mode or "disabled"}: dialog shows plain words',wf(p,f"()=>(document.getElementById('acctMsg')||{{}}).textContent==={json.dumps(want)}",10),mtxt(p))
        ck(f'Google {mode or "disabled"}: URL cleaned, still guest',p.evaluate("()=>!/error/.test(location.search+location.hash)")and vis(p,'#s2sBtn'));noraw(p,f'Google {mode}');c.close()
    db.google=True
    # 7) flag off: Cloud.google() does nothing
    c=ctx(b);p=c.new_page();p.goto(URL);ready(p);n0=len(db.log);p.evaluate("()=>Cloud.google()");p.wait_for_timeout(800)
    ck('off: Cloud.google() is a no-op',not [x for x in db.log[n0:] if x[0]=='AUTHZ'] and p.url.rstrip('/')+'/'==URL);c.close()
    b.close()
f=[n for n,ok in R if not ok];print(f'{len(R)-len(f)}/{len(R)} passed');sys.exit(1 if f else 0)
