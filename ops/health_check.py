"""V13.3 #6 sync health gate. Run after each sync (see ops/workflows/sync.yml).
Fails (exit 1) when the open count moves more than ±30% versus the previous sync, or when more than 2% of checked links are dead.
Appends one line per run to data/sync_health.json (last 200 runs kept)."""
import os,json,sys,datetime
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','data')
def j(p,d):
    try: return json.load(open(os.path.join(D,p)))
    except Exception: return d
def main(write=True):
    h=[x for x in j('sync_history.json',[]) if x.get('ok') is not False];  # V16: compare successful runs only
    m=j('meta.json',{});hl=j('health.json',{})
    cur=h[-1]['open_visible'] if h else None;prev=h[-2]['open_visible'] if len(h)>1 else None
    delta=round(100*(cur-prev)/prev,1) if cur is not None and prev else 0.0
    al=m.get('apply_links') or {};lc=m.get('linkcheck') or {}
    chk=(al.get('checked_this_run') or 0)+(lc.get('checked') or 0);dead=(al.get('failed') or 0)+(lc.get('dead') or 0)
    dead_pct=round(100*dead/chk,2) if chk else 0.0
    fails=[n for a in (hl.get('adapters') or {}).values() for n in (a.get('errors') or [])]
    rec={'at':datetime.datetime.now(datetime.timezone.utc).isoformat()[:19]+'Z','open':cur,'prev_open':prev,'open_change_pct':delta,
         'links_checked':chk,'links_dead':dead,'dead_pct':dead_pct,'failed_sources':len(fails),'stale':hl.get('stale'),'pct_verified_24h':hl.get('pct_verified_24h')}
    problems=[]
    if abs(delta)>30: problems.append(f'open count changed {delta:+}% (limit ±30%)')
    if dead_pct>2: problems.append(f'{dead_pct}% of checked links dead (limit 2%)')
    rec['ok']=not problems;rec['problems']=problems
    if write:
        log=j('sync_health.json',[]);log=(log+[rec])[-200:];json.dump(log,open(os.path.join(D,'sync_health.json'),'w'),indent=1)
    print(json.dumps(rec));return 0 if not problems else 1
if __name__=='__main__': sys.exit(main('--dry' not in sys.argv))
