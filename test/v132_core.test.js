// V13.2: detail-panel short lines obey the length limits on real listings (QA PDF profile, Jordan M. Ellis).
global.self=global;require('../match-core.js');const fs=require('fs');process.chdir(__dirname+'/..');
const C=JSON.parse(fs.readFileSync('config.json'));C.schoolTiers=JSON.parse(fs.readFileSync('data/school_tiers.json'));const W=JSON.parse(fs.readFileSync('match-weights.json'));
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9&+# ]/g,' ').replace(/\s+/g,' ').trim();
const L=JSON.parse(fs.readFileSync('data/index.json')).listings.filter(x=>x.status==='open'&&!x.hidden);L.forEach(x=>{x.industry=x.category;x._t=norm([x.title,x.company,...(x.locations||[]).map(l=>l.city+' '+l.state)].join(' '))});
const base={v:6,school:'Queens University of Charlotte',major:'Finance',minor:'Economics',gpa:'3.92',classYear:'Sophomore',gradDate:'2029-05',industries:['Finance & Banking'],locations:['Charlotte, NC'],skills:['excel','financial modeling','powerpoint'],experience:[{kind:'Club',title:'Analyst',org:'Queens Student Investment Fund',start:'2025-09',end:'Present',bullets:[]}]};
let R=[],ok=(n,c,d='')=>{R.push(c);console.log((c?'PASS':'FAIL')+' | '+n+(d?' | '+d:''))};
const bad={t:[],why:[],act:[],empty:0,cut:[]};let n=0;
for(const pr of [base,{...base,gpa:'',experience:[],skills:[],locations:[]},{...base,major:'Nursing',industries:['Healthcare']}]){const P=MatchCore.profile(pr);
 for(const x of L){const r=MatchCore.score(x,P,C,W);const f=r.feedback;if(!f||r.pct==null)continue;n++;
  (f.breakdown||[]).forEach(b=>{if(b.t&&b.t.length>60)bad.t.push(b.t);if(b.t&&/\w…$|\.\.\.$/.test(b.t))bad.cut.push(b.t)});
  const s=f.short||{};(s.why||[]).forEach(t=>t.length>70&&bad.why.push(t));(s.act||[]).forEach(t=>t.length>70&&bad.act.push(t));
  if((s.why||[]).length>2||(s.act||[]).length>2)bad.empty++;}}
ok('graded '+n+' listing×profile pairs',n>100);
ok('breakdown lines <= 60 chars',!bad.t.length,bad.t.slice(0,3).join(' / '));
ok('no truncated lines',!bad.cut.length,bad.cut.slice(0,3).join(' / '));
ok('why bullets <= 70 chars',!bad.why.length,bad.why.slice(0,3).join(' / '));
ok('improve bullets <= 70 chars',!bad.act.length,bad.act.slice(0,3).join(' / '));
ok('at most 2 bullets per section',!bad.empty);
const P=MatchCore.profile(base);const ex=L.map(x=>MatchCore.score(x,P,C,W)).find(r=>r.pct!=null&&r.feedback&&r.feedback.short);
console.log(JSON.stringify({bd:ex.feedback.breakdown.map(b=>[b.k,b.t]),short:ex.feedback.short}));
process.exit(R.every(Boolean)?0:1)
