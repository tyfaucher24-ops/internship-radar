"""V21.2 Find page: the Live pill replaces every sync timestamp.

Cases: no timestamp text on Find, the pill shows when the sync is fresh,
the pill is hidden when the sync is stale, reduced motion keeps the glow
without a pulse, and axe (WCAG 2 A/AA) is clean on Find.

Run: python3 tests/test_v21_2_livepill.py
"""
import datetime, json, os, re, subprocess, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
ok = 0
n = 0

def t(c, m, info=''):
    global ok, n
    n += 1
    ok += bool(c)
    print(('PASS ' if c else 'FAIL ') + m + ('' if c or not info else ' ' + str(info)[:400]), flush=True)

A = open('app.js').read()
TK = open('ticker.js').read()
UI = open('ui22.js').read()
CSS = open('site.css').read()

# --- shared helper, fresh vs stale (no browser) ---
bits = [re.search(p, A) for p in (r'const LIVE_MAX_MIN=60;const syncFresh=.*', r'function logStale\(iso\)\{.*\}', r'const liveBadge=.*')]
t(all(bits), 'liveBadge helper is present in app.js')
src = '\n'.join(b.group(0) for b in bits)
node = subprocess.run(['node', '-e', src + r"""
const fixed=Date.parse('2026-11-13T12:00:00Z');
Date.now=()=>fixed;
const fresh=liveBadge('2026-11-13T11:55:00Z'), stale=liveBadge('2026-11-13T10:30:00Z'), empty=liveBadge('');
const edge=liveBadge('2026-11-13T11:00:00Z'), over=liveBadge('2026-11-13T10:59:00Z');
const short=liveBadge('2026-11-13T11:55');
console.log(JSON.stringify({fresh,stale,empty,edge,over,short,max:LIVE_MAX_MIN}));
"""], capture_output=True, text=True, timeout=30)
out = (node.stdout or '').strip() or node.stderr.strip()
try:
    r = json.loads(out.splitlines()[-1])
except Exception:
    r = {}
t(r.get('max') == 60, 'LIVE_MAX_MIN stays 60', out)
pill = r.get('fresh') or ''
t(pill.startswith('<span class="live-b"') and pill.endswith('>Live</span>') and 'aria-label="Listings are live"' in pill and 'class="live-dot"' in pill and pill.find('live-dot') < pill.find('>Live<'), 'fresh sync renders the Live pill, dot left of the word', pill)
t(r.get('stale') == '' and r.get('empty') == '', 'stale or missing sync renders nothing (no time)', r)
t('Live' in (r.get('edge') or '') and r.get('over') == '', 'sync at LIVE_MAX_MIN is fresh; one minute older is hidden', (r.get('edge'), r.get('over')))
t('Live' in (r.get('short') or ''), '16-char sync stamps are read as UTC', r.get('short'))

# --- one helper, three call sites; no clock left on Find ---
t('liveBadge(META.updated)' in A and "getElementById('dUpd')" in A, 'header count and #dUpd use liveBadge')
t("liveBadge(t)" in TK and 'tk-tm' not in TK and 'toLocaleTimeString' not in TK, 'ticker asOf uses liveBadge and no longer prints a clock')
t('paintLive' in UI and 'liveBadge(isoT)' in UI and 'toLocaleTimeString' not in UI and 'Live · updated' not in UI, 'Find hero paints liveBadge and no "updated" clock')
t('const liveTag=' not in A and 'live-dot-only' not in A, 'the old dot-only tag is gone')

# --- glow is a real box-shadow, and reduced motion only stops the pulse ---
dot = re.search(r'\.live-dot\{([^}]+)\}', CSS)
t(dot and 'background:#059669' in dot.group(1) and 'box-shadow:' in dot.group(1) and 'animation:livePulse' in dot.group(1), 'dot is green, glowing, and pulses', dot.group(1) if dot else '')
t('@keyframes livePulseDark' in CSS and 'animation-name:livePulseDark' in CSS and 'background:#4ade80' in CSS, 'dark theme keeps a green glowing dot')
flat = re.sub(r'\s+', '', CSS)
t('@media(prefers-reduced-motion:reduce){.live-dot{animation:none!important}}' in flat, 'reduced motion disables the pulse')
t('box-shadow:0 0 0 3px rgba(5,150,105,.32)' in CSS and 'box-shadow:none' not in dot.group(1), 'the glow is on the dot itself, so it survives when the animation stops')

# --- browser: Find page, both themes, axe ---
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

httpd = ThreadingHTTPServer(('127.0.0.1', 0), Quiet)
port = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{port}/'

def iso_age(m):
    return (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=m)).strftime('%Y-%m-%dT%H:%M:%SZ')

TIME = re.compile(r'(\b\d+\s*(?:sec|secs|seconds|min|mins|minutes|hours?|hrs?|days?)\s+ago\b|\bjust now\b|\bas of\b|\bupdated\b|\b\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)\b|\d{4}-\d{2}-\d{2}T\d{2}:\d{2})', re.I)

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    t(False, 'playwright is installed')
    print(f'{ok}/{n} passed')
    sys.exit(1)

SHOT = os.path.join(ROOT, 'ops', 'screens', 'v21.2')
os.makedirs(SHOT, exist_ok=True)

def arm(page, age):
    def h(route):
        resp = route.fetch()
        m = resp.json()
        m['updated'] = iso_age(age)
        route.fulfill(status=200, content_type='application/json', body=json.dumps(m))
    page.route(re.compile(r'.*/data/meta\.json.*'), h)

def wait_ready(page):
    page.wait_for_function("()=>typeof liveBadge==='function'&&document.querySelector('#vl .card')", timeout=90000)
    page.wait_for_function("()=>{const u=document.getElementById('fxUpd');return u&&(u.dataset.mode==='on'||u.dataset.mode==='off')}", timeout=20000)

def open_find(br, age, w=1280, h=900, reduced=False):
    ctx = br.new_context(viewport={'width': w, 'height': h}, reduced_motion='reduce' if reduced else 'no-preference', color_scheme='light')
    ctx.add_init_script("localStorage.setItem('idr_intro_seen','1');localStorage.setItem('ir_ui',JSON.stringify({theme:'light'}));")
    page = ctx.new_page()
    arm(page, age)
    page.goto(URL, wait_until='domcontentloaded')
    wait_ready(page)
    if age <= 60:
        page.wait_for_function("()=>document.querySelector('#tkAsOf .live-b')&&document.querySelector('#fxUpd .live-b')&&document.querySelector('#hdrCount .live-b')", timeout=20000)
    else:
        page.wait_for_function("()=>{const u=document.getElementById('fxUpd');const a=document.getElementById('tkAsOf');return u&&u.dataset.mode==='off'&&a&&!a.querySelector('.live-b')}", timeout=20000)
    return ctx, page

def visible_text(page):
    return page.evaluate("()=>document.getElementById('t-db').innerText")

def pill_state(page):
    return page.evaluate("""()=>{
      const grab=sel=>{const b=document.querySelector(sel);if(!b)return null;
        const dot=b.querySelector('.live-dot');const cs=dot?getComputedStyle(dot):null;
        const r=b.getBoundingClientRect();
        return {text:(b.textContent||'').trim(),label:b.getAttribute('aria-label'),
          dotBefore:!!(dot&&b.innerHTML.indexOf('live-dot')<b.innerHTML.indexOf('Live')),
          shown:r.width>8&&r.height>8&&cs&&getComputedStyle(b).display!=='none',
          bg:cs&&cs.backgroundColor,shadow:cs&&cs.boxShadow,anim:cs&&cs.animationName}};
      const eb=document.querySelector('#t-db .fx-eb');
      const du=document.getElementById('dUpd')||document.body.appendChild(Object.assign(document.createElement('span'),{id:'dUpd'}));
      if(typeof hdrCount==='function')hdrCount();
      return {hero:grab('#fxUpd .live-b'),ticker:grab('#tkAsOf .live-b'),header:grab('#hdrCount .live-b'),
        dupd:(du.textContent||'').trim(),dupdHtml:du.innerHTML,mode:(document.getElementById('fxUpd')||{}).dataset.mode,
        ebHidden:!!(eb&&eb.hidden)};
    }""")

def green(rgb):
    m = re.search(r'rgba?\(([^)]+)\)', rgb or '')
    if not m:
        return False
    p = [float(x) for x in m.group(1).split(',')[:3]]
    return p[1] > p[0] + 30 and p[1] > p[2] and p[1] > 80

with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx, page = open_find(br, 5)
    st = pill_state(page)
    body = visible_text(page)
    t(st['mode'] == 'on' and st['hero'] and st['hero']['text'] == 'Live' and st['hero']['label'] == 'Listings are live' and st['hero']['dotBefore'] and st['hero']['shown'], 'fresh: Find hero shows the Live pill', st['hero'])
    t(st['ticker'] and st['ticker']['text'] == 'Live' and st['ticker']['label'] == 'Listings are live' and st['ticker']['shown'] and st['ticker']['dotBefore'], 'fresh: ticker shows the same pill', st['ticker'])
    t(st['header'] and st['header']['text'] == 'Live' and st['header']['label'] == 'Listings are live' and st['header']['dotBefore'], 'fresh: header count renders the same pill', st['header'])
    t(st['dupd'] == 'Live' and 'live-b' in st['dupdHtml'] and not TIME.search(st['dupdHtml']), 'fresh: #dUpd is the pill, not a time', st['dupdHtml'])
    t(not TIME.search(body), 'fresh: no timestamp text on Find', TIME.search(body).group(0) if TIME.search(body) else '')
    t(green(st['hero']['bg']) and st['hero']['shadow'] and st['hero']['shadow'] != 'none' and 'livePulse' in (st['hero']['anim'] or ''), 'fresh light: green dot, glow, and pulse', st['hero'])
    # same pill markup in all three slots
    same = page.evaluate("""()=>['#fxUpd .live-b','#tkAsOf .live-b','#hdrCount .live-b'].map(s=>document.querySelector(s).outerHTML)""")
    t(len(set(same)) == 1, 'hero, ticker and header render identical pill markup', same)

    page.evaluate("()=>document.documentElement.classList.add('dark')")
    page.wait_for_timeout(400)
    dark = pill_state(page)['hero']
    t(green(dark['bg']) and dark['shadow'] and dark['shadow'] != 'none' and dark['anim'] == 'livePulseDark', 'dark theme: green glow uses the dark pulse', dark)
    page.screenshot(path=os.path.join(SHOT, 'find-live-1280-dark.png'))
    page.evaluate("()=>document.documentElement.classList.remove('dark')")
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(SHOT, 'find-live-1280-light.png'))

    page.emulate_media(reduced_motion='reduce')
    page.wait_for_timeout(50)
    rm = pill_state(page)['hero']
    t(rm and rm['anim'] == 'none' and rm['shadow'] and rm['shadow'] != 'none' and green(rm['bg']) and rm['shown'], 'reduced motion: glow stays, pulse stops', rm)

    def axe(pg, tag):
        if not pg.evaluate("()=>!!window.axe"):
            pg.add_script_tag(url='https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js')
        v = pg.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations.map(v=>v.id+':'+v.impact+':'+v.nodes.length+':'+v.nodes[0].target.join(' '))}")
        t(not v, 'axe 0 ' + tag, v)
    page.emulate_media(reduced_motion='no-preference')
    page.set_viewport_size({'width': 1280, 'height': 900})
    # Let colour and reveal transitions finish, then mark off-screen rows revealed so axe reads the real colours.
    def settle():
        page.evaluate("()=>document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'))")
        page.wait_for_timeout(700)
    settle()
    axe(page, 'Find 1280 light')
    page.evaluate("()=>document.documentElement.classList.add('dark')")
    settle()
    axe(page, 'Find 1280 dark')
    page.evaluate("()=>document.documentElement.classList.remove('dark')")
    page.set_viewport_size({'width': 390, 'height': 844})
    settle()
    mob = page.evaluate("""()=>{const b=document.querySelector('#fxUpd .live-b');const r=b?b.getBoundingClientRect():{width:0,height:0};
      return {shown:!!(b&&r.width>8&&r.height>8),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        text:document.getElementById('t-db').innerText};}""")
    t(mob['shown'] and mob['overflow'] <= 1 and not TIME.search(mob['text'] or ''), 'mobile 390: Live pill usable, no sideways scroll, no timestamp', mob)
    axe(page, 'Find 390 light')
    ctx.close()

    ctx, page = open_find(br, 90)
    st = pill_state(page)
    body = visible_text(page)
    t(st['mode'] == 'off' and not st['hero'] and not st['ticker'] and not st['header'] and st['ebHidden'], 'stale: pill hidden on hero, ticker and header', st)
    t(st['dupd'] == '' and 'Live' not in (st['dupdHtml'] or ''), 'stale: #dUpd is empty', st['dupdHtml'])
    t(not TIME.search(body) and not re.search(r'\bLive\b', body or ''), 'stale: no pill and no timestamp text on Find', (TIME.search(body).group(0) if TIME.search(body) else '', body[:180] if re.search(r'\bLive\b', body or '') else ''))
    log = page.evaluate("()=>JSON.parse(localStorage.getItem('liveStaleLog')||'[]')")
    t(len(log) >= 1, 'stale sync is logged, not shown', log)
    ctx.close()
    br.close()

httpd.shutdown()
print(f'{ok}/{n} passed')
sys.exit(0 if ok == n else 1)
