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
# V14.5: no "Why this grade?", V13.3 cards restored, no preferences pop-up after a profile build
BAD=re.compile(r'why this grade',re.I)
def cards_ok(p,tag):
    r=p.evaluate("""()=>{const c=[...document.querySelectorAll('#vl .card:not(.skelcard)')].filter(e=>e.getBoundingClientRect().height);if(!c.length)return 'no cards';
     const h=new Set(c.map(e=>e.offsetHeight));if(h.size>1)return 'heights '+[...h];
     for(const e of c){const b=e.getBoundingClientRect();if([...e.children].some(k=>k.getBoundingClientRect().bottom>b.bottom-1))return 'clipped '+e.dataset.id;
      for(const x of e.querySelectorAll('.c-act > *')){const r=x.getBoundingClientRect();if(r.bottom>b.bottom+0.5||r.right>b.right+0.5)return 'button out '+e.dataset.id}
      const a=[...e.querySelectorAll('.c-act > *')];if(a.length==2&&Math.abs(a[0].getBoundingClientRect().top-a[1].getBoundingClientRect().top)>1)return 'buttons not side by side '+e.dataset.id;
      const t=e.querySelector('.c-role');if(t&&(t.clientHeight>2.7*parseFloat(getComputedStyle(t).fontSize)*1.0||!t.title))return 'title over 2 lines or no full title '+e.dataset.id}
     return 'ok'}""")
    ck('cards uniform, not clipped '+tag,r=='ok',r)
with sync_playwright() as pw:
  br=pw.chromium.launch();p=br.new_page(viewport={'width':1440,'height':900});errs=[]
  p.on('pageerror',lambda e:errs.append(str(e)))
  p.add_init_script("try{localStorage.setItem('ir_intro_seen','1')}catch(e){}")
  p.goto(URL);wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0");p.evaluate("()=>window.__introEnd&&__introEnd(false)");p.wait_for_timeout(800)
  # 1. resume upload: straight to the homepage, no pop-up, preferences left unset
  p.evaluate("()=>go('profile')");p.set_input_files('#resume','tests/resume-fixtures/f01/resume.pdf')
  shown=False
  for _ in range(200):
    if p.locator('#rvDlg,.rv-ov,[role=dialog]:visible').count(): shown=True;break
    if p.evaluate("()=>typeof MSCORE!=='undefined'&&MSCORE.size>0&&!document.getElementById('t-db').hidden"): break
    p.wait_for_timeout(250)
  ck('no pop-up after upload',not shown)
  ck('lands on homepage',p.evaluate("()=>!document.getElementById('t-db').hidden&&document.getElementById('t-profile').hidden"))
  ck('profile filled from resume',p.evaluate("()=>!!profile.school&&!!profile.gpa&&profile.experience.length>0"))
  ck('preferences not guessed',p.evaluate("()=>!(profile.locations||[]).length&&!(profile.industries||[]).length&&!(profile.interests||[]).length&&!profile.season&&!profile.remoteOK&&!profile.relocate"),p.evaluate("()=>JSON.stringify([profile.locations,profile.industries,profile.interests,profile.season])"))
  ck('grading works with no preferences',p.evaluate("()=>MSCORE.size>1000"))
  ck('no Your preferences text',not re.search('your preferences',p.inner_text('body'),re.I))
  if OUT: p.mouse.move(5,890);p.wait_for_timeout(4500);p.screenshot(path=OUT+'/v14.5-post-build-1440.png')
  # 2. cards: no grade link, V13.3 layout, equal heights, both themes, all widths
  ck('no Why this grade on home',not BAD.search(p.content()))
  for dark in (False,True):
    for w in (1440,1280,768,390):
      p.set_viewport_size({'width':w,'height':900});theme(p,dark);p.evaluate("()=>{go('db');vrender(true)}");p.wait_for_timeout(700)
      tag=f'{w} {"dark" if dark else "light"}'
      cards_ok(p,tag)
      ck('no h-overflow '+tag,p.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+1"))
      ck('card height V13.3 '+tag,p.evaluate("()=>document.querySelector('#vl .card').offsetHeight===322"))
      axe(p,'cards '+tag)
      if OUT and not dark and w in (1440,390): p.wait_for_timeout(1200)
      if OUT and not dark and w==1440: p.screenshot(path=OUT+'/v14.5-cards-light-1440.png')
      if OUT and not dark and w==390: p.screenshot(path=OUT+'/v14.5-cards-390.png')
  p.set_viewport_size({'width':1440,'height':900});theme(p,False);p.evaluate("()=>go('db')");p.wait_for_timeout(500)
  # 3. detail panel and feedback page
  p.locator('#vl .card').first.click();p.wait_for_timeout(1500)
  ck('no Why this grade in panel',not BAD.search(p.content()) and p.locator('[data-why]').count()==0)
  p.keyboard.press('Escape');p.wait_for_timeout(300)
  p.click('nav [data-go=feedback]');wf(p,"()=>document.getElementById('fbBody').dataset.ready==='1'",120)
  ck('feedback page still in nav and works',p.locator('#t-feedback .fx-ring').count()>0)
  ck('no per-posting view',p.evaluate("()=>!('FB_FOR' in window)&&!window.openFeedbackFor&&!document.getElementById('fxAll')"))
  ck('no Why this grade on feedback',not BAD.search(p.content()))
  # 4. preferences editable on the profile page only
  p.evaluate("()=>go('profile')");p.wait_for_timeout(800)
  ck('preferences on profile page',p.locator('#t-profile input[name=relocate]').count()>0)
  for dark in (False,True):
    theme(p,dark);p.wait_for_timeout(500);axe(p,'profile '+('dark' if dark else 'light'))
  theme(p,False);p.wait_for_timeout(1500)
  if OUT:
    p.mouse.move(5,890);p.evaluate("()=>{document.activeElement&&document.activeElement.blur();document.querySelector('#t-profile input[name=relocate]').closest('.pf-f').scrollIntoView({block:'center'})}");p.wait_for_timeout(800);p.screenshot(path=OUT+'/v14.5-profile-preferences-1440.png')
  # 5. manual build: straight to the homepage too
  p.evaluate("()=>{Store.remove('profile');Store.remove('profileDraft');location.hash='#profile'}");p.reload()
  wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0");p.evaluate("()=>window.__introEnd&&__introEnd(false)");p.wait_for_timeout(800)
  p.evaluate("()=>{go('profile');PF={v:6,experience:[],skills:['Excel'],locations:[],industries:[],major:'Finance',school:'',gpa:'3.4'};pfRender()}")
  p.click('#pfSave');wf(p,"()=>!document.getElementById('t-db').hidden&&MSCORE.size>0",90)
  ck('manual build to homepage, no pop-up',p.locator('#rvDlg,[role=dialog]:visible').count()==0)
  ck('no JS errors',not errs,errs)
print(f"{sum(c for _,c in R)}/{len(R)} passed")
