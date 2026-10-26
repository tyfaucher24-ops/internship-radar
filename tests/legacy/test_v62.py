# V6.2 honest feedback: the 3 test profiles (never shipped) -> feedback page sections, timings, screenshots v62-*.png
import json,sys;from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/';T=json.load(open('test/profiles.test.json'));R={}
RES="Jane Doe  jane@example.edu\nEducation\nState University, B.S. Finance, May 2028\nExperience\nCashier, Corner Market, Jun 2024 - Aug 2025\n• Helped customers\n• Counted the register\nSkills\nExcel, communication"
with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for k in ['none','average','top']:
    pg=b.new_page(bypass_csp=True,viewport={'width':1280,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto(B+'#profile');pg.wait_for_function('window._interactiveAt')
    pg.evaluate("([p,r,k])=>{localStorage.setItem('idr_profileDraft',JSON.stringify(p));if(k==='average')localStorage.setItem('idr_resumeText',JSON.stringify(r))}",[T[k],RES,k]);pg.reload();pg.wait_for_function('window._interactiveAt')
    pg.click('#pfSave');pg.wait_for_selector('#fbNudge:not([hidden])',timeout=20000);pg.click('#fbNudge')
    pg.wait_for_function("document.querySelectorAll('#fbBody .fb-card').length>=5",timeout=30000);pg.wait_for_timeout(300)
    cards=pg.eval_on_selector_all('#fbBody .fb-card','e=>e.map(c=>c.innerText)')
    R[k]={'ms':pg.evaluate('window._fbMs'),'standing':cards[0][:400],'gaps':cards[1][:600],'changes':cards[3][:700],'checks':cards[4][:500],'errors':errs}
    pg.screenshot(path=f'screenshots/v62-{k}-top.png');pg.evaluate("document.querySelectorAll('#fbBody .fb-card')[3].scrollIntoView()");pg.wait_for_timeout(200);pg.screenshot(path=f'screenshots/v62-{k}-changes.png')
    pg.close()
print(json.dumps(R,indent=1))
