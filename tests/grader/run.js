// V13.3 §7d-e + 7g: 50-persona grader run. Exit 1 on any outlier, monotonic break, tier-1 A without a standout profile,
// nondeterminism, missing-data grade drop, or honest-feedback failure.
// Usage: node tests/grader/run.js [--core path/to/match-core.js] [--weights path] [--config path] [--json out.json] [--samples]
const fs=require('fs'),path=require('path');const R=path.join(__dirname,'../..');const arg=k=>{const i=process.argv.indexOf(k);return i>0?process.argv[i+1]:null};
global.self=global;require(path.resolve(arg('--core')||path.join(R,'match-core.js')));const MC=global.MatchCore;
const C=JSON.parse(fs.readFileSync(arg('--config')||path.join(R,'config.json')));C.schoolTiers=JSON.parse(fs.readFileSync(path.join(R,'data/school_tiers.json')));
const W=JSON.parse(fs.readFileSync(arg('--weights')||path.join(R,'match-weights.json')));
const P=JSON.parse(fs.readFileSync(path.join(__dirname,'personas.json'))),Ls=JSON.parse(fs.readFileSync(path.join(__dirname,'listings.json'))),E=JSON.parse(fs.readFileSync(path.join(__dirname,'expected.json'))).pairs;
const LX=Object.fromEntries(Ls.map(x=>[x.id,{...x,industry:x.category}]));const STEP='ABCDF';const letter=g=>g&&g!=='—'?g[0]:null;
const clone=o=>JSON.parse(JSON.stringify(o));
const sc=(pr,x)=>MC.score(x,MC.profile(pr),C,W);
const rk=r=>r.pct==null?-1:r.pct;
let inb=0,out=[],mono=[],t1=[],det=[],miss=[],fb=[],ung=0,n=0;const rows=[];
const relIntern=p=>({kind:'Internship',title:{finance:'Investment Banking Summer Analyst',quant:'Quantitative Research Intern',swe:'Software Engineer Intern',data:'Data Analyst Intern',acct:'Audit Intern',mkt:'Marketing Intern',ops:'Operations Intern',design:'Design Intern',eng:'Engineering Intern'}[p._meta.field],org:'Regional Firm',start:'2025-06',end:'2025-08',bullets:['Built analyses for the team']});
const LINK_OK=/^https:\/\/(www\.)?(wallstreetprep\.com\/free-resources|freecodecamp\.org|leetcode\.com\/problemset|naceweb\.org)/;
const FILLER=/\b(great fit|perfect match|you('|’)ve got this|keep up the good work|stand out from the crowd|unlock your potential|dream job|go for it)\b/i;
for(const e of E){const pr=P[e.persona],x=LX[e.listing];n++;const r=sc(pr,x);const g=letter(r.grade);
 if(r.pct==null){ung++;out.push({...e,got:'ungraded'});continue}
 const d=Math.min(...[...e.band].map(b=>Math.abs(STEP.indexOf(b)-STEP.indexOf(g))));if(d===0)inb++;if(d>=2)out.push({...e,got:r.grade,pct:r.pct});
 rows.push({...e,got:r.grade,pct:r.pct,tag:r.tag?r.tag.k:null});
 // determinism
 const r2=sc(pr,x);if(r2.pct!==r.pct||r2.grade!==r.grade)det.push(e);
 // monotonic: better GPA / school / one more relevant internship never lower; harder tier never higher
 const ch=[['gpa+0.3',q=>{q.gpa=String(Math.min(4,+q.gpa+0.3))}],['elite school',q=>{q.school='Harvard University'}],['+internship',q=>{q.experience=[relIntern(q),...q.experience]}]];
 for(const [k,f] of ch){const q=clone(pr);f(q);const r3=sc(q,x);if(r3.pct!=null&&r3.pct<r.pct)mono.push({...e,change:k,from:r.pct,to:r3.pct})}
 if(MC.tierOf){const ti=MC.tierOf(x,C);if(ti&&ti.t>1){const C2=clone(C);C2.companyTiers={...(C.companyTiers||{}),firms:[{firm:x.company,tier:ti.t-1,why:'test: one tier harder'},...((C.companyTiers||{}).firms||[])]};const r4=MC.score(x,MC.profile(pr),C2,W);if(r4.pct>r.pct)mono.push({...e,change:'harder tier',from:r.pct,to:r4.pct})}}
 // tier-1 A only for a standout (elite/strong school or GPA>=3.7, AND a relevant internship)
 if(x._tier===1&&g==='A'){const m=pr._meta;if(!((['elite','strong'].includes(m.schoolTier)||+pr.gpa>=3.7)&&m.internships>=1))t1.push({...e,got:r.grade})}
 // missing data: dropping GPA lowers confidence, not the grade below a 3.0 GPA's grade
 {const q=clone(pr);delete q.gpa;const a=sc(q,x),q2=clone(pr);q2.gpa='3.0';const b=sc(q2,x);if(a.pct!=null&&b.pct!=null&&a.pct<b.pct-1)miss.push({...e,noGpa:a.pct,gpa30:b.pct})}
 // 7g honest feedback
 if(MC.tierOf){const f=r.feedback||{},v=f.verdict||{},tg=r.tag,bad=[];
  if(!tg)bad.push('no tag');else{if(tg.k==='realistic'&&r.pct<70)bad.push('Realistic below B-');if(tg.k!=='long'&&r.pct<55)bad.push('not Long shot at '+r.grade);if(!tg.why||tg.why.length>110)bad.push('tag reason missing/too long');if(x._tier===1&&tg.k==='realistic'&&g!=='A'&&g!=='B')bad.push('tier-1 Realistic at '+r.grade)}
  if(v.k==='strong'&&/^[CDF]/.test(r.grade))bad.push('Strong shot at '+r.grade);if(v.k==='worth'&&/^[DF]/.test(r.grade))bad.push('Worth applying at '+r.grade);
  const txt=[...(f.strengths||[]),...(f.gaps||[]),...(f.actions||[]),v.why||'',tg?tg.why:'',...((f.resources||[]).map(z=>z.t))].join(' | ');if(FILLER.test(txt))bad.push('generic filler');
  for(const z of f.resources||[])if(!LINK_OK.test(z.u))bad.push('unlisted link '+z.u);
  if(!(f.actions||[]).length)bad.push('no action');if(f.tier==null)bad.push('no tier label');
  if(bad.length)fb.push({...e,got:r.grade,bad})}}
const acc=Math.round(1000*inb/n)/10;
const res={pairs:n,inBand:inb,accuracy:acc,outliers:out.length,ungraded:ung,monotonicBreaks:mono.length,tier1NonStandoutA:t1.length,nondeterministic:det.length,missingDataDrops:miss.length,feedbackChecked:MC.tierOf?n-ung:0,feedbackFailures:fb.length};
console.log(JSON.stringify(res));
const show=(k,a)=>{if(a.length){console.log(k+':');a.slice(0,12).forEach(z=>console.log('  '+JSON.stringify(z)))}};show('outliers',out);show('monotonic',mono);show('tier1 A',t1);show('nondeterministic',det);show('missing data',miss);show('feedback',fb);
if(arg('--json'))fs.writeFileSync(arg('--json'),JSON.stringify({res,rows,out,mono,t1,fb,miss},null,1));
const ok=acc>=90&&!out.length&&!mono.length&&!t1.length&&!det.length&&!miss.length&&!fb.length;if(!ok)process.exitCode=1;
