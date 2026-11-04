# V19.4 heartbeat: tab name only, <=1 per 45 s, DNT/GPC respected, 404 stops it, nothing visible.
import sys,json
from playwright.sync_api import sync_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8813/'
ok=0;tot=0
def ck(n,c,info=''):
    global ok,tot;tot+=1;ok+=bool(c);print(('PASS ' if c else 'FAIL ')+n,'' if c else info)
TABS={'db','tracker','profile','autopilot','feedback','about','contact','privacy','terms',None}
def run(b,dnt=False,status=204,cloud=True):
    c=b.new_context(viewport={'width':1280,'height':900},extra_http_headers={'DNT':'1'} if dnt else {})
    c.add_init_script("localStorage.setItem('idr_intro_seen','1');"+("Object.defineProperty(navigator,'doNotTrack',{get:()=>'1'});" if dnt else ""))
    pg=c.new_page();pg.clock.install();beats=[];errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    def rt(r):
        if r.request.url.endswith('/rpc/heartbeat'):beats.append(json.loads(r.request.post_data or '{}'));return r.fulfill(status=status,body='' if status==204 else '{"message":"nf"}',headers={'content-type':'application/json'})
        return r.continue_()
    pg.route('**/rest/v1/rpc/**',rt)
    pg.goto(URL+('?cloud=0' if not cloud else '')+'#find');pg.wait_for_timeout(1500);pg.clock.run_for(1500);pg.wait_for_timeout(400)
    return c,pg,beats,errs
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    c,pg,beats,errs=run(b)
    ck('one beat on load',len(beats)==1,beats)
    for t in ('tracker','profile','autopilot'):pg.evaluate(f"document.dispatchEvent(new CustomEvent('radar:page',{{detail:'{t}'}}))")
    ck('tab switches inside 45 s add no beats',len(beats)==1,beats)
    pg.clock.run_for(46000);pg.evaluate("document.dispatchEvent(new CustomEvent('radar:page',{detail:'profile'}))");pg.wait_for_timeout(400)
    ck('after 45 s a tab switch beats with the tab',len(beats)==2 and beats[-1]=={'p_page':'profile'},beats)
    pg.clock.run_for(46000);pg.evaluate("document.dispatchEvent(new CustomEvent('radar:page',{detail:'job-123 Goldman'}))");pg.wait_for_timeout(400)
    ck('non-tab value sends null',beats[-1]=={'p_page':None},beats)
    n=len(beats);pg.clock.run_for(5*60000);pg.wait_for_timeout(400)
    ck('60 s timer while visible (5 min ~ 5 beats)',4<=len(beats)-n<=6,len(beats)-n)
    ck('every page value is a tab name or null',all(x.get('p_page') in TABS and set(x)=={'p_page'} for x in beats),beats)
    ck('no page errors',not errs,errs);c.close()
    c,pg,beats,errs=run(b,dnt=True);pg.clock.run_for(3*60000)
    ck('DNT signed out: no beats',not beats,beats);c.close()
    c,pg,beats,errs=run(b,cloud=False);pg.clock.run_for(3*60000)
    ck('?cloud=0: no beats',not beats,beats);ck('?cloud=0 no errors',not errs,errs);c.close()
    c,pg,beats,errs=run(b,status=404);pg.clock.run_for(5*60000)
    ck('404 stops after first beat',len(beats)==1,beats);ck('404 no page errors',not errs,errs);c.close()
    b.close()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    c=b.new_context();c.add_init_script("localStorage.setItem('idr_intro_seen','1')");pg=c.new_page();bt=[]
    pg.route('**/rest/v1/rpc/**',lambda r:(bt.append(json.loads(r.request.post_data or '{}')),r.fulfill(status=204,body=''))[1] if r.request.url.endswith('/rpc/heartbeat') else r.continue_())
    pg.goto(URL+'#privacy');pg.wait_for_timeout(3000)
    ck('load on #privacy reports privacy',bt==[{'p_page':'privacy'}],bt);b.close()
print(f'V19.4 HEARTBEAT {ok} / {tot}')
