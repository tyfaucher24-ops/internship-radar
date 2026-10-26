"""V12 addendum 2: scroll performance QA. Scrolls Find (with a full profile), Tracker (300 rows), Market and Profile
with wheel events and measures frame intervals via requestAnimationFrame. Pass = p95 frame <= 20ms and <2% frames over 33ms
(Chromium headless, software rendering; real GPUs are faster). Also checks no scroll-linked layout shift (CLS during scroll)."""
import json,sys
from playwright.sync_api import sync_playwright
B='http://localhost:8800/';R=[]
def ok(n,c,d=''):R.append(c);print(('PASS' if c else 'FAIL'),'|',n,'|',d)
TY=dict(json.load(open('test/personas.json'))['ty_queens'],v=6,savedAt='2026-10-22T12:00:00Z')
START="""()=>{const sc=document.scrollingElement;let cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)cls+=e.value}).observe({type:'layout-shift',buffered:false});
 const t=[];let last=performance.now(),run=true;const f=n=>{t.push(n-last);last=n;if(run)requestAnimationFrame(f)};requestAnimationFrame(f);
 window._stop=()=>{run=false;t.sort((a,b)=>a-b);const p95=t[Math.floor(t.length*.95)];const long=t.filter(x=>x>33).length/t.length;return {n:t.length,p95:+p95.toFixed(1),long:+(long*100).toFixed(1),cls:+cls.toFixed(4),y:scrollY}}}"""
with sync_playwright() as p:
    b=p.chromium.launch(args=['--enable-gpu-rasterization']);pg=b.new_page(viewport={'width':1440,'height':900});E=[];pg.on('pageerror',lambda e:E.append(str(e)))
    pg.goto(B);pg.evaluate("p=>{localStorage.setItem('idr_profile',JSON.stringify(p));const rows=[];for(let i=0;i<300;i++)rows.push({id:'t'+i,company:'Company '+i,title:'Summer Analyst '+i,status:['Saved','Applied','Interviewing'][i%3],history:['Saved'],notes:'',added:Date.now()-i*864e5});localStorage.setItem('idr_tracker',JSON.stringify(rows))}",TY)
    pg.reload();pg.click('#goFind');pg.wait_for_timeout(9000)
    for h in ('find','tracker','market','profile'):
        pg.evaluate(f"location.hash='#{h}'");pg.wait_for_timeout(2500);pg.evaluate("window.scrollTo(0,0)")
        pg.evaluate(START)
        for i in range(40):pg.mouse.move(700,500);pg.mouse.wheel(0,400 if i<25 else -300);pg.wait_for_timeout(30)
        pg.wait_for_timeout(600);m=pg.evaluate('window._stop()');ok(f'{h}: smooth scroll (p95 frame ≤20ms, <2% long frames, CLS<0.01)',m['p95']<=20 and m['long']<2 and m['cls']<0.01,m)
    ok('no page errors',not E,E[:3]);b.close()
print(json.dumps({'pass':sum(R),'fail':len(R)-sum(R)}));sys.exit(0 if all(R) else 1)
