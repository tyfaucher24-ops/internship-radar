from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch();c=b.new_context();pg=c.new_page()
    pg.on('framenavigated',lambda f:print('nav',f.url) if f==pg.main_frame else 0)
    pg.on('console',lambda m:print('con',m.text[:100]))
    pg.goto('http://localhost:8812/#find');pg.wait_for_timeout(3000)
    open('/tmp/cb/which','w').write('B')
    pg.close();pg=c.new_page();pg.goto('http://localhost:8812/#find');pg.wait_for_timeout(6000)
    print(pg.evaluate("[window.BUILD,!!window.__BUILD_B,location.href]"))
    b.close()
