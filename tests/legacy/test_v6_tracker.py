import sys;from playwright.sync_api import sync_playwright
U=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/';out=[]
with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for w,h in [(1280,800),(1440,900),(1920,1080)]:
    pg=b.new_page(bypass_csp=True,viewport={'width':w,'height':h});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto(U+'#tracker');pg.wait_for_timeout(1500)
    if w==1280:
      pg.screenshot(path='screenshots/v6-tracker-empty.png');print('empty-btn',pg.is_visible('#tEmpty .btn'))
    pg.goto(U+'#find');pg.wait_for_selector('#vl [data-act=save]')
    if pg.evaluate("T.all().length")<8:
      for i in range(8): pg.locator('#vl [data-act=save]').nth(i).click();pg.wait_for_timeout(60)
    pg.click('[data-t=tracker]');pg.wait_for_timeout(1200)
    m=pg.evaluate("""(()=>{const r=document.querySelector('#tTable tbody tr'),td=r.querySelector('td.c-company'),ti=r.querySelector('td.c-title');return{row:r.offsetHeight,fs:getComputedStyle(r.querySelector('.ce')).fontSize,pad:getComputedStyle(td).paddingLeft,co:td.offsetWidth,ti:ti.offsetWidth,logo:r.querySelector('.logo.sm')?.offsetWidth,img:!!r.querySelector('.logo.sm img'),wrap:document.querySelector('.container.twide').offsetWidth,hscroll:document.documentElement.scrollWidth>innerWidth}})()""")
    print(w,m,'errors',errs);pg.screenshot(path=f'screenshots/v6-tracker-{w}.png')
