"""V19.3: suggestion lists and search panels are in flow / big enough / never clipped.
Usage: python3 tests/test_v19_3_search.py URL [shotdir]"""
import sys,os
from playwright.sync_api import sync_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8813/';SH=sys.argv[2] if len(sys.argv)>2 else None
R=[]
def ck(n,ok,d=''):R.append(ok);print(('PASS ' if ok else 'FAIL ')+n,d if not ok else '')
def wf(p,js,t=15):
    try:p.wait_for_function(js,timeout=t*1000);return True
    except Exception:return False
AXE=open('/workspace/t/axe.min.js').read() if os.path.exists('/workspace/t/axe.min.js') else None
def axe(p,sel,tag):
    if not AXE:return
    p.add_script_tag(content=AXE)
    v=p.evaluate(f"async()=>(await axe.run({sel!r},{{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>v.id+':'+v.nodes[0].target)")
    ck('axe 0 '+tag,not v,v)
def dark(p,on):p.evaluate(f"()=>document.documentElement.classList.toggle('dark',{str(on).lower()})");p.wait_for_timeout(1600)
def shot(p,name,el=None):
    if SH:(p.locator(el) if el else p).screenshot(path=f'{SH}/{name}.png')
LIST="""(sel)=>{const u=document.querySelector(sel);if(!u||!u.offsetHeight)return null;const r=u.getBoundingClientRect(),w=u.parentElement,li=[...u.querySelectorAll('li')];
 return {n:li.length,h:li.map(l=>Math.round(l.getBoundingClientRect().height)),clip:u.scrollHeight>u.clientHeight+1&&li.length<6,wclip:w.scrollHeight>w.clientHeight+1&&getComputedStyle(w).overflow!=='visible',
  gap:Math.round(r.top-w.querySelector('input').getBoundingClientRect().bottom),bottom:r.bottom}}"""
with sync_playwright() as pw:
  br=pw.chromium.launch()
  for W,H in ((1440,900),(390,844)):
    t=str(W);p=br.new_page(bypass_csp=True,viewport={'width':W,'height':H});errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
    p.goto(URL);wf(p,"()=>document.getElementById('goBuild')&&window.RZ");p.wait_for_timeout(600)
    p.click('#goBuild');wf(p,"()=>!!document.getElementById('obDrop')",10);p.wait_for_timeout(700)
    p.click('#obCard [data-ob=next]');wf(p,"()=>!!document.getElementById('obSchool')",10);p.wait_for_timeout(500)
    p.click('#obSchool');p.keyboard.type('unc');p.wait_for_timeout(700)
    L=p.evaluate(LIST,'#obCard .sugg>ul')
    ck('step2 list shows '+t,bool(L and L['n']>=1),L)
    if L:
      ck('step2 rows >=52px '+t,all(h>=52 for h in L['h']),L['h'])
      ck('step2 no clipping '+t,not L['clip'] and not L['wclip'],L)
      ck('step2 8px gap '+t,L['gap']==8,L['gap'])
      lab=p.evaluate("()=>{const l=[...document.querySelectorAll('#obCard label')].find(x=>/Major/.test(x.textContent));return l?l.getBoundingClientRect().top:null}")
      ck('step2 Major label below list '+t,lab is not None and lab>=L['bottom'],(lab,L['bottom']))
      ck('step2 aria-expanded true '+t,p.evaluate("()=>document.getElementById('obSchool').getAttribute('aria-expanded')==='true'"))
      shot(p,f'searchbox-after-intro2-{W}','#obCard')
      dark(p,True);shot(p,f'searchbox-after-intro2-{W}-dark','#obCard');axe(p,'#obCard','intro2 dark '+t);dark(p,False);axe(p,'#obCard','intro2 light '+t)
      p.keyboard.press('ArrowDown');ck('arrow sets activedescendant '+t,p.evaluate("()=>!!document.getElementById('obSchool').getAttribute('aria-activedescendant')"))
      p.keyboard.press('Enter');p.wait_for_timeout(400)
      ck('Enter picks + closes '+t,p.evaluate("()=>{const u=document.querySelector('#obCard .sugg>ul');return (!u||!u.offsetHeight)&&document.getElementById('obSchool').value.length>2}"))
      el=p.evaluate("()=>{const l=[...document.querySelectorAll('#obCard label')].find(x=>/Major/.test(x.textContent));const r=l.getBoundingClientRect();const e=document.elementFromPoint(r.left+5,r.top+r.height/2);return l.contains(e)}")
      ck('Major label uncovered after pick '+t,el)
    p.click('#obCard [data-ob=next]');wf(p,"()=>!!document.getElementById('obIntIn')",10);p.wait_for_timeout(500)
    p.click('#obIntIn');p.keyboard.type('fin');p.wait_for_timeout(600)
    L=p.evaluate(LIST,'#obCard .sugg.ta>ul')
    ck('step3 interests list rows>=52, unclipped '+t,bool(L and all(h>=52 for h in L['h']) and not L['wclip']),L)
    if L:
      lab=p.evaluate("()=>document.getElementById('obLL').getBoundingClientRect().top")
      ck('step3 Locations label below list '+t,lab>=L['bottom'],(lab,L['bottom']))
    shot(p,f'searchbox-after-intro3-{W}','#obCard');axe(p,'#obCard','intro3 '+t)
    p.keyboard.press('Escape');p.wait_for_timeout(200)
    p.click('#obLocIn');p.keyboard.type('new');p.wait_for_timeout(600)
    L=p.evaluate(LIST,'#obCard .sugg.ta:has(#obLocIn)>ul')
    ck('step3 locations rows>=52, unclipped '+t,bool(L and all(h>=52 for h in L['h']) and not L['wclip']),L)
    ck('continue reachable '+t,p.evaluate("()=>{const b=document.querySelector('#obCard [data-ob=next]');b.scrollIntoView({block:'nearest'});const r=b.getBoundingClientRect();return r.bottom<=innerHeight+1&&r.height>0}"))
    ck('no page errors intro '+t,not errs,errs);p.close()
    # Profile + combos
    p=br.new_page(bypass_csp=True,viewport={'width':W,'height':H});errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
    p.add_init_script("localStorage.setItem('ir_intro_seen','1')");p.goto(URL+'#profile');wf(p,"()=>document.querySelectorAll('#t-profile .cb-field').length>=5",20);p.wait_for_timeout(800)
    n=p.evaluate("()=>document.querySelectorAll('#t-profile .cb-field').length");ck('profile has combos '+t,n>=8,n)
    bad=[]
    for i in range(n):
      p.evaluate(f"()=>{{const f=document.querySelectorAll('#t-profile .cb-field')[{i}];f.scrollIntoView({{block:'center'}});f.click()}}");p.wait_for_timeout(300)
      r=p.evaluate("""()=>{const pop=[...document.querySelectorAll('.cb-pop')].find(x=>x.offsetHeight);if(!pop)return null;const b=pop.getBoundingClientRect();const o=[...pop.querySelectorAll('.cb-o')];
        return {w:Math.round(b.width),l:b.left,r:b.right,h:o.slice(0,3).map(x=>Math.round(x.getBoundingClientRect().height)),list:Math.round(pop.querySelector('.cb-list').getBoundingClientRect().height)}}""")
      if not r or r['l']<0 or r['r']>W or any(h!=48 for h in r['h']) or (r['w']<340 and W>=360) or r['list']>336:bad.append((i,r))
      if i==0:
        p.keyboard.type('Councill');p.wait_for_timeout(400)
        lt=p.evaluate("()=>{const o=[...document.querySelectorAll('.cb-pop .cb-o .cb-t')].find(x=>/Councill/.test(x.textContent));if(!o)return null;return {lines:Math.round(o.getBoundingClientRect().height/parseFloat(getComputedStyle(o).lineHeight)),full:o.scrollHeight<=o.clientHeight+1,title:o.title}}")
        ck('long school readable (<=2 lines, full) '+t,bool(lt and lt['full'] and lt['title']),lt)
        shot(p,f'searchbox-after-profile-school-{W}')
        dark(p,True);shot(p,f'searchbox-after-profile-school-{W}-dark');dark(p,False)
        p.keyboard.press('ArrowDown');p.keyboard.press('Escape');p.wait_for_timeout(200)
        ck('Escape closes + focus returns '+t,p.evaluate("()=>![...document.querySelectorAll('.cb-pop')].some(x=>x.offsetHeight)&&!!document.activeElement.closest('.cb')"))
      else:p.keyboard.press('Escape');p.wait_for_timeout(150)
    ck('every profile panel: 48px rows, >=340 wide, on screen, list<=336 '+t,not bad,bad)
    axe(p,'#t-profile','profile '+t)
    ck('no page errors profile '+t,not errs,errs);p.close()
    # Ctrl K + filter panel
    p=br.new_page(bypass_csp=True,viewport={'width':W,'height':H});errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
    p.add_init_script("localStorage.setItem('ir_intro_seen','1')");p.goto(URL+'#find');wf(p,"()=>typeof D!=='undefined'&&D.length>50",30);p.wait_for_timeout(800)
    p.keyboard.press('Control+k');wf(p,"()=>!!document.getElementById('qkIn')&&document.getElementById('qkIn').offsetHeight",5)
    ck('qkIn 52px '+t,p.evaluate("()=>document.getElementById('qkIn').getBoundingClientRect().height")==52)
    tip0=p.evaluate("()=>document.querySelector('.qk-tip')?.getBoundingClientRect().top")
    p.keyboard.type('analyst');p.wait_for_timeout(500)
    q=p.evaluate("()=>{const li=[...document.querySelectorAll('#qkRes li')];return {n:li.length,h:li.map(l=>Math.round(l.getBoundingClientRect().height)),mh:getComputedStyle(document.getElementById('qkRes')).maxHeight}}")
    ck('Ctrl K rows >=48 and <=2 lines '+t,q['n']>0 and all(48<=h<=80 for h in q['h']) and q['mh']=='360px',q)
    shot(p,f'searchbox-after-ctrlk-{W}');dark(p,True);shot(p,f'searchbox-after-ctrlk-{W}-dark');dark(p,False)
    p.keyboard.press('Escape');p.wait_for_timeout(300)
    ck('no page errors find '+t,not errs,errs);p.close()
  print(f'V19.3 SEARCH {sum(R)} / {len(R)}')
