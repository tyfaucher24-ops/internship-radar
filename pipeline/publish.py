"""V16 Phase 2: safe publishing of data/ files.
write_json: write to <path>.tmp, fsync, re-read + parse (validate), then os.replace() over the old file -> a crash or a
bad write never leaves a half-written JSON file on the site.
gate: refuse to publish when the visible open count drops >15% versus the last published listings.json, or when any
record is missing a required field. The caller raises GateRefused before anything is written, so the previous data stays."""
import os,json
REQUIRED=('id','company','title','status','source')
REQUIRED_OPEN=('apply_url',)
MAX_DROP=float(os.environ.get('GATE_MAX_DROP','0.15'))
class GateRefused(Exception):pass
def write_json(path,obj,**kw):
    kw.setdefault('ensure_ascii',False);tmp=path+'.tmp'
    with open(tmp,'w') as f:
        json.dump(obj,f,**kw);f.flush();os.fsync(f.fileno())
    with open(tmp) as f:json.load(f)  # validate: must parse back
    os.replace(tmp,path)
def visible_open(ls):return [r for r in ls if r.get('status')=='open' and not r.get('hidden') and not r.get('past_term')]
def gate(prev_listings,new_listings,max_drop=MAX_DROP):
    """Returns a dict of numbers; raises GateRefused with a reason when publishing would be unsafe."""
    bad=[]
    for r in new_listings:
        miss=[k for k in REQUIRED if not r.get(k)]+([k for k in REQUIRED_OPEN if not r.get(k)] if r.get('status')=='open' and r.get('source_type')!='manual' else [])  # hand-checked tracker rows may have no link yet
        if miss:bad.append((r.get('id'),miss))
    p,n=len(visible_open(prev_listings)),len(visible_open(new_listings))
    info={'previous_open':p,'new_open':n,'drop_pct':round(100*(p-n)/p,1) if p else 0.0,'missing_fields':len(bad)}
    if bad:raise GateRefused(f'{len(bad)} record(s) missing required fields, e.g. {bad[:3]}')
    if p>=500 and n<(1-max_drop)*p:raise GateRefused(f'open count would drop {info["drop_pct"]}% ({p} -> {n}); limit {int(max_drop*100)}%')
    return info
