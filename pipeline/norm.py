"""Normalization for V4 listings. Unknown stays None; nothing is guessed."""
import re,html,datetime,hashlib
from .geo import geocode
TODAY=datetime.date.today()
ST="AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR".split()
SN={'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY','District of Columbia':'DC','Puerto Rico':'PR'}
FOREIGN=re.compile(r'\b(UK|United Kingdom|England|Scotland|Canada|India|Germany|Ireland|China|Japan|Singapore|Israel|Mexico|Costa Rica|Poland|France|Netherlands|Australia|Brazil|Taiwan|Korea|Philippines|Switzerland|Spain|Italy|Sweden|Hong Kong|Ontario|British Columbia|Quebec|Alberta|Toronto|London|Vancouver|Montreal|Bangalore|Bengaluru|Hyderabad|Pune|Mumbai|Chennai|Dublin|Berlin|Munich|Paris|Amsterdam|Tokyo|Shanghai|Beijing|Shenzhen|Seoul|Sydney|Melbourne|Tel Aviv|Warsaw|Krakow|Madrid|Barcelona|Zurich|Prague|Bucharest|Romania|Hungary|Budapest|Portugal|Lisbon|Argentina|Colombia|Chile|Peru|Vietnam|Thailand|Malaysia|Indonesia|UAE|Dubai|Saudi|Egypt|Nigeria|Kenya|South Africa|Belgium|Denmark|Norway|Finland|Austria|Greece|Turkey|Ukraine|Pakistan|EMEA|APAC|LATAM)\b',re.I)
USHINT=re.compile(r'\b(US|USA|U\.S\.A?\.?|United States|America)\b',re.I)
def clean_html(s):
    if not s: return ''
    s=html.unescape(s);s=re.sub(r'<(br|/p|/li|/h\d|/div)[^>]*>','\n',s,flags=re.I);s=re.sub(r'<li[^>]*>','• ',s,flags=re.I);s=re.sub(r'<[^>]+>','',s);s=html.unescape(s)
    s=re.sub(r'[ \t\xa0]+',' ',s);s=re.sub(r'\n\s*\n+','\n\n',s);return s.strip()
# ---------- intern detection ----------
INTERN=re.compile(r"\bintern(s|ship|ships)?\b|\bco-?op\b|\bsummer (analyst|associate|scholar|program)\b|\bapprentice(ship)?\b|\bstudent fellow|\bfellowship\b.*\b(student|undergrad)|\bextern(ship)?\b|\bstudent trainee\b|\bpathways\b.*\b(student|intern)|\bundergrad(uate)? research (assistant|fellow|program)|\bresearch assistant\b.*\bundergrad|\bpart[- ]time student\b|\bstudent (worker|assistant|associate|employee|analyst|engineer|developer)\b|\bearly insights?\b|\bdiscovery (program|day)\b|\bsophomore (program|summit|leadership)\b|\bfreshman (program|summit)\b",re.I)
NOT_INTERN=re.compile(r"\b(internal|international|internist)\b(?!.*\bintern)",re.I)
AMBIG=re.compile(r"\b(intern(ship)? (program )?(manager|coordinator|recruiter|lead|director)|manager.*interns?|recruiter|new grad|graduate program|rotational|entry[- ]level|associate program|fellow(ship)?\b|student\b|campus)\b",re.I)
SENIOR=re.compile(r"\b(senior|sr\.?|staff|principal|director|manager|head of|vp|lead)\b",re.I)
def intern_class(title):
    """returns 'yes' | 'no' | 'ambiguous' (logged for review, never guessed)"""
    t=title or ''
    if INTERN.search(t):
        if re.search(r'\bintern(ship)? (program )?(manager|coordinator|recruiter|lead|director|specialist)\b',t,re.I) or (SENIOR.search(t) and not re.search(r'\bintern',t,re.I)): return 'ambiguous'
        return 'yes'
    if AMBIG.search(t) and not SENIOR.search(t): return 'ambiguous'
    return 'no'
# ---------- location ----------
def parse_place(p):
    p=re.sub(r'\s*\+\d+ more$','',(p or '')).strip().strip('.;,').strip()
    if not p: return None
    if re.search(r'remote|anywhere|virtual|work from home|telework',p,re.I):
        if FOREIGN.search(p) and not USHINT.search(p): return None
        m=re.search(r',\s*([A-Z]{2})\b',p);st=m.group(1) if m and m.group(1) in ST else None
        return {'remote':True,'state':st}
    if FOREIGN.search(p) and not re.search(r',\s*(%s)\b'%'|'.join(ST),p): return None
    m=re.match(r'^([^,;]+?),\s*([A-Z]{2})\b(?:,?\s*(US|USA|United States)?)?',p)
    if m and m.group(2) in ST: return {'city':m.group(1).strip(),'state':m.group(2)}
    m=re.match(r'^(.+),\s*([A-Z]{2})$',p)
    if m and m.group(2) in ST: return {'city':m.group(1).split(',')[-1].strip(),'state':m.group(2)}
    m=re.match(r'^(?:US|USA|United States)[,\-\s]+([A-Z]{2}|[A-Za-z ]+?)[,\-\s]+(.+)$',p)
    if m:
        st=m.group(1) if m.group(1) in ST else SN.get(m.group(1).strip().title())
        if st: return {'city':m.group(2).strip(' -,'),'state':st}
    for name in sorted(SN,key=len,reverse=True):
        if re.search(r'\b'+name+r'\b',p,re.I):
            parts=[s.strip() for s in re.split(r'[,\-–|/]',p) if s.strip()]
            parts=[x for x in parts if x.lower() not in ('us','usa','united states','united states of america')]
            city=next((x for x in parts if x.lower()!=name.lower() and x.title() not in SN and not re.match(r'^[A-Z]{2}$',x)),None)
            return {'city':city,'state':SN[name]}
    if USHINT.search(p) and len(p)<40: return {'city':None,'state':None,'country':'US'}
    return None
def parse_locations(strings):
    """returns (locations[], remote_bool, us_bool)"""
    locs=[];remote=False;us=False
    for s in strings or []:
        for part in re.split(r'\s*;\s*|\s+\|\s+|\s+or\s+',s or ''):
            x=parse_place(part)
            if not x: continue
            us=True
            if x.get('remote'): remote=True;continue
            if x.get('city') and x.get('state'):
                g=geocode(x['city'],x['state'])
                if g: x.update(lat=g[0],lng=g[1],pop=g[2])
            x.pop('country',None)
            if (x.get('city') or x.get('state')) and not any(l==x or (x.get('lat') and l.get('lat')==x.get('lat') and l.get('lng')==x.get('lng')) for l in locs): locs.append(x)
    return locs,remote,us
# ---------- category (role function) ----------
CATS=[('Healthcare & Life Sciences',r'clinical|health|medical|pharma|biolog|nurs|patient|hospital|life science|regulatory affairs|biotech|laborator|chemist|pharmac'),
('Government & Policy',r'government|public policy|policy|federal|legislat|public sector|city of|county|congress|public affairs|pathways'),
('Nonprofit & Education',r'nonprofit|non-profit|foundation|education|teach|curriculum|community|volunteer|philanthrop|fundrais|development associate'),
('Legal',r'legal|\blaw\b|paralegal|counsel|litigation'),
('Accounting & Audit',r'accounting|audit|\btax\b|assurance|cpa\b|bookkeep|controller'),
('Consulting & Strategy',r'consult|strategy|advisory'),
('Media & Communications',r'communications|journalis|media|content|social media|editorial|public relations|\bpr\b|broadcast|video|writer|copy|newsroom'),
('Design & Creative',r'\bux\b|ui/ux|ux/ui|user experience|product design|graphic|visual design|creative|animation|illustrat|industrial design|design intern'),
('Marketing & Sales',r'marketing|sales|brand|advertis|growth|customer success|merchandis|business development|e-?commerce'),
('Quant & Trading',r'quant|trading|trader'),
('Finance & Banking',r'financ|bank|wealth|invest|treasury|actuar|underwrit|credit|capital markets|fp&a|summer analyst|equity|insurance|risk|portfolio'),
('Real Estate',r'real estate|property|brokerage|leasing'),
('HR & People',r'human resources|\bhr\b|people ops|recruit|talent|labor relations'),
('Supply Chain & Logistics',r'supply chain|logistics|procurement|sourcing|buyer|purchasing|warehouse|distribution'),
('Product Management',r'product manag|product owner|\bapm\b|product intern'),
('Research',r'research assistant|undergrad(uate)? research|research fellow|\breu\b'),
('Data & AI',r'data|machine learning|\bml\b|\bai\b|artificial intel|analytics|scientist|\bnlp\b|computer vision'),
('Engineering & Hardware',r'mechanical|electrical|civil|hardware|manufactur|aerospace|chemical eng|industrial|systems eng|structural|firmware|embedded|robot|flight test|process eng|quality|materials|environmental eng|field eng'),
('Software & IT',r'software|developer|\bswe\b|full[- ]stack|backend|back-end|front[- ]end|web|cyber|security|\bit\b|cloud|devops|infrastructure|mobile|ios|android|engineer|technology|technical'),
('Business & Operations',r'operations|business|project manag|program manag|analyst|administrat|office')]
SIMPLIFY_CAT={'AI/ML/Data':'Data & AI','Data Science, AI & Machine Learning':'Data & AI','Software':'Software & IT','Software Engineering':'Software & IT','Hardware':'Engineering & Hardware','Hardware Engineering':'Engineering & Hardware','Product':'Product Management','Product Management':'Product Management','Quant':'Quant & Trading','Quantitative Finance':'Quant & Trading'}
def category(title,dept='',hint=None):
    t=(' '+(title or '')+' ').lower()
    for c,rx in CATS:
        if re.search(rx,t): 
            if hint=='Software & IT' and c in ('Business & Operations','Engineering & Hardware'): return hint
            return c
    d=(' '+(dept or '')+' ').lower()
    for c,rx in CATS:
        if d.strip() and re.search(rx,d): return c
    return hint or 'Other'
def role_type(t):
    t=(t or '').lower()
    if re.search(r'co-?op\b',t): return 'Co-op'
    if re.search(r'insight|discovery|explore|sophomore (program|summit)|freshman (program|summit)|launch program',t): return 'Early-insight program'
    if re.search(r'extern',t): return 'Externship'
    if re.search(r'fellow',t): return 'Fellowship'
    if re.search(r'apprentic',t): return 'Apprenticeship'
    if re.search(r'part[- ]time',t): return 'Part-time internship'
    if re.search(r'research',t): return 'Research internship'
    if re.search(r'student (worker|assistant|trainee|employee)',t): return 'Student position'
    return 'Internship'
# ---------- season / class year / text facts ----------
TERM=re.compile(r'\b(Summer|Fall|Spring|Winter)\s*(?:\'|20)(\d\d)\b',re.I)
ORDER={'Winter':0,'Spring':1,'Summer':2,'Fall':3}
def terms_from(*texts):
    out=set()
    for tx in texts:
        for s,y in TERM.findall(tx or ''): out.add(f'{s.title()} 20{y[-2:]}')
    return sorted(out,key=lambda t:(int(t[-4:]),ORDER[t.split()[0]]))
def cur_term_tuple():
    m=TODAY.month;return (TODAY.year,0 if m<=2 else 1 if m<=5 else 2 if m<=8 else 3)
def past_term(terms):
    if not terms: return False
    c=cur_term_tuple();return all((int(t[-4:]),ORDER[t.split()[0]])<=c for t in terms)
def acad_year_end():
    return TODAY.year+1 if TODAY.month>=8 else TODAY.year
def class_from_grad(y):
    d=y-acad_year_end();return 'Senior' if d<=0 else 'Junior' if d==1 else 'Sophomore' if d==2 else 'Freshman' if d==3 else None
CY=['Freshman','Sophomore','Junior','Senior','Graduate']
def class_years(title,desc=''):
    t=(title+' \n '+desc[:6000]);lo=t.lower();out=set()
    for m in re.finditer(r'rising (sophomore|junior|senior|second[- ]year|third[- ]year|fourth[- ]year)s?',lo):
        out.add({'sophomore':'Freshman','second year':'Freshman','second-year':'Freshman','junior':'Sophomore','third year':'Sophomore','third-year':'Sophomore','senior':'Junior','fourth year':'Junior','fourth-year':'Junior'}[m.group(1)])
    for m in re.finditer(r'\b(freshm[ae]n|first[- ]year|sophomores?|juniors?|seniors?)\b(?=[^.\n]{0,50}\b(student|undergrad|standing|class|year|college|universit|enrolled))',lo):
        w=m.group(1);out.add('Freshman' if w.startswith(('fresh','first')) else 'Sophomore' if w.startswith('soph') else 'Junior' if w.startswith('jun') else 'Senior')
    if re.search(r'\b(freshm[ae]n|sophomore)s?\b',title.lower()): out.add('Freshman' if 'fresh' in title.lower() else 'Sophomore')
    if re.search(r"\b(master'?s|mba|ph\.?d|doctoral|graduate student|law student|j\.?d\.? candidate|medical student)\b",lo): out.add('Graduate')
    for m in re.finditer(r'graduat\w*\s+(?:date\s+)?(?:between\s+)?(?:in\s+)?(?:(?:may|june|december|dec|spring|fall|winter|summer)\s+(?:of\s+)?)?(20\d\d)(?:\s*(?:-|–|and|to|or)\s*(?:(?:may|june|december|dec|spring|fall|winter|summer)\s+)?(20\d\d))?',lo):
        ys=[int(y) for y in m.groups() if y]
        for y in range(min(ys),max(ys)+1):
            c=class_from_grad(y)
            if c: out.add(c)
    return [c for c in CY if c in out]
MON={m:i+1 for i,m in enumerate('jan feb mar apr may jun jul aug sep oct nov dec'.split())}
DATE_RX=r'((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+20\d\d|\d{1,2}/\d{1,2}/20\d\d|20\d\d-\d\d-\d\d)'
DL_CTX=re.compile(r'(apply by|application deadline|deadline(?: to apply)?(?: is)?|applications? (?:are |will be )?(?:due|accepted (?:through|until)|close[sd]?|must be (?:received|submitted) by)|closing date|close date|no later than|posting (?:will )?close[sd]?(?: on)?|open until|accepting applications (?:through|until))\s*[:\-–]?\s*(?:on|by)?\s*(?:\w+day,?\s*)?'+DATE_RX,re.I)
def to_iso(s):
    s=s.strip().lower().replace(',','').replace('.','')
    m=re.match(r'(20\d\d)-(\d\d)-(\d\d)',s)
    if m: return s[:10]
    m=re.match(r'(\d{1,2})/(\d{1,2})/(20\d\d)',s)
    if m:
        try: return datetime.date(int(m.group(3)),int(m.group(1)),int(m.group(2))).isoformat()
        except ValueError: return None
    m=re.match(r'([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(20\d\d)',s)
    if m and m.group(1)[:3] in MON:
        try: return datetime.date(int(m.group(3)),MON[m.group(1)[:3]],int(m.group(2))).isoformat()
        except ValueError: return None
    return None
def deadline_from_text(desc,posted=None):
    """only explicit deadline phrases with a full date (incl. year)"""
    if not desc: return None,None
    for m in DL_CTX.finditer(desc):
        d=to_iso(m.group(2))
        if not d: continue
        dd=datetime.date.fromisoformat(d)
        if posted:
            try:
                if dd<datetime.date.fromisoformat(posted[:10]): continue
            except ValueError: pass
        if dd>TODAY+datetime.timedelta(days=550): continue
        return d,m.group(0)[:120]
    return None,None
def rolling_from_text(desc): return bool(re.search(r'rolling basis|rolling admissions|reviewed on a rolling|until (the )?(position is )?filled',desc or '',re.I))
def sponsorship(desc):
    d=desc or ''
    if re.search(r'(unable|not able|will not|won.t|cannot|do(es)? not|not)\s+(to\s+)?(provide|offer|sponsor|support)\w*\s+(\w+\s+){0,4}(visa|sponsorship|work authorization)|without (the need for |requiring )?(current or future |future )?(employer |visa )?sponsorship|no (visa )?sponsorship|sponsorship (is )?not (available|offered|provided)',d,re.I): return 'Not offered'
    if re.search(r'(visa )?sponsorship (is )?(available|offered|provided)|will sponsor|we sponsor|offer(s)? (visa )?sponsorship',d,re.I): return 'Offered'
    return None
def citizenship(desc):
    return True if re.search(r'(must be|requires?|required to be|only) (a )?u\.?s\.? citizen|u\.?s\.? citizenship (is )?required|active (security )?clearance|eligib\w+ (for|to obtain) (a )?(security )?clearance',desc or '',re.I) else None
PAY=re.compile(r'\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:k\b)?\s*(?:-|–|to)\s*\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:k\b)?\s*(?:usd\s*)?(?:per|/|an?)\s*(hour|hr|year|yr|annum|month|week)|\$\s?(\d{1,3}(?:\.\d{2})?)\s*(?:usd\s*)?(?:per|/|an?)\s*(hour|hr)',re.I)
def pay(desc):
    d=desc or ''
    if re.search(r'\bunpaid\b',d,re.I) and not re.search(r'\bnot (an )?unpaid\b',d,re.I): return False,'Unpaid'
    m=PAY.search(d)
    if m: return True,m.group(0).strip()
    if re.search(r'\b(paid internship|this (is a )?paid|hourly (wage|rate|pay)|compensat(ed|ion) (of|at|is)|stipend)\b',d,re.I): return True,None
    return None,None
def gpa_min(desc):
    m=re.search(r'(?:minimum|min\.?|at least|cumulative|overall|required)\s+(?:(?:cumulative|overall|undergraduate)\s+)?(?:of\s+)?(?:a\s+)?(?:gpa|g\.p\.a\.?|grade point average)\s*(?:of\s*)?(?:a\s*)?([234]\.\d{1,2})|([234]\.\d{1,2})\s*(?:/\s*4\.0\s*)?(?:\+|or (?:higher|above|better|greater))\s*(?:cumulative\s+|overall\s+)?(?:gpa|g\.p\.a)|(?:gpa|g\.p\.a\.?)\s*(?:of\s*)?(?:at least\s*|minimum\s*(?:of\s*)?)?([234]\.\d{1,2})\s*(?:/\s*4\.0\s*)?(?:\+|or (?:higher|above|better))',desc or '',re.I)
    if not m: return None
    v=float(next(g for g in m.groups() if g));return v if 2.0<=v<=4.0 else None
def workplace(desc,loc_strings,remote_flag,ats_value=None):
    if ats_value:
        v=str(ats_value).lower()
        if 'hybrid' in v: return 'Hybrid'
        if 'remote' in v: return 'Remote'
        if 'on' in v and 'site' in v or v in ('onsite','office','in office'): return 'On-site'
    t=' '.join(loc_strings or [])+' '+(desc or '')[:4000]
    if re.search(r'\bhybrid\b',t,re.I): return 'Hybrid'
    if remote_flag: return 'Remote'
    if re.search(r'\b(on-?site|in[- ]office|in[- ]person)\b',t,re.I): return 'On-site'
    return None
def openings(desc):
    m=re.search(r'\b(\d{1,3})\s+(?:open\s+)?(?:intern(?:ship)?\s+)?(?:positions|openings|interns|spots|seats)\s+(?:available|open)',desc or '',re.I)
    return int(m.group(1)) if m else None
def nkey(s): return re.sub(r'[^a-z0-9]','',(s or '').lower())
def norm_company(c):
    c=re.sub(r'\s+',' ',(c or '').strip());c=re.sub(r',?\s+(inc\.?|llc|l\.l\.c\.|corp\.?|corporation|co\.|ltd\.?|plc|l\.p\.|lp)$','',c,flags=re.I);return c.strip()
def dedupe_key(company,title,locs,terms):
    t=re.sub(r'\(.*?\)|\b(summer|fall|spring|winter)\b|\b20\d\d\b|[-–—|:]',' ',title.lower())
    city=(locs[0].get('city') or locs[0].get('state') or '') if locs else 'remote'
    return '|'.join([nkey(norm_company(company)),nkey(t),nkey(city),nkey(terms[0] if terms else '')])
def stable_id(key): return hashlib.sha1(key.encode()).hexdigest()[:10]
