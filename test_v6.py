# V6 functional test: test profiles are injected as drafts (never shipped); Save & Search, re-save, min-match, drawer, reset.
import json,sys
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/';SS='screenshots/'
T=json.load(open('test/profiles.test.json'))
R={}
with sync_playwright() as p:
  b=p.chromium.launch();c=b.new_context(viewport={'width':1440,'height':900});pg=c.new_page();E=[]
  pg.on('pageerror',lambda e:E.append(str(e)));pg.on('console',lambda m:m.type=='error' and E.append(m.text))
  pg.goto(B+'#find');pg.wait_for_function('window._interactiveAt');pg.wait_for_timeout(500)
  R['badges_before']=pg.locator('.mbadge').count();R['minm_pill_before']=pg.locator('[data-pill=minm]').count()
  pg.goto(B+'#profile');pg.wait_for_function('window._interactiveAt');pg.wait_for_timeout(300)
  pg.screenshot(path=SS+'v6-profile-empty.png')
  # fill a few fields through the UI, the rest from the 'average' test profile
  pg.evaluate("p=>{localStorage.setItem('idr_profileDraft',JSON.stringify(p))}",T['average'])
  pg.reload();pg.wait_for_function('window._interactiveAt');pg.wait_for_timeout(300)
  pg.click('#cbSkills .cb-field');pg.keyboard.type('tableau');pg.keyboard.press('Enter');pg.fill('#cbInd .cb-search','') if False else None;pg.keyboard.press('Escape');pg.click('#cbInd .cb-field');pg.keyboard.type('consult');pg.keyboard.press('Enter');pg.keyboard.press('Escape')
  pg.wait_for_timeout(500);pg.evaluate('scrollTo(0,0)');pg.wait_for_timeout(200);pg.screenshot(path=SS+'v6-profile-filled.png')
  pg.click('#pfSave');pg.wait_for_function("location.hash===''||location.hash==='#'",timeout=10000);pg.wait_for_timeout(800)
  R['toast']=pg.evaluate("document.getElementById('toast')?.textContent");R['rescore_ms']=pg.evaluate('window._rescoreMs');R['sort']=pg.evaluate("document.getElementById('sort').value")
  R['first_badges']=pg.locator('#vl .mbadge').all_inner_texts()[:6]
  pg.screenshot(path=SS+'v6-home-grades.png')
  pg.click('#vl .card >> nth=0');pg.wait_for_selector('.fbp',timeout=8000);pg.wait_for_timeout(400);R['drawer']=pg.inner_text('.fbp');pg.screenshot(path=SS+'v6-drawer.png');pg.keyboard.press('Escape')
  pg.click('[data-pill=minm]');pg.wait_for_timeout(200);pg.keyboard.type('75');pg.keyboard.press('Enter');pg.click('[data-apply]');pg.wait_for_timeout(300);R['count_75']=pg.inner_text('#count')
  # re-save with the top-student profile -> rescoring changes
  pg.goto(B+'#profile');pg.wait_for_function('window._interactiveAt');pg.evaluate("p=>localStorage.setItem('idr_profileDraft',JSON.stringify(p))",T['top']);pg.reload();pg.wait_for_function('window._interactiveAt');pg.wait_for_timeout(200)
  pg.click('#pfSave');pg.wait_for_timeout(1200);R['resave_first']=pg.locator('#vl .mbadge').all_inner_texts()[:3];R['resave_ms']=pg.evaluate('window._rescoreMs')
  pg.goto(B+'#profile');pg.wait_for_function('window._interactiveAt');pg.click('#pfReset');pg.click('#rsYes');pg.wait_for_timeout(800)
  R['after_reset_badges']=pg.locator('.mbadge').count();R['after_reset_sort']=pg.evaluate("document.getElementById('sort').value");R['after_reset_store']=pg.evaluate("[localStorage.getItem('idr_profile'),localStorage.getItem('idr_profileDraft')]")
  pg.reload();pg.wait_for_function('window._interactiveAt');pg.wait_for_timeout(1500);R['after_reload_badges']=pg.locator('.mbadge').count()
  R['errors']=E
print(json.dumps(R,indent=1))
