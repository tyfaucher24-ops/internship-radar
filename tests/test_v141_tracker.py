import sys,json;sys.path.insert(0,__import__('os').path.dirname(__file__));from v141_seed import SEED
from playwright.sync_api import sync_playwright
U=sys.argv[1];OUT=sys.argv[2] if len(sys.argv)>2 else '/workspace/t'
AXE=open(__import__('os').environ.get('AXE','/workspace/t/axe.min.js')).read()
res=[]
def ok(n,c):res.append((n,bool(c)));print(('PASS ' if c else 'FAIL ')+n)
with sync_playwright() as p:
 b=p.chromium.launch()
 for theme in ['light','dark']:
  for w in [1440,1280,390]:
   ctx=b.new_context(bypass_csp=True,viewport={'width':w,'height':900},color_scheme=theme);pg=ctx.new_page()
   errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
   pg.goto(U+'#tracker');pg.wait_for_timeout(1500);pg.evaluate(SEED)
   TH=f"document.documentElement.classList.toggle('dark',{'true' if theme=='dark' else 'false'})";pg.evaluate(TH)
   pg.evaluate("location.hash='#find'");pg.wait_for_timeout(300);pg.evaluate("location.hash='#tracker'");pg.wait_for_timeout(1000)
   tag=f'{theme}-{w}'
   pg.evaluate(TH);pg.wait_for_timeout(200);pg.screenshot(path=f'{OUT}/v14.1-tracker-default-{tag}.png')
   # checks: no ellipsis, headers full
   chk=pg.evaluate("""()=>{const bad=[];document.querySelectorAll('#t-tracker th .th, #t-tracker td .ce, #t-tracker .pill, #tHelp').forEach(e=>{if(!e.offsetParent)return;const cs=getComputedStyle(e);if(cs.textOverflow==='ellipsis')bad.push('ell:'+e.className);if(e.tagName!=='SELECT'&&e.tagName!=='INPUT'&&e.scrollWidth>e.clientWidth+1)bad.push('clip:'+(e.textContent||'').slice(0,20))});return bad}""")
   ok(f'{tag} no ellipsis/clipping {chk[:4]}',not chk)
   if w>480:
    al=pg.evaluate("""()=>{const r=document.querySelector('#tTable tbody tr');const ds=[...r.cells].map(c=>{const k=c.firstElementChild;if(!k)return 0;const a=k.getBoundingClientRect(),b=c.getBoundingClientRect();return Math.abs((a.top+a.height/2)-(b.top+b.height/2))});return Math.max(...ds)}""")
    ok(f'{tag} row cells vertically centred (max off {al:.1f}px)',al<=3)
    gap=pg.evaluate("""()=>{const c=document.querySelector('#tTable tbody td.c-company .coc');const l=c.children[1].getBoundingClientRect(),t=c.querySelector('.ta').getBoundingClientRect();return t.left-l.right}""")
    ok(f'{tag} logo-name gap {gap:.0f}px',6<=gap<=14)
   # select all columns
   pg.click('#tColBtn')
   for _ in range(20):
    c=pg.query_selector('#tCols input:not(:checked)')
    if not c:break
    c.click(timeout=4000)
   mb=pg.evaluate("JSON.stringify($('tColMenu').getBoundingClientRect())");m=json.loads(mb)
   ok(f'{tag} menu within 70vh+ and Done visible',m['height']<=0.72*900 and pg.is_visible('#tColDone') and pg.evaluate("$('tColDone').getBoundingClientRect().bottom<=innerHeight"))
   pg.screenshot(path=f'{OUT}/v14.1-tracker-menu-{tag}.png')
   pg.mouse.click(w-20,880 if w>480 else 160);pg.wait_for_timeout(300)
   ok(f'{tag} outside click closes menu',not pg.is_visible('#tColMenu'))
   ok(f'{tag} page not wider than viewport',pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
   pg.screenshot(path=f'{OUT}/v14.1-tracker-all-columns-{tag}.png')
   # regression: toggle all on/off 5x, then click row, Save, nav
   for i in range(5):
    pg.click('#tColBtn')
    for inp in pg.query_selector_all('#tCols input'):
     if inp.is_checked():inp.click()
    for inp in pg.query_selector_all('#tCols input'):inp.click()
    pg.keyboard.press('Escape')
   ok(f'{tag} Esc closes',not pg.is_visible('#tColMenu'))
   pg.click('#tTable tbody tr td.c-title textarea',timeout=4000);ok(f'{tag} row cell clickable',pg.evaluate("document.activeElement.dataset.f==='title'"))
   pg.click('a[data-go="db"]',timeout=4000);pg.wait_for_timeout(800)
   ok(f'{tag} nav click works',pg.evaluate("!document.getElementById('t-db').hidden"))
   sv=pg.query_selector('#t-db [data-act="save"]')
   if sv: sv.click(timeout=4000);pg.wait_for_timeout(300)
   ok(f'{tag} Save clickable',sv is not None)
   pg.click('a[data-go="tracker"]');pg.wait_for_timeout(600)
   pg.evaluate(TH);pg.wait_for_timeout(200);pg.add_script_tag(content=AXE)
   r=pg.evaluate("async()=>{const r=await axe.run(document.getElementById('t-tracker'),{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']});return r.violations.map(v=>v.id+':'+v.nodes.length+':'+v.nodes[0].target)}")
   ok(f'{tag} axe AA {r[:3]}',not r)
   pg.evaluate("Store.set('trackerCols',null)");pg.evaluate("localStorage.setItem('idr_trackerCols','{corrupt')");pg.reload();pg.wait_for_timeout(1500);pg.evaluate("location.hash='#tracker'");pg.wait_for_timeout(600)
   ok(f'{tag} corrupted config -> defaults',pg.evaluate("document.querySelectorAll('#tTable thead th').length>=5"))
   ok(f'{tag} no page errors {errs[:2]}',not errs)
   ctx.close()
print(sum(r for _,r in res),'/',len(res))
