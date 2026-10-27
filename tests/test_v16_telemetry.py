"""V16 Phase 5: cookie-free counts, Report a problem, listing reports, scrubbed error log, admin launch dashboard (mock Supabase)."""
import sys,time,json,os
sys.path.insert(0,os.path.dirname(__file__))
from playwright.sync_api import sync_playwright
import mock_supabase
URL=sys.argv[1].rstrip('/')+'/'
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
db,srv=mock_supabase.start()
MOCK='http://127.0.0.1:54321'
CFG=f"window.CLOUD_CONFIG={{url:'{MOCK}',anonKey:'test-anon',google:true}};"
def ctx(b,on=True):
    c=b.new_context(viewport={'width':1280,'height':900},bypass_csp=True)
    if on:c.route('**/cloud-config.js*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=CFG))
    return c
def ready(p):wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0",120);p.evaluate("()=>window.__introEnd&&__introEnd(false)")
def sign_in(p,email):
    p.evaluate("()=>{document.getElementById('pmMenu').hidden=false;document.getElementById('acctBtn').click()}")
    p.fill('#acctEmail',email);p.click('#acctLink');wf(p,"()=>/Check your email/.test(document.getElementById('acctMsg').textContent)",10)
    link=json.loads(__import__('urllib.request').request.urlopen(f'{MOCK}/__test/link?email={email}').read())['url']
    p.goto(link);ready(p);wf(p,"()=>Cloud.signedIn()&&!location.hash.includes('access_token')",20);p.wait_for_timeout(800)
def rows(email,coll):
    u=next((u for u in db.users.values() if u['email']==email),None)
    return {k[2]:v for k,v in db.rows.items() if u and k[0]==u['id'] and k[1]==coll and not v['deleted']}
with sync_playwright() as pw:
    b=pw.chromium.launch()
    # 1) flag off: real (empty) cloud-config.js -> guest mode only
    c=ctx(b);p=c.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)));p.goto(URL);ready(p)
    ck('Telemetry on with config',p.evaluate("()=>Telemetry.enabled&&!Telemetry.quiet"))
    ck('no cookies set',c.cookies()==[])
    p.evaluate("()=>go('about')");p.evaluate("()=>go('feedback')");p.wait_for_timeout(4800)
    ck('pageview + feedback_view counted',db.events.count('pageview')>=2 and 'feedback_view' in db.events,db.events)
    ck('events are bare names only',all(isinstance(e,str) and len(e)<20 for e in db.events))
    p.evaluate("()=>{const t=Store.get('tracker',[]);const n=Array.isArray(t)?[...t,{id:'telx',company:'X',title:'Y'}]:{...t,telx:{id:'telx'}};Store.set('tracker',n)}")
    p.evaluate("()=>Store.set('resumeText','hello resume')");p.wait_for_timeout(4800)
    ck('save + resume_upload counted',db.events.count('save')>=1 and 'resume_upload' in db.events,db.events)
    ck('no resume text sent anywhere',not any('hello resume' in json.dumps(x) for x in db.reports+db.errors) and 'hello resume' not in json.dumps(db.events))
    # error log scrub
    p.evaluate("()=>setTimeout(()=>{throw new Error('boom for jane.doe@gmail.com at https://x.com/a?token=abc 1234567890')},0)");p.wait_for_timeout(1500)
    m=db.errors[-1]['p_msg'] if db.errors else ''
    ck('error logged',bool(db.errors),db.errors)
    ck('error scrubbed (email, query, long number)','@' not in m and 'token=' not in m and '1234567890' not in m,m)
    # listing report
    p.goto(URL+'#db');ready(p);p.wait_for_timeout(500)
    p.evaluate("()=>{const x=[...BYID.values()].find(x=>x.st!=='closed');openDrawer(x)}");p.wait_for_timeout(800)
    p.evaluate("()=>document.querySelector('[data-rep=\"wrong\"]').click()");p.wait_for_timeout(1500)
    ck('listing report stored',any(r['p_kind']=='wrong' and r['p_listing_id'] for r in db.reports),db.reports)
    ck('report confirmation shown',p.evaluate("()=>/Report sent/.test(document.getElementById('repMsg').textContent)"))
    # report a problem
    p.evaluate("()=>{document.querySelector('[data-go]')&&0;closeDrawer&&closeDrawer();document.querySelector('[data-reportproblem]').click()}");p.wait_for_timeout(400)
    p.fill('#rpForm textarea','The filters panel froze');p.evaluate("()=>document.querySelector('#rpForm button').click()");p.wait_for_timeout(1200)
    ck('problem report stored',any(r['p_kind']=='problem' and 'froze' in (r['p_note'] or '') for r in db.reports))
    ck('footer has Report a problem',p.evaluate("()=>!!document.querySelector('footer [data-reportproblem]')"))
    ck('no page errors (except the test throw)',[e for e in errs if 'boom' not in e]==[],errs)
    c.close()
    # DNT: nothing counted
    n0=len(db.events);c=b.new_context(bypass_csp=True,extra_http_headers={'DNT':'1'});c.add_init_script("Object.defineProperty(navigator,'doNotTrack',{get:()=>'1'})")
    c.route('**/cloud-config.js*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=CFG))
    p=c.new_page();p.goto(URL);ready(p);p.evaluate("()=>go('about')");p.wait_for_timeout(4800)
    ck('Do Not Track: no events',len(db.events)==n0 and p.evaluate("()=>Telemetry.quiet"))
    c.close()
    # 0003 missing: quiet fallback to GitHub link
    db.no0003=True;c=ctx(b);p=c.new_page();errs=[];p.on('pageerror',lambda e:errs.append(str(e)));p.goto(URL);ready(p);p.evaluate("()=>go('about')");p.wait_for_timeout(4800)
    ck('without 0003: telemetry switches off',p.evaluate("()=>!Telemetry.available()"))
    p.evaluate("()=>document.querySelector('[data-reportproblem]').click()");p.fill('#rpForm textarea','x');p.evaluate("()=>document.querySelector('#rpForm button').click()");p.wait_for_timeout(800)
    ck('without 0003: problem report falls back to GitHub',p.evaluate("()=>/GitHub/.test(document.getElementById('rpMsg').textContent)"))
    ck('without 0003: no page errors',errs==[],errs);c.close();db.no0003=False
    # admin dashboard
    c=ctx(b);p=c.new_page();p.goto(URL);ready(p);sign_in(p,'boss@x.test');u=next(u for u in db.users.values() if u['email']=='boss@x.test');db.admins.add(u['id'])
    ck('signup counted for a brand-new account',(p.wait_for_timeout(4800) or 'signup' in db.events),db.events)
    p.goto(URL+'admin.html');wf(p,"()=>/accounts/.test((document.getElementById('dash')||{}).textContent||'')",20)
    t=p.evaluate("()=>document.getElementById('dash').textContent")
    ck('admin dashboard shows sync + usage + reports + errors',all(s in t for s in ['Last good sync','page views','Recent reports','froze','Top errors']),t[:300])
    c2=ctx(b);q=c2.new_page();q.goto(URL);ready(q);sign_in(q,'nobody@x.test');q.goto(URL+'admin.html');q.wait_for_timeout(1500)
    ck('non-admin: dashboard stays hidden',q.evaluate("()=>document.getElementById('adm').hidden"))
    b.close()
srv.shutdown()
print(f"{sum(c for _,c in R)}/{len(R)} passed");sys.exit(0 if all(c for _,c in R) else 1)
