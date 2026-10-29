"""V17 UI on mock Supabase: Email alerts settings, one-click unsubscribe, ?ref=email deep link, V17 events (DNT respected),
#admin/stats admin-only with 'Not found' for guests/non-admins, CSV export, axe AA in light+dark at 1440/1280/768/390,
and screenshots to ops/screens/v17/. Usage: python3 tests/test_v17_ui.py http://localhost:8811 [--shots]"""
import sys,time,json,os,urllib.request
sys.path.insert(0,os.path.dirname(__file__))
from playwright.sync_api import sync_playwright
import mock_supabase
URL=sys.argv[1].rstrip('/')+'/';SHOTS='--shots' in sys.argv;OUT='ops/screens/v17';os.makedirs(OUT,exist_ok=True)
AXE='/tmp/lh/node_modules/axe-core/axe.min.js'
R=[]
def ck(n,c,info=''):R.append((n,bool(c)));print(('PASS' if c else 'FAIL'),n,'' if c else info,flush=True)
def wf(p,js,t=60):
    e=time.time()+t
    while time.time()<e:
        try:
            if p.evaluate(js):return True
        except Exception:pass
        time.sleep(.2)
    return False
db,srv=mock_supabase.start();MOCK='http://127.0.0.1:54321'
CFG=f"window.CLOUD_CONFIG={{url:'{MOCK}',anonKey:'test-anon',google:true}};"
ARGS=['--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks']
def ctx(b,w=1280,theme='light',dnt=False):
    c=b.new_context(viewport={'width':w,'height':900},bypass_csp=True,accept_downloads=True)
    c.route('**/cloud-config.js*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=CFG))
    c.add_init_script(f"try{{localStorage.setItem('ir_ui',JSON.stringify({{theme:'{theme}'}}));localStorage.setItem('idr__intro_done','1')}}catch(e){{}}"+("Object.defineProperty(navigator,'doNotTrack',{get:()=>'1'});" if dnt else ''))
    return c
def ready(p):wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0",120);p.evaluate("()=>window.__introEnd&&__introEnd(false)")
def sign_in(p,email):
    p.evaluate("()=>{document.getElementById('pmMenu').hidden=false;document.getElementById('acctBtn').click()}")
    p.fill('#acctEmail',email);p.click('#acctLink');wf(p,"()=>/Check your email/.test(document.getElementById('acctMsg').textContent)",10)
    link=json.loads(urllib.request.urlopen(f'{MOCK}/__test/link?email={email}').read())['url']
    p.goto(link);ready(p);wf(p,"()=>Cloud.signedIn()&&!location.hash.includes('access_token')",20);p.wait_for_timeout(600)
def uid(email):return next(u['id'] for u in db.users.values() if u['email']==email)
def axe(p,sel):
    p.add_script_tag(path=AXE)
    return p.evaluate("async(c)=>{const r=await axe.run(document.querySelector(c),{runOnly:['wcag2a','wcag2aa']});return r.violations.map(v=>v.id+':'+v.nodes.length+' '+v.nodes.slice(0,2).map(x=>x.target.join(' ')).join(' | '))}",sel)
SEED={'users':41,'signups_7d':9,'signups_30d':27,'dau':18,'wau':52,'mau':120,'saves_7d':64,'apply_clicks_7d':23,'email_subscribers':15,
 'daily':[{'day':f'2026-10-{d:02d}','signups':d%4,'active':10+(d*7)%13} for d in range(1,29)],
 'funnel':{'visit':300,'profile_built':120,'signup':41,'first_save':30,'first_apply':17},
 'cohorts':[{'week':'2026-09-28','size':10,'weeks':[{'w':w,'n':max(0,8-w)} for w in range(1,9)]},{'week':'2026-10-19','size':12,'weeks':[{'w':w,'n':max(0,9-w)} for w in range(1,9)]}],
 'top_companies':[{'name':'Fidelity Investments','n':6},{'name':'Capital One','n':4}],'top_roles':[{'name':'Software Engineering Intern','n':5}],'top_schools':[],
 'email':{'sent':40,'clicks':11,'unsub_by_type':{'digest':1}}}
def stats_calls():return len([l for l in db.log if l==('POST','/rest/v1/rpc/admin_stats_v17')])
with sync_playwright() as pw:
    b=pw.chromium.launch(args=ARGS)
    c=ctx(b);p=c.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)));p.goto(URL);ready(p)
    p.evaluate("()=>go('profile')");wf(p,"()=>document.getElementById('eaSignIn')",10)
    ck('guest sees "Sign in to get deadline alerts"',p.evaluate("()=>document.getElementById('eaSignIn').textContent")=='Sign in to get deadline alerts')
    p.click('#eaSignIn');ck('that button opens the sign-in dialog',wf(p,"()=>{const e=document.getElementById('acctEmail');return e&&e.offsetParent!==null}",5))
    p.keyboard.press('Escape')
    p.goto(URL+'#admin/stats');ready(p);wf(p,"()=>/Not found/.test(document.getElementById('t-stats').textContent)",15)
    ck('guest: #admin/stats shows Not found',p.evaluate("()=>!document.getElementById('t-stats').hidden&&/Not found/.test(document.getElementById('t-stats').textContent)"))
    p.wait_for_timeout(3500);p.evaluate("()=>Events17.flush()");p.wait_for_timeout(500)
    ck('anonymous visit event with a daily random id, no cookies',any(e['e']=='visit' and len(e.get('a',''))==12 and not e['uid'] for e in db.ev17) and c.cookies()==[],db.ev17)
    ck('no JS errors (guest)',not errs,errs);c.close()
    n0=len(db.ev17);c=ctx(b,dnt=True);p=c.new_page();p.goto(URL);ready(p);p.wait_for_timeout(3500);p.evaluate("()=>Events17.flush()");p.wait_for_timeout(400)
    ck('Do Not Track: no anonymous events',len(db.ev17)==n0,db.ev17[n0:]);c.close()
    c=ctx(b);p=c.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)));p.goto(URL);ready(p);sign_in(p,'stu@x.test')
    p.evaluate("()=>go('profile')");wf(p,"()=>document.getElementById('eaOpt')",10)
    ck('opt-in text exactly as spec',"Email me about my saved deadlines and new matches." in p.inner_text('#emailAlerts'))
    me=uid('stu@x.test')
    ck('nothing before opt-in (opted_in false, toggles disabled)',db.prefs[me]['opted_in'] is False and p.evaluate("()=>document.querySelector('.ea-set').disabled"))
    p.check('#eaOpt');wf(p,"()=>document.getElementById('eaMsg')&&/Saved/.test(document.getElementById('eaMsg').textContent)",5)
    pr=db.prefs[me];ck('opt-in saved with browser time zone',pr['opted_in'] is True and pr['tz']==p.evaluate("()=>Intl.DateTimeFormat().resolvedOptions().timeZone"),pr)
    p.select_option('#eaDow','5');p.wait_for_timeout(500);p.select_option('#eaHour','9');p.wait_for_timeout(500);p.evaluate("()=>document.getElementById('eaMatch').click()");p.wait_for_timeout(600)
    ck('day, hour and toggles persist',(pr['digest_dow'],pr['digest_hour'],pr['matches'])==(5,9,False),pr)
    p.reload();ready(p);p.evaluate("()=>go('profile')");wf(p,"()=>document.getElementById('eaDow')",10)
    ck('settings reload from the server',p.evaluate("()=>document.getElementById('eaDow').value==='5'&&document.getElementById('eaHour').value==='9'&&!document.getElementById('eaMatch').checked"))
    if SHOTS:
        for w,hh in ((1440,900),(390,844)):
            p.set_viewport_size({'width':w,'height':hh});p.locator('#emailAlerts').scroll_into_view_if_needed();p.wait_for_timeout(300);p.screenshot(path=f'{OUT}/v17-email-settings-light-{w}.png')
        p.set_viewport_size({'width':1280,'height':900})
    p.evaluate("()=>go('db')");lid=p.evaluate("()=>[...BYID.values()].find(x=>x.st!=='closed').id")
    p.evaluate("id=>{const t=Store.get('tracker',[])||[];t.push({id:Store.uid(),listingId:id,listing:{company:'X',title:'Y'},status:'Saved',history:['Saved']});Store.set('tracker',t)}",lid)
    p.evaluate("()=>{const t=Store.get('tracker').map(x=>({...x}));t[t.length-1].status='Applied';Store.set('tracker',t)}");p.wait_for_timeout(300);p.evaluate("()=>Events17.flush()");p.wait_for_timeout(600)
    ck('save + status-change events carry the signed-in user',any(e['e']=='save' and e['uid']==me for e in db.ev17) and any(e['e']=='tracker_status_change' and e.get('r')=='Applied' for e in db.ev17),[e for e in db.ev17 if e['uid']==me])
    n1=stats_calls();p.goto(URL+'#admin/stats');ready(p);wf(p,"()=>/Not found/.test(document.getElementById('t-stats').textContent)",15)
    ck('non-admin: #admin/stats shows Not found, stats never requested',p.evaluate("()=>/Not found/.test(document.getElementById('t-stats').textContent)") and stats_calls()==n1)
    ck('no JS errors (signed in)',not errs,errs);c.close()
    db.prefs[me]['digest']=True;c=ctx(b);p=c.new_page();p.goto(URL+'#unsub='+'a'*48+'&t=digest');ready(p);wf(p,"()=>document.getElementById('unsubOk')",10)
    ck('one-click unsubscribe without login (digest only)',db.prefs[me]['digest'] is False and db.prefs[me]['opted_in'] is True and 'unsub' not in p.url)
    p.goto(URL+'?u=2#unsub='+'b'*48);ready(p);wf(p,"()=>/didn’t match/.test(document.getElementById('notice').textContent)",10)
    ck('unknown token: clear message, nothing changed',db.prefs[me]['opted_in'] is True and 'didn’t match' in p.inner_text('#notice'))
    n0=len(db.ev17);p.goto(URL+f'?ref=email&t=digest#l={lid}');ready(p);ck('?ref=email#l=<id> opens that listing',wf(p,"()=>!document.getElementById('drawer').hidden",10))
    p.wait_for_timeout(3500);p.evaluate("()=>Events17.flush()");p.wait_for_timeout(500);ck('email_click counted with type',any(e['e']=='email_click' and e.get('r')=='digest' for e in db.ev17[n0:]),db.ev17[n0:]);c.close()
    for theme in ('light','dark'):
        for w in (1440,1280,768,390):
            c=ctx(b,w,theme);p=c.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)));p.goto(URL);ready(p);sign_in(p,'boss@x.test');db.admins.add(uid('boss@x.test'))
            db.stats17=None;p.goto(URL+'#admin/stats');ready(p);wf(p,"()=>document.querySelector('.fs-cards')",15)
            if (theme,w)==('light',1440):
                ck('admin, empty DB: "Not enough data yet"',p.locator('.fs-empty').count()>=5,p.locator('.fs-empty').count())
                if SHOTS:p.screenshot(path=f'{OUT}/v17-stats-empty-light-1440.png',full_page=True)
            db.stats17=SEED;p.evaluate("()=>FounderStats.load()");wf(p,"()=>document.querySelector('.fs-chart')",10);p.wait_for_timeout(300)
            if (theme,w)==('light',1440):
                ck('admin sees cards, chart, funnel, cohorts',p.locator('.fs-chart').count()==1 and p.locator('.fs-fun li').count()==5 and p.locator('.fs-t').count()>=3)
                ck('stickiness computed (52/120 = 43%)','43%' in p.inner_text('.fs-cards'))
                with p.expect_download() as d:p.click('[data-csv="companies"]')
                txt=open(d.value.path()).read();ck('Export CSV',txt.startswith('company,users\n') and 'Fidelity Investments,6' in txt,txt)
                p.fill('#fsFrom','2026-10-01');p.fill('#fsTo','2026-10-28');n0=stats_calls();p.click('#fsRange button');p.wait_for_timeout(800)
                ck('date range refetches',stats_calls()>n0)
            if SHOTS and theme=='light' and w in (1440,390):p.screenshot(path=f'{OUT}/v17-stats-testseed-light-{w}.png',full_page=True)
            v=axe(p,'#t-stats');ck(f'axe AA stats {theme} {w}',not v,v)
            p.evaluate("()=>go('profile')");wf(p,"()=>document.getElementById('eaOpt')",10);p.check('#eaOpt');p.wait_for_timeout(500)
            v=axe(p,'#emailAlerts');ck(f'axe AA email settings {theme} {w}',not v,v)
            ck(f'no horizontal scroll {theme} {w}',p.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+1"))
            ck(f'no JS errors admin {theme} {w}',not errs,errs);c.close()
    b.close()
srv.shutdown();f=[n for n,ok in R if not ok];print(f'{len(R)-len(f)}/{len(R)} passed');sys.exit(1 if f else 0)
