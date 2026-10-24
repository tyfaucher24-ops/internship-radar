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

# V14.6: every profile entry shows its full text at every width; card titles keep the approved 2-line clamp
W='Supercalifragilisticexpialidocious-Interdisciplinary-Quantitative-Research-Program'
LONG={'title':'Senior Undergraduate Quantitative Research and Data Engineering Assistant for the Center on Long-Horizon Climate Finance '+W,
 'org':'The Extraordinarily Long Named Institute for Interdisciplinary Studies in Financial Markets, Public Policy and Applied Machine Learning',
 'bullets':['Built a 40-table data warehouse pipeline that reconciled eleven years of municipal bond disclosures across 3,100 issuers and cut analyst prep time by 62 percent '+W,
  'Presented findings to the faculty board and a visiting committee from three regional Federal Reserve banks']}
SK=['Advanced Financial Modeling and Discounted Cash Flow Valuation in Excel and Python','Bloomberg Terminal Market Concepts Certification '+W]
SEED="""(d)=>{PF.experience=[{kind:'Research',title:d.title,org:d.org,start:'2024-09',end:'',bullets:d.bullets},{kind:'Leadership',title:d.title.split(' ').reverse().join(' '),org:d.org,start:'2023-01',end:'2024-05',bullets:[d.bullets[1]]}];
 PF.skills=d.sk.slice();OPENEXP=-1;pfRender();go('profile');return true}"""
PROBE="""(texts)=>{const root=document.getElementById('t-profile'),bad=[];
 for(const e of root.querySelectorAll('*')){const r=e.getBoundingClientRect();if(!r.width||!r.height)continue;const s=getComputedStyle(e);
  if(s.position==='absolute'&&s.clip!=='auto')continue;if(e.closest('.cb-pop,[hidden]'))continue;const dd=e.closest('details:not([open])');if(dd&&!e.closest('summary'))continue;
  if(e.matches('input,select'))continue;
  if(s.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1)bad.push('ellipsis '+e.className);
  if(s.webkitLineClamp&&s.webkitLineClamp!=='none')bad.push('clamp '+e.className);
  const oy=s.overflowY,ox=s.overflowX;
  if((ox==='hidden'||ox==='clip')&&e.scrollWidth>e.clientWidth+2)bad.push('x-clip '+e.tagName+'.'+e.className);
  if((oy==='hidden'||oy==='clip'||oy==='auto'||oy==='scroll')&&e.scrollHeight>e.clientHeight+2)bad.push('y-clip '+e.tagName+'.'+e.className);
  if(s.maskImage&&s.maskImage!=='none'||s.webkitMaskImage&&s.webkitMaskImage!=='none')bad.push('mask '+e.className)}
 const txt=root.innerText.replace(/\\s+/g,' ');for(const t of texts)if(!txt.includes(t.replace(/\\s+/g,' '))&&![...root.querySelectorAll('textarea')].some(a=>a.value.includes(t)))bad.push('missing '+t.slice(0,30));
 const vw=document.documentElement.clientWidth;for(const e of root.querySelectorAll('.pf-exp,.pf-chip,.cb-chip,.cb-one,.pf-et'))if(e.getBoundingClientRect().right>vw+1)bad.push('offscreen '+e.className);
 for(const t of root.querySelectorAll('textarea')){if(t.closest('details:not([open])'))continue;const r=t.getBoundingClientRect(),l=t.closest('label');if(getComputedStyle(t).position!=='static')bad.push('textarea out of flow '+(t.dataset.e||t.id));if(l){const lr=l.getBoundingClientRect();if(r.top<lr.top+8||r.bottom>lr.bottom+1)bad.push('textarea overlaps label '+(t.dataset.e||t.id))}}
 if(document.documentElement.scrollWidth>vw+1)bad.push('page h-overflow');return bad.slice(0,6)}"""
def shift(p):
  return p.evaluate("""async()=>{const q=()=>[...document.querySelectorAll('#t-profile .pf-col,#t-profile .pf-exp,#t-profile .cb-chip')].map(e=>{const r=e.getBoundingClientRect();return Math.round(r.top+scrollY)+','+Math.round(r.left)+','+Math.round(r.height)}).join('|');
   const a=q();await new Promise(r=>setTimeout(r,1200));return a===q()}""")
with sync_playwright() as pw:
  br=pw.chromium.launch();p=br.new_page(viewport={'width':1440,'height':900});errs=[]
  p.on('pageerror',lambda e:errs.append(str(e)))
  p.add_init_script("try{localStorage.setItem('ir_intro_seen','1')}catch(e){}")
  p.goto(URL);wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0&&typeof pfRender==='function'");p.evaluate("()=>window.__introEnd&&__introEnd(false)");p.wait_for_timeout(800)
  d=dict(LONG,sk=SK);p.evaluate(SEED,d);p.wait_for_timeout(1000)
  texts=[LONG['title'],LONG['org'],SK[0],SK[1]]
  for w in (1440,1280,768,390):
    for dark in (False,True):
      tag=f'{w} {"dark" if dark else "light"}';p.set_viewport_size({'width':w,'height':900 if w>390 else 844});theme(p,dark);p.wait_for_timeout(500)
      p.evaluate("()=>{OPENEXP=-1;expRender()}");p.wait_for_timeout(200)
      b=p.evaluate(PROBE,texts);ck('profile full text, closed entries '+tag,not b,b)
      ck('no layout shift '+tag,shift(p))
      p.click('#expList [data-tog="0"]');p.wait_for_timeout(500)
      b=p.evaluate(PROBE,[LONG['title'],LONG['org']]+LONG['bullets']);ck('profile full text, open entry '+tag,not b,b)
      g=p.evaluate("()=>[...document.querySelectorAll('#expList .pf-exp.open textarea')].map(t=>t.scrollHeight-t.clientHeight)")
      ck('edit fields grow to fit '+tag,g and max(g)<=2,g)
      ck('no layout shift, open entry '+tag,shift(p))
      axe(p,'profile '+tag)
      if OUT and w==1440 and not dark:
        p.evaluate("()=>{document.activeElement&&document.activeElement.blur();OPENEXP=0;expRender();document.querySelector('#expList .pf-exp').scrollIntoView({block:'start',behavior:'instant'});scrollBy({top:-80,behavior:'instant'})}");p.mouse.move(5,5);p.wait_for_timeout(600)
        p.screenshot(path=OUT+'/v14.6-profile-light-1440.png')
      if OUT and w==390 and not dark:
        p.evaluate("()=>{document.activeElement&&document.activeElement.blur();OPENEXP=-1;expRender();document.querySelector('#expList .pf-exp').scrollIntoView({block:'start',behavior:'instant'});scrollBy({top:-130,behavior:'instant'})}");p.mouse.move(5,5);p.wait_for_timeout(600)
        p.screenshot(path=OUT+'/v14.6-profile-390.png')
  p.evaluate("()=>{const d=document.querySelector('#t-profile details.pf-li');d.open=true}");p.wait_for_timeout(400)
  b=p.evaluate(PROBE,[]);ck('LinkedIn paste box opens unclipped',not b,b)
  p.evaluate("()=>{document.querySelector('#t-profile details.pf-li').open=false}")
  # typing into an edit field grows it, no clipping
  p.set_viewport_size({'width':1280,'height':900});theme(p,False);p.evaluate("()=>{OPENEXP=0;expRender()}");p.wait_for_timeout(300)
  t=p.locator('#expList .pf-exp.open textarea[data-e=org]');t.focus();p.keyboard.press('End');p.keyboard.press('Control+End');p.keyboard.type(' and Department of Very Long Organisation Names for Testing Wrapping Behaviour',delay=0);p.keyboard.press('Enter');p.wait_for_timeout(300)
  v=p.evaluate("()=>{const t=document.querySelector('#expList .pf-exp.open textarea[data-e=org]');return [t.scrollHeight-t.clientHeight,t.value.includes('\\n')]}")
  ck('typed field grows, Enter keeps one line',v[0]<=2 and not v[1],v)
  # card titles keep the approved 2-line clamp with a full title
  p.evaluate("()=>go('db')");wf(p,"()=>document.querySelectorAll('#vl .card .c-role').length>0");p.wait_for_timeout(600)
  for w in (1440,390):
    p.set_viewport_size({'width':w,'height':900});p.wait_for_timeout(600)
    r=p.evaluate("""()=>{const t=[...document.querySelectorAll('#vl .card .c-role')].filter(e=>e.getBoundingClientRect().height);if(!t.length)return 'none';
      for(const e of t){const s=getComputedStyle(e);if(s.webkitLineClamp!=='2')return 'clamp '+s.webkitLineClamp;if(!e.title)return 'no title attr';if(e.clientHeight>2.7*parseFloat(s.fontSize))return 'over 2 lines'}
      const long=t.find(e=>e.scrollHeight>e.clientHeight+1);return long?'ok-clamped':'ok'}""")
    ck(f'card titles 2-line clamp kept {w}',r.startswith('ok'),r)
  ck('no page errors',not errs,errs[:3])
  br.close()
print(f"{sum(c for _,c in R)}/{len(R)} passed")
sys.exit(0 if all(c for _,c in R) else 1)
