"""V16 Phase 4: Privacy + Terms pages, footer links, takedown/attribution, axe AA in both themes at 1440 and 390.
Run: python3 tests/test_v16_legal.py URL"""
import sys,time
from playwright.sync_api import sync_playwright
URL=sys.argv[1].rstrip('/')+'/';R=[]
def ck(n,c,info=''):R.append((n,bool(c)));print(('PASS' if c else 'FAIL'),n,'' if c else info,flush=True)
def wf(p,js,t=60):
    e=time.time()+t
    while time.time()<e:
        try:
            if p.evaluate(js):return True
        except Exception:pass
        time.sleep(.2)
    return False
with sync_playwright() as pw:
    b=pw.chromium.launch();errs=[]
    for theme in('light','dark'):
        for w,h in((1440,900),(390,844)):
            c=b.new_context(viewport={'width':w,'height':h},color_scheme=theme,bypass_csp=True);p=c.new_page();p.on('pageerror',lambda e:errs.append(str(e)))
            p.add_init_script(f"try{{localStorage.setItem('idr_theme','{theme}')}}catch(e){{}}")
            p.goto(URL);wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0");p.evaluate("()=>window.__introEnd&&__introEnd(false)")
            tag=f'{theme}-{w}'
            links=p.evaluate("()=>[...document.querySelectorAll('footer nav[aria-label=Footer] a')].map(a=>a.textContent.trim())")
            ck(f'{tag} footer has About/Privacy/Terms/Contact/Report a broken listing',all(x in links for x in ['About','Privacy','Terms','Contact','Report a broken listing']),links)
            for pg,must in(('privacy',['resume files are read on your device','delete account','export my data','supabase','no cookies','draft']),('terms',['original posting','estimates','guarantees','takedown','draft']),('contact',['takedown'])):
                p.evaluate(f"()=>document.querySelector('footer a[data-go={pg}]').click()");p.wait_for_timeout(300)
                vis=p.evaluate(f"()=>!document.getElementById('t-{pg}').hidden");txt=p.evaluate(f"()=>document.getElementById('t-{pg}').innerText.toLowerCase()")
                ck(f'{tag} {pg} page opens with required content',vis and all(m in txt for m in must),[m for m in must if m not in txt])
                if pg!='contact':
                    if not p.evaluate("()=>!!window.axe"):p.add_script_tag(url='https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js')
                    v=p.evaluate(f"async()=>(await axe.run('#t-{pg}',{{runOnly:['wcag2a','wcag2aa']}})).violations.map(x=>x.id+':'+x.nodes.length)");ck(f'{tag} {pg} axe AA clean',not v,v)
                    sw=p.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+1");ck(f'{tag} {pg} no horizontal overflow',sw)
            ck(f'{tag} terms title',p.evaluate("()=>{document.querySelector('footer a[data-go=terms]').click();return document.title.startsWith('Terms of Use')}"))
            c.close()
    c=b.new_context();p=c.new_page();p.goto(URL+'#terms');wf(p,"()=>typeof BYID!=='undefined'");p.wait_for_timeout(800)
    ck('deep link #terms opens Terms',p.evaluate("()=>!document.getElementById('t-terms').hidden"))
    ck('footer note no longer says No login',p.evaluate("()=>!/No login/.test(document.querySelector('.fnote').textContent)"))
    ck('about page no longer claims No accounts',p.evaluate("()=>!/No accounts/.test(document.getElementById('t-about').textContent)"))
    ck('no page errors',not errs,errs[:3])
    print(f"{sum(x for _,x in R)}/{len(R)} passed")
