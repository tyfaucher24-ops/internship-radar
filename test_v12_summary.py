"""V12 addendum 2: short bullet summary from the real posting, full text behind 'Show full description'.
Checks 40 listings: summary present, full text collapsed by default and opens on click, and every Pay/Role bullet is found verbatim in the posting text."""
import json,sys,random
from playwright.sync_api import sync_playwright
R=[]
def ok(n,c,d=''):R.append(c);print(('PASS' if c else 'FAIL'),'|',n,'|',d)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1280,'height':900});E=[];pg.on('pageerror',lambda e:E.append(str(e)))
    pg.goto('http://localhost:8800/');pg.click('#goFind');pg.wait_for_timeout(6000)
    ids=pg.evaluate("D.filter(x=>x.has_desc&&x.st==='open').map(x=>x.id)");random.seed(12);bad=[];n=0
    for i in random.sample(ids,40):
        pg.evaluate(f"openDrawer(BYID.get('{i}'))");pg.wait_for_function("document.querySelector('#dDesc .dsum, #dDesc .muted')",timeout=8000)
        r=pg.evaluate("""(async()=>{const x=BYID.get(document.querySelector('#dAct .acts').dataset.id);const d=(await descOf(x)||'').replace(/\\s+/g,' ');const li=[...document.querySelectorAll('.dsum li')].map(l=>l.innerText);
          const v=li.filter(l=>/^(Pay|Role):/.test(l)).map(l=>l.replace(/^(Pay|Role):\\s*/,'')).filter(s=>!d.includes(s)&&!(x.pay&&s===x.pay));const fd=document.querySelector('.fulldesc');return {n:li.length,v,closed:fd&&!fd.open}})()""")
        n+=1
        if not r['n'] or r['v'] or not r['closed']:bad.append((i,r))
    ok('40 drawers: summary bullets present, Pay/Role quoted from the posting, full text collapsed',not bad,bad[:3])
    pg.click('.fulldesc>summary');ok('Show full description opens on click',pg.evaluate("document.querySelector('.fulldesc').open"))
    ok('no page errors',not E,E[:3]);b.close()
print(json.dumps({'pass':sum(R),'fail':len(R)-sum(R)}));sys.exit(0 if all(R) else 1)
