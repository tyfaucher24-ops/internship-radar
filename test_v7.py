# V7 Details screen: open/close via button, Esc, browser back, #details deep link; fps during the transition; screenshots v7-*.png
import json,sys;from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/';R={}
FPS="""()=>new Promise(r=>{let n=0,t0=performance.now(),last=t0,worst=0;function f(t){n++;worst=Math.max(worst,t-last);last=t;if(t-t0<1000)requestAnimationFrame(f);else r({fps:Math.round(n*1000/(t-t0)),worstFrameMs:Math.round(worst)})}requestAnimationFrame(f)})"""
with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
  for name,vp,mob in [('desktop',{'width':1440,'height':900},False),('mobile',{'width':390,'height':844},True)]:
    pg=b.new_page(bypass_csp=True,viewport=vp,is_mobile=mob,has_touch=mob);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto(B);pg.wait_for_timeout(4500);r={'skip_gone':pg.locator('#skipIntro').count()==0,'gl_on':pg.evaluate("document.getElementById('intro').classList.contains('gl-on')")}
    r['idle_fps']=pg.evaluate(FPS)
    pg.click('#detailsBtn');pg.evaluate('f=>{window._fp=(eval(f))()}',FPS);pg.wait_for_timeout(50);r['transition_fps']=pg.evaluate('window._fp')
    pg.wait_for_timeout(1200);pg.screenshot(path=f'screenshots/v7-details-{name}.png')
    r['hash']=pg.evaluate('location.hash');r['count']=pg.inner_text('.d-count');r['step1']=pg.inner_text('.d-steps li:first-child')
    pg.keyboard.press('Escape');pg.wait_for_timeout(1100);r['after_esc']=[pg.evaluate('location.hash'),pg.evaluate("document.getElementById('intro').classList.contains('details-on')")]
    pg.click('#detailsBtn');pg.wait_for_timeout(1100);pg.go_back();pg.wait_for_timeout(1100);r['after_back']=[pg.evaluate('location.hash'),pg.evaluate("document.getElementById('intro').classList.contains('details-on')"),pg.evaluate("!!document.getElementById('intro')")]
    pg.click('#detailsBtn');pg.wait_for_timeout(1100);pg.click('#detailsBack');pg.wait_for_timeout(1100);r['after_backbtn']=pg.evaluate("document.getElementById('intro').classList.contains('details-on')")
    pg.click('#detailsBtn');pg.wait_for_timeout(30);pg.evaluate("document.getAnimations().forEach(a=>{a.pause();a.currentTime=420})");pg.wait_for_timeout(100);pg.screenshot(path=f'screenshots/v7-details-{name}-mid.png');pg.evaluate("document.getAnimations().forEach(a=>a.play())");pg.wait_for_timeout(1100);pg.click('#detailsBack');pg.wait_for_timeout(1100)
    pg.goto('about:blank');pg.goto(B+'#details');pg.wait_for_timeout(2500);r['deeplink_open']=pg.evaluate("!!document.getElementById('intro')&&document.getElementById('intro').classList.contains('details-on')")
    pg.click('#dFind');pg.wait_for_timeout(1200);r['find_ok']=[pg.evaluate("!document.getElementById('intro')"),pg.evaluate('location.hash')]
    r['errors']=errs;R[name]=r;pg.close()
  pg=b.new_page(bypass_csp=True,viewport={'width':1440,'height':900},reduced_motion='reduce');pg.goto(B);pg.wait_for_timeout(2000);pg.click('#detailsBtn');pg.wait_for_timeout(600);R['reduced_motion_open']=pg.evaluate("document.getElementById('intro').classList.contains('details-on')");pg.screenshot(path='screenshots/v7-details-reduced.png')
print(json.dumps(R,indent=1))
