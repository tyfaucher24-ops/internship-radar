"""V16.3 dead-link rate on LIVE open listings. Same method before and after a fix:
fixed seed, 300 open listings drawn from the live site's data/listings.json, each apply link opened with
pipeline.sync.verify_link (robots.txt + per-host rate limits via pipeline/net.py). Rate = dead / (live+dead)."""
import json,random,sys,datetime,urllib.request,concurrent.futures as cf,os
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..'))
from pipeline.sync import verify_link
URL='https://tyfaucher24-ops.github.io/internship-radar/data/listings.json'
def main(label,n=300,seed=163):
    L=json.load(urllib.request.urlopen(URL,timeout=60))['listings']
    op=sorted([r for r in L if r.get('status')=='open' and not r.get('hidden') and (r.get('apply_link') or r.get('apply_url'))],key=lambda r:r['id'])
    S=random.Random(seed).sample(op,min(n,len(op)))
    with cf.ThreadPoolExecutor(12) as ex: res=list(ex.map(lambda r:verify_link(r.get('apply_link') or r.get('apply_url')),S))
    dead=[{'id':r['id'],'company':r['company'],'url':r.get('apply_link') or r.get('apply_url'),'source_type':r.get('source_type')} for r,o in zip(S,res) if o is False]
    live=sum(1 for o in res if o is True);unk=sum(1 for o in res if o is None)
    out={'label':label,'at':datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),'open_on_site':len(op),'sampled':len(S),'live':live,'dead':len(dead),'unknown':unk,'dead_rate':round(len(dead)/max(1,live+len(dead)),4),'dead_items':dead}
    json.dump(out,open(f'ops/qa/v16.3/deadlinks-{label}.json','w'),indent=1);print({k:v for k,v in out.items() if k!='dead_items'})
if __name__=='__main__': main(sys.argv[1] if len(sys.argv)>1 else 'sample')
