"""V21 screenshots of the site (default: live). usage: python3 ops/screens_v21.py <prefix> [url]
Shots: Find header count, a card with no deadline, detail with description, detail with no description. Light+dark, 1440+390."""
import sys,json,os
from playwright.sync_api import sync_playwright
P=sys.argv[1] if len(sys.argv)>1 else 'after';U=sys.argv[2] if len(sys.argv)>2 else 'https://tyfaucher24-ops.github.io/internship-radar/'
O=os.path.join(os.path.dirname(os.path.abspath(__file__)),'screens','v21')+'/';os.makedirs(O,exist_ok=True)
out={}
with sync_playwright() as p:
    b=p.chromium.launch()
    for w in (1440,390):
        for th in ('light','dark'):
            c=b.new_context(viewport={'width':w,'height':900},bypass_csp=True);pg=c.new_page()
            pg.add_init_script("localStorage.setItem('idr_introSeen','true')")
            pg.goto(U+'#find');pg.wait_for_function("typeof D!=='undefined'&&D.length>100&&D.some(x=>'live' in x)",timeout=60000);pg.wait_for_timeout(2500)
            if th=='dark': pg.evaluate("document.documentElement.classList.add('dark');document.body.classList.add('dark')")
            t=f'{P}-{th}-{w}'
            pg.locator('#hdrCount').screenshot(path=O+t+'-count.png')
            out[t]={'build':pg.evaluate('window.BUILD'),'hdr':pg.evaluate("document.getElementById('hdrCount').innerText.replace(/\\s+/g,' ')"),
                    'hdr_aria':pg.evaluate("[...document.querySelectorAll('#hdrCount [aria-label]')].map(e=>e.getAttribute('aria-label'))")}
            if w==1440 and th=='light': pg.screenshot(path=O+t+'-find.png')
            # a card with no deadline: filter to undated rows through search order
            cid=pg.evaluate("(()=>{for(const e of document.querySelectorAll('.card[data-id]')){const x=BYID.get(e.dataset.id);if(x&&!x.deadline&&!x.rolling&&x.st!=='upcoming')return x.id}})()")
            if cid:
                cl=pg.locator(f'.card[data-id="{cid}"]').first;cl.scroll_into_view_if_needed();pg.wait_for_timeout(300);cl.screenshot(path=O+t+'-card-nodeadline.png')
                out[t]['card_text']=cl.inner_text()[:300]
            pg.evaluate('scrollTo(0,0)')
            for kind,cond in (('desc','x.has_desc'),('nodesc','!x.has_desc')):
                lid=pg.evaluate(f"(()=>{{const L=D.filter(x=>x.live&&x.st!=='upcoming'&&({cond}));return (L.find(x=>!x.deadline&&!x.rolling)||L[0]||{{}}).id}})()")
                if not lid: continue
                pg.evaluate(f"openDrawer(BYID.get({json.dumps(lid)}))");pg.wait_for_timeout(2500)
                pg.locator('#drawer .dpanel, #drawer [role=dialog], #drawer').first.screenshot(path=O+f'{t}-detail-{kind}.png')
                out[t]['detail_'+kind]=pg.evaluate("(()=>{const d=document.getElementById('dDesc');const a=document.getElementById('dAbout');return {desc:(d?d.innerText:'').slice(0,240),about:a&&!a.hidden?a.innerText.slice(0,240):null}})()")
                pg.keyboard.press('Escape');pg.evaluate("typeof closeDrawer=='function'&&closeDrawer()");pg.wait_for_timeout(400)
            c.close()
    b.close()
json.dump(out,open(O+P+'-notes.json','w'),indent=1);print(json.dumps(out,indent=1)[:4000])
