"""V13.3 #6: list every source whose adapter failed on the last sync (data/health.json) and retry each once, politely."""
import os,sys,json,re,time,datetime
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'));sys.path.insert(0,ROOT)
from pipeline.adapters import ADAPTERS
from pipeline.discover import load as load_registry
from pipeline.net import Blocked
h=json.load(open(os.path.join(ROOT,'data/health.json')));reg=load_registry();out=[]
for ats,a in (h.get('adapters') or {}).items():
    for e in a.get('errors') or []:
        m=re.match(r'^(.*?) \((.*?)\): (.*)$',e);name,slug,err=(m.groups() if m else (e,None,e))
        row=next((r for r in reg if r['ats']==ats and r['slug']==slug),None)
        res={'ats':ats,'company':name,'slug':slug,'last_error':err[:160]}
        if not row: res.update(retry='not in registry');out.append(res);continue
        try: p=ADAPTERS[ats]['fetch'](row);res.update(retry='recovered',postings=len(p))
        except Blocked as x: res.update(retry='robots.txt disallows (left alone)')
        except Exception as x: res.update(retry='still failing',error=f'{type(x).__name__}: {str(x)[:140]}')
        out.append(res);print(res['retry'],ats,slug,flush=True)
s={'run_at':datetime.datetime.now(datetime.timezone.utc).isoformat()[:19]+'Z','failed_last_sync':len(out),
   'recovered':sum(r['retry']=='recovered' for r in out),'still_failing':sum(r['retry']=='still failing' for r in out),'sources':out}
json.dump(s,open(os.path.join(ROOT,'qa-v13.3/failed-sources.json'),'w'),indent=1);print({k:v for k,v in s.items() if k!='sources'})
