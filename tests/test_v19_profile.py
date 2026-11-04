"""V19 Part 2: roomier Profile at 1920/1440/1280/1024/768/390, both themes. Usage: URL [shotdir]"""
import sys,time,os
from playwright.sync_api import sync_playwright
URL=sys.argv[1];SH=sys.argv[2] if len(sys.argv)>2 else None
AXE=open('/workspace/t/axe.min.js').read();R=[]
def ck(n,c,i=''):R.append(c);print('PASS' if c else 'FAIL',n,'' if c else i,flush=True)
with sync_playwright() as pw:
  br=pw.chromium.launch()
  for th in ('light','dark'):
    for W in (1920,1440,1280,1024,768,390):
      p=br.new_page(bypass_csp=True,viewport={'width':W,'height':1000 if W>500 else 844})
      p.add_init_script(f"localStorage.setItem('ir_intro_seen','1');localStorage.setItem('ir_theme','{th}')")
      p.goto(URL);p.wait_for_function("()=>window.go&&window.RZ",timeout=30000);p.evaluate("()=>{window.__introEnd&&__introEnd(false);go('profile')}");p.wait_for_timeout(900)
      p.evaluate(f"()=>{{document.documentElement.classList.toggle('dark',{str(th=='dark').lower()})}}");p.wait_for_timeout(1600)
      m=p.evaluate("""()=>{const q=s=>document.querySelector('#t-profile '+s),cs=e=>e&&getComputedStyle(e);const i=q('input[type=text],input:not([type])'),l=q('label'),d=q('.rz .drop,#pfDrop');
       return {hs:document.documentElement.scrollWidth>innerWidth,inH:i&&i.getBoundingClientRect().height,inF:cs(i)&&cs(i).fontSize,lab:cs(l)&&cs(l).fontWeight,drop:d&&d.getBoundingClientRect().height}}""")
      ck(f'no horizontal scroll {W} {th}',not m['hs'],m)
      if W>=1024: ck(f'input 52px/16px {W} {th}',round(m['inH'] or 0)==52 and m['inF']=='16px',m)
      if W>=1024: ck(f'drop zone >=230 {W} {th}',(m['drop'] or 0)>=229,m)
      if W in (1920,1440,390) or True:
        if SH: p.screenshot(path=os.path.join(SH,f'profile-{W}-{th}.png'),full_page=False)
      if W in (1440,390):
        p.add_script_tag(content=AXE)
        v=p.evaluate("async()=>(await axe.run('#t-profile',{runOnly:['wcag2a','wcag2aa','wcag21aa']})).violations.map(v=>v.id+':'+v.nodes[0].target)")
        ck(f'axe AA profile {W} {th}',not v,v)
      p.close()
  br.close()
print(f"V19 PROFILE {sum(R)} / {len(R)}")
