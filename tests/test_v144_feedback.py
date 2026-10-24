import sys,re,json,time
from playwright.sync_api import sync_playwright
URL=sys.argv[1];OUT=sys.argv[2] if len(sys.argv)>2 else None
AXE=open('/workspace/t/axe.min.js').read()
R=[];
def ck(n,c,info=''):
    R.append((n,bool(c)));print(('PASS' if c else 'FAIL'),n,info if not c else '',flush=True)
def axe(p,tag):
    p.add_script_tag(content=AXE) if not p.evaluate("()=>!!window.axe") else None
    v=p.evaluate("async()=>{const r=await axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']});return r.violations.map(v=>v.id+':'+v.nodes.length+':'+v.nodes[0].target)}")
    ck('axe '+tag,not v,v)
def theme(p,d): p.evaluate(f"document.documentElement.classList.toggle('dark',{str(d).lower()})")
def wf(p,js,t=60):
    e=time.time()+t
    while time.time()<e:
        try:
            if p.evaluate(js): return
        except Exception: pass
        time.sleep(.3)
    raise Exception('timeout '+js)
# V14.4: no tutorial, no review screen, Honest Feedback page (V14.5: grade links and per-posting view removed)
def fbReady(p): wf(p,"()=>document.getElementById('fbBody').dataset.ready==='1'",120)
with sync_playwright() as pw:
  br=pw.chromium.launch();p=br.new_page(viewport={'width':1440,'height':900});errs=[]
  p.on('pageerror',lambda e:errs.append(str(e)))
  p.add_init_script("try{localStorage.setItem('ir_intro_seen','1');if(!sessionStorage.s){sessionStorage.s=1;localStorage.setItem('ir_tour_done','done');localStorage.setItem('ir_tour_step','3')}}catch(e){}")
  p.goto(URL+'#t-feedback');wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0")
  p.evaluate("()=>window.__introEnd&&__introEnd(false)");p.wait_for_timeout(800)
  ck('old tour keys cleared',p.evaluate("()=>!Object.keys(localStorage).some(k=>k.startsWith('ir_tour'))"))
  ck('no tour script or element',p.evaluate("()=>!window.Tour&&!document.querySelector('#tour,#uiTour,script[src*=\"tour.js\"]')"))
  p.evaluate("()=>go('feedback')");p.wait_for_timeout(500)
  ck('empty state text',"Upload your resume to see your honest feedback" in p.inner_text('#t-feedback'))
  ck('empty state upload button',p.locator('#t-feedback a.btn').count()>0)
  ck('nav has Feedback',p.locator('nav [data-go=feedback]').count()==1)
  # V14.5: upload fills the profile and goes to the homepage, no pop-up
  p.evaluate("()=>go('profile')");p.set_input_files('#resume','tests/resume-fixtures/f01/resume.pdf')
  wf(p,"()=>typeof MSCORE!=='undefined'&&MSCORE.size>0",90)
  ck('no review or preferences dialog',p.locator('#rvDlg').count()==0)
  ck('profile filled',p.evaluate("()=>!!PF.school&&!!PF.gpa"))
  ck('no tour after build',p.evaluate("()=>!document.querySelector('#tour,#uiTour')"))
  # reduced motion: final states at once
  p.emulate_media(reduced_motion='reduce');p.evaluate("()=>document.getElementById('fbBody').dataset.ready=''");p.click('nav [data-go=feedback]');fbReady(p)
  ck('reduced motion bars final',p.evaluate("()=>[...document.querySelectorAll('.fx-fill')].every(e=>getComputedStyle(e).transitionDuration.split(',').every(d=>parseFloat(d)===0))"))
  p.emulate_media(reduced_motion='no-preference')
  p.evaluate("()=>{go('db');}");p.wait_for_timeout(300);p.evaluate("()=>document.getElementById('fbBody').dataset.ready=''");p.click('nav [data-go=feedback]');fbReady(p)
  ck('bars stagger',p.evaluate("()=>{const d=[...document.querySelectorAll('.fx-fill')].map(e=>parseFloat(getComputedStyle(e).transitionDelay));return d.length>2&&d[1]>d[0]}"))
  p.wait_for_timeout(1500)
  ck('ring and grade shown',p.evaluate("()=>/\\d/.test(document.querySelector('#t-feedback .fx-ring').textContent)"))
  ck('quotes real resume',"Corporate Finance Intern" in p.inner_text('#t-feedback'))
  ck('tiers shown',p.locator('#t-feedback .fx-tier').count()==3)
  for dark in (False,True):
    for w in (1440,1280,390):
      p.set_viewport_size({'width':w,'height':900});theme(p,dark);p.wait_for_timeout(400)
      ck(f'no h-overflow {w} {dark}',p.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+1"))
      axe(p,f'feedback {w} {"dark" if dark else "light"}')
  p.set_viewport_size({'width':1440,'height':900});theme(p,False)
  ck('banned word absent',not re.search('scr'+'ap',p.content(),re.I))
  ck('no JS errors',not errs,errs)
print(f"{sum(c for _,c in R)}/{len(R)} passed")
