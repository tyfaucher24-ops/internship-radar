"""V12.1 dark-mode screenshots from a fresh browser (default: LIVE). Usage: python3 ops/screens_v121.py [BASE]"""
import json,sys
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'https://tyfaucher24-ops.github.io/internship-radar/'
O='ops/screens/v12.1-'
TY=dict(json.load(open('test/personas.json'))['ty_queens'],v=6,savedAt='2026-10-22T12:00:00Z')
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(bypass_csp=True,viewport={'width':1440,'height':900})
    pg.goto(B);pg.wait_for_timeout(2500);print('dark default:',pg.evaluate("document.documentElement.classList.contains('dark')"))
    pg.screenshot(path=O+'intro-dark.png')
    pg.evaluate("p=>{localStorage.clear();localStorage.setItem('idr_profile',JSON.stringify(p))}",TY);pg.reload();pg.click('#goFind')
    pg.wait_for_selector('.card .mbadge',timeout=60000);pg.wait_for_timeout(2500)
    pg.screenshot(path=O+'home-dark.png')
    pg.locator('.site-header').screenshot(path=O+'header-dark.png')
    pg.locator('#hdrCount').screenshot(path=O+'live-bar-dark.png')
    print('bar:',pg.evaluate("(()=>{const e=document.getElementById('hdrCount');return {text:e.innerText.replace(/\\n/g,' | '),title:e.querySelector('.qbadge')?.title,num_px:getComputedStyle(e.querySelector('.q b')).fontSize,h:e.offsetHeight,overflow:e.scrollWidth>e.clientWidth}})()"))
    for i in range(6):
        pg.locator('.card').nth(i).click();pg.wait_for_timeout(1500)
        if pg.locator('#drawer .fbp').count() and pg.locator('#dDesc li, #dDesc p').count():break
        pg.keyboard.press('Escape');pg.wait_for_timeout(300)
    pg.screenshot(path=O+'detail-modal-dark.png')
    pg.locator('#drawer .fbp').first.screenshot(path=O+'panel-dark.png')
    pg.locator('#dDesc').scroll_into_view_if_needed();pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('#dDesc').previousElementSibling.scrollIntoView({block:'start'})");pg.wait_for_timeout(300)
    pg.screenshot(path=O+'description-dark.png')
    pg.keyboard.press('Escape');pg.wait_for_timeout(300)
    for i in range(4):pg.locator('.card .btn-save:not(.on)').first.click();pg.wait_for_timeout(250)
    pg.goto(B+'#tracker');pg.wait_for_timeout(2500)
    print('tracker:',pg.evaluate("(()=>{const s=document.querySelector('#t-tracker .tscroll')||document.querySelector('#t-tracker .sheet').parentElement;const td=document.querySelector('#tTable td');const c=document.querySelector('.tcust');return {hscroll:s.scrollWidth>s.clientWidth+1,row:td&&td.getBoundingClientRect().height,fs:td&&getComputedStyle(td).fontSize,sticky:getComputedStyle(document.querySelector('#tTable th')).position,tabs:!!document.getElementById('tSeg'),cust_h:c&&c.offsetHeight}})()"))
    pg.screenshot(path=O+'tracker-dark.png')
    pg.goto(B+'#profile');pg.wait_for_timeout(2500);pg.screenshot(path=O+'profile-dark.png')
    m=b.new_page(bypass_csp=True,viewport={'width':390,'height':844});m.goto(B);m.evaluate("p=>{localStorage.clear();localStorage.setItem('idr_profile',JSON.stringify(p))}",TY);m.reload();m.click('#goFind');m.wait_for_selector('.card .mbadge',timeout=60000);m.wait_for_timeout(2000)
    m.screenshot(path=O+'home-dark-390.png');print('390 bar overflow:',m.evaluate("(()=>{const e=document.getElementById('hdrCount');return e.scrollWidth>e.clientWidth||document.documentElement.scrollWidth>innerWidth})()"))
    b.close()
