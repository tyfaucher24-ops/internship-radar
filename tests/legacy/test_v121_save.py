"""V12.1: pressing Save must not move the page. Records scrollY and the card's bounding rect before/after Save
in the Find list and in the open detail modal (and the modal's scrollTop). Pass = 0px movement everywhere.
Usage: python3 test_v121_save.py [BASE]"""
import json,sys
from playwright.sync_api import sync_playwright
B=next((a for a in sys.argv[1:] if a.startswith('http')),'http://localhost:8800/');R=[]
def ok(n,c,d=''):R.append(c);print(('PASS' if c else 'FAIL'),'|',n,'|',json.dumps(d))
TY=dict(json.load(open('test/personas.json'))['ty_queens'],v=6,savedAt='2026-10-22T12:00:00Z')
SNAP="""sel=>{const c=document.querySelector(sel);const r=c.getBoundingClientRect();const m=document.querySelector('#drawer .dpanel, #drawer [role=dialog], #dbody');return {y:scrollY,top:+r.top.toFixed(2),left:+r.left.toFixed(2),h:+r.height.toFixed(2),w:+r.width.toFixed(2),ms:m?m.scrollTop:0,mp:m?m.parentElement.scrollTop:0}}"""
def mv(a,b):return max(abs(a[k]-b[k]) for k in a)
with sync_playwright() as p:
    for ctx in ('list','top','modal'):
        b=p.chromium.launch();pg=b.new_page(bypass_csp=True,viewport={'width':1440,'height':900});E=[];pg.on('pageerror',lambda e:E.append(str(e)))
        pg.goto(B);pg.evaluate("p=>{localStorage.clear();localStorage.setItem('idr_profile',JSON.stringify(p))}",TY);pg.reload();pg.click('#goFind')
        pg.wait_for_selector('.card .mbadge',timeout=60000);pg.wait_for_timeout(2500)
        pg.mouse.move(700,500)
        for i in range(0 if ctx=='top' else 8):pg.mouse.wheel(0,450);pg.wait_for_timeout(120)
        pg.wait_for_timeout(1200)
        if ctx=='top':
            id=pg.evaluate("()=>[...document.querySelectorAll('.card')].find(c=>c.querySelector('[data-act=save]')&&c.getBoundingClientRect().bottom<innerHeight-20).dataset.id")
            sel=f'.card[data-id="{id}"]';btn=sel+' [data-act=save]'
        elif ctx=='list':
            id=pg.evaluate("()=>{const v=[...document.querySelectorAll('.card')].filter(c=>{const r=c.getBoundingClientRect();return r.top>200&&r.bottom<innerHeight-50&&c.querySelector('[data-act=save]')});return v[0].dataset.id}")
            sel=f'.card[data-id="{id}"]';btn=sel+' [data-act=save]'
        else:
            id=pg.evaluate("()=>{const v=[...document.querySelectorAll('.card')].filter(c=>{const r=c.getBoundingClientRect();return r.top>150&&c.querySelector('[data-act=save]')});return v[0].dataset.id}")
            pg.click(f'.card[data-id="{id}"]');pg.wait_for_selector('#dAct [data-act=save]',timeout=10000);pg.wait_for_timeout(1500)
            pg.evaluate("()=>{document.querySelector('#dAct').scrollIntoView({block:'center',behavior:'instant'})}");pg.wait_for_timeout(400)
            sel='#dAct';btn='#dAct [data-act=save]'
        pg.hover(btn);pg.wait_for_timeout(500)  # settle hover lift first so only Save itself is measured
        a=pg.evaluate(SNAP,sel);bh=pg.evaluate("s=>document.querySelector(s).getBoundingClientRect().toJSON()",btn)
        pg.click(btn);frames=[]
        for t in range(12):pg.wait_for_timeout(50);frames.append(pg.evaluate(SNAP,sel))
        z=pg.evaluate(SNAP,sel);worst=max(mv(a,f) for f in frames)
        ok(f'{ctx}: Save moves nothing (scroll + card rect, sampled 12x over 600ms)',worst==0,{'before':a,'after':z,'max_px':worst,'saved':pg.evaluate("Store.get('tracker',[]).length")})
        # Unsave: a REAL click on the same spot; the item leaves the tracker in place, no navigation (V13.1 P0-1)
        ub=sel+' [data-act=unsave]' if ctx!='modal' else '#dAct [data-act=unsave]';h0=pg.evaluate("location.hash")
        pg.hover(ub);pg.wait_for_timeout(400);a2=pg.evaluate(SNAP,sel);pg.click(ub);fr2=[]
        for t in range(12):pg.wait_for_timeout(50);fr2.append(pg.evaluate(SNAP,sel))
        w2=max(mv(a2,f) for f in fr2);back=pg.evaluate("s=>!!document.querySelector(s)",btn)
        gone=pg.evaluate("id=>!JSON.parse(localStorage.getItem('idr_tracker')||'[]').some(t=>String(t.listingId)===String(id))",id)
        ok(f'{ctx}: real-click Unsave moves nothing, keeps hash, removes from idr_tracker, restores Save',w2==0 and back and gone and pg.evaluate("location.hash")==h0,{'max_px':w2,'save_btn_back':back,'removed':gone,'hash':[h0,pg.evaluate("location.hash")]})
        ok(f'{ctx}: no page errors',not E,E[:2]);b.close()
print(json.dumps({'pass':sum(R),'fail':len(R)-sum(R)}));sys.exit(0 if all(R) else 1)
