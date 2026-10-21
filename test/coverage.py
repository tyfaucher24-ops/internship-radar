"""V9 coverage audit: for a fixed list of large/well-known intern employers, is the company in our registry and how many open listings do we show?
Writes data/coverage.json and ops/COVERAGE.md. Status reasons for gaps come from ops notes (BLOCKED)."""
import json,os,csv,re,sys
R=os.path.join(os.path.dirname(__file__),'..');D=os.path.join(R,'data')
FIRMS="""Citadel;Citadel Securities;Morgan Stanley;Evercore;Blackstone;Two Sigma;Google;Goldman Sachs;JPMorgan Chase;Bank of America;Citi;Wells Fargo;Barclays;UBS;Deutsche Bank;BNP Paribas;RBC;BMO;TD Securities;Jefferies;Lazard;Centerview Partners;PJT Partners;Moelis;Perella Weinberg;Guggenheim;Houlihan Lokey;William Blair;Piper Sandler;Raymond James;Stifel;KKR;Carlyle;Apollo;TPG;Bain Capital;Warburg Pincus;BlackRock;Vanguard;Fidelity;State Street;PIMCO;Wellington;T. Rowe Price;Bridgewater;Millennium;Point72;D. E. Shaw;Jane Street;Hudson River Trading;Jump Trading;Optiver;IMC;DRW;Susquehanna International Group (SIG);Akuna Capital;Virtu;Tower Research;Five Rings;McKinsey;Boston Consulting Group;Bain & Company;Deloitte;PwC;EY;KPMG;Accenture;Oliver Wyman;Booz Allen Hamilton;Microsoft;Amazon;Apple;Meta;NVIDIA;Netflix;Salesforce;Adobe;Oracle;IBM;Intel;AMD;Qualcomm;Cisco;Tesla;SpaceX;Stripe;Palantir;Databricks;OpenAI;Anthropic;Uber;Airbnb;Snowflake;ServiceNow;Workday;Intuit;PayPal;Capital One;American Express;Visa;Mastercard;Lockheed Martin;Northrop Grumman;RTX;Boeing;General Dynamics;GE Aerospace;Honeywell;Caterpillar;Deere;3M;Johnson & Johnson;Pfizer;Merck;AbbVie;Eli Lilly;Procter & Gamble;PepsiCo;Coca-Cola;Unilever;L'Oreal;Nike;Disney;Comcast;Verizon;AT&T;T-Mobile;Walmart;Target;Home Depot;Ford;General Motors;Toyota;ExxonMobil;Chevron;Mayo Clinic;Cleveland Clinic;Kaiser Permanente;HCA Healthcare;UnitedHealth Group;CVS Health""".split(';')
WHY={'Citadel':'Careers site sits behind a Cloudflare bot challenge; not read','Citadel Securities':'Careers site sits behind a Cloudflare bot challenge; not read',
 'Google':"robots.txt disallows /about/careers/applications/jobs/results",'Evercore':'Board read; at audit time it listed only coffee chats/open houses (events, not jobs)'}
def k(s): return re.sub(r'[^a-z0-9]','',s.lower().replace('&','and'))
def main():
    reg=list(csv.DictReader(open(os.path.join(D,'companies.csv'))))
    L=[x for x in json.load(open(os.path.join(D,'listings.json')))['listings'] if x.get('status')=='open' and not x.get('hidden')]
    rk={};[rk.setdefault(k(r['name']),[]).append(r['ats']) for r in reg]
    rows=[]
    for f in FIRMS:
        fk=k(f.split(' (')[0])
        n=sum(1 for x in L if k(x['company']).startswith(fk) or fk.startswith(k(x['company'])) and len(k(x['company']))>=5)
        ats=sorted({a for kk,v in rk.items() if kk.startswith(fk) for a in v})
        st='covered' if n else ('in registry, 0 open now' if ats else 'not in registry')
        rows.append({'firm':f,'registry':','.join(ats),'open':n,'status':st,'note':WHY.get(f,'')})
    json.dump(rows,open(os.path.join(D,'coverage.json'),'w'),indent=1)
    md=['# Coverage audit (V9)','',f'{len(FIRMS)} large, well-known intern employers. "Open" = open listings shown on the site right now.','','| Employer | Source | Open | Status | Note |','|---|---|---:|---|---|']
    md+=[f"| {r['firm']} | {r['registry'] or '-'} | {r['open']} | {r['status']} | {r['note']} |" for r in rows]
    c={};[c.__setitem__(r['status'],c.get(r['status'],0)+1) for r in rows]
    md+=['',f'Summary: {c}']
    open(os.path.join(R,'ops','COVERAGE.md'),'w').write('\n'.join(md)+'\n');print(c)
if __name__=='__main__': main()
