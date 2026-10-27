"""V16 Phase 5: feedback/analytics/error-log tables are write-only for the public, admin-only to read.
User A can't read/write user B's data; anon sees nothing; nobody can make themselves admin; delete-account cascades.
Needs PostgreSQL binaries (apt install postgresql). Usage: python3 tests/test_v16_rls.py"""
import subprocess,tempfile,os,sys,glob,shutil,time
BIN=sorted(glob.glob('/usr/lib/postgresql/*/bin'))[-1] if glob.glob('/usr/lib/postgresql/*/bin') else ''
if not BIN: print('SKIP: no PostgreSQL binaries');sys.exit(0)
d=tempfile.mkdtemp();data=d+'/db';sock=d
run_as=[] if os.geteuid()!=0 else ['sudo','-u','postgres']
if run_as: shutil.chown(d,'postgres')
subprocess.run(run_as+[BIN+'/initdb','-D',data,'-U','postgres','-A','trust'],check=True,capture_output=True)
subprocess.run(run_as+[BIN+'/pg_ctl','-D',data,'-l',d+'/log','-o',f"-k {sock} -p 55432 -c listen_addresses=''",'-w','start'],check=True,capture_output=True,timeout=60)
A='aaaaaaaa-0000-0000-0000-00000000000a';B='bbbbbbbb-0000-0000-0000-00000000000b';C='cccccccc-0000-0000-0000-00000000000c'
def sql(q,role=None,uid=None):
    pre=''
    if role: pre+=f"set role {role};"
    if uid: pre+=f"select set_config('request.jwt.claims','{{\"sub\":\"{uid}\",\"role\":\"authenticated\"}}',false);"
    r=subprocess.run(run_as+[BIN+'/psql','-h',sock,'-p','55432','-U','postgres','-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-c',pre+q],capture_output=True,text=True)
    return r.returncode,(r.stdout.strip().splitlines() or [''])[-1],r.stderr.strip()
ok=n=0
def t(c,m):
    global ok,n;n+=1;ok+=bool(c);print(('PASS ' if c else 'FAIL ')+m)
try:
    for f in ['supabase/tests/shim.sql']+sorted(glob.glob('supabase/migrations/*.sql'))+[sorted(glob.glob('supabase/migrations/*.sql'))[-1]]:
        r=subprocess.run(run_as+[BIN+'/psql','-h',sock,'-p','55432','-U','postgres','-X','-q','-v','ON_ERROR_STOP=1','-f',f],capture_output=True,text=True)
        t(r.returncode==0,f'apply {os.path.basename(f)} {r.stderr[:200]}')
    sql(f"insert into auth.users(id,email) values ('{A}','a@x.test'),('{B}','b@x.test')");sql(f"insert into admins values ('{A}')")
    H="select set_config('request.headers','{\"x-forwarded-for\":\"%s\"}',false);"
    # anon can count events, only whitelisted names
    t(sql("select track(array['pageview','pageview','save','evil'])",'anon')[0]==0,'anon can call track()')
    t(sql("select coalesce(sum(n),0) from usage_daily")[1]=='3','3 whitelisted events counted, unknown name ignored')
    t(sql("select track(array_fill('pageview'::text,array[21]))",'anon')[0]==0 and sql("select sum(n) from usage_daily")[1]=='3','batch >20 ignored')
    c,o,e=sql("select count(*) from usage_daily",'anon');t(c!=0,'anon cannot read usage_daily')
    t(sql("insert into usage_daily(event,n) values ('pageview',999)",'anon')[0]!=0,'anon cannot write usage_daily directly')
    c,o,e=sql("select count(*) from usage_daily",'authenticated',B);t(c==0 and o=='0','non-admin sees 0 usage rows')
    t(sql("select count(*) from usage_daily",'authenticated',A)[1]!='0','admin sees usage rows')
    # reports
    t(sql(H%'1.1.1.1'+"select submit_report('closed','L1',null,'drawer')",'anon')[1]=='t','anon report accepted')
    sql(H%'1.1.1.1'+"select submit_report('closed','L1',null,'drawer')",'anon')
    sql(H%'2.2.2.2'+"select submit_report('closed','L1','gone','drawer')",'anon')
    t(sql("select count(*) from reports")[1]=='2','duplicate report from same reporter deduped')
    t(sql(H%'1.1.1.1'+"select submit_report('spam','L1',null,null)",'anon')[1]=='f','unknown kind rejected')
    t(sql("select count(*) from reports where reporter like '%1.1%' or reporter='1.1.1.1'")[1]=='0','raw IP never stored')
    t(sql("select count(*) from reports",'anon')[0]!=0,'anon cannot read reports')
    t(sql("select count(*) from reports",'authenticated',B)[1]=='0','non-admin sees 0 reports')
    t(sql("select count(*) from reports",'authenticated',A)[1]=='2','admin sees reports')
    t(sql("select reporters from report_counts() where listing_id='L1' and kind='closed'",'anon')[1]=='2','report_counts() gives distinct reporters to anon')
    c,o,e=sql("select note from report_counts()",'anon');t(c!=0,'report_counts() exposes no notes')
    for i in range(22): sql(H%'3.3.3.3'+f"select submit_report('broken','X{i}',null,null)",'anon')
    t(sql("select count(*) from reports where listing_id like 'X%'")[1]=='20','per-reporter daily cap (20)')
    t(sql("update reports set status='done' where listing_id='L1'",'authenticated',B)[0]==0 and sql("select count(*) from reports where status='done'")[1]=='0','non-admin cannot change status')
    t(sql("update reports set status='done' where listing_id='L1'",'authenticated',A)[0]==0 and sql("select count(*) from reports where status='done'")[1]=='2','admin can mark done')
    t(sql("update reports set note='x' where listing_id='L1'",'authenticated',A)[0]!=0,'admin cannot rewrite notes (status column only)')
    # errors
    for i in range(12): sql(H%'4.4.4.4'+"select log_error('TypeError: x','app.js:1','abc')",'anon')
    t(sql("select count(*) from client_errors")[1]=='10','error log capped at 10/hour per caller')
    t(sql("select count(*) from client_errors",'anon')[0]!=0 and sql("select count(*) from client_errors",'authenticated',B)[1]=='0','errors unreadable by anon/non-admin')
    # admin stats
    c,o,e=sql("select admin_stats()",'authenticated',B);t(c!=0 and 'not an admin' in e,'admin_stats() refuses non-admin')
    t(sql("select admin_stats()",'anon')[0]!=0,'admin_stats() refuses anon')
    c,o,e=sql("select admin_stats()->>'users'",'authenticated',A);t(c==0 and o=='2','admin_stats() works for admin')
    t(sql("select _caller_hash()",'anon')[0]!=0,'_caller_hash() not callable by the public')
finally:
    subprocess.run(run_as+[BIN+'/pg_ctl','-D',data,'-m','immediate','stop'],capture_output=True);shutil.rmtree(d,ignore_errors=True)
print(f'{ok}/{n} passed');sys.exit(ok!=n)
