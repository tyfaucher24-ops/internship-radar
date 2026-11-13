"""V21: live heartbeat present (Part 1), counts.json + glowing-dot open count (Part 2 / V21.1), probe + new adapters (Part 3),
'No deadline yet' labels + deadline sort (Part 4), descriptions sanitizer + About <Company> + no-desc fallback (Part 5).
Run: python3 tests/test_v21.py  (needs node for the JS checks)"""
import sys,os,re,json,subprocess,datetime
sys.path.insert(0,'.');sys.path.insert(0,'ops')
ok=0;n=0
def t(c,m):
    global ok,n;n+=1;ok+=bool(c);print(('PASS ' if c else 'FAIL ')+m)
A=open('app.js').read();IDX=open('index.html').read()
def node(js):
    r=subprocess.run(['node','-e',js],capture_output=True,text=True,timeout=60);return r.stdout.strip() or r.stderr.strip()
def grab(name):
    """source of a top-level `const name=...` arrow / function from app.js (single line)"""
    m=re.search(r'(?:^|[;\n])((?:async )?function '+name+r'\(.*)',A) or re.search(r'(const '+name+r'=.*)',A)
    return m.group(1).split('\n')[0]
# ---------- Part 1 ----------
t(os.path.exists('supabase/migrations/20261104000006_live_presence.sql'),'P1 migration 0006 present')
E=open('email-alerts.js').read()
t('heartbeat' in E and 'hbDead' in E and '45e3' in E and 'doNotTrack' in E and 'globalPrivacyControl' in E,'P1 heartbeat block (45 s spacing, DNT/GPC, hbDead) present')
t('how many people are using it at once' in IDX,'P1 privacy sentence present')
t(os.path.exists('tests/test_v19_4_heartbeat.py'),'P1 heartbeat test present')
# ---------- Part 2 ----------
import status as S
now=datetime.datetime(2026,11,5,17,0,tzinfo=datetime.timezone.utc)   # 12:00 New York
L=[{'id':'a','status':'open','board':'greenhouse:x','first_seen':'2026-11-05T14:00:00Z'},
   {'id':'b','status':'open','board':'workday:h/t/s','first_seen':'2026-11-05T03:00:00Z'},        # 22:00 Nov 4 in New York
   {'id':'c','status':'open','source_type':'github-verified','deadline':'2026-11-04'},           # past deadline: not open
   {'id':'d','status':'open','hidden':True,'board':'lever:y'},
   {'id':'e','status':'open','past_term':True,'board':'lever:y'},
   {'id':'f','status':'open','source_type':'manual','deadline':'2026-11-05'},
   {'id':'g','status':'closed','closed_at':'2026-11-05T12:00:00Z','board':'lever:y'},
   {'id':'h','status':'closed','closed_at':'2026-11-05T04:00:00Z','board':'lever:y'}]           # 23:00 Nov 4 in New York
c=S.counts(L,'2026-11-05T16:00:00Z',now)
t(c['open']==3,f"P2 open = status open, not hidden, not past term, deadline today or later ({c['open']})")
t(c['new_today']==1 and c['closed_today']==1,f"P2 new_today/closed_today use the New York day ({c['new_today']},{c['closed_today']})")
t(c['by_source']=={'greenhouse':1,'workday':1,'user-added':1} and c['by_kind']=={'employer-board':2,'user-added':1},f"P2 by_source / by_kind {c['by_source']} {c['by_kind']}")
t(S.source_kind('lead-list')=='lead-list' and S.source_kind('nystate')=='feed','P2 lead-list vs employer-board vs feed kinds')
import tempfile,shutil
d=tempfile.mkdtemp();json.dump({'listings':L},open(d+'/listings.json','w'));json.dump({'updated':'2026-11-05T16:00:00Z','open':2},open(d+'/meta.json','w'))
S.D=d;cc=S.write_counts();m=json.load(open(d+'/meta.json'));cj=json.load(open(d+'/counts.json'))
t(m['open_live']==cj['open']==cc['open'],'P2 meta.open_live written in lockstep with counts.json')
t(set(cj)>={'updated','open','new_today','closed_today','by_source'},'P2 counts.json has the spec contract keys')
shutil.rmtree(d)
hc=re.search(r'id="hdrCount"[^>]*>(.*?)</p>',IDX).group(1)
t(not re.search(r'\d{3}',re.sub(r'\?v=[0-9a-f]+','',hc)),'P2 no hardcoded count in the #hdrCount skeleton')
t(hc.index('qbadge')<hc.index('open internships'),'P2 skeleton order: glowing-dot slot LEFT of open internships (no shift)')
t('<span class="qbadge">${lb}</span><span class="q q-open">' in A and 'liveBadge(META.updated)' in A,'P2 header renders the shared Live pill left of open internships')
t('aria-label="Listings are live"' in A,'P2 aria-label says listings are live')
lb=A.split('const liveBadge=')[1].split('\n')[0]
t('>Live</span>' in lb and 'live-dot' in lb and 'const liveTag=' not in A,'V21.2 one liveBadge pill (dot + Live); the dot-only tag is gone')
t('counts.json?ts=' in A and 'LIVE_MS' in A,'P2 liveRefresh polls counts.json + meta on a calm interval')
t("META.open_live||META.open" in A and 'open_live' in open('intro.js').read(),'P2 pre-listings paint + intro use the same open count')
t(not re.search(r'(?<![\w.])1[0-9],[0-9]{3}(?![\w])',A+IDX),'P2 no literal 5-digit inventory number in app.js/index.html')
# ---------- Part 4 ----------
cl=re.search(r'function closeLbl\(.*?(?=\n(?:async )?function |\nconst )',A,re.S).group(0)
out=node("const days=()=>9,shortDate=s=>s,$=()=>null;"+cl+";console.log(JSON.stringify([closeLbl({}),closeLbl({rolling:true}),closeLbl({deadline:'2099-01-01'}).t]))")
r=json.loads(out)
t(r[0]['t']=='No deadline yet' and r[1]['t']=='Rolling / no deadline posted','P4 card/detail label: No deadline yet / Rolling / no deadline posted')
SRC=''.join(open(f).read() for f in ['app.js','listing.js','tracker.js','autopilot.js','autopilot-core.js','index.html'])
t('Deadline not published' not in SRC and 'No deadline listed' not in SRC,'P4 old strings gone from user-visible code')
t("['This week','This month','Later','Rolling','No deadline yet']" in A,'P4 filter facet renamed; Rolling separate')
t("v==='Not listed'?'No deadline yet'" in A,'P4 old ?dlw=Not listed links still work')
m=re.search(r"const TD=TODAY.*?cmpDl=\(a,b\)=>sc\(dk\(a\),dk\(b\)\);",A)
js="const TODAY=new Date('2026-11-05T12:00:00');"+m.group(0)+";const R=[{id:'u'},{id:'r',rolling:true},{id:'p',deadline:'2026-11-01'},{id:'b',deadline:'2026-12-01'},{id:'a',deadline:'2026-11-06'}].sort(cmpDl).map(x=>x.id);console.log(R.join(''))"
o=node(js)
t(o[:2]=='ab' and set(o[2:])=={'u','r','p'},f'P4 deadline sort: dated future rows first, undated after ({o})')
sys.path.insert(0,"ops/email");import send_alerts as SA
t(SA.when({'rolling':True,'rolling_src':False})=='No deadline yet' and SA.when({'rolling':True,'rolling_src':True}).startswith('Rolling / no deadline posted'),'P4 email copy honest: undated is not called rolling')
# ---------- Part 5 ----------
from pipeline.norm import clean_html
x=clean_html('<p>Hello <b>intern</b></p><script>alert(1)</script>&lt;script&gt;steal()&lt;/script&gt;<p onclick="evil()">Bye</p><style>p{}</style>')
t('alert' not in x and 'steal' not in x and 'evil' not in x and 'p{}' not in x and 'Hello intern' in x and 'Bye' in x,'P5 sanitizer drops script/style (raw and escaped) and handlers')
t(clean_html('Plain text\n\nSecond paragraph')=='Plain text\n\nSecond paragraph','P5 plain text round-trips')
from pipeline import about as AB
t(AB.sentences('Acme Inc. is a maker of widgets. It was founded in 1900 in Ohio. The firm')=='Acme Inc. is a maker of widgets. It was founded in 1900 in Ohio.','P5 about keeps whole sentences only')
H='<div id="mw-content-text"><table class="infobox ib-company vcard"></table><p class="mw-empty-elt"></p><p><b>Acme Corporation</b> (/ˈækmi/ AK-mee)<sup>[1]</sup> is an American maker of widgets headquartered in Ohio.<sup>[2]</sup> It employs 5,000 people.</p></div>'
t(AB.wiki_first_para(H)=='Acme Corporation is an American maker of widgets headquartered in Ohio. It employs 5,000 people.','P5 Wikipedia first paragraph: citations + pronunciation removed')
class R:
    def __init__(s,code,text,url):s.status_code=code;s.text=text;s.url=url
pages={'https://en.wikipedia.org/wiki/Acme':R(200,'<div id="mw-content-text"><table class="infobox ib-weapon"></table><p>Acme is a rocket used by coyotes in many cartoons and films.</p></div>','u1'),
       'https://en.wikipedia.org/wiki/Acme_(company)':R(200,H.replace('Acme Corporation','Acme'),'https://en.wikipedia.org/wiki/Acme_(company)')}
AB.net.fetch=lambda u,**k:pages.get(u,R(404,'',u))
a=AB.from_wikipedia('Acme')
t(a and a['source']=='wikipedia' and a['url'].endswith('Acme_(company)') and 'widgets' in a['text'],'P5 only a company article (ib-company) is used; same-named non-company page skipped')
t(AB.from_wikipedia('Nonexistent Co') is None,'P5 no article -> no blurb (never invented)')
keys=['Goldman Sachs','AT&T','L\'Oréal','1Password','Johnson & Johnson']
py=[AB.shard(AB.akey(k)) for k in keys]
js=node(grab('aboutKey').split(',aboutCache')[0]+";console.log(JSON.stringify("+json.dumps(keys)+".map(k=>aboutShard(aboutKey(k)))))")
t(json.loads(js)==py,f'P5 about key/shard match between pipeline and app.js {py}')
fx="const esc=s=>String(s).replace(/[&<>\"]/g,c=>'&#'+c.charCodeAt(0)+';'),safeUrl=u=>u;"+grab('ABOUT_SRC')+";"+grab('aboutHTML')+";"+grab('NODESC_LEAD')+";"+grab('noDescHTML')
o=json.loads(node(fx+";console.log(JSON.stringify([noDescHTML({company:'Acme'},{text:'Acme makes widgets.',source:'wikipedia',url:'https://en.wikipedia.org/wiki/Acme'}),noDescHTML({company:'Acme'},null)]))"))
t("The employer didn't post a full description. Here's a bit about the company." in o[0] and 'About Acme.' in o[0] and 'Acme makes widgets.' in o[0],'P5 no-desc fallback: muted line + About blurb')
t('Source: <a href="https://en.wikipedia.org/wiki/Acme"' in o[0] and '>Wikipedia</a>' in o[0],'P5 attribution link when the blurb came from Wikipedia')
t("See the company posting for details." in o[1] and o[1].strip(),'P5 no desc + no about: honest one-liner, never empty')
t("Full description is on the company posting." not in A,'P5 old empty-ish fallback replaced')
# ---------- Part 3 ----------
from pipeline import adapters as AD, probe as P, discover as DI
xmlt=open('tests/data/v21_personio.xml').read()
pp=AD.personio_parse(xmlt,'acme')
t(len(pp)==1 and pp[0]['url']=='https://acme.jobs.personio.de/job/101' and pp[0]['locations']==['New York, NY'],'P3 personio: intern rows only, employer job URL')
t('alert' not in clean_html(pp[0]['desc']) and 'dashboards' in clean_html(pp[0]['desc']),'P3 personio description sanitized')
class J:
    def __init__(s,d):s.d=d
    def json(s):return s.d
AD.fetch=lambda u,**k:J([{'uuid':'u1','name':' Data Science Intern - Summer 2027 ','url':'https://ats.rippling.com/acme/jobs/u1','workLocation':{'label':'San Francisco, CA'},'department':{'label':'Data'}},{'uuid':'u2','name':'Account Executive'}]) if u.endswith('/jobs') else J({'description':{'role':'<p>Build models</p>','company':'<p>About Acme</p>'},'createdOn':'2026-10-01T00:00:00Z'})
rp=AD.rippling({'slug':'acme'})
t(len(rp)==1 and rp[0]['title']=='Data Science Intern - Summer 2027' and rp[0]['desc']=='<p>Build models</p>' and rp[0]['posted']=='2026-10-01','P3 rippling: intern rows, description from the detail call')
t(DI.ats_from_url('https://ats.rippling.com/acme/jobs/u1')==('rippling','acme') and DI.ats_from_url('https://acme.jobs.personio.de/job/5')==('personio','acme'),'P3 ats_from_url knows rippling + personio')
t(set(P.ATS_ALL)>={'greenhouse','lever','ashby','smartrecruiters','workable','recruitee','bamboohr','rippling','personio'},'P3 prober covers the public-JSON ATS set')
class RR:
    def __init__(s,code,text,ct='application/json',url=''):s.status_code=code;s.text=text;s.headers={'Content-Type':ct};s.url=url
def fake(u,**k):
    if u=='https://boards-api.greenhouse.io/v1/boards/acmerobotics/jobs': return RR(200,json.dumps({'jobs':[{'title':'Robotics Intern'}]}))
    if u=='https://acmerobotics.com/careers': return RR(200,'<a href="https://acme.wd5.myworkdayjobs.com/en-US/Acme_Careers/job/x">Jobs</a>','text/html','https://acmerobotics.com/careers')
    return RR(404,'')
P.fetch=fake
import tempfile
td=tempfile.mkdtemp();reg=td+'/companies.csv';DI.REG=reg;open(reg,'w').write('name,domain,ats,slug,size,industry,hq_state,careers_url,discovered_via,notes\n')
sf=td+'/sector_test.txt';open(sf,'w').write('# test\nAcme Robotics|tech|acmerobotics.com\n')
found,st=P.probe([sf],ats=('greenhouse','lever'),workers=4,log_dir=td)
rows=DI.load()
t({(r['ats'],r['slug']) for r in rows}=={('greenhouse','acmerobotics'),('workday','acme.wd5.myworkdayjobs.com/acme/Acme_Careers')},f'P3 prober slug->board + careers-page link happy path {[(r["ats"],r["slug"]) for r in rows]}')
t(all(r['discovered_via']=='probe:V21:sector_test' for r in rows),'P3 discovered_via = probe:V21:<seed>')
t(st['by_seed']['sector_test']['attempts']>0 and os.path.exists(td+f'/new-boards-{datetime.date.today().isoformat()}.log'),'P3 attempts counted per seed + new-boards log written')
t(all(len(open('pipeline/seeds/'+f).read().splitlines())>2 for f in os.listdir('pipeline/seeds') if f.startswith('sector_')) and len([f for f in os.listdir('pipeline/seeds') if f.startswith('sector_')])==14,'P3 14 sector seed files, each non-empty with a source header')
mr=DI.merge_rows([{'name':'A','ats':'greenhouse','slug':'a','notes':''},{'name':'B','ats':'lever','slug':'b'}],[{'name':'A Inc','ats':'greenhouse','slug':'A','notes':'fixed'},{'name':'C','ats':'ashby','slug':'c'}])
t(len(mr)==3 and any(r['name']=='A Inc' and r['notes']=='fixed' for r in mr),'P3 registry rows committed in main are merged over the cached registry (V20 rows were being dropped)')
print(f'V21 {ok} / {n}');sys.exit(0 if ok==n else 1)
