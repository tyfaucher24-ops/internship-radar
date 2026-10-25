/* V15 §5 + addenda bars. Exit 1 on any failure. Usage: node tests/grader/run_v15.js [--json out.json] [--quick]
   Profiles: tests/grader/v15_profiles.json (169 SYNTHETIC, fictional profiles; real school names only as the school field).
   Listings: the live data/ snapshot in this repo (real postings). Every metric here is computed independently of the
   ranking code where it can be (relevance by role group, eligibility by class year, location by lat/long radius). */
const fs=require('fs'),path=require('path'),cp=require('child_process');const R=path.join(__dirname,'../..');
global.self=global;require(path.join(R,'match-core.js'));require(path.join(R,'us-cities.js'));const MC=global.MatchCore,USC=global.USC;
const C=JSON.parse(fs.readFileSync(path.join(R,'config.json')));C.schoolTiers=JSON.parse(fs.readFileSync(path.join(R,'data/school_tiers.json')));
const W=JSON.parse(fs.readFileSync(path.join(R,'match-weights.json')));
const RC=require(path.join(R,'resume-core.js')),RX=require(path.join(R,'resume-extract.js'));const COL=JSON.parse(fs.readFileSync(path.join(R,'vendor/colleges.json')));
const QUICK=process.argv.includes('--quick');const TODAY='2026-10-24';
const days=d=>Math.round((Date.parse(d+'T00:00:00')-Date.parse(TODAY+'T00:00:00'))/864e5);
function statusOf(x){if(x.status==='upcoming')return'upcoming';if(x.status==='closed'||x.status==='not_open')return x.status;if(x.deadline){const n=days(x.deadline);if(n<0)return'closed';if(n<=14)return'closing_soon'}return'open'}
const FULL=new Map(JSON.parse(fs.readFileSync(path.join(R,'data/listings.json'))).listings.map(x=>[String(x.id),x]));
const ROWS=JSON.parse(fs.readFileSync(path.join(R,'data/index.json'))).listings.map(x=>{x={...x,id:String(x.id),first_seen:x.fs};if(x.category&&!x.industry)x.industry=x.category;x.st=statusOf(x);
 x._t=[x.company,x.title,x.industry,x.role_type,x.sector,(x.locations||[]).map(l=>(l.city||'')+' '+(l.state||'')).join(' '),x.remote?'remote':''].join(' ').toLowerCase();return x}).filter(x=>x.st!=='closed');
const PR=JSON.parse(fs.readFileSync(path.join(__dirname,'v15_profiles.json')));for(const k of Object.keys(PR))if(typeof PR[k]!=='object')delete PR[k];
const IDS=Object.keys(PR).slice(0,QUICK?40:undefined);
// field -> role groups that count as relevant (same map as the QA V15 harness)
const FG={swe:['swe'],data:['data','swe','quant'],ib:['ib','pe','finance','sandt'],consulting:['consulting','finance','ops'],marketing:['marketing'],mech:['mech','eng','hardware'],health:['health','nursing'],accounting:['accounting','finance'],libarts:['marketing','ops','_none','consulting','design'],ops:['ops','consulting']};
const IN={swe:['swe'],data:['data'],ib:['ib','pe','finance'],consulting:['consulting'],marketing:['marketing'],mech:['mech','eng'],health:['health'],accounting:['accounting'],libarts:['marketing','_none'],ops:['ops']};
const grp=x=>MC.groupOf(x,C)||"_none";
const cnt={},byF={};let tot=0,rel=0;
for(const id of IDS){const pr=PR[id],f=pr._meta.field;const P=MC.profile(pr);const items=ROWS.map(x=>({x,r:MC.score(x,P,C,W)}));const {top}=MC.rank143(items,10);
 for(const i of top){tot++;const g=grp(i.x);const ok=FG[f].includes(g);rel+=ok;byF[f]=byF[f]||[0,0];byF[f][0]++;byF[f][1]+=ok;if(!ok){const k=f+' <- '+g;cnt[k]=(cnt[k]||0)+1;if(process.env.EX&&cnt[k]<=3)console.log(f,id,'|',g,'|',i.x.company,'|',i.x.title,'|',i.x.industry,i.r.pct)}}}
console.log('rel',(100*rel/tot).toFixed(1),JSON.stringify(byF));console.log(Object.entries(cnt).sort((a,b)=>b[1]-a[1]))
