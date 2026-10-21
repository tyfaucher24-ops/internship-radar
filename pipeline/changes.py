"""V11: real market events for the ticker, computed from an actual sync diff (previous listings snapshot vs the new one).
Only three event kinds, all verifiable from the two snapshots:
  new      - open and visible now, not open before, and first seen during this sync
  closed   - open and visible before, marked closed by this sync (hidden-by-QA rows are NOT counted as closed)
  deadline - open in both, both have a deadline, and it changed
Writes data/changes.json: {"updated": ISO, "events": [...]} keeping the last 7 days (max 400 events). Nothing is ever simulated."""
import json,os,datetime
D=os.path.join(os.path.dirname(__file__),'..','data')
def _loc(r):
    L=r.get('locations') or []
    if L and isinstance(L[0],dict): l=L[0];s=', '.join(x for x in (l.get('city'),l.get('state')) if x)
    else: s=''
    return s or ('Remote' if r.get('remote') else '')
def events(prev,cur,at):
    P={r['id']:r for r in prev};C={r['id']:r for r in cur}
    po=lambda r:r and r.get('status')=='open' and not r.get('hidden')
    gen=min((r.get('first_seen') or at) for r in cur) if cur else at
    pgen=max((r.get('last_verified') or '') for r in prev) if prev else ''
    ev=[]
    for i,r in C.items():
        p=P.get(i)
        if po(r) and not po(p) and (r.get('first_seen') or '')>=pgen and p is None:
            ev.append({'t':at,'k':'new','id':i,'co':r['company'],'ti':r['title'],'loc':_loc(r)})
        elif po(p) and r.get('status')=='closed':
            ev.append({'t':at,'k':'closed','id':i,'co':r['company'],'ti':r['title'],'loc':_loc(r)})
        elif po(p) and po(r) and p.get('deadline') and r.get('deadline') and p['deadline']!=r['deadline']:
            ev.append({'t':at,'k':'deadline','id':i,'co':r['company'],'ti':r['title'],'loc':_loc(r),'from':p['deadline'],'to':r['deadline']})
    return ev
def update(prev,cur,at):
    fp=os.path.join(D,'changes.json');old=json.load(open(fp)) if os.path.exists(fp) else {'events':[]}
    cut=(datetime.datetime.fromisoformat(at.replace('Z','+00:00'))-datetime.timedelta(days=7)).isoformat().replace('+00:00','Z')
    keep=[e for e in old.get('events',[]) if e['t']>=cut and e['t']!=at]
    new=events(prev,cur,at);order={'new':0,'deadline':1,'closed':2}
    new.sort(key=lambda e:(order[e['k']],e['co']))
    allv=(new+keep)[:400]
    json.dump({'updated':at,'source':'sync diff (previous vs new listings snapshot)','events':allv},open(fp,'w'),ensure_ascii=False,separators=(',',':'))
    c={k:sum(1 for e in new if e['k']==k) for k in order};print('changes.json',c,'kept',len(keep));return c
