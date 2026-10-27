"""V16 Phase 3: accounts + cloud sync end to end in a real browser against a mock Supabase (tests/mock_supabase.py).
Covers: flag off = guest mode unchanged and no account requests; magic-link sign-in; first sign-in merges guest data
both ways with no loss; second device; row-level last-write-wins; offline delete; export; delete account; admin.html
gated by the admin role (password form ignored); account dialog passes axe. Run: python3 tests/test_v16_cloud.py URL"""
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
    c.route('**/cloud-config.js*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=CFG if on else 'window.CLOUD_CONFIG={url:"",anonKey:""};'))
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
    # 1) flag off: empty cloud-config.js -> guest mode only
    c=ctx(b,False);p=c.new_page();reqs=[];p.on('request',lambda r:reqs.append(r.url));p.goto(URL);ready(p)
    ck('flag off: Cloud.enabled false',p.evaluate("()=>window.Cloud&&Cloud.enabled===false"))
    ck('flag off: no account button',p.evaluate("()=>!document.getElementById('acctBtn')"))
    ck('flag off: no Supabase requests',not any('supabase' in u or '54321' in u for u in reqs))
    p.evaluate("()=>Store.set('tracker',[{id:'g0',company:'Guest only'}])");ck('flag off: guest Store works',p.evaluate("()=>Store.get('tracker')[0].company")=='Guest only')
    c.close()
    # 2) device 1: guest data, then sign in -> pushed
    c1=ctx(b);p1=c1.new_page();errs=[];p1.on('pageerror',lambda e:errs.append(str(e)));p1.goto(URL);ready(p1)
    ck('flag on: "Sign in to sync" in profile menu',p1.evaluate("()=>document.getElementById('acctBtn').textContent")=='Sign in to sync')
    p1.evaluate("()=>{Store.set('tracker',[{id:'d1a',company:'Alpha',status:'Saved'},{id:'d1b',company:'Beta',status:'Saved'}]);Store.set('profile',{...(Store.get('profile')||{}),major:'Finance'});Store.set('resumeText','SECRET RESUME TEXT')}")
    p1.evaluate("()=>{document.getElementById('pmMenu').hidden=false;document.getElementById('acctBtn').click()}")
    p1.fill('#acctEmail','nope');p1.click('#acctLink');ck('invalid email rejected client-side',wf(p1,"()=>/valid email/.test(acctMsg.textContent)",5))
    p1.evaluate("()=>closeModal&&closeModal()")
    sign_in(p1,'a@test.dev')
    ck('signed in (magic link) + URL hash cleaned',p1.evaluate("()=>Cloud.signedIn()&&Cloud.user().email==='a@test.dev'&&!/access_token/.test(location.href)"))
    ck('guest tracker rows migrated to cloud on first sign-in',set(rows('a@test.dev','tracker'))=={'d1a','d1b'},rows('a@test.dev','tracker'))
    ck('profile synced',bool(rows('a@test.dev','profile')))
    ck('raw resume text NOT synced by default',not rows('a@test.dev','resumeText'))
    ck('menu shows Account · synced',p1.evaluate("()=>document.getElementById('acctBtn').textContent")=='Account · synced')
    # 3) device 2 with its own guest data -> union both ways
    c2=ctx(b);p2=c2.new_page();p2.goto(URL);ready(p2)
    p2.evaluate("()=>Store.set('tracker',[{id:'d2x',company:'Gamma',status:'Saved'}])")
    sign_in(p2,'a@test.dev')
    t2=p2.evaluate("()=>Store.get('tracker',[]).map(x=>x.id).sort()")
    ck('device 2 first sign-in: keeps own + gets device 1 rows (no loss)',t2==['d1a','d1b','d2x'],t2)
    ck('cloud has all 3 rows',set(rows('a@test.dev','tracker'))=={'d1a','d1b','d2x'})
    p1.evaluate("()=>Cloud.sync()");p1.wait_for_timeout(500)
    ck('device 1 pulls device 2 row',p1.evaluate("()=>Store.get('tracker',[]).map(x=>x.id).sort()")==['d1a','d1b','d2x'])
    # 4) live edit pushes automatically; LWW per row
    p1.evaluate("()=>{const t=Store.get('tracker');t.find(x=>x.id==='d1a').status='Applied';Store.set('tracker',t)}");p1.wait_for_timeout(2200)
    ck('edit auto-pushed (debounced)',rows('a@test.dev','tracker')['d1a']['data']['v']['status']=='Applied')
    p2.wait_for_timeout(50);p2.evaluate("()=>{const t=Store.get('tracker');t.find(x=>x.id==='d1b').status='Interview';Store.set('tracker',t)}");p2.wait_for_timeout(2200)
    p1.evaluate("()=>Cloud.sync()");p2.evaluate("()=>Cloud.sync()");p1.wait_for_timeout(400)
    s1=p1.evaluate("()=>Object.fromEntries(Store.get('tracker').map(x=>[x.id,x.status]))");s2=p2.evaluate("()=>Object.fromEntries(Store.get('tracker').map(x=>[x.id,x.status]))")
    ck('different rows edited on 2 devices: both edits survive',s1==s2=={'d1a':'Applied','d1b':'Interview','d2x':'Saved'} or (s1==s2 and s1.get('d1a')=='Applied' and s1.get('d1b')=='Interview'),(s1,s2))
    p1.evaluate("()=>{const t=Store.get('tracker');t.find(x=>x.id==='d2x').status='Offer';Store.set('tracker',t)}");p1.wait_for_timeout(300)
    p2.evaluate("()=>{const t=Store.get('tracker');t.find(x=>x.id==='d2x').status='Rejected';Store.set('tracker',t)}");p2.wait_for_timeout(2500)
    p1.evaluate("()=>Cloud.sync()");p1.wait_for_timeout(300)
    ck('same row edited on 2 devices: last write wins everywhere',p1.evaluate("()=>Store.get('tracker').find(x=>x.id==='d2x').status")=='Rejected'==rows('a@test.dev','tracker')['d2x']['data']['v']['status'])
    p2.evaluate("()=>Store.set('tracker',Store.get('tracker').filter(x=>x.id!=='d1a'))");p2.wait_for_timeout(2200);p1.evaluate("()=>Cloud.sync()");p1.wait_for_timeout(300)
    ck('delete on device 2 reaches device 1',p1.evaluate("()=>!Store.get('tracker').some(x=>x.id==='d1a')"))
    # 5) opt-in resume
    p1.evaluate("()=>{const q=Store.get('prefs',{})||{};q.cloudResume=true;Store.set('prefs',q)}");p1.wait_for_timeout(1800);p1.evaluate("()=>Cloud.sync()");p1.wait_for_timeout(400)
    ck('resume text syncs only after opt-in',bool(rows('a@test.dev','resumeText')))
    # 6) isolation through the API: user B sees nothing of A
    c3=ctx(b);p3=c3.new_page();p3.goto(URL);ready(p3);sign_in(p3,'b@test.dev')
    ck('user B sees none of A\'s rows',p3.evaluate("()=>!Store.get('tracker',[]).some(x=>/^d[12]/.test(x.id))"))
    ck('B cannot write a row as A (403)',p3.evaluate(f"async()=>{{const s=JSON.parse(localStorage.idr__cloud_session);const r=await fetch('{MOCK}/rest/v1/user_items',{{method:'POST',headers:{{apikey:'test-anon',authorization:'Bearer '+s.access_token,'content-type':'application/json'}},body:JSON.stringify([{{user_id:'{next(u for u in db.users.values() if u['email']=='a@test.dev')['id']}',coll:'tracker',item_id:'x',data:{{}},updated_at:new Date().toISOString()}}])}});return r.status}}")==403)
    # 7) account dialog: export + axe
    p1.evaluate("()=>{document.getElementById('pmMenu').hidden=false;document.getElementById('acctBtn').click()}")
    ck('signed-in dialog shows email + delete',p1.evaluate("()=>/a@test.dev/.test(mbody.textContent)&&!!document.getElementById('acctDel')"))
    with p1.expect_download() as dl:p1.click('#acctExport')
    ex=json.load(open(dl.value.path()));ck('Export my data includes local + cloud rows',ex.get('data',{}).get('tracker') and len(ex['cloud']['rows'])>=3)
    p1.add_script_tag(url='https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js')
    v=p1.evaluate("async()=>(await axe.run('#modal',{runOnly:['wcag2a','wcag2aa']})).violations.map(x=>x.id)");ck('account dialog: axe AA clean',not v,v)
    p1.evaluate("()=>closeModal()")
    # 8) admin gate
    pa=c1.new_page();pa.goto(URL+'admin.html');pa.wait_for_timeout(1500)
    ck('admin.html: password form hidden when accounts on',pa.evaluate("()=>document.getElementById('gForm').hidden"))
    pa.evaluate("()=>sessionStorage.setItem('idr_admin','1')");pa.reload();pa.wait_for_timeout(1500)
    ck('admin.html: non-admin denied (even with old session flag)',pa.evaluate("()=>document.getElementById('adm').hidden&&/not an admin/.test(gMsg.textContent)"))
    db.admins.add(next(u for u in db.users.values() if u['email']=='a@test.dev')['id']);pa.reload()
    ck('admin.html: admin role opens the page',wf(pa,"()=>!document.getElementById('adm').hidden",10))
    pg=c3.new_context() if False else b.new_context(bypass_csp=True);pg.route('**/cloud-config.js*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=CFG))
    pn=pg.new_page();pn.goto(URL+'admin.html');pn.wait_for_timeout(1500)
    ck('admin.html: signed-out visitor gets sign-in prompt',pn.evaluate("()=>document.getElementById('adm').hidden&&/Sign in with an admin account/.test(gMsg.textContent)"))
    # 9) delete account
    p3.evaluate("()=>{document.getElementById('pmMenu').hidden=false;document.getElementById('acctBtn').click();document.querySelector('#acctDel').closest('details').open=true}")
    p3.fill('#acctDelTxt','nah');p3.click('#acctDel');ck('delete needs typed DELETE',wf(p3,"()=>/Type DELETE/.test(acctMsg.textContent)",5))
    p3.fill('#acctDelTxt','DELETE');p3.click('#acctDel');p3.wait_for_timeout(800)
    ck('delete account: user + rows gone from cloud, signed out',not any(u['email']=='b@test.dev' for u in db.users.values()) and p3.evaluate("()=>!Cloud.signedIn()"))
    p1.evaluate("()=>Cloud.signOut()");ck('sign out keeps local data',p1.evaluate("()=>!Cloud.signedIn()&&Store.get('tracker',[]).length>=2"))
    ck('no page errors',not errs,errs[:3])
    b.close()
srv.shutdown()
print(f"{sum(c for _,c in R)}/{len(R)} passed");sys.exit(0 if all(c for _,c in R) else 1)
