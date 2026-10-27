"""Collect public user reports (GitHub issues) into data/reports.json and data/missing.json.
Issues are opened by students from the site: '[listing-report:closed] ...' and '[missing-company] ...'.
3+ distinct reporters of 'closed' auto-hide a listing on the next sync until it is re-verified."""
import os,re,json,requests
REPO=os.environ.get('GITHUB_REPOSITORY','tyfaucher24-ops/internship-radar');D=os.path.join(os.path.dirname(__file__),'..','data')
def issues(label):
    h={'Accept':'application/vnd.github+json'};t=os.environ.get('GITHUB_TOKEN')
    if t: h['Authorization']='Bearer '+t
    out=[];page=1
    while page<=10:
        r=requests.get(f'https://api.github.com/repos/{REPO}/issues',params={'labels':label,'state':'all','per_page':100,'page':page},headers=h,timeout=30)
        if r.status_code!=200: print('issues',label,r.status_code);break
        j=r.json();out+=j
        if len(j)<100: break
        page+=1
    return out
def site_reports():
    """V16.5: in-site reports from Supabase (public, aggregated report_counts(); publishable key only, never service_role)."""
    try:
        c=open(os.path.join(os.path.dirname(__file__),'..','cloud-config.js')).read()
        url=re.search(r"url:'([^']+)'",c).group(1);key=re.search(r"anonKey:'([^']+)'",c).group(1)
        r=requests.post(url+'/rest/v1/rpc/report_counts',headers={'apikey':key,'content-type':'application/json'},json={},timeout=30)
        if r.status_code!=200: print('site reports',r.status_code);return []
        return r.json()
    except Exception as e: print('site reports skipped',e);return []
def main():
    rep={}
    for i in issues('listing-report'):
        m=re.search(r'Listing id:\s*(\S+)',i.get('body') or '');t=re.search(r'\[listing-report:(\w+)\]',i['title'])
        if not m or not t: continue
        e=rep.setdefault(m.group(1),{'closed_by':[],'wrong':0,'broken':0,'issues':[]})
        if t.group(1)=='closed' and i['state']=='open': e['closed_by'].append(i['user']['login'])
        elif t.group(1) in ('wrong','broken'): e[t.group(1)]+=1
        e['issues'].append(i['html_url'])
    for x in site_reports():
        e=rep.setdefault(str(x.get('listing_id')),{'closed_by':[],'wrong':0,'broken':0,'issues':[]});n=int(x.get('reporters') or 0)
        if x.get('kind')=='closed': e['closed_by']+=[f'site-{i}' for i in range(n)]
        elif x.get('kind') in ('wrong','broken'): e[x['kind']]+=n
        e['site']=True
    for e in rep.values(): e['closed_by']=sorted(set(e['closed_by']))
    miss=[{'company':re.sub(r'^\[missing-company\]\s*','',i['title']),'body':i.get('body') or '','url':i['html_url'],'state':i['state'],'at':i['created_at']} for i in issues('missing-company')]
    json.dump(rep,open(os.path.join(D,'reports.json'),'w'),indent=0);json.dump(miss,open(os.path.join(D,'missing.json'),'w'),indent=0)
    print('reports',len(rep),'missing',len(miss))
if __name__=='__main__': main()
