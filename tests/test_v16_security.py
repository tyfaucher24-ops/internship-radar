"""V16 Phase 1 security checks (live or local URL):
XSS payloads injected into listing fields (index, detail, description shards), resume text and profile must never execute
or create elements; admin not linked publicly; admin noindex + robots disallow; referrer policy + CSP present; every
target=_blank link has rel=noopener; apply links never use javascript: URLs; CSS consolidated into site.css.
Run: python3 tests/test_v16_security.py URL"""
import sys,re,json,time
from playwright.sync_api import sync_playwright
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
    raise Exception('timeout '+js)
H='window.__xss=(window.__xss||0)+1'
PAY=[f'<img src=x onerror="{H}">',f'"><svg onload="{H}">',f"'><script>{H}</script>",f'<a href="javascript:{H}">x</a>',f'<iframe srcdoc="<script>parent.{H}</script>">']
N=60
def poison_index(route):
    r=route.fetch();d=r.json();n=0
    for i,x in enumerate(d['listings']):
        if x.get('status')!='open' or n>=N:continue
        p=PAY[n%len(PAY)];n+=1
        x['company']='XSSCO '+p;x['title']='XSS title '+p;x['category']=x.get('category') or 'Other'
        for l in x.get('locations') or []:
            if l.get('city'):l['city']='Town'+p
        x['terms']=[t+p for t in x.get('terms') or []]
    route.fulfill(response=r,body=json.dumps(d),headers={**r.headers,'content-type':'application/json'})
def poison_shard(route):
    r=route.fetch();d=r.json()
    for k in list(d)[:400]:
        v=d[k]
        if isinstance(v,str):d[k]=v+'\n\n'+' '.join(PAY)
        elif isinstance(v,dict):
            v['source']='Src '+PAY[0];v['apply_link']=v['apply_url']=f'javascript:{H}'
    route.fulfill(response=r,body=json.dumps(d),headers={**r.headers,'content-type':'application/json'})
CK="()=>({xss:window.__xss||0,bad:document.querySelectorAll('img[src=\"x\"],svg[onload],iframe[srcdoc],script:not([src])[data-x],a[href^=\"javascript:\"]').length})"
with sync_playwright() as pw:
    br=pw.chromium.launch()
    c=br.new_context(viewport={'width':1440,'height':900})
    c.route(re.compile(r'.*/data/index\.json.*'),poison_index)
    c.route(re.compile(r'.*/data/(detail|desc)/\d+\.json.*'),poison_shard)
    c.add_init_script("localStorage.setItem('idr_intro_seen','1')")
    p=c.new_page();p.goto(URL);wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0",90);p.evaluate("()=>window.__introEnd&&__introEnd(false)");p.wait_for_timeout(1500)
    ck('poisoned listings loaded (payload text visible as text)',p.evaluate("()=>[...BYID.values()].some(x=>/XSSCO/.test(x.company))"))
    p.evaluate("()=>{const q=document.querySelector('#q,input[type=search]');if(q){q.value='XSSCO';q.dispatchEvent(new Event('input',{bubbles:true}))}}");p.wait_for_timeout(1500)
    ck('cards rendered with payloads as text',p.evaluate("()=>/XSSCO/.test(document.body.innerText)"))
    ids=p.evaluate("()=>[...BYID.values()].filter(x=>/XSSCO/.test(x.company)).slice(0,8).map(x=>x.id)")
    for i in ids:
        p.evaluate("(i)=>openDrawer(BYID.get(i))",i);p.wait_for_timeout(700)
    ck('drawer showed poisoned description as text',p.evaluate("()=>/onerror|svg onload/.test(document.body.innerText)"))
    for t in ('tracker','profile','feedback','db'):
        p.evaluate(f"()=>go('{t}')");p.wait_for_timeout(800)
    r=p.evaluate(CK);ck('listing XSS: no payload executed, no injected elements',r['xss']==0 and r['bad']==0,r)
    hrefs=p.evaluate("()=>[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>/^\\s*javascript:/i.test(h))")
    ck('no javascript: links anywhere after opening poisoned drawers',not hrefs,hrefs[:3])
    p.close()
    # resume + profile text
    c2=br.new_context(viewport={'width':1440,'height':900})
    pl=' '.join(PAY)
    c2.add_init_script(f"localStorage.setItem('idr_intro_seen','1');if(!sessionStorage.getItem('s')){{sessionStorage.setItem('s',1);localStorage.setItem('idr_resumeText',JSON.stringify({json.dumps('Jane Doe '+pl+chr(10)+'Education'+chr(10)+'Univ '+pl)}));localStorage.setItem('idr_profile',JSON.stringify({{name:{json.dumps('Jane '+pl)},school:{json.dumps('School '+pl)},major:{json.dumps('Finance '+pl)}}}))}}")
    p=c2.new_page();p.goto(URL);wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0",90);p.evaluate("()=>window.__introEnd&&__introEnd(false)")
    for t in ('profile','feedback','tracker','db'):
        p.evaluate(f"()=>go('{t}')");p.wait_for_timeout(1200)
    r=p.evaluate(CK);ck('resume/profile XSS: no payload executed, no injected elements',r['xss']==0 and r['bad']==0,r)
    # admin + headers + links
    html=p.evaluate("()=>document.documentElement.outerHTML")
    ck('index.html has no admin link',not re.search(r'admin\.html',html))
    ck('referrer policy meta on index',p.evaluate("()=>document.querySelector('meta[name=referrer]')?.content")=='strict-origin-when-cross-origin')
    ck('CSP meta on index',bool(p.evaluate("()=>document.querySelector('meta[http-equiv=Content-Security-Policy]')?.content")))
    bl=p.evaluate("()=>[...document.querySelectorAll('a[target=_blank]')].filter(a=>!/noopener|noreferrer/.test(a.rel)).map(a=>a.outerHTML.slice(0,120))")
    ck('every target=_blank link has rel=noopener',not bl,bl[:3])
    css=p.evaluate("()=>[...document.styleSheets].map(s=>s.href||'').filter(Boolean).map(h=>h.split('/').pop().split('?')[0])")
    ck('stylesheets are theme.css, style.css, site.css only',[x for x in css if x.endswith('.css')]==['theme.css','style.css','site.css'],css)
    for f in ('admin.html','404.html'):
        q=c2.new_page();q.goto(URL+f)
        ck(f+' noindex + CSP + referrer',q.evaluate("()=>!!document.querySelector('meta[name=robots][content*=noindex]')&&!!document.querySelector('meta[http-equiv=Content-Security-Policy]')&&!!document.querySelector('meta[name=referrer]')"))
        q.close()
    rb=c2.request.get(URL+'robots.txt').text();ck('robots.txt disallows admin.html','Disallow: /admin.html' in rb)
    sm=c2.request.get(URL+'sitemap.xml');ck('sitemap has no admin',sm.ok and 'admin' not in sm.text())
    for f in ('railway_function.ts','v15.css','legacy/app_v4.js'):
        ck(f+' not deployed',c2.request.get(URL+f).status==404)
    br.close()
f=[n for n,c in R if not c];print(f'\n{len(R)-len(f)}/{len(R)} passed');sys.exit(1 if f else 0)
