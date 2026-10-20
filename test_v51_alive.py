# 60s liveness check: the globe frame counter must keep increasing in every 5s window (no freeze).
import sys,json
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
with sync_playwright() as p:
  b=p.chromium.launch(args=ARGS);res={}
  for name,vp in [('desktop',{'width':1440,'height':900}),('mobile',{'width':390,'height':844})]:
    pg=b.new_page(viewport=vp);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(B+'?intro=1');pg.wait_for_function("window.__globeFrames>0",timeout=60000)
    samples=[]
    for i in range(12):
      pg.wait_for_timeout(5000);samples.append(pg.evaluate("[window.__globeFrames,document.getElementById('intro')?.dataset.lite||'0',document.getElementById('intro')?.className]"))
    fr=[s[0] for s in samples];deltas=[b2-a for a,b2 in zip([0]+fr,fr)]
    res[name]={'frames_per_5s':deltas,'min_fps':round(min(deltas[1:])/5,1),'quality_step':samples[-1][1],'class':samples[-1][2],'frozen':any(d==0 for d in deltas),'errors':errs}
  print(json.dumps(res,indent=1))
