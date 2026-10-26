# V5.2: intro shows on every root visit (fresh + returning profile); deep links skip; logo returns to intro.
import json,sys,tempfile
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/'
vis="(()=>{const i=document.getElementById('intro');return !!i&&getComputedStyle(i).display!=='none'})()"
R={}
with sync_playwright() as p:
  prof=tempfile.mkdtemp()
  for run in ['fresh','returning']:
    c=p.chromium.launch_persistent_context(prof,viewport={'width':1280,'height':800});pg=c.new_page();E=[];pg.on('pageerror',lambda e:E.append(str(e)))
    pg.goto(B);pg.wait_for_timeout(800);r={'root_intro':pg.evaluate(vis)}
    pg.click('#goFind');pg.wait_for_timeout(700);r['after_skip_intro']=pg.evaluate(vis)
    pg.click('.nav a[data-t="tracker"]');pg.wait_for_timeout(300);r['innav_intro']=pg.evaluate(vis)
    pg.click('header .brand');pg.wait_for_load_state();pg.wait_for_timeout(800);r['logo_intro']=pg.evaluate(vis)
    pg.click('#goFind');pg.wait_for_timeout(900);r['after_find_intro']=pg.evaluate(vis)
    for d in ['#find','#tracker','#profile','?q=nurse']:
      pg.goto(B+d);pg.wait_for_timeout(600);r['deep '+d]=pg.evaluate(vis)
    pg.goto(B);pg.wait_for_timeout(500);r['root_again']=pg.evaluate(vis)
    r['errors']=E;R[run]=r;c.close()
print(json.dumps(R,indent=1))
