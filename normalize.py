"""V2 listing schema. Every field is taken from the source; unknown stays None/[] (UI shows 'not listed').
Schema: id, company, title, industry, role_type, locations[{city,state}], location_text, remote,
deadline (YYYY-MM-DD|None), rolling (bool), season, year, terms[], class_years[], apply_url,
date_added (date the source first listed it, if known), source, status, past_term, notes"""
import re,datetime
TODAY=datetime.date(2026,10,20)
SN={'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','West Virginia':'WV','Washington':'WA','Wisconsin':'WI','Wyoming':'WY','District of Columbia':'DC','Puerto Rico':'PR'}
CODES=set(SN.values())
NOTCITY=re.compile(r'^(US|USA|United States.*|Remote.*|Multiple.*)$',re.I)
def _cc(c):
    return re.sub(r'^[\s,\-–—]+|[\s,\-–—]+$','',c) or None if isinstance(c,str) else c
def parse_place(p):
    r=_parse_place(p)
    if r and r.get('city'): r['city']=_cc(r['city'])
    return r
def _parse_place(p):
    p=re.sub(r'\s*\+\d+ more$','',p).strip().rstrip('.').rstrip()
    if not p or NOTCITY.match(p) and not re.search(r',\s*[A-Z]{2}\b',p): return None
    m=re.match(r'^([^,;]+?),\s*([A-Z]{2})\b',p)
    if m and m.group(2) in CODES: return {'city':m.group(1).strip(),'state':m.group(2)}
    m=re.match(r'^(.+),\s*([A-Z]{2})$',p)
    if m and m.group(2) in CODES: return {'city':m.group(1).split(',')[0].strip(),'state':m.group(2)}
    m=re.match(r'^US,\s*([A-Z]{2}|[A-Za-z ]+),\s*(.+)$',p)  # "US, CA, Santa Clara"
    if m:
        st=m.group(1) if m.group(1) in CODES else SN.get(m.group(1).strip())
        if st: return {'city':m.group(2).strip(),'state':st}
    for name in sorted(SN,key=len,reverse=True):
        if re.search(r'\b'+name+r'\b',p):
            parts=[s.strip() for s in re.split(r'[,\-–]',p) if s.strip()]
            city=parts[0] if parts and parts[0]!=name and not NOTCITY.match(parts[0]) and parts[0] not in ('US','USA') else None
            if city and SN.get(city): city=None
            # "USA - New York City - New York"
            if parts and parts[0] in ('USA','US') and len(parts)>1 and parts[1]!=name: city=parts[1]
            if name=='Washington' and city is None and p.strip()=='Washington': return {'city':None,'state':'WA'}
            return {'city':city,'state':SN[name]}
    if p in ('New York',): return {'city':'New York','state':'NY'}
    return {'city':p,'state':None} if p not in ('Carolinas',) else {'city':None,'state':None,'region':p}
TERM=re.compile(r'\b(Summer|Fall|Spring|Winter)\s+(20\d\d)\b',re.I)
ORDER={'Winter':0,'Spring':1,'Summer':2,'Fall':3}
def role_type(t):
    t=t.lower()
    if re.search(r'co-?op\b',t): return 'Co-op'
    if re.search(r'insight|discovery|explore|early (careers )?program|launch|sophomore program|freshman program',t): return 'Early-insight program'
    if re.search(r'fellow',t): return 'Fellowship'
    if re.search(r'apprentice',t): return 'Apprenticeship'
    if re.search(r'part[- ]time',t): return 'Part-time internship'
    if re.search(r'research',t): return 'Research internship'
    return 'Internship'
def normalize(r,i):
    title=r['role'];loc_text=r.get('location') or None
    pieces=[s for s in (loc_text or '').split(';') if s.strip()]
    locs=[];
    for s in pieces:
        x=parse_place(s)
        if x and x not in locs: locs.append(x)
    remote=bool(re.search(r'remote',(loc_text or '')+' '+title,re.I))
    terms=sorted({f'{s.title()} {y}' for s,y in TERM.findall((r.get('summer') or '')+' '+title)},key=lambda t:(int(t[-4:]),ORDER[t.split()[0]]))
    past=bool(terms) and all((int(t[-4:]),ORDER[t.split()[0]])<=(2026,3) for t in terms)
    up=[t for t in terms if (int(t[-4:]),ORDER[t.split()[0]])>(2026,3)] or terms
    season,year=(up[0].split()[0],int(up[0][-4:])) if up else (None,None)
    st=r.get('status') or 'open'
    if r.get('deadline') and r['deadline']<str(TODAY): st='closed'
    return {'id':i,'company':r['company'].strip(),'title':title.strip(),'industry':r.get('field') or None,'source_category':r.get('industry'),
      'role_type':role_type(title),'locations':locs,'location_text':loc_text,'remote':remote,
      'deadline':r.get('deadline'),'deadline_text':r.get('deadline_text'),'rolling':bool(r.get('rolling')),
      'season':season,'year':year,'terms':terms,'past_term':past,'class_years':r.get('levels') or [],
      'apply_url':r.get('link'),'date_added':r.get('posted'),'source':r['source'],'status':st,
      'notes':' · '.join(x for x in [r.get('source_status'),r.get('notes')] if x) or None}
