"""V13.2 detail panel: 5 graded listings, section order, per-section length limits, no overflow, light+dark, 1280 and 390."""
import sys,json
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/';S='ops/screens/'
TY=dict(json.load(open('test/personas.json'))['ty_queens'],v=6,savedAt='2026-10-22T12:00:00Z')
R=[];ok=lambda n,c,d='':R.append((n,bool(c),d))
OVER=open('test_v112.py').read().split('OVER="""')[1].split('"""')[0]
INFO="""()=>{const q=s=>document.querySelector('#dbody '+s);const ids=['dTitle','dAbout','fdBody','dGrade','dWhy','dImprove','dWays','dAct'];const pos=ids.map(i=>{const e=document.getElementById(i);return e&&!e.hidden&&(e.offsetParent||i==='fdBody')?[i,e.getBoundingClientRect().top+document.getElementById('dbody').scrollTop]:null}).filter(Boolean);
 const tx=s=>[...document.querySelectorAll(s)].map(e=>e.textContent.trim());return {pos,blurb:(q('#dAbout:not([hidden])')||{}).textContent||'',rows:tx('#dGrade .fbp-t'),why:tx('#dWhy li'),imp:tx('#dImprove li'),loc:q('.dhead .muted').textContent,pill:!!q('.dhead .dl'),posted:q('.dhead .drow').textContent,sel:document.querySelectorAll('#dbody .fbp-bd + p.muted').length,ways:tx('#wpPanel .wp-links li').length,draft:!!q('[data-wpdraft]'),stick:getComputedStyle(document.getElementById('dAct')).position}}"""
with sync_playwright() as p:
    b=p.chromium.launch()
    for w,theme in ((1280,'dark'),(390,'dark'),(1280,'light'),(390,'light')):
        pg=b.new_page(viewport={'width':w,'height':900 if w>600 else 844});E=[];pg.on('pageerror',lambda e:E.append(str(e)))
        pg.goto(B);pg.evaluate("([p,t])=>{localStorage.clear();localStorage.setItem('idr_profile',JSON.stringify(p));localStorage.setItem('ir_ui',JSON.stringify({theme:t}))}",[TY,theme]);pg.reload();pg.click('#goFind');pg.wait_for_selector('.card .mbadge',timeout=60000);pg.wait_for_timeout(800)
        ids=pg.evaluate("[...document.querySelectorAll('.card')].filter(c=>c.querySelector('.mbadge')&&!/Not enough/.test(c.textContent)).map(c=>c.dataset.id).concat([...MSCORE.keys()].filter(i=>{const r=MSCORE.get(i);return r&&r.pct!=null&&!r.ineligible})).filter((v,i,a)=>a.indexOf(v)===i).slice(0,5)")
        ok(f'{w} {theme}: 5 graded listings to check',len(ids)==5,len(ids))
        for k,i in enumerate(ids):
            pg.evaluate(f"openDrawer(BYID.get({json.dumps(i)}))");pg.wait_for_selector('#dAct a, #dAct .nolink',timeout=15000);pg.wait_for_selector('#wpPanel',timeout=8000);pg.wait_for_timeout(700)
            d=pg.evaluate(INFO);tag=f'{w} {theme} #{k+1}'
            order=[x[0] for x in d['pos']];tops=[x[1] for x in d['pos'] if x[0]!='dAct']
            ok(f'{tag}: sections in order',tops==sorted(tops) and order[-1]=='dAct' and pg.evaluate("!document.getElementById('dAct').nextElementSibling") and order[0]=='dTitle' and 'dGrade' in order and 'dWays' in order,order)
            ok(f'{tag}: header has clean location, closes pill, posted',' -,' not in d['loc'] and not d['loc'].rstrip().endswith('-') and d['pill'],d['loc'])
            ok(f'{tag}: short description <= 160 chars',len(d['blurb'])<=160,len(d['blurb']))
            ok(f'{tag}: grade rows <= 60 chars, 1-5 rows',0<len(d['rows'])<=5 and all(len(t)<=60 for t in d['rows']),d['rows'])
            ok(f'{tag}: why <= 2 bullets of <= 70',len(d['why'])<=2 and all(len(t)<=70 for t in d['why']),d['why'])
            ok(f'{tag}: improve <= 2 bullets of <= 70',len(d['imp'])<=2 and all(len(t)<=70 for t in d['imp']),d['imp'])
            ok(f'{tag}: no truncated words',not any(t.endswith(('…','...')) for t in d['rows']+d['why']+d['imp']+[d['blurb']]))
            ok(f'{tag}: selectivity folded into confidence (no separate paragraph)',d['sel']==0)
            ok(f'{tag}: ways in has links with reasons + Draft message',d['ways']>=1 and d['draft'],d['ways'])
            ok(f'{tag}: Apply row is sticky',d['stick']=='sticky')
            o=pg.evaluate("(()=>{const f="+OVER+";return f(document.getElementById('drawer'))})()");ok(f'{tag}: no clipped or spilling text',not o,o)
            if k==0:
                pg.screenshot(path=S+f'v13.2-detail-{w}-{theme}.png')
                pg.click('.fdmore');pg.wait_for_timeout(500);ok(f'{tag}: Show full description expands facts + text',pg.evaluate("document.getElementById('fdBody').classList.contains('open')&&document.querySelector('#fdBody #dFacts .fact')!==null"))
                pg.click('[data-wpdraft]');pg.wait_for_timeout(200);ok(f'{tag}: Draft message shows a note',len(pg.input_value('#wpDraft textarea'))>20)
                if w==1280 and theme=='dark':
                    pg.evaluate("document.getElementById('dGrade').scrollIntoView()");pg.wait_for_timeout(300);pg.screenshot(path=S+'v13.2-grade-card.png')
                    pg.evaluate("document.getElementById('dWays').scrollIntoView()");pg.wait_for_timeout(300);pg.screenshot(path=S+'v13.2-ways-in.png')
            pg.keyboard.press('Escape');pg.wait_for_timeout(350)
        ok(f'{w} {theme}: zero page errors',not E,E[:2])
        pg.close()
    b.close()
for n,c,d in R:
    if not c:print('FAIL |',n,'|',d)
print(json.dumps({'pass':sum(c for _,c,_ in R),'fail':sum(not c for _,c,_ in R)}))
sys.exit(0 if all(c for _,c,_ in R) else 1)
