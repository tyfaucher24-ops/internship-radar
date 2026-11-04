"""V18 Part 9 browser flows on mock Supabase: browse->apply, save survives refresh, tracker CSV,
'Include unchecked' toggle, empty state, delete account (typed DELETE, cloud rows + local storage gone),
SEO page JSON-LD validity, and screenshots to ops/screens/v18/. Usage: python3 tests/test_v18_flows.py http://localhost:8812"""
import sys,os,json,glob,re
sys.path.insert(0,os.path.dirname(__file__))
_h=open(os.path.join(os.path.dirname(__file__),'test_v17_ui.py')).read().split('\nwith sync_playwright() as pw:')[0];exec(_h)  # reuse the V17 harness (mock Supabase, ctx, sign_in)
from playwright.sync_api import sync_playwright
OUT='ops/screens/v18';os.makedirs(OUT,exist_ok=True)
R.clear()
with sync_playwright() as pw:
    b=pw.chromium.launch(args=['--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks'])
    for th in ('light',):
        for w in (1440,390):
            c=ctx(b,w,th);p=c.new_page();p.goto(URL);p.wait_for_timeout(1500);p.screenshot(path=f'{OUT}/start-{th}-{w}.png')
            p.goto(URL+'#db');ready(p);p.wait_for_timeout(800);p.screenshot(path=f'{OUT}/browse-{th}-{w}.png')
            for k in ('index','category/software-it'):
                p.goto(URL+f'data/seo/{k}.html');p.screenshot(path=f'{OUT}/seo-{k.replace("/","-")}-{w}.png')
            f=sorted(glob.glob('data/seo/company/*.html'),key=os.path.getsize)[-1]
            p.goto(URL+f);p.screenshot(path=f'{OUT}/seo-company-{w}.png');c.close()
    c=ctx(b,1280);p=c.new_page();p.goto(URL+'#db');ready(p)
    p.locator('#vl .card').first.click(position={'x':30,'y':20});p.wait_for_selector('#dbody a.btn-apply[href^="http"]',timeout=30000);p.screenshot(path=f'{OUT}/listing-drawer-1280.png');a=p.locator('#dbody a.btn-apply[href^="http"]').first;href=a.get_attribute('href')
    with c.expect_page() as np: a.click()
    ck('browse -> apply opens the employer link in a new tab',np.value.url.startswith('http') and href.startswith('http'),href)
    np.value.close();p.keyboard.press('Escape')
    sid=p.locator('#vl [data-act="save"]').first.get_attribute('data-id') or '';p.locator('#vl [data-act="save"]').first.click();p.wait_for_timeout(600)
    n=p.evaluate("()=>JSON.stringify(Store.get('tracker',[])).length");p.reload();ready(p)
    ck('save survives refresh',p.evaluate("()=>Store.get('tracker',[]).length")>0 and p.evaluate("()=>JSON.stringify(Store.get('tracker',[])).length")==n,n)
    p.evaluate("()=>go('tracker')");p.wait_for_timeout(500)
    with p.expect_download() as d: p.click('#tCsv')
    t=open(d.value.path()).read();ck('tracker CSV downloads with a header row',len(t.splitlines())>=1 and ',' in t.splitlines()[0],t[:80])
    p.evaluate("()=>go('db')");before=p.locator('#vl .card').count();p.check('#showUnchk');p.wait_for_timeout(600)
    ck('Include unchecked toggle sets the flag and persists',p.evaluate("()=>window.SHOW_UNCHECKED&&Store.get('showUnchk')===true"))
    p.fill('#q','zzqqxxnotajob');p.wait_for_timeout(1200)
    ck('empty state explains and offers Clear all filters',p.evaluate("()=>/Clear all filters/.test(document.body.innerText)"))
    c.close()
    c=ctx(b,1280);p=c.new_page();p.goto(URL);ready(p);sign_in(p,'v18del@test.dev')
    p.evaluate("()=>localStorage.setItem('idr_v18probe','1')")
    p.evaluate("()=>{document.getElementById('pmMenu').hidden=false;document.getElementById('acctBtn').click();document.querySelector('#acctDel').closest('details').open=true}");p.wait_for_timeout(500)
    p.screenshot(path=f'{OUT}/delete-1-account-dialog.png')
    p.fill('#acctDelTxt','DELETE');p.screenshot(path=f'{OUT}/delete-2-typed.png');p.click('#acctDel');p.wait_for_timeout(1200)
    p.screenshot(path=f'{OUT}/delete-3-done.png')
    ck('delete account: user gone from cloud, signed out, local keys wiped',not any(u['email']=='v18del@test.dev' for u in db.users.values()) and p.evaluate("()=>!Cloud.signedIn()&&localStorage.getItem('idr_v18probe')===null"))
    c.close();b.close()
bad=0;n=0
for f in glob.glob('data/seo/company/*.html'):
    for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>',open(f).read()):
        j=json.loads(m);n+=1;bad+=not all(k in j for k in('title','description','datePosted','hiringOrganization','jobLocation' if 'jobLocationType' not in j else 'jobLocationType'))
ck(f'JobPosting JSON-LD valid with required fields ({n} postings)',n>0 and bad==0,bad)
print('V18 FLOWS',sum(x for _,x in R),'/',len(R))
sys.exit(0 if all(x for _,x in R) else 1)
