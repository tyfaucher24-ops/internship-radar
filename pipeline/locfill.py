"""Fill missing locations ONLY from explicit location statements in the posting itself (title or description),
e.g. "Primary City/State: Mesa, Arizona", "Location: Austin, TX", "(Charlotte, NC)". A value is kept only if it
parses to a real US city/state that geocodes. Nothing is inferred from the company. Unresolved → loc_label 'Remote/Unspecified'."""
from pipeline.publish import write_json  # V16 P2: atomic temp+validate+swap writes
import os,re,json,glob,sys
sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline.norm import parse_locations
D=os.path.join(os.path.dirname(__file__),'..','data')
PAT=re.compile(r'(?i:(?:primary\s+)?(?:work\s+|job\s+|office\s+)?(?:city\s*/\s*state|location(?:\(s\))?|located\s+in|based\s+in|work\s+site))\s*[:\-–]?\s*([A-Z][A-Za-z .\'-]{1,40},\s*(?:[A-Z]{2}\b|[A-Z][a-z]+(?:\s[A-Z][a-z]+)?))')
TPAT=re.compile(r'[(\-–|]\s*([A-Z][A-Za-z .\'-]{1,30},\s*[A-Z]{2})\b')
def main():
    P=os.path.join(D,'listings.json');J=json.load(open(P));L=J['listings']
    desc={}
    for f in glob.glob(os.path.join(D,'desc','*.json')): desc.update(json.load(open(f)))
    filled=lab=0
    for r in L:
        if r.get('locations'): r.pop('loc_label',None);continue
        cands=[m.group(1) for m in TPAT.finditer(r.get('title') or '')]+[m.group(1) for m in PAT.finditer((desc.get(r['id']) or '')[:4000])]
        got=[]
        for c in cands[:4]:
            locs,_,_=parse_locations([c])
            for l in locs:
                if l.get('lat') is not None and l not in got: got.append(l)
        if got: r['locations']=got[:5];r['loc_source']='posting text';r.pop('loc_label',None);filled+=1
        else: r['loc_label']='Remote' if r.get('remote') else 'Remote/Unspecified';lab+=1
    write_json(P,J,separators=(',',':'))
    print('locfill: filled',filled,'labelled',lab)
if __name__=='__main__': main()
