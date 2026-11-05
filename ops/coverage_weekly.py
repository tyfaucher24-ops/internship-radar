"""V21 Part 3f: weekly coverage report vs the 141 priority firms (test/coverage.py) + registry growth by discovered_via.
Writes <out>/weekly-YYYY-MM-DD.md (default out: data/coverage, published with the site; once per ISO week unless --force).
Called at the end of ops/status.py each sync ($0, no new workflow step). Local runs can pass --out ops/coverage."""
import os,sys,json,csv,datetime,collections,glob,io,contextlib
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..');sys.path.insert(0,os.path.join(R,'test'));sys.path.insert(0,R)
def main(out=None,force=False):
    out=out or os.path.join(R,'data','coverage');os.makedirs(out,exist_ok=True)
    today=datetime.date.today();wk=today-datetime.timedelta(days=today.weekday())
    if not force and glob.glob(os.path.join(out,f'weekly-*.md')) and any(os.path.basename(p)[7:17]>=wk.isoformat() for p in glob.glob(os.path.join(out,'weekly-*.md'))): return None
    import coverage as C
    with contextlib.redirect_stdout(io.StringIO()): C.main()
    rows=json.load(open(os.path.join(R,'data','coverage.json')))
    c=collections.Counter(r['status'] for r in rows)
    from pipeline.discover import load
    reg=load();via=collections.Counter((r.get('discovered_via') or '').split(':')[0]+(':'+r['discovered_via'].split(':')[1] if (r.get('discovered_via') or '').startswith('probe:V21') else '') for r in reg)
    md=[f'# Weekly coverage {today.isoformat()}','',f'Priority firms ({len(rows)}): covered {c["covered"]} · in registry, 0 open now {c["in registry, 0 open now"]} · not in registry {c["not in registry"]}','',
        f'Registry rows: {len(reg)}','','| discovered via | rows |','|---|---:|']+[f'| {k or "-"} | {v} |' for k,v in via.most_common()]
    md+=['','## Not in registry','']+[f'- {r["firm"]}{" — "+r["note"] if r["note"] else ""}' for r in rows if r['status']=='not in registry']
    md+=['','## In registry, 0 open now','']+[f'- {r["firm"]} ({r["registry"]})' for r in rows if r['status']=='in registry, 0 open now']
    p=os.path.join(out,f'weekly-{today.isoformat()}.md');open(p,'w').write('\n'.join(md)+'\n');return p
if __name__=='__main__':
    a=sys.argv[1:];o=a[a.index('--out')+1] if '--out' in a else None;print(main(o,'--force' in a))
