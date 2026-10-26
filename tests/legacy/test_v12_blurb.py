# V12: company blurb in drawer must be verbatim from the posting text, or omitted.
import json
from playwright.sync_api import sync_playwright
P=F=0
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();pg.add_init_script("localStorage.setItem('idr_introSeen','true')");pg.goto('http://localhost:8800/#find');pg.wait_for_timeout(4000)
    r=pg.evaluate("""async()=>{const out=[];for(const x of D.filter(x=>x.has_desc).slice(0,60)){const d=await descOf(x);if(!d)continue;const bl=companyBlurb(x,d);out.push([x.company,bl,!bl||d.replace(/\\s+/g,' ').includes(bl)])}return out}""")
    ok=all(v for _,_,v in r);P+=ok;F+=not ok
    ok=any(bl for _,bl,_ in r) and any(not bl for _,bl,_ in r);P+=ok;F+=not ok
    b.close()
print(json.dumps({"pass":P,"fail":F}))
