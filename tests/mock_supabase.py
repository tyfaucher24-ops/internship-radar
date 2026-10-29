"""Tiny stand-in for Supabase Auth + PostgREST used by tests/test_v16_cloud.py (no network, no account needed).
It mirrors the behaviour the real database enforces (proven separately on Postgres by tests/test_v16_rls.py):
rows are scoped to the token's user, user_id must equal the caller, LWW keeps the newer updated_at, admins via table."""
import json,threading,uuid,time,urllib.parse
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
class DB:
    def __init__(s):s.users={};s.tokens={};s.refresh={};s.rows={};s.admins=set();s.links={};s.log=[];s.events=[];s.reports=[];s.errors=[];s.no0003=False;s.down=False;s.google=True;s.otp_err=None;s.prefs={};s.ev17=[];s.unsubs=[];s.stats17=None
    def user_for_email(s,e):
        for u in s.users.values():
            if u['email']==e:return u
        u={'id':str(uuid.uuid4()),'email':e,'created_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())};s.users[u['id']]=u;return u
    def issue(s,uid):
        a='at-'+uuid.uuid4().hex;r='rt-'+uuid.uuid4().hex;s.tokens[a]=uid;s.refresh[r]=uid;return a,r
def make(db):
    class H(BaseHTTPRequestHandler):
        def log_message(s,*a):pass
        def cors(s):
            s.send_header('access-control-allow-origin','*');s.send_header('access-control-allow-headers','apikey,authorization,content-type,prefer,range,range-unit');s.send_header('access-control-allow-methods','GET,POST,PATCH,DELETE,OPTIONS');s.send_header('access-control-expose-headers','content-range')
        def out(s,code,obj=None):
            b=b'' if obj is None else json.dumps(obj).encode();s.send_response(code);s.cors();s.send_header('content-type','application/json');s.send_header('content-length',str(len(b)));s.end_headers();s.wfile.write(b)
        def do_OPTIONS(s):s.send_response(204);s.cors();s.end_headers()
        def body(s):
            n=int(s.headers.get('content-length') or 0);return json.loads(s.rfile.read(n) or b'null') if n else None
        def uid(s):
            a=(s.headers.get('authorization') or '').replace('Bearer ','');return db.tokens.get(a)
        def do_GET(s):
            u=urllib.parse.urlparse(s.path);q=urllib.parse.parse_qs(u.query);db.log.append(('GET',u.path))
            if u.path=='/auth/v1/authorize':  # browser navigation (no apikey header), like real Supabase OAuth
                to=q.get('redirect_to',[''])[0];db.log.append(('AUTHZ',q.get('provider',[''])[0],to))
                if not db.google:loc=to+'?error=validation_failed&error_code=validation_failed&error_description=Unsupported+provider%3A+provider+is+not+enabled'
                elif db.google=='deny':loc=to+'?error=access_denied&error_code=access_denied&error_description=The+user+denied+access'
                else:
                    usr=db.user_for_email('gee@test.dev');a,r=db.issue(usr['id']);loc=to+'#access_token='+a+'&refresh_token='+r+'&expires_in=3600&token_type=bearer&provider_token=x'
                # stands in for Google's consent screen, then sends the browser back to redirect_to
                h=('<!doctype html><title>Google</title><script>location.replace('+json.dumps(loc)+')</script>').encode()
                s.send_response(200);s.send_header('content-type','text/html');s.send_header('content-length',str(len(h)));s.end_headers();s.wfile.write(h);return
            if s.headers.get('apikey')!='test-anon' and not u.path.startswith('/__test'):return s.out(401,{'message':'no apikey'})
            if u.path=='/__test/link':  # what the magic-link email would contain after /auth/v1/verify
                e=q['email'][0];to=db.links.get(e)
                if not to:return s.out(404,{})
                usr=db.user_for_email(e);a,r=db.issue(usr['id'])
                return s.out(200,{'url':to+'#access_token='+a+'&refresh_token='+r+'&expires_in=3600&token_type=bearer&type=magiclink'})
            if u.path=='/auth/v1/settings':return s.out(503,{'message':'down'}) if db.down else s.out(200,{'external':{'email':True}})
            if u.path=='/auth/v1/user':
                i=s.uid();return s.out(200,db.users[i]) if i in db.users else s.out(401,{'message':'invalid'})
            if u.path=='/rest/v1/user_items':
                i=s.uid()
                if not i:return s.out(401,{'message':'JWT required'})  # anon has no grant on user_items
                rows=sorted([r for r in db.rows.values() if r['user_id']==i],key=lambda r:(r['coll'],r['item_id']))
                a,b=(s.headers.get('range') or '0-999').split('-');rows=rows[int(a):int(b)+1]
                return s.out(200,[{k:r[k] for k in ('coll','item_id','data','deleted','updated_at')} for r in rows])
            s.out(404,{})
        def do_POST(s):
            u=urllib.parse.urlparse(s.path);q=urllib.parse.parse_qs(u.query);b=s.body();db.log.append(('POST',u.path))
            if s.headers.get('apikey')!='test-anon':return s.out(401,{'message':'no apikey'})
            if u.path=='/auth/v1/otp' and db.otp_err:return s.out(db.otp_err[0],db.otp_err[1])
            if u.path=='/auth/v1/otp':db.links[b['email']]=q.get('redirect_to',[''])[0];return s.out(200,{})
            if u.path=='/auth/v1/token':
                i=db.refresh.pop(b.get('refresh_token'),None)
                if not i:return s.out(400,{'error_description':'invalid refresh token'})
                a,r=db.issue(i);return s.out(200,{'access_token':a,'refresh_token':r,'expires_in':3600,'user':db.users[i]})
            if u.path=='/auth/v1/logout':
                db.tokens.pop((s.headers.get('authorization') or '').replace('Bearer ',''),None);return s.out(204)
            i=s.uid()
            if u.path in ('/rest/v1/rpc/track','/rest/v1/rpc/submit_report','/rest/v1/rpc/log_error','/rest/v1/rpc/admin_stats') and db.no0003:return s.out(404,{'message':'function not found'})
            if u.path=='/rest/v1/rpc/track':db.events+=[e for e in (b or {}).get('events',[])[:20]];return s.out(204)
            if u.path=='/rest/v1/rpc/submit_report':db.reports.append(b);return s.out(200,True)
            if u.path=='/rest/v1/rpc/log_error':db.errors.append(b);return s.out(204)
            if u.path=='/rest/v1/rpc/admin_stats':
                if i not in db.admins:return s.out(403,{'message':'not an admin'})
                return s.out(200,{'users':len(db.users),'signups_7d':len(db.users),'signups_by_day':[],'usage_7d':{e:db.events.count(e) for e in set(db.events)},'reports_open':len(db.reports),'reports_recent':[{'id':n,'created_at':'2026-10-27T12:00:00Z','kind':r['p_kind'],'listing_id':r['p_listing_id'],'note':r['p_note'],'page':r['p_page'],'status':'open'} for n,r in enumerate(db.reports)],'errors_24h':len(db.errors),'errors_recent':[{'msg':e['p_msg'],'n':1,'last':'2026-10-27T12:00:00Z'} for e in db.errors]})
            # V17 (migration 0005) stand-ins; real enforcement is proven on Postgres by tests/test_v17_sql.py
            if u.path=='/rest/v1/rpc/track_events':db.ev17+=[dict(e,uid=i) for e in (b or {}).get('p_events',[])[:25]];return s.out(204)
            if u.path=='/rest/v1/rpc/save_email_prefs':
                if not i:return s.out(401,{'message':'signed out'})
                p=db.prefs.setdefault(i,{'opted_in':False,'digest':True,'reminders':True,'matches':True,'digest_dow':0,'digest_hour':18,'tz':'America/New_York','unsub_token':'a'*48})
                p.update({k:v for k,v in ((b or {}).get('p') or {}).items() if k in p and k!='unsub_token'});return s.out(200,{k:v for k,v in p.items() if k!='unsub_token'})
            if u.path=='/rest/v1/rpc/email_unsubscribe':
                for p in db.prefs.values():
                    if p['unsub_token']==b.get('p_token'):
                        t=b.get('p_type');db.unsubs.append(t)
                        if t=='all':p['opted_in']=False
                        else:p[t]=False
                        return s.out(200,True)
                return s.out(200,False)
            if u.path=='/rest/v1/rpc/admin_stats_v17':
                if i not in db.admins:return s.out(403,{'message':'not an admin'})
                return s.out(200,db.stats17 or {'users':len(db.users),'signups_7d':0,'signups_30d':0,'dau':0,'wau':0,'mau':0,'saves_7d':0,'apply_clicks_7d':0,'email_subscribers':0,'daily':[],'funnel':{},'cohorts':[],'top_companies':[],'top_roles':[],'top_schools':[],'email':{'sent':0,'clicks':0,'unsub_by_type':{}}})
            if u.path=='/rest/v1/rpc/is_admin':return s.out(200,i in db.admins) if i else s.out(401,{})
            if u.path=='/rest/v1/rpc/delete_my_account':
                if not i:return s.out(401,{})
                db.users.pop(i,None);db.rows={k:v for k,v in db.rows.items() if v['user_id']!=i};db.admins.discard(i)
                for t in [t for t,v in db.tokens.items() if v==i]:db.tokens.pop(t)
                return s.out(204)
            if u.path=='/rest/v1/user_items':
                if not i:return s.out(401,{})
                rows=b if isinstance(b,list) else [b]
                if any(r.get('user_id',i)!=i for r in rows):return s.out(403,{'message':'new row violates row-level security policy'})
                for r in rows:
                    k=(i,r['coll'],r['item_id']);old=db.rows.get(k)
                    if old and old['updated_at']>r['updated_at']:continue  # server-side LWW (migration 0002 trigger)
                    db.rows[k]={'user_id':i,'coll':r['coll'],'item_id':r['item_id'],'data':r.get('data'),'deleted':bool(r.get('deleted')),'updated_at':r['updated_at']}
                return s.out(201)
            s.out(404,{})
    return H
def start(port=54321):
    db=DB();srv=ThreadingHTTPServer(('127.0.0.1',port),make(db));threading.Thread(target=srv.serve_forever,daemon=True).start();return db,srv
