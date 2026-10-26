"""V11.2 checks: no text clipping/overflow anywhere (1280/1440/1920/390), card footer chips, ticker centring + sync time, tracker sheet,
summary bar, profile fields with real long values, School only from the list (incl. migration of a bad saved value)."""
import sys,json
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/'
R=[];ok=lambda n,c,d='':R.append((n,bool(c),d))
OVER="""(root)=>{const out=[];const els=(root||document).querySelectorAll('p,span,b,a,button,label,h1,h2,h3,li,td,th .th,.dl,.grp,.pill,.btn-save,.tst,.cb-one,.cb-ph,.pf-lab,.mbadge,.verd');
 for(const e of els){if(!e.offsetParent||e.closest('.tk-track,.sr,[hidden],.cb-pop[hidden],#intro')||e.classList.contains('sr'))continue;const cs=getComputedStyle(e);
  const ell=cs.textOverflow==='ellipsis'||cs.webkitLineClamp!=='none';const titled=e.title||e.closest('[title]');
  if(e.scrollWidth>e.clientWidth+1&&cs.overflowX!=='visible'&&!(ell&&titled)&&e.clientWidth>0)out.push('clip:'+(e.className||e.tagName)+':'+e.textContent.trim().slice(0,30));
  const box=e.closest('.card,.pf-col,.tscroll,.mbox,.ticker,.drawer .dbody,#drawer');if(box&&!e.closest('.tscroll')){const a=e.getBoundingClientRect(),b=box.getBoundingClientRect();if(a.width&&(a.right>b.right+1||a.left<b.left-1))out.push('spill:'+(e.className||e.tagName)+':'+e.textContent.trim().slice(0,30))}}
 return [...new Set(out)].slice(0,12)}"""
with sync_playwright() as p:
    b=p.chromium.launch();E=[]
    def page(w,**kw):
        pg=b.new_page(bypass_csp=True,viewport={'width':w,'height':844 if w<600 else 900},**kw);pg.on('pageerror',lambda e:E.append(str(e)));return pg
    for w in (1280,1440,1920,390):
        pg=page(w);pg.goto(B+'#find');pg.wait_for_selector('.card');pg.wait_for_timeout(5000)
        o=pg.evaluate(OVER);ok(f'{w} Find: no clipped or spilling text',not o,o)
        hs=pg.evaluate("[...new Set([...document.querySelectorAll('.card')].map(c=>c.offsetHeight))]");ok(f'{w} Find: all cards one height',len(hs)==1,hs)
        ok(f'{w} Find: footer chips one line each',pg.evaluate("[...document.querySelectorAll('.c-foot>*')].every(e=>getComputedStyle(e).whiteSpace==='nowrap'&&e.getBoundingClientRect().height<=46)"))
        ok(f'{w} Find: no "not lis" truncation labels',pg.locator('.dl:text("Closing date not listed")').count()==0)
        c=pg.evaluate("(()=>{const t=document.getElementById('ticker');if(t.hidden)return null;const bc=t.getBoundingClientRect(),m=bc.top+bc.height/2;return [...t.querySelectorAll('.tk-lbl,.tk-i')].slice(0,30).filter(e=>e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect();const inner=[...e.children].filter(k=>k.getBoundingClientRect().height).map(k=>{const q=k.getBoundingClientRect();return Math.abs(q.top+q.height/2-m)});return Math.max(Math.abs(r.top+r.height/2-m),...inner)})})()")
        ok(f'{w} Ticker: every item, label and part vertically centred (±1px)',c and max(c)<=1.01,c and max(c))
        t=pg.inner_text('#tkAsOf');ok(f'{w} Ticker: shows the real last sync time',t.startswith('Updated'),t)
        meta=pg.request.get(B+'data/meta.json').json();import datetime as dt;age=(dt.datetime.now(dt.timezone.utc)-dt.datetime.fromisoformat(meta['updated'].replace('Z','+00:00'))).total_seconds()/3600
        ok(f'{w} Ticker: stale warning only when the sync is over 6 h old',pg.evaluate("!document.getElementById('tkStale').hidden")==(age>6),round(age,1))
        mask=pg.evaluate("getComputedStyle(document.querySelector('.tk-win')).maskImage||getComputedStyle(document.querySelector('.tk-win')).webkitMaskImage");ok(f'{w} Ticker: edges fade (mask)','gradient' in mask)
        ok(f'{w} Ticker: items never shrink (whole text)',pg.evaluate("[...document.querySelectorAll('#tkTrack .tk-i')].slice(0,20).every(e=>e.scrollWidth<=e.clientWidth+1&&getComputedStyle(e).flexShrink==='0')"))
        pg.locator('.card').first.click();pg.wait_for_timeout(900);o=pg.evaluate(OVER,);ok(f'{w} Drawer: no clipped text',not o,o);pg.keyboard.press('Escape');pg.wait_for_timeout(300)
        pg.click('#tkMarket');pg.wait_for_timeout(1200);o=pg.evaluate("(()=>{const f="+OVER+";return f(document.getElementById('modal'))})()");ok(f'{w} Market panel: no clipped text',not o,o);pg.keyboard.press('Escape')
        # tracker with real rows
        for i in range(4):pg.locator('.card .btn-save:not(.on)').first.click();pg.wait_for_timeout(250)
        pg.evaluate("(()=>{const k=Object.keys(localStorage).find(k=>/tracker$/.test(k));const a=JSON.parse(localStorage.getItem(k));a[0].status='Online Assessment';a[1].status='Interviewing';a[1].history.push('Interviewing');a[1].notes='Recruiter call went well; send thank-you note and portfolio link by Friday';a[2].status='Offer';a[2].history.push('Offer');a[3].dateApplied='2026-10-15';localStorage.setItem(k,JSON.stringify(a))})()")
        pg.goto('about:blank');pg.goto(B+'#tracker');pg.wait_for_timeout(2500)
        if w>=1280:
            sw=pg.evaluate("(()=>{const s=document.querySelector('#t-tracker .tscroll');return [s.scrollWidth,s.clientWidth]})()");ok(f'{w} Tracker: no horizontal scroll',sw[0]<=sw[1]+1,sw)
            o=pg.evaluate("(()=>{const f="+OVER+";return f(document.getElementById('t-tracker'))})()");ok(f'{w} Tracker: no clipped labels/pills',not o,o)
            ok(f'{w} Tracker: status text fits its pill',pg.evaluate("(()=>{const c=document.createElement('canvas').getContext('2d');return [...document.querySelectorAll('#tTable .pill')].every(e=>{const cs=getComputedStyle(e);c.font=cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;return c.measureText(e.options[e.selectedIndex].text).width<=e.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)+1})})()"))
            ok(f'{w} Tracker: company names never break mid-word',pg.evaluate("[...document.querySelectorAll('#tTable td.c-company .ta')].every(t=>t.scrollWidth<=t.clientWidth+1&&getComputedStyle(t).overflowWrap==='normal')"))
            ok(f'{w} Tracker: status pills one width',len(set(pg.evaluate("[...document.querySelectorAll('#tTable .pill')].map(e=>e.offsetWidth)")))==1)
            cb=pg.evaluate("(()=>{const c=document.querySelector('.tsel-all').getBoundingClientRect(),h=document.querySelector('#tTable th.c-company').getBoundingClientRect();return [c.left-h.left,c.top-h.top,h.bottom-c.bottom]})()");ok(f'{w} Tracker: select-all box fully inside and centred',min(cb)>=2 and abs(cb[1]-cb[2])<=2,cb)
            ok(f'{w} Tracker: closes merged ("N days · Mon D")',pg.evaluate("[...document.querySelectorAll('#tTable td.c-closes .dv')].some(e=>/·/.test(e.textContent))"))
            ok(f'{w} Tracker: empty dates show —, no mm/dd/yyyy',pg.evaluate("[...document.querySelectorAll('#tTable input[type=date]')].every(i=>i.offsetParent===null)")and pg.locator('#tTable td.c-dateApplied .dv:text("—")').count()>=1)
            bar=pg.evaluate("(()=>{const s=document.getElementById('tStats').getBoundingClientRect(),t=document.querySelector('#t-tracker .tscroll').getBoundingClientRect();return [s.height,Math.abs(s.width-t.width),document.querySelectorAll('#tStats .tst').length]})()")
            ok(f'{w} Tracker: one slim summary bar, same width as the table',bar[0]<=48 and bar[1]<=2 and bar[2]==7,bar)  # V13.1: 7 summary cells (All, Saved, Applied, Interviews, Offers, Rejections, Closing this week)
            ok(f'{w} Tracker: offers number green',pg.evaluate("getComputedStyle(document.querySelector('#tStats .tst.up b')).color") in ('rgb(14, 124, 90)','rgb(95, 211, 165)'))  # light #0e7c5a / dark default #5fd3a5 (theme --c-up)
            pg.click('#tStats [data-seg="Offers"]');pg.wait_for_timeout(300);ok(f'{w} Tracker: clicking a stat filters the table',pg.locator('#tTable tbody tr').count()==1)
        pg.evaluate("localStorage.clear()");pg.close()
        # profile with real long values
        pg=page(w);pg.goto(B+'#profile');pg.wait_for_timeout(2500)
        pg.evaluate("""(()=>{PF.school='University of North Carolina at Chapel Hill';PF.major='Hospitality and Tourism Management';PF.minor='Business Administration';PF.classYear='Sophomore';PF.gradDate='2029-05';PF.gpa='3.92';PF.workAuth='authorized';pfRender()})()""");pg.wait_for_timeout(500)
        o=pg.evaluate("(()=>{const f="+OVER+";return f(document.getElementById('t-profile'))})()");ok(f'{w} Profile: long real values, no clipped text',not o,o)
        pg.locator('#cbMinor .cb-field').click();pg.wait_for_timeout(400)
        r=pg.evaluate("(()=>{const p=document.querySelector('#cbMinor .cb-pop');const r=p.getBoundingClientRect();const el=document.elementFromPoint(r.right-6,r.top+20);return [r.left,r.right,innerWidth,p.contains(el)]})()")
        rb=pg.evaluate("document.querySelector('#cbMinor .cb-pop').getBoundingClientRect().bottom<=innerHeight");ok(f'{w} Profile: Minor panel fully on screen, not clipped by the card',r[0]>=0 and r[1]<=r[2] and r[3] and rb,r)
        ic=pg.evaluate("(()=>{const s=document.querySelector('#cbMinor .cb-sbox svg').getBoundingClientRect(),i=document.querySelector('#cbMinor .cb-search');return s.right<=i.getBoundingClientRect().left+parseFloat(getComputedStyle(i).paddingLeft)})()");ok(f'{w} Profile: search icon does not overlap the placeholder',ic)
        pg.keyboard.press('Escape');pg.close()
    pg=page(1440);pg.goto(B);pg.wait_for_timeout(8000)
    c=pg.evaluate("(()=>{const t=document.getElementById('iTk');if(t.hidden)return null;const bc=t.getBoundingClientRect(),m=bc.top+bc.height/2;return [...t.querySelectorAll('.tk-lbl,.tk-i')].slice(0,20).filter(e=>e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect();return Math.abs(r.top+r.height/2-m)})})()")
    ok('Intro ticker: items vertically centred (±1px)',c and max(c)<=1.01,c and max(c));pg.close()
    pg=page(1440);pg.goto(B+'#find');pg.wait_for_timeout(1500)
    pg.evaluate("Store.set('profile',{school:'Finance Major • GPA 3.92 • Division I lacrosse • Queens University Investment Club Class of',major:'Finance'});Store.set('profileDraft',null)")
    keys=pg.evaluate("Object.keys(localStorage)")
    pg.goto('about:blank');pg.goto(B+'#profile');pg.wait_for_timeout(3500)
    ok('Bad saved School is migrated to the real school from the list',pg.evaluate("PF.school")=='Queens University of Charlotte',pg.evaluate("PF.school"))
    pg.close()
    ok('Zero page errors',not E,E[:3])
P=sum(1 for r in R if r[1]);print('\n'.join(('PASS' if c else 'FAIL')+' | '+n+' | '+str(d) for n,c,d in R));print(json.dumps({'pass':P,'fail':len(R)-P}))
