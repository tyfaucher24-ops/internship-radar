#!/usr/bin/env python3
"""Cache-busting: hash the site's code/assets, stamp ?v=<hash> on every local
script, stylesheet, font and image ref in index.html and CSS, set window.BUILD,
and write version.json. Run before each push (the pre-commit hook does it).
Data files are versioned separately by data/meta.json `updated` (see DV() in app.js)."""
import hashlib, json, re, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent
FILES = sorted([*R.glob('*.js'), *R.glob('*.css'), R/'index.html', *R.glob('assets/*.woff2'),
                R/'config.json', R/'match-weights.json'])
V = re.compile(r'\?v=[0-9a-f]{10}')
h = hashlib.sha1()
for f in FILES:
    if f.exists():
        b = f.read_bytes()
        if f.suffix in ('.html', '.css'):
            b = V.sub('', b.decode()).encode()
            b = re.sub(rb"window\.BUILD='[0-9a-f]*'", b'', b)
        h.update(f.name.encode() + b)
B = h.hexdigest()[:10]
LOCAL = r'''((?:src|href)="|url\()((?!https?:|data:|#)[^"')?]+\.(?:js|css|woff2|webp|svg|png|ico|webmanifest|json))(?:\?v=[0-9a-f]{10})?'''
def stamp(t): return re.sub(LOCAL, lambda m: f'{m.group(1)}{m.group(2)}?v={B}', t)
ch = []
for f in [R/'index.html', *R.glob('*.css')]:
    t = f.read_text(); n = stamp(t)
    if f.name == 'index.html':
        n = re.sub(r"window\.BUILD='[0-9a-f]*'", f"window.BUILD='{B}'", n)
    if n != t: f.write_text(n); ch.append(f.name)
vj = R/'version.json'; nv = json.dumps({'build': B}) + '\n'
if not vj.exists() or vj.read_text() != nv: vj.write_text(nv); ch.append('version.json')
print(B, *ch)
