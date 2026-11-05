"""V20 Part 3d: NY State Jobs adapter (fixture rows copied from vacancyTable.cfm, 2026-11-04). --live reads the page."""
import sys;sys.path.insert(0,'.')
from pipeline import adapters as A, discover as D
ok=0;n=0
def t(c,m):
    global ok,n;n+=1;ok+=bool(c);print(('PASS ' if c else 'FAIL ')+m)
ROW='<tr> <td>{i}</td> <td><a title="x" href="vacancyDetailsView.cfm?id={i}">{t}</a></td> <td>NS</td> <td>11&#x2f;03&#x2f;26</td> <td>12&#x2f;31&#x2f;26</td> <td>Health, Department of </td> <td>Otsego</td> </tr>'
H=''.join(ROW.format(i=1000+k,t='Professional Engineer 1') for k in range(60))+ROW.format(i=7,t='Student Assistant - 07148')+ROW.format(i=8,t='Internal Auditor&#x2f;Trainee 1')
class R:
    def __init__(s,x):s.text=x
A.fetch=lambda u,**k:R(H)
o=A.nystate({})
t(len(o)==1,'only intern/student titles kept ("Internal Auditor" is not an intern)')
x=o[0]
t(x['deadline']=='2026-12-31' and x['posted']=='2026-11-03','deadline and posted kept')
t(x['company_override']=='NYS Department of Health' and x['locations']==['Otsego County, NY'],'agency and county')
t(x['url']=='https://statejobs.ny.gov/public/vacancyDetailsView.cfm?id=7','vacancy detail link')
A.fetch=lambda u,**k:R('<html>maintenance</html>')
try: A.nystate({});t(False,'empty page raises')
except RuntimeError: t(True,'empty/changed page raises, so listings are kept, not closed')
t(any(r['ats']=='nystate' for r in D.load()),'registry row present, so the sync calls it')
if '--live' in sys.argv:
    import importlib;importlib.reload(A);o=A.nystate({});t(len(o)>5,f'live: {len(o)} intern/student vacancies')
print(f'{ok}/{n}');sys.exit(ok!=n)
