import json,os,re,sys,datetime,unittest
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..'))
from pipeline import v18_accuracy as V
H=os.path.dirname(__file__)
class T(unittest.TestCase):
    def test_category_precision_200(self):
        rows=json.load(open(os.path.join(H,'data','v18_category_200.json')))['rows'];self.assertEqual(len(rows),200)
        ok=sum(V.category_v18(r['title'],'Other')==r['expected'] for r in rows);print('category precision',ok/200)
        self.assertGreaterEqual(ok/200,0.90)
    def test_category_keeps_existing(self): self.assertEqual(V.category_v18('Compliance Intern','Legal'),'Legal')
    def test_season_explicit_only(self):
        self.assertEqual(V.season_v18('2027 Summer Intern'),('Summer',2027))
        self.assertEqual(V.season_v18('Summer Intern - Claims'),('Summer',None))
        self.assertEqual(V.season_v18('Summer/Winter 2027 Co-op'),(None,None))
        self.assertEqual(V.season_v18('2027 Software Engineering Intern'),(None,None))
        self.assertEqual(V.season_v18('Fall 2026-2027 intern'),('Fall',None))
    def test_run_offline(self):
        now=datetime.datetime(2026,11,4,15,tzinfo=datetime.timezone.utc);ns=now.isoformat()
        old=(now-datetime.timedelta(days=5)).isoformat()
        L=[{'id':'aa1','company':'Acme','title':'SWE Intern','status':'open','source_type':'ats','last_verified':ns,'locations':[{'city':'Austin','state':'TX'}]},
           {'id':'aa2','company':'Acme','title':'SWE Intern','status':'open','source_type':'github-verified','apply_url':'https://go.vansh.nyc/x'},
           {'id':'aa3','company':'Beta','title':'Data Intern','status':'open','source_type':'github-verified','apply_url':'https://go.vansh.nyc/y'},
           {'id':'aa4','company':'Gam','title':'Ops Intern','status':'open','source_type':'ats','last_verified':old,'locations':[{'city':'Austin','state':'TX'}]},
           {'id':'aa5','company':'Gam','title':'Ops Intern','status':'open','source_type':'ats','last_verified':ns,'locations':[{'city':'Austin','state':'TX'}]},
           {'id':'aa6','company':'Old','title':'Summer 2025 Intern','status':'open','source_type':'ats','last_verified':ns,'season':'Summer','year':2025}]
        calls=[]
        st=V.run(L,'/nonexistent',lambda *a,**k:calls.append(a),lambda u:True,re.compile('x^'),lambda i:True,ns,now)
        self.assertEqual(calls,[])                      # never fetches a robots-disallowed shortener
        self.assertTrue(L[1]['hidden'])                 # lead duplicate of ATS row
        self.assertTrue(L[2]['check_unknown'])          # unverifiable -> flagged, not Open
        self.assertTrue(L[3]['hidden']);self.assertEqual(L[3]['dup_of'],'aa5')
        self.assertEqual(L[5]['status'],'closed')       # stated term already over
        self.assertNotIn('check_unknown',L[4])
if __name__=='__main__': unittest.main()
