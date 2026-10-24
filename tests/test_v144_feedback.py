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
# V14.4: no tutorial, no review screen, Honest Feedback page, Why this grade?
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
  # upload goes straight to preferences, then profile
  p.evaluate("()=>go('profile')");p.set_input_files('#resume','tests/resume-fixtures/f01/resume.pdf')
  p.wait_for_selector('#rvOk',timeout=30000)
  txt=p.inner_text('#rvDlg')
  ck('no check-what-we-read screen','check what we read' not in txt.lower() and not p.is_visible('#rvS1'))
  ck('no Check this / Not found flags','Check this' not in txt and 'Not found' not in txt)
  p.click('#rvOk');p.wait_for_timeout(800)
  ck('lands on filled profile',p.evaluate("()=>location.hash.includes('profile')&&!!PF.school&&!!PF.gpa"))
  p.click('#pfSave');wf(p,"()=>typeof MSCORE!=='undefined'&&MSCORE.size>0",90)
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
      if OUT and not dark and w in (1440,390): p.wait_for_timeout(4500)
      if OUT and not dark and w==1440: p.screenshot(path=OUT+'/v14.4-feedback-light-1440.png',full_page=True)
      if OUT and not dark and w==390:
        p.screenshot(path=OUT+'/v14.4-feedback-390.png',full_page=True)
        p.locator('nav').first.screenshot(path=OUT+'/v14.4-nav.png')
  p.set_viewport_size({'width':1440,'height':900});theme(p,False)
  # card link
  p.evaluate("()=>go('db')");p.wait_for_selector('#vl [data-why]',timeout=30000)
  card=p.locator('#vl .card:has([data-why])').first
  ck('cards not clipped',p.evaluate("()=>[...document.querySelectorAll('#vl .card')].every(c=>c.scrollHeight<=c.clientHeight+1)"))
  ck('card link no clip',card.evaluate("e=>{const a=e.querySelector('.why-g').getBoundingClientRect(),b=e.getBoundingClientRect();return a.bottom<=b.bottom+1}"))
  p.wait_for_timeout(1500)
  if OUT:
    bb=p.locator('#vl .card:has([data-why])').first.bounding_box();p.screenshot(path=OUT+'/v14.4-card-why.png',clip={'x':bb['x']-8,'y':bb['y']-8,'width':bb['width']+16,'height':bb['height']+16})
  for dark in (False,True):
    theme(p,dark);p.wait_for_timeout(600);axe(p,'cards '+('dark' if dark else 'light'))
  theme(p,False);p.evaluate("()=>document.getElementById('fbBody').dataset.ready=''");p.locator('#vl [data-why]').first.click();fbReady(p)
  ck('per-posting view',p.locator('#fxAll').count()==1 and 'overall feedback' in p.inner_text('#t-feedback'))
  # panel link
  p.evaluate("()=>go('db')");p.wait_for_timeout(500);p.locator('#vl .card').first.click();p.wait_for_timeout(1200)
  pl=p.locator('[data-why="__cur"]')
  ck('panel Why link',pl.count()>0)
  if pl.count(): p.evaluate("()=>document.getElementById('fbBody').dataset.ready=''");pl.first.click();fbReady(p);ck('panel link opens posting view','overall feedback' in p.inner_text('#t-feedback'))
  ck('banned word absent',not re.search('scr'+'ap',p.content(),re.I))
  ck('no JS errors',not errs,errs)
print(f"{sum(c for _,c in R)}/{len(R)} passed")
