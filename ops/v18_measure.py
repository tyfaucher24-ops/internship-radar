"""V18 data-accuracy measurement over a listings.json (live or local). Same definitions before and after.
Usage: python3 ops/v18_measure.py <listings.json> [--now ISO]"""
import json,sys,collections,re,datetime as dt
p=sys.argv[1];now=dt.datetime.now(dt.timezone.utc)
if '--now' in sys.argv:now=dt.datetime.fromisoformat(sys.argv[sys.argv.index('--now')+1])
L=json.load(open(p));L=L.get('listings',L)
HID='--incl-hidden' in sys.argv
o=[x for x in L if x.get('status')=='open' and (HID or not x.get('hidden'))]
def ts(v):
    try:return dt.datetime.fromisoformat(str(v).replace('Z','+00:00'))
    except Exception:return None
def norm(s):return re.sub(r'[^a-z0-9]+',' ',str(s or '').lower()).strip()
def loc(x):
    l=x.get('locations') or [];return (norm(l[0].get('city')),norm(l[0].get('state'))) if l and isinstance(l[0],dict) else ('','')
g=collections.Counter((norm(x.get('company')),norm(x.get('title')))+loc(x) for x in o)
dupg=[k for k,v in g.items() if v>1]
lv=[ts(x.get('last_verified')) for x in o]
m={'open':len(o),
 'no_last_verified':sum(1 for t in lv if t is None),
 'verified_72h':sum(1 for t in lv if t and (now-t).total_seconds()<=72*3600),
 'verified_24h':sum(1 for t in lv if t and (now-t).total_seconds()<=24*3600),
 'has_desc_false':sum(1 for x in o if not x.get('has_desc')),
 'duplicate_rows':sum(g[k]-1 for k in dupg),'duplicate_groups':len(dupg),
 'no_apply_ok_at':sum(1 for x in o if not x.get('apply_ok_at')),
 'apply_kind_none':sum(1 for x in o if x.get('apply_kind')=='none'),
 'with_deadline':sum(1 for x in o if x.get('deadline')),
 'no_season':sum(1 for x in o if not x.get('season')),
 'category_other':sum(1 for x in o if (x.get('category') or 'Other')=='Other'),
 'no_locations':sum(1 for x in o if not x.get('locations') and not x.get('remote'))}
m['no_locations_incl_remote']=sum(1 for x in o if not x.get('locations'))
print(json.dumps(m,indent=1))
