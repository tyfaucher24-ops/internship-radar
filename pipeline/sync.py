"""Sync: run every adapter over the company registry, verify GitHub-list leads against the company's own posting,
merge hand-checked + approved submissions, normalize, dedupe, track freshness, predict Upcoming windows, write data/.
On adapter failure the last good listings for that company are kept (with their true last_verified time)."""
import os,sys,json,csv,time,datetime,re,collections,traceback,hashlib,argparse,concurrent.futures as cf,urllib.parse
from . import norm as N
from .adapters import ADAPTERS
from .net import fetch,Blocked,allowed
from .discover import load as load_registry,GITHUB_LISTS,ats_from_url
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'));D=os.path.join(ROOT,'data')
NOW=datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0);NOWS=NOW.isoformat().replace('+00:00','Z')
RANK={'ats':1,'usajobs':1,'jsonld':2,'manual':3,'github-verified':4,'submission':5}
def jload(p,d):
    try: return json.load(open(p))
    except Exception: return d
def build_record(raw,company_row,source,source_type):
    title=re.sub(r'\s+',' ',raw.get('title') or '').strip()
    desc=N.clean_html(raw.get('desc') or '')
    locs,remote,us=N.parse_locations(raw.get('locations') or [])
    if not us: return None,'non-US'
    cls=N.intern_class(title)
    if cls!='yes': return None,cls
    company=N.norm_company(raw.get('company_override') or company_row.get('name'))
    terms=N.terms_from(title,desc[:1500],raw.get('term_hint') or '')
    posted=raw.get('posted')
    dl,dlsrc=None,None
    if raw.get('deadline'): dl,dlsrc=raw['deadline'],raw.get('deadline_source') or ('JSON-LD validThrough' if source_type=='jsonld' else 'ATS close date')
    else:
        dl,ctx=N.deadline_from_text(desc,posted)
        if dl: dlsrc='posting text: “'+ctx+'”'
    if dl:
        try:
            if datetime.date.fromisoformat(dl)<datetime.date(2020,1,1): dl=None
        except ValueError: dl=None
    paid,paytext=N.pay(desc)
    if raw.get('pay_text'): paid,paytext=True,raw['pay_text']
    sp=N.sponsorship(desc) or raw.get('sponsorship_hint')
    rec={'company':company,'title':title,'category':N.category(title,raw.get('dept') or '',raw.get('cat_hint')),'sector':company_row.get('industry') or None,'role_type':N.role_type(title),
      'locations':[{k:v for k,v in l.items() if k in('city','state','lat','lng')} for l in locs],'remote':remote,'workplace':N.workplace(desc,raw.get('locations'),remote,raw.get('workplace')),
      'deadline':dl,'deadline_source':dlsrc,'rolling':bool(not dl and N.rolling_from_text(desc)),'terms':terms,'season':None,'year':None,'past_term':N.past_term(terms),
      'class_years':N.class_years(title,desc),'apply_url':raw.get('url'),'source':source,'source_type':source_type,'posted':posted,
      'size':company_row.get('size') or None,'sponsorship':sp,'citizenship':N.citizenship(desc),'paid':paid,'pay':paytext,'gpa_min':N.gpa_min(desc),'openings':N.openings(desc),
      'metro_pop':max([l.get('pop') or 0 for l in locs] or [0]) or None,'ats_id':raw.get('ats_id'),'_desc':desc[:3000]}
    up=[t for t in terms if (int(t[-4:]),N.ORDER[t.split()[0]])>N.cur_term_tuple()] or terms
    if up: rec['season'],rec['year']=up[0].split()[0],int(up[0][-4:])
    key=N.dedupe_key(company,title,rec['locations'],terms);rec['key']=key;rec['id']=N.stable_id(key)
    return rec,'ok'
def run_registry(reg,workers,only=None,limit=None):
    results={};logs=[]
    rows=[r for r in reg if r['ats'] in ADAPTERS and (not only or r['ats'] in only)]
    seen=set();uniq=[]
    for r in rows:
        k=(r['ats'],r['slug'].lower())
        if k not in seen: seen.add(k);uniq.append(r)
    if limit: uniq=uniq[:limit]
    def one(r):
        t0=time.time()
        try: posts=ADAPTERS[r['ats']]['fetch'](r);return r,posts,None,time.time()-t0
        except Blocked as e: return r,None,'robots: '+str(e),time.time()-t0
        except Exception as e: return r,None,f'{type(e).__name__}: {str(e)[:200]}',time.time()-t0
    with cf.ThreadPoolExecutor(workers) as ex:
        for i,(r,posts,err,dt) in enumerate(ex.map(one,uniq)):
            results[(r['ats'],r['slug'])]=(r,posts,err);logs.append({'ats':r['ats'],'slug':r['slug'],'company':r['name'],'ok':err is None,'error':err,'postings':len(posts or []),'secs':round(dt,1)})
            if i%200==0: print(f'  adapters {i}/{len(uniq)}',file=sys.stderr,flush=True)
    return results,logs
def github_leads(cache_dir):
    """Listings from public GitHub lists whose links are NOT on a registry ATS board: verified by opening the company's posting."""
    leads=[]
    for name,url,kind in GITHUB_LISTS:
        p=os.path.join(cache_dir,N.nkey(name)+('.json' if kind=='json' else '.md'))
        if not os.path.exists(p): continue
        if kind=='json':
            for x in json.load(open(p)):
                if not x.get('active') or x.get('is_visible') is False: continue
                leads.append({'company':x.get('company_name'),'title':x.get('title'),'url':x.get('url'),'locations':x.get('locations') or [],'posted':datetime.datetime.fromtimestamp(x['date_posted'],datetime.timezone.utc).date().isoformat() if x.get('date_posted') else None,
                  'terms':', '.join(x.get('terms') or [])+' '+(x.get('season') or ''),'sponsorship':{'Does Not Offer Sponsorship':'Not offered','Offers Sponsorship':'Offered','U.S. Citizenship is Required':'Not offered'}.get(x.get('sponsorship')),
                  'cit':x.get('sponsorship')=='U.S. Citizenship is Required','cat':N.SIMPLIFY_CAT.get(x.get('category')),'list':name})
        elif 'zapply' in name:
            sec=None
            for line in open(p):
                m=re.search(r'<strong>(.*?)</strong></h3>',line)
                if m: sec=m.group(1);continue
                m=re.match(r'\| \*\*(.+?)\*\* \| (.+?) \| (.+?) \| (.*?) \|.*?\]\((https?://[^)]+)\)',line)
                if m: leads.append({'company':m.group(1),'title':N.html.unescape(m.group(2)),'url':m.group(5),'locations':[m.group(3)],'posted':None,'terms':'','list':name,'cat':None})
    return leads
DEAD=re.compile(r'(job|position|posting|requisition|opening)\s+(is\s+)?(no longer|not)\s+(available|active|open|accepting|found)|page (you requested )?(was )?not (be )?found|this (job|position) (has been|was) (filled|closed|removed)|no longer accepting applications',re.I)
def verify_link(u):
    """True = posting page is live, False = gone, None = could not check (blocked/timeout)."""
    if not u or not u.startswith('http'): return None
    try:
        if not allowed(u): return None
        r=fetch(u,allow_404=True,tries=2,timeout=20,check_robots=False)
        if r.status_code in (404,410): return False
        if r.status_code>=400: return None
        final=r.url
        if re.search(r'[?&]error=true|/jobs/?$|/careers/?$|job-not-found|/404',final) and final.rstrip('/')!=u.rstrip('/'): return False
        if DEAD.search(r.text[:200000]): return False
        return True
    except Exception: return None
def predict_upcoming(open_recs,history,registry):
    """Upcoming windows from REAL past posting dates only (GitHub list history + our first_seen history)."""
    have=collections.defaultdict(set)
    for r in open_recs:
        for t in r['terms'] or []: have[N.nkey(r['company'])].add(t)
    target=f'Summer {N.acad_year_end()}'
    byco=collections.defaultdict(lambda:collections.defaultdict(list));names={};links={}
    for h in history:
        if not h.get('posted') or not h.get('term','').startswith('Summer'): continue
        k=N.nkey(N.norm_company(h['company']));names[k]=N.norm_company(h['company'])
        byco[k][h['term']].append(h['posted']);links.setdefault(k,h.get('board') or h.get('url'))
    out=[]
    for k,seasons in byco.items():
        if target in have.get(k,set()) or any(t.startswith('Summer') and int(t[-4:])>=int(target[-4:]) for t in have.get(k,set())): continue
        firsts=[]
        for term,dates in seasons.items():
            y=int(term[-4:]);d=min(dates);dd=datetime.date.fromisoformat(d[:10])
            if not (datetime.date(y-1,6,1)<=dd<=datetime.date(y,6,30)): continue
            firsts.append((term,dd))
        if not firsts: continue
        ty=int(target[-4:]);proj=[]
        for term,dd in firsts:
            shift=ty-int(term[-4:])
            try: proj.append(dd.replace(year=dd.year+shift))
            except ValueError: proj.append(dd.replace(year=dd.year+shift,day=28))
        proj.sort();med=proj[len(proj)//2];spread=(proj[-1]-proj[0]).days
        if med<N.TODAY-datetime.timedelta(days=45): continue
        conf='high' if len(proj)>=2 and spread<=21 else 'medium' if len(proj)>=2 else 'low'
        part='early' if med.day<=10 else 'mid' if med.day<=20 else 'late'
        label=f"Usually opens {part} {med.strftime('%B')}"
        basis='; '.join(f"{t} first posted {d.strftime('%b %-d, %Y')}" for t,d in sorted(firsts,key=lambda x:x[0]))
        board=links.get(k);reg=next((r for r in registry if N.nkey(r['name'])==k),None)
        if reg and reg['ats']=='greenhouse': board=f"https://job-boards.greenhouse.io/{reg['slug']}"
        elif reg and reg['ats']=='lever': board=f"https://jobs.lever.co/{reg['slug']}"
        elif reg and reg['ats']=='ashby': board=f"https://jobs.ashbyhq.com/{reg['slug']}"
        elif board: p=urllib.parse.urlsplit(board);board=f'{p.scheme}://{p.netloc}'
        key=f'upcoming|{k}|{target}';out.append({'id':N.stable_id(key),'key':key,'company':names[k],'title':f'{target} internships (expected)','category':None,'role_type':'Internship','locations':[],'remote':False,'workplace':None,
          'deadline':None,'rolling':False,'terms':[target],'season':'Summer','year':ty,'past_term':False,'class_years':[],'apply_url':board,'source':'Prediction from posting history','source_type':'prediction',
          'status':'upcoming','pred':{'label':label,'date':med.isoformat(),'confidence':conf,'basis':basis}})
    return out
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--workers',type=int,default=24);ap.add_argument('--only');ap.add_argument('--limit',type=int);ap.add_argument('--skip-leads',action='store_true');ap.add_argument('--lead-limit',type=int,default=4000)
    a=ap.parse_args();t0=time.time()
    reg=load_registry();prev=jload(os.path.join(D,'listings.json'),{'listings':[]});prevL={x['id']:x for x in prev.get('listings',[])}
    state=jload(os.path.join(D,'state.json'),{});cache=os.path.join(ROOT,'pipeline','cache');os.makedirs(cache,exist_ok=True)
    review=[];stats=collections.Counter();recs={}
    def put(rec):
        o=recs.get(rec['key'])
        if o is None or RANK[rec['source_type']]<RANK[o['source_type']]: 
            if o: rec.setdefault('also_on',[]).append(o['source'])
            recs[rec['key']]=rec
        else: o.setdefault('also_on',[]).append(rec['source'])
    # 1) official boards
    print('registry rows',len(reg),file=sys.stderr)
    res,logs=run_registry(reg,a.workers,set(a.only.split(',')) if a.only else None,a.limit)
    ok_boards=set();board_of={}
    for (ats,slug),(r,posts,err) in res.items():
        if err: continue
        ok_boards.add((ats,slug.lower()))
        for p in posts:
            rec,why=build_record(p,r,f"{r['name']} careers ({ats.title()})",'ats' if ats!='jsonld' else 'jsonld')
            stats['ats_'+why]+=1
            if why=='ambiguous': review.append({'company':r['name'],'title':p.get('title'),'url':p.get('url'),'reason':'ambiguous intern wording','source':ats})
            if rec: rec['board']=f'{ats}:{slug}';rec['status']='open';rec['last_verified']=NOWS;put(rec)
    # 2) GitHub-list leads -> verify against the company's own posting
    leads=[] if a.skip_leads else github_leads(cache)
    todo=[]
    for l in leads:
        b=ats_from_url(l['url'])
        if b and (b[0],b[1].lower()) in ok_boards: stats['lead_on_board']+=1;continue   # already read from the company's board
        rec,why=build_record({'title':l['title'],'url':l['url'],'locations':l['locations'],'posted':l['posted'],'term_hint':l['terms'],'sponsorship_hint':l.get('sponsorship'),'cat_hint':l.get('cat')},{'name':l['company']},'',  'github-verified')
        stats['lead_'+why]+=1
        if not rec: continue
        if rec['past_term']: stats['lead_past_term']+=1;continue
        if l.get('cit'): rec['citizenship']=True
        rec['source']=f"{N.norm_company(l['company'])} posting (found via {l['list']})";todo.append(rec)
    todo=todo[:a.lead_limit]
    def chk(rec):
        p=prevL.get(rec['id']);
        if p and p.get('link_ok_at') and p['link_ok_at']>(NOW-datetime.timedelta(hours=20)).isoformat(): return rec,True,p['link_ok_at']
        return rec,verify_link(rec['apply_url']),NOWS
    with cf.ThreadPoolExecutor(a.workers) as ex:
        for rec,ok,at in ex.map(chk,todo):
            stats[f'lead_verify_{ok}']+=1
            if ok is False: continue
            rec['status']='open'
            if ok: rec['last_verified']=at;rec['link_ok_at']=at
            else: rec['last_verified']=(prevL.get(rec['id']) or {}).get('last_verified')
            put(rec)
    # 3) hand-checked trackers (link-checked) + approved submissions
    for m in jload(os.path.join(D,'manual.json'),[])+jload(os.path.join(D,'submissions.json'),[]):
        st='submission' if m.get('source','').startswith('User') else 'manual'
        raw={'title':m['title'],'url':m.get('apply_url'),'locations':[m.get('location_text') or '; '.join(f"{l.get('city')}, {l.get('state')}" for l in m.get('locations',[]) if l.get('city'))] if (m.get('location_text') or m.get('locations')) else ['United States'],
             'posted':m.get('date_added'),'deadline':m.get('deadline'),'deadline_source':'hand-checked tracker' if st=='manual' else 'submitted by user','term_hint':' '.join(m.get('terms') or [])+' '+(m.get('season') or '')+' '+str(m.get('year') or '')}
        rec,why=build_record(raw,{'name':m['company']},m['source'],st)
        if not rec:
            rec,why=build_record({**raw,'title':m['title']+' (internship)' if 'intern' not in m['title'].lower() else m['title']},{'name':m['company']},m['source'],st)
        if not rec: stats['manual_'+why]+=1;continue
        rec['category']=m.get('industry') if m.get('industry') in [c for c,_ in N.CATS] else rec['category']
        if m.get('class_years'): rec['class_years']=m['class_years']
        rec['rolling']=rec['rolling'] or bool(m.get('rolling'))
        rec['status']={'not_open':'upcoming','closed':'closed'}.get(m.get('status'),'open')
        if rec['deadline'] and rec['deadline']<str(N.TODAY): rec['status']='closed'
        if rec['status']=='upcoming': rec['pred']={'label':'Expected to reopen (hand-checked tracker)','confidence':'tracker','basis':m.get('notes') or 'Watch list'}
        p=prevL.get(rec['id'])
        if rec['status']=='open' and rec['apply_url']:
            if p and p.get('link_ok_at') and p['link_ok_at']>(NOW-datetime.timedelta(hours=20)).isoformat(): ok,at=True,p['link_ok_at']
            else: ok,at=verify_link(rec['apply_url']),NOWS
            if ok is False: rec['status']='closed'
            if ok: rec['last_verified']=at;rec['link_ok_at']=at
        if m.get('notes'): rec['notes']=m['notes']
        put(rec)
    # 4) freshness: keep last-good data for boards that failed this run; close what disappeared from a board that worked
    failed={(k[0],k[1].lower()) for k,(r,p,e) in res.items() if e}
    for pid,p in prevL.items():
        if p['key'] in recs or p.get('source_type')=='prediction': continue
        b=tuple((p.get('board') or ':').split(':',1));b=(b[0],b[1].lower()) if len(b)==2 else b
        if p.get('source_type') in ('ats','jsonld') and b in failed and p.get('status')=='open':
            p['stale']=True;recs[p['key']]=p;stats['kept_last_good']+=1
        elif p.get('status')=='open':
            q=dict(p);q['status']='closed';q['closed_at']=NOWS;q.pop('_desc',None);recs[p['key']]=q;stats['closed_this_sync']+=1
        elif p.get('status')=='closed' and p.get('closed_at') and p['closed_at']>(NOW-datetime.timedelta(days=30)).isoformat(): recs[p['key']]=p
    # 5) predictions (from real history) + user reports
    hist=[]
    sp=os.path.join(cache,'simplifyjobssummer2027internships.json')
    if os.path.exists(sp):
        for x in json.load(open(sp)):
            for t in x.get('terms') or []:
                if x.get('date_posted'): hist.append({'company':x['company_name'],'term':t,'posted':datetime.datetime.fromtimestamp(x['date_posted'],datetime.timezone.utc).date().isoformat(),'url':x.get('url')})
    for s in state.values():
        if s.get('first_seen') and s.get('term'): hist.append({'company':s['company'],'term':s['term'],'posted':s['first_seen'][:10]})
    openr=[r for r in recs.values() if r.get('status')=='open']
    preds=predict_upcoming(openr,hist,reg)
    for p in preds: recs[p['key']]=p
    reports=jload(os.path.join(D,'reports.json'),{})
    # finalize: first_seen / state
    out=[]
    for r in recs.values():
        s=state.get(r['id'],{})
        r['first_seen']=s.get('first_seen') or (prevL.get(r['id']) or {}).get('first_seen') or NOWS
        if r.get('status')=='closed' and not r.get('closed_at'): r['closed_at']=NOWS
        if r['deadline'] and r['deadline']<str(N.TODAY) and r.get('status')=='open': r['status']='closed';r['closed_at']=NOWS
        n=len(set(reports.get(r['id'],{}).get('closed_by',[])))
        r['hidden']=n>=3 or None;r['reports']=n or None
        state[r['id']]={'first_seen':r['first_seen'],'last_verified':r.get('last_verified'),'status':r.get('status'),'company':r['company'],'term':(r.get('terms') or [None])[0],'source':r['source'],'url':r.get('apply_url'),'closed_at':r.get('closed_at')}
        out.append(r)
    # descriptions -> shards
    os.makedirs(os.path.join(D,'desc'),exist_ok=True);shards=collections.defaultdict(dict)
    oldsh={}
    for r in out:
        sh=int(r['id'][:2],16)%64;dtext=r.pop('_desc',None)
        if dtext is None and r['status']!='upcoming':
            if sh not in oldsh: oldsh[sh]=jload(os.path.join(D,'desc',f'{sh}.json'),{})
            dtext=oldsh[sh].get(r['id'])
        if dtext: shards[sh][r['id']]=dtext;r['has_desc']=True
    for sh in range(64): json.dump(shards.get(sh,{}),open(os.path.join(D,'desc',f'{sh}.json'),'w'),ensure_ascii=False,separators=(',',':'))
    for r in out:
        for k in [k for k,v in r.items() if v in (None,[],'',False) and k not in ('remote',)]: del r[k]
        r.pop('key',None) if False else None
    out.sort(key=lambda r:(r.get('status')!='open',r.get('deadline') or '9999',r['company']))
    op=[r for r in out if r.get('status')=='open' and not r.get('hidden') and not r.get('past_term')]
    ver24=[r for r in op if r.get('last_verified') and r['last_verified']>(NOW-datetime.timedelta(hours=24)).isoformat()]
    V24={id(r) for r in ver24}
    wk=[r for r in op if r.get('deadline') and 0<=(datetime.date.fromisoformat(r['deadline'])-N.TODAY).days<=7]
    meta={'updated':NOWS,'open':len(ver24),'open_all':len(op),'closing_this_week':len([r for r in wk if id(r) in V24]),'upcoming':sum(1 for r in out if r.get('status')=='upcoming'),
      'companies_tracked':len({(r['ats'],r['slug'].lower()) for r in reg}),'companies_with_listings':len({N.nkey(r['company']) for r in op}),'duration_s':round(time.time()-t0)}
    srcs=collections.Counter(r['source_type'] for r in op);dl=sum(1 for r in op if r.get('deadline'))
    logsd=collections.defaultdict(lambda:{'boards':0,'ok':0,'postings':0,'errors':[]})
    for l in logs:
        g=logsd[l['ats']];g['boards']+=1;g['ok']+=l['ok'];g['postings']+=l['postings']
        if not l['ok'] and len(g['errors'])<25: g['errors'].append(f"{l['company']} ({l['slug']}): {l['error']}")
    keys=collections.Counter(N.nkey(r['company'])+'|'+N.nkey(r['title']) for r in op)
    health={'updated':NOWS,'listings_by_source_type':srcs,'adapters':logsd,'pct_verified_24h':round(100*len(ver24)/max(1,len(op)),1),'stale':sum(1 for r in op if r.get('stale') or not r.get('last_verified') or r['last_verified']<(NOW-datetime.timedelta(hours=24)).isoformat()),
      'duplicate_rate_pct':round(100*sum(v-1 for v in keys.values() if v>1)/max(1,len(op)),1),'review_queue':len(review),'deadline_coverage_pct':round(100*dl/max(1,len(op)),1),'stats':stats,
      'by_category':collections.Counter(r.get('category','Other') for r in op),'by_state':collections.Counter(l['state'] for r in op for l in r.get('locations',[]) if l.get('state')),
      'by_size':collections.Counter(r.get('size') or 'not listed' for r in op),'remote':sum(1 for r in op if r.get('remote')),'closed_this_sync':stats['closed_this_sync'],
      'gap_report':{'categories_under_25':[c for c,_ in N.CATS if sum(1 for r in op if r.get('category')==c)<25],'companies_in_registry_without_listings':meta['companies_tracked']-meta['companies_with_listings']}}
    json.dump({'generated':NOWS,'schema':'v4','count':len(out),'listings':out},open(os.path.join(D,'listings.json'),'w'),ensure_ascii=False,separators=(',',':'))
    json.dump(meta,open(os.path.join(D,'meta.json'),'w'),indent=1);json.dump(health,open(os.path.join(D,'health.json'),'w'),indent=1,default=dict)
    json.dump(review[:2000],open(os.path.join(D,'review.json'),'w'),indent=0);json.dump(state,open(os.path.join(D,'state.json'),'w'),separators=(',',':'))
    json.dump(logs,open(os.path.join(D,'sync_log.json'),'w'),separators=(',',':'))
    print(json.dumps(meta),file=sys.stderr);print(json.dumps({'by_source':srcs,'deadline_pct':health['deadline_coverage_pct'],'stats':stats},default=dict),file=sys.stderr)
def _compact():
    from . import compact; compact.main()
if __name__=='__main__':
    try: main();_compact()
    except Exception:
        traceback.print_exc()
        p=os.path.join(D,'meta.json');m=jload(p,{});m['last_error']={'at':NOWS,'error':traceback.format_exc()[-1500:]};json.dump(m,open(p,'w'),indent=1);sys.exit(1)
