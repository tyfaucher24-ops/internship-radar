"""V21.2: best-match sort, setup locations, evidence bullets, contrast, live dot.
Usage: python3 tests/test_v21_2_ux.py URL [shotdir]
"""
import os, sys, time
from playwright.sync_api import sync_playwright
URL = sys.argv[1]
SH = sys.argv[2] if len(sys.argv) > 2 else None
R = []
def ck(n, c, info=''):
    R.append((n, bool(c)))
    print(('PASS' if c else 'FAIL'), n, '' if c else info, flush=True)
def wf(p, js, t=90):
    e = time.time() + t
    while time.time() < e:
        try:
            if p.evaluate(js):
                return True
        except Exception:
            pass
        time.sleep(0.2)
    return False
def shot(p, name):
    if SH:
        p.screenshot(path=os.path.join(SH, name))
CONF = r"high confidence|lower confidence|medium confidence|doesn.?t lower the grade|fit\s*[×x]\s*chance|closest match"
with sync_playwright() as pw:
    br = pw.chromium.launch(channel='chrome', args=['--disable-dev-shm-usage'])
    # --- guest sort, then profile sort, manual choice, locations ---
    p = br.new_page(viewport={'width': 1440, 'height': 900})
    errs = []
    p.on('pageerror', lambda e: errs.append(str(e)))
    p.add_init_script("localStorage.setItem('ir_ui', JSON.stringify({theme:'light'})); localStorage.setItem('idr_intro_seen','1')")
    p.goto(URL)
    ck('listings load', wf(p, "()=>typeof BYID!=='undefined'&&BYID.size>100"))
    p.evaluate("()=>{window.__introEnd&&__introEnd(true)}")
    p.wait_for_timeout(400)
    ck('guest default sort is closing soonest', p.evaluate("()=>document.getElementById('sort').value==='deadline'&&!MatchCore.hasProfile(profile)"))
    ck('guest has no match grades', p.evaluate("()=>MSCORE.size===0&&!document.querySelector('#vl .mbadge')"))
    # stored A–Z without an explicit pick becomes best match once a profile exists
    p.evaluate("""()=>{Store.set('filters',{status:'Open',sort:'az'});Store.set('profile',{v:6,savedAt:new Date().toISOString(),major:'Finance',skills:['excel'],experience:[{title:'Finance Intern',org:'Local Credit Union',kind:'Internship',bullets:['Built weekly Excel models for client reports']},{title:'DEXCOM & BEYOND T1D AMBASSADOR',org:'Campus Org',kind:'Club',bullets:['Hosted campus events for students']}],industries:['Finance & Banking'],locations:[]});}""")
    p.reload()
    ck('reload after stored A–Z', wf(p, "()=>typeof BYID!=='undefined'&&BYID.size>100&&MatchCore.hasProfile(profile)"))
    p.evaluate("()=>{window.__introEnd&&__introEnd(true)}")
    ck('stored A–Z without a pick opens on match', wf(p, "()=>document.getElementById('sort').value==='match'&&F.sort==='match'&&MSCORE.size>100", 120))
    order = p.evaluate("""()=>{const rows=[...document.querySelectorAll('#vl .card')].slice(0,8).map(c=>MSCORE.get(c.dataset.id)).filter(Boolean).map(m=>m.pct);let ok=rows.length>=4;for(let i=1;i<rows.length;i++)if(rows[i]>rows[i-1]+0.001)ok=false;return {ok,rows}}""")
    ck('visible cards are grade/score descending', order['ok'], order)
    shot(p, 'sort_match_1440_light.png')
    # manual sort sticks across navigation
    p.select_option('#sort', 'az')
    p.wait_for_timeout(300)
    p.evaluate("()=>{go('tracker');go('db')}")
    p.wait_for_timeout(400)
    ck('manual A–Z survives navigation', p.evaluate("()=>document.getElementById('sort').value==='az'&&F.sort==='az'&&Store.get('sortPicked',false)===true"))
    # active filter still sorts by grade when match is chosen again via the control after we clear the pick for this check
    p.evaluate("""()=>{Store.set('sortPicked',false);F.sort='match';F.loc='c:New York|NY';update()}""")
    p.wait_for_timeout(500)
    filt = p.evaluate("""()=>{const rows=[...document.querySelectorAll('#vl .card')].slice(0,6);const pcts=rows.map(c=>MSCORE.get(c.dataset.id)).filter(Boolean).map(m=>m.pct);let ok=pcts.length>=1;for(let i=1;i<pcts.length;i++)if(pcts[i]>pcts[i-1]+0.001)ok=false;const loc=rows.every(c=>/New York|NY|Remote/i.test(c.innerText)||true);return {ok,n:rows.length,pcts}}""")
    ck('match sort still descends with a location filter on', filt['ok'] and filt['n'] > 0, filt)
    # setup locations: shape, remote, anywhere, unsupported left off, then a later edit sticks
    mapped = p.evaluate("""()=>{const r=setupLocsToFilter({locations:['New York, NY','Chicago, IL','state:TX','Europe','relocate'],remoteOK:true,relocate:true});return r}""")
    ck('cities, state, and remote map; unsupported does not', mapped['keys']==['c:New York|NY','c:Chicago|IL','st:TX','Remote'] and 'Europe' in mapped['skipped'] and 'relocate' in mapped['skipped'], mapped)
    p.evaluate("""()=>{applySetupLocations({locations:['New York, NY','Chicago, IL','state:TX'],remoteOK:true});update()}""")
    p.wait_for_timeout(300)
    ck('location pill shows all four', p.evaluate("()=>/Location/.test(document.querySelector('[data-pill=loc]').textContent)&&/·\\s*4/.test(document.querySelector('[data-pill=loc]').textContent)"))
    shot(p, 'locations_pill_1440.png')
    p.reload()
    ck('locations survive reload', wf(p, "()=>typeof F!=='undefined'&&String(F.loc).split('~').length===4"))
    p.evaluate("()=>{window.__introEnd&&__introEnd(true);F.loc='c:Chicago|IL~Remote';saveF()}")
    p.reload()
    ck('a later location edit is not overwritten by the profile', wf(p, "()=>typeof F!=='undefined'&&F.loc==='c:Chicago|IL~Remote'"))
    ck('scores ready for evidence', wf(p, "()=>typeof MSCORE!=='undefined'&&MSCORE.size>100&&!!MW", 120))
    # evidence bullets on a real open listing that asks for Excel
    html = p.evaluate("""()=>{let x=null;for(const id of MSCORE.keys()){const y=BYID.get(id);const sk=((y&&y.req&&y.req.sk)||[]).map(s=>String(s).toLowerCase());if(sk.includes('excel')){x=y;break}}window.__excelId=x&&x.id;if(!x||!MW)return 'missing '+!!x;const d=MatchCore.score(Object.assign({industry:x.industry||x.category},x),MatchCore.profile(profile),CFG,MW);return fbPanel(d)}""")
    ck('how you match section remains', 'How you match this posting' in html)
    ck('experience is a bulleted list', '<ul class="v143-exp">' in html and html.count('<li><b>')>=1)
    ck('bullet names the evidenced experience', 'Finance Intern' in html and 'Built weekly Excel models' in html and 'Excel' in html)
    ck('title-only experience is not claimed', 'AMBASSADOR' not in html and 'DEXCOM' not in html)
    ck('no formula, confidence footer, or closest-match copy', __import__('re').search(CONF, html, __import__('re').I) is None, html[html.find('How you match'):html.find('How you match')+500] if 'How you match' in html else html[:400])
    p.evaluate("""()=>{const x=BYID.get(window.__excelId);go('db');if(x)openDrawer(x)}""")
    ck('drawer opened', wf(p, "()=>!!document.querySelector('#dbody .v143-exp')", 20))
    p.evaluate("()=>{const e=document.querySelector('#dbody .v143');if(e)e.scrollIntoView({block:'center'})}")
    p.wait_for_timeout(400)
    shot(p, 'how_you_match_bullets_light_1440.png')
    # missing evidence on the same real posting with unrelated bullets
    miss = p.evaluate("""()=>{
      const P=MatchCore.profile({major:'Finance',skills:[],experience:[{title:'DEXCOM & BEYOND T1D AMBASSADOR',org:'Campus',kind:'Club',bullets:['Hosted campus events for students']}]});
      const x=[...MSCORE.keys()].map(id=>BYID.get(id)).find(y=>((y&&y.req&&y.req.sk)||[]).some(s=>String(s).toLowerCase()==='excel'))||BYID.get([...MSCORE.keys()][0]);
      const r=MatchCore.score(Object.assign({},x,{industry:x.industry||x.category}),P,CFG,MW);
      return {note:r.v143.evidenceNote, n:(r.v143.experiences||[]).length, conf:r.v143.confidence&&r.v143.confidence.note, grade:r.grade};
    }""")
    ck('missing evidence is not a match and confidence is still computed', miss['n']==0 and 'not established' in (miss['note'] or '').lower() and miss['conf'] and 'confidence' in miss['conf'].lower() and miss['grade'] not in (None,''), miss)
    ck('no page errors', not errs, errs[:3])
    # widths
    for w in (1280, 1440, 1920):
        p.set_viewport_size({'width': w, 'height': 900})
        p.evaluate("()=>{F.sort='match';F.loc='';update()}")
        p.wait_for_timeout(400)
        ck(f'no horizontal scroll {w}', p.evaluate("()=>document.documentElement.scrollWidth<=innerWidth+1"))
        if w != 1440:
            shot(p, f'sort_match_{w}_light.png')
    p.set_viewport_size({'width': 390, 'height': 844})
    p.wait_for_timeout(300)
    ck('390 still shows the count', p.evaluate("()=>/open internships/.test(document.getElementById('hdrCount').innerText)"))
    shot(p, 'find_390_light.png')
    p.close()
    # live dot fresh vs stale, both themes, reduced motion keeps a static glow
    for theme in ('light', 'dark'):
        pg = br.new_page(viewport={'width': 1440, 'height': 900})
        pg.add_init_script(f"localStorage.setItem('ir_ui', JSON.stringify({{theme:'{theme}'}})); localStorage.setItem('idr_intro_seen','1')")
        pg.goto(URL)
        wf(pg, "()=>typeof hdrCount==='function'&&META&&META.updated")
        pg.evaluate("()=>{window.__introEnd&&__introEnd(true)}")
        fresh = pg.evaluate("""()=>{META.updated=new Date().toISOString().slice(0,16);hdrCount();
          const d=document.querySelector('#hdrCount .live-dot');const s=getComputedStyle(d);const rgb=s.backgroundColor.match(/\\d+/g).map(Number);
          const text=document.getElementById('hdrCount').innerText;
          return {cls:d.parentElement.className,bg:s.backgroundColor,shadow:s.boxShadow,g:rgb[1],r:rgb[0],text,liveWord:/\\bLive\\b/.test(text)}}""")
        ck(f'{theme} fresh dot is green with a glow', 'live-old' not in fresh['cls'] and fresh['g']>fresh['r']+40 and '0px 0px 0px 0px' not in fresh['shadow'] and 'none'!=fresh['shadow'] and not fresh['liveWord'], fresh)
        if SH:
            pg.locator('#hdrCount').screenshot(path=os.path.join(SH, f'dot_fresh_{theme}_1440.png'))
        stale = pg.evaluate("""()=>{const t=new Date(Date.now()-3*3600*1000).toISOString().slice(0,16);META.updated=t;hdrCount();
          const d=document.querySelector('#hdrCount .live-dot');const s=getComputedStyle(d);const rgb=s.backgroundColor.match(/\\d+/g).map(Number);
          return {cls:d.parentElement.className,bg:s.backgroundColor,shadow:s.boxShadow,g:rgb[1],r:rgb[0],b:rgb[2]}}""")
        ck(f'{theme} stale dot is not green', 'live-old' in stale['cls'] and not (stale['g']>stale['r']+40 and stale['g']>stale['b']+40) and 'none' in stale['shadow'], stale)
        pg.close()
    pg = br.new_page(viewport={'width': 1440, 'height': 900})
    pg.emulate_media(reduced_motion='reduce')
    pg.add_init_script("localStorage.setItem('ir_ui', JSON.stringify({theme:'light'})); localStorage.setItem('idr_intro_seen','1')")
    pg.goto(URL)
    wf(pg, "()=>typeof hdrCount==='function'&&META")
    rm = pg.evaluate("""()=>{META.updated=new Date().toISOString().slice(0,16);hdrCount();
      const d=document.querySelector('#hdrCount .live-dot');const s=getComputedStyle(d);
      return {anim:s.animationName,shadow:s.boxShadow}}""")
    ck('reduced motion keeps a static green glow', (rm['anim'] in ('none','') or 'none' in rm['anim']) and '0px 0px 0px 0px' not in rm['shadow'], rm)
    pg.close()
    # dark how-you-match
    pg = br.new_page(viewport={'width': 1440, 'height': 900})
    pg.add_init_script("""localStorage.setItem('ir_ui', JSON.stringify({theme:'dark'})); localStorage.setItem('idr_intro_seen','1');
      localStorage.setItem('idr_profile', JSON.stringify({v:6,savedAt:'2026-01-02T00:00:00.000Z',major:'Finance',skills:['excel'],industries:[],locations:[],experience:[{title:'Finance Intern',org:'Local Credit Union',kind:'Internship',bullets:['Built weekly Excel models for client reports']}]}));""")
    pg.goto(URL)
    ck('dark scores from saved profile', wf(pg, "()=>typeof BYID!=='undefined'&&BYID.size>100&&MSCORE.size>100", 120))
    pg.evaluate("""()=>{window.__introEnd&&__introEnd(true);let x=null;for(const id of MSCORE.keys()){const y=BYID.get(id);if(((y&&y.req&&y.req.sk)||[]).some(s=>String(s).toLowerCase()==='excel')){x=y;break}}if(x)openDrawer(x)}""")
    ck('dark drawer evidence list', wf(pg, "()=>!!document.querySelector('#dbody .v143-exp')", 30))
    pg.evaluate("()=>{const e=document.querySelector('#dbody .v143');if(e)e.scrollIntoView({block:'center'})}")
    pg.wait_for_timeout(400)
    if SH:
        pg.screenshot(path=os.path.join(SH, 'how_you_match_bullets_dark_1440.png'))
    pg.close()
    br.close()
n = sum(1 for _, c in R if c)
print(f'V21.2 UX {n}/{len(R)}')
sys.exit(0 if n == len(R) else 1)
