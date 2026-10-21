"""Builds the TEST FIXTURE resume files (txt/docx/pdf/2-column pdf) from fixtures.py. Fictional people only."""
import os,sys,html,re
sys.path.insert(0,os.path.dirname(__file__));import importlib;F=importlib.import_module(os.environ.get('FIX','fixtures')).F
from docx import Document
from playwright.sync_api import sync_playwright
D=os.path.join(os.path.dirname(__file__),'files');os.makedirs(D,exist_ok=True)
HEADS=re.compile(r'^(EDUCATION|EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|RESEARCH EXPERIENCE|SKILLS|TECHNICAL SKILLS|PROJECTS|LEADERSHIP|ACTIVITIES|ATHLETICS|SUMMARY)$',re.I)
def blocks(t):
    L=t.split('\n');top=[];secs=[];cur=None
    for l in L:
        if HEADS.match(l.strip()):cur=[l,[]];secs.append(cur)
        elif cur:cur[1].append(l)
        else:top.append(l)
    return top,secs
def h(t,two=False):
    top,secs=blocks(t);e=html.escape
    def sec(s):return f'<h2>{e(s[0])}</h2>'+''.join(f'<p>{e(x)}</p>' for x in s[1])
    css='body{font:11pt Helvetica,Arial,sans-serif;margin:40px}h1{font-size:18pt;margin:0}h2{font-size:11pt;border-bottom:1px solid #000;margin:14px 0 4px;text-transform:uppercase}p{margin:2px 0}.g{display:grid;grid-template-columns:34% 1fr;gap:28px}'
    head=f'<h1>{e(top[0])}</h1>'+''.join(f'<p>{e(x)}</p>' for x in top[1:])
    if not two:return f'<style>{css}</style>{head}'+''.join(sec(s) for s in secs)
    left=[s for s in secs if re.match(r'(EDUCATION|SKILLS|TECHNICAL SKILLS|ATHLETICS|ACTIVITIES)',s[0],re.I)];right=[s for s in secs if s not in left]
    return f'<style>{css}</style>{head}<div class="g"><div>{"".join(sec(s) for s in left)}</div><div>{"".join(sec(s) for s in right)}</div></div>'
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page()
    for f in F:
        base=os.path.join(D,'TEST_'+f['id'])
        if f['fmt']=='txt':open(base+'.txt','w').write(f['text'])
        elif f['fmt']=='docx':
            d=Document()
            for l in f['text'].split('\n'):d.add_paragraph(l)
            d.save(base+'.docx')
        else:
            pg.set_content(h(f['text'],f['fmt']=='pdf2col'));pg.pdf(path=base+'.pdf',format='Letter')
print('built',len(F))
