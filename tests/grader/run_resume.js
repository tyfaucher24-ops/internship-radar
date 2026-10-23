/* V14.3 §5 grading checks. Exit 1 on any failure.
   1) 50 V13.3 personas: in-band >= 91.8% (runs tests/grader/run.js).
   2) 20 resume + posting pairs: 20 synthetic fixture resumes (tests/resume-fixtures f01-f20, TXT) parsed by the website's
      resume-core.js, each paired with its best-ranked posting. Checks: graded, quotes come from the resume and the posting
      (never invented), at most 3 positive and 3 negative factors, next steps present, Not-eligible has an exact reason,
      deterministic, missing GPA lowers confidence not the grade.
   3) Monotonicity across the 20 resumes x 34 postings: +0.3 GPA, +1 posting skill, +1 related internship never lower the score.
   4) Harsh and varied: at least 4 letter grades used, A grades <= 15%.
   Fixtures without a TXT are read from DOCX with mammoth (NODE_PATH must include mammoth 1.8.0).
   Usage: NODE_PATH=... node tests/grader/run_resume.js [--json out.json] */
const fs=require('fs'),path=require('path'),cp=require('child_process');const R=path.join(__dirname,'../..');
global.self=global;require(path.join(R,'match-core.js'));const MC=global.MatchCore;
const RC=require(path.join(R,'resume-core.js')),RX=require(path.join(R,'resume-extract.js'));const COL=JSON.parse(fs.readFileSync(path.join(R,'vendor/colleges.json')));
const C=JSON.parse(fs.readFileSync(path.join(R,'config.json')));C.schoolTiers=JSON.parse(fs.readFileSync(path.join(R,'data/school_tiers.json')));
const W=JSON.parse(fs.readFileSync(path.join(R,'match-weights.json')));
const LS=JSON.parse(fs.readFileSync(path.join(__dirname,'listings.json'))).map(x=>({...x,industry:x.category}));
const fail=[];const F=(k,m)=>fail.push(k+': '+m);
// 1) personas
const out=cp.spawnSync(process.execPath,[path.join(__dirname,'run.js')],{encoding:'utf8'}).stdout;const base=JSON.parse(out.split('\n')[0]);
if(base.accuracy<91.8)F('personas','in-band '+base.accuracy+'% < 91.8%');
// resume -> profile, confirmed fields only (what the review screen would fill)
const n=s=>String(s||'').toLowerCase().replace(/[^a-z0-9.]+/g,' ').trim();
function prof(Rs){const e=Rs.education[0]||{};const wa=(Rs.workAuth&&Rs.workAuth.value)||'';
 return{savedAt:1,school:e.school||'',major:(e.majors||[])[0]||'',minor:(e.minors||[])[0]||'',gpa:e.gpa&&(e.gpaScale||'4.0')==='4.0'?e.gpa:'',classYear:e.classYear||'',
  skills:(Rs.skills.hard||[]).map(s=>s.name),industries:[],interests:[],locations:[],
  sponsorship:/no sponsorship|citizen|permanent resident/i.test(wa)?'no':/require|need.*sponsor|visa/i.test(wa)&&!/no sponsorship/i.test(wa)?'yes':'',
  experience:(Rs.experience||[]).map(x=>({kind:x.kind||x.type,title:x.title,org:x.org,start:x.start,end:x.end,bullets:x.bullets||[]}))}}
const dirs=fs.readdirSync(path.join(R,'tests/resume-fixtures')).filter(d=>/^f\d\d$/.test(d)).sort().slice(0,20);
const pairs=[],grades={};let mChecks=0,mono=[];
const unq=s=>String(s||'').replace(/^“|”$/g,'');
(async()=>{for(const d of dirs){const fd=path.join(R,'tests/resume-fixtures',d);let L;
 if(fs.existsSync(path.join(fd,'resume.txt')))L=RX.fromText(fs.readFileSync(path.join(fd,'resume.txt'),'utf8'));
 else L=RX.fromHtml((await require('mammoth').convertToHtml({path:path.join(fd,'resume.docx')})).value);
 const Rs=RC.parse(L,{colleges:COL,today:'2026-10-23'});const txt=Rs.lines.join('\n');
 const pr=prof(Rs),P=MC.profile(pr);const items=LS.map(x=>({x,r:MC.score(x,MC.profile(pr),C,W)}));
 items.forEach(i=>{if(i.r.pct!=null){const g=i.r.grade[0];grades[g]=(grades[g]||0)+1}});
 const rk=MC.rank143(items,5);const best=rk.top[0];if(!best){F(d,'no eligible posting');continue}
 const {x,r}=best,v=r.v143,ntxt=n(txt);
 const post=n([x.title,x.company,(x.req&&x.req.sk||[]).join(' '),(x.req&&x.req.mj||[]).join(' '),(x.class_years||[]).join(' '),x.sponsorship].join(' '));
 for(const f of [...v.pos,...v.neg]){if(f.resume){for(const part of unq(f.resume).split(/,\s*/)){const p=n(part.replace(/^GPA /,''));if(p&&!ntxt.includes(p)&&!P.skills.includes(n(part)))F(d,'resume quote not in resume: '+part)}}
  if(f.posting){for(const part of unq(f.posting).replace(/ majors$/,'').replace(/^minimum GPA /,'').split(/,\s*|\//)){const p=n(part);if(p&&!post.includes(p))F(d,'posting quote not in posting: '+part)}}}
 if(v.pos.length>3||v.neg.length>3)F(d,'more than 3 factors');if(!v.next.length)F(d,'no next step');
 const r2=MC.score(x,MC.profile(pr),C,W);if(r2.pct!==r.pct)F(d,'nondeterministic');
 if(pr.gpa){const a=MC.score(x,MC.profile({...pr,gpa:''}),C,W),b=MC.score(x,MC.profile({...pr,gpa:'3.0'}),C,W);if(a.pct<b.pct-1)F(d,'missing GPA lowered grade');if(a.v143.confidence.level==='high')F(d,'missing GPA kept high confidence')}
 for(const i of items)if(i.r.ineligible&&(!i.r.v143||i.r.v143.label!=='Not eligible'||!i.r.v143.reason))F(d,'ineligible without exact reason '+i.x.id);
 if([...rk.top,...rk.realistic].some(i=>i.r.ineligible))F(d,'ineligible listing in ranked lists');
 pairs.push({fixture:d,listing:x.id,title:x.title,company:x.company,grade:r.grade,pct:r.pct,tag:v.tag,fitXchance:v.fitXchance,pos:v.pos.map(f=>f.t),neg:v.neg.map(f=>f.t),confidence:v.confidence.level});
 // 3) monotonicity
 for(const it of items){if(it.r.pct==null)continue;const ch=[['gpa+0.3',q=>{if(q.gpa)q.gpa=String(Math.min(4,+q.gpa+0.3).toFixed(2))}],['+posting skill',q=>{const s=(it.x.req&&it.x.req.sk||[])[0];if(s&&!q.skills.map(n).includes(n(s)))q.skills=[...q.skills,s]}],
   ['+related internship',q=>{q.experience=[{kind:'Internship',title:it.x.title.replace(/\s*[-–(].*$/,''),org:'Regional Firm',start:'2025-06',end:'2025-08',bullets:['Supported the team']},...q.experience]}]];
  for(const [k,fn] of ch){const q=JSON.parse(JSON.stringify(pr));fn(q);const r3=MC.score(it.x,MC.profile(q),C,W);mChecks++;if(r3.pct!=null&&r3.pct<it.r.pct)mono.push({fixture:d,listing:it.x.id,change:k,from:it.r.pct,to:r3.pct})}}}

if(pairs.length<20)F('pairs','only '+pairs.length+' of 20');if(mono.length)F('monotonic',mono.length+' breaks, e.g. '+JSON.stringify(mono[0]));
const tot=Object.values(grades).reduce((a,b)=>a+b,0);if(Object.keys(grades).length<4)F('variety','only '+Object.keys(grades).join(''));if((grades.A||0)/tot>.15)F('harsh','A share '+((grades.A||0)/tot*100).toFixed(1)+'%');
const res={personas:base,pairs:pairs.length,pairFailures:fail.filter(f=>/^f\d/.test(f)).length,monotonicChecks:mChecks,monotonicBreaks:mono.length,gradeMix:grades,failures:fail};
console.log(JSON.stringify({personasAccuracy:base.accuracy,inBand:base.inBand+'/'+base.pairs,outliers:base.outliers,pairs:res.pairs,pairFailures:res.pairFailures,monotonicChecks:mChecks,monotonicBreaks:mono.length,gradeMix:grades,failures:fail.length}));
fail.slice(0,15).forEach(f=>console.log('  FAIL '+f));
const j=process.argv.indexOf('--json');if(j>0)fs.writeFileSync(process.argv[j+1],JSON.stringify({...res,pairList:pairs,mono:mono.slice(0,50)},null,1));
if(fail.length)process.exitCode=1;})();
