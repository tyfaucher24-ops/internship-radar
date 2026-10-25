"""V15 addendum 2: decide whether the 5-minute sync should commit.
Exit 0 = commit, exit 1 = skip (nothing real changed, so no empty or timestamp-only commit).
Real change = any staged data file other than the run-bookkeeping files differs from HEAD, or listings.json differs
after ignoring per-run timestamps. A heartbeat commit (meta only) is allowed when the last committed sync is older than
HEARTBEAT_MIN, so the site's 60-minute "Live" honesty check keeps working when listings are quiet."""
import json,subprocess,sys,datetime,os
HEARTBEAT_MIN=int(os.environ.get('HEARTBEAT_MIN','40'))
VOLATILE={'data/meta.json','data/health.json','data/sync_log.json','data/sync_cursor.json','data/state.json'}
TS_KEYS={'generated','last_verified','link_ok_at','updated','checked_at'}
def git(*a,check=True):return subprocess.run(['git',*a],capture_output=True,text=True,check=check).stdout
def strip(o):
    if isinstance(o,dict):return {k:strip(v) for k,v in o.items() if k not in TS_KEYS}
    if isinstance(o,list):return [strip(v) for v in o]
    return o
def changed(paths):
    real=[]
    for p in paths:
        if p in VOLATILE:continue
        if p.endswith('.json'):
            try:
                old=json.loads(git('show','HEAD:'+p));new=json.load(open(p))
                if strip(old)==strip(new):continue
            except Exception:pass
        real.append(p)
    return real
def heartbeat_due(now=None):
    now=now or datetime.datetime.now(datetime.timezone.utc)
    try:m=json.loads(git('show','HEAD:data/meta.json'));t=datetime.datetime.fromisoformat(m['updated'].replace('Z','+00:00'))
    except Exception:return True
    return (now-t).total_seconds()/60>=HEARTBEAT_MIN
def main():
    paths=[p for p in git('diff','--cached','--name-only').split('\n') if p]
    if not paths:print('gate: nothing staged -> skip');return 1
    real=changed(paths)
    if real:print('gate: real changes in',len(real),'file(s) -> commit');return 0
    if heartbeat_due():print('gate: no listing changes; heartbeat due -> commit meta only');return 0
    print('gate: only timestamps changed -> skip (no empty commit)');return 1
if __name__=='__main__':sys.exit(main())
