"""V16 Phase 3: Row Level Security proof on a real Postgres 17 (Supabase shim + the repo's migrations).
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
    for f in ['supabase/tests/shim.sql']+sorted(glob.glob('supabase/migrations/*.sql')):
        r=subprocess.run(run_as+[BIN+'/psql','-h',sock,'-p','55432','-U','postgres','-X','-q','-v','ON_ERROR_STOP=1','-f',f],capture_output=True,text=True)
        t(r.returncode==0,f'apply {f} {r.stderr[:200]}')
    # migrations are re-runnable
    r=subprocess.run(run_as+[BIN+'/psql','-h',sock,'-p','55432','-U','postgres','-X','-q','-v','ON_ERROR_STOP=1','-f',sorted(glob.glob('supabase/migrations/*.sql'))[0]],capture_output=True,text=True);t(r.returncode==0,'migration is idempotent')
    sql(f"insert into auth.users values ('{A}','a@x.test'),('{B}','b@x.test'),('{C}','c@x.test')")
    rls=sql("select string_agg(relname||':'||relrowsecurity::text,',') from pg_class where relnamespace='public'::regnamespace and relkind='r'")[1]
    t(rls and 'false' not in rls,f'RLS on for every public table ({rls})')
    t(sql("insert into user_items(coll,item_id,data) values ('tracker','t1','{\"co\":\"A corp\"}')",'authenticated',A)[0]==0,'A inserts own row (user_id defaults to A)')
    t(sql("insert into user_items(coll,item_id,data) values ('tracker','t1','{\"co\":\"B corp\"}')",'authenticated',B)[0]==0,'B inserts own row with same item id')
    t(sql("select count(*) from user_items",'authenticated',A)[1]=='1','A sees only 1 row (own)')
    t(sql("select data->>'co' from user_items",'authenticated',A)[1]=='A corp','A reads own data, not B')
    t(sql(f"select count(*) from user_items where user_id='{B}'",'authenticated',A)[1]=='0','A filtering on B id gets nothing')
    sql(f"update user_items set data='{{\"co\":\"hacked\"}}' where user_id='{B}'",'authenticated',A)
    t(sql("select data->>'co' from user_items",'authenticated',B)[1]=='B corp','A update of B row has no effect')
    sql(f"delete from user_items where user_id='{B}'",'authenticated',A)
    t(sql("select count(*) from user_items",'authenticated',B)[1]=='1','A delete of B row has no effect')
    t(sql(f"insert into user_items(user_id,coll,item_id,data) values ('{B}','tracker','evil','{{}}')",'authenticated',A)[0]!=0,'A cannot insert a row owned by B')
    t(sql(f"update user_items set user_id='{B}' where item_id='t1'",'authenticated',A)[0]!=0,'A cannot move own row to B')
    t(sql("select count(*) from user_items",'anon')[0]!=0,'anon cannot read user_items at all')
    t(sql("insert into user_items(coll,item_id,data) values ('x','y','{}')",'authenticated',None)[0]!=0,'no JWT -> cannot insert')
    t(sql(f"insert into admins(user_id) values ('{A}')",'authenticated',A)[0]!=0,'user cannot make themselves admin')
    t(sql("select is_admin()",'authenticated',A)[1]=='f','is_admin false for A')
    t(sql("insert into admin_state(key,data) values ('adminConfig','{}')",'authenticated',A)[0]!=0,'non-admin cannot write admin_state')
    sql(f"insert into admins(user_id) values ('{C}')")  # what Ty runs in the dashboard SQL editor
    t(sql("select is_admin()",'authenticated',C)[1]=='t','is_admin true after dashboard grant')
    t(sql("insert into admin_state(key,data) values ('adminConfig','{\"a\":1}')",'authenticated',C)[0]==0,'admin can write admin_state')
    t(sql("select count(*) from admin_state",'authenticated',A)[1]=='0','non-admin reads 0 admin_state rows')
    t(sql("select count(*) from admins",'authenticated',A)[1]=='0','A cannot list admins')
    t(sql("select is_admin()",'anon')[0]!=0,'anon cannot call is_admin')
    sql("update user_items set updated_at=now()+interval '10 days' where item_id='t1'",'authenticated',A)
    t(sql("select updated_at<now()+interval '6 minutes' from user_items",'authenticated',A)[1]=='t','future timestamps clamped')
    big="'{\"x\":\""+'a'*120000+"\"}'"
    t(sql(f"insert into user_items(coll,item_id,data) values ('big','b',{big})",'authenticated',A)[0]!=0,'row over 100 KB refused')
    t(sql("select delete_my_account()",'anon')[0]!=0,'anon cannot call delete_my_account')
    t(sql("select delete_my_account()",'authenticated',B)[0]==0,'B deletes own account')
    t(sql(f"select count(*) from auth.users where id='{B}'")[1]=='0' and sql(f"select count(*) from user_items where user_id='{B}'")[1]=='0','B user + rows gone (cascade)')
    t(sql(f"select count(*) from auth.users where id='{A}'")[1]=='1','A untouched by B deletion')
finally:
    subprocess.run(run_as+[BIN+'/pg_ctl','-D',data,'-m','immediate','stop'],capture_output=True);shutil.rmtree(d,ignore_errors=True)
print(f'{ok}/{n} passed');sys.exit(ok!=n)
