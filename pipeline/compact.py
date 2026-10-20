"""Build the site's compact data: data/index.json (fields needed for list, filters, matching) and
data/detail/{0..63}.json (drawer-only fields; descriptions stay in data/desc/), loaded on demand. Source of truth stays data/listings.json."""
import os,json,glob
D=os.path.join(os.path.dirname(__file__),'..','data')
INDEX_KEYS=['id','company','title','category','role_type','remote','workplace','deadline','rolling','class_years','terms','season','year','past_term','posted','status','sponsorship','citizenship','paid','size','gpa_min','openings','metro_pop','hidden','has_desc','stale']
DROP={'key','board','ats_id','link_ok_at','sector'}
def main():
    L=json.load(open(os.path.join(D,'listings.json')))['listings']
    idx=[];det={}
    for r in L:
        x={k:r[k] for k in INDEX_KEYS if r.get(k) not in (None,'',[],False)}
        if r.get('remote') is False: x.pop('remote',None)
        if r.get('first_seen'): x['fs']=r['first_seen'][:10]
        if r.get('last_verified'): x['lv']=r['last_verified'][:16]
        if r.get('locations'): x['locations']=[{k:(round(v,2) if k in('lat','lng') else v) for k,v in l.items() if v not in (None,'')} for l in r['locations']]
        if r.get('pred'): x['pred']={'label':r['pred'].get('label'),'confidence':r['pred'].get('confidence')}
        idx.append(x)
        d={k:v for k,v in r.items() if k not in INDEX_KEYS and k not in DROP and k not in ('locations','first_seen') and v not in (None,'',[],False)}
        d['first_seen']=r.get('first_seen');
        det.setdefault(int(r['id'][:2],16)%64,{})[r['id']]=d
    json.dump({'v':1,'count':len(idx),'listings':idx},open(os.path.join(D,'index.json'),'w'),ensure_ascii=False,separators=(',',':'))
    os.makedirs(os.path.join(D,'detail'),exist_ok=True)
    for i in range(64): json.dump(det.get(i,{}),open(os.path.join(D,'detail',f'{i}.json'),'w'),ensure_ascii=False,separators=(',',':'))
    hubs={}
    for x in idx:
        if x.get('status')!='open' or x.get('hidden') or x.get('past_term'): continue
        for l in x.get('locations',[]):
            if 'lat' in l:
                k=(round(l['lat']*2)/2,round(l['lng']*2)/2);h=hubs.setdefault(k,{'n':0,'c':{}});h['n']+=1;cn=f"{l.get('city')}, {l.get('state')}";h['c'][cn]=h['c'].get(cn,0)+1
    json.dump([[a,b,h['n'],max(h['c'],key=h['c'].get)] for (a,b),h in sorted(hubs.items(),key=lambda t:-t[1]['n'])],open(os.path.join(D,'hubs.json'),'w'),separators=(',',':'))
    print('index',os.path.getsize(os.path.join(D,'index.json')))
if __name__=='__main__': main()
