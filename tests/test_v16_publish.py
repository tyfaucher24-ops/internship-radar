"""V16 P2 unit: atomic writes + publish gate. Run: python3 tests/test_v16_publish.py"""
import os,sys,json,tempfile;sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..'))
from pipeline.publish import write_json,gate,GateRefused
R=[]
def ck(n,c):R.append(c);print('PASS' if c else 'FAIL',n)
d=tempfile.mkdtemp();p=os.path.join(d,'x.json')
write_json(p,{'a':1});ck('write_json writes valid JSON, no .tmp left',json.load(open(p))=={'a':1} and not os.path.exists(p+'.tmp'))
class Bad:pass
try:write_json(p,{'a':Bad()});ck('unserialisable write raises',False)
except TypeError:ck('failed write leaves previous file intact',json.load(open(p))=={'a':1})
rec=lambda i,**k:{'id':str(i),'company':'C','title':'T','status':'open','source':'s','apply_url':'https://x/'+str(i),**k}
prev=[rec(i) for i in range(1000)]
ck('gate passes on 10% drop',gate(prev,prev[:900])['drop_pct']==10.0)
try:gate(prev,prev[:840]);ck('gate refuses 16% drop',False)
except GateRefused as e:ck('gate refuses 16% drop','16.0%' in str(e))
try:gate(prev,prev[:999]+[rec(5,title='')]);ck('gate refuses missing title',False)
except GateRefused:ck('gate refuses missing title',True)
try:gate(prev,prev[:999]+[rec(5,apply_url=None)]);ck('gate refuses open ATS row with no apply link',False)
except GateRefused:ck('gate refuses open ATS row with no apply link',True)
ck('hand-checked row without link allowed',gate(prev,prev[:999]+[rec(5,apply_url=None,source_type='manual')])['missing_fields']==0)
ck('closed/hidden rows do not count as open',gate(prev,prev[:900]+[rec(i,status='closed') for i in range(100)])['new_open']==900)
real=json.load(open(os.path.join(os.path.dirname(__file__),'..','data','listings.json')))['listings']
ck('current published data passes the gate',gate(real,real)['missing_fields']==0)
print(f'\n{sum(R)}/{len(R)} passed');sys.exit(0 if all(R) else 1)
