"""V13.3 item 2: live checks for sections 1-5 in both themes, plus the 60fps planet-exit timing check."""
import sys,json,asyncio
from playwright.async_api import async_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'https://tyfaucher24-ops.github.io/internship-radar/'
S='ops/screens/v13.3-live-';R={}
GL=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def ctxp(b,th,w=1440,h=900,video=False):
  c=await b.new_context(viewport={'width':w,'height':h},**({'record_video_dir':'/tmp/vid','record_video_size':{'width':w,'height':h}} if video else {}))
  await c.add_init_script(f"localStorage.setItem('ir_ui',JSON.stringify({{theme:'{th}'}}))")
  p=await c.new_page();E=[];p.on('pageerror',lambda e:E.append(str(e)[:150]));return c,p,E
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(args=GL)
    for th in ('dark','light'):
      c,p,E=await ctxp(b,th)
      await p.goto(B+'?intro=1&gl=1');await p.wait_for_timeout(4500);await p.screenshot(path=S+f'intro-{th}.png')
      await p.click('#goFind');await p.wait_for_timeout(2500)
      # 1. nav gaps at 3 widths
      for w in (1280,1440,1920):
        await p.set_viewport_size({'width':w,'height':900});await p.wait_for_timeout(400)
        R[f'nav-{th}-{w}']=await p.evaluate("""(()=>{const n=document.querySelector('#hdr nav')||document.querySelector('#hdr .nav');const it=[...n.children].filter(e=>e.offsetWidth).map(e=>e.getBoundingClientRect());const g=it.slice(1).map((r,i)=>Math.round(r.left-it[i].right));const hd=document.querySelector('#hdr').getBoundingClientRect();return{gaps:g,spread:Math.max(...g)-Math.min(...g),right:Math.round(innerWidth-it[it.length-1].right),hdrRight:Math.round(innerWidth-document.querySelector('#hdr').lastElementChild.getBoundingClientRect().right),logoLeft:Math.round(document.querySelector('#hdr .brand').getBoundingClientRect().left),texts:[...n.querySelectorAll('a')].map(a=>a.textContent.trim()),logo:document.querySelector('#hdr .brand img')?.getAttribute('src')||'svg'}})()""")
      await p.set_viewport_size({'width':1440,'height':900})
      for pg in ('db','tracker','outreach','profile','about'):
        await p.goto(B+'#'+pg);await p.wait_for_timeout(3000);await p.screenshot(path=S+f'{pg}-{th}.png')
        if pg in('tracker','outreach'):
          R[f'shell-{th}-{pg}']=await p.evaluate("""(()=>{const s=document.querySelector('section.page:not([hidden])');const q=x=>{const e=s.querySelector(x);if(!e)return null;const r=e.getBoundingClientRect();return[Math.round(r.left),Math.round(r.top),Math.round(r.width)]};return{h1:q('h1'),tabs:q('.subtabs'),box:q('.twide')||q('.container')}})()""")
      # 2. theme toggle flips without reload
      R[f'toggle-{th}']=await p.evaluate("""(()=>{const b=document.getElementById('thTog');if(!b)return'no toggle';const d=()=>document.documentElement.classList.contains('dark')?'dark':'light';const a=d();b.click();const z=d();const bg=getComputedStyle(document.body).backgroundColor;b.click();return[a,z,bg,d()]})()""")
      R[f'errors-{th}']=E;await c.close()
    # 4b exit at 60fps: rAF frame times through the 900ms dissolve, plus a video
    c,p,E=await ctxp(b,'dark',video=True)
    await p.goto(B+'?intro=1&gl=1');await p.wait_for_timeout(4500)
    await p.evaluate("window.__f=[];(function t(n){__f.push(n);if(__f.length<90)requestAnimationFrame(t)})(performance.now())");await p.wait_for_timeout(1700)
    R['intro-idle-frames']=await p.evaluate("(()=>{const f=__f;const d=f.slice(1).map((x,i)=>x-f[i]);return{frames:d.length,avg:d.reduce((a,b)=>a+b,0)/d.length,max:Math.max(...d)}})()")
    await p.evaluate("window.__f=[];(function t(n){__f.push(n);if(__f.length<200)requestAnimationFrame(t)})(performance.now())")
    await p.click('#goBuild');await p.wait_for_timeout(1600)
    f=await p.evaluate("(()=>{const f=__f;const d=f.slice(1).map((x,i)=>x-f[i]);return{frames:d.length,avg:d.reduce((a,b)=>a+b,0)/d.length,max:Math.max(...d),over25:d.filter(x=>x>25).length}})()")
    R['exit-frames']=f;await p.screenshot(path=S+'exit-end-dark.png');v=p.video;await c.close();import shutil;shutil.copy(await v.path(),'ops/screens/v13.3-live-exit.webm');R['exit-video']='ops/screens/v13.3-live-exit.webm'
    await b.close()
  print(json.dumps(R,indent=1));json.dump(R,open('qa-v13.3/live-check.json','w'),indent=1)
asyncio.run(main())
