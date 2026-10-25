"""V15 offline checks: location parsing, ETag conditional requests, sync gate (no empty commits), incremental run time.
Run: python3 tests/test_v15_pipeline.py   (exits 1 on any failure)"""
import os,sys,json,subprocess,tempfile,shutil,time,datetime,http.server,threading
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));sys.path.insert(0,ROOT)
R=[]
def ck(n,c,info=''):R.append((n,bool(c)));print(('PASS' if c else 'FAIL'),n,'' if c else info,flush=True)
from pipeline import norm as N
def city(s):
    p=N.parse_place(s);return (p.get('city'),p.get('state'),bool(p.get('remote'))) if p else None
CASES=[('New York, NY',('New York','NY',False)),('Washington D.C.',('Washington','DC',False)),('US, CA, San Jose, Rio Robles',('San Jose','CA',False)),
 ('Chicago IL USA',('Chicago','IL',False)),('Wyoming, Michigan',('Wyoming','MI',False)),('Douglas Boulevard, Roseville, California',('Roseville','CA',False)),
 ('Corporate - Baton Rouge, LA',('Baton Rouge','LA',False)),('Austin, TX - Main Campus',('Austin','TX',False))]
for s,want in CASES:
    got=city(s);ck('parse '+s,got and got[:2]==want[:2],got)
rp=N.parse_place('Remote - US');ck('parse remote',rp and rp.get('remote'),rp)
ml=N.parse_locations(['Canonsburg, PA/Houston, TX'])[0];ck('multi-city split',len(ml)==2 and {l.get('city') for l in ml}=={'Canonsburg','Houston'},ml)
un=N.parse_locations([''])[0];ck('unlisted location gives no invented city',not any(l.get('city') for l in un),un)
# ETag / If-None-Match: a 304 replays the cached body
class H(http.server.BaseHTTPRequestHandler):
    hits=[]
    def log_message(s,*a):pass
    def do_GET(s):
        H.hits.append(s.headers.get('If-None-Match'))
        if s.headers.get('If-None-Match')=='"v1"':s.send_response(304);s.end_headers();return
        b=b'{"jobs":[1,2]}';s.send_response(200);s.send_header('ETag','"v1"');s.send_header('Content-Type','application/json');s.send_header('Content-Length',str(len(b)));s.end_headers();s.wfile.write(b)
srv=http.server.HTTPServer(('127.0.0.1',0),H);threading.Thread(target=srv.serve_forever,daemon=True).start()
cd=tempfile.mkdtemp();import importlib;from pipeline import net
net.COND_DIR=cd;u=f'http://127.0.0.1:{srv.server_port}/b.json'
a=net.fetch(u,check_robots=False);b=net.fetch(u,check_robots=False)
ck('etag: second request sends If-None-Match',H.hits[-1]=='"v1"',H.hits);ck('etag: 304 replays cached body',b.json()=={'jobs':[1,2]} and a.json()==b.json())
srv.shutdown();shutil.rmtree(cd)
# sync gate: no empty or timestamp-only commits; real change commits; heartbeat after 40 min
g=tempfile.mkdtemp();gate=os.path.join(ROOT,'ops','sync_gate.py')
def sh(*a):return subprocess.run(a,cwd=g,capture_output=True,text=True)
sh('git','init','-q');sh('git','config','user.email','t@t');sh('git','config','user.name','t');os.makedirs(g+'/data')
now=datetime.datetime.now(datetime.timezone.utc)
def w(p,o):json.dump(o,open(g+'/'+p,'w'))
w('data/meta.json',{'updated':now.isoformat()});w('data/listings.json',[{'id':'a','title':'X','last_verified':'t1'}])
sh('git','add','-A');sh('git','commit','-qm','init')
ck('gate: nothing staged -> skip',sh('python3',gate).returncode==1)
w('data/listings.json',[{'id':'a','title':'X','last_verified':'t2'}]);w('data/meta.json',{'updated':(now+datetime.timedelta(minutes=5)).isoformat()});sh('git','add','-A')
ck('gate: timestamp-only change -> skip',sh('python3',gate).returncode==1)
w('data/listings.json',[{'id':'a','title':'X'},{'id':'b','title':'Y'}]);sh('git','add','-A')
ck('gate: new listing -> commit',sh('python3',gate).returncode==0)
sh('git','checkout','-q','--','.');sh('git','reset','-q');w('data/meta.json',{'updated':(now-datetime.timedelta(minutes=50)).isoformat()});sh('git','add','-A');sh('git','commit','-qm','old')
w('data/meta.json',{'updated':now.isoformat()});sh('git','add','-A')
ck('gate: heartbeat when last sync >40 min old',sh('python3',gate).returncode==0)
shutil.rmtree(g)
# workflow file: 5-min cron, shared concurrency group, 5-minute timeout, gate before commit; 2h full sync untouched
y=open(os.path.join(ROOT,'ops/workflows/sync5.yml')).read()
ck('workflow: */5 cron',"*/5 * * * *" in y);ck('workflow: concurrency guard','group: data-sync' in y and 'cancel-in-progress: false' in y)
ck('workflow: timeout 5 min','timeout-minutes: 5' in y);ck('workflow: gate before commit',y.index('sync_gate.py')<y.index('git commit'))
full=open(os.path.join(ROOT,'.github/workflows/sync.yml')).read() if os.path.exists(os.path.join(ROOT,'.github/workflows/sync.yml')) else ''
ck('2-hour full sync kept',not full or 'concurrency' in full or '0 */2' in full or '*/2' in full,full[:200])
# incremental run inside 5 minutes (optional, needs network): V15_NET=1
if os.environ.get('V15_NET'):
    tmp=tempfile.mkdtemp();shutil.copytree(ROOT,tmp+'/r',ignore=shutil.ignore_patterns('.git','node_modules','ops'))
    t=time.time();p=subprocess.run([sys.executable,'-m','pipeline.sync','--workers','24','--incremental','300'],cwd=tmp+'/r',capture_output=True,text=True,timeout=330,env={**os.environ,'RADAR_COND_DIR':tmp+'/c'})
    dt=time.time()-t;ck(f'incremental run < 5 min ({dt:.0f}s)',p.returncode==0 and dt<300,p.stderr[-400:]);shutil.rmtree(tmp)
n=sum(1 for _,c in R if c);print(f'{n}/{len(R)} passed');sys.exit(0 if n==len(R) else 1)
