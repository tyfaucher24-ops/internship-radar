"""V13.1 acceptance tests (Playwright). Usage: python3 test_v131.py [BASE]
Resumes: the QA PDF (qa-v13/Jordan_Ellis_Resume.pdf, or test/fixtures copy) plus two labeled TEST FIXTURE resumes
from test/resumes/files (CS junior, sparse freshman). Saves ops/screens/v13.1-*.png."""
import json,sys,os
from playwright.sync_api import sync_playwright
B=next((a for a in sys.argv[1:] if a.startswith('http')),'http://localhost:8800/');R=[];S='ops/screens/'
def ok(n,c,d=''):R.append(bool(c));print(('PASS' if c else 'FAIL'),'|',n,'|',json.dumps(d)[:300])
TY=dict(json.load(open('test/personas.json'))['ty_queens'],v=6,savedAt='2026-10-22T12:00:00Z')
JPDF=next(p for p in ('qa-v13/Jordan_Ellis_Resume.pdf','/workspace/qa-v13/Jordan_Ellis_Resume.pdf','test/fixtures/Jordan_Ellis_Resume.pdf') if os.path.exists(p))
RES=[('jordan',JPDF,dict(name='Jordan M. Ellis',email='jordan.ellis@queens.edu',gradYear='2029',d1=True,nexp=4,skill='financial modeling')),
     ('cs_junior','test/resumes/files/TEST_03-state-school-cs.docx',dict(email='kevin.tran@example.com',d1=False,expTitle='Software Engineering Intern',skill='python')),
     ('freshman','test/resumes/files/TEST_08-freshman-nursing.txt',dict(email='aisha.khan@example.com',gradYear='2030',d1=False,nexp=1))]
DRAFT="JSON.parse(localStorage.getItem('idr_profileDraft')||'{}')"
PROG="[...document.querySelectorAll('#intro .prog span')].map(s=>[s.className,getComputedStyle(s,'::after').backgroundColor,getComputedStyle(s,'::after').transform])"
def onboard(b,key,f,exp):
    cx=b.new_context(viewport={'width':1440,'height':900});pg=cx.new_page();E=[];pg.on('pageerror',lambda e:E.append(str(e)))
    pg.goto(B+'?intro=1');pg.evaluate("localStorage.clear()");pg.goto(B+'?intro=1');pg.wait_for_timeout(2500);pg.click('#goBuild');pg.wait_for_timeout(1500)
    if key=='jordan':pg.screenshot(path=S+'v13.1-onboard-1.png')
    pg.set_input_files('#obFile',f);pg.wait_for_timeout(5000);d=pg.evaluate(DRAFT)
    for k in ('name','email','gradYear'):
        if k in exp:ok(f'{key}: {k}',d.get(k)==exp[k],d.get(k))
    ok(f'{key}: D1 chip only when the resume says so',bool(d.get('d1Athlete'))==exp['d1'],d.get('d1Athlete'))
    X=d.get('experience') or []
    if 'nexp' in exp:ok(f'{key}: {exp["nexp"]} experience cards',len(X)==exp['nexp'],[(e.get('title'),e.get('org')) for e in X])
    if 'expTitle' in exp:ok(f'{key}: experience title',any(e.get('title')==exp['expTitle'] for e in X),[e.get('title') for e in X])
    ok(f'{key}: no "()" titles, bullets separate',all('()' not in (e.get('title') or '') and all('•' not in x for x in e.get('bullets') or []) for e in X))
    sk=d.get('skills') or [];ok(f'{key}: skills deduped, no fragments',len(set(sk))==len(sk) and not any('(' in s or ')' in s for s in sk),sk)
    if 'skill' in exp:ok(f'{key}: skill from resume',exp['skill'] in sk,sk)
    pg.click('[data-ob=next]');pg.wait_for_timeout(1200)
    pr=pg.evaluate(PROG);ok(f'{key}: progress bar green for done+current',all(c[1]=='rgb(34, 197, 94)' for c in pr) and 'matrix(1' in ''.join(c[2] for c in pr if 'cur' in c[0] or 'done' in c[0]),pr)
    if key=='jordan':
        pg.screenshot(path=S+'v13.1-onboard-2.png')
        ok('grad year prefilled 2029',pg.input_value('#obGY')=='2029')
        pg.fill('#obGY','2030');pg.wait_for_timeout(200);ok('grad year 2030 -> Freshman',pg.input_value('#obCY')=='Freshman',pg.input_value('#obCY'))
        pg.select_option('#obCY','Sophomore');pg.wait_for_timeout(200);ok('Sophomore -> 2029',pg.input_value('#obGY')=='2029',pg.input_value('#obGY'))
        pg.fill('#obGY','29');pg.click('[data-ob=next]');pg.wait_for_timeout(500);ok('bad grad year blocked',pg.is_visible('#obErr'))
        pg.fill('#obGY','2029');pg.dispatch_event('#obGY','input')
    if not pg.input_value('#obGY'):pg.fill('#obGY','2028');pg.dispatch_event('#obGY','input')
    if not pg.input_value('#obSchool'):pg.fill('#obSchool','Arizona State University')
    if not pg.input_value('#obMajor'):pg.fill('#obMajor','Computer Science')
    pg.click('[data-ob=next]');pg.wait_for_timeout(1200)
    if key=='jordan':
        ok('#8 step 3 prefilled from major',len(pg.evaluate(DRAFT).get('interests') or pg.evaluate(DRAFT).get('industries') or [])>0)
        pg.fill('#obIntIn','risk');pg.wait_for_timeout(300);pg.press('#obIntIn','Enter');pg.fill('#obLocIn','Charlotte, NC');pg.press('#obLocIn','Enter');pg.wait_for_timeout(200)
        pg.fill('#obLocIn','Charlotte, NC');pg.press('#obLocIn','Enter');pg.wait_for_timeout(200);ok('duplicate location blocked',bool(pg.inner_text('#obLocH').strip()),pg.inner_text('#obLocH'))
        pg.screenshot(path=S+'v13.1-onboard-3.png');d=pg.evaluate(DRAFT)
        p2=pg.context.new_page();p2.goto(B);p2.wait_for_timeout(2000);d2=p2.evaluate(DRAFT);p2.close()
        ok('typed chips persist after reload (fresh page load)',d2.get('locations')==d.get('locations') and 'Charlotte, NC' in (d2.get('locations') or []) and d2.get('interests')==d.get('interests'),[d2.get('interests'),d2.get('locations')])
    pg.click('[data-ob=next]');pg.wait_for_timeout(1200)
    if key=='jordan':
        ok('experience cards rendered',pg.locator('.xcard').count()==4,pg.locator('.xcard').count())
        ok('"check this" hint on uncertain card',pg.locator('.xcard .chk').count()>=1)
        pg.evaluate("document.querySelector('.obcard').scrollTop=0");pg.screenshot(path=S+'v13.1-onboard-4.png')
        r0=pg.evaluate("document.querySelector('#obAddX').getBoundingClientRect().left")
        pg.click('.xcard >> nth=3 >> [data-xc=edit]');pg.wait_for_timeout(300);pg.screenshot(path=S+'v13.1-experience-edit.png')
        pg.click('#obAddX');pg.wait_for_timeout(300);pg.fill('.xcard.ed >> nth=-1 >> [data-f=title]','Teller');pg.fill('.xcard.ed >> nth=-1 >> [data-f=org]','Truist');pg.click('.xcard.ed >> nth=-1 >> [data-xc=save]');pg.wait_for_timeout(300)
        ok('+ Add experience saves a card',any(e.get('org')=='Truist' for e in pg.evaluate(DRAFT)['experience']))
        n=pg.locator('.xcard').count();pg.click('.xcard >> nth=-1 >> [data-xc=del]');pg.wait_for_timeout(300);ok('Delete removes a card',pg.locator('.xcard').count()==n-1)
        pg.screenshot(path=S+'v13.1-experience-cards.png')
    pg.click('[data-ob=next]');pg.wait_for_timeout(4000)
    if key=='jordan':pg.screenshot(path=S+'v13.1-onboard-5.png')
    ok(f'{key}: profile saved',pg.evaluate("!!JSON.parse(localStorage.getItem('idr_profile')||'{}').savedAt"))
    ok(f'{key}: no page errors',not E,E);cx.close()
def seed(b,w,h,eng):
    pg=b.new_page(viewport={'width':w,'height':h});E=[];pg.on('pageerror',lambda e:E.append(str(e)))
    pg.goto(B);pg.evaluate("p=>{localStorage.clear();localStorage.setItem('idr_profile',JSON.stringify(p))}",TY);pg.reload();pg.click('#goFind');pg.wait_for_selector('.card .mbadge',timeout=60000);pg.wait_for_timeout(600)
    return pg,E
with sync_playwright() as p:
    for eng in ('chromium','firefox','webkit'):
        b=getattr(p,eng).launch()
        if eng=='chromium':
            for k,f,e in RES:onboard(b,k,f,e)
        for w,h in ((1440,900),(1280,800),(390,844)):
            pg,E=seed(b,w,h,eng);t=f'{eng} {w}'
            if eng=='chromium' and w==1440:
                pf=pg.evaluate("(()=>{const n=performance.getEntriesByType('navigation')[0];return {dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd)}})()")
                ok('perf: DOMContentLoaded < 3000ms, load < 6000ms',pf['dcl']<3000 and pf['load']<6000,pf)
                cls=pg.evaluate("new Promise(r=>{let c=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)c+=e.value}).observe({type:'layout-shift',buffered:true});setTimeout(()=>r(c),1500)})")
                ok('perf: CLS < 0.1',cls<0.1,cls)
                lt=pg.evaluate("new Promise(r=>{let m=0;new PerformanceObserver(l=>{for(const e of l.getEntries())m=Math.max(m,e.duration)}).observe({type:'longtask'});const t0=performance.now();let i=0;const s=()=>{window.scrollBy(0,600);if(++i<15)requestAnimationFrame(s);else setTimeout(()=>r(Math.round(m)),400)};s()})")
                ok('perf: no long task > 200ms while scrolling',lt<200,lt)
                pg.screenshot(path=S+'v13.1-home.png')
                c=pg.locator('.card .mbadge').all_inner_texts()[:20];ok('#9 top grades not all identical',len(set(c))>=3,c)
            for i in range(3):pg.locator('.card .btn-save:not(.on)').first.click();pg.wait_for_timeout(250)
            pg.goto('about:blank');pg.goto(B+'#tracker');pg.wait_for_timeout(2500)
            ok(f'{t}: header nav on one line, bell inside viewport',pg.evaluate("(()=>{const n=document.querySelector('#hdr .nav'),a=[...n.querySelectorAll(':scope>a')],bl=document.getElementById('apBell');const tops=new Set(a.map(x=>Math.round(x.getBoundingClientRect().top)));const br=document.querySelector('#hdr .brand').getBoundingClientRect().right;return tops.size===1&&bl.getBoundingClientRect().right<=innerWidth&&a[0].getBoundingClientRect().left>=br&&document.documentElement.scrollWidth<=innerWidth})()"))
            ok(f'{t}: bell says email reminders coming soon','coming soon' in (pg.get_attribute('#apBell','title') or '').lower())
            clip=pg.evaluate("[...document.querySelectorAll('#tTable thead th')].filter(t=>getComputedStyle(t).display!=='none'&&t.scrollWidth>t.clientWidth+1).map(t=>t.textContent.trim())")
            if w>=1280:
                ok(f'{t}: no clipped th',not clip,clip);ok(f'{t}: no tucked-away columns',not pg.is_visible('#tHid'))
                n0=pg.locator('#tTable thead th').count();pg.click('text=Customize');pg.wait_for_timeout(300);pg.locator('#tCols input[value=notes]').click(force=True);pg.wait_for_timeout(300)
                ok(f'{t}: Notes toggle changes th by 1',pg.locator('#tTable thead th').count()==n0-1,[n0,pg.locator('#tTable thead th').count()])
                pg.locator('#tCols input[value=notes]').click(force=True);pg.keyboard.press('Escape')
                if eng=='chromium' and w==1280:pg.screenshot(path=S+'v13.1-tracker-1280.png')
            else:
                ok(f'{t}: tracker rows are cards, nothing clipped',pg.evaluate("(()=>{const r=[...document.querySelectorAll('#tTable tbody tr')];return r.length>0&&r.every(x=>getComputedStyle(x).display==='grid'&&x.getBoundingClientRect().right<=innerWidth)&&[...document.querySelectorAll('#tTable tbody td.c-company .ta')].every(t=>t.scrollWidth<=t.clientWidth+1)})()"))
                if eng=='chromium':pg.screenshot(path=S+'v13.1-tracker-390.png')
            ok(f'{t}: no page errors',not E,E);pg.close()
        b.close()
print(f'{sum(R)}/{len(R)} passed');sys.exit(0 if all(R) else 1)
