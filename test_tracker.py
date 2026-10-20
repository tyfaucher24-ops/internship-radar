import sys,json
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8799/';SS='/workspace/internship-radar/screenshots/'
with sync_playwright() as p:
  b=p.chromium.launch();out={}
  for name,vp in [('desktop',{'width':1400,'height':900}),('mobile',{'width':390,'height':844})]:
    ctx=b.new_context(viewport=vp,accept_downloads=True);pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    pg.add_init_script("localStorage.setItem('idr_introSeen','true');localStorage.setItem('idr_tracker',JSON.stringify([{id:'old1',listingId:null,listing:{company:'Legacy Co',title:'Old Intern'},status:'Interview',history:['Saved','Applied','Interview'],dateApplied:'2026-09-01',created:'2026-09-01T00:00:00Z',updated:'2026-09-20T00:00:00Z'}]))")
    pg.goto(B);pg.wait_for_function('window._interactiveAt')
    pg.click('#vl .lrow:nth-of-type(1) [data-act=save]') if False else pg.locator('#vl [data-act=save]').nth(0).click()
    pg.locator('#vl [data-act=applied]').nth(0).click();pg.wait_for_timeout(200)
    # duplicate: drawer save of first tracked
    pg.evaluate("track(T.all()[0].listingId,'Saved')");dup=pg.inner_text('#toast')
    pg.click('[data-t=tracker]');pg.wait_for_timeout(300)
    rows=pg.evaluate("document.querySelectorAll('#tTable tbody tr').length");mig=pg.evaluate("T.all().find(t=>t.id==='old1').status")
    ap=pg.evaluate("T.all().find(t=>t.status==='Applied')");
    pg.locator('#tTable tbody tr select[data-f=status]').first.select_option('Interviewing');pg.wait_for_timeout(200)
    pg.click('#tColBtn');pg.check('#tCols input[value=priority]');pg.click('#tColDone')
    pg.screenshot(path='/tmp/pre.png');print(pg.evaluate("[...document.querySelectorAll('#tTable thead th')].map(t=>t.dataset.k+':'+t.offsetWidth).join()"));pg.evaluate("document.querySelector('#tTable [data-star=\"4\"]').click()")
    pg.click('#tAdd');pg.fill('#trAdd [name=company]','Acme Test');pg.fill('#trAdd [name=title]','Analyst Intern');pg.fill('#trAdd [name=deadline]','2026-10-22');pg.click('#trAdd button')
    pg.wait_for_timeout(200);seg=pg.inner_text('#tSeg');stats=pg.inner_text('#tStats');ghost=pg.evaluate("document.querySelectorAll('[data-ghost]').length")
    with pg.expect_download() as d: pg.click('#tCsv')
    csv=open(d.value.path()).read()[:300]
    with pg.expect_download() as d2: pg.click('#tXls')
    pg.screenshot(path=SS+f'v4-tracker-sheet-{name}.png')
    out[name]=dict(rows=rows,migrated=mig,applied=ap and [ap['dateApplied'],ap['followUp']],dup=dup,seg=seg,stats=stats,ghost_btn=ghost,csv=csv.splitlines()[0][:120],errors=errs)
    ctx.close()
print(json.dumps(out,indent=1))
