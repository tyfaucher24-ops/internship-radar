import sys,json,time
from playwright.sync_api import sync_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
SS='/workspace/internship-radar/screenshots/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
res={}
with sync_playwright() as p:
  b=p.chromium.launch(args=ARGS)
  for name,vp,mob in [('desktop',{'width':1400,'height':900},False),('mobile',{'width':390,'height':844},True)]:
    ctx=b.new_context(bypass_csp=True,viewport=vp,is_mobile=mob,has_touch=mob,device_scale_factor=2 if mob else 1);pg=ctx.new_page();errs=[]
    pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None);pg.on('pageerror',lambda e:errs.append(str(e)))
    # first visit: intro
    pg.goto(BASE+'?introSlow=3');pg.wait_for_timeout(4500);pg.screenshot(path=SS+f'v4-intro-{name}.png')
    pg.evaluate("document.getElementById('goFind').click()");pg.wait_for_timeout(600)
    # returning visit timing
    pg.goto(BASE);pg.wait_for_function('window._interactiveAt',timeout=20000);ti=pg.evaluate('window._interactiveAt');
    assert pg.evaluate("document.getElementById('intro').hidden"),'intro shown to returning visitor'
    n=pg.evaluate("document.querySelectorAll('#vl .lrow').length");pg.screenshot(path=SS+f'v4-db-{name}.png')
    # filter timing
    if mob: pg.click('#fBtn');pg.wait_for_timeout(400);pg.screenshot(path=SS+f'v4-filters-sheet-{name}.png')
    t=pg.evaluate("""()=>{const s=document.querySelector('[data-f=cat]');const v=[...s.options].find(o=>o.value&&!o.disabled).value;const t0=performance.now();s.value=v;s.dispatchEvent(new Event('change'));return performance.now()-t0}""")
    url=pg.url
    if mob: pg.click('#fDone')
    pg.fill('#q','analyst');pg.wait_for_timeout(400);cnt=pg.inner_text('#count')
    pg.screenshot(path=SS+f'v4-filtered-{name}.png')
    pg.reload();pg.wait_for_function('window._interactiveAt');persist=pg.inner_text('#count')
    pg.click('#vl .lrow');pg.wait_for_timeout(700);pg.screenshot(path=SS+f'v4-drawer-{name}.png');pg.click('#dx')
    pg.click('#vl .lrow [data-act=save]');pg.wait_for_timeout(200)
    pg.click('#mapBtn');pg.wait_for_timeout(2500);pg.screenshot(path=SS+f'v4-map-{name}.png');dots=pg.evaluate("document.querySelectorAll('#mdots circle').length")
    pg.click('[data-t=profile]');pg.fill('[name=major]','Finance');pg.fill('[name=skills]','excel, financial modeling, accounting, sql, powerpoint');pg.select_option('[name=classYear]','Junior');pg.wait_for_timeout(1200)
    pg.screenshot(path=SS+f'v4-profile-{name}.png',full_page=False);m=pg.inner_text('#mCounts')
    pg.click('[data-t=tracker]');pg.wait_for_timeout(300);pg.screenshot(path=SS+f'v4-tracker-{name}.png')
    res[name]=dict(interactive_ms=round(ti),rows=n,filter_ms=round(t,1),count=cnt,persist=persist,dots=dots,matches=m,urlq=url.split('?')[-1][:80],errors=errs[:5])
    ctx.close()
  b.close()
print(json.dumps(res,indent=1))
