"""Scores the resume parser on the TEST FIXTURE set, through the site's real file reader (pdf.js / mammoth) in a browser.
Usage: python3 test/resumes/score.py [BASE_URL] -> per-field accuracy + misses. Exit 1 if overall < 98%."""
import os,sys,json,re
sys.path.insert(0,os.path.dirname(__file__));import importlib;F=importlib.import_module(os.environ.get('FIX','fixtures')).F
from playwright.sync_api import sync_playwright
B=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/'
FIELDS=['name','school','degree','major','minor','classYear','gpa','workAuth','skills','experience']
n=lambda s:re.sub(r'[^a-z0-9&]+',' ',str(s or '').lower()).strip()
DEGN=lambda s:n(s).replace(' ','')
def ok(k,exp,got):
    if k=='skills':
        g=[n(x) for x in got or []];return all(n(e) in g for e in exp) and all(len(x)<40 for x in got or [])
    if k=='experience':
        txt=' | '.join(n((x.get('title') or '')+' '+(x.get('org') or '')) for x in got or []);return all(n(e) in txt for e in exp) and len(got or [])<=len(exp)+1
    if k=='degree':return DEGN(exp)==DEGN(got)
    if k=='gpa':return (exp=='' and not got) or (got not in ('',None) and abs(float(got)-float(exp))<0.001)
    return n(exp)==n(got)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();pg.goto(B+'#profile');pg.wait_for_timeout(2500)
    pg.evaluate("fetch('data/schools.json').then(r=>r.json()).then(a=>{window._SCHOOLS=a;try{SCHOOLS=a}catch(e){}})");pg.wait_for_timeout(800)
    res={k:[0,0] for k in FIELDS};miss=[];flags={}
    for f in F:
        fn=[x for x in os.listdir(os.path.join(os.path.dirname(__file__),'files')) if x.startswith('TEST_'+f['id']+'.')][0]
        R=pg.evaluate("""async fn=>{const r=await fetch('test/resumes/files/'+fn);const b=await r.blob();const t=await readFile(new File([b],fn));return parseResume(t)}""",fn)
        flags[f['id']]=R.get('review',[])
        for k in FIELDS:
            e=f['expect'][k];g=R.get(k);good=ok(k,e,g);res[k][0]+=good;res[k][1]+=1
            if not good:miss.append((f['id'],k,e,g if k not in('experience',) else [ (x.get('title'),x.get('org')) for x in g or []]))
    tot=sum(v[0] for v in res.values());al=sum(v[1] for v in res.values())
    for k,v in res.items():print(f'{k:11s} {v[0]}/{v[1]}  {100*v[0]/v[1]:.1f}%')
    print(f'OVERALL {tot}/{al} = {100*tot/al:.1f}%')
    for m in miss:print('MISS',*m)
    print('REVIEW FLAGS',json.dumps({k:v for k,v in flags.items() if v}))
    json.dump({'fields':res,'overall':tot/al,'misses':miss},open('/tmp/parse_score.json','w'),default=str)
    sys.exit(0 if tot/al>=.98 else 1)
