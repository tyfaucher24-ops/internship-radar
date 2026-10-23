#!/usr/bin/env python3
"""V13.3 §7a-c: build the fixed grader fixtures.
- listings.json: 34 real open listings copied from data/index.json (snapshot, so the set never drifts)
- personas.json: 50 fictional students (made-up names; real school names only as schools)
- expected.json: 300+ (persona, listing) pairs with an expected band and one-line reason,
  written from recruiting judgement + GRADER-RESEARCH.md, BEFORE run.js is ever run.
Bands use 5 steps: A B C D F. A band is 1-2 adjacent letters."""
import json,random,os
os.chdir(os.path.dirname(os.path.abspath(__file__))+'/../..')
IDX={x['id']:x for x in json.load(open('data/index.json'))['listings']}
# id: (field, tier, kind) — tier from GRADER-RESEARCH §1 (1 = cited <=2% acceptance)
LM={'4957a2c66f':('quant',1,'bulge bracket'),'4d8bd83e34':('sandt',1,'bulge bracket'),'33666f862c':('finance',2,'bulge bracket'),
'74cb211bc7':('finance',2,'bulge bracket'),'963103fd8b':('finance',3,'mid-size bank'),'427172e22a':('finance',3,'mid-size bank'),'1d83684849':('finance',3,'mid-size bank'),
'abf0949001':('finance',3,'mid-size wealth firm'),'d55ae622de':('finance',4,'local bank'),'919e548712':('finance',5,'local credit union'),'4b69dd9d7e':('finance',5,'local credit union'),
'8e436f7070':('quant',1,'top quant'),'e0ac455993':('swe',1,'top quant'),'579b953326':('swe',1,'top quant'),'eaf831d420':('swe',1,'MBB'),
'79dea78e89':('swe',1,'big tech'),'6bce2f338a':('swe',1,'big tech'),'80abb79001':('swe',2,'big tech'),'08d2e391d4':('swe',2,'big tech'),
'93d140a18c':('swe',2,'big tech'),'87865ffcdf':('swe',2,'mid-size tech'),'66b972393f':('swe',3,'non-tech large'),'edf93e34fe':('swe',3,'mid-size bank'),
'4234834e37':('swe',3,'defense'),'b33ba30781':('data',3,'insurer'),'870f1d3275':('acct',3,'Big 4'),'9b839c3735':('acct',3,'Big 4'),'da0e9cf243':('acct',4,'mid-size wealth firm'),
'79bca30f8b':('ops',4,'retail'),'9809d815bd':('ops',4,'retail'),'832f246710':('design',3,'retail'),'897f37d2ec':('eng',4,'manufacturing'),
'55e58dbc24':('mkt',3,'mid-size bank'),'3c5bc1a76e':('mkt',5,'local credit union')}
L=[]
for i,(f,t,k) in LM.items():
  x=dict(IDX[i]);x['_field']=f;x['_tier']=t;x['_kind']=k;L.append(x)
json.dump(L,open('tests/grader/listings.json','w'),indent=1)

ELITE=['Harvard University','University of Pennsylvania','Princeton University','Yale University','Stanford University','Massachusetts Institute of Technology','Columbia University','Dartmouth College','University of Chicago','Duke University']
STRONG=['University of Michigan','Georgetown University','New York University','University of Virginia','Cornell University','University of California, Berkeley','Carnegie Mellon University','Notre Dame','Georgia Institute of Technology','Northwestern University']
STRONG[7]='University of Notre Dame'
MID=['Pennsylvania State University','Indiana University','Rutgers University','University of Arizona','Ohio State University','Texas A&M University','University of Florida','Purdue University','Arizona State University','University of Iowa','Michigan State University','University of Maryland','Virginia Tech','University of Pittsburgh','Clemson University']
LESSER=['Kennesaw State University','Montclair State University','University of North Texas','Cleveland State University','Fresno State University','Wright State University','Miami Dade College','Valencia College','Austin Community College','Northern Virginia Community College','Grand Valley State University','Western Kentucky University','University of Toledo','Sam Houston State University','Southern Connecticut State University']
FIELD={'finance':('Finance','Finance & Banking',['excel','financial modeling','accounting','powerpoint']),'quant':('Mathematics','Quant & Trading',['python','statistics','probability','c++']),
'swe':('Computer Science','Software & IT',['python','java','sql','react','c++']),'data':('Statistics','Data & AI',['python','sql','statistics','machine learning']),
'acct':('Accounting','Accounting & Audit',['excel','accounting','quickbooks']),'mkt':('Marketing','Marketing & Sales',['social media','canva','excel']),
'ops':('Business Administration','Business & Operations',['excel','customer service','scheduling']),'design':('Graphic Design','Design & Creative',['figma','adobe illustrator','photoshop']),
'eng':('Mechanical Engineering','Engineering & Hardware',['solidworks','matlab','cad'])}
INT={'finance':[('Summer Analyst','Regional Bank'),('Finance Intern','Local Credit Union'),('Investment Banking Summer Analyst','Lazard')],
'quant':[('Quantitative Research Intern','University Lab'),('Trading Intern','Prop Trading Firm')],'swe':[('Software Engineering Intern','Startup'),('Software Engineer Intern','Capital One')],
'data':[('Data Analyst Intern','County Health Department')],'acct':[('Accounting Intern','Local CPA Firm')],'mkt':[('Marketing Intern','Local Agency')],
'ops':[('Operations Intern','Distribution Center')],'design':[('Design Intern','Local Studio')],'eng':[('Engineering Co-op','Parts Supplier')]}
EXTRA={'d1':('NCAA Division I Varsity Athlete','Athletics','Club'),'d3':('NCAA Division III Varsity Athlete','Athletics','Club'),'lead':('President','Finance Club','Club'),
'mil':('Sergeant, U.S. Army Reserve','U.S. Army Reserve','Job'),'found':('Founder','Campus Tutoring Startup','Project'),'res':('Undergraduate Research Assistant','Faculty Lab','Research'),
'work':('Part-time Cashier','Grocery Store','Job'),'greek':('Treasurer','Greek chapter','Club')}
FIRST=['Avery','Jordan','Riley','Morgan','Casey','Taylor','Quinn','Rowan','Skyler','Dakota','Reese','Parker','Emerson','Finley','Hayden','Jesse','Kendall','Logan','Micah','Noel','Oakley','Peyton','Remy','Sage','Tatum']
LAST=['Alvarez','Brooks','Chen','Diaz','Ellis','Foster','Gupta','Hughes','Ibarra','Jensen','Kim','Lopez','Moreno','Nguyen','Okafor','Patel','Ramos','Shah','Turner','Vargas']
rnd=random.Random(1333)
schools=[('elite',s) for s in ELITE]+[('strong',s) for s in STRONG]+[('mid',s) for s in MID]+[('lesser',s) for s in LESSER]
fields=['finance']*14+['swe']*14+['quant']*4+['data']*4+['acct']*5+['mkt']*3+['ops']*2+['design']*2+['eng']*2
rnd.shuffle(fields)
YEARS=['Freshman','Sophomore','Junior','Senior']
P={'_note':'V13.3 §7a: 50 fictional students (made-up names). Schools are real names used only as the school field. _meta is for the test, not the grader.'}
for n,((st,school),f) in enumerate(zip(schools,fields)):
  cy=YEARS[n%4] if not ('College' in school and 'Community' in school or school in('Miami Dade College','Valencia College')) else rnd.choice(['Freshman','Sophomore'])
  gpa=round(rnd.choice([2.5,2.7,2.9,3.0,3.1,3.2,3.3,3.4,3.5,3.6,3.7,3.8,3.9,4.0]),1)
  maj,ind,sk=FIELD[f];sk=rnd.sample(sk,min(len(sk),rnd.choice([1,2,3])))
  ni=0 if cy=='Freshman' else rnd.choice([0,1,1,2]) if cy in('Junior','Senior') else rnd.choice([0,1])
  exp=[]
  for i in range(ni):
    t,o=INT[f][(n+i)%len(INT[f])];exp.append({'kind':'Internship','title':t,'org':o,'start':f'{2024+i}-06','end':f'{2024+i}-08','bullets':['Built analyses and presented results to the team']})
  ex=[k for k in EXTRA if rnd.random()<0.22]
  if n in(3,11,19,27,35,43): ex=list(dict.fromkeys(['d1']+ex))  # 6 guaranteed D1 athletes
  for k in ex[:2]:
    t,o,kd=EXTRA[k];exp.append({'kind':kd,'title':t,'org':o,'start':'2023-09','end':'Present','bullets':['15+ hours a week alongside classes']})
  if not exp: exp.append({'kind':'Project','title':f'{maj} class project','org':school,'bullets':['Team project for a course']})
  pid=f'g{n+1:02d}_{st}_{f}'
  P[pid]={'savedAt':'x','name':f'{FIRST[n%25]} {LAST[(n*7)%20]}','school':school,'major':maj,'classYear':cy,'gpa':str(gpa),'sponsorship':'no','industries':[ind],
   'locations':['remote'],'relocate':True,'remoteOK':True,'skills':sk,'experience':exp,'_meta':{'schoolTier':st,'field':f,'internships':ni,'extras':ex[:2]}}
json.dump(P,open('tests/grader/personas.json','w'),indent=1)

# ---------- expected (independent judgement rules, not the grader's code) ----------
STEP='ABCDF'
def judge(p,x):
  m=p['_meta'];f=x['_field'];t=x['_tier'];g=float(p['gpa']);ni=m['internships'];cy=p['classYear']
  near={('finance','sandt'),('sandt','finance'),('quant','swe'),('swe','quant'),('data','swe'),('swe','data'),('quant','data'),('data','quant'),('finance','acct'),('acct','finance'),('quant','sandt'),('finance','quant')}
  cyl=x.get('class_years') or []
  if cyl and cy not in cyl: return 'DF',f"not eligible: the posting lists {'/'.join(cyl)} and this persona is a {cy}"  # v2 fix, see GRADER-REPORT.md
  rel=m['field']==f or (m['field'],f) in near
  if not rel:
    if t>=4 and f in('ops','mkt'): return 'CD',f"different field, but a tier-{t} {x['_kind']} {f} role is open to most majors"
    return 'DF',f"{m['field']} profile vs a {f} role: little overlap"
  s=(3 if g>=3.8 else 2 if g>=3.5 else 1 if g>=3.2 else 0 if g>=2.9 else -1)+[0,2,3][min(ni,2)]
  s+={'elite':2,'strong':1}.get(m['schoolTier'],0)*(1 if f in('finance','sandt','quant') else .5)
  s+=.5*min(2,len(p['skills'])-1)+(.5 if 'd1' in m['extras'] and f in('finance','sandt') else 0)+(.25 if set(m['extras'])&{'lead','mil','found','res'} else 0)
  if m['field']!=f: s-=1.5
  if cy in('Freshman','Sophomore') and t<=2: s-=1
  d=s-{1:7.5,2:5.5,3:3.5,4:2,5:1}[t]
  i=0 if d>=2 else 1 if d>=0 else 2 if d>=-2 else 3 if d>=-4 else 4
  if t==1 and i==0 and not (m['schoolTier'] in('elite','strong') and ni>=1 and g>=3.7): i=1
  frac={0:d-2,1:d,2:d+2,3:d+4,4:0}[i];j=i+1 if frac<1 and i<4 else i-1 if i>0 else 1
  b=''.join(sorted({STEP[i],STEP[j]},key=STEP.index))
  why=f"tier {t} {x['_kind']}; GPA {g}, {ni} relevant internship(s), {m['schoolTier']} school"+(f", {'/'.join(m['extras'])}" if m['extras'] else '')
  return b,why
E=[];ids=[k for k in P if k[0]!='_']
for pid in ids:
  p=P[pid];own=[x for x in L if x['_field']==p['_meta']['field']];oth=[x for x in L if x['_field']!=p['_meta']['field']]
  pick=own[:]+rnd.sample(oth,3) if len(own)<=6 else rnd.sample(own,6)+rnd.sample(oth,2)
  for x in pick:
    b,why=judge(p,x);E.append({'persona':pid,'listing':x['id'],'band':b,'why':why})
json.dump({'_note':'V13.3 §7c: written before run.js was run. band = allowed letters (A,B,C,D,F; +/- ignored). Outlier = 2+ steps from the band.','pairs':E},open('tests/grader/expected.json','w'),indent=1)
print(len(L),'listings',len(ids),'personas',len(E),'pairs')
