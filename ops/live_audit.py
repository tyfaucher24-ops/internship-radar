import json,sys
from playwright.sync_api import sync_playwright
U=sys.argv[1] if len(sys.argv)>1 else 'https://tyfaucher24-ops.github.io/internship-radar/'
S='/workspace/internship-radar/ops/screens/'
R={}
prof=json.load(open('/workspace/internship-radar/test/personas.json'))
prof=dict(prof['ty_queens'],v=6,savedAt='2026-10-22T12:00:00Z')
def rec(k,ok,note,shot=None,pg=None,el=None):
    if shot:
        try:(el or pg).screenshot(path=S+'v12-live-'+shot+'.png')
        except Exception as e: note+=f' (shot fail {e})'
    R[k]=('PASS' if ok else 'FAIL',note);print(k,R[k],flush=True)
with sync_playwright() as p:
    b=p.chromium.launch();c=b.new_context(viewport={'width':1280,'height':900});pg=c.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('idr_introSeen','true')")
    pg.goto(U+'#find');pg.wait_for_timeout(6000)
    bd=pg.evaluate("window.BUILD");lv=pg.evaluate("fetch('version.json',{cache:'no-store'}).then(r=>r.json())")
    rec('build current',bd==lv['build'],f'loaded {bd}, live {lv["build"]}')
    f=pg.evaluate("[getComputedStyle(document.body).fontFamily,document.fonts.check('16px Geist'),[...document.fonts].filter(f=>f.family.includes('Geist')&&f.status==='loaded').length]")
    rec('Geist font',f[0].lstrip('"').startswith('Geist') and f[2]>0,str(f),'font',pg)
    # ticker
    t=pg.evaluate("(()=>{const w=document.querySelector('.tk-win');if(!w)return null;const s=getComputedStyle(w);return [s.maskImage||s.webkitMaskImage,document.querySelectorAll('.tk-i').length,[...document.querySelectorAll('.tk-i')].some(e=>getComputedStyle(e).textOverflow==='ellipsis')]})()")
    rec('ticker whole items + fade',bool(t) and '56px' in (t[0] or '') and not t[2],str(t),'ticker',pg,pg.locator('#ticker'))
    # save: no jump, smooth
    cid=pg.locator('.card:has([data-act=save])').first.get_attribute('data-id');card=pg.locator(f'.card[data-id="{cid}"]');card.scroll_into_view_if_needed();pg.wait_for_timeout(300)
    btn=card.locator('[data-act=save]');btn.hover();pg.wait_for_timeout(400);w0=btn.bounding_box()['width'];y0=card.bounding_box()['y'];sy0=pg.evaluate('scrollY')
    btn.click()
    pg.wait_for_selector('.sv-in',timeout=4000,state='attached')
    mid=pg.evaluate("(()=>{const e=document.querySelector('.sv-in');return e?[getComputedStyle(e).animationName,e.textContent]:null})()");blip=pg.evaluate("document.querySelectorAll('.blip').length")
    pg.wait_for_timeout(400)
    nb=pg.locator(f'.card[data-id="{cid}"] [data-act=tracker]').first;w1=nb.bounding_box()['width'];y1=pg.locator(f'.card[data-id="{cid}"]').bounding_box()['y']
    rec('no jump on Save',abs(y1-y0)<1 and True,f'card y {y0:.1f}->{y1:.1f}')
    rec('smooth Save animation',bool(mid) and mid[0]=='svf' and blip==0 and abs(w1-w0)<0.5,f'anim={mid} blip={blip} width {w0}->{w1}','save',pg,pg.locator(f'.card[data-id="{cid}"]'))
    # scroll smoothness
    fr=pg.evaluate("""async()=>{const t=[];let l=performance.now();let on=true;(function f(n){t.push(n-l);l=n;if(on)requestAnimationFrame(f)})(l);for(let i=0;i<60;i++){scrollBy(0,120);await new Promise(r=>requestAnimationFrame(r))}on=false;await new Promise(r=>setTimeout(r,50));t.shift();t.sort((a,b)=>a-b);return [t.length,t[Math.floor(t.length*.95)],t.filter(x=>x>50).length]}""")
    rec('smooth scroll',fr[1]<34 and fr[2]==0,f'frames {fr[0]}, p95 {fr[1]:.1f}ms, >50ms {fr[2]}')
    pg.evaluate('scrollTo(0,0)')
    # engineering category
    eng=pg.evaluate("""(()=>{const L=D.filter(x=>x.live!==false&&x.st!=='closed');const m=L.filter(x=>/mechanical|civil|structural|propulsion|thermal|hvac|metallurg/i.test(x.title)&&!/software|firmware|embedded|robot/i.test(x.title));return [m.length,m.filter(x=>x.category==='Engineering & Hardware').length,L.filter(x=>x.category==='Other').length,L.length]})()""")
    rec('engineering category',eng[1]/max(1,eng[0])>0.9,f'mech/civil-type titles tagged Engineering {eng[1]}/{eng[0]}; Other {eng[2]}/{eng[3]}')
    # profile-less drawer: summary + toggle + blurb
    co=pg.evaluate("""async()=>{for(const x of D.filter(x=>x.has_desc&&x.st!=='closed').slice(0,300)){const d=await descOf(x);if(d&&companyBlurb(x,d)&&/Engineer|Analyst/.test(x.title)){return x.id}}}""")
    pg.evaluate(f"openDrawer(BYID.get({json.dumps(co)}))");pg.wait_for_timeout(1500)
    s=pg.evaluate("[document.querySelectorAll('#drawer .dsum li').length,[...document.querySelectorAll('#drawer summary,#drawer button')].some(e=>/Show full description/.test(e.textContent)),!document.getElementById('dAbout').hidden&&document.getElementById('dAbout').textContent]")
    rec('summary bullets + toggle',s[0]>=2 and s[1],f'{s[0]} bullets, toggle={s[1]}','summary',pg,pg.locator('#drawer'))
    rec('company blurb',bool(s[2]),str(s[2])[:90])
    pg.keyboard.press('Escape')
    # class years
    pg.goto(U+'#profile');pg.wait_for_timeout(2500)
    pg.locator('#cbYear').scroll_into_view_if_needed();pg.locator('#cbYear').click(force=True);pg.wait_for_timeout(600)
    cy=pg.evaluate("[...document.querySelectorAll('[role=option]')].map(o=>o.textContent.trim())")
    rec('full class-year list',bool(cy) and len(cy)>=6,str(cy),'classyear',pg)
    # profile + breakdown
    pg.evaluate(f"localStorage.setItem('idr_profile',JSON.stringify({json.dumps(prof)}))")
    pg.goto(U+'#find');pg.wait_for_timeout(1000);pg.reload();pg.wait_for_timeout(7000)
    g=pg.evaluate("MSCORE.size")
    pg.evaluate(f"openDrawer(BYID.get({json.dumps(co)})||[...MSCORE.keys()].map(k=>BYID.get(k))[0])");pg.wait_for_timeout(1800)
    if not pg.evaluate("!!document.querySelector('#drawer .fbp-bd')"):
        pg.evaluate("openDrawer([...MSCORE.keys()].map(k=>BYID.get(k)).find(x=>x&&x.st!=='closed'))");pg.wait_for_timeout(1800)
    bd2=pg.evaluate("(()=>{const t=document.querySelector('#drawer .fbp-bd');if(!t)return null;const th=t.querySelector('th');return [t.rows.length,getComputedStyle(th).width,getComputedStyle(t.querySelector('td')).lineHeight,getComputedStyle(th).paddingTop]})()")
    ath=pg.evaluate("document.querySelector('#drawer').innerText.includes('student athlete at')")
    rec('airy grade breakdown (profile set)',bool(bd2) and g>0 and bd2[3]=='10px' and not ath,f'graded {g}; rows/thW/lh/pad {bd2}','breakdown',pg,pg.locator('#drawer'))
    # drawer save button
    pg.keyboard.press('Escape');pg.wait_for_timeout(300)
    # a11y
    pg.add_script_tag(path='/tmp/lh/node_modules/axe-core/axe.min.js') if False else None
    b.close()
json.dump(R,open('/tmp/live.json','w'),indent=1);print('errors',errs[:3])
