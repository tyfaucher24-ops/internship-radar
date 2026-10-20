import sys,json
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/';SS='/workspace/internship-radar/screenshots/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
VP=[(375,667),(390,844),(768,1024),(1280,800),(1440,900),(1920,1080),(2560,1440)]
errs={}
with sync_playwright() as p:
  b=p.chromium.launch(args=ARGS)
  for w,h in VP:
    mob=w<700;ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if w<1000 else 1,is_mobile=mob,has_touch=mob);pg=ctx.new_page();E=[]
    pg.on('pageerror',lambda e:E.append(str(e)));pg.on('console',lambda m:E.append(m.text) if m.type=='error' else None)
    pg.goto(B+'?gl=1');pg.wait_for_function("document.getElementById('intro')?.classList.contains('gl-on')",timeout=30000);pg.wait_for_timeout(1500)
    pg.screenshot(path=SS+f'v5-start-{w}x{h}.png')
    pg.evaluate("document.getElementById('skipIntro').click()");pg.wait_for_function('window._interactiveAt',timeout=30000);pg.wait_for_timeout(800)
    pg.screenshot(path=SS+f'v5-find-{w}x{h}.png');errs[f'{w}x{h}']=E;ctx.close()
  ctx=b.new_context(viewport={'width':1440,'height':900});pg=ctx.new_page();pg.goto(B+'?introSlow=4&gl=1');pg.wait_for_function("document.getElementById('intro')?.classList.contains('gl-on')",timeout=30000)
  pg.evaluate("document.getElementById('goFind').click()")
  for t in [1.5,3.2,5.0]:
    pg.wait_for_timeout(int(t*1000) if t==1.5 else 1700);pg.screenshot(path=SS+f'v5-transition-{t}s.png')
print(json.dumps(errs))
