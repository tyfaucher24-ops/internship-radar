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
def main():
    rep={}
    for i in issues('listing-report'):
        m=re.search(r'Listing id:\s*(\S+)',i.get('body') or '');t=re.search(r'\[listing-report:(\w+)\]',i['title'])
        if not m or not t: continue
        e=rep.setdefault(m.group(1),{'closed_by':[],'wrong':0,'broken':0,'issues':[]})
        if t.group(1)=='closed' and i['state']=='open': e['closed_by'].append(i['user']['login'])
        elif t.group(1) in ('wrong','broken'): e[t.group(1)]+=1
        e['issues'].append(i['html_url'])
    for e in rep.values(): e['closed_by']=sorted(set(e['closed_by']))
    miss=[{'company':re.sub(r'^\[missing-company\]\s*','',i['title']),'body':i.get('body') or '','url':i['html_url'],'state':i['state'],'at':i['created_at']} for i in issues('missing-company')]
    json.dump(rep,open(os.path.join(D,'reports.json'),'w'),indent=0);json.dump(miss,open(os.path.join(D,'missing.json'),'w'),indent=0)
    print('reports',len(rep),'missing',len(miss))
if __name__=='__main__': main()
