#!/usr/bin/env python3
"""V15.1: re-derive the persona answer key under one consistent rule set and print every band that changes.
Changes vs the V13.3 judge (build_fixtures.py), each tied to evidence, never to grader output:
 K1 school credit: V15 spec sets school weight to 0 outside IB/PE/consulting and cuts it ~half inside them.
    V13.3 key still gave school credit to every field (x0.5) and full credit to quant. New: finance/sandt only, elite 1.0 / strong 0.5.
 K3 adjacent field AND the posting lists required majors that exclude the persona's major: one more point off
    (real per-listing evidence from the posting text, applied to every such pair).
 K2 no relevant internship: the best band letter is B (never A) at any firm, in every field, since without in-field
    experience nothing on the profile shows the job can be done; same rule across fields.
Writes tests/grader/expected.json only with --write. Personas and listings are unchanged."""
import re,json,sys,os
os.chdir(os.path.dirname(os.path.abspath(__file__))+'/../..')
P=json.load(open('tests/grader/personas.json'));L={x['id']:x for x in json.load(open('tests/grader/listings.json'))}
E=json.load(open('tests/grader/expected.json'))
STEP='ABCDF'
def judge(p,x):
  m=p['_meta'];f=x['_field'];t=x['_tier'];g=float(p['gpa']);ni=m['internships'];cy=p['classYear']
  near={('finance','sandt'),('sandt','finance'),('quant','swe'),('swe','quant'),('data','swe'),('swe','data'),('quant','data'),('data','quant'),('finance','acct'),('acct','finance'),('quant','sandt'),('finance','quant')}
  cyl=x.get('class_years') or []
  if cyl and cy not in cyl: return 'DF',f"not eligible: the posting lists {'/'.join(cyl)} and this persona is a {cy}"
  rel=m['field']==f or (m['field'],f) in near
  if not rel:
    if t>=4 and f in('ops','mkt'): return 'CD',f"different field, but a tier-{t} {x['_kind']} {f} role is open to most majors"
    return 'DF',f"{m['field']} profile vs a {f} role: little overlap"
  s=(3 if g>=3.8 else 2 if g>=3.5 else 1 if g>=3.2 else 0 if g>=2.9 else -1)+[0,2,3][min(ni,2)]
  s+={'elite':1,'strong':.5}.get(m['schoolTier'],0)*(1 if f in('finance','sandt') else 0)   # K1
  s+=.5*min(2,len(p['skills'])-1)+(.5 if 'd1' in m['extras'] and f in('finance','sandt') else 0)+(.25 if set(m['extras'])&{'lead','mil','found','res'} else 0)
  if m['field']!=f: s-=1.5
  rm=(x.get('req') or {}).get('mj') or []
  if rm and m['field']!=f and not any(r.split()[0] in p['major'].lower() or (r=='business' and re.search(r'financ|accounting|econom|marketing|supply chain|management|business',p['major'].lower())) for r in rm): s-=1   # K3
  if cy in('Freshman','Sophomore') and t<=2: s-=1
  d=s-{1:7.5,2:5.5,3:3.5,4:2,5:1}[t]
  i=0 if d>=2 else 1 if d>=0 else 2 if d>=-2 else 3 if d>=-4 else 4
  if t==1 and i==0 and not (m['schoolTier'] in('elite','strong') and ni>=1 and g>=3.7): i=1
  frac={0:d-2,1:d,2:d+2,3:d+4,4:0}[i];j=i+1 if frac<1 and i<4 else i-1 if i>0 else 1
  if ni==0 and i==0: i,j=1,2                                                                  # K2
  b=''.join(sorted({STEP[i],STEP[j]},key=STEP.index))
  why=f"tier {t} {x['_kind']}; GPA {g}, {ni} relevant internship(s), {m['schoolTier']} school"+(f", {'/'.join(m['extras'])}" if m['extras'] else '')
  return b,why
ch=[]
for e in E['pairs']:
  b,why=judge(P[e['persona']],L[e['listing']])
  if b!=e['band']:ch.append((e['persona'],e['listing'],e['band'],b,why));
  if '--write' in sys.argv:e['band']=b;e['why']=why
for c in ch:print(*c,sep=' | ')
print(len(ch),'changes')
if '--write' in sys.argv:
  E['_note']+=' V15.1: re-derived by tests/grader/rekey_v151.py (rules K1, K2, K3; see ops/audit/v15.1-key-changes.md).';json.dump(E,open('tests/grader/expected.json','w'),indent=1)
