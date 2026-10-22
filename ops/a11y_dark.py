"""V12.1: axe (WCAG 2 A/AA) in dark mode across every main view. Usage: python3 ops/a11y_dark.py [BASE]"""
import sys,json
from playwright.sync_api import sync_playwright
U=sys.argv[1] if len(sys.argv)>1 else 'https://tyfaucher24-ops.github.io/internship-radar/'
AXE='/tmp/lh/node_modules/axe-core/axe.min.js'
prof=dict(json.load(open('test/personas.json'))['ty_queens'],v=6,savedAt='2026-10-22T12:00:00Z')
def run(pg,name,ctx='document'):
    pg.add_script_tag(path=AXE)
    r=pg.evaluate("async(c)=>{const r=await axe.run(c==='document'?document:document.querySelector(c),{runOnly:['wcag2a','wcag2aa']});return r.violations.map(v=>({id:v.id,n:v.nodes.length,ex:v.nodes.slice(0,4).map(x=>x.target.join(' ')+' | '+(x.any[0]&&x.any[0].message||'').slice(0,120))}))}",ctx)
    print(name,'violations:',sum(v['n'] for v in r))
    for v in r:print('  ',v['id'],v['n']);[print('     ',e) for e in v['ex']]
    return sum(v['n'] for v in r)
tot=0
with sync_playwright() as p:
    b=p.chromium.launch()
    for vw in [(1280,860),(390,844)]:
        c=b.new_context(viewport={'width':vw[0],'height':vw[1]},bypass_csp=True);pg=c.new_page()
        pg.goto(U);pg.wait_for_timeout(2500)
        assert pg.evaluate("document.documentElement.classList.contains('dark')"),'dark is not the default'
        tot+=run(pg,f'{vw} intro')
        pg.evaluate("p=>{localStorage.clear();localStorage.setItem('idr_profile',JSON.stringify(p))}",prof)
        pg.reload();pg.wait_for_timeout(1500)
        pg.click('#goFind')
        pg.wait_for_selector('.card .mbadge',timeout=60000);pg.wait_for_timeout(800)
        tot+=run(pg,f'{vw} home')
        pg.click('.card .btn-save');pg.wait_for_timeout(300)
        pg.click('.card h3, .card .ttl',timeout=5000) if pg.query_selector('.card h3') else pg.click('.card')
        pg.wait_for_selector('#drawer:not([hidden])');pg.wait_for_timeout(700)
        tot+=run(pg,f'{vw} detail modal')
        pg.keyboard.press('Escape');pg.goto(U+'#tracker');pg.wait_for_timeout(1200)
        tot+=run(pg,f'{vw} tracker')
        pg.goto(U+'#profile');pg.wait_for_timeout(1200)
        tot+=run(pg,f'{vw} profile')
        pg.goto(U+'#details');pg.wait_for_timeout(1200)
        tot+=run(pg,f'{vw} details')
        c.close()
print('TOTAL',tot)
