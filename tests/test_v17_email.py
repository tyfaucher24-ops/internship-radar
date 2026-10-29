"""V17 email job unit tests (stdlib only, no network, no sending). Run: python3 tests/test_v17_email.py"""
import os,sys,json,tempfile,datetime as dt,subprocess
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));sys.path.insert(0,os.path.join(R,'ops','email'))
import send_alerts as S
ok=fail=0
def t(name,c):
    global ok,fail
    if c:ok+=1;print('PASS',name)
    else:fail+=1;print('FAIL',name)
U=dt.timezone.utc;NOW=dt.datetime(2026,11,2,14,30,tzinfo=U)   # Mon 9:30 EST
BY={'a':{'id':'a','company':'Acme','title':'SWE Intern','deadline':'2026-11-09','status':'open','apply_url':'https://acme.example/apply'},
    'b':{'id':'b','company':'Beta','title':'Data Intern','deadline':'2026-11-03','status':'open','apply_url':'https://b.example'},
    'c':{'id':'c','company':'Gamma','title':'PM Intern','deadline':None,'status':'open'},
    'd':{'id':'d','company':'Delta','title':'Ops Intern','deadline':'2026-11-04','status':'open'},
    'e':{'id':'e','company':'Echo','title':'Closed Intern','deadline':'2026-11-04','status':'closed'}}
def user(**k):
    u={'user_id':'11111111-aaaa','email':'student@example.edu','reminders':True,'digest':True,'matches':False,'digest_dow':1,'digest_hour':9,'tz':'America/New_York','unsub_token':'ab'*20,
       'tracker':[{'listingId':'a','status':'Saved'},{'listingId':'b','status':'Saved'},{'listingId':'c','status':'Saved'},{'listingId':'d','status':'Applied'},{'listingId':'e','status':'Saved'}],'profile':None,'sent':[]}
    u.update(k);return u
rows,w=S.reminders_due(user(),BY,NOW)
t('reminder windows 7 and 2',sorted(w)==['a:7','b:2'])
t('applied, closed and rolling roles get no reminder',{r['id'] for r in rows}=={'a','b'})
t('bundled sorted by days left',[r['id'] for r in rows]==['b','a'])
t('dedupe: window already sent',S.reminders_due(user(sent=[{'type':'reminder','windows':['a:7'],'sent_at':'2026-10-31T14:00:00Z'}]),BY,NOW)[1]==['b:2'])
t('one reminder email per local day',S.reminders_due(user(sent=[{'type':'reminder','windows':['x:7'],'sent_at':'2026-11-02T14:05:00Z'}]),BY,NOW)==([],[]))
t('tz: 9:30 New York is due, 6:30 LA is not',S.reminders_due(user(tz='America/Los_Angeles'),BY,NOW)==([],[]))
t('tz: bad tz falls back to New York',len(S.reminders_due(user(tz='Not/AZone'),BY,NOW)[0])==2)
t('tz: Tokyo local date (Nov 2 23:30) used for days left',[r['left'] for r in S.reminders_due(user(tz='Asia/Tokyo'),BY,NOW)[0]]==[1,7])
t('reminders off -> none',S.reminders_due(user(reminders=False),BY,NOW)==([],[]))
t('digest due Monday 9 local',S.digest_due(user(),NOW))
t('digest not due other weekday',not S.digest_due(user(digest_dow=3),NOW))
t('digest not due before hour',not S.digest_due(user(digest_hour=18),NOW))
t('digest not twice in a week',not S.digest_due(user(sent=[{'type':'digest','sent_at':'2026-11-02T14:00:00Z'}]),NOW))
c=S.digest_content(user(),BY,NOW,[])
t('digest closing 14d excludes applied/closed',[r['id'] for r in c['closing']]==['b','a'])
t('rolling labelled',S.when(c['rolling'][0])=='Rolling, apply early')
t('tracker counts',c['counts']=={'saved':4,'applied':1,'interviewing':0})
e=S.digest_content(user(tracker=[{'listingId':'c','status':'Saved'}]),BY,NOW,[])
t('empty digest skipped (rolling + counts only)',S.digest_empty(e))
t('matches ignored when toggle off',S.digest_content(user(),BY,NOW,[{'id':'a','pct':80}])['matches']==[])
t('matches included when on',[m['id'] for m in S.digest_content(user(matches=True),BY,NOW,[{'id':'a','pct':80}])['matches']]==['a'])
subj,html,text=S.render(user(),'reminder',rows)
t('subject',subj=='2 saved internships close soon')
t('unsubscribe links in html+text',f"#unsub={'ab'*20}&amp;t=reminders" in html and f"#unsub={'ab'*20}&t=all" in text)
t('tracked details link',S.SITE+'?ref=email&t=reminder#l=b' in text)
t('apply link',"https://b.example" in html)
t('CAN-SPAM placeholder',S.MAIL_TODO in text)
t('html escapes',('<b>' not in S.render(user(),'reminder',[dict(rows[0],company='<b>x')])[1].split('</title>')[1]))
# end-to-end DRY_RUN: nothing sent, previews written
d=tempfile.mkdtemp();fx=os.path.join(d,'u.json');lp=os.path.join(d,'l.json')
json.dump([user()],open(fx,'w'));json.dump({'listings':list(BY.values())},open(lp,'w'))
env=dict(os.environ,DRY_RUN='1',FIXTURE=fx,LISTINGS=lp,NOW=NOW.isoformat(),GMAIL_USER='',GMAIL_APP_PASSWORD='')
p=subprocess.run([sys.executable,os.path.join(R,'ops','email','send_alerts.py')],env=env,capture_output=True,text=True)
t('dry run ok',p.returncode==0 and 'rendered 2' in p.stdout)
env['DAILY_LIMIT']='1';p=subprocess.run([sys.executable,os.path.join(R,'ops','email','send_alerts.py')],env=env,capture_output=True,text=True)
t('daily cap defers overflow',p.returncode==0 and '1 emails deferred' in p.stdout and 'rendered 1' in p.stdout)
print(f'{ok}/{ok+fail} passed');sys.exit(1 if fail else 0)
