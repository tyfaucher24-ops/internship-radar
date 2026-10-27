"""Live magic-link check (manual): EA=<email A> EB=<email B> python3 tests/test_v16_live_auth.py
Sends real sign-in emails (Supabase free tier allows only a few per hour). Paste each link from the inbox into
/tmp/linkA.txt and /tmp/linkB.txt when the script prints WAITING. Write SKIP into linkB to skip the second user."""
import json,os,time,sys,urllib.request
from playwright.sync_api import sync_playwright
U='https://tyfaucher24-ops.github.io/internship-radar/';SB='https://jsmhrhniqxohsalbejuw.supabase.co';K='sb_publishable_59cFpjnYQoxlJVtlXxnAYw_V8GTebnr'
OUT='/workspace/internship-radar/ops/screens/v16.3/';R=[]
def ck(n,c,x=''):R.append((n,bool(c)));print(('PASS ' if c else 'FAIL ')+n,x if not c else '',flush=True)
def waitfile(f):
    print('WAITING',f,flush=True)
    while not os.path.exists(f):time.sleep(2)
    time.sleep(.5);return open(f).read().strip()
def rest(path,tok,method='GET',body=None):
    rq=urllib.request.Request(SB+path,method=method,data=json.dumps(body).encode() if body is not None else None,headers={'apikey':K,'authorization':'Bearer '+tok,'content-type':'application/json'})
    try:
        with urllib.request.urlopen(rq) as r:return r.status,json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e:return e.code,e.read().decode()[:200]
def opendlg(p):p.evaluate("()=>{document.getElementById('pmMenu').hidden=false;document.getElementById('acctBtn').click()}");p.wait_for_timeout(500)
def shots(p,tag):
    for w,h in((1440,900),(390,844)):
        p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(400);p.screenshot(path=f'{OUT}{tag}-light-{w}.png')
    p.set_viewport_size({'width':1440,'height':900})
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch()
    def ctx():
        c=b.new_context(viewport={'width':1440,'height':900},color_scheme='light');return c
    c1=ctx();p=c1.new_page();p.on('pageerror',lambda e:errs.append(str(e)))
    p.goto(U);p.wait_for_function("()=>window.Cloud&&window.Store",timeout=30000)
    ck('accounts enabled live',p.evaluate("()=>Cloud.enabled"))
    p.evaluate("()=>{localStorage.setItem('idr_theme','light');Store.set('savedFilters',[{id:'sfLive1',name:'Live test filter',q:'software'}]);Store.set('tracker',[{id:'trLive1',company:'LiveCo',status:'Saved'}])}")
    p.reload();p.wait_for_function("()=>window.Cloud",timeout=30000);p.wait_for_timeout(1500)
    opendlg(p);ck('no Google button (Google off)',p.evaluate("()=>!document.getElementById('acctGoogle')"))
    shots(p,'account-signed-out')
    p.fill('#acctEmail',os.environ['EA']);p.click('#acctLink');p.wait_for_timeout(3000)
    m=p.evaluate("()=>acctMsg.textContent");print('MSG A',m,flush=True);ck('magic link sent (A)',('sent' in m.lower() or 'check' in m.lower()),m)
    link=waitfile('/tmp/linkA.txt')
    p.goto(link);p.wait_for_function("()=>window.Cloud&&Cloud.signedIn()",timeout=30000);p.wait_for_timeout(4000)
    ck('signed in via real magic link; hash cleaned',p.evaluate("()=>Cloud.signedIn()&&!/access_token/.test(location.hash)"))
    s=json.loads(p.evaluate("()=>localStorage.idr__cloud_session"));tokA=s['access_token'];uidA=s['user']['id']
    st,rows=rest('/rest/v1/user_items?select=coll,item_id,user_id',tokA)
    ids={(r['coll'],r['item_id']) for r in rows} if st==200 else set()
    ck('guest saved filter + tracker migrated to cloud',('savedFilters','sfLive1') in ids and ('tracker','trLive1') in ids,(st,ids))
    p.evaluate("()=>{const t=Store.get('tracker');t.push({id:'trLive2',company:'LiveCo2',status:'Applied'});Store.set('tracker',t)}");p.wait_for_timeout(5000)
    st,rows=rest('/rest/v1/user_items?select=item_id&coll=eq.tracker',tokA);ck('live edit auto-synced',st==200 and any(r['item_id']=='trLive2' for r in rows),(st,rows))
    opendlg(p);shots(p,'account-signed-in')
    p.evaluate("()=>closeModal()")
    # device 2 same user? reuse session token: second context receives via sync
    # user B
    c2=ctx();q=c2.new_page();q.goto(U);q.wait_for_function("()=>window.Cloud",timeout=30000);q.wait_for_timeout(1500);opendlg(q)
    q.evaluate("e=>{acctEmail.value=e;acctLink.click()}",os.environ['EB']);q.wait_for_timeout(3000);mb=q.evaluate("()=>acctMsg.textContent");print('MSG B',mb,flush=True)
    linkB=waitfile('/tmp/linkB.txt')
    if linkB!='SKIP':
        q.goto(linkB);q.wait_for_function("()=>window.Cloud&&Cloud.signedIn()",timeout=30000);q.wait_for_timeout(3000)
        sb=json.loads(q.evaluate("()=>localStorage.idr__cloud_session"));tokB=sb['access_token']
        ck('user B signed in, different user',sb['user']['id']!=uidA)
        ck('B UI has none of A\'s tracker rows',q.evaluate("()=>!Store.get('tracker',[]).some(x=>/^trLive/.test(x.id))"))
        st,rows=rest(f'/rest/v1/user_items?select=item_id&user_id=eq.{uidA}',tokB);ck('RLS: B reading A\'s rows gets 0',st==200 and rows==[],(st,rows))
        st,_=rest('/rest/v1/user_items',tokB,'POST',[{'user_id':uidA,'coll':'tracker','item_id':'evil','data':{'v':1},'updated_at':'2026-10-27T00:00:00Z'}]);ck('RLS: B writing as A rejected',st in(401,403),st)
        st,rows=rest(f'/rest/v1/user_items?select=item_id&user_id=eq.{uidA}&item_id=eq.evil',tokA);ck('A has no injected row',st==200 and rows==[])
        st,r=rest('/rest/v1/rpc/is_admin',tokB,'POST',{});ck('is_admin false for B',st==200 and r is False,(st,r))
        q.evaluate("()=>Cloud.deleteAccount()");q.wait_for_timeout(1500);st,_=rest('/auth/v1/user',tokB);ck('B test account deleted (cleanup)',st in(401,403,404),st)
    p.evaluate("()=>Cloud.signOut()");p.wait_for_timeout(1500)
    ck('sign-out keeps local data',p.evaluate("()=>!Cloud.signedIn()&&Store.get('tracker',[]).some(x=>x.id==='trLive2')"))
    ck('no page errors',not errs,errs)
    print(f"{sum(x for _,x in R)}/{len(R)} passed")
