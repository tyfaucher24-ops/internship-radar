"""V18 Part 5: static company + category pages with JobPosting JSON-LD.
Only real fields are used: title, company, first-seen date, stated deadline, locations, the
verified apply link and the posting's own description text. A listing with no description
gets no JSON-LD (Google requires one); it is still listed on the page as plain text.
Written to data/seo/ so every sync run refreshes them (data/ ships with each deploy)."""
import json,os,re,html,glob,datetime
BASE='https://tyfaucher24-ops.github.io/internship-radar/'
def slug(s): return re.sub(r'[^a-z0-9]+','-',(s or '').lower()).strip('-')[:60] or 'x'
def is_open(r): return r.get('status')=='open' and not r.get('hidden') and not r.get('check_unknown') and not r.get('past_term') and not r.get('dup_of')
def jobposting(r,desc):
    if not desc: return None
    j={'@context':'https://schema.org','@type':'JobPosting','title':r['title'],'description':html.escape(desc[:1200]),
       'datePosted':(r.get('posted') or r.get('first_seen') or '')[:10],'employmentType':'INTERN',
       'hiringOrganization':{'@type':'Organization','name':r['company']}}
    if r.get('deadline'): j['validThrough']=r['deadline']
    locs=[l for l in r.get('locations') or [] if l.get('city') or l.get('state')]
    if locs: j['jobLocation']=[{'@type':'Place','address':{'@type':'PostalAddress','addressLocality':l.get('city') or '','addressRegion':l.get('state') or '','addressCountry':'US'}} for l in locs[:5]]
    if r.get('remote'): j['jobLocationType']='TELECOMMUTE';j.setdefault('applicantLocationRequirements',{'@type':'Country','name':'US'})
    if not locs and not r.get('remote'): return None
    u=r.get('apply_link') or r.get('apply_url')
    if u: j['url']=u;j['directApply']=r.get('apply_kind')=='direct'
    if not j['datePosted']: return None
    return j
CSS='body{font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;margin:0;background:#f6f7fb;color:#14172b}main{max-width:820px;margin:0 auto;padding:24px 16px}a{color:#4b3cc9}h1{font-size:28px;margin:8px 0}li{background:#fff;border:1px solid #e3e6ef;border-radius:10px;padding:12px 14px;margin:8px 0;list-style:none}ul{padding:0}.m{color:#4b5168;font-size:13px}@media(prefers-color-scheme:dark){body{background:#1a1f26;color:#f3f5f7}li{background:#232a33;border-color:#2c3440}.m{color:#aab3bf}a{color:#cfc7ff}}'
def page(title,h1,intro,rows,DS,canon,ld_on=True):
    items=[];ld=[]
    for r in rows:
        loc='; '.join(', '.join(x for x in (l.get('city'),l.get('state')) if x) for l in (r.get('locations') or [])[:3]) or ('Remote' if r.get('remote') else '')
        u=r.get('apply_link') or r.get('apply_url') or ''
        meta=' · '.join(x for x in (r['company'],loc,('Apply by '+r['deadline']) if r.get('deadline') else '') if x)
        a=f'<a href="{html.escape(u)}" rel="nofollow noopener">{html.escape(r["title"])}</a>' if u.startswith('http') else html.escape(r['title'])
        items.append(f'<li>{a}<div class="m">{html.escape(meta)}</div></li>')
        j=jobposting(r,DS.get(r['id'])) if ld_on else None
        if j: ld.append(j)
    lds=''.join('<script type="application/ld+json">'+json.dumps(j,ensure_ascii=False).replace('</','<\\/')+'</script>' for j in ld)
    t=html.escape(title)
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{t}</title><meta name="description" content="{html.escape(intro)}"><link rel="canonical" href="{BASE}{canon}"><meta property="og:title" content="{t}"><meta property="og:description" content="{html.escape(intro)}"><meta property="og:image" content="{BASE}assets/og-share.png"><meta name="twitter:card" content="summary_large_image"><style>{CSS}</style>{lds}</head><body><main><p><a href="../../../">← Intern Index</a></p><h1>{html.escape(h1)}</h1><p class="m">{html.escape(intro)}</p><ul>{"".join(items)}</ul><p class="m">Every link was checked by Intern Index. Search, filter and track all of these on <a href="../../../#db">Intern Index</a>.</p></main></body></html>'''
def build(D,L,DS):
    out=os.path.join(D,'seo');os.makedirs(os.path.join(out,'company'),exist_ok=True);os.makedirs(os.path.join(out,'category'),exist_ok=True)
    for f in glob.glob(os.path.join(out,'*','*.html')): os.remove(f)
    op=[r for r in L if is_open(r)];op.sort(key=lambda r:r.get('first_seen') or '',reverse=True)
    byc={};byk={}
    for r in op:
        byc.setdefault(r['company'],[]).append(r)
        if r.get('category') and r['category']!='Other': byk.setdefault(r['category'],[]).append(r)
    urls=[];today=datetime.date.today().isoformat();used=set()
    for c,rows in byc.items():
        s=slug(c)
        while s in used: s+='-x'
        used.add(s);p=f'data/seo/company/{s}.html'
        open(os.path.join(out,'company',s+'.html'),'w').write(page(f'{c} internships ({len(rows)} open) | Intern Index',f'{c} internships',f'{len(rows)} open {c} internship{"s" if len(rows)!=1 else ""}, each link checked by Intern Index.',rows,DS,p));urls.append(p)
    cats=[]
    for k,rows in sorted(byk.items()):
        s=slug(k);p=f'data/seo/category/{s}.html';cats.append((k,s,len(rows)))
        open(os.path.join(out,'category',s+'.html'),'w').write(page(f'{k} internships ({len(rows)} open) | Intern Index',f'{k} internships',f'{len(rows)} open {k} internships in the US, newest first.',rows[:300],DS,p,False));urls.append(p)
    idx='<ul>'+''.join(f'<li><a href="category/{s}.html">{html.escape(k)}</a> <span class="m">{n} open</span></li>' for k,s,n in cats)+'</ul><h2>Companies</h2><ul>'+''.join(f'<li><a href="company/{slug(c)}.html">{html.escape(c)}</a> <span class="m">{len(r)} open</span></li>' for c,r in sorted(byc.items(),key=lambda t:-len(t[1]))[:400])+'</ul>'
    open(os.path.join(out,'index.html'),'w').write(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Internships by category and company | Intern Index</title><link rel="canonical" href="{BASE}data/seo/index.html"><style>{CSS}</style></head><body><main><p><a href="../../">← Intern Index</a></p><h1>Browse internships</h1>{idx}</main></body></html>')
    urls.append('data/seo/index.html')
    open(os.path.join(out,'sitemap.xml'),'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{BASE}{u}</loc><lastmod>{today}</lastmod></url>' for u in urls)+'</urlset>')
    return len(byc),len(byk)
if __name__=='__main__':
    D=os.path.join(os.path.dirname(__file__),'..','data');L=json.load(open(os.path.join(D,'listings.json')))['listings'];DS={}
    for f in glob.glob(os.path.join(D,'desc','*.json')): DS.update(json.load(open(f)))
    print(build(D,L,DS))
