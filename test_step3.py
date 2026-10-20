from playwright.sync_api import sync_playwright
import sys
U=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
SH=sys.argv[2] if len(sys.argv)>2 else 'screenshots/v2-step3-'
LI="""Jordan Testcase (TEST - fictional)
Experience
Finance Intern
Example Credit Union
Jun 2025 - Aug 2025
Built Excel models for loan reporting
Education
Queens University of Charlotte
Bachelor of Science, Finance
2024 - 2028
Top Skills
Excel
Financial Modeling
SQL"""
with sync_playwright() as p:
    b=p.chromium.launch();E=[]
    def watch(pg,t):pg.on('pageerror',lambda e:E.append(t+' '+str(e)));pg.on('console',lambda m:m.type=='error' and E.append(t+' console '+m.text))
    c=b.new_context(viewport={'width':1440,'height':900});pg=c.new_page();watch(pg,'desk')
    pg.goto(U);pg.wait_for_function('D.length>0');pg.click('[data-t=profile]');pg.check('#pInd [value="Finance & Accounting"]');pg.fill('[name=locations]','NC, Remote');pg.click('#profForm button')
    pg.click('[data-t=foryou]');pg.set_input_files('#resume','test-data/TEST_resume_fictional.pdf');pg.wait_for_function("document.getElementById('rstat').textContent.startsWith('Read ')",timeout=30000)
    print(pg.inner_text('#rstat'))
    for k in ['school','major','gpa','classYear','skills','experience','leadership','clubs']:print(' ',k,'=',pg.input_value(f'#parsedForm [name={k}]').replace('\n',' | ')[:150])
    pg.click('#parsedForm button');pg.wait_for_selector('#mList .card');print(pg.inner_text('#mCounts'))
    for i in range(3):print(' -',pg.locator('#mList .card .co').nth(i).inner_text(),'|',pg.locator('#mList .why').nth(i).inner_text())
    pg.click('#mTabs [data-b=Reach]');print(' reach:',pg.locator('#mList .why').first.inner_text())
    pg.click('#mTabs [data-b=all]');pg.locator('#mResults').scroll_into_view_if_needed();pg.screenshot(path=SH+'matches.png')
    pg.evaluate('window.scrollTo(0,0)');pg.locator('#parsedBox').scroll_into_view_if_needed();pg.screenshot(path=SH+'parsed.png')
    pg.click('[data-t=home]');pg.wait_for_selector('#topSlot .card');print('home matches',pg.locator('#topSlot .card').count());pg.locator('#topSlot').scroll_into_view_if_needed();pg.screenshot(path=SH+'home.png')
    # LinkedIn paste on fresh context
    c2=b.new_context();p2=c2.new_page();watch(p2,'li');p2.goto(U+'#foryou');p2.wait_for_function('D.length>0');p2.click('#t-foryou summary');p2.fill('#liText',LI);p2.click('#liGo')
    print('linkedin',p2.inner_text('#rstat'),p2.input_value('#parsedForm [name=major]'),p2.input_value('#parsedForm [name=classYear]'))
    # admin config edit flows into site
    a=c.new_page();watch(a,'admin');a.goto(U+'admin.html');a.fill('#pw',open('/tmp/admin_pw.txt').read().strip());a.click('#gForm button');a.wait_for_selector('#cfg table')
    top=pg.locator('#topSlot .card .co').first.inner_text()
    a.click("#cfg button:has-text('+ Row') >> nth=0");rows=a.locator('#cfg table').first.locator('tbody tr');n=rows.count()
    r=rows.nth(n-1);r.locator('input').nth(0).fill(top.title());r.locator('input').nth(0).dispatch_event('change');r.locator('input').nth(1).fill('1');r.locator('input').nth(1).dispatch_event('change');r.locator('input').nth(2).fill('3.8');r.locator('input').nth(2).dispatch_event('change');r.locator('input').nth(3).check();r.locator('input').nth(3).dispatch_event('change')
    a.screenshot(path=SH+'admin-config.png',full_page=False);a.locator('#cfg').scroll_into_view_if_needed();a.screenshot(path=SH+'admin-config.png')
    pg.reload();pg.wait_for_function('D.length>0');pg.click('[data-t=foryou]');pg.wait_for_selector('#mList .card');pg.fill('#q','x') if False else None
    hit=pg.evaluate(f"MATCHES.find(m=>m.x.company.toLowerCase()==={repr(top.lower())})");print('after config:',hit['bucket'],hit['odds'],hit['reason'])
    m=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True);mp=m.new_page();watch(mp,'mob')
    mp.goto(U+'#foryou');mp.wait_for_function('D.length>0');mp.set_input_files('#resume','test-data/TEST_resume_fictional.pdf');mp.wait_for_function("document.getElementById('rstat').textContent.startsWith('Read ')",timeout=30000)
    mp.click('#parsedForm button');mp.wait_for_selector('#mList .card');mp.locator('#mResults').scroll_into_view_if_needed();mp.screenshot(path=SH+'mobile.png');print('overflow',mp.evaluate('document.documentElement.scrollWidth'))
    print('ERRORS',E)
