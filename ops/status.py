"""V16 P2: write data/status.json — a small, public-safe health summary (numbers and timestamps only: no error text,
no URLs, no company names). Built from data/sync_history.json + data/meta.json, so it can be regenerated after a
failed run has rolled the rest of data/ back. Exit code is always 0. Prints the number of consecutive failures."""
import os,sys,json
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
from pipeline.publish import write_json
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','data')
def jl(p,d):
    try:return json.load(open(os.path.join(D,p)))
    except Exception:return d
def build():
    h=jl('sync_history.json',[]);m=jl('meta.json',{})
    fails=0
    for e in reversed(h):
        if e.get('ok',True):break
        fails+=1
    last_ok=next((e for e in reversed(h) if e.get('ok',True)),{})
    return {'schema':1,'data_updated':m.get('updated'),'last_run_at':(h[-1].get('at') if h else None),'last_run_ok':(h[-1].get('ok',True) if h else None),
            'last_success_at':last_ok.get('at'),'consecutive_failures':fails,'open_listings':m.get('open_all'),'verified_24h':m.get('open'),
            'open_live':m.get('open_live'),'mode':m.get('mode'),'live_badge_max_age_min':60}
# V21 Part 2: data/counts.json, written every sync from the published listings (never a literal number).
# open = the same rule the Find page uses (markLive in app.js / pipeline.hygiene): status open, not hidden,
# not past term, deadline today or later. new_today / closed_today use the America/New_York day.
def source_key(r):
    b=(r.get('board') or '').split(':')[0]
    if b: return b
    return {'github-verified':'lead-list','manual':'user-added','api':'feed'}.get(r.get('source_type') or '',r.get('source_type') or 'other')
def source_kind(k):
    return 'lead-list' if k=='lead-list' else 'feed' if k in ('feed','nystate') else 'user-added' if k=='user-added' else 'employer-board'
def is_live(r,today):
    return r.get('status')=='open' and r.get('st')!='closed' and not r.get('hidden') and not r.get('past_term') and not (r.get('deadline') and r['deadline']<today)
def counts(listings,updated,now=None):
    import datetime,collections
    try:
        from zoneinfo import ZoneInfo;tz=ZoneInfo('America/New_York')
    except Exception: tz=datetime.timezone(datetime.timedelta(hours=-5))
    now=now or datetime.datetime.now(datetime.timezone.utc);today=now.astimezone(tz).date().isoformat()
    def nyday(iso):
        if not iso: return None
        try: d=datetime.datetime.fromisoformat(str(iso).replace('Z','+00:00'))
        except Exception: return str(iso)[:10]
        if d.tzinfo is None: d=d.replace(tzinfo=datetime.timezone.utc)
        return d.astimezone(tz).date().isoformat()
    op=[r for r in listings if is_live(r,today)]
    bs=collections.Counter(source_key(r) for r in op);bk=collections.Counter(source_kind(k) for k in (source_key(r) for r in op))
    return {'schema':1,'updated':updated,'day':today,'open':len(op),
            'new_today':sum(1 for r in op if nyday(r.get('first_seen'))==today),
            'closed_today':sum(1 for r in listings if r.get('status')=='closed' and nyday(r.get('closed_at'))==today),
            'by_source':dict(sorted(bs.items(),key=lambda kv:-kv[1])),'by_kind':dict(sorted(bk.items(),key=lambda kv:-kv[1])),
            'open_rule':'status open, not hidden, not past term, deadline today or later (America/New_York)'}
def write_counts():
    L=jl('listings.json',{}).get('listings');m=jl('meta.json',{})
    if not L or not m: return None
    c=counts(L,m.get('updated'));write_json(os.path.join(D,'counts.json'),c,indent=1)
    if m.get('open_live')!=c['open']:  # keep meta (intro counter, pre-listings paint) in lockstep with the Find count
        m['open_live']=c['open'];write_json(os.path.join(D,'meta.json'),m,indent=1)
    return c
if __name__=='__main__':
    try: write_counts()
    except Exception as e: print('counts.json not written:',e,file=sys.stderr)
    try:  # V21 Part 3f: weekly coverage report (once per week, published under data/coverage/)
        sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import coverage_weekly;coverage_weekly.main()
    except Exception as e: print('weekly coverage not written:',e,file=sys.stderr)
    s=build();write_json(os.path.join(D,'status.json'),s,indent=1);print(s['consecutive_failures'])
