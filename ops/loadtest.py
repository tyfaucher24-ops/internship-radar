"""V16.6 load check for 500 concurrent users on GitHub Pages + Supabase free tier.
1) Measures one real visit (requests and bytes) in a browser.  2) Fires a polite real burst: N parallel visitors
fetching the same files from the Pages CDN, plus N parallel cheap Supabase calls with the publishable key.
3) Projects 500 concurrent users and monthly use against free-tier limits.
We don't fire 500 at once on purpose: that would hammer shared free infrastructure. The projection is from measured numbers.
Usage: python3 ops/loadtest.py [URL] [N=100]"""
import sys,time,json,re,statistics,concurrent.futures as cf,urllib.request
from playwright.sync_api import sync_playwright
URL=(sys.argv[1] if len(sys.argv)>1 else 'https://tyfaucher24-ops.github.io/internship-radar/').rstrip('/')+'/';N=int(sys.argv[2]) if len(sys.argv)>2 else 100
cfg=urllib.request.urlopen(URL+'cloud-config.js').read().decode();SB=re.search(r"url:'([^']+)'",cfg).group(1);KEY=re.search(r"anonKey:'([^']+)'",cfg).group(1)
with sync_playwright() as pw:
    b=pw.chromium.launch();c=b.new_context();p=c.new_page();res=[]
    p.on('requestfinished',lambda r:res.append((r.url,(r.sizes() or {}).get('responseBodySize',0)+(r.sizes() or {}).get('responseHeadersSize',0))))
    p.goto(URL);t=time.time()
    while time.time()-t<90 and not p.evaluate("()=>typeof BYID!=='undefined'&&BYID.size>0"):time.sleep(.5)
    p.wait_for_timeout(3000);b.close()
pages=[(u,s) for u,s in res if u.startswith(URL)];sb=[(u,s) for u,s in res if SB in u]
vb=sum(s for _,s in pages);print(f'one visit: {len(pages)} requests to Pages, {vb/1e6:.2f} MB on the wire; {len(sb)} Supabase requests')
big=sorted(pages,key=lambda x:-x[1])[:5];[print(f'   {s/1e6:.2f} MB  {u.replace(URL,"")[:70]}') for u,s in big]
files=[u for u,_ in pages]
def visit(i):
    t=time.time();n=0
    for u in files:
        try:n+=len(urllib.request.urlopen(urllib.request.Request(u,headers={'Accept-Encoding':'gzip'}),timeout=60).read())
        except Exception as e:return ('err',str(e)[:80],time.time()-t)
    return ('ok',n,time.time()-t)
t=time.time()
with cf.ThreadPoolExecutor(N) as ex:R=list(ex.map(visit,range(N)))
ok=[r for r in R if r[0]=='ok'];lat=[r[2] for r in ok]
print(f'Pages burst: {N} parallel full visits in {time.time()-t:.1f}s; ok {len(ok)}/{N}; visit time p50 {statistics.median(lat):.1f}s p95 {sorted(lat)[int(.95*len(lat))-1]:.1f}s' if ok else 'Pages burst: all failed '+str(R[:3]))
def sbcall(i):
    t=time.time()
    try:
        r=urllib.request.urlopen(urllib.request.Request(SB+'/auth/v1/settings',headers={'apikey':KEY}),timeout=30);return (r.status,time.time()-t)
    except urllib.error.HTTPError as e:return (e.code,time.time()-t)
    except Exception as e:return (str(e)[:40],time.time()-t)
with cf.ThreadPoolExecutor(N) as ex:S=list(ex.map(sbcall,range(N)))
codes={};[codes.__setitem__(s,codes.get(s,0)+1) for s,_ in S];sl=sorted(x for _,x in S)
print(f'Supabase burst: {N} parallel calls, status {codes}, p50 {statistics.median(sl)*1000:.0f} ms p95 {sl[int(.95*N)-1]*1000:.0f} ms')
# projection
mb=vb/1e6;print('\nProjection for 500 concurrent users (first visit, cold cache):')
print(f'  Pages egress for 500 first visits: {500*mb/1e3:.2f} GB (GitHub Pages soft limit 100 GB/month)')
print(f'  Monthly at 500 daily active users, 1 cold + 4 warm visits/week each: ~{500*mb*4.3*1.6/1e3:.1f} GB/month (warm visits mostly 304s)')
print('  Supabase per signed-in active user: ~3-6 small REST calls per visit (pull, push, rpc), a few KB each.')
print('  Supabase free: 50,000 monthly active users, 500 MB database, 5 GB egress/month, built-in auth email only a few per hour (custom SMTP needed for launch).')
