from playwright.sync_api import sync_playwright
import sys
U=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
SH=sys.argv[2] if len(sys.argv)>2 else 'screenshots/v2-step2-'
with sync_playwright() as p:
    b=p.chromium.launch();E=[]
    def watch(pg,t):pg.on('pageerror',lambda e:E.append(t+' '+str(e)));pg.on('console',lambda m:m.type=='error' and E.append(t+' console '+m.text))
    c=b.new_context(bypass_csp=True,viewport={'width':1440,'height':900},accept_downloads=True);pg=c.new_page();watch(pg,'desk')
    # seed legacy-shaped tracker to test migration
    pg.goto(U);pg.evaluate("localStorage.idr_tracker=JSON.stringify({'999999':'Applied'})");pg.reload();pg.wait_for_selector('#stats div')
    print('migrated',pg.evaluate("localStorage.idr_tracker")[:120]);pg.evaluate("localStorage.removeItem('idr_tracker')");pg.reload();pg.wait_for_selector('#stats div')
    pg.click('[data-t=find]');pg.wait_for_selector('#list .card')
    for i in range(3): pg.locator('#list .card').nth(i).get_by_text('Save',exact=True).click()
    for i in range(3,6): pg.locator('#list .card').nth(i).get_by_text('Mark applied').click()
    print('btn',pg.locator('#list .card .tk').first.inner_text())
    pg.click('[data-t=tracker]');print('stats',pg.inner_text('#tStats').replace('\n',' '))
    # drag Applied -> Interview with mouse
    src=pg.locator('.col[data-status=Applied] .grip').first;dst=pg.locator('.col[data-status=Interview]')
    sb=src.bounding_box();db=dst.bounding_box()
    pg.mouse.move(sb['x']+5,sb['y']+5);pg.mouse.down();pg.mouse.move(sb['x']+40,sb['y']+40,steps=5);pg.mouse.move(db['x']+50,db['y']+60,steps=10);pg.mouse.up()
    print('interview col',pg.locator('.col[data-status=Interview] .acard').count())
    pg.locator('.col[data-status=Applied] select').first.select_option('Offer');print('offer col',pg.locator('.col[data-status=Offer] .acard').count())
    pg.locator('.col[data-status=Saved] .acard button').first.click()
    pg.fill('#appF [name=contact]','Jane Recruiter');pg.fill('#appF [name=nextStep]','Recruiter call');pg.fill('#appF [name=nextDate]','2026-10-27');pg.fill('#appF [name=notes]','Bring resume, ask about team; deadline')
    pg.click('#appF button');print('stats2',pg.inner_text('#tStats').replace('\n',' '))
    pg.screenshot(path=SH+'board.png')
    with pg.expect_download() as d: pg.click('#ics')
    ics=open(d.value.path()).read() if False else open(d.value.path(),newline='').read();open('/tmp/t.ics','w',newline='').write(ics)
    print('ics events',ics.count('BEGIN:VEVENT'),'crlf',ics.count('\r\n')==ics.count('\n'))
    pg.click('#tl');pg.screenshot(path=SH+'list.png');print('list rows',pg.locator('#tList tbody tr').count())
    # mobile touch drag
    m=b.new_context(bypass_csp=True,viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);mp=m.new_page();watch(mp,'mob')
    mp.goto(U);mp.wait_for_selector('#stats div');mp.evaluate(f"localStorage.idr_tracker={repr(pg.evaluate('localStorage.idr_tracker'))}");mp.goto(U+'#tracker');mp.reload();mp.wait_for_selector('.acard')
    g=mp.locator('.col[data-status=Saved] .grip').first;gb=g.bounding_box();t=mp.locator('.col[data-status=Applied]').bounding_box()
    cdp=m.new_cdp_session(mp)
    def tp(typ,x,y):cdp.send('Input.dispatchTouchEvent',{'type':typ,'touchPoints':[] if typ=='touchEnd' else [{'x':x,'y':y}]})
    x0,y0=gb['x']+5,gb['y']+5;tp('touchStart',x0,y0)
    for k in range(1,11):tp('touchMove',x0+(t['x']+40-x0)*k/10,y0+(t['y']+60-y0)*k/10)
    tp('touchEnd',0,0);mp.wait_for_timeout(200)
    print('mobile saved col',mp.locator('.col[data-status=Saved] .acard').count(),'applied col',mp.locator('.col[data-status=Applied] .acard').count())
    mp.locator('.col[data-status=Saved] select').first.select_option('Withdrawn');print('mobile withdrawn',mp.locator('.col[data-status=Withdrawn] .acard').count())
    mp.evaluate('window.scrollTo(0,0)');mp.screenshot(path=SH+'mobile.png');print('overflow',mp.evaluate('document.documentElement.scrollWidth'))
    print('ERRORS',E)
