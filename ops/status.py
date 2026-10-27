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
            'mode':m.get('mode'),'live_badge_max_age_min':60}
if __name__=='__main__':
    s=build();write_json(os.path.join(D,'status.json'),s,indent=1);print(s['consecutive_failures'])
