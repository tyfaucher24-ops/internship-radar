"""V17 deadline reminders + weekly digest. Run hourly by .github/workflows/email-alerts.yml (copy from ops/workflows/).
Reads opted-in users through the key-checked email_jobs RPC with the public anon key + EMAIL_JOB_KEY (no service_role key).
Env: EMAIL_JOB_KEY, GMAIL_USER, GMAIL_APP_PASSWORD (or EMAIL_PROVIDER=resend + RESEND_API_KEY + EMAIL_FROM later),
     DRY_RUN=1 (render to ops/email-previews/, send nothing, write nothing), FIXTURE=<users json> (instead of the RPC),
     LISTINGS=<path or URL> (default: the live site's data/listings.json), NOW=<ISO time> (tests), DAILY_LIMIT (default 450).
Python stdlib only."""
import os,sys,json,re,ssl,smtplib,subprocess,urllib.request,datetime as dt,html as H
from email.message import EmailMessage
from zoneinfo import ZoneInfo
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE=os.environ.get('SITE_URL','https://tyfaucher24-ops.github.io/internship-radar/').rstrip('/')+'/'
DRY=os.environ.get('DRY_RUN')=='1';PREV=os.path.join(ROOT,'ops','email-previews')
DAILY_LIMIT=int(os.environ.get('DAILY_LIMIT','450'))   # Gmail allows ~500/day; keep headroom
REMIND_HOUR=9                                           # local time reminders go out (once a day max)
CLOSED={'Applied','Online Assessment','Interviewing','Offer','Accepted','Rejected','Ghosted','Withdrawn','Closed','Hidden'}
MAIL_TODO='[TODO: Ty to provide a mailing address for the CAN-SPAM footer]'
def log(*a):print(*a,flush=True)
def cloud_cfg():
    s=open(os.path.join(ROOT,'cloud-config.js')).read()
    return re.search(r"url:'([^']+)'",s).group(1),re.search(r"anonKey:'([^']+)'",s).group(1)
def rpc(fn,body):
    url,key=cloud_cfg();r=urllib.request.Request(url+'/rest/v1/rpc/'+fn,data=json.dumps(body).encode(),method='POST',headers={'apikey':key,'content-type':'application/json'})
    with urllib.request.urlopen(r,timeout=60) as f:t=f.read();return json.loads(t) if t else None
# ---------- sending (one function to swap providers) ----------
def sendEmail(to,subject,html,text):
    prov=os.environ.get('EMAIL_PROVIDER','gmail')
    if prov=='resend':
        r=urllib.request.Request('https://api.resend.com/emails',method='POST',data=json.dumps({'from':os.environ['EMAIL_FROM'],'to':[to],'subject':subject,'html':html,'text':text}).encode(),
            headers={'authorization':'Bearer '+os.environ['RESEND_API_KEY'],'content-type':'application/json'})
        urllib.request.urlopen(r,timeout=30).read();return
    u,p=os.environ['GMAIL_USER'],os.environ['GMAIL_APP_PASSWORD']
    m=EmailMessage();m['From']=f'Intern Index <{u}>';m['To']=to;m['Subject']=subject;m.set_content(text);m.add_alternative(html,subtype='html')
    with smtplib.SMTP_SSL('smtp.gmail.com',465,context=ssl.create_default_context(),timeout=30) as s:s.login(u,p);s.send_message(m)
# ---------- pure logic (unit-tested) ----------
def local_now(now,tz):
    try:return now.astimezone(ZoneInfo(tz or 'America/New_York'))
    except Exception:return now.astimezone(ZoneInfo('America/New_York'))
def ddate(x):
    d=(x or {}).get('deadline')
    try:return dt.date.fromisoformat(str(d)[:10]) if d else None
    except ValueError:return None
def sent_windows(u):return {w for s in u.get('sent') or [] for w in (s.get('windows') or [])}
def sent_on(u,typ,lt,tz):return [s for s in u.get('sent') or [] if s.get('type')==typ and local_now(dt.datetime.fromisoformat(s['sent_at'].replace('Z','+00:00')),tz).date()==lt.date()]
def last_sent(u,typ):
    t=[dt.datetime.fromisoformat(s['sent_at'].replace('Z','+00:00')) for s in u.get('sent') or [] if s.get('type')==typ];return max(t) if t else None
def saved(u,BY):
    """Tracker rows still to act on (status Saved), joined to current listing data (live listing wins over the tracker copy)."""
    out=[]
    for t in u.get('tracker') or []:
        if not isinstance(t,dict) or (t.get('status') or 'Saved')!='Saved' or t.get('hidden'):continue
        lid=str(t.get('listingId') or '');x=BY.get(lid);l=t.get('listing') or {}
        row={'id':lid,'company':(x or l).get('company') or l.get('company') or '','title':(x or l).get('title') or l.get('title') or '',
             'deadline':(x or l).get('deadline'),'rolling':(x or l).get('rolling') or (x and not x.get('deadline')),'apply':(x or {}).get('apply_link') or (x or {}).get('apply_url') or l.get('apply_url') or '',
             'closed':bool(x and x.get('status')=='closed')}
        if row['company'] or row['title']:out.append(row)
    return out
def reminders_due(u,BY,now):
    """Saved roles closing in 7 days (window 7: 3-7 days left) or 2 days (window 2: 0-2 days left), deduped per listing+window.
       One bundled email per user per local day, sent from REMIND_HOUR local. Returns (rows, windows)."""
    if not u.get('reminders'):return [],[]
    lt=local_now(now,u.get('tz'))
    if lt.hour<REMIND_HOUR or sent_on(u,'reminder',lt,u.get('tz')):return [],[]
    done=sent_windows(u);rows,wins=[],[]
    for r in saved(u,BY):
        d=ddate(r)
        if r['closed'] or not d:continue          # rolling / no date: never guess a date, no reminder
        left=(d-lt.date()).days;w='2' if 0<=left<=2 else '7' if 3<=left<=7 else None
        if not w or f"{r['id']}:{w}" in done:continue
        rows.append(dict(r,left=left));wins.append(f"{r['id']}:{w}")
    return sorted(rows,key=lambda r:r['left']),wins
def digest_due(u,now):
    if not (u.get('digest') or u.get('matches')):return False
    lt=local_now(now,u.get('tz'));dow=(lt.weekday()+1)%7     # 0 = Sunday, like the settings
    if dow!=int(u.get('digest_dow') or 0) or lt.hour<int(u.get('digest_hour') if u.get('digest_hour') is not None else 18):return False
    ls=last_sent(u,'digest');return not ls or (now-ls).total_seconds()>5*86400
def digest_content(u,BY,now,matches):
    lt=local_now(now,u.get('tz'));S=saved(u,BY);closing,rolling=[],[]
    if u.get('digest'):
        for r in S:
            d=ddate(r)
            if r['closed']:continue
            if d and 0<=(d-lt.date()).days<=14:closing.append(dict(r,left=(d-lt.date()).days))
            elif not d and r['rolling']:rolling.append(r)
    counts={'saved':0,'applied':0,'interviewing':0}
    for t in u.get('tracker') or []:
        s=(t or {}).get('status') or 'Saved'
        if s=='Saved':counts['saved']+=1
        elif s in ('Applied','Online Assessment'):counts['applied']+=1
        elif s=='Interviewing':counts['interviewing']+=1
    m=[dict(BY[i['id']],pct=i['pct']) for i in (matches or []) if i['id'] in BY][:5] if u.get('matches') else []
    return {'closing':sorted(closing,key=lambda r:r['left']),'rolling':rolling[:3],'matches':m,'counts':counts}
def digest_empty(c):return not c['closing'] and not c['matches']   # counts alone are not worth an email
# ---------- rendering ----------
def lurl(i,t):return f"{SITE}?ref=email&t={t}#l={i}"
def when(r):
    if r.get('deadline'):
        left=r.get('left');d=ddate(r).strftime('%b %-d')
        return f"Closes {d}"+('' if left is None else ' (today)' if left==0 else ' (tomorrow)' if left==1 else f' (in {left} days)')
    return 'Rolling, apply early'
def render(u,kind,body):
    tok=u['unsub_token'];un=lambda t:f"{SITE}#unsub={tok}&t={t}"
    items=[]
    def sec(title,rows,t):
        if rows:items.append((title,[(r['company'],r['title'],when(r) if 'pct' not in r else f"{r['pct']}% match · "+when(r),lurl(r['id'],t),r.get('apply') or r.get('apply_link') or r.get('apply_url') or '') for r in rows]))
    if kind=='reminder':
        rows=body;n=len(rows);subj=f"{n} saved internship{'s' if n!=1 else ''} close{'s' if n==1 else ''} {'soon' if min(r['left'] for r in rows)<=2 else 'this week'}"
        intro='Deadlines are coming up for roles you saved on Intern Index.';sec('Closing soon',rows,'reminder');which='reminders';whyt='deadline reminders'
    else:
        c=body;parts=[]
        if c['closing']:parts.append(f"{len(c['closing'])} saved internship{'s' if len(c['closing'])!=1 else ''} close in the next 2 weeks")
        if c['matches']:parts.append(f"{len(c['matches'])} new match{'es' if len(c['matches'])!=1 else ''} for you")
        subj=' · '.join(parts)[:1].upper()+' · '.join(parts)[1:];intro='Your weekly Intern Index digest.'
        sec('Closing in the next 14 days',c['closing'],'digest');sec('Saved, rolling deadlines',c['rolling'],'digest');sec('New top matches',[dict(m,apply=m.get('apply_link') or m.get('apply_url')) for m in c['matches']],'digest')
        k=c['counts'];items.append(('Your tracker',[(f"{k['saved']} saved · {k['applied']} applied · {k['interviewing']} interviewing",'','',SITE+'#tracker','')]))
        which='digest';whyt='the weekly digest'
    # text
    T=[intro,'']
    for title,rows in items:
        T+=[title.upper()]
        for co,ti,w,link,ap in rows:T+=[f"- {co}{' — '+ti if ti else ''}"+(f"\n  {w}" if w else '')+f"\n  Details: {link}"+(f"\n  Apply: {ap}" if ap else '')]
        T+=['']
    foot=[f"You get this because you turned on email alerts in Intern Index (signed in as {u['email']}).",f"Manage settings: {SITE}#profile",f"Unsubscribe from {whyt}: {un(which)}",f"Unsubscribe from all Intern Index emails: {un('all')}",MAIL_TODO]
    text='\n'.join(T+['--']+foot)
    e=H.escape;rowsh=''
    for title,rows in items:
        rowsh+=f'<h2 style="font-size:16px;margin:24px 0 8px;color:#14172b">{e(title)}</h2>'
        for co,ti,w,link,ap in rows:
            rowsh+=('<div style="border:1px solid #e3e6ef;border-radius:10px;padding:12px 14px;margin:0 0 10px">'
              +f'<div style="font-weight:700;color:#14172b">{e(co)}</div>'+(f'<div style="color:#374151">{e(ti)}</div>' if ti else '')
              +(f'<div style="color:#8a5a00;font-size:14px;margin-top:4px">{e(w)}</div>' if w else '')
              +f'<div style="margin-top:8px;font-size:14px"><a href="{e(link)}" style="color:#4b3cc9">See details</a>'+(f' &nbsp;·&nbsp; <a href="{e(ap)}" style="color:#4b3cc9">Apply on the company site</a>' if ap else '')+'</div></div>')
    html=(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(subj)}</title></head>'
      '<body style="margin:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14172b">'
      '<div style="max-width:560px;margin:0 auto;padding:20px 16px">'
      '<div style="font-size:20px;font-weight:800;margin-bottom:12px">Intern <span style="color:#047857">Index</span></div>'
      f'<div style="background:#fff;border-radius:14px;padding:18px 18px 8px"><p style="margin:0 0 4px;font-size:16px">{e(intro)}</p>{rowsh}</div>'
      f'<div style="font-size:13px;color:#4b5168;line-height:1.5;padding:16px 4px">You get this because you turned on email alerts in Intern Index (signed in as {e(u["email"])}).<br>'
      f'<a href="{e(SITE)}#profile" style="color:#4b3cc9">Manage email settings</a> · <a href="{e(un(which))}" style="color:#4b3cc9">Unsubscribe from {e(whyt)}</a> · <a href="{e(un("all"))}" style="color:#4b3cc9">Unsubscribe from all</a><br>{e(MAIL_TODO)}</div>'
      '</div></body></html>')
    return subj,html,text
# ---------- run ----------
def load_listings():
    src=os.environ.get('LISTINGS') or SITE+'data/listings.json'
    if re.match(r'https?://',src):
        p='/tmp/ii_listings.json';urllib.request.urlretrieve(src,p);src=p
    return src,{str(x['id']):x for x in json.load(open(src)).get('listings',[])}
def find_matches(users,path,now):
    want=[]
    for u in users:
        if not u.get('matches') or not u.get('profile'):continue
        ls=last_sent(u,'digest');since=(ls or now-dt.timedelta(days=7)).date().isoformat()
        want.append({'id':u['user_id'],'profile':u['profile'],'since':since,'exclude':[str((t or {}).get('listingId')) for t in u.get('tracker') or []]})
    if not want:return {}
    r=subprocess.run(['node',os.path.join(ROOT,'ops','email','matches.js')],input=json.dumps({'listings':path,'users':want}),capture_output=True,text=True,timeout=600)
    if r.returncode:log('matches.js failed:',r.stderr[-500:]);return {}
    return json.loads(r.stdout)
def main():
    now=dt.datetime.fromisoformat(os.environ['NOW']).astimezone(dt.timezone.utc) if os.environ.get('NOW') else dt.datetime.now(dt.timezone.utc)
    key=os.environ.get('EMAIL_JOB_KEY','')
    if os.environ.get('FIXTURE'):users=json.load(open(os.environ['FIXTURE']))
    else:
        if not key:log('EMAIL_JOB_KEY not set; nothing to do.');return 0
        users=rpc('email_jobs',{'p_key':key})
    path,BY=load_listings();log(f'{len(users)} opted-in users, {len(BY)} listings, now {now.isoformat()}')
    sent24=sum(1 for u in users for s in u.get('sent') or [] if (now-dt.datetime.fromisoformat(s['sent_at'].replace('Z','+00:00'))).total_seconds()<86400)
    budget=max(0,DAILY_LIMIT-sent24);queue=[]
    M=find_matches([u for u in users if digest_due(u,now)],path,now)
    for u in users:
        rows,wins=reminders_due(u,BY,now)
        if rows:queue.append((u,'reminder',rows,[r['id'] for r in rows],wins))
        if digest_due(u,now):
            c=digest_content(u,BY,now,M.get(u['user_id']))
            if digest_empty(c):log(f"skip empty digest for {u['user_id'][:8]}")
            else:queue.append((u,'digest',c,[r['id'] for r in c['closing']]+[str(m['id']) for m in c['matches']],[]))
    sent=fail=0;os.makedirs(PREV,exist_ok=True) if DRY else None
    for n,(u,kind,body,ids,wins) in enumerate(queue):
        if n>=budget:log(f'daily limit reached: {len(queue)-n} emails deferred to the next run');break
        subj,html,text=render(u,kind,body)
        if DRY:
            b=os.path.join(PREV,f"{kind}-{u['user_id'][:8]}");open(b+'.html','w').write(html);open(b+'.txt','w').write(f'Subject: {subj}\nTo: {u["email"]}\n\n'+text);sent+=1;continue
        try:sendEmail(u['email'],subj,html,text);sent+=1;st,err='sent',None
        except Exception as e:fail+=1;st,err='failed',type(e).__name__+': '+str(e)[:200];log('send failed',u['user_id'][:8],st,err)
        try:rpc('email_log_add',{'p_key':key,'p_user':u['user_id'],'p_type':kind,'p_ids':ids,'p_windows':wins,'p_status':st,'p_error':err})
        except Exception as e:log('log failed',type(e).__name__)
    log(f"{'rendered' if DRY else 'sent'} {sent}, failed {fail}, queued {len(queue)}, budget {budget}");return 1 if fail and not sent else 0
if __name__=='__main__':sys.exit(main())
