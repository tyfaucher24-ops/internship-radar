"""V21 Part 3: build the probe seed files in pipeline/seeds/ from free public lists (run by hand; output is checked in).
Each output line: name|industry|domain  (domain may be empty). Sources are named in each file's header.
  - Wikipedia list articles (/wiki/<Title>, robots-allowed; company names from the list tables)
  - Y Combinator company directory via the public yc-oss API (https://yc-oss.github.io/api/companies/all.json): hiring, active, US region
Sector files are cut from the same sources (S&P 500 GICS sector, YC industry) plus sector-specific Wikipedia lists."""
import re,os,sys,json,html,urllib.parse,collections
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..','..'))
from pipeline.net import fetch
OUT=os.path.dirname(os.path.abspath(__file__))
COLS=r'security|company|name|firm|team|organization|institution|university|network|agency|corporation|newspaper|channel'
def wiki_rows(title,col_pat=COLS,max_tables=6):
    h=fetch('https://en.wikipedia.org/wiki/'+title,timeout=30).text;out=[]
    for tb in re.findall(r'<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>(.*?)</table>',h,re.S)[:max_tables]:
        rows=re.findall(r'<tr[^>]*>(.*?)</tr>',tb,re.S)
        if not rows: continue
        hdr=[re.sub(r'<[^>]+>','',c).strip().lower() for c in re.findall(r'<th[^>]*>(.*?)</th>',rows[0],re.S)]
        ci=next((i for i,c in enumerate(hdr) if re.search(col_pat,c)),0)
        for r in rows[1:]:
            cells=re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>',r,re.S)
            if len(cells)<=ci: continue
            c=cells[ci];m=re.search(r'<a [^>]*title="([^"]+)"[^>]*>(.*?)</a>',c,re.S)
            name=html.unescape(re.sub(r'<[^>]+>','',m.group(2) if m else c)).strip()
            name=re.sub(r'\[.*?\]','',name).strip()
            if re.search(r'\$|^Total\b|annum|^\d|^Rank$|^Revenue',name): continue
            if 2<len(name)<70: out.append((name,[html.unescape(re.sub(r'<[^>]+>','',x)).strip() for x in cells]))
    return out
def write(fn,src,rows):
    seen=set();lines=[]
    for n,ind,dom in rows:
        k=re.sub(r'[^a-z0-9]','',n.lower())
        if k and k not in seen: seen.add(k);lines.append(f'{n}|{ind}|{dom}')
    open(os.path.join(OUT,fn),'w').write(f'# V21 probe seed. Source: {src}\n# name|industry|domain. Only boards that answer with real jobs are added to the registry.\n'+'\n'.join(lines)+'\n')
    print(fn,len(lines))
def main():
    sp=wiki_rows('List_of_S%26P_500_companies',r'security',1)
    SP=[(n,c[2] if len(c)>2 else '','') for n,c in sp]
    write('sp500.txt','Wikipedia "List of S&P 500 companies" (en.wikipedia.org/wiki/List_of_S%26P_500_companies)',SP)
    f5=wiki_rows('List_of_largest_companies_in_the_United_States_by_revenue',r'^name$|company')
    write('fortune_us_largest.txt','Wikipedia "List of largest companies in the United States by revenue" (Fortune 500 based)',[(n,'','') for n,_ in f5])
    yc=json.loads(fetch('https://yc-oss.github.io/api/companies/all.json',timeout=60).text)
    YC=[(x['name'],x.get('industry') or '',urllib.parse.urlsplit(x.get('website') or '').netloc.replace('www.','')) for x in yc
        if x.get('isHiring') and x.get('status')=='Active' and 'United States of America' in ' '.join(x.get('regions') or [])]
    write('yc_hiring_us.txt','Y Combinator directory via yc-oss public API (yc-oss.github.io/api/companies/all.json): active, hiring, US region',YC)
    by=collections.defaultdict(list)
    G={'Financials':'finance','Information Technology':'tech','Health Care':'healthcare','Energy':'energy','Utilities':'energy','Industrials':'manufacturing','Materials':'manufacturing',
       'Consumer Discretionary':'retail','Consumer Staples':'retail','Communication Services':'media'}
    for n,ind,d in SP:
        if ind in G: by[G[ind]].append((n,ind,d))
    Y={'Fintech':'finance','B2B':'tech','Healthcare':'healthcare','Education':'education','Industrials':'manufacturing','Consumer':'retail','Government':'government'}
    for n,ind,d in YC:
        if ind in Y: by[Y[ind]].append((n,ind,d))
    for t,sec,pat in [('List_of_largest_law_firms_by_revenue','law',r'firm'),('List_of_largest_United_States-based_law_firms_by_head_count','law',r'firm'),
                      ('List_of_management_consulting_firms','consulting',COLS),('Big_Four_accounting_firms','consulting',COLS),
                      ('List_of_professional_sports_teams_in_the_United_States_and_Canada','sports',r'team'),
                      ('List_of_biotechnology_companies','biotech',COLS),('List_of_United_States_cable_and_satellite_television_networks','media',COLS),
                      ('List_of_largest_universities_and_university_networks_by_enrollment','education',r'institution|university'),
                      ('List_of_federal_agencies_in_the_United_States','government',COLS)]:
        try: by[sec]+=[(n,sec,'') for n,_ in wiki_rows(t,pat)]
        except Exception as e: print('skip',t,e)
    for n,ind,d in YC:
        pass
    nonprofit=[(x['name'],'Nonprofit',urllib.parse.urlsplit(x.get('website') or '').netloc.replace('www.','')) for x in yc if x.get('nonprofit') and x.get('status')=='Active']
    by['nonprofits']+=nonprofit
    for sec in ['finance','consulting','tech','healthcare','government','nonprofits','media','energy','manufacturing','retail','biotech','law','sports','education']:
        write(f'sector_{sec}.txt',f'sector sweep "{sec}": S&P 500 GICS sector rows + YC directory industry rows + sector Wikipedia lists (see build_seeds.py)',by[sec])
if __name__=='__main__': main()
