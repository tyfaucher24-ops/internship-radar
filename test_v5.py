import sys,json,time
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/';SS='/workspace/internship-radar/screenshots/'
engines=sys.argv[2].split(',') if len(sys.argv)>2 else ['chromium']
out={}
def run(pg,tag):
  E=[];pg.on('pageerror',lambda e:E.append('PAGEERR '+str(e)[:200]));pg.on('console',lambda m:E.append(m.text[:200]) if m.type=='error' else None)
  pg.add_init_script("localStorage.setItem('idr_introSeen','true')");pg.goto(B+'#find');pg.wait_for_function('window._interactiveAt',timeout=30000);r={'interactive_ms':round(pg.evaluate('window._interactiveAt'))}
  for k in ['cat','cy','dlw']:
    pg.click(f'[data-pill={k}]');pg.wait_for_timeout(250);pg.locator('.fpanel .cb-o').nth(1).click();pg.wait_for_timeout(150);pg.click('.fpanel [data-apply]')
  r['after_pills']=pg.inner_text('#count');r['filter_ms']=round(pg.evaluate('window._lastFilterMs'),1)
  pg.click('[data-pill=loc]');pg.wait_for_timeout(200);pg.locator('.fpanel .cb-o').first.click();pg.wait_for_timeout(150);pg.click('.fpanel [data-clear]')
  pg.click('[data-pill=more]');pg.wait_for_timeout(300);pg.locator('.mf-l[data-k=paid] .cb-o').first.click();pg.wait_for_timeout(200);pg.screenshot(path=SS+f'v5-morefilters-{tag}.png');pg.click('#mfDone')
  r['chips']=pg.evaluate("document.querySelectorAll('#chips .chip').length");pg.locator('#chips .chip').first.click();pg.click('#chips .clear');r['cleared']=pg.inner_text('#count')
  for s in ['deadline','match','az','new']: pg.select_option('#sort',s)
  pg.fill('#q','analyst');pg.wait_for_timeout(400);r['search']=pg.inner_text('#count')
  pg.click('#mapBtn');pg.wait_for_timeout(2500);r['map_dots']=pg.evaluate("document.querySelectorAll('#mdots circle').length");pg.click('#mapBtn')
  pg.locator('#vl .card').first.click();pg.wait_for_timeout(900);r['drawer_desc']=len(pg.inner_text('#dDesc'));r['apply']=pg.evaluate("!!document.querySelector('#dAct a.btn')");pg.screenshot(path=SS+f'v5-drawer-{tag}.png')
  pg.click('#dAct [data-act=save]');pg.wait_for_timeout(400);pg.click('#dx');pg.wait_for_timeout(300)
  pg.locator('#vl .card [data-act=save]').first.click();pg.wait_for_timeout(300);r['trk']=pg.inner_text('#trkN')
  for t in ['tracker','profile','about','contact','privacy','db']:
    pg.click(f'.nav [data-t={t}]' if t in('db','tracker','profile') else f'.site-footer [data-go={t}]');pg.wait_for_timeout(250);r['page_'+t]=pg.evaluate(f"!document.getElementById('t-{t}').hidden")
  pg.click('#pmBtn');pg.wait_for_timeout(100)
  with pg.expect_download() as d: pg.click('#exp')
  pg.click('#addBtn');pg.wait_for_timeout(200);pg.click('#mx');pg.click('#seenBtn');pg.wait_for_timeout(200);pg.fill('#seenForm [name=company]','Acme');pg.click('#seenForm button');r['seen']='Thanks' in pg.inner_text('#mbody');pg.click('#mx')
  r['errors']=E;return r
with sync_playwright() as p:
  for en in engines:
    bt=getattr(p,en);b=bt.launch()
    for tag,kw in [('desktop',dict(viewport={'width':1440,'height':900})),('mobile',dict(viewport={'width':390,'height':844},is_mobile=en!='firefox',has_touch=True,device_scale_factor=2))]:
      ctx=b.new_context(bypass_csp=True,accept_downloads=True,**kw);pg=ctx.new_page()
      try: out[f'{en}-{tag}']=run(pg,f'{en}-{tag}')
      except Exception as e: out[f'{en}-{tag}']={'FAIL':str(e)[:600]}
      ctx.close()
    b.close()
print(json.dumps(out,indent=1))
