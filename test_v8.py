# V8 QA: pass/fail list for inputs, dropdowns, filters, sorts, buttons, links; beginner + advanced walkthroughs; h-scroll; timings; console errors.
import json,sys,time;from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/';RES=[];ERR=[];SS='screenshots/'
def ok(name,cond,info=''):RES.append(('PASS' if cond else 'FAIL',name,str(info)[:160]))
def safe(name,fn):
  try:fn()
  except Exception as e:ok(name,False,'exception: '+str(e).split('\n')[0])
with sync_playwright() as p:
  b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  ctx=b.new_context(bypass_csp=True,viewport={'width':1440,'height':900},permissions=['clipboard-read','clipboard-write'])
  pg=ctx.new_page();pg.on('pageerror',lambda e:ERR.append(str(e)));pg.on('console',lambda m:m.type=='error' and ERR.append(m.text))
  W=lambda:pg.wait_for_timeout(250);pg.set_default_timeout(6000)
  # ---------- BEGINNER (no profile) ----------
  pg.goto(B);pg.wait_for_timeout(1500)
  ok('Intro: no "Skip intro" button',pg.locator('#skipIntro').count()==0)
  ok('Intro: Details button present',pg.is_visible('#detailsBtn'))
  pg.click('#goFind');pg.wait_for_function('window._interactiveAt');pg.wait_for_timeout(800)
  ok('Beginner: first-visit tip shown',pg.is_visible('#firstTip'),pg.inner_text('#firstTip') if pg.locator('#firstTip').count() else '')
  pg.screenshot(path=SS+'v8-beginner-tip.png')
  ok('Default sort is Closing soonest (no profile)',pg.evaluate("document.getElementById('sort').value")=='deadline')
  def terms():
    pg.click('#ftTerms');W();ok('Beginner tip: "What do the terms mean?" opens glossary',pg.locator('#modal .glossary dt').count()>=5);pg.keyboard.press('Escape');W()
  safe('glossary',terms)
  pg.click('#ftX');W();ok('Beginner tip: dismiss works',pg.locator('#firstTip').count()==0)
  pg.goto(B+'#find');pg.wait_for_function('window._interactiveAt');pg.wait_for_timeout(500);ok('Beginner tip: stays dismissed after reload',pg.locator('#firstTip').count()==0)
  total=int(pg.inner_text('#count').split()[0].replace(',',''))
  # filters
  for k,q in [('cat','fin'),('cy','soph'),('dlw','month')]:
    def f(k=k,q=q):
      pg.click(f'[data-pill={k}]');W();ok(f'Filter {k}: panel has a search bar',pg.locator('.fpanel .cb-search').count()==1)
      t0=time.time();pg.keyboard.type(q);ms=pg.evaluate('Combo.lastSearchMs');ok(f'Filter {k}: search "{q}" filters options (<50ms)',pg.locator('.fpanel .cb-o').count()>0 and ms<50,f'{ms:.1f}ms')
      pg.keyboard.press('Enter');W();lab=pg.inner_text('[data-apply]');n=int(lab.split()[-1].replace(',',''))
      pg.click('[data-apply]');pg.wait_for_timeout(300);c=int(pg.inner_text('#count').split()[0].replace(',',''));fm=pg.evaluate('window._lastFilterMs')
      ok(f'Filter {k}: Apply shows the promised count, live counts on options',n==c and pg.locator('#chips .chip').count()>=1,f'{n} vs {c}');ok(f'Filter {k}: applies in <300ms',fm<300,f'{fm:.1f}ms')
      pg.click('#chips .clear');W();ok(f'Filter {k}: Clear all restores',int(pg.inner_text('#count').split()[0].replace(',',''))==total)
    safe(f'filter {k}',f)
  def loc():
    pg.click('[data-pill=loc]');W();first=pg.locator('.fpanel .cb-o').first.inner_text();ok('Location: quick picks start with Remote and metros',first.startswith('Remote'),first.replace('\n',' '))
    pg.keyboard.type('texas');W();t=pg.locator('.fpanel .cb-o').first.inner_text();ok('Location: search a state ("texas")','Anywhere in Texas' in t,t.replace('\n',' '))
    pg.keyboard.press('Enter');pg.fill('.fpanel .cb-search','austin');W();t=pg.locator('.fpanel .cb-o').first.inner_text();ok('Location: search a city ("austin")','Austin' in t,t.replace('\n',' '));pg.keyboard.press('Enter')
    pg.screenshot(path=SS+'v8-filter-search.png')
    pg.click('[data-apply]');pg.wait_for_timeout(300);ok('Location: multi-select applies, chips removable',pg.locator('#chips .chip').count()==2,pg.inner_text('#chips').replace('\n',' '))
    pg.locator('#chips .chip').first.click();W();ok('Location: removing one chip keeps the other',pg.locator('#chips .chip').count()==1)
    pg.click('[data-pill=loc]');W();pg.click('#nearCb .cb-field');pg.keyboard.type('chicago');W();pg.keyboard.press('Enter');W();pg.click('[data-apply]');pg.wait_for_timeout(300)
    ok('Location: near-a-city + radius works',any('Within' in c for c in pg.locator('#chips .chip').all_inner_texts()),pg.inner_text('#chips').replace('\n',' '))
    pg.click('[data-pill=loc]');W();pg.click('.fpanel [data-clear]');W();ok('Location: Clear in panel',pg.locator('#chips .chip').count()==0)
  safe('loc',loc)
  def more():
    pg.click('[data-pill=more]');W();ok('More filters: has company size, sponsorship, pay, date posted, season',all(pg.locator(f'.mf-l[data-k={k}]').count() for k in ['size','spons','paid','posted','term']))
    pg.locator('.mf-l[data-k=paid] .cb-search').fill('paid');W();pg.locator('.mf-l[data-k=paid] .cb-o').first.click();W();n=int(pg.inner_text('#mfN').replace(',',''))
    pg.click('#mfDone');pg.wait_for_timeout(300);c=int(pg.inner_text('#count').split()[0].replace(',',''));ok('More filters: Show N matches result',n==c,f'{n} vs {c}')
    pg.click('#chips .clear');W()
  safe('more',more)
  ok('Pills wrap, no horizontal scroll on Find (1440)',pg.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  # sorts
  for v in ['deadline','new','az']:
    pg.select_option('#sort',v);pg.wait_for_timeout(200);ok(f'Sort "{v}" applies',pg.evaluate("document.getElementById('sort').value")==v and pg.locator('#vl .card').count()>0)
  # search syntax
  for q,desc in [('company:"jp morgan"','company: syntax'),('location:nyc intern','location: alias'),('"software engineer"','"exact phrase"')]:
    pg.fill('#q',q);pg.wait_for_timeout(500);c=int(pg.inner_text('#count').split()[0].replace(',',''));ok(f'Search syntax {desc}: {q}',0<c<total,c)
  pg.fill('#q','');pg.wait_for_timeout(400)
  # drawer + glossary + tooltip
  def drawer():
    pg.fill('#q','co-op');pg.wait_for_timeout(500);pg.locator('#vl .card').first.click();pg.wait_for_selector('#dGloss',timeout=8000);pg.wait_for_timeout(600)
    ok('Drawer: glossary term button for Co-op',pg.locator('#dGloss .gterm').count()>0,pg.inner_text('#dGloss'))
    pg.locator('#dGloss .gterm').first.hover();W();ok('Tooltip "?" shows plain-English text',pg.is_visible('#tip') and len(pg.inner_text('#tip'))>40,pg.inner_text('#tip')[:80])
    pg.keyboard.press('Escape');W();ok('Esc closes drawer',pg.is_hidden('#drawer'));pg.fill('#q','');pg.wait_for_timeout(400)
  safe('drawer',drawer)
  pg.locator('#vl [data-act=save]').first.click();W();ok('Save button adds to tracker',pg.evaluate('T.all().length')==1)
  # profile (beginner): helper text, tooltips, every dropdown
  pg.click('[data-t=profile]');pg.wait_for_timeout(800);pg.screenshot(path=SS+'v8-profile-empty.png')
  ok('Profile: helper text under every field',pg.locator('#pf .pf-f .pf-help').count()>=10,pg.locator('#pf .pf-f .pf-help').count())
  pg.hover('[data-tip=classyear]');W();ok('Profile: class year "?" tooltip',pg.is_visible('#tip'));pg.mouse.move(5,5)
  pg.hover('#cbAuth >> xpath=.. >> [data-tip]') if False else None
  def combo(host,typ,expect,enter=True,name=None):
    pg.click(f'#{host} .cb-field');W();ok(f'Dropdown {name or host}: opens with search bar',pg.locator(f'#{host} .cb-search').is_visible())
    pg.keyboard.type(typ);W();ms=pg.evaluate('Combo.lastSearchMs');t=pg.locator(f'#{host} .cb-o').first.inner_text() if pg.locator(f'#{host} .cb-o').count() else ''
    ok(f'Dropdown {name or host}: "{typ}" finds {expect} (<50ms)',expect.lower() in t.lower() and ms<50,f'{t.splitlines()[0] if t else ""} · {ms:.1f}ms')
    if enter:pg.keyboard.press('Enter');W()
  pg.wait_for_timeout(800)
  combo('cbSchool','ohio st','Ohio State',name='School')
  pg.screenshot(path=SS+'v8-dropdown-search.png') if False else None
  ok('Dropdown School: value set',pg.inner_text('#cbSchool .cb-val').startswith('Ohio State'),pg.inner_text('#cbSchool .cb-val'))
  pg.click('#cbMajor .cb-field');W();pg.keyboard.type('comp sci');W();pg.screenshot(path=SS+'v8-dropdown-search.png');ok('Dropdown Major: "comp sci" finds Computer Science',pg.locator('#cbMajor .cb-o').first.inner_text().startswith('Computer Science'));pg.keyboard.press('Enter');W()
  combo('cbMinor','stat','Statistics',name='Minor')
  pg.focus('#cbYear .cb-field');pg.keyboard.press('j');W();ok('Dropdown Class year: type-to-jump ("j" -> Junior)',pg.locator('#cbYear .cb-o.act').inner_text().startswith('Junior'));pg.keyboard.press('Enter');W()
  combo('cbGradM','may','May',name='Grad month');combo('cbGradY','2028','2028',name='Grad year')
  pg.fill('#gpaIn','3.62');W();ok('GPA: exact number accepted (V9: numeric input)',pg.evaluate("document.getElementById('gpaMsg').hidden"));pg.fill('#gpaIn','5');W();ok('GPA: invalid value shows a message',pg.is_visible('#gpaMsg'));pg.fill('#gpaIn','3.62');W()
  combo('cbAuth','citizen','Citizen / green card',name='Work authorization')
  pg.click('#cbInd .cb-field');W();pg.keyboard.type('fin');pg.keyboard.press('Enter');pg.fill('#cbInd .cb-search','data');W();pg.keyboard.press('Enter');pg.keyboard.press('Escape');W()
  ok('Dropdown Interests: multi-select chips inside field',pg.locator('#cbInd .cb-chip').count()==2)
  pg.click('#cbLoc .cb-field');W();pg.keyboard.type('austin');pg.keyboard.press('Enter');pg.fill('#cbLoc .cb-search','tx');W();t=pg.locator('#cbLoc .cb-o').first.inner_text();ok('Dropdown Locations: state search "tx" finds Texas','Anywhere in Texas' in t,t.split('\n')[0]);pg.keyboard.press('Enter');pg.keyboard.press('Escape');W()
  pg.click('#cbSkills .cb-field');W();pg.keyboard.type('pyth');pg.keyboard.press('Enter');pg.fill('#cbSkills .cb-search','excel');pg.keyboard.press('Enter');pg.fill('#cbSkills .cb-search','Kotlin Multiplatform');W();pg.locator('#cbSkills .cb-other').click();pg.keyboard.press('Escape');W()
  ok('Dropdown Skills: chips + custom skill',pg.locator('#cbSkills .cb-chip').count()==3,pg.inner_text('#cbSkills .cb-val').replace('\n',' '))
  pg.click('#pf [name=remoteOK] + span');ok('Toggle Remote OK',pg.is_checked('#pf [name=remoteOK]'))
  pg.click('#addExp');W();ok('Experience: add opens an expanded entry',pg.locator('.pf-exp.open').count()==1)
  pg.fill('.pf-exp.open [data-e=title]','Cashier');pg.fill('.pf-exp.open [data-e=org]','Kroger')
  pg.click('.pf-exp.open [data-c=kind] .cb-field');pg.keyboard.type('job');pg.keyboard.press('Enter');pg.click('.pf-exp.open [data-c=start] .cb-field');pg.keyboard.type('jun 2025');W();pg.keyboard.press('Enter')
  ta=pg.locator('.pf-exp.open textarea');h0=ta.evaluate('e=>e.offsetHeight');ta.fill('Handled 200 customers a day\nTrained 3 new hires\nCounted the register\nOpened the store');ta.dispatch_event('input');W();h1=ta.evaluate('e=>e.offsetHeight')
  ok('Experience: bullets textarea auto-grows',h1>h0,f'{h0}->{h1}')
  pg.click('.pf-exp.open .pf-expfoot [data-tog]');W();ok('Experience: collapses to a compact summary',pg.locator('.pf-exp.open').count()==0 and 'Cashier' in pg.inner_text('#expList'),pg.inner_text('#expList').replace('\n',' ')[:80])
  for w in [1280,1440,1920]:
    pg.set_viewport_size({'width':w,'height':900 if w<1920 else 1080});pg.wait_for_timeout(300)
    cols=pg.evaluate("[...document.querySelectorAll('.pf-col')].map(c=>Math.round(c.getBoundingClientRect().top))")
    ok(f'Profile {w}: 3 buckets side by side',len(set(cols))==1,cols);ok(f'Profile {w}: no horizontal scroll',pg.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    ok(f'Profile {w}: columns scroll on their own, minimal page scroll',pg.evaluate("[...document.querySelectorAll('.pf-scroll')].every(s=>getComputedStyle(s).overflowY==='auto')") and pg.evaluate("document.querySelector('.pf3').getBoundingClientRect().bottom")<=pg.evaluate('innerHeight')+40,pg.evaluate("Math.round(document.querySelector('.pf3').getBoundingClientRect().bottom)"))
  pg.set_viewport_size({'width':1440,'height':900});pg.wait_for_timeout(300);pg.evaluate('scrollTo(0,0)');pg.screenshot(path=SS+'v8-profile-3buckets.png')
  pg.set_viewport_size({'width':1000,'height':900});pg.wait_for_timeout(300);ok('Profile tablet: 2 columns',len(set(pg.evaluate("[...document.querySelectorAll('.pf-col')].slice(0,2).map(c=>Math.round(c.getBoundingClientRect().top))")))==1 and pg.evaluate("document.querySelectorAll('.pf-col')[2].getBoundingClientRect().top>document.querySelectorAll('.pf-col')[0].getBoundingClientRect().bottom-5"))
  pg.set_viewport_size({'width':1440,'height':900})
  pg.click('#pfSave');pg.wait_for_selector('#fbNudge:not([hidden])',timeout=20000);pg.wait_for_timeout(400)
  ok('Save & Search: switches to Match % sort',pg.evaluate("document.getElementById('sort').value")=='match');ok('Save & Search: toast',('graded' in pg.inner_text('#toast')),pg.inner_text('#toast'))
  ok('Minimum match pill appears after save',pg.locator('[data-pill=minm]').count()==1)
  pg.click('[data-pill=minm]');W();pg.keyboard.type('75');pg.keyboard.press('Enter');pg.click('[data-apply]');pg.wait_for_timeout(300);ok('Minimum match 75% filter',all(int(t.split('%')[0])>=75 for t in pg.locator('#vl .mbadge').all_inner_texts()[:12]),pg.locator('#vl .mbadge').all_inner_texts()[:3]);pg.click('#chips .clear');W()
  pg.hover('[data-tip]') if pg.locator('#vl [data-tip]').count() else None
  pg.click('#fbNudge');pg.wait_for_function("document.querySelectorAll('#fbBody .fb-card').length>=5",timeout=30000);ok('Honest feedback link + page',True)
  # ---------- ADVANCED ----------
  pg.click('[data-t=find]') if pg.locator('[data-t=find]').count() else pg.goto(B+'#find');pg.wait_for_timeout(500)
  pg.locator('body').click(position={'x':5,'y':300});pg.keyboard.press('/');W();ok('Shortcut "/" focuses search',pg.evaluate("document.activeElement.id")=='q')
  pg.locator('#vl .card').nth(1).focus();n0=pg.evaluate('T.all().length');pg.keyboard.press('s');W();ok('Shortcut "s" saves focused card',pg.evaluate('T.all().length')==n0+1)
  pg.locator('#vl .card').nth(2).focus();pg.keyboard.press('?');W();ok('Shortcut "?" opens shortcut list',pg.locator('#modal table.kbd').count()>=1);pg.keyboard.press('Escape');W();ok('Esc closes dialog',pg.is_hidden('#modal'))
  pg.click('[data-pill=cat]');W();pg.keyboard.type('soft');pg.keyboard.press('Enter');pg.click('[data-apply]');pg.wait_for_timeout(300);c1=pg.inner_text('#count')
  pg.click('#shareBtn');W();url=pg.evaluate('navigator.clipboard.readText()');ok('Copy link: URL holds filters','cat=' in url,url[-60:])
  p2=ctx.new_page();p2.goto(url);p2.wait_for_function('window._interactiveAt');p2.wait_for_timeout(500);ok('Shared link reproduces the same results',p2.inner_text('#count')==c1,f'{p2.inner_text("#count")} vs {c1}');p2.close()
  pg.click('#presetBtn');W();pg.fill('#ppName','Software only');pg.keyboard.press('Enter');W();pg.click('#chips .clear');W()
  pg.click('#presetBtn');W();pg.click('.presetpop [data-ap="0"]');pg.wait_for_timeout(300);ok('Saved filter preset restores filters',pg.inner_text('#count')==c1,pg.inner_text('#count'))
  pg.click('#chips .clear');W()
  # tracker bulk
  pg.click('[data-t=tracker]');pg.wait_for_timeout(600);rows=pg.locator('#tTable tbody tr').count()
  pg.locator('#tTable [data-sel]').nth(0).check();pg.locator('#tTable [data-sel]').nth(1).check();W();ok('Tracker bulk: selecting rows shows bulk bar',pg.is_visible('#tBulk') and '2 selected' in pg.inner_text('#tBulk'))
  pg.click('#tbSt .cb-field');pg.keyboard.type('appl');pg.keyboard.press('Enter');pg.click('#tbApply');W();ok('Tracker bulk: change status',pg.evaluate("T.all().filter(t=>t.status==='Applied').length")==2)
  pg.click('#tTable .tsel-all');W();pg.click('#tbDel');W();ok('Tracker bulk: delete asks to confirm',pg.is_visible('#tdYes'));pg.click('#tdYes');W();ok('Tracker bulk: delete removes rows, empty state',pg.evaluate('T.all().length')==0 and pg.is_visible('#tEmpty'))
  ok('Tracker empty state: Find internships button',pg.is_visible('#tEmpty .btn'))
  # links
  for sel,want in [('.site-footer [data-go=about]','#about'),('.site-footer [data-go=contact]','#contact'),('.site-footer [data-go=privacy]','#privacy')]:
    pg.click(sel);W();ok(f'Link {want}',pg.evaluate('location.hash')==want)
  ok('Link "How it works" -> Details screen',pg.get_attribute('#howBtn','href').endswith('#details'))
  p3=ctx.new_page();p3.goto(B+'?intro=1#details');p3.wait_for_timeout(2500);ok('"How it works" opens the Details screen',p3.evaluate("!!document.getElementById('intro')&&document.getElementById('intro').classList.contains('details-on')"));p3.close()
  ok('Logo link returns to intro (href ./)',pg.get_attribute('a.logo,.brandlink,header a[href="./"]','href') in ('./','/'))
  # reset
  pg.click('[data-t=profile]');W();pg.click('#pfReset');pg.click('#rsYes');pg.wait_for_timeout(600);ok('Reset: back to Closing soonest, no grades',pg.evaluate("document.getElementById('sort').value")=='deadline' and pg.locator('.mbadge').count()==0)
  # h-scroll at all widths on every page
  for w,h,mob in [(1280,800,False),(1440,900,False),(1920,1080,False),(390,844,True)]:
    q=b.new_page(bypass_csp=True,viewport={'width':w,'height':h},is_mobile=mob,has_touch=mob);q.on('pageerror',lambda e:ERR.append(str(e)))
    for hsh in ['#find','#profile','#tracker','#feedback','#about']:
      q.goto(B+hsh);q.wait_for_function('window._interactiveAt');q.wait_for_timeout(400)
      sw=q.evaluate('document.documentElement.scrollWidth');ok(f'No horizontal scroll {w}px {hsh}',sw<=w,sw)
    if w==390:
      q.goto(B+'#find');q.wait_for_function('window._interactiveAt');q.click('[data-pill=loc]');q.wait_for_timeout(300);sw=q.evaluate('document.documentElement.scrollWidth');ok('No horizontal scroll 390px with a filter panel open',sw<=390,sw);q.screenshot(path=SS+'v8-filter-390.png')
      q.goto(B+'#profile');q.wait_for_function('window._interactiveAt');q.click('#cbSchool .cb-field');q.wait_for_timeout(300);sw=q.evaluate('document.documentElement.scrollWidth');ok('No horizontal scroll 390px with a dropdown open',sw<=390,sw);q.screenshot(path=SS+'v8-profile-390.png')
    q.close()
  ok('Zero console errors',len(ERR)==0,ERR[:3])
print(json.dumps({'pass':sum(r[0]=='PASS' for r in RES),'fail':sum(r[0]=='FAIL' for r in RES)}))
for r in RES:print(' | '.join(r))
