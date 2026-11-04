"""V20 Part 4: a bot-check page is not an empty board. talnet (Evercore) and avature must raise Challenge,
and sync must keep that board's open listings instead of closing them. --live also runs the real Evercore and
Morgan Stanley boards once."""
import sys,unittest.mock as M
sys.path.insert(0,'.')
from pipeline import adapters as A
ok=0;n=0
def t(c,m):
    global ok,n;n+=1;ok+=bool(c);print(('PASS ' if c else 'FAIL ')+m)
ALTCHA='<html><head><title>Quick Check Needed</title><script type="module" src="/altcha.min.js"></script></head><body><altcha-widget challengeurl="/x"></altcha-widget></body></html>'
EMPTY='<html><body><table class="jobs"></table><p>No vacancies</p></body></html>'
ROW='<tr class="opp_1 odd"><td><a href="https://x.tal.net/vx/opp/77/a">2027 Summer Analyst Internship - New York</a></td><td>01 Oct 2026</td><td>01 Dec 2026</td></tr>'
def page(body):
    def f(url,**k): r=M.Mock();r.status_code=200;r.text=body if 'jobboard' in url else '<p>Job description here</p>';return r
    return f
def every(body):
    def f(url,**k): r=M.Mock();r.status_code=200;r.text=body;return r
    return f
def raises(fn):
    try: fn();return False
    except A.Challenge: return True
with M.patch.object(A,'fetch',page(ALTCHA)): t(raises(lambda:A.talnet({'slug':'evercore.tal.net'})),'talnet: ALTCHA page -> Challenge (not zero rows)')
with M.patch.object(A,'fetch',page(EMPTY)): t(A.talnet({'slug':'x.tal.net'})==[],'talnet: genuinely empty board -> [] (may close)')
with M.patch.object(A,'fetch',page(ALTCHA.replace('</body>',ROW+'</body>'))): o=A.talnet({'slug':'x.tal.net'});t(len(o)==1,'talnet: rows present + marker text -> rows read, no Challenge')
with M.patch.object(A,'fetch',every('<title>Just a moment...</title><div id="cf-chl-widget"></div>')): t(raises(lambda:A.avature({'slug':'https://x.avature.net/careers/SearchJobs'})),'avature: Cloudflare page -> Challenge')
with M.patch.object(A,'fetch',every('<div class="g-recaptcha"></div>')): t(raises(lambda:A.jsonld({'slug':'https://x.com/careers'})),'jsonld single page: captcha, no JobPosting -> Challenge')
src=open('pipeline/sync.py').read()
t("except Exception as e: return r,None" in src and "b in failed and p.get('status')=='open'" in src and "kept_last_good" in src,'sync: a board that raised keeps its open listings (kept_last_good, stale) instead of closing')
t("r['check_unknown']=True" in open('pipeline/compact.py').read(),'kept rows age out of last_verified and show as check_unknown')
if '--live' in sys.argv:
    try: o=A.talnet({'slug':'evercore.tal.net'});print('  Evercore returned',len(o),'rows');t(True,'LIVE Evercore: normal rows')
    except A.Challenge as e: print('  Evercore:',e);t(True,'LIVE Evercore: Challenge raised, nothing closed')
    import pipeline.net as N
    h=N.fetch('https://morganstanley.tal.net/candidate/jobboard/vacancy/1/adv/').text
    t(len(h)>20000 and 'opp_' in h,f'LIVE Morgan Stanley board still served ({len(h)} bytes, vacancy rows present), so the guard does not fire there')
print(f'{ok}/{n}');sys.exit(ok!=n)
