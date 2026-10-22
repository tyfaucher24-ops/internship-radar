from playwright.sync_api import sync_playwright
U='https://tyfaucher24-ops.github.io/internship-radar/'
with sync_playwright() as p:
    b=p.chromium.launch();tot=0
    for vw in [(1280,800),(390,844)]:
        pg=b.new_context(viewport={'width':vw[0],'height':vw[1]}).new_page()
        pg.goto(U);pg.evaluate("localStorage.setItem('idr_introSeen','1')");pg.reload();pg.wait_for_timeout(3500)
        noprof=pg.evaluate("[!!document.querySelector('#drawer .fbp-bd'),document.querySelectorAll('.card').length]")
        pg.add_script_tag(path='/tmp/lh/node_modules/axe-core/axe.min.js')
        r=pg.evaluate("async()=>{const r=await axe.run(document,{runOnly:['wcag2a','wcag2aa']});return r.violations.map(v=>v.id+':'+v.nodes.length)}")
        tot+=len(r);print(vw,'violations',r,'noprofile',noprof)
        if vw[0]==1280: pg.screenshot(path='ops/screens/v12-live-a11y.png')
    print('TOTAL',tot)
