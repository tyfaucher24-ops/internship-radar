// node test/grade_dist.js -> grade distributions for the 3 test profiles over live-open listings
global.self=global;require('../match-core.js');const fs=require('fs');
const C=JSON.parse(fs.readFileSync('config.json')),W=JSON.parse(fs.readFileSync('match-weights.json')),T=JSON.parse(fs.readFileSync('test/profiles.test.json'));
const meta=JSON.parse(fs.readFileSync('data/meta.json'));const cut=Date.parse(meta.updated)-864e5;
const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9&+# ]/g,' ').replace(/\s+/g,' ').trim();
const L=JSON.parse(fs.readFileSync('data/index.json')).listings.filter(x=>x.status==='open'&&!x.hidden&&!x.past_term&&x.lv&&Date.parse(x.lv+':00Z')>=cut);
L.forEach(x=>{x.industry=x.category;x._t=norm([x.title,x.company,...(x.locations||[]).map(l=>l.city+' '+l.state)].join(' '))});
const out={};
for(const k of ['none','average','top']){const P=MatchCore.profile(T[k]);const t0=Date.now();const R=L.map(x=>({x,r:MatchCore.score(x,P,C,W)}));const ms=Date.now()-t0;
 const g={};R.forEach(({r})=>g[r.grade]=(g[r.grade]||0)+1);const order=['A+','A','A-','B+','B','B-','C+','C','C-','D','F'];
 const lowComp=R.filter(({x,r})=>r.comp!=null&&r.comp<40&&!r.ineligible&&P.industries.includes(x.industry));const lcAB=lowComp.filter(({r})=>/^[AB]/.test(r.grade)).length;
 out[k]={n:R.length,ms,grades:Object.fromEntries(order.map(o=>[o,g[o]||0])),median:R.map(a=>a.r.pct).sort((a,b)=>a-b)[R.length>>1],lowCompEligibleInterestRoles:lowComp.length,lowCompetitionAorB:lcAB,
  top3:R.sort((a,b)=>b.r.pct-a.r.pct).slice(0,3).map(({x,r})=>`${r.pct}% ${r.grade} ${x.company} – ${x.title} | ${r.reasons.join('; ')}`)}}
console.log(JSON.stringify(out,null,1));
