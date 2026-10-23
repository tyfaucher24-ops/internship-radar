"""US place geocoder from public Census data (vendored): 2023 Gazetteer places + county subdivisions (lat/lng),
2023 population estimates, and kelvins/US-Cities-Database as a fallback. Exact name+state matches only."""
import csv,re,os,json
V=os.path.join(os.path.dirname(__file__),'..','vendor')
SUFFIX=re.compile(r'\s+(city and borough|consolidated government \(balance\)|metropolitan government \(balance\)|unified government \(balance\)|\(balance\)|city|town|village|borough|CDP|municipality|township|charter township|plantation|comunidad|zona urbana|urban county|metro township)$',re.I)
def key(name):
    n=name.lower().replace('saint ','st ').replace('st. ','st ').replace('.','').replace('’',"'")
    n=re.sub(r'\s*\(.*?\)','',n);n=re.sub(r'[^a-z0-9 \-]','',n).replace('-',' ');return re.sub(r'\s+',' ',n).strip()
_T=None;_P=None
def _load():
    global _T,_P
    if _T is not None: return
    _T={};_P={}
    cache=os.path.join(V,'places_index.json')
    if os.path.exists(cache):
        d=json.load(open(cache));_T={tuple(k.split('|')):v for k,v in d['t'].items()};_P={tuple(k.split('|')):v for k,v in d['p'].items()};return
    STN={}
    for r in csv.DictReader(open(os.path.join(V,'pop.csv'),encoding='latin-1')):
        if r['SUMLEV'] in ('162','170','061','071'):
            st=r['STNAME'];nm=SUFFIX.sub('',r['NAME'].strip());STN.setdefault(st,{})
            k=key(nm);p=int(r['POPESTIMATE2023'] or 0)
            if p>STN[st].get(k,0): STN[st][k]=p
    import itertools
    STATES={}
    for f in ('2023_Gaz_place_national.txt','2023_Gaz_cousubs_national.txt'):
        for r in csv.DictReader(open(os.path.join(V,f),encoding='latin-1'),delimiter='\t'):
            r={k.strip():(v or '').strip() for k,v in r.items()}
            nm=SUFFIX.sub('',r['NAME']);k=(key(nm),r['USPS'])
            if k in _T and f.startswith('2023_Gaz_cousubs'): continue
            _T.setdefault(k,[round(float(r['INTPTLAT']),4),round(float(r['INTPTLONG']),4)])
    for r in csv.DictReader(open(os.path.join(V,'us_cities.csv'))):
        _T.setdefault((key(r['CITY']),r['STATE_CODE']),[round(float(r['LATITUDE']),4),round(float(r['LONGITUDE']),4)])
    SN={}
    for r in csv.DictReader(open(os.path.join(V,'us_cities.csv'))): SN[r['STATE_NAME']]=r['STATE_CODE']
    SN['District of Columbia']='DC'
    for st,d in STN.items():
        c=SN.get(st)
        if c:
            for k,p in d.items(): _P[(k,c)]=p
    json.dump({'t':{'|'.join(k):v for k,v in _T.items()},'p':{'|'.join(k):v for k,v in _P.items()}},open(cache,'w'),separators=(',',':'))
ALIAS={'new york city':'new york','nyc':'new york','manhattan':'new york','washington dc':'washington','dc':'washington','rtp':'durham','research triangle park':'durham','research triangle':'durham','sf':'san francisco','la':'los angeles','arlington county':'arlington','st paul':'st paul','mclean':'mclean','ft worth':'fort worth','ft lauderdale':'fort lauderdale'}
# Gazetteer centroids that land in water (San Francisco's includes the Farallon Islands): use the city-hall point instead.
FIXPT={('san francisco','CA'):(37.78,-122.42)}
def geocode(city,state):
    """returns (lat,lng,population or None) or None"""
    if not city or not state: return None
    _load();k=key(city);k=ALIAS.get(k,k)
    for cand in (k,k.replace(' county',''),k.split(' ')[0] if k.endswith(' heights') and False else k):
        v=_T.get((cand,state))
        if v:
            f=FIXPT.get((cand,state))
            return (f[0],f[1],_P.get((cand,state))) if f else (v[0],v[1],_P.get((cand,state)))
    if state=='DC': v=_T.get(('washington','DC'));return (v[0],v[1],_P.get(('washington','DC'))) if v else None
    return None
def population(city,state):
    _load();k=ALIAS.get(key(city),key(city));return _P.get((k,state))
if __name__=='__main__':
    for c in ['Bloomington|MN','Foster City|CA','McLean|VA','Arlington County|VA','Parsippany-Troy Hills|NJ','New York|NY','Charlotte|NC','Washington|DC','Lone Tree|CO','Mayfield Heights|OH']:
        print(c,geocode(*c.split('|')))
