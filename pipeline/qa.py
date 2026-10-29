"""V9 accuracy checks + sync report. Runs after pipeline.sync on data/listings.json.
Fixes (never invents): company name re-validated against the registry by board; job-title-looking company names
flagged; city strings normalized only when they geocode to a real US place (else the city is dropped, state kept);
open listings with a past deadline are closed; ATS 'end dates' more than 200 days out are not shown as deadlines;
duplicate company+title+location rows are hidden. Writes data/sync_report.json and appends data/sync_history.json.
Exit code 1 (keeps last good data in the workflow) if the open count collapses or hard checks still fail."""
from pipeline.publish import write_json  # V16 P2: atomic temp+validate+swap writes
import os,re,json,csv,sys,argparse,datetime,collections
sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline import geo
D=os.path.join(os.path.dirname(__file__),'..','data')
TITLEY=re.compile(r'\b(intern|internship|co-?op|engineer(ing)?|analyst|summer 20\d\d|developer)\b',re.I)
def clean_city(city,state):
    if not city or not state: return city
    c=city.strip()
    if c.upper() in ('US','USA','UNITED STATES'): return None
    tries=[c,c.title()]
    if '~' in c: h=c.split('~')[0].strip();tries+=[h,h.title(),re.split(r'[-:]',h)[0].strip().title()]
    for sep in (' - ',': ','-',':'):
        if sep in c: tries+= [c.split(sep)[-1].strip(),c.split(sep)[-1].strip().title()]
    tries+= [re.sub(r'\s+\d.*$','',c).strip().title()]
    for t in tries:
        if t and not re.search(r'\d',t) and geo.geocode(t,state): return t if t!=t.upper() or len(t)<=3 else t.title()
    return None
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--prev');a=ap.parse_args()
    now=datetime.datetime.now(datetime.timezone.utc);today=now.date();NOWS=now.strftime('%Y-%m-%dT%H:%M:%SZ')
    P=os.path.join(D,'listings.json');J=json.load(open(P));L=J['listings']
    reg={}
    for r in csv.DictReader(open(os.path.join(D,'companies.csv'))): reg[(r['ats']+':'+r['slug']).lower()]=r['name']
    fix=collections.Counter();flags=[]
    for r in L:
        b=(r.get('board') or '').lower()
        if b in reg and r.get('company')!=reg[b] and r.get('source_type') in ('ats','jsonld'):
            fix['company_from_registry']+=1;r['company']=reg[b];r['source']=re.sub(r'^.*? careers',reg[b]+' careers',r.get('source') or '')
        if TITLEY.search(r.get('company') or '') and r.get('status')=='open':
            flags.append({'id':r['id'],'company':r['company'],'title':r['title'],'issue':'company looks like a job title'});r['hidden']=True;fix['hidden_bad_company']+=1
        for l in r.get('locations') or []:
            if l.get('city'):
                c=clean_city(l['city'],l.get('state'))
                if c!=l['city']:
                    fix['city_normalized' if c else 'city_dropped_unverifiable']+=1;l['city']=c
                    if c:
                        g=geo.geocode(c,l['state'])
                        if g: l['lat'],l['lng']=g[0],g[1]
                    else: l.pop('lat',None);l.pop('lng',None)
        seen=set();r['locations']=[l for l in (r.get('locations') or []) if not ((l.get('city'),l.get('state')) in seen or seen.add((l.get('city'),l.get('state'))))] or r.get('locations')
        if r.get('deadline'):
            try: dd=datetime.date.fromisoformat(r['deadline'])
            except ValueError: r.pop('deadline');fix['bad_deadline_removed']+=1;continue
            if dd<today and r.get('status')=='open': r['status']='closed';r['closed_at']=NOWS;fix['closed_past_deadline']+=1
            elif r.get('deadline_source')=='ATS close date' and (dd-today).days>200: r.pop('deadline');r.pop('deadline_source',None);fix['far_ats_enddate_not_shown']+=1
    # duplicates among visible open listings
    dk=collections.defaultdict(list)
    for r in L:
        if r.get('status')=='open' and not r.get('hidden'):
            k=(re.sub(r'[^a-z0-9]','',r['company'].lower()),re.sub(r'[^a-z0-9]','',r['title'].lower()),tuple(sorted((l.get('city') or '',l.get('state') or '') for l in r.get('locations') or [])))
            dk[k].append(r)
    for k,v in dk.items():
        if len(v)>1:
            v.sort(key=lambda r:(r.get('source_type')!='ats',-(len(r.get('apply_url') or ''))))
            for r in v[1:]: r['hidden']=True;r['dup_of']=v[0]['id'];fix['duplicates_hidden']+=1
    write_json(P,J,separators=(',',':'))
    vis=[r for r in L if r.get('status')=='open' and not r.get('hidden') and not r.get('past_term')]
    checks={'open_past_deadline':sum(1 for r in vis if r.get('deadline') and r['deadline']<str(today)),
      'company_equals_title':sum(1 for r in vis if r['company'].strip().lower()==r['title'].strip().lower()),
      'company_looks_like_title':sum(1 for r in vis if TITLEY.search(r['company'])),
      'city_not_geocodable':sum(1 for r in vis for l in r.get('locations') or [] if l.get('city') and not geo.geocode(l['city'],l.get('state'))),
      'duplicates':sum(len(v)-1 for v in dk.values() if len(v)>1 and all(not x.get('hidden') for x in v[1:])),
      'no_apply_url':sum(1 for r in vis if not r.get('apply_url'))}
    # sync report vs previous snapshot
    rep={'at':NOWS,'open_visible':len(vis),'fixes':fix,'checks':checks,'flags':flags[:200]}
    if a.prev and os.path.exists(a.prev):
        pv={r['id']:r for r in json.load(open(a.prev)).get('listings',[]) if r.get('status')=='open' and not r.get('hidden')}
        nv={r['id']:r for r in vis}
        ch=[i for i in nv if i in pv and any(pv[i].get(k)!=nv[i].get(k) for k in ('deadline','title','locations','company'))]
        rep.update({'added':len(set(nv)-set(pv)),'removed':len(set(pv)-set(nv)),'changed':len(ch),'previous_open':len(pv)})
        # V16.3: listings nobody had confirmed for 48h+ (e.g. a source that was broken for days) closing on catch-up is cleanup, not a source failure.
        # Only removals of recently confirmed listings count toward the 8% limit; total removals are still capped at 25%.
        cut=(now-datetime.timedelta(hours=48)).strftime('%Y-%m-%dT%H:%M:%SZ');gone=set(pv)-set(nv)
        stale=sum(1 for i in gone if str(pv[i].get('last_verified') or '')<cut and pv[i].get('source_type')=='ats');rep['removed_stale']=stale
        if len(pv)>1000 and (len(nv)<0.6*len(pv) or len(gone)-stale>0.08*len(pv) or len(gone)>0.25*len(pv)): rep['collapse']=True  # V12: a mass close (>8% in one run) means a source failed, not that 8% of jobs closed
        else:
            try:
                from pipeline import changes
                meta=json.load(open(os.path.join(D,'meta.json')))
                rep['events']=changes.update(json.load(open(a.prev)).get('listings',[]),L,meta.get('updated') or NOWS)
            except Exception as e: rep['events_error']=str(e)[:200]
    try:
        logs=json.load(open(os.path.join(D,'sync_log.json')));fs=[l for l in logs if not l.get('ok')]
        rep['sources']={'boards':len(logs),'ok':len(logs)-len(fs),'failed':len(fs),'failed_sample':[f"{l['company']} ({l['ats']}): {str(l.get('error'))[:80]}" for l in fs[:30]]}
    except Exception: pass
    write_json(os.path.join(D,'sync_report.json'),json.loads(json.dumps(rep,default=dict)),indent=1)
    hard=checks['open_past_deadline']+checks['company_equals_title']+checks['company_looks_like_title']
    # V16: failed runs are logged too (ok=false + why). The workflow keeps this file even when it throws the run's data away.
    hp=os.path.join(D,'sync_history.json');h=json.load(open(hp)) if os.path.exists(hp) else []
    e={k:rep.get(k) for k in ('at','open_visible','added','removed','changed')};e['ok']=not(rep.get('collapse') or hard)
    if not e['ok']: e['why']=('collapse: removed %s of %s visible (limit 8%%)'%(rep.get('removed'),rep.get('previous_open'))) if rep.get('collapse') else f'hard checks failed: {hard}'
    if os.environ.get('GITHUB_RUN_ID'): e['run']=os.environ['GITHUB_RUN_ID']
    h.append(e);write_json(hp,h[-200:],indent=0)
    try:
        import subprocess;subprocess.run([sys.executable,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','ops','status.py')],check=False)
    except Exception: pass
    from pipeline import compact;compact.main()
    print(json.dumps({k:rep.get(k) for k in ('open_visible','added','removed','changed','fixes','checks')},default=dict))
    if rep.get('collapse') or hard: print('QA FAILED',file=sys.stderr);sys.exit(1)
if __name__=='__main__': main()
