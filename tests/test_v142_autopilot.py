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
def boot(p):
    p.goto(URL+'#autopilot');wf(p,"()=>typeof BYID!=='undefined'&&BYID.size>0&&!!window.APCal")
    p.evaluate("window.__introEnd&&__introEnd(false)");p.wait_for_timeout(600)
PICK="""()=>{const n=Date.now(),d=D.filter(x=>x.live&&x.deadline&&new Date(x.deadline)>n+864e5).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));const a=d[0],b=d.find(x=>x.company!==a.company&&!x.company.includes(a.company)&&!a.company.includes(x.company));return [a.id,a.company,b.id,b.company]}"""
with sync_playwright() as pw:
  br=pw.chromium.launch()
  for W,H in [(1440,900),(1280,800),(390,844)]:
    for dark in [False,True]:
      tg=f"{'dark' if dark else 'light'}-{W}"
      cx=br.new_context(viewport={'width':W,'height':H},accept_downloads=True);p=cx.new_page()
      p.add_init_script("try{localStorage.setItem('ir_intro_seen','1')}catch(e){}")
      boot(p);theme(p,dark);p.evaluate("go('autopilot')");p.wait_for_timeout(500)
      # 1 empty state
      st=p.evaluate("({t:document.getElementById('t-autopilot')?.innerText||document.body.innerText,cal:!!document.querySelector('#apCal:not([hidden]) .apc-up'),btn:!!document.querySelector('.ap-empty-saved [data-go=db]'),n:APCal.tasks().length})")
      ck('empty text '+tg,'Save internships to build your Autopilot plan' in st['t'],st['t'][:200]);ck('empty btn '+tg,st['btn']);ck('empty no cal/tasks '+tg,not st['cal'] and st['n']==0,st)
      if OUT: p.screenshot(path=f"{OUT}/v14.2-autopilot-empty-{tg}.png")
      axe(p,'empty '+tg)
      a,ac,b,bc=p.evaluate(PICK)
      p.evaluate(f"(async()=>{{for(const i of [{json.dumps(a)},{json.dumps(b)}]){{const x=BYID.get(String(i));await ensureDetail(x);track(x.id,'Saved')}}}})()");p.wait_for_timeout(800)
      ids=p.evaluate("[...new Set(APCal.tasks().map(t=>String(t.lid||t.listingId||t.id)))]")
      tx=p.evaluate("document.getElementById('apCal').innerText")
      ck('save adds tasks '+tg,p.evaluate("APCal.tasks().length")>0 and not p.evaluate("!!document.querySelector('.ap-empty-saved')"),ids)
      ck('calendar visible '+tg,p.evaluate("!document.getElementById('apCal').hidden"))
      if OUT: p.screenshot(path=f"{OUT}/v14.2-autopilot-saved-{tg}.png")
      axe(p,'saved '+tg)
      # unsave b
      p.evaluate(f"track({json.dumps(b)},null)||0") if False else p.evaluate(f"T.save(T.all().filter(t=>String(t.listingId)!=={json.dumps(str(b))}))");p.wait_for_timeout(500)
      p.evaluate("APCal.exportIcs()");p.wait_for_timeout(500);ics=p.evaluate("window._apcLastIcs||''")
      ck('ics only saved '+tg,(ac in ics) and (bc not in ics) and 'TRIGGER:-P1D' in ics and '@intern-index' in ics,(ac,bc,ics[:300]))
      ck('unsave removes from cal '+tg,bc not in p.evaluate("document.getElementById('apCal').innerText") and bc not in json.dumps(p.evaluate("APCal.tasks().map(t=>t.title+' '+(t.co||t.company||''))")))
      p.reload();boot(p);theme(p,dark);p.evaluate("go('autopilot')");p.wait_for_timeout(500)
      t2=json.dumps(p.evaluate("APCal.tasks().map(t=>Object.values(t).join(' '))"))
      ck('reload sync '+tg,ac in t2 and bc not in t2 and len(p.evaluate("T.all()"))==1)
      ics2=None
      p.evaluate("T.save([])");p.wait_for_timeout(400)
      ck('unsave all -> empty '+tg,p.evaluate("!!document.querySelector('.ap-empty-saved')") and p.evaluate("APCal.tasks().length")==0)
      cx.close()
  br.close()
f=[n for n,c in R if not c];print(f"{len(R)-len(f)}/{len(R)} passed");print('FAILS',f)
