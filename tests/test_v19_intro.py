"""V19.1: intro 'Build my profile' card sizes + resume zone in #obDrop. Usage: python3 tests/test_v19_intro.py URL [shotdir]"""
import sys,time,os
from playwright.sync_api import sync_playwright
URL=sys.argv[1];SH=sys.argv[2] if len(sys.argv)>2 else None
AXE=open('/workspace/t/axe.min.js').read()
R=[]
def ck(n,c,info=''):
    R.append((n,bool(c)));print(('PASS' if c else 'FAIL'),n,'' if c else info,flush=True)
def wf(p,js,t=60):
    e=time.time()+t
    while time.time()<e:
        try:
            if p.evaluate(js): return True
        except Exception: pass
        time.sleep(.15)
    return False
def shot(p,name,el='#obCard'):
    if SH: p.locator(el).screenshot(path=os.path.join(SH,name))
FIT="""()=>{const c=document.getElementById('obCard'),b=c.querySelector('[data-ob=next]')||c.querySelector('.foot .pri');const r=c.getBoundingClientRect();
 const over=document.documentElement.scrollWidth>innerWidth||c.scrollWidth>c.clientWidth+1;return {over,cardBottom:r.bottom,vh:innerHeight,btn:b?b.getBoundingClientRect().bottom:null,btnIn:b?b.getBoundingClientRect().bottom<=Math.min(r.bottom,innerHeight)+0.5:null}}"""
def start(br,W,H):
    p=br.new_page(bypass_csp=True,viewport={'width':W,'height':H});errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
    p.goto(URL);wf(p,"()=>document.getElementById('goBuild')&&window.RZ");p.wait_for_timeout(600)
    p.click('#goBuild');wf(p,"()=>!!document.getElementById('obDrop')",10);p.wait_for_timeout(700);return p,errs
def nxt(p):
    p.click('#obCard [data-ob=next]');p.wait_for_timeout(700)
with sync_playwright() as pw:
  br=pw.chromium.launch()
  for W,H in ((1440,900),(390,844)):
    p,errs=start(br,W,H);tag=str(W)
    st=p.evaluate("()=>{const c=getComputedStyle(document.getElementById('obCard'));return [c.width,c.paddingTop,c.paddingLeft]}")
    if W==1440: ck('card 900px, 52/60 padding',st==['900px','52px','60px'],st)
    ck('ob empty '+tag,p.evaluate("()=>document.querySelector('#obCard .rz').dataset.st==='empty'"))
    shot(p,f"intro-1-empty-{W}.png")
    p.evaluate("()=>{window.__ev=[];document.addEventListener('ir:resume',e=>__ev.push(e.detail));const o=RI.analyze;RI.analyze=(s,cb)=>o(s,cb).then(r=>new Promise(ok=>setTimeout(()=>ok(r),1500)))}")
    p.set_input_files('#obFile','tests/resume-fixtures/f01/resume.pdf')
    wf(p,"()=>__ev.some(e=>e.st==='reading'&&e.p>=60)",20);p.wait_for_timeout(300)
    ck('ob reading '+tag,p.evaluate("()=>document.querySelector('#obCard .rz').dataset.st==='reading'&&!/Drop your resume/.test(document.getElementById('obDrop').textContent)"))
    shot(p,f"intro-2-reading-{W}.png")
    ck('ob done '+tag,wf(p,"()=>document.querySelector('#obCard .rz').dataset.st==='done'",60));p.wait_for_timeout(900)
    ck('intro copy + chips '+tag,p.evaluate("()=>/Resume read — we’ll fill in the next steps/.test(document.getElementById('obDrop').textContent)&&document.querySelectorAll('#obCard .rz-chip').length>0"))
    ck('old #obRs sentence gone '+tag,p.evaluate("()=>!document.getElementById('obRs')&&!/We prefilled what we found/.test(document.getElementById('obCard').textContent)"))
    shot(p,f"intro-3-done-{W}.png")
    if W==1440:
        p.add_script_tag(content=AXE)
        v=p.evaluate("async()=>(await axe.run('#obCard',{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']})).violations.map(v=>v.id+':'+v.nodes[0].target)")
        ck('axe intro step1 done',not v,v)
        p.set_viewport_size({'width':1440,'height':800});p.wait_for_timeout(300)
        f=p.evaluate(FIT);ck('Continue visible at 800px tall (done state)',f['btn'] is not None and f['btn']<=800,f)
        p.set_viewport_size({'width':1440,'height':900})
    open('/tmp/v19/broken.pdf','wb').write(b'%PDF-1.4 nope')
    p.click('#obCard .rz-link');p.click('#obCard .rz-del');p.wait_for_timeout(200)
    ck('remove -> empty '+tag,p.evaluate("()=>document.querySelector('#obCard .rz').dataset.st==='empty'"))
    p.set_input_files('#obFile','/tmp/v19/broken.pdf')
    ck('ob error '+tag,wf(p,"()=>document.querySelector('#obCard .rz').dataset.st==='error'",30))
    shot(p,f"intro-4-error-{W}.png")
    p.set_input_files('#obFile','tests/resume-fixtures/f01/resume.pdf');wf(p,"()=>document.querySelector('#obCard .rz').dataset.st==='done'",60)
    for n in (2,3,4,5):
        nxt(p);f=p.evaluate(FIT)
        ck(f'step {n} no overflow {tag}',not f['over'],f)
        if n in (2,4,5): shot(p,f"intro-step{n}-{W}.png")
        if n==4 and W==1440: ck('step 4 xcard padding 18/20',p.evaluate("()=>{const x=document.querySelector('#obCard .xcard');if(!x)return true;const c=getComputedStyle(x);return c.paddingTop==='18px'&&c.paddingLeft==='20px'}"))
    if W==1440:
        for vw,vh in ((1024,768),(1440,800),(1280,800)):
            p.set_viewport_size({'width':vw,'height':vh});p.wait_for_timeout(300);f=p.evaluate(FIT)
            ck(f'step 5 fits {vw}x{vh}, primary button not clipped',not f['over'] and f['btnIn'] is not False,f)
            if vw==1024: shot(p,"intro-step5-1024.png")
    ck('no page errors '+tag,not errs,errs[:3]);p.close()
  for vw in (1280,1024,900,768):
    p,errs=start(br,vw,800)
    f=p.evaluate(FIT);ck(f'step1 no overflow at {vw}',not f['over'],f);p.close()
  br.close()
n=sum(1 for _,c in R if c);print(f"V19 INTRO {n} / {len(R)}")
