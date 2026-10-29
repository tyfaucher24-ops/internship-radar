"""V17 SQL: email prefs RLS, job-key gate (no service_role anywhere), dedupe log, one-click unsubscribe without login,
analytics insert-only + admin-only stats. Plain Postgres + supabase/tests/shim.sql.
Needs PostgreSQL binaries: /usr/lib/postgresql/*/bin, or PG_BIN=<dir with initdb+pg_ctl> and `pip install psycopg`.
Usage: python3 tests/test_v17_sql.py"""
import os,sys,glob,tempfile,subprocess,json,shutil
BIN=os.environ.get('PG_BIN') or (sorted(glob.glob('/usr/lib/postgresql/*/bin'))[-1] if glob.glob('/usr/lib/postgresql/*/bin') else '')
try: import psycopg
except ImportError: psycopg=None
if not BIN or not psycopg: print('SKIP: needs PostgreSQL binaries and psycopg');sys.exit(0)
d=tempfile.mkdtemp();PORT='55437'
subprocess.run([BIN+'/initdb','-D',d+'/db','-U','postgres','-A','trust'],check=True,capture_output=True)
subprocess.run([BIN+'/pg_ctl','-D',d+'/db','-l',d+'/log','-o',f"-p {PORT} -k {d} -c listen_addresses=''",'-w','start'],check=True,capture_output=True,timeout=60)
A='aaaaaaaa-0000-0000-0000-00000000000a';B='bbbbbbbb-0000-0000-0000-00000000000b'
KEY='k'*20+'-job-key-for-tests-0123456789'
cx=psycopg.connect(host=d,port=PORT,user='postgres',dbname='postgres',autocommit=True)
def sql(q,role=None,uid=None,args=None):
    with cx.cursor() as c:
        try:
            c.execute('reset role');c.execute("select set_config('request.jwt.claims','',false)")
            if uid: c.execute("select set_config('request.jwt.claims',%s,false)",(json.dumps({'sub':uid,'role':'authenticated'}),))
            if role: c.execute(f'set role {role}')
            c.execute(q,args);r=c.fetchall() if c.description else None
            return True,(r[0][0] if r else None)
        except Exception as e: return False,str(e).splitlines()[0]
        finally:
            try: c.execute('reset role')
            except Exception: pass
ok=n=0
def t(c,m):
    global ok,n;n+=1;ok+=bool(c);print(('PASS ' if c else 'FAIL ')+m)
try:
    for f in ['supabase/tests/shim.sql']+sorted(glob.glob('supabase/migrations/*.sql')):
        r=sql(open(f).read());t(r[0],'apply '+os.path.basename(f)+('' if r[0] else ' '+r[1]))
    t(sql(open('supabase/migrations/20261028000005_email_alerts.sql').read())[0],'0005 is safe to re-run')
    sql(f"insert into auth.users(id,email) values ('{A}','a@x.test'),('{B}','b@x.test')");sql(f"insert into admins values ('{A}')")
    t('service_role' not in open('supabase/migrations/20261028000005_email_alerts.sql').read().split('-- 0)')[1],'0005 never grants or needs service_role')
    # prefs
    r=sql("select save_email_prefs('{\"opted_in\":true,\"tz\":\"America/Chicago\",\"digest_hour\":18}'::jsonb)",'authenticated',B);t(r[0] and r[1]['opted_in'],'user B opts in via save_email_prefs')
    t(sql("select count(*) from email_prefs",'authenticated',A)[1]==0,'user A cannot see B\'s prefs row')
    t(not sql("select unsub_token from email_prefs",'authenticated',B)[0],'user cannot read their own unsub token column (no column grant)')
    t(not sql(f"update email_prefs set opted_in=false where user_id='{B}'",'anon')[0],'anon cannot update prefs')
    t(not sql("select save_email_prefs('{}'::jsonb)",'anon')[0],'anon cannot call save_email_prefs')
    # job gate
    t(not sql("select email_jobs(%s)",'anon',args=(KEY,))[0],'email_jobs refuses before the job key is set')
    sql("select set_email_job_key(%s)",args=(KEY,))
    t(not sql("select set_email_job_key('x')",'anon')[0],'anon cannot set the job key')
    t(not sql("select email_jobs(%s)",'anon',args=('wrong'*10,))[0],'email_jobs refuses a wrong key')
    sql(f"insert into user_items(user_id,coll,item_id,data) values ('{B}','tracker','t1','{{\"listingId\":\"L1\",\"status\":\"Saved\"}}'),('{B}','profile','_','{{\"school\":\"Queens\"}}')")
    r=sql("select email_jobs(%s)",'anon',args=(KEY,));t(r[0] and len(r[1])==1 and r[1][0]['email']=='b@x.test' and r[1][0]['tracker'][0]['listingId']=='L1','email_jobs with key returns the opted-in user, email, tracker')
    t(not sql("select count(*) from email_log",'anon')[0] and sql("select count(*) from email_log",'authenticated',B)[0] is False,'nobody but the job reads email_log')
    t(sql(f"select email_log_add(%s,'{B}','reminder',array['L1'],array['L1:7'],'sent',null)",'anon',args=(KEY,))[0],'job logs a send')
    r=sql("select email_jobs(%s)",'anon',args=(KEY,));t(r[1][0]['sent'][0]['windows']==['L1:7'],'sent log comes back for dedupe')
    t(not sql(f"select email_log_add('bad','{B}','reminder',null,null,'sent',null)",'anon')[0],'log refuses a bad key')
    # unsubscribe without login
    tok=sql(f"select unsub_token from email_prefs where user_id='{B}'")[1]
    t(sql("select email_unsubscribe(%s,'digest')",'anon',args=(tok,))[1] is True and sql(f"select digest from email_prefs where user_id='{B}'")[1] is False,'one-click unsubscribe (digest) works with no login')
    t(sql("select email_unsubscribe(%s,'all')",'anon',args=('x'*48,))[1] is False,'unknown token does nothing')
    t(sql("select email_unsubscribe(%s,'all')",'anon',args=(tok,))[1] is True and sql("select email_jobs(%s)",'anon',args=(KEY,))[1]==[],'unsubscribe from all removes the user from the job')
    # events
    t(sql("""select track_events('[{"e":"visit","a":"abcd1234"},{"e":"visit","a":"abcd1234"},{"e":"evil"},{"e":"save"}]'::jsonb)""",'anon')[0],'anon can insert events')
    t(sql("select count(*) from events where event in ('visit','save')")[1]==2,'duplicate daily visit + unknown event ignored')
    t(not sql("select count(*) from events",'anon')[0],'anon cannot read events')
    t(not sql("insert into events(event) values ('visit')",'anon')[0],'anon cannot insert events directly')
    t(sql("select count(*) from events",'authenticated',B)[0] is False,'signed-in user cannot read events')
    sql("""select track_events('[{"e":"signup"},{"e":"signup"},{"e":"save"}]'::jsonb)""",'authenticated',B)
    t(sql(f"select count(*) from events where event='signup' and user_id='{B}'")[1]==1,'signup counted once per user; user_id from the token, not the client')
    t(not sql("select admin_stats_v17()",'anon')[0],'anon cannot read stats')
    t(not sql("select admin_stats_v17()",'authenticated',B)[0],'non-admin cannot read stats')
    r=sql("select admin_stats_v17()","authenticated",A);t(r[0] and r[1]['users']==2 and r[1]['email']['unsub_by_type'].get('all')==1,'admin gets stats (users, unsubscribes by type)')
    t(r[1]['top_schools']==[],'schools with <5 users are hidden')
    t(len(r[1]['cohorts'])>=1 and len(r[1]['cohorts'][0]['weeks'])==8,'8 weekly retention columns')
finally:
    cx.close();subprocess.run([BIN+'/pg_ctl','-D',d+'/db','-m','fast','stop'],capture_output=True);shutil.rmtree(d,ignore_errors=True)
print(f'{ok}/{n} passed');sys.exit(0 if ok==n else 1)
