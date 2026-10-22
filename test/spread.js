// V12: grade spread diagnostics per persona over every open listing.
global.self=global;require('../match-core.js');const fs=require('fs');process.chdir(__dirname+'/..');
const C=JSON.parse(fs.readFileSync('config.json')),W=JSON.parse(fs.readFileSync('match-weights.json')),PS=JSON.parse(fs.readFileSync('test/personas.json'));
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9&+# ]/g,' ').replace(/\s+/g,' ').trim();
const L=JSON.parse(fs.readFileSync('data/index.json')).listings.filter(x=>x.status==='open'&&!x.hidden);L.forEach(x=>{x.industry=x.category;x._t=norm([x.title,x.company,...(x.locations||[]).map(l=>l.city+' '+l.state)].join(' '))});
const out={};
for(const [k,pr] of Object.entries(PS)){if(k[0]==='_')continue;const P=MatchCore.profile(pr);const R=L.map(x=>MatchCore.score(x,P,C,W));const g={};let s=[];R.forEach(r=>{g[r.grade]=(g[r.grade]||0)+1;if(r.pct!=null)s.push(r.pct)});
 const inI=L.map((x,i)=>[x,R[i]]).filter(([x,r])=>P.industries.includes(x.industry)&&r.pct!=null&&!r.ineligible).map(([,r])=>r.pct);
 const sd=a=>{const m=a.reduce((p,c)=>p+c,0)/a.length;return Math.sqrt(a.reduce((p,c)=>p+(c-m)**2,0)/a.length)};
 const gi={};L.forEach((x,i)=>{if(P.industries.includes(x.industry)&&R[i].pct!=null&&!R[i].ineligible)gi[R[i].grade]=(gi[R[i].grade]||0)+1});
 const top=Math.max(...Object.values(gi))/inI.length;
 out[k]={all:g,interest:gi,nInterest:inI.length,sdInterest:+sd(inI).toFixed(1),distinctPct:new Set(inI).size,modalShare:+(top*100).toFixed(0)}}
console.log(JSON.stringify(out,null,0).replace(/\},"/g,'},\n"'));
