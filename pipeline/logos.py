"""Company logos, cached in the repo at build time (no third party needed at runtime).
Domain: companies.csv domain -> Clearbit's free company autocomplete, accepted only on an exact name match -> the
company's own apply/careers host (never an ATS or aggregator host). Logo: Google's favicon CDN (t1.gstatic.com/faviconV2,
allowed by robots) at 128px -> DuckDuckGo icons -> the site's apple-touch-icon (robots.txt respected; Wikimedia's APIs disallow bots in robots.txt, so they are not used). Anything under
48px is rejected as a blurry favicon; then the site shows a letter avatar. Output: assets/logos/<slug>.webp (112px) and data/logos.json."""
import os,re,io,csv,json,sys,urllib.parse,concurrent.futures as cf
sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline import net
from PIL import Image
R=os.path.join(os.path.dirname(__file__),'..');D=os.path.join(R,'data');OUT=os.path.join(R,'assets','logos')
net.DELAY.update({'autocomplete.clearbit.com':0.2,'t1.gstatic.com':0.1,'icons.duckduckgo.com':0.3,'query.wikidata.org':1.0,'commons.wikimedia.org':0.5,'upload.wikimedia.org':0.3})
ATS=re.compile(r'greenhouse|lever\.co|ashbyhq|myworkday|workday|smartrecruiters|workable|icims|taleo|jobvite|zapply|simplify|successfactors|oraclecloud|ultipro|paylocity|adp\.com|dayforce|brassring|bamboohr|rippling|recruitee|breezy|jazzhr|github|linkedin|indeed|handshake|usajobs|eightfold|phenom|avature|careers-page|teamtailor|pinpoint|gem\.com|dover|wellfound|ycombinator')
norm=lambda s:re.sub(r'\b(inc|llc|ltd|corp|corporation|co|company|group|holdings|the|plc|lp|l p)\b','',re.sub(r'[^a-z0-9 ]',' ',(s or '').lower().replace('&',' and '))).split()
slug=lambda s:re.sub(r'[^a-z0-9]+','-',(s or '').lower()).strip('-')[:60] or 'x'
def regdom(h):
    h=h.lower().split(':')[0];p=h.split('.')
    return '.'.join(p[-3:]) if len(p)>=3 and p[-2] in ('co','com','org','ac') and len(p[-1])==2 else '.'.join(p[-2:])
def domain_for(name,urls,known):
    if known: return known,'registry'
    try:
        j=net.fetch('https://autocomplete.clearbit.com/v1/companies/suggest?query='+urllib.parse.quote(name),timeout=15).json()
        for c in j[:3]:
            if norm(c.get('name'))==norm(name) and c.get('domain'): return c['domain'],'clearbit'
    except Exception: pass
    for u in urls:
        h=urllib.parse.urlsplit(u).netloc
        if h and not ATS.search(h): return regdom(h),'apply-url'
    return None,None
def img_ok(b):
    try: im=Image.open(io.BytesIO(b));im.load()
    except Exception: return None
    if getattr(im,'n_frames',1)>1 or im.format=='ICO':
        try: im=max([im.ico.getimage(s) for s in im.ico.sizes()],key=lambda x:x.size[0]) if im.format=='ICO' else im
        except Exception: pass
    if min(im.size)<48: return None
    return im
def logo_for(dom):
    srcs=[('gstatic',f'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://{dom}&size=128')]
    for name,u in srcs:
        try:
            r=net.fetch(u,timeout=15,tries=1,allow_404=True)
            if r is not None and getattr(r,'status_code',200)==200:
                im=img_ok(r.content)
                if im is not None: return im,name
        except Exception: pass
    for base in (f'https://www.{dom}' if not dom.startswith('www.') else None,f'https://{dom}'):
        if not base: continue
        try:
            r=net.fetch(base+'/',timeout=15,tries=1);h=r.text;root=r.url
            hrefs=[re.search(r'href=["\']([^"\']+)',m.group(0)) for m in re.finditer(r'<link[^>]+rel=["\'][^"\']*(apple-touch-icon|icon)[^"\']*["\'][^>]*>',h,re.I)]
            for u in [urllib.parse.urljoin(root,x.group(1)) for x in hrefs if x]+[urllib.parse.urljoin(root,'/apple-touch-icon.png')]:
                if u.split('?')[0].endswith('.svg'): continue
                try:
                    rr=net.fetch(u,timeout=15,tries=1,allow_404=True)
                    if rr.status_code==200:
                        im=img_ok(rr.content)
                        if im is not None: return im,'apple-touch-icon'
                except Exception: pass
            break
        except Exception: continue
    try:
        im=img_ok(net.fetch(f'https://icons.duckduckgo.com/ip3/{dom}.ico',timeout=15,tries=1).content)
        if im is not None: return im,'duckduckgo'
    except Exception: pass
    return None,None
def save(im,path):
    im=im.convert('RGBA');w,h=im.size;s=max(w,h);bg=Image.new('RGBA',(s,s),(255,255,255,0));bg.paste(im,((s-w)//2,(s-h)//2),im)
    bg.resize((112,112),Image.LANCZOS).save(path,'WEBP',quality=88,method=6)
def main(limit=None):
    os.makedirs(OUT,exist_ok=True)
    L=json.load(open(os.path.join(D,'listings.json')))['listings']
    known={r['name']:r.get('domain') for r in csv.DictReader(open(os.path.join(D,'companies.csv')))}
    urls={}
    for r in L:
        if r.get('status')=='closed': continue
        urls.setdefault(r['company'],[]).append(r.get('apply_url') or '')
    P=os.path.join(D,'logos.json');old=json.load(open(P)) if os.path.exists(P) else {}
    todo=[c for c in urls if c not in old][:limit]
    def work(c):
        dom,dsrc=domain_for(c,urls[c],known.get(c))
        if not dom: return c,{'logo':None,'why':'no domain'}
        im,src=logo_for(dom)
        if im is None: return c,{'domain':dom,'domain_src':dsrc,'logo':None,'why':'no logo >=48px'}
        f=slug(c)+'.webp';save(im,os.path.join(OUT,f));return c,{'domain':dom,'domain_src':dsrc,'logo':'assets/logos/'+f,'src':src}
    with cf.ThreadPoolExecutor(8) as ex:
        for i,(c,v) in enumerate(ex.map(work,todo)):
            old[c]=v
            if i%100==0: json.dump(old,open(P,'w'),indent=0);print(i,len(todo),flush=True)
    json.dump(old,open(P,'w'),indent=0,sort_keys=True)
    n=sum(1 for c in urls if (old.get(c) or {}).get('logo'));print(f'logos: {n}/{len(urls)} companies ({100*n/len(urls):.1f}%)')
if __name__=='__main__' and not (len(sys.argv)>1 and sys.argv[1]=='boards'): main(int(sys.argv[1]) if len(sys.argv)>1 else None)
# ---- second pass: the company's own logo from its public careers board (registry ATS + slug); robots.txt respected ----
def ats_logo(ats,slug):
    try:
        if ats=='workday':
            host,tenant,site=slug.split('/');u=f'https://{host}/{site}/assets/logo'
            r=net.fetch(u,timeout=15,tries=1,allow_404=True);return (img_ok(r.content),'careers-board') if r.status_code==200 else (None,None)
        page={'greenhouse':f'https://job-boards.greenhouse.io/{slug}','lever':f'https://jobs.lever.co/{slug}','ashby':f'https://jobs.ashbyhq.com/{slug}','workable':f'https://apply.workable.com/{slug}/'}.get(ats)
        if not page: return None,None
        h=net.fetch(page,timeout=20,tries=1).text
        logo=re.findall(r'<img[^>]+(?:class|alt|id)=["\'][^"\']*logo[^"\']*["\'][^>]*src=["\']([^"\']+)',h,re.I)+re.findall(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*(?:class|alt|id)=["\'][^"\']*logo',h,re.I)+re.findall(r'"logo(?:Url|ImageUrl|_url)?"\s*:\s*"(https?:[^"]+)"',h)
        og=re.findall(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)',h,re.I)
        for u,lim in [(u,3.2) for u in logo[:3]]+[(u,1.25) for u in og[:1]]:  # og:image is often a photo/banner: only near-square ones count
            u=urllib.parse.urljoin(page,u.replace('\\u002F','/'))
            if u.split('?')[0].endswith('.svg'): continue
            try:
                im=img_ok(net.fetch(u,timeout=15,tries=1).content)
                if im is not None and max(im.size)/min(im.size)<=lim: return im,'careers-board'
            except Exception: pass
    except Exception: pass
    return None,None
def second_pass():
    P=os.path.join(D,'logos.json');d=json.load(open(P));reg={r['name']:r for r in csv.DictReader(open(os.path.join(D,'companies.csv')))}
    todo=[c for c,v in d.items() if not v.get('logo') and reg.get(c,{}).get('ats') and reg[c].get('slug')]
    def work(c):
        im,src=ats_logo(reg[c]['ats'],reg[c]['slug'])
        if im is None: return c,None
        f=slug(c)+'.webp';save(im,os.path.join(OUT,f));return c,{**d[c],'logo':'assets/logos/'+f,'src':src}
    with cf.ThreadPoolExecutor(8) as ex:
        for c,v in ex.map(work,todo):
            if v: d[c]=v
    json.dump(d,open(P,'w'),indent=0,sort_keys=True);n=sum(1 for v in d.values() if v.get('logo'));print(f'logos after careers-board pass: {n}/{len(d)} ({100*n/len(d):.1f}%)')
if __name__=='__main__': second_pass()
def write_map():
    import hashlib,collections
    d=json.load(open(os.path.join(D,'logos.json')));h=collections.defaultdict(list)
    for c,v in d.items():
        if v.get('logo') and os.path.exists(os.path.join(R,v['logo'])): h[hashlib.md5(open(os.path.join(R,v['logo']),'rb').read()).hexdigest()].append(c)
    for cs in h.values():  # one image shared by unrelated companies = a generic placeholder (default site/board icon), not a logo
        if len(cs)>=3 and len({c.lower().replace('the ','').split()[0] for c in cs})>1:
            for c in cs: d[c]={k:v for k,v in d[c].items() if k not in('logo','src')}|{'why':'generic placeholder icon'}
    def invisible(f):  # white/very light artwork on a transparent background disappears on our white tile
        im=Image.open(f).convert('RGBA');px=[(r,g,b) for r,g,b,a in im.getdata() if a>128 and not (r>245 and g>245 and b>245 and a<255)]
        dark=sum(1 for r,g,b in px if (r*299+g*587+b*114)/1000<215);return dark<0.02*im.width*im.height
    for c,v in list(d.items()):
        if v.get('logo') and os.path.exists(os.path.join(R,v['logo'])) and invisible(os.path.join(R,v['logo'])): d[c]={k:x for k,x in v.items() if k not in('logo','src')}|{'why':'too light to see on white'}
    for c in json.load(open(os.path.join(R,'pipeline','logo_overrides.json'))).get('reject',[]):
        if c in d: d[c]={k:v for k,v in d[c].items() if k not in('logo','src')}|{'why':'rejected on manual review'}
    json.dump(d,open(os.path.join(D,'logos.json'),'w'),indent=0,sort_keys=True)
    m={c:v['logo'].split('/')[-1] for c,v in d.items() if v.get('logo') and os.path.exists(os.path.join(R,v['logo']))}
    json.dump(m,open(os.path.join(D,'logo-map.json'),'w'),separators=(',',':'),ensure_ascii=False,sort_keys=True)
if __name__=='__main__': write_map()
