import sys,json
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
SZ=[(1280,800),(1440,900),(1920,1080),(2560,1440),(390,844),(768,1024)]
out={}
with sync_playwright() as p:
  b=p.chromium.launch(args=ARGS)
  for w,h in SZ:
    mob=w<700
    c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=3 if mob else (2 if w==768 else 1),is_mobile=mob,has_touch=mob)
    pg=c.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto(B+'?intro=1');pg.wait_for_function("document.getElementById('intro')?.classList.contains('gl-on')",timeout=60000);pg.wait_for_timeout(1200)
    pg.screenshot(path=f'screenshots/v51-intro-start-{w}x{h}.png')
    pg.wait_for_timeout(4000);pg.mouse.move(w*.7,h*.5);pg.mouse.down();pg.mouse.move(w*.5,h*.45,steps=8);pg.mouse.up();pg.wait_for_timeout(800)
    pg.screenshot(path=f'screenshots/v51-intro-mid-{w}x{h}.png')
    pg.evaluate("document.getElementById('goFind').click()");pg.wait_for_timeout(1500)
    pg.screenshot(path=f'screenshots/v51-intro-end-{w}x{h}.png')
    out[f'{w}x{h}']=errs;c.close()
print(json.dumps(out))
