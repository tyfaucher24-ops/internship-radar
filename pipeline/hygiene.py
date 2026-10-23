"""V13.1 data hygiene, run inside compact.main() so every path (sync, qa, linkcheck) ends with the same cleanup and ONE open count.
Everything here is derived from the posting itself (its title, its own URL, its own description text). Nothing is guessed:
when a value cannot be read from the posting it stays empty."""
import re,json,os,datetime,collections
from . import geo
from .norm import ST,SN,to_iso
from . import norm as N
D=os.path.join(os.path.dirname(__file__),'..','data')
SITES={k:v for k,v in json.load(open(os.path.join(os.path.dirname(__file__),"company_sites.json"))).items() if not k.startswith("_")}  # hand-checked: company's named campus -> state, from the company's own site list
TRIM=re.compile(r'^[\s,\-–—]+|[\s,\-–—]+$')
def clean_city(c):
    if not isinstance(c,str): return c
    c=TRIM.sub('',c);return c or None
# ---- #13 past-cycle / returning-only / degree ----
PAST=re.compile(r'\b(spring|summer|fall|autumn)[\s\-–]*(?:\d{4}\s*[\-–/]\s*)?2026\b|\b(?:spring|summer|fall|autumn|winter|co-?op|intern\w*)[\s\-–(]*20(?:1\d|2[0-5])\b|\b20(?:1\d|2[0-5])[\s\-–)]*(?:spring|summer|fall|autumn|winter|co-?op|intern\w*)\b',re.I)  # V14 #3: every term up to and including Summer/Fall 2026 is past (today is Oct 2026)  # these terms have already started (today is after Sept 2026)
RETURNING=re.compile(r'\binterns? only\b|\bintern[\s\-]+to[\s\-]+intern\b|\breturning[\s\-]+(interns?|students?|co-?ops?)\b|\bcurrent (interns?|co-?ops?) only\b|\bconversion\b.*\bintern',re.I)
DEG=[('MBA',re.compile(r'\bMBA\b')),('PhD',re.compile(r'\bPh\.?\s?D\b|\bdoctoral\b|\bpost-?doc',re.I)),('JD',re.compile(r'\bJ\.?D\.?\b(?! Power)|\blaw (student|clerk)',re.I)),('MS',re.compile(r"\b(MS|M\.S\.|MSc|Master'?s|Masters)\b(?! Office| Excel)")),('Grad',re.compile(r'\bgraduate (student|intern|research)',re.I))]
def degree(title):
    for k,rx in DEG:
        if rx.search(title or ''): return k
    return None
# ---- #20 editorial notes that leaked into titles (our hand-entered rows); real employer text such as "(Jan-Aug 2027)" stays ----
EDIT=re.compile(r'\s*\((?:[^()]*\blistings? appear\b[^()]*|[^()]*\bpossible|[^()]*\b(tbc|tbd|unconfirmed|likely|maybe)\b[^()]*)\)',re.I)
def clean_title(t): return re.sub(r'\s{2,}',' ',EDIT.sub('',t or '')).strip()
# ---- #11 explicit deadlines in the posting text ----
DLX=re.compile(r'(?:application\s+)?(?:deadline|end date|apply by|applications?\s+(?:are\s+)?(?:due|close|closes)(?:\s+on|\s+by)?|posting\s+(?:closes|close date))\s*(?:is|:|-|–)?\s*(?:[A-Z][a-z]+day,?\s*)?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+20\d\d|\d{1,2}/\d{1,2}/20\d\d|20\d\d-\d\d-\d\d)',re.I)
def explicit_deadlines(desc,today):
    out=[]
    for m in DLX.finditer(desc or ''):
        d=to_iso(m.group(1))
        if d and d>=str(today) and d<=str(today+datetime.timedelta(days=550)): out.append((d,m.group(0)[:120]))
    return out
# ---- #12 location from the posting's own URL slug / text ----
STOP={'campus','center','centre','building','bldg','office','home','hq','headquarters','site','drive','dr','st','street','ave','avenue','road','rd','blvd','suite','floor','usa','us','united','states','america','remote','hybrid','main','north','south','east','west','downtown','plant','facility','client','hospital','lab','labs','tower','park','plaza','high','change','supply','chain','global','innovation','gic','the','of','and','at','laboratory','laboratories','for','office','offices','corporate','works','location','no','territory','field','based','statewide','hub','valley','area','university','campus','center','plant','building','temp','manufacturing'}
ALIASW={'NYC':'New York NY','MT':'Mount','FT':'Fort','PT':'Port','SF':'San Francisco CA','DC':'Washington DC','MPLS':'Minneapolis MN','STL':'St Louis MO'}
SNL={k.lower():v for k,v in SN.items()}
def _states_in(words):
    s=set()
    for w in words:
        if w in ST and w not in ('US',): s.add(w)
    low=' '.join(w.lower() for w in words)
    for n,c in SNL.items():
        if re.search(r'\b'+n+r'\b',low): s.add(c)
    return s
def _cands(words):
    out=[]
    for n in (4,3,2,1):
        for i in range(len(words)-n+1):
            g=words[i:i+n]
            if all(w.lower() in STOP or w.isdigit() for w in g) or len(''.join(g))<3: continue
            if n==1 and (g[0].lower() in STOP or g[0] in ST): continue
            if i>0 and re.match(r'^\d',words[i-1]): continue   # street name after a house number
            out.append((i,n,' '.join(g)))
    return out
def _pop(k,s): return geo._P.get((k,s)) or geo._P.get((k+' city',s)) or 0
def _desc_states(ctx):
    s=set(m.group(1) for m in re.finditer(r',\s*([A-Z]{2})\b',ctx or '') if m.group(1) in ST)
    for n,c in SN.items():
        if re.search(r'\b'+n+r'\b',ctx or ''): s.add(c)
    return s
def _pick(words,ctx,company):
    geo._load();sts=_states_in(words)|({SNL[k] for k in SNL if re.search(r'\b'+k+r'\b',company.lower())});dst=None
    best=None
    for pos,n,c in _cands(words):
        k=geo.key(c);k=geo.ALIAS.get(k,k);hits=sorted(((_pop(k,s),s) for s in ST if (k,s) in geo._T),reverse=True)
        if not hits: continue
        if sts:
            h=[x for x in hits if x[1] in sts]
            if not h: continue
            p,s=h[0];cand=(3,p,n,c,s)
        else:
            p,s=hits[0];p2=hits[1][0] if len(hits)>1 else 0
            site=SITES.get(company,{}).get(c)
            if dst is None: dst=_desc_states(ctx)
            dh=[x for x in hits if x[1] in dst]
            if site: cand=(4,-pos,n,c,site)
            elif re.search(r'\b'+re.escape(c)+r',\s*('+s+r'|'+[nm for nm,v in SN.items() if v==s][0]+r')\b',ctx or ''): cand=(3,-pos,n,c,s)
            elif len(dh)==1: cand=(2,-pos,n,c,dh[0][1])
            elif p>=20000 and p>=3*max(p2,1): cand=(2,-pos,n,c,s)
            elif len(hits)==1 and len(c)>=5: cand=(1,-pos,n,c,s)
            else: continue
        if best is None or cand>best: best=cand
    return best and (None,None,best[3],best[4])
def slug_location(url,company,desc):
    m=re.search(r'(?:myworkdayjobs\.com/(?:[a-z]{2}-[A-Z]{2}/)?[^/]+|myworkdaysite\.com/(?:[a-z]{2}-[A-Z]{2}/)?recruiting/[^/]+/[^/]+)/job/([^/]+)/',url or '')
    if not m: return None
    slug=re.sub(r'([a-z])([A-Z]{2})(?=-\d{5}|-|$)',r'\1-\2',m.group(1))  # DavisCA-95618 -> Davis-CA
    words=[ALIASW.get(w.upper(),w) for w in re.split(r'[-_]+',slug) if w]
    words=' '.join(words).split()
    b=_pick(words,desc or '',company)
    if not b:
        sts=_states_in(words)
        if len(sts)==1: return {'city':None,'state':sts.pop()}
        return None
    _,_,c,s=b;g=geo.geocode(c,s)
    return {'city':c.title() if c.islower() or c.isupper() else c,'state':s,**({'lat':g[0],'lng':g[1]} if g else {})}
CITYST=re.compile(r'\b([A-Z][a-zA-Z.\']+(?:\s[A-Z][a-zA-Z.\']+){0,2}),\s*('+'|'.join(ST)+'|'+'|'.join(sorted(SN,key=len,reverse=True))+r')\b')
def text_location(desc):
    cnt=collections.Counter()
    for m in CITYST.finditer(desc or ''):
        c=m.group(1);s=m.group(2);s=SN.get(s,s)
        for cc in (c,' '.join(c.split()[1:]),' '.join(c.split()[2:])):
            if cc and geo.geocode(cc,s): cnt[(cc,s)]+=1;break
    if not cnt: return None
    (c,s),_=cnt.most_common(1)[0];c={'New York City':'New York','NYC':'New York'}.get(c,c);g=geo.geocode(c,s);return {'city':c,'state':s,'lat':g[0],'lng':g[1]}
PUBLIC=re.compile(r'\b(City of|County of|Town of|Village of|Community College|College|University of|State University|University|School District|Public Schools)\b',re.I)
# ---- the ONE open predicate (client markLive uses the same rule) ----
def is_open(r,today):
    return r.get('status')=='open' and not r.get('hidden') and not r.get('past_term') and not (r.get('deadline') and r['deadline']<str(today))
def apply(L,DS,today=None):
    today=today or datetime.date.today();st=collections.Counter()
    # company display names: one spelling per normalized key (JPMorganChase / JPMorgan Chase / JP Morgan Chase)
    by=collections.defaultdict(collections.Counter)
    for r in L: by[re.sub(r'[^a-z0-9]','',(r.get('company') or '').lower())][r['company']]+=1
    canon={k:max(v,key=lambda n:(v[n],' ' in n,-len(n))) for k,v in by.items()}
    for r in L:
        k=re.sub(r'[^a-z0-9]','',(r.get('company') or '').lower())
        if canon.get(k) and canon[k]!=r['company']: r['company']=canon[k];st['company_alias']+=1
        t=clean_title(r.get('title'))
        if t!=r.get('title'): r['title']=t;st['title_note_removed']+=1
        # a title that ends with its own location (", Waltham, MA") repeats the location line
        for l in r.get('locations') or []:
            if l.get('city') and l.get('state'):
                suf=re.compile(r'[\s,\-–|]+'+re.escape(l['city'])+r',?\s*'+re.escape(l['state'])+r'\s*$',re.I)
                t2=suf.sub('',r['title'])
                if t2!=r['title'] and len(t2)>=8: r['title']=t2;st['title_loc_removed']+=1;break
        for l in r.get('locations') or []:
            c=clean_city(l.get('city'))
            if c!=l.get('city'): l['city']=c;st['city_trimmed']+=1
        # V13.3 #6: the title is the strongest season/year signal ('2027 Summer Internships', 'Summer Intern (2027)')
        _tt=N.terms_from(r.get('title') or '');_ty=[int(y) for y in re.findall(r'\b(20\d\d)\b',r.get('title') or '')]
        if not _tt and _ty and len(set(_ty))==1:
            _sw={w.title().replace('Autumn','Fall') for w in re.findall(r'(?i)\b(summer|fall|autumn|winter|spring)\b',r['title'])}
            if len(_sw)==1: _tt=[f'{_sw.pop()} {_ty[0]}']
        if _tt and (not r.get('season') or r.get('past_term')) and not N.past_term(_tt):
            up=[t for t in _tt if (int(t[-4:]),N.ORDER[t.split()[0]])>N.cur_term_tuple()] or _tt
            r['terms']=_tt;r['season'],r['year']=up[0].split()[0],int(up[0][-4:]);r['past_term']=False;st['season_from_title']+=1
        elif not _tt and _ty and min(_ty)>N.TODAY.year and r.get('past_term'):
            r['terms']=[];r['season']=None;r['year']=max(_ty);r['past_term']=False;st['past_term_cleared_by_title_year']+=1
        dg=degree(r.get('title'))
        if dg: r['degree']=dg
        else: r.pop('degree',None)
        if r.get('status')!='open': continue
        if PAST.search(r.get('title') or '') or RETURNING.search(r.get('title') or ''):
            r['status']='closed';r['close_reason']='past cycle' if PAST.search(r['title']) else 'returning interns only';r['closed_at']=r.get('closed_at') or today.isoformat();st['closed_'+r['close_reason'].replace(' ','_')]+=1;continue
        desc=DS.get(r['id']) or ''
        ex=explicit_deadlines(desc,today)
        if ex:
            d,src=min(ex)
            if not r.get('deadline') or d<r['deadline']: r['deadline']=d;r['deadline_source']='posting text';r['deadline_text']=src;st['deadline_from_text']+=1
        if not r.get('remote') and not any(l.get('state') for l in r.get('locations') or []):
            loc=slug_location(r.get('apply_url'),r.get('company') or '',desc);how='posting URL'
            if not loc: loc=text_location(desc);how='posting text'
            if not loc and PUBLIC.search(r.get('company') or ''):
                b=_pick([w for w in re.split(r'[\s,\-–—]+',re.sub(PUBLIC,' ',r['company'])) if w],desc,'')
                if b: g=geo.geocode(b[2],b[3]);loc={'city':b[2],'state':b[3],**({'lat':g[0],'lng':g[1]} if g else {})};how='employer name'
            hq=SITES.get(r.get('company'),{}).get('HQ')
            if not loc and hq and re.search(r'head-?quarters|\bhq\b|corporate|support-center|winton-hill|whbc',(r.get('apply_url') or '').lower()):
                c,s_=hq.split('|');g=geo.geocode(c,s_);loc={'city':c,'state':s_,**({'lat':g[0],'lng':g[1]} if g else {})};how='employer headquarters (named in posting URL)'
            if not loc and SITES.get(r.get('company'),{}).get('*'):
                c,s_=SITES[r['company']]['*'].split('|');g=geo.geocode(c,s_);loc={'city':c,'state':s_,**({'lat':g[0],'lng':g[1]} if g else {})};how='employer site list'
            if loc:
                r['locations']=[loc];r['loc_source']=how;r.pop('loc_label',None);st['location_'+how.replace(' ','_')]+=1
    # V14 #4: dedupe open listings on normalized (company, title, location); keep the earliest-seen one
    nk=lambda v:re.sub(r'[^a-z0-9]+',' ',(v or '').lower()).strip()
    grp=collections.defaultdict(list)
    for r in L:
        if r.get('status')!='open' or r.get('hidden'): continue
        loc='|'.join(sorted(nk(f"{l.get('city') or ''} {l.get('state') or ''}") for l in r.get('locations') or []))+('|remote' if r.get('remote') else '')
        grp[(nk(r.get('company')),nk(r.get('title')),loc)].append(r)
    for g in grp.values():
        if len(g)<2: continue
        g.sort(key=lambda r:(r.get('first_seen') or r.get('posted') or '9',r['id']))
        for r in g[1:]: r['hidden']=True;r['dup_of']=g[0]['id'];st['duplicate_hidden']+=1
    return st
def meta_counts(L,today=None):
    today=today or datetime.date.today();op=[r for r in L if is_open(r,today)]
    return {'open':len(op),'open_all':len(op),'closing_this_week':sum(1 for r in op if r.get('deadline') and 0<=(datetime.date.fromisoformat(r['deadline'])-today).days<=7),'open_rule':'status open, not hidden, not past term, deadline today or later'}
