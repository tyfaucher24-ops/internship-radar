"""Daily link check: re-open every open listing that is not confirmed by an ATS API on each sync
(GitHub-list leads, hand-checked records, submissions). Dead links are closed; live ones get last_verified."""
import os,json,datetime,concurrent.futures as cf
from .sync import verify_link
D=os.path.join(os.path.dirname(__file__),'..','data')
def main():
    p=os.path.join(D,'listings.json');L=json.load(open(p));now=datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()
    todo=[r for r in L['listings'] if r.get('status')=='open' and r.get('source_type') not in ('ats','usajobs') and r.get('apply_url')]
    res={'checked':len(todo),'live':0,'dead':0,'unknown':0}
    with cf.ThreadPoolExecutor(16) as ex:
        for r,ok in zip(todo,ex.map(lambda r:verify_link(r['apply_url']),todo)):
            if ok is True: r['last_verified']=now;r['link_ok_at']=now;res['live']+=1
            elif ok is False: r['status']='closed';r['closed_at']=now;r['close_reason']='link check: posting gone';res['dead']+=1
            else: res['unknown']+=1
    json.dump(L,open(p,'w'),ensure_ascii=False,separators=(',',':'))
    m=json.load(open(os.path.join(D,'meta.json')));cut=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(hours=24)).isoformat()
    op=[r for r in L['listings'] if r.get('status')=='open' and not r.get('hidden') and not r.get('past_term')]
    v=[r for r in op if (r.get('last_verified') or '')>cut];today=datetime.date.today()
    m.update(open=len(v),open_all=len(op),closing_this_week=sum(1 for r in v if r.get('deadline') and 0<=(datetime.date.fromisoformat(r['deadline'])-today).days<=7),linkcheck={'at':now,**res})
    json.dump(m,open(os.path.join(D,'meta.json'),'w'),indent=1);print(res)
if __name__=='__main__': main()
