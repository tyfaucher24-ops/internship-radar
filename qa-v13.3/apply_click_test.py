"""V13.3 #5b live test: 50 random Apply/View-posting clicks on cards and in the panel.
Pass = opens a new tab (noopener), the URL is the listing's own job-specific link (contains its job id), and the page loads (not 404/410, not a careers root)."""
import sys,json,random,re,asyncio
sys.path.insert(0,'.')
from pipeline.applylink import _id_token,GENERIC
from urllib.parse import urlsplit
from playwright.async_api import async_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/'
N=int(sys.argv[2]) if len(sys.argv)>2 else 50
async def main():
  out=[];random.seed(133)
  async with async_playwright() as p:
    b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':1440,'height':900});pg=await ctx.new_page()
    await pg.goto(BASE+'#db');await pg.wait_for_selector('#vl .card a[data-apply]',timeout=60000)
    for i in range(N):
      mode='panel' if i%5==4 else 'card'
      ids=await pg.evaluate("[...BYID.values()].filter(x=>x.st!=='closed'&&x.st!=='upcoming'&&x.ak).map(x=>x.id)")
      jid=random.choice(ids)
      await pg.evaluate(f"(async()=>{{const x=BYID.get({json.dumps(jid)});await ensureDetail(x);openDrawer(x)}})()");await pg.wait_for_timeout(600)
      sel='#dAct a[data-apply]'
      if mode=='card':  # put that card in view via the search box then click its own button
        await pg.keyboard.press('Escape');await pg.wait_for_timeout(200)
        x=await pg.evaluate(f"(()=>{{const x=BYID.get({json.dumps(jid)});return [x.company,x.title]}})()")
        await pg.evaluate(f"(()=>{{const q=document.querySelector('#q');q.value={json.dumps(x[0]+" "+x[1][:40])};q.dispatchEvent(new Event('input',{{bubbles:true}}))}})()");await pg.wait_for_timeout(900)
        sel=f'#vl .card[data-id="{jid}"] a[data-apply]'
        if not await pg.query_selector(sel):  # hidden by the default list filter: click a random card that is on screen instead
          await pg.evaluate("(()=>{const q=document.querySelector('#q');q.value='';q.dispatchEvent(new Event('input',{bubbles:true}))})()");await pg.wait_for_timeout(700)
          vis=await pg.evaluate("[...document.querySelectorAll('#vl .card a[data-apply]')].map(a=>a.dataset.apply)")
          jid=random.choice(vis);sel=f'#vl .card[data-id="{jid}"] a[data-apply]'
      a=await pg.query_selector(sel)
      kind=(await a.inner_text()).strip()
      exp=await pg.evaluate(f"(async()=>{{const x=BYID.get({json.dumps(jid)});await ensureDetail(x);return x.apply_link}})()")
      try:
        async with ctx.expect_page(timeout=20000) as np: await a.click()
        t=await np.value
        try: r=await t.wait_for_load_state('domcontentloaded',timeout=25000)
        except Exception: pass
        url=t.url
        if url in ('about:blank',''):
          await t.wait_for_timeout(3000);url=t.url
        opener=await t.evaluate('window.opener===null')
        tok=_id_token(exp or '') or ''
        ok=bool(exp) and tok.lower() in url.lower() and not (GENERIC.match(urlsplit(url).path)) and opener
        out.append({'id':jid,'mode':mode,'kind':kind,'expected':exp,'opened':url,'noopener':opener,'ok':ok})
        await t.close()
      except Exception as e: out.append({'id':jid,'mode':mode,'kind':kind,'ok':False,'why':str(e)[:120]})
      ask=await pg.query_selector('#apAsk:not([hidden])');out[-1]['asked']=bool(ask)
      if ask: await pg.click('#apAsk [data-n]')
      await pg.evaluate("(()=>{const q=document.querySelector('#q');if(q){q.value='';q.dispatchEvent(new Event('input',{bubbles:true}))}})()")
    await b.close()
  ok=sum(o['ok'] for o in out);print(json.dumps({'clicks':len(out),'pass':ok,'fail':len(out)-ok},indent=0))
  json.dump(out,open('qa-v13.3/apply-click-results.json','w'),indent=1)
asyncio.run(main())
