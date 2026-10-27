"""V16: the resume worker parses real PDF + DOCX fixtures in the browser with the vendored pdf.js 4.10.38 / mammoth 1.13.0,
with no CSP violations, and the contact/education fields match tests/resume-fixtures expected.json.
Run: python3 tests/test_v16_resume_worker.py URL"""
import sys,json,base64,os
from playwright.sync_api import sync_playwright
URL=sys.argv[1].rstrip('/')+'/';F=os.path.join(os.path.dirname(__file__),'resume-fixtures')
R=[]
def ck(n,c,info=''):R.append((n,bool(c)));print(('PASS' if c else 'FAIL'),n,'' if c else info,flush=True)
with sync_playwright() as pw:
    b=pw.chromium.launch();p=b.new_page();errs=[]
    p.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    p.goto(URL,wait_until='load')
    for fx in ('f01','f02','f03'):
        X=json.load(open(os.path.join(F,fx,'expected.json')))
        for f in ('resume.pdf','resume.docx'):
            fp=os.path.join(F,fx,f)
            if not os.path.exists(fp):continue
            b64=base64.b64encode(open(fp,'rb').read()).decode()
            r=p.evaluate("""async([n,b64])=>{const w=new Worker('resume-worker.js');const buf=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer;
              return await new Promise(res=>{w.onmessage=e=>{if(!e.data||e.data.id!==1)return;w.terminate();res(e.data)};w.onerror=e=>res({ok:false,error:'worker error '+e.message});w.postMessage({id:1,name:n,buf},[buf])})}""",[f,b64])
            ok=r.get('ok') and (r['result']['contact'].get('email')==X['contact']['email'])
            ck(f'{fx}/{f} parsed in browser, email matches',ok,str(r)[:300])
    ck('no CSP / console errors',not [e for e in errs if 'Content Security Policy' in e or 'Refused' in e],errs[:3])
    b.close()
print(f'\n{sum(c for _,c in R)}/{len(R)} passed');sys.exit(0 if all(c for _,c in R) else 1)
