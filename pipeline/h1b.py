"""V9: H-1B sponsorship history per employer from the official USCIS H-1B Employer Data Hub export.
Source file: https://www.uscis.gov/sites/default/files/document/data/h1b_datahubexport-2022.csv (FY2022, the latest complete-year file; the FY2023 file on that page holds only ~38k initial approvals, i.e. a partial year, so it is not used).
Only exact normalized-name matches are kept; no fuzzy guessing. Writes data/h1b.json."""
import csv,json,re,os,collections
from .norm import nkey
D=os.path.join(os.path.dirname(__file__),'..','data')
SUF=r'(,|\.)?\s+(inc|incorporated|llc|l\s?l\s?c|corp|corporation|co|company|ltd|limited|plc|lp|l\s?p|llp|na|n\s?a|us|usa|america|americas|group|holdings|the)\.?$'
def ck(s):
    s=(s or '').lower().replace('&',' and ');s=re.sub(r'^the\s+','',s)
    for _ in range(4): s=re.sub(SUF,'',s.strip())
    return nkey(s)
def main(src=os.path.join(D,'sources','uscis_h1b_employer_fy2022.csv'),fy=2022):
    names={r['name'] for r in csv.DictReader(open(os.path.join(D,'companies.csv')))}
    L=json.load(open(os.path.join(D,'listings.json')))['listings'];names|={x['company'] for x in L}
    want={ck(n):n for n in names if ck(n)}
    agg=collections.defaultdict(lambda:[0,0])
    for r in csv.DictReader(open(src,encoding='utf-8-sig')):
        k=ck(r['Employer'])
        if k in want:
            a=agg[want[k]];a[0]+=int(r['Initial Approval'] or 0);a[1]+=int(r['Continuing Approval'] or 0)
    out={'source':'USCIS H-1B Employer Data Hub','source_url':'https://www.uscis.gov/tools/reports-and-studies/h-1b-employer-data-hub','fiscal_year':fy,
         'note':'Approved petitions filed by an employer with exactly this name. Past sponsorship does not guarantee an internship-to-full-time sponsorship.',
         'employers':{n:{'new':a[0],'cont':a[1]} for n,a in sorted(agg.items()) if a[0]+a[1]>0}}
    json.dump(out,open(os.path.join(D,'h1b.json'),'w'),separators=(',',':'))
    print('h1b employers matched',len(out['employers']),'of',len(want))
if __name__=='__main__': main()
