"""Geocode listing cities with the vendored kelvins/US-Cities-Database (MIT) table -> cities.json.
Only exact city+state matches (plus a few safe spelling normalizations). Unmatched cities are reported, never guessed."""
import csv,json,re,collections
def k(c): c=c.lower().replace('saint ','st ').replace('st. ','st ').replace('.','');c=re.sub(r'\s+(city|township|twp)$','',c);return re.sub(r'[^a-z ]','',c).strip()
T={}
for r in csv.DictReader(open('vendor/us_cities.csv')):
    T.setdefault((k(r['CITY']),r['STATE_CODE']),(round(float(r['LATITUDE']),4),round(float(r['LONGITUDE']),4)))
ALIAS={('new york city','NY'):('new york','NY'),('nyc','NY'):('new york','NY'),('manhattan','NY'):('new york','NY'),('brooklyn','NY'):('brooklyn','NY'),('washington dc','DC'):('washington','DC'),('rtp','NC'):('durham','NC'),('research triangle park','NC'):('durham','NC')}
d=json.load(open('data.json'));C=collections.OrderedDict();miss=collections.Counter();geo=0
for x in d['internships']:
    hit=False
    for l in x['locations']:
        if not l.get('city') or not l.get('state'): continue
        kk=(k(l['city']),l['state']);kk=ALIAS.get(kk,kk);ll=T.get(kk)
        if not ll and kk[1]=='DC': ll=T.get(('washington','DC'))
        if not ll: miss[f"{l['city']}, {l['state']}"]+=1;continue
        key=f"{l['city']}|{l['state']}";c=C.setdefault(key,{'city':l['city'],'state':l['state'],'lat':ll[0],'lng':ll[1],'ids':[]})
        if x['id'] not in c['ids']: c['ids'].append(x['id'])
        hit=True
    geo+=hit
out={'source':'kelvins/US-Cities-Database (MIT), vendored at vendor/us_cities.csv','listings_geocoded':geo,'listings_total':len(d['internships']),'cities':list(C.values())}
json.dump(out,open('cities.json','w'),separators=(',',':'))
print('geocoded listings',geo,'/',len(d['internships']),'cities',len(C),'unmatched city strings',sum(miss.values()));print(miss.most_common(15))
