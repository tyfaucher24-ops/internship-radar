"""V13.4 Autopilot calendar check. Usage: python3 ops/test_v134.py [BASE] [--shots]"""
import sys,json
from playwright.sync_api import sync_playwright
U=sys.argv[1] if len(sys.argv)>1 and not sys.argv[1].startswith('--') else 'https://tyfaucher24-ops.github.io/internship-radar/'
SHOTS='--shots' in sys.argv
AXE='/tmp/lh/node_modules/axe-core/axe.min.js'
prof=dict(json.load(open('test/personas.json'))['ty_queens'],v=6,savedAt='2026-10-22T12:00:00Z')
fail=[]
def ok(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fail.append(m)
TRUNC="""()=>{const o=[];document.querySelectorAll('#apCal *').forEach(e=>{const s=getComputedStyle(e);if(!e.offsetParent&&s.position!=='fixed')return;
 if(s.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1)o.push(e.className);
 if((s.overflowX==='hidden'||s.overflow==='hidden')&&e.scrollWidth>e.clientWidth+1&&e.children.length===0)o.push('clip:'+e.className+':'+e.textContent.slice(0,30))});
 const r=document.getElementById('apCal').getBoundingClientRect();if(r.right>innerWidth+1)o.push('overflow-x');return o}"""
with sync_playwright() as p:
    b=p.chromium.launch()
    for theme in ['dark','light']:
      for w in [1440,1280,390]:
        c=b.new_context(viewport={'width':w,'height':1000 if w>400 else 844},bypass_csp=True);pg=c.new_page();errs=[]
        pg.on('console',lambda m:m.type=='error' and errs.append(m.text));pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.add_init_script("localStorage.setItem('idr_introSeen','true')")
        pg.goto(U);pg.evaluate("p=>{localStorage.setItem('idr_profile',JSON.stringify(p))}",prof);pg.reload()
        pg.wait_for_function("typeof D!=='undefined'&&D.length>100",timeout=60000)
        # seed: 5 real open listings with a stated deadline go into the tracker (Saved) and 2 onto Autopilot
        picks=pg.evaluate("""()=>{const t0=new Date();t0.setHours(0,0,0,0);const xs=D.filter(x=>x.deadline&&x.st!=='closed'&&new Date(x.deadline+'T00:00')>=t0).sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,5);
          xs.forEach(x=>track(x.id,'Saved'));xs.slice(0,2).forEach(x=>Autopilot.add(x.id));return xs.map(x=>({id:x.id,dl:x.deadline.slice(0,10),co:x.company}))}""")
        pg.goto(U+'#autopilot');pg.wait_for_selector('#apCal .apc-d',timeout=20000);pg.wait_for_timeout(600)
        if theme=='light':pg.evaluate("document.getElementById('thTog').click()");pg.wait_for_timeout(300)
        tag=f'{w}-{theme}'
        ok(pg.evaluate("document.documentElement.classList.contains('dark')")==(theme=='dark'),f'{tag} theme')
        ok(not pg.query_selector('#apDue'),f'{tag} Due now list removed')
        # deadline dots on the right dates for the 5 saved listings
        for x in picks:
            pg.evaluate("k=>{const d=new Date(k+'T00:00');document.querySelector('#apcToday').click()}",x['dl'])
            # navigate months until visible
            for _ in range(14):
                if pg.query_selector(f'.apc-d[data-day="{x["dl"]}"]:not(.out)'):break
                pg.click('#apcNext')
            el=pg.query_selector(f'.apc-d[data-day="{x["dl"]}"]:not(.out)')
            ok(bool(el and el.query_selector('.cd-deadline')),f'{tag} deadline dot {x["co"]} {x["dl"]}')
        pg.click('#apcToday')
        # select 3 days, verify panel matches computed tasks
        days=pg.evaluate("()=>{const m={};APCal.tasks().forEach(t=>{const k=t.at.getFullYear()+'-'+String(t.at.getMonth()+1).padStart(2,'0')+'-'+String(t.at.getDate()).padStart(2,'0');m[k]=(m[k]||0)+1});return m}")
        sel=sorted(days)[:2]+[None]
        for k in sel:
            if k is None:
                # an empty day in the visible month
                k=pg.evaluate("m=>[...document.querySelectorAll('.apc-d:not(.out)')].map(e=>e.dataset.day).find(d=>!m[d])",days)
            for _ in range(14):
                if pg.query_selector(f'.apc-d[data-day="{k}"]'):break
                pg.click('#apcNext')
            h0=pg.evaluate("document.getElementById('apCal').offsetHeight")
            pg.click(f'.apc-d[data-day="{k}"]');pg.wait_for_timeout(250)
            n=len(pg.query_selector_all('#apcSelL .apc-t'))
            ok(n==days.get(k,0),f'{tag} day {k}: {n} cards, expected {days.get(k,0)}')
            if not days.get(k):ok(bool(pg.query_selector('#apcSelL .apc-empty [data-go=db]')),f'{tag} empty state + Find internships')
            ok(abs(pg.evaluate("document.getElementById('apCal').offsetHeight")-h0)<1,f'{tag} no layout shift on day change')
        pg.click('#apcToday');pg.wait_for_timeout(1500)
        hs=pg.eval_on_selector_all('#apcSelL .apc-apply','e=>e.map(a=>a.href)')
        ok(bool(hs) and all(h.startswith('http') and '#' not in h[-1:] for h in hs),f'{tag} Apply buttons open job-specific links {len(hs)}')
        up=pg.evaluate("()=>{const t0=new Date();t0.setHours(0,0,0,0);const t7=new Date(t0);t7.setDate(t7.getDate()+7);return APCal.tasks().filter(t=>t.at>=t0&&t.at<t7&&!t.done).length}")
        n=len(pg.query_selector_all('#apcUp .apc-ui'))
        ok(n==up,f'{tag} upcoming 7 days {n}=={up}')
        if not up: ok(bool(pg.query_selector('#apcUp .apc-none')),f'{tag} upcoming empty state')
        # keyboard
        pg.focus('.apc-d.sel');pg.keyboard.press('ArrowRight');pg.keyboard.press('Enter');pg.wait_for_timeout(150)
        ok(pg.evaluate("document.activeElement.classList.contains('sel')"),f'{tag} arrow keys move selection')
        pg.click('#apcToday')
        # month nav no layout shift
        h0=pg.evaluate("document.getElementById('apCal').offsetHeight");pg.click('#apcNext');pg.wait_for_timeout(150);h1=pg.evaluate("document.getElementById('apCal').offsetHeight");pg.click('#apcPrev')
        ok(abs(h1-h0)<1,f'{tag} no layout shift on month change')
        if w==1440 and theme=='dark':
            # add, complete, delete a user task
            pg.click('#apcAdd');pg.fill('#apcForm [name=title]','V13.4 QA task');pg.select_option('#apcForm [name=type]','follow');pg.click('#apcForm [type=submit]');pg.wait_for_timeout(300)
            ok(pg.locator('#apcSelL .apc-t',has_text='V13.4 QA task').count()==1,'add task')
            pg.locator('#apcSelL .apc-t',has_text='V13.4 QA task').locator('[data-apcdone]').click();pg.wait_for_timeout(200)
            ok(pg.locator('#apcSelL .apc-t.done',has_text='V13.4 QA task').count()==1,'complete task')
            pg.locator('#apcSelL .apc-t',has_text='V13.4 QA task').locator('[data-apcdel]').click();pg.wait_for_timeout(200)
            ok(pg.locator('#apcSelL .apc-t',has_text='V13.4 QA task').count()==0,'delete task')
            # .ics export twice: parse, check fields, stable UIDs
            from icalendar import Calendar
            outs=[]
            for i in range(2):
                with pg.expect_download() as d: pg.click('#apcIcs')
                path=d.value.path();outs.append(open(path,'rb').read())
            open('ops/screens/v13.4-export.ics','wb').write(outs[0])
            cals=[Calendar.from_ical(o) for o in outs];evs=[[e for e in c.walk('VEVENT')] for c in cals]
            u0=[str(e['UID']) for e in evs[0]];u1=[str(e['UID']) for e in evs[1]]
            ok(len(u0)>0 and u0==u1 and len(set(u0))==len(u0),f'ics: {len(u0)} events, UIDs unique and identical across exports')
            dl=[e for e in evs[0] if str(e['SUMMARY']).startswith('Deadline')]
            ok(dl and all(any(str(a['TRIGGER'].to_ical(),'ascii')=='-P1D' for a in e.walk('VALARM')) for e in dl),f'ics: {len(dl)} deadlines with 1-day alarm')
            ok(all(e['DTSTART'].dt.isoformat()[:10] in [x['dl'] for x in picks] for e in dl),'ics: deadline dates match listings')
            ok(all('URL' in e and str(e['URL']).startswith('http') for e in dl),'ics: deadlines carry apply link')
            print('ics sample:',[(str(e['SUMMARY']),e['DTSTART'].dt.isoformat(),str(e.get('URL',''))[:60]) for e in evs[0][:4]])
        tr=pg.evaluate(TRUNC);ok(not tr,f'{tag} no truncation/clipping {tr[:5]}')
        if w in (1280,390):
            pg.add_script_tag(path=AXE)
            v=pg.evaluate("async()=>{const r=await axe.run(document.getElementById('t-autopilot'),{runOnly:['wcag2a','wcag2aa']});return r.violations.map(v=>v.id+':'+v.nodes.length+' '+v.nodes[0].target.join(' '))}")
            ok(not v,f'{tag} axe AA {v}')
        if SHOTS:
            # pick the first day with tasks for the shot, so the panel shows real cards
            pg.click('#apcToday');pg.wait_for_timeout(200)
            pg.screenshot(path=f'ops/screens/v13.4-autopilot-{w}-{theme}.png',full_page=True)
        if SHOTS and w!=390 or (SHOTS and w==390):
            for pgn in ['db','tracker','autopilot','profile']:
                pg.goto(U+'#'+pgn);pg.wait_for_timeout(700)
                pg.screenshot(path=f'ops/screens/v13.4-header-{pgn}-{w}-{theme}.png',clip={'x':0,'y':0,'width':w,'height':80})
            ok(pg.evaluate("(()=>{const b=document.querySelector('.brand .wm b');return b&&b.textContent==='Index'&&getComputedStyle(b).display!=='none'&&b.getBoundingClientRect().width>0})()"),f'{tag} wordmark visible')
            ok(pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{tag} header fits, no horizontal overflow')
        ok(not errs,f'{tag} console errors {errs[:3]}')
        c.close()
    b.close()
print('FAILURES:',len(fail));sys.exit(1 if fail else 0)
