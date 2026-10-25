"""V15 addendum: location accuracy audit. Samples 200 open listings (fixed seed), re-reads each posting live from the
company's own job board (robots.txt respected; blocked/unreachable sites are skipped and noted), and compares:
  A) the stored record (what the site shows now) and
  B) the V15 parser run on the live location strings
against an independent reading of the live strings (truth). Writes ops/audit/v15_location_audit.json."""
import json,random,re,sys,os,urllib.parse
sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline import net,norm
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ST=set(norm.ST);SN=norm.SN
def live(rec):
    ats,slug=rec['board'].split(':',1);u=rec['apply_url'];wp=None
    if ats=='greenhouse':
        jid=re.search(r'/jobs/(\d+)',u) or re.search(r'gh_jid=(\d+)',u)
        j=net.fetch(f'https://boards-api.greenhouse.io/v1/boards/{slug}/jobs/{jid.group(1)}').json()
        locs=[(j.get('location') or {}).get('name','')]+[o.get('name','') for o in j.get('offices',[])]
    elif ats=='lever':
        jid=u.rstrip('/').split('/')[-1].split('?')[0]
        j=net.fetch(f'https://api.lever.co/v0/postings/{slug}/{jid}?mode=json').json();c=j.get('categories',{})
        locs=c.get('allLocations') or [c.get('location') or ''];wp=j.get('workplaceType')
    elif ats=='ashby':
        j=net.fetch(f'https://api.ashbyhq.com/posting-api/job-board/{slug}').json()
        x=next((x for x in j.get('jobs',[]) if x.get('jobUrl')==u or (x.get('id') and x['id'] in u)),None)
        if not x:return None
        locs=[x.get('location') or '']+[a.get('location','') for a in x.get('secondaryLocations',[])];wp=x.get('workplaceType') or ('Remote' if x.get('isRemote') else None)
    elif ats=='workday':
        host,tenant,site=slug.split('/');path=urllib.parse.urlsplit(u).path;p=path[path.index('/job/'):]
        api=f'https://{host}/wday/cxs/{tenant}/{site}{p}'
        j=net.fetch(api).json().get('jobPostingInfo',{})
        locs=[j.get('location') or '']+(j.get('additionalLocations') or []);wp=j.get('remoteType')
        m=re.match(r'/job/([^/]+)/',p)
        if m and re.match(r'^(US|USA)-[A-Z]{2}-',m.group(1)):locs.append(m.group(1))
    else:return None
    return [l for l in locs if l],wp
def nc(c):return re.sub(r'[^a-z]','',(c or '').lower().replace('saint','st').replace('fort','ft'))
def truth(locs,wp):
    """independent reading of the live strings (not the pipeline parser): explicit 'City, ST', 'City, State',
    'US(A)-ST-City' / 'USA, ST, City' only; a bare 'New York' means the city; street/office prefixes are ignored"""
    T=set();states=set();rem=bool(wp and re.search(r'remote|virtual',str(wp),re.I))
    for s in locs:
        if re.match(r'^[A-Za-z]+(-+[A-Za-z]+)+$',s) and not re.match(r'^(US|USA)-[A-Z]{2}-',s):continue  # Workday URL slug, not a label
        for part in re.split(r'\s*;\s*|\s+\|\s+|\s+or\s+|(?<=, [A-Z]{2})\s*/\s*',s):
            part=re.sub(r'^([A-Za-z .]+?)\s+([A-Z]{2})\s+USA?$',r'\1, \2',part.strip())
            part=re.sub(r'\s*\([^)]*\)','',part);part=re.sub(r'(,\s*(USA|US|United States))\s+-\s+.*$',r'\1',part)
            if re.search(r'\b(remote|virtual)\b',part,re.I):rem=True;continue
            q=re.sub(r'\bwashington,?\s*d\.?\s?c\.?','Washington, DC',part,flags=re.I)
            q=re.sub(r'\s+-\s+(national|corporate|main)\s*$','',q,flags=re.I);q=re.sub(r'\s+(office|campus|hq)\b','',q,flags=re.I)
            q=re.sub(r',?\s*(US|USA|United States( of America)?)\s*$','',q).strip()
            m=re.match(r'^(?:US|USA)\s*[-,]\s*([A-Z]{2})\s*[-,]\s*([^,]+)',q)
            if m and m.group(1) in ST:T.add(('washington' if m.group(1)=='DC' else nc(m.group(2).replace('-',' ')),m.group(1)));continue
            m=re.search(r'([A-Za-z .\'-]+?),\s*([A-Z]{2})\s*$',q)
            if m and m.group(2) in ST:T.add((nc(m.group(1).split(' - ')[-1]),m.group(2)));continue
            m=re.search(r'([A-Za-z .\'-]+?),\s*([A-Za-z ]+?)\s*$',q)
            if m and m.group(2).strip().title() in SN:T.add((nc(m.group(1).split(' - ')[-1]),SN[m.group(2).strip().title()]));continue
            if q.lower() in('new york','new york city','nyc'):T.add(('newyork','NY'));continue
            if q.strip().title() in SN and q.strip().lower()!='washington':states.add(SN[q.strip().title()])
    return T,states-{s for _,s in T},rem
def cmp(cities,rem,T,S,R):
    got={(nc(c),s) for c,s in cities if c};gs={s for c,s in cities if not c}
    exact=(got==T) and (not T and not got and gs>=S or bool(T) or (not T and not S and not got))
    return exact,(rem==R)
REUSE='--reuse' in sys.argv;PREV={}
if REUSE:
    for r in json.load(open(os.path.join(ROOT,'ops/audit/v15_location_audit.json')))['rows']:PREV[r['id']]=(r['live'],r['workplace'])
def main():
    L=json.load(open(os.path.join(ROOT,'data/listings.json')))['listings']
    pool=[x for x in L if x.get('status')=='open' and x.get('source_type')=='ats' and x.get('board','').split(':')[0] in ('greenhouse','lever','ashby','workday') and x.get('apply_url')]
    random.seed(int(os.environ.get('AUDIT_SEED','15')));random.shuffle(pool)
    rows=[];skipped=[]
    for x in pool:
        if len(rows)>=200:break
        try:r=(PREV[x['id']] if x['id'] in PREV else None) if REUSE else live(x)
        except net.Blocked as e:skipped.append({'id':x['id'],'company':x['company'],'why':'robots.txt'});continue
        except Exception as e:skipped.append({'id':x['id'],'company':x['company'],'why':type(e).__name__+': '+str(e)[:80]});continue
        if not r:skipped.append({'id':x['id'],'company':x['company'],'why':'posting no longer on the board'});continue
        locs,wp=r;T,S,R=truth(locs,wp)
        if not T and not S and not R:skipped.append({'id':x['id'],'company':x['company'],'why':'live page lists no US location: '+'; '.join(locs)[:80]});continue
        stored=[(l.get('city'),l.get('state')) for l in (x.get('locations') or [])]
        locs=[l for l in locs if not(re.match(r'^[A-Za-z]+(-+[A-Za-z]+)+$',l) and not re.match(r'^(US|USA)-[A-Z]{2}-',l))]  # same rule as the Workday adapter
        pl,prem,_=norm.parse_locations(locs);prem=prem or bool(wp and re.search('remote|virtual',str(wp),re.I))
        parsed=[(l.get('city'),l.get('state')) for l in pl]
        sA,rA=cmp(stored,bool(x.get('remote')),T,S,R);sB,rB=cmp(parsed,prem,T,S,R)
        rows.append({'id':x['id'],'company':x['company'],'ats':x['board'].split(':')[0],'live':locs,'workplace':wp,'truth':sorted(T),'truth_states':sorted(S),'truth_remote':R,
          'stored':stored,'stored_remote':bool(x.get('remote')),'parsed_v15':parsed,'parsed_remote':prem,'stored_exact':sA,'stored_remote_ok':rA,'v15_exact':sB,'v15_remote_ok':rB})
        print(len(rows),x['company'][:30],sA,sB,file=sys.stderr,flush=True)
    n=len(rows);pc=lambda k:round(100*sum(r[k] for r in rows)/max(1,n),1)
    out={'sampled':n,'skipped':len(skipped),'stored':{'exact_city_state_pct':pc('stored_exact'),'remote_flag_pct':pc('stored_remote_ok')},
         'v15_parser':{'exact_city_state_pct':pc('v15_exact'),'remote_flag_pct':pc('v15_remote_ok')},'by_ats':{a:sum(1 for r in rows if r['ats']==a) for a in {r['ats'] for r in rows}},
         'misses_v15':[r for r in rows if not(r['v15_exact'] and r['v15_remote_ok'])],'skipped_detail':skipped,'rows':rows}
    os.makedirs(os.path.join(ROOT,'ops/audit'),exist_ok=True)
    json.dump(out,open(os.path.join(ROOT,'ops/audit/v15_location_audit.json'),'w'),indent=1)
    print(json.dumps({k:out[k] for k in ('sampled','skipped','stored','v15_parser','by_ats')}))
if __name__=='__main__':main()
