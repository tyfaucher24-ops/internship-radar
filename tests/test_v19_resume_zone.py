"""V19 Part 1 + V19.1 §2: resume drop zone states on Profile (#pfDrop) and intro step 1 (#obDrop).
Usage: python3 tests/test_v19_resume_zone.py URL [shotdir]"""
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
PDF='tests/resume-fixtures/f01/resume.pdf'
REC="""()=>{window.__ev=[];window.__ann=[];document.addEventListener('ir:resume',e=>__ev.push(Object.assign({},e.detail)));
 document.querySelectorAll('.rz [role=status]').forEach(l=>new MutationObserver(()=>{if(l.textContent)__ann.push(l.closest('.rz').className+'|'+l.textContent)}).observe(l,{childList:true,characterData:true,subtree:true}))}"""
def shot(p,el,name):
    if SH: p.locator(el).screenshot(path=os.path.join(SH,name))
def theme(p,d): p.evaluate(f"document.documentElement.classList.toggle('dark',{str(d).lower()})");p.wait_for_timeout(1600)
def axe(p,tag,ctx):
    if not p.evaluate("()=>!!window.axe"): p.add_script_tag(content=AXE)
    v=p.evaluate("async(c)=>{const r=await axe.run(c,{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']});return r.violations.map(v=>v.id+':'+v.nodes.length+':'+v.nodes[0].target)}",ctx)
    ck('axe '+tag,not v,v)
with sync_playwright() as pw:
  br=pw.chromium.launch()
  for W in (1440,390):
   for dark in (False,True):
    tag=f"{W}{' dark' if dark else ''}"
    p=br.new_page(bypass_csp=True,viewport={'width':W,'height':900});errs=[]
    p.on('pageerror',lambda e:errs.append(str(e)))
    p.add_init_script("try{localStorage.setItem('ir_intro_seen','1')}catch(e){}")
    p.goto(URL);wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0&&window.RZ");p.evaluate("()=>window.__introEnd&&__introEnd(false)")
    p.evaluate("()=>go('profile')");p.wait_for_timeout(500);theme(p,dark)
    Z='#t-profile .rz'
    ck('empty state '+tag,p.evaluate("()=>document.querySelector('#t-profile .rz').dataset.st==='empty'&&/Drop your resume here/.test(document.getElementById('pfDrop').textContent)"))
    shot(p,Z,f"resume-1-empty-{W}{'-dark' if dark else '-light'}.png")
    if W==1440 and not dark: axe(p,'profile empty','#t-profile')
    p.evaluate(REC)
    # hold progress at the first real stage long enough to screenshot the reading state
    p.evaluate("()=>{const o=RI.analyze;RI.analyze=(s,cb)=>o(s,cb).then(r=>new Promise(ok=>setTimeout(()=>ok(r),1500)))}")
    p.set_input_files('#resume',PDF)
    ok=wf(p,"()=>document.querySelector('#t-profile .rz').dataset.st==='reading'",10)
    ck('reading state shown '+tag,ok)
    ck('old prompt removed while reading '+tag,p.evaluate("()=>!/Drop your resume/.test(document.getElementById('pfDrop').textContent)&&!document.querySelector('#pfDrop .rz-arrow')"))
    wf(p,"()=>__ev.some(e=>e.st==='reading'&&e.p>=60)",20);p.wait_for_timeout(350)
    shot(p,Z,f"resume-2-reading-{W}{'-dark' if dark else '-light'}.png")
    ck('done state '+tag,wf(p,"()=>document.querySelector('#t-profile .rz').dataset.st==='done'",60))
    ev=p.evaluate("()=>__ev");ps=[e.get('p') for e in ev if e.get('st')=='reading' and e.get('p') is not None]
    steps=[e.get('step') for e in ev if e.get('st')=='reading']
    ck('ring driven by real stages, monotonic, >=5 stages '+tag,len(ps)>=5 and ps==sorted(ps) and max(ps)<100,str(ps))
    ck('stages include page + section names '+tag,any('Page' in (s or '') for s in steps) and any(s in ('Education','Experience','Skills') for s in steps),str(steps))
    p.wait_for_timeout(900)
    real=p.evaluate("()=>{const r=Store.get('resumeParse');return r.counts}")
    chips=p.evaluate("()=>[...document.querySelectorAll('#t-profile .rz-chip')].map(c=>c.textContent)")
    exp=[f"{real[k]} {w}{'' if real[k]==1 else 's'}" for k,w in (('roles','role'),('schools','school'),('skills','skill')) if real[k]>0]
    ck('chips = real parse counts, zeros hidden '+tag,chips==exp,f"{chips} vs {exp}")
    ck('filename + size shown '+tag,p.evaluate("()=>/resume\\.pdf · \\d+ KB/.test(document.querySelector('#t-profile .rz-file').textContent)"))
    ck('tick drawn '+tag,p.evaluate("()=>getComputedStyle(document.querySelector('#t-profile .rz-tick')).strokeDashoffset.startsWith('0')"))
    shot(p,Z,f"resume-3-done-{W}{'-dark' if dark else '-light'}.png")
    ann=[a.split('|')[1] for a in p.evaluate("()=>__ann") if 'rz-pf' in a]
    ck('one announcement per state '+tag,ann==['Reading your resume',ann[-1]] and ann[-1].startswith('Resume read,'),str(ann))
    if W==1440: axe(p,'profile done '+tag,'#t-profile')
    nh=p.evaluate("()=>document.documentElement.scrollWidth<=innerWidth")
    ck('no horizontal scroll '+tag,nh)
    # reload keeps done
    p.reload();wf(p,"()=>window.RZ&&typeof BYID!=='undefined'&&BYID.size>0");p.evaluate("()=>window.__introEnd&&__introEnd(false)");p.evaluate("()=>go('profile')");p.wait_for_timeout(400)
    ck('done survives reload '+tag,p.evaluate("()=>document.querySelector('#t-profile .rz').dataset.st==='done'&&!/Drop your resume/.test(document.getElementById('pfDrop').textContent)"))
    theme(p,dark)
    # keyboard: Replace or remove -> Remove
    p.focus('#t-profile .rz-link');p.keyboard.press('Enter');p.wait_for_timeout(100)
    ck('replace/remove are 44px buttons '+tag,p.evaluate("()=>[...document.querySelectorAll('#t-profile .rz-btn')].every(b=>b.getBoundingClientRect().height>=44)&&document.querySelectorAll('#t-profile .rz-btn').length===2"))
    p.keyboard.press('Tab');p.keyboard.press('Enter');p.wait_for_timeout(200)
    ck('remove -> empty and data cleared '+tag,p.evaluate("()=>document.querySelector('#t-profile .rz').dataset.st==='empty'&&!Store.get('resumeParse')&&!Store.get('resumeText')"))
    # error state with a broken pdf
    open('/tmp/v19/broken.pdf','wb').write(b'%PDF-1.4 not really a pdf')
    p.set_input_files('#resume','/tmp/v19/broken.pdf')
    ck('broken pdf -> error '+tag,wf(p,"()=>document.querySelector('#t-profile .rz').dataset.st==='error'",30))
    ck('no raw parser error text '+tag,p.evaluate("()=>!/Invalid|PDF structure|Error:/i.test(document.querySelector('#t-profile').innerText)"))
    shot(p,Z,f"resume-4-error-{W}{'-dark' if dark else '-light'}.png")
    if W==1440: axe(p,'profile error '+tag,'#t-profile')
    # retry with docx works
    docx=[os.path.join(dp,f) for dp,_,fs in os.walk('tests/resume-fixtures') for f in fs if f.endswith('.docx')]
    if docx:
        p.set_input_files('#resume',docx[0])
        ck('retry with DOCX -> done '+tag,wf(p,"()=>document.querySelector('#t-profile .rz').dataset.st==='done'",60))
    ck('no page errors '+tag,not errs,errs[:3])
    p.close()
  br.close()
n=sum(1 for _,c in R if c);print(f"V19 RESUME ZONE {n} / {len(R)}")
