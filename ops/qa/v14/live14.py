import json,re
from playwright.sync_api import sync_playwright
U='https://tyfaucher24-ops.github.io/internship-radar/';R={};S='/workspace/internship-radar/ops/screens/'
axe=open('/workspace/qa-v14/axe.min.js').read()
with sync_playwright() as p:
  b=p.chromium.launch()
  for w,h in [(1440,900),(1280,800),(390,844)]:
    for th in ['dark','light']:
      c=b.new_context(viewport={'width':w,'height':h},color_scheme=th);pg=c.new_page();errs=[]
      pg.on('pageerror',lambda e:errs.append(str(e)))
      pg.goto(U);pg.wait_for_timeout(1500)
      pg.screenshot(path=f'{S}v14-intro-{w}-{th}.png')
      pg.evaluate("()=>{localStorage.setItem('idr_intro_seen','1');localStorage.setItem('ir_ui',JSON.stringify({theme:arguments[0]}))}".replace('arguments[0]',repr(th)))
      pg.goto(U);pg.wait_for_selector('.card',timeout=30000);pg.wait_for_timeout(1200)
      k=f'{w}-{th}';r={}
      r['intro_hidden_on_return']=pg.evaluate("()=>{const i=document.getElementById('intro');return !i||document.documentElement.classList.contains('seen')||getComputedStyle(i).display=='none'||getComputedStyle(i).visibility=='hidden'}")
      r['bg']=pg.evaluate("()=>getComputedStyle(document.body).backgroundColor")
      r['clipped']=pg.evaluate("()=>[...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e);return s.textOverflow=='ellipsis'&&e.scrollWidth>e.clientWidth+1}).length")
      r['hscroll']=pg.evaluate("()=>document.documentElement.scrollWidth>innerWidth+1")
      r['admin_hidden']=pg.evaluate("()=>{const a=document.getElementById('pmAdmin');return !a||a.hidden}")
      pg.screenshot(path=f'{S}v14-list-{k}.png')
      pg.focus('.card');pg.keyboard.press('Enter');pg.wait_for_timeout(900)
      r['enter_opens']=pg.evaluate("()=>!!document.querySelector('#dbody')&&document.querySelector('#dbody').offsetParent!==null")
      r['dact_last']=pg.evaluate("()=>{const d=document.getElementById('dbody'),a=document.getElementById('dAct');return !!a&&d.lastElementChild===a}")
      r['no_notlisted_fact']=pg.evaluate("()=>!document.querySelector('#dbody .fact .nl')")
      pg.screenshot(path=f'{S}v14-detail-{k}.png')
      pg.add_script_tag(content=axe)
      a=pg.evaluate("async()=>{const r=await axe.run(document,{runOnly:['wcag2a','wcag2aa']});return r.violations.map(v=>v.id+':'+v.nodes.length)}")
      r['axe']=a;r['errors']=errs;R[k]=r;c.close()
  c=b.new_context(viewport={'width':1280,'height':800});pg=c.new_page()
  pg.add_init_script("WebGLRenderingContext=undefined;WebGL2RenderingContext=undefined;HTMLCanvasElement.prototype.getContext=(o=>function(t,...a){return /webgl/.test(t)?null:o.call(this,t,...a)})(HTMLCanvasElement.prototype.getContext)")
  pg.goto(U+'?intro=1');pg.wait_for_timeout(3000)
  R['static_globe_dots']=pg.evaluate("()=>!!document.querySelector('#intro .ph-dots')")
  pg.screenshot(path=S+'v14-static-globe.png')
  b.close()
print(json.dumps(R,indent=1))
