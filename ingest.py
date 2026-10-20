import json,re,html,datetime
TODAY=datetime.date(2026,10,20)
ST="AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR".split()
NAMES="Alabama Alaska Arizona Arkansas California Colorado Connecticut Delaware Florida Georgia Hawaii Idaho Illinois Indiana Iowa Kansas Kentucky Louisiana Maine Maryland Massachusetts Michigan Minnesota Mississippi Missouri Montana Nebraska Nevada New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota Ohio Oklahoma Oregon Pennsylvania Rhode Island|South Carolina|South Dakota|Tennessee Texas Utah Vermont Virginia Washington|West Virginia|Wisconsin Wyoming".replace('|',' ')
FOREIGN=re.compile(r'\b(UK|United Kingdom|Canada|India|Germany|Ireland|China|Japan|Singapore|Israel|Mexico|Costa Rica|CRI|Poland|France|Netherlands|Australia|Brazil|Taiwan|Korea|Philippines|Switzerland|Spain|Italy|Sweden|Hong Kong|ON|BC|QC|Toronto|London|Vancouver|Montreal|Bangalore|Bengaluru)\b')
USRE=re.compile(r'(,\s*('+'|'.join(ST)+r')\b)|\b(USA|United States|U\.S\.|US)\b|\b('+'|'.join(['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'])+r')\b|^Remote$|^Multiple$')
def us_locs(locs):
    out=[l.strip() for l in locs if l and USRE.search(l.strip()) and not FOREIGN.search(l)]
    return out
FIELDS=[('Healthcare & Life Sciences',r'clinical|health|medical|pharma|biolog|nurs|patient|hospital|life science|regulatory affairs|biotech|lab |laboratory|chemist'),
('Government & Policy',r'government|public policy|policy|federal|legislat|public sector|city of|county|state of|congress|defense policy|public affairs'),
('Nonprofit & Education',r'nonprofit|non-profit|foundation|education|teach|curriculum|community|volunteer|philanthrop'),
('Legal',r'legal|law|paralegal|compliance|counsel'),
('Media & Communications',r'communications|journalis|media|content|social media|editorial|public relations|\bpr\b|broadcast|video|writer|copy'),
('Design & Creative',r'\bux\b|ui/ux|ux/ui|user experience|product design|graphic|visual design|creative|animation|illustrat|industrial design'),
('Marketing & Sales',r'marketing|sales|brand|advertis|growth|customer success|merchandis|business development'),
('Quant & Trading',r'quant|trading|trader'),
('Finance & Accounting',r'financ|accounting|audit|tax|bank|wealth|invest|treasury|actuar|underwrit|credit|capital markets|fp&a|analyst program|summer analyst|equity|insurance'),
('Real Estate',r'real estate|property|cre\b|brokerage'),
('HR & People',r'human resources|\bhr\b|people ops|recruit|talent|labor relations'),
('Product Management',r'product manag|product owner|\bapm\b|product intern'),
('Data & AI',r'data|machine learning|\bml\b|\bai\b|artificial intel|analytics|scientist'),
('Engineering & Hardware',r'mechanical|electrical|civil|hardware|manufactur|aerospace|chemical eng|industrial|systems eng|structural|firmware|embedded|robot|flight test|process eng|quality|materials'),
('Software & IT',r'software|developer|swe|full[- ]stack|backend|front[- ]end|web|cyber|security|it |cloud|devops|infrastructure|mobile|ios|android|engineer'),
('Business & Operations',r'operations|supply chain|logistics|strategy|consult|business|procurement|sourcing|project manag|program manag|buyer')]
CATMAP={'AI/ML/Data':'Data & AI','Data Science, AI & Machine Learning':'Data & AI','Software':'Software & IT','Software Engineering':'Software & IT','Hardware':'Engineering & Hardware','Hardware Engineering':'Engineering & Hardware','Product':'Product Management','Product Management':'Product Management','Quant':'Quant & Trading'}
def field(title,extra='',fallback=None):
    t=(' '+title+' '+extra+' ').lower()
    for f,rx in FIELDS:
        if re.search(rx,t): return f
    return fallback or 'Other'
def levels(t):
    t=t.lower();L=[]
    for k,v in [('freshman','Freshman'),('first-year','Freshman'),('sophomore','Sophomore'),('junior','Junior'),('early insight','Sophomore'),('discovery','Sophomore'),("master",'Graduate'),('mba','Graduate'),('phd','Graduate'),('ph.d','Graduate'),('graduate','Graduate'),('senior','Junior')]:
        if k in t and v not in L: L.append(v)
    return L
def parse_dl(s):
    if not s: return None
    m=re.search(r'(20\d\d)-(\d\d)-(\d\d)',s)
    if m: return m.group(0)
    for fmt,rx in [('%b %d %Y',r'([A-Z][a-z]{2})[a-z]* (\d{1,2}),? (20\d\d)'),('%m/%d/%Y',r'(\d{1,2})/(\d{1,2})/(20\d\d)')]:
        m=re.search(rx,s)
        if m:
            try: return datetime.datetime.strptime(' '.join(m.groups()) if fmt[0]=='%' and '/' not in fmt else '/'.join(m.groups()),fmt).date().isoformat()
            except: pass
    return None
out=[]
# 1) Simplify
for x in json.load(open('/tmp/Summer2026-Internships.json')):
    if not x.get('active') or not x.get('is_visible',True): continue
    locs=us_locs(x.get('locations') or [])
    if not locs: continue
    cat=CATMAP.get(x.get('category'))
    f=cat if cat in ('Data & AI','Quant & Trading','Product Management') else field(x['title'],fallback=cat)
    if cat=='Software & IT' and f not in ('Data & AI','Design & Creative','Product Management'): f=cat
    if cat=='Engineering & Hardware' and f in ('Software & IT','Other'): f=cat
    out.append({'company':x['company_name'],'role':x['title'],'location':'; '.join(locs[:4])+(f' +{len(locs)-4} more' if len(locs)>4 else ''),
      'field':f,'industry':x.get('category'),'deadline':None,'deadline_text':None,'rolling':False,'status':'open','link':x.get('url'),
      'summer':', '.join(x.get('terms') or []) or None,'levels':levels(x['title']+' '+' '.join(x.get('degrees') or [])),
      'posted':datetime.datetime.fromtimestamp(x['date_posted']).date().isoformat(),'source':'SimplifyJobs/Summer2026-Internships (GitHub)'})
# 2) Zapply
sec=None
for line in open('/tmp/zap.md'):
    m=re.search(r'<strong>(.*?)</strong></h3>',line)
    if m: sec=m.group(1).replace('&amp;','&');continue
    m=re.match(r'\| \*\*(.+?)\*\* \| (.+?) \| (.+?) \| (.*?) \|.*?\]\((https?://[^)]+)\)',line)
    if not m or not sec: continue
    co,ro,lo,po,ln=m.groups()
    if not us_locs([lo]): continue
    fb={'Software Engineering':'Software & IT','Data Science & AI':'Data & AI','Hardware & Engineering':'Engineering & Hardware','Product, Design & Research':'Product Management','Business & Operations':'Business & Operations'}.get(sec)
    out.append({'company':co,'role':html.unescape(ro),'location':lo,'field':field(ro,fallback=fb),'industry':sec,'deadline':None,'deadline_text':None,'rolling':False,'status':'open',
      'link':ln,'summer':None,'levels':levels(ro),'posted':None,'source':'zapplyjobs/Internships-2027 (GitHub)'})
# 3) Provieo
h=open('/tmp/provieo.html').read()
PF={'Finance & Accounting':'Finance & Accounting','Health & Life Sciences':'Healthcare & Life Sciences','Marketing & Sales':'Marketing & Sales','Operations, Consulting & HR':None}
for row in re.findall(r'<tr>(.*?)</tr>',h,re.S)[0:]:
    tds=re.findall(r'<td[^>]*>(.*?)</td>',row,re.S)
    if len(tds)<6: continue
    ln=re.search(r'href="([^"]+)"',tds[1]); clean=lambda s:html.unescape(re.sub(r'<[^>]+>','',s)).replace(' ↗','').strip()
    co,ro,fl,lo,pay,dl=[clean(t) for t in tds[:6]]
    if lo!='Multiple' and lo!='Remote' and not us_locs([lo]): continue
    d=parse_dl(dl)
    out.append({'company':co,'role':ro,'location':lo+(' (US)' if lo in('Multiple','Remote') else ''),'field':PF.get(fl) or field(ro,fallback='Business & Operations'),'industry':fl,
      'deadline':d,'deadline_text':dl,'rolling':'Rolling' in dl and not d,'status':'open','link':ln.group(1) if ln else None,'summer':'Summer 2027','levels':levels(ro),'pay':pay,'posted':None,'source':'Provieo non-tech tracker (checked 2026-10-16)'})
# 4) Ty's tracker
ADD={'Charlotte':'Charlotte, NC','Fort Mill':'Fort Mill, SC','Raleigh':'Raleigh, NC','Detroit':'Detroit, MI','New York':'New York, NY','RTP':'RTP, NC','Irving':'Irving, TX','Minneapolis':'Minneapolis, MN','St. Louis':'St. Louis, MO','Carolinas':'Carolinas'}
for x in json.load(open('internships.json'))['internships']:
    y=dict(x); y['location']='; '.join(ADD[l] for l in (x['location'] or '').split(', ') if l) or None
    y['field']=field(x['role'],x.get('industry') or '',fallback='Finance & Accounting'); y['levels']=levels(x['role']+' '+(x.get('source_status') or '')+' '+(x.get('notes') or ''))
    y['source']="Ty's Charlotte tracker"; y.pop('sources',None); out.append(y)
# dedupe (company+role), prefer entries with deadlines / Ty tracker
def k(r): return re.sub(r'[^a-z0-9]','',r['company'].lower())+'|'+re.sub(r'[^a-z0-9]','',re.sub(r'\(.*?\)|summer|2026|2027|-','',r['role'].lower()))
best={}
for r in out:
    kk=k(r); o=best.get(kk)
    if not o: best[kk]=r; continue
    if (r['deadline'] and not o['deadline']) or r['source'].startswith('Ty'): 
        if o['location'] and r['location'] and o['location'] not in r['location']: r['location']=r['location']
        best[kk]=r
from normalize import normalize
res=[normalize(r,i) for i,r in enumerate(best.values())]
json.dump({'generated':str(TODAY),'schema':'v2','sources':sorted({r['source'] for r in res}),'count':len(res),'internships':res},open('data.json','w'),ensure_ascii=False,separators=(',',':'))
import collections;c=collections.Counter(r['industry'] for r in res);print(len(out),len(res));[print(f'{n:5} {f}') for f,n in c.most_common()];
print(collections.Counter(r['source'] for r in res))
