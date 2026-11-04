import json,sys
from playwright.sync_api import sync_playwright
U=sys.argv[1];AXE=open('/tmp/lh/node_modules/axe-core/axe.min.js').read();res={}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for th in ('light','dark'):
        for w in (1440,1280,768,390):
            c=b.new_context(viewport={'width':w,'height':900},color_scheme=th,bypass_csp=True);pg=c.new_page()
            pg.add_init_script("try{localStorage.setItem('ir_ui',JSON.stringify({theme:'%s'}));localStorage.setItem('idr_intro_seen','1')}catch(e){}"%th)
            pg.goto(U,wait_until='networkidle');pg.wait_for_timeout(2500)
            for view in ('start','db'):
                if view=='db':
                    try: pg.evaluate("document.documentElement.classList.add('seen')");pg.click('#goFind',timeout=3000)
                    except Exception: pass
                    pg.wait_for_timeout(1500)
                pg.add_script_tag(content=AXE)
                r=pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21a','wcag21aa']}).then(r=>r.violations.map(v=>[v.id,v.impact,v.nodes.length,v.nodes[0].target.join(' ')]))")
                res[f'{th}-{w}-{view}']=r;print(th,w,view,r,flush=True)
            c.close()
    b.close()
json.dump(res,open('/tmp/v18/axe-result.json','w'),indent=1)
