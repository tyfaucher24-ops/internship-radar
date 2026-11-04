"""V20 Part 2: myworkdaysite.com (Wells Fargo, Perella Weinberg) is a Workday host too.
workday_alive() must say True/False for it, and discover.ats_from_url() must turn its URLs into registry rows.
Mocked by default; add --live to also hit Wells Fargo's real board once."""
import sys,unittest.mock as M
sys.path.insert(0,'.')
from pipeline import adapters as A, discover as D
ok=0;n=0
def t(c,m):
    global ok,n;n+=1;ok+=bool(c);print(('PASS ' if c else 'FAIL ')+m)
calls=[]
def live(url,**k):
    calls.append(url);r=M.Mock();r.status_code=200;r.json=lambda:{'jobPostingInfo':{'canApply':True,'title':'Intern'}};return r
def gone(url,**k):
    calls.append(url);r=M.Mock();r.status_code=404;return r
B='wd1.myworkdaysite.com/wf/WellsFargoJobs'
U='https://wd1.myworkdaysite.com/recruiting/wf/WellsFargoJobs/job/CHARLOTTE-NC/Summer-Intern_R-1'
with M.patch.object(A,'fetch',live): t(A.workday_alive(B,U) is True,'myworkdaysite /recruiting/ live posting -> True')
t(calls[-1]=='https://wd1.myworkdaysite.com/wday/cxs/wf/WellsFargoJobs/job/CHARLOTTE-NC/Summer-Intern_R-1','asks the board\'s own cxs detail endpoint')
with M.patch.object(A,'fetch',gone): t(A.workday_alive(B,U) is False,'myworkdaysite 404 -> False')
with M.patch.object(A,'fetch',live): t(A.workday_alive(B,'https://wd1.myworkdaysite.com/en-US/wf/WellsFargoJobs/job/X/Y_R-2') is True,'myworkdaysite /en-US/<tenant>/<site>/job/ -> True')
with M.patch.object(A,'fetch',live): t(A.workday_alive('h.wd1.myworkdayjobs.com/t/s','https://h.wd1.myworkdayjobs.com/en-US/s/job/X/Y_R1') is True,'myworkdayjobs still works')
t(A.workday_alive(B,'https://example.com/job/1') is None,'other hosts -> None')
f=D.ats_from_url
t(f(U)==('workday','wd1.myworkdaysite.com/wf/WellsFargoJobs'),'ats_from_url: /recruiting/<tenant>/<site>/job/')
t(f('https://wd1.myworkdaysite.com/wf/WellsFargoJobs/job/X/Y_R-1')==('workday','wd1.myworkdaysite.com/wf/WellsFargoJobs'),'ats_from_url: /<tenant>/<site>/job/')
t(f('https://wd1.myworkdaysite.com/en-US/recruiting/pwp/pwp_experienced_opportunities')==('workday','wd1.myworkdaysite.com/pwp/pwp_experienced_opportunities'),'ats_from_url: locale + board root')
t(f('https://att.wd1.myworkdayjobs.com/en-US/ATTcollege/job/X')==('workday','att.wd1.myworkdayjobs.com/att/ATTcollege'),'ats_from_url: myworkdayjobs unchanged')
t(f('https://wd1.myworkdaysite.com/')is None,'bare host -> None')
if '--live' in sys.argv:
    import json,urllib.request
    r=urllib.request.Request('https://wd1.myworkdaysite.com/wday/cxs/wf/WellsFargoJobs/jobs',data=json.dumps({'appliedFacets':{},'limit':1,'offset':0,'searchText':'intern'}).encode(),headers={'Content-Type':'application/json'})
    p=json.load(urllib.request.urlopen(r,timeout=30))['jobPostings'][0]['externalPath']
    t(A.workday_alive(B,'https://wd1.myworkdaysite.com/recruiting/wf/WellsFargoJobs'+p) is True,'LIVE: real Wells Fargo posting -> True')
    t(A.workday_alive(B,'https://wd1.myworkdaysite.com/recruiting/wf/WellsFargoJobs/job/X/Nope_R-000000001') is False,'LIVE: made-up id -> False (404)')
print(f'{ok}/{n}');sys.exit(ok!=n)
