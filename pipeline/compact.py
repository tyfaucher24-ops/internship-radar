"""Build the site's compact data: data/index.json (fields needed for list, filters, matching) and
data/detail/{0..63}.json (drawer-only fields; descriptions stay in data/desc/), loaded on demand. Source of truth stays data/listings.json."""
from pipeline.publish import write_json  # V16 P2: atomic temp+validate+swap writes
import os,json,glob
D=os.path.join(os.path.dirname(__file__),'..','data')
INDEX_KEYS=['id','company','title','category','role_type','remote','workplace','deadline','rolling','class_years','terms','season','year','past_term','posted','status','sponsorship','citizenship','paid','size','gpa_min','openings','metro_pop','hidden','has_desc','stale','loc_label','degree','close_reason','ak']
# V12: posting-only requirement signals for the grader (skills, majors, prior experience), read from the description text. Never guessed:
# a skill/major is listed only when its exact wording appears in the posting.
MAJ={'finance':r'finance','accounting':r'accounting','economics':r'economics','business':r'business( administration)?','computer science':r'computer science','engineering':r'engineering','data science':r'data science','statistics':r'statistics','mathematics':r'math(ematics)?','information systems':r'information (systems|technology)','marketing':r'marketing','communications':r'communications?|journalism','nursing':r'nursing','biology':r'biology|life sciences?','chemistry':r'chemistry','physics':r'physics','psychology':r'psychology','supply chain':r'supply chain','hospitality':r'hospitality','graphic design':r'graphic design|design'}
def reqs(text,skills):
    import re
    t=' '+re.sub(r'\s+',' ',(text or '').lower())+' '
    if len(t)<80: return None
    sk=[k for k in skills if re.search(r'(?<![a-z0-9+#])'+re.escape(k)+r'(?![a-z0-9+#])',t)][:10]
    sents=[z for z in re.split(r'(?<=[.;!?\n•])',t) if re.search(r'\bmajor|degree|pursuing|studying|enrolled|program in|field of study',z)]
    mj=sorted({m for m,rx in MAJ.items() for z in sents if re.search(r'\b(?:'+rx+r')\b',z)})
    px=1 if re.search(r'(prior|previous)\s+(\w+\s+){0,2}(internship|work experience)\s+(is\s+)?(required|necessary)|[1-9]\+?\s*(-\s*\d\s*)?years? of (relevant |related |professional |work )?experience',t) else 0
    r={}
    if sk: r['sk']=sk
    if mj and len(mj)<=8: r['mj']=mj
    if px: r['px']=1
    return r or None
AMBIG={'go','c','r','engineering','communication','research','operations','sales','marketing','content','hr','lab','writing','presentation','clinical','ui','ux','design','trading','tax','legal research','adobe','sketch'}  # too generic or ambiguous to count as a stated skill
DROP={'key','board','ats_id','link_ok_at','sector'}
def main():
    LP=os.path.join(D,'listings.json');LJ=json.load(open(LP));L=LJ['listings']
    idx=[];det={}
    cfg=json.load(open(os.path.join(D,'..','config.json')));tx=cfg.get('skillTaxonomy',{});SK=sorted({k for g,v in tx.items() if isinstance(v,dict) for k in v.get('core',[])+v.get('plus',[])}-AMBIG)
    DS={}
    for f in glob.glob(os.path.join(D,'desc','*.json')): DS.update(json.load(open(f)))
    # V13.1: one hygiene pass + ONE open count, whichever job (sync / qa / linkcheck) ran last
    from . import hygiene
    hs=hygiene.apply(L,DS);write_json(LP,LJ,separators=(',',':'))
    mp=os.path.join(D,'meta.json');m=json.load(open(mp)) if os.path.exists(mp) else {}
    m.update(hygiene.meta_counts(L));m['hygiene']=dict(hs);write_json(mp,m,indent=1)
    for r in L:
        x={k:r[k] for k in INDEX_KEYS if r.get(k) not in (None,'',[],False)}
        if r.get('remote') is False: x.pop('remote',None)
        if r.get('first_seen'): x['fs']=r['first_seen'][:10]
        if r.get('last_verified'): x['lv']=r['last_verified'][:16]
        if r.get('locations'): x['locations']=[{k:(round(v,2) if k in('lat','lng') else v) for k,v in l.items() if v not in (None,'')} for l in r['locations']]
        if r.get('pred'): x['pred']={'label':r['pred'].get('label'),'confidence':r['pred'].get('confidence')}
        rq=reqs(DS.get(r['id']),SK)
        if rq: x['req']=rq
        idx.append(x)
        d={k:v for k,v in r.items() if k not in INDEX_KEYS and k not in DROP and k not in ('locations','first_seen') and v not in (None,'',[],False)}
        d['first_seen']=r.get('first_seen');
        det.setdefault(int(r['id'][:2],16)%64,{})[r['id']]=d
    write_json(os.path.join(D,'index.json'),{'v':1,'count':len(idx),'listings':idx},separators=(',',':'))
    os.makedirs(os.path.join(D,'detail'),exist_ok=True)
    for i in range(64): write_json(os.path.join(D,'detail',f'{i}.json'),det.get(i,{}),separators=(',',':'))
    hubs={}
    for x in idx:
        if x.get('status')!='open' or x.get('hidden') or x.get('past_term'): continue
        for l in x.get('locations',[]):
            if 'lat' in l:
                k=(round(l['lat']*2)/2,round(l['lng']*2)/2);h=hubs.setdefault(k,{'n':0,'c':{}});h['n']+=1;cn=f"{l.get('city')}, {l.get('state')}";h['c'][cn]=h['c'].get(cn,0)+1
    write_json(os.path.join(D,'hubs.json'),[[a,b,h['n'],max(h['c'],key=h['c'].get)] for (a,b),h in sorted(hubs.items(),key=lambda t:-t[1]['n'])],separators=(',',':'))
    print('index',os.path.getsize(os.path.join(D,'index.json')))
if __name__=='__main__': main()
