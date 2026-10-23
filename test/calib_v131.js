// V13.1 #9 probe: grade spread for the QA PDF profile (Jordan M. Ellis) with no interests and no locations.
global.self=global;require('../match-core.js');const fs=require('fs');process.chdir(__dirname+'/..');
const C=JSON.parse(fs.readFileSync('config.json'));C.schoolTiers=JSON.parse(fs.readFileSync('data/school_tiers.json'));const W=JSON.parse(fs.readFileSync('match-weights.json'));
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9&+# ]/g,' ').replace(/\s+/g,' ').trim();
const today=new Date().toISOString().slice(0,10);
const L=JSON.parse(fs.readFileSync('data/index.json')).listings.filter(x=>x.status==='open'&&!x.hidden&&!x.past_term&&(!x.deadline||x.deadline>=today)&&!x.degree);L.forEach(x=>{x.industry=x.category;x._t=norm([x.title,x.company,...(x.locations||[]).map(l=>l.city+' '+l.state)].join(' '))});
const PDF={v:6,school:'Queens University of Charlotte',major:'Finance',minor:'Economics',gpa:'3.92',classYear:'Sophomore',gradDate:'2029-05',industries:[],locations:[],skills:['excel','financial modeling','powerpoint','bloomberg','python','public speaking'],
 experience:[{kind:'Club',title:'Analyst',org:'Queens Student Investment Fund',start:'2025-09',end:'Present',bullets:['Built DCF and comparable company models in Excel']},{kind:'Internship',title:'Summer Intern',org:'Carolina Wealth Partners',start:'2026-06',end:'2026-08',bullets:['Prepared client portfolio reviews']},{kind:'Athletics',title:'NCAA Division I Student-Athlete',org:"Queens University of Charlotte Men's Lacrosse",start:'2025-08',end:'Present',bullets:[]}]};
function run(pr){const P=MatchCore.profile(pr);return L.map(x=>({x,r:MatchCore.score(x,P,C,W)})).filter(o=>o.r.pct!=null&&!o.r.ineligible).sort((a,b)=>b.r.pct-a.r.pct)}
const R=run(PDF),top=R.slice(0,20).map(o=>o.r.pct);
const out={max:R[0].r.pct,top20:top,distinct:new Set(top).size,all100:top.every(p=>p===100)};
// missing location must not count as a match
const withLoc=run({...PDF,locations:['Charlotte, NC']});const noLoc=withLoc.find(o=>!(o.x.locations||[]).length&&!o.x.remote);
out.noLocScoreVsWithout=noLoc?[noLoc.r.pct,R.find(o=>o.x.id===noLoc.x.id)?.r.pct]:null;
out.noLocReason=noLoc?noLoc.r.reasons.join(' | '):null;
if(require.main===module)console.log(JSON.stringify(out));module.exports=out;
