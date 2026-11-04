"""V18: renders assets/og-share.png (1200x630) from HTML. No counts, so it never goes stale."""
from playwright.sync_api import sync_playwright
import os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H='''<html><head><style>@font-face{font-family:G;src:url(file://%s/assets/geist-latin.woff2)}
body{margin:0;width:1200px;height:630px;background:#f6f7fb;font-family:G,system-ui;color:#14172b;display:flex}
.l{padding:84px 80px;flex:1;display:flex;flex-direction:column;justify-content:center}
.k{font-size:22px;letter-spacing:.08em;color:#4b5168;font-weight:600}.k b{display:inline-block;width:12px;height:12px;border-radius:50%%;background:#047857;margin-right:12px}
h1{font-size:72px;line-height:1.05;margin:22px 0;font-weight:700;letter-spacing:-.02em}p{font-size:28px;color:#374151;margin:0}
.r{width:400px;background:#fff;border-left:1px solid #e3e6ef;padding:70px 40px;display:flex;flex-direction:column;gap:16px;justify-content:center}
.c{border:1px solid #e3e6ef;border-radius:12px;padding:16px 18px}.t{height:14px;border-radius:7px;background:#d8dbe8;width:80%%}.s{height:10px;border-radius:5px;background:#eef0f5;width:55%%;margin-top:10px}
.g{float:right;font:600 18px ui-monospace,monospace;color:#047857}</style></head><body>
<div class="l"><div class="k"><b></b>INTERN INDEX</div><h1>Every open US internship, links checked.</h1><p>Search, match and track. Free for students.</p></div>
<div class="r"><div class="c"><span class="g">NEW</span><div class="t"></div><div class="s"></div></div><div class="c"><span class="g" style="color:#8a5a00">5 DAYS</span><div class="t" style="width:70%%"></div><div class="s"></div></div><div class="c"><span class="g">NEW</span><div class="t" style="width:62%%"></div><div class="s" style="width:40%%"></div></div></div></body></html>'''%R
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1200,'height':630});pg.set_content(H);pg.wait_for_timeout(400)
    pg.screenshot(path=os.path.join(R,'assets','og-share.png'));b.close()
